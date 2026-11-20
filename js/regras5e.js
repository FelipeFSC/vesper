'use strict';
/*
 * Regras de D&D 5e para a ficha 5e (Plano 51). Só contas, sem desenho: usado pela página Criar ficha, pela mesa e pelo combate.
 * A ficha 5e é uma ficha comum com sistema: '5e' e os dados completos em a.dnd5e:
 * - valores digitados (atributos, proficiências, itens, magias, ataques…) e cópias do que veio dos cadastros (ref = id do cadastro);
 * - ajustes manuais em aj[chave] = { set: número ou null, add: número } (modelo Roll20: o calculado aceita troca ou bônus);
 * - PV atual e espaços de magia restantes ficam nas barras da ficha (PV, Espaços 1º…), porque a mesa gasta e cura por elas.
 * derive(a) recalcula os campos genéricos (stats, bars, actions, iniciativa) que a mesa e o combate usam.
 */
(function (App) {
  const R = {};
  App.Regras5e = R;
  const num = (v, d = 0) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const slug = (s) => (App.U && App.U.slug ? App.U.slug(s) : String(s || '').toLowerCase());
  const uid = (p) => (App.U && App.U.uid ? App.U.uid(p) : p + Math.random().toString(36).slice(2, 10));

  R.AB = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  R.AB_PT = { str: 'Força', dex: 'Destreza', con: 'Constituição', int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma' };
  R.AB_SH = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
  // [id, nome, atributo, nome em inglês]
  R.SKILLS = [
    ['acrobatics', 'Acrobacia', 'dex', 'Acrobatics'], ['animal-handling', 'Adestrar Animais', 'wis', 'Animal Handling'], ['arcana', 'Arcanismo', 'int', 'Arcana'],
    ['athletics', 'Atletismo', 'str', 'Athletics'], ['performance', 'Atuação', 'cha', 'Performance'], ['deception', 'Enganação', 'cha', 'Deception'],
    ['stealth', 'Furtividade', 'dex', 'Stealth'], ['history', 'História', 'int', 'History'], ['intimidation', 'Intimidação', 'cha', 'Intimidation'],
    ['insight', 'Intuição', 'wis', 'Insight'], ['investigation', 'Investigação', 'int', 'Investigation'], ['medicine', 'Medicina', 'wis', 'Medicine'],
    ['nature', 'Natureza', 'int', 'Nature'], ['perception', 'Percepção', 'wis', 'Perception'], ['persuasion', 'Persuasão', 'cha', 'Persuasion'],
    ['sleight-of-hand', 'Prestidigitação', 'dex', 'Sleight of Hand'], ['religion', 'Religião', 'int', 'Religion'], ['survival', 'Sobrevivência', 'wis', 'Survival'],
  ];
  R.SKILL = Object.fromEntries(R.SKILLS.map((s) => [s[0], s]));
  R.SIZES = { Tiny: 'Miúdo', Small: 'Pequeno', Medium: 'Médio', Large: 'Grande', Huge: 'Enorme', Gargantuan: 'Imenso' };
  R.SPEEDS = { walk: 'Caminhando', fly: 'Voo', swim: 'Natação', climb: 'Escalada', burrow: 'Escavação' };
  R.SENSES = { darkvision: 'Visão no escuro', blindsight: 'Percepção às cegas', tremorsense: 'Sentido sísmico', truesight: 'Visão verdadeira' };
  R.COINS = [['cp', 'PC', 'cobre'], ['sp', 'PP', 'prata'], ['ep', 'PE', 'electro'], ['gp', 'PO', 'ouro'], ['pp', 'PL', 'platina']];
  R.CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
  R.LEVEL_PT = ['Truques', '1º nível', '2º nível', '3º nível', '4º nível', '5º nível', '6º nível', '7º nível', '8º nível', '9º nível'];
  R.SLOT_BAR = (n) => 'Espaços ' + n + 'º';
  R.PACT_BAR = 'Espaços de pacto';
  R.AC_MODES = { auto: 'Automático (pela classe)', normal: '10 + Des', barbarian: '10 + Des + Con (Bárbaro)', monk: '10 + Des + Sab (Monge)', mage: '13 + Des (Armadura Arcana, Dracônico)' };

  R.mod = (score) => Math.floor((num(score, 10) - 10) / 2);
  R.sign = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
  const plusTxt = (dice, b) => (b ? dice + (b > 0 ? '+' : '-') + Math.abs(b) : dice);
  R.plusTxt = plusTxt;

  // ---------- Ficha em branco e migração ----------
  R.blank = (edicao) => ({
    v: 1, edicao: edicao || '2024',
    classes: [R.blankClass()], especie: null, antecedente: null, tendencia: '', xp: 0,
    abil: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: {}, skills: {}, jack: false, aj: {},
    hp: { temp: 0, hdUsed: 0, death: { ok: 0, fail: 0 }, perLevel: 0 },
    acMode: 'auto', speed: { walk: 9 }, sentidos: {}, tamanho: 'Medium',
    insp: false, exaustao: 0, conds: [],
    prof: { armor: '', weapons: '', tools: '', langs: '' },
    defesas: { resist: '', immune: '', vuln: '', cond: '' },
    attacks: [], recursos: [],
    magia: { abil: '', list: [] },
    itens: [], moedas: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    talentos: [], caract: [],
    bio: {},
  });
  // ---------- Criatura (Plano 53): bloco de estatísticas, modelo NPC do Roll20 ----------
  R.CR_XP = { 0: 10, '1/8': 25, '1/4': 50, '1/2': 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
  R.crNum = (cr) => (cr === '1/8' ? 0.125 : cr === '1/4' ? 0.25 : cr === '1/2' ? 0.5 : num(cr));
  R.crPb = (cr) => { const n = R.crNum(cr); return n < 5 ? 2 : n < 9 ? 3 : n < 13 ? 4 : n < 17 ? 5 : n < 21 ? 6 : n < 25 ? 7 : n < 29 ? 8 : 9; };
  R.NPC_LISTS = [['traits', 'Traços'], ['actions', 'Ações'], ['bonus', 'Ações bônus'], ['reactions', 'Reações'], ['legendary', 'Ações lendárias'], ['mythic', 'Ações míticas'], ['lair', 'Ações de covil']];
  R.blankNpc = () => ({
    size: 'Medium', type: 'humanoid', align: '', ac: 10, acNote: '', hp: 4, hpFormula: '1d8', speed: { walk: 9 }, speedText: '',
    saves: {}, skills: {}, vuln: '', resist: '', immune: '', condImmune: '', senses: '', passive: null, langs: '', cr: '0', xp: null, pb: null, init: null,
    traits: [], actions: [], bonus: [], reactions: [], legendary: [], mythic: [], lair: [], legendaryCount: 0, legendaryUsed: 0, legendaryText: '', mythicText: '', lairText: '',
    spellcasting: [], extra: [],
  });
  R.normNpc = (n) => {
    n = Object.assign(R.blankNpc(), n || {});
    for (const [k] of R.NPC_LISTS) if (!Array.isArray(n[k])) n[k] = [];
    for (const k of ['spellcasting', 'extra']) if (!Array.isArray(n[k])) n[k] = [];
    for (const k of ['saves', 'skills', 'speed']) if (!n[k] || typeof n[k] !== 'object') n[k] = {};
    return n;
  };
  R.blankClass = () => ({ ref: null, name: '', source: '', level: 1, hd: 8, saves: [], casting: null, pb: null, slots: null, pact: null, cantrips: null, prepared: null, columns: [], rows: [], sub: null });
  R.norm = function (d) {
    const b = R.blank(d && d.edicao);
    d = Object.assign(b, d || {});
    for (const k of ['abil', 'hp', 'prof', 'defesas', 'moedas', 'magia', 'speed']) d[k] = Object.assign(R.blank()[k], d[k] || {});
    d.hp.death = Object.assign({ ok: 0, fail: 0 }, d.hp.death || {});
    for (const k of ['classes', 'attacks', 'recursos', 'itens', 'talentos', 'caract', 'conds']) if (!Array.isArray(d[k])) d[k] = [];
    if (!Array.isArray(d.magia.list)) d.magia.list = [];
    if (!d.classes.length) d.classes.push(R.blankClass());
    for (const k of ['saves', 'skills', 'aj', 'sentidos', 'bio']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
    if (d.npc) d.npc = R.normNpc(d.npc);
    return d;
  };

  // Ajuste manual: { set } troca o valor; { add } soma
  R.adj = (d, key) => (d.aj && d.aj[key]) || null;
  function val(d, key, auto) {
    const a = R.adj(d, key);
    if (!a) return auto;
    if (a.set != null && a.set !== '') return num(a.set);
    return auto + num(a.add);
  }
  R.isAdj = (d, key) => { const a = R.adj(d, key); return !!a && ((a.set != null && a.set !== '') || num(a.add) !== 0); };

  // ---------- Conjuração ----------
  // Espaços por nível (1º–9º) e de pacto, pela classe (ou pela subclasse que conjura: Eldritch Knight, Arcane Trickster)
  // Tabela de espaços do conjurador multiclasse (a mesma do conjurador completo), pelo nível de conjurador
  const MULTI = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
  R.MULTI = MULTI;
  // Quanto a classe conta no nível de conjurador: completo = todos; 1/2 = metade para baixo; artificer (e Paladin/Ranger de 2024) = metade para cima; 1/3 = terço para baixo
  const casterShare = (prog, lv) => (prog === 'full' ? lv : prog === '1/2' ? Math.floor(lv / 2) : prog === 'artificer' ? Math.ceil(lv / 2) : prog === '1/3' ? Math.floor(lv / 3) : 0);
  R.casterShare = casterShare;
  const castSrc = (x) => (x.casting ? x : x.sub && x.sub.casting ? x.sub : null);
  function casting(d) {
    const out = { slots: [0, 0, 0, 0, 0, 0, 0, 0, 0], pact: null, casters: [], casterLevel: 0 };
    const slotters = [];
    d.classes.forEach((x, i) => {
      const lv = Math.max(1, Math.min(20, num(x.level, 1)));
      const src = castSrc(x);
      if (!src) return;
      const prog = src.casting.progression || '';
      out.casters.push({ i, name: x.name, abil: src.casting.ability || '', mode: src.casting.mode || '', prog, level: lv,
        cantrips: src.cantrips ? num(src.cantrips[lv - 1]) : null, prepared: src.prepared ? num(src.prepared[lv - 1]) : null });
      if (prog === 'pact' || (src.pact && src.pact.slots)) { if (src.pact && src.pact.slots) out.pact = { n: num(src.pact.slots[lv - 1]), level: num(src.pact.level[lv - 1]) }; return; }
      slotters.push({ src, lv, prog });
    });
    if (slotters.length === 1) {
      // Uma classe só que conjura: a tabela da própria classe (ex.: Paladin 1 de 2024 tem 2 espaços)
      const row = slotters[0].src.slots && slotters[0].src.slots[slotters[0].lv - 1];
      if (row) row.forEach((n, i) => { out.slots[i] = num(n); });
      out.casterLevel = casterShare(slotters[0].prog, slotters[0].lv);
    } else if (slotters.length > 1) {
      out.casterLevel = Math.min(20, slotters.reduce((sum, x) => sum + casterShare(x.prog, x.lv), 0));
      (MULTI[out.casterLevel] || []).forEach((n, i) => { out.slots[i] = n; });
    }
    return out;
  }

  // ---------- Tudo o que a ficha calcula ----------
  R.calc = function (a) {
    const d = R.norm(a.dnd5e);
    const c = { d };
    c.level = Math.max(1, d.classes.reduce((s, x) => s + Math.max(0, num(x.level, 1)), 0));
    const c0 = d.classes[0] || {};
    const pbAuto = c0.pb && c0.pb[c.level - 1] ? num(c0.pb[c.level - 1]) : Math.ceil(c.level / 4) + 1;
    c.pb = val(d, 'pb', pbAuto);
    c.score = {}; c.mod = {};
    for (const k of R.AB) { c.score[k] = val(d, 'abil_' + k, num(d.abil[k], 10)); c.mod[k] = R.mod(c.score[k]); }
    c.save = {};
    for (const k of R.AB) c.save[k] = { prof: !!d.saves[k], v: val(d, 'save_' + k, c.mod[k] + (d.saves[k] ? c.pb : 0) + num((d.aj.saves || {}).add)) };
    c.skill = {};
    for (const [id, , ab] of R.SKILLS) {
      const lvl = num(d.skills[id]);
      const mult = lvl >= 2 ? 2 : lvl >= 1 ? 1 : lvl > 0 || d.jack ? 0.5 : 0;
      c.skill[id] = { lvl, ab, v: val(d, 'skill_' + id, c.mod[ab] + Math.floor(c.pb * mult)) };
    }
    c.passive = {
      perception: val(d, 'pass_perception', 10 + c.skill.perception.v),
      insight: val(d, 'pass_insight', 10 + c.skill.insight.v),
      investigation: val(d, 'pass_investigation', 10 + c.skill.investigation.v),
    };
    c.init = val(d, 'init', c.mod.dex);
    // PV máximo: dado cheio no 1º nível, a média (arredondada para cima) nos outros, + Con por nível, + bônus por nível
    // PV rolado (assistente, "Rolar"): d.hp.rolls[nível do personagem] troca a média daquele nível
    // Multiclasse: o dado cheio é só o do 1º nível da primeira classe; cada classe usa o seu dado
    let hp = 0, first = true;
    const byDie = {};
    d.classes.forEach((x, ci) => {
      const lv = Math.max(0, num(x.level, 1)), hd = num(x.hd, 8);
      const rolls = x.rolls || (ci === 0 ? d.hp.rolls : null) || {};
      for (let i = 1; i <= lv; i++) {
        const die = first ? hd : num(rolls[i]) > 0 ? Math.min(hd, num(rolls[i])) : hd / 2 + 1;
        hp += Math.max(1, die + c.mod.con); first = false;
      }
      if (lv) byDie[hd] = (byDie[hd] || 0) + lv;
    });
    c.hd = Object.entries(byDie).map(([die, n]) => ({ n, die: num(die) })).sort((x, y) => y.die - x.die);
    // Dados de vida gastos por tipo (d.hp.hdUsedBy); d.hp.hdUsed continua sendo o total
    c.hdUsedBy = R.usedBy(d, c.hd);
    c.hdLeft = c.hd.map((x) => ({ die: x.die, n: x.n, left: Math.max(0, x.n - num(c.hdUsedBy[x.die])) }));
    hp += num(d.hp.perLevel) * c.level;
    c.hpAuto = hp;
    c.hpMax = Math.max(1, val(d, 'hpMax', hp));
    c.hdTotal = c.hd.reduce((s, x) => s + x.n, 0);
    c.hdTxt = c.hd.map((x) => x.n + 'd' + x.die).join(' + ') || '—';
    // CA
    const eq = d.itens.filter((it) => it.equipped && it.armor);
    const armor = eq.find((it) => it.armor.type !== 'shield'), shield = eq.find((it) => it.armor.type === 'shield');
    let ac, parts;
    if (armor) {
      const A = armor.armor, dm = A.dexMax == null || A.dexMax === '' ? 99 : num(A.dexMax);
      const dx = Math.min(c.mod.dex, dm);
      ac = num(A.ac) + num(A.bonusAc) + (A.type === 'heavy' ? 0 : dx);
      parts = armor.name + ' ' + (num(A.ac) + num(A.bonusAc)) + (A.type === 'heavy' || !dx ? '' : ' ' + R.sign(dx) + ' Des');
    } else {
      let mode = d.acMode || 'auto';
      if (mode === 'auto') { const n = d.classes.map((x) => x.name).join(' '); mode = /barbarian|bárbaro/i.test(n) ? 'barbarian' : /monk|monge/i.test(n) ? 'monk' : 'normal'; }
      if (mode === 'monk' && shield) mode = 'normal';
      ac = (mode === 'mage' ? 13 : 10) + c.mod.dex + (mode === 'barbarian' ? c.mod.con : mode === 'monk' ? c.mod.wis : 0);
      parts = (mode === 'mage' ? '13' : '10') + ' ' + R.sign(c.mod.dex) + ' Des' + (mode === 'barbarian' ? ' ' + R.sign(c.mod.con) + ' Con' : mode === 'monk' ? ' ' + R.sign(c.mod.wis) + ' Sab' : '');
    }
    if (shield) { ac += num(shield.armor.ac, 2) + num(shield.armor.bonusAc); parts += ' + escudo ' + (num(shield.armor.ac, 2) + num(shield.armor.bonusAc)); }
    c.acAuto = ac; c.acParts = parts;
    c.ac = val(d, 'ac', ac);
    c.speed = val(d, 'speed', num(d.speed.walk, 9));
    // Conjuração
    // Cada classe que conjura tem atributo, CD, ataque e limites; a primeira é a principal (o ajuste sem sufixo é dela)
    const cs = casting(d);
    c.casters = cs.casters.map((x, j) => {
      const abil = (j === 0 && d.magia.abil) || x.abil;
      const suf = j === 0 ? '' : ':' + x.name;
      return Object.assign({}, x, { abil, key: suf, dc: abil ? val(d, 'spellDc' + suf, 8 + c.pb + c.mod[abil]) : null, atk: abil ? val(d, 'spellAtk' + suf, c.pb + c.mod[abil]) : null });
    });
    const p0 = c.casters[0];
    const abil0 = p0 ? p0.abil : d.magia.abil || '';
    c.spell = {
      abil: abil0, mode: p0 ? p0.mode : '',
      dc: p0 ? p0.dc : abil0 ? val(d, 'spellDc', 8 + c.pb + c.mod[abil0]) : null,
      atk: p0 ? p0.atk : abil0 ? val(d, 'spellAtk', c.pb + c.mod[abil0]) : null,
      slots: cs.slots.map((n, i) => Math.max(0, val(d, 'slot' + (i + 1), n))),
      pact: cs.pact ? { n: Math.max(0, val(d, 'pact', cs.pact.n)), level: cs.pact.level } : null,
      cantrips: p0 ? p0.cantrips : null, prepared: p0 ? p0.prepared : null, casterLevel: cs.casterLevel,
    };
    if (d.npc) npcCalc(d, c);
    // Carga (kg): Força × 7,5 (15 libras por ponto)
    c.weight = Math.round(d.itens.reduce((s, it) => s + num(it.weight) * num(it.qty, 1), 0) * 100) / 100;
    c.capacity = val(d, 'carry', c.score.str * 7.5);
    c.attuned = d.itens.filter((it) => it.attuned).length;
    return c;
  };

  // Criatura: proficiência pelo ND, salvaguardas e perícias do bloco (as que não tem = modificador), CA e PV do bloco
  function npcCalc(d, c) {
    const n = d.npc;
    c.npc = n;
    c.pb = val(d, 'pb', n.pb != null && n.pb !== '' ? num(n.pb) : R.crPb(n.cr));
    for (const k of R.AB) c.save[k] = { prof: n.saves[k] != null && n.saves[k] !== '', v: val(d, 'save_' + k, n.saves[k] != null && n.saves[k] !== '' ? num(n.saves[k]) : c.mod[k]) };
    for (const [id, , ab] of R.SKILLS) { const has = n.skills[id] != null && n.skills[id] !== ''; c.skill[id] = { lvl: has ? 1 : 0, ab, v: has ? num(n.skills[id]) : c.mod[ab] }; }
    c.passive.perception = val(d, 'pass_perception', n.passive != null && n.passive !== '' ? num(n.passive) : 10 + c.skill.perception.v);
    c.init = val(d, 'init', n.init != null && n.init !== '' ? num(n.init) : c.mod.dex);
    c.acAuto = num(n.ac, 10); c.acParts = n.acNote || ''; c.ac = val(d, 'ac', c.acAuto);
    c.hpAuto = Math.max(1, num(n.hp, 1)); c.hpMax = Math.max(1, val(d, 'hpMax', c.hpAuto));
    c.speed = val(d, 'speed', num(n.speed.walk, 0));
    c.xp = n.xp != null && n.xp !== '' ? num(n.xp) : R.CR_XP[String(n.cr)] || 0;
    // Conjuração da criatura: a primeira do bloco (atributo, CD e ataque escritos no livro, ou calculados)
    const sc = n.spellcasting[0];
    if (sc && sc.ability) {
      c.spell.abil = sc.ability;
      c.spell.dc = sc.dc != null && sc.dc !== '' ? num(sc.dc) : 8 + c.pb + c.mod[sc.ability];
      c.spell.atk = sc.atk != null && sc.atk !== '' ? num(sc.atk) : c.pb + c.mod[sc.ability];
    }
    c.casters = [];
    c.spell.slots = [0, 0, 0, 0, 0, 0, 0, 0, 0]; c.spell.pact = null;
    c.level = Math.max(1, Math.round(R.crNum(n.cr)));
  }
  // Ação da criatura (ataque ou salvaguarda com números do livro) → texto curto e fórmulas
  R.npcDmg = (x) => (x.dmg || []).filter((p) => p && p.dice && !p.cond).map((p) => ({ f: String(p.dice).replace(/\s+/g, ''), type: String(p.type || '').toLowerCase() }));

  // ---------- Ataques (formato do cadastro de Ataques) ----------
  const HAS_ATTACK = (t) => t === 'melee' || t === 'ranged' || t === 'spell-attack' || t === 'attack-save';
  R.HAS_ATTACK = HAS_ATTACK;
  // A conjuração de uma magia: a da classe dela (atk.cls), ou a principal
  const casterOf = (c, atk) => (atk && atk.cls && (c.casters || []).find((x) => x.name === atk.cls)) || null;
  R.casterOf = casterOf;
  function abMod(c, ab, atk) {
    if (!ab || ab === 'none') return 0;
    if (ab === 'best') return Math.max(c.mod.str, c.mod.dex);
    if (ab === 'spell') { const cs = casterOf(c, atk); const k = cs ? cs.abil : c.spell.abil; return k ? c.mod[k] : 0; }
    return c.mod[ab] || 0;
  }
  R.abMod = abMod;
  // Dado do truque pelo nível do personagem (tabela da magia: { 1: '1d10', 5: '2d10', … })
  function cantripDice(tbl, level, dice) {
    if (!tbl) return dice;
    let best = dice;
    for (const [lv, dd] of Object.entries(tbl).sort((x, y) => num(x[0]) - num(y[0]))) if (level >= num(lv)) best = dd;
    return best;
  }
  R.attackOf = function (c, atk) {
    const at = atk.attack || {}, sv = atk.save || {};
    const mult = at.prof === 'expert' ? 2 : at.prof === 'none' ? 0 : 1;
    // Magia: o ataque e a CD já calculados da classe dela (com os ajustes manuais)
    const cs = casterOf(c, atk) || (c.spell.abil ? c.spell : null);
    const hit = at.ability === 'spell' && cs && cs.atk != null ? cs.atk + num(at.bonus) : abMod(c, at.ability, atk) + c.pb * mult + num(at.bonus);
    const dcSpell = sv.dcAbility === 'spell' || !sv.dcAbility;
    const dc = sv.dc === 'fixed' ? num(sv.dcFixed, 10) : (dcSpell && cs && cs.dc != null ? cs.dc : 8 + c.pb + abMod(c, dcSpell ? 'spell' : sv.dcAbility, atk)) + num(sv.dcBonus);
    const dmg = (atk.damage || []).filter((x) => x && x.dice).map((x, i) => {
      const dice = i === 0 && atk.cantrip ? cantripDice(atk.cantrip, c.level, x.dice) : x.dice;
      const m = abMod(c, x.ability, atk) + (i === 0 ? num(atk.dmgBonus) : 0);
      return { formula: plusTxt(String(dice).replace(/\s+/g, ''), m), type: x.type || '' };
    });
    const vers = atk.versatile ? plusTxt(atk.versatile, abMod(c, (atk.damage || [])[0] ? atk.damage[0].ability : 'none', atk) + num(atk.dmgBonus)) : '';
    const heal = atk.heal ? plusTxt(atk.heal, atk.healMod ? abMod(c, 'spell', atk) : 0) : '';
    return { hasAttack: HAS_ATTACK(atk.type), hit, dc, hasSave: !HAS_ATTACK(atk.type) && atk.type !== 'heal' || !!atk.saveOnHit, dmg, vers, heal,
      dmgFormula: dmg.map((x) => x.formula).join('+'), dmgTxt: dmg.map((x) => x.formula + (x.type ? ' ' + x.type : '')).join(' + ') };
  };
  R.reachTxt = function (atk) {
    const U = App.Units;
    const d = (m) => (U ? U.dist(num(m)) : m + ' m');
    if (atk.type === 'melee') return atk.reach ? d(atk.reach) : '';
    const r = atk.range;
    if (r && r.normal) return r.long && r.long !== r.normal ? d(r.normal) + ' / ' + d(r.long) : d(r.normal);
    if (atk.area && atk.area.shape) return d(atk.area.size) + ' ' + atk.area.shape;
    return atk.rangeTxt || '';
  };

  // Cadastro → ficha
  const pick = (o, ks) => Object.fromEntries(ks.filter((k) => o[k] !== undefined).map((k) => [k, JSON.parse(JSON.stringify(o[k]))]));
  R.attackFromRecord = (rec) => Object.assign(pick(rec, ['name', 'source', 'type', 'reach', 'range', 'area', 'attack', 'save', 'saveOnHit', 'damage', 'versatile', 'crit', 'ammo', 'description']),
    { id: uid('at_'), ref: rec.id, dmgBonus: 0 });
  R.attackFromItem = function (it) {
    const w = it.weapon || {}, props = w.properties || [];
    const ab = props.includes('Finesse') ? 'best' : w.kind === 'ranged' ? 'dex' : 'str';
    const dmg = [];
    if (w.damage && w.damage.dice) dmg.push({ dice: plusTxt(w.damage.dice, num(w.bonusDamage)), ability: ab, type: w.damage.type || '' });
    for (const x of w.extraDamage || []) if (x && x.dice) dmg.push({ dice: x.dice, ability: 'none', type: x.type || '' });
    return {
      id: uid('at_'), ref: it.id, from: 'item', name: it.name, source: it.source, type: w.kind === 'ranged' ? 'ranged' : 'melee',
      reach: w.kind === 'ranged' ? null : w.reach || 1.5, range: w.kind === 'ranged' || props.includes('Thrown') ? w.range : null, area: null,
      attack: { ability: ab, bonus: num(w.bonusAttack), prof: 'prof' }, save: { ability: 'dex', dc: 'calc', dcAbility: 'spell', dcBonus: 0, onSuccess: 'half' },
      damage: dmg, versatile: w.versatile ? plusTxt(w.versatile, num(w.bonusDamage)) : '', crit: num(w.critThreshold) || 20, dmgBonus: 0,
      props: props.concat((w.mastery || []).map((m) => 'Mastery: ' + m)).join(', '), ammo: w.ammo || '',
    };
  };
  R.attackFromSpell = function (sp) {
    const rng = sp.range || {};
    const dmg = (sp.damage || []).filter((x) => x && x.dice).slice(0, 2).map((x) => ({ dice: x.dice, ability: 'none', type: x.type || '' }));
    const type = sp.attack ? 'spell-attack' : sp.save ? 'spell-save' : sp.heal ? 'heal' : 'spell-save';
    return {
      id: uid('at_'), ref: sp.id, from: 'spell', name: sp.name, source: sp.source, type, spellLevel: num(sp.level),
      reach: null, range: rng.kind === 'distance' && rng.distance ? { normal: rng.distance, long: null } : rng.kind === 'touch' ? { normal: 1.5, long: null } : null,
      rangeTxt: rng.kind === 'self' ? 'Pessoal' : rng.kind === 'sight' ? 'Visão' : '',
      area: sp.area && sp.area.shape ? { shape: sp.area.shape, size: sp.area.size, width: sp.area.width || null } : null,
      attack: { ability: 'spell', bonus: 0, prof: 'prof' },
      save: { ability: sp.save || 'dex', dc: 'calc', dcAbility: 'spell', dcBonus: 0, onSuccess: sp.onSuccess || 'none' },
      saveOnHit: !!(sp.attack && sp.save), damage: dmg, versatile: '', crit: 20, dmgBonus: 0,
      cantrip: sp.level === 0 && sp.higher && sp.higher.cantrip ? sp.higher.cantrip : null,
      perSlot: sp.higher ? sp.higher.perSlot || sp.higher.perSlotHeal || '' : '',
      heal: sp.heal || '', healMod: !!sp.heal,
    };
  };
  R.spellCanAttack = (sp) => !!(sp.attack || sp.save || sp.heal || (sp.damage || []).some((x) => x && x.dice));
  R.spellRow = function (sp, from) {
    const t = sp.time || {}, du = sp.duration || {}, cp = sp.components || {}, rg = sp.range || {};
    const U = App.Units;
    return {
      id: uid('sp_'), ref: sp.id, name: sp.name, source: sp.source, level: num(sp.level), school: sp.school || '',
      prepared: false, always: !!from, from: from || '', ritual: !!sp.ritual, conc: !!du.concentration,
      time: (t.number || '') + ' ' + (t.unit || '') + (t.condition ? ', ' + t.condition : ''),
      range: rg.kind === 'distance' ? (U ? U.dist(num(rg.distance)) : rg.distance + ' m') : rg.kind || '',
      comp: [cp.v && 'V', cp.s && 'S', cp.m && 'M' + (cp.material ? ' (' + cp.material + ')' : '')].filter(Boolean).join(', '),
      dur: du.type === 'instant' ? 'Instantaneous' : du.type === 'timed' ? (du.concentration ? 'Concentration, ' : '') + du.amount + ' ' + du.unit + (du.amount > 1 ? 's' : '') : du.type || '',
      text: [sp.description || '', sp.higher && sp.higher.text ? sp.higher.text : ''].filter(Boolean).join('\n\n'),
      atk: null,
    };
  };
  R.itemRow = function (it) {
    return {
      id: uid('it_'), ref: it.id, name: it.name, source: it.source, qty: 1, weight: num(it.weight), category: it.category || '',
      equipped: false, attuned: false, attune: !!it.attune, magic: !!it.magic, rarity: it.rarity || '',
      armor: it.armor ? pick(it.armor, ['type', 'ac', 'dexMax', 'strength', 'stealth', 'bonusAc']) : null,
      text: it.description || '', cost: it.cost == null ? null : it.cost,
    };
  };
  // Classe do cadastro → cópia na ficha (o que as contas usam)
  R.classFrom = function (rec, level) {
    const P = rec.progression || {};
    return {
      ref: rec.id, name: rec.name, source: rec.source, edition: rec.edition || '', level: level || 1, hd: num(rec.hd, 8), saves: (rec.saves || []).slice(),
      casting: rec.spellcasting ? pick(rec.spellcasting, ['ability', 'progression', 'mode']) : null,
      pb: P.pb || null, slots: P.slots || null, pact: P.pact || null, cantrips: P.cantrips || null, prepared: P.prepared || null,
      columns: P.columns || [], rows: P.rows || [], subLevels: (rec.subclassLevels || []).slice(), subTitle: rec.subclassTitle || '',
      features: (rec.features || []).map((f) => ({ name: f.name, level: f.level, text: f.text || '', mark: f.mark || '' })),
      sub: null,
    };
  };
  R.subFrom = function (rec) {
    const P = rec.progression || {};
    return {
      ref: rec.id, name: rec.name, shortName: rec.shortName || '', source: rec.source,
      casting: rec.spellcasting ? pick(rec.spellcasting, ['ability', 'progression', 'mode']) : null,
      slots: rec.spellcasting ? P.slots || null : null, cantrips: rec.spellcasting ? P.cantrips || null : null, prepared: rec.spellcasting ? P.prepared || null : null,
      features: (rec.features || []).map((f) => ({ name: f.name, level: f.level, text: f.text || '' })),
    };
  };
  // Colunas da tabela da classe no nível atual (Rages 3, Rage Damage +2…)
  R.columnsAt = function (cl) {
    const lv = Math.max(1, Math.min(20, num(cl.level, 1)));
    const row = (cl.rows || [])[lv - 1] || [];
    return (cl.columns || []).map((name, i) => ({ name, value: row[i] == null ? '' : String(row[i]) })).filter((x) => x.value !== '' && x.value !== '—');
  };

  // ---------- Campos genéricos para a mesa ----------
  const sq = (m) => Math.max(1, Math.round(num(m) / 1.5));
  R.derive = function (a) {
    const c = R.calc(a), d = c.d;
    const stats = R.AB.map((k) => ({ name: R.AB_PT[k], value: c.mod[k] }))
      .concat([{ name: 'Defesa', value: c.ac }, { name: 'Proficiência', value: c.pb }, { name: 'Iniciativa', value: c.init }, { name: 'Percepção passiva', value: c.passive.perception }]);
    const old = new Map((a.bars || []).map((b) => [slug(b.name), b]));
    const bar = (name, max) => {
      const o = old.get(slug(name));
      // Máximo maior (subiu de nível, Con maior): ganha a diferença no atual
      const grow = o ? Math.max(0, max - num(o.max)) : 0;
      const value = o ? Math.max(0, Math.min(num(o.value) + grow, max)) : max;
      return { name, value, max };
    };
    const bars = [bar('PV', c.hpMax)];
    // PV acima do máximo só por PV temporário (fica na ficha 5e); a barra não passa do máximo
    if (!d.npc) c.spell.slots.forEach((n, i) => { if (n > 0) bars.push(bar(R.SLOT_BAR(i + 1), n)); });
    if (c.spell.pact && c.spell.pact.n > 0) bars.push(bar(R.PACT_BAR, c.spell.pact.n));
    const actions = [];
    if (d.npc) {
      const n = d.npc;
      for (const [key] of R.NPC_LISTS) (n[key] || []).forEach((x, i) => {
        const parts = R.npcDmg(x);
        if (x.kind !== 'attack' && x.kind !== 'save') return;
        const ac = { name: x.name, bar: 'PV', critMin: 20, from5e: x.id || key + i, parts };
        const rngM = x.range && x.range.normal ? x.range.normal : x.reach;
        if (rngM) ac.range = sq(rngM);
        if (x.area && num(x.area.size)) { ac.area = sq(x.area.size); ac.multi = true; }
        const dmg = parts.map((p) => p.f).join('+');
        if (x.kind === 'attack') Object.assign(ac, { mode: 'attack', attack: '1d20' + (num(x.hit) ? R.sign(num(x.hit)).replace('−', '-') : ''), defense: 'Defesa', damage: dmg });
        else Object.assign(ac, { mode: 'save', save: R.AB_PT[x.save] || 'Destreza', dc: String(num(x.dc, 10)), damage: dmg, onSave: x.onSave === 'half' ? 'half' : 'none' });
        actions.push(ac);
      });
      for (const g of n.extra || []) actions.push(g);
    }
    for (const atk of d.attacks) {
      const r = R.attackOf(c, atk);
      const ac = { name: atk.name, bar: 'PV', critMin: num(atk.crit) || 20, from5e: atk.id };
      const rngM = atk.type === 'melee' ? atk.reach : atk.range && atk.range.normal;
      if (rngM) ac.range = sq(rngM);
      if (atk.area && atk.area.shape && num(atk.area.size)) { ac.area = sq(atk.area.size); ac.multi = true; }
      // Plano 53: o dano leva o tipo de cada parte (imunidade, resistência e vulnerabilidade na mesa)
      if (r.dmg.length) ac.parts = r.dmg.map((x) => ({ f: x.formula, type: String(x.type || '').toLowerCase() }));
      if (atk.type === 'heal' || (atk.heal && !r.dmg.length)) Object.assign(ac, { mode: 'heal', damage: r.heal || '0' });
      else if (r.hasAttack) Object.assign(ac, { mode: 'attack', attack: '1d20' + (r.hit ? R.sign(r.hit).replace('−', '-') : ''), defense: 'Defesa', damage: r.dmgFormula });
      else Object.assign(ac, { mode: 'save', save: R.AB_PT[(atk.save || {}).ability] || 'Destreza', dc: String(r.dc), damage: r.dmgFormula, onSave: (atk.save || {}).onSuccess === 'half' ? 'half' : 'none' });
      if (num(atk.spellLevel) > 0) {
        // Magia de Warlock gasta espaço de pacto; as outras, o espaço do nível (ou o de pacto, se não houver outro)
        const cs = R.casterOf(c, atk);
        const pact = c.spell.pact && c.spell.pact.n > 0 && ((cs && cs.prog === 'pact') || !c.spell.slots.some((n) => n > 0));
        ac.cost = 1; ac.costBar = pact ? R.PACT_BAR : R.SLOT_BAR(num(atk.spellLevel));
      }
      actions.push(ac);
    }
    let dv = num(d.sentidos.darkvision);
    if (d.npc && !dv) { const m = /darkvision (\d+(?:[.,]\d+)?)\s*(m|ft)/i.exec(d.npc.senses || ''); if (m) dv = num(m[1]) * (m[2] === 'ft' ? 0.3 : 1); }
    return { stats, bars, actions, initFormula: '1d20' + (c.init ? R.sign(c.init).replace('−', '-') : ''), testFormula: '1d20+@valor', darkvision: dv ? Math.round(dv / 1.5) : a.darkvision || 0 };
  };
  // Aplica as contas na ficha (muta)
  R.apply = function (a) {
    a.sistema = '5e';
    a.dnd5e = R.norm(a.dnd5e);
    Object.assign(a, R.derive(a));
    return a;
  };

  // Defesas a dano: "fire, poison; bludgeoning, piercing, slashing from nonmagical attacks"
  // Trechos separados por ";" com condição ("from", "nonmagical", "except"…) não entram na conta automática (só no texto)
  R.DMG_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
  R.parseDefense = function (txt) {
    const out = new Set();
    for (const seg of String(txt || '').toLowerCase().split(';')) {
      if (/from|nonmagical|non-magical|except|not made|that is|that are|aren't|isn't|while|in dim|silvered|adamantine/.test(seg)) continue;
      for (const t of R.DMG_TYPES) if (new RegExp('\\b' + t + '\\b').test(seg)) out.add(t);
    }
    return out;
  };
  R.defensesOf = function (a) {
    if (!a || a.sistema !== '5e' || !a.dnd5e) return null;
    const src = a.dnd5e.npc || { immune: (a.dnd5e.defesas || {}).immune, resist: (a.dnd5e.defesas || {}).resist, vuln: (a.dnd5e.defesas || {}).vuln };
    return { immune: R.parseDefense(src.immune), resist: R.parseDefense(src.resist), vuln: R.parseDefense(src.vuln) };
  };

  // Salvaguarda de um alvo 5e pelo nome do atributo ("Destreza"), para o combate da mesa
  R.saveFor = function (a, name) {
    if (!a || a.sistema !== '5e' || !a.dnd5e) return null;
    const k = R.AB.find((x) => slug(R.AB_PT[x]) === slug(name) || x === slug(name));
    if (!k) return null;
    return R.calc(a).save[k].v;
  };

  // Dados de vida gastos por tipo. Fichas antigas só têm o total (hdUsed): ele é distribuído do maior dado para o menor.
  R.usedBy = function (d, hdList) {
    const by = {};
    const total = num(d.hp.hdUsed);
    const saved = d.hp.hdUsedBy || {};
    const sum = Object.values(saved).reduce((a, b) => a + num(b), 0);
    if (sum === total) { for (const x of hdList) by[x.die] = Math.min(x.n, num(saved[x.die])); return by; }
    let rest = total;
    for (const x of hdList) { const t = Math.min(x.n, rest); by[x.die] = t; rest -= t; }
    return by;
  };
  // Gasta um dado de vida do tipo (die) e guarda o total
  R.spendHd = function (d, die) {
    const c = R.calc({ dnd5e: d, bars: [] });
    const by = Object.assign({}, c.hdUsedBy);
    const x = c.hdLeft.find((y) => y.die === die && y.left > 0);
    if (!x) return false;
    by[die] = num(by[die]) + 1;
    d.hp.hdUsedBy = by; d.hp.hdUsed = Object.values(by).reduce((a, b) => a + num(b), 0);
    return true;
  };

  // ---------- Descansos (mutam a ficha) ----------
  const barSet = (a, name, fn) => { const b = (a.bars || []).find((x) => slug(x.name) === slug(name)); if (b) b.value = fn(b); };
  R.longRest = function (a) {
    const c = R.calc(a), d = a.dnd5e;
    barSet(a, 'PV', (b) => b.max);
    for (const b of a.bars || []) if (/^espa[cç]os/i.test(b.name)) b.value = b.max;
    d.hp.temp = 0;
    let back = d.edicao === '2014' ? Math.max(1, Math.floor(c.hdTotal / 2)) : c.hdTotal;
    // Recupera primeiro os dados maiores
    const by = Object.assign({}, c.hdUsedBy);
    for (const x of c.hd) { const t = Math.min(num(by[x.die]), back); by[x.die] = num(by[x.die]) - t; back -= t; }
    d.hp.hdUsedBy = by;
    d.hp.hdUsed = Object.values(by).reduce((a, b) => a + num(b), 0);
    d.hp.death = { ok: 0, fail: 0 };
    for (const r of d.recursos) if (r.reset === 'long' || r.reset === 'short') r.cur = num(r.max);
    if (num(d.exaustao) > 0) d.exaustao = num(d.exaustao) - 1;
  };
  R.shortRest = function (a) {
    const d = a.dnd5e;
    barSet(a, R.PACT_BAR, (b) => b.max);
    for (const r of d.recursos) if (r.reset === 'short') r.cur = num(r.max);
  };
})(window.App);
