// Plano 5: foto do arraste com dois pontos de passagem e uma parede no caminho
window.addEventListener('load', () => setTimeout(async () => {
  setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
  const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
  const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
  S.dispatch({ type: 'wall.clear', sceneId: sc().id });
  S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'pw', x1: 8 * g, y1: 2 * g, x2: 8 * g, y2: 5 * g }] });
  S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 2 * g, y: 6 * g });
  if (App.UI.mode !== 'edit') App.UI.setMode('edit');
  B.setTool('select'); B.selected = hero.id;
  const rect = B.canvas.getBoundingClientRect();
  const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
  const c = (cx, cy) => scr(cx * g + g / 2, cy * g + g / 2);
  B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, c(2, 6))));
  const mv = (x, y) => window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, c(x, y))));
  const rt = (x, y) => window.dispatchEvent(new MouseEvent('mousedown', Object.assign({ bubbles: true, button: 2, buttons: 3 }, c(x, y))));
  mv(4, 6); mv(6, 6); rt(6, 6); mv(6, 4); mv(6, 3); rt(6, 3); mv(9, 3);
  B.requestRender();
}, 1200));
