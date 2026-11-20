/*
 * Classes do cadastro (Plano 49), usado por tools/importar-cadastros.mjs.
 * Só as 26 classes base (decisão do usuário): 12 do PHB, 12 do XPHB, Artificer (TCE e EFA). Sem Sidekicks, Mystic e WoW.
 * - Classes pelo carregador do próprio 5etools (características já completas, por nível).
 * - Progressão 1–20 guardada inteira como números editáveis (decisão do usuário): bônus de proficiência, colunas da classe,
 *   espaços de magia (1º–9º) ou de pacto.
 * - Proficiências iniciais e de multiclasse no formato de benefícios (tools/cadastros-beneficios.mjs);
 *   equipamento inicial no formato dos antecedentes (makeEquipment).
 * - Medidas em metros (Plano 40): "Unarmored Movement +10 ft." vira { speed: 3 }.
 */
import fs from 'fs';
import path from 'path';
import { text, strip, slug, IMG_BASE } from './cadastros-itens.mjs';
import { makeEquipment } from './cadastros-antecedentes.mjs';

const BASE = new Set(['PHB', 'XPHB', 'TCE', 'EFA']);
const FT = 0.3;
const m = (ft) => Math.round(ft * FT * 100) / 100;
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const PB = (lv) => 2 + Math.floor((lv - 1) / 4);
const FEAT_CAT = { O: 'Origin', G: 'General', FS: 'Fighting Style', EB: 'Epic Boon', D: 'Dragonmark', DG: 'Dark Gift' };

// célula da tabela da classe → texto, ou { speed } (metros)
function cell(c) {
  if (c == null) return '';
  if (typeof c === 'number') return String(c);
  if (typeof c === 'string') return strip(c);
  if (c.type === 'bonus') return (c.value >= 0 ? '+' : '') + c.value;
  if (c.type === 'bonusSpeed') return { speed: m(c.value) };
  if (c.type === 'dice') return (c.toRoll || []).map((d) => d.number + 'd' + d.faces).join('+');
  if (c.value != null) return String(c.value);
  return strip(JSON.stringify(c));
}
// proficiências iniciais → lista no formato de benefícios
function profsOf(sp) {
  const out = [];
  if (!sp) return out;
  const clean = (x) => strip(typeof x === 'string' ? x : x.proficiency || JSON.stringify(x)).replace(/\s+/g, ' ').trim();
  if ((sp.armor || []).length) out.push({ kind: 'armor', fixed: sp.armor.map((x) => clean(x).replace(/^shields?$/, 'shield')) });
  if ((sp.weapons || []).length) out.push({ kind: 'weapon', fixed: sp.weapons.map(clean) });
  if ((sp.tools || []).length) {
    const tp = (sp.toolProficiencies || [])[0];
    const ch = tp && (tp.choose || Object.keys(tp).some((k) => typeof tp[k] === 'number'));
    out.push(ch && tp.choose ? { kind: 'tool', choose: { from: tp.choose.from || [], count: tp.choose.count || 1 } } : { kind: 'tool', fixed: sp.tools.map(clean) });
  }
  for (const s of sp.skills || []) {
    if (s.choose) out.push({ kind: 'skill', choose: { from: (s.choose.from || []).map(String), count: s.choose.count || 1 } });
    else if (s.any) out.push({ kind: 'skill', any: { any: s.any } });
    else out.push({ kind: 'skill', fixed: Object.keys(s).filter((k) => s[k] === true) });
  }
  return out;
}
// progressão "por nível" do 5etools (lista de 20, ou {"3": 2, "10": 3}) → lista de 20 números (acumulado)
function byLevel(p) {
  if (Array.isArray(p)) return Array.from({ length: 20 }, (_, i) => Number(p[i]) || 0);
  const out = new Array(20).fill(0);
  if (p && typeof p === 'object') {
    if (p['*'] != null) return out.fill(Number(p['*']));
    let cur = 0;
    for (let i = 0; i < 20; i++) { if (p[String(i + 1)] != null) cur = Number(p[String(i + 1)]); out[i] = cur; }
  }
  return out;
}

