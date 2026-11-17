window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const S = App.Store, CB = App.Combat, L = App.Light, sc0 = S.currentScene(), g = sc0.grid;
    document.querySelectorAll('#tut-panel').forEach((e) => e.remove());
    const toks = Object.values(sc0.tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => /goblin/i.test(t.name));
    const gob2 = toks.filter((t) => /goblin/i.test(t.name))[1];
    S.dispatch({ type: 'scene.update', id: sc0.id, patch: { light: { enabled: true, global: true }, cover: Object.assign(CB.coverCfg(sc0), { heights: { full: 3, three: 2, half: 1 } }) } });
    S.dispatch({ type: 'wall.clear', sceneId: sc0.id });
    S.dispatch({ type: 'wall.add', sceneId: sc0.id, walls: [
      { id: 'h', x1: 4 * g, y1: 1 * g, x2: 4 * g, y2: 9 * g, cover: 'half' },
      { id: 't', x1: 9 * g, y1: 1 * g, x2: 9 * g, y2: 9 * g, cover: 'three' }] });
    S.dispatch({ type: 'token.move', sceneId: sc0.id, id: hero.id, x: 6 * g, y: 5 * g });
    S.dispatch({ type: 'token.move', sceneId: sc0.id, id: gob.id, x: 1 * g, y: 3 * g });
    S.dispatch({ type: 'token.move', sceneId: sc0.id, id: gob2.id, x: 12 * g, y: 4 * g });
    const actor = S.actorOf(hero);
    const T = () => S.currentScene().tokens, sc = () => S.currentScene();
    const report = (lbl) => {
      const v = [T()[hero.id]];
      const see = (t) => L.pointVisible(sc(), App.Board.posOf(T()[t.id]), v, App.Board.posOf);
      const atk = (t) => CB.check(sc(), T()[hero.id], { mode: 'attack', range: 0 }, T()[t.id]);
      log.push(`${lbl}: vê goblin atrás da meia(1m)=${see(gob)} · vê goblin atrás da ¾(2m)=${see(gob2)} · ataca ¾: ${atk(gob2).ok ? 'sim' : atk(gob2).why} · ataca meia: ${atk(gob).ok ? 'sim ' + (atk(gob).cover || {}).label : atk(gob).why}`);
    };
    S.dispatch({ type: 'actor.update', id: actor.id, patch: { height: 1 } }); report('Lyra 1m');
    S.dispatch({ type: 'actor.update', id: actor.id, patch: { height: 1.8 } }); report('Lyra 1,8m');
    S.dispatch({ type: 'actor.update', id: actor.id, patch: { height: 2.5 } }); report('Lyra 2,5m');
    S.dispatch({ type: 'actor.update', id: actor.id, patch: { height: 1 } });
    S.viewAs = '*'; if (App.UI.mode !== 'play') App.UI.setMode('play'); App.Board.requestRender(); await W(400);
    log.push('tokens visíveis para o jogador: ' + [...document.querySelectorAll('x')].length);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
