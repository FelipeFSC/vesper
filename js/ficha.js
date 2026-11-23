'use strict';
import { binaryAssets, encodeAssets, ImageUrls, referencedAssets, setAsset } from '../src/services/image-assets.ts';
/*
 * Página "Criar ficha" (ficha.html, Plano 23): monta fichas fora da mesa, com espaço.
 * As fichas ficam neste navegador (IndexedDB, chave 'fichas'), separadas da campanha.
 * "Exportar" gera o mesmo .json da mesa (formato mesarpg-actor); o mestre
 * importa pela mesa e escolhe o jogador em Configurar → Controlado por.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const $ = (s) => document.querySelector(s);
  const ic = (n, cls) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n, cls); return t.content.firstChild; };
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn' }, attrs), ic(icon), label);
  const iconBtn = (icon, title, onclick, attrs = {}) => h('button', Object.assign({ class: 'icon-btn', title, 'aria-label': title, onclick }, attrs), ic(icon));

  const KIND = { pc: 'Personagem', npc: 'NPC', monster: 'Criatura' };
  const KIND_GROUP = { pc: 'Personagens', npc: 'NPCs', monster: 'Criaturas' };
  const DEFAULT_ATTRS = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma', 'Defesa'];
  const DEFAULT_BARS = ['PV', 'Mana'];
  const MODES = { attack: 'Ataque (rolagem contra defesa)', save: 'Resistência (alvo rola contra CD)', damage: 'Dano direto', heal: 'Cura', roll: 'Só rolar (sem alvo)' };
  const MODE_ICON = { attack: 'sword', save: 'shield', damage: 'zap', heal: 'heart-pulse', roll: 'dices' };
  const SIZES = [[0.5, 'Minúsculo (½)'], [1, '1 quadrado'], [2, '2×2'], [3, '3×3'], [4, '4×4'], [6, '6×6']];
  const SEL_KEY = 'vesper-ficha-sel';

  // ---------- Dados ----------
  const F = { actors: {}, assets: Object.create(null), sel: null, filter: '', act: null, rolls: [] };
  const urls = new ImageUrls();
  App.Ficha = F;

  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('mesarpg', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function idbGet(key) {
    const d = await db();
    return new Promise((res, rej) => { const q = d.transaction('kv', 'readonly').objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async function idbSet(key, val) {
    const d = await db();
    return new Promise((res, rej) => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }
  // Só as imagens que alguma ficha usa
  const usedAssets = (obj) => referencedAssets(obj, F.assets);
  async function saveNow() {
    try {
      const assets = usedAssets(F.actors);
      F.assets = assets;
      urls.retain(new Set(Object.keys(assets)));
      await idbSet('fichas', { actors: structuredClone(F.actors), assets, savedAt: Date.now() });
      const el = $('#fp-saved');
      if (el) { el.textContent = 'Salvo neste navegador · ' + U.fmtTime(); el.classList.add('on'); }
    } catch (e) { U.toast('Erro ao salvar no navegador: ' + e.message, 'error'); }
  }
  const save = U.debounce(saveNow, 400);
  F.saveNow = saveNow;

  const cur = () => F.actors[F.sel] || null;
  // Muda a ficha aberta, salva e redesenha (guardando o campo em foco)
  function edit(fn) {
    const a = cur();
    if (!a) return;
    fn(a);
    save();
    later();
  }
  F.edit = edit;
  // Redesenha depois que o foco já foi para o próximo campo (Tab ou clique)
  let pending = 0;
  function later() { if (!pending) pending = setTimeout(() => { pending = 0; render(); }, 0); }

  function newActor(kind, sistema) {
    if (!sistema) { askSystem(kind); return null; }
    const a = {
      id: U.uid('ac_'), kind, img: null, color: U.randColor(), size: 1, owner: '',
      name: kind === 'pc' ? 'Novo personagem' : kind === 'npc' ? 'Novo NPC' : 'Nova criatura',
      bars: DEFAULT_BARS.slice(0, kind === 'pc' ? undefined : 1).map((n) => ({ name: n, value: 10, max: 10 })),
      stats: DEFAULT_ATTRS.map((n) => ({ name: n, value: U.slug(n) === 'defesa' ? 10 : 0 })), actions: [],
      testFormula: '1d20+@valor', initFormula: '1d20', notes: '',
    };
    if (sistema === '5e') { a.dnd5e = App.Regras5e.blank(); if (kind !== 'pc') a.dnd5e.npc = App.Regras5e.blankNpc(); App.Regras5e.apply(a); }
    F.actors[a.id] = a;
    select(a.id);
    save();
    setTimeout(() => { const n = $('.fp-name, .f5-name'); if (n) { n.focus(); n.select(); } }, 0);
    return a;
  }
  F.newActor = newActor;
  // Plano 51: a ficha nova pode ser genérica (qualquer sistema) ou de D&D 5e
  function askSystem(kind) {
    const back = h('div', { class: 'modal-back' });
    const close = () => back.remove();
    const pickIt = (s) => { close(); newActor(kind, s); };
    back.append(h('div', { class: 'modal', style: { width: 'min(520px, calc(100vw - 32px))' } },
      h('div', { class: 'win-head' }, ic('scroll-text'), h('span', { class: 'win-title' }, 'Nova ficha: ' + KIND[kind]), iconBtn('x', 'Fechar', close)),
      h('div', { class: 'win-body' }, h('div', { class: 'f5-kind' },
        h('button', { 'data-sys': 'generic', onclick: () => pickIt('generic') }, ic('list-ordered'), h('b', {}, 'Genérica'), h('small', {}, 'Atributos, barras e ações livres. Serve para qualquer sistema.')),
        h('button', { 'data-sys': '5e', onclick: () => pickIt('5e') }, ic('shield'), h('b', {}, 'D&D 5ª Edição'), h('small', {}, 'Ficha completa: atributos, perícias, ataques, magias, inventário, ligada aos cadastros. Você preenche.')),
        h('button', { 'data-sys': '5e-assist', onclick: () => { close(); App.Assist5e.open({ onDone: (res) => { const a = newActor(kind, '5e'); edit((x) => { x.dnd5e = res.d; if (res.name) x.name = res.name; App.Regras5e.apply(x); }); void a; } }); } }, ic('wand'), h('b', {}, 'D&D 5ª Edição - Passo a Passo'), h('small', {}, 'O assistente pergunta classe, espécie, antecedente, atributos e escolhas, e monta a ficha.'))))));
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    document.body.append(back);
  }

  function select(id) {
    F.sel = id; F.act = null; F.sideOpen = false;
    try { localStorage.setItem(SEL_KEY, id || ''); } catch { /* */ }
    const m = $('#fp-main'); if (m) m.scrollTop = 0;
    render();
  }
  F.select = select;

  // ---------- Pedaços ----------
  function shade(hex, k) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    const f = (x) => Math.round(U.clamp(parseInt(x, 16) * (1 + k), 0, 255));
    return `rgb(${f(m[1])},${f(m[2])},${f(m[3])})`;
  }
  function initials(name, n) {
    const w = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (n > 1 && w.length > 1) return (w[0][0] + w[1][0]).toUpperCase();
    return (w[0] || '?').slice(0, 1).toUpperCase();
  }
  function avatar(a, size) {
    const src = a?.img ? urls.src(a.img, F.assets[a.img]) : null;
    const col = U.safeColor(a && a.color, '#5f5e6a');
    return h('div', { class: 'avatar', style: {
      width: size + 'px', height: size + 'px', fontSize: size * 0.4 + 'px',
      background: src ? `center/cover url(${src})` : `radial-gradient(circle at 35% 30%, ${U.hexA(col, 1)}, ${shade(col, -0.35)})`,
    } }, src ? '' : initials(a && a.name, size < 34 ? 1 : 2));
  }
  function meter(b, i) {
    const pct = b.max > 0 ? U.clamp((Number(b.value) / Number(b.max)) * 100, 0, 100) : 0;
    const color = i > 0 ? 'var(--mana)' : pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--warn)' : 'var(--danger)';
    return h('div', { class: 'meter' }, h('div', { style: { width: pct + '%', background: color } }));
  }
  // "+5", "-3", "-2d6" ou um número
  function applyDelta(curV, str) {
    str = String(str).trim();
    if (!str) return null;
    const rel = /^[+-]/.test(str);
    let val;
    try {
      if (/d/i.test(str)) {
        const r = App.Dice.roll(str.replace(/^[+-]/, ''));
        val = r.total * (str[0] === '-' ? -1 : 1);
        U.toast(`${str} → ${val}`);
      } else val = Number(str);
    } catch { U.toast('Valor inválido', 'error'); return null; }
    if (!Number.isFinite(val)) { U.toast('Valor inválido', 'error'); return null; }
    return rel ? (Number(curV) || 0) + val : val;
  }
  function vars(a) {
    const v = {};
    for (const s of a.stats || []) { const k = U.slug(s.name); if (k) v[k] = Number(s.value) || 0; }
    for (const b of a.bars || []) { const k = U.slug(b.name); if (k) { v[k] = Number(b.value) || 0; v[k + '_max'] = Number(b.max) || 0; } }
    return v;
  }
  function knownVars(a, extra = []) {
    const out = (a.stats || []).map((x) => x.name);
    for (const b of a.bars || []) out.push(b.name, U.slug(b.name) + '_max');
    return out.concat(extra);
  }
  // Lista de sugestões (datalist) para os nomes livres
  function datalist(id, names) {
    const seen = new Set(), list = [];
    for (const n of names) { const k = U.slug(n); if (n && k && !seen.has(k)) { seen.add(k); list.push(n); } }
    return h('datalist', { id }, list.map((n) => h('option', { value: n })));
  }
  const attrNames = (a) => (a.stats || []).map((s) => s.name).concat(DEFAULT_ATTRS);
  const barNames = (a) => (a.bars || []).map((b) => b.name).concat(DEFAULT_BARS);

  // ---------- Rolagens (não há chat: o resultado aparece no canto) ----------
  function roll(label, formula, a) {
    let parts;
    try { parts = App.Dice.rollMulti(formula, vars(a)); }
    catch (e) { U.toast(label + ': ' + e.message, 'error'); return; }
    F.rolls.unshift({ label, parts, at: Date.now() });
    F.rolls.length = Math.min(F.rolls.length, 6);
    renderRolls();
  }
  F.roll = roll;
  // O detalhe do dado traz <span class="die">; qualquer outra marcação sai
  const cleanDetail = (s) => String(s || '').replace(/<(?!\/?span(\s+class="[a-z ]*")?>)[^>]*>/gi, '');
  function renderRolls() {
    const box = $('#fp-rolls');
    if (!box) return;
    box.hidden = !F.rolls.length;
    box.innerHTML = '';
    if (!F.rolls.length) return;
    box.append(h('div', { class: 'fp-rolls-head' }, ic('dices'), h('b', { class: 'grow' }, 'Rolagens'),
      h('span', { class: 'muted small-text' }, 'só você vê'),
      iconBtn('x', 'Limpar', () => { F.rolls = []; renderRolls(); })));
    F.rolls.forEach((r, i) => box.append(h('div', { class: 'fp-roll' + (i === 0 ? ' new' : '') },
      h('div', { class: 'fp-roll-label' }, r.label),
      r.parts.map((p) => h('div', { class: 'fp-roll-part' },
        p.label ? h('span', { class: 'muted' }, p.label + ' ') : null,
        h('b', { class: p.crit ? 'crit' : p.fumble ? 'fumble' : '' }, String(p.total)),
        h('span', { class: 'fp-roll-detail', html: U.esc(p.formula) + ' → ' + cleanDetail(p.detail) }))))));
  }

  function sub5e(a) {
    const d = a.dnd5e || {};
    const c = d.npc ? 'ND ' + (d.npc.cr || '0') : (d.classes || []).filter((x) => x.name).map((x) => x.name + ' ' + x.level).join(' / ');
    const pv = (a.bars || []).find((b) => b.name === 'PV');
    return ['5e', c || 'sem classe', pv ? 'PV ' + pv.max : ''].filter(Boolean).join(' · ');
  }
  // ---------- Lista "Minhas fichas" ----------
  function renderSide() {
    const side = $('#fp-side');
    side.innerHTML = '';
    // No celular a lista fecha quando há uma ficha aberta (o título abre e fecha)
    side.classList.toggle('closed', !F.sideOpen && !!cur());
    side.append(h('button', { class: 'fp-side-head', 'aria-expanded': String(!side.classList.contains('closed')), onclick: () => { F.sideOpen = !F.sideOpen; render(); } },
      h('span', { class: 'eyebrow' }, 'Minhas fichas'),
      h('span', { class: 'muted small-text' }, String(Object.keys(F.actors).length)),
      h('span', { class: 'fp-side-cur' }, cur() ? cur().name : ''),
      ic('chevron-down', 'fp-side-chev')));
    side.append(h('div', { class: 'search-box' }, ic('search'),
      h('input', { placeholder: 'Buscar ficha…', value: F.filter, 'data-f': 'filtro', oninput: (e) => { F.filter = e.target.value; render(); } })));
    const q = U.slug(F.filter);
    const all = Object.values(F.actors).filter((a) => !q || U.slug(a.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    const body = h('div', { class: 'fp-list' });
    for (const kind of ['pc', 'npc', 'monster']) {
      const group = all.filter((a) => (a.kind || 'pc') === kind);
      if (!group.length && q) continue;
      body.append(h('div', { class: 'sec-head' }, h('span', { class: 'eyebrow' }, KIND_GROUP[kind]),
        iconBtn('plus', 'Nova ficha: ' + KIND[kind], () => newActor(kind), { 'data-new': kind })));
      if (!group.length) body.append(h('div', { class: 'empty' }, 'Nenhuma ainda.'));
      for (const a of group) {
        body.append(h('button', { class: 'actor-item fp-item' + (a.id === F.sel ? ' on' : ''), onclick: () => select(a.id) },
          avatar(a, 34),
          h('div', { class: 'grow' }, h('div', { class: 'name' }, a.name),
            h('div', { class: 'sub' }, a.sistema === '5e' ? sub5e(a) : (a.bars || []).slice(0, 2).map((b) => `${b.name} ${b.max}`).join(' · ') || KIND[a.kind]))));
      }
    }
    side.append(body);
    side.append(h('div', { class: 'fp-side-foot' },
      btnI('book-open', 'A partir do bestiário', { class: 'btn block', onclick: fromBestiary }),
      btnI('folder-open', 'Importar ficha', { class: 'btn block', onclick: importFile }),
      h('p', { class: 'hint' }, 'As fichas ficam salvas neste navegador. Exportar gera um arquivo que qualquer mesa do Vésper importa.')));
  }

  // ---------- Editor ----------
  function section(icon, title, extra, ...body) {
    return h('section', { class: 'fp-sec' }, h('div', { class: 'fp-sec-head' }, ic(icon), h('h2', {}, title), h('span', { class: 'grow' }), extra), body);
  }

  function renderMain() {
    const main = $('#fp-main');
    App.Ficha5e?.release(main.firstElementChild);
    main.innerHTML = '';
    const a = cur();
    if (!a) {
      main.append(h('div', { class: 'fp-empty' },
        h('div', { class: 'bubble' }, ic('scroll-text')),
        h('b', {}, Object.keys(F.actors).length ? 'Escolha uma ficha na lista' : 'Monte a sua primeira ficha'),
        h('p', {}, 'A ficha fica salva neste navegador. Exportar gera um arquivo que qualquer mesa do Vésper importa.'),
        h('div', { class: 'row wrap', style: { justifyContent: 'center' } },
          btnI('user-round', 'Novo personagem', { class: 'btn primary', onclick: () => newActor('pc') }),
          btnI('users', 'Novo NPC', { onclick: () => newActor('npc') }),
          btnI('skull', 'Nova criatura', { onclick: () => newActor('monster') }),
          btnI('book-open', 'A partir do bestiário', { onclick: fromBestiary, 'data-bst': '1' }),
          btnI('folder-open', 'Importar ficha', { onclick: importFile }))));
      return;
    }
    if (a.sistema === '5e' && App.Ficha5e) {
      main.append(App.Ficha5e.render(a, {
        wide: true, edit, rerender: render,
        roll: (label, f) => roll(label, f, a),
        avatar: (size) => { const av = avatar(a, size); av.title = 'Clique para escolher a imagem'; av.onclick = pickImage; return av; },
        config: () => h('div', {}, identity(a), footer(a)),
      }));
      return;
    }
    main.append(datalist('fp-attrs', attrNames(a)), datalist('fp-bars', barNames(a)));
    main.append(identity(a), barsSec(a), statsSec(a), actionsSec(a), notesSec(a), footer(a));
  }

  // Identidade: retrato, nome e o que vale para o token
  function identity(a) {
    const av = avatar(a, 120);
    av.classList.add('fp-avatar');
    av.title = 'Clique para escolher a imagem';
    av.onclick = pickImage;
    const pick = (label, el, attrs = {}) => h('label', attrs, label, el);
    return h('section', { class: 'fp-sec fp-id' },
      h('div', { class: 'fp-id-img' }, av,
        h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: pickImage }, ic('image'), a.img ? 'Trocar' : 'Imagem'),
          a.img ? iconBtn('x', 'Remover imagem', () => edit((x) => { x.img = null; })) : null)),
      h('div', { class: 'fp-id-body' },
        h('input', { class: 'fp-name sheet-name', value: a.name, 'data-f': 'nome', 'aria-label': 'Nome da ficha', onchange: (e) => edit((x) => { x.name = e.target.value.trim() || x.name; }) }),
        h('div', { class: 'form fp-id-form' },
          pick('Tipo', h('select', { value: a.kind || 'pc', 'data-f': 'tipo', onchange: (e) => edit((x) => { x.kind = e.target.value; }) },
            Object.entries(KIND).map(([k, v]) => h('option', { value: k }, v)))),
          pick('Tamanho do token', h('select', { value: String(a.size || 1), 'data-f': 'tamanho', onchange: (e) => edit((x) => { x.size = Number(e.target.value); }) },
            SIZES.map(([v, l]) => h('option', { value: String(v) }, l)))),
          pick('Cor', h('input', { type: 'color', value: U.safeColor(a.color, '#64748b'), 'data-f': 'cor', onchange: (e) => edit((x) => { x.color = e.target.value; }) })),
          pick('Altura (m)', h('input', { type: 'text', inputmode: 'decimal', 'data-f': 'altura', value: a.height ? String(a.height).replace('.', ',') : '',
            placeholder: String(App.Combat.defaultHeight(a.size)).replace('.', ',') + ' (pelo tamanho)',
            onchange: (e) => { const v = Number(String(e.target.value).replace(',', '.')); edit((x) => { x.height = v > 0 ? v : null; }); } }),
          { title: 'Usada na cobertura: muro mais alto que a criatura = cobertura total' }),
          pick('Atrás de muro baixo', h('select', { value: a.coverShow || '', 'data-f': 'muro', onchange: (e) => edit((x) => { x.coverShow = e.target.value || null; }) },
            h('option', { value: '' }, 'Regra da cena'), h('option', { value: 'show' }, 'Sempre visível'), h('option', { value: 'silhouette' }, 'Vulto'), h('option', { value: 'hide' }, 'Escondido')))),
        h('p', { class: 'hint' }, a.kind === 'pc'
          ? 'Personagem: todos os tokens compartilham os mesmos valores das barras.'
          : 'NPC e criatura: cada token criado no mapa ganha uma cópia própria das barras (PV separado).')));
  }

  function barsSec(a) {
    const rows = (a.bars || []).map((b, i) => h('div', { class: 'fp-bar' },
      h('input', { class: 'fp-bar-name', value: b.name, list: 'fp-bars', 'data-f': 'bar-nome-' + i, 'aria-label': 'Nome da barra', onchange: (e) => edit((x) => { x.bars[i].name = e.target.value.trim() || x.bars[i].name; }) }),
      h('div', { class: 'fp-bar-meter' }, meter(b, i)),
      h('label', { class: 'fp-mini' }, 'Atual', h('input', { class: 'num', value: b.value, 'data-f': 'bar-val-' + i, title: 'Aceita +5, -3 ou -2d6', onchange: (e) => {
        const v = applyDelta(b.value, e.target.value);
        if (v == null) { e.target.value = b.value; return; }
        edit((x) => { x.bars[i].value = v; });
      } })),
      h('label', { class: 'fp-mini' }, 'Máximo', h('input', { class: 'num', type: 'number', value: b.max, 'data-f': 'bar-max-' + i, onchange: (e) => edit((x) => { x.bars[i].max = Number(e.target.value) || 0; }) })),
      iconBtn('x', 'Remover barra', () => edit((x) => x.bars.splice(i, 1)))));
    return section('heart-pulse', 'Barras',
      btnI('plus', 'Barra', { class: 'btn small', 'data-add': 'bar', onclick: () => edit((x) => {
        const have = (x.bars || []).map((b) => U.slug(b.name));
        const n = DEFAULT_BARS.find((d) => !have.includes(U.slug(d))) || 'Nova barra';
        (x.bars = x.bars || []).push({ name: n, value: 10, max: 10 });
      }) }),
      rows.length ? h('div', { class: 'fp-bars' }, rows) : h('p', { class: 'empty' }, 'Sem barras. PV, Mana, Sanidade…'),
      h('p', { class: 'hint' }, 'Nas fórmulas a barra vira @nome e o máximo @nome_max (ex.: @pv, @pv_max). O atual aceita +5, -3 ou -2d6.'));
  }

  function statsSec(a) {
    const missing = DEFAULT_ATTRS.filter((n) => !(a.stats || []).some((s) => U.slug(s.name) === U.slug(n)));
    const add = h('select', { class: 'add-sel', value: '', 'data-add': 'attr', onchange: (e) => {
      const v = e.target.value; if (!v) return;
      edit((x) => {
        x.stats = x.stats || [];
        const names = v === '*' ? missing : v === '+' ? ['Novo atributo'] : [v];
        for (const n of names) x.stats.push({ name: n, value: U.slug(n) === 'defesa' ? 10 : 0 });
      });
      if (v === '+') setTimeout(() => { const all = document.querySelectorAll('.fp-stat-name'); const el = all[all.length - 1]; if (el) { el.focus(); el.select(); } }, 0);
    } }, h('option', { value: '' }, '+ Atributo'),
      missing.length > 1 ? h('option', { value: '*' }, 'Todos os que faltam (' + missing.length + ')') : null,
      missing.map((n) => h('option', { value: n }, n)),
      h('option', { value: '+' }, 'Outro (escrever o nome)…'));
    const cards = (a.stats || []).map((st, i) => h('div', { class: 'fp-stat' },
      h('div', { class: 'fp-stat-top' },
        h('input', { class: 'fp-stat-name', value: st.name, list: 'fp-attrs', 'data-f': 'attr-nome-' + i, 'aria-label': 'Nome do atributo', onchange: (e) => edit((x) => { x.stats[i].name = e.target.value.trim() || x.stats[i].name; }) }),
        iconBtn('x', 'Remover atributo', () => edit((x) => x.stats.splice(i, 1)))),
      h('input', { class: 'fp-stat-val', value: st.value, 'data-f': 'attr-val-' + i, 'aria-label': 'Valor de ' + st.name, onchange: (e) => edit((x) => { x.stats[i].value = e.target.value; }) }),
      h('div', { class: 'fp-stat-foot' },
        h('span', { class: 'key', title: 'Variável para fórmulas' }, '@' + U.slug(st.name)),
        iconBtn('dices', 'Rolar teste de ' + st.name, () => roll('Teste de ' + st.name, (a.testFormula || '1d20+@valor').replace(/@valor/gi, '(' + (Number(st.value) || 0) + ')'), a)))));
    const formula = (label, key, def, known, attrs = {}, rollIt) => {
      const val = a[key] || def, prob = App.Dice.check(val, known);
      return h('label', {}, label,
        h('div', { class: 'formula-row' },
          h('input', Object.assign({ value: val, class: prob ? 'bad' : '', 'data-f': key, onchange: (e) => edit((x) => { x[key] = e.target.value; }) }, attrs)),
          rollIt ? iconBtn('dices', 'Rolar ' + label.toLowerCase(), rollIt) : null),
        prob ? h('small', { class: 'f-err' }, prob) : null);
    };
    return section('list-ordered', 'Atributos', add,
      cards.length ? h('div', { class: 'fp-stats' }, cards) : h('p', { class: 'empty' }, 'Nenhum atributo ainda.'),
      h('p', { class: 'hint' }, 'Nas fórmulas o atributo vira @nome (ex.: @forca). O dado rola o teste com a fórmula abaixo.'),
      h('div', { class: 'form fp-formulas' },
        formula('Teste de atributo', 'testFormula', '1d20+@valor', knownVars(a, ['valor']), { title: '@valor = valor do atributo. Ex.: 1d20+@valor, 3d6, 1d100' }),
        formula('Iniciativa', 'initFormula', '1d20', knownVars(a), {}, () => roll('Iniciativa', a.initFormula || '1d20', a))),
      h('p', { class: 'hint' }, 'No teste, @valor é o número do atributo rolado. Ex.: 1d20+@valor ou 1d100.'));
  }

  // ---------- Ações ----------
  const isMulti = (ac) => (ac.multi != null ? !!ac.multi : ac.mode === 'save' || ac.mode === 'damage');
  function reachText(ac) {
    if (!ac.mode || ac.mode === 'roll') return '';
    const CB = App.Combat, ar = CB.areaOf(ac);
    return CB.rangeLabel(ac) + (ar ? ` · área ${ar} quad.` : '');
  }
  function summary(ac) {
    let s;
    switch (ac.mode) {
      case 'attack': s = `${ac.attack || '1d20'} vs ${ac.defense || 'Defesa'} → ${ac.damage || '—'} ${ac.bar || ''}`; break;
      case 'save': s = `CD ${ac.dc || '10'} ${ac.save || ''} → ${ac.damage || '—'} (${ac.onSave === 'none' ? 'nada' : 'metade'} se passar)`; break;
      case 'damage': s = `${ac.damage || '0'} de ${ac.bar || 'dano'}${isMulti(ac) ? ' · área' : ''}`; break;
      case 'heal': s = `+${ac.damage || '0'} ${ac.bar || ''}`; break;
      default: s = ac.formula || '';
    }
    const r = reachText(ac);
    return s + (r ? ' · ' + r : '');
  }
  // As fórmulas que a ação rola, para o botão "Testar"
  function actionFormula(ac) {
    const m = ac.mode || 'roll';
    if (m === 'roll') return ac.formula || '1d20';
    if (m === 'attack') return `Ataque: ${ac.attack || '1d20'} | Dano: ${ac.damage || '0'}`;
    if (m === 'save') return `CD: ${ac.dc || '10'} | Dano: ${ac.damage || '0'}`;
    return (m === 'heal' ? 'Cura: ' : 'Dano: ') + (ac.damage || '0');
  }

  function actionsSec(a) {
    const acts = a.actions || [];
    if (F.act != null && !acts[F.act]) F.act = null;
    if (F.act == null && acts.length) F.act = 0;
    const list = h('div', { class: 'fp-act-list' },
      acts.length ? acts.map((ac, i) => {
        const mode = ac.mode || 'roll';
        return h('div', { class: 'act-card fp-act ' + mode + (i === F.act ? ' on' : ''), role: 'button', tabindex: 0,
          onclick: () => { F.act = i; render(); }, onkeydown: (e) => { if (e.key === 'Enter') { F.act = i; render(); } } },
        h('div', { class: 'act-head' },
          h('div', { class: 'grow' },
            h('div', { class: 'act-name' }, ic(MODE_ICON[mode]), ac.name, Number(ac.cost) > 0 ? h('span', { class: 'badge' }, `${ac.cost} ${ac.costBar || ''}`) : null),
            h('div', { class: 'act-sum' }, summary(Object.assign({}, ac, { mode })))),
          iconBtn('x', 'Remover ação', (e) => { e.stopPropagation(); edit((x) => { x.actions.splice(i, 1); if (F.act >= x.actions.length) F.act = x.actions.length - 1; }); })));
      }) : h('p', { class: 'empty' }, 'Nenhuma ação ainda. Ataques, magias, poções…'),
      btnI('plus', 'Nova ação', { class: 'btn small', 'data-add': 'act', onclick: () => edit((x) => {
        (x.actions = x.actions || []).push({ name: 'Novo ataque', mode: 'attack', attack: '1d20', defense: 'Defesa', damage: '1d6', bar: ((x.bars || [])[0] || {}).name || 'PV' });
        F.act = x.actions.length - 1;
      }) }));
    return section('swords', 'Ações', null,
      h('div', { class: 'fp-acts' }, list, F.act != null ? actionForm(a, F.act) : null),
      h('p', { class: 'hint' }, 'Na mesa, o botão roxo da ação pede o alvo no mapa e o sistema rola, compara com a defesa e aplica o dano. Aqui, Testar rola só para você conferir.'));
  }

  function actionForm(a, i) {
    const ac = a.actions[i], mode = ac.mode || 'roll';
    const set = (k, v) => edit((x) => { x.actions[i][k] = v; });
    const field = (label, k, ph, attrs = {}) => h('label', {}, label,
      h('input', Object.assign({ value: ac[k] ?? '', placeholder: ph || '', 'data-f': 'ac-' + k, onchange: (e) => set(k, e.target.value) }, attrs)));
    const formula = (label, k, ph, cls) => {
      const names = (a.stats || []).map((x) => x.name).filter((n) => U.slug(n));
      const prob = App.Dice.check(ac[k], knownVars(a));
      const ins = names.length ? h('select', { class: 'attr-ins', value: '', title: 'Somar um atributo da ficha na fórmula', onchange: (e) => {
        const v = e.target.value; if (!v) return;
        const c = String(ac[k] || '').trim();
        set(k, c ? c + '+@' + v : '1d20+@' + v);
      } }, h('option', { value: '' }, '+ atributo'), names.map((n) => h('option', { value: U.slug(n) }, n))) : null;
      return h('label', { class: cls || '' }, label,
        h('div', { class: 'formula-row' }, h('input', { value: ac[k] ?? '', placeholder: ph || '', class: prob ? 'bad' : '', 'data-f': 'ac-' + k, onchange: (e) => set(k, e.target.value) }), ins),
        prob ? h('small', { class: 'f-err' }, prob) : null);
    };
    const name = (label, k, listId, def) => h('label', {}, label,
      h('input', { value: ac[k] || def, list: listId, 'data-f': 'ac-' + k, onchange: (e) => set(k, e.target.value.trim()) }));

    const form = h('div', { class: 'form act-form' },
      field('Nome', 'name'),
      h('label', {}, 'Tipo', h('select', { value: mode, 'data-f': 'ac-mode', onchange: (e) => set('mode', e.target.value) },
        Object.entries(MODES).map(([k, v]) => h('option', { value: k }, v)))));
    if (mode === 'roll') {
      form.append(formula('Fórmula (separe várias com |)', 'formula', 'Ataque: 1d20+@forca | Dano: 1d8+@forca', 'full'));
    } else if (mode === 'attack') {
      form.append(formula('Rolagem de ataque', 'attack', '1d20+@forca'), name('Contra o atributo do alvo', 'defense', 'fp-attrs', 'Defesa'),
        formula('Dano', 'damage', '1d8+@forca'), field('Crítico a partir do d20 natural', 'critMin', '20', { type: 'number', min: 2, max: 20 }));
    } else if (mode === 'save') {
      form.append(name('Alvo resiste com o atributo', 'save', 'fp-attrs', 'Destreza'), formula('Dificuldade (CD)', 'dc', '13 ou 8+@inteligencia'),
        formula('Dano', 'damage', '8d6'),
        h('label', {}, 'Se o alvo passar', h('select', { value: ac.onSave || 'half', 'data-f': 'ac-onSave', onchange: (e) => set('onSave', e.target.value) },
          h('option', { value: 'half' }, 'Metade do dano'), h('option', { value: 'none' }, 'Nenhum dano'))));
    } else {
      form.append(formula(mode === 'heal' ? 'Cura' : 'Dano', 'damage', mode === 'heal' ? '2d4+2' : '3d4+3'));
    }
    if (mode !== 'roll') {
      form.append(field('Alcance (quadrados)', 'range', App.Combat.defaultRange(Object.assign({}, ac, { mode })) + ' · 1 = corpo a corpo · 0 = sem limite', { type: 'number', min: 0 }));
      if (mode !== 'attack') form.append(field('Área (raio em quadrados)', 'area', '0 = escolhe o alvo', { type: 'number', min: 0 }));
      form.append(
        name('Barra afetada no alvo', 'bar', 'fp-bars', 'PV'),
        h('label', {}, 'Alvos', h('select', { value: String(isMulti(ac)), 'data-f': 'ac-multi', onchange: (e) => set('multi', e.target.value === 'true') },
          h('option', { value: 'false' }, 'Um alvo'), h('option', { value: 'true' }, 'Vários (área)'))),
        field('Custo (0 = nenhum)', 'cost', '0', { type: 'number', min: 0 }),
        name('Gasta da barra', 'costBar', 'fp-bars', 'Mana'));
    }
    return h('div', { class: 'fp-act-edit' },
      h('div', { class: 'fp-act-edit-head' }, ic(MODE_ICON[mode]), h('b', { class: 'grow' }, ac.name),
        btnI('dices', 'Testar', { class: 'btn small', title: 'Rola as fórmulas desta ação só para você', onclick: () => roll(ac.name, actionFormula(ac), a) }),
        btnI('copy-plus', 'Duplicar', { class: 'btn small', onclick: () => edit((x) => { const c = U.clone(x.actions[i]); c.name += ' (cópia)'; x.actions.splice(i + 1, 0, c); F.act = i + 1; }) })),
      form);
  }

  function notesSec(a) {
    return section('file-text', 'Notas', null,
      h('textarea', { class: 'fp-notes', rows: 10, 'data-f': 'notas', value: a.notes || '', placeholder: 'Histórico, inventário, magias, anotações…', onchange: (e) => edit((x) => { x.notes = e.target.value; }) }));
  }

  function footer(a) {
    return h('div', { class: 'fp-foot' },
      btnI('download', 'Exportar', { class: 'btn primary', onclick: () => exportActor(a) }),
      btnI('copy-plus', 'Duplicar', { onclick: () => {
        const c = U.clone(a); c.id = U.uid('ac_'); c.name = a.name + ' (cópia)';
        F.actors[c.id] = c; select(c.id); save();
      } }),
      h('span', { class: 'grow' }),
      btnI('trash-2', 'Excluir', { class: 'btn danger', onclick: () => {
        if (!confirm(`Excluir a ficha "${a.name}" deste navegador? Arquivos já exportados não são apagados.`)) return;
        delete F.actors[a.id];
        F.sel = null;
        saveNow(); render();
      } }));
  }

  // ---------- A partir do bestiário (Plano 25) ----------
  // Uma criatura ou NPC do bestiário vira uma ficha nova aqui, para editar à vontade
  async function fromBestiary() {
    const BS = App.Bestiary;
    const back = h('div', { class: 'modal-back' });
    const imageUrls = new ImageUrls();
    const close = () => { back.remove(); imageUrls.clear(); };
    const list = h('div', { class: 'bst-list fp-bst-list' }, h('p', { class: 'muted' }, 'Abrindo o bestiário…'));
    let q = '';
    const fill = () => {
      list.innerHTML = '';
      imageUrls.clear();
      const s = U.slug(q);
      if (!BS.list.length) { list.append(h('p', { class: 'empty' }, 'Bestiário vazio. Na pasta do Vésper, rode: node tools/importar-5etools.mjs')); return; }
      const L = BS.list.filter((e) => !s || U.slug(e.n).includes(s) || (e.ali || []).some((x) => U.slug(x).includes(s))).slice(0, 200);
      if (!L.length) list.append(h('p', { class: 'empty' }, 'Nada com esse nome.'));
      for (const e of L) list.append(h('button', { class: 'bst-item fp-bst-item', onclick: () => { close(); F.fromEntry(e); } },
        BS.thumb(e, 34, imageUrls), h('div', { class: 'grow' }, h('div', { class: 'name' }, e.n), h('div', { class: 'sub' }, `${e.ty || '—'} · ND ${e.cr == null ? '—' : e.cr} · ${BS.bookName(e.s)} (${e.s})`))));
    };
    const box = h('div', { class: 'modal fp-bst-modal' },
      h('div', { class: 'win-head' }, ic('book-open'), h('span', { class: 'win-title' }, 'A partir do bestiário'), iconBtn('x', 'Fechar', close)),
      h('div', { class: 'win-body' },
        h('p', { class: 'hint' }, 'Escolha uma criatura ou um NPC. Ela vira uma ficha nova aqui, com o token, os atributos, o PV e a ficha completa nas notas.'),
        h('div', { class: 'search-box' }, ic('search'), h('input', { placeholder: 'Buscar pelo nome…', 'data-f': 'bst-busca', oninput: (ev) => { q = ev.target.value; fill(); } })),
        list));
    back.append(box);
    back.addEventListener('pointerdown', (ev) => { if (ev.target === back) close(); });
    document.body.append(back);
    try { await BS.load(); if (!back.isConnected) return; fill(); const s = box.querySelector('input'); if (s) s.focus(); }
    catch (err) { list.textContent = err.message; }
  }
  F.fromBestiary = fromBestiary;
  F.fromEntry = async function (e) {
    const BS = App.Bestiary, m = await BS.full(e);
    if (!m) { U.toast('Não achei ' + e.n + ' no arquivo do livro.', 'error'); return null; }
    const a = BS.toActor(m, e);
    a.id = U.uid('ac_');
    try {
      const file = await BS.imageFile(e);
      if (file) {
        const r = await App.Images.toWebP(file, App.Images.TOKEN);
        a.img = await App.Images.idOf(r.blob);
        setAsset(F.assets, a.img, r.blob);
      }
    } catch (err) { U.toast('Sem imagem: ' + err.message, 'error'); }
    F.actors[a.id] = a;
    select(a.id);
    save();
    U.toast('Ficha criada a partir de ' + e.n + '.');
    return a;
  };

  // ---------- Imagem, exportar, importar ----------
  async function pickImage() {
    const f = await U.pickFile('image/*');
    if (!f) return;
    try {
      const r = await App.Images.toWebP(f, App.Images.TOKEN);
      const id = await App.Images.idOf(r.blob);
      setAsset(F.assets, id, r.blob);
      edit((x) => { x.img = id; });
    } catch (e) { U.toast(e.message, 'error'); }
  }
  F.setImage = (data) => { const id = 'img_' + U.hash(data); setAsset(F.assets, id, data); edit((x) => { x.img = id; }); };

  async function bundle(a) {
    const obj = { format: 'mesarpg-actor', version: 1, actor: U.clone(a) };
    obj.assets = await encodeAssets(usedAssets(obj));
    return obj;
  }
  F.bundle = bundle;
  async function exportActor(a) {
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
      U.download(`ficha_${U.slug(a.name) || 'personagem'}_${stamp}.json`, JSON.stringify(await bundle(a)));
      U.toast('Ficha exportada.');
    } catch (e) { U.toast('Não consegui exportar a ficha: ' + e.message, 'error'); }
  }

  function importObj(obj) {
    if (!obj || obj.format !== 'mesarpg-actor' || !obj.actor) throw new Error('Esse arquivo não é uma ficha. Exporte a ficha pela mesa (Configurar → Exportar).');
    for (const [id, data] of Object.entries(obj.assets || {})) if (/^img_[0-9a-f]{16}$/.test(id) && typeof data === 'string') setAsset(F.assets, id, data);
    const a = U.clone(obj.actor);
    a.id = U.uid('ac_');
    a.kind = KIND[a.kind] ? a.kind : 'pc';
    for (const k of ['bars', 'stats', 'actions']) if (!Array.isArray(a[k])) a[k] = [];
    a.name = String(a.name || 'Ficha importada');
    if (!a.sistema && a.dados5e && App.Bestiary && App.Bestiary.upgrade) App.Bestiary.upgrade(a);
    if (a.sistema === '5e' && App.Regras5e) App.Regras5e.apply(a);
    F.actors[a.id] = a;
    select(a.id);
    saveNow();
    U.toast('Ficha importada!');
    return a;
  }
  F.importObj = importObj;
  async function importFile() {
    const f = await U.pickFile('.json,application/json');
    if (!f) return;
    try { importObj(JSON.parse(await f.text())); }
    catch (e) { U.toast(e instanceof SyntaxError ? 'Arquivo inválido ou corrompido.' : e.message, 'error', 5000); }
  }

  // ---------- Desenho ----------
  function render() {
    if (pending) { clearTimeout(pending); pending = 0; }
    // Guarda o campo em foco: redesenhar não pode tirar o cursor de quem está digitando
    const act = document.activeElement, key = act && act.dataset && act.dataset.f;
    const selS = key && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
    const scroll = $('#fp-main').scrollTop;
    renderSide();
    renderMain();
    $('#fp-main').scrollTop = scroll;
    if (key) {
      const el = document.querySelector(`[data-f="${key}"]`);
      if (el) { el.focus({ preventScroll: true }); if (selS && el.setSelectionRange) try { el.setSelectionRange(selS[0], selS[1]); } catch { /* */ } }
    }
    document.title = (cur() ? cur().name + ' · ' : '') + 'Vésper · Criar ficha';
  }
  F.render = render;

  async function boot() {
    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = App.Icons.svg(el.dataset.icon); });
    let saved = null;
    try { saved = await Promise.race([idbGet('fichas'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]); }
    catch { U.toast('Não consegui acessar o salvamento do navegador. Use Exportar para guardar a ficha.', 'error', 7000); }
    if (saved) { F.actors = saved.actors || {}; F.assets = binaryAssets(saved.assets || {}); }
    // Plano 53: fichas antigas do bestiário viram ficha de criatura 5e
    if (App.Bestiary && App.Bestiary.upgrade) for (const a of Object.values(F.actors)) { try { App.Bestiary.upgrade(a); } catch (e) { console.error(e); } }
    let sel = null;
    try { sel = localStorage.getItem(SEL_KEY); } catch { /* */ }
    F.sel = sel && F.actors[sel] ? sel : null;
    render();
    F.ready = true;
  }
  document.addEventListener('DOMContentLoaded', boot);
})(window.App);
