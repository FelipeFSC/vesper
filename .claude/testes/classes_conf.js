// Plano 49: conferência das 26 classes base contra o livro (roda com: node .claude/testes/classes_conf.js)
// Confere dado de vida, testes de resistência, nível da subclasse, espaços de magia (níveis 1, 5 e 20) e colunas da tabela.
const path = require('path');
const C = require(path.resolve(__dirname, '../../data/cadastros/classes.json')).classes;
const errs = [], log = [];
const ok = (c, m) => { if (!c) errs.push(m); };
const get = (n, s) => C.find((x) => x.name === n && x.source === s);

// dado de vida e testes de resistência (iguais em 2014 e 2024)
const BASE = {
  Barbarian: [12, 'str,con'], Bard: [8, 'dex,cha'], Cleric: [8, 'wis,cha'], Druid: [8, 'int,wis'], Fighter: [10, 'str,con'], Monk: [8, 'str,dex'],
  Paladin: [10, 'wis,cha'], Ranger: [10, 'str,dex'], Rogue: [8, 'dex,int'], Sorcerer: [6, 'con,cha'], Warlock: [8, 'wis,cha'], Wizard: [6, 'int,wis'], Artificer: [8, 'con,int'],
};
// primeiro nível da subclasse
const SUB2014 = { Cleric: 1, Sorcerer: 1, Warlock: 1, Druid: 2, Wizard: 2 };
ok(C.length === 26, '26 classes (veio ' + C.length + ')');
for (const [name, [hd, saves]] of Object.entries(BASE)) {
  for (const src of name === 'Artificer' ? ['TCE', 'EFA'] : ['PHB', 'XPHB']) {
    const c = get(name, src);
    if (!c) { errs.push('falta ' + name + '|' + src); continue; }
    ok(c.hd === hd, `${name}|${src}: dado de vida d${c.hd}, esperado d${hd}`);
    ok([...c.saves].sort().join(',') === saves.split(',').sort().join(','), `${name}|${src}: resistências ${c.saves}, esperado ${saves}`);
    const sub = src === 'PHB' && SUB2014[name] ? SUB2014[name] : 3;
    ok(c.subclassLevels[0] === sub, `${name}|${src}: subclasse no nível ${c.subclassLevels[0]}, esperado ${sub}`);
    ok(c.features.length >= 12, `${name}|${src}: poucas características (${c.features.length})`);
    ok(c.progression.pb[0] === 2 && c.progression.pb[4] === 3 && c.progression.pb[19] === 6, `${name}|${src}: bônus de proficiência`);
    ok(c.features.some((f) => f.mark === 'asi' && f.level === 4), `${name}|${src}: aumento de atributo no nível 4`);
  }
}
// espaços de magia
const slots = (n, s, lv) => (get(n, s).progression.slots || [])[lv - 1] || [];
const eq = (a, b) => JSON.stringify(a.slice(0, b.length)) === JSON.stringify(b) && a.slice(b.length).every((x) => !x);
for (const src of ['PHB', 'XPHB']) {
  for (const full of ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']) {
    ok(eq(slots(full, src, 1), [2]), `${full}|${src}: espaços no 1 = ${slots(full, src, 1)}`);
    ok(eq(slots(full, src, 5), [4, 3, 2]), `${full}|${src}: espaços no 5 = ${slots(full, src, 5)}`);
    ok(eq(slots(full, src, 20), [4, 3, 3, 3, 3, 2, 2, 1, 1]), `${full}|${src}: espaços no 20 = ${slots(full, src, 20)}`);
  }
  const p = get('Warlock', src).progression.pact;
  ok(p && p.slots[0] === 1 && p.level[0] === 1 && p.slots[19] === 4 && p.level[19] === 5, `Warlock|${src}: pacto 1×1º no 1 e 4×5º no 20`);
}
// meio conjuradores: 2014 começa no 2; 2024 começa no 1
ok(eq(slots('Paladin', 'PHB', 1), []) && eq(slots('Paladin', 'PHB', 2), [2]), 'Paladin|PHB: espaços a partir do 2');
ok(eq(slots('Paladin', 'XPHB', 1), [2]) && eq(slots('Paladin', 'XPHB', 20), [4, 3, 3, 3, 2]), 'Paladin|XPHB: 2 no 1, 4/3/3/3/2 no 20');
ok(eq(slots('Ranger', 'PHB', 1), []) && eq(slots('Ranger', 'PHB', 5), [4, 2]), 'Ranger|PHB: nada no 1, 4/2 no 5');
ok(eq(slots('Ranger', 'XPHB', 1), [2]), 'Ranger|XPHB: 2 no 1');
ok(eq(slots('Artificer', 'TCE', 1), [2]) && eq(slots('Artificer', 'TCE', 20), [4, 3, 3, 3, 2]), 'Artificer|TCE: 2 no 1, 4/3/3/3/2 no 20');
// sem magia
for (const n of ['Barbarian', 'Fighter', 'Monk', 'Rogue']) for (const s of ['PHB', 'XPHB']) ok(!get(n, s).spellcasting && !get(n, s).progression.slots, `${n}|${s}: não conjura`);
// truques
ok(get('Wizard', 'XPHB').progression.cantrips[0] === 3 && get('Wizard', 'XPHB').progression.cantrips[19] === 5, 'Wizard|XPHB: truques 3 → 5');
ok(get('Wizard', 'XPHB').progression.prepared[0] === 4 && get('Wizard', 'XPHB').progression.prepared[19] === 25, 'Wizard|XPHB: preparadas 4 → 25');
// colunas da classe
const col = (n, s, label, lv) => { const c = get(n, s); const i = c.progression.columns.indexOf(label); return i < 0 ? undefined : c.progression.rows[lv - 1][i]; };
ok(col('Barbarian', 'PHB', 'Rages', 1) === '2' && col('Barbarian', 'PHB', 'Rages', 20) === 'Unlimited', 'Barbarian|PHB: Rages 2 → Unlimited');
ok(col('Barbarian', 'XPHB', 'Rages', 1) === '2' && col('Barbarian', 'XPHB', 'Rages', 20) === '6', 'Barbarian|XPHB: Rages 2 → 6');
ok(col('Barbarian', 'XPHB', 'Rage Damage', 1) === '+2' && col('Barbarian', 'XPHB', 'Rage Damage', 16) === '+4', 'Barbarian|XPHB: Rage Damage +2 → +4');
for (const s of ['PHB', 'XPHB']) ok(col('Rogue', s, 'Sneak Attack', 1) === '1d6' && col('Rogue', s, 'Sneak Attack', 20) === '10d6', `Rogue|${s}: Sneak Attack 1d6 → 10d6`);
ok(col('Monk', 'PHB', 'Martial Arts', 1) === '1d4' && col('Monk', 'PHB', 'Martial Arts', 20) === '1d10', 'Monk|PHB: Martial Arts 1d4 → 1d10');
ok(col('Monk', 'XPHB', 'Martial Arts', 1) === '1d6' && col('Monk', 'XPHB', 'Martial Arts', 20) === '1d12', 'Monk|XPHB: Martial Arts 1d6 → 1d12');
const mv = col('Monk', 'XPHB', 'Unarmored Movement', 2);
ok(mv && mv.speed === 3, 'Monk|XPHB: Unarmored Movement +3 m no 2');
// opções e talentos por nível
const wl = get('Warlock', 'XPHB').optionProgression.find((o) => o.type === 'EI');
ok(wl && wl.byLevel.slice(0, 5).join() === '1,3,3,3,5', 'Warlock|XPHB: invocações 1,3,3,3,5');
ok(get('Fighter', 'XPHB').featProgression.some((p) => p.category === 'Fighting Style' && p.byLevel[0] === 1), 'Fighter|XPHB: Fighting Style no 1');
ok(C.filter((c) => c.edition === '2024' && c.name !== 'Artificer').every((c) => c.featProgression.some((p) => p.category === 'Epic Boon' && p.byLevel[18] === 1 && p.byLevel[17] === 0)), '2024: Epic Boon no 19');
ok(get('Sorcerer', 'XPHB').optionProgression.some((o) => o.type === 'MM' && o.byLevel[1] === 2), 'Sorcerer|XPHB: metamagia 2 no nível 2');
// equipamento
const f24 = get('Fighter', 'XPHB').equipment[0];
ok(f24 && f24.options.length === 3 && f24.options[2].items[0].gold === 15500 && f24.options[0].items[0].item === 'chain-mail-xphb', 'Fighter|XPHB: A/B/C com Chain Mail ligada e C = 155 GP');
ok(get('Rogue', 'PHB').goldAlternative === '4d4 × 10' && get('Rogue', 'PHB').equipmentText.length === 4, 'Rogue|PHB: 4 linhas e 4d4 × 10');
// multiclasse
ok(JSON.stringify(get('Monk', 'PHB').multiclass.requirements) === JSON.stringify([[{ type: 'ability', abilities: ['dex'], min: 13 }, { type: 'ability', abilities: ['wis'], min: 13 }]]), 'Monk|PHB: DEX 13 e WIS 13');
ok(get('Fighter', 'XPHB').multiclass.rule === '2024' && get('Fighter', 'XPHB').multiclass.requirements[0][0].abilities.join() === 'str,dex', 'Fighter|XPHB: STR ou DEX 13 (regra 2024)');

