// Plano 1 · Imagens no tabuleiro: colocar, níveis, mover, redimensionar, girar, esconder, biblioteca, exportar
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    // imagem 200×100 (2:1) feita num canvas
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 100;
    const cx = cv.getContext('2d'); cx.fillStyle = '#c0392b'; cx.fillRect(0, 0, 200, 100); cx.fillStyle = '#f1c40f'; cx.fillRect(20, 20, 60, 60);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'bau_de_ouro.png', { type: 'image/png' });

    // 1) soltar o arquivo no mapa
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const dt = new DataTransfer(); dt.items.add(file);
    B.canvas.dispatchEvent(new DragEvent('drop', Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt }, scr(5 * g, 2 * g))));
    await W(800);
    const p0 = sc().props[0];
    log.push(`soltar arquivo: ${sc().props.length} imagem "${p0 && p0.name}" ${p0 && p0.w / g}×${p0 && p0.h / g} quad. em (${p0 && p0.x / g}, ${p0 && p0.y / g}) selecionada=${B.selectedProp === (p0 && p0.id)}`);
    const tokZ = Object.values(sc().tokens).map((t) => t.z || 0);
    log.push(`nível: imagem z=${p0.z} · menor token z=${Math.min(...tokZ)} → por baixo dos tokens: ${p0.z < Math.min(...tokZ)}`);

    // 2) painel
    App.UI.refresh(); B.requestRender(); await W(200);
    log.push('painel da imagem: ' + !!$('#token-hud .prop-grid') + ' · botões de nível: ' + document.querySelectorAll('#token-hud .order-row button').length);

    // 3) níveis
    const order = () => { const s = sc(); return Object.values(s.tokens).map((t) => [t.name, t.z || 0]).concat((s.props || []).map((p) => ['IMG', p.z || 0])).sort((a, b) => a[1] - b[1]).map((x) => x[0]).join(' < '); };
    log.push('ordem inicial: ' + order());
    S.dispatch({ type: 'order.move', sceneId: sc().id, kind: 'prop', id: p0.id, dir: 'up' }); log.push('subir um nível: ' + order());
    S.dispatch({ type: 'order.move', sceneId: sc().id, kind: 'prop', id: p0.id, dir: 'front' }); log.push('trazer para frente: ' + order());
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'order.move', sceneId: sc().id, kind: 'token', id: hero.id, dir: 'front' }); log.push('Lyra para frente: ' + order());
    S.dispatch({ type: 'order.move', sceneId: sc().id, kind: 'prop', id: p0.id, dir: 'back' }); log.push('imagem para trás: ' + order());

    // 4) mover arrastando (clique na imagem, longe dos tokens)
    const P = () => Object.assign({}, sc().props.find((x) => x.id === p0.id));
    const ev = (type, x, y, opt) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(x, y), opt || {})));
    B.selectedProp = null; B.setTool('select');
    let q = P(); ev('pointerdown', q.x + 10, q.y + 10); ev('pointermove', q.x + 10 + 2 * g, q.y + 10 + g); ev('pointerup', q.x + 10 + 2 * g, q.y + 10 + g); await W(100);
    log.push(`mover 2 quad. →, 1 ↓: (${q.x / g},${q.y / g}) → (${P().x / g},${P().y / g}) · selecionada pelo clique: ${B.selectedProp === p0.id}`);
    // 5) redimensionar pelo canto de baixo à direita (proporção mantida)
    q = P(); ev('pointerdown', q.x + q.w, q.y + q.h); ev('pointermove', q.x + q.w * 2, q.y + q.h * 1.2); ev('pointerup', q.x + q.w * 2, q.y + q.h * 1.2); await W(100);
    log.push(`redimensionar: ${q.w / g}×${q.h / g} → ${Math.round(P().w / g * 100) / 100}×${Math.round(P().h / g * 100) / 100} quad. (proporção ${Math.round(P().w / P().h * 100) / 100}) · canto de cima à esquerda parado: ${P().x === q.x && P().y === q.y}`);
    // 6) girar pela bolinha de cima com Shift
    q = P(); const top = { x: q.x + q.w / 2, y: q.y - 26 / B.cam.z };
    ev('pointerdown', top.x, top.y); ev('pointermove', q.x + q.w * 2, q.y + q.h / 2 + 3, { shiftKey: true }); ev('pointerup', q.x + q.w * 2, q.y + q.h / 2 + 3, { shiftKey: true }); await W(100);
    log.push('girar com Shift (mouse à direita): ' + P().rot + '°');
    // 7) travar: não move
    S.dispatch({ type: 'prop.update', sceneId: sc().id, id: p0.id, patch: { locked: true, rot: 0 } }); q = P();
    ev('pointerdown', q.x + 10, q.y + 10); ev('pointermove', q.x + 10 + 3 * g, q.y + 10); ev('pointerup', q.x + 10 + 3 * g, q.y + 10); await W(100);
    log.push('travada não move: ' + (P().x === q.x));
    S.dispatch({ type: 'prop.update', sceneId: sc().id, id: p0.id, patch: { locked: false } });
    // 8) invisível para os jogadores
    S.dispatch({ type: 'prop.update', sceneId: sc().id, id: p0.id, patch: { hidden: true } });
    S.viewAs = '*'; App.UI.refresh(); await W(150);
    const layerRow = [...document.querySelectorAll('#layers .layer')].find((r) => /Imagens/.test(r.textContent));
    log.push('jogador: camada Imagens conta ' + (layerRow ? layerRow.querySelector('.n').textContent : '?') + ' (invisível não conta)');
    S.viewAs = null; S.dispatch({ type: 'prop.update', sceneId: sc().id, id: p0.id, patch: { hidden: false } });
    // 9) biblioteca: ferramenta Imagem mostra a miniatura; clicar coloca outra
    B.setTool('prop'); App.UI.refresh(); await W(200);
    [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /Imagens da campanha/.test(b.textContent)).click(); await W(50);
    const thumbs = document.querySelectorAll('#tool-sub .img-lib img');
    log.push('biblioteca: ' + thumbs.length + ' miniatura(s)');
    if (thumbs[0]) thumbs[0].click(); await W(400);
    log.push('clicar na miniatura: ' + sc().props.length + ' imagens, mesma figura=' + (sc().props[1] && sc().props[1].img === p0.img) + ', nome "' + (sc().props[1] && sc().props[1].name) + '"');
    // 10) Ctrl+D e Delete
    B.selectedProp = sc().props[1].id;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true })); await W(100);
    log.push('Ctrl+D: ' + sc().props.length + ' imagens');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(100);
    log.push('Delete: ' + sc().props.length + ' imagens');
    // 11) exportar a cena leva a imagem
    const bundle = App.Storage.sceneBundle(sc().id);
    log.push('exportar cena: imagem incluída=' + !!bundle.assets[p0.img] + ' · imagens na cena exportada=' + bundle.scene.props.length);
    // 12) token novo entra por cima de tudo
    S.dispatch({ type: 'order.move', sceneId: sc().id, kind: 'prop', id: p0.id, dir: 'front' });
    B.placeActor(S.actorOf(hero).id, { x: 2 * g, y: 7 * g }); await W(100);
    const newest = Object.values(sc().tokens).sort((a, b) => (b.z || 0) - (a.z || 0))[0];
    log.push('token novo acima da imagem que estava na frente: ' + ((newest.z || 0) > P().z));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
