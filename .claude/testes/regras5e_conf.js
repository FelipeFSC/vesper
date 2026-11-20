// Plano 51: conferência das contas da ficha 5e (js/regras5e.js) com os cadastros de verdade. Rodar: node .claude/testes/regras5e_conf.js
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
let n = 0;
global.window = { App: { U: { slug: (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), uid: (p) => p + (++n) } } };
require(path.join(root, 'js/regras5e.js'));
const R = window.App.Regras5e;
const L = (f) => require(path.join(root, 'data/cadastros', f + '.json'))[f];
const classes = L('classes'), items = L('items'), spells = L('spells'), subs = L('subclasses');
const cls = (name, ed) => classes.find((x) => x.name === name && x.edition === ed);
const item = (id) => items.find((x) => x.id === id);
const spell = (name, ed) => spells.find((x) => x.name === name && x.edition === ed);
const erros = [], log = [];
const eq = (got, want, m) => { if (JSON.stringify(got) !== JSON.stringify(want)) erros.push(m + ': ' + JSON.stringify(got) + ' ≠ ' + JSON.stringify(want)); };
function sheet(clsRec, level, abil, ed) {
  const a = { name: 'Teste', bars: [] };
  a.dnd5e = R.blank(ed || clsRec.edition);
  a.dnd5e.classes = [R.classFrom(clsRec, level)];
  Object.assign(a.dnd5e.abil, abil);
  for (const s of clsRec.saves) a.dnd5e.saves[s] = true;
  R.apply(a);
  return a;
}
function addItem(a, id, equip) {
  const r = item(id), row = R.itemRow(r);
  row.equipped = !!equip;
  a.dnd5e.itens.push(row);
  if (r.weapon && r.weapon.damage) { const at = R.attackFromItem(r); at.itemRow = row.id; a.dnd5e.attacks.push(at); }
  R.apply(a);
}

// Wizard 2024, nível 1
let a = sheet(cls('Wizard', '2024'), 1, { int: 15, con: 14 });
let c = R.calc(a);
eq([c.hpMax, c.spell.dc, c.spell.atk, c.spell.cantrips, c.spell.prepared, c.spell.slots[0]], [8, 12, 4, 3, 4, 2], 'Wizard 1');
eq(a.bars.map((b) => b.name + ' ' + b.value + '/' + b.max), ['PV 8/8', 'Espaços 1º 2/2'], 'Wizard 1 barras');
eq([c.save.int.v, c.save.wis.v, c.save.str.v], [4, 2, 0], 'Wizard 1 salvaguardas');
log.push('Wizard 2024 nv1: PV ' + c.hpMax + ', CD ' + c.spell.dc + ', ataque +' + c.spell.atk + ', truques ' + c.spell.cantrips + ', preparadas ' + c.spell.prepared);

// Fighter 2024, nível 5, Chain Mail e Longsword
a = sheet(cls('Fighter', '2024'), 5, { str: 16, con: 14 });
addItem(a, 'chain-mail-xphb', true); addItem(a, 'longsword-xphb');
c = R.calc(a);
let r = R.attackOf(c, a.dnd5e.attacks[0]);
eq([c.hpMax, c.ac, c.pb, r.hit, r.dmgFormula, r.vers], [44, 16, 3, 6, '1d8+3', '1d10+3'], 'Fighter 5');
eq(a.actions[0], { name: 'Longsword', bar: 'PV', critMin: 20, from5e: a.dnd5e.attacks[0].id, range: 1, parts: [{ f: '1d8+3', type: 'slashing' }], mode: 'attack', attack: '1d20+6', defense: 'Defesa', damage: '1d8+3' }, 'Fighter 5 ação da mesa');
eq(a.stats.find((s) => s.name === 'Defesa').value, 16, 'Fighter Defesa');
log.push('Fighter 2024 nv5: PV ' + c.hpMax + ', CA ' + c.ac + ' (' + c.acParts + '), Longsword +' + r.hit + ' ' + r.dmgFormula + ' (duas mãos ' + r.vers + ')');
// Ajuste manual da CA
a.dnd5e.aj.ac = { set: null, add: 1 }; R.apply(a); eq(R.calc(a).ac, 17, 'CA +1');
a.dnd5e.aj.ac = { set: 20, add: 0 }; R.apply(a); eq(R.calc(a).ac, 20, 'CA fixa 20');
delete a.dnd5e.aj.ac; R.apply(a); eq(R.calc(a).ac, 16, 'CA voltou ao calculado');

