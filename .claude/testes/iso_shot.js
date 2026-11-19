// Plano 29: foto do isolamento selecionado (borda, cantos, painel) com a ferramenta ativa
window.addEventListener('load', () => setTimeout(async () => {
  setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
  const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
  if (App.UI.mode !== 'edit') App.UI.setMode('edit');
  B.setTool('room');
  B.addRoom(sc(), [[2 * g, 2 * g], [7 * g, 2 * g], [7 * g, 6 * g], [4 * g, 7 * g], [2 * g, 6 * g]]);
  S.dispatch({ type: 'room.update', sceneId: sc().id, id: sc().rooms[sc().rooms.length - 1].id, patch: { name: 'Taverna' } });
  B.selectObj('room', sc().rooms[sc().rooms.length - 1]);
  App.UI.refresh(); B.requestRender();
}, 1200));
