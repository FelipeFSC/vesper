window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [];
  try {
    const S = App.Store, CB = App.Combat, L = App.Light, sc0 = S.currentScene(), g = sc0.grid;
    const toks = Object.values(sc0.tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => /goblin/i.test(t.name));
    S.dispatch({ type: 'scene.update', id: sc0.id, patch: { light: { enabled: true, global: true } } });
    S.dispatch({ type: 'token.move', sceneId: sc0.id, id: hero.id, x: 2 * g, y: 5 * g });
    S.dispatch({ type: 'token.move', sceneId: sc0.id, id: gob.id, x: 8 * g, y: 5 * g });
    const actor = S.actorOf(hero), T = () => S.currentScene().tokens, sc = () => S.currentScene();
    const see = () => L.pointVisible(sc(), App.Board.posOf(T()[gob.id]), [T()[hero.id]], App.Board.posOf);
    const atk = () => { const c = CB.check(sc(), T()[hero.id], { mode: 'attack', range: 0 }, T()[gob.id]); return c.ok ? 'ataca' + (c.cover && c.cover.bonus ? ' (+' + c.cover.bonus + ')' : '') : c.why; };
    const wall = (cover) => { S.dispatch({ type: 'wall.clear', sceneId: sc0.id }); const w = { id: 'x', x1: 5 * g, y1: 1 * g, x2: 5 * g, y2: 9 * g }; if (cover) w.cover = cover; S.dispatch({ type: 'wall.add', sceneId: sc0.id, walls: [w] }); };
    const lightThrough = () => !L.blocked(sc(), 2.5 * g, 5.5 * g, 8.5 * g, 5.5 * g);
    for (const [lbl, cover] of [['parede antiga (sem tipo)', null], ['muro alto', 'high'], ['cobertura total', 'full'], ['três quartos', 'three']]) {
      wall(cover);
      const row = [];
      for (const hgt of [1.8, 4]) { S.dispatch({ type: 'actor.update', id: actor.id, patch: { height: hgt } }); row.push(`Lyra ${hgt}m: vê=${see()} ${atk()}`); }
      log.push(`${lbl} [tipo ${CB.wallType(sc().walls[0])}] luz passa=${lightThrough()} | ` + row.join(' | '));
    }
    wall('high'); S.dispatch({ type: 'scene.update', id: sc0.id, patch: { cover: Object.assign(CB.coverCfg(sc()), { enabled: false }) } });
    log.push('cobertura desligada, muro alto, Lyra 4m: vê=' + see() + ' ' + atk());
    log.push('cfg antiga {full:2.5} → muro alto ' + CB.coverCfg({ cover: { heights: { full: 2.5, three: 1.4, half: 0.9 } } }).heights.high);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
