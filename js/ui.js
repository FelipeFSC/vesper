'use strict';
import { referencedAssets, setAsset } from '../src/services/image-assets.ts';
import { flushSync, mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import BoardResolution from '../src/ui/BoardResolution.svelte';
import ChatLog from '../src/ui/ChatLog.svelte';
import WindowChrome from '../src/ui/WindowChrome.svelte';
import { mergePanelChange } from '../src/domain/ui-changes.ts';
/* Interface: barra superior, laterais (fichas/cenas · propriedades/camadas), ferramentas do mapa,
 * dock inferior (chat, dados, combate, mesa), janelas de ficha, painel do token e modais. */
(function (App) {
  const { U } = App;
  const h = U.h;
  const $ = (s) => document.querySelector(s);
  const S = () => App.Store;

  const UI = {
    tab: null, leftTab: 'actors', rightTab: 'props', mode: 'edit',
    secret: false, filter: '', windows: new Map(), started: false, z: 10,
    chatSig: '', seenChatId: null, feedId: null, turnKey: '', openActs: new Set(),
    dice: { pool: {}, mod: 0 },
  };

  // Ícones (Lucide, embutidos em icons.js)
  const icHtml = (n, cls) => App.Icons.svg(n, cls);
  const ic = (n, cls) => { const t = document.createElement('template'); t.innerHTML = icHtml(n, cls); return t.content.firstChild; };
  const fillIcons = (root) => root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstChild) el.innerHTML = icHtml(el.dataset.icon); });
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn' }, attrs), ic(icon), label);
  const iconBtn = (icon, title, onclick, attrs = {}) => h('button', Object.assign({ class: 'icon-btn', title, onclick }, attrs), ic(icon));
  UI.icon = ic;

  const TOOLS = [
    { id: 'select', icon: 'mouse-pointer-2', title: 'Selecionar e mover (V)\nArrastar no vazio move a câmera' },
    { id: 'pan', icon: 'hand', title: 'Mover a câmera (H)\nOu: botão direito/meio, ou segurar Espaço' },
    { id: 'ruler', icon: 'ruler', title: 'Régua (R)' },
    { id: 'ping', icon: 'map-pin', title: 'Ping: chamar a atenção de todos (P)' },
    { sep: true, edit: true },
    { id: 'path', icon: 'pencil', title: 'Desenho livre (D)', edit: true, draw: true },
    { id: 'line', icon: 'slash', title: 'Linha / parede (L)', edit: true, draw: true },
    { id: 'rect', icon: 'square', title: 'Retângulo / sala (B)', edit: true, draw: true },
    { id: 'ellipse', icon: 'circle', title: 'Círculo / área de efeito (E)', edit: true, draw: true },
    { id: 'erase', icon: 'eraser', title: 'Apagar desenho (X)', edit: true },
    { sep: true, gm: true, edit: true },
    { id: 'fog-reveal', icon: 'sun', title: 'Névoa: revelar área (F)', gm: true, edit: true },
    { id: 'fog-hide', icon: 'cloud-fog', title: 'Névoa: esconder área (G)', gm: true, edit: true },
    { id: 'wall', icon: 'brick-wall', title: 'Parede (W): absoluta, total, três quartos ou meia\nReta (de um canto do grid a outro) ou Lápis (à mão livre)', gm: true, edit: true },
    { id: 'door', icon: 'door-closed', title: 'Porta (O): parede que abre e fecha\nClique no marcador dourado para abrir', gm: true, edit: true },
    { id: 'light', icon: 'lightbulb', title: 'Luz (U): pontos de luz e de escuridão no mapa\nCírculo, cone ou área, com cor', gm: true, edit: true },
    { id: 'prop', icon: 'image', title: 'Imagem (I): coloque imagens soltas no mapa\nArraste arquivos do computador para o mapa ou use a biblioteca', gm: true, edit: true },
    { id: 'note', icon: 'file-text', title: 'Nota (N): alfinete com anotações só suas (os jogadores nunca veem)\nClique no mapa para criar; clique no alfinete para abrir', gm: true, edit: true },
    { id: 'trigger', icon: 'zap', title: 'Gatilho (T): o mapa reage quando alguém entra, sai ou clica numa imagem\nPortas, luzes, tokens, sons, armadilhas, névoa', gm: true, edit: true },
    { id: 'portal', icon: 'sparkles', title: 'Portal (K): quem pisa na área vai para outro ponto do mapa ou para outra cena\nEscadas, vagões, portas mágicas', gm: true, edit: true },
    { id: 'room', icon: 'volume-x', title: 'Isolamento de som (M): borda que nenhum som do mapa atravessa\nClique em cada canto (ou arraste um retângulo). Não tapa a visão nem impede de andar', gm: true, edit: true },
  ];
  const DOCK = [
    { id: 'chat', icon: 'message-square', label: 'Chat' },
    { id: 'dice', icon: 'dices', label: 'Dados' },
    { id: 'combat', icon: 'swords', label: 'Combate' },
    { id: 'audio', icon: 'music', label: 'Som', gm: true },
    { id: 'handouts', icon: 'scroll-text', label: 'Mostrar', gm: true },
  ];
  const PANEL_TITLE = { chat: 'Chat', dice: 'Dados', combat: 'Combate', table: 'Mesa', audio: 'Som', handouts: 'Mostrar aos jogadores' };
  const KIND = { pc: 'Personagem', npc: 'NPC', monster: 'Criatura' };
  const KIND_GROUP = { pc: 'Personagens', npc: 'NPCs', monster: 'Criaturas' };
  const DRAW_COLORS = ['#e8e6ef', '#8f8d9a', '#1c1c21', '#d9574f', '#e07b4f', '#d2a24c', '#4fb27a', '#3f8f86', '#5b8be0', '#8b72f0'];

  // =============== Início / ciclo de render ===============
  UI.start = function () {
    if (UI.started) return;
    UI.started = true;
    $('#lobby').hidden = true;
    $('#app').hidden = false;
    UI.mode = S().role === 'player' ? 'play' : 'edit';
    fillIcons(document.body);
    buildStatic();
    buildChatPanel();
    App.Board.init($('#board'));
    App.Audio.init();
    App.Audio.on(() => { if (UI.tab === 'audio') renderAudio(true); });
    S().on((kind, action) => UI.schedule(kind, action));
    UI.schedule('reset');
    window.addEventListener('beforeunload', () => { if (S().gmView()) App.Storage.save(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => App.Board.requestRender());
  };

  function buildStatic() {
    $('#btn-invite').onclick = () => U.copy(App.Net.inviteLink());
    $('#btn-home').onclick = () => UI.backToMenu();
    $('#btn-mode').onclick = () => UI.setMode(UI.mode === 'edit' ? 'play' : 'edit');
    $('#crumb-campaign').onclick = () => UI.showTab('table');
    $('#crumb-scene').onclick = () => {
      if (!S().gmView()) return;
      if (UI.mode !== 'edit') UI.setMode('edit');
      UI.leftTab = 'scenes'; renderLeft();
    };
    $('#dock-close').onclick = () => UI.closeDock();
    const menu = $('#main-menu');
    $('#btn-menu').onclick = (e) => { e.stopPropagation(); if (menu.hidden) { renderMenu(); menu.hidden = false; } else menu.hidden = true; };
    document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !e.target.closest('.menu-wrap')) menu.hidden = true; });
    for (const b of document.querySelectorAll('#zoom [data-z]')) {
      b.onclick = () => { const z = b.dataset.z; if (z === 'fit') App.Board.fit(); else App.Board.zoomBy(z === 'in' ? 1.25 : 0.8); };
    }
    const dock = $('#dock');
    dock.className = 'float-group';
    for (const d of DOCK) {
      if (d.gm && !S().isGM()) continue;
      dock.append(h('button', { class: 'dock-btn', 'data-dock': d.id, onclick: () => (UI.tab === d.id ? UI.closeDock() : UI.showTab(d.id)) },
        ic(d.icon), d.label, d.id === 'chat' ? h('span', { class: 'count', hidden: true }) : null));
    }
    // HUD flutuante perde o foco: redesenha (atualiza valores)
    $('#token-hud').addEventListener('focusout', () => setTimeout(() => App.Board.requestRender(), 0));
    $('#props-slot').prepend(h('div', { id: 'props-empty', class: 'empty-state' },
      h('div', { class: 'bubble' }, ic('mouse-pointer-2')), h('b', {}, 'Nada selecionado'),
      h('p', {}, 'Selecione um token no mapa para ver barras, condições e ações.')));
    applyCollapsed();
    UI.setMode(UI.mode, true);
  }

  // Modo de edição (laterais abertas) × apresentação (só o mapa)
  UI.setMode = function (mode, silent) {
    UI.mode = mode;
    $('#app').classList.toggle('play', mode === 'play');
    const b = $('#btn-mode');
    b.innerHTML = '';
    if (mode === 'edit') { b.className = 'btn primary'; b.append(ic('play'), 'Apresentar'); b.title = 'Esconde os painéis e mostra só a mesa de jogo'; }
    else { b.className = 'btn'; b.append(ic('pen-line'), S().gmView() ? 'Editar' : 'Painéis'); b.title = 'Mostra os painéis laterais (fichas, propriedades)'; }
    placeHud();
    if (mode === 'play' && ['path', 'line', 'rect', 'ellipse', 'erase', 'fog-reveal', 'fog-hide'].includes(App.Board.tool)) App.Board.tool = 'select';
    toolbarKey = null;
    if (!silent) { UI.refresh(); setTimeout(() => { App.Board.resize(); App.Board.fit(); }, 0); }
  };

  // ---------- Barras laterais recolhidas (Plano 15) ----------
  // Recolhida, a barra vira uma faixa fina com ícones. O navegador lembra (só nesta máquina).
  UI.collapsed = { left: false, right: false };
  try { Object.assign(UI.collapsed, JSON.parse(localStorage.getItem('vesper.paineis') || '{}')); } catch { /* sem armazenamento */ }
  // Painel do token flutua sobre o mapa no modo Apresentar e quando a barra da direita está recolhida
  function hudFloats() { return UI.mode === 'play' || !!UI.collapsed.right; }
  // O que está selecionado agora (para saber se o painel flutuante foi pedido para isto)
  UI.hudFor = null;
  UI.selKey = function () {
    const B = App.Board;
    if (!B) return '';
    if (B.multi && B.multi.size) return 'multi';
    for (const k of ['selectedNote', 'selectedTrigger', 'selectedDoor', 'selectedLight', 'selectedSound', 'selectedProp', 'selectedRoom', 'selected']) if (B[k]) return k + ':' + B[k];
    return '';
  };
  function placeHud() {
    const hud = $('#token-hud');
    if (!hud) return;
    const fl = hudFloats();
    hud.classList.toggle('floating', fl);
    if (fl) $('#board-wrap').append(hud); else $('#props-slot').append(hud);
    hud._sig = null;
  }
  UI.setCollapsed = function (side, v) {
    UI.collapsed[side] = !!v;
    try { localStorage.setItem('vesper.paineis', JSON.stringify(UI.collapsed)); } catch { /* sem armazenamento */ }
    applyCollapsed();
    placeHud();
    for (const sel of ['#left-tabs', '#right-tabs']) { const e = $(sel); if (e) e._sig = null; }
    UI.refresh();
    setTimeout(() => { App.Board.resize(); UI.fitToolOpts(); }, 0);
  };
  function applyCollapsed() {
    const app = $('#app');
    if (!app) return;
    app.classList.toggle('left-min', !!UI.collapsed.left);
    app.classList.toggle('right-min', !!UI.collapsed.right);
  }
  UI.applyCollapsed = applyCollapsed;

  // Mestre vendo a mesa exatamente como um jogador (null = voltar a ser mestre)
  UI.setViewAs = function (pid) {
    const S_ = S();
    if (!S_.isGM() || (!pid && !S_.viewAs)) return;
    if (pid && !S_.viewAs) UI.modeBefore = UI.mode;
    S_.viewAs = pid || null;
    const B = App.Board;
    B.selected = null; B.selectedSound = null;
    if (B.targeting) B.cancelTargeting();
    toolbarKey = null;
    for (const sel of ['#left-tabs', '#left-body', '#left-foot', '#avatars', '#board-actions', '#layers', '#right-tabs', '#init-strip', '#scene-label']) {
      const e = $(sel); if (e) { e._sig = null; e._tab = null; }
    }
    UI.chatSig = '';
    if (pid && (UI.tab === 'audio' || UI.tab === 'table')) UI.closeDock();
    renderViewAsBar();
    UI.setMode(pid ? 'play' : (UI.modeBefore || 'edit'));
    App.Audio.sync();
  };
  function viewAsName(pid) {
    if (pid === '*') return 'todos os jogadores';
    const p = S().state && S().state.players[pid];
    return p ? p.name : 'jogador';
  }
  function renderViewAsBar() {
    const bar = $('#viewas-bar'), v = S().viewAs;
    bar.hidden = !v;
    bar.innerHTML = '';
    if (!v) return;
    bar.append(ic('scan-eye'), h('span', {}, 'Vendo como ', h('b', {}, viewAsName(v))),
      h('button', { class: 'btn primary small', onclick: () => UI.setViewAs(null) }, 'Voltar a ser mestre'));
  }

  // rAF + setTimeout de reserva: o navegador pausa rAF em abas de segundo plano
  let pendingRefresh = null;
  let refreshFrame, refreshTimer;
  UI.schedule = function (kind = 'reset', action) {
    const scheduled = !!pendingRefresh;
    pendingRefresh ||= { chat: false, sheetIds: new Set(), full: false };
    if (kind === 'asset' || kind === 'reset') {
      UI.chatSig = '';
      for (const selector of ['#party-col', '#init-strip', '#left-body', '#token-hud']) {
        const panel = $(selector);
        if (panel) panel._sig = null;
      }
    }
    if (kind === 'actor.update' && action?.patch && Object.keys(action.patch).every((key) => key === 'bars')) kind = 'actor.bars';
    let actorId = action?.id;
    if (kind === 'bar.change') {
      const token = S().state?.scenes[action?.sceneId]?.tokens[action?.tokenId];
      actorId = action?.tokenId ? (token?.linked ? token.actorId : null) : action?.actorId;
    }
    mergePanelChange(pendingRefresh, kind, actorId);
    if (scheduled) return;
    const run = () => {
      const change = pendingRefresh;
      pendingRefresh = null;
      cancelAnimationFrame(refreshFrame);
      clearTimeout(refreshTimer);
      if (!change) return;
      if (change.full) { UI.refresh(); return; }
      if (change.chat) {
        renderDock();
        renderChat();
        renderFeed();
        checkHandouts();
      }
      if (change.sheetIds.size && !S().gmView() && UI.leftTab === 'actors') renderActors();
      for (const id of change.sheetIds) {
        const w = UI.windows.get('actor:' + id);
        if (w) renderWindow(w);
      }
    };
    refreshFrame = requestAnimationFrame(run);
    refreshTimer = setTimeout(run, 150);
  };

  UI.refresh = function () {
    renderTopbar();
    UI.renderToolbar();
    renderSceneLabel();
    renderInitStrip();
    renderBoardActions();
    renderParty();
    renderLeft();
    renderRight();
    renderDock();
    if (UI.tab) renderPanel(UI.tab);
    renderChat();
    renderFeed();
    checkHandouts();
    for (const w of UI.windows.values()) renderWindow(w);
    checkMyTurn();
  };

  // Alguém está digitando dentro de el? (campo de texto ou número com foco)
  // Botões, listas, caixas de marcar e controles deslizantes não contam: o painel atualiza na hora.
  function isTyping(el) {
    const ae = document.activeElement;
    if (!ae || !el || !el.contains(ae)) return false;
    if (ae.tagName === 'TEXTAREA' || ae.isContentEditable) return true;
    return ae.tagName === 'INPUT' && !/^(checkbox|radio|range|color|button|submit|reset|file|image)$/i.test(ae.type);
  }
  UI.isTyping = isTyping;

  // Não reconstrói um painel enquanto o usuário digita nele
  function safeRender(el, fn) {
    if (isTyping(el)) {
      el._stale = fn;
      if (!el._foBound) {
        el._foBound = true;
        el.addEventListener('focusout', () => setTimeout(() => {
          if (el._stale && !isTyping(el)) { const f = el._stale; el._stale = null; f(); }
        }, 0));
      }
      return;
    }
    el._stale = null;
    fn();
  }

  UI.setNetStatus = function (kind, text) {
    const el = $('#net-status');
    if (!el) return;
    el.className = 'net ' + kind;
    el.textContent = text;
    $('#btn-invite').hidden = kind !== 'host';
    if (UI.tab === 'table' && UI.started) renderPanel('table');
  };
  UI.onSaved = function () { const el = $('#saved-at'); if (el) el.textContent = 'Salvo às ' + U.fmtTime(App.Storage.lastSaved); };

  // =============== Barra superior ===============
  function renderTopbar() {
    const st = S().state, gm = S().gmView();
    $('#campaign-name').textContent = st ? st.name : '—';
    const sc = S().currentScene();
    $('#scene-title').textContent = sc ? sc.name : '—';
    $('#crumb-scene').style.cursor = gm ? '' : 'default';
    const warn = $('#scene-warn');
    const away = sc && gm && st.activeSceneId !== sc.id;
    const apart = gm ? Object.keys(st.playerScenes || {}).filter((pid) => st.players[pid]).length : 0;
    warn.hidden = !away && !apart;
    warn.textContent = away ? 'Grupo está em "' + ((st.scenes[st.activeSceneId] || {}).name || '—') + '"' : '';
    if (apart) warn.textContent += (away ? ' · ' : '') + apart + (apart === 1 ? ' jogador separado' : ' jogadores separados');

    const av = $('#avatars');
    if (!st) { av.innerHTML = ''; return; }
    const online = new Set(S().online);
    const people = [];
    if (st.gm) people.push({ name: st.gm.name, color: st.gm.color, on: true, gm: true });
    for (const [pid, p] of Object.entries(st.players)) people.push({ name: p.name, color: p.color, on: online.has(pid) || pid === S().me.id });
    const sig = JSON.stringify(people);
    if (av._sig === sig) return;
    av._sig = sig;
    av.innerHTML = '';
    people.slice(0, 4).forEach((p) => av.append(h('span', { class: p.on ? '' : 'off', title: p.name + (p.gm ? ' (mestre)' : p.on ? '' : ' (offline)'),
      style: { background: U.safeColor(p.color, '#5f5e6a') } }, (p.name || '?').trim().slice(0, 1).toUpperCase())));
    if (people.length > 4) av.append(h('span', { class: 'more', title: people.slice(4).map((p) => p.name).join(', ') }, '+' + (people.length - 4)));
  }

  function renderMenu() {
    const m = $('#main-menu'), gm = S().gmView(), close = () => { m.hidden = true; };
    const item = (icon, label, fn) => h('button', { onclick: () => { close(); fn(); } }, ic(icon), label);
    m.innerHTML = '';
    m.append(item('settings-2', 'Configurações da mesa', () => UI.showTab('table')));
    m.append(item('ruler', 'Unidade de medida', () => { UI.showTab('table'); setTimeout(() => { const el = $('#units-sec'); if (el) el.scrollIntoView({ block: 'start' }); }, 0); }));
    if (App.Net.isOnline() && S().role === 'gm') m.append(item('link', 'Copiar convite', () => U.copy(App.Net.inviteLink())));
    m.append(h('hr'));
    if (gm) {
      m.append(item('download', 'Exportar campanha (.json)', () => App.Storage.downloadJSON(App.Storage.campaignBundle(true), S().state.name)));
      m.append(item('copy', 'Gerar código de texto', () => codeDialog()));
    }
    m.append(item('upload', gm ? 'Importar campanha, cena ou ficha' : 'Importar ficha', () => UI.importDialog()));
    if (S().isGM() && S().state) {
      m.append(h('hr'));
      if (S().viewAs) m.append(item('scan-eye', 'Voltar a ser mestre', () => UI.setViewAs(null)));
      else {
        m.append(h('span', { class: 'menu-label' }, 'Ver a mesa como'));
        m.append(item('users', 'Todos os jogadores', () => UI.setViewAs('*')));
        for (const [pid, p] of Object.entries(S().state.players)) m.append(item('user-round', p.name, () => UI.setViewAs(pid)));
      }
    }
    m.append(h('hr'));
    m.append(h('a', { href: 'wiki/index.html', target: '_blank', onclick: close }, ic('scroll-text'), 'Manual'));
    m.append(h('a', { href: '?tutorial', target: '_blank', onclick: close }, ic('book-open'), 'Tutorial interativo'));
    m.append(h('hr'));
    m.append(item('house', 'Voltar ao menu inicial', () => UI.backToMenu()));
  }

  // Volta para a tela inicial. O mestre salva antes; quem está online é avisado do que acontece.
  UI.backToMenu = async function () {
    const online = App.Net.isOnline(), role = S().role;
    let msg = null;
    if (new URLSearchParams(location.search).has('tutorial')) msg = 'Sair do tutorial e voltar ao menu? Nada do tutorial é salvo.';
    else if (role === 'gm' && online) msg = 'Voltar ao menu fecha a mesa: os jogadores serão desconectados. A campanha fica salva.';
    else if (role === 'player') msg = 'Sair da mesa e voltar ao menu? Você pode entrar de novo com o mesmo código.';
    if (msg && !confirm(msg)) return;
    if (S().isGM() && S().state) { try { await App.Storage.save(); } catch { /* */ } }
    // Mestre volta para a tela de Histórias (Plano 33); jogador e tutorial, para o menu
    const tut = new URLSearchParams(location.search).has('tutorial');
    location.href = location.pathname + (role === 'player' || tut || !S().state ? '' : '?historias=' + (online ? 'online' : 'offline'));
  };

  // =============== Ferramentas ===============
  let toolbarKey = null;
  UI.renderToolbar = function () {
    const bar = $('#toolbar'), gm = S().gmView(), B = App.Board, edit = UI.mode === 'edit';
    const key = gm + ':' + edit;
    if (toolbarKey !== key) {
      toolbarKey = key;
      bar.innerHTML = '';
      for (const t of TOOLS) {
        if ((t.gm && !gm) || (t.edit && !edit)) continue;
        if (t.sep) { bar.append(h('div', { class: 'tool-sep' })); continue; }
        // Clicar de novo na ferramenta ativa fecha as opções dela e volta para Selecionar
        bar.append(h('button', { class: 'tool', 'data-tool': t.id, title: t.title, onclick: () => B.setTool(B.tool === t.id && t.id !== 'select' ? 'select' : t.id) }, ic(t.icon)));
      }
    }
    for (const el of bar.querySelectorAll('[data-tool]')) el.classList.toggle('on', el.dataset.tool === B.tool);
    renderToolOpts();
  };

  // Imagens já usadas em qualquer cena da campanha (biblioteca da ferramenta Imagem)
  function campaignImages() {
    const st = S().state, seen = new Set();
    if (!st) return [];
    for (const id of st.sceneOrder) for (const p of (st.scenes[id] && st.scenes[id].props) || []) if (p.img && App.Images.src(p.img)) seen.add(p.img);
    for (const ho of st.handouts || []) if (ho.img && App.Images.src(ho.img)) seen.add(ho.img);
    return [...seen];
  }
  const fmtM = (n) => App.Units.dist(n); // Plano 40: na unidade de quem vê
  // Mantém o quadro de opções inteiro dentro do mapa: sobe se precisar; se ainda não couber, rola por dentro
  function fitToolOpts(box) {
    const area = box.parentElement;
    if (!area) return;
    const H = area.clientHeight, m = 14;
    box.style.maxHeight = Math.max(160, H - m * 2) + 'px';
    const want = box._want ?? m, hgt = box.offsetHeight;
    box.style.top = Math.max(m, Math.min(want, H - hgt - m)) + 'px';
  }
  UI.fitToolOpts = () => { const b = $('#tool-opts'); if (b && !b.hidden) fitToolOpts(b); };
  window.addEventListener('resize', () => UI.fitToolOpts());

  // Plano 38: menu da ferramenta no estilo Photoshop. Uma linha por opção (ícone + nome), a escolhida destacada;
  // o que tem muitas escolhas abre um sub-menu ao lado. Sem textos de ajuda: o título de cada linha explica.
  let toolSub = null;
  function closeToolSub() { if (toolSub) { toolSub.el.remove(); toolSub = null; } }
  UI.closeToolSub = closeToolSub;
  function openToolSub(row, key, build) {
    if (toolSub && toolSub.key === key) { closeToolSub(); return; }
    closeToolSub();
    const box = $('#tool-opts'), area = box.parentElement;
    const el = h('div', { id: 'tool-sub', class: 'to-sub' });
    build(el);
    area.append(el);
    const ar = area.getBoundingClientRect(), br = box.getBoundingClientRect(), rr = row.getBoundingClientRect();
    el.style.left = (br.right - ar.left + 6) + 'px';
    el.style.maxHeight = Math.max(160, ar.height - 28) + 'px';
    el.style.top = Math.max(14, Math.min(rr.top - ar.top - 5, ar.height - el.offsetHeight - 14)) + 'px';
    toolSub = { el, key, tool: App.Board.tool, row };
    row.classList.add('open');
  }
  document.addEventListener('pointerdown', (e) => {
    if (toolSub && !toolSub.el.contains(e.target) && !toolSub.row.contains(e.target)) closeToolSub();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (toolSub && e.key === 'Escape') { closeToolSub(); e.stopPropagation(); e.preventDefault(); }
  }, true);
  // linha do menu: ícone (nome do ícone ou um nó), nome, valor à direita, seta se abre sub-menu
  function toRow(icon, label, o = {}) {
    return h('button', { class: 'to-row' + (o.on ? ' on' : '') + (o.sub ? ' has-sub' : '') + (o.cls ? ' ' + o.cls : ''), title: o.title || '', onclick: o.onclick },
      h('span', { class: 'to-ic' }, typeof icon === 'string' ? ic(icon) : icon),
      h('span', { class: 'to-label' }, label),
      o.right != null && o.right !== '' ? h('span', { class: 'to-val' }, o.right) : '',
      o.sub ? h('span', { class: 'to-arrow' }, ic('chevron-right')) : '');
  }
  const toSep = () => h('div', { class: 'to-sep' });
  const dot = (c) => h('i', { class: 'to-dot', style: { background: c } });

  function renderToolOpts() {
    const box = $('#tool-opts'), B = App.Board;
    const t = TOOLS.find((x) => x.id === B.tool);
    const gmRuler = t && t.id === 'ruler' && S().gmView();
    if (!t || (!gmRuler && (!(t.draw || t.id === 'wall' || t.id === 'door' || t.id === 'prop' || t.id === 'light' || t.id === 'trigger' || t.id === 'portal' || t.id === 'note') || UI.mode !== 'edit'))) { box.hidden = true; closeToolSub(); return; }
    if (toolSub && toolSub.tool !== t.id) closeToolSub();
    const btn = $('#toolbar [data-tool="' + t.id + '"]');
    const tb = $('#toolbar');
    box._want = btn ? btn.offsetTop - (tb ? tb.scrollTop : 0) + 14 - 5 : 14;
    fitToolOpts(box);
    const rsc = S().currentScene();
    const sig = B.style.color + B.style.width + B.style.fill + t.id + B.wallType + B.wallMode + campaignImages().join(',')
      + B.rulerShare + B.lightKind + B.lightShape + !!(rsc && rsc.light.enabled) + B.doorLocked + B.trigShape
      + B.noteColor + ((rsc && rsc.notes) || []).length + App.Units.dist(1);
    box.hidden = false;
    if (box._sig === sig) return;
    box._sig = sig;
    closeToolSub();
    box.innerHTML = '';
    const redo = () => { box._sig = null; renderToolOpts(); };
    const pickClose = (fn) => () => { fn(); closeToolSub(); redo(); };
    requestAnimationFrame(() => fitToolOpts(box));
    const shapes = (hints) => [['rect', 'square', 'Retângulo'], ['circle', 'circle', 'Círculo'], ['poly', 'pentagon', 'Polígono']].map(([k, icon, l]) =>
      toRow(icon, l, { on: B.trigShape === k, title: hints[k], onclick: () => { B.trigShape = k; B.trigPoly = null; redo(); } }));
    const polyHint = 'Clique em cada canto. Feche clicando no primeiro ponto, com dois cliques ou Enter.';

    if (t.id === 'prop') {
      const lib = campaignImages();
      const libRow = toRow('image', 'Imagens da campanha', { sub: true, right: String(lib.length), title: 'As imagens já usadas, para pôr de novo em qualquer cena: clique para pôr no centro ou arraste para o mapa',
        onclick: () => openToolSub(libRow, 'lib', (el) => {
          el.classList.add('wide');
          el.append(lib.length ? h('div', { class: 'img-lib' }, lib.map((id) => {
            const im = h('img', { src: App.Images.src(id) || '', alt: '', draggable: 'true', title: 'Arraste para o mapa ou clique para colocar no centro',
              onclick: () => B.placeImage(id, B.viewCenter()) });
            im.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-image', id); e.dataTransfer.effectAllowed = 'copy'; });
            return im;
          })) : h('p', { class: 'to-empty' }, 'Nenhuma imagem ainda.'));
        }) });
      box.append(
        toRow('upload', 'Enviar imagem…', { title: 'Ou arraste arquivos do computador para o mapa. Clique numa imagem para mover; os cantos redimensionam e a bolinha de cima gira (Shift: de 15 em 15°)',
          onclick: async () => { const file = await U.pickFile('image/*'); if (file) await B.addPropFromFile(file, B.viewCenter()); } }),
        libRow);
    } else if (t.id === 'note') {
      const notes = (rsc && rsc.notes) || [];
      const NC = [['gold', 'Sala'], ['red', 'Perigo'], ['green', 'Tesouro'], ['blue', 'NPC']];
      const listRow = toRow('search', 'Notas desta cena', { sub: true, right: String(notes.length), title: 'Buscar e abrir as notas desta cena',
        onclick: () => openToolSub(listRow, 'notes', (el) => {
          el.classList.add('wide');
          const listBox = h('div', { class: 'note-list' });
          const fill = (q) => {
            listBox.innerHTML = '';
            const k = U.slug(q || ''), cur = ((S().currentScene() || {}).notes) || [];
            const shown = cur.filter((n) => !k || U.slug(n.title + ' ' + n.text).includes(k));
            if (!shown.length) { listBox.append(h('p', { class: 'to-empty' }, cur.length ? 'Nada encontrado.' : 'Nenhuma nota ainda.')); return; }
            for (const n of shown) listBox.append(h('button', { class: 'note-item' + (B.selectedNote === n.id ? ' on' : ''), title: 'Centraliza no mapa e abre', onclick: () => { closeToolSub(); B.centerOn(n.x, n.y); UI.openNote(rsc.id, n.id); } },
              h('i', { class: 'note-dot', style: { background: B.NOTE_COLORS[n.color] || B.NOTE_COLORS.gold } }), h('span', { class: 'grow' }, h('b', {}, n.title || 'Nota'), n.text ? h('small', {}, String(n.text).split('\n')[0].slice(0, 60)) : '')));
          };
          const search = h('input', { type: 'search', placeholder: 'Buscar nas notas…', oninput: (e) => fill(e.target.value) });
          fill('');
          el.append(search, listBox);
          setTimeout(() => search.focus(), 0);
        }) });
      box.append(...NC.map(([k, l]) => toRow(dot(B.NOTE_COLORS[k]), l, { on: B.noteColor === k, title: 'Cor das novas notas: ' + l + '. Clique no mapa para espetar uma nota; só você vê', onclick: () => { B.noteColor = k; redo(); } })),
        toSep(), listRow);
    } else if (t.id === 'ruler') {
      const on = B.rulerShare !== false;
      box.append(toRow(on ? 'eye' : 'eye-off', 'Mostrar aos jogadores', { on, cls: 'to-check', right: on ? ic('check') : '',
        title: on ? 'Os jogadores veem a sua régua com o seu nome. Botão direito enquanto mede marca um ponto de passagem' : 'Só você vê a régua (para medir escondido)',
        onclick: () => { B.rulerShare = !on; redo(); } }));
    } else if (t.id === 'portal') {
      box.append(...shapes({ rect: 'Clique num quadrado (a escada) ou arraste um retângulo', circle: 'Clique para um círculo de 1 quadrado, ou arraste para o raio', poly: polyHint }));
    } else if (t.id === 'trigger') {
      box.append(...shapes({ rect: 'Clique num quadrado (placa de pressão) ou arraste um retângulo', circle: 'Clique para um círculo de 1 quadrado, ou arraste para o raio', poly: polyHint }));
    } else if (t.id === 'door') {
      box.append(
        toRow('lock-open', 'Destrancada', { on: !B.doorLocked, title: 'Novas portas destrancadas: deixam passar mesmo fechadas. Clique no marcador para abrir ou fechar; Shift + clique tranca', onclick: () => { B.doorLocked = false; redo(); } }),
        toRow('lock', 'Trancada', { on: !!B.doorLocked, title: 'Novas portas trancadas: ninguém abre nem passa (só você). O cadeado só você vê', onclick: () => { B.doorLocked = true; redo(); } }),
        toSep(),
        toRow('scan', 'Procurar portas no mapa', { title: 'Mostre uma porta da imagem e o sistema acha as parecidas; nas paredes que já existem, abre a passagem', onclick: () => UI.openScan('doors') }));
    } else if (t.id === 'light') {
      const pick = (k, v) => { B[k] = v; if (k !== 'lightKind') B.lightPoly = null; redo(); App.Board.requestRender(); };
      box.append(
        toRow('lightbulb', 'Luz', { on: B.lightKind === 'light', title: 'Clique num marcador para editar (cor, alcance, tremular). Dois cliques acendem ou apagam', onclick: () => pick('lightKind', 'light') }),
        toRow('moon', 'Escuridão', { on: B.lightKind === 'dark', title: 'Apaga qualquer luz onde está, até de dia. Quem tem visão no escuro vê lá dentro como meia luz', onclick: () => pick('lightKind', 'dark') }),
        toSep(),
        toRow('circle', 'Círculo', { on: B.lightShape === 'circle', title: 'Clique para pôr uma luz, ou arraste para escolher o alcance', onclick: () => pick('lightShape', 'circle') }),
        toRow('cone', 'Cone', { on: B.lightShape === 'cone', title: 'Clique na origem e arraste para a direção e o alcance', onclick: () => pick('lightShape', 'cone') }),
        toRow('square', 'Área', { on: B.lightShape === 'area', title: 'Clique em cada canto. Feche clicando no primeiro ponto, com dois cliques ou Enter. Backspace desfaz o último ponto e Esc cancela', onclick: () => pick('lightShape', 'area') }),
        rsc && !rsc.light.enabled ? toSep() : '',
        rsc && !rsc.light.enabled ? toRow('triangle-alert', 'Ligar iluminação', { cls: 'to-warn', title: 'A iluminação está desligada nesta cena: as luzes não fazem efeito',
          onclick: () => S().dispatch({ type: 'scene.update', id: rsc.id, patch: { light: Object.assign({}, rsc.light, { enabled: true, global: false }) } }) }) : '');
    } else if (t.id === 'wall') {
      // Tipo de parede: vale para as próximas; clicar numa parede pronta aplica o tipo nela
      const cfg = App.Combat.coverCfg(rsc);
      const info = { full: 'Casa com telhado: nunca deixa ver', high: `${fmtM(cfg.heights.high)}: tapa a luz e quem é mais baixo`, three: `${fmtM(cfg.heights.three)}: altura do ombro`, half: `${fmtM(cfg.heights.half)}: altura da cintura` };
      const hgt = { full: 'teto', high: fmtM(cfg.heights.high), three: fmtM(cfg.heights.three), half: fmtM(cfg.heights.half) };
      box.append(
        toRow('slash', 'Reta', { on: B.wallMode !== 'pencil', title: 'Arraste de um canto do grid a outro', onclick: () => { B.wallMode = 'line'; redo(); } }),
        toRow('pencil', 'Lápis', { on: B.wallMode === 'pencil', title: 'Desenhe à mão livre: muros curvos, cavernas, rochas. Terminando perto de onde começou, o contorno se fecha', onclick: () => { B.wallMode = 'pencil'; redo(); } }),
        toSep(),
        ...App.Combat.COVER_TYPES.map(([k, label]) => toRow(h('i', { class: 'wt-line wt-' + k }), label, { on: B.wallType === k, cls: 'wall-type', right: hgt[k],
          title: info[k] + '. Clique numa parede já desenhada para trocar o tipo. Alturas e bônus: Configurar cena → Cobertura', onclick: () => { B.wallType = k; redo(); } })),
        toSep(),
        toRow('scan', 'Procurar paredes no mapa', { title: 'O sistema lê a imagem do mapa e sugere paredes e portas; você confere e cria', onclick: () => UI.openScan() }));
    } else {
      // Desenho: cor, espessura e (retângulo e círculo) preenchimento, cada um num sub-menu
      const colorRow = toRow(dot(B.style.color), 'Cor', { sub: true, title: 'Cor do desenho',
        onclick: () => openToolSub(colorRow, 'color', (el) => {
          el.append(h('div', { class: 'swatches' }, DRAW_COLORS.map((c) => h('button', { class: 'swatch' + (B.style.color === c ? ' on' : ''), title: c, style: { background: c },
            onclick: pickClose(() => { B.style.color = c; }) }))),
          h('label', { class: 'to-row to-color' }, h('span', { class: 'to-ic' }, ic('plus')), h('span', { class: 'to-label' }, 'Outra cor'),
            h('input', { type: 'color', value: B.style.color, oninput: (e) => { B.style.color = e.target.value; }, onchange: () => { closeToolSub(); redo(); } })));
        }) });
      const widthRow = toRow(h('i', { class: 'to-width', style: { height: Math.min(B.style.width, 10) + 'px' } }), 'Espessura', { sub: true, right: B.style.width + ' px', title: 'Espessura do traço',
        onclick: () => openToolSub(widthRow, 'width', (el) => {
          el.append(...[2, 4, 8, 14].map((n) => toRow(h('i', { class: 'to-width', style: { height: Math.min(n, 10) + 'px' } }), n + ' px', { on: B.style.width === n, onclick: pickClose(() => { B.style.width = n; }) })));
        }) });
      box.append(colorRow, widthRow);
      if (t.id === 'rect' || t.id === 'ellipse') {
        const FILL = [[0, 'Vazio'], [0.35, 'Translúcido'], [1, 'Sólido']];
        const fillIc = (v) => h('i', { class: 'to-fill', style: { background: v ? B.style.color : 'transparent', opacity: v && v < 1 ? .5 : 1, borderColor: B.style.color } });
        const cur = FILL.find(([v]) => v === B.style.fill) || FILL[0];
        const fillRow = toRow(fillIc(cur[0]), 'Preenchimento', { sub: true, right: cur[1], title: 'Preenchimento da forma',
          onclick: () => openToolSub(fillRow, 'fill', (el) => {
            el.append(...FILL.map(([v, l]) => toRow(fillIc(v), l, { on: B.style.fill === v, onclick: pickClose(() => { B.style.fill = v; }) })));
          }) });
        box.append(fillRow);
      }
    }
  }

  function renderSceneLabel() {
    const el = $('#scene-label'), sc = S().currentScene();
    const sig = sc ? [sc.name, sc.cols, sc.rows, sc.cellDist, App.Units.dist(1)].join('|') : '';
    if (el._sig === sig) return;
    el._sig = sig;
    el.innerHTML = '';
    if (sc) el.append(h('b', {}, sc.name), h('span', {}, `${sc.cols}×${sc.rows} · 1 quadrado = ${App.Units.dist(sc.cellDist)}`));
  }

  // =============== Acompanhar os jogadores (Plano 36) ===============
  // Coluna no canto direito do mapa (só o mestre): um círculo por jogador com o token da ficha dele.
  // Clique: Ir até, Seguir, Ver como. No modo Editar fica recolhida num botão.
  UI.partyOpen = false;
  function partyTokens(pid) {
    const st = S().state, sid = S().sceneIdOf(pid), sc = st.scenes[sid];
    if (!sc) return { sc: null, list: [] };
    // os tokens do jogador; se ele não tiver nenhum, os do grupo todo (dono 'Todos')
    const ownerOf = (t) => (t.owner != null ? t.owner : (S().actorOf(t) || {}).owner);
    const mine = Object.values(sc.tokens).filter((t) => ownerOf(t) === pid);
    const list = mine.length ? mine : Object.values(sc.tokens).filter((t) => ownerOf(t) === 'all');
    list.sort((a, b) => ((S().actorOf(a) || {}).kind === 'pc' ? 0 : 1) - ((S().actorOf(b) || {}).kind === 'pc' ? 0 : 1));
    return { sc, list };
  }
  let partyMenu = null;
  function closePartyMenu() { if (partyMenu) { partyMenu.remove(); partyMenu = null; } }
  // Plano 37: tira o jogador da mesa (pode entrar de novo com o código); fichas e tokens dele ficam com o mestre
  UI.removePlayer = function (pid) {
    const p = S().state.players[pid];
    if (!p || !confirm('Remover ' + p.name + ' da mesa? Ele é desconectado e sai da lista; pode entrar de novo com o código. As fichas e os tokens dele ficam com você.')) return false;
    if (S().viewAs === pid) UI.setViewAs(null);
    if (App.Board.follow && App.Board.follow.pid === pid) App.Board.stopFollow();
    S().dispatch({ type: 'player.remove', id: pid });
    App.Net.kick(pid);
    U.toast(p.name + ' saiu da mesa.');
    return true;
  };
  function partyMenuFor(pid, anchor) {
    if (partyMenu && partyMenu.dataset.pid === pid) { closePartyMenu(); return; }
    closePartyMenu();
    const st = S().state, p = st.players[pid], B = App.Board, { sc, list } = partyTokens(pid);
    const m = h('div', { class: 'party-menu', 'data-pid': pid },
      h('div', { class: 'pm-head' }, h('b', {}, p.name), h('small', {}, sc ? 'Cena: ' + sc.name : 'Sem cena')),
      list.length ? list.map((t) => h('div', { class: 'pm-row' },
        list.length > 1 ? h('span', { class: 'pm-tok' }, t.name) : '',
        btnI('map-pin', 'Ir até', { class: 'btn small', title: 'Sua tela vai até o token (os jogadores não mudam de cena). Atalho: dois cliques no círculo', onclick: () => { closePartyMenu(); B.stopFollow(); if (S().viewAs) UI.setViewAs(null); B.focusToken(sc.id, t.id); } }),
        btnI('eye', B.follow && B.follow.tokenId === t.id ? 'Seguindo' : 'Seguir', { class: 'btn small' + (B.follow && B.follow.tokenId === t.id ? ' on' : ''), title: 'A câmera acompanha o token (inclusive pelos portais). Esc para', onclick: () => { closePartyMenu(); if (B.follow && B.follow.tokenId === t.id) B.stopFollow(); else { if (S().viewAs && S().viewAs !== pid) UI.setViewAs(null); B.startFollow(pid, sc.id, t.id); } } })))
        : h('p', { class: 'hint', style: { margin: 0 } }, 'Nenhum token deste jogador na cena dele.'),
      S().viewAs === pid
        ? btnI('scan-eye', 'Voltar a ser mestre', { class: 'btn small primary block', onclick: () => { closePartyMenu(); UI.setViewAs(null); } })
        : btnI('scan-eye', 'Ver como ' + p.name, { class: 'btn small block', title: 'Sua tela fica igual à dele: visão, luz, névoa e som', onclick: () => { closePartyMenu(); UI.setViewAs(pid); const T = list[0]; if (T && sc) setTimeout(() => B.focusToken(sc.id, T.id), 0); } }),
      list.length ? '' : h('p', { class: 'hint', style: { margin: 0 } }, 'Sem token na cena: ' + p.name + ' não vê nada do mapa.'),
      btnI('trash-2', 'Remover da mesa', { class: 'btn small danger block', onclick: () => { closePartyMenu(); UI.removePlayer(pid); } }));
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.max(10, r.left - m.offsetWidth - 10) + 'px';
    m.style.top = U.clamp(r.top + r.height / 2 - m.offsetHeight / 2, 10, window.innerHeight - m.offsetHeight - 10) + 'px';
    partyMenu = m;
  }
  document.addEventListener('pointerdown', (e) => { if (partyMenu && !e.target.closest('.party-menu, .party-av')) closePartyMenu(); });
  function renderParty() {
    const col = $('#party-col'), bar = $('#follow-bar'), B = App.Board, st = S().state;
    if (!col || !bar) return;
    const gm = S().isGM() && st, players = gm ? Object.entries(st.players) : [];
    // barra "Seguindo"
    const F = B.follow;
    const fsig = F ? F.name + F.pid : '';
    if (bar._sig !== fsig) {
      bar._sig = fsig; bar.innerHTML = '';
      bar.hidden = !F;
      if (F) bar.append(ic('eye'), h('span', {}, 'Seguindo ', h('b', {}, F.name || 'token')), h('button', { class: 'btn primary small', title: 'Esc', onclick: () => B.stopFollow() }, 'Parar'));
    }
    if (!gm || !players.length) { col.hidden = true; return; }
    const play = UI.mode === 'play', open = play || UI.partyOpen, online = new Set(S().online);
    const sig = JSON.stringify([play, open, S().viewAs, F && F.tokenId, [...online], players.map(([pid, p]) => { const { sc, list } = partyTokens(pid); return [pid, p.name, p.color, sc && sc.id, sc && sc.name, list.map((t) => [t.id, t.name, t.img, (S().actorOf(t) || {}).img])]; })]);
    col.hidden = false;
    if (col._sig === sig) return;
    col._sig = sig;
    col.innerHTML = '';
    col.classList.toggle('closed', !open);
    if (!play) col.append(iconBtn(open ? 'chevron-right' : 'users', open ? 'Recolher os jogadores' : 'Jogadores: ir até, seguir ou ver como', () => { UI.partyOpen = !UI.partyOpen; closePartyMenu(); renderParty(); }, { class: 'icon-btn party-toggle' }));
    if (!open) return;
    for (const [pid, p] of players) {
      const { sc, list } = partyTokens(pid), t = list[0], a = t && S().actorOf(t);
      const src = App.Images.src((t && t.img) || (a && a.img));
      const col2 = U.safeColor(p.color, '#8b72f0'), on = online.has(pid);
      const av = h('button', { class: 'party-av' + (t ? '' : ' none') + (S().viewAs === pid ? ' viewing' : '') + (F && F.pid === pid ? ' following' : ''),
        title: p.name + (t ? ' · ' + t.name : '') + (sc ? ' · ' + sc.name : '') + (on ? '' : ' (desconectado)'),
        style: { borderColor: col2, background: src ? `center/cover url(${src})` : `radial-gradient(circle at 35% 30%, ${col2}, #1b1730)` },
        onclick: (e) => partyMenuFor(pid, e.currentTarget),
        ondblclick: () => { closePartyMenu(); if (t && sc) { B.stopFollow(); if (S().viewAs) UI.setViewAs(null); B.focusToken(sc.id, t.id); } } },
      src ? '' : h('span', {}, initials((t && t.name) || p.name, 1)), h('i', { class: 'party-dot' + (on ? ' on' : '') }));
      col.append(av);
    }
  }
  UI.renderParty = renderParty;

  function renderBoardActions() {
    const box = $('#board-actions'), gm = S().gmView(), B = App.Board, sc = S().currentScene();
    const sig = [gm, B.style.snap, !!sc].join();
    if (box._sig === sig) return;
    box._sig = sig;
    box.innerHTML = '';
    if (gm && sc) box.append(h('div', { class: 'undo-btns' },
      iconBtn('undo-2', 'Desfazer (Ctrl+Z)', () => App.History.undoLast(), { id: 'btn-undo' }),
      iconBtn('redo-2', 'Refazer (Ctrl+Y)', () => App.History.redoLast(), { id: 'btn-redo' })));
    if (gm && sc) box.append(btnI('image', 'Trocar mapa', { title: 'Enviar imagem de mapa e configurar a cena', onclick: () => sceneSettings(S().currentScene().id) }));
    box.append(btnI('grid-3x3', B.style.snap ? 'Encaixe ativo' : 'Encaixe desligado', {
      class: 'btn' + (B.style.snap ? ' on' : ''), title: 'Encaixar tokens e desenhos no grid (segure Alt ao soltar para ignorar)',
      onclick: () => { B.style.snap = !B.style.snap; box._sig = null; renderBoardActions(); },
    }));
    requestAnimationFrame(placeZoom);
    UI.renderUndo();
  }
  // Botões ↶ ↷: apagados quando não há o que desfazer/refazer; o título diz o quê
  UI.renderUndo = function () {
    const H = App.History, u = $('#btn-undo'), r = $('#btn-redo');
    if (!H || !u || !r) return;
    const lu = H.undo[H.undo.length - 1], lr = H.redo[H.redo.length - 1];
    u.disabled = !lu; r.disabled = !lr;
    u.title = lu ? 'Desfazer: ' + lu.label + ' (Ctrl+Z)' : 'Nada para desfazer';
    r.title = lr ? 'Refazer: ' + lr.label + ' (Ctrl+Y)' : 'Nada para refazer';
  };

  // =============== Faixa de iniciativa ===============
  function renderInitStrip() {
    const el = $('#init-strip'), st = S().state;
    if (!st || !st.combat.active) { el.hidden = true; el._sig = null; return; }
    const c = st.combat, gm = S().gmView();
    const sig = JSON.stringify([c.round, c.turn, c.entries, gm, Object.keys(st.scenes).map((k) => Object.values(st.scenes[k].tokens).map((t) => [t.id, t.name, t.hidden, t.masked, t.color]))]);
    el.hidden = false;
    if (el._sig === sig) return;
    el._sig = sig;
    el.innerHTML = '';
    const ord = h('div', { class: 'ord' });
    c.entries.forEach((e, i) => {
      const t = entryToken(e);
      if (!t || (t.hidden && !gm)) return;
      const a = S().actorOf(t), veil = t.masked && !gm && !S().canControl(t);
      const av = veil ? avatar({ name: '?', color: '#17151d' }, 30) : avatar({ name: t.name, color: t.color || (a && a.color), img: t.img || (a && a.img) }, 30);
      av.classList.toggle('now', i === c.turn);
      av.title = (veil ? 'Vulto' : t.name) + (e.init != null ? ' · ' + e.init : '');
      av.onclick = () => focusToken(e, t);
      ord.append(av);
    });
    const cur = c.entries[c.turn], curTok = cur && entryToken(cur);
    el.append(h('span', { class: 'rd' }, 'Rodada ' + c.round), ord);
    if (gm) el.append(iconBtn('skip-back', 'Turno anterior', () => S().dispatch({ type: 'combat.prev' })),
      btnI('skip-forward', 'Próximo', { class: 'btn primary small', onclick: () => S().dispatch({ type: 'combat.next' }) }));
    else if (curTok && S().canControl(curTok)) el.append(btnI('flag', 'Encerrar turno', { class: 'btn primary small', onclick: () => S().dispatch({ type: 'combat.next' }) }));
  }

  function focusToken(e, t) {
    const sc = S().currentScene();
    if (sc && sc.id === e.sceneId) {
      App.Board.selected = t.id;
      const g = sc.grid * (t.size || 1);
      App.Board.centerOn(t.x + g / 2, t.y + g / 2);
    }
  }

  // =============== Lateral esquerda: fichas e cenas ===============
  function renderLeft() {
    const tabs = $('#left-tabs'), gm = S().gmView();
    if (!gm && UI.leftTab === 'scenes') UI.leftTab = 'actors';
    const list = [{ id: 'actors', icon: 'users', label: 'Fichas' }];
    if (gm) list.push({ id: 'scenes', icon: 'map', label: 'Cenas' });
    const min = !!UI.collapsed.left, sig = gm + UI.leftTab + min;
    if (tabs._sig !== sig) {
      tabs._sig = sig;
      tabs.innerHTML = '';
      tabs.classList.toggle('rail', min);
      if (min) {
        // Faixa fina: abrir, e cada aba abre a barra já nela
        tabs.append(h('button', { class: 'rail-btn', title: 'Abrir a barra', onclick: () => UI.setCollapsed('left', false) }, ic('panel-left-open')));
        for (const t of list) tabs.append(h('button', { class: 'rail-btn' + (UI.leftTab === t.id ? ' on' : ''), title: t.label, onclick: () => { UI.leftTab = t.id; UI.setCollapsed('left', false); } }, ic(t.icon)));
        tabs.append(h('button', { class: 'rail-btn', title: gm ? 'Importar campanha, cena ou ficha' : 'Importar ficha', onclick: () => UI.importDialog() }, ic('upload')));
      } else {
        for (const t of list) tabs.append(h('button', { class: 'side-tab' + (UI.leftTab === t.id ? ' on' : ''), onclick: () => { UI.leftTab = t.id; renderLeft(); } }, ic(t.icon), t.label));
        tabs.append(h('button', { class: 'side-min', title: 'Recolher a barra (mais espaço para o mapa)', onclick: () => UI.setCollapsed('left', true) }, ic('panel-left-close')));
      }
    }
    if (min) return;
    if (UI.leftTab === 'scenes') renderScenes(); else renderActors();
  }

  function avatar(a, size) {
    const src = App.Images.src(a && a.img);
    const col = U.safeColor(a && a.color, '#5f5e6a');
    return h('div', { class: 'avatar', style: {
      width: size + 'px', height: size + 'px', fontSize: size * 0.4 + 'px',
      background: src ? `center/cover url(${src})` : `radial-gradient(circle at 35% 30%, ${U.hexA(col, 1)}, ${shade(col, -0.35)})`,
    } }, src ? '' : initials(a && a.name, size < 34 ? 1 : 2));
  }
  function initials(name, n) {
    const w = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (n > 1 && w.length > 1) return (w[0][0] + w[1][0]).toUpperCase();
    return (w[0] || '?').slice(0, 1).toUpperCase();
  }
  function shade(hex, k) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    const f = (x) => Math.round(U.clamp(parseInt(x, 16) * (1 + k), 0, 255));
    return `rgb(${f(m[1])},${f(m[2])},${f(m[3])})`;
  }
  UI.shade = shade;
  function ownerLabel(a) {
    if (a.owner === 'all') return 'Todos os jogadores';
    if (!a.owner) return 'Só o mestre';
    return S().playerName(a.owner);
  }
  function actorSub(a, gm) {
    const bar = (a.bars || [])[0];
    const parts = [KIND[a.kind] || ''];
    if (gm) parts.push(ownerLabel(a));
    else if (bar) parts.push(`${bar.name} ${bar.value}/${bar.max}`);
    return parts.filter(Boolean).join(' · ');
  }

  function renderActors() {
    const body = $('#left-body'), foot = $('#left-foot');
    safeRender(body, () => {
      const st = S().state;
      if (!st) { body.innerHTML = ''; return; }
      const gm = S().gmView();
      const sig = JSON.stringify([UI.filter, gm, Object.values(st.actors).map((a) => [a.id, a.name, a.kind, a.owner, a.color, a.img, gm ? 0 : a.bars && a.bars[0]]), st.players]);
      if (body._sig === sig && body._tab === 'actors') return;
      body._sig = sig; body._tab = 'actors';
      body.innerHTML = '';
      const search = h('input', { placeholder: 'Buscar ficha…', value: UI.filter, oninput: (e) => { UI.filter = e.target.value; body._sig = null; renderActors(); } });
      body.append(h('div', { class: 'search-box' }, ic('search'), search));
      const q = U.slug(UI.filter);
      const actors = Object.values(st.actors).filter((a) => S().ownsActor(a) && (!q || U.slug(a.name).includes(q))).sort((a, b) => a.name.localeCompare(b.name));
      for (const kind of ['pc', 'npc', 'monster']) {
        const group = actors.filter((a) => a.kind === kind);
        const canAdd = gm || kind === 'pc';
        if (!group.length && !canAdd) continue;
        if (!group.length && q) continue;
        body.append(h('div', { class: 'sec-head' }, h('span', { class: 'eyebrow' }, KIND_GROUP[kind]),
          canAdd && iconBtn('plus', 'Nova ficha: ' + KIND[kind], () => newActor(kind))));
        if (!group.length) body.append(h('div', { class: 'empty' }, kind === 'pc' && !gm ? 'Você ainda não tem ficha.' : 'Nenhuma ainda.'));
        for (const a of group) {
          body.append(h('div', {
            class: 'actor-item', draggable: true, title: 'Clique para abrir · arraste para o mapa',
            ondragstart: (e) => { e.dataTransfer.setData('text/x-actor', a.id); e.dataTransfer.effectAllowed = 'copy'; },
            onclick: () => UI.openActor(a.id),
          },
          avatar(a, 34),
          h('div', { class: 'grow' }, h('div', { class: 'name' }, a.name), h('div', { class: 'sub' }, actorSub(a, gm))),
          iconBtn('plus', 'Colocar no mapa', (e) => { e.stopPropagation(); App.Board.placeActor(a.id); })));
        }
      }
      body.append(h('p', { class: 'hint' }, 'Arraste uma ficha para o mapa para criar um token. Duplo clique no token abre a ficha.'));
    });
    if (foot._tab !== 'actors') {
      foot._tab = 'actors';
      foot.innerHTML = '';
      if (S().gmView()) foot.append(btnI('book-open', 'Bestiário', { class: 'btn block', id: 'btn-bestiary', title: 'Criaturas e NPCs prontos (SRD 5.2)', onclick: () => App.Bestiary.open() }));
      foot.append(btnI('folder-open', 'Importar ficha', { class: 'btn block', onclick: () => UI.importDialog() }));
    }
  }

  UI.newActor = newActor;
  function newActor(kind, sistema, res) {
    if (!sistema && App.Regras5e) { askSystem(kind); return; }
    const gm = S().gmView();
    const a = {
      id: U.uid('ac_'), kind, img: null, color: U.randColor(), size: 1,
      name: kind === 'pc' ? (gm ? 'Novo personagem' : S().me.name) : kind === 'npc' ? 'Novo NPC' : 'Nova criatura',
      owner: gm ? (kind === 'pc' ? 'all' : '') : S().me.id,
      bars: campBars().slice(0, kind === 'pc' ? undefined : 1).map((n) => ({ name: n, value: 10, max: 10 })),
      stats: campAttrs().map((n) => ({ name: n, value: U.slug(n) === 'defesa' ? 10 : 0 })), actions: [],
      testFormula: '1d20+@valor', initFormula: '1d20', notes: '',
    };
    if (sistema === '5e') { a.dnd5e = res ? res.d : App.Regras5e.blank(); if (!res && kind !== 'pc') a.dnd5e.npc = App.Regras5e.blankNpc(); if (res && res.name) a.name = res.name; App.Regras5e.apply(a); }
    S().dispatch({ type: 'actor.add', actor: a });
    UI.openActor(a.id);
  }
  UI.newActor = newActor;
  // Plano 51: ficha genérica (qualquer sistema) ou de D&D 5e
  function askSystem(kind) {
    const back = h('div', { class: 'modal-back' });
    const close = () => back.remove();
    const pickIt = (s2) => { close(); newActor(kind, s2); };
    back.append(h('div', { class: 'modal', style: { width: 'min(520px, calc(100vw - 32px))' } },
      h('div', { class: 'win-head' }, ic('scroll-text'), h('span', { class: 'win-title' }, 'Nova ficha: ' + KIND[kind]), iconBtn('x', 'Fechar', close)),
      h('div', { class: 'win-body' }, h('div', { class: 'f5-kind' },
        h('button', { 'data-sys': 'generic', onclick: () => pickIt('generic') }, ic('list-ordered'), h('b', {}, 'Genérica'), h('small', {}, 'Atributos, barras e ações livres. Serve para qualquer sistema.')),
        h('button', { 'data-sys': '5e', onclick: () => pickIt('5e') }, ic('shield'), h('b', {}, 'D&D 5e'), h('small', {}, 'Ficha completa: atributos, perícias, ataques, magias, inventário, ligada aos cadastros. Você preenche.')),
        h('button', { 'data-sys': '5e-assist', onclick: () => { close(); App.Assist5e.open({ onDone: (res) => newActor(kind, '5e', res) }); } }, ic('wand'), h('b', {}, 'D&D 5e passo a passo'), h('small', {}, 'O assistente pergunta classe, espécie, antecedente, atributos e escolhas, e monta a ficha.'))))));
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    document.body.append(back);
  }

  function renderScenes() {
    const body = $('#left-body'), foot = $('#left-foot');
    safeRender(body, () => {
      const st = S().state;
      if (!st) return;
      const viewing = S().currentScene();
      const sig = JSON.stringify([st.sceneOrder, st.activeSceneId, viewing && viewing.id, st.sceneOrder.map((id) => { const s = st.scenes[id]; return [s.name, s.cols, s.rows, Object.keys(s.tokens).length, s.parent]; }), [...UI.scenesClosed],
        st.playerScenes, st.players, S().online]);
      const online = new Set(S().online);
      // Bolinhas de quem está em cada cena
      const whoIn = (id) => Object.entries(st.players).filter(([pid]) => S().sceneIdOf(pid) === id);
      const bubbles = (id) => {
        const list = whoIn(id);
        if (!list.length) return null;
        return h('div', { class: 'scene-people' }, list.map(([pid, p]) => {
          const av = avatar({ name: p.name, color: p.color }, 22);
          av.title = p.name + (online.has(pid) ? '' : ' (desconectado)') + ((st.playerScenes || {})[pid] ? ' · separado do grupo' : '');
          av.classList.toggle('off', !online.has(pid));
          av.classList.toggle('apart', !!(st.playerScenes || {})[pid]);
          return av;
        }));
      };
      if (body._sig === sig && body._tab === 'scenes') return;
      body._sig = sig; body._tab = 'scenes';
      body.innerHTML = '';
      body.append(h('div', { class: 'sec-head' }, h('span', { class: 'eyebrow' }, 'Cenas da campanha'),
        iconBtn('upload', 'Importar mapa com paredes (.dd2vtt / .uvtt do Dungeondraft, Dungeon Alchemist…)', async () => {
          const f = await U.pickFile('.dd2vtt,.uvtt,.df2vtt,.json');
          if (!f) return;
          try {
            const r = await App.Scan.importUVTT(f);
            S().viewSceneId = r.scene.id; S().emit('local');
            U.toast('Mapa importado: ' + r.walls + ' paredes, ' + r.doors + ' portas, ' + r.lights + ' luzes.', 'info', 4500);
          } catch (e) { U.toast(e.message, 'error', 5000); }
        }),
        iconBtn('plus', 'Nova cena', () => {
          const sc = S().newScene('Cena ' + (st.sceneOrder.length + 1));
          S().dispatch({ type: 'scene.add', scene: sc });
          S().viewSceneId = sc.id;
          sceneSettings(sc.id);
        })));
      // Plano 31: sub-cenas ficam embaixo da principal (um nível só); a seta recolhe
      const mains = st.sceneOrder.filter((id) => !st.scenes[id].parent);
      const subsOf = (id) => st.sceneOrder.filter((x) => st.scenes[x].parent === id);
      const item = (id, i, isSub, nSubs) => {
        const sc = st.scenes[id], active = st.activeSceneId === id, closed = UI.scenesClosed.has(id);
        body.append(h('div', { class: 'scene-item' + (isSub ? ' sub-scene' : '') + (viewing && viewing.id === id ? ' viewing' : ''), title: 'Clique para ver e editar (os jogadores não mudam de cena)',
          onclick: () => { S().viewSceneId = id; S().emit('local'); } },
        nSubs ? h('button', { class: 'icon-btn scene-fold', title: closed ? 'Mostrar as sub-cenas' : 'Recolher as sub-cenas', onclick: (e) => { e.stopPropagation(); if (closed) UI.scenesClosed.delete(id); else UI.scenesClosed.add(id); body._sig = null; renderScenes(); } }, ic(closed ? 'chevron-right' : 'chevron-down'))
          : isSub ? h('span', { class: 'scene-sub-ic' }, ic('corner-down-right')) : '',
        h('div', { class: 'grow' },
          h('div', { class: 'name' }, sc.name),
          h('div', { class: 'sub' }, `${isSub ? 'Sub-cena · ' : ''}${sc.cols}×${sc.rows} · ${Object.keys(sc.tokens).length} tokens${nSubs ? ' · ' + nSubs + (nSubs === 1 ? ' sub-cena' : ' sub-cenas') : ''}`),
          bubbles(id),
          h('div', { class: 'row wrap', style: { marginTop: '6px', gap: '6px' }, onclick: (e) => e.stopPropagation() },
            active ? h('span', { class: 'badge gold' }, 'Cena do grupo')
              : h('button', { class: 'btn small', title: 'Levar o grupo para esta cena (quem foi separado continua onde está)',
                onclick: () => { S().dispatch({ type: 'scene.activate', id }); S().viewSceneId = id; App.Audio.onSceneActivated(S().state.scenes[id]); } }, ic('play'), 'Ativar'),
            h('button', { class: 'btn small', title: 'Escolher quais jogadores ficam nesta cena', onclick: () => movePlayersDialog(id) }, ic('users'), 'Mover jogadores'))),
        h('div', { class: 'acts', onclick: (e) => e.stopPropagation() },
          iconBtn('arrow-up', 'Subir', () => S().dispatch({ type: 'scene.move', id, dir: -1 }), { disabled: i === 0 }),
          iconBtn('settings-2', 'Configurar', () => sceneSettings(id)),
          iconBtn('download', nSubs ? 'Exportar cena (com as sub-cenas)' : 'Exportar cena', () => App.Storage.downloadJSON(App.Storage.sceneBundle(id), 'cena_' + sc.name)),
          isSub ? '' : iconBtn('corner-down-right', 'Nova sub-cena (andar de baixo, torre, interior…)', () => {
            const n = subsOf(id).length + 1, ns = S().newScene(sc.name + ' · ' + n);
            ns.parent = id;
            S().dispatch({ type: 'scene.add', scene: ns });
            UI.scenesClosed.delete(id);
            S().viewSceneId = ns.id;
            sceneSettings(ns.id);
          }),
          iconBtn('trash-2', 'Excluir', () => deleteScene(id)))));
      };
      mains.forEach((id, i) => {
        const subs = subsOf(id);
        item(id, i, false, subs.length);
        if (!UI.scenesClosed.has(id)) subs.forEach((sid, k) => item(sid, k, true, 0));
      });
      body.append(h('p', { class: 'hint' }, 'Monte salas com as ferramentas de desenho (retângulo sólido = piso, linha = parede) ou envie uma imagem de mapa em "Trocar mapa".'));
    });
    if (foot._tab !== 'scenes') {
      foot._tab = 'scenes';
      foot.innerHTML = '';
      foot.append(btnI('folder-open', 'Importar cena', { class: 'btn block', onclick: () => UI.importDialog() }));
    }
  }

  UI.scenesClosed = new Set(); // principais com as sub-cenas recolhidas (só nesta tela)
  // Excluir cena. Com sub-cenas: apagar tudo ou manter (as sub-cenas viram cenas principais)
  function deleteScene(id) {
    const st = S().state, sc = st.scenes[id];
    if (!sc) return;
    const subs = st.sceneOrder.filter((x) => st.scenes[x].parent === id);
    if (!subs.length) { if (confirm(`Excluir a cena "${sc.name}"?`)) S().dispatch({ type: 'scene.delete', id }); return; }
    UI.modal('Excluir "' + sc.name + '"', h('div', {},
      h('p', { style: { margin: '0 0 8px' } }, 'Esta cena tem ' + subs.length + (subs.length === 1 ? ' sub-cena' : ' sub-cenas') + ':'),
      h('ul', { style: { margin: '0 0 8px', paddingLeft: '18px' } }, subs.map((x) => h('li', {}, st.scenes[x].name))),
      h('p', { class: 'hint', style: { margin: 0 } }, 'Manter: só esta cena é apagada e as sub-cenas viram cenas principais.')), [
      { label: 'Cancelar' },
      { label: 'Manter as sub-cenas', onclick: () => S().dispatch({ type: 'scene.delete', id, subs: 'keep' }) },
      { label: 'Apagar tudo', primary: true, onclick: () => S().dispatch({ type: 'scene.delete', id, subs: 'delete' }) },
    ]);
  }
  UI.deleteScene = deleteScene;

  // Escolher quem fica numa cena (um ou vários). Na cena do grupo, marcar traz o jogador de volta.
  function movePlayersDialog(id) {
    const st = S().state, sc = st.scenes[id], online = new Set(S().online);
    if (!sc) return;
    const isGroup = st.activeSceneId === id;
    const players = Object.entries(st.players);
    const chosen = new Set(players.filter(([pid]) => S().sceneIdOf(pid) === id).map(([pid]) => pid));
    const where = (pid) => { const sid = S().sceneIdOf(pid); return sid === st.activeSceneId ? 'com o grupo' : 'separado em "' + ((st.scenes[sid] || {}).name || '—') + '"'; };
    const body = h('div', { class: 'col', style: { gap: '10px', minWidth: '320px' } },
      h('p', { class: 'muted', style: { margin: 0 } }, isGroup
        ? 'Esta é a cena do grupo. Marque quem estava separado para trazer de volta.'
        : 'Os marcados vão para esta cena e veem só ela. Desmarcar devolve o jogador ao grupo.'));
    if (!players.length) body.append(h('p', { class: 'empty' }, 'Nenhum jogador entrou na mesa ainda.'));
    else {
      const list = h('div', { class: 'move-list' });
      const draw = () => {
        list.innerHTML = '';
        for (const [pid, p] of players) {
          const here = S().sceneIdOf(pid) === id, locked = isGroup && here;
          list.append(h('label', { class: 'move-row' + (locked ? ' locked' : '') },
            h('input', { type: 'checkbox', checked: chosen.has(pid), disabled: locked, onchange: (e) => { if (e.target.checked) chosen.add(pid); else chosen.delete(pid); } }),
            avatar({ name: p.name, color: p.color }, 26),
            h('span', { class: 'grow' }, h('b', {}, p.name), h('small', {}, (online.has(pid) ? '' : 'desconectado · ') + where(pid))),
            // Plano 37: tirar da mesa (pode entrar de novo com o código)
            iconBtn('trash-2', 'Remover ' + p.name + ' da mesa', (e) => { e.preventDefault(); if (UI.removePlayer(pid)) { players.splice(players.findIndex(([x]) => x === pid), 1); chosen.delete(pid); draw(); } })));
        }
      };
      draw();
      body.append(list, h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => { for (const [pid] of players) chosen.add(pid); draw(); } }, 'Marcar todos'),
        isGroup ? '' : h('button', { class: 'btn small', onclick: () => { chosen.clear(); draw(); } }, 'Desmarcar todos')));
    }
    UI.modal('Mover jogadores para "' + sc.name + '"', body, [
      { label: 'Cancelar' },
      { label: 'Mover', primary: true, onclick: () => {
        S().dispatch({ type: 'scene.movePlayers', id, players: [...chosen] });
        U.toast(isGroup ? 'Jogadores de volta ao grupo.' : chosen.size ? chosen.size + (chosen.size === 1 ? ' jogador em ' : ' jogadores em ') + '"' + sc.name + '".' : 'Ninguém separado nesta cena.');
      } },
    ]);
  }
  UI.movePlayersDialog = movePlayersDialog;

  // =============== Lateral direita: propriedades e camadas ===============
  function renderRight() {
    const tabs = $('#right-tabs'), min = !!UI.collapsed.right, sig = UI.rightTab + min;
    const list = [{ id: 'props', icon: 'sliders-horizontal', label: 'Propriedades' }, { id: 'layers', icon: 'layers', label: 'Camadas' }];
    if (tabs._sig !== sig) {
      tabs._sig = sig;
      tabs.innerHTML = '';
      tabs.classList.toggle('rail', min);
      if (min) {
        tabs.append(h('button', { class: 'rail-btn', title: 'Abrir a barra', onclick: () => UI.setCollapsed('right', false) }, ic('panel-right-open')));
        for (const t of list) tabs.append(h('button', { class: 'rail-btn', title: t.label, onclick: () => { UI.rightTab = t.id; UI.setCollapsed('right', false); } }, ic(t.icon)));
      } else {
        tabs.append(h('button', { class: 'side-min', title: 'Recolher a barra (o painel do que estiver selecionado passa a flutuar no mapa)', onclick: () => UI.setCollapsed('right', true) }, ic('panel-right-close')));
        for (const t of list) tabs.append(h('button', { class: 'side-tab' + (UI.rightTab === t.id ? ' on' : ''), onclick: () => { UI.rightTab = t.id; renderRight(); } }, ic(t.icon), t.label));
      }
    }
    if (min) return;
    $('#props-slot').hidden = UI.rightTab !== 'props';
    renderLayers();
  }

  function renderLayers() {
    const box = $('#layers'), sc = S().currentScene(), gm = S().gmView(), L = App.Board.layers;
    if (!sc) { box.innerHTML = ''; return; }
    const sig = JSON.stringify([L, gm, Object.keys(sc.tokens).length, sc.drawings.length, sc.fog.enabled, sc.fog.shapes.length, !!sc.bg, UI.rightTab,
      sc.light, (S().state.rules || {}).exploreMode, (sc.walls || []).length, (sc.sounds || []).length, (sc.rooms || []).length, (sc.props || []).length, (sc.lights || []).length, (sc.triggers || []).length, (sc.notes || []).length, S().viewAs,
      sc.groups, Object.values(sc.tokens).map((t) => [t.group, t.hidden, t.masked]), App.Board.selected]);
    if (box._sig === sig) return;
    box._sig = sig;
    box.innerHTML = '';
    box.style.borderTop = UI.rightTab === 'layers' ? '0' : '';
    box.style.marginTop = UI.rightTab === 'layers' ? '-14px' : '';
    box.append(h('div', { class: 'sec-head' }, h('span', { class: 'eyebrow' }, 'Camadas da cena'),
      gm && iconBtn('settings-2', 'Configurar cena', () => sceneSettings(sc.id))));
    const row = (key, icon, label, n, canToggle = true) => h('div', { class: 'layer' + (L[key] ? '' : ' off') }, ic(icon), h('span', { class: 'grow' }, label), h('span', { class: 'n' }, n),
      canToggle && iconBtn(L[key] ? 'eye' : 'eye-off', L[key] ? 'Esconder (só para você)' : 'Mostrar', () => { L[key] = !L[key]; App.Board.requestRender(); box._sig = null; renderLayers(); }));
    box.append(
      row('tokens', 'users', 'Tokens', Object.keys(sc.tokens).length),
      row('drawings', 'pencil', 'Desenhos', sc.drawings.length),
      row('fog', 'cloud-fog', sc.fog.enabled ? 'Névoa de guerra' : 'Névoa (desligada)', sc.fog.shapes.length, gm),
      row('map', 'image', 'Mapa base', sc.bg ? 1 : 0));
    if (gm) box.append(row('walls', 'brick-wall', 'Paredes e portas', (sc.walls || []).length));
    if (gm) box.append(row('sounds', 'volume-2', 'Sons no mapa', (sc.sounds || []).length));
    if (gm) box.append(row('rooms', 'volume-x', 'Isolamentos de som', (sc.rooms || []).length));
    box.append(row('props', 'image', 'Imagens', (sc.props || []).filter((p) => gm || !p.hidden).length));
    if (gm) box.append(row('lights', 'lightbulb', 'Pontos de luz (marcadores)', (sc.lights || []).length));
    if (gm) box.append(row('triggers', 'zap', 'Gatilhos', (sc.triggers || []).length));
    if (gm) box.append(row('notes', 'file-text', 'Notas (só você)', (sc.notes || []).length));
    if (gm && sc.light.enabled) box.append(row('light', 'moon', 'Escuridão', sc.light.global ? 'dia' : 'noite'));
    if (UI.rightTab === 'layers') box.append(h('p', { class: 'hint' }, 'Esconder uma camada vale só para a sua tela: os outros continuam vendo.'));
    if (gm) box.append(groupsSection(sc));
    if (gm) box.append(lightSection(sc));
  }

  // Iluminação da cena (mestre)
  function lightSection(sc) {
    const B = App.Board, li = sc.light;
    const setLight = (patch) => S().dispatch({ type: 'scene.update', id: sc.id, patch: { light: Object.assign({}, sc.light, patch) } });
    const sec = h('div', { id: 'light-sec', class: 'light-sec' },
      h('div', { class: 'sec-head' }, h('span', { class: 'eyebrow' }, 'Iluminação')),
      h('label', { class: 'switch-row' }, ic('lightbulb'), h('span', { class: 'grow' }, 'Luz e visão dinâmicas'),
        h('input', { type: 'checkbox', id: 'light-on', checked: li.enabled, onchange: (e) => setLight({ enabled: e.target.checked }) })));
    if (li.enabled) {
      sec.append(
        h('div', { class: 'seg seg-lg' },
          h('button', { class: li.global ? 'on' : '', title: 'Tudo iluminado; as paredes ainda bloqueiam a visão', onclick: () => setLight({ global: true }) }, ic('sun'), 'Claro'),
          h('button', { class: li.global ? '' : 'on', title: 'Só se vê o que alguma luz ilumina', onclick: () => setLight({ global: false }) }, ic('moon'), 'Escuro')),
        h('button', { class: 'btn small block', id: 'btn-preview', title: 'Mostra a mesa exatamente como os jogadores veem e ouvem', onclick: () => UI.setViewAs('*') },
          ic('scan-eye'), 'Ver como os jogadores'),
        // Memória de exploração (Plano 19): o que já foi visto fica escurecido no mapa dos jogadores
        h('label', { class: 'switch-row', title: 'O que os jogadores já viram continua no mapa deles, escurecido e sem criaturas. O nunca visto fica preto.' },
          ic('map'), h('span', { class: 'grow' }, 'Memória de exploração'),
          h('input', { type: 'checkbox', id: 'explore-on', checked: !!li.explore, onchange: (e) => { setLight({ explore: e.target.checked }); if (e.target.checked) setTimeout(() => App.Explore.recompute(sc.id), 50); } })),
        li.explore ? h('div', { class: 'row' },
          h('span', { class: 'muted small-text grow' }, (S().state.rules || {}).exploreMode === 'player' ? 'De cada jogador (Mesa → Regras)' : 'Do grupo (Mesa → Regras)'),
          btnI('refresh-cw', 'Esquecer o explorado', { class: 'btn small', title: 'Recomeça: tudo volta a ficar preto para os jogadores', onclick: () => { if (confirm('Esquecer tudo o que os jogadores já exploraram nesta cena?')) { S().dispatch({ type: 'explore.clear', sceneId: sc.id }); setTimeout(() => App.Explore.recompute(sc.id), 50); } } })) : '',
        h('div', { class: 'row' },
          btnI('brick-wall', 'Paredes dos desenhos', { class: 'btn small grow', title: 'Transforma linhas, retângulos e círculos desenhados em paredes', onclick: () => {
            const walls = App.Light.wallsFromDrawings(sc);
            if (!walls.length) { U.toast('Não há desenhos nesta cena.'); return; }
            S().dispatch({ type: 'wall.add', sceneId: sc.id, walls });
            U.toast(walls.length + ' paredes criadas');
          } }),
          iconBtn('trash-2', 'Apagar todas as paredes', () => { if (confirm('Apagar todas as paredes e portas desta cena?')) S().dispatch({ type: 'wall.clear', sceneId: sc.id }); }, { disabled: !(sc.walls || []).length })),
        h('p', { class: 'hint' }, li.global
          ? 'Dia: tudo iluminado, mas ninguém enxerga através das paredes.'
          : 'Noite: os jogadores só veem o que uma luz ilumina. Dê luz aos tokens no painel de propriedades ou use a ferramenta Luz (U) para pôr luzes no mapa.'),
        h('p', { class: 'hint' }, 'Três níveis: luz plena (tudo visível), meia luz (escurecido) e escuridão (preto). A visão no escuro sobe um nível.'));
    } else sec.append(h('p', { class: 'hint' }, 'Ligue para escurecer o mapa, criar paredes que bloqueiam a visão e esconder monstros e armadilhas.'));
    return sec;
  }

  // =============== Dock inferior ===============
  // O zoom fica no centro de baixo; se o dock (que cresce da esquerda) encostar nele, o zoom vai para o lado.
  // Se ainda bater nos botões da direita, sobe para cima do dock.
  function placeZoom() {
    const z = $('#zoom'), d = $('#dock'), ba = $('#board-actions'), wrap = $('#board-wrap');
    if (!z || !d || !wrap) return;
    z.style.left = ''; z.style.bottom = ''; z.style.transform = '';
    if (ba) ba.style.bottom = '';
    const W = wrap.getBoundingClientRect(), dr = d.getBoundingClientRect(), up = (W.bottom - dr.top + 8) + 'px';
    // botões da direita (Trocar mapa, Encaixe) sobem uma linha se encostarem no dock
    let br = ba && ba.getBoundingClientRect();
    if (br && br.width && br.left < dr.right + 12) { ba.style.bottom = up; br = ba.getBoundingClientRect(); }
    const sameRow = (r) => r && r.width && r.bottom > dr.top;
    const zr = z.getBoundingClientRect();
    const free = (l, r) => l >= dr.right + 12 && (!sameRow(br) || r + 12 <= br.left);
    if (free(zr.left, zr.right)) return;
    const left = dr.right + 12;
    if (free(left, left + zr.width)) { z.style.left = (left - W.left) + 'px'; z.style.transform = 'none'; return; }
    // sem espaço na linha de baixo: sobe para cima do dock, à esquerda
    z.style.left = '14px'; z.style.transform = 'none'; z.style.bottom = up;
  }
  UI.placeZoom = placeZoom;
  window.addEventListener('resize', () => placeZoom());

  function renderDock() {
    for (const b of document.querySelectorAll('#dock [data-dock]')) {
      b.classList.toggle('on', b.dataset.dock === UI.tab);
      if (b.dataset.dock === 'audio' || b.dataset.dock === 'handouts') b.hidden = !S().gmView();
    }
    requestAnimationFrame(placeZoom);
    const st = S().state, count = $('#dock [data-dock="chat"] .count');
    if (!st || !count) return;
    if (UI.tab === 'chat') { const l = st.chat[st.chat.length - 1]; UI.seenChatId = l ? l.id : null; }
    const unread = UI.tab === 'chat' ? 0 : msgsAfter(st.chat, UI.seenChatId).filter((m) => m.kind !== 'system' && visibleMsg(m)).length;
    count.hidden = !unread;
    count.textContent = unread > 9 ? '9+' : String(unread);
  }
  function msgsAfter(list, id) {
    if (!id) return list;
    const i = list.findIndex((m) => m.id === id);
    return i < 0 ? list : list.slice(i + 1);
  }
  // Quem está olhando: o próprio jogador, ou o jogador que o mestre está simulando em "ver como"
  const viewerId = () => (S().isGM() && S().viewAs && S().viewAs !== '*' ? S().viewAs : S().me.id);
  const visibleMsg = (m) => {
    if (m.kind === 'handout' && Array.isArray(m.to)) return S().gmView() || m.to.includes(viewerId());
    return !m.secret || S().gmView() || m.playerId === S().me.id;
  };

  UI.showTab = function (id) {
    UI.tab = id;
    $('#dock-panel').hidden = false;
    $('#dock-panel').classList.toggle('auto', id !== 'chat');
    $('#dock-title').textContent = PANEL_TITLE[id] || '';
    for (const k of Object.keys(PANEL_TITLE)) { const p = $('#p-' + k); if (p) p.hidden = k !== id; }
    if (id === 'chat') { $('#roll-feed').innerHTML = ''; UI.chatSig = ''; }
    renderDock();
    renderPanel(id);
    if (id === 'chat') { const log = $('#chat-log'); log.scrollTop = log.scrollHeight; }
  };
  UI.closeDock = function () {
    UI.tab = null;
    $('#dock-panel').hidden = true;
    renderDock();
  };
  function renderPanel(id) {
    if (id === 'chat') renderChat();
    else if (id === 'dice') renderDice();
    else if (id === 'combat') renderCombat();
    else if (id === 'table') renderTable();
    else if (id === 'audio') renderAudio();
    else if (id === 'handouts') renderHandouts();
  }

  // =============== Chat ===============
  const chatMessages = writable([]);
  function buildChatPanel() {
    const p = $('#p-chat');
    const input = h('textarea', { id: 'chat-input', rows: 1, placeholder: 'Mensagem ou /r 1d20+@forca' });
    const send = () => { const v = input.value; input.value = ''; sendChat(v); };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      else if (e.key === 'ArrowUp' && !input.value && UI.lastChat) { e.preventDefault(); input.value = UI.lastChat; }
    });
    const secretBtn = h('button', { class: 'btn', id: 'secret-btn', title: 'Rolagens secretas: só você e o mestre veem', onclick: () => setSecret(!UI.secret) }, ic('lock-open'));
    const log = h('div', { id: 'chat-log' });
    mount(ChatLog, { target: log, props: { messages: chatMessages } });
    log.addEventListener('click', (e) => {
      const b = e.target.closest('[data-undo]');
      if (b) S().undoAction(b.dataset.undo);
    });
    p.append(log, h('div', { class: 'chat-input' }, input, secretBtn, h('button', { class: 'btn primary', title: 'Enviar (Enter)', onclick: () => { send(); input.focus(); } }, ic('send'))));
    p.addEventListener('click', (e) => {
      const el = e.target.closest('[data-handout]');
      if (!el) return;
      const m = S().state.chat.find((x) => x.id === el.dataset.handout);
      if (m) openHandout(m);
    });
    $('#roll-feed').addEventListener('click', (e) => {
      const b = e.target.closest('[data-undo]');
      if (b) S().undoAction(b.dataset.undo);
      else if (e.target.closest('.msg')) UI.showTab('chat');
    });
  }
  function setSecret(v) {
    UI.secret = v;
    for (const b of document.querySelectorAll('#secret-btn, #dice-secret')) {
      b.classList.toggle('on', v);
      b.innerHTML = '';
      b.append(ic(v ? 'lock' : 'lock-open'));
      if (b.id === 'dice-secret') b.append(v ? 'Secreta' : 'Pública');
    }
  }

  function sendChat(text) {
    text = String(text || '').trim();
    if (!text || !S().state) return;
    UI.lastChat = text;
    const m = text.match(/^\/(r|roll|gr)\s+(.+)$/i);
    // @atributos vêm do token selecionado (se você o controla)
    const sc = S().currentScene(), selT = sc && App.Board.selected && sc.tokens[App.Board.selected];
    const who = selT && S().canControl(selT) ? { actor: S().actorOf(selT) || undefined, token: selT } : {};
    if (m) { S().rollPost(m[2], Object.assign({ secret: m[1].toLowerCase() === 'gr' || UI.secret }, who)); return; }
    if (/^\/limpar$/i.test(text)) {
      if (S().gmView() && confirm('Limpar todo o chat?')) S().dispatch({ type: 'chat.clear' });
      return;
    }
    if (/^\d*d[\d%f]/i.test(text) && App.Dice.isFormula(text)) { S().rollPost(text, Object.assign({ secret: UI.secret }, who)); return; }
    S().dispatch({ type: 'chat.add', msg: { id: U.uid('m_'), ts: Date.now(), kind: 'text', from: S().myName(), playerId: S().me.id, text: text.slice(0, 2000) } });
  }

  // Detalhe vem pela rede: só deixa passar <span class="...">
  const cleanDetail = (s) => String(s || '').replace(/<(?!\/?span(\s+class="[a-z ]*")?>)[^>]*>/gi, '');

  // Vulto: o mestre vê o nome; os jogadores, "Vulto"
  const seenName = (name, masked) => (masked && !S().gmView() ? 'Vulto' : name);
  UI.seenName = seenName;

  function msgHtml(m) {
    if (m.kind === 'system') return `<div class="msg sys${m.secret ? ' secret' : ''}">${U.esc(m.text)}</div>`;
    const head = `<div class="msg-head"><b style="color:${S().playerColor(m.playerId)}">${U.esc(seenName(m.from, m.fromMasked))}</b>${m.secret ? icHtml('lock') + '<span>secreta</span>' : ''}<span class="time">${U.fmtTime(m.ts)}</span></div>`;
    if (m.kind === 'handout') {
      const src = m.img && App.Images.src(m.img);
      const who = Array.isArray(m.to) && S().gmView() ? ` · para ${U.esc(m.to.map((id) => S().playerName(id)).join(', '))}` : '';
      return `<div class="msg handout" data-handout="${U.esc(m.id)}">${head}<div class="ho-msg">${src ? `<img src="${src}" alt="">` : icHtml('scroll-text')}<div><span class="ho-eyebrow">O mestre mostrou${who}</span><b>${U.esc(m.title || 'Sem título')}</b>${m.text ? `<span class="ho-snip">${U.esc(String(m.text).slice(0, 90))}${String(m.text).length > 90 ? '…' : ''}</span>` : ''}<small>Clique para abrir</small></div></div></div>`;
    }
    if (m.kind === 'action') return `<div class="msg act m-${U.esc(m.mode || 'roll')}${m.undone ? ' undone' : ''}">${head}${actionMsgHtml(m)}</div>`;
    if (m.kind === 'roll') {
      const parts = (m.parts || []).map((p) => `<div class="roll-part"><div class="roll-main"><span class="roll-total${p.crit ? ' crit' : ''}${p.fumble ? ' fumble' : ''}">${U.esc(p.total)}</span><div>${p.label ? `<div class="roll-label">${U.esc(p.label)}</div>` : ''}<div class="roll-detail">${U.esc(p.formula)} → ${cleanDetail(p.detail)}</div></div></div></div>`).join('');
      return `<div class="msg roll">${head}${m.label ? `<div class="roll-title">${U.esc(String(m.label).replace(/^[^\p{L}\p{N}]+\s*/u, ''))}</div>` : ''}${parts}</div>`;
    }
    return `<div class="msg">${head}<div class="msg-text">${U.esc(m.text)}</div></div>`;
  }

  function renderChat() {
    const st = S().state, log = $('#chat-log');
    if (!st || !log || UI.tab !== 'chat') return;
    const last = st.chat[st.chat.length - 1];
    const sig = st.chat.length + ':' + (last ? last.id : '') + ':' + st.chat.filter((m) => m.undone).length + ':' + (st.rules && st.rules.hideNumbers) + ':' + S().gmView();
    if (sig === UI.chatSig) return;
    UI.chatSig = sig;
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    flushSync(() => chatMessages.set(st.chat.filter(visibleMsg).slice(-200).map((m, i) => ({ key: m.id || 'legacy-' + i, html: msgHtml(m) }))));
    if (atBottom || (last && last.playerId === S().me.id)) log.scrollTop = log.scrollHeight;
  }

  // Com o chat fechado, os resultados novos aparecem por alguns segundos sobre o mapa
  function checkHandouts() {
    const st = S().state;
    if (!st) return;
    const last = st.chat[st.chat.length - 1];
    if (UI.hoSeen === undefined) { UI.hoSeen = last ? last.id : ''; return; }
    const fresh = msgsAfter(st.chat, UI.hoSeen).filter((m) => m.kind === 'handout' && visibleMsg(m) && Date.now() - m.ts < 60000);
    UI.hoSeen = last ? last.id : '';
    for (const m of fresh) if (!S().gmView() || m.playerId === S().me.id) openHandout(m);
  }

  // Janela da entrega: imagem com zoom (roda do mouse, arrastar, dois cliques volta) e o texto
  function openHandout(m) {
    const gmPreview = S().gmView();
    UI.openWindow('handout:' + m.id, m.title || 'Do mestre', (w) => {
      const src = m.img && App.Images.src(m.img);
      if (w._view && w._src === src) return null;
      const box = h('div', { class: 'ho-win' });
      if (gmPreview) box.append(h('p', { class: 'hint', style: { margin: 0 } }, 'Prévia: é assim que os jogadores veem.'));
      if (src) {
        const img = h('img', { src, alt: m.title || '', draggable: 'false' });
        const view = h('div', { class: 'ho-view', title: 'Roda do mouse: zoom · arrastar: mover · dois cliques: voltar' }, img);
        let k = 1, x = 0, y = 0;
        const apply = () => { img.style.transform = `translate(${x}px, ${y}px) scale(${k})`; view.classList.toggle('zoomed', k > 1); };
        view.addEventListener('wheel', (e) => {
          e.preventDefault();
          const r = view.getBoundingClientRect(), mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2;
          const nk = U.clamp(k * Math.exp(-e.deltaY * 0.0015), 1, 6);
          x = mx - (mx - x) * (nk / k); y = my - (my - y) * (nk / k); k = nk;
          if (k === 1) { x = 0; y = 0; }
          apply();
        }, { passive: false });
        view.addEventListener('pointerdown', (e) => {
          if (k <= 1) return;
          const sx = e.clientX - x, sy = e.clientY - y;
          view.setPointerCapture(e.pointerId);
          const mv = (ev) => { x = ev.clientX - sx; y = ev.clientY - sy; apply(); };
          const up = () => { view.removeEventListener('pointermove', mv); view.removeEventListener('pointerup', up); };
          view.addEventListener('pointermove', mv); view.addEventListener('pointerup', up);
        });
        view.addEventListener('dblclick', () => { k = 1; x = 0; y = 0; apply(); });
        box.append(view);
      }
      if (m.text) box.append(h('div', { class: 'ho-text' }, String(m.text)));
      box.append(h('div', { class: 'muted small-text' }, 'Mostrado pelo mestre às ' + U.fmtTime(m.ts)));
      w._view = box;
      w._src = src;
      return box;
    }, { w: m.img ? 560 : 420, icon: 'scroll-text' });
  }
  UI.openHandout = openHandout;

  // ---------- Painel "Mostrar aos jogadores" (mestre): entregas preparadas ----------
  function renderHandouts() {
    const p = $('#p-handouts');
    safeRender(p, () => {
      const st = S().state;
      if (!st) return;
      const sig = JSON.stringify([st.handouts, Object.keys(App.Store.assets).length]);
      if (p._sig === sig) return;
      p._sig = sig;
      p.innerHTML = '';
      p.append(h('p', { class: 'hint', style: { margin: 0 } }, 'Prepare antes da sessão: imagens, textos ou os dois (uma carta, o retrato do vilão, uma pista). Na hora, é só clicar em Mostrar e escolher para quem.'),
        btnI('plus', 'Nova entrega', { class: 'btn primary block', onclick: () => handoutDialog(null) }));
      if (!st.handouts.length) p.append(h('p', { class: 'empty' }, 'Nenhuma entrega preparada ainda.'));
      for (const ho of st.handouts) {
        const src = ho.img && App.Images.src(ho.img);
        p.append(h('div', { class: 'ho-item' },
          h('div', { class: 'ho-thumb' }, src ? h('img', { src, alt: '' }) : ic('scroll-text')),
          h('div', { class: 'grow ho-info' }, h('b', {}, ho.title || 'Sem título'),
            h('small', {}, [ho.img ? 'imagem' : '', ho.text ? 'texto' : ''].filter(Boolean).join(' + ') + (ho.text ? ' · ' + String(ho.text).slice(0, 40) + (ho.text.length > 40 ? '…' : '') : ''))),
          h('div', { class: 'ho-acts' },
            btnI('eye', 'Mostrar', { class: 'btn primary small', title: 'Mostrar aos jogadores agora', onclick: () => showDialog(ho) }),
            iconBtn('pencil', 'Editar', () => handoutDialog(ho)),
            iconBtn('trash-2', 'Apagar', () => { if (confirm('Apagar a entrega "' + (ho.title || 'Sem título') + '"?')) S().dispatch({ type: 'handout.delete', id: ho.id }); }))));
      }
    });
  }

  // Criar ou editar uma entrega: título, imagem (enviar ou da biblioteca) e texto
  function handoutDialog(ho) {
    const f = { title: ho ? ho.title : '', img: ho ? ho.img : null, text: ho ? ho.text : '' };
    const prev = h('div', { class: 'ho-prev' });
    const lib = h('div', { class: 'img-lib', hidden: true });
    const drawPrev = () => {
      prev.innerHTML = '';
      const src = f.img && App.Images.src(f.img);
      prev.append(src ? h('img', { src, alt: '' }) : h('span', { class: 'muted small-text' }, 'Sem imagem (só texto)'));
    };
    const fillLib = () => {
      lib.innerHTML = '';
      const ids = campaignImages();
      if (!ids.length) lib.append(h('p', { class: 'hint', style: { margin: 0, gridColumn: '1 / -1' } }, 'A biblioteca está vazia: envie uma imagem.'));
      for (const id of ids) lib.append(h('img', { src: App.Images.src(id), alt: '', title: 'Usar esta imagem', onclick: () => { f.img = id; lib.hidden = true; drawPrev(); } }));
    };
    drawPrev();
    const body = h('div', { class: 'col', style: { gap: '10px', minWidth: '340px' } },
      h('label', { class: 'col' }, h('span', { class: 'eyebrow' }, 'Título'), h('input', { value: f.title, placeholder: 'Ex.: Carta do duque', maxlength: 80, oninput: (e) => { f.title = e.target.value; } })),
      h('span', { class: 'eyebrow' }, 'Imagem (opcional)'), prev,
      h('div', { class: 'row wrap' },
        btnI('upload', 'Enviar imagem…', { class: 'btn small', onclick: async () => {
          const file = await U.pickFile('image/*');
          if (!file) return;
          try { const r = await App.Images.add(file, App.Images.PROP); f.img = r.id; if (!f.title) { f.title = String(file.name).replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '); body.querySelector('input').value = f.title; } drawPrev(); } catch (e) { U.toast(e.message, 'error'); }
        } }),
        btnI('image', 'Da biblioteca', { class: 'btn small', onclick: () => { fillLib(); lib.hidden = !lib.hidden; } }),
        btnI('x', 'Tirar imagem', { class: 'btn small', onclick: () => { f.img = null; drawPrev(); } })),
      lib,
      h('label', { class: 'col' }, h('span', { class: 'eyebrow' }, 'Texto (opcional)'), h('textarea', { rows: 5, value: f.text, placeholder: 'Ex.: O selo está quebrado. A letra é apressada…', oninput: (e) => { f.text = e.target.value; } })));
    UI.modal(ho ? 'Editar entrega' : 'Nova entrega', body, [
      { label: 'Cancelar' },
      { label: 'Salvar', primary: true, onclick: () => {
        const title = f.title.trim(), text = f.text.trim();
        if (!f.img && !text) { U.toast('Coloque uma imagem, um texto ou os dois.', 'error'); return false; }
        if (ho) S().dispatch({ type: 'handout.update', id: ho.id, patch: { title, img: f.img, text } });
        else S().dispatch({ type: 'handout.add', handout: { id: U.uid('ho_'), title, img: f.img, text } });
      } },
    ]);
  }

  // Mostrar agora: para todos ou para jogadores escolhidos
  function showHandout(ho, to) {
    S().dispatch({ type: 'chat.add', msg: { id: U.uid('m_'), ts: Date.now(), kind: 'handout', from: S().myName(), playerId: S().me.id,
      hid: ho.id, title: ho.title || '', img: ho.img || null, text: ho.text || '', to } });
  }
  UI.showHandout = showHandout;
  function showDialog(ho) {
    const st = S().state, online = new Set(S().online), players = Object.entries(st.players);
    let all = true;
    const chosen = new Set();
    const list = h('div', { class: 'move-list', hidden: true });
    for (const [pid, pl] of players) {
      list.append(h('label', { class: 'move-row' },
        h('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) chosen.add(pid); else chosen.delete(pid); } }),
        avatar({ name: pl.name, color: pl.color }, 26),
        h('span', { class: 'grow' }, h('b', {}, pl.name), h('small', {}, online.has(pid) ? 'conectado' : 'desconectado'))));
    }
    const seg = h('div', { class: 'seg' },
      h('button', { class: 'on', onclick: (e) => { all = true; seg.children[0].classList.add('on'); seg.children[1].classList.remove('on'); list.hidden = true; } }, 'Todos'),
      h('button', { disabled: !players.length, onclick: () => { all = false; seg.children[1].classList.add('on'); seg.children[0].classList.remove('on'); list.hidden = false; } }, 'Escolher jogadores'));
    const src = ho.img && App.Images.src(ho.img);
    const body = h('div', { class: 'col', style: { gap: '10px', minWidth: '320px' } },
      h('div', { class: 'ho-item' }, h('div', { class: 'ho-thumb' }, src ? h('img', { src, alt: '' }) : ic('scroll-text')),
        h('div', { class: 'grow ho-info' }, h('b', {}, ho.title || 'Sem título'), h('small', {}, ho.text ? String(ho.text).slice(0, 60) : 'só imagem'))),
      h('span', { class: 'eyebrow' }, 'Para quem'), seg, list,
      players.length ? '' : h('p', { class: 'hint', style: { margin: 0 } }, 'Ninguém entrou na mesa ainda. Mostrando para todos, você vê a prévia e quem entrar encontra no chat.'));
    UI.modal('Mostrar "' + (ho.title || 'Sem título') + '"', body, [
      { label: 'Cancelar' },
      { label: 'Mostrar', primary: true, onclick: () => {
        if (!all && !chosen.size) { U.toast('Escolha pelo menos um jogador.', 'error'); return false; }
        showHandout(ho, all ? '*' : [...chosen]);
        U.toast(all ? 'Mostrado para todos.' : 'Mostrado para ' + [...chosen].map((id) => S().playerName(id)).join(', ') + '.');
      } },
    ]);
  }

  function renderFeed() {
    const st = S().state, feed = $('#roll-feed');
    if (!st) return;
    const last = st.chat[st.chat.length - 1];
    if (UI.feedId === null) { UI.feedId = last ? last.id : ''; return; }
    const fresh = msgsAfter(st.chat, UI.feedId).filter((m) => (m.kind === 'roll' || m.kind === 'action') && visibleMsg(m));
    // Atualiza cartões já na tela (ex.: desfeito)
    for (const el of feed.querySelectorAll('[data-mid]')) {
      const m = st.chat.find((x) => x.id === el.dataset.mid);
      if (m && m.undone && !el.firstElementChild.classList.contains('undone')) el.innerHTML = m.kind === 'action' ? compactActionHtml(m) : msgHtml(m);
    }
    UI.feedId = last ? last.id : '';
    if (UI.tab === 'chat' || !fresh.length) return;
    for (const m of fresh.slice(-2)) {
      const el = h('div', { 'data-mid': m.id, html: m.kind === 'action' ? compactActionHtml(m) : msgHtml(m) });
      feed.append(el);
      setTimeout(() => { el.firstElementChild && el.firstElementChild.classList.add('out'); setTimeout(() => el.remove(), 400); }, m.kind === 'action' ? 9000 : 6000);
    }
    while (feed.children.length > 2) feed.firstElementChild.remove();
  }

  // =============== Dados ===============
  const DICE = [4, 6, 8, 10, 12, 20, 100];
  const DIE_SHAPE = {
    4: '<path d="M12 3 21.5 19.5h-19z"/>',
    6: '<rect x="4" y="4" width="16" height="16" rx="2.5"/>',
    8: '<path d="M12 2.5 21 12l-9 9.5L3 12z"/>',
    10: '<path d="M12 2.5 21 10.5 12 21.5 3 10.5z"/><path d="M3 10.5 12 14l9-3.5M12 14v7.5" opacity=".5"/>',
    12: '<path d="M12 2.5 21.2 9.2 17.7 20h-11.4L2.8 9.2z"/>',
    20: '<path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3z"/><path d="M12 2.5 7.5 10h9zM7.5 10l-4 6.7M16.5 10l4 6.7M7.5 10 12 17.5l4.5-7.5M12 17.5v4" opacity=".5"/>',
    100: '<path d="M8 3.5 14 9 8 20.5 2 9z"/><path d="M16 3.5 22 9l-6 11.5" opacity=".6"/>',
  };
  const dieSvg = (n) => { const t = document.createElement('template'); t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${DIE_SHAPE[n]}</svg>`; return t.content.firstChild; };
  function diceFormula() {
    const d = UI.dice, parts = DICE.filter((n) => d.pool[n] > 0).sort((a, b) => b - a).map((n) => d.pool[n] + 'd' + n);
    let f = parts.join('+');
    if (d.mod) f += (d.mod > 0 ? '+' : '') + d.mod;
    return f;
  }
  function renderDice() {
    const p = $('#p-dice');
    safeRender(p, () => {
      p.innerHTML = '';
      const d = UI.dice;
      const formula = h('input', { id: 'dice-formula', value: diceFormula(), placeholder: 'Clique nos dados ou digite: 2d6+3', onkeydown: (e) => { if (e.key === 'Enter') roll(); } });
      const roll = () => {
        const f = formula.value.trim();
        if (!f) { U.toast('Escolha os dados primeiro.'); return; }
        S().rollPost(f, { secret: UI.secret });
        UI.dice = { pool: {}, mod: 0 };
        renderDice();
      };
      p.append(h('div', { class: 'dice-grid' }, DICE.map((n) => h('button', {
        class: 'die-pick' + (d.pool[n] ? ' on' : ''), title: 'Clique: +1 d' + n + ' · botão direito: −1',
        onclick: () => { d.pool[n] = (d.pool[n] || 0) + 1; renderDice(); },
        oncontextmenu: (e) => { e.preventDefault(); d.pool[n] = Math.max(0, (d.pool[n] || 0) - 1); renderDice(); },
      }, dieSvg(n), 'd' + n, d.pool[n] ? h('span', { class: 'n' }, '×' + d.pool[n]) : null)),
      h('button', { class: 'die-pick', title: 'Rolar 1d20 agora', onclick: () => S().rollPost('1d20', { secret: UI.secret }) }, ic('zap'), 'Rápido')));
      p.append(h('div', { class: 'row' },
        h('span', { class: 'muted small-text grow' }, 'Modificador'),
        h('div', { class: 'dice-mod' },
          iconBtn('minus', 'Diminuir', () => { d.mod--; renderDice(); }),
          h('span', {}, (d.mod > 0 ? '+' : '') + d.mod),
          iconBtn('plus', 'Aumentar', () => { d.mod++; renderDice(); }))));
      p.append(h('div', { class: 'dice-formula' }, formula));
      p.append(h('div', { class: 'row' },
        h('button', { class: 'btn small', title: '2d20, fica o maior', onclick: () => S().rollPost('2d20kh1', { secret: UI.secret, label: 'Vantagem' }) }, 'Vantagem'),
        h('button', { class: 'btn small', title: '2d20, fica o menor', onclick: () => S().rollPost('2d20kl1', { secret: UI.secret, label: 'Desvantagem' }) }, 'Desvantagem'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn small' + (UI.secret ? ' on' : ''), id: 'dice-secret', title: 'Rolagem secreta: só você e o mestre veem', onclick: () => setSecret(!UI.secret) }, ic(UI.secret ? 'lock' : 'lock-open'), UI.secret ? 'Secreta' : 'Pública')));
      p.append(h('div', { class: 'row' },
        h('button', { class: 'btn grow', onclick: () => { UI.dice = { pool: {}, mod: 0 }; renderDice(); } }, 'Limpar'),
        btnI('dices', 'Rolar', { class: 'btn primary grow', onclick: roll })));
      p.append(h('p', { class: 'hint' }, 'Também funciona no chat: /r 4d6kh3, 1d6! (explode), 4dF, d%. Use /gr para rolar em segredo.'));
    });
  }

  // =============== Som (só o mestre) ===============
  const CAT = { music: 'Música', ambient: 'Ambiente', sfx: 'Efeito' };
  const fmtDur = (d) => (d > 0 ? Math.floor(d / 60) + ':' + String(Math.floor(d % 60)).padStart(2, '0') : '');
  function renderAudio(force) {
    const p = $('#p-audio'), Au = App.Audio, st = S().state;
    if (!st || !S().gmView()) { p.innerHTML = ''; return; }
    const sc = S().currentScene(), au = st.audio;
    const sig = JSON.stringify([au, sc && [sc.id, sc.name, sc.music, sc.ambient, (sc.sounds || []).length], Au.files.size, Au.dirName, Au.needPerm, UI.audioFilter, Object.keys(Au.durations).length]);
    if (!force && p._sig === sig) return;
    safeRender(p, () => {
      p._sig = sig;
      p.innerHTML = '';
      // Pasta
      if (Au.needPerm) {
        p.append(h('div', { class: 'au-folder' }, ic('folder-open'), h('div', { class: 'grow' }, h('b', {}, Au.dirName), h('span', {}, 'O navegador pede permissão a cada sessão.')),
          btnI('refresh-cw', 'Reconectar', { class: 'btn primary small', onclick: () => Au.reconnect() })));
      } else if (!Au.files.size) {
        p.append(h('div', { class: 'au-empty' },
          h('div', { class: 'bubble' }, ic('music')),
          h('b', {}, 'Escolha a pasta de músicas'),
          h('p', {}, 'Crie uma pasta "musicas" dentro do projeto, coloque seus arquivos (mp3, ogg, m4a, wav) e aponte para ela. Música nova colocada lá aparece aqui.'),
          Au.canPickFolder()
            ? btnI('folder-open', 'Escolher pasta', { class: 'btn primary', onclick: () => Au.pickFolder() })
            : btnI('folder-open', 'Escolher arquivos', { class: 'btn primary', onclick: () => Au.pickFiles() }),
          Au.canPickFolder() ? null : h('p', { class: 'hint' }, 'Este navegador não abre pastas (só Chrome e Edge). Os arquivos escolhidos valem até fechar a página.')));
        return;
      } else {
        p.append(h('div', { class: 'au-folder' }, ic('folder-open'), h('div', { class: 'grow' }, h('b', {}, Au.dirName), h('span', {}, Au.files.size + ' faixas')),
          Au.dir ? iconBtn('refresh-cw', 'Procurar músicas novas na pasta', () => Au.scan()) : null,
          iconBtn('folder-open', 'Trocar de pasta', () => (Au.canPickFolder() ? Au.pickFolder() : Au.pickFiles()))));
      }

      // Canais
      const channel = (ch, icon, label) => {
        const cur = au[ch], playing = cur && cur.playing;
        return h('div', { class: 'au-ch' + (playing ? ' on' : '') },
          h('div', { class: 'au-ch-top' }, ic(icon),
            h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, label), h('div', { class: 'au-now' }, cur ? Au.label(cur.name) : 'Nada tocando')),
            cur && iconBtn(playing ? 'pause' : 'play', playing ? 'Pausar para todos' : 'Continuar', () => Au.toggle(ch)),
            cur && iconBtn('square', 'Parar', () => Au.stop(ch)),
            cur && iconBtn('repeat', cur.loop !== false ? 'Repetindo (clique para tocar uma vez)' : 'Tocar uma vez (clique para repetir)', () => Au.setLoop(ch, cur.loop === false), { class: 'icon-btn' + (cur.loop !== false ? ' on' : '') })),
          volume(ch));
      };
      const volume = (ch) => h('div', { class: 'au-vol' }, ic(au.vol[ch] > 0 ? 'volume-2' : 'volume-x'),
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: au.vol[ch], title: 'Volume para todos',
          oninput: (e) => Au.previewVolume(ch, Number(e.target.value)), onchange: (e) => { Au.setVolume(ch, Number(e.target.value)); e.target.blur(); } }),
        h('span', {}, Math.round(au.vol[ch] * 100) + '%'));
      p.append(channel('music', 'music', 'Música'), channel('ambient', 'wind', 'Ambiente'),
        h('div', { class: 'au-ch' }, h('div', { class: 'au-ch-top' }, ic('zap'), h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'Efeitos e sons no mapa'), h('div', { class: 'au-now' }, sc && (sc.sounds || []).length ? sc.sounds.length + (sc.sounds.length === 1 ? ' som' : ' sons') + ' no mapa desta cena' : 'Sons curtos e sons presos ao mapa'))), volume('sfx')));

      // Trilha da cena
      if (sc) {
        const slot = (k, label) => h('div', { class: 'au-slot' }, h('span', { class: 'muted' }, label),
          h('span', { class: 'grow' }, sc[k] ? Au.label(sc[k]) : h('span', { class: 'muted' }, '—')),
          sc[k] ? iconBtn('x', 'Tirar da cena', () => S().dispatch({ type: 'scene.update', id: sc.id, patch: { [k]: null } })) : null);
        p.append(h('h4', {}, 'Trilha da cena: ' + sc.name), slot('music', 'Música'), slot('ambient', 'Ambiente'),
          h('p', { class: 'hint' }, 'Toca sozinha quando você ativa a cena para os jogadores. Use o botão de mapa numa faixa para definir.'));
      }

      // Biblioteca
      const all = [...Au.files.keys()].sort((a, b) => a.localeCompare(b));
      const q = U.slug(UI.audioQ || ''), filt = UI.audioFilter || 'all';
      const list = all.filter((n) => filt === 'all' || Au.catOf(n) === filt);
      p.append(h('h4', {}, 'Biblioteca'),
        h('p', { class: 'hint', style: { marginTop: 0 } }, 'Arraste uma faixa para o mapa: música e ambiente ficam tocando daquele ponto (dentro de um isolamento de som, só quem está dentro ouve); efeito fica parado esperando o seu play (no painel ou com dois cliques no marcador). Os jogadores ouvem conforme a distância.'),
        h('div', { class: 'search-box' }, ic('search'), h('input', { placeholder: 'Buscar faixa…', value: UI.audioQ || '', oninput: (e) => {
          UI.audioQ = e.target.value;
          const qq = U.slug(UI.audioQ);
          for (const row of document.querySelectorAll('#p-audio .au-trk')) row.hidden = !!qq && !row.dataset.q.includes(qq);
        } })),
        h('div', { class: 'seg' }, [['all', 'Todas'], ['music', 'Música'], ['ambient', 'Ambiente'], ['sfx', 'Efeitos']].map(([k, l]) =>
          h('button', { class: filt === k ? 'on' : '', onclick: () => { UI.audioFilter = k; renderAudio(true); } }, l))));
      const box = h('div', { class: 'au-list' });
      for (const name of list) {
        const cat = Au.catOf(name), dur = Au.durations[name], folder = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : '';
        const now = (au.music && au.music.name === name) || (au.ambient && au.ambient.name === name);
        box.append(h('div', { class: 'au-trk' + (now ? ' on' : ''), 'data-q': U.slug(name), hidden: !!q && !U.slug(name).includes(q),
          draggable: true, title: 'Arraste para o mapa para o som sair daquele ponto',
          ondragstart: (e) => { e.dataTransfer.setData('text/x-sound', name); e.dataTransfer.effectAllowed = 'copy'; } },
          h('button', { class: 'au-play ' + cat, title: cat === 'sfx' ? 'Tocar efeito para todos' : 'Tocar para todos (' + CAT[cat] + ')', onclick: () => (cat === 'sfx' ? Au.playSfx(name) : Au.play(cat, name)) },
            ic(cat === 'sfx' ? 'zap' : now ? 'volume-2' : 'play')),
          h('div', { class: 'grow' }, h('div', { class: 'au-name' }, Au.label(name)), h('div', { class: 'au-sub' }, [folder, fmtDur(dur)].filter(Boolean).join(' · '))),
          h('select', { class: 'au-cat', title: 'Categoria', value: cat, onchange: (e) => S().dispatch({ type: 'audio.lib', name, patch: { cat: e.target.value } }) },
            Object.entries(CAT).map(([k, l]) => h('option', { value: k }, l))),
          sc && cat !== 'sfx' ? iconBtn('map', 'Usar como trilha desta cena', () => { S().dispatch({ type: 'scene.update', id: sc.id, patch: { [cat]: name } }); U.toast('Trilha da cena: ' + Au.label(name)); }, { class: 'icon-btn' + (sc[cat] === name ? ' on' : '') }) : h('span', { class: 'au-pad' })));
      }
      if (!list.length) box.append(h('p', { class: 'empty' }, 'Nenhuma faixa encontrada.'));
      p.append(box);
    });
  }

  // =============== Janelas flutuantes ===============
  function bringFront(el) { el.style.zIndex = ++UI.z; }
  // Janela nunca passa da parte de baixo da tela: o corpo rola por dentro
  function fitWin(el) { el.style.maxHeight = Math.max(200, window.innerHeight - el.offsetTop - 12) + 'px'; }
  window.addEventListener('resize', () => { for (const w of UI.windows.values()) fitWin(w.el); });

  function dragBy(handle, el) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button,input,select')) return;
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      const move = (ev) => {
        el.style.left = U.clamp(ox + ev.clientX - sx, -el.offsetWidth + 80, window.innerWidth - 80) + 'px';
        el.style.top = U.clamp(oy + ev.clientY - sy, 0, window.innerHeight - 40) + 'px';
        fitWin(el);
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
  UI.openWindow = function (id, title, build, opts = {}) {
    let w = UI.windows.get(id);
    if (w) { bringFront(w.el); return w; }
    const n = UI.windows.size;
    const el = h('div', { class: 'win', style: {
      left: Math.max(8, Math.min(window.innerWidth - (opts.w || 440) - 8, 260 + n * 26)) + 'px',
      top: 70 + n * 26 + 'px', width: (opts.w || 440) + 'px',
    } });
    const chrome = flushSync(() => mount(WindowChrome, { target: el, props: {
      title, icon: opts.icon ? App.Icons.svg(opts.icon) : '', closeIcon: App.Icons.svg('x'),
      onclose: () => UI.closeWindow(id),
    } }));
    const head = el.querySelector('.win-head'), body = el.querySelector('.win-body'), titleEl = head.querySelector('.win-title');
    el.addEventListener('pointerdown', () => bringFront(el));
    $('#windows').append(el);
    fitWin(el);
    dragBy(head, el);
    w = { id, el, body, titleEl, build, chrome };
    UI.windows.set(id, w);
    renderWindow(w);
    bringFront(el);
    return w;
  };
  UI.closeWindow = function (id) {
    const w = UI.windows.get(id);
    if (w) { w.off?.(); App.Ficha5e?.release(w.body.firstElementChild); if (w.chrome) void unmount(w.chrome); w.el.remove(); UI.windows.delete(id); }
    if (id === 'anim-editor' && UI.animWin) { UI.animWin = null; if (App.Board) App.Board.requestRender(); }
    if (String(id).startsWith('trigger:')) { UI.trigHover = null; UI.trigEdit = null; if (App.Board) App.Board.requestRender(); }
    if (id === 'scan' && App.Board) { App.Board.scan = null; App.Board.requestRender(); }
  };

  // =============== Scan de paredes e portas (Plano 22) ===============
  UI.scanOpts = null;
  UI.openScan = function (only) {
    const sc = S().currentScene();
    if (!sc || !S().gmView()) return;
    if (!sc.bg) { U.toast('Esta cena ainda não tem imagem de mapa. Troque o mapa primeiro.'); return; }
    if (!UI.scanOpts || UI.scanOpts.sceneId !== sc.id) UI.scanOpts = { sceneId: sc.id, by: 'outside', seeds: [], sens: 0.5, smooth: 0, minSize: 0.1, mode: 'straight', region: null, tpls: [], doorThr: 0.86, gaps: false };
    // Plano 32: pela ferramenta Porta, procura só portas (as paredes que já existem ganham a passagem)
    const mode = only === 'doors' ? 'doors' : null;
    if (UI.scanOpts.only !== mode) { UI.scanOpts.only = mode; if (App.Board.scan) { App.Board.scan.walls = []; App.Board.scan.doors = []; } }
    if (mode && !UI.scanOpts.tpls.length && (S().currentScene().walls || []).some((w) => !w.door)) UI.scanOpts.gaps = true;
    // janela aberta no outro modo: fecha antes (fechar limpa as sugestões do mapa)
    if (UI.windows.has('scan')) UI.closeWindow('scan');
    const B = App.Board;
    B.scan = B.scan && B.scan.sceneId === sc.id ? B.scan : { sceneId: sc.id, walls: [], doors: [], busy: false };
    UI.openWindow('scan', mode ? 'Procurar portas no mapa' : 'Procurar paredes no mapa', (win) => buildScanWin(win), { w: 360, icon: mode ? 'door-closed' : 'scan' });
    UI.runScan();
  };
  let scanTimer = null, scanSeq = 0;
  UI.runScan = function (now) {
    clearTimeout(scanTimer);
    const go = async () => {
      const o = UI.scanOpts, B = App.Board, sc = o && S().state.scenes[o.sceneId];
      if (!sc || !B.scan) return;
      const my = ++scanSeq;
      B.scan.busy = true; UI.refreshScan();
      try {
        const res = await App.Scan.run(sc, o);
        if (my !== scanSeq || !B.scan) return;
        Object.assign(B.scan, { walls: res.walls, doors: res.doors, need: !!res.need, error: null, doorWarn: res.doorWarn || null });
      } catch (e) { if (B.scan) B.scan.error = e.message; }
      if (B.scan) B.scan.busy = false;
      UI.refreshScan(); B.requestRender();
    };
    if (now) go(); else scanTimer = setTimeout(go, 250);
  };
  UI.refreshScan = () => { const w = UI.windows.get('scan'); if (w) { w._sig = null; renderWindow(w); } };
  function buildScanWin(win) {
    const o = UI.scanOpts, B = App.Board, sc = o && S().state.scenes[o.sceneId], R = B.scan;
    if (!sc || !R || !S().gmView()) return false;
    const sig = JSON.stringify([o, R.walls.length, R.doors.length, R.walls.filter((s) => s.off).length, R.doors.filter((s) => s.off).length, R.busy, R.error, R.need, R.doorWarn]);
    if (win._sig === sig) return null;
    win._sig = sig;
    win.el.classList.add('scan-win');
    const set = (patch, run = true) => { Object.assign(o, patch); UI.refreshScan(); if (run) UI.runScan(); };
    const hide = (fn) => { win.el.style.display = 'none'; fn(() => { win.el.style.display = ''; }); };
    const P = App.Scan.cache;
    const swatch = (p) => h('i', { class: 'scan-dot', style: { background: P ? App.Scan.colorAt(P, p) : '#888' } });
    const pickSeeds = () => hide((back) => {
      pickBar(o.by === 'wall' ? 'Clique num pedaço de parede da imagem (pode clicar em mais de uma cor). Enter ou Concluir termina.' : o.by === 'floor' ? 'Clique no chão de cada sala (um clique por sala; corredores também). Enter ou Concluir termina.' : 'Clique no vazio de fora das salas (pode clicar em mais de um lugar). Enter ou Concluir termina.');
      B.pick('point', (p) => { o.seeds = o.seeds.concat([{ x: Math.round(p.x), y: Math.round(p.y) }]); UI.runScan(true); }, () => { pickBar(null); back(); UI.refreshScan(); }, { multi: true, raw: true });
    });
    const W = R.walls.filter((s) => !s.off).length, Dn = R.doors.filter((s) => !s.off).length;
    const OD = o.only === 'doors';
    const status = R.error ? h('div', { class: 'warn-box' }, R.error)
      : R.need ? h('p', { class: 'hint scan-status' }, OD ? 'Mostre uma porta da imagem ou ligue o palpite para começar.' : o.by === 'wall' ? 'Clique numa parede da imagem para começar.' : o.by === 'floor' ? 'Clique no chão de uma sala para começar.' : 'Clique no vazio de fora das salas para começar.')
        : h('p', { class: 'scan-status' }, R.busy ? 'Procurando…' : (OD ? '' : W + (W === 1 ? ' parede' : ' paredes') + ' · ') + Dn + (Dn === 1 ? ' porta' : ' portas') + ' sugeridas'
          + ((R.walls.length - W) + (R.doors.length - Dn) ? ' (' + ((R.walls.length - W) + (R.doors.length - Dn)) + ' tiradas)' : ''));
    const BY = { outside: 'Clique no vazio de fora das salas: a borda das salas vira parede. Bom para mapas em que as salas ficam "soltas" num fundo.',
      wall: 'Clique na cor das paredes desenhadas: o meio da linha vira parede. Bom para mapas com paredes pretas ou de pedra.',
      dark: 'Sem clique: o que for bem escuro vira parede. Bom para mapas simples em preto e branco.',
      floor: 'Clique no chão de cada sala: o chão é preenchido até a parede, e a borda dele vira parede. Bom para mapas com rocha, neve ou fundo cheio de textura.' };
    const n = (k) => (OD ? k - 2 : k) + '. ';
    return h('div', { class: 'scan' },
      h('p', { class: 'hint', style: { margin: 0 } }, OD ? 'As portas sugeridas aparecem tracejadas no mapa. Clique numa para tirar (ou pôr de volta). Onde já existe parede, a porta abre a passagem nela.' : 'As sugestões aparecem tracejadas no mapa. Clique numa para tirar (ou pôr de volta); Shift + arrastar tira várias. Depois ajuste com o lápis e a borracha.'),
      OD ? '' : h('span', { class: 'eyebrow' }, '1. O que separa as salas'),
      OD ? '' : h('div', { class: 'seg scan-by' }, [['outside', 'Lado de fora'], ['floor', 'Chão das salas'], ['wall', 'Cor da parede'], ['dark', 'Escuro']].map(([k, l]) =>
        h('button', { class: o.by === k ? 'on' : '', onclick: () => set(Object.assign({ by: k, seeds: k === o.by ? o.seeds : [] }, k === 'floor' && k !== o.by && !o.smooth ? { smooth: 0.2, sens: 0.35 } : {})) }, l))),
      OD ? '' : h('p', { class: 'hint', style: { margin: 0 } }, BY[o.by]),
      !OD && o.by !== 'dark' ? h('div', { class: 'row' }, h('div', { class: 'grow scan-seeds' }, o.seeds.length ? o.seeds.map(swatch) : h('span', { class: 'ta-target none' }, 'Nenhum clique ainda')),
        btnI('map-pin', o.seeds.length ? 'Mais' : 'Clicar no mapa', { class: 'btn small primary', onclick: pickSeeds }),
        o.seeds.length ? iconBtn('x', 'Limpar os cliques', () => set({ seeds: [] })) : '') : '',
      OD ? '' : h('div', { class: 'snd-row' }, h('span', {}, 'Sensibilidade'), h('span', {}, Math.round(o.sens * 100) + '%')),
      OD ? '' : h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.sens, onchange: (e) => set({ sens: Number(e.target.value) }) }),
      OD ? '' : h('div', { class: 'snd-row', title: 'Borra a imagem antes de procurar: rocha, neve e lajotas viram manchas lisas' }, h('span', {}, 'Ignorar textura'), h('span', {}, o.smooth ? Math.round(o.smooth * 100) + '%' : 'desligado')),
      OD ? '' : h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.smooth || 0, onchange: (e) => set({ smooth: Number(e.target.value) }) }),
      OD ? '' : h('div', { class: 'snd-row', title: 'Manchas menores que isso (árvores, pedras, móveis) não viram parede' }, h('span', {}, 'Tamanho mínimo'), h('span', {}, (() => { const q = Math.round((o.by === 'wall' || o.by === 'dark' ? 0.1 : 1.5) * Math.max(0.2, (o.minSize ?? 0.1) * 10) * 10) / 10; return String(q).replace('.', ',') + (q === 1 ? ' quadrado' : ' quadrados'); })())),
      OD ? '' : h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.minSize ?? 0.1, onchange: (e) => set({ minSize: Number(e.target.value) }) }),
      OD ? '' : h('span', { class: 'eyebrow' }, '2. Paredes'),
      OD ? '' : h('div', { class: 'seg' }, [['straight', 'Retas (grid e 45°)'], ['free', 'Livre (cavernas)']].map(([k, l]) => h('button', { class: o.mode === k ? 'on' : '', onclick: () => set({ mode: k }) }, l))),
      h('span', { class: 'eyebrow' }, n(3) + 'Onde'),
      h('div', { class: 'row' }, h('div', { class: 'seg grow' },
        h('button', { class: o.region ? '' : 'on', onclick: () => set({ region: null }) }, 'Mapa inteiro'),
        h('button', { class: o.region ? 'on' : '', onclick: () => hide((back) => B.dragRect('Arraste o retângulo onde procurar. Esc cancela.', (a, b) => set({ region: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) } }), back, '#5fd0c4')) }, o.region ? 'Só a área (trocar)' : 'Só uma área'))),
      h('span', { class: 'eyebrow' }, n(4) + 'Portas'),
      h('div', { class: 'row' }, h('div', { class: 'grow chips' }, o.tpls.map((t, i) => h('span', { class: 'chip', title: 'Clique para tirar este exemplo', onclick: () => set({ tpls: o.tpls.filter((_, j) => j !== i) }) }, 'Exemplo ' + (i + 1), ic('x')))),
        btnI('door-closed', o.tpls.length ? 'Outra porta' : 'Mostrar uma porta', { class: 'btn small', title: 'Arraste um retângulo em volta de uma porta da imagem: o sistema procura as parecidas (giradas também)', onclick: () => hide((back) => B.dragRect('Arraste um retângulo bem justo em volta de uma porta da imagem. Esc cancela.', (a, b) => {
          const r = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
          if (r.w > 3 && r.h > 3) set({ tpls: o.tpls.concat([r]) });
        }, back, '#e8a54b')) })),
      o.tpls.length ? h('div', { class: 'snd-row' }, h('span', {}, 'Quão parecida'), h('span', {}, Math.round(o.doorThr * 100) + '%')) : '',
      o.tpls.length ? h('input', { type: 'range', min: 0.7, max: 0.98, step: 0.01, value: o.doorThr, onchange: (e) => set({ doorThr: Number(e.target.value) }) }) : '',
      h('label', { class: 'switch-row' }, h('span', { class: 'grow' }, OD ? 'Palpite: aberturas de 1 quadrado nas paredes do mapa viram porta' : 'Palpite: aberturas de 1 quadrado viram porta'), h('input', { type: 'checkbox', checked: !!o.gaps, onchange: (e) => set({ gaps: e.target.checked }) })),
      status,
      R.doorWarn ? h('div', { class: 'warn-box' }, R.doorWarn) : '',
      h('div', { class: 'hud-btns' },
        btnI('check', 'Criar', { class: 'btn primary grow', title: 'Cria as paredes e portas sugeridas (um Ctrl+Z desfaz tudo)', disabled: !(W + Dn) || R.busy, onclick: () => {
          const n = App.Scan.apply(sc, R);
          U.toast(OD ? 'Criadas: ' + Dn + (Dn === 1 ? ' porta' : ' portas') + '. Ctrl+Z desfaz.' : 'Criadas: ' + W + ' paredes e ' + Dn + ' portas. Ctrl+Z desfaz.', 'info', 3500);
          if (n) { R.walls = []; R.doors = []; App.Scan.cache = App.Scan.cache; UI.runScan(true); }
        } }),
        iconBtn('refresh-cw', 'Procurar de novo', () => UI.runScan(true)),
        iconBtn('x', 'Fechar', () => UI.closeWindow('scan'))));
  }
  function renderWindow(w) {
    safeRender(w.body, () => {
      if (!UI.windows.has(w.id)) return;
      const r = w.build(w);
      if (r === false) { UI.closeWindow(w.id); return; }
      if (r === null) return; // nada mudou: mantém o que está na tela
      const scroll = w.body.scrollTop;
      App.Ficha5e?.release(w.body.firstElementChild);
      w.body.innerHTML = '';
      if (r) w.body.append(r);
      w.body.scrollTop = scroll;
    });
  }

  // =============== Ficha ===============
  UI.openActor = function (id, tab) {
    if (tab) { UI.sheetTab = UI.sheetTab || {}; UI.sheetTab[id] = tab; if (App.Ficha5e) App.Ficha5e.tab[id] = tab === 'acoes' ? 'acoes' : tab === 'config' ? 'config' : App.Ficha5e.tab[id]; const open = UI.windows.get('actor:' + id); if (open) renderWindow(open); }
    UI.openWindow('actor:' + id, 'Ficha', (w) => {
      const a = S().state && S().state.actors[id];
      if (!a) return w.loaded ? false : h('p', { class: 'muted' }, 'Carregando…');
      w.loaded = true;
      w.titleEl.textContent = a.name;
      return buildSheet(a);
    }, { w: S().state && S().state.actors[id] && S().state.actors[id].sistema === '5e' ? 720 : 480, icon: 'scroll-text' });
  };

  // Listas da campanha (o mestre edita no painel Mesa)
  const campAttrs = () => (S().state && S().state.attrs) || [];
  const campBars = () => (S().state && S().state.barNames) || [];
  UI.campAttrs = campAttrs; UI.campBars = campBars;
  // Select de nome: opções da lista; um nome de fora continua aparecendo, marcado
  function nameSelect(list, value, onPick, attrs = {}) {
    const hit = list.find((n) => U.slug(n) === U.slug(value || ''));
    const cur = hit || value || '';
    return h('select', Object.assign({ value: cur, onchange: (e) => onPick(e.target.value) }, attrs),
      !hit && value ? h('option', { value }, value + ' (fora da lista)') : null,
      !value ? h('option', { value: '' }, 'Escolha…') : null,
      list.map((n) => h('option', { value: n }, n)));
  }
  // Select "+ Atributo" com o que ainda falta na ficha
  function addSelect(label, list, have, onPick) {
    const missing = list.filter((n) => !have.some((x) => U.slug(x) === U.slug(n)));
    if (!missing.length) return null;
    return h('select', { class: 'add-sel', value: '', onchange: (e) => { const v = e.target.value; if (v === '*') onPick(missing); else if (v) onPick([v]); } },
      h('option', { value: '' }, '+ ' + label),
      missing.length > 1 ? h('option', { value: '*' }, 'Todos os que faltam (' + missing.length + ')') : null,
      missing.map((n) => h('option', { value: n }, n)));
  }
  // @variáveis que existem numa ficha: atributos, barras e o máximo das barras
  function knownVars(a, extra = []) {
    const out = (a.stats || []).map((x) => x.name);
    for (const b of a.bars || []) out.push(b.name, U.slug(b.name) + '_max');
    return out.concat(extra);
  }
  // Campo de fórmula solto (teste, iniciativa) com o aviso de erro embaixo
  function formulaInput(label, value, known, onSave, attrs = {}) {
    const prob = App.Dice.check(value, known);
    return h('label', {}, label,
      h('input', Object.assign({ value, class: prob ? 'bad' : '', onchange: (e) => onSave(e.target.value) }, attrs)),
      prob ? h('small', { class: 'f-err' }, prob) : null);
  }
  const editListsBtn = () => (S().gmView() ? h('button', { class: 'btn small ghost', title: 'A lista de atributos e barras fica no painel Mesa', onclick: () => UI.showTab('table') }, ic('settings-2'), 'Editar lista') : null);

  // Aba aberta em cada ficha (Ações por padrão: é o que se usa durante o jogo)
  UI.sheetTab = UI.sheetTab || {};
  const SHEET_TABS = [
    { id: 'acoes', icon: 'swords', label: 'Ações', count: (a) => (a.actions || []).length },
    { id: 'atributos', icon: 'list-ordered', label: 'Atributos', count: (a) => (a.stats || []).length },
    { id: 'notas', icon: 'file-text', label: 'Notas' },
    { id: 'config', icon: 'settings-2', label: 'Configurar' },
  ];

  // Plano 51: ficha de D&D 5e (o desenho é o mesmo da página Criar ficha, js/ficha5e.js)
  const SHEET5E_KEYS = ['name', 'img', 'dnd5e', 'stats', 'bars', 'actions', 'initFormula', 'testFormula', 'darkvision', 'sistema'];
  function buildSheet5e(a) {
    const can = S().ownsActor(a);
    return App.Ficha5e.render(a, {
      ro: !can,
      edit: (fn) => {
        const x = U.clone(a);
        fn(x);
        const patch = {};
        for (const k of SHEET5E_KEYS) if (JSON.stringify(x[k]) !== JSON.stringify(a[k])) patch[k] = x[k];
        if (Object.keys(patch).length) S().dispatch({ type: 'actor.update', id: a.id, patch });
      },
      rerender: () => { const w = UI.windows.get('actor:' + a.id); if (w) renderWindow(w); },
      roll: (label, f) => S().rollPost(f, { from: a.name, label, actor: a, token: selectedTokenOf(a), secret: UI.secret }),
      use: can ? (i) => UI.useAction(a, i) : null,
      avatar: (size) => {
        const av = avatar(a, size);
        av.title = can ? 'Clique para trocar a imagem' : '';
        if (can) av.onclick = async () => { const r = await App.Images.pick(App.Images.TOKEN); if (r) S().dispatch({ type: 'actor.update', id: a.id, patch: { img: r.id } }); };
        return av;
      },
      // Configurar: o mesmo da ficha genérica, sem as barras (na 5e elas saem das contas)
      config: () => {
        const prev = UI.sheetTab[a.id];
        UI.sheetTab[a.id] = 'config';
        const el = buildSheet(a, true);
        UI.sheetTab[a.id] = prev;
        const pane = el.querySelector('.sheet-pane');
        const h4 = [...pane.querySelectorAll('h4')].find((x) => x.textContent === 'Barras');
        if (h4) { let n = h4; while (n && !(n.classList && n.classList.contains('sheet-footer'))) { const nx = n.nextSibling; n.remove(); n = nx; } }
        return pane;
      },
    });
  }

  function buildSheet(a, generic) {
    if (!generic && a.sistema === '5e' && App.Ficha5e) return buildSheet5e(a);
    const gm = S().gmView(), can = S().ownsActor(a), ro = !can;
    const upd = (patch) => S().dispatch({ type: 'actor.update', id: a.id, patch });
    const listUpd = (key, fn) => { const arr = U.clone(a[key] || []); fn(arr); upd({ [key]: arr }); };
    const roll = (formula, label) => S().rollPost(formula, { from: a.name, label, actor: a, token: selectedTokenOf(a), secret: UI.secret });
    const tab = SHEET_TABS.some((t) => t.id === UI.sheetTab[a.id]) ? UI.sheetTab[a.id] : 'acoes';
    const goTab = (id) => { UI.sheetTab[a.id] = id; const w = UI.windows.get('actor:' + a.id); if (w) { w.body.scrollTop = 0; renderWindow(w); } };
    const root = h('div', { class: 'sheet' });

    // ---- Cabeçalho: retrato, nome e barras (sempre à vista) ----
    const av = avatar(a, 64);
    av.title = can ? 'Clique para trocar a imagem' : '';
    if (can) av.onclick = async () => { const r = await App.Images.pick(App.Images.TOKEN); if (r) upd({ img: r.id }); };
    const ownerName = !a.owner ? 'Só o mestre' : a.owner === 'all' ? 'Todos os jogadores' : ((S().state.players[a.owner] || {}).name || 'Jogador');
    const bars = h('div', { class: 'sheet-bars' }, (a.bars || []).map((b, i) => h('div', { class: 'sheet-bar' },
      h('span', { class: 'sb-name' }, b.name),
      h('div', { class: 'sb-meter' }, meter(b, i)),
      h('input', { class: 'num', value: b.value, disabled: ro, title: 'Atual · aceita +5, -3 ou -2d6', onchange: (e) => {
        const v = applyDelta(b.value, e.target.value);
        if (v != null) listUpd('bars', (arr) => { arr[i].value = v; });
      } }),
      h('span', { class: 'sb-max' }, '/ ' + b.max))));
    if (!(a.bars || []).length) bars.append(h('p', { class: 'hint' }, 'Sem barras. Adicione em Configurar.'));
    root.append(h('div', { class: 'sheet-top' },
      h('div', { class: 'sheet-head' }, av, h('div', { class: 'grow' },
        h('input', { class: 'sheet-name', value: a.name, disabled: ro, onchange: (e) => upd({ name: e.target.value.trim() || a.name }) }),
        h('div', { class: 'sheet-sub' }, KIND[a.kind] || '', ' · ', ownerName))),
      bars));

    // ---- Abas ----
    root.append(h('div', { class: 'sheet-tabs', role: 'tablist' }, SHEET_TABS.map((t) => {
      const n = t.count ? t.count(a) : null;
      return h('button', { class: tab === t.id ? 'on' : '', role: 'tab', 'aria-selected': String(tab === t.id), onclick: () => goTab(t.id) },
        ic(t.icon), t.label, n ? h('span', { class: 'sb-count' }, String(n)) : null);
    })));
    const pane = h('div', { class: 'sheet-pane' });
    root.append(pane);

    if (tab === 'acoes') {
      pane.append(h('p', { class: 'hint' }, 'O botão roxo usa a ação: depois clique no alvo no mapa. O lápis edita.'));
      if (!(a.actions || []).length) pane.append(h('p', { class: 'empty' }, 'Nenhuma ação ainda.'));
      (a.actions || []).forEach((ac, i) => pane.append(actionCard(a, ac, i, can, listUpd)));
      if (can) {
        pane.append(btnI('plus', 'Nova ação', { class: 'btn small', onclick: () => {
          UI.openActs.add(a.id + ':' + (a.actions || []).length);
          listUpd('actions', (arr) => arr.push({ name: 'Novo ataque', mode: 'attack', attack: '1d20', defense: 'Defesa', damage: '1d6', bar: (campBars()[0] || 'PV') }));
        } }));
      }
    }

    if (tab === 'atributos') {
      pane.append(h('p', { class: 'hint' }, 'Escolha da lista da campanha. Nas fórmulas o atributo vira @nome (ex.: @forca). O dado ao lado rola o teste.'));
      if (!(a.stats || []).length) pane.append(h('p', { class: 'empty' }, 'Nenhum atributo ainda.'));
      (a.stats || []).forEach((st, i) => {
        pane.append(h('div', { class: 'list-row' },
          nameSelect(campAttrs(), st.name, (v) => listUpd('stats', (arr) => { arr[i].name = v; }), { class: 'grow', disabled: ro }),
          h('span', { class: 'key', title: 'Variável para fórmulas' }, '@' + U.slug(st.name)),
          h('input', { class: 'num', value: st.value, disabled: ro, onchange: (e) => listUpd('stats', (arr) => { arr[i].value = e.target.value; }) }),
          can && iconBtn('dices', 'Rolar teste', () => roll((a.testFormula || '1d20+@valor').replace(/@valor/gi, '(' + (Number(st.value) || 0) + ')'), st.name)),
          can && iconBtn('x', 'Remover', () => listUpd('stats', (arr) => arr.splice(i, 1)))));
      });
      if (can) {
        pane.append(h('div', { class: 'row wrap' },
          addSelect('Atributo', campAttrs(), (a.stats || []).map((x) => x.name), (names) => listUpd('stats', (arr) => { for (const n of names) arr.push({ name: n, value: U.slug(n) === 'defesa' ? 10 : 0 }); })),
          editListsBtn()));
        pane.append(h('h4', {}, 'Rolagens'));
        pane.append(h('div', { class: 'form' },
          formulaInput('Teste de atributo', a.testFormula || '1d20+@valor', knownVars(a, ['valor']), (v) => upd({ testFormula: v }), { title: '@valor = valor do atributo. Ex.: 1d20+@valor, 3d6, 1d100' }),
          formulaInput('Iniciativa', a.initFormula || '1d20', knownVars(a), (v) => upd({ initFormula: v }))));
        pane.append(h('p', { class: 'hint' }, 'No teste, @valor é o número do atributo rolado. Ex.: 1d20+@valor ou 1d100.'));
      }
    }

    if (tab === 'notas') {
      pane.append(h('textarea', { class: 'sheet-notes', rows: 14, disabled: ro, value: a.notes || '', placeholder: 'Histórico, inventário, magias, anotações…', onchange: (e) => upd({ notes: e.target.value }) }));
    }

    if (tab === 'config') {
      const ownerSel = h('select', { disabled: !gm, value: a.owner || '', onchange: (e) => upd({ owner: e.target.value }) },
        h('option', { value: '' }, 'Só o mestre'), h('option', { value: 'all' }, 'Todos os jogadores'),
        Object.entries(S().state.players).map(([pid, p]) => h('option', { value: pid }, p.name)));
      pane.append(h('div', { class: 'form' },
        h('label', {}, 'Tipo', h('select', { disabled: !gm, value: a.kind, onchange: (e) => upd({ kind: e.target.value }) },
          Object.entries(KIND).map(([k, v]) => h('option', { value: k }, v)))),
        h('label', {}, 'Controlado por', ownerSel),
        h('label', {}, 'Tamanho do token', h('select', { disabled: ro, value: String(a.size || 1), onchange: (e) => upd({ size: Number(e.target.value) }) },
          [[0.5, 'Minúsculo (½)'], [1, '1 quadrado'], [2, '2×2'], [3, '3×3'], [4, '4×4'], [6, '6×6']].map(([v, l]) => h('option', { value: String(v) }, l)))),
        h('label', {}, 'Cor', h('input', { type: 'color', disabled: ro, value: U.safeColor(a.color, '#64748b'), onchange: (e) => upd({ color: e.target.value }) })),
        // Plano 26: token pronto (imagem inteira, com a moldura dela) ou retrato recortado em círculo
        h('label', { title: 'Token pronto: a imagem já tem moldura e vai inteira, do tamanho do token. Retrato: recortada em círculo, com o aro do Vésper.' }, 'Imagem no tabuleiro',
          h('select', { disabled: ro, value: a.imgStyle === 'token' ? 'token' : 'portrait', onchange: (e) => upd({ imgStyle: e.target.value === 'token' ? 'token' : null }) },
            h('option', { value: 'portrait' }, 'Retrato (círculo)'), h('option', { value: 'token' }, 'Token pronto (imagem inteira)'))),
        // Cobertura: o mestre decide a altura e como a ficha aparece atrás de muros baixos
        h('label', { title: 'Usada na cobertura: muro mais alto que a criatura = cobertura total' }, 'Altura (' + App.Units.distUnit() + ')',
          h('input', { type: 'number', step: 0.1, min: 0, disabled: !gm, value: a.height ? App.Units.distIn(a.height) : '', placeholder: String(App.Units.distIn(App.Combat.defaultHeight(a.size))).replace('.', ',') + ' (pelo tamanho)',
            onchange: (e) => { const v = App.Units.distOut(e.target.value); upd({ height: v > 0 ? v : null }); } })),
        h('label', {}, 'Atrás de muro baixo', h('select', { disabled: !gm, value: a.coverShow || '', onchange: (e) => upd({ coverShow: e.target.value || null }) },
          h('option', { value: '' }, 'Regra da cena'), h('option', { value: 'show' }, 'Sempre visível'), h('option', { value: 'silhouette' }, 'Vulto'), h('option', { value: 'hide' }, 'Escondido')))));
      if (can) pane.append(h('div', { class: 'row wrap', style: { marginTop: '10px' } },
        btnI('image', a.img ? 'Trocar imagem' : 'Escolher imagem', { class: 'btn small', onclick: async () => { const r = await App.Images.pick(App.Images.TOKEN); if (r) upd({ img: r.id }); } }),
        a.img ? h('button', { class: 'btn small', onclick: () => upd({ img: null }) }, 'Remover imagem') : null));
      pane.append(h('p', { class: 'hint' }, a.kind === 'pc'
        ? 'Personagem: todos os tokens compartilham os mesmos valores das barras.'
        : 'NPC e criatura: cada token criado no mapa ganha uma cópia própria das barras (PV separado).'));
      // Bestiário (Plano 24): PV rolado por token e visão no escuro que o token herda
      if (gm && a.kind !== 'pc') pane.append(h('div', { class: 'form', style: { marginTop: '8px' } },
        h('label', { title: 'Ex.: 3d6 ou 6d8+6. Vazio = todos com o PV da ficha' }, 'Dados de vida', h('input', { value: a.hpDice || '', placeholder: 'ex.: 2d8+2', onchange: (e) => upd({ hpDice: e.target.value.trim() || null }) })),
        h('label', { class: 'check-row', style: { flexDirection: 'row', alignItems: 'center', gap: '6px', marginTop: '18px' } },
          h('input', { type: 'checkbox', checked: !!a.rollHp, disabled: !a.hpDice, onchange: (e) => upd({ rollHp: e.target.checked }) }), 'Rolar PV de cada token'),
        h('label', { title: 'Os tokens novos desta ficha já nascem com essa visão no escuro' }, 'Visão no escuro (quad.)', h('input', { type: 'number', min: 0, value: a.darkvision || 0, onchange: (e) => upd({ darkvision: Number(e.target.value) || 0 }) }))));

      pane.append(h('h4', {}, 'Barras'));
      (a.bars || []).forEach((b, i) => {
        pane.append(h('div', { class: 'list-row' },
          nameSelect(campBars(), b.name, (v) => listUpd('bars', (arr) => { arr[i].name = v; }), { class: 'grow', disabled: ro }),
          h('span', { class: 'muted small-text' }, 'máx.'),
          h('input', { class: 'num', type: 'number', value: b.max, disabled: ro, title: 'Máximo', onchange: (e) => listUpd('bars', (arr) => { arr[i].max = Number(e.target.value) || 0; }) }),
          can && iconBtn('x', 'Remover', () => listUpd('bars', (arr) => arr.splice(i, 1)))));
      });
      if (can) pane.append(h('div', { class: 'row wrap' },
        addSelect('Barra', campBars(), (a.bars || []).map((x) => x.name), (names) => listUpd('bars', (arr) => { for (const n of names) arr.push({ name: n, value: 10, max: 10 }); })),
        editListsBtn()));

      pane.append(h('div', { class: 'sheet-footer' },
        can && btnI('map-pin', 'Colocar no mapa', { onclick: () => App.Board.placeActor(a.id) }),
        gm && btnI('copy-plus', 'Duplicar', { onclick: () => {
          const c = U.clone(a); c.id = U.uid('ac_'); c.name = a.name + ' (cópia)';
          S().dispatch({ type: 'actor.add', actor: c }); UI.openActor(c.id);
        } }),
        btnI('download', 'Exportar', { onclick: () => App.Storage.downloadJSON(App.Storage.actorBundle(a.id), 'ficha_' + a.name) }),
        gm && btnI('book-open', a.mineId && App.Bestiary.mine[a.mineId] ? 'Atualizar no meu bestiário' : 'Salvar no meu bestiário', { title: 'Guarda esta ficha para usar em qualquer campanha', onclick: async () => {
          await App.Bestiary.load();
          const id = await App.Bestiary.saveMine(a, a.img ? S().assets[a.img] : null);
          if (a.mineId !== id) upd({ mineId: id });
          U.toast('Salva no meu bestiário.');
        } }),
        h('span', { class: 'grow' }),
        gm && btnI('trash-2', 'Excluir', { class: 'btn danger', onclick: () => {
          const n = Object.values(S().state.scenes).reduce((k, sc) => k + Object.values(sc.tokens).filter((t) => t.actorId === a.id).length, 0);
          if (!confirm(`Excluir a ficha "${a.name}"` + (n ? ` e ${n === 1 ? 'o token dela' : 'os ' + n + ' tokens dela'} no mapa? Eles também saem do combate.` : '?'))) return;
          S().dispatch({ type: 'actor.delete', id: a.id, tokens: true }); UI.closeWindow('actor:' + a.id);
        } })));
    }
    return root;
  }

  // =============== Ações automáticas ===============
  const MODES = { attack: 'Ataque (rolagem contra defesa)', save: 'Resistência (alvo rola contra CD)', damage: 'Dano direto', heal: 'Cura', roll: 'Só rolar (sem alvo)' };
  const MODE_ICON = { attack: 'sword', save: 'shield', damage: 'zap', heal: 'heart-pulse', roll: 'dices' };
  UI.MODE_ICON = MODE_ICON;
  const isMulti = (ac) => (ac.multi != null ? !!ac.multi : ac.mode === 'save' || ac.mode === 'damage');

  // Alcance e área, em texto curto
  function reachText(ac) {
    if (!ac.mode || ac.mode === 'roll') return '';
    const CB = App.Combat, ar = CB.areaOf(ac);
    return CB.rangeLabel(ac) + (ar ? ` · área ${ar} quad.` : '');
  }
  UI.reachText = reachText;
  function actionSummary(ac) {
    const r = reachText(ac);
    return actionSummaryCore(ac) + (r ? ' · ' + r : '');
  }
  function actionSummaryCore(ac) {
    switch (ac.mode) {
      case 'attack': return `${ac.attack || '1d20'} vs ${ac.defense || 'Defesa'} → ${ac.damage || '—'} ${ac.bar || ''}`;
      case 'save': return `CD ${ac.dc || '10'} ${ac.save || ''} → ${ac.damage || '—'} (${ac.onSave === 'none' ? 'nada' : 'metade'} se passar)`;
      case 'damage': return `${ac.damage || '0'} de ${ac.bar || 'dano'}${isMulti(ac) ? ' · área' : ''}`;
      case 'heal': return `+${ac.damage || '0'} ${ac.bar || ''}`;
      default: return ac.formula || '';
    }
  }

  function actionCard(a, ac, i, can, listUpd) {
    const key = a.id + ':' + i, open = UI.openActs.has(key), mode = ac.mode || 'roll';
    const toggle = () => { if (open) UI.openActs.delete(key); else UI.openActs.add(key); const w = UI.windows.get('actor:' + a.id); if (w) renderWindow(w); };
    const set = (k) => (e) => listUpd('actions', (arr) => { arr[i][k] = e.target.value; });
    const field = (label, k, ph, attrs = {}) => h('label', {}, label,
      h('input', Object.assign({ value: ac[k] ?? '', placeholder: ph || '', disabled: !can, onchange: set(k) }, attrs)));
    // Fórmula com um seletor que soma um @atributo da ficha
    const formula = (label, k, ph, cls) => {
      const inp = h('input', { value: ac[k] ?? '', placeholder: ph || '', disabled: !can, onchange: set(k) });
      const names = (a.stats || []).map((x) => x.name).filter((n) => U.slug(n));
      const ins = can && names.length ? h('select', { class: 'attr-ins', value: '', title: 'Somar um atributo da ficha na fórmula', onchange: (e) => {
        const v = e.target.value; if (!v) return;
        const cur = inp.value.trim();
        listUpd('actions', (arr) => { arr[i][k] = cur ? cur + '+@' + v : '1d20+@' + v; });
      } }, h('option', { value: '' }, '+ atributo'), names.map((n) => h('option', { value: U.slug(n) }, n))) : null;
      const prob = App.Dice.check(ac[k], knownVars(a));
      if (prob) inp.classList.add('bad');
      return h('label', { class: cls || '' }, label, h('div', { class: 'formula-row' }, inp, ins), prob ? h('small', { class: 'f-err' }, prob) : null);
    };
    const pick = (label, k, list, def) => h('label', {}, label,
      nameSelect(list, ac[k] || def, (v) => listUpd('actions', (arr) => { arr[i][k] = v; }), { disabled: !can }));

    const card = h('div', { class: 'act-card ' + mode }, h('div', { class: 'act-head' },
      can && h('button', { class: 'btn small primary act-use', title: mode === 'roll' ? 'Rolar' : 'Usar: depois clique no alvo', onclick: () => UI.useAction(a, i) }, ic(mode === 'roll' ? 'dices' : 'play')),
      h('div', { class: 'grow', style: { cursor: 'pointer' }, onclick: toggle },
        h('div', { class: 'act-name' }, ic(MODE_ICON[mode]), ac.name, Number(ac.cost) > 0 ? h('span', { class: 'badge' }, `${ac.cost} ${ac.costBar || ''}`) : null),
        h('div', { class: 'act-sum' }, actionSummary(Object.assign({}, ac, { mode })))),
      iconBtn(open ? 'chevron-up' : 'pen-line', open ? 'Fechar edição' : 'Editar', toggle, { class: 'icon-btn act-edit' }),
      can && iconBtn('x', 'Remover', () => listUpd('actions', (arr) => arr.splice(i, 1)))));
    if (!open) return card;

    const form = h('div', { class: 'form act-form' },
      field('Nome', 'name'),
      h('label', {}, 'Tipo', h('select', { value: mode, disabled: !can, onchange: set('mode') }, Object.entries(MODES).map(([k, v]) => h('option', { value: k }, v)))));
    if (mode === 'roll') {
      form.append(formula('Fórmula (separe várias com |)', 'formula', 'Ataque: 1d20+@forca | Dano: 1d8+@forca', 'full'));
    } else if (mode === 'attack') {
      form.append(formula('Rolagem de ataque', 'attack', '1d20+@forca'), pick('Contra o atributo do alvo', 'defense', campAttrs(), 'Defesa'),
        formula('Dano', 'damage', '1d8+@forca'), field('Crítico a partir do d20 natural', 'critMin', '20', { type: 'number', min: 2, max: 20 }));
    } else if (mode === 'save') {
      form.append(pick('Alvo resiste com o atributo', 'save', campAttrs(), 'Destreza'), formula('Dificuldade (CD)', 'dc', '13 ou 8+@inteligencia'),
        formula('Dano', 'damage', '8d6'),
        h('label', {}, 'Se o alvo passar', h('select', { value: ac.onSave || 'half', disabled: !can, onchange: set('onSave') },
          h('option', { value: 'half' }, 'Metade do dano'), h('option', { value: 'none' }, 'Nenhum dano'))));
    } else {
      form.append(formula(mode === 'heal' ? 'Cura' : 'Dano', 'damage', mode === 'heal' ? '2d4+2' : '3d4+3'));
    }
    if (mode !== 'roll') {
      const CB = App.Combat;
      form.append(field('Alcance (quadrados)', 'range', CB.defaultRange(Object.assign({}, ac, { mode })) + ' · 1 = corpo a corpo · 0 = sem limite', { type: 'number', min: 0 }));
      if (mode !== 'attack') form.append(field('Área (raio em quadrados)', 'area', '0 = escolhe o alvo', { type: 'number', min: 0 }));
      form.append(
        pick('Barra afetada no alvo', 'bar', campBars(), 'PV'),
        h('label', {}, 'Alvos', h('select', { value: String(isMulti(ac)), disabled: !can, onchange: (e) => listUpd('actions', (arr) => { arr[i].multi = e.target.value === 'true'; }) },
          h('option', { value: 'false' }, 'Um alvo'), h('option', { value: 'true' }, 'Vários (área)'))),
        field('Custo (0 = nenhum)', 'cost', '0', { type: 'number', min: 0 }),
        pick('Gasta da barra', 'costBar', campBars(), 'Mana'));
    }
    card.append(form);
    return card;
  }

  function actorToken(a, sc) {
    if (!sc) return null;
    const sel = App.Board.selected && sc.tokens[App.Board.selected];
    if (sel && sel.actorId === a.id) return sel;
    return Object.values(sc.tokens).find((t) => t.actorId === a.id) || null;
  }

  // Usar uma ação: rolagem simples vai direto ao chat; as outras pedem o alvo no mapa
  UI.useAction = function (a, i, tok) {
    const ac = (a.actions || [])[i];
    if (!ac) return;
    const sc = S().currentScene(), mode = ac.mode || 'roll';
    tok = tok || actorToken(a, sc);
    if (mode === 'roll') {
      S().rollPost(ac.formula || '1d20', { from: tok ? tok.name : a.name, label: ac.name, actor: a, token: tok, secret: UI.secret });
      return;
    }
    if (!sc) { U.toast('Nenhuma cena aberta.'); return; }
    if (tok && sc.tokens[tok.id] !== tok) tok = sc.tokens[tok.id] || null;
    const st = S().state, c = st.combat;
    if (tok && !S().gmView() && st.rules.actOnTurn && c.active) {
      const idx = c.entries.findIndex((e) => e.tokenId === tok.id);
      if (idx >= 0 && idx !== c.turn) { U.toast('Aguarde a sua vez para agir.'); return; }
    }
    const area = App.Combat.areaOf(ac);
    App.Board.startTargeting({
      label: ac.name, mode, act: ac, area, multi: !area && isMulti(ac), sourceId: tok ? tok.id : null,
      onDone: (ids, point) => S().dispatch({ type: 'act.use', sceneId: sc.id, actorId: a.id, index: i, attackerId: tok ? tok.id : null, targets: ids, point }),
    });
  };

  UI.renderTargetBar = function () {
    const bar = $('#target-bar'), tg = App.Board.targeting;
    if (!bar) return;
    if (!tg) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = '';
    const reach = tg.act ? reachText(tg.act) : '';
    const hasSrc = !!tg.sourceId;
    const none = hasSrc && !tg.area && !App.Board.validTargetCount();
    bar.classList.toggle('none', none);
    let msg;
    if (tg.area) {
      msg = h('span', {}, 'Escolha onde lançar ', h('b', {}, tg.label), reach ? h('span', { class: 'muted' }, ' · ' + reach) : '');
    } else if (none) {
      msg = h('span', {}, h('b', {}, tg.label), ': ninguém ao alcance', h('span', { class: 'muted' }, ` (${reach}). Aproxime-se do alvo.`));
    } else {
      msg = h('span', {}, tg.mode === 'heal' ? 'Quem recebe ' : 'Quem você ataca com ', h('b', {}, tg.label), '?',
        h('span', { class: 'muted' }, (reach ? ' · ' + reach : '') + (tg.multi ? ` · ${tg.ids.length} marcado${tg.ids.length === 1 ? '' : 's'}` : '')));
    }
    bar.append(
      ic(tg.mode === 'heal' ? 'heart-pulse' : tg.area ? 'flame' : 'target'),
      msg,
      tg.multi ? h('button', { class: 'btn small primary', disabled: !tg.ids.length, onclick: () => App.Board.confirmTargeting() }, 'Confirmar', h('kbd', {}, 'Enter')) : '',
      h('button', { class: 'btn small', onclick: () => App.Board.cancelTargeting() }, 'Cancelar', h('kbd', {}, 'Esc')));
  };

  function actionMsgHtml(m) {
    const gm = S().gmView(), st = S().state, rules = st.rules || {}, sc = st.scenes[m.sceneId];
    const canSee = (tid) => {
      if (gm || !rules.hideNumbers) return true;
      const t = sc && sc.tokens[tid];
      return !!t && S().canControl(t);
    };
    const tag = (cls, txt) => `<span class="tag ${cls}">${txt}</span>`;
    const heal = m.mode === 'heal';
    let html = `<div class="act-title">${icHtml(MODE_ICON[m.mode] || 'dices')}${U.esc(m.label)}${m.cost ? ` <span class="badge">−${U.esc(m.cost.amount)} ${U.esc(m.cost.bar)}</span>` : ''}</div>`;
    if (m.mode === 'save') html += `<div class="act-line">CD <b>${U.esc(m.dc)}</b>${m.saveStat ? ' · ' + U.esc(m.saveStat) : ''}${m.dmg ? ` · dano ${U.esc(m.dmg.total)}` : ''}</div>`;
    else if (m.dmg) html += `<div class="act-line">${heal ? 'Cura' : 'Dano'} <b>${U.esc(m.dmg.total)}</b> <span class="roll-detail">${U.esc(m.dmg.formula)} → ${cleanDetail(m.dmg.detail)}</span></div>`;
    for (const r of m.targets || []) {
      const see = canSee(r.tokenId);
      let who = U.esc(seenName(r.name, r.masked)), sub = '', extra = '', amt = '';
      if (m.mode === 'attack') {
        who += r.hit ? (r.crit ? tag('crit', 'Crítico') : tag('hit', 'Acertou')) : (r.fumble ? tag('miss', 'Falha crítica') : tag('miss', 'Errou'));
        sub = `Ataque <b>${U.esc(r.atk.total)}</b>` + (r.noDef ? ' · alvo sem defesa' : ` contra ${see ? U.esc(r.def) : '?'}`);
        if (r.cover) sub += r.cover.level === 'total' ? ' · <b>cobertura total</b>' : ` (${U.esc(r.cover.label.toLowerCase())} +${U.esc(r.cover.bonus)})`;
        extra += `<div class="roll-detail">${U.esc(r.atk.formula)} → ${cleanDetail(r.atk.detail)}</div>`;
        if (r.dmg) extra += `<div class="roll-detail">dano ${U.esc(r.dmg.formula)} → ${cleanDetail(r.dmg.detail)}</div>`;
      } else if (m.mode === 'save') {
        who += r.success ? tag('hit', 'Passou') : tag('miss', 'Falhou');
        sub = `Resistiu com <b>${U.esc(r.save.total)}</b>`;
        if (r.cover) sub += r.cover.level === 'total' ? ' · <b>cobertura total</b>, sem dano' : ` (${U.esc(r.cover.label.toLowerCase())} +${U.esc(r.cover.bonus)})`;
        extra += `<div class="roll-detail">${U.esc(r.save.formula)} → ${cleanDetail(r.save.detail)}</div>`;
      }
      if (r.amount != null) {
        const zero = !Number(r.amount);
        amt = `<div class="amt ${zero ? 'zero' : heal ? 'heal' : 'dmg'}">${heal ? '+' : '−'}${U.esc(r.amount)}<small>${U.esc(r.bar)}${see ? ` ${U.esc(r.after)}${r.max ? '/' + U.esc(r.max) : ''}` : ''}</small></div>`;
      } else if (m.mode === 'attack' && !r.hit) amt = '<div class="amt zero">—<small>sem dano</small></div>';
      if (r.noBar) sub += ` · alvo sem a barra "${U.esc(r.noBar)}"`;
      if (r.dmgNote) sub += ` · <b>${U.esc(r.dmgNote)}</b>`;
      html += `<div class="act-target"><div class="who">${who}</div>${amt}${sub ? `<div class="sub">${sub}</div>` : ''}${extra}</div>`;
    }
    if (m.undone) html += '<div class="act-foot"><span class="undone-note">Desfeito pelo mestre</span></div>';
    else if (gm && (m.applied || []).length) html += `<div class="act-foot"><button class="undo-btn" data-undo="${U.esc(m.id)}">${icHtml('undo-2')}Desfazer</button></div>`;
    return html;
  }

  // Resumo curto de uma ação (cartão que aparece sobre o mapa; o detalhe fica no chat)
  function compactActionHtml(m) {
    const heal = m.mode === 'heal';
    let rows = '';
    for (const r of m.targets || []) {
      let tag = '', amt = '';
      if (m.mode === 'attack') tag = r.hit ? (r.crit ? '<span class="tag crit">Crítico</span>' : '<span class="tag hit">Acertou</span>') : `<span class="tag miss">${r.fumble ? 'Falha crítica' : 'Errou'}</span>`;
      else if (m.mode === 'save') tag = r.success ? '<span class="tag miss">Resistiu</span>' : '<span class="tag hit">Falhou</span>';
      if (r.amount != null) amt = `<span class="amt ${!Number(r.amount) ? 'zero' : heal ? 'heal' : 'dmg'}">${heal ? '+' : '−'}${U.esc(r.amount)}<small>${U.esc(r.bar)}</small></span>`;
      else if (m.mode === 'attack' && !r.hit) amt = '<span class="amt zero">—</span>';
      rows += `<div class="cmp-row"><span class="who">${U.esc(seenName(r.name, r.masked))}</span>${tag}<span class="grow"></span>${amt}</div>`;
    }
    const undo = m.undone ? '<span class="undone-note">Desfeito</span>'
      : S().gmView() && (m.applied || []).length ? `<button class="undo-btn" data-undo="${U.esc(m.id)}" title="Devolve PV e Mana">${icHtml('undo-2')}Desfazer</button>` : '';
    return `<div class="msg act compact m-${U.esc(m.mode || 'roll')}${m.undone ? ' undone' : ''}" title="Clique para ver os dados no chat">
      <div class="cmp-head">${icHtml(MODE_ICON[m.mode] || 'dices')}<b>${U.esc(seenName(m.from, m.fromMasked))}</b><span class="muted">${U.esc(m.label)}</span>${m.cost ? ` <span class="badge">−${U.esc(m.cost.amount)} ${U.esc(m.cost.bar)}</span>` : ''}<span class="grow"></span>${undo}</div>${rows}</div>`;
  }

  function meter(b, i) {
    const pct = b.max > 0 ? U.clamp((Number(b.value) / Number(b.max)) * 100, 0, 100) : 0;
    const color = i > 0 ? 'var(--mana)' : pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--warn)' : 'var(--danger)';
    return h('div', { class: 'meter' }, h('div', { style: { width: pct + '%', background: color } }));
  }

  function selectedTokenOf(a) {
    const sc = S().currentScene(), t = sc && App.Board.selected && sc.tokens[App.Board.selected];
    return t && t.actorId === a.id ? t : null;
  }

  // "+5", "-3", "-2d6" somam; "12" define
  function applyDelta(cur, str) {
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
    return rel ? (Number(cur) || 0) + val : val;
  }

  // =============== Painel do token selecionado ===============
  // Modo edição: fica na lateral direita. Modo apresentação: flutua ao lado do token.
  UI.updateHud = function (sc, t) {
    const hud = $('#token-hud'), empty = $('#props-empty');
    if (!hud) return;
    // Plano 28: flutuando sobre o mapa, o painel só abre pelo menu do botão direito (clique esquerdo só seleciona e move)
    if (hudFloats() && UI.hudFor !== UI.selKey()) {
      if (!hud.hidden) { hud.hidden = true; hud._sig = null; }
      if (empty) empty.hidden = false;
      return;
    }
    const csc = S().currentScene(), B = App.Board;
    if (S().gmView() && B.multi && B.multi.size && csc) { multiHud(hud, empty, csc); return; }
    const note = S().gmView() && B.selectedNote && csc && (csc.notes || []).find((x) => x.id === B.selectedNote);
    if (note) { noteHud(hud, empty, csc, note); return; }
    if (B.selectedNote && !note) B.selectedNote = null;
    const trg = S().gmView() && B.selectedTrigger && csc && (csc.triggers || []).find((x) => x.id === B.selectedTrigger);
    if (trg) { (trg.portal ? portalHud : triggerHud)(hud, empty, csc, trg); return; }
    if (B.selectedTrigger && !trg) B.selectedTrigger = null;
    const door = S().gmView() && B.selectedDoor && csc && (csc.walls || []).find((x) => x.id === B.selectedDoor && x.door);
    if (door) { doorHud(hud, empty, csc, door); return; }
    if (B.selectedDoor && !door) B.selectedDoor = null;
    const lpt = S().gmView() && B.selectedLight && csc && (csc.lights || []).find((x) => x.id === B.selectedLight);
    if (lpt) { lightHud(hud, empty, csc, lpt); return; }
    if (B.selectedLight && !lpt) B.selectedLight = null;
    const snd = S().gmView() && B.selectedSound && csc && (csc.sounds || []).find((x) => x.id === B.selectedSound);
    if (snd) { soundHud(hud, empty, csc, snd); return; }
    const prop = S().gmView() && B.selectedProp && csc && (csc.props || []).find((x) => x.id === B.selectedProp);
    if (prop) { propHud(hud, empty, csc, prop); return; }
    if (B.selectedProp && !prop) B.selectedProp = null;
    const room = S().gmView() && B.selectedRoom && csc && (csc.rooms || []).find((x) => x.id === B.selectedRoom);
    if (room) { roomHud(hud, empty, csc, room); return; }
    if (B.selectedRoom && !room) B.selectedRoom = null;
    if (B.selectedSound && !snd) B.selectedSound = null;
    // Na visão de jogo o painel sai da frente enquanto você mira e enquanto o resultado aparece no mapa
    if (!sc || !t || (UI.mode === 'play' && (App.Board.targeting || App.Board.fx.length))) {
      if (!hud.hidden) { hud.hidden = true; hud._sig = null; }
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    const a = S().actorOf(t), st = S().state;
    const sig = JSON.stringify([t, a && a.bars, a && a.name, a && a.actions, st.conditions, st.combat.entries.length, S().gmView(), UI.mode, sc.light.enabled,
      sc.groups, t.group && Object.values(sc.tokens).filter((x) => x.group === t.group).map((x) => [x.hidden, x.masked])]);
    if (hud._sig !== sig && !isTyping(hud)) { buildHud(hud, sc, t); hud._sig = sig; }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    const r = App.Board.tokenScreenRect(t, sc);
    const W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight;
    const hw = hud.offsetWidth, hh = hud.offsetHeight;
    const y = U.clamp(r.y - 10, 66, Math.max(66, H - hh - 70));
    // Abre do lado (direita ou esquerda) que cobre menos tokens
    const others = Object.values(sc.tokens).filter((o) => o.id !== t.id && (!o.hidden || S().gmView())).map((o) => App.Board.tokenScreenRect(o, sc));
    const cover = (x) => others.reduce((s, o) => s + Math.max(0, Math.min(x + hw, o.x + o.w) - Math.max(x, o.x)) * Math.max(0, Math.min(y + hh, o.y + o.h) - Math.max(y, o.y)), 0);
    const fit = (x) => U.clamp(x, 14, Math.max(14, W - hw - 14));
    const right = fit(r.x + r.w + 16), left = fit(r.x - hw - 16);
    const x = cover(left) < cover(right) ? left : right;
    hud.style.transform = `translate(${x}px, ${y}px)`;
  };

  // Botões de nível: imagens e tokens dividem a mesma ordem (quem está por cima de quem)
  function orderBtns(sc, kind, id) {
    const go = (dir) => { S().dispatch({ type: 'order.move', sceneId: sc.id, kind, id, dir }); App.Board.requestRender(); };
    return h('div', { class: 'order-row' }, h('span', { class: 'eyebrow grow' }, 'Nível'),
      iconBtn('bring-to-front', 'Trazer para frente (por cima de tudo)', () => go('front')),
      iconBtn('chevron-up', 'Subir um nível', () => go('up')),
      iconBtn('chevron-down', 'Descer um nível', () => go('down')),
      iconBtn('send-to-back', 'Mandar para trás (por baixo de tudo)', () => go('back')));
  }
  UI.orderBtns = orderBtns;

  // =============== Animação e grupos de objetos (Plano 21) ===============
  const tfield = (label, ...kids) => h('label', { class: 'ta-field' }, h('span', {}, label), ...kids);
  const r2 = (v) => Math.round(v * 2) / 2;
  // Campo "Grupo de objetos": nome livre; o gatilho pode mirar o grupo inteiro
  function tagField(sc, o, onSet) {
    const id = 'tags-' + o.id;
    return h('label', { class: 'ta-field tag-field', title: 'Objetos com o mesmo nome de grupo obedecem juntos a um gatilho (ex.: acender todas as tochas do salão)' },
      h('span', {}, 'Grupo de objetos'),
      h('input', { list: id, value: o.tag || '', placeholder: 'ex.: tochas do salão', onchange: (e) => onSet(e.target.value.trim().slice(0, 40)) }),
      h('datalist', { id }, App.Triggers.allTags(sc).map((t) => h('option', { value: t }))));
  }
  /*
   * Editor de um movimento (spec). o = {sc, spec, set(patch | fn), kinds: ['prop'|'light'|'token'…], ref: {kind, obj} | null, pick(kind, cb, onEnd, opts)}
   */
  function animEditor(o) {
    const A = App.Anim, s = o.spec || A.newSpec('move'), set = o.set, g = o.sc.grid;
    const kinds = (o.kinds && o.kinds.length ? o.kinds : ['prop']).filter((k) => A.KINDS[k]);
    let list = A.KINDS[kinds[0] || 'prop'];
    for (const k of kinds.slice(1)) list = list.filter(([v]) => A.KINDS[k].some(([w]) => w === v));
    if (!list.some(([v]) => v === s.kind)) list = list.concat([[s.kind, A.KIND_NAME[s.kind] || s.kind]]);
    const presets = A.PRESETS.filter((p) => kinds.every((k) => p.for.includes(k)));
    const num = (label, key, attrs = {}) => tfield(label, h('input', Object.assign({ type: 'number', class: 'num', value: s[key] ?? '', onchange: (e) => {
      const v = String(e.target.value).trim().replace(',', '.');
      set({ [key]: v === '' ? null : Number(v) || 0 });
    } }, attrs)));
    const sel = (value, opts, onchange) => h('select', { value: value == null ? '' : String(value), onchange: (e) => onchange(e.target.value) }, opts.map(([v, l]) => h('option', { value: v }, l)));
    const center = o.ref ? App.Board.animCenter(o.sc, o.ref.kind, o.ref.obj) : null;
    const out = [];
    if (presets.length) out.push(h('select', { class: 'anim-preset', value: '', onchange: (e) => { const p = presets.find((x) => x.id === e.target.value); if (p) set(Object.assign({ from: null, end: 'stay', n: 0 }, U.clone(p.spec))); } },
      h('option', { value: '' }, 'Usar um modelo…'), presets.map((p) => h('option', { value: p.id }, p.label))));
    out.push(tfield('Movimento', sel(s.kind, list, (v) => set({ kind: v }))));
    const grid = [];
    if (s.kind === 'move') {
      grid.push(num('Para a direita (quad.)', 'dx', { step: 0.5, title: 'Negativo = para a esquerda' }), num('Para baixo (quad.)', 'dy', { step: 0.5, title: 'Negativo = para cima' }));
    } else if (s.kind === 'rotate') {
      grid.push(num('Graus', 'deg', { step: 15, title: '360 com "Repetir sem parar" = gira sem parar; 120 com "Ir e voltar" = holofote varrendo' }));
    } else if (s.kind === 'fade') {
      grid.push(num('De (%)', 'from', { min: 0, max: 100, step: 10, placeholder: 'como está', title: 'Vazio = começa como o objeto está agora' }), num('Até (%)', 'to', { min: 0, max: 100, step: 10 }));
    } else if (s.kind === 'scale') {
      grid.push(num('Até (% do tamanho)', 'to', { min: 5, step: 10 }));
    }
    grid.push(num('Duração (s)', 'dur', { min: 0.1, step: 0.1, title: 'Tempo de uma ida' }));
    out.push(h('div', { class: 'ta-grid' }, grid));
    if (s.kind === 'move' && center && o.pick) {
      out.push(h('div', { class: 'row' }, h('span', { class: 'grow muted small-text' }, 'Ou clique no destino:'),
        btnI('map-pin', 'Destino no mapa', { class: 'btn small', onclick: () => o.pick('point', (pt) => set({ dx: r2((pt.x - center.x) / g), dy: r2((pt.y - center.y) / g) })) })));
    }
    if (s.kind === 'path') {
      const n = (s.pts || []).length;
      out.push(h('div', { class: 'row' }, h('span', { class: 'grow ta-target' + (n ? '' : ' none') }, n ? n + (n === 1 ? ' ponto' : ' pontos') + ' de passagem' : 'Marque os pontos da ronda'),
        center && o.pick ? btnI('map-pin', 'Marcar no mapa', { class: 'btn small', title: 'Clique nos pontos em ordem; Enter ou Concluir termina', onclick: () => {
          let first = true;
          o.pick('point', (pt) => {
            const q = [r2((pt.x - center.x) / g), r2((pt.y - center.y) / g)];
            set((sp) => { if (first) sp.pts = []; first = false; sp.pts = (sp.pts || []).concat([q]); });
          }, null, { multi: true, bar: 'Clique nos pontos da ronda, em ordem. Enter ou Concluir termina.' });
        } }) : ''));
    }
    if (s.kind === 'color') out.push(tfield('Cor de destino', h('input', { type: 'color', value: U.safeColor(s.color, '#ff5040'), onchange: (e) => set({ color: e.target.value }) })));
    out.push(tfield('Curva', sel(s.ease || 'smooth', A.EASES, (v) => set({ ease: v }))));
    out.push(h('div', { class: 'seg anim-rep' }, A.REPEATS.map(([k, l]) => h('button', { class: (s.repeat || 'once') === k ? 'on' : '', onclick: () => set({ repeat: k }) }, l))));
    if (s.repeat === 'pingpong') out.push(h('div', { class: 'row' }, h('span', { class: 'muted small-text grow' }, 'Quantas idas e voltas (0 = sem parar)'),
      h('input', { type: 'number', class: 'num', min: 0, value: s.n || 0, onchange: (e) => set({ n: Math.max(0, Math.round(Number(e.target.value) || 0)) }) })));
    if ((s.repeat || 'once') === 'once') out.push(h('div', { class: 'row' }, h('span', { class: 'muted small-text grow' }, 'No fim'),
      h('div', { class: 'seg' }, [['stay', 'Fica onde chegou'], ['back', 'Volta ao início']].map(([k, l]) => h('button', { class: (s.end || 'stay') === k ? 'on' : '', onclick: () => set({ end: k }) }, l)))));
    return out;
  }
  // ---------- Editor de animação em janela (Plano 27) ----------
  // ctx = {mode: 'own', sceneId, kind: 'prop'|'light', id}  → a animação do próprio objeto (anim.steps)
  //     | {mode: 'trig', sceneId, trigId, actId}            → o movimento de uma ação Animar ("Animação nova")
  UI.animWin = null;
  function animWinData() {
    const aw = UI.animWin;
    if (!aw) return null;
    const A = App.Anim, c = aw.ctx, sc = S().state && S().state.scenes[c.sceneId];
    if (!sc) return null;
    if (c.mode === 'own') {
      const key = A.keyOf(c.kind, c.id), obj = A.get(sc, key);
      if (!obj) return null;
      const an = obj.anim || { steps: [], auto: false };
      const type = { prop: 'prop.update', light: 'lightpt.update' }[c.kind];
      return {
        sc, keys: [key], kinds: [c.kind], ref: { kind: c.kind, obj }, specs: an.steps || [], auto: !!an.auto, many: true,
        title: (c.kind === 'prop' ? 'Imagem' : 'Luz') + (obj.name ? ' · ' + obj.name : ''),
        save: (fn) => { const o2 = A.get(S().state.scenes[sc.id], key); if (!o2) return; const a2 = U.clone(o2.anim || { steps: [], auto: false }); a2.steps = a2.steps || []; fn(a2.steps, a2); S().dispatch({ type, sceneId: sc.id, id: c.id, patch: { anim: a2 } }); },
      };
    }
    const tr = (sc.triggers || []).find((x) => x.id === c.trigId), act = tr && (tr.actions || []).find((x) => x.id === c.actId);
    if (!act) return null;
    const tl = App.Triggers.targets(sc, act).filter((x) => ['prop', 'light', 'token'].includes(x.kind));
    const kinds = [...new Set(tl.map((x) => x.kind))];
    return {
      sc, keys: tl.map((x) => A.keyOf(x.kind, x.obj.id)), kinds: kinds.length ? kinds : ['prop'], ref: tl[0] ? { kind: tl[0].kind, obj: tl[0].obj } : null,
      specs: act.spec ? [act.spec] : [], auto: false, many: false, title: 'Gatilho' + (tr.name ? ' · ' + tr.name : '') + ' · Animar',
      save: (fn) => {
        const t2 = (S().state.scenes[sc.id].triggers || []).find((x) => x.id === tr.id);
        if (!t2) return;
        const list = U.clone(t2.actions || []), x = list.find((q) => q.id === act.id);
        if (!x) return;
        const arr = [x.spec || App.Anim.newSpec('move')];
        fn(arr, null);
        x.spec = arr[0];
        S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch: { actions: list } });
      },
    };
  }
  UI.animWinTargets = function () {
    const d = animWinData();
    if (!d) return [];
    return d.keys.map((key) => { const [kind, id] = key.split(':'); const obj = App.Anim.get(d.sc, key); return obj ? { kind, obj, specs: d.specs } : null; }).filter(Boolean);
  };
  UI.openAnimEditor = function (ctx, selId) {
    UI.closeWindow('anim-editor');
    UI.animWin = { ctx, sel: selId || null, sig: null };
    const w = UI.openWindow('anim-editor', 'Animação', (win) => buildAnimWin(win), { w: Math.min(800, window.innerWidth - 24), icon: 'move' });
    w.el.classList.add('anim-win');
    App.Board.requestRender();
    return w;
  };
  function buildAnimWin(win) {
    const A = App.Anim, d = animWinData(), aw = UI.animWin;
    if (!d || !aw) return false;
    if (!d.specs.some((s) => s.id === aw.sel)) aw.sel = d.specs[0] ? d.specs[0].id : null;
    const running = d.keys.some((k) => A.running(d.sc, k).length);
    const sig = JSON.stringify([d.specs, d.auto, aw.sel, running, d.keys, d.sc.grid]);
    if (sig === aw.sig && win.body.firstChild) return null;
    aw.sig = sig;
    win.titleEl.textContent = 'Animação · ' + d.title;
    const s = d.specs.find((x) => x.id === aw.sel) || null;
    const setStep = (p) => d.save((steps) => { const st = s && steps.find((x) => x.id === s.id); if (!st) return; if (typeof p === 'function') p(st); else Object.assign(st, p); });
    // Esconde a janela enquanto escolhe no mapa
    const pick = (kind, cb, onEnd, opts = {}) => { win.el.style.visibility = 'hidden'; hudPick(kind, cb, () => { win.el.style.visibility = ''; if (onEnd) onEnd(); }, opts); };
    const REP = { once: 'uma vez', pingpong: 'vai e volta', loop: 'sem parar' };
    const KIND_IC = { rotate: 'rotate-cw', fade: 'eye', path: 'map-pin', scale: 'sliders-horizontal', color: 'sun', move: 'move' };

    const head = h('div', { class: 'aw-head' },
      btnI('play', 'Tocar para todos', { class: 'btn small primary', disabled: !d.specs.length || !d.keys.length, title: 'Os jogadores veem agora', onclick: () => A.play(d.sc.id, d.keys, d.many ? null : d.specs) }),
      btnI('pause', 'Parar', { class: 'btn small', disabled: !d.keys.length, onclick: () => A.stop(d.sc.id, d.keys, 'stop') }),
      btnI('undo-2', 'Voltar ao início', { class: 'btn small', disabled: !d.keys.length, onclick: () => A.stop(d.sc.id, d.keys, 'reset') }),
      btnI('eye', 'Prévia só para mim', { class: 'btn small', disabled: !d.specs.length || !d.keys.length, title: 'Roda só na sua tela, os jogadores não veem', onclick: () => A.preview(d.sc.id, d.keys, d.many ? null : d.specs) }),
      h('span', { class: 'grow' }),
      d.many && d.specs.length ? h('label', { class: 'switch-row aw-auto' }, h('input', { type: 'checkbox', checked: d.auto, onchange: (e) => A.setAuto(d.sc.id, d.keys[0], e.target.checked) }), 'Começa sozinha com a cena') : null,
      running ? h('span', { class: 'badge blue' }, 'Rodando') : null);

    const list = h('div', { class: 'aw-list' },
      h('div', { class: 'eyebrow' }, d.many ? 'Movimentos (acontecem juntos)' : 'Movimento desta ação'),
      d.specs.map((x, i) => h('div', { class: 'aw-step' + (x.id === aw.sel ? ' on' : ''), role: 'button', tabindex: 0, onclick: () => { aw.sel = x.id; aw.sig = null; renderWindow(win); App.Board.requestRender(); } },
        ic(KIND_IC[x.kind] || 'move'),
        h('span', { class: 'grow' }, h('b', {}, A.KIND_NAME[x.kind] || x.kind), h('small', {}, String(x.dur || 1).replace('.', ',') + ' s · ' + (REP[x.repeat] || 'uma vez'))),
        d.many ? iconBtn('copy-plus', 'Duplicar', (e) => { e.stopPropagation(); d.save((steps) => { const c = U.clone(steps[i]); c.id = U.uid('am_'); steps.splice(i + 1, 0, c); aw.sel = c.id; }); }) : null,
        d.many ? iconBtn('trash-2', 'Tirar este movimento', (e) => { e.stopPropagation(); d.save((steps, an) => { steps.splice(i, 1); if (!steps.length && an) an.auto = false; }); }) : null)),
      !d.specs.length ? h('p', { class: 'hint' }, 'Nenhum movimento ainda.') : null,
      d.many || !d.specs.length ? btnI('plus', 'Movimento', { class: 'btn small', onclick: () => d.save((steps) => { const ns = A.newSpec(d.kinds[0] === 'light' ? 'rotate' : 'move'); steps.push(ns); aw.sel = ns.id; }) }) : null,
      !d.keys.length ? h('p', { class: 'hint' }, 'Escolha o alvo da ação no cartão do gatilho para ver a prévia.') : null);

    const form = h('div', { class: 'aw-form' });
    if (s) {
      const kinds = d.kinds.filter((k) => A.KINDS[k]);
      let opts = A.KINDS[kinds[0] || 'prop'];
      for (const k of kinds.slice(1)) opts = opts.filter(([v]) => A.KINDS[k].some(([w2]) => w2 === v));
      if (!opts.some(([v]) => v === s.kind)) opts = opts.concat([[s.kind, A.KIND_NAME[s.kind] || s.kind]]);
      const presets = A.PRESETS.filter((p) => kinds.every((k) => p.for.includes(k)));
      const g = d.sc.grid, center = d.ref ? App.Board.animCenter(d.sc, d.ref.kind, d.ref.obj) : null;
      // Barra deslizante + número: arrastar mostra o valor; soltar salva
      const slider = (label, key, min, max, step, unit, attrs = {}) => {
        const cur = s[key] == null ? '' : s[key];
        const num = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: String(cur).replace('.', ','), placeholder: attrs.placeholder || '', 'data-aw': key, onchange: (e) => { const v = String(e.target.value).trim().replace(',', '.'); setStep({ [key]: v === '' ? null : Number(v) || 0 }); } });
        const rng = h('input', { type: 'range', min, max, step, value: cur === '' ? (attrs.rest ?? min) : cur, 'data-aw-range': key,
          oninput: (e) => { num.value = String(e.target.value).replace('.', ','); }, onchange: (e) => setStep({ [key]: Number(e.target.value) }) });
        return h('label', { class: 'aw-slider', title: attrs.title || '' }, h('span', {}, label), rng, h('span', { class: 'aw-num' }, num, h('small', {}, unit)));
      };
      const seg = (value, pairs, onPick) => h('div', { class: 'seg' }, pairs.map(([k, l]) => h('button', { class: value === k ? 'on' : '', onclick: () => onPick(k) }, l)));
      form.append(h('div', { class: 'aw-row' }, h('label', { class: 'aw-field' }, h('span', {}, 'Movimento'),
        h('select', { value: s.kind, onchange: (e) => setStep({ kind: e.target.value }) }, opts.map(([v, l]) => h('option', { value: v }, l))))));
      if (presets.length) form.append(h('div', { class: 'aw-presets' }, h('span', { class: 'eyebrow' }, 'Modelos'),
        presets.map((p) => h('button', { class: 'btn small', title: 'Troca este movimento pelo modelo', onclick: () => setStep(Object.assign({ from: null, end: 'stay', n: 0 }, U.clone(p.spec))) }, p.label))));
      if (s.kind === 'move') {
        form.append(slider('Para a direita', 'dx', -20, 20, 0.5, 'quad.', { title: 'Negativo = para a esquerda', rest: 0 }), slider('Para baixo', 'dy', -20, 20, 0.5, 'quad.', { title: 'Negativo = para cima', rest: 0 }));
        if (center) form.append(h('div', { class: 'aw-row' }, btnI('map-pin', 'Clicar o destino no mapa', { class: 'btn small', onclick: () => pick('point', (pt) => setStep({ dx: r2((pt.x - center.x) / g), dy: r2((pt.y - center.y) / g) })) })));
      } else if (s.kind === 'rotate') {
        form.append(slider('Girar', 'deg', -720, 720, 15, 'graus', { title: '360 com Repetir sem parar = gira sem parar; 120 com Ir e voltar = holofote varrendo', rest: 0 }));
      } else if (s.kind === 'fade') {
        form.append(slider('De', 'from', 0, 100, 5, '%', { placeholder: 'como está', title: 'Vazio = começa como o objeto está agora', rest: 100 }), slider('Até', 'to', 0, 100, 5, '%'));
      } else if (s.kind === 'scale') {
        form.append(slider('Até', 'to', 5, 400, 5, '% do tamanho', { rest: 100 }));
      } else if (s.kind === 'color') {
        form.append(h('label', { class: 'aw-field' }, h('span', {}, 'Cor de destino'), h('input', { type: 'color', value: U.safeColor(s.color, '#ff5040'), onchange: (e) => setStep({ color: e.target.value }) })));
      } else if (s.kind === 'path') {
        const n = (s.pts || []).length;
        form.append(h('div', { class: 'aw-row' }, h('span', { class: 'grow ta-target' + (n ? '' : ' none') }, n ? n + (n === 1 ? ' ponto' : ' pontos') + ' de passagem' : 'Marque os pontos da ronda'),
          center ? btnI('map-pin', 'Marcar no mapa', { class: 'btn small', title: 'Clique nos pontos em ordem; Enter ou Concluir termina', onclick: () => {
            let first = true;
            pick('point', (pt) => { const q = [r2((pt.x - center.x) / g), r2((pt.y - center.y) / g)]; setStep((sp) => { if (first) sp.pts = []; first = false; sp.pts = (sp.pts || []).concat([q]); }); }, null,
              { multi: true, bar: 'Clique nos pontos da ronda, em ordem. Enter ou Concluir termina.' });
          } }) : ''));
      }
      form.append(slider('Duração', 'dur', 0.1, 30, 0.1, 's', { title: 'Tempo de uma ida' }));
      // Curva com o desenho dela
      const ease = s.ease || 'smooth', fn = A.EASE[ease] || A.EASE.smooth;
      let dpath = '';
      for (let i = 0; i <= 24; i++) { const u = i / 24; dpath += (i ? 'L' : 'M') + (4 + u * 72).toFixed(1) + ' ' + (44 - fn(u) * 40).toFixed(1); }
      const curve = h('div', { class: 'aw-curve', html: '<svg viewBox="0 0 80 48" width="96" height="58"><rect x="4" y="4" width="72" height="40" rx="3" fill="none" stroke="currentColor" opacity=".18"/><path d="' + dpath + '" fill="none" stroke="#5fd0c4" stroke-width="2.2" stroke-linecap="round"/></svg>' });
      form.append(h('div', { class: 'aw-row' }, h('label', { class: 'aw-field grow' }, h('span', {}, 'Curva'), seg(ease, A.EASES.map(([k, l]) => [k, l.replace(/ (.*)/, '')]), (v) => setStep({ ease: v }))), curve));
      form.append(h('div', { class: 'aw-row' }, h('label', { class: 'aw-field grow' }, h('span', {}, 'Repetir'), seg(s.repeat || 'once', A.REPEATS, (v) => setStep({ repeat: v })))));
      if (s.repeat === 'pingpong') form.append(slider('Idas e voltas', 'n', 0, 20, 1, '(0 = sem parar)'));
      if ((s.repeat || 'once') === 'once') form.append(h('div', { class: 'aw-row' }, h('label', { class: 'aw-field grow' }, h('span', {}, 'No fim'), seg(s.end || 'stay', [['stay', 'Fica onde chegou'], ['back', 'Volta ao início']], (v) => setStep({ end: v })))));
      form.append(h('p', { class: 'hint' }, 'O caminho e o destino aparecem no mapa enquanto esta janela está aberta.'));
    } else form.append(h('div', { class: 'empty-state' }, h('div', { class: 'bubble' }, ic('move')), h('b', {}, 'Nenhum movimento'), h('p', {}, 'Use + Movimento para começar.')));
    return h('div', { class: 'aw' }, head, h('div', { class: 'aw-body' }, list, form));
  }

  // Pick para os painéis (sem janela para esconder)
  function hudPick(kind, cb, onEnd, opts = {}) {
    if (opts.bar) pickBar(opts.bar);
    App.Board.pick(kind, cb, () => { if (opts.bar) pickBar(null); if (onEnd) onEnd(); }, opts);
  }
  // Seção "Animação" do painel da imagem e da luz: os movimentos do próprio objeto
  UI.animEdit = null;
  function ownAnimSection(sc, kind, o) {
    const A = App.Anim, key = A.keyOf(kind, o.id), type = { prop: 'prop.update', light: 'lightpt.update' }[kind];
    const cur = () => { const s2 = S().state.scenes[sc.id]; return s2 && A.get(s2, key); };
    const save = (fn) => { const ob = cur(); if (!ob) return; const an = U.clone(ob.anim || { steps: [], auto: false }); an.steps = an.steps || []; fn(an); S().dispatch({ type, sceneId: sc.id, id: o.id, patch: { anim: an } }); };
    const an = o.anim || { steps: [], auto: false }, steps = an.steps || [];
    const running = A.running(sc, key).length > 0;
    const REP = { once: 'uma vez', pingpong: 'vai e volta', loop: 'sem parar' };
    const rows = steps.map((s, i) => {
      const open = UI.animEdit === s.id;
      return h('div', { class: 'anim-step' + (open ? ' open' : '') },
        h('div', { class: 'row' }, ic(s.kind === 'rotate' ? 'rotate-cw' : s.kind === 'fade' ? 'eye' : s.kind === 'path' ? 'map-pin' : 'move'),
          h('span', { class: 'grow' }, (A.KIND_NAME[s.kind] || s.kind) + ' · ' + String(s.dur || 1).replace('.', ',') + ' s · ' + (REP[s.repeat] || 'uma vez')),
          iconBtn(open ? 'chevron-up' : 'pencil', open ? 'Fechar' : 'Editar', () => { UI.animEdit = open ? null : s.id; UI.refresh(); App.Board.requestRender(); }),
          iconBtn('trash-2', 'Tirar este movimento', () => save((a2) => { a2.steps.splice(i, 1); if (!a2.steps.length) a2.auto = false; }))),
        open ? h('div', { class: 'anim-box' }, animEditor({ sc, spec: s, kinds: [kind], ref: { kind, obj: o }, pick: hudPick,
          set: (p) => save((a2) => { const st2 = a2.steps.find((x) => x.id === s.id); if (!st2) return; if (typeof p === 'function') p(st2); else Object.assign(st2, p); }) })) : null);
    });
    return h('div', { class: 'hud-section anim-sec' },
      h('span', { class: 'eyebrow' }, 'Animação'),
      rows.length ? rows : h('p', { class: 'hint', style: { margin: 0 } }, kind === 'prop' ? 'Faça a imagem se mexer: lâmina indo e voltando, pedra rolando, porta de grade descendo.' : 'Faça a luz se mexer: holofote varrendo, farol girando, tocha pulsando.'),
      h('div', { class: 'row wrap' },
        btnI('sliders-horizontal', 'Abrir editor', { class: 'btn small primary', title: 'Editor grande, com barras e prévia', onclick: () => UI.openAnimEditor({ mode: 'own', sceneId: sc.id, kind, id: o.id }, UI.animEdit) }),
        btnI('plus', 'Adicionar movimento', { class: 'btn small', onclick: () => save((a2) => { const ns = A.newSpec(kind === 'light' ? 'rotate' : 'move'); a2.steps.push(ns); UI.animEdit = ns.id; }) })),
      steps.length ? h('label', { class: 'switch-row' }, h('span', { class: 'grow' }, 'Começa sozinha com a cena'), h('input', { type: 'checkbox', checked: !!an.auto, onchange: (e) => A.setAuto(sc.id, key, e.target.checked) })) : '',
      steps.length ? h('div', { class: 'hud-btns' },
        btnI('play', 'Tocar', { title: 'Toca para todos agora', onclick: () => A.play(sc.id, [key], null) }),
        btnI('pause', 'Parar', { title: 'Para onde está', onclick: () => A.stop(sc.id, [key], 'stop') }),
        iconBtn('undo-2', 'Voltar ao início', () => A.stop(sc.id, [key], 'reset'))) : '',
      steps.length ? h('p', { class: 'hint', style: { margin: 0 } }, (running || an.auto ? 'Rodando agora. ' : '') + 'Num gatilho: ação Animar → "Tocar a animação do objeto".') : '');
  }
  // Seção "Machuca quem tocar" (área de dano da imagem)
  function hurtSection(sc, p) {
    const hz = p.hurt, on = !!(hz && hz.on), st2 = S().state;
    const upd = (patch) => S().dispatch({ type: 'prop.update', sceneId: sc.id, id: p.id, patch: { hurt: Object.assign({}, p.hurt || App.Anim.newHurt(), patch) } });
    const sel = (value, opts, onchange) => h('select', { value: value == null ? '' : String(value), onchange: (e) => onchange(e.target.value) }, opts.map(([v, l]) => h('option', { value: v }, l)));
    return h('div', { class: 'hud-section hurt-sec' },
      h('label', { class: 'switch-row' }, h('span', { class: 'grow' }, 'Machuca quem tocar'), h('input', { type: 'checkbox', checked: on, onchange: (e) => upd({ on: e.target.checked }) })),
      on ? [
        btnI('scan', 'Ajustar a área no mapa', { class: 'btn small', title: 'Arraste no mapa a parte da imagem que machuca (a lâmina, não o cabo)', onclick: () => App.Board.editHurt(sc, p.id) }),
        h('div', { class: 'seg' }, [['moving', 'Só em movimento'], ['always', 'Sempre']].map(([k, l]) => h('button', { class: (hz.when || 'moving') === k ? 'on' : '', onclick: () => upd({ when: k }) }, l))),
        h('div', { class: 'ta-grid' },
          tfield('Quem', sel(hz.who || 'any', [['any', 'Qualquer token'], ['party', 'Personagens do grupo'], ['foes', 'Criaturas']], (v) => upd({ who: v }))),
          tfield('Teste', sel(hz.save, [['', 'Sem teste (só dano)']].concat((st2.attrs || []).map((n) => [n, n])), (v) => upd({ save: v }))),
          hz.save ? tfield('CD', h('input', { type: 'number', class: 'num', min: 1, value: hz.dc ?? 13, onchange: (e) => upd({ dc: Number(e.target.value) || 10 }) })) : '',
          tfield('Dano', h('input', { class: 'num', value: hz.damage || '', placeholder: '2d6', onchange: (e) => upd({ damage: e.target.value.trim() || '0' }) })),
          tfield('Barra', sel(hz.bar, [['', (st2.barNames || [])[0] || 'Primeira']].concat((st2.barNames || []).slice(1).map((n) => [n, n])), (v) => upd({ bar: v }))),
          hz.save ? tfield('Se passar', sel(hz.onSave, [['half', 'Metade'], ['none', 'Nada']], (v) => upd({ onSave: v }))) : ''),
        h('p', { class: 'hint', style: { margin: 0 } }, 'A área vermelha no mapa é o que machuca. Cada token leva um golpe por passagem (precisa sair e entrar de novo). Os jogadores não veem a área.'),
      ] : '');
  }

  // Imagem solta no mapa: nome, visibilidade, nível, tamanho, giro, opacidade, travar, espelhar
  function propHud(hud, empty, sc, p) {
    if (empty) empty.hidden = true;
    const sig = JSON.stringify(['prop', p, UI.mode, sc.grid, UI.animEdit, App.Anim.running(sc, 'prop:' + p.id).length, App.Triggers.allTags(sc)]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const upd = (patch) => S().dispatch({ type: 'prop.update', sceneId: sc.id, id: p.id, patch });
      const g = sc.grid, cells = (v) => Math.round((v / g) * 100) / 100;
      const opLbl = h('span', {}, Math.round((p.opacity ?? 1) * 100) + '%');
      // tamanho em quadrados: mudar a largura mantém a proporção; a altura também
      const setSize = (k, v) => {
        const n = Math.max(0.1, Number(String(v).replace(',', '.')) || 0) * g;
        const ratio = p.w / p.h, w = k === 'w' ? n : n * ratio, h2 = k === 'h' ? n : n / ratio;
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        upd({ w: Math.round(w), h: Math.round(h2), x: Math.round(cx - w / 2), y: Math.round(cy - h2 / 2) });
      };
      const thumb = h('div', { class: 'prop-thumb' }, App.Images.src(p.img) ? h('img', { src: App.Images.src(p.img), alt: '' }) : ic('image'));
      hud.append(
        h('div', { class: 'hud-top' }, thumb,
          h('div', { class: 'grow' }, h('input', { class: 'hud-name', value: p.name || '', placeholder: 'Nome da imagem', onchange: (e) => upd({ name: e.target.value.trim() || 'Imagem' }) }),
            h('div', { class: 'hud-sub' }, 'Imagem no mapa' + (p.hidden ? ' · invisível' : '') + (p.locked ? ' · travada' : '')))),
        h('div', { class: 'hud-section vis-sec' },
          h('span', { class: 'eyebrow' }, 'Para os jogadores'),
          h('div', { class: 'seg vis-seg' },
            h('button', { class: p.hidden ? '' : 'on', title: 'Os jogadores veem a imagem', onclick: () => upd({ hidden: false }) }, ic('eye'), 'Visível'),
            h('button', { class: p.hidden ? 'on' : '', title: 'Só você vê (ótimo para armadilhas)', onclick: () => upd({ hidden: true }) }, ic('eye-off'), 'Invisível')),
          orderBtns(sc, 'prop', p.id),
          h('div', { class: 'prop-grid' },
            h('label', {}, 'Largura', h('input', { type: 'number', class: 'num', min: 0.1, step: 0.5, value: cells(p.w), onchange: (e) => setSize('w', e.target.value) })),
            h('label', {}, 'Altura', h('input', { type: 'number', class: 'num', min: 0.1, step: 0.5, value: cells(p.h), onchange: (e) => setSize('h', e.target.value) })),
            h('label', {}, 'Giro (°)', h('input', { type: 'number', class: 'num', step: 15, value: p.rot || 0, onchange: (e) => upd({ rot: ((Math.round(Number(e.target.value) || 0) % 360) + 360) % 360 }) }))),
          h('p', { class: 'hint', style: { margin: 0 } }, 'Largura e altura em quadrados (mudar uma mantém a proporção).'),
          h('div', { class: 'snd-row' }, h('span', {}, 'Opacidade'), opLbl),
          h('input', { type: 'range', min: 0.1, max: 1, step: 0.05, value: p.opacity ?? 1, oninput: (e) => { opLbl.textContent = Math.round(e.target.value * 100) + '%'; }, onchange: (e) => { upd({ opacity: Number(e.target.value) }); e.target.blur(); } }),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p.locked, onchange: (e) => upd({ locked: e.target.checked }) }), 'Travar (não move sem querer)'),
          tagField(sc, p, (v) => upd({ tag: v }))),
        ownAnimSection(sc, 'prop', p),
        hurtSection(sc, p),
        h('div', { class: 'hud-btns' },
          btnI('flip-horizontal-2', 'Espelhar', { onclick: () => upd({ flip: !p.flip }) }),
          btnI('copy-plus', 'Duplicar', { title: 'Duplicar (Ctrl+D)', onclick: () => App.Board.duplicateProp(sc, p.id) }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', title: 'Apagar (Delete)', onclick: () => { S().dispatch({ type: 'prop.delete', sceneId: sc.id, id: p.id }); App.Board.selectedProp = null; App.Board.requestRender(); } })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    // Flutuando: ao lado da imagem (como a luz), sem cobrir a imagem nem as ferramentas
    const a = App.Board.toScreen(p.x, p.y), b = App.Board.toScreen(p.x + p.w, p.y + p.h);
    const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y);
    const W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight, hw = hud.offsetWidth;
    const x = U.clamp(right + 30 + hw > W - 14 ? left - hw - 30 : right + 30, 14, Math.max(14, W - hw - 14));
    hud.style.transform = `translate(${x}px, ${U.clamp(top, 66, Math.max(66, H - hud.offsetHeight - 70))}px)`;
  }

  // Direção em 8 botões (0° = direita, 90° = baixo, como no mapa)
  const DIRS = [[270, '↑'], [315, '↗'], [0, '→'], [45, '↘'], [90, '↓'], [135, '↙'], [180, '←'], [225, '↖']];
  function dirSeg(cur, onPick) {
    const c = ((Math.round(Number(cur) || 0) % 360) + 360) % 360;
    return h('div', { class: 'seg dir-seg' }, DIRS.map(([d, l]) => h('button', { class: c === d ? 'on' : '', title: d + '°', onclick: () => onPick(d) }, l)));
  }
  function colorRow(cur, onPick) {
    return h('div', { class: 'light-colors' },
      App.Light.COLORS.map(([c, l]) => h('button', { class: 'swatch' + (String(cur).toLowerCase() === c ? ' on' : ''), title: l, style: { background: c }, onclick: () => onPick(c) })),
      h('input', { type: 'color', title: 'Outra cor', value: U.safeColor(cur, App.Light.WARM), onchange: (e) => onPick(e.target.value) }));
  }
  const numIn = (v) => Math.max(0, Number(String(v).replace(',', '.')) || 0);

  // Ponto de luz ou de escuridão no mapa: tipo, aceso, forma, alcance, cor, tremular
  function lightHud(hud, empty, sc, o) {
    if (empty) empty.hidden = true;
    const sig = JSON.stringify(['light', o, UI.mode, sc.grid, sc.light.enabled, UI.animEdit, App.Anim.running(sc, 'light:' + o.id).length, App.Triggers.allTags(sc)]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const B = App.Board, LT = App.Light, g = sc.grid;
      const upd = (patch) => S().dispatch({ type: 'lightpt.update', sceneId: sc.id, id: o.id, patch });
      const dark = o.kind === 'dark', on = o.on !== false, shape = o.shape || 'circle';
      const center = () => (shape === 'area' && o.pts ? LT.areaCenter(o.pts) : { x: o.x, y: o.y });
      // Trocar a forma: a área nasce como um quadrado de 4×4 em volta do ponto; o círculo e o cone nascem no centro da área
      const setShape = (k, extra = {}) => {
        if (k === shape) { if (Object.keys(extra).length) upd(extra); return; }
        const c = center();
        if (k === 'area') { const r = 2 * g; upd(Object.assign({ shape: k, pts: [[c.x - r, c.y - r], [c.x + r, c.y - r], [c.x + r, c.y + r], [c.x - r, c.y + r]].map(([x, y]) => [Math.round(x), Math.round(y)]) }, extra)); }
        else upd(Object.assign({ shape: k, x: Math.round(c.x), y: Math.round(c.y) }, extra));
      };
      const SHAPE = { circle: 'círculo', cone: 'cone', area: 'área' };
      const tintLbl = h('span', {}, Math.round((o.tint ?? 0.4) * 100) + '%');
      const field = (label, key, attrs) => h('label', {}, label, h('input', Object.assign({ type: 'number', class: 'num', value: o[key] ?? '', onchange: (e) => upd({ [key]: numIn(e.target.value) }) }, attrs)));
      const nums = shape === 'area'
        ? [field(dark ? 'Penumbra (quad.)' : 'Meia luz em volta', 'edge', { min: 0, step: 0.5, title: 'Faixa em volta da área, em quadrados (0 = sem)' })]
        : [field(dark ? 'Escuridão' : 'Luz plena', 'bright', { min: 0, step: 0.5, title: 'Raio em quadrados' }),
          field(dark ? 'Penumbra até' : 'Meia luz até', 'dim', { min: 0.5, step: 0.5, title: 'Raio total em quadrados' }),
          shape === 'cone' ? field('Abertura (°)', 'angle', { min: 10, max: 340, step: 5 }) : ''];
      hud.append(
        h('div', { class: 'hud-top' },
          h('div', { class: 'snd-bubble light' + (on ? ' on' : ''), style: on ? { background: dark ? '#1b1830' : U.safeColor(o.color, LT.WARM), color: dark ? '#9a8cff' : '#1c1712' } : {} }, ic(!on ? 'lightbulb-off' : dark ? 'moon' : 'lightbulb')),
          h('div', { class: 'grow' }, h('input', { class: 'hud-name', value: o.name || '', placeholder: dark ? 'Escuridão' : 'Nome da luz', onchange: (e) => upd({ name: e.target.value.trim() || (dark ? 'Escuridão' : 'Luz') }) }),
            h('div', { class: 'hud-sub' }, (dark ? 'Escuridão' : 'Luz') + ' no mapa · ' + SHAPE[shape] + (on ? '' : ' · apagada')))),
        h('div', { class: 'hud-section vis-sec' },
          h('div', { class: 'seg vis-seg' },
            h('button', { class: dark ? '' : 'on', onclick: () => upd({ kind: 'light' }) }, ic('lightbulb'), 'Luz'),
            h('button', { class: dark ? 'on' : '', onclick: () => upd({ kind: 'dark' }) }, ic('moon'), 'Escuridão')),
          h('div', { class: 'seg vis-seg' },
            h('button', { class: on ? 'on' : '', title: 'Dois cliques no marcador também acendem e apagam', onclick: () => upd({ on: true }) }, ic('lightbulb'), dark ? 'Ativa' : 'Acesa'),
            h('button', { class: on ? '' : 'on', onclick: () => upd({ on: false }) }, ic('lightbulb-off'), dark ? 'Desligada' : 'Apagada')),
          h('span', { class: 'eyebrow' }, 'Forma'),
          h('div', { class: 'seg vis-seg' }, [['circle', 'circle', 'Círculo'], ['cone', 'cone', 'Cone'], ['area', 'square', 'Área']].map(([k, icon, l]) =>
            h('button', { class: shape === k ? 'on' : '', onclick: () => setShape(k) }, ic(icon), l))),
          dark ? '' : h('select', { value: '', onchange: (e) => {
            const p = LT.POINT_PRESETS.find((x) => x.id === e.target.value);
            if (!p) return;
            const extra = { flicker: !!p.flicker, name: p.label };
            if (p.shape === 'area') Object.assign(extra, { edge: p.edge || 0 });
            else Object.assign(extra, { bright: p.bright, dim: p.dim }, p.angle ? { angle: p.angle } : {});
            setShape(p.shape, extra);
          } }, h('option', { value: '' }, 'Usar um modelo…'), LT.POINT_PRESETS.map((p) => h('option', { value: p.id }, p.label + (p.dim ? ` (${p.bright}/${p.dim})` : '')))),
          h('div', { class: 'prop-grid' }, nums),
          shape === 'cone' ? h('span', { class: 'eyebrow' }, 'Direção') : '',
          shape === 'cone' ? dirSeg(o.dir, (d) => upd({ dir: d })) : '',
          h('p', { class: 'hint', style: { margin: 0 } }, dark
            ? 'No miolo fica escuridão total, e até a borda no máximo meia luz, mesmo de dia ou com tochas. Quem tem visão no escuro enxerga um nível acima. Paredes seguram a escuridão.'
            : shape === 'area'
              ? 'Tudo dentro da área fica em luz plena. As paredes seguram a luz: ela não vaza para o outro lado.'
              : 'Até o raio de luz plena tudo é visto; até a borda fica a meia luz (escurecido). Paredes fazem sombra. Arraste as alças no mapa para mudar o alcance' + (shape === 'cone' ? ' e a direção.' : '.'))),
        dark ? '' : h('div', { class: 'hud-section' },
          h('span', { class: 'eyebrow' }, 'Cor da luz'),
          colorRow(o.color || LT.WARM, (c) => upd({ color: c })),
          h('div', { class: 'snd-row' }, h('span', {}, 'Intensidade da cor'), tintLbl),
          h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.tint ?? 0.4, oninput: (e) => { tintLbl.textContent = Math.round(e.target.value * 100) + '%'; }, onchange: (e) => { upd({ tint: Number(e.target.value) }); e.target.blur(); } }),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!o.flicker, onchange: (e) => upd({ flicker: e.target.checked }) }), 'Tremular (vela, tocha, fogueira)')),
        h('div', { class: 'hud-section' }, tagField(sc, o, (v) => upd({ tag: v }))),
        ownAnimSection(sc, 'light', o),
        sc.light.enabled ? '' : h('div', { class: 'warn-box' }, h('span', {}, 'A iluminação está desligada nesta cena: esta luz não faz efeito.'),
          btnI('lightbulb', 'Ligar iluminação', { class: 'btn small primary', onclick: () => S().dispatch({ type: 'scene.update', id: sc.id, patch: { light: Object.assign({}, sc.light, { enabled: true, global: false }) } }) })),
        h('div', { class: 'hud-btns' },
          btnI('copy-plus', 'Duplicar', { title: 'Duplicar (Ctrl+D)', onclick: () => B.duplicateLight(sc, o.id) }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', title: 'Apagar (Delete)', onclick: () => { S().dispatch({ type: 'lightpt.delete', sceneId: sc.id, id: o.id }); B.selectedLight = null; B.requestRender(); } })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    const c = o.shape === 'area' && o.pts ? App.Light.areaCenter(o.pts) : o, p = App.Board.toScreen(c.x, c.y);
    const W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight;
    const x = U.clamp(p.x + 30 + hud.offsetWidth > W - 14 ? p.x - hud.offsetWidth - 30 : p.x + 30, 14, Math.max(14, W - hud.offsetWidth - 14));
    hud.style.transform = `translate(${x}px, ${U.clamp(p.y - 40, 66, Math.max(66, H - hud.offsetHeight - 70))}px)`;
  }

  // =============== Notas do mestre (Plano 18) ===============
  const NOTE_C = [['gold', 'Sala'], ['red', 'Perigo'], ['green', 'Tesouro'], ['blue', 'NPC']];
  // Janela da nota (arrastável, pode ficar aberta durante a cena)
  UI.openNote = function (sceneId, id, isNew) {
    const B = App.Board;
    B.selectedNote = id;
    const w = UI.openWindow('note:' + id, 'Nota', (win) => {
      const sc = S().state && S().state.scenes[sceneId], n = sc && (sc.notes || []).find((x) => x.id === id);
      if (!n || !S().gmView()) return false;
      const sig = JSON.stringify(n);
      if (win._sig === sig) return null;
      win._sig = sig;
      win.el.classList.add('note-win');
      const upd = (patch) => S().dispatch({ type: 'note.update', sceneId, id, patch });
      const title = h('input', { class: 'note-title', value: n.title || '', placeholder: 'Título (ex.: Sala 3)', onchange: (e) => upd({ title: e.target.value.trim() || 'Nota' }) });
      const root = h('div', { class: 'note-edit' },
        title,
        h('div', { class: 'seg note-colors' }, NOTE_C.map(([k, l]) => h('button', { class: (n.color || 'gold') === k ? 'on' : '', onclick: () => upd({ color: k }) }, h('i', { class: 'note-dot', style: { background: B.NOTE_COLORS[k] } }), l))),
        h('textarea', { class: 'note-text', rows: 8, placeholder: 'O que você precisa lembrar aqui: descrição, tesouro, CD do teste, o que o NPC sabe…', onchange: (e) => upd({ text: e.target.value }) }, n.text || ''),
        h('div', { class: 'hud-btns' },
          btnI('scan', 'Centralizar', { onclick: () => { B.centerOn(n.x, n.y); B.selectedNote = id; B.requestRender(); } }),
          btnI('copy-plus', 'Duplicar', { onclick: () => B.duplicateNote(sc, id) }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', onclick: () => { S().dispatch({ type: 'note.delete', sceneId, id }); B.selectedNote = null; UI.closeWindow('note:' + id); B.requestRender(); } })),
        h('p', { class: 'hint', style: { margin: 0 } }, 'Só você vê esta nota. Os jogadores nem recebem o texto.'));
      if (isNew) setTimeout(() => { title.focus(); title.select(); isNew = false; }, 30);
      return root;
    }, { w: 360, icon: 'file-text' });
    B.requestRender();
    return w;
  };
  function noteHud(hud, empty, sc, n) {
    if (empty) empty.hidden = true;
    const sig = JSON.stringify(['note', n, UI.mode]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const B = App.Board;
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble', style: { background: B.NOTE_COLORS[n.color] || B.NOTE_COLORS.gold, color: '#17130a' } }, ic('file-text')),
          h('div', { class: 'grow' }, h('div', { class: 'hud-name' }, n.title || 'Nota'), h('div', { class: 'hud-sub' }, 'Nota · só você vê'))),
        n.text ? h('p', { class: 'note-preview' }, String(n.text).slice(0, 400)) : h('p', { class: 'hint', style: { margin: 0 } }, 'Sem texto ainda.'),
        h('div', { class: 'hud-btns' },
          btnI('pencil', 'Abrir', { class: 'btn primary', onclick: () => UI.openNote(sc.id, n.id) }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', title: 'Delete', onclick: () => { S().dispatch({ type: 'note.delete', sceneId: sc.id, id: n.id }); B.selectedNote = null; UI.closeWindow('note:' + n.id); B.requestRender(); } })));
    }
    hud.hidden = false;
    hud.style.transform = '';
    if (hudFloats()) { const p = App.Board.toScreen(n.x, n.y); hud.style.transform = `translate(${Math.max(14, p.x + 30)}px, ${Math.max(66, p.y - 40)}px)`; }
  }

  // Seleção múltipla (Plano 20): o que está selecionado e o que dá para fazer com tudo junto
  function multiHud(hud, empty, sc) {
    if (empty) empty.hidden = true;
    const B = App.Board, items = B.multiItems(sc);
    const counts = {};
    for (const it of items) counts[it.kind] = (counts[it.kind] || 0) + 1;
    const PL = { token: 'tokens', prop: 'imagens', light: 'luzes', trigger: 'gatilhos', sound: 'sons', note: 'notas', wall: 'paredes' };
    const parts = Object.entries(counts).map(([k, n]) => n + ' ' + (n === 1 ? B.MKIND[k] : PL[k]));
    const sig = JSON.stringify(['multi', parts, !!B.clipboard, UI.mode]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const dup = () => { const keep = B.clipboard; if (B.copySelection(sc)) { const c = B.clipboard; B.paste(sc, { x: c.ox + sc.grid, y: c.oy + sc.grid }); } B.clipboard = keep; };
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble on' }, ic('mouse-pointer-2')),
          h('div', { class: 'grow' }, h('div', { class: 'hud-name' }, items.length + (items.length === 1 ? ' item selecionado' : ' itens selecionados')),
            h('div', { class: 'hud-sub' }, parts.join(' · ')))),
        h('p', { class: 'hint', style: { margin: 0 } }, 'Arraste qualquer um para mover tudo junto (setas também). Shift + clique soma ou tira; Shift + arrastar no vazio faz o laço. Ctrl+C copia e Ctrl+V cola onde estiver o mouse, em qualquer cena. Esc limpa.'),
        h('div', { class: 'hud-btns' },
          btnI('copy', 'Copiar', { title: 'Ctrl+C', onclick: () => B.copySelection(sc) }),
          btnI('copy-plus', 'Duplicar', { title: 'Ctrl+D', onclick: dup }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', title: 'Delete', onclick: () => B.deleteMulti(sc) })),
        h('div', { class: 'hud-btns' }, btnI('x', 'Limpar seleção', { title: 'Esc', onclick: () => { B.multi.clear(); B.requestRender(); } })));
    }
    hud.hidden = false;
    hud.style.transform = '';
    if (hudFloats()) hud.style.transform = 'translate(14px, 66px)';
  }

  // =============== Gatilhos (Plano 14, janela do Plano 15) ===============
  // Tudo que muda o que o editor mostra (nomes de portas, luzes, tokens, faixas…)
  const nSteps = (o) => ((o.anim && o.anim.steps) || []).length;
  const trigSig = (sc, tr) => JSON.stringify([tr, (sc.walls || []).filter((w) => w.door).map((w) => [w.id, w.tag]), (sc.lights || []).map((o) => [o.id, o.name, o.tag, nSteps(o), o.x, o.y]), sc.groups,
    Object.values(sc.tokens).map((t) => [t.id, t.name]), (sc.props || []).map((p) => [p.id, p.name, p.tag, nSteps(p), p.x, p.y]), (sc.sounds || []).map((s) => [s.id, s.name, s.tag]),
    (sc.triggers || []).map((x) => [x.id, x.name]), App.Audio.files.size, S().state.sceneOrder, S().state.attrs, S().state.barNames, App.Triggers.stateLabel(tr)]);
  const trigStateClass = (st) => (st === 'Pronto' ? 'ready' : st === 'Esperando' ? 'wait' : st === 'Desligado' ? 'off' : 'spent');

  // Painel da direita: só o resumo do gatilho; a configuração abre numa janela
  function triggerHud(hud, empty, sc, tr) {
    if (empty) empty.hidden = true;
    const sig = 'trg-mini' + UI.mode + trigSig(sc, tr);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const TG = App.Triggers, state = TG.stateLabel(tr), n = (tr.actions || []).length;
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble trig' + (state === 'Pronto' ? ' on' : '') }, ic('zap')),
          h('div', { class: 'grow' }, h('div', { class: 'hud-name' }, tr.name || 'Gatilho'),
            h('div', { class: 'hud-sub' }, 'Gatilho · ' + state.toLowerCase() + ' · disparou ' + (tr.used || 0) + (tr.used === 1 ? ' vez' : ' vezes')))),
        h('p', { class: 'trig-sentence' }, TG.sentence(tr), h('b', {}, ' → ' + (n ? n + (n === 1 ? ' ação' : ' ações') : 'nenhuma ação'))),
        n ? h('ol', { class: 'trig-mini' }, tr.actions.map((a) => { const s = TG.summary(sc, a); return h('li', { class: s.missing ? 'missing' : '' }, ic(TG.ICON[a.type]), h('span', {}, s.target + (s.op ? ' · ' + s.op : ''))); })) : '',
        h('div', { class: 'hud-btns' },
          btnI('settings-2', 'Configurar', { class: 'btn primary grow', onclick: () => UI.openTrigger(sc.id, tr.id) }),
          btnI('play', 'Testar', { title: 'Simula no mapa (nada muda de verdade)', onclick: () => App.Triggers.simulate(sc.id, tr.id) })),
        h('div', { class: 'hud-btns' },
          btnI('zap', 'Disparar agora', { title: 'Faz tudo de verdade agora, mesmo gasto', onclick: () => App.Triggers.fire(sc.id, tr.id, null, { manual: true }) }),
          iconBtn('refresh-cw', 'Rearmar', () => S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch: { used: 0, lastAt: 0 } })),
          h('span', { class: 'grow' }),
          iconBtn('trash-2', 'Apagar (Delete)', () => { S().dispatch({ type: 'trigger.delete', sceneId: sc.id, id: tr.id }); App.Board.selectedTrigger = null; UI.closeWindow('trigger:' + tr.id); App.Board.requestRender(); })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    const c = App.Triggers.center(tr), p = App.Board.toScreen(c.x, c.y), W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight;
    const x = U.clamp(p.x + 30 + hud.offsetWidth > W - 14 ? p.x - hud.offsetWidth - 30 : p.x + 30, 14, Math.max(14, W - hud.offsetWidth - 14));
    hud.style.transform = `translate(${x}px, ${U.clamp(p.y - 40, 66, Math.max(66, H - hud.offsetHeight - 70))}px)`;
  }

  // Portal (Plano 31): para onde leva, ida e volta, quem passa, ligado
  // Destinos: este mapa, as sub-cenas da mesma família e as outras cenas
  UI.portalTargets = function (sc) {
    const st = S().state, fam = sc.parent || sc.id, out = [['', 'Neste mapa']];
    const order = st.sceneOrder.filter((id) => st.scenes[id] && id !== sc.id);
    const same = order.filter((id) => id === fam || st.scenes[id].parent === fam), rest = order.filter((id) => !same.includes(id));
    for (const id of same) out.push([id, st.scenes[id].name + (st.scenes[id].parent ? ' (sub-cena)' : ' (principal)')]);
    for (const id of rest) out.push([id, 'Cena: ' + st.scenes[id].name]);
    return out;
  };
  // Plano 41: ligar este portal a outro (clicando nele, nesta cena ou em outra). Pergunta antes de desfazer uma ligação antiga
  UI.portalScene = {}; // cena escolhida em "Cena do outro portal", por portal
  UI.portalLink = function (sc, tr, destId) {
    const st = S().state, TG = App.Triggers, dest = st.scenes[destId];
    if (!dest) return;
    if (!(dest.triggers || []).some((x) => x.portal && x.id !== tr.id)) { U.toast('Não há outro portal em "' + dest.name + '". Desenhe o outro portal lá primeiro.', 'error'); return; }
    App.Board.pickPortal(destId, tr.id, (o) => UI.linkPortals(sc.id, tr.id, destId, o.id), { trigger: tr.id });
  };
  UI.linkPortals = function (sceneA, idA, sceneB, idB) {
    const st = S().state, TG = App.Triggers, scA = st.scenes[sceneA], scB = st.scenes[sceneB];
    const A = scA && (scA.triggers || []).find((x) => x.id === idA), Bp = scB && (scB.triggers || []).find((x) => x.id === idB);
    if (!A || !Bp) return false;
    const name = (t) => '"' + (t.name || 'Portal') + '"';
    const pa = TG.portalPartner(scA, A);
    if (pa && !(pa.scene.id === sceneB && pa.tr.id === idB) && !confirm(name(A) + ' já está ligado a ' + name(pa.tr) + '. Desfazer a ligação anterior?')) return false;
    const pb = TG.portalPartner(scB, Bp);
    if (pb && !(pb.scene.id === sceneA && pb.tr.id === idA) && !confirm(name(Bp) + ' já está ligado a ' + name(pb.tr) + '. Desfazer a ligação anterior?')) return false;
    if (pa) TG.disconnectPortal(sceneA, idA);
    if (pb && !(pb.scene.id === sceneA && pb.tr.id === idA)) TG.disconnectPortal(sceneB, idB);
    TG.connectPortals(sceneA, idA, sceneB, idB, true);
    U.toast(name(A) + ' ligado a ' + name(Bp) + (sceneA !== sceneB ? ' (' + scB.name + ')' : '') + ', ida e volta.');
    return true;
  };
  function portalHud(hud, empty, sc, tr) {
    if (empty) empty.hidden = true;
    const TG = App.Triggers, st = S().state, act = TG.portalAct(tr) || {}, d = TG.portalDest(sc, tr), partner = TG.portalPartner(sc, tr);
    const sig = JSON.stringify(['portal', UI.mode, tr, partner && partner.tr, TG.portalTwoWay(sc, tr), UI.portalScene[tr.id], d && d.area, st.sceneOrder.map((id) => [id, st.scenes[id].name, st.scenes[id].parent]), tr.mark && tr.mark.img && !!App.Images.src(tr.mark.img)]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const B = App.Board, on = tr.enabled !== false;
      const upd = (patch) => S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch });
      const far = d && d.scene.id !== sc.id;
      const cellTxt = (x, y) => { const g = d.scene.grid; return '(' + (Math.floor(x / g) + 1) + ', ' + (Math.floor(y / g) + 1) + ')'; };
      // Plano 35: a chegada é uma área desenhada; cada um cai num quadrado livre sorteado dentro dela
      const nCells = d && d.area ? TG.areaCells(d.scene, d.area) : 0;
      void nCells; void cellTxt;
      // marcador para os jogadores
      const mk = TG.newMark(tr.mark || {});
      // Plano 41: cada portal tem o seu marcador
      const setMark = (patch) => upd({ mark: Object.assign({}, mk, patch) });
      const iconBtns = TG.MARK_ICONS.map(([k, icn, l]) => h('button', { class: 'mk-icon' + (mk.icon === k ? ' on' : ''), title: l, onclick: () => setMark({ icon: k }) }, ic(icn)))
        .concat([h('button', { class: 'mk-icon' + (mk.icon === 'img' ? ' on' : ''), title: 'Enviar uma imagem do computador', onclick: async () => {
          const file = await U.pickFile('image/*');
          if (!file) return;
          const im = await App.Images.add(file, 256);
          if (im) setMark({ icon: 'img', img: im.id });
        } }, mk.icon === 'img' && mk.img && App.Images.src(mk.img) ? h('img', { src: App.Images.src(mk.img), alt: '' }) : ic('upload'))]);
      const markBox = h('div', { class: 'hud-section' },
        h('span', { class: 'eyebrow' }, 'Para os jogadores'),
        h('label', { class: 'check', title: 'Pontilhado brilhante e um ícone no mapa. Cada jogador só vê o que o token dele enxerga' }, h('input', { type: 'checkbox', checked: !!mk.show, onchange: (e) => setMark({ show: e.target.checked }, true) }), 'Mostrar aos jogadores'),
        mk.show ? h('div', { class: 'seg' }, [['area', 'Área'], ['line', 'Linha']].map(([k, l]) => h('button', { class: mk.style === k ? 'on' : '', title: k === 'area' ? 'O pontilhado preenche a borda da área inteira' : 'Você desenha onde fica a linha (ex.: na soleira da porta)', onclick: () => { if (k === 'line' && !mk.line) B.drawMarkLine((line) => setMark({ style: 'line', line })); else setMark({ style: k }); } }, l))) : '',
        mk.show && mk.style === 'line' ? h('div', { class: 'row' }, h('span', { class: 'grow hint', style: { margin: 0 } }, mk.line ? 'Linha desenhada.' : 'Desenhe a linha.'), btnI('pen-line', mk.line ? 'Desenhar de novo' : 'Desenhar a linha', { class: 'btn small', onclick: () => B.drawMarkLine((line) => setMark({ style: 'line', line })) })) : '',
        mk.show ? h('div', { class: 'mk-icons' }, iconBtns) : '',
        mk.show ? h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'hint grow', style: { margin: 0 } }, 'Cor'), h('input', { type: 'color', value: U.safeColor(mk.color, '#38bdf8'), onchange: (e) => setMark({ color: e.target.value }) })) : '',
        mk.show ? h('input', { class: 'hud-input', value: mk.label || '', placeholder: 'Nome para os jogadores (opcional, ex.: Andar de baixo)', maxlength: 40, onchange: (e) => setMark({ label: e.target.value.trim() }) }) : '',
        mk.show ? h('p', { class: 'hint', style: { margin: 0 } }, 'O nome aparece quando o jogador passa o mouse no ícone. Cada um só vê o marcador onde o token dele enxerga.') : '');
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble portal' + (on ? ' on' : '') }, ic('sparkles')),
          h('div', { class: 'grow' }, h('input', { class: 'hud-name', value: tr.name || '', placeholder: 'Nome', onchange: (e) => upd({ name: e.target.value.trim() || 'Portal' }) }),
            h('div', { class: 'hud-sub' }, 'Portal · ' + (on ? (far ? 'leva para outra cena' : 'leva para este mapa') : 'desligado')))),
        portalLinkBox(sc, tr, partner),
        h('div', { class: 'hud-section' },
          h('span', { class: 'eyebrow' }, 'Quem passa'),
          h('select', { value: tr.who || 'any', onchange: (e) => upd({ who: e.target.value }) }, TG.WHO.filter(([k]) => k !== 'pick').map(([k, l]) => h('option', { value: k }, l))),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on, onchange: (e) => upd({ enabled: e.target.checked }) }), 'Ligado (desligue para bloquear a passagem)'),
          h('label', { class: 'check', title: 'Brilho azul na saída e na chegada, para todos que veem' }, h('input', { type: 'checkbox', checked: tr.fx !== false, onchange: (e) => upd({ fx: e.target.checked }) }), 'Efeito de brilho ao passar')),
        markBox,
        h('p', { class: 'hint', style: { margin: 0 } }, 'Quem pisa na área chega dentro do portal ligado. Em outra cena, quem controla o token vai junto; o resto do grupo fica onde está.'),
        h('div', { class: 'hud-btns' },
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', title: 'Apagar (Delete)', onclick: () => { S().dispatch({ type: 'trigger.delete', sceneId: sc.id, id: tr.id }); B.selectedTrigger = null; B.requestRender(); } })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    const c = App.Triggers.center(tr), p = App.Board.toScreen(c.x, c.y), W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight;
    const x = U.clamp(p.x + 30 + hud.offsetWidth > W - 14 ? p.x - hud.offsetWidth - 30 : p.x + 30, 14, Math.max(14, W - hud.offsetWidth - 14));
    hud.style.transform = `translate(${x}px, ${U.clamp(p.y - 40, 66, Math.max(66, H - hud.offsetHeight - 70))}px)`;
  }

  // Plano 41: com quem o portal está ligado; escolher a cena do outro portal e clicar nele
  function portalLinkBox(sc, tr, partner) {
    const TG = App.Triggers, st = S().state, B = App.Board;
    const act = TG.portalAct(tr) || {}, legacy = !partner && (act.area || act.x != null);
    const cur = UI.portalScene[tr.id] || (partner ? partner.scene.id : act.sceneId && st.scenes[act.sceneId] ? act.sceneId : sc.id);
    const opts = UI.portalTargets(sc).map(([v, l]) => [v || sc.id, l]);
    const box = h('div', { class: 'hud-section' }, h('span', { class: 'eyebrow' }, 'Ligado a'));
    if (partner) {
      const two = TG.portalTwoWay(sc, tr), far = partner.scene.id !== sc.id;
      box.append(
        h('div', { class: 'row portal-link' }, ic('link'), h('span', { class: 'grow' }, h('b', {}, partner.tr.name || 'Portal'), far ? h('small', {}, ' · ' + partner.scene.name) : ''),
          iconBtn('map-pin', 'Ir até o outro portal' + (far ? ' (abre a outra cena só na sua tela)' : ''), () => { if (far) { S().viewSceneId = partner.scene.id === st.activeSceneId ? null : partner.scene.id; S().emit('local'); } setTimeout(() => { const c = TG.center(partner.tr); B.centerOn(c.x, c.y); B.selectObj('trigger', partner.tr); }, 0); }),
          iconBtn('x', 'Desfazer a ligação', () => { if (confirm('Desfazer a ligação com "' + (partner.tr.name || 'Portal') + '"?')) TG.disconnectPortal(sc.id, tr.id); })),
        h('label', { class: 'check', title: 'Marcado: o outro portal traz de volta para cá. Desmarcado: só ida (o outro só recebe quem chega, ex.: armadilha ou trem)' },
          h('input', { type: 'checkbox', checked: two, onchange: (e) => {
            const pb = TG.portalPartner(partner.scene, partner.tr);
            if (e.target.checked && pb && !(pb.scene.id === sc.id && pb.tr.id === tr.id) && !confirm('"' + (partner.tr.name || 'Portal') + '" já está ligado a "' + (pb.tr.name || 'Portal') + '". Desfazer a ligação anterior?')) { e.target.checked = false; return; }
            TG.setTwoWay(sc.id, tr.id, e.target.checked);
          } }), 'Ida e volta'));
    } else box.append(h('p', { class: 'hint', style: { margin: 0 } }, legacy ? 'Chegada antiga (área ou ponto). Ligue a um portal para trocar.' : 'Ainda não leva a lugar nenhum: escolha a cena do outro portal e clique nele.'));
    box.append(
      h('label', { class: 'portal-scene' }, h('span', { class: 'hint', style: { margin: 0 } }, 'Cena do outro portal'),
        h('select', { value: cur, onchange: (e) => { UI.portalScene[tr.id] = e.target.value; UI.portalLink(sc, tr, e.target.value); } }, opts.map(([v, l]) => h('option', { value: v }, l)))),
      btnI('link', partner ? 'Ligar a outro portal' : 'Ligar a um portal', { class: 'btn small' + (partner ? '' : ' primary'), title: 'Clique no portal que vai ser ligado' + (cur !== sc.id ? ' (sua tela vai para a outra cena e volta)' : '') + '. Esc cancela', onclick: () => UI.portalLink(sc, tr, cur) }));
    return box;
  }

  // Janela "Configurar gatilho": SE (condições) | ENTÃO (ações em cartões)
  UI.trigEdit = null; // ação aberta para editar
  UI.trigAdd = false; // lista de tipos de ação aberta
  UI.openTrigger = function (sceneId, trId) {
    for (const id of [...UI.windows.keys()]) if (id.startsWith('trigger:') && id !== 'trigger:' + trId) UI.closeWindow(id);
    const B = App.Board;
    B.selectedTrigger = trId; B.selected = null; B.selectedLight = null; B.selectedDoor = null; B.selectedProp = null; B.selectedSound = null; B.selectedRoom = null;
    UI.trigEdit = null; UI.trigAdd = false;
    const w = UI.openWindow('trigger:' + trId, 'Configurar gatilho', (win) => buildTriggerWin(win, sceneId, trId), { w: Math.min(780, window.innerWidth - 40), icon: 'zap' });
    B.requestRender();
    return w;
  };
  function buildTriggerWin(win, sceneId, trId) {
    const st = S().state, sc = st && st.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    if (!tr || !S().gmView()) return false;
    const sig = trigSig(sc, tr) + '|' + UI.trigEdit + '|' + UI.trigAdd;
    if (win._sig === sig) return null;
    win._sig = sig;
    win.el.classList.add('trig-win');
    win.titleEl.textContent = 'Configurar gatilho';
    const Au = App.Audio, TG = App.Triggers, B = App.Board, g = sc.grid;
    const upd = (patch) => S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: tr.id, patch });
    const acts = () => U.clone(tr.actions || []);
    const setAct = (i, patch) => { const a = acts(); Object.assign(a[i], patch); upd({ actions: a }); };
    const delAct = (i) => { const a = acts(); if (a[i] && a[i].id === UI.trigEdit) UI.trigEdit = null; a.splice(i, 1); upd({ actions: a }); };
    const moveTo = (from, to) => { const a = acts(); if (from === to || !a[from]) return; const [x] = a.splice(from, 1); a.splice(to, 0, x); upd({ actions: a }); };
    const redo = () => { win._sig = null; renderWindow(win); };
    const sel = (value, opts, onchange, attrs = {}) => h('select', Object.assign({ value: value == null ? '' : String(value), onchange: (e) => onchange(e.target.value) }, attrs), opts.map(([v, l]) => h('option', { value: v }, l)));
    const num = (value, onchange, attrs = {}) => h('input', Object.assign({ type: 'number', class: 'num', value: value ?? '', onchange: (e) => onchange(Number(String(e.target.value).replace(',', '.')) || 0) }, attrs));
    // Escolher no mapa: a janela some enquanto você clica no mapa e volta depois
    const pickBtn = (kind, cb) => btnI('map-pin', 'No mapa', { class: 'btn small', title: 'Escolher no mapa', onclick: () => { win.el.style.display = 'none'; B.pick(kind, cb, () => { win.el.style.display = ''; }, { exclude: tr.id }); } });
    // No cartão de porta, luz, token ou outro gatilho: aceita qualquer objeto e a ação vira do tipo dele
    const cur = () => ((S().state.scenes[sc.id] || {}).triggers || []).find((x) => x.id === tr.id);
    // Muda uma ação lendo o gatilho de agora (as escolhas no mapa chegam uma a uma)
    const editAct = (id, fn) => {
      const t = cur();
      if (!t) return;
      const list = U.clone(t.actions || []), x = list.find((q) => q.id === id);
      if (!x) return;
      const r = fn(x, list);
      S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: t.id, patch: { actions: list } });
      return r;
    };
    // Escolher no mapa com a janela escondida (volta no fim)
    const winPick = (kind, cb, onEnd, opts = {}) => {
      win.el.style.display = 'none';
      if (opts.bar) pickBar(opts.bar);
      B.pick(kind, cb, () => { win.el.style.display = ''; if (opts.bar) pickBar(null); if (onEnd) onEnd(); }, Object.assign({ exclude: tr.id }, opts));
    };
    // Escolher no mapa (ENTÃO): cada objeto clicado vira uma ação do tipo certo; objetos iguais seguidos entram na mesma ação
    const pickMany = () => {
      let lastId = null, lastKind = null;
      winPick('any', (res) => {
        const t = cur();
        if (!t) return;
        const list = U.clone(t.actions || []), last = lastId && res.kind === lastKind && list.find((q) => q.id === lastId);
        if (last) {
          const added = TG.toggleRef(last, res);
          S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: t.id, patch: { actions: list } });
          const s = TG.summary(sc, last);
          U.toast((added ? 'Somado: ' : 'Tirado: ') + TG.nameOf(sc, res.kind, res.obj) + ' → ' + s.target, 'info', 2200);
          return;
        }
        const na = TG.actionFromPick(res);
        if (!na) return;
        lastId = na.id; lastKind = res.kind;
        S().dispatch({ type: 'trigger.update', sceneId: sc.id, id: t.id, patch: { actions: list.concat([na]) } });
        const s = TG.summary(sc, na);
        U.toast('Adicionado: ' + s.target + (s.op ? ' · ' + s.op : ''), 'info', 2500);
      }, null, { multi: true, withProps: true, bar: 'Clique nos objetos do mapa: cada um vira uma ação. Vários iguais seguidos (3 luzes) entram na mesma ação. Enter ou Concluir termina.' });
    };
    // Rótulo de um alvo da lista
    const refLabel = (a, ref) => {
      const s = String(ref);
      if (a.type === 'token') {
        if (s.startsWith('g:')) { const gr = (sc.groups || []).find((x) => x.id === s.slice(2)); return gr ? 'Grupo ' + gr.name : null; }
        const t = sc.tokens[s.replace(/^t:/, '')]; return t ? t.name : null;
      }
      let k = { door: 'door', light: 'light', sound: 'sound', trigger: 'trigger' }[a.type], id = s;
      if (a.type === 'anim') { const j = s.indexOf(':'); k = s.slice(0, j); id = s.slice(j + 1); }
      const o = TG.objOf(sc, k, id);
      return o ? (a.type === 'anim' ? { prop: 'Imagem', light: 'Luz', token: 'Token' }[k] + ': ' : '') + TG.nameOf(sc, k, o) : null;
    };
    // Opções da lista "Adicionar…" de cada tipo
    const listOpts = (a) => {
      const tags = (TG.tagKinds[a.type] ? TG.allTags(sc) : []).map((t) => ['tag:' + t, 'Grupo de objetos: ' + t]);
      const door = (w) => TG.nameOf(sc, 'door', w);
      switch (a.type) {
        case 'door': return (sc.walls || []).filter((w) => w.door).map((w) => [w.id, door(w)]).concat(tags);
        case 'light': return (sc.lights || []).map((o) => [o.id, o.name || 'Luz']).concat(tags);
        case 'sound': return (sc.sounds || []).map((s) => [s.id, Au.label(s.name)]).concat(tags);
        case 'trigger': return (sc.triggers || []).filter((x) => x.id !== tr.id).map((x) => [x.id, x.name]);
        case 'token': return tokOpts.slice(1);
        case 'anim': return (sc.props || []).map((p) => ['prop:' + p.id, 'Imagem: ' + (p.name || 'Imagem')]).concat((sc.lights || []).map((o) => ['light:' + o.id, 'Luz: ' + (o.name || 'Luz')]),
          Object.values(sc.tokens).map((t) => ['token:' + t.id, 'Token: ' + t.name]), tags);
      }
      return [];
    };
    // Alvos de uma ação: chips (clique tira), lista para somar e "No mapa" para clicar em vários
    const targetsBox = (a, pickKind) => {
      const chips = (a.ids || []).map((ref) => { const l = refLabel(a, ref); return l && h('span', { class: 'chip', title: 'Clique para tirar', onclick: () => editAct(a.id, (x) => { x.ids = (x.ids || []).filter((r) => r !== ref); }) }, l, ic('x')); }).filter(Boolean);
      if (a.tag) {
        const n = TG.targets(sc, Object.assign({}, a, { ids: [] })).length;
        chips.push(h('span', { class: 'chip tag', title: 'Todos os objetos com este grupo (clique para tirar)', onclick: () => editAct(a.id, (x) => { x.tag = ''; }) }, ic('tag'), a.tag + ' (' + n + ')', ic('x')));
      }
      const opts = listOpts(a);
      return h('div', { class: 'ta-targets' },
        chips.length ? h('div', { class: 'chips' }, chips) : h('span', { class: 'ta-target none' }, 'Escolha os alvos'),
        h('div', { class: 'row' },
          h('select', { class: 'grow', value: '', onchange: (e) => {
            const v = e.target.value;
            if (!v) return;
            editAct(a.id, (x) => { if (v.startsWith('tag:')) x.tag = v.slice(4); else { x.ids = x.ids || []; if (!x.ids.includes(v)) x.ids.push(v); } });
          } }, h('option', { value: '' }, opts.length ? 'Somar da lista…' : 'Nada deste tipo na cena'), opts.map(([v, l]) => h('option', { value: v }, l))),
          btnI('map-pin', 'No mapa', { class: 'btn small', title: 'Clique em vários no mapa (clicar de novo tira). Enter ou Concluir termina.', onclick: () => winPick(pickKind, (res) => {
            const t = cur(), x = t && (t.actions || []).find((q) => q.id === a.id);
            if (!x) return;
            // Outro tipo de objeto: a ação vira do tipo dele (Plano 16)
            if (pickKind === 'any' && TG.refFor(x, res) == null) {
              const na = TG.actionFromPick(res, x);
              if (na) { UI.trigEdit = na.id; editAct(a.id, (y, list) => { list[list.indexOf(y)] = na; }); U.toast('A ação virou ' + TG.summary(sc, na).target + '. Continue clicando para somar.', 'info', 2500); B.cancelPick(); }
              return;
            }
            const r = editAct(a.id, (y) => TG.toggleRef(y, res));
            if (r == null) U.toast('Este objeto não serve para esta ação.');
            else U.toast((r ? 'Somado: ' : 'Tirado: ') + TG.nameOf(sc, res.kind, res.obj), 'info', 1500);
          }, null, { multi: true, bar: 'Clique nos alvos desta ação (clicar de novo tira). Enter ou Concluir termina.' }) })));
    };
    const field = (label, ...kids) => h('label', { class: 'ta-field' }, h('span', {}, label), ...kids);
    const cell = (x, y) => `(${Math.floor(x / g) + 1}, ${Math.floor(y / g) + 1})`;
    const state = TG.stateLabel(tr);
    const tokOpts = [['', 'Escolha…']].concat((sc.groups || []).map((x) => ['g:' + x.id, 'Grupo: ' + x.name]),
      Object.values(sc.tokens).map((t) => ['t:' + t.id, t.name + (t.hidden ? ' (invisível)' : '')]));
    const tracks = [...Au.files.keys()].sort((a, b) => a.localeCompare(b));

    // Campos de cada tipo de ação
    const body = (a, i) => {
      const set = (patch) => setAct(i, patch);
      switch (a.type) {
        case 'door':
          return [targetsBox(a, 'any'), field('Fazer', sel(a.op, Object.entries(TG.OPS.door), (v) => set({ op: v })))];
        case 'light':
          return [targetsBox(a, 'any'), field('Fazer', sel(a.op, Object.entries(TG.OPS.light), (v) => set({ op: v })))];
        case 'token':
          return [targetsBox(a, 'any'), field('Fazer', sel(a.op, Object.entries(TG.OPS.token), (v) => set({ op: v })))];
        case 'anim': {
          const tl = TG.targets(sc, a), kinds = [...new Set(tl.map((x) => x.kind))].filter((k) => ['prop', 'light', 'token'].includes(k));
          const out = [targetsBox(a, 'animable'), field('Fazer', sel(a.op, Object.entries(TG.OPS.anim), (v) => set(v === 'play' && !a.spec ? { op: v, spec: App.Anim.newSpec('move') } : { op: v })))];
          if (a.op === 'play') {
            out.push(btnI('sliders-horizontal', 'Abrir editor', { class: 'btn small primary', title: 'Editor grande, com barras e prévia', onclick: () => UI.openAnimEditor({ mode: 'trig', sceneId: sc.id, trigId: cur().id, actId: a.id }) }));
            out.push(h('div', { class: 'anim-box' }, animEditor({ sc, spec: a.spec, kinds, ref: tl.find((x) => kinds.includes(x.kind)) || null, pick: winPick,
              set: (p) => editAct(a.id, (x) => { x.spec = x.spec || App.Anim.newSpec('move'); if (typeof p === 'function') p(x.spec); else Object.assign(x.spec, p); }) })));
            out.push(h('p', { class: 'hint', style: { margin: 0 } }, 'O caminho aparece no mapa enquanto este cartão está aberto. Vários alvos fazem o mesmo movimento, cada um a partir de onde está.'));
          } else if (a.op === 'own') {
            const without = tl.filter((x) => !(x.obj.anim && (x.obj.anim.steps || []).length));
            out.push(h('p', { class: 'hint', style: { margin: 0 } }, without.length ? 'Sem animação própria: ' + without.map((x) => x.name).join(', ') + '. Monte no painel da imagem ou da luz (seção Animação).' : 'Toca a animação montada no painel de cada objeto (seção Animação).'));
          } else out.push(h('p', { class: 'hint', style: { margin: 0 } }, a.op === 'stop' ? 'Para a animação onde o objeto está agora (inclusive as que começam sozinhas).' : 'Para e devolve o objeto para onde estava antes da primeira animação.'));
          return out;
        }
        case 'sound': {
          const out = [field('Fazer', sel(a.op, [['sfx', 'Tocar um efeito'], ['sfx-stop', 'Parar um efeito'], ['spot-fire', 'Tocar um som do mapa (uma vez)'], ['spot-on', 'Ligar um som do mapa'], ['spot-off', 'Desligar um som do mapa'],
            ['music', 'Trocar a música'], ['music-stop', 'Parar a música'], ['ambient', 'Trocar o ambiente'], ['ambient-stop', 'Parar o ambiente'], ['all-stop', 'Parar todos os sons']], (v) => set({ op: v })))];
          if (['sfx', 'sfx-stop', 'music', 'ambient'].includes(a.op)) {
            const list = tracks.includes(a.name) || !a.name ? tracks : [a.name].concat(tracks);
            const first = a.op === 'sfx-stop' ? [['', 'Todos os efeitos']] : [['', 'Escolha a faixa…']];
            out.push(list.length || a.op === 'sfx-stop' ? field(a.op === 'sfx-stop' ? 'Qual efeito' : 'Faixa', sel(a.name, first.concat(list.map((n) => [n, Au.label(n)])), (v) => set({ name: v })))
              : h('p', { class: 'hint', style: { margin: 0 } }, 'Escolha a pasta de músicas no painel Som para listar as faixas.'));
            // Plano 27: o efeito para sozinho depois de N segundos (vazio = toca até o fim)
            if (a.op === 'sfx') out.push(field('Parar depois de (s)', h('input', { type: 'number', class: 'num', min: 0, step: 0.5, value: a.stopAfter || '', placeholder: 'toca até o fim',
              onchange: (e) => { const v = Number(String(e.target.value).replace(',', '.')); set({ stopAfter: v > 0 ? v : null }); } })));
            if (a.op === 'sfx-stop') out.push(h('p', { class: 'hint', style: { margin: 0 } }, 'Para o efeito que estiver tocando, para todos. Use o atraso da ação para parar depois de um tempo.'));
          } else if (a.op === 'all-stop') out.push(h('p', { class: 'hint', style: { margin: 0 } }, 'Silêncio: para a música, o ambiente, os efeitos e desliga os sons do mapa desta cena.'));
          else if (String(a.op).startsWith('spot')) out.push(targetsBox(a, 'any'));
          return out;
        }
        case 'trap': {
          const st2 = S().state;
          return [h('div', { class: 'ta-grid' },
            field('Teste', sel(a.save, [['', 'Sem teste (só dano)']].concat((st2.attrs || []).map((n) => [n, n])), (v) => set({ save: v }))),
            a.save ? field('CD', num(a.dc, (v) => set({ dc: v }), { min: 1 })) : '',
            field('Dano', h('input', { class: 'num', value: a.damage || '', placeholder: '2d6', onchange: (e) => set({ damage: e.target.value.trim() || '0' }) })),
            field('Barra', sel(a.bar, [['', (st2.barNames || [])[0] || 'Primeira']].concat((st2.barNames || []).slice(1).map((n) => [n, n])), (v) => set({ bar: v }))),
            a.save ? field('Se passar', sel(a.onSave, [['half', 'Metade'], ['none', 'Nada']], (v) => set({ onSave: v }))) : ''),
          h('p', { class: 'hint', style: { margin: 0 } }, 'Atinge quem disparou (em Disparar agora: quem está na área). O resultado aparece no mapa e no chat, e dá para desfazer.')];
        }
        case 'fog':
          return [field('Fazer', sel(a.op, [['reveal', 'Revelar a névoa da área'], ['hide', 'Esconder a área com névoa']], (v) => set({ op: v })))];
        case 'teleport': {
          const other = a.sceneId && a.sceneId !== sc.id && st.scenes[a.sceneId];
          return [field('Para', sel(other ? a.sceneId : '', [['', 'Um ponto deste mapa']].concat(st.sceneOrder.filter((id) => id !== sc.id && st.scenes[id]).map((id) => [id, 'Cena: ' + st.scenes[id].name])), (v) => set({ sceneId: v || null, x: null, y: null }))),
            other ? h('p', { class: 'hint', style: { margin: 0 } }, 'Chega no centro do mapa "' + other.name + '". Quem controla o token vai junto para a cena.')
              : h('div', { class: 'row' }, h('span', { class: 'grow ta-target' + (a.x != null ? '' : ' none') }, a.x != null ? 'Destino ' + cell(a.x, a.y) : 'Escolha o ponto'), pickBtn('point', (p) => set({ x: p.x, y: p.y })))];
        }
        case 'trigger':
          return [targetsBox(a, 'any'), field('Fazer', sel(a.op, Object.entries(TG.OPS.trigger), (v) => set({ op: v })))];
      }
      return [];
    };

    // Cartões das ações: resumo; o aberto mostra os campos. A alça arrasta para mudar a ordem.
    const cards = (tr.actions || []).map((a, i) => {
      const s = TG.summary(sc, a), open = UI.trigEdit === a.id;
      const toggle = () => { UI.trigEdit = open ? null : a.id; redo(); B.requestRender(); };
      // Mouse em cima do cartão: o alvo dessa ação acende no mapa (linha rosa e número)
      const card = h('div', { class: 'ta-card' + (open ? ' open' : '') + (s.missing ? ' missing' : ''), 'data-i': String(i),
        onmouseenter: () => { UI.trigHover = a.id; B.requestRender(); }, onmouseleave: () => { if (UI.trigHover === a.id) { UI.trigHover = null; B.requestRender(); } } },
        h('div', { class: 'ta-row', onclick: (e) => { if (!e.target.closest('button,.ta-grip')) toggle(); } },
          h('span', { class: 'ta-grip', title: 'Arraste para mudar a ordem', onpointerdown: () => { card.draggable = true; } }, ic('grip-vertical')),
          h('span', { class: 'ta-n' }, String(i + 1)), ic(TG.ICON[a.type]),
          h('div', { class: 'ta-sum' }, h('b', {}, s.target), h('small', {}, [s.missing ? 'falta escolher o alvo' : s.op, Number(a.delay) > 0 ? 'esperar ' + String(a.delay).replace('.', ',') + ' s' : ''].filter(Boolean).join(' · '))),
          iconBtn(open ? 'chevron-up' : 'pencil', open ? 'Fechar' : 'Editar', toggle),
          iconBtn('trash-2', 'Remover ação', () => delAct(i))),
        open ? h('div', { class: 'ta-edit' }, ...body(a, i),
          h('div', { class: 'row ta-delay' }, h('span', { class: 'muted small-text grow' }, i ? 'Esperar depois da ação anterior (s)' : 'Esperar antes (s)'),
            num(a.delay || 0, (v) => setAct(i, { delay: Math.max(0, v) }), { min: 0, step: 0.5 }))) : null);
      card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-ta', String(i)); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { card.draggable = false; card.classList.remove('dragging'); });
      card.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('text/x-ta')) { e.preventDefault(); card.classList.add('drop'); } });
      card.addEventListener('dragleave', () => card.classList.remove('drop'));
      card.addEventListener('drop', (e) => { e.preventDefault(); card.classList.remove('drop'); const from = Number(e.dataTransfer.getData('text/x-ta')); if (Number.isFinite(from)) moveTo(from, i); });
      return card;
    });
    const addArea = UI.trigAdd
      ? h('div', { class: 'ta-types' }, TG.ACTIONS.map(([k, l]) => h('button', { class: 'ta-type', onclick: () => {
        const na = TG.newAction(k); UI.trigEdit = na.id; UI.trigAdd = false; upd({ actions: acts().concat([na]) });
      } }, ic(TG.ICON[k]), l)), h('button', { class: 'btn small', onclick: () => { UI.trigAdd = false; redo(); } }, 'Cancelar'))
      : h('div', { class: 'ta-add' },
        btnI('map-pin', 'Escolher no mapa', { class: 'btn primary', title: 'Clique numa luz, porta, token, som, gatilho ou imagem: a ação certa é criada sozinha', onclick: pickMany }),
        btnI('plus', 'Adicionar ação', { class: 'btn', title: 'Armadilha, névoa, teletransporte, música…', onclick: () => { UI.trigAdd = true; redo(); } }));
    const prop = tr.on === 'click' && (sc.props || []).find((x) => x.id === tr.propId);

    return h('div', { class: 'tw' },
      h('div', { class: 'tw-top' },
        h('input', { class: 'tw-name', value: tr.name || '', placeholder: 'Nome do gatilho', onchange: (e) => upd({ name: e.target.value.trim() || 'Gatilho' }) }),
        h('span', { class: 'tw-state ' + trigStateClass(state) }, state + ' · disparou ' + (tr.used || 0) + (tr.used === 1 ? ' vez' : ' vezes'))),
      h('div', { class: 'tw-cols' },
        h('section', { class: 'tw-col' },
          h('div', { class: 'tw-h' }, h('span', { class: 'tw-tag' }, 'SE'), h('b', {}, 'Condições')),
          field('Quando', sel(tr.on, TG.EVENTS, (v) => upd({ on: v }))),
          tr.on === 'click' ? h('div', { class: 'row' }, h('span', { class: 'grow ta-target' + (prop ? '' : ' none') }, prop ? 'Imagem: ' + (prop.name || 'Imagem') : 'Escolha a imagem (alavanca, baú…)'), pickBtn('prop', (q) => upd({ propId: q.id }))) : '',
          field('Quem dispara', sel(tr.who, TG.WHO, (v) => upd({ who: v }))),
          tr.who === 'pick' ? h('div', { class: 'chips' }, (tr.whoIds || []).map((id) => sc.tokens[id] && h('span', { class: 'chip', title: 'Clique para tirar', onclick: () => upd({ whoIds: tr.whoIds.filter((x) => x !== id) }) }, sc.tokens[id].name)),
            pickBtn('token', (t) => upd({ whoIds: [...new Set((tr.whoIds || []).concat(t.id))] }))) : '',
          h('span', { class: 'eyebrow' }, 'Quantas vezes'),
          h('div', { class: 'seg' }, [['once', 'Uma vez'], ['always', 'Sempre'], ['n', 'Algumas']].map(([k, l]) => h('button', { class: (tr.times || 'once') === k ? 'on' : '', onclick: () => upd({ times: k }) }, l))),
          tr.times === 'n' ? h('div', { class: 'row' }, h('span', { class: 'muted small-text grow' }, 'Número de vezes'), num(tr.n || 3, (v) => upd({ n: Math.max(1, Math.round(v)) }), { min: 1 })) : '',
          tr.times && tr.times !== 'once' ? h('div', { class: 'row' }, h('span', { class: 'muted small-text grow' }, 'Espera entre disparos (s)'), num(tr.cooldown || 0, (v) => upd({ cooldown: Math.max(0, v) }), { min: 0 })) : '',
          h('span', { class: 'eyebrow' }, 'Opções'),
          h('label', { class: 'switch-row' }, h('span', { class: 'grow' }, 'Ligado'), h('input', { type: 'checkbox', checked: tr.enabled !== false, onchange: (e) => upd({ enabled: e.target.checked }) })),
          h('label', { class: 'switch-row' }, h('span', { class: 'grow' }, 'Perguntar antes de disparar'), h('input', { type: 'checkbox', checked: !!tr.ask, onchange: (e) => upd({ ask: e.target.checked }) })),
          tr.on === 'enter' ? h('label', { class: 'switch-row' }, h('span', { class: 'grow' }, 'Parar o movimento (armadilha)'), h('input', { type: 'checkbox', checked: !!tr.stop, onchange: (e) => upd({ stop: e.target.checked }) })) : '',
          h('p', { class: 'hint', style: { margin: 0 } }, 'Os jogadores não veem a área. Arrastar tokens como mestre não dispara; para ver de verdade, use Ver como os jogadores.')),
        h('section', { class: 'tw-col' },
          h('div', { class: 'tw-h' }, h('span', { class: 'tw-tag then' }, 'ENTÃO'), h('b', {}, 'O que acontece'), h('small', { class: 'muted grow', style: { textAlign: 'right' } }, 'em ordem')),
          cards.length ? h('div', { class: 'ta-list' }, cards) : h('p', { class: 'hint', style: { margin: 0 } }, 'Nenhuma ação ainda. Adicione na ordem em que devem acontecer.'),
          addArea)),
      h('div', { class: 'tw-foot' },
        btnI('play', 'Testar gatilho', { class: 'btn primary', title: 'Simula no mapa: cada alvo pisca no tempo certo, o som toca só para você. Nada muda de verdade.', onclick: () => TG.simulate(sc.id, tr.id) }),
        btnI('zap', 'Disparar agora', { title: 'Faz tudo de verdade agora, mesmo gasto', onclick: () => TG.fire(sc.id, tr.id, null, { manual: true }) }),
        btnI('refresh-cw', 'Rearmar', { onclick: () => upd({ used: 0, lastAt: 0 }) }),
        h('span', { class: 'grow' }),
        iconBtn('copy-plus', 'Duplicar', () => { B.duplicateTrigger(sc, tr.id); UI.openTrigger(sc.id, B.selectedTrigger); }),
        iconBtn('trash-2', 'Apagar gatilho', () => { S().dispatch({ type: 'trigger.delete', sceneId: sc.id, id: tr.id }); B.selectedTrigger = null; UI.closeWindow('trigger:' + tr.id); B.requestRender(); })));
  }
  // Faixa no topo do mapa enquanto o mestre escolhe vários objetos (Concluir = termina)
  function pickBar(text) {
    let bar = $('#pick-bar');
    if (!text) { if (bar) bar.remove(); return; }
    if (!bar) { bar = h('div', { id: 'pick-bar' }); $('#board-wrap').append(bar); }
    bar.innerHTML = '';
    bar.append(ic('map-pin'), h('span', { class: 'grow' }, text), h('button', { class: 'btn primary small', onclick: () => App.Board.cancelPick() }, 'Concluir'));
  }

  // Caixa do mestre para gatilhos com "Perguntar antes de disparar"
  UI.renderTriggerAsk = function () {
    const wrap = $('#board-wrap');
    if (!wrap) return;
    let box = $('#trig-ask');
    const q = App.Triggers.queue;
    if (!q.length) { if (box) box.remove(); return; }
    if (!box) { box = h('div', { id: 'trig-ask' }); wrap.append(box); }
    box.innerHTML = '';
    q.forEach((it, i) => {
      const sc = S().state.scenes[it.sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === it.trId), t = sc && sc.tokens[it.tokenId];
      if (!tr) return;
      const verb = it.why === 'click' ? 'usou' : tr.on === 'leave' ? 'saiu de' : 'entrou em';
      box.append(h('div', { class: 'ta-ask' }, ic('zap'), h('span', { class: 'grow' }, h('b', {}, t ? t.name : 'Alguém'), ' ' + verb + ' ', h('b', {}, '"' + tr.name + '"'), '. Disparar?'),
        h('button', { class: 'btn primary small', onclick: () => App.Triggers.answer(i, true) }, 'Disparar'),
        h('button', { class: 'btn small', onclick: () => App.Triggers.answer(i, false) }, 'Ignorar')));
    });
  };

  // Porta (mestre): aberta ou fechada, trancada ou destrancada
  function doorHud(hud, empty, sc, w) {
    if (empty) empty.hidden = true;
    const sig = JSON.stringify(['door', w, UI.mode, App.Triggers.allTags(sc)]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const B = App.Board;
      const setOpen = (open) => { if (!!w.open !== open) S().dispatch({ type: 'wall.door', sceneId: sc.id, id: w.id, open }); };
      const setLock = (locked) => { if (!!w.locked !== locked) S().dispatch({ type: 'wall.lock', sceneId: sc.id, id: w.id, locked }); };
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble door' + (w.locked ? ' locked' : '') }, ic(w.locked ? 'lock' : w.open ? 'door-open' : 'door-closed')),
          h('div', { class: 'grow' }, h('div', { class: 'hud-name' }, 'Porta'),
            h('div', { class: 'hud-sub' }, (w.open ? 'Aberta' : 'Fechada') + ' · ' + (w.locked ? 'trancada' : 'destrancada')))),
        h('div', { class: 'hud-section vis-sec' },
          h('div', { class: 'seg vis-seg' },
            h('button', { class: w.open ? 'on' : '', title: 'Abrir (um clique no marcador também)', onclick: () => setOpen(true) }, ic('door-open'), 'Aberta'),
            h('button', { class: w.open ? '' : 'on', onclick: () => setOpen(false) }, ic('door-closed'), 'Fechada')),
          h('div', { class: 'seg vis-seg' },
            h('button', { class: w.locked ? '' : 'on', title: 'Shift + clique no marcador também', onclick: () => setLock(false) }, ic('lock-open'), 'Destrancada'),
            h('button', { class: w.locked ? 'on' : '', title: 'Shift + clique no marcador também', onclick: () => setLock(true) }, ic('lock'), 'Trancada')),
          h('p', { class: 'hint', style: { margin: 0 } }, w.locked
            ? 'Trancada: os jogadores não abrem nem passam. Eles não veem o cadeado: descobrem ao tentar abrir. Só você abre (e ao abrir ela fica destrancada).'
            : 'Destrancada: qualquer um abre e fecha com um clique, e dá para passar por ela mesmo fechada (ela continua fechada e tapando a visão).'),
          tagField(sc, w, (v) => S().dispatch({ type: 'wall.update', sceneId: sc.id, id: w.id, patch: { tag: v } }))),
        h('div', { class: 'hud-btns' },
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar porta', { class: 'btn danger', title: 'Apagar (Delete)', onclick: () => { S().dispatch({ type: 'wall.delete', sceneId: sc.id, id: w.id }); B.selectedDoor = null; B.requestRender(); } })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    const p = App.Board.toScreen((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2), W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight;
    const x = U.clamp(p.x + 30 + hud.offsetWidth > W - 14 ? p.x - hud.offsetWidth - 30 : p.x + 30, 14, Math.max(14, W - hud.offsetWidth - 14));
    hud.style.transform = `translate(${x}px, ${U.clamp(p.y - 40, 66, Math.max(66, H - hud.offsetHeight - 70))}px)`;
  }

  // Isolamento de som: nome, música de fora, ambiente de fora, ajustar e apagar
  function roomHud(hud, empty, sc, room) {
    if (empty) empty.hidden = true;
    const sig = JSON.stringify(['room', room, UI.mode, App.Board.tool]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const upd = (patch) => S().dispatch({ type: 'room.update', sceneId: sc.id, id: room.id, patch });
      const seg = (cur, opts, key) => h('div', { class: 'seg' }, opts.map(([k, l]) => h('button', { class: cur === k ? 'on' : '', onclick: () => upd({ [key]: k }) }, l)));
      const inside = (sc.sounds || []).filter((s) => App.Audio.roomAt(sc, s) && App.Audio.roomAt(sc, s).id === room.id).length;
      const adjusting = App.Board.tool === 'room';
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble iso' }, ic('volume-x')),
          h('div', { class: 'grow' }, h('input', { class: 'hud-name', value: room.name || '', placeholder: 'Nome', onchange: (e) => upd({ name: e.target.value.trim() || 'Isolamento' }) }),
            h('div', { class: 'hud-sub' }, 'Isolamento de som · ' + room.pts.length + ' cantos'))),
        h('div', { class: 'hud-section' },
          h('span', { class: 'eyebrow' }, 'Música de fora (quem está dentro)'),
          seg(room.outside || 'stop', [['keep', 'Continua'], ['stop', 'Para']], 'outside'),
          h('span', { class: 'eyebrow' }, 'Ambiente de fora (chuva, vento…)'),
          seg(room.ambient || 'stop', [['stop', 'Para'], ['muffle', 'Abafado'], ['keep', 'Continua']], 'ambient')),
        h('p', { class: 'hint', style: { margin: 0 } }, 'Nenhum som do mapa atravessa a borda: o que toca dentro só se ouve dentro, e o de fora não entra. Efeitos tocados para todos continuam.' + (inside ? ' Sons do mapa aqui dentro: ' + inside + '.' : ' Solte uma faixa aqui dentro para tocar só para quem estiver dentro.')),
        adjusting
          ? h('p', { class: 'hint', style: { margin: 0 } }, 'Ajustar: arraste um canto ou a borda. Dois cliques na borda criam um canto; dois cliques num canto apagam.')
          : '',
        h('div', { class: 'hud-btns' },
          adjusting ? '' : btnI('pencil', 'Ajustar formato', { title: 'Mostra os cantos para arrastar (ferramenta Isolamento de som)', onclick: () => { App.Board.setTool('room'); App.Board.selectedRoom = room.id; App.Board.requestRender(); UI.refresh(); } }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Apagar', { class: 'btn danger', title: 'Apagar (Delete)', onclick: () => { S().dispatch({ type: 'room.delete', sceneId: sc.id, id: room.id }); App.Board.selectedRoom = null; App.Board.requestRender(); } })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    // Flutuando: ao lado do canto mais à direita do isolamento, sem cobrir as ferramentas
    const pts = room.pts.map(([x, y]) => App.Board.toScreen(x, y));
    const right = Math.max(...pts.map((p) => p.x)), left = Math.min(...pts.map((p) => p.x)), top = Math.min(...pts.map((p) => p.y));
    const W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight, hw = hud.offsetWidth;
    const x = U.clamp(right + 20 + hw > W - 14 ? left - hw - 20 : right + 20, 70, Math.max(70, W - hw - 14));
    hud.style.transform = `translate(${x}px, ${U.clamp(top, 66, Math.max(66, H - hud.offsetHeight - 70))}px)`;
  }
  function soundHud(hud, empty, sc, snd) {
    if (empty) empty.hidden = true;
    const sig = JSON.stringify(['snd', snd, UI.mode, App.Triggers.allTags(sc)]);
    if (hud._sig !== sig && !isTyping(hud)) {
      hud._sig = sig;
      hud.innerHTML = '';
      const upd = (patch) => S().dispatch({ type: 'sound.update', sceneId: sc.id, id: snd.id, patch });
      const rangeLbl = h('span', {}, snd.r + ' quadrados');
      const volLbl = h('span', {}, Math.round((snd.vol ?? 1) * 100) + '%');
      const legend = h('div', { class: 'vol-legend' },
        h('div', { class: 'vol-bar', style: { background: 'linear-gradient(90deg, ' + App.Board.VOL_COLORS.slice(0, 4).map(([v, c]) => `rgb(${c.join(',')}) ${Math.round(App.Audio.distanceFor(v) * 100)}%`).join(', ') + ', rgba(84,128,240,.15) 100%)' } }),
        h('div', { class: 'vol-lbls' }, h('span', {}, 'Máximo (no ponto)'), h('span', {}, 'Mínimo (borda)')));
      hud.append(
        h('div', { class: 'hud-top' }, h('div', { class: 'snd-bubble' + (snd.once ? ' fx' : snd.on ? ' on' : '') }, ic(snd.once ? 'zap' : snd.on ? 'volume-2' : 'volume-x')),
          h('div', { class: 'grow' }, h('div', { class: 'hud-name' }, App.Audio.label(snd.name)),
            h('div', { class: 'hud-sub' }, snd.once ? 'Efeito no mapa · toca quando você mandar' : snd.on ? 'Som no mapa · repetindo' : 'Som no mapa · silenciado'))),
        snd.once ? btnI('zap', 'Tocar agora', { class: 'btn primary block snd-play', title: 'Toca uma vez para todos que estiverem no alcance (ou dê dois cliques no marcador)', onclick: () => App.Audio.trigger(snd) }) : '',
        h('div', { class: 'seg' },
          h('button', { class: snd.once ? '' : 'on', onclick: () => { if (snd.once) App.Audio.setOnce(sc, snd, false); } }, 'Repete'),
          h('button', { class: snd.once ? 'on' : '', onclick: () => { if (!snd.once) App.Audio.setOnce(sc, snd, true); } }, 'Uma vez')),
        h('div', { class: 'hud-section' },
          h('div', { class: 'snd-row' }, h('span', {}, 'Alcance'), rangeLbl),
          h('input', { type: 'range', min: 1, max: 30, step: 1, value: snd.r, oninput: (e) => { rangeLbl.textContent = e.target.value + ' quadrados'; }, onchange: (e) => { upd({ r: Number(e.target.value) }); e.target.blur(); } }),
          h('div', { class: 'snd-row' }, h('span', {}, 'Volume'), volLbl),
          h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: snd.vol ?? 1, oninput: (e) => { volLbl.textContent = Math.round(e.target.value * 100) + '%'; }, onchange: (e) => { upd({ vol: Number(e.target.value) }); e.target.blur(); } })),
        legend,
        (() => {
          const iso = App.Audio.roomAt(sc, snd);
          if (!iso) return '';
          return h('div', { class: 'hud-section' },
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!snd.fill, onchange: (e) => upd({ fill: e.target.checked }) }), 'Igual na área inteira do isolamento'),
            h('p', { class: 'hint', style: { margin: 0 } }, 'Dentro de "' + (iso.name || 'Isolamento') + '": só quem está dentro ouve.' + (snd.fill ? ' Mesmo volume em qualquer canto, sem depender da distância.' : '')));
        })(),
        h('div', { class: 'hud-section' }, tagField(sc, snd, (v) => upd({ tag: v }))),
        h('p', { class: 'hint', style: { margin: 0 } }, 'Cada jogador ouve pelo próprio token: mais alto perto do ponto, do lado em que o som está. Atrás de paredes (área apagada no mapa) chega abafado, a ' + Math.round(App.Audio.OCCLUDED * 100) + '%. Arraste o marcador para mudar de lugar.'),
        h('div', { class: 'hud-btns' },
          snd.once ? '' : btnI(snd.on ? 'pause' : 'play', snd.on ? 'Silenciar' : 'Tocar', { onclick: () => upd(snd.on ? { on: false } : { on: true, at: Date.now() }) }),
          h('span', { class: 'grow' }),
          btnI('trash-2', 'Remover', { class: 'btn danger', onclick: () => { S().dispatch({ type: 'sound.delete', sceneId: sc.id, id: snd.id }); App.Board.selectedSound = null; App.Board.requestRender(); } })));
    }
    hud.hidden = false;
    if (!hudFloats()) { hud.style.transform = ''; return; }
    const p = App.Board.soundScreenPos(snd), W = hud.parentElement.clientWidth, H = hud.parentElement.clientHeight;
    let x = p.x + 30;
    if (x + hud.offsetWidth > W - 14) x = p.x - hud.offsetWidth - 30;
    x = U.clamp(x, 14, Math.max(14, W - hud.offsetWidth - 14));
    const y = U.clamp(p.y - 40, 66, Math.max(66, H - hud.offsetHeight - 70));
    hud.style.transform = `translate(${x}px, ${y}px)`;
  }

  // ---------- Visibilidade e grupos (mestre) ----------
  const VIS = [['show', 'eye', 'Visível', 'Todos veem normalmente'], ['masked', 'circle-help', 'Vulto', 'Os jogadores veem só uma silhueta escura, sem imagem, nome nem vida'], ['hidden', 'eye-off', 'Invisível', 'Só você vê']];
  const visOf = (t) => (t.hidden ? 'hidden' : t.masked ? 'masked' : 'show');
  function visSeg(cur, onPick) {
    return h('div', { class: 'seg vis-seg' }, VIS.map(([k, icon, label, title]) => h('button', { class: cur === k ? 'on' : '', title, onclick: () => onPick(k) }, ic(icon), label)));
  }
  UI.visSeg = visSeg;
  // Grupo: todos com a mesma visibilidade? ('mixed' se não)
  const groupVis = (sc, gid) => {
    const vs = [...new Set(Object.values(sc.tokens).filter((t) => t.group === gid).map(visOf))];
    return vs.length === 1 ? vs[0] : 'mixed';
  };
  function newGroup(sc, tokenIds) {
    const n = (sc.groups || []).length + 1;
    const name = prompt('Nome do grupo', 'Grupo ' + n);
    if (name == null) return null;
    const g = { id: U.uid('g_'), name: name.trim() || 'Grupo ' + n };
    S().dispatch({ type: 'group.add', sceneId: sc.id, group: g, tokens: tokenIds });
    return g;
  }
  function visGroupSection(sc, t) {
    const tokUpd = (patch) => S().dispatch({ type: 'token.update', sceneId: sc.id, id: t.id, patch });
    const groups = sc.groups || [], g = groups.find((x) => x.id === t.group);
    const members = g ? Object.values(sc.tokens).filter((x) => x.group === g.id) : [];
    const fly = App.Combat.flyOf(t);
    return h('div', { class: 'hud-section vis-sec' },
      // Voo: o token sobe tantos metros e passa a ver e ser visto por cima dos muros mais baixos
      h('span', { class: 'eyebrow' }, 'Voo'),
      h('div', { class: 'fly-row' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: fly > 0, onchange: (e) => tokUpd({ fly: e.target.checked ? (t.lastFly || 6) : 0, lastFly: fly || t.lastFly || 6 }) }), 'Voando'),
        h('input', { type: 'number', class: 'num', min: 0, step: 0.5, value: fly ? App.Units.distIn(fly) : '', placeholder: '0', disabled: !(fly > 0), title: 'Altura acima do chão',
          onchange: (e) => { const v = Math.max(0, App.Units.distOut(e.target.value)); tokUpd({ fly: v, lastFly: v || t.lastFly }); } }),
        h('span', { class: 'muted small-text' }, App.Units.distUnit() + ' acima do chão')),
      fly > 0 ? h('p', { class: 'hint', style: { margin: 0 } }, `Vê e é visto por cima de muros com até ${App.Units.dist(Math.round((App.Combat.topOf(t) - 0.01) * 10) / 10)}. A parede absoluta continua bloqueando.`) : '',
      h('span', { class: 'eyebrow' }, 'Para os jogadores'),
      visSeg(visOf(t), (k) => tokUpd({ hidden: k === 'hidden', masked: k === 'masked' })),
      h('div', { class: 'row' }, h('span', { class: 'eyebrow grow' }, 'Grupo'),
        h('select', { class: 'grow', value: t.group || '', onchange: (e) => {
          const v = e.target.value;
          if (v === '__new') { const ng = newGroup(sc, [t.id]); if (!ng) e.target.value = t.group || ''; return; }
          tokUpd({ group: v || null });
        } }, h('option', { value: '' }, 'Sem grupo'), groups.map((x) => h('option', { value: x.id }, x.name)), h('option', { value: '__new' }, '+ Novo grupo…'))),
      g ? h('div', { class: 'grp-box' },
        h('div', { class: 'grp-head' }, ic('users'), h('b', {}, g.name), h('span', { class: 'muted' }, members.length + (members.length === 1 ? ' token' : ' tokens'))),
        visSeg(groupVis(sc, g.id), (k) => S().dispatch({ type: 'group.vis', sceneId: sc.id, id: g.id, vis: k })),
        h('p', { class: 'hint', style: { margin: 0 } }, 'Muda o grupo inteiro de uma vez.')) : '');
  }
  // Lista de grupos da cena (aba Camadas)
  function groupsSection(sc) {
    const groups = sc.groups || [], B = App.Board, selTok = B.selected && sc.tokens[B.selected];
    const box = h('div', { class: 'groups-sec' }, h('div', { class: 'sec-head' }, h('span', { class: 'eyebrow' }, 'Grupos de tokens'),
      iconBtn('plus', selTok ? 'Novo grupo com o token selecionado' : 'Novo grupo vazio', () => { newGroup(sc, selTok ? [selTok.id] : []); })));
    if (!groups.length) box.append(h('p', { class: 'hint' }, 'Junte tokens num grupo (no painel do token, em Grupo) para mostrar, esconder ou virar vulto todos de uma vez. Ex.: a emboscada de 3 goblins aparece com um clique.'));
    for (const g of groups) {
      const members = Object.values(sc.tokens).filter((t) => t.group === g.id);
      box.append(h('div', { class: 'grp-row' },
        h('div', { class: 'row' },
          h('input', { class: 'grp-name grow', value: g.name, onchange: (e) => S().dispatch({ type: 'group.update', sceneId: sc.id, id: g.id, patch: { name: e.target.value.trim() || g.name } }) }),
          h('span', { class: 'n' }, String(members.length)),
          iconBtn('scan', 'Mostrar no mapa', () => { if (members.length) { B.selected = members[0].id; const m0 = members[0], hs = (m0.size || 1) * sc.grid / 2; B.centerOn(m0.x + hs, m0.y + hs); B.requestRender(); UI.refresh(); } }),
          iconBtn('trash-2', 'Desfazer o grupo (os tokens continuam no mapa)', () => S().dispatch({ type: 'group.delete', sceneId: sc.id, id: g.id }))),
        members.length ? visSeg(groupVis(sc, g.id), (k) => S().dispatch({ type: 'group.vis', sceneId: sc.id, id: g.id, vis: k }))
          : h('p', { class: 'hint', style: { margin: 0 } }, 'Vazio: escolha este grupo no painel de um token.')));
    }
    return box;
  }

  function buildHud(hud, sc, t) {
    const gm = S().gmView(), a = S().actorOf(t), st = S().state;
    const tokUpd = (patch) => S().dispatch({ type: 'token.update', sceneId: sc.id, id: t.id, patch });
    const setBars = (bars) => (t.linked && a ? S().dispatch({ type: 'actor.update', id: a.id, patch: { bars } }) : tokUpd({ bars }));
    hud.innerHTML = '';

    const sub = [a ? KIND[a.kind] : 'Token', t.hidden ? 'invisível' : t.masked ? 'vulto' : null, App.Combat.flyOf(t) > 0 ? 'voando ' + String(App.Combat.flyOf(t)).replace('.', ',') + ' m' : null, t.size && t.size !== 1 ? `${t.size}×${t.size}` : null].filter(Boolean).join(' · ');
    hud.append(h('div', { class: 'hud-top' },
      avatar({ name: t.name, color: t.color || (a && a.color), img: t.img || (a && a.img) }, 42),
      h('div', { class: 'grow' },
        gm ? h('input', { class: 'hud-name', value: t.name, title: 'Nome do token', onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); }, onchange: (e) => tokUpd({ name: e.target.value }) })
          : h('div', { class: 'hud-name' }, t.name),
        h('div', { class: 'hud-sub' }, sub))));

    const bars = U.clone(S().barsOf(t));
    if (bars.length) {
      const sec = h('div', { class: 'hud-section' });
      bars.forEach((b, i) => {
        sec.append(h('div', { class: 'hud-bar' },
          h('span', {}, b.name),
          h('input', { class: 'num', value: b.value, title: 'Digite um valor, ou +5, -7, -2d6',
            onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
            onchange: (e) => { const v = applyDelta(b.value, e.target.value); if (v == null) return; bars[i].value = v; setBars(bars); } }),
          h('span', {}, '/ ' + b.max),
          meter(b, i)));
      });
      hud.append(sec);
    }

    const conds = t.conditions || [];
    const condSec = h('div', { class: 'hud-section' });
    if (conds.length) {
      condSec.append(h('div', { class: 'chips' }, conds.map((c) => h('span', { class: 'chip', title: 'Clique para remover',
        onclick: () => tokUpd({ conditions: conds.filter((x) => x !== c) }) }, c.name + (c.rounds > 0 ? ` · ${c.rounds}` : '')))));
    }
    const rounds = h('input', { class: 'num', type: 'number', min: 0, placeholder: 'rod.', title: 'Duração em rodadas (vazio = até remover)' });
    const condSel = h('select', { class: 'grow', onchange: () => {
      let name = condSel.value;
      if (!name) return;
      if (name === '__custom') { name = (prompt('Nome da condição:') || '').trim(); if (!name) { condSel.value = ''; return; } }
      tokUpd({ conditions: [...conds.filter((c) => c.name !== name), { name, rounds: Number(rounds.value) || 0 }] });
    } }, h('option', { value: '' }, 'Adicionar condição…'), st.conditions.map((c) => h('option', { value: c }, c)), h('option', { value: '__custom' }, 'Outra…'));
    condSec.append(h('div', { class: 'row' }, condSel, rounds));
    hud.append(condSec);

    // Luz e visão (com iluminação ligada)
    if (sc.light.enabled && gm) {
      const LP = App.Light.PRESETS, li = t.light || { bright: 0, dim: 0 };
      const cur = LP.find((p) => p.bright === (Number(li.bright) || 0) && p.dim === (Number(li.dim) || 0));
      const lightSel = h('select', { class: 'grow', title: 'Luz que o token carrega (raio em quadrados: luz plena / meia luz)', value: cur ? cur.id : 'custom',
        // Trocar o modelo mantém a forma, a cor e a abertura escolhidas
        onchange: (e) => { const p = LP.find((x) => x.id === e.target.value); if (p) tokUpd({ light: p.dim ? Object.assign({}, t.light || {}, { bright: p.bright, dim: p.dim, flicker: !!p.flicker }) : null }); } },
        LP.map((p) => h('option', { value: p.id }, p.dim ? `${p.label} (${p.bright}/${p.dim})` : p.label)),
        cur ? null : h('option', { value: 'custom' }, `Personalizada (${li.bright}/${li.dim})`));
      const dvSel = h('select', { title: 'Visão no escuro (quadrados): enxerga um nível acima (escuridão vira meia luz, meia luz vira luz plena)', value: String(Number(t.darkvision) || 0), onchange: (e) => tokUpd({ darkvision: Number(e.target.value) || 0 }) },
        App.Light.DARKVISION.map(([v, l]) => h('option', { value: String(v) }, v ? 'Visão no escuro ' + l : 'Sem visão no escuro')));
      const sec = h('div', { class: 'hud-section light-row' }, h('span', { class: 'eyebrow' }, 'Luz e visão'), h('div', { class: 'row' }, ic('flame'), lightSel));
      if (Number(li.dim) > 0) {
        const lUpd = (patch) => tokUpd({ light: Object.assign({}, li, patch) });
        const cone = li.shape === 'cone';
        sec.append(
          h('div', { class: 'seg vis-seg' },
            h('button', { class: cone ? '' : 'on', onclick: () => lUpd({ shape: 'circle' }) }, ic('circle'), 'Em volta'),
            h('button', { class: cone ? 'on' : '', title: 'Lanterna: ilumina só à frente, para onde o token andou por último', onclick: () => lUpd({ shape: 'cone', angle: li.angle || 60 }) }, ic('cone'), 'Em cone')),
          cone ? h('div', { class: 'row' }, h('span', { class: 'muted small-text grow' }, 'Abertura (°)'),
            h('input', { type: 'number', class: 'num', min: 10, max: 340, step: 5, value: li.angle || 60, onchange: (e) => lUpd({ angle: U.clamp(numIn(e.target.value) || 60, 10, 340) }) })) : '',
          cone ? dirSeg(t.facing, (d) => tokUpd({ facing: d })) : '',
          colorRow(li.color || App.Light.WARM, (c) => lUpd({ color: c })),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!li.flicker, onchange: (e) => lUpd({ flicker: e.target.checked }) }), 'Tremular'));
      }
      sec.append(dvSel);
      hud.append(sec);
    } else if (!gm && t.light && t.light.shape === 'cone' && Number(t.light.dim) > 0 && S().canControl(t)) {
      // O jogador aponta a própria lanterna (andar também vira o cone para a direção do movimento)
      hud.append(h('div', { class: 'hud-section light-row' }, h('span', { class: 'eyebrow' }, 'Para onde a lanterna aponta'), dirSeg(t.facing, (d) => tokUpd({ facing: d }))));
    }

    // Ações rápidas: clique na ação e depois no alvo
    if (a && S().canControl(t) && (a.actions || []).length) {
      hud.append(h('div', { class: 'hud-section' }, h('span', { class: 'eyebrow' }, 'Ações'),
        h('div', { class: 'hud-acts' }, a.actions.map((ac, i) => {
          const meta = [reachText(Object.assign({ mode: 'roll' }, ac)), Number(ac.cost) > 0 ? ac.cost + ' ' + (ac.costBar || '') : ''].filter(Boolean).join(' · ');
          return h('button', {
            class: 'act-btn ' + (ac.mode || 'roll'), title: ac.name + '\n' + actionSummary(Object.assign({ mode: 'roll' }, ac)) + (i < 9 ? `\nAtalho: ${i + 1}` : ''),
            onclick: () => UI.useAction(a, i, t),
          }, ic(MODE_ICON[ac.mode || 'roll']), h('span', {}, ac.name), meta ? h('small', {}, meta) : null, i < 9 ? h('kbd', { class: 'act-key' }, String(i + 1)) : null);
        }))));
    }

    if (gm) hud.append(visGroupSection(sc, t));

    const inCombat = st.combat.entries.some((e) => e.tokenId === t.id);
    const maxZ = App.Board.maxZ(sc);
    const sizes = [0.5, 1, 2, 3, 4, 6, 8];
    const resize = (dir) => {
      const i = Math.max(0, sizes.indexOf(t.size || 1));
      tokUpd({ size: sizes[U.clamp(i + dir, 0, sizes.length - 1)] });
    };
    hud.append(h('div', { class: 'hud-btns' },
      a && S().ownsActor(a) && btnI('file-text', 'Ficha', { onclick: () => UI.openActor(a.id) }),
      !inCombat && btnI('hourglass', 'Iniciativa', { title: 'Adicionar ao combate e rolar iniciativa', onclick: () => addToCombat([t], true) }),
      gm && h('button', { class: 'btn', title: 'Diminuir', onclick: () => resize(-1) }, ic('minus')),
      gm && h('button', { class: 'btn', title: 'Aumentar', onclick: () => resize(1) }, ic('plus')),
      gm && h('button', { class: 'btn', title: 'Duplicar token', onclick: () => {
        const c = U.clone(t); c.id = U.uid('t_'); c.x += sc.grid; c.z = maxZ + 1;
        S().dispatch({ type: 'token.add', sceneId: sc.id, token: c }); App.Board.selected = c.id;
      } }, ic('copy-plus')),
      gm && h('button', { class: 'btn danger', title: 'Remover do mapa (Delete)', onclick: () => {
        S().dispatch({ type: 'token.delete', sceneId: sc.id, id: t.id }); App.Board.selected = null;
      } }, ic('trash-2'))));
    if (gm) hud.append(orderBtns(sc, 'token', t.id));
  }

  // =============== Combate ===============
  function entryToken(e) { const sc = S().state.scenes[e.sceneId]; return sc ? sc.tokens[e.tokenId] : null; }

  function addToCombat(tokens, roll) {
    const sc = S().currentScene(), st = S().state;
    const entries = tokens.filter((t) => !st.combat.entries.some((e) => e.tokenId === t.id))
      .map((t) => ({ id: U.uid('e_'), sceneId: sc.id, tokenId: t.id, init: null }));
    if (!entries.length) { U.toast('Nada novo para adicionar.'); return; }
    S().dispatch({ type: 'combat.add', entries });
    if (roll) setTimeout(() => rollInitiative(entries.map((e) => e.id)), S().gmView() ? 0 : 400);
  }

  function rollInitiative(ids) {
    const st = S().state, values = {}, parts = [];
    for (const e of st.combat.entries) {
      if (ids ? !ids.includes(e.id) : e.init != null) continue;
      const t = entryToken(e);
      if (!t || !S().canControl(t)) continue;
      const a = S().actorOf(t);
      try {
        const r = App.Dice.roll((a && a.initFormula) || '1d20', a ? S().vars(a, t) : {});
        values[e.id] = r.total;
        parts.push(Object.assign({}, r, { label: t.name }));
      } catch (err) { U.toast(t.name + ': ' + err.message, 'error'); }
    }
    if (!parts.length) { U.toast('Nenhuma iniciativa para rolar.'); return; }
    S().dispatch({ type: 'combat.setInit', values });
    S().dispatch({ type: 'chat.add', msg: { id: U.uid('m_'), ts: Date.now(), kind: 'roll', from: S().myName(), playerId: S().me.id, label: 'Iniciativa', parts, secret: UI.secret } });
    if (S().gmView() && !st.combat.active) S().dispatch({ type: 'combat.sort' });
  }

  function renderCombat() {
    const p = $('#p-combat');
    safeRender(p, () => {
      p.innerHTML = '';
      const st = S().state;
      if (!st) return;
      const c = st.combat, gm = S().gmView(), sc = S().currentScene();
      const D = (type, extra) => S().dispatch(Object.assign({ type }, extra));

      p.append(h('div', { class: 'combat-head' },
        h('div', { class: 'round' }, c.active ? `Rodada ${c.round}` : 'Fora de combate'),
        gm && h('div', { class: 'row' },
          c.active
            ? [iconBtn('skip-back', 'Turno anterior', () => D('combat.prev')),
              btnI('skip-forward', 'Próximo turno', { class: 'btn primary small', onclick: () => D('combat.next') }),
              h('button', { class: 'btn danger small', onclick: () => { if (confirm('Encerrar o combate?')) D('combat.end'); } }, 'Encerrar')]
            : btnI('swords', 'Iniciar combate', { class: 'btn primary small', disabled: !c.entries.length, onclick: () => D('combat.start') }))));

      const selTok = sc && App.Board.selected && sc.tokens[App.Board.selected];
      p.append(h('div', { class: 'row wrap' },
        btnI('plus', 'Token selecionado', { class: 'btn small', disabled: !selTok, title: 'Selecione um token no mapa', onclick: () => addToCombat([selTok], true) }),
        gm && btnI('users', 'Todos da cena', { class: 'btn small', disabled: !sc, onclick: () => addToCombat(Object.values(sc.tokens), false) }),
        gm && btnI('dices', 'Rolar faltantes', { class: 'btn small', onclick: () => rollInitiative(null) }),
        gm && btnI('list-ordered', 'Ordenar', { class: 'btn small', onclick: () => D('combat.sort') })));

      if (!c.entries.length) p.append(h('p', { class: 'empty' }, 'Ninguém no combate. Selecione tokens e adicione aqui, ou use o botão Iniciativa no painel do token.'));
      c.entries.forEach((e, i) => {
        const t = entryToken(e);
        if (!t || (t.hidden && !gm)) return;
        const mine = S().canControl(t), a = S().actorOf(t), veil = t.masked && !gm && !mine;
        p.append(h('div', { class: 'init-row' + (c.active && i === c.turn ? ' current' : '') },
          veil ? avatar({ name: '?', color: '#17151d' }, 30) : avatar({ name: t.name, color: t.color || (a && a.color), img: t.img || (a && a.img) }, 30),
          h('span', { class: 'name', title: 'Mostrar no mapa', onclick: () => focusToken(e, t) }, veil ? 'Vulto' : t.name,
            t.hidden ? h('span', { class: 'badge', style: { marginLeft: '6px' } }, 'invisível') : null,
            gm && t.masked ? h('span', { class: 'badge', style: { marginLeft: '6px' } }, 'vulto') : null),
          h('input', { class: 'num', value: e.init ?? '', disabled: !mine, placeholder: '—', title: 'Iniciativa',
            onchange: (ev) => D('combat.setInit', { values: { [e.id]: ev.target.value === '' ? null : Number(ev.target.value) } }) }),
          mine && iconBtn('dices', 'Rolar iniciativa', () => rollInitiative([e.id])),
          gm && iconBtn('x', 'Remover do combate', () => D('combat.remove', { id: e.id }))));
      });

      const cur = c.active && c.entries[c.turn], curTok = cur && entryToken(cur);
      if (!gm && curTok && S().canControl(curTok)) {
        p.append(btnI('flag', 'Encerrar meu turno', { class: 'btn primary big-btn', onclick: () => D('combat.next') }));
      }
      p.append(h('p', { class: 'hint' }, 'Em combate, os jogadores só movem seus tokens na própria vez. Condições com duração diminuem no início do turno do token.'));
    });
  }

  function checkMyTurn() {
    const st = S().state;
    if (!st || S().gmView()) return;
    const c = st.combat, e = c.active && c.entries[c.turn];
    const key = e ? c.round + ':' + c.turn + ':' + e.tokenId : '';
    if (key === UI.turnKey) return;
    UI.turnKey = key;
    const t = e && entryToken(e);
    if (t && S().canControl(t)) U.toast(`Sua vez, ${t.name}`, 'turn', 4000);
  }

  // =============== Configurar cena (mestre) ===============
  // Configuração da cobertura da cena (edita o objeto c no lugar; salva junto com a cena)
  function coverSection(c) {
    const n = (obj, k, attrs) => h('input', Object.assign({ type: 'number', value: obj[k], oninput: (e) => { obj[k] = Math.max(0, Number(e.target.value) || 0); } }, attrs));
    // Plano 40: as alturas aparecem e são digitadas na unidade de quem edita (guardadas em metros)
    const nm = (obj, k, attrs) => h('input', Object.assign({ type: 'number', value: App.Units.distIn(obj[k]), oninput: (e) => { obj[k] = Math.max(0, App.Units.distOut(e.target.value)); } }, attrs));
    const na = (t) => h('span', { class: 'na' }, t);
    return h('div', { class: 'full col', style: { gap: '10px' } },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.enabled, onchange: (e) => { c.enabled = e.target.checked; } }), 'Muros dão cobertura pela altura nesta cena (desligado: a total bloqueia tudo e ¾ e meia não fazem nada)'),
      h('div', { class: 'cover-grid' },
        h('span', { class: 'ch' }, 'Tipo'), h('span', { class: 'ch' }, 'Altura (' + App.Units.distUnit() + ')'), h('span', { class: 'ch' }, 'Sombra (quad.)'), h('span', { class: 'ch' }, 'Cobre a partir de'), h('span', { class: 'ch' }, 'Bônus'),
        h('span', {}, h('i', { class: 'wt-line wt-full', style: { display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' } }), 'Absoluta'),
        na('telhado'), na('toda'), na('sempre'), na('não é alvo'),
        h('span', {}, h('i', { class: 'wt-line wt-high', style: { display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' } }), 'Total'),
        nm(c.heights, 'high', { step: 0.1, min: 0 }), n(c.shadow, 'high', { min: 0, max: 20 }), na('pela altura'), na('pela altura'),
        h('span', {}, h('i', { class: 'wt-line wt-three', style: { display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' } }), 'Três quartos'),
        nm(c.heights, 'three', { step: 0.1, min: 0 }), n(c.shadow, 'three', { min: 0, max: 20 }), n(c.levels, 'three', { min: 1, max: 99 }), n(c.bonus, 'three', { min: 0, max: 20 }),
        h('span', {}, h('i', { class: 'wt-line wt-half', style: { display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' } }), 'Meia'),
        nm(c.heights, 'half', { step: 0.1, min: 0 }), n(c.shadow, 'half', { min: 0, max: 20 }), n(c.levels, 'half', { min: 1, max: 99 }), n(c.bonus, 'half', { min: 0, max: 20 })),
      h('p', { class: 'cover-note', style: { margin: 0 } }, 'Parede absoluta é uma casa com telhado: nunca deixa ver nem atacar o outro lado, seja qual for a altura. Nas outras paredes, a proteção é a altura do muro dividida pela altura do alvo (campo Altura na ficha; sem ele, 1,8 m por quadrado de tamanho). Cobrindo 100% ou mais, o alvo não pode ser atacado. O bônus soma na Defesa e nos testes de resistência. Quem não é mais alto que o muro não enxerga nem ataca por cima dele. Ex.: muro de 1,4 m cobre 78% de um humano (1,8 m) e dá o bônus de três quartos; para um gigante de 3,6 m cobre só 39%, nada.'),
      h('label', {}, 'Quem está na sombra de um muro baixo aparece para os jogadores como', h('select', { value: c.show, onchange: (e) => { c.show = e.target.value; } },
        h('option', { value: 'show' }, 'Normal (sempre visível)'), h('option', { value: 'silhouette' }, 'Vulto (sem nome nem vida)'), h('option', { value: 'hide' }, 'Escondido'))),
      h('p', { class: 'cover-note', style: { margin: 0 } }, 'Sombra = quantos quadrados atrás do muro alguém fica fora de vista para quem olha do outro lado. Cada ficha pode ter a própria regra (aba Config da ficha).'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.lean, onchange: (e) => { c.lean = e.target.checked; } }), 'Quem está encostado no muro ataca por cima dele (o muro não protege o alvo)'));
  }

  function sceneSettings(id) {
    const sc = S().state.scenes[id];
    if (!sc) return;
    const f = U.clone(sc);
    f.cover = App.Combat.coverCfg(f);
    let bgInfo = null;
    const num = (key, attrs = {}) => h('input', Object.assign({ type: 'number', value: f[key], oninput: (e) => { f[key] = Number(e.target.value); } }, attrs));
    const pxInput = h('input', { type: 'number', value: 70, min: 10 });
    const bgLabel = h('span', { class: 'muted small-text' }, f.bg ? 'Imagem definida' : 'Sem imagem');
    const fitRow = h('div', { class: 'full row wrap', hidden: true },
      h('span', { class: 'small-text muted' }, 'Pixels por quadrado na imagem original:'), pxInput,
      h('button', { class: 'btn small', onclick: () => {
        if (!bgInfo) return;
        const px = Math.max(10, Number(pxInput.value) || 70);
        f.cols = Math.max(1, Math.round(bgInfo.ow / px)); f.rows = Math.max(1, Math.round(bgInfo.oh / px));
        colsIn.value = f.cols; rowsIn.value = f.rows;
      } }, 'Ajustar tamanho da cena'));
    const colsIn = num('cols', { min: 1, max: 300 }), rowsIn = num('rows', { min: 1, max: 300 });

    const body = h('div', { class: 'form' },
      h('label', { class: 'full' }, 'Nome', h('input', { value: f.name, oninput: (e) => { f.name = e.target.value; } })),
      h('div', { class: 'full row wrap' },
        btnI('image', 'Enviar mapa…', { onclick: async () => {
          const r = await App.Images.pick(App.Images.MAP);
          if (!r) return;
          f.bg = r.id; bgInfo = r;
          bgLabel.textContent = `Imagem ${r.ow}×${r.oh}px`;
          fitRow.hidden = false;
          const px = Number(pxInput.value) || 70;
          f.cols = Math.max(1, Math.round(r.ow / px)); f.rows = Math.max(1, Math.round(r.oh / px));
          colsIn.value = f.cols; rowsIn.value = f.rows;
        } }),
        h('button', { class: 'btn', onclick: () => { f.bg = null; bgLabel.textContent = 'Sem imagem'; fitRow.hidden = true; } }, 'Remover'),
        bgLabel),
      fitRow,
      h('label', {}, 'Largura (quadrados)', colsIn),
      h('label', {}, 'Altura (quadrados)', rowsIn),
      h('label', {}, 'Tamanho do quadrado (px)', num('grid', { min: 20, max: 300 })),
      h('label', {}, 'Medida da diagonal', h('select', { value: f.measure, onchange: (e) => { f.measure = e.target.value; } },
        h('option', { value: 'cheb' }, 'Diagonal = 1 (D&D 5e)'), h('option', { value: 'alt' }, 'Alternada 1-2-1 (Pathfinder)'), h('option', { value: 'euclid' }, 'Real (euclidiana)'))),
      h('label', { title: 'A unidade é a da mesa (Mesa → Unidade de medida); cada um pode ver na sua' }, 'Cada quadrado vale (' + App.Units.distUnit() + ')',
        h('input', { type: 'number', step: App.Units.distUnit() === 'pés' ? 5 : 0.5, min: 0, value: App.Units.distIn(f.cellDist), oninput: (e) => { f.cellDist = App.Units.distOut(e.target.value); } })),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.showGrid, onchange: (e) => { f.showGrid = e.target.checked; } }), 'Mostrar grid'),
      h('label', {}, 'Cor e opacidade do grid', h('div', { class: 'row' },
        h('input', { type: 'color', value: U.safeColor(f.gridColor, '#ffffff'), oninput: (e) => { f.gridColor = e.target.value; } }),
        h('input', { type: 'range', class: 'grow', min: 0.05, max: 1, step: 0.05, value: f.gridAlpha, oninput: (e) => { f.gridAlpha = Number(e.target.value); } }))),
      h('label', {}, 'Cor do piso (sem imagem)', h('input', { type: 'color', value: U.safeColor(f.bgColor, '#3a3934'), oninput: (e) => { f.bgColor = e.target.value; } })),
      h('h4', { class: 'full' }, 'Iluminação'),
      h('label', { class: 'check full' }, h('input', { type: 'checkbox', checked: f.light.enabled, onchange: (e) => { f.light.enabled = e.target.checked; } }), 'Luz e visão dinâmicas (paredes bloqueiam a visão)'),
      h('label', {}, 'Ambiente', h('select', { value: f.light.global ? 'day' : 'night', onchange: (e) => { f.light.global = e.target.value === 'day'; } },
        h('option', { value: 'day' }, 'Claro (dia)'), h('option', { value: 'night' }, 'Escuro (noite, masmorra)'))),
      h('div', { class: 'row', style: { alignSelf: 'end' } },
        h('button', { class: 'btn small', onclick: () => { const w = App.Light.wallsFromDrawings(S().state.scenes[id]); if (w.length) { S().dispatch({ type: 'wall.add', sceneId: id, walls: w }); U.toast(w.length + ' paredes criadas'); } else U.toast('Não há desenhos nesta cena.'); } }, 'Paredes dos desenhos'),
        h('button', { class: 'btn small danger', onclick: () => { if (confirm('Apagar todas as paredes e portas desta cena?')) S().dispatch({ type: 'wall.clear', sceneId: id }); } }, 'Apagar paredes')),
      h('h4', { class: 'full' }, 'Cobertura e muros'),
      coverSection(f.cover),
      h('h4', { class: 'full' }, 'Névoa de guerra'),
      h('label', { class: 'check full' }, h('input', { type: 'checkbox', checked: f.fog.enabled, onchange: (e) => { f.fog.enabled = e.target.checked; } }), 'Ativar névoa nesta cena (revele e esconda áreas com as ferramentas de sol e nuvem)'),
      h('div', { class: 'full row wrap' },
        h('button', { class: 'btn small', onclick: () => { S().dispatch({ type: 'fog.reset', sceneId: id, reveal: false }); U.toast('Cena toda coberta'); } }, 'Cobrir tudo'),
        h('button', { class: 'btn small', onclick: () => { S().dispatch({ type: 'fog.reset', sceneId: id, reveal: true }); U.toast('Cena toda revelada'); } }, 'Revelar tudo'),
        h('button', { class: 'btn small danger', onclick: () => { if (confirm('Apagar todos os desenhos desta cena?')) S().dispatch({ type: 'drawing.clear', sceneId: id }); } }, 'Apagar desenhos')),
    );

    UI.modal('Configurar cena', body, [
      { label: 'Cancelar' },
      { label: 'Salvar', primary: true, onclick: () => {
        const cur = S().state.scenes[id];
        if (!cur) return;
        const patch = {
          name: f.name.trim() || cur.name, cols: U.clamp(Math.round(f.cols) || 1, 1, 300), rows: U.clamp(Math.round(f.rows) || 1, 1, 300),
          grid: U.clamp(Math.round(f.grid) || 70, 20, 300), measure: f.measure, cellDist: Math.round((Number(f.cellDist) || 0) * 1000) / 1000, unit: 'm',
          showGrid: f.showGrid, gridColor: f.gridColor, gridAlpha: f.gridAlpha, bgColor: f.bgColor, bg: f.bg,
          fog: Object.assign({}, cur.fog, { enabled: f.fog.enabled, v: cur.fog.v + 1 }),
          light: { enabled: !!f.light.enabled, global: !!f.light.global },
          cover: App.Combat.coverCfg(f),
        };
        S().dispatch({ type: 'scene.update', id, patch });
      } },
    ]);
  }

  // =============== Mesa (conexão, salvar, importar) ===============
  // =============== Unidade de medida (Plano 40) ===============
  // O mestre escolhe a da mesa inteira; cada pessoa pode trocar a sua (só na tela dela, guardada no navegador)
  function unitsSection(gm) {
    const Un = App.Units, T = Un.table(), mine = Un.mine();
    const after = () => { UI.refresh(); App.Board.requestRender(); renderTable(); };
    const grid = (cur, onPick, prefix) => h('div', { class: 'unit-grid' }, Un.CATS.map(([k, label, opts]) =>
      h('label', { class: 'unit-card' }, h('b', {}, label),
        h('select', { 'data-unit': prefix + k, value: cur[k], onchange: (e) => onPick(k, e.target.value) }, opts.map(([v, l]) => h('option', { value: v }, l))))));
    const box = h('div', { class: 'units-sec', id: 'units-sec' }, h('h4', {}, 'Unidade de medida'));
    if (gm) box.append(h('p', { class: 'hint', style: { marginTop: 0 } }, 'Vale para a mesa inteira: régua, rastro, escala das cenas e alturas. Cada jogador pode trocar a dele.'),
      grid(T, (k, v) => S().dispatch({ type: 'campaign.update', patch: { rules: { units: Object.assign({}, T, { [k]: v }) } } }), 'mesa-'));
    else box.append(h('p', { class: 'hint', style: { marginTop: 0 } }, 'Da mesa: ' + Un.CATS.map(([k, , opts]) => opts.find(([v]) => v === T[k])[1]).join(', ') + '.'));
    box.append(h('label', { class: 'check', title: 'Só a sua tela muda; os outros continuam vendo na unidade deles' },
      h('input', { type: 'checkbox', 'data-unit': 'same', checked: !mine, onchange: (e) => { Un.setMine(e.target.checked ? null : T); after(); } }), 'Na minha tela, usar as da mesa'));
    if (mine) box.append(h('span', { class: 'eyebrow', style: { display: 'block', marginTop: '10px' } }, 'Só na minha tela'), grid(Object.assign({}, T, mine), (k, v) => { Un.setMine(Object.assign({}, Un.mine(), { [k]: v })); after(); }, 'minha-'));
    return box;
  }

  let resolutionControl;
  function renderTable() {
    const p = $('#p-table');
    safeRender(p, () => {
      if (resolutionControl) { void unmount(resolutionControl); resolutionControl = null; }
      p.innerHTML = '';
      const st = S().state, gm = S().gmView(), N = App.Net;
      if (!st) { p.append(h('p', { class: 'muted' }, 'Conectando à mesa…')); return; }

      p.append(h('h4', { style: { marginTop: 0 } }, 'Conexão'));
      if (S().role === 'gm' && N.isOnline()) {
        p.append(h('div', { class: 'row wrap' },
          h('span', { class: 'muted' }, 'Código'), h('b', { style: { fontSize: '18px', letterSpacing: '.2em', fontFamily: 'var(--mono)' } }, N.code),
          h('span', { class: 'grow' }),
          btnI('copy', 'Código', { class: 'btn small', onclick: () => U.copy(N.code) }),
          btnI('link', 'Link', { class: 'btn small', onclick: () => U.copy(N.inviteLink()) })));
      } else if (S().role === 'player') {
        p.append(h('p', { style: { margin: 0 } }, 'Conectado à mesa ', h('b', {}, N.code), ' como ', h('b', {}, S().me.name)));
      } else {
        p.append(h('p', { class: 'muted', style: { margin: 0 } }, 'Mesa offline: só você vê. Recarregue a página e escolha "Abrir mesa online" para jogar com os amigos.'));
      }

      p.append(h('h4', {}, 'Jogadores'));
      const online = new Set(S().online);
      if (st.gm) p.append(h('div', { class: 'player-item' }, h('span', { class: 'online-dot on' }), h('b', { style: { color: U.safeColor(st.gm.color) } }, st.gm.name), h('span', { class: 'badge gold' }, 'Mestre')));
      const players = Object.entries(st.players);
      for (const [pid, pl] of players) {
        p.append(h('div', { class: 'player-item' }, h('span', { class: 'online-dot' + (online.has(pid) ? ' on' : '') }),
          h('span', { style: { color: U.safeColor(pl.color) } }, pl.name), pid === S().me.id ? h('span', { class: 'badge blue' }, 'você') : null));
      }
      if (!players.length) p.append(h('p', { class: 'empty' }, 'Nenhum jogador entrou ainda.'));

      p.append(unitsSection(gm));
      const display = h('div', { style: { margin: '12px 0' } });
      p.append(display);
      resolutionControl = mount(BoardResolution, { target: display, props: { onresize: () => App.Board.resize() } });

      if (!gm) {
        p.append(h('p', { class: 'hint' }, 'Tudo é salvo pelo mestre. Para guardar sua ficha, abra-a e use Configurar → Exportar.'));
        return;
      }

      p.append(h('h4', {}, 'Campanha'));
      p.append(h('label', { class: 'sheet-meta', style: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--muted)', marginTop: 0 } }, 'Nome da campanha',
        h('input', { value: st.name, onchange: (e) => S().dispatch({ type: 'campaign.update', patch: { name: e.target.value } }) })));
      p.append(h('p', { class: 'hint', id: 'saved-at' }, App.Storage.lastSaved ? 'Salvo às ' + U.fmtTime(App.Storage.lastSaved) : 'Salvamento automático no navegador ativo.'));
      p.append(h('div', { class: 'row wrap' },
        btnI('download', 'Exportar .json', { class: 'btn primary small', onclick: () => App.Storage.downloadJSON(App.Storage.campaignBundle(true), st.name) }),
        btnI('copy', 'Código de texto', { class: 'btn small', onclick: () => codeDialog() }),
        btnI('upload', 'Importar', { class: 'btn small', onclick: () => UI.importDialog() })));
      p.append(h('p', { class: 'hint' }, 'O arquivo .json contém tudo (cenas, fichas e imagens em WebP). Guarde como backup ou envie para outra pessoa abrir como mestre.'));

      p.append(h('h4', {}, 'Regras automáticas'));
      const R = st.rules || {};
      const setR = (k, v) => S().dispatch({ type: 'campaign.update', patch: { rules: { [k]: v } } });
      const chk = (k, label) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!R[k], onchange: (e) => setR(k, e.target.checked) }), label);
      p.append(
        h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--muted)' } }, 'Acerto crítico', h('select', { value: R.critMode, onchange: (e) => setR('critMode', e.target.value) },
          h('option', { value: 'dice' }, 'Dobra os dados de dano'), h('option', { value: 'double' }, 'Dobra o dano total'), h('option', { value: 'none' }, 'Sem crítico'))),
        chk('critHits', 'Crítico sempre acerta'),
        chk('nat1Miss', '1 natural no d20 sempre erra'),
        chk('minZero', 'Barras não ficam negativas'),
        chk('actOnTurn', 'Em combate, jogador só usa ações na própria vez'),
        chk('hideNumbers', 'Esconder Defesa e PV dos monstros dos jogadores'),
        h('label', { class: 'row', style: { gap: '8px', fontSize: '12.5px' }, title: 'Depois de mover, o caminho fica no mapa para todos verem por onde o token passou' },
          h('span', { class: 'grow' }, 'Rastro do movimento (segundos, 0 = não mostra)'),
          h('input', { type: 'number', class: 'num', min: 0, max: 30, step: 1, value: R.trailSecs ?? 3, onchange: (e) => setR('trailSecs', U.clamp(Math.round(Number(e.target.value) || 0), 0, 30)) })),
        h('label', { class: 'row', style: { gap: '8px', fontSize: '12.5px' }, title: 'Em tempo real: todos veem a régua e o caminho do token enquanto a pessoa mede ou arrasta; a luz e a visão do token acompanham o arraste.\nDesempenho: só quando ela solta (manda menos coisa pela rede); durante o arraste a luz e a visão ficam onde o token estava.' },
          h('span', { class: 'grow' }, 'Régua e movimento dos outros'),
          h('select', { value: R.liveRuler ? 'live' : 'perf', onchange: (e) => setR('liveRuler', e.target.value === 'live') },
            h('option', { value: 'perf' }, 'Desempenho (ao soltar)'), h('option', { value: 'live' }, 'Em tempo real'))),
        h('label', { class: 'row', style: { gap: '8px', fontSize: '12.5px' }, title: 'O que já foi visto fica no mapa, escurecido. Liga por cena em Iluminação.' },
          h('span', { class: 'grow' }, 'Memória de exploração'),
          h('select', { value: R.exploreMode === 'player' ? 'player' : 'group', onchange: (e) => setR('exploreMode', e.target.value) },
            h('option', { value: 'group' }, 'Do grupo (o que um viu, todos lembram)'), h('option', { value: 'player' }, 'De cada jogador'))));

      // Lista editável em etiquetas: × remove, o campo embaixo adiciona (Enter ou vírgula; dá para colar "A, B, C")
      const tagList = (key, ph) => {
        const cur = () => (S().state[key] || []).slice();
        const save = (list) => S().dispatch({ type: 'campaign.update', patch: { [key]: list } });
        const inp = h('input', { class: 'tag-add-in', placeholder: ph, maxlength: 40 });
        const add = () => {
          const have = cur(), slugs = new Set(have.map((x) => U.slug(x)));
          const novos = inp.value.split(',').map((x) => x.trim()).filter((x) => x && !slugs.has(U.slug(x)) && slugs.add(U.slug(x)));
          inp.value = '';
          if (novos.length) save(have.concat(novos));
          setTimeout(() => { const n = document.querySelector(`.tag-edit[data-key="${key}"] .tag-add-in`); if (n) n.focus(); });
        };
        inp.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } };
        return h('div', { class: 'tag-edit', 'data-key': key },
          h('div', { class: 'tag-list' }, ...cur().map((name, i) => h('span', { class: 'ltag' }, name,
            h('button', { class: 'tag-x', title: 'Remover ' + name, onclick: () => { const l = cur(); l.splice(i, 1); save(l); } }, ic('x'))))),
          h('div', { class: 'tag-add' }, inp, h('button', { class: 'btn small', onclick: add }, ic('plus'), 'Adicionar')));
      };
      p.append(h('h4', {}, 'Atributos da campanha'));
      p.append(h('p', { class: 'hint' }, 'As fichas e as ações escolhem desta lista, então todo mundo usa o mesmo nome.'));
      p.append(tagList('attrs', 'Novo atributo, ex.: Carisma'));
      p.append(h('h4', {}, 'Barras da campanha'));
      p.append(h('p', { class: 'hint' }, 'Vida, Mana, Sanidade… Personagens novos ganham todas; criaturas, só a primeira.'));
      p.append(tagList('barNames', 'Nova barra, ex.: Sanidade'));
      p.append(h('h4', {}, 'Condições disponíveis'));
      p.append(tagList('conditions', 'Nova condição, ex.: Atordoado'));

      p.append(h('h4', {}, 'Zona de perigo'));
      p.append(h('button', { class: 'btn danger small', onclick: () => {
        if (!confirm('Começar uma campanha nova? A atual será substituída (exporte antes se quiser guardar).')) return;
        const st2 = S().newCampaign();
        st2.gm = st.gm; st2.players = st.players;
        replaceCampaign(st2, {});
      } }, 'Nova campanha'));
    });
  }

  function replaceCampaign(state, assets) {
    const S_ = S();
    state = S_.migrate(state);
    state.gm = { id: S_.me.id, name: S_.me.name, color: S_.me.color };
    S_.viewSceneId = null;
    App.Board.selected = null;
    S_.setState(state, { ...referencedAssets(state, S_.assets), ...assets }, true);
    App.Net.broadcastFull();
    App.Storage.save();
  }

  async function codeDialog() {
    const ta = h('textarea', { rows: 8, readonly: true, value: 'Gerando…' });
    const info = h('p', { class: 'hint' });
    const withImg = h('input', { type: 'checkbox', checked: true });
    let generation = 0, ready = false;
    const gen = async () => {
      const current = ++generation;
      ready = false;
      ta.value = 'Gerando…';
      try {
        const code = await App.Storage.toCode(await App.Storage.campaignBundle(withImg.checked));
        if (current !== generation) return;
        ta.value = code;
        ready = true;
        info.textContent = `${U.fmtSize(code.length)} de texto` + (code.length > 2e6 ? '. Grande demais para colar em chat: prefira o arquivo .json.' : '');
      } catch (e) { if (current === generation) ta.value = 'Não consegui gerar o código: ' + e.message; }
    };
    withImg.onchange = gen;
    UI.modal('Código da campanha', h('div', { class: 'col' },
      h('p', { class: 'muted', style: { margin: 0 } }, 'Copie este texto e guarde num bloco de notas, ou envie para alguém. Para restaurar: menu ⋯ → Importar.'),
      h('label', { class: 'check' }, withImg, 'Incluir imagens (deixa o código bem maior)'),
      ta, info), [
      { label: 'Fechar' },
      { label: 'Copiar', primary: true, onclick: () => { if (ready) U.copy(ta.value); return false; } },
    ]);
    gen();
  }

  UI.importDialog = function () {
    let fileText = null;
    const ta = h('textarea', { rows: 6, placeholder: 'Cole aqui um código MESARPG1… ou o conteúdo de um .json' });
    const fname = h('span', { class: 'muted small-text' });
    UI.modal('Importar', h('div', { class: 'col' },
      h('p', { class: 'muted', style: { margin: 0 } }, S().gmView() ? 'Campanha completa, cena ou ficha (arquivo .json ou código de texto).' : 'Importe uma ficha exportada (.json).'),
      h('div', { class: 'row' }, btnI('folder-open', 'Escolher arquivo…', { onclick: async () => {
        const f = await U.pickFile('.json,application/json,text/plain');
        if (!f) return;
        fileText = await f.text();
        fname.textContent = `${f.name} (${U.fmtSize(f.size)})`;
        ta.value = ''; ta.disabled = true;
      } }), fname),
      ta), [
      { label: 'Cancelar' },
      { label: 'Importar', primary: true, onclick: async () => {
        try { await applyImport(await App.Storage.parse(fileText || ta.value)); }
        catch (e) { U.toast(e.message, 'error'); return false; }
      } },
    ]);
  };

  UI.applyImport = (obj) => applyImport(obj);
  UI.importParsed = (obj) => applyImport(obj);
  async function applyImport(obj) {
    const S_ = S(), gm = S_.isGM();
    const addAssets = (assets) => {
      for (const [id, data] of Object.entries(assets || {})) {
        if (!/^img_[0-9a-f]{16}$/.test(id) || typeof data !== 'string' || S_.assets[id]) continue;
        setAsset(S_.assets, id, data);
        App.Net.sendAsset(id, S_.assets[id]);
      }
    };
    if (obj.format === 'mesarpg') {
      if (!gm) throw new Error('Só o mestre pode importar uma campanha.');
      // Plano 33: vira uma história nova (recomendado) ou substitui a aberta
      const how = await new Promise((res) => UI.modal('Importar campanha', h('div', {},
        h('p', { style: { margin: '0 0 8px' } }, 'Campanha "' + ((obj.state && obj.state.name) || 'sem nome') + '".'),
        h('p', { class: 'hint', style: { margin: 0 } }, 'Nova história: a atual continua guardada e esta abre no lugar. Substituir: a história aberta vira esta (exporte antes, se quiser guardar).')), [
        { label: 'Cancelar', onclick: () => res(null) },
        { label: 'Substituir a atual', onclick: () => res('replace') },
        { label: 'Criar história nova', primary: true, onclick: () => res('new') },
      ]));
      if (!how) throw new Error('Importação cancelada');
      if (how === 'new' && !new URLSearchParams(location.search).has('tutorial')) {
        await App.Storage.save();
        App.Storage.currentId = await App.Storage.createStory((obj.state && obj.state.name) || 'História importada', S().migrate(U.clone(obj.state)), obj.assets || {});
        try { localStorage.setItem('vesper.story', App.Storage.currentId); } catch { /* */ }
      }
      replaceCampaign(obj.state, obj.assets || {});
      U.toast(how === 'new' ? 'Campanha importada como história nova!' : 'Campanha importada!');
    } else if (obj.format === 'mesarpg-scene') {
      if (!gm) throw new Error('Só o mestre pode importar cenas.');
      addAssets(obj.assets);
      for (const a of Object.values(obj.actors || {})) if (!S_.state.actors[a.id]) { if (!a.sistema && a.dados5e && App.Bestiary && App.Bestiary.upgrade) App.Bestiary.upgrade(a); S_.dispatch({ type: 'actor.add', actor: a }); }
      // Plano 31: a principal vem com as sub-cenas; ids novos e os portais entre elas apontam para as cópias
      const list = [obj.scene].concat(Array.isArray(obj.subs) ? obj.subs : []), map = {};
      for (const x of list) map[x.id] = U.uid('s_');
      const made = list.map((x, k) => {
        const sc = Object.assign(S_.newScene(), U.clone(x));
        sc.id = map[x.id];
        if (k === 0) delete sc.parent; else sc.parent = map[obj.scene.id];
        for (const tr of sc.triggers || []) for (const a of tr.actions || []) if (a.type === 'teleport' && a.sceneId) a.sceneId = map[a.sceneId] || (S_.state.scenes[a.sceneId] ? a.sceneId : null);
        return sc;
      });
      for (const sc of made) S_.dispatch({ type: 'scene.add', scene: sc });
      S_.viewSceneId = made[0].id;
      U.toast(made.length > 1 ? 'Cena importada com ' + (made.length - 1) + (made.length === 2 ? ' sub-cena!' : ' sub-cenas!') : 'Cena importada!');
    } else if (obj.format === 'mesarpg-actor') {
      addAssets(obj.assets);
      const a = U.clone(obj.actor);
      a.id = U.uid('ac_');
      a.owner = gm ? (a.kind === 'pc' ? 'all' : '') : S_.me.id;
      if (!a.sistema && a.dados5e && App.Bestiary && App.Bestiary.upgrade) App.Bestiary.upgrade(a); // Plano 53
      S_.dispatch({ type: 'actor.add', actor: a });
      UI.openActor(a.id);
      U.toast('Ficha importada!');
    } else throw new Error('Formato desconhecido: ' + obj.format);
  }

  // =============== Modal ===============
  UI.modal = function (title, body, buttons = [{ label: 'OK', primary: true }]) {
    const back = h('div', { class: 'modal-back' });
    const close = () => back.remove();
    const foot = h('div', { class: 'modal-foot' }, buttons.map((b) => h('button', {
      class: 'btn' + (b.primary ? ' primary' : ''),
      onclick: async () => { const r = b.onclick ? await b.onclick() : undefined; if (r !== false) close(); },
    }, b.label)));
    back.append(h('div', { class: 'modal' }, h('div', { class: 'modal-head' }, title), h('div', { class: 'modal-body' }, body), foot));
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    $('#modal-root').append(back);
    return close;
  };

  App.UI = UI;
})(window.App);
