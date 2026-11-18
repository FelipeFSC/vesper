// Plano 11 · foto: jogador arrastando o token através de uma parede (fica cego) — usar com -shot e '?tutorial#player'
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: true } } });
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'w', x1: 7 * g, y1: 0, x2: 7 * g, y2: 10 * g, cover: 'full' }] });
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 5 * g, y: 4 * g });
    S.viewAs = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || '*';
    App.UI.setMode('play'); App.UI.refresh(); B.fit(); await W(300);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const c = (cx, cy) => [cx * g + g / 2, cy * g + g / 2];
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(...c(5, 4)))));
    for (const x of [6, 7, 8]) window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(...c(x, 4)))));
    B.render();
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
