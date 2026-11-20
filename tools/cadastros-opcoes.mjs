/*
 * Opções de classe do cadastro (Plano 48), usado por tools/importar-cadastros.mjs.
 * Invocações, manobras, metamagia, disciplinas, infusões, tiros arcanos, runas, pactos e os estilos de luta de 2014
 * (os de 2024 são talentos, como no 5etools).
 * - Opções pelo carregador do próprio 5etools; fora por enquanto: o livro WoW.
 * - Tipos com o nome da classe (decisão do usuário): "Eldritch Invocation · Warlock".
 * - Pré-requisitos e benefícios no formato de tools/cadastros-beneficios.mjs (nível numa classe, magia ligada, pacto, item, outra opção).
 * - Custo: recurso e quantidade (Sorcery Point 1–9, Superiority Die…).
 */
import { text, slug } from './cadastros-itens.mjs';
import { benefitsOf, prereqsOf } from './cadastros-beneficios.mjs';

const OUT_SOURCES = new Set(['WoW']);
export const OPTION_TYPES = {
  EI: { name: 'Eldritch Invocation', cls: 'Warlock' },
  PB: { name: 'Pact Boon', cls: 'Warlock' },
  MM: { name: 'Metamagic', cls: 'Sorcerer' },
  'MV:B': { name: 'Maneuver', cls: 'Battle Master' },
  MV: { name: 'Maneuver', cls: 'Fighter' },
  AS: { name: 'Arcane Shot', cls: 'Arcane Archer' },
  RN: { name: 'Rune', cls: 'Rune Knight' },
  ED: { name: 'Elemental Discipline', cls: 'Monk' },
  AI: { name: 'Artificer Infusion', cls: 'Artificer' },
  'FS:F': { name: 'Fighting Style', cls: 'Fighter' },
  'FS:P': { name: 'Fighting Style', cls: 'Paladin' },
  'FS:R': { name: 'Fighting Style', cls: 'Ranger' },
  'FS:B': { name: 'Fighting Style', cls: 'Bard' },
  RP: { name: 'Renown Perk', cls: '' },
  OTH: { name: 'Other', cls: '' },
};

export async function buildOptions(SRC, { bookDate, spellIds, featIds }) {
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_OPT_FEATURES);
  const used = new Set(), usedSources = new Set(), types = new Set();
  const options = [];
  for (const o of all) {
    if (OUT_SOURCES.has(o.source) || o._versionBase_isVersion) continue;
    let id = slug(o.name) + '-' + slug(o.source); let n = 2; while (used.has(id)) id = slug(o.name) + '-' + slug(o.source) + '-' + n++; used.add(id);
    usedSources.add(o.source);
    (o.featureType || []).forEach((t) => types.add(t));
    const ed = o.source === 'XPHB' || bookDate(o.source) > '2024-09-16' ? '2024' : bookDate(o.source) ? '2014' : '';
    const c = o.consumes;
    const r = {
      id, name: o.name, source: o.source, page: o.page || null, edition: ed,
      types: (o.featureType || []).slice(),
      prerequisites: prereqsOf(o.prerequisite, spellIds),
      cost: c ? { resource: c.name, amount: c.amount != null ? c.amount : null, min: c.amountMin != null ? c.amountMin : null, max: c.amountMax != null ? c.amountMax : null } : null,
      benefits: benefitsOf(o, spellIds),
      classFeatureVariant: !!o.isClassFeatureVariant,
      description: text(o.entries),
    };
    // reeditado como talento em 2024 (ex.: Archery|PHB → Archery|XPHB, talento)
    const rp = [].concat(o.reprintedAs || []).find((x) => x && typeof x === 'object' && x.tag === 'feat');
    if (rp) {
      const [n2, s2] = String(rp.uid).split('|');
      const fid = slug(n2) + '-' + slug(s2 || 'xphb');
      r.reprint = { feat: featIds.has(fid) ? fid : null, name: n2 };
    }
    if (o.srd || o.srd52) r.srd = true;
    options.push(r);
  }
  // pré-requisito "outra opção": nome certo e ligação (ex.: "pact of the blade|xphb" → Pact of the Blade (XPHB))
  const byName = new Map();
  for (const o of options) { const k = o.name.toLowerCase(); byName.set(k, (byName.get(k) || []).concat(o)); }
  for (const o of options) for (const row of o.prerequisites) for (const c of row) if (c.type === 'option') {
    c.ids = c.names.map((n) => { const l = byName.get(String(n).toLowerCase()) || []; const hit = l.find((x) => x.source === o.source) || l.find((x) => x.edition === o.edition) || l[0]; return hit ? hit.id : null; });
    c.names = c.names.map((n, i) => (c.ids[i] ? options.find((x) => x.id === c.ids[i]).name : n));
  }
  const typeInfo = {};
  for (const t of types) typeInfo[t] = OPTION_TYPES[t] || { name: t, cls: '' };
  return { options, types: typeInfo, usedSources };
}
