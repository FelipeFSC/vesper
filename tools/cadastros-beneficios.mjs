/*
 * Formato de "benefícios" e de "pré-requisitos" (Plano 44), comum a talentos e, depois, a antecedentes, espécies e classes.
 * Converte os campos do 5etools para um formato simples de editar:
 *   ability:      [{ fixed: {str: 1}, choose: {from: [...], count, amount}, weighted: {from, weights: [2, 1]}, max }]   (cada bloco é uma alternativa)
 *   proficiencies:[{ kind: 'skill'|'tool'|'language'|'weapon'|'armor'|'save'|'skillToolLanguage', fixed: [...], any: {key: n}, choose: {from: [...], count, filter} }]
 *   expertise:    [{ fixed: [...], any: {...}, choose: {...} }]
 *   spells:       { ability: {fixed} | {choose: [...]}, groups: [{ name, items: [{ spell, name, choose, label, count, how, uses, at }] }] }
 *                 (groups = alternativas: "escolha uma lista: Cleric, Druid ou Wizard")
 *   senses:       [{ type: 'darkvision'|'blindsight'|..., range (m) }]
 *   resist/immune/conditionImmune: { fixed: [...], choose: { from, count } }
 *   options:      [{ name, type, count }] (opções de classe: invocações, manobras…)
 * Pré-requisitos: [[cond, cond], [cond]] → linhas são alternativas (OU); condições da linha valem juntas (E).
 */
import { strip } from './cadastros-itens.mjs';

