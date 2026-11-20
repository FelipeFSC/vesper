// Plano 13 · Porta trancada e destrancada. Com -shot e '?tutorial#shot': foto do mestre com a porta trancada selecionada.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, L = App.Light, sc = () => S.currentScene(), g = sc().grid;
    const wl = (id, x1, y1, x2, y2, extra) => Object.assign({ id, x1: x1 * g, y1: y1 * g, x2: x2 * g, y2: y2 * g, cover: 'full' }, extra);
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: true } } });
    // porta antiga (sem o campo locked), fechada
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [wl('w1', 7, 0, 7, 4), wl('porta', 7, 4, 7, 5, { door: true, open: false }), wl('w2', 7, 5, 7, 10)] });
    const door = () => sc().walls.find((w) => w.id === 'porta');
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    const mv = (cx, cy) => S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: cx * g, y: cy * g });
    const pos = () => `(${sc().tokens[hero.id].x / g}, ${sc().tokens[hero.id].y / g})`;
    const P = (cx, cy) => ({ x: cx * g + g / 2, y: cy * g + g / 2 });
    mv(5, 4);
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || '*';
    let rect;
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const drag = (pts) => {
      B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(...pts[0]))));
      for (const q of pts.slice(1)) window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(...q))));
      window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(...pts[pts.length - 1]))));
    };
    const clickDoor = (shift) => { const o = Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1, shiftKey: !!shift }, scr(7 * g, 4.5 * g)); B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); };
    const c = (cx, cy) => [cx * g + g / 2, cy * g + g / 2];
    const asPlayer = async () => { S.viewAs = pid; App.UI.setMode('play'); App.UI.refresh(); await W(250); rect = B.canvas.getBoundingClientRect(); };
    const asGM = async () => { S.viewAs = null; App.UI.setMode('edit'); App.UI.refresh(); await W(250); rect = B.canvas.getBoundingClientRect(); };

    // 1) porta antiga fechada = destrancada: dá para passar e ela continua fechada
    log.push(`porta antiga: trancada = ${!!door().locked} · atravessar fica vermelho = ${B.crossesWall(sc(), P(6, 4), P(8, 4))} · cega = ${B.pathBlind(sc(), sc().tokens[hero.id], [P(6, 4), P(8, 4)])} · tapa a visão = ${L.blocked(sc(), P(6, 4).x, P(6, 4).y, P(8, 4).x, P(8, 4).y, 1.8)}`);
    await asPlayer();
    drag([c(5, 4), c(6, 4), c(8, 4)]); await W(50);
    log.push(`jogador arrastou pela porta fechada destrancada: token em ${pos()} · porta continua fechada = ${!door().open}`);
    mv(5, 4);
    S.remoteAction({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 8 * g, y: 4 * g, path: [[5 * g, 4 * g], [8 * g, 4 * g]], at: Date.now() }, pid);
    log.push(`pela rede, através da porta destrancada: aceito = ${pos() === '(8, 4)'}`);
    mv(5, 4);

    // 2) mestre tranca com Shift + clique
    await asGM();
    clickDoor(true); await W(300);
    log.push(`mestre Shift+clique: trancada = ${!!door().locked} · fechada = ${!door().open} · painel: ${(document.querySelector('#token-hud .hud-sub') || {}).textContent}`);
    log.push('botões do painel: ' + [...document.querySelectorAll('#token-hud .seg button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')).join(' | '));

    // 3) jogador e porta trancada
    await asPlayer();
    clickDoor(false); await W(100);
    log.push(`jogador clicou na porta trancada: continua fechada = ${!door().open} · aviso: ${[...document.querySelectorAll('.toast, #toasts *')].map((t) => t.textContent).filter((t) => /trancada/.test(t)).slice(-1)[0] || '(não achei)'}`);
    drag([c(5, 4), c(6, 4), c(8, 4)]); await W(50);
    log.push(`jogador arrastou pela porta trancada: token em ${pos()} (esperado (5, 4)) · vermelho = ${B.crossesWall(sc(), P(6, 4), P(8, 4))}`);
    S.remoteAction({ type: 'wall.door', sceneId: sc().id, id: 'porta', open: true }, pid);
    log.push(`pela rede, abrir a trancada: recusado = ${!door().open}`);
    S.remoteAction({ type: 'wall.lock', sceneId: sc().id, id: 'porta', locked: false }, pid);
    log.push(`pela rede, destrancar: recusado = ${!!door().locked}`);
    S.remoteAction({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 8 * g, y: 4 * g, path: [[5 * g, 4 * g], [8 * g, 4 * g]], at: Date.now() }, pid);
    log.push(`pela rede, atravessar a trancada: recusado = ${pos() === '(5, 4)'}`);

    // 4) mestre abre a trancada: fica aberta e destrancada; painel destranca
    await asGM();
    clickDoor(false); await W(300);
    log.push(`mestre clicou na trancada: aberta = ${!!door().open} · trancada = ${!!door().locked}`);
    [...document.querySelectorAll('#token-hud .seg button')].find((b) => /^Trancada/.test(b.textContent)).click(); await W(300);
    log.push(`painel → Trancada: trancada = ${!!door().locked} · fechada = ${!door().open}`);
    [...document.querySelectorAll('#token-hud .seg button')].find((b) => /Destrancada/.test(b.textContent)).click(); await W(50);
    log.push(`painel → Destrancada: trancada = ${!!door().locked}`);

    // 5) ferramenta Porta com "Trancada"
    B.setTool('door'); await W(150);
    log.push('opções da Porta: ' + [...document.querySelectorAll('#tool-opts .to-row')].map((b) => b.textContent).join(' | '));
    [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /^Trancada/.test(b.textContent)).click(); await W(50);
    drag([[12 * g, 2 * g], [13 * g, 2 * g], [14 * g, 2 * g]]); await W(50);
    const nd = sc().walls[sc().walls.length - 1];
    log.push(`porta nova com "Trancada": porta = ${!!nd.door} · trancada = ${!!nd.locked}`);
    B.setTool('select');

    if (location.hash === '#shot') {
      S.dispatch({ type: 'wall.lock', sceneId: sc().id, id: 'porta', locked: true });
      B.selectedDoor = 'porta'; App.UI.refresh(); B.requestRender();
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
