'use strict';
/* Tela inicial: escolher entre abrir a mesa (mestre) ou entrar (jogador). */
(function (App) {
  const { U } = App;
  const $ = (s) => document.querySelector(s);
  const ROOM_KEY = 'mesarpg.room', ME_KEY = 'mesarpg.me';

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

  async function startGM(online, then) {
    if (!readName(online)) return;
    const S = App.Store;
    S.role = 'gm';
    const saved = await App.Storage.load();
    const st = saved && saved.state ? S.migrate(saved.state) : S.newCampaign();
    st.gm = { id: S.me.id, name: S.me.name, color: S.me.color };
    S.setState(st, (saved && saved.assets) || {});
    App.UI.start();
    if (saved) U.toast('Campanha "' + st.name + '" carregada.');
    if (!online) { S.role = 'offline'; App.UI.setNetStatus('', 'Offline (local)'); if (then) then(); return; }
    await hostWithRetry();
  }

  async function hostWithRetry() {
    let code = null;
    try { code = localStorage.getItem(ROOM_KEY); } catch { /* */ }
    code = code || App.Net.genCode();
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await App.Net.host(code);
        try { localStorage.setItem(ROOM_KEY, code); } catch { /* */ }
        U.toast('Mesa aberta! Código: ' + code, 'info', 5000);
        return;
      } catch (e) {
        if (e && e.type === 'unavailable-id') {
          // Código ainda preso da sessão anterior (recarregou a página): espera um pouco
          if (attempt < 3) { App.UI.setNetStatus('connecting', 'Liberando código ' + code + '…'); await U.sleep(3000); continue; }
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
    const code = $('#lb-code').value.trim().toUpperCase();
    if (!code) { U.toast('Digite o código da mesa.', 'error'); $('#lb-code').focus(); return; }
    App.Store.role = 'player';
    App.UI.start();
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

  function applyBg(data) {
    const img = $('#mn-img');
    img.style.backgroundImage = data ? `url("${data}")` : '';
    img.classList.toggle('on', !!data);
    $('#lobby').classList.toggle('custom-bg', !!data);
    $('#mn-bg-clear').hidden = !data;
  }
  async function pickBg() {
    const f = await U.pickFile('image/*');
    if (!f) return;
    try {
      const r = await App.Images.toWebP(f, 1920);
      applyBg(r.data);
      try { localStorage.setItem(BG_KEY, r.data); U.toast('Fundo trocado. Fica salvo neste navegador.'); }
      catch { U.toast('A imagem é grande demais para guardar; vale só até fechar a página.', 'error'); }
    } catch (e) { U.toast(e.message, 'error'); }
  }

  // Mostra o nome da campanha salva em "Preparar tabuleiro"
  async function peekCampaign() {
    const saved = await App.Storage.load();
    const name = saved && saved.state && saved.state.name;
    if (!name) return;
    const b = $('#lb-offline');
    b.dataset.desc = `Continua a campanha <b>${name.replace(/[<&>"]/g, '')}</b>: cenas, mapas e fichas, sem ninguém conectado.`;
    if (b.classList.contains('sel')) select(b);
  }

  function boot() {
    App.Store.me = loadMe();
    document.querySelectorAll('#lobby [data-icon]').forEach((el) => { el.innerHTML = App.Icons.svg(el.dataset.icon); });
    if (new URLSearchParams(location.search).has('tutorial')) { startTutorial(); return; }
    $('#lb-name').value = App.Store.me.name || '';

    let bg = null;
    try { bg = localStorage.getItem(BG_KEY); } catch { /* */ }
    applyBg(bg);
    animateBg();

    $('[data-sub="mn-play"]').onclick = () => showList('mn-play');
    $('#mn-play [data-back]').onclick = () => showList('mn-root', $('[data-sub="mn-play"]'));
    $('#lb-host').onclick = () => startGM(true);
    $('#lb-join-open').onclick = openJoin;
    $('#lb-offline').onclick = () => startGM(false);
    $('#lb-sheet').onclick = () => { location.href = 'ficha.html'; };
    $('#lb-join').onclick = startPlayer;
    $('#lb-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') startPlayer(); });
    $('#mn-bg-pick').onclick = pickBg;
    $('#mn-bg-clear').onclick = () => { applyBg(null); try { localStorage.removeItem(BG_KEY); } catch { /* */ } };
    for (const it of document.querySelectorAll('#lobby .mn-item')) {
      it.addEventListener('pointerenter', () => select(it));
      it.addEventListener('focus', () => select(it));
    }
    document.addEventListener('keydown', onKey);

    const code = new URLSearchParams(location.search).get('mesa');
    if (code) {
      // Link de convite: já abre em Jogar → Entrar, com o código preenchido
      showList('mn-play', $('#lb-join-open'));
      $('#lb-code').value = code.toUpperCase();
      $('#mn-join').hidden = false;
      ($('#lb-name').value ? $('#lb-join') : $('#lb-name')).focus();
    } else {
      showList('mn-root');
      if (!$('#lb-name').value) $('#lb-name').focus();
    }
    peekCampaign();
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window.App);
