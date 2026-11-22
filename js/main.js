'use strict';
import { binaryAsset, ImageUrls } from '../src/services/image-assets.ts';
/* Tela inicial: escolher entre abrir a mesa (mestre) ou entrar (jogador). */
(function (App) {
  const { U } = App;
  const $ = (s) => document.querySelector(s);
  const ROOM_KEY = 'mesarpg.room', ME_KEY = 'mesarpg.me', PASS_KEY = 'mesarpg.roompass';
  // Senha da mesa do mestre: guardada só neste navegador, fora do estado da mesa e da exportação
  function loadRoomPass() { try { return localStorage.getItem(PASS_KEY) || ''; } catch { return ''; } }
  App.saveRoomPass = (pass) => {
    App.Net.password = String(pass || '');
    try { if (App.Net.password) localStorage.setItem(PASS_KEY, App.Net.password); else localStorage.removeItem(PASS_KEY); } catch { /* */ }
  };

  function loadMe() {
    let me = null;
    try { me = JSON.parse(localStorage.getItem(ME_KEY)); } catch { /* */ }
    if (!me || !me.id) me = { id: U.uid('p_'), name: '', color: U.randColor() };
    return me;
  }
  function saveMe(me) { try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch { /* */ } }

  // required = false: sem nome, usa "Mestre" (preparar o tabuleiro sozinho não precisa de nome)
  function readName(required = true) {
    let name = $('#lb-name').value.trim();
    if (!name && required) {
      U.toast('Escreva seu nome no canto de cima: é assim que os outros vão te ver.', 'error');
      const p = $('.mn-profile');
      p.classList.remove('need'); void p.offsetWidth; p.classList.add('need');
      $('#lb-name').focus();
      return null;
    }
    name = name || 'Mestre';
    App.Store.me.name = name.slice(0, 40);
    saveMe(App.Store.me);
    return name;
  }

  // Abre a história escolhida na tela de Histórias (Plano 33)
  async function startGM(online, then) {
    if (!readName(online)) return;
    const S = App.Store;
    S.role = 'gm';
    const saved = await App.Storage.load();
    const st = saved && saved.state ? S.migrate(saved.state) : S.newCampaign();
    $('#st-screen').hidden = true;
    st.gm = { id: S.me.id, name: S.me.name, color: S.me.color };
    S.setState(st, saved?.assets, true);
    App.UI.start();
    lobbyUrls.clear();
    cardUrls.clear();
    Stories.list = [];
    $('#st-grid').replaceChildren();
    if (saved) U.toast('Campanha "' + st.name + '" carregada.');
    if (!online) { S.role = 'offline'; App.UI.setNetStatus('', 'Offline (local)'); if (then) then(); return; }
    await hostWithRetry();
  }

  // Plano 56: código novo a cada mesa aberta. Fica só na aba (sessionStorage), para recarregar a página
  // sem derrubar os jogadores; fechar a aba ou abrir outra mesa gera outro.
  async function hostWithRetry() {
    let code = null;
    try { localStorage.removeItem(ROOM_KEY); } catch { /* */ } // código antigo, fixo, de antes do Plano 56
    try { code = sessionStorage.getItem(ROOM_KEY); } catch { /* */ }
    if (!code || code.length !== 32) code = App.Net.genCode();
    App.Net.password = loadRoomPass();
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await App.Net.host(code);
        try { sessionStorage.setItem(ROOM_KEY, code); } catch { /* */ }
        U.toast('Mesa aberta. Copie o código ou o link no painel Mesa.', 'info', 5000);
        return;
      } catch (e) {
        if (e && e.type === 'unavailable-id') {
          // Código ainda preso da sessão anterior (recarregou a página): espera um pouco
          if (attempt < 3) { App.UI.setNetStatus('connecting', 'Liberando o código…'); await U.sleep(3000); continue; }
          code = App.Net.genCode();
          continue;
        }
        console.error(e);
        App.UI.setNetStatus('error', 'Sem conexão — modo local');
        U.toast('Não foi possível abrir a mesa online: ' + (e.message || e.type), 'error', 6000);
        return;
      }
    }
    App.UI.setNetStatus('error', 'Falha ao abrir a mesa');
  }

  function startPlayer() {
    if (!readName()) return;
    const code = $('#lb-code').value.trim();
    if (!code) { U.toast('Digite o código da mesa.', 'error'); $('#lb-code').focus(); return; }
    App.Net.pass = $('#lb-pass').value;
    App.Store.role = 'player';
    App.UI.start();
    lobbyUrls.clear();
    App.Net.join(code);
  }

  // Tutorial: mesa offline com campanha de demonstração, sem salvar nada
  function startTutorial() {
    const S = App.Store;
    if (!S.me.name) S.me.name = 'Você';
    S.role = 'offline';
    App.Storage.save = async () => {};
    App.Storage.autosave = () => {};
    S.setState(App.Tutorial.demoState());
    App.UI.start();
    App.UI.setNetStatus('', 'Modo tutorial · nada é salvo');
    document.getElementById('btn-help').hidden = true;
    document.title = 'Tutorial · Vésper';
    App.Tutorial.start();
  }

  // ================= Menu de jogo =================
  const BG_KEY = 'vespera.menu-bg';
  const lobbyUrls = new ImageUrls(), cardUrls = new ImageUrls();
  let backgroundRevision = 0, cardRevision = 0;
  let list = null; // a lista visível (#mn-root ou #mn-play)

  const items = () => [...list.querySelectorAll('.mn-item')];
  function select(el, focus) {
    for (const it of document.querySelectorAll('#lobby .mn-item')) it.classList.toggle('sel', it === el);
    if (!el) return;
    $('#mn-desc').innerHTML = el.dataset.desc || '';
    if (focus) el.focus({ preventScroll: true });
  }
  function showList(id, focusEl) {
    for (const l of document.querySelectorAll('#lobby .mn-list')) l.hidden = l.id !== id;
    list = $('#' + id);
    if (id !== 'mn-play') $('#mn-join').hidden = true;
    select(focusEl || items()[0], true);
  }
  function openJoin() {
    $('#mn-join').hidden = false;
    select($('#lb-join-open'));
    $('#lb-code').focus();
  }

  function onKey(e) {
    if ($('#lobby').hidden) return;
    if (storiesKey(e)) return;
    const inField = e.target instanceof Element && e.target.matches('input');
    if (e.key === 'Escape') {
      if (!$('#mn-join').hidden) { $('#mn-join').hidden = true; select($('#lb-join-open'), true); }
      else if (list.id !== 'mn-root') showList('mn-root', $('[data-sub="mn-play"]'));
      else if (inField) e.target.blur();
      return;
    }
    if (inField || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    e.preventDefault();
    const all = items(), cur = all.indexOf(document.querySelector('#lobby .mn-item.sel'));
    const next = (cur + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length;
    select(all[next], true);
  }

  // ---------- Fundo vivo ----------
  // Janelas acesas da imagem padrão, em pixels de uma escala 1024×572 (vale para imgHomeHD.jpg, mesma proporção) e o tamanho do brilho
  const WINDOWS = [[813, 267, 0.9], [822, 280, 0.8], [815, 292, 1.6], [815, 315, 1.6], [738, 307, 1.4], [736, 326, 0.8],
    [758, 327, 1.4], [774, 327, 1.4], [791, 327, 1.4], [840, 309, 1], [840, 333, 1.6], [850, 326, 0.8]];
  const rand = (a, b) => a + Math.random() * (b - a);

  function animateBg() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Estrelas que piscam devagar: só CSS (opacity anima na GPU, sem custo de JS)
    const stars = $('#mn-stars');
    for (let n = 0; n < 70;) {
      const x = rand(1, 99), y = rand(2, 46);
      if (Math.hypot((x - 65.6) * 1.79, y - 27.6) < 9) continue;   // lua
      if (x > 69 && x < 85 && y > 36) continue;                    // torres do castelo
      const i = document.createElement('i');
      const big = Math.random() < 0.15;
      i.style.cssText = `left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--s:${(big ? rand(2.2, 3) : rand(1, 1.9)).toFixed(1)}px;` +
        `--o:${(big ? rand(0.8, 1) : rand(0.4, 0.8)).toFixed(2)};--t:${rand(3, 8).toFixed(1)}s;--d:${(-rand(0, 8)).toFixed(1)}s`;
      stars.append(i); n++;
    }
    // Luz tremeluzindo nas janelas do castelo
    const win = $('#mn-windows');
    for (const [x, y, k] of WINDOWS) {
      const i = document.createElement('i');
      i.style.cssText = `left:${(x / 10.24).toFixed(2)}%;top:${(y / 5.72).toFixed(2)}%;--w:${(k * 1.5).toFixed(2)}%;` +
        `--t:${rand(2.4, 5.5).toFixed(1)}s;--d:${(-rand(0, 5)).toFixed(1)}s`;
      win.append(i);
    }
    if (reduce) return;
    sparks();
    // Parallax leve com o mouse
    const stage = $('#mn-stage'), img = $('#mn-img');
    $('#lobby').addEventListener('pointermove', (e) => {
      const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
      const t = `translate(${(-dx * 16).toFixed(1)}px, ${(-dy * 9).toFixed(1)}px)`;
      stage.style.transform = t; img.style.transform = t;
    });
  }

  // Faíscas/vaga-lumes dourados subindo (canvas). O laço para sozinho quando a mesa abre
  // e pausa com a aba escondida, então não pesa no jogo.
  function sparks() {
    const cv = $('#mn-sparks'), ctx = cv.getContext('2d'), lobby = $('#lobby');
    let W = 0, H = 0, dpr = 1, parts = [], last = 0, raf = 0;
    const spawn = (anyY) => {
      const z = Math.random();                       // profundidade: perto = maior, mais rápido, mais forte
      return { x: rand(0, W), y: anyY ? rand(0, H) : H + rand(5, 40), r: 0.6 + z * 2.2, vy: 14 + z * 38,
        sway: rand(8, 26), ph: rand(0, 6.28), fs: rand(0.4, 1.2), a: 0.35 + z * 0.6, hue: rand(32, 52), life: 0 };
    };
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = Math.min(70, Math.round((W * H) / 26000));
      while (parts.length < want) parts.push(spawn(true));
      parts.length = want;
    }
    function frame(t) {
      if (lobby.hidden) { cancelAnimationFrame(raf); return; }   // mesa aberta: desliga de vez
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < parts.length; k++) {
        let p = parts[k];
        p.y -= p.vy * dt; p.life += dt; p.ph += p.fs * dt;
        if (p.y < -20) { p = parts[k] = spawn(false); }
        const x = p.x + Math.sin(p.ph) * p.sway;
        // aparece devagar, apaga ao chegar no alto e pisca de leve
        const fade = Math.min(1, p.life / 1.5) * Math.min(1, p.y / (H * 0.35)) * (0.75 + 0.25 * Math.sin(p.ph * 3.1));
        const al = Math.max(0, p.a * fade);
        ctx.fillStyle = `hsla(${p.hue},100%,62%,${(al * 0.18).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, p.y, p.r * 3.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue},100%,80%,${al.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }
    resize();
    addEventListener('resize', () => { if (!lobby.hidden) resize(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!lobby.hidden) { last = 0; raf = requestAnimationFrame(frame); }
    });
    raf = requestAnimationFrame(frame);
  }

  function applyBg(asset) {
    const img = $('#mn-img');
    const src = lobbyUrls.src(BG_KEY, asset);
    img.style.backgroundImage = src ? 'url(' + JSON.stringify(src) + ')' : '';
    img.classList.toggle('on', !!src);
    $('#lobby').classList.toggle('custom-bg', !!src);
    $('#mn-bg-clear').hidden = !src;
  }
  async function loadBg() {
    const revision = backgroundRevision;
    let legacy = null, asset;
    try { legacy = localStorage.getItem(BG_KEY); } catch { /* sem armazenamento */ }
    try { asset = await App.Storage.kv.get(BG_KEY); } catch { /* usa a preferência legada */ }
    if (revision !== backgroundRevision || $('#lobby').hidden) return;
    if (asset === undefined && legacy) {
      asset = binaryAsset(legacy);
      applyBg(asset);
      try {
        await App.Storage.kv.set(BG_KEY, asset);
        if (backgroundRevision === revision) localStorage.removeItem(BG_KEY);
      } catch { /* a cópia legada continua disponível */ }
    } else applyBg(asset);
  }
  async function saveBg(asset) {
    ++backgroundRevision;
    applyBg(asset);
    try {
      await App.Storage.kv.set(BG_KEY, asset);
      try { localStorage.removeItem(BG_KEY); } catch { /* sem armazenamento */ }
      if (asset) U.toast('Fundo trocado. Fica salvo neste navegador.');
    } catch {
      U.toast('Não foi possível salvar o fundo. A alteração vale nesta página.', 'error');
    }
  }
  async function pickBg() {
    const f = await U.pickFile('image/*');
    if (!f) return;
    try {
      const r = await App.Images.toWebP(f, 1920);
      await saveBg(r.blob);
    } catch (e) { U.toast(e.message, 'error'); }
  }

  // Quantas histórias há (descrição de "Preparar tabuleiro")
  async function peekCampaign() {
    let list = [];
    try { list = await App.Storage.listStories(); } catch { return; }
    if (!list.length) return;
    const b = $('#lb-offline'), n = list.length;
    let last = list[0].name.replace(/[<&>"]/g, '');
    if (last.length > 26) last = last.slice(0, 25).trimEnd() + '…'; // nome longo não pode passar de 2 linhas
    b.dataset.desc = n === 1
      ? `Continue <b>${last}</b> ou crie uma nova história, tudo offline.`
      : `Continue <b>${last}</b> ou escolha outra das suas ${n} histórias, tudo offline.`;
    if (b.classList.contains('sel')) select(b);
  }

  // ================= Histórias (Plano 33) =================
  // Uma tela de cartões entre o menu e a mesa: cada cartão é uma mesa preparada; o último é "+ Nova história".
  const Stories = { online: false, list: [], menu: null };
  App.Stories = Stories;
  const esc = (t) => String(t || '').replace(/[<&>"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' }[c]));
  function ago(t) {
    const m = Math.round((Date.now() - (t || 0)) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return 'há ' + h + ' h';
    const d = Math.round(h / 24);
    if (d === 1) return 'ontem';
    if (d < 30) return 'há ' + d + ' dias';
    return new Date(t).toLocaleDateString('pt-BR');
  }
  async function showStories(online) {
    if (!readName(online)) return;
    Stories.online = online;
    $('.mn-main').hidden = true;
    $('#st-screen').hidden = false;
    $('#st-crumb').textContent = online ? 'Abrir mesa online' : 'Preparar tabuleiro';
    await renderStories();
    const first = $('#st-grid .st-card');
    if (first) first.focus({ preventScroll: true });
  }
  function hideStories() {
    closeCardMenu();
    $('#st-screen').hidden = true;
    ++cardRevision;
    $('#st-grid').replaceChildren();
    cardUrls.clear();
    Stories.list = [];
    $('.mn-main').hidden = false;
    if (Stories.online) showList('mn-play', $('#lb-host')); else showList('mn-root', $('#lb-offline'));
  }
  Stories.onCards = () => { if (!$('#st-screen').hidden && !$('#st-grid .st-new.editing') && !$('#st-grid .st-name-edit')) renderStories(); };
  async function renderStories() {
    const grid = $('#st-grid');
    const revision = ++cardRevision;
    let cards;
    try { cards = await App.Storage.listStories(); } catch (e) { cards = []; U.toast('Não consegui ler as histórias deste navegador: ' + e.message, 'error'); }
    if (revision !== cardRevision || $('#st-screen').hidden) return;
    Stories.list = cards;
    grid.innerHTML = '';
    cardUrls.clear();
    Stories.list.forEach((c, i) => {
      const asset = c.cover || c.thumb;
      const img = asset ? cardUrls.src(c.id, binaryAsset(asset)) : null;
      const card = document.createElement('div');
      card.className = 'st-card';
      card.tabIndex = 0;
      card.dataset.id = c.id;
      card.style.animationDelay = Math.min(i, 8) * 0.04 + 's';
      card.innerHTML = `<div class="st-img${img ? '' : ' empty'}">${img ? '' : '<span>' + esc((c.name || '?').trim().charAt(0).toUpperCase()) + '</span>'}</div>
        <div class="st-info"><b class="st-name">${esc(c.name)}</b><small>${ago(c.savedAt)} · ${c.scenes || 0} ${c.scenes === 1 ? 'cena' : 'cenas'}</small></div>
        <button class="st-more" title="Opções da história">${App.Icons.svg('ellipsis')}</button>`;
      if (img) card.querySelector('.st-img').style.backgroundImage = 'url(' + JSON.stringify(img) + ')';
      card.onclick = (e) => { if (e.target.closest('.st-more, .st-name-edit')) return; openStory(c.id); };
      card.onkeydown = (e) => { if (e.key === 'Enter' && e.target === card) openStory(c.id); };
      card.querySelector('.st-more').onclick = (e) => { e.stopPropagation(); cardMenu(c, e.currentTarget); };
      card.oncontextmenu = (e) => { e.preventDefault(); cardMenu(c, card.querySelector('.st-more')); };
      grid.append(card);
    });
    const add = document.createElement('div');
    add.className = 'st-card st-new';
    add.tabIndex = 0;
    add.innerHTML = `<div class="st-plus">${App.Icons.svg('plus')}</div><div class="st-info"><b>Nova história</b><small>Uma mesa nova, com uma cena vazia</small></div>`;
    add.onclick = () => newStoryForm(add);
    add.onkeydown = (e) => { if (e.key === 'Enter' && e.target === add) newStoryForm(add); };
    grid.append(add);
  }
  function newStoryForm(add) {
    if (add.classList.contains('editing')) return;
    add.classList.add('editing');
    add.innerHTML = `<div class="st-plus">${App.Icons.svg('plus')}</div><div class="st-info st-form"><input class="st-input" maxlength="60" placeholder="Nome da história" autocomplete="off"><div class="st-form-btns"><button class="btn primary small">Criar</button><button class="btn small">Cancelar</button></div></div>`;
    const inp = add.querySelector('input'), [ok, no] = add.querySelectorAll('button');
    const go = async () => {
      const name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      ok.disabled = true;
      const id = await App.Storage.createStory(name);
      openStory(id);
    };
    ok.onclick = (e) => { e.stopPropagation(); go(); };
    no.onclick = (e) => { e.stopPropagation(); renderStories(); };
    inp.onclick = (e) => e.stopPropagation();
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); if (e.key === 'Escape') renderStories().then(() => add.focus && $('#st-grid .st-new').focus()); };
    inp.focus();
  }
  async function openStory(id) {
    closeCardMenu();
    App.Storage.currentId = id;
    try { localStorage.setItem('vesper.story', id); } catch { /* */ }
    await startGM(Stories.online);
  }
  Stories.open = openStory;
  // Menu do cartão: Renomear, Trocar imagem, Usar o mapa da cena, Duplicar, Exportar, Apagar
  function closeCardMenu() { if (Stories.menu) { Stories.menu.remove(); Stories.menu = null; } }
  function cardMenu(c, anchor) {
    if (Stories.menu && Stories.menu.dataset.id === c.id) { closeCardMenu(); return; }
    closeCardMenu();
    const St = App.Storage, m = document.createElement('div');
    m.className = 'st-menu';
    m.dataset.id = c.id;
    const item = (icon, label, run, danger) => {
      const b = document.createElement('button');
      b.className = 'st-mi' + (danger ? ' danger' : '');
      b.innerHTML = App.Icons.svg(icon) + '<span>' + label + '</span>';
      b.onclick = async (e) => { e.stopPropagation(); closeCardMenu(); try { await run(); } catch (err) { U.toast(err.message, 'error'); } };
      m.append(b);
    };
    item('pencil', 'Renomear', () => renameInline(c));
    item('image', 'Trocar imagem', async () => {
      const file = await U.pickFile('image/*');
      if (!file) return;
      const r = await App.Images.toWebP(file, 900);
      await St.setCover(c.id, r.blob);
      await renderStories();
    });
    if (c.cover) item('map', 'Usar o mapa da cena', async () => { await St.setCover(c.id, null); await St.refreshThumb(c.id); await renderStories(); });
    item('copy-plus', 'Duplicar', async () => { await St.duplicateStory(c.id); await renderStories(); U.toast('História duplicada.'); });
    item('download', 'Exportar (arquivo)', async () => { const b = await St.storyBundle(c.id); if (b) St.downloadJSON(b, 'historia_' + c.name); });
    item('trash-2', 'Apagar', async () => {
      if (!confirm('Apagar a história "' + c.name + '"? Isso não pode ser desfeito (exporte antes, se quiser guardar).')) return;
      await St.deleteStory(c.id);
      await renderStories();
      U.toast('História apagada.');
    }, true);
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.min(window.innerWidth - m.offsetWidth - 10, r.right - m.offsetWidth) + 'px';
    m.style.top = (r.bottom + 6 + m.offsetHeight > window.innerHeight - 10 ? r.top - m.offsetHeight - 6 : r.bottom + 6) + 'px';
    Stories.menu = m;
  }
  function renameInline(c) {
    const card = $('#st-grid .st-card[data-id="' + c.id + '"]');
    if (!card) return;
    const nameEl = card.querySelector('.st-name'), inp = document.createElement('input');
    inp.className = 'st-input st-name-edit'; inp.maxLength = 60; inp.value = c.name;
    nameEl.replaceWith(inp);
    inp.focus(); inp.select();
    let done = false;
    const finish = async (save) => {
      if (done) return; done = true;
      if (save && inp.value.trim() && inp.value.trim() !== c.name) await App.Storage.renameStory(c.id, inp.value);
      await renderStories();
      const again = $('#st-grid .st-card[data-id="' + c.id + '"]');
      if (again) again.focus();
    };
    inp.onclick = (e) => e.stopPropagation();
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); };
    inp.onblur = () => finish(true);
  }
  // Setas andam pelos cartões; Esc fecha o menu do cartão ou volta
  function storiesKey(e) {
    if ($('#st-screen').hidden) return false;
    if (e.key === 'Escape') { if (Stories.menu) closeCardMenu(); else if (!(e.target instanceof Element && e.target.matches('input'))) hideStories(); return true; }
    if (e.target instanceof Element && e.target.matches('input')) return true;
    const cards = [...document.querySelectorAll('#st-grid .st-card')], cur = cards.indexOf(document.activeElement);
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return true;
    e.preventDefault();
    if (cur < 0) { if (cards[0]) cards[0].focus(); return true; }
    const top0 = cards[0].offsetTop, cols = Math.max(1, cards.filter((c) => c.offsetTop === top0).length);
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    const next = cards[Math.max(0, Math.min(cards.length - 1, cur + step))];
    if (next) next.focus();
    return true;
  }
  document.addEventListener('pointerdown', (e) => { if (Stories.menu && !e.target.closest('.st-menu, .st-more')) closeCardMenu(); });

  function boot() {
    App.Store.me = loadMe();
    document.querySelectorAll('#lobby [data-icon]').forEach((el) => { el.innerHTML = App.Icons.svg(el.dataset.icon); });
    if (new URLSearchParams(location.search).has('tutorial')) { startTutorial(); return; }
    $('#lb-name').value = App.Store.me.name || '';

    void loadBg();
    animateBg();

    $('[data-sub="mn-play"]').onclick = () => showList('mn-play');
    $('#mn-play [data-back]').onclick = () => showList('mn-root', $('[data-sub="mn-play"]'));
    $('#lb-host').onclick = () => showStories(true);
    $('#lb-join-open').onclick = openJoin;
    $('#lb-offline').onclick = () => showStories(false);
    $('#st-back').onclick = hideStories;
    $('#lb-sheet').onclick = () => { location.href = 'ficha.html'; };
    $('#lb-cad').onclick = () => { location.href = 'cadastros.html'; };
    $('#lb-join').onclick = startPlayer;
    $('#lb-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') startPlayer(); });
    $('#lb-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') startPlayer(); });
    $('#mn-bg-pick').onclick = pickBg;
    $('#mn-bg-clear').onclick = () => saveBg(null);
    for (const it of document.querySelectorAll('#lobby .mn-item')) {
      it.addEventListener('pointerenter', () => select(it));
      it.addEventListener('focus', () => select(it));
    }
    document.addEventListener('keydown', onKey);

    const code = new URLSearchParams(location.search).get('mesa');
    if (code) {
      // Link de convite: já abre em Jogar → Entrar, com o código preenchido
      showList('mn-play', $('#lb-join-open'));
      $('#lb-code').value = code;
      $('#mn-join').hidden = false;
      ($('#lb-name').value ? $('#lb-join') : $('#lb-name')).focus();
    } else {
      showList('mn-root');
      if (!$('#lb-name').value) $('#lb-name').focus();
      const back = new URLSearchParams(location.search).get('historias');
      if (back) { history.replaceState(null, '', location.pathname); showList(back === 'online' ? 'mn-play' : 'mn-root', back === 'online' ? $('#lb-host') : $('#lb-offline')); showStories(back === 'online'); }
    }
    peekCampaign();
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window.App);
