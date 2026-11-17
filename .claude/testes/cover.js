window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const S = App.Store, CB = App.Combat, sc = S.currentScene(), g = sc.grid;
    const toks = Object.values(sc.tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => /goblin/i.test(t.name));
    // Lyra em (2,5), goblin em (8,5): muro vertical em x=5
    S.dispatch({ type: 'token.move', sceneId: sc.id, id: hero.id, x: 2 * g, y: 5 * g });
    S.dispatch({ type: 'token.move', sceneId: sc.id, id: gob.id, x: 8 * g, y: 5 * g });
    S.dispatch({ type: 'wall.clear', sceneId: sc.id });
    const wall = (cover, x) => ({ id: 'w' + Math.random(), x1: x * g, y1: 3 * g, x2: x * g, y2: 8 * g, cover });
    const T = () => S.currentScene().tokens;
    const cov = () => { const c = CB.coverFromToken(S.currentScene(), T()[hero.id], T()[gob.id]); return c.level + (c.bonus ? '+' + c.bonus : ''); };
    log.push('sem muro: ' + cov());
    S.dispatch({ type: 'wall.add', sceneId: sc.id, walls: [wall('half', 6)] }); log.push('meia (0,9m) vs 1,8m: ' + cov());
    const w1 = S.currentScene().walls[0];
    S.dispatch({ type: 'wall.update', sceneId: sc.id, id: w1.id, patch: { cover: 'three' } }); log.push('¾ (1,4m): ' + cov());
    log.push('¾ bloqueia luz? ' + App.Light.blocked(S.currentScene(), 2.5 * g, 5.5 * g, 8.5 * g, 5.5 * g));
    const gobActor = S.actorOf(T()[gob.id]);
    S.dispatch({ type: 'actor.update', id: gobActor.id, patch: { height: 1.2 } }); log.push('goblin 1,2m atrás de ¾ (1,4m): ' + cov() + ' check: ' + CB.check(S.currentScene(), T()[hero.id], { mode: 'attack', range: 0 }, T()[gob.id]).why);
    S.dispatch({ type: 'actor.update', id: gobActor.id, patch: { height: 4 } }); log.push('goblin 4m atrás de ¾: ' + cov());
    S.dispatch({ type: 'actor.update', id: gobActor.id, patch: { height: null } });
    // encostado no muro
    S.dispatch({ type: 'token.move', sceneId: sc.id, id: hero.id, x: 5 * g, y: 5 * g }); log.push('Lyra encostada no muro: ' + cov());
    S.dispatch({ type: 'token.move', sceneId: sc.id, id: hero.id, x: 2 * g, y: 5 * g });
    // ataque de verdade
    const actor = S.actorOf(T()[hero.id]); const idx = actor.actions.findIndex((a) => a.mode === 'attack' && /arco/i.test(a.name));
    S.useAction({ actorId: actor.id, index: idx, sceneId: sc.id, attackerId: hero.id, targets: [gob.id] }, null);
    const m = S.state.chat[S.state.chat.length - 1];
    log.push('ataque: def ' + m.targets[0].def + ' (base ' + S.statOf(T()[gob.id], 'Defesa') + ') cover ' + JSON.stringify(m.targets[0].cover));
    // sombra / vulto
    const sc2 = S.currentScene();
    log.push('na sombra (¾ = 3 quad, goblin a 2 do muro): ' + CB.inShadow(sc2, [T()[hero.id]], T()[gob.id]));
    S.dispatch({ type: 'scene.update', id: sc.id, patch: { cover: Object.assign(CB.coverCfg(sc2), { show: 'silhouette' }) } });
    S.viewAs = '*'; App.Board.requestRender(); await W(200);
    log.push('vulto como jogador: ' + App.Board.silhouettes.has(gob.id));
    S.dispatch({ type: 'actor.update', id: gobActor.id, patch: { coverShow: 'show' } }); App.Board.requestRender(); await W(200);
    log.push('ficha "sempre visível": vulto=' + App.Board.silhouettes.has(gob.id));
    S.viewAs = null;
    // configurar cena abre?
    App.UI.openSceneSettings ? 0 : 0;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit'); App.UI.refresh(); await W(150);
    document.querySelector('#board-actions .btn').click(); await W(200);
    log.push('dialog cobertura: ' + !!document.querySelector('.cover-grid') + ' inputs ' + document.querySelectorAll('.cover-grid input').length);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
