/*
 * Subclasses do cadastro (Plano 50), usado por tools/importar-cadastros.mjs.
 * - As subclasses das 26 classes base (sem WoW), pelo carregador do próprio 5etools.
 * - Como no 5etools (decisão do usuário): subclasses de livros de 2014 também aparecem ligadas à classe de 2024 (cópias),
 *   com a marca "copyOf" apontando para a original.
 * - Características: o 5etools agrupa por nível ("Evoker" no 3; um bloco sem nome no 6 com "Sculpt Spells" dentro);
 *   aqui cada característica com nome vira uma linha (nome, nível, texto).
 * - Magias (sempre preparadas, conhecidas, à escolha) no formato de benefícios, ligadas ao cadastro de Magias.
 * - Conjuração própria (Eldritch Knight, Arcane Trickster) e opções de classe por nível, no formato das classes (Plano 49).
 */
import { text, strip, slug, IMG_BASE } from './cadastros-itens.mjs';
import { spellsOf } from './cadastros-beneficios.mjs';

const BASE = new Set(['PHB', 'XPHB', 'TCE', 'EFA']);
const OUT_SOURCES = new Set(['WoW']);

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
// é uma característica de subclasse (objeto do carregador), e não um bloco de texto comum?
const isFeature = (e) => e && typeof e === 'object' && !Array.isArray(e) && (e.subclassShortName != null || e.className != null) && e.level != null;
// separa as características com nome; o texto que não é característica fica com a de cima
function collect(f, out) {
  // a característica de cima entra primeiro ("Evoker"), depois as de dentro ("Evocation Savant", "Potent Cantrip")
  const node = f.name ? { name: strip(f.name), level: f.level, text: '' } : null;
  if (node) out.push(node);
  const own = [];
  for (const e of [].concat(f.entries || [])) {
    if (isFeature(e) || (e && e.type === 'refSubclassFeature')) { if (isFeature(e)) collect(e, out); continue; }
    own.push(e);
  }
  if (node) node.text = text(own);
  else if (own.length && out.length) out[out.length - 1].text += '\n\n' + text(own);
}

export async function buildSubclasses(SRC, { bookDate, spellIds, classIds }) {
  globalThis.Hist = globalThis.Hist || { util: { getCleanHash: (h) => h } };
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_CLASSES);
  let fluff = [];
  try { fluff = await DataLoader.pCacheAndGetAllSite('subclassFluff'); } catch { /* sem textos */ }
  const key = (...a) => a.map((x) => String(x || '').trim().toLowerCase()).join('|');
  const fluffOf = new Map(fluff.map((f) => [key(f.name, f.shortName, f.source, f.className, f.classSource), f]));
  const used = new Set(), usedSources = new Set();
  const subs = [];
  for (const s of all.filter((x) => x.__prop === 'subclass' && BASE.has(x.classSource) && !OUT_SOURCES.has(x.source))) {
    const classId = slug(s.className) + '-' + slug(s.classSource);
    let id = classId + '--' + slug(s.shortName || s.name) + '-' + slug(s.source); let n = 2; while (used.has(id)) id = classId + '--' + slug(s.shortName || s.name) + '-' + slug(s.source) + '-' + n++; used.add(id);
    usedSources.add(s.source);
    const ed = s.edition === 'one' || s.source === 'XPHB' || bookDate(s.source) > '2024-09-16' ? '2024' : s.edition === 'classic' || bookDate(s.source) ? '2014' : '';
    const features = [];
    for (const lvl of s.subclassFeatures || []) for (const f of [].concat(lvl || [])) if (f && typeof f === 'object') collect(f, features);
    // conjuração própria (terço de conjurador)
    let spellcasting = null, progression = null;
    if (s.spellcastingAbility) {
      spellcasting = { ability: s.spellcastingAbility, progression: s.casterProgression || '1/3', mode: s.spellsKnownProgression || s.spellsKnownProgressionFixed ? 'known' : 'prepared' };
      progression = { pb: Array.from({ length: 20 }, (_, i) => 2 + Math.floor(i / 4)), columns: [], rows: Array.from({ length: 20 }, () => []), cantrips: null, prepared: null, slots: null, pact: null };
      for (const g of s.subclassTableGroups || []) {
        if (g.rowsSpellProgression) { progression.slots = g.rowsSpellProgression.slice(0, 20).map((r) => { const a = r.map((v) => Number(v) || 0); while (a.length < 9) a.push(0); return a; }); continue; }
        (g.colLabels || []).forEach((lab, ci) => {
          const label = strip(lab);
          const vals = (g.rows || []).slice(0, 20).map((r) => Number(strip(String(r[ci] ?? '')).replace(/\D/g, '')) || 0);
          if (/cantrip/i.test(label)) progression.cantrips = vals;
          else if (/spells known|prepared/i.test(label)) progression.prepared = vals;
          else { progression.columns.push(label); vals.forEach((v, i) => progression.rows[i].push(String(v))); }
        });
      }
    }
    const fl = fluffOf.get(key(s.name, s.shortName, s.source, s.className, s.classSource));
    const r = {
      id, name: s.name, shortName: s.shortName || s.name, source: s.source, page: s.page || null, edition: ed,
      classId: classIds.has(classId) ? classId : null, className: s.className, classSource: s.classSource,
      copyOf: s._isCopy ? s.className + '|' + s.source : null,
      features,
      spells: spellsOf(s.additionalSpells, spellIds),
      spellcasting, progression,
      optionProgression: [].concat(s.optionalfeatureProgression || []).map((o) => ({ name: o.name, type: (o.featureType || []).join(','), byLevel: byLevel(o.progression) })),
      description: fl ? text(fl.entries) : '',
    };
    const imgs = fl && (fl.images || []).filter((x) => x && x.type === 'image' && x.href && x.href.type === 'internal' && x.href.path).map((x) => IMG_BASE + x.href.path.split('/').map(encodeURIComponent).join('/'));
    if (imgs && imgs.length) r.images = imgs;
    if (s.srd || s.srd52) r.srd = true;
    subs.push(r);
  }
  // cópia: aponta para a original (mesmo nome curto e fonte, na outra classe)
  for (const r of subs) if (r.copyOf) {
    const orig = subs.find((x) => x !== r && !x.copyOf && x.shortName === r.shortName && x.source === r.source && x.className === r.className);
    r.copyOf = orig ? orig.id : null;
  }
  subs.sort((a, b) => a.className.localeCompare(b.className) || a.classSource.localeCompare(b.classSource) || a.name.localeCompare(b.name));
  return { subclasses: subs, usedSources };
}