// Rogue 2024, nível 3, Leather e Rapier (Finesse), especialista em Furtividade
a = sheet(cls('Rogue', '2024'), 3, { dex: 16 });
a.dnd5e.skills.stealth = 2; a.dnd5e.skills.perception = 1;
addItem(a, 'leather-armor-xphb', true); addItem(a, 'rapier-xphb');
c = R.calc(a); r = R.attackOf(c, a.dnd5e.attacks[0]);
eq([c.ac, r.hit, r.dmgFormula, c.skill.stealth.v, c.skill.perception.v, c.passive.perception, c.init], [14, 5, '1d8+3', 7, 2, 12, 3], 'Rogue 3');
log.push('Rogue 2024 nv3: CA ' + c.ac + ', Rapier +' + r.hit + ' ' + r.dmgFormula + ', Furtividade +' + c.skill.stealth.v + ', Percepção passiva ' + c.passive.perception);
// Pau para toda obra
a.dnd5e.jack = true; R.apply(a); eq(R.calc(a).skill.arcana.v, 1, 'Pau para toda obra (metade de +2 = +1)');

// Barbarian sem armadura; com escudo soma 2
a = sheet(cls('Barbarian', '2024'), 1, { dex: 14, con: 16 });
eq(R.calc(a).ac, 15, 'Barbarian sem armadura');
addItem(a, 'shield-xphb', true); eq(R.calc(a).ac, 17, 'Barbarian com escudo');
// Monk sem armadura
a = sheet(cls('Monk', '2024'), 1, { dex: 16, wis: 14 });
eq(R.calc(a).ac, 15, 'Monk sem armadura');

// Hill Dwarf 2014, Cleric 3, Con 14, +1 PV por nível
a = sheet(cls('Cleric', '2014'), 3, { con: 14 });
a.dnd5e.hp.perLevel = 1; R.apply(a);
eq(R.calc(a).hpMax, 27, 'Hill Dwarf Cleric 3');
log.push('Cleric 2014 nv3 anão da colina: PV ' + R.calc(a).hpMax);

// Fire Bolt no nível 5 → 2d10; Fireball: salvaguarda, área e espaço de 3º
a = sheet(cls('Wizard', '2024'), 5, { int: 16 });
for (const nm of ['Fire Bolt', 'Fireball', 'Cure Wounds']) { const sp = spell(nm, '2024'); if (sp) a.dnd5e.attacks.push(R.attackFromSpell(sp)); }
R.apply(a); c = R.calc(a);
const fb = R.attackOf(c, a.dnd5e.attacks[0]);
eq([fb.hit, fb.dmgFormula], [6, '2d10'], 'Fire Bolt nv5');
const fbAct = a.actions[0], fire = a.actions[1];
eq([fbAct.mode, fbAct.attack, fbAct.damage, fbAct.range, fbAct.cost], ['attack', '1d20+6', '2d10', 24, undefined], 'Fire Bolt ação');
eq([fire.mode, fire.save, fire.dc, fire.damage, fire.onSave, fire.area, fire.cost, fire.costBar], ['save', 'Destreza', '14', '8d6', 'half', 4, 1, 'Espaços 3º'], 'Fireball ação');
log.push('Wizard nv5: Fire Bolt ' + fbAct.attack + ' / ' + fbAct.damage + '; Fireball CD ' + fire.dc + ' ' + fire.save + ', ' + fire.damage + ', área ' + fire.area + ' quad., gasta ' + fire.costBar);
if (spell('Cure Wounds', '2024')) eq([a.actions[2].mode, a.actions[2].damage], ['heal', '2d8+3'], 'Cure Wounds cura');

// Warlock 2024 nível 5: espaços de pacto (2 de 3º)
a = sheet(cls('Warlock', '2024'), 5, { cha: 16 });
c = R.calc(a);
eq([c.spell.pact, c.spell.slots.some((x) => x > 0), a.bars.map((b) => b.name)], [{ n: 2, level: 3 }, false, ['PV', 'Espaços de pacto']], 'Warlock 5');

