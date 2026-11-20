/*
 * Itens do cadastro (Plano 43), usado por tools/importar-cadastros.mjs.
 * Segue as regras do catálogo de itens descritas no ITEM_JSON_CONTEXT.md (sistema de um amigo do usuário), sobre os mesmos JSON do 5etools:
 * - os JSON do 5etools não são alterados: tudo é derivado deles;
 * - cópias (_copy/_mod) resolvidas pelo carregador do próprio 5etools (igual ao site);
 * - família de variante ("+1 Weapon") = uma linha, com a lista das bases compatíveis (o 5etools já aplica requires/excludes/edição);
 * - grupo (itemGroup) = uma linha com as versões; os membros saem da lista solta; grupo evolutivo ganha o estágio inicial;
 * - categoria principal e secundárias pela ordem: exceções, marcadores, tipo, palavras no nome/descrição, Other;
 * - preço: tabela de Spell Scroll → valor do livro → estimativa pela raridade (consumível mágico paga metade da estimativa).
 * Medidas em metros e quilos (Plano 40: 1 pé = 0,3 m, 1 libra = 0,5 kg); preço em peças de cobre (= centésimos de gp, como no 5etools).
 */
import path from 'path';
import { pathToFileURL } from 'url';

export const IMG_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/';
const FT = 0.3, LB = 0.5;
const m = (ft) => Math.round(ft * FT * 100) / 100;
const kg = (lb) => Math.round(lb * LB * 1000) / 1000;
export const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
const code = (s) => String(s || '').split('|')[0];
const DMG = { A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', O: 'force', L: 'lightning', N: 'necrotic', P: 'piercing', I: 'poison', Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder' };

