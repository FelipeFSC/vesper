/*
 * Talentos do cadastro (Plano 44), usado por tools/importar-cadastros.mjs.
 * - Talentos pelo carregador do próprio 5etools (cópias resolvidas como no site).
 * - Pré-requisitos e benefícios no formato de tools/cadastros-beneficios.mjs (reaproveitado por antecedentes, espécies e classes).
 * - Magias concedidas apontam para o cadastro de Magias (id <nome>-<fonte>); as à escolha guardam a regra ("Cantrip Wizard").
 * - Fora por enquanto: o livro WoW (outro jogo), como nas magias.
 */
import { text, slug, IMG_BASE } from './cadastros-itens.mjs';
import { benefitsOf, prereqsOf } from './cadastros-beneficios.mjs';

const OUT_SOURCES = new Set(['WoW']);
export const FEAT_CATEGORY = { O: 'Origin', G: 'General', FS: 'Fighting Style', 'FS:P': 'Fighting Style (Paladin)', 'FS:R': 'Fighting Style (Ranger)', EB: 'Epic Boon', D: 'Dragonmark', DG: 'Dark Gift' };

export async function buildFeats(SRC, { bookDate, spellIds }) {
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_FEATS);
  let fluff = [];
  try { fluff = await DataLoader.pCacheAndGetAllSite('featFluff'); } catch { /* sem imagens */ }
  const key = (n, s) => (String(n).trim() + '|' + String(s || '').trim()).toLowerCase();
  const imgOf = new Map();
  for (const f of fluff) {
    const imgs = (f.images || []).filter((x) => x && x.type === 'image' && x.href && x.href.type === 'internal' && x.href.path).map((x) => IMG_BASE + x.href.path.split('/').map(encodeURIComponent).join('/'));
    if (imgs.length) imgOf.set(key(f.name, f.source), imgs);
  }
  const used = new Set(), usedSources = new Set();
  const feats = [];
  for (const f of all) {
    if (OUT_SOURCES.has(f.source) || f._versionBase_isVersion) continue; // variações geradas ("Magic Initiate; Cleric"): o talento principal já tem todas
    let id = slug(f.name) + '-' + slug(f.source); let n = 2; while (used.has(id)) id = slug(f.name) + '-' + slug(f.source) + '-' + n++; used.add(id);
    usedSources.add(f.source);
    const ed = f.source === 'XPHB' || bookDate(f.source) > '2024-09-16' ? '2024' : bookDate(f.source) ? '2014' : '';
    const prereqs = prereqsOf(f.prerequisite).map((row) => row.filter((c) => !(c.type === 'campaign' && c.names.some((x) => /warcraft/i.test(x)))));
    const r = {
      id, name: f.name, source: f.source, page: f.page || null, edition: ed,
      category: FEAT_CATEGORY[f.category] || 'Uncategorized',
      repeatable: !!f.repeatable,
      prerequisites: prereqs.filter((row) => row.length),
      benefits: benefitsOf(f, spellIds),
      description: text(f.entries),
    };
    const img = imgOf.get(key(f.name, f.source));
    if (img) r.images = img;
    if (f.srd || f.srd52) r.srd = true;
    feats.push(r);
  }
  return { feats, usedSources };
}