// Eldritch Knight (2024) nível 7: espaços pela subclasse
a = sheet(cls('Fighter', '2024'), 7, { int: 14 });
a.dnd5e.classes[0].sub = R.subFrom(subs.find((x) => x.name.includes('Eldritch Knight') && x.edition === '2024'));
R.apply(a); c = R.calc(a);
eq([c.spell.abil, c.spell.slots.slice(0, 2), c.spell.dc], ['int', [4, 2], 13], 'Eldritch Knight 7');

// Descansos (2014 volta metade dos dados de vida; 2024, todos)
a = sheet(cls('Fighter', '2014'), 6, { con: 12 });
a.dnd5e.recursos.push({ name: 'Second Wind', cur: 0, max: 1, reset: 'short' }, { name: 'Action Surge', cur: 0, max: 1, reset: 'long' });
a.bars[0].value = 3; a.dnd5e.hp.hdUsed = 5; a.dnd5e.hp.temp = 4;
R.shortRest(a); eq([a.dnd5e.recursos[0].cur, a.dnd5e.recursos[1].cur], [1, 0], 'descanso curto');
R.longRest(a); eq([a.bars[0].value, a.dnd5e.hp.hdUsed, a.dnd5e.hp.temp, a.dnd5e.recursos[1].cur], [a.bars[0].max, 2, 0, 1], 'descanso longo 2014');
a.dnd5e.edicao = '2024'; a.dnd5e.hp.hdUsed = 5; R.longRest(a); eq(a.dnd5e.hp.hdUsed, 0, 'descanso longo 2024');

// PV atual preservado ao subir de nível; salvaguarda para o combate
a = sheet(cls('Fighter', '2024'), 1, { con: 14, dex: 14 });
a.bars[0].value = 5; a.dnd5e.classes[0].level = 2; R.apply(a);
eq([a.bars[0].value, a.bars[0].max], [13, 20], 'subir de nível: o PV atual ganha a diferença');
eq([R.saveFor(a, 'Destreza'), R.saveFor(a, 'Força'), R.saveFor({ stats: [] }, 'Força')], [2, 2, null], 'salvaguarda para o combate');

