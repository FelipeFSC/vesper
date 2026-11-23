'use strict';
import { flushSync, mount, unmount } from 'svelte';
import AssistantSteps from '../src/ui/AssistantSteps.svelte';
/*
 * Assistente de D&D 5e (Plano 51, parte B), no modelo do Charactermancer do Roll20: cria a ficha 5e pelos cadastros e sobe de nível.
 *   App.Assist5e.open({ actor, onDone(res) })   res = { d: dnd5e pronto, name }
 *   - sem actor (ou ficha sem classe): cria do zero (nível 1–20, com tudo o que é escolha até o nível);
 *   - com actor que já tem classe: sobe de nível (só o que os níveis novos pedem; o resto da ficha fica como está).
 * Abas: Regras · Classe · Espécie · Antecedente · Atributos · Escolhas · Magias · Equipamento · Resumo.
 * As escolhas saem dos cadastros (formato de benefícios de tools/cadastros-beneficios.mjs):
 *   perícias e proficiências à escolha, aumentos de atributo, talentos (ASI ou talento), opções de classe por nível,
 *   especialização, magias à escolha (listas de talentos e espécies), magias da classe (truques e preparadas no limite).
 * Validação só avisa (decisão do usuário): o Resumo lista o que falta e deixa criar mesmo assim.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const R = App.Regras5e, D5 = App.Dados5e;
  const editionName = D5.editionName;
  const ic = (n, cls) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n, cls); return t.content.firstChild; };
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn small' }, attrs), ic(icon), label);
  const iconBtn = (icon, title, onclick, attrs = {}) => h('button', Object.assign({ class: 'icon-btn', title, 'aria-label': title, onclick }, attrs), ic(icon));
  const num = (v, d = 0) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sg = R.sign;
  // append que ignora vazios (o append nativo escreve "null")
  const put = (el, ...kids) => { el.append(...kids.flat(Infinity).filter((x) => x != null && x !== false && x !== '')); return el; };

  const A5 = App.Assist5e || {};
  App.Assist5e = A5;
  const STEPS = [['regras', 'settings-2', 'Regras'], ['classe', 'shield', 'Classe'], ['especie', 'footprints', 'Espécie'], ['antecedente', 'scroll-text', 'Antecedente'],
    ['atributos', 'dumbbell', 'Atributos'], ['escolhas', 'list-ordered', 'Escolhas'], ['magias', 'sparkles', 'Magias'], ['equip', 'backpack', 'Equipamento'], ['resumo', 'check', 'Resumo']];
  const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  const STANDARD = [15, 14, 13, 12, 10, 8];
  const KIND_PT = { skill: 'Perícia', tool: 'Ferramenta', language: 'Idioma', weapon: 'Arma', armor: 'Armadura', save: 'Salvaguarda', skillToolLanguage: 'Perícia, ferramenta ou idioma', abil: 'Atributo de conjuração' };
  const SCHOOL = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation' };
  const ASI_BLOCKS = [{ choose: { from: R.AB, count: 1, amount: 2 } }, { choose: { from: R.AB, count: 2, amount: 1 } }];

  // ---------- Dados ----------
  const X = {};
  const byId = (tab, id) => (id && D5.byId[tab] ? D5.byId[tab].get(id) : null) || null;
  async function loadAll(withItems) {
    const tabs = ['classes', 'subclasses', 'species', 'backgrounds', 'feats', 'options', 'spells'].concat(withItems ? ['items'] : []);
    await Promise.all(tabs.map((t) => D5.load(t)));
    for (const t of tabs) X[t] = D5.lists[t];
  }

  // ---------- O que cada escolha oferece ----------
  const skillOpts = (ids) => (ids || R.SKILLS.map((s) => s[0])).map((id) => ({ v: id, label: R.SKILL[id] ? R.SKILL[id][1] : id }));
  const abilOpts = (ks) => (ks || R.AB).map((k) => ({ v: k, label: R.AB_PT[k] }));
  function listOpts(kind, from) {
    if (kind === 'skill') return skillOpts(from.map(keyOf).filter((k) => R.SKILL[k]));
    if (kind === 'save' || kind === 'abil') return abilOpts(from);
    return from.map((x) => ({ v: x, label: x }));
  }
  // Filtro das magias à escolha: "level=0|class=Cleric", "level=1;2|school=V;E"
  function spellFilter(str) {
    const f = {};
    for (const part of String(str || '').split('|')) {
      const m = /^\s*([a-z ]+)\s*=\s*(.+)$/i.exec(part);
      if (m) f[m[1].trim().toLowerCase()] = m[2].split(/[;,]/).map((x) => x.trim()).filter(Boolean);
    }
    return (sp) => (!f.level || f.level.map(Number).includes(num(sp.level))) && (!f.class || f.class.some((c) => (sp.classes || []).includes(c) || (sp.classesExpanded || []).includes(c)))
      && (!f.school || f.school.some((s) => (SCHOOL[s] || s) === sp.school));
  }

  // Qual lista de magias vale: a pré-escolhida (linhagem, "Magic Initiate (Wizard)") ou a escolha da pessoa
  // "High Elf Lineage" ↔ "High Elf"; "Wizard" ↔ "Wizard Spells"
  const preIndex = (groups, pre) => {
    const p = String(pre || '').toLowerCase().replace(/ lineage$/, '').trim();
    return p ? groups.findIndex((g) => { const n = String(g.name || '').toLowerCase().replace(/ spells$/, '').trim(); return n && (p.includes(n) || n.includes(p)); }) : -1;
  };
  const chosenGroup = (key) => { const v = (A5.st.ch[key + ':sg'] || [])[0]; return v == null || v === '' ? -1 : num(v, -1); };
  function groupIndex(groups, key, pre) {
    if (groups.length <= 1) return 0;
    const i = preIndex(groups, pre);
    return i >= 0 ? i : chosenGroup(key);
  }
  // Benefícios de uma fonte → escolhas (o que é fixo entra direto em apply)
  function benefitChoices(out, b, base) {
    if (!b) return;
    const ab = b.ability || [];
    if (ab.length > 1 || (ab.length === 1 && (ab[0].choose || ab[0].weighted))) out.push(Object.assign({}, base, { key: base.key + ':ab', type: 'ability', blocks: ab, label: 'Aumento de atributo' }));
    (b.proficiencies || []).forEach((p, i) => {
      if (p.choose && (p.choose.from || []).length) out.push(Object.assign({}, base, { key: base.key + ':pf' + i, type: 'list', kind: p.kind, opts: listOpts(p.kind, p.choose.from), count: p.choose.count || 1, label: KIND_PT[p.kind] || p.kind }));
      for (const [k, n] of Object.entries(p.any || {})) {
        if (p.kind === 'skill' && k === 'any') out.push(Object.assign({}, base, { key: base.key + ':pa' + i, type: 'list', kind: 'skill', opts: skillOpts(), count: n, label: 'Perícia à escolha' }));
        else if (p.kind === 'save') out.push(Object.assign({}, base, { key: base.key + ':pa' + i, type: 'list', kind: 'save', opts: abilOpts(), count: n, label: 'Salvaguarda' }));
        else out.push(Object.assign({}, base, { key: base.key + ':pa' + i + k, type: 'text', kind: p.kind, count: n, label: (KIND_PT[p.kind] || p.kind) + ' à escolha' + (/Standard/.test(k) ? ' (padrão)' : /Gaming/.test(k) ? ' (jogo)' : /Artisan/.test(k) ? ' (artesão)' : /Musical/.test(k) ? ' (instrumento)' : ''), skillToo: p.kind === 'skillToolLanguage' }));
      }
    });
    (b.expertise || []).forEach((e, i) => {
      const n = e.choose ? e.choose.count || 1 : Object.values(e.any || {})[0] || 0;
      if (n) out.push(Object.assign({}, base, { key: base.key + ':ex' + i, type: 'expertise', count: n, label: 'Especialização', from: e.choose ? e.choose.from.map(keyOf) : null }));
    });
    if (b.spells) {
      const S = b.spells, groups = S.groups || [];
      if (S.ability && S.ability.choose) out.push(Object.assign({}, base, { key: base.key + ':sab', type: 'list', kind: 'abil', opts: abilOpts(S.ability.choose), count: 1, label: 'Atributo de conjuração' }));
      const gi = groupIndex(groups, base.key, base.groupPre);
      if (groups.length > 1 && preIndex(groups, base.groupPre) < 0)
        out.push(Object.assign({}, base, { key: base.key + ':sg', type: 'group', opts: groups.map((g, j) => ({ v: String(j), label: g.name || 'Lista ' + (j + 1) })), count: 1, label: 'Lista de magias' }));
      const g = groups[gi];
      if (g) g.items.forEach((it, j) => {
        if (!it.choose || it.how === 'expanded') return;
        if (it.at && num(String(it.at).replace(/\D/g, '')) > A5.st.level) return;
        out.push(Object.assign({}, base, { key: base.key + ':sp' + gi + '_' + j, type: 'spell', count: it.count || 1, filter: it.choose, label: it.label || 'Magia', how: it.how, uses: it.uses || '' }));
      });
    }
    (b.options || []).forEach((o, i) => out.push(Object.assign({}, base, { key: base.key + ':op' + i, type: 'option', types: String(o.type || '').split(','), count: o.count || 1, label: o.name || 'Opção' })));
    if (b.resist && b.resist.choose) out.push(Object.assign({}, base, { key: base.key + ':rs', type: 'list', kind: 'resist', opts: b.resist.choose.from.map((x) => ({ v: x, label: x })), count: b.resist.choose.count || 1, label: 'Resistência' }));
  }
  // Escolhas de um talento escolhido (recursivo: o talento traz as dele)
  function featChoices(out, featId, base) {
    const f = byId('feats', featId);
    if (!f) return;
    benefitChoices(out, f.benefits, Object.assign({}, base, { key: 'ft:' + base.key, source: 'Talento: ' + f.name }));
  }
  // Benefícios da espécie com a opção (a opção traz só o que muda)
  function speciesBenefits(sp, optName) {
    const o = optName && (sp.options || []).find((x) => x.name === optName);
    return o && o.benefits ? Object.assign({}, sp.benefits || {}, o.benefits) : sp.benefits || {};
  }
  // Opção de classe com contagem por nível: quantas a mais no nível L
  const inc = (arr, L) => Math.max(0, num((arr || [])[L - 1]) - (L > 1 ? num((arr || [])[L - 2]) : 0));

  // Multiclasse (Plano 52): ao subir de nível, os níveis novos vão para uma classe (st.ci: índice na ficha; igual ao total de classes = classe nova)
  const target = () => (A5.st.mode === 'up' ? (A5.st.base0.classes || [])[A5.st.ci] || null : null);
  const clsFrom = () => (A5.st.mode === 'new' ? 0 : target() ? num(target().level, 1) : 0);
  const clsTo = () => (A5.st.mode === 'new' ? A5.st.level : clsFrom() + (A5.st.level - A5.st.fromLevel));
  A5.clsTo = clsTo;
  // Requisito de multiclasse: linhas = OU; condições da linha = E; a condição de atributo vale com qualquer um dos atributos dela
  function reqOk(rec, abil) {
    const rows = ((rec && rec.multiclass) || {}).requirements || [];
    if (!rows.length) return true;
    return rows.some((row) => row.every((p) => p.type !== 'ability' || (p.abilities || []).some((k) => num(abil[k]) >= num(p.min))));
  }
  const reqTxt = (rec) => (((rec && rec.multiclass) || {}).requirements || []).map((row) => row.filter((p) => p.type === 'ability').map((p) => p.abilities.map((k) => R.AB_SH[k]).join(' ou ') + ' ' + p.min).join(' e ')).join('; ou ');
  // Todas as escolhas até o nível (no subir de nível, só as dos níveis novos)
  function needs() {
    const st = A5.st, out = [];
    const cls = byId('classes', st.classId), sub = byId('subclasses', st.subId), sp = byId('species', st.speciesId), bg = byId('backgrounds', st.bgId);
    const isNew = st.mode === 'new';
    const CL = clsTo(), CF = clsFrom();
    const lv = (L) => L > CF;
    if (cls) {
      // Classe nova na multiclasse: só as proficiências de multiclasse (e as escolhas delas)
      const profs = isNew ? cls.proficiencies || [] : !target() ? ((cls.multiclass || {}).proficiencies || []) : [];
      profs.forEach((p, i) => {
        if (p.choose && (p.choose.from || []).length) out.push({ key: (isNew ? 'cls:pf' : 'mc:pf') + i, level: 1, source: cls.name, type: 'list', kind: p.kind, opts: listOpts(p.kind, p.choose.from), count: p.choose.count || 1, label: KIND_PT[p.kind] || p.kind });
      });
      for (const f of cls.features || []) {
        if (num(f.level) > CL || !lv(num(f.level))) continue;
        if (f.mark === 'asi') {
          const key = 'asi:' + f.level;
          out.push({ key, level: num(f.level), source: cls.name, type: 'asi', label: 'Aumento de atributo ou talento', count: 1 });
          const v = st.ch[key];
          if (v && v.mode === 'feat' && v.feat) featChoices(out, v.feat, { key, level: num(f.level) });
        }
        if (/^expertise$/i.test(f.name)) out.push({ key: 'exp:' + f.level, level: num(f.level), source: cls.name, type: 'expertise', count: 2, label: 'Especialização' });
      }
      (cls.featProgression || []).forEach((fp, i) => {
        for (let L = 1; L <= CL; L++) {
          const n = inc(fp.byLevel, L);
          if (!n || !lv(L)) continue;
          const key = 'fp:' + i + ':' + L;
          out.push({ key, level: L, source: cls.name, type: 'feat', category: fp.category, count: n, label: fp.name || 'Talento' });
          for (const id of [].concat(st.ch[key] || [])) featChoices(out, id, { key: key + ':' + id, level: L });
        }
      });
      const optProg = (rec, who) => (rec.optionProgression || []).forEach((op, i) => {
        for (let L = 1; L <= CL; L++) {
          const n = inc(op.byLevel, L);
          if (n && lv(L)) out.push({ key: 'op:' + who + i + ':' + L, level: L, source: rec.name, type: 'option', types: String(op.type || '').split(','), count: n, label: op.name || 'Opções' });
        }
      });
      optProg(cls, 'c');
      if (sub) optProg(sub, 's');
    }
    if (isNew && sp) {
      benefitChoices(out, speciesBenefits(sp, st.speciesOpt), { key: 'sp', level: 0, groupPre: st.speciesOpt || '', source: sp.name + (st.speciesOpt ? ' (' + st.speciesOpt + ')' : '') });
      (sp.feats || []).forEach((f, i) => {
        const key = 'spft:' + i;
        if (f.feat) featChoices(out, f.feat, { key, level: 0 });
        else { out.push({ key, level: 0, source: sp.name, type: 'feat', category: f.category || '', count: f.count || 1, label: 'Talento' + (f.category ? ' de ' + (f.category === 'Origin' ? 'origem' : f.category) : '') }); for (const id of [].concat(st.ch[key] || [])) featChoices(out, id, { key: key + ':' + id, level: 0 }); }
      });
    }
    if (isNew && bg) {
      const benefits = clone(bg.benefits || {});
      if (st.bgFreeAbility) for (const block of benefits.ability || []) {
        if (block.weighted) block.weighted.from = R.AB;
        if (block.choose) block.choose.from = R.AB;
      }
      benefitChoices(out, benefits, { key: 'bg', level: 0, source: bg.name });
      (bg.feats || []).forEach((f, i) => {
        const id = st.bgFreeFeat ? st.ch['bgft:' + i] : f.feat;
        if (id) featChoices(out, id, { key: 'bgft:' + i, level: 0, groupPre: st.bgFreeFeat ? '' : f.choice });
      });
    }
    // Aumentos de atributo da origem ficam na aba Atributos
    for (const c of out) c.tab = c.type === 'ability' && c.level === 0 ? 'atributos' : 'escolhas';
    return out;
  }
  const picks = (key) => [].concat(A5.st.ch[key] || []).filter((x) => x != null && x !== '');
  const featMatches = (category, feat) => {
    if (!category) return true;
    if (category === 'Fighting Style/FS:P') return feat.category === 'Fighting Style' || feat.category === 'Fighting Style (Paladin)';
    if (category === 'Fighting Style/FS:R') return feat.category === 'Fighting Style' || feat.category === 'Fighting Style (Ranger)';
    return feat.category === category;
  };
  function done(c) {
    const v = A5.st.ch[c.key];
    if (c.type === 'ability') { const blk = c.blocks[(v && v.alt) || 0] || {}; return !blk.choose && !blk.weighted || ((v && v.picks) || []).filter(Boolean).length >= (blk.weighted ? blk.weighted.weights.length : blk.choose.count); }
    if (c.type === 'asi') return !!v && (v.mode === 'feat' ? !!v.feat : ((v.picks || []).filter(Boolean).length >= ((v.alt || 0) === 0 ? 1 : 2)));
    return picks(c.key).length >= c.count;
  }

  // ---------- Montar a ficha a partir das escolhas ----------
  const addList = (d, k, vals) => { const cur = String(d.prof[k] || '').split(/\s*,\s*/).filter(Boolean); for (const v of vals) if (v && !cur.some((x) => x.toLowerCase() === String(v).toLowerCase())) cur.push(v); d.prof[k] = cur.join(', '); };
  const PROF_KEY = { armor: 'armor', weapon: 'weapons', tool: 'tools', language: 'langs' };
  function abilityBonus(blocks, v, add) {
    const alt = (v && v.alt) || 0, blk = (blocks || [])[alt] || {};
    if (blk.fixed) for (const [k, n] of Object.entries(blk.fixed)) add(k, num(n), blk.max);
    if (blk.weighted) blk.weighted.weights.forEach((w, i) => { const k = ((v && v.picks) || [])[i]; if (k) add(k, w, blk.max); });
    if (blk.choose) for (const k of ((v && v.picks) || []).filter(Boolean).slice(0, blk.choose.count)) add(k, blk.choose.amount || 1, blk.max);
  }
  // PV a mais por nível escrito no texto (Dwarven Toughness, Tough)
  const perLevelOf = (txt) => (/hit point maximum increases by an amount equal to twice your (character )?level/i.test(txt) ? 2 : /hit point maximum increases by (\d+),? and it increases by \1 every time you gain a level/i.test(txt) ? num(RegExp.$1) : 0);

  function build(base) {
    const st = A5.st;
    const cls = byId('classes', st.classId), sub = byId('subclasses', st.subId), sp = byId('species', st.speciesId), bg = byId('backgrounds', st.bgId);
    const d = st.mode === 'up' ? R.norm(clone(base)) : R.blank(st.edicao);
    if (st.mode === 'new' && base) for (const k of ['bio', 'itens', 'moedas', 'attacks', 'recursos', 'tendencia']) if (base[k] && (Array.isArray(base[k]) ? base[k].length : typeof base[k] === 'object' ? Object.keys(base[k]).length : base[k])) d[k] = clone(base[k]);
    d.edicao = st.edicao;
    const F5 = App.Ficha5e;
    const bonus = {}, caps = {};
    const addAb = (k, n, max) => { if (!R.AB.includes(k)) return; bonus[k] = (bonus[k] || 0) + n; if (max) caps[k] = Math.max(caps[k] || 20, max); };
    const spellsToAdd = []; // { id, from, always, how }
    const fixedBenefits = (b, from, key, pre, atLevel, cls2) => {
      if (!b) return;
      F5.applyBenefits(d, b);
      const ab = b.ability || [];
      if (ab.length === 1 && ab[0].fixed && !ab[0].choose && !ab[0].weighted) abilityBonus(ab, null, addAb);
      for (const e of b.expertise || []) for (const s of e.fixed || []) d.skills[keyOf(s)] = 2;
      const groups = (b.spells && b.spells.groups) || [];
      const gi = groupIndex(groups, key || '', pre);
      if (groups[gi]) for (const it of groups[gi].items) {
        if (!it.spell || it.how === 'expanded') continue;
        if (it.at && num(String(it.at).replace(/\D/g, '')) > (atLevel || st.level)) continue;
        spellsToAdd.push({ id: it.spell, from, always: true, cls: cls2 || '' });
      }
    };
    const lvNew = (L) => L > clsFrom();
    // Classe (no subir de nível, só a classe escolhida muda; as outras ficam)
    if (cls) {
      const ci = st.mode === 'new' ? 0 : st.ci;
      const prev = d.classes[ci] || null;
      const c0 = R.classFrom(cls, clsTo());
      c0.sub = sub ? R.subFrom(sub) : prev ? prev.sub || null : null;
      // PV rolado: por nível da classe
      const oldRolls = prev ? prev.rolls || (ci === 0 ? d.hp.rolls : null) || {} : {};
      c0.rolls = Object.assign({}, oldRolls, st.hpMethod === 'roll' ? st.hpRolls : {});
      if (st.mode === 'new') d.classes = [c0];
      else d.classes[ci] = c0;
      if (st.mode === 'new') {
        for (const s of cls.saves || []) d.saves[s] = true;
        F5.applyProfs(d, cls.proficiencies || []);
      } else if (!prev) F5.applyProfs(d, (cls.multiclass || {}).proficiencies || []);
      // Recursos com usos na tabela da classe (Rages, Focus Points…)
      const NOT_USES = /mastery|damage|known|cantrip|spell|slot|level|dice|die|bonus|invocation|prepared|sneak|movement|martial arts|infusion|metamagic|maneuver/i;
      for (const col of R.columnsAt(c0)) {
        if (!/^\d+$/.test(col.value) || NOT_USES.test(col.name)) continue;
        const r = d.recursos.find((x) => x.name === col.name);
        if (r) { r.cur = Math.max(0, num(r.cur) + num(col.value) - num(r.max)); r.max = num(col.value); }
        else d.recursos.push({ name: col.name, cur: num(col.value), max: num(col.value), reset: 'long' });
      }
      // Magias sempre preparadas da subclasse (pelo nível da classe)
      if (sub && sub.spells) fixedBenefits({ spells: sub.spells }, sub.shortName || sub.name, '', '', clsTo(), cls.name);
    }
    // Espécie e antecedente (só ao criar)
    if (st.mode === 'new' && sp) {
      F5.applySpecies(d, sp);
      if (st.speciesOpt) { d.especie.option = st.speciesOpt; F5.applySpeciesOption(d, st.speciesOpt); }
      if (st.size) d.tamanho = st.size;
      fixedBenefits(speciesBenefits(sp, st.speciesOpt), sp.name, 'sp', st.speciesOpt);
      const txt = (sp.traits || []).concat(((sp.options || []).find((o) => o.name === st.speciesOpt) || {}).traits || []).map((t) => t.text).join('\n');
      d.hp.perLevel = num(d.hp.perLevel) + perLevelOf(txt);
    }
    if (st.mode === 'new' && bg) { F5.applyBackground(d, bg); fixedBenefits(bg.benefits, bg.name); }
    // Talentos (fixos do antecedente e da espécie, e os escolhidos)
    const featIds = [];
    if (st.mode === 'new' && bg) {
      d.antecedente.feats = [];
      (bg.feats || []).forEach((f, i) => {
        const id = st.bgFreeFeat ? st.ch['bgft:' + i] : f.feat;
        const rec = byId('feats', id);
        if (!id || !rec) return;
        const pre = st.bgFreeFeat ? '' : f.choice;
        const name = rec.name + (pre ? ' (' + pre + ')' : '');
        d.antecedente.feats.push({ ref: id, name });
        featIds.push({ id, key: 'bgft:' + i, pre, name });
      });
    }
    if (st.mode === 'new' && sp) (sp.feats || []).forEach((f, i) => { if (f.feat) featIds.push({ id: f.feat, key: 'spft:' + i }); });
    // Escolhas
    const all = needs();
    for (const c of all) {
      const v = st.ch[c.key];
      if (v == null) continue;
      if (c.type === 'list') {
        for (const x of picks(c.key).slice(0, c.count)) {
          if (c.kind === 'skill') d.skills[x] = Math.max(1, num(d.skills[x]));
          else if (c.kind === 'save') d.saves[x] = true;
          else if (c.kind === 'resist') { const cur = String(d.defesas.resist || '').split(/\s*,\s*/).filter(Boolean); if (!cur.includes(x)) cur.push(x); d.defesas.resist = cur.join(', '); }
          else if (PROF_KEY[c.kind]) addList(d, PROF_KEY[c.kind], [x]);
        }
      } else if (c.type === 'text') {
        for (const x of picks(c.key).slice(0, c.count)) {
          if (R.SKILL[x]) d.skills[x] = Math.max(1, num(d.skills[x]));
          else addList(d, PROF_KEY[c.kind] || 'tools', [x]);
        }
      } else if (c.type === 'expertise') {
        for (const x of picks(c.key).slice(0, c.count)) d.skills[x] = 2;
      } else if (c.type === 'ability') abilityBonus(c.blocks, v, addAb);
      else if (c.type === 'asi') {
        if (v.mode === 'feat' && v.feat) featIds.push({ id: v.feat, key: c.key });
        else abilityBonus(ASI_BLOCKS, v, addAb);
      } else if (c.type === 'feat') { for (const id of picks(c.key).slice(0, c.count)) featIds.push({ id, key: c.key + ':' + id }); }
      else if (c.type === 'option') {
        for (const id of picks(c.key).slice(0, c.count)) {
          const o = byId('options', id);
          if (o && !d.caract.some((f) => f.ref === o.id)) d.caract.push({ id: U.uid('ft_'), source: c.source === (sub && sub.name) ? 'Subclasse' : 'Classe', name: o.name, level: c.level, text: o.description || '', ref: o.id, gen: 'option' });
        }
      } else if (c.type === 'spell') {
        for (const id of picks(c.key).slice(0, c.count)) spellsToAdd.push({ id, from: c.source.replace(/^Talento: /, ''), always: true });
      }
    }
    // Talentos: entram em Talentos, com os benefícios fixos
    for (const f of featIds) {
      const r = byId('feats', f.id);
      if (!r) continue;
      if (!d.talentos.some((t) => t.ref === r.id && t.gen === f.key)) d.talentos.push({ id: U.uid('tl_'), ref: r.id, name: f.name || r.name, source: r.source, text: r.description || '', gen: f.key });
      fixedBenefits(r.benefits, r.name, 'ft:' + f.key, f.pre);
      if (st.mode === 'new' || lvNew(num((all.find((c) => c.key === f.key) || {}).level))) d.hp.perLevel = num(d.hp.perLevel) + perLevelOf(r.description || '');
    }
    // Atributos: base + bônus (até 20, ou o máximo do bônus)
    if (st.mode === 'new') for (const k of R.AB) d.abil[k] = Math.min(Math.max(caps[k] || 20, num(st.base[k], 10)), num(st.base[k], 10) + (bonus[k] || 0));
    else for (const k of R.AB) if (bonus[k]) d.abil[k] = Math.min(Math.max(caps[k] || 20, num(d.abil[k], 10)), num(d.abil[k], 10) + bonus[k]);
    // Magias: as fixas e as escolhidas (sempre preparadas) + as da classe
    const addSp = (id, from, always, prepared, cls2) => {
      const r = byId('spells', id);
      if (!r) return;
      const ex = d.magia.list.find((s) => s.ref === id);
      if (ex) { if (always) { ex.always = true; ex.from = ex.from || from; } return; }
      F5.addSpell(d, r, always ? from : '', cls2 || '');
      const row = d.magia.list.find((s) => s.ref === id);
      if (row) { row.prepared = !!prepared || !!always; row.gen = 'assist'; }
    };
    for (const s of spellsToAdd) addSp(s.id, s.from, true, false, s.cls);
    const cn = cls ? cls.name : '';
    for (const id of st.spells.cantrips) addSp(id, '', false, true, cn);
    for (const id of st.spells.list) addSp(id, '', false, true, cn);
    // Características até o nível (sem repetir)
    F5.syncFeatures(d);
    // Equipamento inicial (só ao criar)
    if (st.mode === 'new') equipInto(d);
    d.criacao = { edicao: st.edicao, metodo: st.method, base: clone(st.base), nivel: st.level, em: Date.now() };
    return d;
  }

  // ---------- Equipamento inicial ----------
  function equipGroups() {
    const cls = byId('classes', A5.st.classId), bg = byId('backgrounds', A5.st.bgId);
    return [['cls', cls], ['bg', bg]].filter((x) => x[1]).flatMap(([who, rec]) => (rec.equipment || []).map((g, i) => ({ key: who + i, who: rec.name, opts: g.options || [] })));
  }
  // Item "à escolha" do pacote: armas pela categoria; ferramentas, instrumentos e focos pelo texto do item
  const GENERIC = {
    weaponMartial: (it) => it.weapon && it.weapon.category === 'martial',
    weaponSimple: (it) => it.weapon && it.weapon.category === 'simple',
    weaponMartialMelee: (it) => it.weapon && it.weapon.category === 'martial' && it.weapon.kind !== 'ranged',
    weaponSimpleMelee: (it) => it.weapon && it.weapon.category === 'simple' && it.weapon.kind !== 'ranged',
    setGaming: (it) => /gaming set/i.test(it.description || ''),
    toolArtisan: (it) => it.category === 'Tool' && /artisan|• craft:/i.test(it.description || ''),
    instrumentMusical: (it) => it.category === 'Instrument' || /musical instrument/i.test(it.description || ''),
    focusSpellcastingHoly: (it) => it.category === 'Spellcasting Focus' && /holy symbol/i.test(it.description || ''),
    focusSpellcastingArcane: (it) => it.category === 'Spellcasting Focus' && /arcane focus/i.test(it.description || ''),
    focusSpellcastingDruidic: (it) => it.category === 'Spellcasting Focus' && /druidic focus/i.test(it.description || ''),
  };
  // Alguns itens vêm sem edição no cadastro: o livro decide (XPHB = 2024)
  const itemEd = (it) => it.edition || (/^X/.test(it.source || '') ? '2024' : '2014');
  const genericItems = (type) => (X.items || []).filter((it) => it.kind !== 'family' && it.kind !== 'group' && !it.magic && itemEd(it) === A5.st.edicao && (GENERIC[type] || (() => false))(it));
  function equipInto(d) {
    const st = A5.st, F5 = App.Ficha5e;
    for (const g of equipGroups()) {
      const lab = st.equip[g.key] || (g.opts[0] && g.opts[0].label);
      const o = g.opts.find((x) => x.label === lab) || g.opts[0];
      if (!o) continue;
      (o.items || []).forEach((it, j) => {
        if (it.gold) { d.moedas.gp = num(d.moedas.gp) + Math.floor(num(it.gold) / 100); d.moedas.cp = num(d.moedas.cp) + num(it.gold) % 100; return; }
        if (it.contains) { d.moedas.gp = num(d.moedas.gp) + Math.floor(num(it.contains) / 100); }
        const id = it.item || (it.type ? st.equip[g.key + ':' + j] : null);
        const r = id ? byId('items', id) : null;
        if (r) {
          const qty = num(it.qty, 1);
          F5.addItem(d, r);
          const row = d.itens[d.itens.length - 1]; row.qty = qty;
        } else if (it.name && !it.type) d.itens.push({ id: U.uid('it_'), name: it.name, qty: num(it.qty, 1), weight: 0, category: '', equipped: false, attuned: false, attune: false, armor: null, text: '' });
      });
    }
  }

  // ---------- Estado inicial ----------
  function fresh(actor) {
    const d = actor && actor.dnd5e ? R.norm(clone(actor.dnd5e)) : null;
    const c0 = d && d.classes[0];
    const up = !!(c0 && c0.ref && byId('classes', c0.ref));
    // Nível do personagem = soma das classes (multiclasse)
    const from = up ? Math.max(1, d.classes.reduce((t, x) => t + num(x.level, 0), 0)) : 0;
    return {
      mode: up ? 'up' : 'new', fromLevel: from, level: up ? Math.min(20, from + 1) : 1,
      edicao: (d && d.edicao) || '2024', name: actor ? actor.name : '',
      method: up ? 'manual' : 'standard', base: up ? clone(d.abil) : { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      std: {}, pb: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, manual: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, rolls: [null, null, null, null, null, null], rollAssign: {},
      hpMethod: 'avg', hpRolls: {},
      classId: up ? c0.ref : null, subId: up && c0.sub ? c0.sub.ref : null,
      speciesId: d && d.especie ? d.especie.ref : null, speciesOpt: d && d.especie ? d.especie.option || '' : '', size: '',
      bgId: d && d.antecedente ? d.antecedente.ref : null, bgFreeAbility: false, bgFreeFeat: false,
      ch: {}, spells: { cantrips: [], list: [] }, equip: {}, base0: d, tab: up ? 'classe' : 'regras', ci: 0,
    };
  }
  // Valores base pelo método
  function baseScores() {
    if (A5.st.mode === 'up') return A5.st.base;
    return Object.fromEntries(R.AB.map((k) => { const v = chosen(k); return [k, v == null ? 10 : v]; }));
  }

  // ---------- Avisos ----------
  function casterInfo() {
    const st = A5.st, cls = byId('classes', st.classId), sub = byId('subclasses', st.subId);
    if (!cls) return null;
    const src = cls.spellcasting ? cls : sub && sub.spellcasting ? sub : null;
    if (!src) return null;
    const P = src.progression || {}, L = clsTo(), LF = clsFrom();
    const slots = (P.slots || [])[L - 1] || [];
    let max = 0;
    slots.forEach((n, i) => { if (num(n) > 0) max = i + 1; });
    if (P.pact && P.pact.level) max = Math.max(max, num(P.pact.level[L - 1]));
    return {
      name: src === cls ? cls.name : sub.name, cls: cls.name, sub: sub ? sub.shortName || sub.name : '', mode: src.spellcasting.mode, ability: src.spellcasting.ability,
      cantrips: P.cantrips ? num(P.cantrips[L - 1]) : 0, prepared: P.prepared ? num(P.prepared[L - 1]) : 0, max,
      cantripsBefore: P.cantrips && LF ? num(P.cantrips[LF - 1]) : 0, preparedBefore: P.prepared && LF ? num(P.prepared[LF - 1]) : 0,
    };
  }
  const haveSpells = () => {
    const st = A5.st, cls = byId('classes', st.classId);
    if (st.mode !== 'up' || !target() || !cls) return [];
    return (st.base0.magia.list || []).filter((sp) => !sp.always && (sp.cls === cls.name || (!sp.cls && st.ci === 0)));
  };
  const inList = (sp, ci) => (sp.classes || []).includes(ci.cls) || (sp.classesExpanded || []).includes(ci.cls) || (ci.sub && (sp.subclasses || []).some((s) => s === ci.cls + ': ' + ci.sub));
  function warnings() {
    const st = A5.st, w = {};
    const add = (tab, m) => { (w[tab] = w[tab] || []).push(m); };
    const cls = byId('classes', st.classId);
    if (!cls) add('classe', 'Escolha a classe.');
    else if (cls.subclassLevels && cls.subclassLevels.length && clsTo() >= cls.subclassLevels[0] && !st.subId) add('classe', 'No nível ' + cls.subclassLevels[0] + ' de ' + cls.name + ' a classe pede a subclasse.');
    // Requisito da multiclasse (só avisa): a classe nova; na regra de 2014, também as que o personagem já tem
    if (cls && st.mode === 'up' && !target()) {
      const ab = st.base0.abil || {};
      if (!reqOk(cls, ab)) add('classe', 'Multiclasse em ' + cls.name + ' pede ' + reqTxt(cls) + '.');
      if (((cls.multiclass || {}).rule || '') !== '2024') for (const x of st.base0.classes || []) { const r = byId('classes', x.ref); if (r && !reqOk(r, ab)) add('classe', 'Na regra de 2014, sair de ' + r.name + ' pede ' + reqTxt(r) + '.'); }
    }
    if (st.mode === 'new') {
      if (!st.speciesId) add('especie', 'Escolha a espécie.');
      if (!st.bgId) add('antecedente', 'Escolha o antecedente.');
      const bg = byId('backgrounds', st.bgId);
      if (bg && st.bgFreeFeat) (bg.feats || []).forEach((f, i) => { if (f.feat && !st.ch['bgft:' + i]) add('antecedente', 'Escolha o Talento de Origem livre.'); });
      if (st.method === 'pointbuy' && pbSpent(st) > 27) add('atributos', 'Compra de pontos: ' + pbSpent(st) + ' de 27 pontos.');
      const empty = R.AB.filter((k) => chosen(k) == null);
      if (st.method === 'roll' && st.rolls.some((r) => !r)) add('atributos', 'Role os atributos (Rolar tudo).');
      if (empty.length && (st.method === 'standard' || st.method === 'roll')) add('atributos', 'Falta o valor de: ' + empty.map((k) => R.AB_PT[k]).join(', ') + '.');
    }
    for (const c of needs()) if (!done(c)) add(c.tab, (c.level ? 'Nível ' + c.level + ' · ' : 'Origem · ') + c.label + ' (' + c.source + ')');
    // Talentos: pré-requisitos de nível e atributo
    const preview = previewSheet();
    for (const t of preview.d.talentos) {
      const r = byId('feats', t.ref);
      if (!r || !(r.prerequisites || []).length) continue;
      const okRow = r.prerequisites.some((row) => row.every((p) => p.type === 'level' ? st.level >= num(p.value != null ? p.value : p.level) : p.type === 'ability' ? (p.abilities || []).some((k) => num(preview.d.abil[k]) >= num(p.min)) : true));
      if (!okRow) add('escolhas', 'Pré-requisito de ' + r.name + ' não atendido.');
    }
    const ci = casterInfo();
    if (ci) {
      const nC = st.spells.cantrips.length + haveSpells().filter((s) => s.level === 0).length;
      const nP = st.spells.list.length + haveSpells().filter((s) => s.level > 0).length;
      if (ci.cantrips && nC !== ci.cantrips) add('magias', 'Truques: ' + nC + ' de ' + ci.cantrips + '.');
      if (ci.prepared && nP !== ci.prepared) add('magias', (ci.mode === 'known' ? 'Magias conhecidas' : 'Magias preparadas') + ': ' + nP + ' de ' + ci.prepared + '.');
    }
    if (st.mode === 'new') for (const g of equipGroups()) {
      const lab = st.equip[g.key] || (g.opts[0] && g.opts[0].label), o = g.opts.find((x) => x.label === lab) || g.opts[0];
      (o ? o.items : []).forEach((it, j) => { if (it.type && !st.equip[g.key + ':' + j]) add('equip', 'Escolha: ' + typeLabel(it.type) + ' (' + g.who + ').'); });
    }
    return w;
  }
  const typeLabel = (t) => ({ weaponMartial: 'arma marcial', weaponSimple: 'arma simples', weaponMartialMelee: 'arma marcial corpo a corpo', weaponSimpleMelee: 'arma simples corpo a corpo', focusSpellcastingArcane: 'foco arcano', focusSpellcastingHoly: 'símbolo sagrado', focusSpellcastingDruidic: 'foco druídico', instrumentMusical: 'instrumento musical', toolArtisan: 'ferramenta de artesão', setGaming: 'jogo' }[t] || t);

  let previewCache = null;
  function previewSheet() {
    if (previewCache) return previewCache;
    const st = A5.st;
    if (st.mode === 'new') st.base = Object.assign({}, st.base, baseScores());
    const d = build(st.base0);
    const a = { name: st.name || 'Personagem', bars: st.mode === 'up' && A5.actor ? clone(A5.actor.bars || []) : [], dnd5e: d };
    R.apply(a);
    previewCache = { a, d, c: R.calc(a) };
    return previewCache;
  }

  // ---------- Janela ----------
  A5.open = async function (opts) {
    opts = opts || {};
    const back = h('div', { class: 'modal-back a5-back' });
    const box = h('div', { class: 'modal a5' }, h('div', { class: 'win-head' }, ic('wand'), h('span', { class: 'win-title' }, 'Assistente de personagem'), iconBtn('x', 'Fechar', () => close())),
      h('div', { class: 'win-body' }, h('p', { class: 'muted' }, 'Abrindo os cadastros…')));
    back.append(box);
    document.body.append(back);
    let cancelled = false;
    function close() {
      cancelled = true;
      if (A5.cur?.back === back) {
        if (A5.cur.steps) void unmount(A5.cur.steps);
        A5.cur = null;
      }
      back.remove();
    }
    try { await loadAll(false); } catch (e) { box.querySelector('.win-body').textContent = 'Não consegui abrir os cadastros: ' + e.message; return; }
    if (cancelled) return;
    A5.actor = opts.actor || null;
    A5.st = fresh(opts.actor);
    A5.sourceFilters = {};
    A5.spellSources = {};
    A5.onDone = opts.onDone;
    A5.cur = { back, box, close };
    render();
  };
  A5.close = () => { if (A5.cur) A5.cur.close(); };
  function set(fn, keepScroll = true) { fn(A5.st); previewCache = null; render(keepScroll); }
  A5.set = set;

  function render(keepScroll) {
    if (!A5.cur) return;
    const st = A5.st, box = A5.cur.box;
    const old = box.querySelector('.a5-pane'), scroll = keepScroll && old ? old.scrollTop : 0;
    const act = document.activeElement, fkey = act && act.dataset && act.dataset.f;
    previewCache = null;
    const W = warnings();
    const steps = STEPS.filter(([id]) => !(st.mode === 'up' && (id === 'especie' || id === 'antecedente' || id === 'equip')) && !(id === 'magias' && !casterInfo() && !needs().some((c) => c.type === 'spell')));
    if (!steps.some((s) => s[0] === st.tab)) st.tab = steps[0][0];
    const body = h('div', { class: 'win-body a5-body' });
    if (A5.cur.steps) void unmount(A5.cur.steps);
    const stepIcons = steps.map(([id, icon, label]) => ({
      id, label, icon: App.Icons.svg(icon), warn: !!W[id],
      status: id === 'resumo' ? '' : W[id] ? App.Icons.svg('triangle-alert', 'a5-w') : App.Icons.svg('check', 'a5-ok'),
    }));
    A5.cur.steps = flushSync(() => mount(AssistantSteps, { target: body, props: {
      steps: stepIcons, selected: st.tab, onselect: (id) => set((s) => { s.tab = id; }, false),
    } }));
    const pane = h('div', { class: 'a5-pane' });
    const T = { regras: tabRegras, classe: tabClasse, especie: tabEspecie, antecedente: tabAntecedente, atributos: tabAtributos, escolhas: tabEscolhas, magias: tabMagias, equip: tabEquip, resumo: tabResumo }[st.tab];
    T(pane, W);
    if (W[st.tab] && st.tab !== 'resumo') pane.prepend(h('div', { class: 'a5-warns' }, ic('triangle-alert'), h('div', {}, W[st.tab].map((m) => h('div', {}, m)))));
    put(body, pane);
    const i = steps.findIndex((s) => s[0] === st.tab);
    const foot = h('div', { class: 'a5-foot' },
      h('span', { class: 'muted small-text grow' }, st.mode === 'up' ? 'Subir de nível: ' + st.fromLevel + ' → ' + st.level + (byId('classes', st.classId) ? ' · ' + byId('classes', st.classId).name + ' ' + clsFrom() + ' → ' + clsTo() : ' · escolha a classe') : 'Nova ficha · nível ' + st.level),
      btnI('chevron-left', 'Anterior', { disabled: i <= 0, 'data-act': 'prev', onclick: () => set((s) => { s.tab = steps[i - 1][0]; }, false) }),
      i < steps.length - 1 ? btnI('chevron-right', 'Próximo', { 'data-act': 'next', onclick: () => set((s) => { s.tab = steps[i + 1][0]; }, false) }) : null,
      h('button', { class: 'btn small primary', 'data-act': 'finish', onclick: finish }, ic('check'), st.mode === 'up' ? 'Aplicar' : 'Criar ficha'));
    const winBody = box.querySelector('.win-body');
    winBody.replaceWith(body);
    box.querySelector('.a5-foot') && box.querySelector('.a5-foot').remove();
    box.append(foot);
    pane.scrollTop = scroll;
    if (fkey) { const el = box.querySelector('[data-f="' + fkey + '"]'); if (el) el.focus({ preventScroll: true }); }
  }
  A5.render = render;

  async function finish() {
    const W = warnings();
    const all = Object.entries(W).filter(([k]) => k !== 'resumo').flatMap(([, v]) => v);
    if (all.length && !confirm('Ainda há ' + all.length + ' aviso(s):\n\n' + all.slice(0, 12).join('\n') + (all.length > 12 ? '\n…' : '') + '\n\nContinuar mesmo assim?')) return;
    if (A5.st.mode === 'new') { try { await loadAll(true); } catch { /* sem itens: segue sem o equipamento */ } }
    previewCache = null;
    const st = A5.st;
    if (st.mode === 'new') st.base = Object.assign({}, st.base, baseScores());
    const d = build(st.base0);
    const cb = A5.onDone, name = st.name;
    A5.close();
    if (cb) cb({ d, name, mode: st.mode });
  }

  // ---------- Pedaços ----------
  const field = (label, el, attrs = {}) => h('label', Object.assign({ class: 'f5-f' }, attrs), h('span', {}, label), el);
  const sel = (v, opts, onset, attrs = {}) => h('select', Object.assign({ value: v == null ? '' : String(v), onchange: (e) => onset(e.target.value) }, attrs), (Array.isArray(opts) ? opts : Object.entries(opts).map(([k, l]) => ({ v: k, label: l }))).map((o) => h('option', { value: o.v }, o.label)));
  const sec = (title, ...body) => h('section', { class: 'f5-sec' }, h('div', { class: 'f5-sec-head' }, h('h3', {}, title)), body);
  function textView(t, max) {
    const s = String(t || '');
    const box = h('div', { class: 'f5-text' });
    for (const p of (max && s.length > max ? s.slice(0, max) + '…' : s).split(/\n{2,}/)) if (p.trim()) box.append(/^\|/.test(p.trim()) ? h('pre', { class: 'f5-tbl' }, p.trim()) : h('p', {}, p.trim()));
    return box;
  }
  // Lista com busca (classe, espécie, antecedente): só a lista redesenha ao digitar
  function recordList(tab, current, filter, onPick, sub) {
    const st = A5.st;
    const wrap = h('div', { class: 'a5-list' });
    let q = (A5.q && A5.q[tab]) || '', edOnly = !(A5.edAll && A5.edAll[tab]);
    const list = h('div', { class: 'a5-list-items' });
    const candidates = () => X[tab].filter((r) => (!edOnly || !r.edition || r.edition === st.edicao) && (!filter || filter(r)));
    const changeEdition = (checked) => {
      edOnly = checked;
      (A5.edAll = A5.edAll || {})[tab] = !edOnly;
      if (tab === 'classes') {
        const selected = byId('subclasses', st.subId);
        if (edOnly && selected?.edition && selected.edition !== st.edicao) st.subId = null;
        render(true);
        A5.cur?.box.querySelector('.a5-list .f5-source-filter > button')?.click();
      } else { sources.refresh(); fill(); }
    };
    const editionControl = () => h('label', { class: 'check-row small-text', 'data-edition-filter': tab },
      h('input', { type: 'checkbox', checked: edOnly, onchange: (e) => changeEdition(e.target.checked) }), 'Só da edição ' + editionName(st.edicao));
    const sources = D5.sourceControl(candidates, (A5.sourceFilters || {})[tab], (value) => { (A5.sourceFilters = A5.sourceFilters || {})[tab] = value; fill(); }, { top: editionControl });
    const fill = () => {
      list.innerHTML = '';
      const words = U.slug(q).split(/[_-]+/).filter(Boolean);
      const L = candidates().filter((r) => sources.matches(r) && (!words.length || words.every((w) => U.slug(r.name + ' ' + (r.source || '')).includes(w))))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const r of L.slice(0, 300)) list.append(h('button', { class: 'a5-item' + (r.id === current ? ' on' : ''), 'data-id': r.id, onclick: () => onPick(r) }, h('b', {}, r.name), h('small', {}, sub ? sub(r) : [editionName(r.edition), D5.srcName(r.source)].filter(Boolean).join(' · '))));
      if (!L.length) list.append(h('p', { class: 'empty' }, 'Nada encontrado.'));
    };
    put(wrap, h('div', { class: 'a5-search-row' }, h('div', { class: 'search-box' }, ic('search'), h('input', { placeholder: 'Buscar…', value: q, 'data-f': 'a5-q-' + tab, oninput: (e) => { q = e.target.value; (A5.q = A5.q || {})[tab] = q; fill(); } })), sources.element), list);
    fill();
    setTimeout(() => { const on = list.querySelector('.a5-item.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); }, 0);
    return wrap;
  }
  const profTxt = (list) => (list || []).map((p) => (KIND_PT[p.kind] || p.kind) + ': ' + [].concat(p.fixed || []).join(', ') + (p.choose ? (p.fixed ? '; ' : '') + p.choose.count + ' entre ' + p.choose.from.join(', ') : '') + (p.any ? ' ' + Object.entries(p.any).map(([k, n]) => n + ' à escolha').join(', ') : ''));

  // ---------- Abas ----------
  function tabRegras(pane) {
    const st = A5.st, up = st.mode === 'up';
    const lvOpts = []; for (let L = up ? st.fromLevel + 1 : 1; L <= 20; L++) lvOpts.push({ v: String(L), label: 'Nível ' + L });
    put(pane, sec(up ? 'Subir de nível' : 'Regras',
      up ? h('p', { class: 'hint' }, 'A ficha está no nível ' + st.fromLevel + '. Os níveis novos vão para a classe escolhida na etapa Classe (uma das que a ficha tem, ou uma nova). O assistente mostra só o que eles pedem; o resto da ficha (PV atual, itens, moedas, biografia) fica como está.') : null,
      h('div', { class: 'f5-grid3' },
        !up ? field('Nome do personagem', h('input', { value: st.name, 'data-f': 'a5-name', placeholder: 'Novo personagem', onchange: (e) => set((s) => { s.name = e.target.value.trim(); }) })) : null,
        field('Edição', sel(st.edicao, { 2024: editionName('2024'), 2014: editionName('2014') }, (v) => set((s) => { s.edicao = v; if (!up) { s.classId = s.subId = s.speciesId = s.bgId = null; s.bgFreeAbility = s.bgFreeFeat = false; s.ch = {}; s.spells = { cantrips: [], list: [] }; } }), { disabled: up, 'data-f': 'a5-ed' })),
        field(up ? 'Subir até o nível' : 'Nível', sel(st.level, lvOpts, (v) => set((s) => { s.level = num(v, 1); }), { 'data-f': 'a5-level' })),
        field('Pontos de vida', sel(st.hpMethod, { avg: 'Média (arredondada para cima)', roll: 'Rolar o dado de vida' }, (v) => set((s) => { s.hpMethod = v; }), { 'data-f': 'a5-hp' })))));
  }
  function hpRolls() {
    const st = A5.st, cls = byId('classes', st.classId);
    if (!cls) return h('p', { class: 'hint' }, 'Escolha a classe para rolar os PV.');
    const firstCls = st.mode === 'new' || st.ci === 0;
    const first = Math.max(firstCls ? 2 : 1, clsFrom() + 1);
    if (clsTo() < first) return h('p', { class: 'hint' }, 'No 1º nível o PV é o dado cheio.');
    const levels = []; for (let L = first; L <= clsTo(); L++) levels.push(L);
    return h('div', { class: 'a5-hprolls' }, h('small', { class: 'muted' }, 'd' + cls.hd + ' por nível (vazio = média ' + (cls.hd / 2 + 1) + ')'),
      levels.map((L) => field(cls.name + ' ' + L, h('input', { class: 'num', type: 'number', min: 1, max: cls.hd, value: st.hpRolls[L] || '', 'data-f': 'a5-hpr-' + L, onchange: (e) => set((s) => { s.hpRolls[L] = Math.max(0, Math.min(cls.hd, num(e.target.value))); }) }))),
      btnI('dices', 'Rolar os que faltam', { 'data-act': 'roll-hp', onclick: () => set((s) => { for (const L of levels) if (!s.hpRolls[L]) s.hpRolls[L] = 1 + Math.floor(Math.random() * cls.hd); }) }));
  }
  function tabClasse(pane) {
    const st = A5.st, cls = byId('classes', st.classId), up = st.mode === 'up';
    const CL = clsTo(), CF = clsFrom();
    const n = st.level - st.fromLevel;
    const pickTarget = (ci, classId, subId) => set((s2) => { s2.ci = ci; s2.classId = classId; s2.subId = subId || null; s2.ch = {}; s2.spells = { cantrips: [], list: [] }; s2.hpRolls = {}; });
    const nNew = (st.base0 && st.base0.classes || []).length;
    const left = up ? h('div', { class: 'a5-which' },
      h('h4', {}, 'Em qual classe?'),
      h('div', { class: 'a5-which-list' },
        (st.base0.classes || []).map((x, i) => h('button', { class: 'a5-item' + (st.ci === i ? ' on' : ''), 'data-up': i, onclick: () => pickTarget(i, x.ref, x.sub ? x.sub.ref : null) },
          h('b', {}, x.name), h('small', {}, 'nível ' + x.level + ' → ' + (num(x.level) + n) + (x.sub ? ' · ' + (x.sub.shortName || x.sub.name) : '')))),
        h('button', { class: 'a5-item' + (st.ci === nNew ? ' on' : ''), 'data-up': 'nova', onclick: () => pickTarget(nNew, null, null) }, h('b', {}, '+ Classe nova (multiclasse)'), h('small', {}, 'nível 1' + (n > 1 ? ' → ' + n : '')))),
      st.ci === nNew ? recordList('classes', st.classId, (r) => !(st.base0.classes || []).some((x) => x.ref === r.id), (r) => set((s2) => { s2.classId = r.id; s2.subId = null; s2.ch = {}; s2.spells = { cantrips: [], list: [] }; }),
        (r) => [reqOk(r, st.base0.abil || {}) ? '' : 'pede ' + reqTxt(r), 'd' + r.hd, editionName(r.edition)].filter(Boolean).join(' · ')) : null) :
      recordList('classes', st.classId, null, (r) => set((s) => { s.classId = r.id; s.subId = null; s.ch = {}; s.spells = { cantrips: [], list: [] }; s.equip = {}; }), (r) => ['d' + r.hd, editionName(r.edition), D5.srcName(r.source)].filter(Boolean).join(' · '));
    const right = h('div', { class: 'a5-detail' });
    if (cls) {
      const subAt = (cls.subclassLevels || [])[0];
      put(right, h('h3', { class: 'a5-title' }, cls.name, h('small', { class: 'muted' }, ' ' + editionName(cls.edition) + ' · ' + D5.srcName(cls.source))),
        h('div', { class: 'f5-kv' }, h('span', {}, h('small', {}, 'Dado de vida'), 'd' + cls.hd), h('span', {}, h('small', {}, 'Salvaguardas'), (cls.saves || []).map((k) => R.AB_PT[k]).join(', ')),
          cls.spellcasting ? h('span', {}, h('small', {}, 'Conjuração'), R.AB_PT[cls.spellcasting.ability] + ' · ' + cls.spellcasting.progression) : null),
        up && !target() ? h('div', { class: 'a5-profs' }, h('div', {}, 'Multiclasse: ' + (reqTxt(cls) ? 'pede ' + reqTxt(cls) : 'sem requisito') + '.'), profTxt((cls.multiclass || {}).proficiencies).map((t) => h('div', {}, 'Ganha · ' + t)), h('div', {}, 'Sem salvaguardas nem equipamento inicial.'))
          : h('div', { class: 'a5-profs' }, profTxt(cls.proficiencies).map((t) => h('div', {}, t))));
      if (subAt) {
        const subs = X.subclasses.filter((s) => s.classId === cls.id);
        const visibleSubs = () => subs.filter((s) => A5.edAll?.classes || !s.edition || s.edition === st.edicao);
        const subName = (s) => visibleSubs().some((other) => other !== s && other.name === s.name && other.edition !== s.edition)
          ? s.name + ' (' + D5.editionShort(s.edition) + ')' : s.name;
        const subList = h('div', { class: 'a5-subs' });
        const fillSubs = () => {
          subList.replaceChildren(...visibleSubs().sort((a, b) => a.name.localeCompare(b.name)).map((s) => h('button', {
            class: 'chip' + (st.subId === s.id ? ' on' : ''), 'data-sub': s.id,
            title: D5.srcName(s.source) + (s.copyOf ? ' · do livro de ' + editionName('2014') : ''),
            onclick: () => set((x) => { x.subId = s.id; }),
          }, subName(s))));
        };
        fillSubs();
        put(right, h('h4', { class: 'a5-subtitle' }, (cls.subclassTitle || 'Subclasse') + ' (nível ' + subAt + ')'),
          CL < subAt ? h('p', { class: 'hint' }, 'Escolhida no nível ' + subAt + ' de ' + cls.name + '.') :
            up && st.subId && CF >= subAt ? h('p', {}, h('b', {}, (byId('subclasses', st.subId) || {}).name || '')) :
              subList);
        const sub = byId('subclasses', st.subId);
        if (sub) put(right, h('div', { class: 'a5-feats' }, (sub.features || []).filter((f) => num(f.level) <= CL).map((f) => h('details', {}, h('summary', {}, f.name + ' · nível ' + f.level), textView(f.text, 1500)))));
      }
      put(right, h('h4', {}, 'Características de ' + cls.name + ' até o nível ' + CL),
        h('div', { class: 'a5-feats' }, (cls.features || []).filter((f) => num(f.level) <= CL).map((f) => h('details', { class: num(f.level) > CF && up ? 'new' : '' }, h('summary', {}, f.name + ' · nível ' + f.level + (num(f.level) > CF && up ? ' · novo' : '')), textView(f.text, 1500)))));
    } else put(right, h('p', { class: 'empty' }, 'Escolha uma classe na lista.'));
    put(pane, h('div', { class: 'a5-split' }, left, right));
  }
  function tabEspecie(pane) {
    const st = A5.st, sp = byId('species', st.speciesId);
    const right = h('div', { class: 'a5-detail' });
    if (sp) {
      const sizes = sp.size || [];
      put(right, h('h3', { class: 'a5-title' }, sp.name, h('small', { class: 'muted' }, ' ' + editionName(sp.edition) + ' · ' + D5.srcName(sp.source))),
        (sp.options || []).length ? field(st.edicao === '2014' ? 'Sub-raça' : 'Linhagem', sel(st.speciesOpt, [{ v: '', label: 'Nenhuma' }].concat(sp.options.map((o) => ({ v: o.name, label: o.name }))), (v) => set((s) => { s.speciesOpt = v; for (const k of Object.keys(s.ch)) if (/^sp(:|ft)/.test(k)) delete s.ch[k]; }), { 'data-f': 'a5-spopt' })) : null,
        sizes.length > 1 ? field('Tamanho', sel(st.size || sizes[sizes.length - 1], sizes.map((x) => ({ v: x, label: R.SIZES[x] || x })), (v) => set((s) => { s.size = v; }), { 'data-f': 'a5-size' })) : null,
        h('div', { class: 'f5-kv' }, h('span', {}, h('small', {}, 'Tamanho'), sizes.map((x) => R.SIZES[x] || x).join(' ou ')),
          h('span', {}, h('small', {}, 'Deslocamento'), Object.entries(sp.speed || {}).filter(([, v]) => num(v)).map(([k, v]) => (R.SPEEDS[k] || k) + ' ' + (App.Units ? App.Units.dist(num(v)) : v + ' m')).join(', '))),
        h('div', { class: 'a5-feats' }, (sp.traits || []).concat(((sp.options || []).find((o) => o.name === st.speciesOpt) || {}).traits || []).map((t) => h('details', {}, h('summary', {}, t.name), textView(t.text, 1500)))));
    } else put(right, h('p', { class: 'empty' }, 'Escolha uma espécie na lista.'));
    put(pane, h('div', { class: 'a5-split' }, recordList('species', st.speciesId, null, (r) => set((s) => { s.speciesId = r.id; s.speciesOpt = ''; s.size = ''; for (const k of Object.keys(s.ch)) if (/^sp(:|ft)/.test(k)) delete s.ch[k]; })), right));
  }
  function tabAntecedente(pane) {
    const st = A5.st, bg = byId('backgrounds', st.bgId);
    const right = h('div', { class: 'a5-detail' });
    if (bg) {
      put(right, h('h3', { class: 'a5-title' }, bg.name, h('small', { class: 'muted' }, ' ' + editionName(bg.edition) + ' · ' + D5.srcName(bg.source))),
        h('div', { class: 'a5-profs' }, profTxt((bg.benefits || {}).proficiencies).map((t) => h('div', {}, t)),
          (bg.feats || []).length ? h('div', {}, 'Talento: ' + bg.feats.map((f, i) => {
            if (!st.bgFreeFeat) return f.name + (f.choice ? ' (' + f.choice + ')' : '');
            const chosen = byId('feats', st.ch['bgft:' + i]);
            return chosen ? chosen.name : 'pendente';
          }).join(', ')) : null,
          (bg.benefits && bg.benefits.ability || []).length ? h('div', {}, 'Atributos: ' + (st.bgFreeAbility ? R.AB : ((bg.benefits.ability[0].weighted || {}).from || [])).map((k) => R.AB_PT[k]).join(', ') + ' (escolha na aba Atributos)') : null),
        bg.feature ? h('details', { open: true }, h('summary', {}, bg.feature.name), textView(bg.feature.text, 1500)) : null);
      if (bg.edition === '2024') put(right, h('div', { class: 'a5-bg-free' },
        (bg.benefits?.ability || []).length ? h('label', { class: 'check-row' }, h('input', { type: 'checkbox', checked: st.bgFreeAbility, 'data-f': 'a5-bg-free-ability', onchange: (e) => set((s) => { s.bgFreeAbility = e.target.checked; delete s.ch['bg:ab']; }) }), 'Atributos livres para os bônus do antecedente') : null,
        (bg.feats || []).some((f) => f.feat) ? h('label', { class: 'check-row' }, h('input', { type: 'checkbox', checked: st.bgFreeFeat, 'data-f': 'a5-bg-free-feat', onchange: (e) => set((s) => { s.bgFreeFeat = e.target.checked; for (const k of Object.keys(s.ch)) if (/^(bgft:|ft:bgft:)/.test(k)) delete s.ch[k]; }) }), 'Talento de Origem livre') : null,
        st.bgFreeFeat ? (bg.feats || []).map((f, i) => {
          if (!f.feat) return null;
          const chosen = byId('feats', st.ch['bgft:' + i]);
          return h('div', { class: 'row wrap' }, h('span', {}, chosen ? chosen.name : 'Escolha um Talento de Origem'),
            btnI('library', chosen ? 'Trocar talento' : 'Escolher talento', { 'data-bg-feat': i, onclick: () => App.Ficha5e.pick('feats', { edition: '2024', filter: (r) => r.category === 'Origin', title: 'Talento de Origem' }, (r) => set((s) => {
              s.ch['bgft:' + i] = r.id;
              for (const k of Object.keys(s.ch)) if (k.startsWith('ft:bgft:' + i)) delete s.ch[k];
            })) }));
        }) : null));
      if (bg.description) put(right, h('details', { open: bg.edition === '2024' }, h('summary', {}, 'Texto do antecedente'), textView(bg.description, 3000)));
    } else put(right, h('p', { class: 'empty' }, 'Escolha um antecedente na lista.'));
    put(pane, h('div', { class: 'a5-split' }, recordList('backgrounds', st.bgId, (r) => !r.variantOf || true, (r) => set((s) => { s.bgId = r.id; s.bgFreeAbility = s.bgFreeFeat = false; s.equip = Object.fromEntries(Object.entries(s.equip).filter(([k]) => !/^bg/.test(k))); for (const k of Object.keys(s.ch)) if (/^(bg|ft:bgft)/.test(k)) delete s.ch[k]; })), right));
  }
  // ---------- Atributos (Plano 54: modelo do Roll20) ----------
  const METHOD_TABS = [['standard', 'Conjunto padrão'], ['pointbuy', 'Compra de pontos'], ['roll', 'Rolar'], ['manual', 'Digitar']];
  const METHOD_TXT = {
    standard: 'O conjunto padrão dá seis números: 8, 10, 12, 13, 14 e 15. Escolha um para cada atributo.',
    pointbuy: 'A compra de pontos dá 27 pontos para gastar nos atributos. Valores maiores custam mais: 14 custa 7 pontos e 15 custa 9. Por este método, 15 é o maior valor antes dos aumentos, e nenhum fica abaixo de 8.',
    roll: 'Role 4 dados de seis lados e descarte o menor (4d6, fica com os 3 maiores), para um total entre 3 e 18. Faça isso seis vezes e distribua os resultados entre os atributos. Pode rolar de novo.',
    manual: 'Digite o valor de cada atributo. No livro, os valores iniciais vão de 3 a 18, mas aqui é livre (por exemplo, para um inimigo forte).',
  };
  const ABIL_INFO = {
    str: 'Força mede o poder físico: erguer, empurrar, agarrar e golpear. Entra nos ataques corpo a corpo e nas armas de arremesso, e no quanto se carrega.',
    dex: 'Destreza mede agilidade, reflexos e equilíbrio. Entra na CA (sem armadura ou com armadura leve/média), na iniciativa e nos ataques à distância e com armas de acuidade.',
    con: 'Constituição mede saúde e resistência. Soma nos pontos de vida de cada nível e entra nas salvaguardas para manter a concentração.',
    int: 'Inteligência mede raciocínio, memória e estudo. É o atributo de conjuração do Wizard (e do Artificer).',
    wis: 'Sabedoria mede percepção, intuição e força de vontade. É o atributo de conjuração de Cleric, Druid e Ranger.',
    cha: 'Carisma mede presença e força de personalidade. É o atributo de conjuração de Bard, Sorcerer, Warlock e Paladin.',
  };
  const STD_ASC = STANDARD.slice().sort((x, y) => x - y);
  const roll4d6 = () => { const dice = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)); const s2 = dice.slice().sort((x, y) => y - x); return { dice, total: s2[0] + s2[1] + s2[2] }; };
  const pbSpent = (st) => R.AB.reduce((t, k) => t + (POINT_COST[num(st.pb[k], 8)] != null ? POINT_COST[num(st.pb[k], 8)] : 99), 0);
  function tabAtributos(pane) {
    const st = A5.st, up = st.mode === 'up';
    const P = previewSheet();
    if (up) return attrTable(pane, P);
    const m = st.method;
    // Abas de método
    put(pane, h('div', { class: 'a5-mtabs', role: 'tablist' }, METHOD_TABS.map(([id, label]) =>
      h('button', { class: m === id ? 'on' : '', role: 'tab', 'aria-selected': String(m === id), 'data-method': id, onclick: () => set((s) => { s.method = id; }) }, label))));
    // Coluna da esquerda: explicação, contador ou rolagens, e o aumento da origem
    const left = h('div', { class: 'a5-attr-left' }, h('div', { class: 'a5-attr-box a5-attr-txt' }, METHOD_TXT[m]));
    if (m === 'pointbuy') {
      const left27 = 27 - pbSpent(st);
      put(left, h('div', { class: 'a5-attr-box a5-pb-count' }, h('b', {}, 'Compra de pontos'), h('div', { class: 'a5-pb-num' + (left27 < 0 ? ' bad' : '') }, left27 + ' / 27'), h('small', { class: 'muted' }, left27 < 0 ? 'Passou de 27 pontos.' : 'pontos sobrando')));
      if (st.edicao === '2024') put(left, h('p', { class: 'hint' }, 'Os bônus do antecedente são distribuídos abaixo e não gastam os 27 pontos.'));
    }
    if (m === 'roll') {
      put(left, h('div', { class: 'a5-attr-box a5-rolls' },
        h('div', { class: 'a5-rolls-head' }, h('b', { class: 'grow' }, 'Rolagens'), btnI('dices', 'Rolar tudo', { 'data-act': 'roll-all', onclick: () => set((s) => { s.rolls = s.rolls.map(() => roll4d6()); }) })),
        st.rolls.map((r, i) => h('div', { class: 'a5-roll-row' },
          h('span', { class: 'muted' }, 'Rolagem ' + (i + 1)),
          r ? h('span', { class: 'a5-roll-dice' }, r.dice.slice().sort((x, y) => y - x).map((dv, j) => h(j === 3 ? 's' : 'span', {}, String(dv))), h('b', {}, '= ' + r.total)) : h('span', { class: 'grow' }),
          btnI('dices', r ? 'De novo' : 'Rolar', { 'data-roll5': i, onclick: () => set((s) => { s.rolls[i] = roll4d6(); }) })))));
    }
    const orig = needs().filter((c) => c.tab === 'atributos');
    const src = byId('backgrounds', st.bgId), spc = byId('species', st.speciesId);
    if (orig.length) put(left, h('details', { class: 'a5-attr-box a5-orig', open: true },
      h('summary', {}, h('b', {}, orig.map((c) => c.source).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')), orig.some((c) => !done(c)) ? ic('triangle-alert', 'a5-w') : ic('check', 'a5-ok')),
      (st.edicao === '2024' ? src : spc) && (st.edicao === '2024' ? src : spc).description ? h('p', { class: 'a5-orig-txt' }, String((st.edicao === '2024' ? src : spc).description).split(/\n/)[0].slice(0, 420)) : null,
      orig.map(choiceView)));
    else put(left, h('div', { class: 'a5-attr-box muted small-text' }, st.edicao === '2024' ? 'Os aumentos de atributo vêm do antecedente: escolha o antecedente para vê-los aqui.' : 'Os aumentos de atributo vêm da espécie: escolha a espécie para vê-los aqui.'));
    // Cartões
    const cards = h('div', { class: 'a5-cards' }, R.AB.map((k) => abilCard(k, P)));
    put(pane, h('div', { class: 'a5-attr' }, left, cards));
  }
  // Valor escolhido pelo método (null = ainda sem valor)
  function chosen(k) {
    const st = A5.st;
    if (st.method === 'standard') return st.std[k] != null ? st.std[k] : null;
    if (st.method === 'pointbuy') return num(st.pb[k], 8);
    if (st.method === 'roll') { const i = st.rollAssign[k]; return i != null && st.rolls[i] ? st.rolls[i].total : null; }
    return num(st.manual[k], 10);
  }
  function abilCard(k, P) {
    const st = A5.st, m = st.method;
    const v = chosen(k), fin = num(P.d.abil[k], 10), bonus = v == null ? 0 : fin - v;
    const info = A5.info && A5.info[k];
    // Valor já usado por outro atributo: clicar troca os dois (como no Roll20)
    const swap = (field, val) => set((s) => {
      const map = field === 'std' ? s.std : s.rollAssign;
      const other = R.AB.find((x) => x !== k && map[x] === val);
      const mine = map[k];
      if (mine === val) { delete map[k]; return; }
      map[k] = val;
      if (other) { if (mine != null) map[other] = mine; else delete map[other]; }
    });
    let pick;
    if (m === 'standard') pick = h('div', { class: 'a5-vals' }, STD_ASC.map((val) => {
      const owner = R.AB.find((x) => st.std[x] === val);
      return h('button', { class: (owner === k ? 'on' : owner ? 'used' : ''), title: owner && owner !== k ? 'Em ' + R.AB_PT[owner] + ': clique para trocar' : '', 'data-std': k + '=' + val, onclick: () => swap('std', val) }, String(val));
    }));
    else if (m === 'pointbuy') pick = sel(String(num(st.pb[k], 8)), [8, 9, 10, 11, 12, 13, 14, 15].map((x) => ({ v: String(x), label: x + ' (' + POINT_COST[x] + (POINT_COST[x] === 1 ? ' ponto)' : ' pontos)') })), (val) => set((s) => { s.pb[k] = num(val, 8); }), { class: 'a5-pb-sel', 'data-f': 'a5-pb-' + k, 'aria-label': R.AB_PT[k] });
    else if (m === 'roll') pick = h('div', { class: 'a5-vals' }, st.rolls.map((r, i) => {
      const owner = R.AB.find((x) => st.rollAssign[x] === i);
      return h('button', { class: (owner === k ? 'on' : owner ? 'used' : ''), disabled: !r, title: owner && owner !== k ? 'Em ' + R.AB_PT[owner] + ': clique para trocar' : 'Rolagem ' + (i + 1), 'data-rollv': k + '=' + i, onclick: () => swap('roll', i) }, r ? String(r.total) : '–');
    }));
    else pick = h('input', { class: 'a5-man', type: 'number', value: num(st.manual[k], 10), 'data-f': 'a5-man-' + k, 'aria-label': R.AB_PT[k], onchange: (e) => set((s) => { s.manual[k] = num(e.target.value, 10); }) });
    const skills = R.SKILLS.filter((x) => x[2] === k).map((x) => x[1]);
    return h('div', { class: 'a5-card' + (v == null ? ' empty' : ''), 'data-card': k },
      h('div', { class: 'a5-card-head' }, h('b', {}, R.AB_PT[k]), h('button', { class: 'a5-info' + (info ? ' on' : ''), title: 'Para que serve', 'data-info': k, onclick: () => { A5.info = Object.assign({}, A5.info, { [k]: !info }); render(true); } }, 'i')),
      info ? h('div', { class: 'a5-card-info' }, ABIL_INFO[k], skills.length ? h('div', { class: 'muted' }, 'Perícias: ' + skills.join(', ')) : h('div', { class: 'muted' }, 'Sem perícias; muito usado em salvaguardas.')) : null,
      pick,
      h('div', { class: 'a5-shield' + (v == null ? ' empty' : '') },
        v == null ? h('span', { class: 'a5-shield-warn' }, '!') : h('b', {}, sg(R.mod(fin))),
        h('small', {}, R.AB_SH[k]),
        h('span', { class: 'a5-shield-val' }, v == null ? '–' : String(fin))),
      v != null && bonus ? h('div', { class: 'a5-card-sum muted' }, v + (bonus > 0 ? ' + ' : ' − ') + Math.abs(bonus) + ' = ' + fin) : null);
  }
  // Subir de nível: os atributos atuais e os aumentos dos níveis novos
  function attrTable(pane, P) {
    const st = A5.st, b = st.base;
    const rows = R.AB.map((k) => {
      const base = num(b[k], 10), fin = num(P.d.abil[k], 10);
      return h('tr', { 'data-ab': k }, h('th', {}, R.AB_PT[k]), h('td', {}, h('b', {}, String(base))), h('td', { class: 'muted' }, fin - base ? sg(fin - base) : '—'), h('td', {}, h('b', {}, String(fin))), h('td', {}, sg(R.mod(fin))));
    });
    put(pane, sec('Atributos (atuais e com os aumentos dos níveis novos)',
      h('table', { class: 'a5-abil' }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Atual'), h('th', {}, 'Bônus'), h('th', {}, 'Total'), h('th', {}, 'Mod.'))), h('tbody', {}, rows)),
      h('p', { class: 'hint' }, 'Os bônus vêm dos aumentos de atributo e talentos escolhidos em Escolhas. O total para em 20.')));
  }
  function tabEscolhas(pane) {
    const list = needs().filter((c) => c.tab === 'escolhas');
    if (!list.length && A5.st.hpMethod !== 'roll') { put(pane, h('p', { class: 'empty' }, A5.st.mode === 'up' ? 'Os níveis novos não pedem escolhas além das magias.' : 'Nada a escolher ainda. Escolha a classe, a espécie e o antecedente.')); return; }
    if (A5.st.hpMethod === 'roll') put(pane, sec('Dados de vida', hpRolls()));
    const byLevel = {};
    for (const c of list) (byLevel[c.level] = byLevel[c.level] || []).push(c);
    for (const L of Object.keys(byLevel).map(Number).sort((a, b) => a - b)) put(pane, sec(L ? 'Nível ' + L : 'Origem', byLevel[L].map(choiceView)));
  }

  // Uma escolha
  function choiceView(c) {
    const st = A5.st, v = st.ch[c.key];
    const ok = done(c);
    const head = h('div', { class: 'a5-ch-head' }, ic(ok ? 'check' : 'circle', ok ? 'a5-ok' : 'a5-w'), h('b', {}, c.label), h('span', { class: 'muted small-text' }, ' · ' + c.source),
      c.type !== 'ability' && c.type !== 'asi' ? h('span', { class: 'a5-count' + (ok ? '' : ' warn') }, picks(c.key).length + ' / ' + c.count) : null);
    const body = h('div', { class: 'a5-ch-body' });
    const toggle = (val) => set((s) => { const cur = [].concat(s.ch[c.key] || []); const i = cur.indexOf(val); if (i >= 0) cur.splice(i, 1); else cur.push(val); s.ch[c.key] = cur; });
    if (c.type === 'list' || c.type === 'expertise' || c.type === 'group') {
      let opts = c.opts;
      if (c.type === 'expertise') {
        const P = previewSheet();
        const prof = Object.keys(P.d.skills).filter((k) => num(P.d.skills[k]) >= 1 && R.SKILL[k]);
        opts = skillOpts(c.from ? prof.filter((k) => c.from.includes(k)) : prof.concat(picks(c.key).filter((k) => !prof.includes(k))));
        if (!opts.length) put(body, h('p', { class: 'hint' }, 'Escolha antes as perícias com proficiência.'));
      }
      const single = c.type === 'group';
      put(body, h('div', { class: 'f5-chips' }, opts.map((o) => h('button', { class: 'chip' + (picks(c.key).includes(o.v) ? ' on' : ''), 'data-ch': c.key + '=' + o.v,
        onclick: () => single ? set((s) => { s.ch[c.key] = [o.v]; for (const k of Object.keys(s.ch)) if (k.startsWith(c.key.replace(/:sg$/, ':sp'))) delete s.ch[k]; }) : toggle(o.v) }, o.label))));
    } else if (c.type === 'text') {
      for (let i = 0; i < c.count; i++) {
        const cur = [].concat(v || [])[i] || '';
        const input = h('input', { value: R.SKILL[cur] ? R.SKILL[cur][1] : cur, list: c.skillToo ? 'a5-skill-list' : null, placeholder: c.kind === 'language' ? 'Ex.: Elvish' : c.skillToo ? 'Perícia, ferramenta ou idioma' : 'Ex.: Thieves\' Tools', 'data-f': 'a5-t-' + c.key + i,
          onchange: (e) => set((s) => { const arr = [].concat(s.ch[c.key] || []); const t = e.target.value.trim(); const sk = R.SKILLS.find((x) => x[1].toLowerCase() === t.toLowerCase() || x[3].toLowerCase() === t.toLowerCase()); arr[i] = sk ? sk[0] : t; s.ch[c.key] = arr; }) });
        put(body, input);
      }
      if (c.skillToo) put(body, h('datalist', { id: 'a5-skill-list' }, R.SKILLS.map((x) => h('option', { value: x[1] }))));
    } else if (c.type === 'ability' || c.type === 'asi') {
      let blocks = c.blocks, val = v || {};
      if (c.type === 'asi') {
        put(body, h('div', { class: 'f5-chips' },
          h('button', { class: 'chip' + (val.mode === 'asi' ? ' on' : ''), 'data-asi': c.key + '=asi', onclick: () => set((s) => { s.ch[c.key] = { mode: 'asi', alt: 0, picks: [] }; }) }, 'Aumento de atributo'),
          h('button', { class: 'chip' + (val.mode === 'feat' ? ' on' : ''), 'data-asi': c.key + '=feat', onclick: () => set((s) => { s.ch[c.key] = { mode: 'feat', feat: null }; }) }, 'Talento')));
        if (val.mode === 'feat') {
          const f = byId('feats', val.feat);
          put(body, h('div', { class: 'row' }, f ? h('b', {}, f.name) : h('span', { class: 'muted' }, 'Nenhum talento escolhido.'),
            btnI('library', f ? 'Trocar' : 'Escolher talento', { 'data-pickfeat': c.key, onclick: () => App.Ficha5e.pick('feats', { edition: st.edicao, extra: { label: st.edicao === '2024' ? 'Só talentos gerais' : 'Esconder dons épicos', test: (r) => st.edicao === '2024' ? r.category === 'General' || r.category === 'Ability Score Improvement' : r.category !== 'Epic Boon' } },
              (r) => set((s) => { s.ch[c.key] = { mode: 'feat', feat: r.id }; for (const k of Object.keys(s.ch)) if (k.startsWith('ft:' + c.key)) delete s.ch[k]; })) })));
          if (f) put(body, h('details', {}, h('summary', {}, 'Texto do talento'), textView(f.description, 2000)));
          return h('div', { class: 'a5-ch' + (ok ? ' ok' : ''), 'data-choice': c.key }, head, body);
        }
        if (val.mode !== 'asi') return h('div', { class: 'a5-ch' + (ok ? ' ok' : ''), 'data-choice': c.key }, head, body);
        blocks = ASI_BLOCKS;
      }
      const alt = val.alt || 0;
      const altLabel = (blk) => blk.weighted ? blk.weighted.weights.map((w) => '+' + w).join(' / ') : blk.choose ? (blk.choose.count > 1 ? '+' + (blk.choose.amount || 1) + ' em ' + blk.choose.count : '+' + (blk.choose.amount || 1) + ' em um') : Object.entries(blk.fixed || {}).map(([k, n]) => R.AB_SH[k] + ' +' + n).join(', ');
      if (blocks.length > 1) put(body, h('div', { class: 'f5-chips' }, blocks.map((blk, i) => h('button', { class: 'chip' + (alt === i ? ' on' : ''), 'data-alt': c.key + '=' + i, onclick: () => set((s) => { s.ch[c.key] = Object.assign({}, s.ch[c.key] || {}, { alt: i, picks: [] }); }) }, altLabel(blk)))));
      const blk = blocks[alt] || {};
      const pk = (val.picks || []);
      const setPick = (i, k) => set((s) => { const cur = Object.assign({ mode: c.type === 'asi' ? 'asi' : undefined, alt }, s.ch[c.key] || {}); const p = [].concat(cur.picks || []); p[i] = k; cur.picks = p; s.ch[c.key] = cur; });
      if (blk.weighted) put(body, h('div', { class: 'f5-grid3' }, blk.weighted.weights.map((w, i) => field('+' + w, sel(pk[i] || '', [{ v: '', label: 'Escolha…' }].concat(abilOpts(blk.weighted.from).filter((o) => o.v === pk[i] || !pk.includes(o.v))), (k) => setPick(i, k), { 'data-f': 'a5-w-' + c.key + i })))));
      if (blk.choose) put(body, h('div', { class: 'f5-chips' }, abilOpts(blk.choose.from).map((o) => h('button', { class: 'chip' + (pk.includes(o.v) ? ' on' : ''), 'data-ab': c.key + '=' + o.v,
        onclick: () => set((s) => { const cur = Object.assign({ alt }, s.ch[c.key] || {}); if (c.type === 'asi') cur.mode = 'asi'; let p = [].concat(cur.picks || []).filter(Boolean); if (p.includes(o.v)) p = p.filter((x) => x !== o.v); else { p.push(o.v); if (p.length > blk.choose.count) p.shift(); } cur.picks = p; s.ch[c.key] = cur; }) }, o.label + ' +' + (blk.choose.amount || 1)))));
      if (blk.fixed && !blk.choose && !blk.weighted) put(body, h('p', { class: 'hint' }, altLabel(blk)));
    } else if (c.type === 'feat' || c.type === 'option' || c.type === 'spell') {
      const tab = c.type === 'feat' ? 'feats' : c.type === 'option' ? 'options' : 'spells';
      const chosen = picks(c.key);
      put(body, h('div', { class: 'a5-picked' }, chosen.map((id) => { const r = byId(tab, id); return h('span', { class: 'chip on' }, r ? r.name : id, iconBtn('x', 'Tirar', () => toggle(id))); })),
        chosen.length < c.count ? btnI('library', c.type === 'feat' ? 'Escolher talento' : c.type === 'option' ? 'Escolher opção' : 'Escolher magia', { 'data-pick': c.key, onclick: () => {
          const filter = c.type === 'feat' ? (r) => featMatches(c.category, r)
            : c.type === 'option' ? (r) => (r.types || []).some((t) => c.types.includes(t)) && !chosen.includes(r.id)
              : spellFilter(c.filter);
          App.Ficha5e.pick(tab, { edition: st.edicao, filter, title: c.label + ' (' + c.source + ')' }, (r) => set((s) => { const cur = [].concat(s.ch[c.key] || []); if (!cur.includes(r.id)) cur.push(r.id); s.ch[c.key] = cur; }));
        } }) : null);
    }
    return h('div', { class: 'a5-ch' + (ok ? ' ok' : ''), 'data-choice': c.key }, head, body);
  }

  function tabMagias(pane) {
    const st = A5.st, ci = casterInfo();
    const P = previewSheet();
    const always = P.d.magia.list.filter((s) => s.always);
    const extra = needs().filter((c) => c.type === 'spell');
    if (extra.length) put(pane, sec('Magias de talentos e espécie', extra.map(choiceView)));
    if (always.length) {
      const groups = [...new Set(always.map((s) => s.level))].sort((a, b) => a - b);
      const sections = groups.map((level) => {
        const cards = always.filter((s) => s.level === level).map((s) => h('div', { class: 'a5-spell on' },
          h('b', {}, s.name), h('small', { class: 'muted' }, s.from || D5.srcName(s.source))));
        return h('div', { class: 'a5-spell-level' }, h('h4', {}, level ? level + 'º nível' : 'Truques'), h('div', { class: 'a5-spell-grid' }, cards));
      });
      put(pane, sec('Sempre preparadas', sections));
    }
    if (!ci) { if (!extra.length) put(pane, h('p', { class: 'empty' }, 'Esta classe não conjura magias neste nível.')); return; }
    const up = st.mode === 'up';
    const have = up ? haveSpells() : [];
    const pickBox = (lvl0, key, limit, before) => {
      const chosen = st.spells[key];
      const haveN = have.filter((s) => (s.level === 0) === lvl0).length;
      const total = chosen.length + haveN;
      const list = X.spells.filter((sp) => (!st.edicao || sp.edition === st.edicao) && inList(sp, ci) && (lvl0 ? sp.level === 0 : sp.level > 0 && sp.level <= ci.max)
        && !have.some((s) => s.ref === sp.id) && !always.some((s) => s.ref === sp.id));
      let q = (A5.sq && A5.sq[key]) || '';
      const items = h('div', { class: 'a5-spell-list' });
      const sources = D5.sourceControl(() => list, (A5.spellSources || {})[key], (value) => { (A5.spellSources = A5.spellSources || {})[key] = value; fill(); });
      const fill = () => {
        items.replaceChildren();
        const words = U.slug(q).split(/[_-]+/).filter(Boolean);
        const L = list.filter((sp) => sources.matches(sp) && (!words.length || words.every((w) => U.slug(sp.name + ' ' + sp.school + ' ' + D5.srcName(sp.source)).includes(w)))).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
        for (const level of [...new Set(L.map((sp) => sp.level))]) {
          const group = h('div', { class: 'a5-spell-level' });
          if (!lvl0) put(group, h('h4', {}, level + 'º nível'));
          const cards = L.filter((sp) => sp.level === level).map((sp) => h('label', { class: 'a5-spell' + (chosen.includes(sp.id) ? ' on' : ''), 'data-spell': sp.id },
            h('input', { type: 'checkbox', checked: chosen.includes(sp.id), onchange: () => set((s) => { const arr = s.spells[key]; const i = arr.indexOf(sp.id); if (i >= 0) arr.splice(i, 1); else arr.push(sp.id); }) }),
            h('span', { class: 'a5-spell-text' }, h('b', {}, sp.name), h('small', { class: 'muted' }, sp.school + ' · ' + D5.srcName(sp.source) + (sp.duration && sp.duration.concentration ? ' · Concentração' : '') + (sp.ritual ? ' · Ritual' : '')))));
          put(group, h('div', { class: 'a5-spell-grid' }, cards));
          put(items, group);
        }
        if (!L.length) put(items, h('p', { class: 'empty' }, 'Nada encontrado.'));
      };
      fill();
      return sec((lvl0 ? 'Truques' : ci.mode === 'known' ? 'Magias conhecidas' : ci.mode === 'spellbook' ? 'Magias preparadas (do grimório)' : 'Magias preparadas') + ' · ' + total + ' de ' + limit,
        up && haveN ? h('p', { class: 'hint' }, 'Já na ficha: ' + haveN + '. No nível ' + st.level + ' o limite é ' + limit + (before ? ' (antes ' + before + ')' : '') + '.') : null,
        h('div', { class: 'a5-search-row' }, h('div', { class: 'search-box' }, ic('search'), h('input', { placeholder: 'Buscar…', value: q, 'data-f': 'a5-sq-' + key, oninput: (e) => { q = e.target.value; (A5.sq = A5.sq || {})[key] = q; fill(); } })), sources.element), items);
    };
    put(pane, h('p', { class: 'hint' }, ci.name + ': conjura com ' + R.AB_PT[ci.ability] + ', magias até o ' + ci.max + 'º nível. ' + (ci.mode === 'known' ? 'Magias conhecidas.' : 'Prepara as magias da lista' + (ci.mode === 'spellbook' ? ' (Wizard: as preparadas saem do grimório).' : '.'))));
    if (ci.cantrips) put(pane, pickBox(true, 'cantrips', ci.cantrips, ci.cantripsBefore));
    if (ci.prepared && ci.max) put(pane, pickBox(false, 'list', ci.prepared, ci.preparedBefore));
  }
  function tabEquip(pane) {
    const st = A5.st;
    const groups = equipGroups();
    if (!groups.length) { put(pane, h('p', { class: 'empty' }, 'Escolha a classe e o antecedente para ver o equipamento inicial.')); return; }
    if (!X.items) {
      put(pane, h('p', { class: 'muted' }, 'Abrindo o cadastro de itens…'));
      loadAll(true).then(() => render()).catch(() => {});
      return;
    }
    const itemTxt = (it) => it.gold ? (num(it.gold) / 100).toLocaleString('pt-BR') + ' PO' : (num(it.qty, 1) > 1 ? it.qty + '× ' : '') + (it.type ? typeLabel(it.type) + ' à escolha' : it.name);
    for (const who of [...new Set(groups.map((g) => g.who))]) {
      const gs = groups.filter((g) => g.who === who);
      put(pane, sec('Equipamento de ' + who, gs.map((g) => {
        const lab = st.equip[g.key] || (g.opts[0] && g.opts[0].label);
        const o = g.opts.find((x) => x.label === lab) || g.opts[0];
        return h('div', { class: 'a5-eq' },
          g.opts.length > 1 ? h('div', { class: 'f5-chips' }, g.opts.map((x) => h('button', { class: 'chip' + (x === o ? ' on' : ''), 'data-eq': g.key + '=' + x.label, onclick: () => set((s) => { s.equip[g.key] = x.label; }) }, '(' + (x.label || '·') + ') ' + x.items.map(itemTxt).join(', ')))) :
            h('div', {}, o ? o.items.map(itemTxt).join(', ') : ''),
          o ? o.items.map((it, j) => it.type ? field(typeLabel(it.type), sel(st.equip[g.key + ':' + j] || '', [{ v: '', label: 'Escolha…' }].concat(genericItems(it.type).sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ v: r.id, label: r.name }))),
            (v) => set((s) => { s.equip[g.key + ':' + j] = v; }), { 'data-f': 'a5-eqp-' + g.key + j })) : null) : null);
      })));
    }
  }
  function tabResumo(pane, W) {
    const st = A5.st, P = previewSheet(), c = P.c, d = P.d;
    const all = Object.entries(W).filter(([k]) => k !== 'resumo');
    if (all.length) put(pane, h('div', { class: 'a5-warns' }, ic('triangle-alert'), h('div', {}, h('b', {}, 'Ainda falta (você pode criar mesmo assim):'),
      all.flatMap(([k, v]) => v.map((m) => h('div', {}, h('button', { class: 'f5-link', onclick: () => set((s) => { s.tab = k; }, false) }, (STEPS.find((x) => x[0] === k) || [0, 0, k])[2] + ': ' + m)))))));
    else put(pane, h('p', { class: 'a5-allok' }, ic('check'), 'Tudo escolhido.'));
    const clsTxt = d.classes.filter((x) => x.name).map((x) => x.name + ' ' + x.level + (x.sub ? ' · ' + (x.sub.shortName || x.sub.name) : '')).join(' / ') || '—';
    put(pane, sec(st.name || (A5.actor && A5.actor.name) || 'Novo personagem',
      h('div', { class: 'f5-kv' }, h('span', {}, h('small', {}, d.classes.length > 1 ? 'Classes' : 'Classe'), clsTxt),
        h('span', {}, h('small', {}, 'Espécie'), d.especie ? d.especie.name + (d.especie.option ? ' (' + d.especie.option + ')' : '') : '—'),
        h('span', {}, h('small', {}, 'Antecedente'), d.antecedente ? d.antecedente.name : '—'),
        h('span', {}, h('small', {}, 'PV'), String(c.hpMax)), h('span', {}, h('small', {}, 'CA'), String(c.ac)), h('span', {}, h('small', {}, 'Proficiência'), sg(c.pb)),
        h('span', {}, h('small', {}, 'Iniciativa'), sg(c.init)), c.spell.dc ? h('span', {}, h('small', {}, 'CD de magia'), String(c.spell.dc)) : null),
      h('div', { class: 'a5-sum-ab' }, R.AB.map((k) => h('div', {}, h('small', {}, R.AB_SH[k]), h('b', {}, String(d.abil[k])), h('span', {}, sg(c.mod[k]))))),
      h('div', { class: 'a5-profs' },
        h('div', {}, 'Perícias: ' + (R.SKILLS.filter((s) => num(d.skills[s[0]]) >= 1).map((s) => s[1] + (num(d.skills[s[0]]) >= 2 ? ' (especialista)' : '') + ' ' + sg(c.skill[s[0]].v)).join(', ') || '—')),
        h('div', {}, 'Salvaguardas: ' + (R.AB.filter((k) => d.saves[k]).map((k) => R.AB_PT[k]).join(', ') || '—')),
        d.talentos.length ? h('div', {}, 'Talentos: ' + d.talentos.map((t) => t.name).join(', ')) : null,
        d.magia.list.length ? h('div', {}, 'Magias: ' + d.magia.list.map((s) => s.name).join(', ')) : null,
        h('div', {}, 'Características: ' + d.caract.length + (d.recursos.length ? ' · Recursos: ' + d.recursos.map((r) => r.name + ' ' + r.max).join(', ') : '')),
        st.mode === 'new' ? h('div', {}, 'Equipamento: ' + (equipGroups().map((g) => { const lab = st.equip[g.key] || (g.opts[0] && g.opts[0].label), o = g.opts.find((x) => x.label === lab) || g.opts[0]; return o ? o.items.map((it) => it.gold ? (num(it.gold) / 100) + ' PO' : it.type ? typeLabel(it.type) : it.name).join(', ') : ''; }).filter(Boolean).join('; ') || '—')) : null,
        st.mode === 'up' ? h('div', { class: 'a5-new' }, 'Novo nos níveis ' + (st.fromLevel + 1) + '–' + st.level + ': ' + (d.caract.filter((f) => num(f.level) > st.fromLevel && !(st.base0.caract || []).some((x) => x.name === f.name && num(x.level) === num(f.level))).map((f) => f.name).concat(d.magia.list.filter((x) => !(st.base0.magia.list || []).some((y) => y.ref === x.ref)).map((x) => x.name), d.talentos.filter((t) => !(st.base0.talentos || []).some((y) => y.id === t.id)).map((t) => t.name)).join(', ') || 'PV e proficiência')) : null)));
  }

  // Para os testes: estado e escolhas
  A5.needs = needs;
  A5.warnings = warnings;
  A5.preview = () => { previewCache = null; return previewSheet(); };
  A5.build = () => { previewCache = null; return build(A5.st.base0); };
})(window.App);
export {};
