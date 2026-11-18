// Plano 11 · Cego ao atravessar parede: arrastar através de parede que tapa a visão deixa o jogador cego e o token volta ao soltar
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
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [
      wl('w', 7, 0, 7, 6), wl('porta', 7, 6, 7, 7, { door: true, open: true }), wl('w2', 7, 7, 7, 10),
      wl('meia', 3, 0, 3, 3, { cover: 'half' }),
      wl('c1', 10, 2, 14, 2), wl('c2', 10, 2, 10, 6),
      wl('ponta', 12, 8, 15, 8),
    ] });
    const tk = Object.values(sc().tokens), hero = tk.find((t) => /lyra/i.test(t.name)), gob = tk.find((t) => t.id !== hero.id);
    const mv = (t, cx, cy) => S.dispatch({ type: 'token.move', sceneId: sc().id, id: t.id, x: cx * g, y: cy * g });
    mv(hero, 5, 4); mv(gob, 9, 4);
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || '*';
    S.viewAs = pid; App.UI.setMode('play'); App.UI.refresh(); B.fit(); B.render(); await W(200);
    let rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const pd = (x, y) => B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y))));
    const pm = (x, y) => window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(x, y))));
    const pu = (x, y) => window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(x, y))));
    const right = (x, y) => window.dispatchEvent(new MouseEvent('mousedown', Object.assign({ bubbles: true, button: 2, buttons: 3 }, scr(x, y))));
    const c = (cx, cy) => [cx * g + g / 2, cy * g + g / 2];
    const pix = (cx, cy) => { const p = B.toScreen(cx * g + g / 2, cy * g + g / 2), d = B.dpr; return [...B.ctx.getImageData(Math.round(p.x * d), Math.round(p.y * d), 1, 1).data].slice(0, 3).join(','); };
    const pos = (t) => `(${sc().tokens[t.id].x / g}, ${sc().tokens[t.id].y / g})`;

    B.render();
    log.push(`antes: chão do lado de cá = ${pix(4, 6)} · goblin atrás da parede (parede tapa) = ${pix(9, 4)}`);
    // arrasta através da parede (sem porta)
    pd(...c(5, 4)); pm(...c(6, 4)); pm(...c(8, 4)); B.render();
    log.push(`arrastando através da parede: chão do lado de cá = ${pix(4, 6)}`);
    pm(...c(6, 4)); B.render();
    log.push(`recuou para o lado de cá: chão = ${pix(4, 6)}`);
    pm(...c(8, 4)); pu(...c(8, 4)); await W(50);
    log.push(`soltou do outro lado: token em ${pos(hero)} (esperado: voltou para (5, 4))`);
    // pela porta aberta, com pontos de passagem
    pd(...c(5, 4)); pm(...c(6, 6)); right(...c(6, 6)); pm(...c(8, 6)); B.render();
    log.push(`pela porta aberta (ponto em (6,6)): chão = ${pix(4, 6)}`);
    pu(...c(8, 6)); await W(50);
    log.push(`soltou depois da porta: token em ${pos(hero)}`);
    mv(hero, 5, 4);
    // meia parede: só aviso
    const p = (cx, cy) => ({ x: cx * g + g / 2, y: cy * g + g / 2 });
    const h = sc().tokens[hero.id];
    log.push(`meia parede: vermelho = ${B.crossesWall(sc(), p(2, 1), p(4, 1))} · cego = ${B.pathBlind(sc(), h, [p(2, 1), p(4, 1)])}`);
    log.push(`canto da sala (diagonal pelo encontro das paredes): vermelho = ${B.crossesWall(sc(), p(9, 1), p(10, 2))} · cego = ${B.pathBlind(sc(), h, [p(9, 1), p(10, 2)])}`);
    log.push(`rente à ponta solta de uma parede: vermelho = ${B.crossesWall(sc(), p(11, 7), p(12, 8))} · cego = ${B.pathBlind(sc(), h, [p(11, 7), p(12, 8)])}`);
    S.dispatch({ type: 'wall.door', sceneId: sc().id, id: 'porta', open: false }); log.push(`porta fechada destrancada: cego = ${B.pathBlind(sc(), h, [p(6, 6), p(8, 6)])} (pode passar)`); S.dispatch({ type: 'wall.lock', sceneId: sc().id, id: 'porta', locked: true });
    log.push(`porta trancada: cego = ${B.pathBlind(sc(), h, [p(6, 6), p(8, 6)])}`);
    S.dispatch({ type: 'wall.door', sceneId: sc().id, id: 'porta', open: true }); S.dispatch({ type: 'wall.lock', sceneId: sc().id, id: 'porta', locked: false }); S.dispatch({ type: 'wall.door', sceneId: sc().id, id: 'porta', open: true });
    // setas do teclado contra a parede
    B.selected = hero.id;
    mv(hero, 6, 4);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    log.push(`seta para a direita encostado na parede: token em ${pos(hero)} (esperado (6, 4))`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    log.push(`seta para a esquerda: token em ${pos(hero)} (esperado (5, 4))`);
    // pela rede (permit no mestre)
    S.viewAs = null; App.UI.setMode('edit');
    mv(hero, 5, 4);
    S.remoteAction({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 8 * g, y: 4 * g, path: [[5 * g, 4 * g], [8 * g, 4 * g]], at: Date.now() }, pid);
    log.push(`jogador manda pela rede um caminho através da parede: recusado = ${pos(hero) === '(5, 4)'}`);
    S.remoteAction({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 8 * g, y: 4 * g, at: Date.now() }, pid);
    log.push(`sem caminho (pulo direto): recusado = ${pos(hero) === '(5, 4)'}`);
    S.remoteAction({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 8 * g, y: 6 * g, path: [[5 * g, 4 * g], [6 * g, 6 * g], [8 * g, 6 * g]], at: Date.now() }, pid);
    log.push(`pela porta: aceito = ${pos(hero) === '(8, 6)'}`);
    // mestre arrasta através da parede: pode
    mv(hero, 5, 4); await W(300); rect = B.canvas.getBoundingClientRect(); B.render();
    pd(...c(5, 4)); pm(...c(6, 4)); pm(...c(8, 4)); pu(...c(8, 4)); await W(50);
    log.push(`mestre arrastou através da parede: token em ${pos(hero)} (esperado (8, 4))`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