export async function buildClasses(SRC, { bookDate, itemIds, itemName }) {
  globalThis.Hist = globalThis.Hist || { util: { getCleanHash: (h) => h } }; // o carregador de classes do 5etools usa isto (só existe no navegador)
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_CLASSES);
  let fluff = [];
  try { fluff = await DataLoader.pCacheAndGetAllSite('classFluff'); } catch { /* sem textos */ }
  const key = (n, s) => (String(n).trim() + '|' + String(s || '').trim()).toLowerCase();
  const fluffOf = new Map(fluff.map((f) => [key(f.name, f.source), f]));
  const rawOf = new Map();
  const dir = path.join(SRC, 'data', 'class');
  for (const file of Object.values(JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')))) {
    for (const rc of JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).class || []) rawOf.set(key(rc.name, rc.source), rc);
  }
  const stats = { itemMissing: new Set() };
  const equipOf = makeEquipment({ itemIds, itemName, stats });
  const classes = [], usedSources = new Set();
  for (const c of all.filter((x) => x.__prop === 'class' && BASE.has(x.source) && !x.isSidekick)) {
    usedSources.add(c.source);
    const ed = c.edition === 'one' || c.source === 'XPHB' || c.source === 'EFA' ? '2024' : '2014';
    // tabela da classe: colunas próprias + magia
    const columns = [], rows = Array.from({ length: 20 }, () => []);
    let slots = null, pact = null, cantrips = null, prepared = null;
    for (const g of c.classTableGroups || []) {
      if (g.rowsSpellProgression) { slots = g.rowsSpellProgression.slice(0, 20).map((r) => r.map((v) => Number(v) || 0)); continue; }
      (g.colLabels || []).forEach((lab, ci) => {
        const label = strip(lab);
        const vals = (g.rows || []).slice(0, 20).map((r) => cell(r[ci]));
        if (/^cantrips/i.test(label)) { cantrips = vals.map((v) => Number(v) || 0); return; }
        if (/^(prepared spells|spells known)/i.test(label)) { prepared = vals.map((v) => Number(v) || 0); return; }
        if (c.casterProgression === 'pact' && /^spell slots$/i.test(label)) { pact = Object.assign(pact || {}, { slots: vals.map((v) => Number(v) || 0) }); return; }
        if (c.casterProgression === 'pact' && /^slot level$/i.test(label)) { pact = Object.assign(pact || {}, { level: vals.map((v) => Number(String(v).replace(/\D/g, '')) || 0) }); return; }
        columns.push(label);
        vals.forEach((v, i) => rows[i].push(v));
      });
    }
    // características por nível; os níveis da subclasse vêm da lista original (o carregador tira a marca "gainSubclassFeature")
    const subLevels = [];
    for (const ref of (rawOf.get(key(c.name, c.source)) || {}).classFeatures || []) if (ref && typeof ref === 'object' && ref.gainSubclassFeature) subLevels.push(Number(String(ref.classFeature).split('|')[3]));
    const features = [];
    (c.classFeatures || []).forEach((lvlList) => {
      for (const ft of [].concat(lvlList || [])) {
        if (!ft || typeof ft !== 'object' || !ft.name) continue;
        const f = { name: ft.name, level: ft.level, text: text(ft.entries) };
        if (/^ability score improvement$/i.test(ft.name)) f.mark = 'asi';
        else if (subLevels.includes(ft.level) && (/subclass|^subclass feature$/i.test(ft.name) || ft.name === c.subclassTitle)) f.mark = 'subclass';
        features.push(f);
      }
    });
    if (!subLevels.length) for (const f of features) if (f.mark === 'subclass') subLevels.push(f.level);
    // multiclasse
    const mc = c.multiclassing || {};
    const req = mc.requirements;
    let mcReq = !req ? [] : req.or ? [[{ type: 'ability', abilities: Object.keys(req.or[0]).filter((k) => ABIL.includes(k)), min: Object.values(req.or[0])[0] }]]
      : [Object.entries(req).filter(([k]) => ABIL.includes(k)).map(([k, v]) => ({ type: 'ability', abilities: [k], min: v }))];
    // 2024 não traz o mínimo: a regra do livro é 13 no atributo principal (Fighter: STR ou DEX; Monk: DEX e WIS)
    let mcRule = '';
    if (!req && ed === '2024') {
      const prim = [].concat(c.primaryAbility || []).map((o) => Object.keys(o).filter((k) => o[k] === true));
      mcReq = prim.length > 1 ? [[{ type: 'ability', abilities: prim.flat(), min: 13 }]] : prim.length ? [prim[0].map((k) => ({ type: 'ability', abilities: [k], min: 13 }))] : [];
      mcRule = '2024';
    }
    const se = c.startingEquipment || {};
    const fl = fluffOf.get(key(c.name, c.source));
    const r = {
      id: slug(c.name) + '-' + slug(c.source), name: c.name, source: c.source, page: c.page || null, edition: ed,
      hd: c.hd ? c.hd.faces : 8,
      primary: [].concat(c.primaryAbility || []).map((o) => Object.keys(o).filter((k) => o[k] === true)).filter((x) => x.length),
      saves: (c.proficiency || []).slice(),
      subclassTitle: c.subclassTitle || '',
      subclassLevels: [...new Set(subLevels)].sort((a, b) => a - b),
      proficiencies: profsOf(c.startingProficiencies),
      equipment: equipOf(se.defaultData, c.source),
      equipmentText: se.default ? se.default.map((x) => strip(x)) : [],
      goldAlternative: se.goldAlternative ? strip(se.goldAlternative) : '',
      multiclass: { requirements: mcReq, rule: mcRule, proficiencies: profsOf(mc.proficienciesGained), text: mc.entries ? text(mc.entries) : '' },
      spellcasting: c.spellcastingAbility ? {
        ability: c.spellcastingAbility, progression: c.casterProgression || 'full',
        mode: c.spellsKnownProgressionFixed ? 'spellbook' : c.preparedSpellsProgression ? 'prepared' : c.spellsKnownProgression ? 'known' : 'prepared',
      } : null,
      progression: {
        pb: Array.from({ length: 20 }, (_, i) => PB(i + 1)),
        columns, rows,
        cantrips, prepared, slots, pact,
      },
      optionProgression: [].concat(c.optionalfeatureProgression || []).map((o) => ({ name: o.name, type: (o.featureType || []).join(','), byLevel: byLevel(o.progression) })),
      featProgression: [].concat(c.featProgression || []).map((o) => ({ name: o.name, category: (o.category || []).map((x) => FEAT_CAT[x] || x).join('/'), byLevel: byLevel(o.progression) })),
      features,
      description: fl ? text(fl.entries) : '',
    };
    const imgs = fl && (fl.images || []).filter((x) => x && x.type === 'image' && x.href && x.href.type === 'internal' && x.href.path).map((x) => IMG_BASE + x.href.path.split('/').map(encodeURIComponent).join('/'));
    if (imgs && imgs.length) r.images = imgs;
    if (c.srd || c.srd52) r.srd = true;
    classes.push(r);
  }
  classes.sort((a, b) => a.name.localeCompare(b.name) || a.edition.localeCompare(b.edition));
  return { classes, usedSources, stats };
}