// ---------- Texto do 5etools → texto simples (tabelas viram linhas "| a | b |") ----------
export function strip(s) {
  let prev;
  s = String(s);
  do {
    prev = s;
    s = s.replace(/\{@(\w+) ?([^{}]*?)\}/g, (_, tag, body) => {
      const p = body.split('|');
      if (tag === 'dc') return 'DC ' + p[0];
      if (tag === 'hit') return (Number(p[0]) >= 0 ? '+' : '') + p[0];
      if (tag === 'h') return 'Hit: ';
      if (tag === 'm') return 'Miss: ';
      if (tag === 'atk' || tag === 'atkr') return 'Attack: ';
      if (tag === 'chance') return p[1] || p[0] + ' percent';
      if (tag === 'recharge') return '(Recharge ' + (p[0] ? p[0] + '–6' : '6') + ')';
      if (['variantrule', 'condition', 'disease', 'action', 'item', 'spell', 'feat', 'skill', 'sense', 'creature', 'race', 'class', 'book', 'adventure', 'status', 'hazard', 'deity', 'background', 'optfeature', 'quickref', 'itemMastery', 'itemProperty', 'object', 'vehicle', 'table', 'reward', 'deck', 'card', 'trap', 'language', 'classFeature', 'subclassFeature', 'psionic', 'boon', 'cult', 'recipe', 'facility'].includes(tag)) {
        if (tag === 'classFeature' || tag === 'subclassFeature') return p[p.length - 1] && p.length > 4 ? p[p.length - 1] : p[0];
        return p[2] || p[0];
      }
      return p[0];
    });
  } while (s !== prev);
  return s.replace(/[ \t]+/g, ' ').trim();
}
function cell(c) {
  if (typeof c === 'string') return strip(c);
  if (typeof c === 'number') return String(c);
  if (c && c.roll) return c.roll.exact != null ? String(c.roll.exact) : c.roll.min + '–' + c.roll.max;
  if (c && c.entry) return strip(typeof c.entry === 'string' ? c.entry : text(c.entry));
  if (c && c.entries) return text(c.entries).replace(/\n+/g, ' ');
  return '';
}
export function text(entries) {
  const out = [];
  for (const e of [].concat(entries == null ? [] : entries)) {
    if (e == null) continue;
    if (typeof e === 'string') { const t = strip(e); if (t) out.push(t); continue; }
    if (typeof e === 'number' || typeof e === 'boolean') { out.push(String(e)); continue; }
    if (e.type === 'wrapper') { out.push(text(e.wrapped)); continue; }
    if (e.type === 'list') {
      out.push((e.items || []).map((i) => '• ' + (typeof i === 'string' ? strip(i) : (i.name ? strip(i.name) + ' ' : '') + text(i.entries || i.entry || []).replace(/\n+/g, ' '))).join('\n'));
      continue;
    }
    if (e.type === 'table') {
      const lines = [];
      if (e.caption) lines.push(strip(e.caption) + ':');
      if (e.colLabels) lines.push('| ' + e.colLabels.map(strip).join(' | ') + ' |');
      for (const r of e.rows || []) lines.push('| ' + (Array.isArray(r) ? r : r.row || []).map(cell).join(' | ') + ' |');
      out.push(lines.join('\n'));
      continue;
    }
    if (e.type === 'tableGroup' && e.tables) { out.push(text(e.tables)); continue; }
    if (e.type === 'abilityDc') { out.push(strip(e.name) + ' save DC = 8 + your proficiency bonus + your ' + (e.attributes || []).join('/') + ' modifier'); continue; }
    if (e.type === 'abilityAttackMod') { out.push(strip(e.name) + ' attack modifier = your proficiency bonus + your ' + (e.attributes || []).join('/') + ' modifier'); continue; }
    if (e.type === 'link') { out.push(strip(e.text || '')); continue; }
    if (e.type === 'image' || e.type === 'gallery' || e.type === 'hr') continue;
    const body = e.entries || e.items || e.entry;
    if (body != null) {
      const t = text(body);
      out.push(e.name ? strip(e.name) + '. ' + t : t);
      continue;
    }
    if (e.name) out.push(strip(e.name));
  }
  return out.filter(Boolean).join('\n\n');
}
// {=campo}, {{item.campo}}, {{getFullImmRes item.campo}}; {{prop_name}} sai
function templ(s, it) {
  const val = (f) => { const v = it[f]; return v == null ? '' : Array.isArray(v) ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(', ') : typeof v === 'object' ? Object.entries(v).map(([k, x]) => k + ' ' + x).join(', ') : String(v); };
  return s.replace(/\{=(\w+)(\/\w+)?\}/g, (_, f) => val(f)).replace(/\{\{(?:getFullImmRes )?item\.(\w+)\}\}/g, (_, f) => val(f)).replace(/\{\{prop_name(_lower)?\}\}/g, '');
}

// ---------- Raridade, categorias, preço ----------
const RARITY = { none: 'None', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', 'very rare': 'Very Rare', legendary: 'Legendary', artifact: 'Artifact', varies: 'Varies', unknown: 'Unknown', 'unknown (magic)': 'Unknown' };
const rarityOf = (r) => RARITY[String(r == null ? 'unknown' : r).trim().toLowerCase()] || 'Unknown';
const ESTIMATE = { Common: 100, Uncommon: 400, Rare: 4000, 'Very Rare': 40000, Legendary: 200000 }; // gp
const LADDER = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];
const SCROLL = [30, 50, 200, 300, 2000, 3000, 20000, 25000, 30000, 100000]; // gp, truque até 9º

export const CATEGORIES = ['Weapon', 'Armor', 'Ammunition', 'Potion', 'Scroll', 'Ring', 'Rod', 'Staff', 'Wand', 'Spellcasting Focus', 'Instrument', 'Tool', 'Adventuring Gear',
  'Explosive', 'Food and Drink', 'Mount', 'Vehicle', 'Gem', 'Trade Good', 'Amulet', 'Apparel', 'Bag/Container', 'Clockwork', 'Tome', 'Summonable', 'Service',
  'Consumable', 'Poison', 'Tattoo', 'Cursed', 'Wondrous', 'Other'];
