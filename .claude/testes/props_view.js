// Plano 1: jogador não mexe em imagens; foto do mestre (moldura) e do jogador (escuridão esconde)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    const mk = async (color, w, h, name) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
      x.fillStyle = color; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(w * 0.2, h * 0.45, w * 0.6, h * 0.1);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      return new File([blob], name + '.png', { type: 'image/png' });
    };
    const a = await B.addPropFromFile(await mk('#2e7d32', 300, 300, 'arvore'), { x: 9 * g, y: 4 * g });
    const b = await B.addPropFromFile(await mk('#8d6e63', 200, 100, 'tapete'), { x: 4 * g, y: 6 * g });
    S.dispatch({ type: 'prop.update', sceneId: sc().id, id: a.id, patch: { w: 3 * g, h: 3 * g, x: 7.5 * g, y: 2.5 * g, rot: 15 } });
    S.dispatch({ type: 'order.move', sceneId: sc().id, kind: 'prop', id: a.id, dir: 'front' });
    // jogador tentando mexer
    const before = JSON.stringify(sc().props.find((p) => p.id === b.id));
    S.remoteAction({ type: 'prop.update', sceneId: sc().id, id: b.id, patch: { x: 0 } }, 'pX');
    S.remoteAction({ type: 'prop.delete', sceneId: sc().id, id: b.id }, 'pX');
    S.remoteAction({ type: 'order.move', sceneId: sc().id, kind: 'prop', id: b.id, dir: 'front' }, 'pX');
    log.push('jogador tentou mover, apagar e mudar o nível: nada mudou = ' + (JSON.stringify(sc().props.find((p) => p.id === b.id)) === before));
    if (location.hash === '#player') { S.viewAs = '*'; App.UI.setMode('play'); B.selectedProp = null; }
    else { if (App.UI.mode !== 'edit') App.UI.setMode('edit'); B.selectedProp = a.id; }
    App.UI.refresh(); B.requestRender();
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
