// Plano 31 · foto: portal selecionado (painel), seta para o destino no mesmo mapa e a lista de cenas com sub-cena (-shot)
window.addEventListener('load', () => setTimeout(async () => {
  const W = (ms) => new Promise((r) => setTimeout(r, ms));
  setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
  const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
  if (UI.mode !== 'edit') UI.setMode('edit');
  const sub = S.newScene('Andar de baixo'); sub.parent = sid;
  S.dispatch({ type: 'scene.add', scene: sub });
  S.dispatch({ type: 'scene.add', scene: Object.assign(S.newScene('Torre'), { parent: sid }) });
  UI.leftTab = 'scenes';
  B.setTool('portal');
  const a = B.addTrigger(sc(), { shape: 'rect', pts: [[12 * g, 3 * g], [13 * g, 3 * g], [13 * g, 5 * g], [12 * g, 5 * g]], portal: true, name: 'Escada' });
  TG.setPortalDest(sid, a.id, { sceneId: sub.id });
  const b = B.addTrigger(sc(), { shape: 'rect', pts: [[1 * g, 1 * g], [2 * g, 1 * g], [2 * g, 2 * g], [1 * g, 2 * g]], portal: true, name: 'Vagão' });
  TG.setPortalDest(sid, b.id, { x: 6.5 * g, y: 7.5 * g });
  B.selectObj('trigger', sc().triggers.find((x) => x.id === b.id));
  UI.refresh(); B.render(); await W(300); B.render();
}, 1200));