const TYPE_CAT = {
  M: 'Weapon', R: 'Weapon', LA: 'Armor', MA: 'Armor', HA: 'Armor', S: 'Armor', A: 'Ammunition', AF: 'Ammunition', P: 'Potion', SC: 'Scroll', RG: 'Ring', RD: 'Rod', WD: 'Wand',
  SCF: 'Spellcasting Focus', INS: 'Instrument', T: 'Tool', AT: 'Tool', GS: 'Tool', G: 'Adventuring Gear', TAH: 'Adventuring Gear', EXP: 'Explosive', FD: 'Food and Drink',
  MNT: 'Mount', $G: 'Gem', TG: 'Trade Good', TB: 'Trade Good', $: 'Trade Good', $A: 'Trade Good', $C: 'Trade Good', AIR: 'Vehicle', SHP: 'Vehicle', SPC: 'Vehicle', VEH: 'Vehicle',
};
const HEUR = [
  ['Amulet', /\b(amulet|necklace|periapt|medallion|brooch|talisman)s?\b/],
  ['Apparel', /\b(boots|cloak|gloves|gauntlets|helm|helmet|hat|belt|bracers|robe|slippers|goggles|mask)\b/],
  ['Bag/Container', /\b(bag|pouch|haversack|bottle|flask|bowl|box|chest|coffer|quiver)s?\b|portable hole/],
  ['Clockwork', /\bclockwork\b|mechanical device/],
  ['Tome', /\b(book|manual|tome|codex|grimoire)s?\b/],
  ['Summonable', /\b(summons?|summoned|conjures?|materialize|creates?)\b.{0,80}?\b(creatures?|beasts?|spirits?|elementals?|constructs?)\b/],
  ['Gem', /\b(gem|pearl|jewel|crystal|bead|stone)s?\b/],
  ['Service', /\b(hireling|service)s?\b|spellcasting service/],
  ['Consumable', /\b(consumed|destroyed|disintegrates)\b|single use|one use/],
];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isWeapon = (it) => !!(it.weapon || ['M', 'R'].includes(code(it.type)) || it.dmg1);
const isArmor = (it) => !!(it.armor || ['LA', 'MA', 'HA', 'S'].includes(code(it.type)));

function categorize(it, firstPara) {
  const t = code(it.type);
  const markers = [];
  if (it.tattoo) markers.push('Tattoo');
  if (it.poison) markers.push('Poison');
  if (t === 'RD') markers.push('Rod'); else if (it.staff) markers.push('Staff');
  if (isWeapon(it)) markers.push('Weapon');
  if (isArmor(it)) markers.push('Armor');
  let primary;
  if (/^deck of many things$/i.test(it.name) && /^X?DMG$/.test(it.source)) primary = 'Other';
  else if (/^portable hole$/i.test(it.name) && /^X?DMG$/.test(it.source)) primary = 'Bag/Container';
  else if (markers.length) primary = markers[0];
  else if (TYPE_CAT[t]) primary = TYPE_CAT[t];
  else {
    const hay = norm(it.name + ' ' + (firstPara || ''));
    const h = HEUR.find(([, re]) => re.test(hay));
    primary = h ? h[0] : (it.miscTags || []).includes('CNS') ? 'Consumable' : 'Other';
  }
  const sec = new Set(markers);
  if (TYPE_CAT[t]) sec.add(TYPE_CAT[t]);
  if ((it.miscTags || []).includes('CNS')) sec.add('Consumable');
  if (it.curse) sec.add('Cursed');
  if (it.wondrous) sec.add('Wondrous');
  sec.delete(primary);
  return [primary, ...CATEGORIES.filter((c) => sec.has(c))];
}

function scrollPrice(it) {
  if (!/^X?DMG$/.test(it.source)) return null;
  const mm = /^spell scroll \((cantrip|level (\d)|(\d)(st|nd|rd|th) level)\)$/i.exec(it.name);
  if (!mm) return null;
  const lvl = /cantrip/i.test(mm[1]) ? 0 : Number(mm[2] || mm[3]);
  return SCROLL[lvl] != null ? SCROLL[lvl] * 100 : null;
}
// → [preço em pc, origem]
function priceOf(it, rarity, magic, cats) {
  const sp = scrollPrice(it);
  if (sp != null) return [sp, 'scroll'];
  if (typeof it.value === 'number' && Number.isFinite(it.value) && it.value >= 0) return [it.value, 'book'];
  if (ESTIMATE[rarity] != null) return [ESTIMATE[rarity] * 100 / (magic && cats.includes('Consumable') ? 2 : 1), 'rarity'];
  return [null, null];
}