const FT = 0.3;
const m = (ft) => Math.round(ft * FT * 100) / 100;
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const SCHOOL = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation' };
const cap = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
const nameOf = (s) => cap(String(s).split('|')[0].replace(/#c$/, ''));

// ---------- Blocos de escolha ----------
function block(o) {
  const b = {};
  const fixed = [], any = {};
  for (const [k, v] of Object.entries(o || {})) {
    if (k === 'choose') {
      const ch = Array.isArray(v) ? v[0] : v;
      b.choose = { from: (ch.from || []).map(String), count: ch.count || 1 };
      if (ch.fromFilter) b.choose.filter = ch.fromFilter;
      if (ch.amount) b.choose.amount = ch.amount;
    } else if (v === true) fixed.push(k.split('|')[0]);
    else if (typeof v === 'number') any[k] = v;
  }
  if (fixed.length) b.fixed = fixed;
  if (Object.keys(any).length) b.any = any;
  return b;
}
export function abilityBlocks(arr) {
  return [].concat(arr || []).map((o) => {
    const b = {};
    const fixed = {};
    for (const [k, v] of Object.entries(o)) if (ABIL.includes(k) && typeof v === 'number') fixed[k] = v;
    if (Object.keys(fixed).length) b.fixed = fixed;
    // com pesos (antecedentes de 2024): +2 em um e +1 em outro, ou +1 em três
    if (o.choose && o.choose.weighted) b.weighted = { from: o.choose.weighted.from || ABIL, weights: o.choose.weighted.weights || [2, 1] };
    else if (o.choose) b.choose = { from: o.choose.from || ABIL, count: o.choose.count || 1, amount: o.choose.amount || 1 };
    if (o.max) b.max = o.max;
    if (o.hidden) b.hidden = true;
    return b;
  }).filter((b) => b.fixed || b.choose || b.weighted);
}
function defense(arr) {
  const out = { fixed: [] };
  for (const x of [].concat(arr || [])) {
    if (typeof x === 'string') out.fixed.push(x);
    else if (x && x.choose) out.choose = { from: x.choose.from || [], count: x.choose.count || 1 };
  }
  return out.fixed.length || out.choose ? out : null;
}

// ---------- Magias concedidas ----------
function filterLabel(f) {
  const parts = Object.fromEntries(String(f).split('|').map((p) => p.split('=')));
  // níveis seguidos viram intervalo: "0;1;2;3" → "Cantrip–3rd-level"
  const lvs = parts.level != null ? String(parts.level).split(';') : [];
  const lname = (l) => (l === '0' ? 'Cantrip' : ORD[l] + '-level');
  const seq = lvs.length > 2 && lvs.every((l, i) => i === 0 || Number(l) === Number(lvs[i - 1]) + 1);
  const lv = !lvs.length ? '' : seq ? lname(lvs[0]) + '–' + lname(lvs[lvs.length - 1]) : lvs.map(lname).join('/');
  const words = [lv, parts.class ? parts.class.split(';').join('/') : '', parts.school ? parts.school.split(';').map((s) => SCHOOL[s] || s).join('/') : '',
    parts.components && /ritual/i.test(parts.components) ? 'ritual' : '', lv === 'Cantrip' ? '' : 'spell'];
  return words.filter(Boolean).join(' ');
}
export function spellsOf(addl, spellIds) {
  if (!addl || !addl.length) return null;
  const idOf = (s) => {
    const [n, src] = String(s).replace(/#c$/, '').split('|');
    const id = (n + '-' + (src || 'phb')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return spellIds.has(id) ? id : null;
  };
  const groups = [];
  let ability = null;
  for (const a of addl) {
    if (!ability && a.ability) ability = typeof a.ability === 'string' ? { fixed: a.ability } : { choose: a.ability.choose || [] };
    const items = [];
    const push = (entry, how, uses, at) => {
      if (typeof entry === 'string') { const sid = idOf(entry); items.push({ spell: sid, name: sid && spellIds.get ? spellIds.get(sid) : nameOf(entry), how, uses, at }); }
      else if (entry && entry.choose) items.push({ choose: entry.choose, label: filterLabel(entry.choose), count: entry.count || 1, how, uses, at });
    };
    for (const how of ['known', 'prepared', 'innate', 'expanded']) {
      const obj = a[how];
      if (!obj) continue;
      for (const [at, val] of Object.entries(obj)) {
        const lvl = at === '_' ? null : at;
        if (Array.isArray(val)) { for (const e of val) push(e, how, '', lvl); continue; }
        for (const [kind, v] of Object.entries(val || {})) {
          if (Array.isArray(v)) { for (const e of v) push(e, how, kind === 'will' ? 'at will' : kind === 'ritual' ? 'ritual' : kind, lvl); continue; }
          for (const [n, list] of Object.entries(v || {})) {
            const uses = (kind === 'daily' ? n.replace(/e$/, '') + '/day' : kind === 'rest' ? n.replace(/e$/, '') + '/rest' : kind === 'resource' ? n + ' (resource)' : n + ' ' + kind) + (n.endsWith('e') ? ' each' : '');
            for (const e of [].concat(list)) push(e, how, uses, lvl);
          }
        }
      }
    }
    if (items.length) groups.push({ name: a.name || '', items });
  }
  return groups.length ? { ability, groups } : null;
}

// ---------- Benefícios ----------
export function benefitsOf(f, spellIds) {
  const b = {};
  const ab = abilityBlocks(f.ability);
  if (ab.length) b.ability = ab;
  const prof = [];
  const kinds = [['skillProficiencies', 'skill'], ['toolProficiencies', 'tool'], ['languageProficiencies', 'language'], ['weaponProficiencies', 'weapon'], ['armorProficiencies', 'armor'], ['savingThrowProficiencies', 'save'], ['skillToolLanguageProficiencies', 'skillToolLanguage']];
  for (const [k, kind] of kinds) for (const o of [].concat(f[k] || [])) { const bl = block(o); if (Object.keys(bl).length) prof.push(Object.assign({ kind }, bl)); }
  if (prof.length) b.proficiencies = prof;
  const ex = [].concat(f.expertise || []).map(block).filter((x) => Object.keys(x).length);
  if (ex.length) b.expertise = ex;
  const sp = spellsOf(f.additionalSpells, spellIds);
  if (sp) b.spells = sp;
  const senses = [];
  for (const o of [].concat(f.senses || [], f.bonusSenses || [])) for (const [k, v] of Object.entries(o)) if (typeof v === 'number') senses.push({ type: k, range: m(v), bonus: (f.bonusSenses || []).includes(o) || undefined });
  if (senses.length) b.senses = senses;
  for (const k of ['resist', 'immune', 'conditionImmune']) { const d = defense(f[k]); if (d) b[k] = d; }
  const opts = [].concat(f.optionalfeatureProgression || []).map((o) => ({ name: o.name, type: (o.featureType || []).join(','), count: typeof o.progression === 'object' ? Object.values(o.progression)[0] : 1 }));
  if (opts.length) b.options = opts;
  return b;
}

// ---------- Pré-requisitos ----------
export function prereqsOf(list, spellIds) {
  const sid = (s) => {
    const [n, src] = String(s).replace(/#c$/, '').split('|');
    const id = (n + '-' + (src || 'phb')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (spellIds && spellIds.has(id)) return id;
    // sem fonte: tenta a de 2024
    const id2 = (n + '-xphb').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return spellIds && !src && spellIds.has(id2) ? id2 : null;
  };
  return [].concat(list || []).map((p) => {
    const row = [];
    // magia conhecida (ex.: Eldritch Blast) ou "um truque de Bruxo que cause dano"
    if (p.spell) {
      const items = p.spell.map((s) => (typeof s === 'string' ? { spell: sid(s), name: nameOf(s) } : { name: '', text: strip(s.entrySummary || s.entry || s.choose || '') }));
      row.push({ type: 'spell', names: items.map((i) => i.name || i.text), spells: items.map((i) => i.spell || null) });
    }
    if (p.pact) row.push({ type: 'pact', names: [].concat(p.pact).map((x) => 'Pact of the ' + x) });
    if (p.item) row.push({ type: 'item', names: [].concat(p.item).map(String) });
    if (p.optionalfeature) row.push({ type: 'option', names: p.optionalfeature.map(nameOf) });
    if (p.level != null) row.push(typeof p.level === 'object' ? { type: 'level', value: p.level.level, cls: p.level.class ? p.level.class.name : '' } : { type: 'level', value: p.level });
    if (p.ability) {
      const opts = [].concat(p.ability);
      const abil = opts.flatMap((o) => Object.keys(o).filter((k) => ABIL.includes(k)));
      const min = opts.map((o) => Object.values(o).find((v) => typeof v === 'number')).find(Boolean) || 13;
      row.push({ type: 'ability', abilities: abil, min });
    }
    if (p.race) row.push({ type: 'species', names: [...new Set(p.race.map((r) => cap(r.displayEntry || r.name) + (r.subrace ? ' (' + cap(r.subrace) + ')' : '')))] });
    if (p.feat) row.push({ type: 'feat', names: p.feat.map(nameOf) });
    if (p.background) row.push({ type: 'background', names: p.background.map((x) => cap(x.name || x)) });
    if (p.feature) row.push({ type: 'feature', names: p.feature.map(String) });
    if (p.campaign) row.push({ type: 'campaign', names: p.campaign.map(String) });
    if (p.proficiency) row.push({ type: 'proficiency', text: p.proficiency.map((o) => Object.entries(o).map(([k, v]) => (v === true ? k : v + ' ' + k)).join(', ')).join(' or ') });
    if (p.spellcasting || p.spellcasting2020 || p.spellcastingFeature || p.spellcastingPrepared) row.push({ type: 'spellcasting', text: p.spellcasting2020 ? 'Spellcasting or Pact Magic feature' : p.spellcastingFeature ? 'Spellcasting feature' : 'The ability to cast at least one spell' });
    if (p.featCategory) row.push({ type: 'other', text: 'Feat category: ' + p.featCategory.join('/') });
    if (p.exclusiveFeatCategory) row.push({ type: 'other', text: 'Only one feat of this category' });
    if (p.other) row.push({ type: 'other', text: strip(p.other) });
    if (p.otherSummary) row.push({ type: 'other', text: strip(p.otherSummary.entry || p.otherSummary.entrySummary || '') });
    return row;
  }).filter((r) => r.length);
}
