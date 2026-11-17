window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    const S = App.Store, A = App.Audio, B = App.Board, sc0 = S.currentScene(), g = sc0.grid;
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const sc = () => S.currentScene();
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.setTool('room');
    await W(100);
    log.push('opções da ferramenta: ' + !!$('#tool-opts .seg') + ' · ' + $('#tool-opts').textContent.slice(0, 60));

    // desenha um retângulo arrastando no canvas (cantos 1,1 → 6,5)
    const cv = B.canvas, rect = cv.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x * g - B.cam.x) * B.cam.z, clientY: rect.top + (y * g - B.cam.y) * B.cam.z });
    const ev = (type, x, y, target) => (target || cv).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(x, y))));
    ev('pointerdown', 1, 1); ev('pointermove', 4, 3, window); ev('pointermove', 6, 5, window); ev('pointerup', 6, 5, window);
    await W(100);
    log.push('retângulo: ' + JSON.stringify((sc().rooms[0] || {}).pts) + ' selecionada=' + (B.selectedRoom === (sc().rooms[0] || {}).id));
    // polígono em L
    B.roomMode = 'poly';
    for (const [x, y] of [[8, 1], [14, 1], [14, 8], [11, 8], [11, 4], [8, 4]]) { ev('pointerdown', x, y); ev('pointerup', x, y, window); }
    ev('pointerdown', 8, 1); ev('pointerup', 8, 1, window); // fecha no primeiro ponto
    await W(100);
    log.push('polígono: ' + (sc().rooms[1] ? sc().rooms[1].pts.length + ' cantos' : 'não criado'));
    const r1 = sc().rooms[0], r2 = sc().rooms[1];
    log.push('roomAt dentro do L (12,6): ' + ((A.roomAt(sc(), { x: 12.5 * g, y: 6.5 * g }) || {}).name) + ' · no vão do L (9,6): ' + (A.roomAt(sc(), { x: 9.5 * g, y: 6.5 * g }) || { name: 'nenhuma' }).name);

    // painel da sala
    B.selectedRoom = r1.id; B.requestRender(); await W(150);
    log.push('painel: ' + !!$('#token-hud select') + ' opções de ambiente: ' + [...document.querySelectorAll('#token-hud .seg button')].map((b) => b.textContent).join('/'));

    // isolamento: som no mapa dentro da sala 1
    const spot = { id: 'sp', name: 'x.mp3', x: 3 * g, y: 3 * g, r: 30, vol: 1, on: true, at: Date.now() };
    const lisIn = [{ x: 2 * g, y: 2 * g }], lisOut = [{ x: 3 * g, y: 7 * g }];
    const hear = (lis, s) => { const L = App.Audio; return Math.round(L.hearing ? hearingAt(lis, s) : 0); };
    function hearingAt(lis, s) { const sv = S.currentScene(); const save = B.viewCenter; return 0; }
    // usa a função interna pelo caminho público: listeners do mestre = centro da câmera
    const at = (p, s) => { B.viewCenter = () => p; return Math.round(A.hearing(sc(), s).v * 100); };
    const oldVC = B.viewCenter;
    log.push(`som dentro da sala 1: ouvinte dentro ${at(lisIn[0], spot)}% · ouvinte fora ${at(lisOut[0], spot)}%`);
    const spotOut = Object.assign({}, spot, { x: 3 * g, y: 8 * g });
    log.push(`som fora: ouvinte dentro ${at(lisIn[0], spotOut)}% · ouvinte fora ${at(lisOut[0], spotOut)}%`);

    // música da sala e pausa da música da cena
    A.sizes['musicas/taverna.mp3'] = 1;
    A.dropAt('musicas/taverna.mp3', { x: 3 * g, y: 3 * g });
    await W(100);
    log.push('soltar música dentro da sala: música da sala=' + (sc().rooms[0].music || {}).name + ' · marcador criado? ' + (sc().sounds || []).some((x) => x.name === 'musicas/taverna.mp3'));
    B.viewCenter = () => ({ x: 2 * g, y: 2 * g }); await W(400);
    log.push('mestre olhando dentro: minha sala=' + (A.myRoom() || {}).name + ' · música da cena=' + A.duckState.music + ' ambiente=' + A.duckState.ambient);
    S.dispatch({ type: 'room.update', sceneId: sc().id, id: r1.id, patch: { ambient: 'muffle' } }); await W(400);
    log.push('ambiente abafado: ' + A.duckState.ambient);
    B.viewCenter = () => ({ x: 12.5 * g, y: 6.5 * g }); await W(400);
    log.push('na sala 2 (sem música): música da cena=' + A.duckState.music + ' ambiente=' + A.duckState.ambient);
    B.viewCenter = () => ({ x: 3 * g, y: 8 * g }); await W(400);
    log.push('fora de salas: música=' + A.duckState.music + ' ambiente=' + A.duckState.ambient);
    B.viewCenter = oldVC;
    // jogador com token dentro
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 2 * g, y: 2 * g });
    S.viewAs = '*'; await W(400);
    log.push('jogador com a Lyra na sala 1: minha sala=' + (A.myRoom() || {}).name + ' música da cena=' + A.duckState.music);
    S.viewAs = null;
    // apagar com Delete
    B.selectedRoom = r2.id;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await W(100);
    log.push('Delete apaga a sala selecionada: salas=' + sc().rooms.length);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