// ---------- Propriedades, maestrias, blocos ----------
export async function buildItems(SRC, { sources, bookDate }) {
  process.chdir(SRC);
  const root = pathToFileURL(SRC + path.sep).href;
  for (const f of ['js/parser.js', 'js/utils.js', 'js/utils-dataloader.js', 'js/utils-config.js', 'js/render.js', 'js/render-dice.js']) await import(root + f);
  const ut = await import(root + 'node/util.js');
  ut.patchLoadJson();
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_ITEMS);
  const fluff = await DataLoader.pCacheAndGetAllSite('itemFluff');
  const baseJson = JSON.parse((await import('fs')).readFileSync(path.join(SRC, 'data', 'items-base.json'), 'utf8'));
  const propName = {};
  for (const p of baseJson.itemProperty) propName[p.abbreviation] = p.name || (p.entries && p.entries[0] && p.entries[0].name) || p.abbreviation;
  propName.S = 'Special';

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

  const used = new Set();
  const usedSources = new Set();
  const uid = (prefix, it) => { let id = prefix + slug(it.name) + '-' + slug(it.source); let n = 2; while (used.has(id)) id = prefix + slug(it.name) + '-' + slug(it.source) + '-' + n++; used.add(id); return id; };
  const editionOf = (it, isBase) => (it.edition === 'one' ? '2024' : it.edition === 'classic' ? '2014' : isBase ? '' : bookDate(it.source) > '2024-09-16' ? '2024' : bookDate(it.source) ? '2014' : '');
  const num = (v) => { const n = Number(String(v == null ? '' : v).replace('+', '')); return Number.isFinite(n) ? n : 0; };
  const strList = (a) => [].concat(a || []).map((x) => (typeof x === 'string' ? x : x && (x.special || (x.resist || x.immune || x.vulnerable || x.conditionImmune || []).join('/') + (x.note ? ' (' + strip(x.note) + ')' : '')))).filter(Boolean);

  function weaponBlock(it) {
    if (!isWeapon(it)) return null;
    const props = [], notes = {};
    for (const p of it.property || []) { const c = code(typeof p === 'object' ? p.uid : p), nm = propName[c] || c; props.push(nm); if (typeof p === 'object' && p.note) notes[nm] = strip(p.note); }
    const melee = code(it.type) !== 'R' && !(it.range && !props.includes('Thrown') && code(it.type) !== 'M');
    const rng = it.range ? String(it.range).split('/').map(Number) : null;
    const w = {
      category: it.weaponCategory || 'simple', kind: melee ? 'melee' : 'ranged',
      damage: { dice: it.dmg1 || '', type: DMG[it.dmgType] || '' }, versatile: it.dmg2 || '',
      properties: props, mastery: (it.mastery || []).map((x) => code(typeof x === 'object' ? x.uid : x)),
      reach: melee ? m(props.includes('Reach') ? 10 : 5) : null,
      range: rng && rng[0] ? { normal: m(rng[0]), long: m(rng[1] || rng[0]) } : null,
      ammo: it.ammoType ? code(it.ammoType).replace(/\b\w/g, (c) => c.toUpperCase()) : '', reload: it.reload || null,
      bonusAttack: num(it.bonusWeapon) + num(it.bonusWeaponAttack), bonusDamage: num(it.bonusWeapon) + num(it.bonusWeaponDamage),
      critThreshold: it.critThreshold || null, extraDamage: [],
    };
    if (Object.keys(notes).length) w.propertyNotes = notes;
    return w;
  }
  function armorBlock(it) {
    if (!isArmor(it)) return null;
    const t = { LA: 'light', MA: 'medium', HA: 'heavy', S: 'shield' }[code(it.type)] || 'light';
    return { type: t, ac: it.ac != null ? it.ac : t === 'shield' ? 2 : null, dexMax: t === 'light' ? null : t === 'medium' ? (it.dexterityMax !== undefined ? it.dexterityMax : 2) : 0,
      strength: it.strength ? Number(it.strength) : null, stealth: !!it.stealth, bonusAc: num(it.bonusAc) };
  }
  function focusBlock(it) {
    if (!it.focus && !it.scfType) return null;
    const classes = Array.isArray(it.focus) ? it.focus : [];
    const byType = { arcane: ['Sorcerer', 'Warlock', 'Wizard'], druid: ['Druid', 'Ranger'], holy: ['Cleric', 'Paladin'] };
    return { type: it.scfType || '', classes: classes.length ? classes : it.focus === true ? ['Any Spellcaster'] : byType[it.scfType] || [] };
  }
  function bonusBlock(it) {
    const b = {};
    if (!isArmor(it) && it.bonusAc) b.ac = num(it.bonusAc);
    if (it.bonusSpellAttack) b.spellAttack = num(it.bonusSpellAttack);
    if (it.bonusSpellSaveDc) b.spellSaveDc = num(it.bonusSpellSaveDc);
    if (it.bonusSpellDamage) b.spellDamage = num(it.bonusSpellDamage);
    if (it.bonusSavingThrow) b.savingThrow = num(it.bonusSavingThrow);
    if (it.bonusAbilityCheck) b.abilityCheck = num(it.bonusAbilityCheck);
    if (it.bonusProficiencyBonus) b.proficiencyBonus = num(it.bonusProficiencyBonus);
    return Object.keys(b).length ? b : null;
  }
  // Registro comum a item, base, família e grupo
  function record(it, kind, prefix) {
    const isBase = kind === 'base';
    const entries = it._fullEntries || it.entries || [];
    const desc = templ(text(entries), it);
    const firstPara = desc.split('\n\n')[0] || '';
    const rarity = rarityOf(it.rarity);
    const rawR = String(it.rarity == null ? '' : it.rarity).toLowerCase();
    const magic = !isBase && !(rawR === 'none' || rawR === 'unknown');
    const cats = categorize(it, firstPara);
    const [cost, costOrigin] = priceOf(it, rarity, magic, cats);
    usedSources.add(it.source);
    const r = {
      id: uid(prefix, it), kind, name: it.name, source: it.source, page: it.page || null, edition: editionOf(it, isBase),
      category: cats[0], categories: cats, rarity, magic,
      attune: it.reqAttune === true ? true : it.reqAttune ? strip(it.reqAttune) : false,
      weight: typeof it.weight === 'number' ? kg(it.weight) : null, cost, costOrigin,
      description: desc,
    };
    const w = weaponBlock(it); if (w) r.weapon = w;
    const a = armorBlock(it); if (a) r.armor = a;
    const f = focusBlock(it); if (f) r.focus = f;
    const b = bonusBlock(it); if (b) r.bonus = b;
    if (it.charges) r.charges = String(it.charges);
    if (it.recharge) r.recharge = it.recharge + (it.rechargeAmount ? ' (' + strip(String(it.rechargeAmount)) + ')' : '');
    for (const k of ['resist', 'immune', 'vulnerable', 'conditionImmune']) { const l = strList(it[k]); if (l.length) r[k] = l; }
    if (it.sentient) r.sentient = true;
    const tags = [it.firearm && 'firearm', it.age, it.tier, it.curse && 'cursed', ...(it.miscTags || [])].filter(Boolean);
    if (tags.length) r.tags = tags;
    const img = imgOf.get(key(it.name, it.source));
    if (img) r.images = img;
    if (it.srd || it.srd52) r.srd = true;
    return r;
  }

  const items = [];
  const byKey = new Map(); // nome|fonte → registro (para grupos)
  const byName = new Map();
  const add = (r, it) => { items.push(r); byKey.set(key(it.name, it.source), r); const n = it.name.toLowerCase(); byName.set(n, (byName.get(n) || []).concat(r)); };

  // Bases (equipamento mundano): ids iguais aos da antiga aba Armas (Plano 42): <nome>-<fonte>
  for (const it of all.filter((x) => x.__prop === 'baseitem')) add(record(it, 'base', ''), it);
  const baseByKey = new Map(items.map((r) => [key(r.name, r.source), r]));
  // Itens explícitos
  for (const it of all.filter((x) => x.__prop === 'item' && x._category !== 'Specific Variant')) {
    const r = record(it, 'item', '');
    if (it.baseItem) { const [bn, bs] = it.baseItem.split('|'); const b = baseByKey.get(key(bn, bs || 'PHB')); if (b) r.baseItem = b.id; }
    if (!r.images && r.baseItem) { /* imagem: só a própria (sem herdar da base) */ }
    add(r, it);
  }
  // Famílias de variantes: uma linha, com as bases compatíveis
  let specific = 0;
  for (const gv of all.filter((x) => x.__prop === 'magicvariant')) {
    const inh = gv.inherits || {};
    const flat = Object.assign({}, gv, inh, { name: gv.name, source: gv.source || inh.source, entries: gv.entries || inh.entries });
    if (!flat.source) continue;
    const r = record(flat, 'family', 'f-');
    const bases = [];
    for (const v of gv.variants || []) {
      const b = baseByKey.get(key(v.base.name, v.base.source));
      if (!b) continue;
      const sv = v.specificVariant;
      const rarity = rarityOf(sv.rarity);
      const fam = ESTIMATE[rarity] != null ? ESTIMATE[rarity] * 100 / (r.categories.includes('Consumable') ? 2 : 1) : null;
      // preço: o 5etools já aplicou valueExpression/valueMult quando existem; senão base + parte mágica
      const cost = typeof sv.value === 'number' ? sv.value : gv.inherits && (gv.inherits.valueExpression || gv.inherits.valueMult) ? null : b.cost != null && fam != null ? b.cost + fam : null;
      bases.push({ id: b.id, name: sv.name, cost, weight: typeof sv.weight === 'number' ? kg(sv.weight) : b.weight });
      specific++;
    }
    r.bases = bases;
    r.rule = { prefix: inh.namePrefix || '', suffix: inh.nameSuffix || '', remove: inh.nameRemove || '' };
    // o que a família soma à arma escolhida (+1 no ataque e no dano, crítico…)
    const wb = { attack: num(inh.bonusWeapon) + num(inh.bonusWeaponAttack), damage: num(inh.bonusWeapon) + num(inh.bonusWeaponDamage), critThreshold: inh.critThreshold || null };
    if (wb.attack || wb.damage || wb.critThreshold) r.weaponBonus = wb;
    r.requires = describeReq(gv.requires, gv.excludes);
    const baseCats = [...new Set(bases.map((x) => items.find((i) => i.id === x.id)).filter(Boolean).map((i) => i.category))];
    if (baseCats.length === 1) r.categories = [baseCats[0], ...r.categories.filter((c) => c !== baseCats[0] && c !== 'Other')], r.category = baseCats[0];
    r.cost = null; r.costOrigin = null; // depende da base
    add(r, flat);
    // a família aceita o nome com " (*)" nos grupos
    byKey.set(key(gv.name + ' (*)', flat.source), r);
  }
  // Grupos
  const diag = { groupRefMissing: [], evolvingInitial: [] };
  const member = new Set();
  for (const g of all.filter((x) => x.__prop === 'itemGroup')) {
    const r = record(g, 'group', 'g-');
    const vers = [];
    for (const ref of g.items || []) {
      if (typeof ref !== 'string') continue;
      const [n, s] = ref.split('|');
      let t = byKey.get(key(n, s || g.source));
      if (!t && !s) { const c = byName.get(n.toLowerCase()) || []; if (c.length === 1) t = c[0]; }
      if (!t) t = byKey.get(key(n + ' (*)', s || g.source));
      if (!t) { diag.groupRefMissing.push(g.name + ' → ' + ref); continue; }
      if (!vers.includes(t.id)) vers.push(t.id);
    }
    // grupo evolutivo (propriedade "Evolving Item") sem estágio próprio: cria o inicial
    if ((g.property || []).some((p) => code(typeof p === 'object' ? p.uid : p) === 'Evo')) {
      const known = LADDER.includes(rarityOf(g.rarity)) ? rarityOf(g.rarity) : null;
      const first = vers.map((id) => items.find((i) => i.id === id)).find((i) => i && LADDER.includes(i.rarity));
      const ini = Object.assign({}, r, { id: r.id + '-initial', kind: 'item', name: g.name + ' (Initial)', rarity: known || (first && LADDER.indexOf(first.rarity) > 0 ? LADDER[LADDER.indexOf(first.rarity) - 1] : 'Unknown'), images: r.images });
      delete ini.versions;
      const [c2, o2] = priceOf({ name: ini.name, source: ini.source }, ini.rarity, true, ini.categories);
      ini.cost = c2; ini.costOrigin = o2;
      items.push(ini); used.add(ini.id);
      vers.unshift(ini.id);
      diag.evolvingInitial.push(ini.name + ' = ' + ini.rarity);
    }
    r.versions = vers;
    for (const id of vers) member.add(id);
    // o grupo junta categorias e raridades das versões
    const vs = vers.map((id) => items.find((i) => i.id === id)).filter(Boolean);
    r.categories = [...new Set([r.category, ...vs.flatMap((v) => v.categories)])];
    if (r.category === 'Other' && vs.length) { const c = [...new Set(vs.map((v) => v.category))]; if (c.length === 1) r.category = c[0]; }
    r.categories = [r.category, ...CATEGORIES.filter((x) => x !== r.category && x !== 'Other' && r.categories.includes(x))];
    r.rarities = [...new Set(vs.map((v) => v.rarity))];
    if (!r.images) { const vi = vs.find((v) => v.images); if (vi) r.images = vi.images; }
    add(r, g);
  }
  for (const it of items) if (member.has(it.id) && it.kind !== 'group') it.memberOf = items.find((g) => g.kind === 'group' && g.versions.includes(it.id)).id;
  // imagem: família ou grupo quando o item não tem a sua
  for (const it of items) if (!it.images && it.memberOf) { const g = items.find((x) => x.id === it.memberOf); if (g && g.images) it.images = g.images; }

  return { items, usedSources, stats: { specific, ...diag } };
}