log.push('classes conferidas: ' + C.length + ' · características ' + C.reduce((n, c) => n + c.features.length, 0));

// ---------- Subclasses (Plano 50) ----------
const S = require(path.resolve(__dirname, '../../data/cadastros/subclasses.json')).subclasses;
const SUBS = { 'Artificer|TCE': 4, 'Artificer|EFA': 10, 'Barbarian|PHB': 9, 'Barbarian|XPHB': 13, 'Bard|PHB': 8, 'Bard|XPHB': 14, 'Cleric|PHB': 19, 'Cleric|XPHB': 26, 'Druid|PHB': 7, 'Druid|XPHB': 11,
  'Fighter|PHB': 10, 'Fighter|XPHB': 16, 'Monk|PHB': 10, 'Monk|XPHB': 15, 'Paladin|PHB': 9, 'Paladin|XPHB': 14, 'Ranger|PHB': 8, 'Ranger|XPHB': 14, 'Rogue|PHB': 9, 'Rogue|XPHB': 15,
  'Sorcerer|PHB': 9, 'Sorcerer|XPHB': 15, 'Warlock|PHB': 9, 'Warlock|XPHB': 15, 'Wizard|PHB': 13, 'Wizard|XPHB': 22 };
ok(S.length === 324, '324 subclasses (veio ' + S.length + ')');
for (const [k, n] of Object.entries(SUBS)) { const got = S.filter((x) => x.className + '|' + x.classSource === k).length; ok(got === n, `${k}: ${got} subclasses, esperado ${n}`); }
ok(S.every((x) => x.classId && C.some((c) => c.id === x.classId)), 'toda subclasse ligada a uma classe');
ok(S.filter((x) => x.copyOf).length === 124 && S.filter((x) => x.copyOf).every((x) => S.some((y) => y.id === x.copyOf)), '124 cópias para 2024, todas apontando para a original');
const sub = (id) => S.find((x) => x.id === id) || {};
// cada subclasse tem características nos níveis que a classe marca (pelo menos a primeira)
for (const x of S) { const c = C.find((y) => y.id === x.classId); ok(x.features.some((f) => f.level === c.subclassLevels[0]), `${x.id}: sem característica no nível ${c.subclassLevels[0]}`); }
ok(sub('wizard-xphb--evoker-xphb').features.map((f) => f.level).join() === '3,3,3,6,10,14' && sub('wizard-xphb--evoker-xphb').features[0].name === 'Evoker', 'Evoker 2024: 3,3,3,6,10,14, começando por "Evoker"');
const light = sub('cleric-xphb--light-xphb').spells;
const lightAt = (lv) => light.groups[0].items.filter((i) => i.at === String(lv)).map((i) => i.name).join(', ');
ok(lightAt(3) === 'Burning Hands, Faerie Fire, Scorching Ray, See Invisibility' && lightAt(5) === 'Daylight, Fireball' && lightAt(9) === 'Flame Strike, Scrying', 'Light 2024: magias sempre preparadas por nível (' + lightAt(3) + ')');
ok(light.groups[0].items.every((i) => i.spell), 'Light 2024: todas as magias ligadas ao cadastro');
const ek = sub('fighter-xphb--eldritch-knight-xphb');
ok(ek.spellcasting && ek.spellcasting.ability === 'int' && ek.spellcasting.progression === '1/3' && ek.progression.slots[2][0] === 2 && ek.progression.slots[19].slice(0, 4).join() === '4,3,3,1', 'Eldritch Knight 2024: INT, terço, 2 no 3 e 4/3/3/1 no 20');
const bm = sub('fighter-xphb--battle-master-xphb').optionProgression[0];
ok(bm && bm.type === 'MV:B' && [2, 6, 9, 14].map((i) => bm.byLevel[i]).join() === '3,5,7,9', 'Battle Master 2024: manobras 3/5/7/9 nos níveis 3/7/10/15');
log.push('subclasses conferidas: ' + S.length + ' · cópias ' + S.filter((x) => x.copyOf).length + ' · características ' + S.reduce((n, x) => n + x.features.length, 0));
console.log(log.join('\n'));
console.log('erros: ' + JSON.stringify(errs));
process.exitCode = errs.length ? 1 : 0;
