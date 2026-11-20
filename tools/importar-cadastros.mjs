/*
 * Gera os cadastros padrão (Plano 42) a partir dos JSON do 5etools.
 * Uso:  node tools/importar-cadastros.mjs [pasta do 5etools-src]   (padrão: D:\Projetos\5etools-src)
 *
 * Saída em data/cadastros/:
 *   items.json / items.js       itens (Plano 43): bases, itens, famílias de variantes e grupos (ver tools/cadastros-itens.mjs)
 *   spells.json / spells.js     magias (Plano 45): nível, escola, conjuração, efeito, nível superior, classes (ver tools/cadastros-magias.mjs)
 *   feats.json / feats.js       talentos (Plano 44): categoria, pré-requisitos e benefícios (ver tools/cadastros-talentos.mjs e cadastros-beneficios.mjs)
 *   species.json / species.js   espécies (Plano 47): corpo, traços, benefícios, sub-raças/linhagens como opções (ver tools/cadastros-especies.mjs)
 *   subclasses.json / .js       subclasses (Plano 50): características, magias, conjuração e opções (ver tools/cadastros-subclasses.mjs)
 *   classes.json / classes.js   classes base (Plano 49): progressão 1–20, características, equipamento, conjuração (ver tools/cadastros-classes.mjs)
 *   options.json / options.js   opções de classe (Plano 48): invocações, manobras, metamagia… (ver tools/cadastros-opcoes.mjs)
 *   backgrounds.json / .js      antecedentes (Plano 46): talento, equipamento, característica e tabelas (ver tools/cadastros-antecedentes.mjs)
 *   attacks.json / attacks.js   ataques que não são de arma: desarmado, arma improvisada e ataques de espécies
 *                               (o ataque de uma arma é montado a partir do item, na página)
 * O .js tem o mesmo conteúdo do .json; serve para abrir o Vésper direto do arquivo (sem servidor).
 * Medidas guardadas no sistema métrico do Vésper (Plano 40): 1 pé = 0,3 m, 1 libra = 0,5 kg. Preço em peças de cobre.
 * Textos em inglês, como no 5etools (a tradução vem depois).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildItems, strip as stripX, text as textX } from './cadastros-itens.mjs';
import { buildSpells } from './cadastros-magias.mjs';
import { buildFeats } from './cadastros-talentos.mjs';
import { buildBackgrounds } from './cadastros-antecedentes.mjs';
import { buildSpecies } from './cadastros-especies.mjs';
import { buildOptions } from './cadastros-opcoes.mjs';
import { buildClasses } from './cadastros-classes.mjs';
import { buildSubclasses } from './cadastros-subclasses.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'data', 'cadastros');
const SRC = path.resolve(process.argv[2] || 'D:/Projetos/5etools-src');
const DATA = path.join(SRC, 'data');
if (!fs.existsSync(path.join(DATA, 'items-base.json'))) {
  console.error('Não achei ' + path.join(DATA, 'items-base.json') + '. Passe a pasta do 5etools-src: node tools/importar-cadastros.mjs <pasta>');
  process.exit(1);
}
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const base = load('items-base.json');
const races = load('races.json');
const vrules = load('variantrules.json').variantrule;
const books = load('books.json').book;
const advs = load('adventures.json').adventure;

const FT = 0.3, LB = 0.5;
const m = (ft) => Math.round(ft * FT * 100) / 100;
const DMG = { A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', O: 'force', L: 'lightning', N: 'necrotic', P: 'piercing', I: 'poison', Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder' };
const DMG_WORDS = Object.values(DMG);
const NEW = new Set(['XPHB', 'XDMG', 'XMM', 'EFA', 'FRHoF', 'HotB', 'WoW', 'RHW']);
const edition = (it) => (it.edition === 'one' || (!it.edition && NEW.has(it.source)) ? '2024' : '2014');
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const code = (s) => String(s || '').split('|')[0];

const strip = stripX, text = textX;

// ---------- Fontes ----------
const sources = {};
for (const b of books.concat(advs)) sources[b.id] = b.name;
const usedSources = new Set();

// ---------- Ataques ----------
const attacks = [];
const blankSave = () => ({ ability: 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'half', effect: '' });
function attack(o) {
  const a = Object.assign({
    id: '', name: '', source: '', page: null, edition: '2014', origin: 'basic', originName: '',
    type: 'melee', reach: 1.5, range: null, area: null,
    attack: { ability: 'str', bonus: 0, prof: 'prof' },
    save: blankSave(), saveOnHit: false,
    damage: [], versatile: '', crit: 20, critExtra: '', ammo: '', uses: '', weapon: '',
    description: '',
  }, o);
  a.id = a.id || slug(a.name) + '-' + slug(a.source);
  usedSources.add(a.source);
  attacks.push(a);
}

// básicos: ataque desarmado e arma improvisada
const vr = (name, src) => vrules.find((v) => v.name === name && v.source === src);
attack({
  id: 'unarmed-strike-phb', name: 'Unarmed Strike', source: 'PHB', page: 195, edition: '2014', origin: 'basic',
  attack: { ability: 'str', bonus: 0, prof: 'prof' }, damage: [{ dice: '1', ability: 'str', type: 'bludgeoning' }],
  description: 'Instead of using a weapon to make a melee weapon attack, you can use an unarmed strike: a punch, kick, head-butt, or similar forceful blow (none of which count as weapons). On a hit, an unarmed strike deals bludgeoning damage equal to 1 + your Strength modifier. You are proficient with your unarmed strikes.',
});
const us = vr('Unarmed Strike', 'XPHB');
attack({
  id: 'unarmed-strike-xphb', name: 'Unarmed Strike', source: 'XPHB', page: us && us.page, edition: '2024', origin: 'basic',
  attack: { ability: 'str', bonus: 0, prof: 'prof' }, damage: [{ dice: '1', ability: 'str', type: 'bludgeoning' }],
  description: us ? text(us.entries) : '',
});
for (const [opt, eff] of [['Grapple', 'The target has the Grappled condition.'], ['Shove', 'You either push the target 5 feet away or cause it to have the Prone condition.']]) {
  attack({
    id: 'unarmed-strike-' + slug(opt) + '-xphb', name: 'Unarmed Strike (' + opt + ')', source: 'XPHB', page: us && us.page, edition: '2024', origin: 'basic', type: 'attack-save',
    attack: { ability: 'none', bonus: 0, prof: 'none' },
    save: { ability: 'str-dex', dc: 'calc', dcFixed: 10, dcAbility: 'str', dcBonus: 0, onSuccess: 'none', effect: eff },
    description: us ? text(us.entries) : '',
  });
}
attack({
  id: 'improvised-weapon-phb', name: 'Improvised Weapon', source: 'PHB', page: 147, edition: '2014', origin: 'basic', range: { normal: m(20), long: m(60) },
  attack: { ability: 'str', bonus: 0, prof: 'none' }, damage: [{ dice: '1d4', ability: 'str', type: '' }],
  description: 'Sometimes characters don\'t have their weapons and have to attack with whatever is at hand. An improvised weapon includes any object you can wield in one or two hands, such as broken glass, a table leg, a frying pan, a wagon wheel, or a dead goblin. Often, an improvised weapon is similar to an actual weapon and can be treated as such. An object that bears no resemblance to a weapon deals 1d4 damage (the DM assigns a damage type appropriate to the object). If a character uses a ranged weapon to make a melee attack, or throws a melee weapon that does not have the thrown property, it also deals 1d4 damage. An improvised thrown weapon has a normal range of 20 feet and a long range of 60 feet.',
});
const iw = vr('Improvised Weapons', 'XPHB');
attack({
  id: 'improvised-weapon-xphb', name: 'Improvised Weapon', source: 'XPHB', page: iw && iw.page, edition: '2024', origin: 'basic', range: { normal: m(20), long: m(60) },
  attack: { ability: 'str', bonus: 0, prof: 'none' }, damage: [{ dice: '1d4', ability: 'str', type: '' }],
  description: iw ? text(iw.entries) : '',
});

// ---------- Espécies (raças) ----------
const raceBy = (name, src) => races.race.find((r) => r.name === name && r.source === src);
function findEntry(entries, name) {
  for (const e of [].concat(entries || [])) {
    if (e && typeof e === 'object') {
      if (e.name === name) return e;
      const f = findEntry(e.entries || e.items || [], name);
      if (f) return f;
    }
  }
  return null;
}
const warn = [];
// armas naturais: dados e tipo de dano lidos do próprio texto
const NATURAL = [
  ['Aarakocra', 'DMG', 'Talons'], ['Aarakocra', 'EEPC', 'Talons'], ['Aarakocra', 'MPMM', 'Talons'],
  ['Centaur', 'GGR', 'Hooves'], ['Centaur', 'MPMM', 'Hooves'],
  ['Dhampir', 'VRGR', 'Vampiric Bite'], ['Dhampir', 'RHW', 'Vampiric Bite'],
  ['Gnoll', 'DMG', 'Bite'], ['Leonin', 'MOT', 'Claws'],
  ['Lizardfolk', 'VGM', 'Bite'], ['Lizardfolk', 'MPMM', 'Bite'],
  ['Minotaur', 'GGR', 'Horns'], ['Minotaur', 'MPMM', 'Horns'], ['Minotaur (Amonkhet)', 'PSA', 'Natural Weapon', 'Horns'],
  ['Satyr', 'MOT', 'Ram'], ['Satyr', 'MPMM', 'Ram'],
  ['Shifter', 'MPMM', 'Longtooth'], ['Shifter', 'EFA', 'Longtooth'],
  ['Tabaxi', 'VGM', "Cat's Claws"], ['Tabaxi', 'MPMM', "Cat's Claws"],
  ['Tortle', 'TTP', 'Claws'], ['Tortle', 'MPMM', 'Claws'],
  ['Lupin', 'RHW', 'Feral Pounce'], ['Tauren', 'WoW', 'Horns'],
];
for (const [race, src, entry, label] of NATURAL) {
  const r = raceBy(race, src);
  const e = r && findEntry(r.entries, entry);
  if (!e) { warn.push(race + '|' + src + ' :: ' + entry); continue; }
  const t = text(e.entries || e.entry);
  const dice = (/(\d+d\d+)/.exec(t) || [])[1] || '1';
  // o primeiro "<tipo> damage" que não seja o "bludgeoning damage normal" do ataque desarmado
  const type = ([...t.matchAll(new RegExp('\\b(' + DMG_WORDS.join('|') + ') damage\\b(?! normal)', 'gi'))][0] || [])[1] || 'bludgeoning';
  const ab = /Constitution modifier/i.test(t) ? 'con' : 'str';
  attack({
    id: 'r-' + slug(race) + '-' + slug(label || entry) + '-' + slug(src), name: (label || entry) + ' (' + race.replace(/ \(.*\)/, '') + ')', source: src, page: r.page || null,
    edition: edition(r), origin: 'species', originName: race,
    attack: { ability: ab, bonus: 0, prof: 'prof' }, damage: [{ dice, ability: ab, type: type.toLowerCase() }],
    uses: /bonus action/i.test(t) ? 'Bonus Action' : '',
    description: t,
  });
}
// Naga (PSA): mordida com veneno (teste de resistência ao acertar)
{
  const r = raceBy('Naga', 'PSA'), e = r && findEntry(r.entries, 'Natural Weapons');
  if (e) attack({
    id: 'r-naga-bite-psa', name: 'Bite (Naga)', source: 'PSA', page: r.page || null, edition: '2014', origin: 'species', originName: 'Naga',
    attack: { ability: 'str', bonus: 0, prof: 'prof' }, damage: [{ dice: '1d4', ability: 'str', type: 'piercing' }, { dice: '1d4', ability: 'none', type: 'poison' }],
    saveOnHit: true, save: { ability: 'con', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'none', effect: 'On a failed save, the target takes the poison damage (Damage 2).' },
    description: text(e.entries || e.entry),
  });
  else warn.push('Naga|PSA');
}
// Simic Hybrid (GGR): cuspe ácido
{
  const r = raceBy('Simic Hybrid', 'GGR'), e = r && findEntry(r.entries, 'Acid Spit');
  if (e) attack({
    id: 'r-simic-hybrid-acid-spit-ggr', name: 'Acid Spit (Simic Hybrid)', source: 'GGR', page: r.page || null, edition: '2014', origin: 'species', originName: 'Simic Hybrid',
    type: 'attack-save', reach: null, range: { normal: m(30), long: m(30) },
    attack: { ability: 'none', bonus: 0, prof: 'none' }, damage: [{ dice: '2d10', ability: 'none', type: 'acid' }],
    save: { ability: 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'none', effect: '' },
    uses: 'Constitution modifier / Long Rest', description: text(e.entries || e.entry),
  });
  else warn.push('Simic Hybrid|GGR');
}
// Draconato 2014 (PHB): um sopro por ancestralidade
{
  const r = raceBy('Dragonborn', 'PHB');
  const d = r && [findEntry(r.entries, 'Breath Weapon'), findEntry(r.entries, 'Draconic Ancestry')].filter(Boolean);
  const ANC = [['Black', 'acid', 'line', 'dex'], ['Blue', 'lightning', 'line', 'dex'], ['Brass', 'fire', 'line', 'dex'], ['Bronze', 'lightning', 'line', 'dex'], ['Copper', 'acid', 'line', 'dex'],
    ['Gold', 'fire', 'cone', 'dex'], ['Green', 'poison', 'cone', 'con'], ['Red', 'fire', 'cone', 'dex'], ['Silver', 'cold', 'cone', 'con'], ['White', 'cold', 'cone', 'con']];
  for (const [color, type, shape, save] of ANC) attack({
    id: 'r-dragonborn-breath-' + slug(color) + '-phb', name: 'Breath Weapon (' + color + ')', source: 'PHB', page: r && r.page, edition: '2014', origin: 'species', originName: 'Dragonborn',
    type: 'attack-save', reach: null, area: shape === 'line' ? { shape: 'line', size: m(30), width: m(5) } : { shape: 'cone', size: m(15), width: null },
    attack: { ability: 'none', bonus: 0, prof: 'none' }, damage: [{ dice: '2d6', ability: 'none', type }],
    save: { ability: save, dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'half', effect: '' },
    uses: 'Short or Long Rest', description: (d ? d.map((x) => x.name + '. ' + text(x.entries || x.entry)).join('\n\n') : '') + '\n\nDamage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level.',
  });
}
// Draconato 2024 (XPHB): cone ou linha, um por tipo de dano
{
  const r = raceBy('Dragonborn', 'XPHB'), e = r && findEntry(r.entries, 'Breath Weapon');
  for (const type of ['acid', 'cold', 'fire', 'lightning', 'poison']) for (const shape of ['cone', 'line']) attack({
    id: 'r-dragonborn-breath-' + type + '-' + shape + '-xphb', name: 'Breath Weapon (' + type[0].toUpperCase() + type.slice(1) + ', ' + (shape === 'cone' ? 'Cone' : 'Line') + ')',
    source: 'XPHB', page: r && r.page, edition: '2024', origin: 'species', originName: 'Dragonborn',
    type: 'attack-save', reach: null, area: shape === 'line' ? { shape: 'line', size: m(30), width: m(5) } : { shape: 'cone', size: m(15), width: null },
    attack: { ability: 'none', bonus: 0, prof: 'none' }, damage: [{ dice: '1d10', ability: 'none', type }],
    save: { ability: 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'half', effect: '' },
    uses: 'Proficiency Bonus / Long Rest', description: e ? text(e.entries || e.entry) : '',
  });
}
// Draconato de Fizban (FTD): cromático (linha), gema e metálico (cone)
for (const [race, shape, types] of [['Dragonborn (Chromatic)', 'line', ['acid', 'cold', 'fire', 'lightning', 'poison']], ['Dragonborn (Gem)', 'cone', ['force', 'necrotic', 'psychic', 'radiant', 'thunder']], ['Dragonborn (Metallic)', 'cone', ['acid', 'cold', 'fire', 'lightning']]]) {
  const r = raceBy(race, 'FTD'), e = r && findEntry(r.entries, 'Breath Weapon');
  if (!e) { warn.push(race + '|FTD'); continue; }
  const kind = /\((\w+)\)/.exec(race)[1];
  for (const type of types) attack({
    id: 'r-dragonborn-' + slug(kind) + '-breath-' + type + '-ftd', name: 'Breath Weapon (' + kind + ', ' + type[0].toUpperCase() + type.slice(1) + ')',
    source: 'FTD', page: r.page || null, edition: '2014', origin: 'species', originName: race,
    type: 'attack-save', reach: null, area: shape === 'line' ? { shape: 'line', size: m(30), width: m(5) } : { shape: 'cone', size: m(15), width: null },
    attack: { ability: 'none', bonus: 0, prof: 'none' }, damage: [{ dice: '1d10', ability: 'none', type }],
    save: { ability: 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'half', effect: '' },
    uses: 'Proficiency Bonus / Long Rest', description: text(e.entries || e.entry),
  });
}

// ---------- Gravar ----------
const srcOut = {};
for (const s of [...usedSources].sort()) srcOut[s] = sources[s] || s;
fs.mkdirSync(OUT, { recursive: true });
const write = (name, key, list) => {
  const data = { from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: srcOut, [key]: list };
  const json = JSON.stringify(data, null, 1);
  fs.writeFileSync(path.join(OUT, name + '.json'), json);
  fs.writeFileSync(path.join(OUT, name + '.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 42). Mesmo conteúdo de ' + name + '.json. */\n(window.VesperCadastros = window.VesperCadastros || {})[' + JSON.stringify(key) + '] = ' + json + ';\n');
};
write('attacks', 'attacks', attacks);
const by = (l, f) => l.reduce((o, x) => ((o[f(x)] = (o[f(x)] || 0) + 1), o), {});
console.log('Ataques: ' + attacks.length, by(attacks, (a) => a.origin));

