// Plano 8 · foto: mapa escuro com círculo quente tremulando, cone azul, área, escuridão e lanterna do token.
// -shot com '#' vazio = mestre (marcadores e luz selecionada); '?tutorial#player' = como o jogador vê
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [];
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: false } } });
    for (const t of Object.values(sc().tokens)) S.dispatch({ type: 'token.update', sceneId: sc().id, id: t.id, patch: { light: null, darkvision: 0 } });
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'w1', x1: 10 * g, y1: 1 * g, x2: 10 * g, y2: 4 * g, cover: 'full' }] });
    const fg = B.addLight(sc(), { name: 'Fogueira', shape: 'circle', x: 4.5 * g, y: 5.5 * g, bright: 2, dim: 4, flicker: true });
    B.addLight(sc(), { name: 'Janela', shape: 'cone', x: 12.5 * g, y: 0.2 * g, bright: 4, dim: 6, dir: 110, angle: 50, color: '#8fb4ff', tint: 0.55 });
    B.addLight(sc(), { name: 'Altar', shape: 'area', pts: [[12 * g, 6 * g], [15 * g, 6 * g], [15 * g, 9 * g], [12 * g, 9 * g]], edge: 1, color: '#6fe08a', tint: 0.5 });
    const dk = B.addLight(sc(), { kind: 'dark', name: 'Escuridão', shape: 'circle', x: 3.5 * g, y: 7.5 * g, bright: 1, dim: 2 });
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 7 * g, y: 3 * g });
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: hero.id, patch: { facing: 0, light: { bright: 3, dim: 6, shape: 'cone', angle: 60, color: '#ffffff', tint: 0.3 } } });
    if (location.hash === '#player') { S.viewAs = '*'; App.UI.setMode('play'); B.selectedLight = null; }
    else { if (App.UI.mode !== 'edit') App.UI.setMode('edit'); B.setTool('light'); B.selectedLight = location.hash === '#dark' ? dk.id : fg.id; }
    App.UI.refresh(); B.fit(); B.requestRender();
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
