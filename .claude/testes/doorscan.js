// Plano 32 · Procurar portas pela ferramenta Porta: só portas, paredes que já existem ganham a passagem
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, SC = App.Scan, G = 50;
    if (UI.mode !== 'edit') UI.setMode('edit');
    // mapa sintético: duas salas ligadas por um corredor, com 2 portas iguais desenhadas na imagem
    const c = document.createElement('canvas'); c.width = 16 * G; c.height = 8 * G;
    const x = c.getContext('2d');
    x.fillStyle = '#1c2b4d'; x.fillRect(0, 0, c.width, c.height);
    const rect = (a, b, w, h, fill) => { x.fillStyle = fill; x.fillRect(a * G, b * G, w * G, h * G); };
    rect(1, 1, 5, 5, '#6b4423'); rect(6, 3, 4, 1, '#4a4a50'); rect(10, 1, 5, 5, '#55555c');
    const door = (a, b) => { x.fillStyle = '#d49a5c'; x.fillRect(a * G, b * G, 0.3 * G, 0.9 * G); x.lineWidth = 2; x.strokeStyle = '#3a2a14'; x.strokeRect(a * G, b * G, 0.3 * G, 0.9 * G); };
    door(5.85, 3.05); door(9.85, 3.05);
    const data = c.toDataURL('image/png'), id = 'img_' + App.U.hash(data);
    S.assets[id] = data;
    const sc0 = S.newScene('Portas'); sc0.cols = 16; sc0.rows = 8; sc0.bg = id;
    S.dispatch({ type: 'scene.add', scene: sc0 });
    S.viewSceneId = sc0.id; S.emit('local'); await W(200);
    const sc = () => S.state.scenes[sc0.id], g = sc().grid, sid = sc0.id;
    // paredes já desenhadas pelo mestre, SEM abertura nas portas (a linha x = 6 e x = 10 inteiras)
    const wl = (x1, y1, x2, y2) => ({ id: App.U.uid('w_'), x1: x1 * g, y1: y1 * g, x2: x2 * g, y2: y2 * g, cover: 'high' });
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [wl(6, 1, 6, 6), wl(10, 1, 10, 6), wl(6, 3, 10, 3), wl(6, 4, 10, 4)] });
    const walls0 = sc().walls.length;

    // 1) ferramenta Porta: botão "Procurar portas no mapa"
    B.setTool('door'); UI.refresh(); await W(100);
    const btn = [...document.querySelectorAll('#tool-opts .btn')].find((b) => /Procurar portas no mapa/.test(b.textContent));
    log.push('ferramenta Porta tem "Procurar portas no mapa": ' + !!btn);
    btn.click(); await W(300);
    const win = [...document.querySelectorAll('.win')].find((w) => /Procurar portas/.test(w.textContent));
    log.push('janela: ' + (win && win.querySelector('.win-title, .win-head') ? win.querySelector('.win-title, .win-head').textContent.trim() : !!win) + ' · etapas: ' + (win ? [...win.querySelectorAll('.eyebrow')].map((e) => e.textContent).join(' | ') : '-'));
    log.push('palpite já ligado (há paredes no mapa): ' + UI.scanOpts.gaps + ' · só portas: ' + UI.scanOpts.only);

    // 2) mostrar uma porta da imagem: acha as duas (e nenhuma parede)
    const k = sc().grid / G;
    Object.assign(UI.scanOpts, { tpls: [{ x: 5.85 * G * k, y: 3.05 * G * k, w: 0.3 * G * k, h: 0.9 * G * k }], gaps: false });
    const r = await SC.run(sc(), Object.assign({}, UI.scanOpts, { sync: true }));
    log.push(`só portas, por exemplo: ${r.walls.length} paredes · ${r.doors.length} portas em x = ${r.doors.map((d) => Math.round(((d.x1 + d.x2) / 2) / g * 10) / 10).join(', ')}`);
    // 3) criar: as paredes que tapavam as portas ganham a passagem
    B.scan.walls = []; B.scan.doors = r.doors;
    SC.apply(sc(), B.scan);
    const doors = sc().walls.filter((w) => w.door), solid = sc().walls.filter((w) => !w.door);
    const blocks = (px, py) => solid.some((w) => { const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / L2)); return Math.hypot(px - w.x1 - dx * t, py - w.y1 - dy * t) < 2; });
    log.push(`criou ${doors.length} portas · paredes ${walls0} → ${solid.length} · parede ainda tapa a porta: x6 = ${blocks(6 * g, 3.5 * g)}, x10 = ${blocks(10 * g, 3.5 * g)} · resto da parede continua: ${blocks(6 * g, 1.5 * g) && blocks(6 * g, 5.5 * g)}`);
    App.History.undoLast(); await W(30);
    log.push('Ctrl+Z desfaz tudo de uma vez: paredes ' + sc().walls.filter((w) => !w.door).length + ' · portas ' + sc().walls.filter((w) => w.door).length);
    // 4) palpite pelas paredes do mapa (sem exemplo): abertura de 1 quadrado vira porta
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [wl(1, 6, 3, 6), wl(4, 6, 6, 6)] });
    const r2 = await SC.run(sc(), Object.assign({}, UI.scanOpts, { tpls: [], gaps: true, sync: true }));
    log.push(`palpite pelas paredes do mapa: ${r2.doors.length} porta(s) · na abertura (3,6)-(4,6): ${r2.doors.some((d) => Math.abs((d.x1 + d.x2) / 2 / g - 3.5) < 0.2 && Math.abs((d.y1 + d.y2) / 2 / g - 6) < 0.2)}`);
    // 5) sem exemplo e sem palpite: pede um dos dois
    const r3 = await SC.run(sc(), Object.assign({}, UI.scanOpts, { tpls: [], gaps: false, sync: true }));
    log.push('sem exemplo nem palpite: pede = ' + !!r3.need);
    // 6) a ferramenta Parede continua abrindo a janela completa
    B.setTool('wall'); UI.refresh(); await W(100);
    [...document.querySelectorAll('#tool-opts .btn')].find((b) => /Procurar paredes no mapa/.test(b.textContent)).click(); await W(300);
    const win2 = [...document.querySelectorAll('.win')].find((w) => /Procurar paredes/.test(w.textContent));
    log.push('ferramenta Parede: janela completa = ' + !!win2 + ' · etapas: ' + (win2 ? [...win2.querySelectorAll('.eyebrow')].map((e) => e.textContent).join(' | ') : '-') + ' · só portas: ' + UI.scanOpts.only);
    UI.closeWindow('scan');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
