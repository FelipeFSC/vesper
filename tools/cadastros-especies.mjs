/*
 * Espécies do cadastro (Plano 47), usado por tools/importar-cadastros.mjs.
 * - Espécies pelo carregador do próprio 5etools: ele já entrega cada sub-raça (2014) e cada linhagem/ancestralidade (2024) completa.
 * - Decisão do usuário: sub-raças e linhagens ficam DENTRO da espécie, como opções; cada opção guarda só o que muda
 *   em relação à espécie (traços novos ou alterados, traços que saem, benefícios, tamanho, deslocamento, atributos).
 * - Traços com nome e texto; os números (visão no escuro, resistências, magias, perícias…) vão para os benefícios (tools/cadastros-beneficios.mjs).
 * - Fora por enquanto: o livro WoW. Medidas em metros (Plano 40: 1 pé = 0,3 m); altura e peso ficam como no livro (polegadas e libras + dados).
 */
import { text, strip, slug, IMG_BASE } from './cadastros-itens.mjs';
import { benefitsOf } from './cadastros-beneficios.mjs';

const OUT_SOURCES = new Set(['WoW']);
const FT = 0.3;
const m = (ft) => Math.round(ft * FT * 100) / 100;
const SIZE = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan', V: 'Varies' };
const STRUCT_TRAITS = /^(age|size|speed|languages?|creature type|ability score increase|alignment)$/i;
const CAT = { O: 'Origin', G: 'General', FS: 'Fighting Style', EB: 'Epic Boon', D: 'Dragonmark', DG: 'Dark Gift' };
const J = (x) => JSON.stringify(x == null ? null : x);

function speedOf(sp) {
  if (sp == null) return null;
  if (typeof sp === 'number') return { walk: m(sp) };
  const out = {};
  for (const k of ['walk', 'fly', 'swim', 'climb', 'burrow']) {
    const v = sp[k];
    if (v === true) out[k] = 'walk';
    else if (typeof v === 'number') out[k] = m(v);
    else if (v && typeof v === 'object' && typeof v.number === 'number') out[k] = m(v.number);
  }
  return Object.keys(out).length ? out : null;
}
function traitsOf(entries) {
  const out = [];
  for (const e of entries || []) {
    if (!e || typeof e !== 'object' || !e.name) continue;
    if (STRUCT_TRAITS.test(String(e.name).trim())) continue;
    out.push({ name: strip(e.name), text: text(e.entries || e.entry || e.items || []) });
  }
  return out;
}
function featsOf(arr, featIds) {
  const out = [];
  for (const o of [].concat(arr || [])) {
    if (o.anyFromCategory) out.push({ any: true, count: o.anyFromCategory.count || 1, category: (o.anyFromCategory.category || []).map((c) => CAT[c] || c).join('/') });
    else if (o.any) out.push({ any: true, count: o.any });
    else for (const [k, v] of Object.entries(o)) if (v === true) {
      const [nm, src] = k.split('|');
      const [baseName, choice] = nm.split(';').map((x) => x.trim());
      const fid = slug(baseName) + '-' + slug(src || 'phb');
      out.push({ feat: featIds.has(fid) ? fid : null, name: baseName.replace(/\b\w/g, (c) => c.toUpperCase()), choice: choice || '' });
    }
  }
  return out;
}
function core(r, ids) {
  const b = benefitsOf(r, ids.spellIds);
  // sentidos que as espécies trazem fora de "senses"
  const senses = (b.senses || []).slice();
  for (const k of ['darkvision', 'blindsight', 'tremorsense', 'truesight']) if (typeof r[k] === 'number' && !senses.some((s) => s.type === k)) senses.push({ type: k, range: m(r[k]) });
  if (senses.length) b.senses = senses; else delete b.senses;
  return {
    size: (r.size || []).map((s) => SIZE[s] || s),
    speed: speedOf(r.speed),
    creatureTypes: (r.creatureTypes || []).map(String),
    benefits: b,
    feats: featsOf(r.feats, ids.featIds),
    traits: traitsOf(r.entries),
  };
}

