// Plano 53: conferência em node da conversão do bestiário para a ficha de criatura 5e. Rodar: node .claude/testes/criatura5e_conf.js
// Converte todas as criaturas de data/5etools e confere que nenhum número do bloco some, mais os casos do plano.
const path = require('path'), fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
let n = 0;
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
global.window = { App: { U: { slug, uid: (p) => p + (++n), h: () => ({}), clone: (o) => JSON.parse(JSON.stringify(o)) } } };
global.document = { createElement: () => ({}) };
const App = global.window.App;
global.App = App;
require(path.join(root, 'js/regras5e.js'));
require(path.join(root, 'js/bestiary.js'));
const R = App.Regras5e, B = App.Bestiary;
App.BESTIARY5E_BOOKS = {};
const dir = path.join(root, 'data/5etools');
for (const f of fs.readdirSync(dir).filter((x) => /^livro-.*\.js$/.test(x))) require(path.join(dir, f));
const all = [];
for (const [book, L] of Object.entries(App.BESTIARY5E_BOOKS)) for (const m of (Array.isArray(L) ? L : Object.values(L))) all.push(m);
const erros = [], log = [];
const eq = (got, want, m) => { if (JSON.stringify(got) !== JSON.stringify(want)) erros.push(m + ': ' + JSON.stringify(got) + ' ≠ ' + JSON.stringify(want)); };
let bad = 0, atks = 0, saves = 0, withHit = 0;
for (const m of all) {
  try {
    const a = B.toNpcActor(m, null), d = a.dnd5e, npc = d.npc, c = R.calc(a);
    if (m.hp && m.hp.average != null && npc.hp !== m.hp.average) erros.push(m.name + ': PV');
    if (typeof (m.ac && m.ac[0]) === 'number' ? m.ac[0] !== npc.ac : m.ac && m.ac[0] && m.ac[0].ac != null && m.ac[0].ac !== npc.ac) erros.push(m.name + ': CA');
    for (const k of Object.keys(m.save || {})) if (npc.saves[k] == null) erros.push(m.name + ': salvaguarda ' + k);
    for (const k of Object.keys(m.skill || {})) if (k !== 'other' && R.SKILL[k.replace(/ /g, '-')] && npc.skills[k.replace(/ /g, '-')] == null) erros.push(m.name + ': perícia ' + k);
    // Toda ação com {@hit} vira ataque com acerto
    for (const key of ['action', 'bonus', 'reaction', 'legendary']) for (const it of m[key] || []) {
      const raw = (it.entries || []).filter((x) => typeof x === 'string').join(' ');
      if (/\{@hit /.test(raw)) withHit++;
    }
    for (const [key] of R.NPC_LISTS) for (const x of npc[key]) { if (x.kind === 'attack') atks++; if (x.kind === 'save') saves++; }
    if (/null|undefined|NaN|\[object/.test(JSON.stringify([npc.acNote, npc.senses, npc.immune, npc.resist, npc.langs, npc.type]))) erros.push(m.name + ': texto estranho');
  } catch (e) { bad++; if (bad < 6) erros.push(m.name + ' (' + m.source + '): ' + e.message); }
}
log.push('criaturas: ' + all.length + ' · com erro: ' + bad + ' · ações com acerto no livro: ' + withHit + ' · ataques na ficha: ' + atks + ' · salvaguardas com dano: ' + saves);
if (atks < withHit) erros.push('ataques a menos: ' + atks + ' de ' + withHit);

const find = (name, src) => all.find((m) => m.name === name && (!src || m.source === src));
// Tarrasque (MM)
let m = find('Tarrasque', 'MM'), a = B.toNpcActor(m, null), npc = a.dnd5e.npc, c = R.calc(a);
eq([npc.ac, npc.acNote, npc.hp, npc.hpFormula, a.dnd5e.abil.str, c.mod.str], [25, '(natural armor)', 676, '33d20 + 330', 30, 10], 'Tarrasque: CA, PV, Força');
eq([c.save.int.v, c.save.wis.v, c.save.cha.v, c.save.str.v], [5, 9, 9, 10], 'Tarrasque: salvaguardas');
eq([npc.immune, npc.condImmune], ['fire, poison; bludgeoning, piercing, slashing from nonmagical attacks', 'charmed, frightened, paralyzed, poisoned'], 'Tarrasque: imunidades');
eq([npc.cr, c.xp, c.pb, npc.passive], ['30', 155000, 9, 10], 'Tarrasque: ND, XP, proficiência, Percepção passiva');
const bite = npc.actions.find((x) => x.name === 'Bite');
eq([bite.kind, bite.hit, bite.dmg, bite.reach], ['attack', 19, [{ dice: '4d12+10', type: 'piercing' }], 3], 'Tarrasque: Mordida');
const lr = npc.traits.find((x) => /Legendary Resistance/.test(x.name));
eq([lr && lr.uses && lr.uses.max, npc.legendaryCount, npc.legendary.length], [3, 3, 3], 'Tarrasque: Resistência Lendária 3/dia e 3 ações lendárias');
const act = a.actions.find((x) => x.name === 'Bite');
eq([act.mode, act.attack, act.damage, act.range, act.parts], ['attack', '1d20+19', '4d12+10', 2, [{ f: '4d12+10', type: 'piercing' }]], 'Tarrasque: ação da mesa');
eq([R.saveFor(a, 'Sabedoria'), [...R.defensesOf(a).immune].sort()], [9, ['fire', 'poison']], 'Tarrasque: salvaguarda e imunidades para a mesa');
log.push('Tarrasque: CA ' + npc.ac + ' ' + npc.acNote + ' · PV ' + npc.hp + ' (' + npc.hpFormula + ') · ' + a.actions.map((x) => x.name + ' ' + (x.attack || 'CD ' + x.dc) + ' ' + x.damage).join(', '));
// Goblin (MM)
m = find('Goblin', 'MM'); a = B.toNpcActor(m, null); npc = a.dnd5e.npc;
const bow = npc.actions.find((x) => x.name === 'Shortbow');
eq([npc.bonus.length || npc.traits.some((x) => /Nimble Escape/.test(x.name)), bow.range, bow.hit], [true, { normal: 24, long: 96 }, 4], 'Goblin: Nimble Escape e arco curto');
// Dragão vermelho adulto (MM): sopro com recarga
m = find('Adult Red Dragon', 'MM'); a = B.toNpcActor(m, null); npc = a.dnd5e.npc;
const br = npc.actions.find((x) => /Fire Breath/.test(x.name));
eq([br.kind, br.recharge, br.dc, br.save, br.onSave, br.area, br.dmg], ['save', 5, 21, 'dex', 'half', { size: 18, shape: 'cone' }, [{ dice: '18d6', type: 'fire' }]], 'Dragão: sopro');
const brA = a.actions.find((x) => /Fire Breath/.test(x.name));
eq([brA.mode, brA.save, brA.dc, brA.onSave, brA.area, brA.multi], ['save', 'Destreza', '21', 'half', 12, true], 'Dragão: sopro na mesa');
log.push('Dragão: ' + br.name + ' recarga ' + br.recharge + '–6, CD ' + br.dc + ' ' + br.save + ', ' + br.dmg.map((x) => x.dice + ' ' + x.type).join(' + ') + ', cone ' + br.area.size + ' m · ações lendárias ' + npc.legendaryCount + ' (' + npc.legendary.map((x) => x.name + (x.cost ? ' ×' + x.cost : '')).join(', ') + ')');
// Lich (MM): conjuração por nível
m = find('Lich', 'MM'); a = B.toNpcActor(m, null); npc = a.dnd5e.npc; c = R.calc(a);
const sc = npc.spellcasting[0];
eq([sc.ability, sc.dc, sc.atk, c.spell.dc, sc.groups.find((g) => g.level === 1).slots.max, sc.groups.find((g) => g.level === 9).spells.length >= 1], ['int', 20, 12, 20, 4, true], 'Lich: conjuração');
const pt = npc.actions.find((x) => /Paralyzing Touch/.test(x.name));
eq([pt.kind, pt.hit, pt.dc, pt.save], ['attack', 12, 18, 'con'], 'Lich: Paralyzing Touch');
eq(npc.legendary.filter((x) => x.cost).map((x) => x.cost), [2, 2, 3], 'Lich: custo das ações lendárias');
log.push('Lich: ' + sc.groups.map((g) => g.label + (g.slots ? ' (' + g.slots.max + ')' : '') + ' ' + g.spells.length).join(' · ') + ' · fireball → ' + ((sc.groups.find((g) => g.level === 3) || { spells: [] }).spells.find((x) => /fireball/i.test(x.name)) || {}).ref);
// Criatura de 2024 (XMM)
m = all.find((x) => x.source === 'XMM' && x.name === 'Goblin Warrior') || all.find((x) => x.source === 'XMM');
a = B.toNpcActor(m, null); npc = a.dnd5e.npc;
log.push('2024 (' + m.name + '): ' + a.actions.map((x) => x.name + ' ' + (x.attack || 'CD ' + x.dc) + ' ' + x.damage).join(', ') + ' · iniciativa ' + R.calc(a).init);
if (!a.actions.length) erros.push('2024: nenhuma ação');
// Ficha antiga (genérica com dados5e) → criatura, sem perder PV atual e ações feitas à mão
m = find('Tarrasque', 'MM');
const old = { id: 'ac_x', kind: 'monster', name: 'Meu Tarrasque', img: 'img_1', owner: '', size: 4, color: '#a0683b', bars: [{ name: 'PV', value: 500, max: 697 }], stats: [], actions: [{ name: 'Pisão', mode: 'damage', damage: '6d6' }], notes: 'anotação minha', source: '5etools', dados5e: JSON.parse(JSON.stringify(m)), hpDice: '33d20+330', rollHp: true };
B.upgrade(old);
eq([old.id, old.name, old.img, old.sistema, old.bars[0].value, old.actions.some((x) => x.name === 'Pisão'), old.actions.some((x) => x.name === 'Bite'), old.rollHp, old.dnd5e.bio.notas], ['ac_x', 'Meu Tarrasque', 'img_1', '5e', 500, true, true, true, 'anotação minha'], 'ficha antiga convertida');
const ids1 = JSON.stringify(old.dnd5e.npc.actions.map((x) => x.id));
const old2 = { id: 'ac_y', name: 'T', bars: [], actions: [], dados5e: JSON.parse(JSON.stringify(m)) }; B.upgrade(old2);
eq(JSON.stringify(old2.dnd5e.npc.actions.map((x) => x.id)), ids1, 'conversão igual no mestre e nos jogadores (ids fixos)');

console.log(log.join('\n'));
console.log('erros: ' + JSON.stringify(erros.slice(0, 30), null, 1) + (erros.length > 30 ? ' (+' + (erros.length - 30) + ')' : ''));
process.exitCode = erros.length ? 1 : 0;
