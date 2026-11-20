/*
 * Magias do cadastro (Plano 45), usado por tools/importar-cadastros.mjs.
 * - Magias e listas de classes/subclasses pelo carregador do próprio 5etools (o mesmo do site).
 * - Fora por enquanto (decisão do usuário): o livro WoW (outro jogo) e as listas de classes de lá.
 * - Dano, cura e "em nível superior" vêm do texto quando o 5etools não traz em campo próprio:
 *   {@damage 8d6} Fire damage → 8d6 fire; {@dice 2d8} com "Hit Points" → cura; {@scaledamage 8d6|3-9|1d6} → +1d6 por nível.
 * Medidas em metros (Plano 40: 1 pé = 0,3 m; 1 milha = 1,5 km); custo do material em peças de cobre.
 */
import { strip, text, slug, IMG_BASE } from './cadastros-itens.mjs';

const OUT_SOURCES = new Set(['WoW']);
const FT = 0.3;
const m = (ft) => Math.round(ft * FT * 100) / 100;
const SCHOOL = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation', P: 'Psionic' };
const ABIL = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
const DMG = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const AREA_SHAPES = ['sphere', 'cone', 'line', 'cube', 'cylinder', 'emanation', 'hemisphere', 'radius', 'wall', 'square'];
const UNIT = { action: 'action', bonus: 'bonus', reaction: 'reaction', minute: 'minute', hour: 'hour', round: 'round', day: 'day', special: 'special' };

function distOf(d) {
  if (!d) return { kind: 'special', distance: null };
  if (d.type === 'feet') return { kind: 'distance', distance: m(d.amount) };
  if (d.type === 'miles') return { kind: 'distance', distance: Math.round(d.amount * 1500) };
  if (['self', 'touch', 'sight', 'unlimited'].includes(d.type)) return { kind: d.type, distance: null };
  return { kind: 'special', distance: null };
}
function rangeOf(r) {
  if (!r) return { range: { kind: 'special', distance: null }, area: null };
  if (r.type === 'point') return { range: distOf(r.distance), area: null };
  if (AREA_SHAPES.includes(r.type)) {
    const size = r.distance && r.distance.type === 'feet' ? m(r.distance.amount) : r.distance && r.distance.type === 'miles' ? r.distance.amount * 1500 : null;
    return { range: { kind: 'self', distance: null }, area: { shape: r.type === 'radius' ? 'sphere' : r.type, size } };
  }
  return { range: { kind: 'special', distance: null }, area: null };
}
// área descrita só no texto ("20-foot-radius Sphere", "15-foot Cone", "100 feet long and 5 feet wide Line")
function areaFromText(t) {
  let mm = /(\d+)-foot[- ]radius,?\s*(?:\d+-foot-high\s*)?(sphere|cylinder|emanation|hemisphere|circle)/i.exec(t);
  if (mm) return { shape: mm[2].toLowerCase() === 'circle' ? 'cylinder' : mm[2].toLowerCase(), size: m(Number(mm[1])) };
  mm = /(\d+)-foot (cone|cube|square|emanation|sphere)/i.exec(t);
  if (mm) return { shape: mm[2].toLowerCase() === 'square' ? 'cube' : mm[2].toLowerCase(), size: m(Number(mm[1])) };
  mm = /line (?:that is )?(\d+) feet long and (\d+) feet wide/i.exec(t) || /(\d+)-foot-long,? (\d+)-foot-wide line/i.exec(t);
  if (mm) return { shape: 'line', size: m(Number(mm[1])), width: m(Number(mm[2])) };
  return null;
}
// dano e cura lidos do texto original (com as tags)
function damageFromRaw(raw, types) {
  const out = [];
  const re = /\{@damage ([^}|]+)[^}]*\}\s*(?:\+[^.]*?\s)?(\w+)?\s*damage/gi;
  let mm;
  while ((mm = re.exec(raw)) && out.length < 2) {
    const ty = (mm[2] || '').toLowerCase();
    const type = DMG.includes(ty) ? ty : types.length === 1 ? types[0] : '';
    if (!out.some((d) => d.dice === mm[1].trim() && d.type === type)) out.push({ dice: mm[1].replace(/\s+/g, ''), type });
  }
  if (!out.length && types.length) { const d = /\{@damage ([^}|]+)/.exec(raw); if (d) out.push({ dice: d[1].replace(/\s+/g, ''), type: types[0] }); }
  // dano fixo ("5 Cold damage")
  if (!out.length && types.length) { const d = new RegExp('\\b(\\d+) (' + DMG.join('|') + ') damage', 'i').exec(raw); if (d) out.push({ dice: d[1], type: d[2].toLowerCase() }); }
  return out;
}
function healFromRaw(raw, tags) {
  if (!/regains?[^.]{0,80}Hit Points|regains?[^.]{0,60}hit points/i.test(raw) && !(tags || []).includes('HL')) return '';
  const d = /\{@dice ([^}|]+)[^}]*\}[^.]{0,80}(Hit Points|hit points)|regains?[^.]{0,60}?\{@dice ([^}|]+)/i.exec(raw);
  return d ? (d[1] || d[3]).replace(/\s+/g, '') : '';
}