// ---------- Itens (Plano 43) ----------
const bookDates = {};
for (const b of books.concat(advs)) bookDates[b.id] = b.published || '';
const { items, usedSources: itemSources, stats } = await buildItems(SRC, { sources, bookDate: (s) => bookDates[s] || '' });
const itemSrc = {};
for (const s of [...itemSources].sort()) itemSrc[s] = sources[s] || s;
{
  const data = { from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: itemSrc, items };
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT, 'items.json'), json);
  fs.writeFileSync(path.join(OUT, 'items.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 43). Mesmo conteúdo de items.json. */\n(window.VesperCadastros = window.VesperCadastros || {}).items = ' + json + ';\n');
  console.log('Itens: ' + items.length, by(items, (i) => i.kind), '· combinações dentro das famílias: ' + stats.specific + ' · ' + Math.round(json.length / 1024) + ' KB');
  console.log('Fora da lista (versões de grupo): ' + items.filter((i) => i.memberOf).length + ' · estágios iniciais criados: ' + stats.evolvingInitial.length);
  if (stats.groupRefMissing.length) console.log('Referências de grupo não achadas: ' + stats.groupRefMissing.join('; '));
}
// ---------- Magias (Plano 45) ----------
{
  const { spells, usedSources: spSources, stats: sst } = await buildSpells(SRC, { bookDate: (s) => bookDates[s] || '' });
  const spSrc = {};
  for (const s of [...spSources].sort()) spSrc[s] = sources[s] || s;
  const data = { from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: spSrc, spells };
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT, 'spells.json'), json);
  fs.writeFileSync(path.join(OUT, 'spells.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 45). Mesmo conteúdo de spells.json. */\n(window.VesperCadastros = window.VesperCadastros || {}).spells = ' + json + ';\n');
  console.log('Magias: ' + spells.length, by(spells, (s) => s.level), '· ' + Math.round(json.length / 1024) + ' KB');
  if (sst.noDice.length) console.log('Magias com tipo de dano mas sem dados lidos do texto (' + sst.noDice.length + '): ' + sst.noDice.slice(0, 15).join(', ') + (sst.noDice.length > 15 ? '…' : ''));
  // ---------- Talentos (Plano 44): as magias concedidas apontam para as magias acima ----------
  const { feats, usedSources: ftSources } = await buildFeats(SRC, { bookDate: (s) => bookDates[s] || '', spellIds: new Map(spells.map((s) => [s.id, s.name])) });
  const ftSrc = {};
  for (const s of [...ftSources].sort()) ftSrc[s] = sources[s] || s;
  const fdata = JSON.stringify({ from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: ftSrc, feats });
  fs.writeFileSync(path.join(OUT, 'feats.json'), fdata);
  fs.writeFileSync(path.join(OUT, 'feats.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 44). Mesmo conteúdo de feats.json. */\n(window.VesperCadastros = window.VesperCadastros || {}).feats = ' + fdata + ';\n');
  const unl = feats.flatMap((f) => ((f.benefits.spells || {}).groups || []).flatMap((g) => g.items)).filter((i) => i.name && !i.spell);
  console.log('Talentos: ' + feats.length, by(feats, (f) => f.category), '· ' + Math.round(fdata.length / 1024) + ' KB' + (unl.length ? ' · magias sem ligação: ' + unl.map((i) => i.name).join(', ') : ''));
  // ---------- Antecedentes (Plano 46): talento, itens do equipamento e magias ligados ----------
  const itemById = new Map(items.map((i) => [i.id, i]));
  const { backgrounds, usedSources: bgSources, stats: bst } = await buildBackgrounds(SRC, {
    bookDate: (s) => bookDates[s] || '', featIds: new Set(feats.map((x) => x.id)), spellIds: new Map(spells.map((s) => [s.id, s.name])),
    itemIds: new Set(itemById.keys()), itemName: (id) => (itemById.get(id) || {}).name || id,
  });
  const bgSrc = {};
  for (const s of [...bgSources].sort()) bgSrc[s] = sources[s] || s;
  const bdata = JSON.stringify({ from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: bgSrc, backgrounds });
  fs.writeFileSync(path.join(OUT, 'backgrounds.json'), bdata);
  fs.writeFileSync(path.join(OUT, 'backgrounds.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 46). Mesmo conteúdo de backgrounds.json. */\n(window.VesperCadastros = window.VesperCadastros || {}).backgrounds = ' + bdata + ';\n');
  console.log('Antecedentes: ' + backgrounds.length, by(backgrounds, (b) => b.edition || '-'), '· variantes ' + backgrounds.filter((b) => b.variantOf).length + ' · ' + Math.round(bdata.length / 1024) + ' KB');
  if (bst.featMissing.length) console.log('Talentos de antecedente não achados: ' + bst.featMissing.join('; '));
  if (bst.itemMissing.size) console.log('Itens de equipamento não achados (ficam como texto): ' + [...bst.itemMissing].slice(0, 20).join(', ') + (bst.itemMissing.size > 20 ? '… (' + bst.itemMissing.size + ')' : ''));
  // ---------- Espécies (Plano 47): sub-raças e linhagens dentro da espécie; magias e talentos ligados ----------
  const { species, usedSources: spcSources, stats: sps } = await buildSpecies(SRC, { bookDate: (s) => bookDates[s] || '', spellIds: new Map(spells.map((s) => [s.id, s.name])), featIds: new Set(feats.map((x) => x.id)) });
  const spcSrc = {};
  for (const s of [...spcSources].sort()) spcSrc[s] = sources[s] || s;
  const sdata = JSON.stringify({ from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: spcSrc, species });
  fs.writeFileSync(path.join(OUT, 'species.json'), sdata);
  fs.writeFileSync(path.join(OUT, 'species.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 47). Mesmo conteúdo de species.json. */\n(window.VesperCadastros = window.VesperCadastros || {}).species = ' + sdata + ';\n');
  console.log('Espécies: ' + species.length, by(species, (x) => x.edition || '-'), '· opções (sub-raças/linhagens) ' + sps.options + ' · ' + Math.round(sdata.length / 1024) + ' KB');
  // ---------- Opções de classe (Plano 48): invocações, manobras, metamagia… ----------
  const { options, types: optTypes, usedSources: opSources } = await buildOptions(SRC, { bookDate: (s) => bookDates[s] || '', spellIds: new Map(spells.map((s) => [s.id, s.name])), featIds: new Set(feats.map((x) => x.id)) });
  const opSrc = {};
  for (const s of [...opSources].sort()) opSrc[s] = sources[s] || s;
  const odata = JSON.stringify({ from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: opSrc, types: optTypes, options });
  fs.writeFileSync(path.join(OUT, 'options.json'), odata);
  fs.writeFileSync(path.join(OUT, 'options.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 48). Mesmo conteúdo de options.json. */\n(window.VesperCadastros = window.VesperCadastros || {}).options = ' + odata + ';\n');
  console.log('Opções de classe: ' + options.length, by(options.flatMap((o) => o.types.map((t) => ({ t }))), (x) => x.t), '· ' + Math.round(odata.length / 1024) + ' KB');
  // ---------- Classes (Plano 49): as 26 classes base ----------
  const { classes, usedSources: clSources, stats: cst } = await buildClasses(SRC, { bookDate: (s) => bookDates[s] || '', itemIds: new Set(itemById.keys()), itemName: (id) => (itemById.get(id) || {}).name || id });
  const clSrc = {};
  for (const s of [...clSources].sort()) clSrc[s] = sources[s] || s;
  const cdata = JSON.stringify({ from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: clSrc, classes });
  fs.writeFileSync(path.join(OUT, 'classes.json'), cdata);
  fs.writeFileSync(path.join(OUT, 'classes.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 49). Mesmo conteúdo de classes.json. */' + String.fromCharCode(10) + '(window.VesperCadastros = window.VesperCadastros || {}).classes = ' + cdata + ';' + String.fromCharCode(10));
  console.log('Classes: ' + classes.length + ' · características ' + classes.reduce((n, c) => n + c.features.length, 0) + ' · ' + Math.round(cdata.length / 1024) + ' KB' + (cst.itemMissing.size ? ' · itens não achados: ' + [...cst.itemMissing].join(', ') : ''));
  // ---------- Subclasses (Plano 50): das 26 classes base; as de 2014 também ligadas à classe de 2024, como no 5etools ----------
  const { subclasses, usedSources: scSources } = await buildSubclasses(SRC, { bookDate: (s) => bookDates[s] || '', spellIds: new Map(spells.map((s) => [s.id, s.name])), classIds: new Set(classes.map((c) => c.id)) });
  const scSrc = {};
  for (const s of [...scSources].sort()) scSrc[s] = sources[s] || s;
  const scdata = JSON.stringify({ from: '5etools', generatedAt: new Date().toISOString().slice(0, 10), sources: scSrc, subclasses });
  fs.writeFileSync(path.join(OUT, 'subclasses.json'), scdata);
  fs.writeFileSync(path.join(OUT, 'subclasses.js'), '/* Gerado por tools/importar-cadastros.mjs (Plano 50). Mesmo conteúdo de subclasses.json. */' + String.fromCharCode(10) + '(window.VesperCadastros = window.VesperCadastros || {}).subclasses = ' + scdata + ';' + String.fromCharCode(10));
  console.log('Subclasses: ' + subclasses.length + ' · cópias para 2024 ' + subclasses.filter((x) => x.copyOf).length + ' · características ' + subclasses.reduce((n, x) => n + x.features.length, 0) + ' · ' + Math.round(scdata.length / 1024) + ' KB');
}
// a aba Armas (Plano 42) virou o filtro Weapon dentro de Itens
for (const old of ['weapons.json', 'weapons.js']) { try { fs.unlinkSync(path.join(OUT, old)); } catch { /* */ } }
if (warn.length) console.log('Não achei no 5etools: ' + warn.join(', '));
console.log('Gravado em ' + OUT);
