'use strict';
import { flushSync, mount, unmount } from 'svelte';
import SheetTabs from '../src/ui/SheetTabs.svelte';
import InventoryItems from '../src/ui/InventoryItems.svelte';
/*
 * Ficha de D&D 5e (Plano 51, parte A), no modelo da ficha do Roll20.
 * O mesmo desenho serve à página Criar ficha (ficha.js) e à janela da ficha na mesa (ui.js):
 *   App.Ficha5e.render(a, ctx) → elemento
 *   ctx = { edit(fn), ro, roll(label, formula), avatar(size) → elemento, config() → elemento, wide }
 * Toda mudança passa por upd(): normaliza a.dnd5e, muda, e recalcula os campos da mesa (App.Regras5e.apply).
 * Topo: retrato, classe e nível, CA, iniciativa, deslocamento, proficiência, PV, dados de vida, inspiração.
 * Abas: Principal · Ações · Magias · Inventário · Características · Biografia · Configurar.
 * Os cadastros (App.Dados5e) só carregam quando se escolhe algo deles; a ficha guarda uma cópia do que usa.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const R = App.Regras5e;
  const editionName = App.Dados5e.editionName;
  const ic = (n, cls) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n, cls); return t.content.firstChild; };
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn small' }, attrs), ic(icon), label);
  const iconBtn = (icon, title, onclick, attrs = {}) => h('button', Object.assign({ class: 'icon-btn', title, 'aria-label': title, onclick }, attrs), ic(icon));
  const num = (v, d = 0) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const sg = R.sign;
  const d20 = (n) => '1d20' + (n ? (n > 0 ? '+' : '-') + Math.abs(n) : '');
  const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

  const F5 = { tab: {}, open: new Set(), adj: null };
  App.Ficha5e = F5;
  const components = new WeakMap();
  function mountPart(sheet, component, target, props) {
    const instance = flushSync(() => mount(component, { target, props }));
    const active = components.get(sheet) || [];
    active.push(instance);
    components.set(sheet, active);
  }
  F5.release = (root) => {
    for (const component of components.get(root) || []) void unmount(component);
    components.delete(root);
  };
  const tabsPart = (root, tabs, selected, onselect) => mountPart(root, SheetTabs, root, {
    tabs: tabs.map(([id, icon, label]) => ({ id, icon: App.Icons.svg(icon), label })), selected, onselect,
  });

  const TABS = [
    ['principal', 'user-round', 'Principal'], ['acoes', 'swords', 'Ações'], ['magias', 'sparkles', 'Magias'],
    ['inventario', 'backpack', 'Inventário'], ['caract', 'award', 'Características'], ['bio', 'file-text', 'Biografia'], ['config', 'settings-2', 'Configurar'],
  ];
  const ATK_TYPES = { melee: 'Corpo a corpo', ranged: 'À distância', 'spell-attack': 'Ataque mágico', 'spell-save': 'Magia com salvaguarda', 'attack-save': 'Ataque + salvaguarda', heal: 'Cura' };
  const ATK_ABIL = Object.assign({}, R.AB_SH, { best: 'FOR ou DES', spell: 'Conjuração', none: 'Nenhum' });
  const DMG_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
  const RESETS = { long: 'Descanso longo', short: 'Descanso curto', none: 'Não recupera' };
  const SOURCES = ['Classe', 'Subclasse', 'Espécie', 'Antecedente', 'Talento', 'Outro'];

  // ---------- Campos ----------
  function field(label, el, attrs = {}) { return h('label', Object.assign({ class: 'f5-f' }, attrs), h('span', {}, label), el); }
  function tin(v, set, attrs = {}) { return h('input', Object.assign({ value: v == null ? '' : v, onchange: (e) => set(e.target.value) }, attrs)); }
  function nin(v, set, attrs = {}) { return h('input', Object.assign({ class: 'num', type: 'number', value: v == null ? '' : v, onchange: (e) => set(num(e.target.value)) }, attrs)); }
  function sel(v, opts, set, attrs = {}) {
    return h('select', Object.assign({ value: v == null ? '' : String(v), onchange: (e) => set(e.target.value) }, attrs),
      Object.entries(opts).map(([k, l]) => h('option', { value: k }, l)));
  }
  function area(v, set, attrs = {}) { return h('textarea', Object.assign({ value: v || '', rows: 3, onchange: (e) => set(e.target.value) }, attrs)); }
  function chk(v, set, attrs = {}) { return h('input', Object.assign({ type: 'checkbox', checked: !!v, onchange: (e) => set(e.target.checked) }, attrs)); }
  function sec(icon, title, extra, ...body) {
    return h('section', { class: 'f5-sec' }, h('div', { class: 'f5-sec-head' }, ic(icon), h('h3', {}, title), h('span', { class: 'grow' }), extra), body);
  }
  // Texto dos cadastros: parágrafos e as tabelas "| a | b |"
  function textView(t) {
    const box = h('div', { class: 'f5-text' });
    for (const p of String(t || '').split(/\n{2,}/)) {
      if (!p.trim()) continue;
      if (/^\|/.test(p.trim())) box.append(h('pre', { class: 'f5-tbl' }, p.trim()));
      else box.append(h('p', {}, p.trim()));
    }
    return box;
  }

  // ---------- Escolher de um cadastro ----------
  const SUB = {
    classes: (r) => [editionName(r.edition), 'd' + r.hd, r.source].filter(Boolean).join(' · '),
    subclasses: (r) => [r.className, editionName(r.edition), r.source].filter(Boolean).join(' · '),
    species: (r) => [editionName(r.edition), r.source].filter(Boolean).join(' · '),
    backgrounds: (r) => [editionName(r.edition), r.source].filter(Boolean).join(' · '),
    feats: (r) => [r.category, editionName(r.edition), r.source].filter(Boolean).join(' · '),
    spells: (r) => [r.level ? r.level + 'º nível' : 'Truque', r.school, (r.classes || []).join(', '), editionName(r.edition), r.source].filter(Boolean).join(' · '),
    items: (r) => [r.category, r.rarity && r.rarity !== 'None' ? r.rarity : '', r.weapon && r.weapon.damage ? r.weapon.damage.dice + ' ' + r.weapon.damage.type : '', r.armor ? 'CA ' + r.armor.ac : '', editionName(r.edition), r.source].filter(Boolean).join(' · '),
    attacks: (r) => [ATK_TYPES[r.type] || r.type, editionName(r.edition), r.source].filter(Boolean).join(' · '),
  };
  const TITLES = { classes: 'Escolher a classe', subclasses: 'Escolher a subclasse', species: 'Escolher a espécie', backgrounds: 'Escolher o antecedente', feats: 'Adicionar talento', spells: 'Adicionar magia', items: 'Adicionar item', attacks: 'Adicionar ataque' };
  F5.pick = function (tab, opts, onPick) {
    opts = opts || {};
    const back = h('div', { class: 'modal-back f5-pick-back' });
    const close = () => back.remove();
    const list = h('div', { class: 'f5-pick-list' }, h('p', { class: 'muted' }, 'Abrindo o cadastro…'));
    let q = '', all = [], edOnly = !!opts.edition, extra = opts.extraOn !== false;
    const candidates = () => all.filter((r) => (!edOnly || !r.edition || r.edition === opts.edition) && (!opts.filter || opts.filter(r)) && (!opts.extra || !extra || opts.extra.test(r)));
    const sources = App.Dados5e.sourceControl(candidates, null, () => fill());
    const fill = () => {
      list.innerHTML = '';
      const words = U.slug(q).split(/[_-]+/).filter(Boolean);
      const L = candidates().filter((r) => sources.matches(r)
        && (!words.length || words.every((w) => U.slug(r.name + ' ' + (r.className || '') + ' ' + (r.source || '')).includes(w))));
      L.sort((x, y) => x.name.localeCompare(y.name));
      if (!L.length) { list.append(h('p', { class: 'empty' }, all.length ? 'Nada encontrado.' : 'Cadastro vazio.')); return; }
      for (const r of L.slice(0, 200)) {
        const duplicate = tab === 'subclasses' && all.some((other) => other !== r && other.classId === r.classId && other.name === r.name && other.edition !== r.edition);
        list.append(h('button', { class: 'f5-pick-item', 'data-id': r.id, onclick: () => { close(); onPick(r); } },
          h('b', {}, r.name + (duplicate ? ' (' + App.Dados5e.editionShort(r.edition) + ')' : '')), h('small', {}, (SUB[tab] || (() => r.source))(r))));
      }
      if (L.length > 200) list.append(h('p', { class: 'hint' }, 'Mostrando 200 de ' + L.length + '. Digite mais para filtrar.'));
    };
    const box = h('div', { class: 'modal f5-pick' },
      h('div', { class: 'win-head' }, ic('library'), h('span', { class: 'win-title' }, opts.title || TITLES[tab] || 'Escolher'), iconBtn('x', 'Fechar', close)),
      h('div', { class: 'win-body' },
        h('div', { class: 'a5-search-row' }, h('div', { class: 'search-box' }, ic('search'), h('input', { placeholder: 'Buscar…', 'data-f': 'f5-pick-q', oninput: (e) => { q = e.target.value; fill(); } })), sources.element),
        h('div', { class: 'row wrap f5-pick-opts' },
          opts.edition ? h('label', { class: 'check-row' }, chk(edOnly, (v) => { edOnly = v; sources.refresh(); fill(); }), 'Só da edição ' + editionName(opts.edition)) : null,
          opts.extra ? h('label', { class: 'check-row' }, chk(extra, (v) => { extra = v; sources.refresh(); fill(); }), opts.extra.label) : null),
        list));
    back.append(box);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    document.body.append(back);
    App.Dados5e.load(tab).then((L) => { all = L; sources.refresh(); fill(); const s = box.querySelector('input[data-f="f5-pick-q"]'); if (s) s.focus(); })
      .catch((e) => { list.textContent = 'Não consegui abrir o cadastro: ' + e.message; });
  };

  // ---------- Desenho ----------
  F5.render = function (a, ctx) {
    const d = R.norm(U.clone(a.dnd5e || {}));
    const c = R.calc(Object.assign({}, a, { dnd5e: d }));
    const ro = !!ctx.ro;
    // Toda mudança: normaliza, muda e recalcula os campos da mesa
    const upd = (fn) => { if (ro) return; ctx.edit((x) => { x.dnd5e = R.norm(x.dnd5e); fn(x.dnd5e, x); R.apply(x); }); };
    const roll = (label, f) => ctx.roll(label, f);
    const bar = (name) => (a.bars || []).find((b) => U.slug(b.name) === U.slug(name)) || null;
    const setBar = (x, name, v) => { const b = (x.bars || []).find((y) => U.slug(y.name) === U.slug(name)); if (b) b.value = Math.max(0, Math.min(num(b.max), v)); };
    const tab = TABS.some((t) => t[0] === F5.tab[a.id]) ? F5.tab[a.id] : 'principal';
    const go = (t) => { F5.tab[a.id] = t; ctx.rerender(); };
    const K = { a, d, c, ro, upd, roll, bar, setBar, ctx };
    if (d.npc) return npcRender(a, ctx, K);

    const root = h('div', { class: 'f5' + (ctx.wide ? ' wide' : '') });
    root.append(top(K));
    tabsPart(root, TABS, tab, go);
    const pane = h('div', { class: 'f5-pane' });
    if (tab === 'principal') principal(K, pane);
    if (tab === 'acoes') acoes(K, pane);
    if (tab === 'magias') magias(K, pane);
    if (tab === 'inventario') inventario(K, pane, root);
    if (tab === 'caract') caract(K, pane);
    if (tab === 'bio') bio(K, pane);
    if (tab === 'config' && ctx.config) pane.append(ctx.config());
    root.append(pane);
    return root;
  };

  // Valor calculado com ajuste manual (Roll20: trocar o valor ou somar um bônus)
  function adjBtn(K, key, auto, label) {
    if (K.ro) return null;
    const on = R.isAdj(K.d, key);
    return h('button', { class: 'f5-adj' + (on ? ' on' : ''), title: on ? 'Ajustado à mão: clique para mudar' : 'Ajustar ' + label + ' à mão', 'data-adj': key,
      onclick: (e) => { e.stopPropagation(); F5.adj = F5.adj === key ? null : key; K.ctx.rerender(); } }, ic(on ? 'pen-line' : 'settings-2'));
  }
  function adjForm(K, key, auto, label) {
    if (F5.adj !== key || K.ro) return null;
    const cur = R.adj(K.d, key) || {};
    const set = (patch) => K.upd((d) => { d.aj[key] = Object.assign({ set: null, add: 0 }, d.aj[key] || {}, patch); });
    return h('div', { class: 'f5-adj-form' },
      h('small', { class: 'muted' }, label + ': calculado ' + auto),
      field('Valor fixo', tin(cur.set == null ? '' : cur.set, (v) => set({ set: v === '' ? null : num(v) }), { placeholder: 'vazio = calculado', 'data-f': 'adj-set-' + key })),
      field('Bônus extra', nin(cur.add || 0, (v) => set({ add: v }), { 'data-f': 'adj-add-' + key })),
      h('button', { class: 'btn small ghost', 'data-act': 'adj-reset', onclick: () => { F5.adj = null; K.upd((d) => { delete d.aj[key]; }); } }, ic('rotate-ccw'), 'Voltar ao calculado'));
  }
  function statBox(K, o) {
    const box = h('div', { class: 'f5-box' + (o.roll ? ' rollable' : '') + (R.isAdj(K.d, o.key) ? ' adj' : ''), title: o.title || '', 'data-box': o.key },
      h('small', {}, o.label),
      h('b', { onclick: o.roll || null }, String(o.value)),
      o.sub ? h('span', { class: 'f5-box-sub' }, o.sub) : null,
      o.key ? adjBtn(K, o.key, o.auto, o.label) : null);
    return box;
  }

  // ---------- Topo ----------
  function top(K) {
    const { a, d, c, ro } = K;
    const cls = d.classes.filter((x) => x.name).map((x) => x.name + ' ' + x.level + (x.sub ? ' · ' + (x.sub.shortName || x.sub.name) : '')).join(' / ') || 'Sem classe';
    const origin = [d.especie && d.especie.name + (d.especie.option ? ' (' + d.especie.option + ')' : ''), d.antecedente && d.antecedente.name, d.tendencia].filter(Boolean).join(' · ');
    const pv = K.bar('PV') || { value: c.hpMax, max: c.hpMax };
    const av = K.ctx.avatar ? K.ctx.avatar(72) : null;
    const hpIn = h('input', { class: 'f5-hp-cur num', value: pv.value, disabled: ro, 'data-f': 'f5-hp', title: 'PV atual · aceita +5, -7 ou -2d6 (o dano gasta primeiro os PV temporários)',
      onchange: (e) => {
        const s = String(e.target.value).trim();
        if (!s) return;
        let v;
        try { v = /d/i.test(s) ? App.Dice.roll(s.replace(/^[+-]/, '')).total * (s[0] === '-' ? -1 : 1) : num(s, NaN); } catch { v = NaN; }
        if (!Number.isFinite(v)) { U.toast('Valor inválido', 'error'); return; }
        K.upd((dd, x) => {
          const b = (x.bars || []).find((y) => y.name === 'PV');
          if (!b) return;
          if (/^[+-]/.test(s)) {
            if (v < 0 && num(dd.hp.temp) > 0) { const t = Math.min(num(dd.hp.temp), -v); dd.hp.temp = num(dd.hp.temp) - t; v += t; }
            b.value = Math.max(0, Math.min(num(b.max), num(b.value) + v));
          } else b.value = Math.max(0, Math.min(num(b.max), v));
        });
      } });
    const pct = pv.max > 0 ? Math.max(0, Math.min(100, (pv.value / pv.max) * 100)) : 0;
    return h('div', { class: 'f5-top' },
      h('div', { class: 'f5-who' }, av,
        h('div', { class: 'grow f5-who-txt' },
          h('input', { class: 'f5-name sheet-name', value: a.name, disabled: ro, 'data-f': 'f5-nome', 'aria-label': 'Nome', onchange: (e) => K.ctx.edit((x) => { x.name = e.target.value.trim() || x.name; }) }),
          h('div', { class: 'f5-cls' }, h('b', {}, cls), ' · nível ', String(c.level), d.edicao ? h('span', { class: 'badge' }, editionName(d.edicao)) : null),
          origin ? h('div', { class: 'f5-origin muted' }, origin) : null),
        !ro && App.Assist5e ? (d.classes[0] && d.classes[0].ref
          ? (c.level < 20 ? btnI('trending-up', 'Subir de nível', { class: 'btn small primary', 'data-act': 'level-up', onclick: () => App.Assist5e.open({ actor: a, onDone: (res) => K.ctx.edit((x) => { x.dnd5e = res.d; R.apply(x); }) }) }) : null)
          : btnI('wand', 'Criar pelo assistente', { class: 'btn small primary', 'data-act': 'assist', onclick: () => App.Assist5e.open({ actor: a, onDone: (res) => K.ctx.edit((x) => { x.dnd5e = res.d; if (res.name) x.name = res.name; R.apply(x); }) }) })) : null),
      h('div', { class: 'f5-boxes' },
        statBox(K, { key: 'ac', label: 'CA', value: c.ac, auto: c.acAuto, title: c.acParts }),
        statBox(K, { key: 'init', label: 'Iniciativa', value: sg(c.init), auto: sg(c.mod.dex), roll: () => K.roll('Iniciativa', d20(c.init)) }),
        statBox(K, { key: 'speed', label: 'Deslocamento', value: App.Units ? App.Units.dist(c.speed) : c.speed + ' m', auto: num(d.speed.walk) }),
        statBox(K, { key: 'pb', label: 'Proficiência', value: sg(c.pb), auto: sg(c.pb) }),
        h('div', { class: 'f5-box f5-hp' + (R.isAdj(d, 'hpMax') ? ' adj' : ''), 'data-box': 'hp' },
          h('small', {}, 'Pontos de vida'),
          h('div', { class: 'f5-hp-row' }, hpIn, h('span', { class: 'muted' }, '/ ' + c.hpMax), adjBtn(K, 'hpMax', c.hpAuto, 'PV máximo')),
          h('div', { class: 'meter' }, h('div', { style: { width: pct + '%', background: pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--warn)' : 'var(--danger)' } })),
          h('label', { class: 'f5-temp' }, 'Temp.', nin(d.hp.temp || 0, (v) => K.upd((dd) => { dd.hp.temp = Math.max(0, v); }), { disabled: ro, 'data-f': 'f5-temp' }))),
        h('div', { class: 'f5-box' }, h('small', {}, 'Dados de vida'),
          h('b', {}, String(c.hdLeft.reduce((sum, x) => sum + x.left, 0))), h('span', { class: 'f5-box-sub' }, 'de ' + c.hdTxt)),
        h('button', { class: 'f5-box f5-insp' + (d.insp ? ' on' : ''), disabled: ro, title: d.edicao === '2014' ? 'Inspiração' : 'Inspiração Heroica', 'data-act': 'insp',
          onclick: () => K.upd((dd) => { dd.insp = !dd.insp; }) }, h('small', {}, 'Inspiração'), ic(d.insp ? 'star' : 'circle'))),
      adjForm(K, 'ac', c.acAuto, 'CA') || adjForm(K, 'init', c.mod.dex, 'Iniciativa') || adjForm(K, 'speed', num(d.speed.walk), 'Deslocamento (m)') || adjForm(K, 'pb', c.pb, 'Proficiência') || adjForm(K, 'hpMax', c.hpAuto, 'PV máximo'));
  }

  // ---------- Principal ----------
  function principal(K, pane) {
    const { d, c, ro, upd, roll } = K;
    pane.append(origemSec(K));
    // Atributos e salvaguardas
    const abil = h('div', { class: 'f5-abils' }, R.AB.map((k) => h('div', { class: 'f5-abil' + (R.isAdj(d, 'abil_' + k) ? ' adj' : ''), 'data-abil': k },
      h('small', { title: R.AB_PT[k] }, R.AB_PT[k]),
      h('button', { class: 'f5-mod', title: 'Rolar teste de ' + R.AB_PT[k], 'data-roll': 'abil-' + k, onclick: () => roll('Teste de ' + R.AB_PT[k], d20(c.mod[k])) }, sg(c.mod[k])),
      nin(d.abil[k], (v) => upd((dd) => { dd.abil[k] = v; }), { class: 'num f5-score', disabled: ro, 'data-f': 'abil-' + k, 'aria-label': 'Valor de ' + R.AB_PT[k], min: 1, max: 30 }),
      h('div', { class: 'f5-save' },
        h('button', { class: 'f5-dot' + (d.saves[k] ? ' on' : ''), disabled: ro, title: 'Proficiente na salvaguarda', 'data-save': k, onclick: () => upd((dd) => { dd.saves[k] = !dd.saves[k]; }) }),
        h('button', { class: 'f5-link', title: 'Rolar salvaguarda', onclick: () => roll('Salvaguarda de ' + R.AB_PT[k], d20(c.save[k].v)) }, 'Salv. ' + sg(c.save[k].v))))));
    // Perícias
    const skills = h('div', { class: 'f5-skills' }, R.SKILLS.map(([id, pt, ab, en]) => {
      const s = c.skill[id];
      const lvl = num(d.skills[id]);
      return h('div', { class: 'f5-skill' + (R.isAdj(d, 'skill_' + id) ? ' adj' : ''), 'data-skill': id },
        h('button', { class: 'f5-dot' + (lvl >= 2 ? ' ex' : lvl >= 1 ? ' on' : lvl > 0 ? ' half' : ''), disabled: ro, title: 'Clique: proficiente → especialista → nada',
          onclick: () => upd((dd) => { const v = num(dd.skills[id]); dd.skills[id] = v >= 2 ? 0 : v >= 1 ? 2 : 1; }) }),
        h('button', { class: 'f5-link grow', title: en + ' · rolar', onclick: () => roll(pt, d20(s.v)) }, pt, h('small', { class: 'muted' }, ' ' + R.AB_SH[ab])),
        h('b', {}, sg(s.v)));
    }));
    pane.append(h('div', { class: 'f5-cols' },
      sec('dumbbell', 'Atributos e salvaguardas', h('span', { class: 'muted small-text' }, 'clique no modificador para rolar'), abil,
        h('label', { class: 'check-row f5-jack' }, chk(d.jack, (v) => upd((dd) => { dd.jack = v; }), { disabled: ro }), 'Pau para toda obra (metade da proficiência nas perícias sem proficiência)')),
      sec('list-ordered', 'Perícias', null, skills)));
    // Passivos, morte, condições
    const death = (k, label) => h('div', { class: 'f5-death' }, h('small', {}, label), [0, 1, 2].map((i) =>
      h('button', { class: 'f5-dot' + (num(d.hp.death[k]) > i ? ' on' : '') + (k === 'fail' ? ' bad' : ''), disabled: ro, 'data-death': k + i,
        onclick: () => upd((dd) => { dd.hp.death[k] = num(dd.hp.death[k]) > i ? i : i + 1; }) })));
    pane.append(h('div', { class: 'f5-cols' },
      sec('eye', 'Sentidos passivos', null, h('div', { class: 'f5-boxes small' },
        statBox(K, { key: 'pass_perception', label: 'Percepção', value: c.passive.perception, auto: 10 + c.skill.perception.v }),
        statBox(K, { key: 'pass_insight', label: 'Intuição', value: c.passive.insight, auto: 10 + c.skill.insight.v }),
        statBox(K, { key: 'pass_investigation', label: 'Investigação', value: c.passive.investigation, auto: 10 + c.skill.investigation.v })),
        adjForm(K, 'pass_perception', 10 + c.skill.perception.v, 'Percepção passiva') || adjForm(K, 'pass_insight', 10 + c.skill.insight.v, 'Intuição passiva') || adjForm(K, 'pass_investigation', 10 + c.skill.investigation.v, 'Investigação passiva'),
        h('div', { class: 'f5-grid3' }, Object.entries(R.SENSES).map(([k, l]) => field(l + ' (m)', nin(d.sentidos[k] || '', (v) => upd((dd) => { dd.sentidos[k] = v; }), { disabled: ro, 'data-f': 'sense-' + k })))) ),
      sec('heart-pulse', 'Testes contra a morte e condições', btnI('dices', 'Rolar', { disabled: ro, title: 'Rola o teste contra a morte (1d20)', onclick: () => roll('Teste contra a morte', '1d20') }),
        h('div', { class: 'row wrap' }, death('ok', 'Sucessos'), death('fail', 'Falhas')),
        field('Exaustão', sel(d.exaustao || 0, Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((n) => [n, n ? 'Nível ' + n : 'Nenhuma'])), (v) => upd((dd) => { dd.exaustao = num(v); }), { disabled: ro, 'data-f': 'exaustao' })),
        h('div', { class: 'f5-chips' }, R.CONDITIONS.map((n) => h('button', { class: 'chip' + (d.conds.includes(n) ? ' on' : ''), disabled: ro, 'data-cond': n,
          onclick: () => upd((dd) => { dd.conds = dd.conds.includes(n) ? dd.conds.filter((x) => x !== n) : dd.conds.concat(n); }) }, n))))));
    // Proficiências e defesas
    pane.append(h('div', { class: 'f5-cols' },
      sec('wrench', 'Proficiências e idiomas', null, h('div', { class: 'f5-grid2' },
        field('Armaduras', area(d.prof.armor, (v) => upd((dd) => { dd.prof.armor = v; }), { disabled: ro, rows: 2, 'data-f': 'prof-armor' })),
        field('Armas', area(d.prof.weapons, (v) => upd((dd) => { dd.prof.weapons = v; }), { disabled: ro, rows: 2, 'data-f': 'prof-weapons' })),
        field('Ferramentas', area(d.prof.tools, (v) => upd((dd) => { dd.prof.tools = v; }), { disabled: ro, rows: 2, 'data-f': 'prof-tools' })),
        field('Idiomas', area(d.prof.langs, (v) => upd((dd) => { dd.prof.langs = v; }), { disabled: ro, rows: 2, 'data-f': 'prof-langs' })))),
      sec('shield', 'Defesas', null, h('div', { class: 'f5-grid2' },
        field('Resistências', tin(d.defesas.resist, (v) => upd((dd) => { dd.defesas.resist = v; }), { disabled: ro, 'data-f': 'def-resist' })),
        field('Imunidades', tin(d.defesas.immune, (v) => upd((dd) => { dd.defesas.immune = v; }), { disabled: ro, 'data-f': 'def-immune' })),
        field('Vulnerabilidades', tin(d.defesas.vuln, (v) => upd((dd) => { dd.defesas.vuln = v; }), { disabled: ro, 'data-f': 'def-vuln' })),
        field('Imune a condições', tin(d.defesas.cond, (v) => upd((dd) => { dd.defesas.cond = v; }), { disabled: ro, 'data-f': 'def-cond' }))))));
  }

  // Classe, subclasse, espécie, antecedente e o básico do personagem
  function origemSec(K) {
    const { d, c, ro, upd } = K;
    const ed = d.edicao;
    const pickBtn = (label, cur, onclick, act) => h('button', { class: 'f5-pickbtn', disabled: ro, 'data-act': act, onclick }, cur ? h('b', {}, cur) : h('span', { class: 'muted' }, label), ic('chevron-down'));
    const sfx = (i) => (i ? '-' + i : '');
    const multi = d.classes.length > 1;
    // Uma linha por classe (Plano 52): classe, nível, subclasse, dado de vida; a primeira é a inicial (salvaguardas e PV cheio)
    const rows = d.classes.map((cl, i) => {
      const subAt = cl.subLevels && cl.subLevels.length ? cl.subLevels[0] : null;
      const cols = cl.name ? R.columnsAt(cl) : [];
      return h('div', { class: 'f5-clsrow', 'data-cls': i },
        h('div', { class: 'f5-grid5' },
          field(multi ? (i === 0 ? 'Classe inicial' : 'Classe ' + (i + 1)) : 'Classe', pickBtn('Escolher…', cl.name, () => F5.pick('classes', { edition: ed, filter: (r) => !d.classes.some((y, j) => j !== i && y.ref === r.id) }, (r) => upd((dd) => {
            const lv = dd.classes[i] ? dd.classes[i].level : 1;
            const prev = dd.classes[i] || {};
            dd.classes[i] = Object.assign(R.classFrom(r, lv), { rolls: prev.rolls });
            if (i === 0) {
              if (!Object.values(dd.saves).some(Boolean)) for (const sv of r.saves || []) dd.saves[sv] = true;
              applyProfs(dd, (r.proficiencies || []));
            } else applyProfs(dd, ((r.multiclass || {}).proficiencies || []));
            if (!dd.edicao && r.edition) dd.edicao = r.edition;
          })), 'pick-class' + sfx(i))),
          field('Nível', nin(cl.level, (v) => upd((dd) => { dd.classes[i].level = Math.max(1, Math.min(20, Math.round(v) || 1)); }), { disabled: ro, min: 1, max: 20, 'data-f': 'nivel' + sfx(i) })),
          field(cl.subTitle || 'Subclasse', pickBtn(subAt && cl.level < subAt ? 'No nível ' + subAt : 'Escolher…', cl.sub && cl.sub.name, () => {
            if (!cl.name) { U.toast('Escolha a classe primeiro.'); return; }
            F5.pick('subclasses', { filter: (r) => r.classId === cl.ref || (!cl.ref && r.className === cl.name), title: 'Subclasse de ' + cl.name }, (r) => upd((dd) => { dd.classes[i].sub = R.subFrom(r); }));
          }, 'pick-sub' + sfx(i))),
          field('Dado de vida', sel(cl.hd, { 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12' }, (v) => upd((dd) => { dd.classes[i].hd = num(v); }), { disabled: ro, 'data-f': 'hd' + sfx(i) })),
          multi && !ro ? h('div', { class: 'f5-clsrow-x' }, iconBtn('x', 'Tirar a classe ' + (cl.name || (i + 1)), () => {
            if (!confirm('Tirar ' + (cl.name || 'esta classe') + ' (nível ' + cl.level + ') da ficha? As características e magias que ela deu continuam na ficha; remova à mão o que não quiser.')) return;
            upd((dd) => { dd.classes.splice(i, 1); });
          }, { 'data-act': 'del-class' + sfx(i) })) : null),
        cols.length ? h('div', { class: 'f5-cols-cls' }, cols.map((x) => h('span', { class: 'chip' }, x.name + ': ', h('b', {}, x.value)))) : null);
    });
    return sec('scroll-text', 'Classe e origem', multi ? h('span', { class: 'muted small-text' }, 'nível ' + c.level + ' · dados de vida ' + c.hdTxt) : null,
      h('div', { class: 'f5-grid4' },
        field('Edição', sel(ed, { 2024: editionName('2024'), 2014: editionName('2014') }, (v) => upd((dd) => { dd.edicao = v; }), { disabled: ro, 'data-f': 'edicao' })),
        field('Espécie', pickBtn('Escolher…', d.especie && d.especie.name, () => F5.pick('species', { edition: ed }, (r) => upd((dd) => applySpecies(dd, r))), 'pick-species')),
        d.especie && d.especie.options && d.especie.options.length ? field(d.edicao === '2014' ? 'Sub-raça' : 'Linhagem', sel(d.especie.option || '', Object.assign({ '': 'Nenhuma' }, Object.fromEntries(d.especie.options.map((o) => [o, o]))),
          (v) => upd((dd) => { dd.especie.option = v; applySpeciesOption(dd, v); }), { disabled: ro, 'data-f': 'sp-opt' })) : null,
        field('Antecedente', pickBtn('Escolher…', d.antecedente && d.antecedente.name, () => F5.pick('backgrounds', { edition: ed }, (r) => upd((dd) => applyBackground(dd, r))), 'pick-bg'))),
      h('div', { class: 'f5-clsrows' }, rows,
        !ro && d.classes[0] && d.classes[0].name && c.level < 20 ? btnI('plus', 'Classe', { 'data-act': 'add-class', title: 'Multiclasse: outra classe com os níveis dela',
          onclick: () => F5.pick('classes', { edition: ed, filter: (r) => !d.classes.some((y) => y.ref === r.id), title: 'Multiclasse: escolher a classe nova' }, (r) => upd((dd) => {
            dd.classes.push(R.classFrom(r, 1));
            applyProfs(dd, ((r.multiclass || {}).proficiencies || []));
          })) }) : null),
      h('div', { class: 'f5-grid4' },
        field('Tendência', tin(d.tendencia, (v) => upd((dd) => { dd.tendencia = v; }), { disabled: ro, 'data-f': 'tendencia', placeholder: 'Neutro e Bom…' })),
        field('Experiência', nin(d.xp, (v) => upd((dd) => { dd.xp = v; }), { disabled: ro, 'data-f': 'xp' })),
        field('Tamanho', sel(d.tamanho, R.SIZES, (v) => upd((dd) => { dd.tamanho = v; }), { disabled: ro, 'data-f': 'tamanho' })),
        field('PV extra por nível', nin(d.hp.perLevel || 0, (v) => upd((dd) => { dd.hp.perLevel = v; }), { disabled: ro, 'data-f': 'hp-per', title: 'Ex.: Dwarven Toughness +1, Tough +2' })),
        field('CA sem armadura', sel(d.acMode || 'auto', R.AC_MODES, (v) => upd((dd) => { dd.acMode = v; }), { disabled: ro, 'data-f': 'acmode' }))),
      h('div', { class: 'f5-grid5' }, Object.entries(R.SPEEDS).map(([k, l]) => field(l + ' (m)', nin(d.speed[k] || '', (v) => upd((dd) => { dd.speed[k] = v; }), { disabled: ro, 'data-f': 'speed-' + k })))),
      !ro && (d.classes[0].name || d.especie || d.antecedente) ? h('div', { class: 'row wrap' },
        btnI('download', 'Trazer as características até o nível ' + c.level, { 'data-act': 'sync-feats', title: 'Adiciona em Características o que as classes, as subclasses, a espécie e o antecedente dão até o nível de cada uma (sem repetir)',
          onclick: () => upd((dd) => { const n = syncFeatures(dd); U.toast(n ? n + ' características adicionadas.' : 'Nada novo para adicionar.'); }) })) : null);
  }

  // Proficiências fixas de um cadastro (as escolhas ficam para quem preenche, ou para o assistente)
  function applyProfs(dd, list) {
    const add = (k, vals) => { const cur = String(dd.prof[k] || '').split(/\s*,\s*/).filter(Boolean); for (const v of vals) if (!cur.some((x) => x.toLowerCase() === String(v).toLowerCase())) cur.push(v); dd.prof[k] = cur.join(', '); };
    for (const p of list || []) {
      const fx = p.fixed || [];
      if (p.kind === 'skill') for (const s of fx) { const id = keyOf(s); if (R.SKILL[id] && !num(dd.skills[id])) dd.skills[id] = 1; }
      if (p.kind === 'armor') add('armor', fx);
      if (p.kind === 'weapon') add('weapons', fx);
      if (p.kind === 'tool') add('tools', fx);
      if (p.kind === 'language') add('langs', fx);
      if (p.kind === 'save') for (const s of fx) dd.saves[s] = true;
    }
  }
  function applyBenefits(dd, b) {
    if (!b) return;
    applyProfs(dd, b.proficiencies);
    for (const s of b.senses || []) if (s && s.type) dd.sentidos[s.type] = Math.max(num(dd.sentidos[s.type]), num(s.range));
    const addTxt = (k, vals) => { const cur = String(dd.defesas[k] || '').split(/\s*,\s*/).filter(Boolean); for (const v of vals) if (!cur.includes(v)) cur.push(v); dd.defesas[k] = cur.join(', '); };
    if (b.resist && b.resist.fixed) addTxt('resist', b.resist.fixed);
    if (b.immune && b.immune.fixed) addTxt('immune', b.immune.fixed);
    if (b.conditionImmune && b.conditionImmune.fixed) addTxt('cond', b.conditionImmune.fixed);
  }
  function applySpecies(dd, r) {
    dd.especie = { ref: r.id, name: r.name, source: r.source, option: '', options: (r.options || []).map((o) => o.name), traits: (r.traits || []).map((t) => ({ name: t.name, text: t.text })), optTraits: {} };
    for (const o of r.options || []) dd.especie.optTraits[o.name] = { traits: (o.traits || []).map((t) => ({ name: t.name, text: t.text })), removes: o.removes || [], speed: o.speed || null, benefits: o.benefits || null, size: o.size || null };
    if (r.speed) for (const [k, v] of Object.entries(r.speed)) if (num(v)) dd.speed[k] = num(v);
    if (r.size && r.size.length) dd.tamanho = r.size[0];
    applyBenefits(dd, r.benefits);
  }
  function applySpeciesOption(dd, name) {
    const o = dd.especie && dd.especie.optTraits && dd.especie.optTraits[name];
    if (!o) return;
    if (o.speed) for (const [k, v] of Object.entries(o.speed)) if (num(v)) dd.speed[k] = num(v);
    if (o.size && o.size.length) dd.tamanho = o.size[0];
    applyBenefits(dd, o.benefits);
  }
  function applyBackground(dd, r) {
    dd.antecedente = { ref: r.id, name: r.name, source: r.source, feature: r.feature ? { name: r.feature.name, text: r.feature.text } : null, feats: (r.feats || []).map((f) => ({ ref: f.feat, name: f.name + (f.choice ? ' (' + f.choice + ')' : '') })), characteristics: r.characteristics || null };
    applyBenefits(dd, r.benefits);
  }
  // Características da classe, subclasse, espécie e antecedente até o nível (sem repetir)
  function syncFeatures(dd) {
    const has = (src, name, lvl) => dd.caract.some((f) => f.source === src && f.name === name && num(f.level) === num(lvl));
    let n = 0;
    const add = (src, f, ref) => { if (has(src, f.name, f.level)) return; dd.caract.push({ id: U.uid('ft_'), source: src, name: f.name, level: num(f.level) || null, text: f.text || '', ref: ref || null }); n++; };
    for (const cl of dd.classes) {
      for (const f of cl.features || []) if (num(f.level) <= num(cl.level) && f.mark !== 'subclass') add('Classe', f, cl.ref);
      if (cl.sub) for (const f of cl.sub.features || []) if (num(f.level) <= num(cl.level)) add('Subclasse', f, cl.sub.ref);
    }
    if (dd.especie) {
      const o = dd.especie.option && dd.especie.optTraits ? dd.especie.optTraits[dd.especie.option] : null;
      for (const t of dd.especie.traits || []) if (!o || !(o.removes || []).includes(t.name)) add('Espécie', t, dd.especie.ref);
      if (o) for (const t of o.traits || []) add('Espécie', t, dd.especie.ref);
    }
    if (dd.antecedente && dd.antecedente.feature) add('Antecedente', dd.antecedente.feature, dd.antecedente.ref);
    dd.caract.sort((x, y) => SOURCES.indexOf(x.source) - SOURCES.indexOf(y.source) || num(x.level) - num(y.level));
    return n;
  }
  F5.syncFeatures = syncFeatures;
  Object.assign(F5, { applySpecies, applySpeciesOption, applyBackground, applyProfs, applyBenefits, keyOf });

  // ---------- Ações: ataques, recursos e descansos ----------
  function acoes(K, pane) {
    const { d, c, ro, upd, roll } = K;
    const rows = d.attacks.map((atk, i) => {
      const r = R.attackOf(c, atk), open = F5.open.has(atk.id);
      return h('div', { class: 'f5-atk' + (open ? ' open' : ''), 'data-atk': atk.id },
        h('div', { class: 'f5-atk-row' },
          K.ctx.use && !ro ? h('button', { class: 'btn small primary act-use', title: 'Usar na mesa: depois clique no alvo', 'data-use': i, onclick: () => K.ctx.use(i) }, ic('play')) : null,
          h('button', { class: 'f5-link f5-atk-name', onclick: () => { toggle(atk.id); K.ctx.rerender(); } }, ic(open ? 'chevron-down' : 'chevron-right'), atk.name),
          r.hasAttack ? h('button', { class: 'btn small f5-roll', title: 'Rolar o ataque', 'data-roll': 'atk', onclick: () => roll(atk.name + ': ataque', d20(r.hit)) }, sg(r.hit)) : null,
          (r.hasSave && !r.hasAttack) || atk.saveOnHit ? h('span', { class: 'chip' }, 'CD ' + r.dc + ' ' + R.AB_SH[(atk.save || {}).ability] || '') : null,
          r.dmg.length ? h('button', { class: 'btn small f5-roll', title: 'Rolar o dano', 'data-roll': 'dmg', onclick: () => roll(atk.name + ': dano', r.dmgFormula) }, r.dmgTxt) : null,
          r.heal ? h('button', { class: 'btn small f5-roll', title: 'Rolar a cura', onclick: () => roll(atk.name + ': cura', r.heal) }, r.heal + ' PV') : null,
          h('span', { class: 'muted small-text f5-atk-rng' }, R.reachTxt(atk)),
          !ro ? iconBtn('x', 'Remover ataque', () => upd((dd) => { dd.attacks.splice(i, 1); })) : null),
        open ? attackForm(K, atk, i, r) : null);
    });
    pane.append(sec('swords', 'Ataques e conjuração', !ro ? h('div', { class: 'row' },
      btnI('library', 'Do cadastro', { 'data-act': 'atk-cad', onclick: () => F5.pick('attacks', { edition: d.edicao, extra: { label: 'Esconder armas e magias (use o inventário e a aba Magias)', test: (r) => !r.weapon && r.origin !== 'spell' && r.origin !== 'weapon' } },
        (r) => upd((dd) => { dd.attacks.push(R.attackFromRecord(r)); })) }),
      btnI('plus', 'Em branco', { 'data-act': 'atk-new', onclick: () => upd((dd) => {
        const at = { id: U.uid('at_'), name: 'Novo ataque', type: 'melee', reach: 1.5, range: null, area: null, attack: { ability: 'str', bonus: 0, prof: 'prof' },
          save: { ability: 'dex', dc: 'calc', dcAbility: 'spell', dcBonus: 0, onSuccess: 'half' }, damage: [{ dice: '1d6', ability: 'str', type: 'bludgeoning' }], versatile: '', crit: 20, dmgBonus: 0 };
        dd.attacks.push(at); F5.open.add(at.id);
      }) })) : null,
    rows.length ? h('div', { class: 'f5-atks' }, rows) : h('p', { class: 'empty' }, 'Nenhum ataque. Armas do inventário e magias de ataque entram aqui sozinhas.'),
    h('p', { class: 'hint' }, 'Na mesa, cada ataque vira uma ação: o botão roxo pede o alvo, rola contra a CA e aplica o dano. Magias de 1º nível ou mais gastam um espaço.')));

    // Recursos (Rage, Ki, Channel Divinity…)
    const res = d.recursos.map((r, i) => h('div', { class: 'f5-res', 'data-res': i },
      tin(r.name, (v) => upd((dd) => { dd.recursos[i].name = v; }), { class: 'grow', disabled: ro, 'data-f': 'res-name-' + i, 'aria-label': 'Nome do recurso' }),
      iconBtn('minus', 'Gastar 1', () => upd((dd) => { dd.recursos[i].cur = Math.max(0, num(dd.recursos[i].cur) - 1); }), { disabled: ro }),
      nin(r.cur, (v) => upd((dd) => { dd.recursos[i].cur = v; }), { disabled: ro, 'data-f': 'res-cur-' + i, 'aria-label': 'Atual' }),
      h('span', { class: 'muted' }, '/'),
      nin(r.max, (v) => upd((dd) => { dd.recursos[i].max = v; }), { disabled: ro, 'data-f': 'res-max-' + i, 'aria-label': 'Máximo' }),
      iconBtn('plus', 'Recuperar 1', () => upd((dd) => { dd.recursos[i].cur = Math.min(num(dd.recursos[i].max), num(dd.recursos[i].cur) + 1); }), { disabled: ro }),
      sel(r.reset || 'long', RESETS, (v) => upd((dd) => { dd.recursos[i].reset = v; }), { disabled: ro, 'data-f': 'res-reset-' + i }),
      !ro ? iconBtn('x', 'Remover recurso', () => upd((dd) => { dd.recursos.splice(i, 1); })) : null));
    // Colunas da tabela da classe que são usos (Rages, Focus Points…), não contagens (Weapon Mastery, Cantrips Known…)
    const NOT_USES = /mastery|damage|known|cantrip|spell|slot|level|dice|die|bonus|invocation|prepared|sneak|movement|martial arts|infusion|metamagic|maneuver/i;
    const cols = d.classes[0] && d.classes[0].name ? R.columnsAt(d.classes[0]).filter((x) => /^\d+$/.test(x.value) && !NOT_USES.test(x.name) && !d.recursos.some((r) => r.name === x.name)) : [];
    pane.append(sec('gauge', 'Recursos', !ro ? h('div', { class: 'row' },
      cols.length ? btnI('download', 'Da tabela da classe', { 'data-act': 'res-cls', title: cols.map((x) => x.name + ' ' + x.value).join(', '),
        onclick: () => upd((dd) => { for (const x of cols) dd.recursos.push({ name: x.name, cur: num(x.value), max: num(x.value), reset: 'long' }); }) }) : null,
      btnI('plus', 'Recurso', { 'data-act': 'res-new', onclick: () => upd((dd) => { dd.recursos.push({ name: 'Novo recurso', cur: 1, max: 1, reset: 'long' }); }) })) : null,
    res.length ? h('div', { class: 'f5-res-list' }, res) : h('p', { class: 'empty' }, 'Usos que acabam e voltam no descanso: Rage, Ki, Channel Divinity, Second Wind…')));

    // Descansos e dados de vida
    const left = c.hdLeft.reduce((sum, x) => sum + x.left, 0);
    // Um botão por tipo de dado (multiclasse: d10 do Fighter, d6 do Wizard…)
    const spendBtns = c.hdLeft.map((x, j) => btnI('dices', 'Gastar d' + x.die + ' ' + sg(c.mod.con) + ' (' + x.left + ')', { disabled: ro || !x.left, 'data-act': j ? 'spend-hd-' + x.die : 'spend-hd', 'data-die': x.die, title: 'Gastar um dado de vida d' + x.die, onclick: () => {
      let r;
      try { r = App.Dice.roll('1d' + x.die + (c.mod.con ? (c.mod.con > 0 ? '+' : '-') + Math.abs(c.mod.con) : '')); } catch { return; }
      const gain = Math.max(0, r.total);
      roll('Dado de vida (d' + x.die + ')', String(gain));
      upd((dd, y) => { if (!R.spendHd(dd, x.die)) return; const b = (y.bars || []).find((z) => z.name === 'PV'); if (b) b.value = Math.min(num(b.max), num(b.value) + gain); });
    } }));
    pane.append(sec('moon', 'Descanso', null, h('div', { class: 'row wrap' },
      spendBtns,
      btnI('coffee', 'Descanso curto', { disabled: ro, 'data-act': 'short-rest', onclick: () => { upd((dd, x) => R.shortRest(x)); U.toast('Descanso curto: recursos de descanso curto e espaços de pacto recuperados.'); } }),
      btnI('moon', 'Descanso longo', { disabled: ro, 'data-act': 'long-rest', onclick: () => { upd((dd, x) => R.longRest(x)); U.toast('Descanso longo: PV, espaços, recursos e dados de vida recuperados.'); } })),
    h('p', { class: 'hint' }, 'Dados de vida restantes: ' + left + ' de ' + c.hdTotal + (c.hdLeft.length > 1 ? ' (' + c.hdLeft.map((x) => x.left + 'd' + x.die).join(' + ') + ')' : '') + '. No descanso longo voltam ' + (d.edicao === '2014' ? 'metade' : 'todos') + ' (regra de ' + editionName(d.edicao) + ').')));
  }
  function toggle(id) { if (F5.open.has(id)) F5.open.delete(id); else F5.open.add(id); }

  function attackForm(K, atk, i, r) {
    const { ro, upd } = K;
    const set = (fn) => upd((dd) => fn(dd.attacks[i]));
    const at = atk.attack || {}, sv = atk.save || {};
    const dmg = (atk.damage || []).map((x, j) => h('div', { class: 'f5-dmg' },
      tin(x.dice, (v) => set((a) => { a.damage[j].dice = v.trim(); }), { disabled: ro, placeholder: '1d8', 'data-f': 'atk-dice-' + j, 'aria-label': 'Dados' }),
      sel(x.ability || 'none', ATK_ABIL, (v) => set((a) => { a.damage[j].ability = v; }), { disabled: ro, 'aria-label': 'Atributo somado' }),
      sel(x.type || '', Object.assign({ '': 'Tipo' }, Object.fromEntries(DMG_TYPES.map((t) => [t, t]))), (v) => set((a) => { a.damage[j].type = v; }), { disabled: ro, 'aria-label': 'Tipo de dano' }),
      !ro ? iconBtn('x', 'Remover dano', () => set((a) => { a.damage.splice(j, 1); })) : null));
    const isAtk = R.HAS_ATTACK(atk.type);
    return h('div', { class: 'f5-atk-form' },
      h('div', { class: 'f5-grid4' },
        field('Nome', tin(atk.name, (v) => set((a) => { a.name = v.trim() || a.name; }), { disabled: ro, 'data-f': 'atk-name' })),
        field('Tipo', sel(atk.type, ATK_TYPES, (v) => set((a) => { a.type = v; }), { disabled: ro, 'data-f': 'atk-type' })),
        isAtk ? field('Atributo do ataque', sel(at.ability || 'str', ATK_ABIL, (v) => set((a) => { a.attack.ability = v; }), { disabled: ro, 'data-f': 'atk-ab' })) : null,
        isAtk ? field('Proficiência', sel(at.prof || 'prof', { prof: 'Proficiente', none: 'Sem proficiência', expert: 'Dobrada' }, (v) => set((a) => { a.attack.prof = v; }), { disabled: ro, 'data-f': 'atk-prof' })) : null,
        isAtk ? field('Bônus mágico no ataque', nin(at.bonus || 0, (v) => set((a) => { a.attack.bonus = v; }), { disabled: ro, 'data-f': 'atk-bonus' })) : null,
        field('Bônus no dano', nin(atk.dmgBonus || 0, (v) => set((a) => { a.dmgBonus = v; }), { disabled: ro, 'data-f': 'atk-dbonus' })),
        isAtk ? field('Crítico a partir de', nin(atk.crit || 20, (v) => set((a) => { a.crit = Math.max(2, Math.min(20, v || 20)); }), { disabled: ro, 'data-f': 'atk-crit' })) : null,
        atk.type === 'melee' ? field('Alcance (m)', nin(atk.reach || '', (v) => set((a) => { a.reach = v; }), { disabled: ro, 'data-f': 'atk-reach' }))
          : field('Distância (m)', nin(atk.range ? atk.range.normal : '', (v) => set((a) => { a.range = Object.assign({}, a.range || {}, { normal: v }); }), { disabled: ro, 'data-f': 'atk-range' })),
        atk.type === 'ranged' ? field('Distância longa (m)', nin(atk.range ? atk.range.long || '' : '', (v) => set((a) => { a.range = Object.assign({}, a.range || {}, { long: v }); }), { disabled: ro, 'data-f': 'atk-long' })) : null,
        atk.versatile !== undefined && (atk.type === 'melee') ? field('Versátil (duas mãos)', tin(atk.versatile || '', (v) => set((a) => { a.versatile = v.trim(); }), { disabled: ro, placeholder: '1d10', 'data-f': 'atk-vers' })) : null),
      !isAtk || atk.saveOnHit ? h('div', { class: 'f5-grid4' },
        field('Salvaguarda do alvo', sel(sv.ability || 'dex', R.AB_SH, (v) => set((a) => { a.save = Object.assign({}, a.save, { ability: v }); }), { disabled: ro, 'data-f': 'atk-sv' })),
        field('CD usa', sel(sv.dc === 'fixed' ? 'fixed' : sv.dcAbility || 'spell', Object.assign({ spell: 'Conjuração', fixed: 'CD fixa' }, R.AB_SH), (v) => set((a) => { a.save = Object.assign({}, a.save, v === 'fixed' ? { dc: 'fixed' } : { dc: 'calc', dcAbility: v }); }), { disabled: ro, 'data-f': 'atk-dcab' })),
        sv.dc === 'fixed' ? field('CD', nin(sv.dcFixed || 10, (v) => set((a) => { a.save.dcFixed = v; }), { disabled: ro, 'data-f': 'atk-dcfix' })) : field('Bônus na CD', nin(sv.dcBonus || 0, (v) => set((a) => { a.save.dcBonus = v; }), { disabled: ro, 'data-f': 'atk-dcb' })),
        field('Se passar', sel(sv.onSuccess || 'none', { half: 'Metade do dano', none: 'Nenhum dano' }, (v) => set((a) => { a.save.onSuccess = v; }), { disabled: ro, 'data-f': 'atk-onsave' }))) : null,
      h('div', { class: 'f5-sub' }, h('small', { class: 'muted' }, 'Dano'), dmg,
        !ro ? btnI('plus', 'Dano', { onclick: () => set((a) => { (a.damage = a.damage || []).push({ dice: '1d6', ability: 'none', type: '' }); }) }) : null),
      atk.cantrip ? h('p', { class: 'hint' }, 'Truque: o dado aumenta com o nível do personagem (' + Object.entries(atk.cantrip).map(([l, x]) => x + ' no ' + l).join(', ') + ').') : null,
      atk.perSlot ? h('p', { class: 'hint' }, 'Em espaço maior: +' + atk.perSlot + ' por nível acima do ' + atk.spellLevel + 'º.') : null,
      atk.props ? h('p', { class: 'hint' }, 'Propriedades: ' + atk.props) : null,
      field('Anotações', area(atk.notes || '', (v) => set((a) => { a.notes = v; }), { disabled: ro, rows: 2, 'data-f': 'atk-notes' })),
      atk.description ? h('details', {}, h('summary', {}, 'Texto do cadastro'), textView(atk.description)) : null);
  }

  // ---------- Magias ----------
  // Magia pertence a qual classe (multiclasse): s.cls; sem classe = a principal
  const spellOf = (sp, x, j) => sp.cls === x.name || (!sp.cls && j === 0);
  // Classe que fica com a magia nova: a primeira cuja lista tem a magia
  function spellClass(d, c, r) {
    const cs = c.casters || [];
    const hit = cs.find((x) => { const cl = d.classes[x.i] || {}; return (r.classes || []).includes(x.name) || (cl.sub && (r.subclasses || []).some((s2) => s2.endsWith(': ' + (cl.sub.shortName || cl.sub.name)))); });
    return (hit || cs[0] || {}).name || '';
  }
  function magias(K, pane) {
    const { d, c, ro, upd, roll } = K;
    const S = c.spell;
    const casters = c.casters && c.casters.length ? c.casters : [{ i: 0, name: '', abil: S.abil, key: '', dc: S.dc, atk: S.atk, cantrips: null, prepared: null, mode: '' }];
    const multi = casters.length > 1;
    const lists = d.classes.filter((x) => x.name);
    const inLists = (r) => lists.some((cl) => (r.classes || []).includes(cl.name) || (cl.sub && (r.subclasses || []).some((s2) => s2.endsWith(': ' + (cl.sub.shortName || cl.sub.name)))));
    // Um quadro por classe que conjura: atributo, CD, ataque, truques e preparadas (cada uma com o limite dela)
    const boxes = casters.map((x, j) => {
      const mine = d.magia.list.filter((sp) => !sp.always && spellOf(sp, x, j));
      const nC = mine.filter((sp) => sp.level === 0).length, nP = mine.filter((sp) => sp.level > 0 && sp.prepared).length;
      const auto = x.abil ? 8 + c.pb + c.mod[x.abil] : '—';
      return h('div', { class: 'f5-caster', 'data-caster': x.name || 'principal' },
        multi ? h('h4', {}, x.name) : null,
        h('div', { class: 'f5-boxes small' },
          j === 0 ? h('div', { class: 'f5-box' }, h('small', {}, 'Atributo'), sel(d.magia.abil || '', Object.assign({ '': x.abil && !d.magia.abil ? 'Da classe (' + R.AB_SH[x.abil] + ')' : 'Da classe' }, R.AB_SH), (v) => upd((dd) => { dd.magia.abil = v; }), { disabled: ro, 'data-f': 'sp-abil' }))
            : h('div', { class: 'f5-box' }, h('small', {}, 'Atributo'), h('b', {}, R.AB_SH[x.abil] || '—')),
          statBox(K, { key: 'spellDc' + x.key, label: 'CD de magia', value: x.dc == null ? '—' : x.dc, auto }),
          statBox(K, { key: 'spellAtk' + x.key, label: 'Ataque mágico', value: x.atk == null ? '—' : sg(x.atk), auto: x.abil ? sg(c.pb + c.mod[x.abil]) : '—', roll: x.atk == null ? null : () => roll('Ataque mágico' + (multi ? ' (' + x.name + ')' : ''), d20(x.atk)) }),
          x.cantrips != null ? h('div', { class: 'f5-box' + (nC > x.cantrips ? ' warn' : '') }, h('small', {}, 'Truques'), h('b', {}, nC + ' / ' + x.cantrips)) : null,
          x.prepared != null ? h('div', { class: 'f5-box' + (nP > x.prepared ? ' warn' : '') }, h('small', {}, x.mode === 'known' ? 'Conhecidas' : 'Preparadas'), h('b', {}, nP + ' / ' + x.prepared)) : null),
        adjForm(K, 'spellDc' + x.key, auto, 'CD de magia' + (multi ? ' (' + x.name + ')' : '')) || adjForm(K, 'spellAtk' + x.key, x.abil ? c.pb + c.mod[x.abil] : 0, 'Ataque mágico' + (multi ? ' (' + x.name + ')' : '')));
    });
    pane.append(sec('sparkles', 'Conjuração', !ro ? btnI('plus', 'Magia do cadastro', { class: 'btn small primary', 'data-act': 'spell-add', onclick: () => F5.pick('spells', {
      edition: d.edicao,
      extra: lists.length ? { label: 'Só das listas de ' + lists.map((cl) => cl.name + (cl.sub ? ' (' + (cl.sub.shortName || cl.sub.name) + ')' : '')).join(', '), test: inLists } : null,
    }, (r) => upd((dd) => addSpell(dd, r, '', spellClass(dd, R.calc({ dnd5e: dd, bars: [] }), r)))) }) : null,
    boxes,
    multi && S.casterLevel ? h('p', { class: 'hint' }, 'Multiclasse: os espaços saem da tabela de conjurador multiclasse (nível de conjurador ' + S.casterLevel + '). Cada magia usa a CD e o ataque da classe dela.') : null,
    !S.abil && !d.magia.list.length ? h('p', { class: 'hint' }, 'Esta classe não conjura magias. Magias de espécie, talento ou item entram aqui do mesmo jeito.') : null));

    for (let lv = 0; lv <= 9; lv++) {
      const list = d.magia.list.map((s, i) => [s, i]).filter(([s]) => s.level === lv);
      const max = lv ? S.slots[lv - 1] : 0;
      const pactHere = S.pact && S.pact.n > 0 && S.pact.level === lv;
      if (!list.length && !max && !pactHere) continue;
      const slotPips = (name, n, key) => {
        const b = K.bar(name), left = b ? num(b.value) : n;
        return h('div', { class: 'f5-slots', title: 'Espaços: ' + left + ' de ' + n + ' (clique para gastar ou recuperar)' },
          h('small', {}, key), Array.from({ length: n }, (_, j) => h('button', { class: 'f5-pip' + (j < left ? ' on' : ''), disabled: ro, 'data-slot': name + ':' + j,
            onclick: () => upd((dd, x) => K.setBar(x, name, j < left ? j : j + 1)) })),
          adjBtn(K, key === 'Pacto' ? 'pact' : 'slot' + lv, n, 'espaços'));
      };
      pane.append(sec(lv ? 'book-open' : 'wand', R.LEVEL_PT[lv], h('div', { class: 'row' },
        max ? slotPips(R.SLOT_BAR(lv), max, 'Espaços') : null,
        pactHere ? slotPips(R.PACT_BAR, S.pact.n, 'Pacto') : null),
      adjForm(K, 'slot' + lv, max, 'Espaços de ' + lv + 'º nível') || (pactHere ? adjForm(K, 'pact', S.pact.n, 'Espaços de pacto') : null),
      list.length ? h('div', { class: 'f5-spells' }, list.map(([s, i]) => spellRow(K, s, i))) : h('p', { class: 'empty' }, 'Nenhuma magia deste nível.')));
    }
    if (!d.magia.list.length && !S.slots.some((n) => n > 0)) pane.append(h('p', { class: 'empty' }, 'Nenhuma magia ainda. "Magia do cadastro" traz o texto completo e, se ela tiver ataque ou salvaguarda, o ataque pronto em Ações.'));
  }
  function addSpell(dd, r, from, cls) {
    const row = R.spellRow(r, from);
    if (cls) row.cls = cls;
    if (R.spellCanAttack(r)) { const at = R.attackFromSpell(r); if (cls) at.cls = cls; dd.attacks.push(at); row.atk = at.id; }
    dd.magia.list.push(row);
    dd.magia.list.sort((x, y) => x.level - y.level || x.name.localeCompare(y.name));
  }
  F5.addSpell = addSpell;
  function spellRow(K, s, i) {
    const { ro, upd, d } = K;
    const open = F5.open.has(s.id);
    const atk = s.atk ? d.attacks.find((x) => x.id === s.atk) : null;
    return h('div', { class: 'f5-spell' + (open ? ' open' : '') + (s.level && !s.prepared && !s.always ? ' unprep' : ''), 'data-spell': s.ref || s.id },
      h('div', { class: 'f5-spell-row' },
        s.level ? (s.always ? h('span', { class: 'f5-dot on ex', title: 'Sempre preparada' + (s.from ? ': ' + s.from : '') }) :
          h('button', { class: 'f5-dot' + (s.prepared ? ' on' : ''), disabled: ro, title: 'Preparada', 'data-prep': i, onclick: () => upd((dd) => { dd.magia.list[i].prepared = !dd.magia.list[i].prepared; }) })) : h('span', { class: 'f5-dot-sp' }),
        h('button', { class: 'f5-link f5-spell-name', onclick: () => { toggle(s.id); K.ctx.rerender(); } }, s.name),
        s.conc ? h('span', { class: 'tag', title: 'Concentração' }, 'C') : null,
        s.ritual ? h('span', { class: 'tag', title: 'Ritual' }, 'R') : null,
        s.from ? h('span', { class: 'muted small-text' }, s.from) : null,
        (K.c.casters || []).length > 1 && s.cls ? h('span', { class: 'tag f5-spcls', title: 'Classe que conjura' }, s.cls) : null,
        h('span', { class: 'grow' }),
        h('span', { class: 'muted small-text f5-spell-meta' }, [s.time, s.range].filter(Boolean).join(' · ')),
        atk ? h('button', { class: 'btn small ghost', title: 'Ver o ataque em Ações', onclick: () => { F5.tab[K.a.id] = 'acoes'; F5.open.add(atk.id); K.ctx.rerender(); } }, ic('swords')) : null,
        !ro ? iconBtn('x', 'Remover magia', () => upd((dd) => { const sp = dd.magia.list[i]; if (sp.atk) dd.attacks = dd.attacks.filter((x) => x.id !== sp.atk); dd.magia.list.splice(i, 1); })) : null),
      open ? h('div', { class: 'f5-spell-body' },
        h('div', { class: 'f5-kv' }, [['Escola', s.school], ['Tempo', s.time], ['Alcance', s.range], ['Componentes', s.comp], ['Duração', s.dur], ['Fonte', s.source]].filter((x) => x[1]).map(([k, v]) => h('span', {}, h('small', {}, k), v))),
        !ro ? h('div', { class: 'f5-grid3' },
          h('label', { class: 'check-row' }, chk(s.always, (v) => upd((dd) => { dd.magia.list[i].always = v; }), { 'data-f': 'sp-always-' + i }), 'Sempre preparada'),
          field('Origem', tin(s.from, (v) => upd((dd) => { dd.magia.list[i].from = v; }), { placeholder: 'Light Domain, Magic Initiate…', 'data-f': 'sp-from-' + i })),
          (K.c.casters || []).length > 1 ? field('Classe que conjura', sel(s.cls || (K.c.casters[0] || {}).name, Object.fromEntries(K.c.casters.map((x) => [x.name, x.name])), (v) => upd((dd) => {
            const sp = dd.magia.list[i]; sp.cls = v;
            const at = sp.atk && dd.attacks.find((x) => x.id === sp.atk); if (at) at.cls = v;
          }), { 'data-f': 'sp-cls-' + i })) : null) : null,
        textView(s.text)) : null);
  }

  // ---------- Inventário ----------
  function inventario(K, pane, root) {
    const { d, c, ro, upd } = K;
    const U2 = App.Units;
    const w = (kg) => (U2 ? U2.weight(kg) : kg + ' kg');
    pane.append(sec('coins', 'Moedas', null, h('div', { class: 'f5-coins' }, R.COINS.map(([k, sh, nm]) =>
      field(sh, nin(d.moedas[k] || 0, (v) => upd((dd) => { dd.moedas[k] = Math.max(0, v); }), { disabled: ro, title: 'Peças de ' + nm, 'data-f': 'coin-' + k }))))));
    const rows = d.itens.map((it, i) => {
      const open = F5.open.has(it.id);
      return {
        key: it.id, ref: it.ref || it.id, name: it.name, equipped: !!it.equipped,
        armor: it.armor ? (it.armor.type === 'shield' ? '+' : '') + (num(it.armor.ac) + num(it.armor.bonusAc)) : null,
        attuned: it.attune ? !!it.attuned : null, quantity: it.qty,
        weight: it.weight ? w(Math.round(num(it.weight) * num(it.qty, 1) * 100) / 100) : '—',
        changeEquipped: (checked) => upd((dd) => {
          const x = dd.itens[i]; x.equipped = checked;
          // Só uma armadura e um escudo vestidos.
          if (x.equipped && x.armor) for (const y of dd.itens) if (y !== x && y.equipped && y.armor && (y.armor.type === 'shield') === (x.armor.type === 'shield')) y.equipped = false;
        }),
        toggle: () => { toggle(it.id); K.ctx.rerender(); },
        changeAttuned: (checked) => upd((dd) => { dd.itens[i].attuned = checked; }),
        changeQuantity: (value) => upd((dd) => { dd.itens[i].qty = Math.max(0, num(value)); }),
        remove: () => upd((dd) => { const x = dd.itens[i]; dd.attacks = dd.attacks.filter((a) => a.itemRow !== x.id); dd.itens.splice(i, 1); }),
        details: open ? h('div', { class: 'f5-item-body' },
          h('div', { class: 'f5-grid4' },
            field('Nome', tin(it.name, (v) => upd((dd) => { dd.itens[i].name = v.trim() || dd.itens[i].name; }), { disabled: ro, 'data-f': 'it-name-' + i })),
            field('Peso por unidade (kg)', nin(it.weight || 0, (v) => upd((dd) => { dd.itens[i].weight = v; }), { disabled: ro, 'data-f': 'it-w-' + i, step: 0.1 })),
            field('Categoria', tin(it.category, (v) => upd((dd) => { dd.itens[i].category = v; }), { disabled: ro, 'data-f': 'it-cat-' + i })),
            h('label', { class: 'check-row' }, chk(it.attune, (v) => upd((dd) => { dd.itens[i].attune = v; if (!v) dd.itens[i].attuned = false; }), { disabled: ro }), 'Pede sintonia')),
          it.armor ? h('div', { class: 'f5-grid4' },
            field('Tipo', sel(it.armor.type, { light: 'Leve', medium: 'Média', heavy: 'Pesada', shield: 'Escudo' }, (v) => upd((dd) => { dd.itens[i].armor.type = v; }), { disabled: ro })),
            field('CA', nin(it.armor.ac, (v) => upd((dd) => { dd.itens[i].armor.ac = v; }), { disabled: ro, 'data-f': 'it-ac-' + i })),
            field('Bônus mágico', nin(it.armor.bonusAc || 0, (v) => upd((dd) => { dd.itens[i].armor.bonusAc = v; }), { disabled: ro, 'data-f': 'it-acb-' + i })),
            field('Limite de Des', tin(it.armor.dexMax == null ? '' : it.armor.dexMax, (v) => upd((dd) => { dd.itens[i].armor.dexMax = v === '' ? null : num(v); }), { disabled: ro, placeholder: 'sem limite', 'data-f': 'it-dex-' + i }))) : null,
          field('Anotações', area(it.notes || '', (v) => upd((dd) => { dd.itens[i].notes = v; }), { disabled: ro, rows: 2, 'data-f': 'it-notes-' + i })),
          it.text ? textView(it.text) : null) : null,
      };
    });
    const list = h('div');
    if (rows.length) mountPart(root, InventoryItems, list, { rows, readonly: ro, removeIcon: App.Icons.svg('x') });
    pane.append(sec('backpack', 'Equipamento', !ro ? h('div', { class: 'row' },
      btnI('library', 'Item do cadastro', { class: 'btn small primary', 'data-act': 'item-add', onclick: () => F5.pick('items', { edition: d.edicao, filter: (r) => r.kind !== 'family' && r.kind !== 'group' }, (r) => upd((dd) => addItem(dd, r))) }),
      btnI('plus', 'Item livre', { 'data-act': 'item-new', onclick: () => upd((dd) => { const it = { id: U.uid('it_'), name: 'Novo item', qty: 1, weight: 0, category: '', equipped: false, attuned: false, attune: false, armor: null, text: '' }; dd.itens.push(it); F5.open.add(it.id); }) })) : null,
    h('div', { class: 'f5-boxes small' },
      h('div', { class: 'f5-box' + (c.weight > c.capacity ? ' warn' : ''), 'data-box': 'carry' }, h('small', {}, 'Carga'), h('b', {}, w(c.weight)), h('span', { class: 'f5-box-sub' }, 'de ' + w(c.capacity)), adjBtn(K, 'carry', c.score.str * 7.5, 'capacidade')),
      h('div', { class: 'f5-box' + (c.attuned > 3 ? ' warn' : '') }, h('small', {}, 'Sintonia'), h('b', {}, c.attuned + ' / 3'))),
    adjForm(K, 'carry', c.score.str * 7.5, 'Capacidade de carga (kg)'),
    rows.length ? list : h('p', { class: 'empty' }, 'Nada no inventário. Armas do cadastro já criam o ataque; armaduras e escudos vestidos contam na CA.')));
  }
  function addItem(dd, r) {
    const row = R.itemRow(r);
    dd.itens.push(row);
    if (r.weapon && r.weapon.damage) { const at = R.attackFromItem(r); at.itemRow = row.id; dd.attacks.push(at); }
    if (r.armor && !dd.itens.some((y) => y !== row && y.equipped && y.armor && (y.armor.type === 'shield') === (r.armor.type === 'shield'))) row.equipped = true;
  }
  F5.addItem = addItem;

  // ---------- Características e talentos ----------
  function caract(K, pane) {
    const { d, ro, upd } = K;
    const featRow = (f, i, list) => {
      const open = F5.open.has(f.id);
      return h('div', { class: 'f5-feat' + (open ? ' open' : ''), 'data-feat': f.name },
        h('div', { class: 'f5-feat-row' },
          h('button', { class: 'f5-link grow', onclick: () => { toggle(f.id); K.ctx.rerender(); } }, ic(open ? 'chevron-down' : 'chevron-right'), f.name),
          f.level ? h('span', { class: 'muted small-text' }, 'nível ' + f.level) : null,
          !ro ? iconBtn('x', 'Remover', () => upd((dd) => { dd[list].splice(i, 1); })) : null),
        open ? h('div', { class: 'f5-feat-body' },
          !ro ? h('div', { class: 'f5-grid3' },
            field('Nome', tin(f.name, (v) => upd((dd) => { dd[list][i].name = v.trim() || dd[list][i].name; }), { 'data-f': list + '-name-' + i })),
            list === 'caract' ? field('Origem', sel(f.source || 'Outro', Object.fromEntries(SOURCES.map((s) => [s, s])), (v) => upd((dd) => { dd.caract[i].source = v; }), { 'data-f': 'ft-src-' + i })) : null,
            list === 'caract' ? field('Nível', nin(f.level || '', (v) => upd((dd) => { dd.caract[i].level = v || null; }), { 'data-f': 'ft-lv-' + i })) : null) : null,
          !ro ? field('Texto', area(f.text, (v) => upd((dd) => { dd[list][i].text = v; }), { rows: 6, 'data-f': list + '-text-' + i })) : textView(f.text)) : null);
    };
    for (const src of SOURCES) {
      const L = d.caract.map((f, i) => [f, i]).filter(([f]) => (f.source || 'Outro') === src);
      if (!L.length) continue;
      pane.append(sec(src === 'Classe' ? 'shield' : src === 'Subclasse' ? 'git-branch' : src === 'Espécie' ? 'footprints' : src === 'Antecedente' ? 'scroll-text' : 'star', src, null,
        h('div', { class: 'f5-feats' }, L.map(([f, i]) => featRow(f, i, 'caract')))));
    }
    if (!d.caract.length) pane.append(h('p', { class: 'empty' }, 'Nenhuma característica. Escolha a classe, a espécie e o antecedente em Principal e use "Trazer as características".'));
    if (!ro) pane.append(h('div', { class: 'row wrap' }, btnI('plus', 'Característica', { 'data-act': 'feat-new', onclick: () => upd((dd) => { const f = { id: U.uid('ft_'), source: 'Outro', name: 'Nova característica', level: null, text: '' }; dd.caract.push(f); F5.open.add(f.id); }) })));
    // Talentos
    const bgFeats = d.antecedente && d.antecedente.feats ? d.antecedente.feats.filter((f) => !d.talentos.some((t) => t.ref === f.ref)) : [];
    pane.append(sec('award', 'Talentos', !ro ? h('div', { class: 'row' },
      bgFeats.length ? btnI('download', 'Do antecedente: ' + bgFeats.map((f) => f.name).join(', '), { 'data-act': 'feat-bg', onclick: async () => {
        const recs = await Promise.all(bgFeats.map((f) => App.Dados5e.get('feats', f.ref)));
        upd((dd) => { bgFeats.forEach((f, j) => { const r = recs[j]; dd.talentos.push({ id: U.uid('tl_'), ref: f.ref, name: f.name, source: r ? r.source : '', text: r ? r.description || '' : '' }); }); });
      } }) : null,
      btnI('library', 'Talento do cadastro', { 'data-act': 'feat-add', onclick: () => F5.pick('feats', { edition: d.edicao }, (r) => upd((dd) => { dd.talentos.push({ id: U.uid('tl_'), ref: r.id, name: r.name, source: r.source, text: r.description || '' }); })) })) : null,
    d.talentos.length ? h('div', { class: 'f5-feats' }, d.talentos.map((f, i) => featRow(Object.assign({ id: f.id || 'tl' + i }, f), i, 'talentos'))) : h('p', { class: 'empty' }, 'Nenhum talento.')));
  }

  // ---------- Biografia ----------
  function bio(K, pane) {
    const { d, ro, upd } = K;
    const B = d.bio;
    const t = (k, label, rows, ph) => field(label, area(B[k], (v) => upd((dd) => { dd.bio[k] = v; }), { disabled: ro, rows: rows || 3, placeholder: ph || '', 'data-f': 'bio-' + k }));
    const s = (k, label) => field(label, tin(B[k], (v) => upd((dd) => { dd.bio[k] = v; }), { disabled: ro, 'data-f': 'bio-' + k }));
    pane.append(sec('user-round', 'Aparência', null, h('div', { class: 'f5-grid4' }, s('idade', 'Idade'), s('altura', 'Altura'), s('peso', 'Peso'), s('olhos', 'Olhos'), s('pele', 'Pele'), s('cabelo', 'Cabelo')),
      t('aparencia', 'Descrição', 3)));
    // As tabelas do antecedente (2014) sugerem; clicar copia para o campo
    const ch = d.antecedente && d.antecedente.characteristics;
    const sug = (k, re) => {
      const tb = ch && (ch.tables || []).find((x) => re.test(x.name || ''));
      if (!tb || ro) return null;
      return h('details', { class: 'f5-sug' }, h('summary', {}, 'Sugestões do antecedente (d' + tb.die + ')'),
        h('div', {}, (tb.rows || []).map((r, j) => h('button', { class: 'f5-link', onclick: () => upd((dd) => { dd.bio[k] = (dd.bio[k] ? dd.bio[k] + '\n' : '') + (Array.isArray(r) ? r[r.length - 1] : r); }) }, (j + 1) + '. ' + (Array.isArray(r) ? r[r.length - 1] : r)))));
    };
    pane.append(sec('heart', 'Personalidade', null,
      h('div', { class: 'f5-grid2' },
        h('div', {}, t('personalidade', 'Traços de personalidade'), sug('personalidade', /personality/i)),
        h('div', {}, t('ideais', 'Ideais'), sug('ideais', /ideal/i)),
        h('div', {}, t('vinculos', 'Vínculos'), sug('vinculos', /bond/i)),
        h('div', {}, t('defeitos', 'Defeitos'), sug('defeitos', /flaw/i)))));
    pane.append(sec('book-open', 'História', null, t('historia', 'História do personagem', 8), t('aliados', 'Aliados e organizações', 3), t('notas', 'Anotações', 5)));
  }

  // ====================== Ficha de criatura (Plano 53): bloco de estatísticas, modelo NPC do Roll20 ======================
  const NPC_TABS = [['bloco', 'scroll-text', 'Bloco'], ['desc', 'file-text', 'Descrição'], ['config', 'settings-2', 'Configurar']];
  const SAVE_PT = { str: 'For', dex: 'Des', con: 'Con', int: 'Int', wis: 'Sab', cha: 'Car' };
  const DMG_PT = { acid: 'ácido', bludgeoning: 'concussão', cold: 'frio', fire: 'fogo', force: 'energia', lightning: 'elétrico', necrotic: 'necrótico', piercing: 'perfurante', poison: 'veneno', psychic: 'psíquico', radiant: 'radiante', slashing: 'cortante', thunder: 'trovejante' };
  const PLACE = { trait: 'traits', action: 'actions', bonus: 'bonus', reaction: 'reactions', legendary: 'legendary', mythic: 'mythic' };
  const mt = (m) => (App.Units ? App.Units.dist(num(m)) : num(m) + ' m');
  F5.npcEdit = {};
  F5.spellText = {};
  function npcRender(a, ctx, K) {
    const tab = NPC_TABS.some((t) => t[0] === F5.tab[a.id]) ? F5.tab[a.id] : 'bloco';
    const root = h('div', { class: 'f5 f5-npc' + (ctx.wide ? ' wide' : '') });
    root.append(npcTop(K));
    tabsPart(root, NPC_TABS, tab, (id) => { F5.tab[a.id] = id; ctx.rerender(); });
    const pane = h('div', { class: 'f5-pane' });
    if (tab === 'bloco') (F5.npcEdit[a.id] ? npcEditor : npcBlock)(K, pane);
    if (tab === 'desc') npcDesc(K, pane);
    if (tab === 'config' && ctx.config) pane.append(ctx.config());
    root.append(pane);
    return root;
  }
  const crLabel = (n, c) => (n.cr || '0') + ' (' + Number(c.xp || 0).toLocaleString('pt-BR') + ' XP)' + (n.crNote && n.crNote !== String(n.cr) ? ' · ' + n.crNote : '');
  function speedLine(n) {
    if (n.speedText) return n.speedText;
    const L = [];
    for (const [k, l] of Object.entries(R.SPEEDS)) if (num(n.speed[k])) L.push((k === 'walk' ? '' : l.toLowerCase() + ' ') + mt(n.speed[k]) + (k === 'fly' && n.speed.hover ? ' (pairar)' : ''));
    return L.join(', ') || '—';
  }
  function rollHp(K) {
    const n = K.d.npc;
    if (!n.hpFormula) { U.toast('Sem fórmula de PV.'); return; }
    let r; try { r = App.Dice.roll(String(n.hpFormula).replace(/\s+/g, '')); } catch (e) { U.toast('Fórmula de PV inválida: ' + e.message, 'error'); return; }
    K.roll('PV (' + n.hpFormula + ')', String(r.total));
    K.upd((dd, x) => { dd.npc.hp = Math.max(1, r.total); R.apply(x); const b = (x.bars || []).find((y) => y.name === 'PV'); if (b) b.value = b.max; });
  }
  function npcTop(K) {
    const { a, d, c, ro } = K, n = d.npc;
    const pv = K.bar('PV') || { value: c.hpMax, max: c.hpMax };
    const pct = pv.max > 0 ? Math.max(0, Math.min(100, (pv.value / pv.max) * 100)) : 0;
    const hpIn = h('input', { class: 'f5-hp-cur num', value: pv.value, disabled: ro, 'data-f': 'f5-hp', title: 'PV atual · aceita +5, -7 ou -2d6 (o dano gasta primeiro os PV temporários)',
      onchange: (e) => {
        const s2 = String(e.target.value).trim(); if (!s2) return;
        let v; try { v = /d/i.test(s2) ? App.Dice.roll(s2.replace(/^[+-]/, '')).total * (s2[0] === '-' ? -1 : 1) : num(s2, NaN); } catch { v = NaN; }
        if (!Number.isFinite(v)) { U.toast('Valor inválido', 'error'); return; }
        K.upd((dd, x) => {
          const b = (x.bars || []).find((y) => y.name === 'PV'); if (!b) return;
          if (/^[+-]/.test(s2)) {
            if (v < 0 && num(dd.hp.temp) > 0) { const t = Math.min(num(dd.hp.temp), -v); dd.hp.temp = num(dd.hp.temp) - t; v += t; }
            b.value = Math.max(0, Math.min(num(b.max), num(b.value) + v));
          } else b.value = Math.max(0, Math.min(num(b.max), v));
        });
      } });
    return h('div', { class: 'f5-top' },
      h('div', { class: 'f5-who' }, K.ctx.avatar ? K.ctx.avatar(72) : null,
        h('div', { class: 'grow f5-who-txt' },
          h('input', { class: 'f5-name sheet-name', value: a.name, disabled: ro, 'data-f': 'f5-nome', 'aria-label': 'Nome', onchange: (e) => K.ctx.edit((x) => { x.name = e.target.value.trim() || x.name; }) }),
          h('div', { class: 'f5-cls f5-npc-type' }, h('i', {}, [n.size, n.type].filter(Boolean).join(' ') + (n.align ? ', ' + n.align : ''))),
          h('div', { class: 'f5-origin muted' }, 'ND ' + crLabel(n, c)))),
      h('div', { class: 'f5-boxes' },
        statBox(K, { key: 'ac', label: 'CA', value: c.ac, auto: c.acAuto, title: n.acNote || '', sub: n.acNote ? n.acNote.replace(/^\(|\)$/g, '') : '' }),
        statBox(K, { key: 'init', label: 'Iniciativa', value: sg(c.init), auto: sg(c.mod.dex), roll: () => K.roll('Iniciativa', d20(c.init)) }),
        h('div', { class: 'f5-box' }, h('small', {}, 'Deslocamento'), h('b', { class: 'f5-box-txt' }, n.speed && num(n.speed.walk) ? mt(n.speed.walk) : '—'), h('span', { class: 'f5-box-sub' }, speedLine(n).split(', ').slice(1).join(', '))),
        statBox(K, { key: 'pb', label: 'Proficiência', value: sg(c.pb), auto: sg(R.crPb(n.cr)) }),
        h('div', { class: 'f5-box f5-hp' + (R.isAdj(d, 'hpMax') ? ' adj' : ''), 'data-box': 'hp' },
          h('small', {}, 'Pontos de vida'),
          h('div', { class: 'f5-hp-row' }, hpIn, h('span', { class: 'muted' }, '/ ' + c.hpMax), adjBtn(K, 'hpMax', c.hpAuto, 'PV máximo'),
            !ro && n.hpFormula ? iconBtn('dices', 'Rolar PV (' + n.hpFormula + ')', () => rollHp(K), { 'data-act': 'roll-hp' }) : null),
          h('div', { class: 'meter' }, h('div', { style: { width: pct + '%', background: pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--warn)' : 'var(--danger)' } })),
          h('label', { class: 'f5-temp' }, 'Temp.', nin(d.hp.temp || 0, (v) => K.upd((dd) => { dd.hp.temp = Math.max(0, v); }), { disabled: ro, 'data-f': 'f5-temp' })))),
      adjForm(K, 'ac', c.acAuto, 'CA') || adjForm(K, 'init', c.mod.dex, 'Iniciativa') || adjForm(K, 'pb', R.crPb(n.cr), 'Proficiência') || adjForm(K, 'hpMax', c.hpAuto, 'PV máximo'));
  }
  // Linha do bloco: "Classe de Armadura 25 (armadura natural)"
  const sbLine = (label, ...val) => h('div', { class: 'f5-sb-line' }, h('b', {}, label + ' '), ...val);
  const rollChip = (label, title, onclick, attrs = {}) => h('button', Object.assign({ class: 'f5-rchip', title, onclick }, attrs), label);
  function npcBlock(K, pane) {
    const { a, d, c, ro, upd, roll } = K, n = d.npc;
    const sb = h('div', { class: 'f5-sb' });
    sb.append(h('div', { class: 'f5-sb-head' }, h('span', { class: 'grow' }),
      !ro ? btnI('pen-line', 'Editar o bloco', { 'data-act': 'npc-edit', onclick: () => { F5.npcEdit[a.id] = true; K.ctx.rerender(); } }) : null));
    sb.append(sbLine('Classe de Armadura', String(c.ac) + (n.acNote ? ' ' + n.acNote : '')),
      sbLine('Pontos de Vida', String(c.hpMax) + (n.hpFormula ? ' (' + n.hpFormula + ')' : ''), !ro && n.hpFormula ? rollChip('rolar', 'Rolar o PV pela fórmula', () => rollHp(K), { 'data-act': 'roll-hp2' }) : null),
      sbLine('Deslocamento', speedLine(n)),
      sbLine('Iniciativa', rollChip(sg(c.init), 'Rolar iniciativa', () => roll('Iniciativa', d20(c.init)))));
    sb.append(h('hr'));
    sb.append(h('div', { class: 'f5-sb-abils' }, R.AB.map((k) => h('div', { class: 'f5-sb-ab', 'data-abil': k },
      h('small', {}, R.AB_SH[k]),
      h('button', { class: 'f5-sb-mod', title: 'Teste de ' + R.AB_PT[k], 'data-roll': 'abil-' + k, onclick: () => roll('Teste de ' + R.AB_PT[k], d20(c.mod[k])) }, num(d.abil[k], 10) + ' (' + sg(c.mod[k]) + ')'),
      h('button', { class: 'f5-sb-save' + (c.save[k].prof ? ' on' : ''), title: 'Salvaguarda de ' + R.AB_PT[k], 'data-save': k, onclick: () => roll('Salvaguarda de ' + R.AB_PT[k], d20(c.save[k].v)) }, 'salv. ' + sg(c.save[k].v))))));
    sb.append(h('hr'));
    const saves = R.AB.filter((k) => c.save[k].prof);
    if (saves.length) sb.append(sbLine('Salvaguardas', ...saves.map((k) => rollChip(SAVE_PT[k] + ' ' + sg(c.save[k].v), 'Rolar a salvaguarda de ' + R.AB_PT[k], () => roll('Salvaguarda de ' + R.AB_PT[k], d20(c.save[k].v)), { 'data-sv': k }))));
    const skills = R.SKILLS.filter(([id]) => n.skills[id] != null && n.skills[id] !== '');
    if (skills.length) sb.append(sbLine('Perícias', ...skills.map(([id, pt]) => rollChip(pt + ' ' + sg(c.skill[id].v), 'Rolar ' + pt, () => roll(pt, d20(c.skill[id].v)), { 'data-sk': id }))));
    if (n.vuln) sb.append(sbLine('Vulnerabilidades a dano', n.vuln));
    if (n.resist) sb.append(sbLine('Resistências a dano', n.resist));
    if (n.immune) sb.append(sbLine('Imunidades a dano', n.immune));
    if (n.condImmune) sb.append(sbLine('Imunidades a condições', n.condImmune));
    sb.append(sbLine('Sentidos', [n.senses, 'Percepção passiva ' + c.passive.perception].filter(Boolean).join(', ')));
    sb.append(sbLine('Idiomas', n.langs || '—'));
    if (n.gear) sb.append(sbLine('Equipamento', n.gear));
    sb.append(sbLine('Desafio', crLabel(n, c), h('span', { class: 'muted' }, ' · Proficiência ' + sg(c.pb))));
    // Seções: Traços, Ações, Ações bônus, Reações, Lendárias, Míticas, Covil (com a conjuração no lugar dela)
    for (const [key, title] of R.NPC_LISTS) {
      const items = n[key] || [];
      const casts = n.spellcasting.map((sc, i) => [sc, i]).filter(([sc]) => (PLACE[sc.place] || 'traits') === key);
      const head = key === 'legendary' ? n.legendaryText : key === 'mythic' ? n.mythicText : key === 'lair' ? n.lairText : '';
      if (!items.length && !casts.length) continue;
      const sec2 = h('div', { class: 'f5-sb-sec', 'data-sec': key }, h('h4', {}, title,
        key === 'legendary' && n.legendaryCount ? h('span', { class: 'f5-sb-pips', title: 'Ações lendárias usadas nesta rodada' }, ' ', Array.from({ length: n.legendaryCount }, (_, j) => h('button', { class: 'f5-pip' + (j < n.legendaryCount - num(n.legendaryUsed) ? ' on' : ''), disabled: ro, 'data-leg': j,
          onclick: () => upd((dd) => { const left = dd.npc.legendaryCount - num(dd.npc.legendaryUsed); dd.npc.legendaryUsed = dd.npc.legendaryCount - (j < left ? j : j + 1); }) })), h('small', { class: 'muted' }, ' ' + (n.legendaryCount - num(n.legendaryUsed)) + ' de ' + n.legendaryCount)) : null));
      if (head) sec2.append(h('p', { class: 'f5-sb-intro' }, head));
      for (const [sc, i] of casts) sec2.append(npcSpellcasting(K, sc, i));
      items.forEach((x, i) => sec2.append(npcItemView(K, key, x, i)));
      sb.append(sec2);
    }
    pane.append(h('section', { class: 'f5-sec f5-sb-wrap' }, sb));
    if (n.extra && n.extra.length) pane.append(h('p', { class: 'hint' }, 'Ações feitas à mão antes da conversão continuam na mesa: ' + n.extra.map((x) => x.name).join(', ') + '.'));
  }
  // Um traço ou ação do bloco, com os números clicáveis
  function npcItemView(K, key, x, i) {
    const { ro, upd, roll } = K;
    const set = (fn) => upd((dd) => fn(dd.npc[key][i]));
    const parts = (x.dmg || []).filter((p) => p && p.dice);
    const main = parts.filter((p) => !p.cond), cond = parts.filter((p) => p.cond);
    const dmgF = main.map((p) => p.dice).join('+');
    const dmgTxt = main.map((p) => p.dice + (p.type ? ' ' + (DMG_PT[p.type] || p.type) : '')).join(' + ');
    const idx = (K.a.actions || []).findIndex((y) => y.from5e === x.id);
    const btns = [];
    if (K.ctx.use && !ro && idx >= 0) btns.push(h('button', { class: 'btn small primary act-use', title: 'Usar na mesa: depois clique no alvo', 'data-use': idx, onclick: () => K.ctx.use(idx) }, ic('play')));
    if (x.kind === 'attack') btns.push(rollChip(sg(num(x.hit)), 'Rolar o ataque', () => roll(x.name + ': ataque', d20(num(x.hit))), { 'data-roll': 'atk' }));
    if (x.dc) btns.push(rollChip('CD ' + x.dc + (x.save ? ' ' + (SAVE_PT[x.save] || x.save) : ''), 'Salvaguarda do alvo' + (x.onSave === 'half' ? ' (metade se passar)' : '')));
    if (dmgF) btns.push(rollChip(dmgTxt, 'Rolar o dano', () => roll(x.name + ': dano', dmgF), { 'data-roll': 'dmg' }));
    for (const p of cond) btns.push(rollChip('+' + p.dice + (p.type ? ' ' + (DMG_PT[p.type] || p.type) : '') + ' (condição)', 'Dano que só vale na condição do texto', () => roll(x.name + ': dano extra', p.dice)));
    if (x.reach) btns.push(h('span', { class: 'muted small-text' }, 'alcance ' + mt(x.reach)));
    if (x.range && x.range.normal) btns.push(h('span', { class: 'muted small-text' }, 'distância ' + mt(x.range.normal) + (x.range.long ? ' / ' + mt(x.range.long) : '')));
    if (x.recharge) btns.push(rollChip('Recarga ' + x.recharge + (x.recharge < 6 ? '–6' : ''), 'Rolar a recarga (1d6)', () => {
      let r; try { r = App.Dice.roll('1d6'); } catch { return; }
      const ok2 = r.total >= x.recharge;
      roll(x.name + ': recarga ' + (ok2 ? '(recarregou)' : '(não recarregou)'), String(r.total));
      set((y) => { y.used = !ok2; });
    }, { 'data-act': 'recharge' }), h('label', { class: 'check-row small-text' }, chk(x.used, (v) => set((y) => { y.used = v; }), { disabled: ro }), 'usada'));
    const pips = x.uses && num(x.uses.max) ? h('span', { class: 'f5-sb-pips', title: 'Usos: ' + num(x.uses.cur) + ' de ' + num(x.uses.max) }, Array.from({ length: num(x.uses.max) }, (_, j) => h('button', { class: 'f5-pip' + (j < num(x.uses.cur) ? ' on' : ''), disabled: ro, 'data-use-pip': x.id + ':' + j,
      onclick: () => set((y) => { y.uses.cur = j < num(y.uses.cur) ? j : j + 1; }) }))) : null;
    return h('div', { class: 'f5-sb-item' + (x.used ? ' used' : ''), 'data-item5': x.id },
      h('p', {}, h('b', {}, h('i', {}, x.name + (x.cost && !/cost/i.test(x.name) ? ' (custa ' + x.cost + ')' : '') + '.')), ' ', pips, ' ', x.text),
      btns.length ? h('div', { class: 'f5-sb-btns' }, btns) : null);
  }
  // Conjuração da criatura: atributo, CD, ataque; grupos com usos ou espaços; cada magia abre o texto do cadastro
  function npcSpellcasting(K, sc, i) {
    const { ro, upd, roll, c } = K;
    const dc = sc.dc != null && sc.dc !== '' ? num(sc.dc) : sc.ability ? 8 + c.pb + c.mod[sc.ability] : null;
    const atk = sc.atk != null && sc.atk !== '' ? num(sc.atk) : sc.ability ? c.pb + c.mod[sc.ability] : null;
    const setG = (gi, fn) => upd((dd) => fn(dd.npc.spellcasting[i].groups[gi]));
    const box = h('div', { class: 'f5-sb-item f5-sb-cast', 'data-cast': i },
      h('p', {}, h('b', {}, h('i', {}, sc.name + '.')), ' ', sc.text),
      h('div', { class: 'f5-sb-btns' },
        sc.ability ? h('span', { class: 'muted small-text' }, R.AB_PT[sc.ability]) : null,
        dc != null ? rollChip('CD ' + dc, 'CD das magias') : null,
        atk != null ? rollChip(sg(atk) + ' ataque', 'Rolar ataque mágico', () => roll(sc.name + ': ataque mágico', d20(atk))) : null));
    (sc.groups || []).forEach((g, gi) => {
      const pool = g.slots || g.uses;
      box.append(h('div', { class: 'f5-sb-spg' },
        h('b', {}, g.label + (g.slots ? ' (' + num(g.slots.max) + ' espaços)' : '') + ':'), ' ',
        pool && num(pool.max) ? h('span', { class: 'f5-sb-pips' }, Array.from({ length: num(pool.max) }, (_, j) => h('button', { class: 'f5-pip' + (j < num(pool.cur) ? ' on' : ''), disabled: ro, 'data-sp-pip': gi + ':' + j,
          onclick: () => setG(gi, (gg) => { const p = gg.slots || gg.uses; p.cur = j < num(p.cur) ? j : j + 1; }) })), ' ') : null,
        (g.spells || []).map((sp, si) => {
          const key = 'npcsp:' + (sp.ref || sp.name);
          return h('button', { class: 'f5-sb-spell' + (F5.open.has(key) ? ' on' : ''), title: sp.ref ? 'Ver o texto da magia (cadastro)' : 'Magia sem ligação no cadastro', 'data-spell5': sp.ref || sp.name,
            onclick: () => {
              toggle(key);
              if (sp.ref && F5.open.has(key) && !F5.spellText[sp.ref]) App.Dados5e.get('spells', sp.ref).then((r) => { F5.spellText[sp.ref] = r || { name: sp.name, description: 'Não achei esta magia no cadastro.' }; K.ctx.rerender(); });
              K.ctx.rerender();
            } }, sp.name + (si < g.spells.length - 1 ? ',' : ''));
        })));
      for (const sp of g.spells || []) {
        const key = 'npcsp:' + (sp.ref || sp.name);
        if (!F5.open.has(key)) continue;
        const r = sp.ref ? F5.spellText[sp.ref] : null;
        box.append(h('div', { class: 'f5-sb-sptext' }, r ? [h('b', {}, r.name + (r.level != null ? ' · ' + (r.level ? r.level + 'º nível' : 'truque') : '') + (r.school ? ' · ' + r.school : '')), textView(r.description || '')] : h('span', { class: 'muted' }, sp.ref ? 'Abrindo o cadastro…' : 'Sem ligação no cadastro de Magias.')));
      }
    });
    if (sc.footer) box.append(h('p', { class: 'muted' }, sc.footer));
    return box;
  }
  // ---------- Editar o bloco ----------
  function npcEditor(K, pane) {
    const { a, d, ro, upd } = K, n = d.npc;
    const setN = (fn) => upd((dd) => fn(dd.npc));
    const opt = (v) => (v == null || v === '' ? '' : v);
    const numOrBlank = (v) => (String(v).trim() === '' ? null : num(v));
    pane.append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btnI('check', 'Pronto', { class: 'btn small primary', 'data-act': 'npc-done', onclick: () => { F5.npcEdit[a.id] = false; K.ctx.rerender(); } })));
    pane.append(sec('scroll-text', 'Cabeçalho', null, h('div', { class: 'f5-grid4' },
      field('Tamanho', sel(n.size, R.SIZES, (v) => setN((x) => { x.size = v; }), { disabled: ro, 'data-f': 'npc-size' })),
      field('Tipo', tin(n.type, (v) => setN((x) => { x.type = v; }), { disabled: ro, 'data-f': 'npc-type', placeholder: 'monstrosity (titan)' })),
      field('Tendência', tin(n.align, (v) => setN((x) => { x.align = v; }), { disabled: ro, 'data-f': 'npc-align' })),
      field('Desafio (ND)', tin(n.cr, (v) => setN((x) => { x.cr = v.trim() || '0'; }), { disabled: ro, 'data-f': 'npc-cr', placeholder: '1/2, 5, 30' })),
      field('XP (vazio = pelo ND)', tin(opt(n.xp), (v) => setN((x) => { x.xp = numOrBlank(v); }), { disabled: ro, 'data-f': 'npc-xp' })),
      field('Proficiência (vazio = pelo ND)', tin(opt(n.pb), (v) => setN((x) => { x.pb = numOrBlank(v); }), { disabled: ro, 'data-f': 'npc-pb' })),
      field('Iniciativa (vazio = Des)', tin(opt(n.init), (v) => setN((x) => { x.init = numOrBlank(v); }), { disabled: ro, 'data-f': 'npc-init' })),
      field('Percepção passiva (vazio = calculada)', tin(opt(n.passive), (v) => setN((x) => { x.passive = numOrBlank(v); }), { disabled: ro, 'data-f': 'npc-passive' })))));
    pane.append(sec('shield', 'Defesa e vida', null, h('div', { class: 'f5-grid4' },
      field('CA', nin(n.ac, (v) => setN((x) => { x.ac = v; }), { disabled: ro, 'data-f': 'npc-ac' })),
      field('Origem da CA', tin(n.acNote, (v) => setN((x) => { x.acNote = v; }), { disabled: ro, 'data-f': 'npc-acnote', placeholder: '(armadura natural)' })),
      field('PV', nin(n.hp, (v) => setN((x) => { x.hp = Math.max(1, v); }), { disabled: ro, 'data-f': 'npc-hp' })),
      field('Fórmula de PV', tin(n.hpFormula, (v) => setN((x) => { x.hpFormula = v.trim(); }), { disabled: ro, 'data-f': 'npc-hpf', placeholder: '33d20 + 330' }))),
    h('div', { class: 'f5-grid5' }, Object.entries(R.SPEEDS).map(([k, l]) => field(l + ' (m)', nin(n.speed[k] || '', (v) => setN((x) => { x.speed[k] = v; x.speedText = ''; }), { disabled: ro, 'data-f': 'npc-sp-' + k })))),
    h('label', { class: 'check-row' }, chk(n.speed.hover, (v) => setN((x) => { x.speed.hover = v; x.speedText = ''; }), { disabled: ro }), 'Voo pairando'),
    field('Deslocamento em texto (vazio = pelos números)', tin(n.speedText, (v) => setN((x) => { x.speedText = v; }), { disabled: ro, 'data-f': 'npc-sptxt' }))));
    pane.append(sec('dumbbell', 'Atributos, salvaguardas e perícias', null,
      h('div', { class: 'f5-grid3' }, R.AB.map((k) => h('div', { class: 'f5-npc-ab' },
        field(R.AB_PT[k], nin(d.abil[k], (v) => upd((dd) => { dd.abil[k] = v; }), { disabled: ro, 'data-f': 'abil-' + k })),
        field('Salvaguarda (vazio = sem)', tin(opt(n.saves[k]), (v) => setN((x) => { if (String(v).trim() === '') delete x.saves[k]; else x.saves[k] = num(v); }), { disabled: ro, 'data-f': 'npc-sv-' + k, placeholder: '+5' }))))),
      h('div', { class: 'f5-grid4' }, R.SKILLS.map(([id, pt]) => field(pt, tin(opt(n.skills[id]), (v) => setN((x) => { if (String(v).trim() === '') delete x.skills[id]; else x.skills[id] = num(v); }), { disabled: ro, 'data-f': 'npc-sk-' + id, placeholder: '—' }))))));
    pane.append(sec('eye', 'Defesas, sentidos e idiomas', null, h('div', { class: 'f5-grid2' },
      field('Vulnerabilidades a dano', tin(n.vuln, (v) => setN((x) => { x.vuln = v; }), { disabled: ro, 'data-f': 'npc-vuln' })),
      field('Resistências a dano', tin(n.resist, (v) => setN((x) => { x.resist = v; }), { disabled: ro, 'data-f': 'npc-resist' })),
      field('Imunidades a dano', tin(n.immune, (v) => setN((x) => { x.immune = v; }), { disabled: ro, 'data-f': 'npc-immune', placeholder: 'fire, poison; bludgeoning, piercing, slashing from nonmagical attacks' })),
      field('Imunidades a condições', tin(n.condImmune, (v) => setN((x) => { x.condImmune = v; }), { disabled: ro, 'data-f': 'npc-cond' })),
      field('Sentidos', tin(n.senses, (v) => setN((x) => { x.senses = v; }), { disabled: ro, 'data-f': 'npc-senses' })),
      field('Idiomas', tin(n.langs, (v) => setN((x) => { x.langs = v; }), { disabled: ro, 'data-f': 'npc-langs' })),
      field('Equipamento', tin(n.gear, (v) => setN((x) => { x.gear = v; }), { disabled: ro, 'data-f': 'npc-gear' }))),
    h('p', { class: 'hint' }, 'Defesas a dano: separe por ";" o que tem condição ("fire, poison; bludgeoning, piercing, slashing from nonmagical attacks"). Na mesa, só o que não tem condição reduz o dano sozinho.')));
    for (const [key, title] of R.NPC_LISTS) {
      const list = n[key] || [];
      pane.append(sec(key === 'traits' ? 'star' : key === 'legendary' ? 'award' : 'swords', title, !ro ? btnI('plus', 'Adicionar', { 'data-add5': key, onclick: () => setN((x) => { x[key].push({ id: key.slice(0, 2) + '_' + Date.now().toString(36), name: 'Nova', text: '', kind: 'text', dmg: [] }); }) }) : null,
        key === 'legendary' ? h('div', { class: 'f5-grid3' },
          field('Ações lendárias por rodada', nin(n.legendaryCount, (v) => setN((x) => { x.legendaryCount = Math.max(0, v); x.legendaryUsed = 0; }), { disabled: ro, 'data-f': 'npc-legn' })),
          field('Texto de abertura', tin(n.legendaryText, (v) => setN((x) => { x.legendaryText = v; }), { disabled: ro, 'data-f': 'npc-legt' }))) : null,
        list.length ? list.map((x, i) => npcItemEdit(K, key, x, i)) : h('p', { class: 'empty' }, 'Nenhum.')));
    }
    pane.append(sec('sparkles', 'Conjuração', !ro ? btnI('plus', 'Conjuração', { 'data-add5': 'cast', onclick: () => setN((x) => { x.spellcasting.push({ id: 'sc' + Date.now().toString(36), name: 'Spellcasting', place: 'trait', ability: 'int', dc: null, atk: null, text: '', footer: '', groups: [{ label: 'À vontade', spells: [] }] }); }) }) : null,
      n.spellcasting.length ? n.spellcasting.map((sc, i) => npcCastEdit(K, sc, i)) : h('p', { class: 'empty' }, 'Sem conjuração.')));
  }
  function npcItemEdit(K, key, x, i) {
    const { ro, upd } = K;
    const set = (fn) => upd((dd) => fn(dd.npc[key][i]));
    const dmg = (x.dmg || []).map((p, j) => h('div', { class: 'f5-dmg' },
      tin(p.dice, (v) => set((y) => { y.dmg[j].dice = v.replace(/\s+/g, ''); }), { disabled: ro, placeholder: '4d12+10', 'aria-label': 'Dados' }),
      sel(p.type || '', Object.assign({ '': 'Tipo' }, DMG_PT), (v) => set((y) => { y.dmg[j].type = v; }), { disabled: ro, 'aria-label': 'Tipo de dano' }),
      h('label', { class: 'check-row small-text' }, chk(p.cond, (v) => set((y) => { y.dmg[j].cond = v || undefined; }), { disabled: ro }), 'só com condição'),
      !ro ? iconBtn('x', 'Tirar', () => set((y) => { y.dmg.splice(j, 1); })) : null));
    return h('div', { class: 'f5-npc-edit', 'data-edit5': key + i },
      h('div', { class: 'f5-grid4' },
        field('Nome', tin(x.name, (v) => set((y) => { y.name = v.trim() || y.name; }), { disabled: ro, 'data-f': 'ne-name-' + key + i })),
        field('Tipo', sel(x.kind || 'text', { text: 'Só texto', attack: 'Ataque', save: 'Salvaguarda' }, (v) => set((y) => { y.kind = v; }), { disabled: ro, 'data-f': 'ne-kind-' + key + i })),
        field('Recarga (vazio = sem)', tin(x.recharge || '', (v) => set((y) => { y.recharge = String(v).trim() ? num(v) : undefined; }), { disabled: ro, placeholder: '5', 'data-f': 'ne-rc-' + key + i })),
        field('Usos (vazio = sem)', tin(x.uses ? x.uses.max : '', (v) => set((y) => { y.uses = String(v).trim() ? { max: num(v), cur: num(v), per: (y.uses || {}).per || 'day' } : undefined; }), { disabled: ro, placeholder: '3', 'data-f': 'ne-uses-' + key + i })),
        key === 'legendary' ? field('Custo (ações)', tin(x.cost || '', (v) => set((y) => { y.cost = String(v).trim() ? num(v) : undefined; }), { disabled: ro, 'data-f': 'ne-cost-' + i })) : null,
        x.kind === 'attack' ? field('Acerto', nin(x.hit || 0, (v) => set((y) => { y.hit = v; }), { disabled: ro, 'data-f': 'ne-hit-' + key + i })) : null,
        x.kind === 'attack' ? field('Alcance (m)', nin(x.reach || '', (v) => set((y) => { y.reach = v || undefined; }), { disabled: ro, 'data-f': 'ne-reach-' + key + i })) : null,
        x.kind !== 'text' ? field('Distância (m)', nin(x.range ? x.range.normal : '', (v) => set((y) => { y.range = v ? Object.assign({}, y.range || {}, { normal: v }) : undefined; }), { disabled: ro, 'data-f': 'ne-rng-' + key + i })) : null,
        x.kind === 'save' || x.dc ? field('CD', nin(x.dc || '', (v) => set((y) => { y.dc = v || undefined; }), { disabled: ro, 'data-f': 'ne-dc-' + key + i })) : null,
        x.kind === 'save' ? field('Salvaguarda', sel(x.save || 'dex', R.AB_SH, (v) => set((y) => { y.save = v; }), { disabled: ro })) : null,
        x.kind === 'save' ? field('Se passar', sel(x.onSave || 'none', { half: 'Metade do dano', none: 'Nenhum dano' }, (v) => set((y) => { y.onSave = v; }), { disabled: ro })) : null,
        x.kind === 'save' ? field('Área (m)', nin(x.area ? x.area.size : '', (v) => set((y) => { y.area = v ? { size: v, shape: (y.area || {}).shape || 'sphere' } : undefined; }), { disabled: ro, 'data-f': 'ne-area-' + key + i })) : null),
      x.kind !== 'text' ? h('div', { class: 'f5-sub' }, h('small', { class: 'muted' }, 'Dano'), dmg, !ro ? btnI('plus', 'Dano', { onclick: () => set((y) => { (y.dmg = y.dmg || []).push({ dice: '1d6', type: '' }); }) }) : null) : null,
      field('Texto', area(x.text, (v) => set((y) => { y.text = v; }), { disabled: ro, rows: 3, 'data-f': 'ne-text-' + key + i })),
      !ro ? h('div', { class: 'row' }, h('span', { class: 'grow' }), btnI('trash-2', 'Remover', { class: 'btn small danger', onclick: () => upd((dd) => { dd.npc[key].splice(i, 1); }) })) : null);
  }
  function npcCastEdit(K, sc, i) {
    const { ro, upd } = K;
    const set = (fn) => upd((dd) => fn(dd.npc.spellcasting[i]));
    return h('div', { class: 'f5-npc-edit', 'data-cast-edit': i },
      h('div', { class: 'f5-grid4' },
        field('Nome', tin(sc.name, (v) => set((y) => { y.name = v.trim() || y.name; }), { disabled: ro })),
        field('Onde aparece', sel(sc.place || 'trait', { trait: 'Traços', action: 'Ações', bonus: 'Ações bônus', reaction: 'Reações', legendary: 'Ações lendárias' }, (v) => set((y) => { y.place = v; }), { disabled: ro })),
        field('Atributo', sel(sc.ability || '', Object.assign({ '': '—' }, R.AB_SH), (v) => set((y) => { y.ability = v; }), { disabled: ro })),
        field('CD (vazio = calculada)', tin(sc.dc == null ? '' : sc.dc, (v) => set((y) => { y.dc = String(v).trim() ? num(v) : null; }), { disabled: ro })),
        field('Ataque (vazio = calculado)', tin(sc.atk == null ? '' : sc.atk, (v) => set((y) => { y.atk = String(v).trim() ? num(v) : null; }), { disabled: ro }))),
      field('Texto', area(sc.text, (v) => set((y) => { y.text = v; }), { disabled: ro, rows: 2 })),
      (sc.groups || []).map((g, gi) => h('div', { class: 'f5-grid4' },
        field('Grupo', tin(g.label, (v) => set((y) => { y.groups[gi].label = v; }), { disabled: ro, placeholder: '3/dia cada, 1º nível…' })),
        field('Usos ou espaços (vazio = sem)', tin((g.slots || g.uses || {}).max || '', (v) => set((y) => { const gg = y.groups[gi]; const val = String(v).trim() ? { max: num(v), cur: num(v) } : null; if (gg.level) gg.slots = val; else gg.uses = val; }), { disabled: ro })),
        field('Magias (separadas por vírgula)', tin((g.spells || []).map((s2) => s2.name).join(', '), (v) => set((y) => {
          const old = y.groups[gi].spells || [];
          y.groups[gi].spells = v.split(',').map((t) => t.trim()).filter(Boolean).map((nm) => old.find((o) => o.name.toLowerCase() === nm.toLowerCase()) || { name: nm, ref: nm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (K.d.edicao === '2024' ? 'xphb' : 'phb') });
        }), { disabled: ro })),
        !ro ? h('div', { class: 'f5-clsrow-x' }, iconBtn('x', 'Tirar o grupo', () => set((y) => { y.groups.splice(gi, 1); }))) : null)),
      !ro ? h('div', { class: 'row' }, btnI('plus', 'Grupo', { onclick: () => set((y) => { y.groups.push({ label: 'Novo grupo', spells: [] }); }) }), h('span', { class: 'grow' }),
        btnI('trash-2', 'Remover a conjuração', { class: 'btn small danger', onclick: () => upd((dd) => { dd.npc.spellcasting.splice(i, 1); }) })) : null);
  }
  function npcDesc(K, pane) {
    const { a, d, ro, upd } = K;
    const fl = a.dados5e && a.dados5e._fluff && a.dados5e._fluff.entries;
    if (fl && App.Bestiary && App.Bestiary.plain) pane.append(sec('book-open', 'Do livro', null, textView(App.Bestiary.plain(fl))));
    pane.append(sec('file-text', 'Anotações', null, field('Anotações', area(d.bio.notas, (v) => upd((dd) => { dd.bio.notas = v; }), { disabled: ro, rows: 8, 'data-f': 'bio-notas' }))));
    if (a.dados5e && a.dados5e.source) pane.append(h('p', { class: 'hint' }, 'Fonte: ' + (App.Bestiary && App.Bestiary.bookName ? App.Bestiary.bookName(a.dados5e.source) : a.dados5e.source) + (a.dados5e.page ? ', p. ' + a.dados5e.page : '') + ' (5etools).'));
  }
})(window.App);