export async function buildSpells(SRC, { bookDate }) {
  // o carregador do 5etools já foi preparado por buildItems (mesmo processo)
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_SPELLS);
  const fluff = await DataLoader.pCacheAndGetAllSite('spellFluff');
  const key = (n, s) => (String(n).trim() + '|' + String(s || '').trim()).toLowerCase();
  const imgOf = new Map();
  for (const f of fluff) {
    const imgs = (f.images || []).filter((x) => x && x.type === 'image' && x.href).map((x) => {
      const h = x.href;
      if (h.type === 'internal' && h.path && !h.path.split('/').some((s) => !s || s === '.' || s === '..')) return IMG_BASE + h.path.split('/').map(encodeURIComponent).join('/');
      if (h.type === 'external' && /^https:\/\//.test(h.url || '')) return h.url;
      return null;
    }).filter(Boolean);
    if (imgs.length) imgOf.set(key(f.name, f.source), imgs);
  }
  const keep = (x) => x && !OUT_SOURCES.has(x.source) && !OUT_SOURCES.has(x.definedInSource);
  const used = new Set(), usedSources = new Set();
  const spells = [];
  const stats = { noDice: [] };
  for (const s of all) {
    if (OUT_SOURCES.has(s.source)) continue;
    let id = slug(s.name) + '-' + slug(s.source); let n = 2; while (used.has(id)) id = slug(s.name) + '-' + slug(s.source) + '-' + n++; used.add(id);
    usedSources.add(s.source);
    const rawTxt = JSON.stringify(s.entries || []);
    const desc = text(s.entries);
    const { range, area: area0 } = rangeOf(s.range);
    const area = area0 || areaFromText(desc);
    const t0 = (s.time || [])[0] || {};
    const d0 = (s.duration || [])[0] || {};
    const types = (s.damageInflict || []).filter((x) => DMG.includes(x));
    const damage = damageFromRaw(rawTxt, types);
    const heal = healFromRaw(rawTxt, s.miscTags);
    const hiRaw = JSON.stringify(s.entriesHigherLevel || []);
    const perSlot = (/\{@scaledamage [^|}]+\|[^|}]+\|([^}|]+)\}/.exec(hiRaw) || [])[1] || '';
    const perSlotHeal = (/\{@scaledice [^|}]+\|[^|}]+\|([^}|]+)\}/.exec(hiRaw) || [])[1] || '';
    const sld = [].concat(s.scalingLevelDice || [])[0];
    const save = (s.savingThrow || []).map((x) => ABIL[x]).filter(Boolean);
    const comp = s.components || {};
    const mat = comp.m;
    const ed = s.source === 'XPHB' || bookDate(s.source) > '2024-09-16' ? '2024' : bookDate(s.source) ? '2014' : '';
    const cls = s.classes || {};
    const rec = {
      id, name: s.name, source: s.source, page: s.page || null, edition: ed,
      level: s.level, school: SCHOOL[s.school] || s.school || '',
      ritual: !!(s.meta && s.meta.ritual),
      time: { number: t0.number || 1, unit: UNIT[t0.unit] || t0.unit || 'action', condition: t0.condition ? strip(t0.condition) : '' },
      range, area,
      components: { v: !!comp.v, s: !!comp.s, m: !!mat, material: mat ? strip(typeof mat === 'string' ? mat : mat.text || '') : '', cost: mat && typeof mat === 'object' && mat.cost ? mat.cost : null, consume: !!(mat && typeof mat === 'object' && mat.consume) },
      duration: {
        type: d0.type || 'instant', amount: d0.duration ? d0.duration.amount : null, unit: d0.duration ? d0.duration.type : '',
        concentration: !!d0.concentration, ends: (d0.ends || []).join(', '),
      },
      attack: (s.spellAttack || [])[0] === 'M' ? 'melee' : (s.spellAttack || [])[0] === 'R' ? 'ranged' : '',
      save: save[0] || '', saveAlso: save.slice(1),
      onSuccess: /half as much damage|half damage/i.test(desc) ? 'half' : 'none',
      damage, heal,
      conditions: (s.conditionInflict || []).map((c) => c[0].toUpperCase() + c.slice(1)),
      higher: { perSlot: perSlot.replace(/\s+/g, ''), perSlotHeal: perSlotHeal.replace(/\s+/g, ''), cantrip: sld && sld.scaling ? sld.scaling : null, text: text(s.entriesHigherLevel) },
      classes: [...new Set((cls.fromClassList || []).filter(keep).map((c) => c.name))],
      classesExpanded: [...new Set((cls.fromClassListVariant || []).filter(keep).map((c) => c.name))],
      subclasses: [...new Set((cls.fromSubclass || []).filter((x) => keep(x.class) && keep(x.subclass)).map((x) => x.class.name + ': ' + (x.subclass.shortName || x.subclass.name)))],
      grantedBy: {
        species: [...new Set((s.races || []).filter(keep).map((r) => r.name))],
        feats: [...new Set((s.feats || []).filter(keep).map((r) => r.name))],
        backgrounds: [...new Set((s.backgrounds || []).filter(keep).map((r) => r.name))],
        options: [...new Set((s.optionalfeatures || []).filter(keep).map((r) => r.name))],
      },
      description: desc,
    };
    if (!damage.length && types.length) stats.noDice.push(s.name + '|' + s.source);
    const img = imgOf.get(key(s.name, s.source));
    if (img) rec.images = img;
    if (s.srd || s.srd52) rec.srd = true;
    if (s.miscTags) rec.tags = s.miscTags;
    spells.push(rec);
  }
  return { spells, usedSources, stats };
}
