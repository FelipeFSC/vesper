// Plano 74: imagem do personagem (arte) e imagem do token. Query padrão ?tutorial; #shot-generica, #shot-5e, #shot-recorte = fotos
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const shot = location.hash.replace('#shot-', '');
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, UI = App.UI, I = App.Images, SA = App.SheetArt;
    const waitFor = async (cond, n = 80) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    // Arte de teste: retrato em pé (céu, rosto no terço de cima) e um token pronto quadrado
    const makeFile = (w, hh, draw, name) => new Promise((res) => {
      const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d'); draw(x, w, hh);
      c.toBlob((b) => res(new File([b], name, { type: 'image/png' })), 'image/png');
    });
    const artFile = await makeFile(900, 1300, (x, w, hh) => {
      const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#3b2a6b'); g.addColorStop(1, '#120d1c'); x.fillStyle = g; x.fillRect(0, 0, w, hh);
      x.fillStyle = '#d9b08c'; x.beginPath(); x.arc(w / 2, hh * 0.3, 150, 0, 7); x.fill(); // rosto
      x.fillStyle = '#e8e6ef'; x.fillRect(w / 2 - 260, hh * 0.18, 70, 520); // cabelo claro
      x.fillStyle = '#1a1a1a'; x.fillRect(w / 2 - 300, hh * 0.45, 600, 700); // roupa
    }, 'arte.png');
    const artFile2 = await makeFile(1200, 800, (x, w, hh) => { x.fillStyle = '#2d5a3d'; x.fillRect(0, 0, w, hh); x.fillStyle = '#c33'; x.beginPath(); x.arc(w / 2, hh / 2, 200, 0, 7); x.fill(); }, 'arte2.png');
    const tokFile = await makeFile(256, 256, (x) => { x.fillStyle = '#d2a24c'; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill(); }, 'token.png');

    // ---------- Ficha genérica nova ----------
    const id = 'ac_img_teste';
    S.dispatch({ type: 'actor.add', actor: { id, name: 'Morwen', kind: 'pc', owner: 'all', color: '#7c5cc4', size: 1, bars: [{ name: 'PV', value: 20, max: 20 }, { name: 'Mana', value: 7, max: 10 }], stats: [], actions: [], testFormula: '1d20+@valor', initFormula: '1d20', notes: '' } });
    const A = () => S.state.actors[id];
    UI.openActor(id); await W(200);
    const win = () => UI.windows.get('actor:' + id).el;
    ok(A().art === null || A().art === undefined, 'ficha nova sem imagem do personagem');
    ok(!win().querySelector('.sa-top') && win().querySelector('.sa-pick'), 'sem arte: topo como antes, com o botão de pôr imagem');
    // Pôr a arte: vira o fundo e o token sai dela (não tinha token)
    await UI.setArt(A(), artFile); await waitFor(() => A().art && A().img);
    ok(A().art && A().img && A().imgFromArt && A().artCrop && A().artCrop.y < 0.4, 'arte + token recortado dela (rosto em cima: y ' + (A().artCrop && A().artCrop.y.toFixed(2)) + ')');
    await waitFor(() => win().querySelector('.sa-top .sa-bg'));
    const bg = win().querySelector('.sa-top .sa-bg');
    ok(bg && /url\(/.test(bg.style.backgroundImage), 'topo da ficha com a arte ao fundo');
    log.push('genérica: arte ' + A().art + ' · token ' + A().img + ' (da arte: ' + A().imgFromArt + ', recorte ' + JSON.stringify(A().artCrop) + ')');
    if (shot === 'generica') { log.push('foto pronta'); return; }
    // Clicar no token abre o recorte; arrastar muda o centro; Usar grava um token novo
    const img0 = A().img;
    win().querySelector('.sa-top .avatar').click(); await waitFor(() => $('.sa-crop'));
    ok($('.sa-crop .sa-stage') && $('.sa-crop .sa-prev'), 'clicar no token abre o recorte');
    const st = $('.sa-stage').getBoundingClientRect();
    $('.sa-stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: st.left + st.width * 0.5, clientY: st.top + st.height * 0.6, pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    const rng = $('.sa-size input'); rng.value = '40'; rng.dispatchEvent(new Event('input'));
    if (shot === 'recorte') { log.push('foto pronta'); return; }
    $('[data-sa="ok"]').click();
    await waitFor(() => A().img !== img0);
    ok(A().img !== img0 && Math.abs(A().artCrop.y - 0.6) < 0.05 && Math.abs(A().artCrop.s - 0.4) < 0.02, 'recorte novo gravado (y ' + A().artCrop.y.toFixed(2) + ', tamanho ' + A().artCrop.s + ')');
    log.push('recorte: ' + JSON.stringify(A().artCrop));
    // Configurar → Imagens
    UI.sheetTab[id] = 'config'; UI.refresh(); const w0 = UI.windows.get('actor:' + id); if (w0) { w0.body._sig = null; } await W(300);
    const cfgRows = win().querySelectorAll('.sa-imgs .sa-img-row');
    ok(cfgRows.length === 2 && win().querySelector('[data-sa="crop"]') && win().querySelector('[data-sa="art-del"]'), 'Configurar → Imagens com as duas linhas');
    log.push('configurar: ' + [...cfgRows].map((r) => r.querySelector('b').textContent + ' (' + r.querySelector('.muted').textContent + ')').join(' | '));
    // Token próprio: trocar a arte não mexe nele
    const own = await I.add(tokFile, I.TOKEN);
    S.dispatch({ type: 'actor.update', id, patch: { img: own.id, imgFromArt: false } });
    await UI.setArt(A(), artFile2); await waitFor(() => A().art && A().art !== null);
    ok(A().img === own.id && !A().imgFromArt, 'trocar a arte mantém o token próprio');
    UI.removeArt(A()); await W(50);
    ok(A().art === null && A().img === own.id, 'remover a arte mantém o token próprio');
    // Token da arte: remover a arte remove o token junto
    await UI.setArt(A(), artFile); await W(50);
    S.dispatch({ type: 'actor.update', id, patch: { img: null, imgFromArt: false } });
    await UI.setArt(A(), artFile2); await waitFor(() => A().imgFromArt);
    UI.removeArt(A()); await W(50);
    ok(A().art === null && A().img === null, 'remover a arte remove o token que saiu dela');
    log.push('token próprio x token da arte: ok');
    // Plano 75: Enviar token = token pronto (inteiro no mapa, sem aro), mesmo com a arte
    const framed = await makeFile(512, 512, (x) => {
      x.clearRect(0, 0, 512, 512);
      x.fillStyle = '#f3e3c6'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill(); // moldura clara do próprio token
      x.fillStyle = '#8b5fbf'; x.beginPath(); x.arc(256, 256, 222, 0, 7); x.fill();
      x.fillStyle = '#d9b08c'; x.beginPath(); x.arc(256, 210, 90, 0, 7); x.fill();
    }, 'token-moldura.png');
    await UI.setArt(A(), artFile); await W(50);
    const pf = App.U.pickFile; App.U.pickFile = async () => framed;
    await UI.pickToken(A()); App.U.pickFile = pf; await waitFor(() => A().imgStyle === 'token');
    ok(A().imgStyle === 'token' && !A().imgFromArt && A().art, 'Enviar token vira Token pronto (e a arte continua)');
    UI.openActor(id); await W(250);
    const avTop = win().querySelector('.sa-top .avatar');
    ok(avTop && avTop.classList.contains('token-ready') && getComputedStyle(avTop).boxShadow === 'none', 'no topo da ficha o token pronto aparece sem borda por cima');
    const cfgTxt = () => { UI.sheetTab[id] = 'config'; const ww = UI.windows.get('actor:' + id); if (ww) ww.body._sig = null; UI.refresh(); };
    cfgTxt(); await W(250);
    ok(/inteira no mapa/.test(win().querySelector('.sa-imgs').textContent), 'Configurar diz que o token aparece inteiro');
    // Recortar da arte volta para o círculo com aro
    win().querySelector('[data-sa="crop"]').click(); await waitFor(() => $('.sa-crop')); $('[data-sa="ok"]').click(); await waitFor(() => A().imgFromArt);
    ok(A().imgFromArt && !A().imgStyle, 'recorte da arte volta a ser círculo com o aro');
    log.push('enviar token: Token pronto · recortar: círculo');
    if (shot === 'tokenpronto') {
      App.U.pickFile = async () => framed; await UI.pickToken(A()); App.U.pickFile = pf; await W(100);
      const sc = S.currentScene(); App.Board.placeActor(id, { x: sc.grid * 4, y: sc.grid * 4 }); await W(200);
      UI.sheetTab[id] = 'acoes'; const ww = UI.windows.get('actor:' + id); if (ww) ww.body._sig = null; UI.refresh(); await W(300);
      log.push('foto pronta'); return;
    }
    UI.closeWindow('actor:' + id);
    // Ficha antiga (só img): igual a antes
    const tut = Object.values(S.state.actors).find((x) => x.name === 'Lyra');
    UI.openActor(tut.id); await W(200);
    ok(!UI.windows.get('actor:' + tut.id).el.querySelector('.sa-top'), 'ficha antiga sem arte: topo como antes');
    UI.closeWindow('actor:' + tut.id);
    // Exportar leva a arte
    await UI.setArt(A(), artFile); await W(50);
    const bun = await App.Storage.actorBundle ? await App.Storage.actorBundle(id) : null;
    if (bun) ok(bun.assets && bun.assets[A().art], 'exportar a ficha leva a arte');
    log.push('exportar: ' + (bun ? 'arte junto = ' + !!(bun.assets && bun.assets[A().art]) : 'sem função de exportar ficha (pulado)'));
    UI.closeWindow('actor:' + id);

    // ---------- Ficha 5e ----------
    UI.newActor('pc'); await W(60);
    $('[data-sys="5e"]').click(); await W(300);
    const a5 = Object.values(S.state.actors).find((x) => x.sistema === '5e');
    ok(a5, 'ficha 5e criada');
    await UI.setArt(a5, artFile); await W(100);
    const A5 = () => S.state.actors[a5.id];
    S.dispatch({ type: 'actor.update', id: a5.id, patch: { name: 'Morwen, a Corvo' } });
    UI.openActor(a5.id); await W(300);
    const w5 = UI.windows.get('actor:' + a5.id).el;
    await waitFor(() => w5.querySelector('.f5-top.sa-top .sa-bg'));
    ok(w5.querySelector('.f5-top.sa-top .sa-bg') && A5().imgFromArt, 'ficha 5e com a arte no topo e o token recortado');
    log.push('5e: topo com arte = ' + !!w5.querySelector('.f5-top.sa-top'));
    if (shot === '5e') { log.push('foto pronta'); return; }
    log.push('fim das imagens');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
