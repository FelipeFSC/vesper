// Plano 34 · busca de paredes num mapa com textura (_mapa_fortaleza.jpg, fora do git), com foto (-shot).
// Hash: #<modo>-<textura 0-100>-<sens 0-100>[-zoom]   ex.: #floor-50-50  #outside-0-50
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, SC = App.Scan;
    const [mode, tex, sens, zoom] = (location.hash.slice(1) || 'floor-50-50').split('-');
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '.claude/testes/_mapa_fortaleza.jpg'; });
    const N = 35, c = document.createElement('canvas'); c.width = N * 60; c.height = N * 60;
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/webp', 0.9), id = 'img_' + App.U.hash(data.slice(0, 5000) + data.length);
    S.assets[id] = data;
    const sc0 = S.newScene('Fortaleza'); sc0.cols = N; sc0.rows = N; sc0.bg = id;
    S.dispatch({ type: 'scene.add', scene: sc0 });
    S.viewSceneId = sc0.id; S.emit('local'); await W(300);
    const sc = S.state.scenes[sc0.id], g = sc.grid;
    // cliques (em quadrados) no chão das salas da fortaleza, ou no lado de fora
    const D = 1932 / N, P = (x, y) => ({ x: (x / D) * g, y: (y / D) * g });
    const floorSeeds = [[1340, 450], [1700, 470], [1380, 1000], [1600, 1000], [1720, 800], [1700, 1440], [1350, 1500], [1640, 640], [1640, 1330]].map(([x, y]) => P(x, y));
    const outSeeds = [P(1150, 150), P(1800, 1850)];
    UI.openScan(); await W(100);
    Object.assign(UI.scanOpts, { by: mode, seeds: mode === 'floor' ? floorSeeds : mode === 'dark' ? [] : outSeeds, smooth: Number(tex) / 100, sens: Number(sens) / 100, minSize: 0.1 });
    SC.forceSync = true;
    const t0 = performance.now();
    UI.runScan(true); await W(200);
    for (let i = 0; i < 60 && B.scan.busy; i++) await W(200);
    log.push(`${mode} · textura ${tex}% · sensibilidade ${sens}%: ${B.scan.walls.length} paredes · ${Math.round(performance.now() - t0)} ms`);
    // foto: a fortaleza (ou o mapa inteiro), sem a janela na frente
    const win = document.querySelector('.scan-win'); if (win) win.style.display = 'none';
    document.querySelectorAll('#tool-opts').forEach((e) => (e.hidden = true));
    if (zoom) { B.cam.z = B.h / (22 * g); B.cam.x = 20.5 * g; B.cam.y = 4.5 * g; }
    else { B.cam.z = Math.min(B.w, B.h) / (N * g); B.cam.x = 0; B.cam.y = 0; }
    B.requestRender(); await W(300); B.render();
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