// ===== Plano 52: multiclasse =====
function multi(list, abil, ed) {
  const a = { name: 'Multi', bars: [] };
  a.dnd5e = R.blank(ed || '2024');
  a.dnd5e.classes = list.map(([name, e, lv, subName]) => {
    const cl = R.classFrom(cls(name, e), lv);
    if (subName) cl.sub = R.subFrom(subs.find((x) => x.className === name && x.name.includes(subName) && x.classId === cls(name, e).id));
    return cl;
  });
  Object.assign(a.dnd5e.abil, abil || {});
  for (const k of cls(list[0][0], list[0][1]).saves) a.dnd5e.saves[k] = true;
  R.apply(a);
  return a;
}
// Fighter 2 / Wizard 3 (2024), Con 14
a = multi([['Fighter', '2024', 2], ['Wizard', '2024', 3]], { con: 14, int: 16 });
c = R.calc(a);
eq([c.level, c.hpMax, c.pb, c.hdTxt, c.spell.slots.slice(0, 3), c.save.str.prof && c.save.con.prof && !c.save.int.prof], [5, 38, 3, '2d10 + 3d6', [4, 2, 0], true], 'Fighter 2 / Wizard 3');
log.push('Fighter 2 / Wizard 3: PV ' + c.hpMax + ', prof +' + c.pb + ', dados ' + c.hdTxt + ', espaços ' + c.spell.slots.filter(Boolean).join('/'));
// Paladin 4 / Sorcerer 3 (2024): conjurador 2 + 3 = 5
a = multi([['Paladin', '2024', 4], ['Sorcerer', '2024', 3]], { cha: 16 });
c = R.calc(a);
eq([c.spell.casterLevel, c.spell.slots.slice(0, 4)], [5, [4, 3, 2, 0]], 'Paladin 4 / Sorcerer 3 (2024)');
// Paladin 5 / Ranger 3 (2014): 2 + 1 = 3
a = multi([['Paladin', '2014', 5], ['Ranger', '2014', 3]], {}, '2014');
c = R.calc(a);
eq([c.spell.casterLevel, c.spell.slots.slice(0, 3)], [3, [4, 2, 0]], 'Paladin 5 / Ranger 3 (2014)');
// Warlock 3 / Sorcerer 2: pacto separado
a = multi([['Warlock', '2024', 3], ['Sorcerer', '2024', 2]], { cha: 16 });
c = R.calc(a);
eq([c.spell.pact, c.spell.slots.slice(0, 2), a.bars.map((b) => b.name)], [{ n: 2, level: 2 }, [3, 0], ['PV', 'Espaços 1º', 'Espaços de pacto']], 'Warlock 3 / Sorcerer 2');
// Eldritch Knight 7 / Wizard 2: 2 + 2 = 4
a = multi([['Fighter', '2024', 7, 'Eldritch Knight'], ['Wizard', '2024', 2]], { int: 14 });
c = R.calc(a);
eq([c.spell.casterLevel, c.spell.slots.slice(0, 3)], [4, [4, 3, 0]], 'Eldritch Knight 7 / Wizard 2');
// Paladin 1 (2024), classe só: 2 espaços pela tabela da classe
a = multi([['Paladin', '2024', 1]], {});
eq(R.calc(a).spell.slots[0], 2, 'Paladin 1 de 2024');
// Fire Bolt de um Fighter 4 / Wizard 1: 2d10 (nível total 5)
a = multi([['Fighter', '2024', 4], ['Wizard', '2024', 1]], { int: 16 });
const fbA = R.attackFromSpell(spell('Fire Bolt', '2024')); fbA.cls = 'Wizard'; a.dnd5e.attacks.push(fbA); R.apply(a);
c = R.calc(a);
eq([R.attackOf(c, fbA).dmgFormula, R.attackOf(c, fbA).hit], ['2d10', 6], 'Fire Bolt do Fighter 4 / Wizard 1');
// Wizard 3 / Cleric 2: CD de cada classe
a = multi([['Wizard', '2024', 3], ['Cleric', '2024', 2]], { int: 16, wis: 14 });
const sw = R.attackFromSpell(spell('Fireball', '2024')); sw.cls = 'Wizard';
const sc = R.attackFromSpell(spell('Sacred Flame', '2024')); sc.cls = 'Cleric';
a.dnd5e.attacks.push(sw, sc); R.apply(a); c = R.calc(a);
eq([c.casters.map((x) => x.name + ' ' + x.dc), R.attackOf(c, sw).dc, R.attackOf(c, sc).dc, c.spell.slots.slice(0, 3)], [['Wizard 14', 'Cleric 13'], 14, 13, [4, 3, 2]], 'Wizard 3 / Cleric 2');
log.push('Wizard 3 / Cleric 2: ' + c.casters.map((x) => x.name + ' CD ' + x.dc + ' ataque +' + x.atk).join(' · ') + ' · espaços ' + c.spell.slots.filter(Boolean).join('/'));
// Dados de vida por tipo: gastar e descansar (2014: metade, maiores primeiro)
a = multi([['Fighter', '2014', 3], ['Wizard', '2014', 2]], { con: 12 }, '2014');
R.spendHd(a.dnd5e, 10); R.spendHd(a.dnd5e, 10); R.spendHd(a.dnd5e, 6);
c = R.calc(a);
eq([a.dnd5e.hp.hdUsed, c.hdLeft.map((x) => x.die + ':' + x.left)], [3, ['10:1', '6:1']], 'gastar d10 e d6');
R.longRest(a); c = R.calc(a);
eq([a.dnd5e.hp.hdUsed, c.hdLeft.map((x) => x.die + ':' + x.left)], [1, ['10:3', '6:1']], 'descanso longo 2014 devolve 2 (os d10 primeiro)');
// Warlock / Sorcerer: magia de Warlock gasta pacto; de Sorcerer, espaço comum
a = multi([['Warlock', '2024', 3], ['Sorcerer', '2024', 2]], { cha: 16 });
const hex = R.attackFromSpell(spell('Burning Hands', '2024')); hex.cls = 'Warlock';
const mm = R.attackFromSpell(spell('Burning Hands', '2024')); mm.cls = 'Sorcerer';
a.dnd5e.attacks.push(hex, mm); R.apply(a);
eq([a.actions[0].costBar, a.actions[1].costBar], ['Espaços de pacto', 'Espaços 1º'], 'gasto de espaço por classe');

console.log(log.join('\n'));
console.log('erros: ' + JSON.stringify(erros, null, 1));
process.exitCode = erros.length ? 1 : 0;
