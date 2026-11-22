'use strict';
import { ImageUrls } from '../src/services/image-assets.ts';
/*
 * Menu do botão direito (Plano 28): clicar com o direito, sem arrastar, abre as opções do que está
 * embaixo do mouse (token, imagem, luz, gatilho, porta, parede, som, nota ou o mapa vazio).
 * O tabuleiro (js/board.js) decide o clique e lista o que está no ponto (B.hitAll); aqui ficam as opções.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const S = () => App.Store;
  const B = () => App.Board;
  const UI = () => App.UI;
  const ic = (n) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n); return t.content.firstChild; };
  const D = (a) => S().dispatch(a);
  const NAME = { token: 'Token', prop: 'Imagem', light: 'Luz', trigger: 'Gatilho', door: 'Porta', wall: 'Parede', sound: 'Som', note: 'Nota', room: 'Isolamento de som' };
  const nameOf = (x) => {
    const o = x.obj;
    if (x.kind === 'token') return o.name || 'Token';
    if (x.kind === 'sound') return App.Audio && App.Audio.label ? App.Audio.label(o.name) : o.name;
    if (x.kind === 'note') return o.title || 'Nota';
    return o.name || (x.kind === 'trigger' && o.portal ? 'Portal' : NAME[x.kind]);
  };

  let menu = null;
  function close() {
    if (!menu) return;
    menu.remove(); menu = null;
    window.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('keydown', onEsc, true);
    window.removeEventListener('wheel', close, true);
  }
  const onOutside = (e) => { if (menu && !menu.contains(e.target)) close(); };
  const onEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };

  // items: [{icon, label, kbd, danger, disabled, on (marcado), sub: [...], run()} | '-' (separador)]
  function render(x, y, title, items) {
    close();
    const build = (list) => h('div', { class: 'cm-list' }, list.filter(Boolean).map((it) => {
      if (it === '-') return h('div', { class: 'cm-sep' });
      if (it.head) return h('div', { class: 'cm-head' }, it.head);
      const row = h('button', { class: 'cm-item' + (it.danger ? ' danger' : '') + (it.on ? ' on' : ''), disabled: !!it.disabled, title: it.title || '' },
        it.icon ? ic(it.icon) : h('span', { class: 'cm-ico' }), h('span', { class: 'grow' }, it.label),
        it.kbd ? h('kbd', {}, it.kbd) : null, it.sub ? ic('chevron-right') : null);
      if (it.sub) {
        const sub = build(it.sub);
        sub.classList.add('cm-sub');
        const wrap = h('div', { class: 'cm-has-sub' }, row, sub);
        row.addEventListener('click', (e) => { e.preventDefault(); wrap.classList.toggle('open'); place(sub, true); });
        wrap.addEventListener('pointerenter', () => { wrap.classList.add('open'); place(sub, true); });
        wrap.addEventListener('pointerleave', () => wrap.classList.remove('open'));
        return wrap;
      }
      row.addEventListener('click', () => { close(); try { it.run && it.run(); } catch (err) { U.toast(err.message, 'error'); } });
      return row;
    }));
    menu = h('div', { class: 'ctx-menu', role: 'menu' }, title ? h('div', { class: 'cm-title' }, title) : null, build(items));
    document.body.append(menu);
    // Nunca sai da tela
    const r = menu.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    menu.style.left = Math.max(6, Math.min(x, W - r.width - 6)) + 'px';
    menu.style.top = Math.max(6, Math.min(y, H - r.height - 6)) + 'px';
    setTimeout(() => {
      window.addEventListener('pointerdown', onOutside, true);
      window.addEventListener('keydown', onEsc, true);
      window.addEventListener('wheel', close, true);
    }, 0);
  }
  // Submenu do lado que cabe
  function place(sub) {
    sub.classList.remove('left', 'up');
    const r = sub.getBoundingClientRect();
    if (r.right > window.innerWidth - 4) sub.classList.add('left');
    if (r.bottom > window.innerHeight - 4) sub.classList.add('up');
  }

  // ---------- Opções de cada coisa ----------
  const A = () => App.Anim;
  function animItems(sc, kind, o) {
    const key = A().keyOf(kind, o.id), has = o.anim && (o.anim.steps || []).length, running = A().running(sc, key).length > 0;
    return [
      { icon: 'move', label: has ? 'Animação…' : 'Criar animação…', run: () => UI().openAnimEditor({ mode: 'own', sceneId: sc.id, kind, id: o.id }) },
      has ? (running ? { icon: 'pause', label: 'Parar animação', run: () => A().stop(sc.id, [key], 'stop') } : { icon: 'play', label: 'Tocar animação', run: () => A().play(sc.id, [key], null) }) : null,
    ];
  }
  const order = (sc, kind, o) => [
    { icon: 'bring-to-front', label: 'Trazer para frente', run: () => D({ type: kind + '.update', sceneId: sc.id, id: o.id, patch: { z: B().maxZ(sc) + 1 } }) },
    { icon: 'send-to-back', label: 'Mandar para trás', run: () => D({ type: kind + '.update', sceneId: sc.id, id: o.id, patch: { z: B().minZ(sc) - 1 } }) },
  ];
  // Abre o painel do objeto (no modo Apresentar ele flutua; só abre por aqui)
  function panel(kind, o) { B().selectObj(kind, o); UI().hudFor = UI().selKey(); UI().refresh(); B().requestRender(); }

  function tokenItems(sc, t) {
    const gm = S().gmView(), a = S().actorOf(t), can = S().canControl(t), st = S().state;
    const out = [];
    if (a && S().ownsActor(a)) out.push({ icon: 'scroll-text', label: 'Ficha', run: () => UI().openActor(a.id) });
    if (gm || can) out.push({ icon: 'sliders-horizontal', label: 'Painel do token', run: () => panel('token', t) });
    const acts = (a && a.actions) || [];
    if (can && acts.length) out.push({ icon: 'swords', label: 'Ações', sub: acts.map((ac, i) => ({ icon: (UI().MODE_ICON || {})[ac.mode || 'roll'] || 'dices', label: ac.name, kbd: i < 9 ? String(i + 1) : '',
      run: () => { B().selectObj('token', t); UI().useAction(a, i, t); } })) });
    if (can) {
      const conds = t.conditions || [];
      out.push({ icon: 'flag', label: 'Condições', sub: (st.conditions || []).map((c) => {
        const on = conds.some((x) => x.name === c);
        return { label: c, on, icon: on ? 'check' : null, run: () => D({ type: 'token.update', sceneId: sc.id, id: t.id, patch: { conditions: on ? conds.filter((x) => x.name !== c) : conds.concat([{ name: c, rounds: 0 }]) } }) };
      }) });
    }
    if (gm && sc.light && sc.light.enabled) {
      const li = t.light || {};
      out.push({ icon: 'flame', label: 'Lanterna e luz', sub: App.Light.PRESETS.map((p) => ({ label: p.dim ? `${p.label} (${p.bright}/${p.dim})` : p.label, on: (Number(li.dim) || 0) === p.dim && (Number(li.bright) || 0) === p.bright,
        run: () => D({ type: 'token.update', sceneId: sc.id, id: t.id, patch: { light: p.dim ? Object.assign({}, t.light || {}, { bright: p.bright, dim: p.dim, flicker: !!p.flicker }) : null } }) })) });
      out.push({ icon: 'eye', label: 'Visão no escuro', sub: App.Light.DARKVISION.map(([v, l]) => ({ label: v ? l : 'Sem visão no escuro', on: (Number(t.darkvision) || 0) === v,
        run: () => D({ type: 'token.update', sceneId: sc.id, id: t.id, patch: { darkvision: v } }) })) });
    }
    if (gm) {
      out.push('-',
        { icon: t.hidden ? 'eye' : 'eye-off', label: t.hidden ? 'Mostrar aos jogadores' : 'Esconder dos jogadores', run: () => D({ type: 'token.update', sceneId: sc.id, id: t.id, patch: { hidden: !t.hidden } }) },
        { icon: 'users', label: t.masked ? 'Deixar de ser vulto' : 'Virar vulto', title: 'Os jogadores veem só a silhueta', run: () => D({ type: 'token.update', sceneId: sc.id, id: t.id, patch: { masked: !t.masked } }) },
        ...order(sc, 'token', t),
        a ? { icon: 'copy-plus', label: 'Outro igual', title: 'Coloca mais um token desta ficha ao lado', run: () => B().placeActor(a.id, { x: t.x + ((t.size || 1) + 0.5) * sc.grid, y: t.y + ((t.size || 1) / 2) * sc.grid }) } : null,
        { icon: 'trash-2', label: 'Apagar token', kbd: 'Del', danger: true, run: () => { D({ type: 'token.delete', sceneId: sc.id, id: t.id }); if (B().selected === t.id) B().selected = null; } });
    }
    return out;
  }
  function propItems(sc, p) {
    return [
      { icon: 'sliders-horizontal', label: 'Editar', run: () => panel('prop', p) },
      ...animItems(sc, 'prop', p),
      { icon: 'swords', label: p.hurt && p.hurt.on ? 'Área de dano: trocar' : 'Área de dano…', run: () => { panel('prop', p); B().editHurt(sc, p.id); } },
      { icon: p.locked ? 'lock-open' : 'lock', label: p.locked ? 'Destravar' : 'Travar', run: () => D({ type: 'prop.update', sceneId: sc.id, id: p.id, patch: { locked: !p.locked } }) },
      { icon: p.hidden ? 'eye' : 'eye-off', label: p.hidden ? 'Mostrar aos jogadores' : 'Esconder dos jogadores', run: () => D({ type: 'prop.update', sceneId: sc.id, id: p.id, patch: { hidden: !p.hidden } }) },
      ...order(sc, 'prop', p),
      '-',
      { icon: 'copy-plus', label: 'Duplicar', kbd: 'Ctrl+D', run: () => B().duplicateProp(sc, p.id) },
      { icon: 'trash-2', label: 'Apagar', kbd: 'Del', danger: true, run: () => { B().selectObj('prop', p); B().keyAct('Delete'); } },
    ];
  }
  function lightItems(sc, o) {
    const on = o.on !== false;
    return [
      { icon: 'sliders-horizontal', label: 'Editar', run: () => panel('light', o) },
      { icon: on ? 'lightbulb-off' : 'lightbulb', label: on ? 'Apagar a luz' : 'Acender a luz', run: () => D({ type: 'lightpt.update', sceneId: sc.id, id: o.id, patch: { on: !on } }) },
      ...animItems(sc, 'light', o),
      '-',
      { icon: 'copy-plus', label: 'Duplicar', kbd: 'Ctrl+D', run: () => B().duplicateLight(sc, o.id) },
      { icon: 'trash-2', label: 'Apagar', kbd: 'Del', danger: true, run: () => { B().selectObj('light', o); B().keyAct('Delete'); } },
    ];
  }
  // Portal (Plano 31)
  function portalItems(sc, tr) {
    const TG = App.Triggers, on = tr.enabled !== false, d = TG.portalDest(sc, tr), far = d && d.scene.id !== sc.id, back = TG.portalPartner(sc, tr);
    return [
      { icon: 'sliders-horizontal', label: 'Configurar', run: () => panel('trigger', tr) },
      far ? { icon: 'map', label: 'Ir para o destino', title: 'Abre a outra cena na sua tela (os jogadores não mudam)', run: () => { S().viewSceneId = d.scene.id; S().emit('local'); } } : null,
      { icon: 'link', label: back ? 'Ligar a outro portal' : 'Ligar a um portal', title: 'Clique no portal (desta cena ou de outra) que vai ser ligado', run: () => { panel('trigger', tr); UI().portalLink(sc, tr, back ? back.scene.id : sc.id); } },
      { icon: on ? 'pause' : 'play', label: on ? 'Desligar' : 'Ligar', run: () => D({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch: { enabled: !on } }) },
      '-',
      { icon: 'trash-2', label: 'Apagar', kbd: 'Del', danger: true, run: () => { D({ type: 'trigger.delete', sceneId: sc.id, id: tr.id }); if (B().selectedTrigger === tr.id) B().selectedTrigger = null; } },
    ].filter(Boolean);
  }
  function triggerItems(sc, tr) {
    if (tr.portal) return portalItems(sc, tr);
    const TG = App.Triggers, on = tr.enabled !== false;
    return [
      { icon: 'settings-2', label: 'Configurar…', run: () => { B().selectObj('trigger', tr); UI().openTrigger(sc.id, tr.id); } },
      { icon: 'eye', label: 'Testar (só na sua tela)', run: () => { B().selectObj('trigger', tr); TG.simulate(sc.id, tr.id); } },
      { icon: 'zap', label: 'Disparar agora', run: () => TG.fire(sc.id, tr.id, null, { manual: true }) },
      { icon: on ? 'pause' : 'play', label: on ? 'Desligar' : 'Ligar', run: () => D({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch: { enabled: !on } }) },
      { icon: 'refresh-cw', label: 'Rearmar', run: () => D({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch: { used: 0, lastAt: 0 } }) },
      '-',
      { icon: 'copy-plus', label: 'Duplicar', kbd: 'Ctrl+D', run: () => B().duplicateTrigger(sc, tr.id) },
      { icon: 'trash-2', label: 'Apagar', kbd: 'Del', danger: true, run: () => { D({ type: 'trigger.delete', sceneId: sc.id, id: tr.id }); if (B().selectedTrigger === tr.id) B().selectedTrigger = null; UI().closeWindow('trigger:' + tr.id); } },
    ];
  }
  const COVER = [['full', 'Parede absoluta (nunca deixa ver)'], ['high', 'Muro alto'], ['three', 'Meia parede alta (ombro)'], ['half', 'Meia parede (cintura)'], ['window', 'Janela']];
  const coverSub = (sc, ids, cur, noWindow) => COVER.filter(([k]) => !(noWindow && k === 'window')).map(([k, l]) => ({ label: l, on: cur === k, run: () => D({ type: 'wall.update', sceneId: sc.id, ids, patch: { cover: k } }) }));
  // Parede mágica (Plano 57): Ligar/Desligar se já é mágica; senão, tornar mágica
  const magicItems = (sc, w, ids) => (w.magic ? [
    { icon: 'sparkles', label: w.off ? 'Ligar' : 'Desligar', run: () => D({ type: 'wall.magic', sceneId: sc.id, ids, off: !w.off }) },
    { icon: 'x', label: 'Deixar de ser mágica', run: () => D({ type: 'wall.update', sceneId: sc.id, ids, patch: { magic: false } }) },
  ] : [{ icon: 'sparkles', label: 'Tornar mágica', title: 'Você liga e desliga quando quiser. Desligada, é como se não existisse', run: () => D({ type: 'wall.update', sceneId: sc.id, ids, patch: { magic: true } }) }]);
  function windowItems(sc, w) {
    const gm = S().gmView();
    if (!gm) return [{ icon: w.open ? 'app-window' : 'door-open', label: w.open ? 'Fechar a janela' : 'Abrir a janela', disabled: !w.playersOpen, run: () => D({ type: 'wall.door', sceneId: sc.id, id: w.id, open: !w.open }) }];
    return [
      { icon: w.open ? 'app-window' : 'door-open', label: w.open ? 'Fechar a janela' : 'Abrir a janela', run: () => D({ type: 'wall.door', sceneId: sc.id, id: w.id, open: !w.open }) },
      { icon: w.playersOpen ? 'crown' : 'users', label: w.playersOpen ? 'Só eu abro' : 'Jogadores podem abrir', run: () => D({ type: 'wall.update', sceneId: sc.id, id: w.id, patch: { playersOpen: !w.playersOpen } }) },
      ...magicItems(sc, w, [w.id]),
      { icon: 'sliders-horizontal', label: 'Editar', run: () => panel('door', w) },
      { icon: 'brick-wall', label: 'Tipo de parede', sub: coverSub(sc, [w.id], 'window') },
      '-',
      { icon: 'trash-2', label: 'Apagar a janela', danger: true, run: () => D({ type: 'wall.delete', sceneId: sc.id, id: w.id }) },
    ];
  }
  function doorItems(sc, w) {
    if (w.window) return windowItems(sc, w);
    const gm = S().gmView();
    return [
      { icon: w.open ? 'door-closed' : 'door-open', label: w.open ? 'Fechar a porta' : 'Abrir a porta', disabled: !gm && w.locked && !w.open, title: !gm && w.locked ? 'Trancada' : '', run: () => D({ type: 'wall.door', sceneId: sc.id, id: w.id, open: !w.open }) },
      gm ? { icon: w.locked ? 'lock-open' : 'lock', label: w.locked ? 'Destrancar' : 'Trancar', run: () => D({ type: 'wall.lock', sceneId: sc.id, id: w.id, locked: !w.locked }) } : null,
      gm ? { icon: 'sliders-horizontal', label: 'Editar', run: () => panel('door', w) } : null,
      gm ? { icon: 'brick-wall', label: 'Tipo de parede', sub: coverSub(sc, [w.id], w.cover || 'full', true) } : null,
      gm ? '-' : null,
      gm ? { icon: 'trash-2', label: 'Apagar a porta', danger: true, run: () => D({ type: 'wall.delete', sceneId: sc.id, id: w.id }) } : null,
    ];
  }
  function wallItems(sc, w) {
    const stroke = w.stroke ? (sc.walls || []).filter((x) => x.stroke === w.stroke).map((x) => x.id) : [w.id];
    return [
      { icon: 'brick-wall', label: 'Tipo de parede', sub: coverSub(sc, stroke, w.cover || 'full') },
      ...magicItems(sc, w, stroke),
      '-',
      stroke.length > 1 ? { icon: 'eraser', label: `Apagar o traço (${stroke.length} paredes)`, danger: true, run: () => D({ type: 'wall.delete', sceneId: sc.id, ids: stroke }) } : null,
      { icon: 'trash-2', label: 'Apagar esta parede', danger: true, run: () => D({ type: 'wall.delete', sceneId: sc.id, id: w.id }) },
    ];
  }
  function soundItems(sc, s) {
    const Au = App.Audio;
    return [
      s.once ? { icon: 'play', label: 'Tocar', run: () => Au.trigger(s) } : { icon: s.on ? 'volume-x' : 'volume-2', label: s.on ? 'Desligar' : 'Ligar', run: () => D({ type: 'sound.update', sceneId: sc.id, id: s.id, patch: s.on ? { on: false } : { on: true, at: Date.now() } }) },
      { icon: 'sliders-horizontal', label: 'Editar', run: () => panel('sound', s) },
      '-',
      { icon: 'trash-2', label: 'Apagar', danger: true, run: () => { D({ type: 'sound.delete', sceneId: sc.id, id: s.id }); if (B().selectedSound === s.id) B().selectedSound = null; } },
    ];
  }
  function roomItems(sc, r) {
    const upd = (patch) => D({ type: 'room.update', sceneId: sc.id, id: r.id, patch });
    const out = r.outside || 'stop', amb = r.ambient || 'stop';
    return [
      { icon: 'sliders-horizontal', label: 'Configurar', run: () => panel('room', r) },
      { icon: 'music', label: 'Música de fora', sub: [['keep', 'Continua'], ['stop', 'Para']].map(([k, l]) => ({ label: l, on: out === k, run: () => upd({ outside: k }) })) },
      { icon: 'wind', label: 'Ambiente de fora', sub: [['stop', 'Para'], ['muffle', 'Abafado'], ['keep', 'Continua']].map(([k, l]) => ({ label: l, on: amb === k, run: () => upd({ ambient: k }) })) },
      { icon: 'pencil', label: 'Ajustar formato', run: () => { B().setTool('room'); panel('room', r); } },
      '-',
      { icon: 'trash-2', label: 'Apagar', danger: true, run: () => { D({ type: 'room.delete', sceneId: sc.id, id: r.id }); if (B().selectedRoom === r.id) B().selectedRoom = null; } },
    ];
  }
  function noteItems(sc, n) {
    return [
      { icon: 'file-text', label: 'Abrir', run: () => { B().selectObj('note', n); UI().openNote(sc.id, n.id); } },
      { icon: 'copy-plus', label: 'Duplicar', run: () => B().duplicateNote(sc, n.id) },
      '-',
      { icon: 'trash-2', label: 'Apagar', danger: true, run: () => { D({ type: 'note.delete', sceneId: sc.id, id: n.id }); UI().closeWindow('note:' + n.id); if (B().selectedNote === n.id) B().selectedNote = null; } },
    ];
  }
  function emptyItems(sc, p) {
    const gm = S().gmView(), Bd = B();
    const ping = { icon: 'target', label: 'Ping aqui', title: 'Todos veem um sinal neste ponto', run: () => App.Net.ping({ t: 'ping', sceneId: sc.id, x: p.x, y: p.y, color: S().me.color, name: S().me.name }) };
    if (!gm) return [ping];
    return [
      { icon: 'user-round', label: 'Colocar ficha aqui…', run: () => placeHere(sc, p) },
      { icon: 'lightbulb', label: 'Luz aqui', run: () => { const o = Bd.addLight(sc, { x: p.x, y: p.y }); if (o) panel('light', o); } },
      { icon: 'zap', label: 'Gatilho aqui', run: () => Bd.addTrigger(sc, { shape: 'circle', x: p.x, y: p.y, r: 0.5, portal: false }) },
      { icon: 'sparkles', label: 'Portal aqui', title: 'Quem pisa aqui vai para outro ponto ou outra cena', run: () => { const tr = Bd.addTrigger(sc, { shape: 'circle', x: Math.floor(p.x / sc.grid) * sc.grid + sc.grid / 2, y: Math.floor(p.y / sc.grid) * sc.grid + sc.grid / 2, r: 0.5, portal: true }); if (tr) panel('trigger', tr); } },
      { icon: 'file-text', label: 'Nota aqui', run: () => Bd.addNote(sc, p) },
      Bd.clipboard ? { icon: 'copy', label: 'Colar aqui', kbd: 'Ctrl+V', run: () => Bd.paste(sc, p) } : null,
      '-',
      ping,
      { icon: 'map-pin', label: 'Centralizar aqui', run: () => Bd.centerOn(p.x, p.y) },
      { icon: UI().collapsed && UI().collapsed.right ? 'panel-right-open' : 'panel-right-close', label: UI().collapsed && UI().collapsed.right ? 'Abrir a barra da direita' : 'Recolher a barra da direita', run: () => UI().setCollapsed('right', !(UI().collapsed && UI().collapsed.right)) },
    ];
  }
  function multiItems(sc) {
    return [
      { head: B().multi.size + ' selecionados' },
      { icon: 'sliders-horizontal', label: 'Painel da seleção', run: () => { UI().hudFor = 'multi'; UI().refresh(); } },
      { icon: 'copy-plus', label: 'Duplicar', kbd: 'Ctrl+D', run: () => B().keyAct('d', true) },
      { icon: 'copy', label: 'Copiar', kbd: 'Ctrl+C', run: () => B().keyAct('c', true) },
      { icon: 'trash-2', label: 'Apagar', kbd: 'Del', danger: true, run: () => B().keyAct('Delete') },
    ];
  }
  const ITEMS = { token: tokenItems, prop: propItems, light: lightItems, trigger: triggerItems, door: doorItems, wall: wallItems, sound: soundItems, note: noteItems, room: roomItems };

  // "Colocar ficha aqui": busca nas fichas da campanha e no bestiário; o token entra no ponto clicado
  function placeHere(sc, p) {
    const back = h('div', { class: 'modal-back' });
    const imageUrls = new ImageUrls();
    const close2 = () => { back.remove(); imageUrls.clear(); };
    const list = h('div', { class: 'bst-list cm-place-list' });
    let q = '';
    const BS = App.Bestiary;
    const fill = () => {
      if (!back.isConnected) return;
      list.innerHTML = '';
      imageUrls.clear();
      const s = U.slug(q);
      const actors = Object.values(S().state.actors).filter((a) => !s || U.slug(a.name).includes(s)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
      if (actors.length) list.append(h('div', { class: 'eyebrow' }, 'Fichas da campanha'));
      for (const a of actors) list.append(h('button', { class: 'bst-item cm-place-item', onclick: () => { close2(); B().placeActor(a.id, p); } }, h('span', { class: 'grow' }, h('div', { class: 'name' }, a.name), h('div', { class: 'sub' }, { pc: 'Personagem', npc: 'NPC', monster: 'Criatura' }[a.kind] || ''))));
      if (BS && BS.ready && s.length >= 2) {
        const L = BS.list.filter((e) => U.slug(e.n).includes(s)).slice(0, 40);
        if (L.length) list.append(h('div', { class: 'eyebrow' }, 'Bestiário'));
        for (const e of L) list.append(h('button', { class: 'bst-item cm-place-item', onclick: async () => { close2(); try { await BS.place(e.k, p); } catch (err) { U.toast(err.message, 'error'); } } },
          BS.thumb(e, 30, imageUrls), h('span', { class: 'grow' }, h('div', { class: 'name' }, e.n), h('div', { class: 'sub' }, `${e.ty || '—'} · ND ${e.cr == null ? '—' : e.cr} · ${e.s}`))));
      }
      if (!list.children.length) list.append(h('p', { class: 'empty' }, s.length < 2 ? 'Digite o nome (fichas e bestiário).' : 'Nada com esse nome.'));
    };
    const input = h('input', { placeholder: 'Nome da ficha ou da criatura…', oninput: (ev) => { q = ev.target.value; fill(); }, onkeydown: (ev) => { if (ev.key === 'Escape') close2(); if (ev.key === 'Enter') { const b = list.querySelector('.cm-place-item'); if (b) b.click(); } } });
    back.append(h('div', { class: 'modal cm-place' },
      h('div', { class: 'win-head' }, ic('user-round'), h('span', { class: 'win-title' }, 'Colocar ficha aqui'), h('button', { class: 'icon-btn', title: 'Fechar', onclick: close2 }, ic('x'))),
      h('div', { class: 'win-body' }, h('div', { class: 'search-box' }, ic('search'), input), list)));
    back.addEventListener('pointerdown', (ev) => { if (ev.target === back) close2(); });
    document.body.append(back);
    fill(); input.focus();
    if (BS && !BS.ready) BS.load().then(fill).catch(() => {});
  }

  // Abre o menu para o que está no ponto (hits: do de cima para o de baixo)
  App.UI.contextMenu = function (x, y, sc, p, hits) {
    if (!sc) return;
    const Bd = B();
    // Clicou em algo da seleção múltipla: opções da seleção
    if (Bd.multi && Bd.multi.size && hits.some((hx) => Bd.multi.has(hx.kind + ':' + hx.obj.id))) { render(x, y, null, multiItems(sc)); return; }
    if (!hits.length) { render(x, y, S().gmView() ? 'Mapa' : null, emptyItems(sc, p)); return; }
    const top = hits[0], others = hits.slice(1);
    const items = (ITEMS[top.kind] || (() => []))(sc, top.obj).slice();
    if (others.length) items.push('-', { icon: 'layers', label: 'Outros aqui', sub: others.map((o) => ({ label: NAME[o.kind] + ': ' + nameOf(o), run: () => App.UI.contextMenu(x, y, sc, p, [o]) })) });
    render(x, y, (top.kind === 'trigger' && top.obj && top.obj.portal ? 'Portal' : NAME[top.kind]) + ' · ' + nameOf(top), items);
  };
  App.UI.closeContextMenu = close;
})(window.App);