const REQ_TYPE = { M: 'melee weapon', R: 'ranged weapon', LA: 'light armor', MA: 'medium armor', HA: 'heavy armor', S: 'shield', A: 'ammunition', AF: 'ammunition', SCF: 'spellcasting focus' };
const REQ_PROP = { F: 'Finesse', A: 'Ammunition', T: 'Thrown', '2H': 'Two-Handed', H: 'Heavy', L: 'Light', V: 'Versatile', R: 'Reach', LD: 'Loading' };
const REQ_DMG = { B: 'bludgeoning', P: 'piercing', S: 'slashing' };
function describeReq(req, exc) {
  const val = (k, v) => {
    if (v === true) return k === 'weapon' ? 'weapon' : k === 'armor' ? 'armor' : k.replace(/([A-Z])/g, ' $1').toLowerCase();
    const list = [].concat(v).map((x) => code(x));
    if (k === 'type') return list.map((x) => REQ_TYPE[x] || x).join('/');
    if (k === 'weaponCategory') return list.join('/') + ' weapon';
    if (k === 'dmgType') return list.map((x) => REQ_DMG[x] || x).join('/') + ' damage';
    if (k === 'property') return 'with ' + [...new Set(list.map((x) => REQ_PROP[x] || x))].join('/');
    if (k === 'scfType') return list.join('/') + ' focus';
    return k + ' ' + list.join('/');
  };
  // { name, source } vira só o nome; alternativas repetidas (2014/2024) aparecem uma vez
  const one = (o) => (o.name ? [].concat(o.name).join('/') : Object.entries(o).map(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? k + ' ' + JSON.stringify(v) : val(k, v))).join(', '));
  const r = [...new Set((req || []).map(one))].join(', ');
  const e = exc ? one(exc).replace(/^with /, '') : '';
  return (r ? 'Any ' + r : 'Any item') + (e ? ' (except ' + e + ')' : '');
}
