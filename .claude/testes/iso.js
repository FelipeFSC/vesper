// Plano 29 · Isolamento de som: desenho, ajuste do formato, regras do som, campanha antiga, menu e painel
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, A = App.Audio, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    (sc().rooms || []).slice().forEach((r) => S.dispatch({ type: 'room.delete', sceneId: sc().id, id: r.id }));
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const ev = (type, x, y, opt) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y), opt || {})));
    const click = (x, y, opt) => { ev('pointerdown', x, y, opt); ev('pointerup', x, y, opt); };
    const dbl = (x, y) => B.canvas.dispatchEvent(new MouseEvent('dblclick', Object.assign({ bubbles: true }, scr(x, y))));
    const room = () => (sc().rooms || [])[0];
    const cells = (r) => r.pts.map(([x, y]) => '(' + x / g + ',' + y / g + ')').join(' ');

    // 1) desenhar ponto a ponto (padrão): 4 cantos e clicar no primeiro fecha
    B.setTool('room'); App.UI.refresh(); await W(100);
    for (const [x, y] of [[1, 1], [6, 1], [6, 5], [1, 5]]) click(x * g, y * g);
    click(1 * g, 1 * g); await W(50);
    log.push(`desenho ponto a ponto: ${(sc().rooms || []).length} isolamento, cantos ${room() && cells(room())}, música de fora: ${room() && room().outside}, ambiente: ${room() && room().ambient}`);
    log.push('menu da ferramenta escondido: ' + $('#tool-opts').hidden);

    // 2) AJUSTAR: arrastar um canto, arrastar a borda (move tudo), dois cliques na borda e num canto
    ev('pointerdown', 6 * g, 5 * g); ev('pointermove', 7.4 * g, 6.2 * g); ev('pointerup', 7.4 * g, 6.2 * g); await W(30);
    log.push(`arrastar o canto (6,5) → ${cells(room())}`);
    ev('pointerdown', 3 * g, 1 * g); ev('pointermove', 4 * g, 2 * g); ev('pointerup', 4 * g, 2 * g); await W(30);
    log.push(`arrastar a borda move tudo 1 → e 1 ↓: ${cells(room())}`);
    dbl(5 * g, 2 * g); await W(30);
    log.push(`dois cliques na borda de cima: ${room().pts.length} cantos (${cells(room())})`);
    dbl(5 * g, 2 * g); await W(30);
    log.push(`dois cliques nesse canto: ${room().pts.length} cantos`);
    // desfazer funciona no ajuste
    App.History.undoLast(); await W(30); log.push('Ctrl+Z desfaz o último ajuste: ' + room().pts.length + ' cantos'); App.History.redoLast(); await W(30);

    // 3) retângulo arrastando no vazio
    ev('pointerdown', 10 * g, 1 * g); ev('pointermove', 12 * g, 2 * g); ev('pointermove', 14 * g, 4 * g); ev('pointerup', 14 * g, 4 * g); await W(30);
    const r2 = sc().rooms[1];
    log.push(`arrastar no vazio faz retângulo: ${r2 ? cells(r2) : 'não criou'}`);

    // 4) regras do som (o mestre ouve pelo centro da câmera)
    const iso = room(), inP = { x: iso.pts[0][0] + g, y: iso.pts[0][1] + g };
    const outP = { x: 9 * g, y: 8 * g };
    const snd = { id: 'tst', name: 'x.mp3', x: inP.x, y: inP.y, r: 4, vol: 1, on: true, at: Date.now() };
    const at = (p, s) => { B.viewCenter = () => p; return Math.round(A.hearing(sc(), s).v * 100); };
    log.push(`som dentro: ouvinte dentro ${at({ x: inP.x + g, y: inP.y }, snd)}% · ouvinte fora ${at(outP, snd)}%`);
    const sOut = Object.assign({}, snd, { x: outP.x - g, y: outP.y });
    log.push(`som fora: ouvinte fora ${at(outP, sOut)}% · ouvinte dentro ${at(inP, sOut)}%`);
    const far = { x: iso.pts[2][0] - g / 2, y: iso.pts[2][1] - g / 2 };
    log.push(`canto longe dentro: normal ${at(far, snd)}% · "igual na área inteira" ${at(far, Object.assign({}, snd, { fill: true }))}%`);
    // música e ambiente de fora
    B.viewCenter = () => inP; await W(250);
    log.push(`dentro com Música de fora=Para: música ${A.duckState.music}, ambiente ${A.duckState.ambient}`);
    S.dispatch({ type: 'room.update', sceneId: sc().id, id: iso.id, patch: { outside: 'keep', ambient: 'muffle' } }); await W(250);
    log.push(`dentro com Continua + Abafado: música ${A.duckState.music}, ambiente ${A.duckState.ambient}`);
    B.viewCenter = () => outP; await W(250);
    log.push(`fora: música ${A.duckState.music}, ambiente ${A.duckState.ambient}`);

    // 5) soltar uma faixa dentro: vira som do mapa (não muda o isolamento)
    const n0 = (sc().sounds || []).length;
    A.sizes['musicas/alaude.mp3'] = 1; A.dropAt('musicas/alaude.mp3', inP); await W(50);
    log.push(`soltar faixa dentro: sons do mapa ${n0} → ${(sc().sounds || []).length} · isolamento continua sem música própria: ${!('music' in room())}`);

    // 6) painel do som dentro mostra "Igual na área inteira"
    const s1 = sc().sounds[sc().sounds.length - 1];
    B.selectObj('sound', s1); App.UI.refresh(); await W(150);
    log.push('painel do som: opção "Igual na área inteira" = ' + !!([...document.querySelectorAll('#token-hud label.check')].find((l) => /Igual na área inteira/.test(l.textContent))));

    // 7) painel do isolamento e menu do botão direito
    B.setTool('select'); B.selectObj('room', room()); App.UI.refresh(); await W(150);
    log.push('painel: ' + [...document.querySelectorAll('#token-hud .eyebrow')].map((e) => e.textContent).join(' | ') + ' · botões: ' + [...document.querySelectorAll('#token-hud .hud-btns .btn')].map((b) => b.textContent.trim()).join(', '));
    [...document.querySelectorAll('#token-hud .hud-btns .btn')].find((b) => /Ajustar formato/.test(b.textContent)).click(); await W(100);
    log.push('"Ajustar formato" troca para a ferramenta: ' + B.tool + ' · isolamento selecionado: ' + (B.selectedRoom === room().id));
    B.setTool('select');
    const hits = B.hitAll(sc(), { x: iso.pts[0][0] + g * 1.5, y: iso.pts[0][1] + g * 2.5 });
    log.push('botão direito dentro: ' + hits.map((x) => x.kind).join(', '));
    App.UI.contextMenu(300, 300, sc(), inP, hits.filter((x) => x.kind === 'room')); await W(50);
    log.push('menu: ' + ($('.ctx-menu .cm-title') || {}).textContent + ' → ' + [...document.querySelectorAll('.ctx-menu > .cm-list > .cm-item, .ctx-menu > .cm-list > .cm-has-sub > .cm-item')].map((b) => b.textContent.trim()).join(' | '));
    App.UI.closeContextMenu();

    // 8) campanha antiga: sala com música vira isolamento + som do mapa; sala sem música continua deixando a música de fora
    const old = JSON.parse(JSON.stringify(S.state));
    const os = old.scenes[old.activeSceneId];
    os.rooms = [{ id: 'r1', name: 'Taverna', pts: [[0, 0], [4 * g, 0], [4 * g, 4 * g], [0, 4 * g]], music: { name: 'musicas/taverna.mp3', size: 1 }, at: 123, vol: 0.7, ambient: 'muffle' },
      { id: 'r2', name: 'Cripta', pts: [[6 * g, 0], [9 * g, 0], [9 * g, 3 * g]], music: null, ambient: 'stop' }];
    os.sounds = [];
    const m = S.migrate(old), ms = m.scenes[m.activeSceneId];
    const t = ms.rooms.find((r) => r.id === 'r1'), c = ms.rooms.find((r) => r.id === 'r2'), ns = ms.sounds[0];
    log.push(`campanha antiga: Taverna → música de fora ${t.outside}, ambiente ${t.ambient}, sem música própria ${!t.music} · som criado "${ns && ns.name}" em (${ns && ns.x / g},${ns && ns.y / g}) alcance ${ns && ns.r}, volume ${ns && ns.vol}, igual na área ${ns && ns.fill}`);
    log.push(`campanha antiga: Cripta (sem música) → música de fora ${c.outside}`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