export async function buildSpecies(SRC, { bookDate, spellIds, featIds }) {
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_RACES);
  let fluff = [];
  try { fluff = await DataLoader.pCacheAndGetAllSite('raceFluff'); } catch { /* sem imagens */ }
  const key = (n, s) => (String(n).trim() + '|' + String(s || '').trim()).toLowerCase();
  const imgOf = new Map();
  for (const f of fluff) {
    const imgs = (f.images || []).filter((x) => x && x.type === 'image' && x.href && x.href.type === 'internal' && x.href.path).map((x) => IMG_BASE + x.href.path.split('/').map(encodeURIComponent).join('/'));
    if (imgs.length) imgOf.set(key(f.name, f.source), imgs);
  }
  const ids = { spellIds, featIds };
  const byKey = new Map(all.map((r) => [key(r.name, r.source), r]));
  const isOption = (r) => r._isSubRace || r._versionBase_isVersion;
  // a espécie-mãe de uma opção (versão de sub-raça → a espécie da sub-raça)
  const rootOf = (r) => {
    let cur = r, guard = 0;
    while (cur && isOption(cur) && guard++ < 5) {
      cur = cur._versionBase_isVersion ? byKey.get(key(cur._versionBase_name, cur._versionBase_source)) : byKey.get(key(cur._baseName, cur._baseSource));
    }
    return cur;
  };
  const used = new Set(), usedSources = new Set();
  const species = [];
  const bySpecies = new Map();
  for (const r of all) {
    if (OUT_SOURCES.has(r.source) || isOption(r)) continue;
    let id = slug(r.name) + '-' + slug(r.source); let n = 2; while (used.has(id)) id = slug(r.name) + '-' + slug(r.source) + '-' + n++; used.add(id);
    usedSources.add(r.source);
    const ed = r.edition === 'one' || r.source === 'XPHB' ? '2024' : r.edition === 'classic' ? '2014' : bookDate(r.source) > '2024-09-16' ? '2024' : bookDate(r.source) ? '2014' : '';
    const c = core(r, ids);
    const rec = {
      id, name: r.name, source: r.source, page: r.page || null, edition: ed,
      ...c,
      lineage: r.lineage ? String(r.lineage) : '',
      age: r.age ? { mature: r.age.mature || null, max: r.age.max || null } : null,
      heightWeight: r.heightAndWeight ? { baseHeight: r.heightAndWeight.baseHeight, heightMod: r.heightAndWeight.heightMod || '', baseWeight: r.heightAndWeight.baseWeight, weightMod: r.heightAndWeight.weightMod || '' } : null,
      options: [],
      description: text((r.entries || []).filter((e) => !(e && typeof e === 'object' && e.name))),
    };
    const img = imgOf.get(key(r.name, r.source));
    if (img) rec.images = img;
    if (r.srd || r.srd52) rec.srd = true;
    species.push(rec);
    bySpecies.set(r, rec);
  }
  // opções: só o que muda em relação à espécie
  let nOpt = 0;
  for (const r of all) {
    if (!isOption(r) || OUT_SOURCES.has(r.source)) continue;
    const root = rootOf(r);
    const sp = root && bySpecies.get(root);
    if (!sp) continue;
    const c = core(r, ids);
    const baseTraits = new Map(sp.traits.map((t) => [t.name, t.text]));
    // nome da opção sem o nome da espécie: "Elf; Drow Lineage" → "Drow Lineage"; "Dragonborn (Black)" → "Black"
    let oname = r._versionBase_isVersion ? (r.name.split(';').slice(1).join(';').trim() || r.name) : r._subraceName || r.name;
    const par = new RegExp('^' + sp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\((.+)\\)$').exec(oname);
    if (par) oname = par[1];
    const opt = {
      id: sp.id + '--' + slug(oname) + (r.source !== sp.source ? '-' + slug(r.source) : ''),
      name: oname,
      kind: r._isSubRace ? 'subrace' : 'lineage',
      source: r.source, page: r.page || null,
      traits: c.traits.filter((t) => baseTraits.get(t.name) !== t.text),
      removes: sp.traits.filter((t) => !c.traits.some((x) => x.name === t.name)).map((t) => t.name),
    };
    const ob = {};
    for (const [k, v] of Object.entries(c.benefits)) if (J(v) !== J(sp.benefits[k])) ob[k] = v;
    if (Object.keys(ob).length) opt.benefits = ob;
    if (J(c.size) !== J(sp.size) && c.size.length) opt.size = c.size;
    if (J(c.speed) !== J(sp.speed) && c.speed) opt.speed = c.speed;
    if (J(c.feats) !== J(sp.feats) && c.feats.length) opt.feats = c.feats;
    const img = imgOf.get(key(r.name, r.source));
    if (img) opt.images = img;
    sp.options.push(opt);
    nOpt++;
  }
  for (const sp of species) sp.options.sort((a, b) => a.name.localeCompare(b.name));
  return { species, usedSources, stats: { options: nOpt } };
}
