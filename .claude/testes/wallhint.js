// Contorno das paredes no escuro: o jogador vê uma linha clara nas paredes que os tokens dele enxergam.
// Com -shot e '?tutorial#player', tira a foto como o jogador vê.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: false } } });
    for (const t of Object.values(sc().tokens)) S.dispatch({ type: 'token.update', sceneId: sc().id, id: t.id, patch: { light: null, darkvision: 0 } });
    const wl = (id, x1, y1, x2, y2, extra) => Object.assign({ id, x1: x1 * g, y1: y1 * g, x2: x2 * g, y2: y2 * g, cover: 'full' }, extra);
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [
      wl('a', 2, 2, 5, 2), wl('door', 5, 2, 6, 2, { door: true, open: false }), wl('b', 6, 2, 9, 2),
      wl('c', 9, 2, 9, 8), wl('d', 9, 8, 2, 8), wl('e', 2, 8, 2, 2),
      wl('fora', 12, 1, 12, 9),
    ] });
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 4 * g, y: 4 * g });
    S.viewAs = '*'; App.UI.setMode('play'); App.UI.refresh(); B.fit(); B.render(); await W(300); B.render();
    const px = (wx, wy) => {
      const p = B.toScreen(wx, wy), d = B.dpr, x = B.hintCanvas.getContext('2d');
      let best = 0; // maior opacidade num quadradinho em volta do ponto
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) best = Math.max(best, x.getImageData(Math.round(p.x * d) + dx, Math.round(p.y * d) + dy, 1, 1).data[3]);
      return best;
    };
    log.push(`parede da sala (vista): linha = ${px(9 * g, 5 * g) > 0} · porta: linha = ${px(5.5 * g, 2 * g) > 0} · parede de fora (atrás da sala): linha = ${px(12 * g, 5 * g) > 0}`);
    // névoa de guerra cobrindo a metade de baixo: a parede de baixo some
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { fog: { enabled: true, shapes: [{ mode: 'reveal', x: 0, y: 0, w: 16 * g, h: 6 * g }], v: 1 } } });
    B.render(); await W(100); B.render();
    log.push(`com névoa embaixo: parede de baixo = ${px(5 * g, 8 * g) > 0} · parede da direita no alto = ${px(9 * g, 3 * g) > 0}`);
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { fog: { enabled: false, shapes: [], v: 2 } } });
    if (location.hash !== '#player') { S.viewAs = null; App.UI.setMode('edit'); B.render(); log.push(`mestre: camada de contorno não desenhada de novo (hint só no jogador)`); }
    B.requestRender();
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
