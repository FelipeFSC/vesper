window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, CB = App.Combat, L = App.Light, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => /goblin/i.test(t.name));
    const T = () => sc().tokens;
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: false } } });
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: hero.id, patch: { light: { bright: 20, dim: 30 } } });
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 2 * g, y: 5 * g });
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: gob.id, x: 8 * g, y: 5 * g });
    const wall = (cover) => { S.dispatch({ type: 'wall.clear', sceneId: sc().id }); S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'x', x1: 5 * g, y1: 1 * g, x2: 5 * g, y2: 9 * g, cover }] }); };
    const fly = (m, id) => S.dispatch({ type: 'token.update', sceneId: sc().id, id: id || gob.id, patch: { fly: m } });
    const see = () => L.pointVisible(sc(), B.posOf(T()[gob.id]), [T()[hero.id]], B.posOf, CB.flyOf(T()[gob.id]) > 0 ? CB.topOf(T()[gob.id]) : 0);
    const atk = () => { const c = CB.check(sc(), T()[hero.id], { mode: 'attack', range: 0 }, T()[gob.id]); return c.ok ? 'ataca' + (c.cover && c.cover.bonus ? ' (' + c.cover.label + ' +' + c.cover.bonus + ')' : '') : c.why; };
    for (const [lbl, cover] of [['cobertura total 3 m', 'high'], ['parede absoluta', 'full']]) {
      wall(cover);
      const row = [];
      for (const m of [0, 2, 4]) { fly(m); row.push(`voo ${m} m: vê=${see()} ${atk()}`); }
      log.push(lbl + ' | ' + row.join(' | '));
    }
    fly(0); wall('high');
    fly(3, hero.id);
    log.push('Lyra voando 3 m (olho 4,8 m) vê goblin no chão atrás do muro de 3 m: ' + see() + ' ' + atk());
    fly(0, hero.id);
    // jogador vê o goblin voando por cima do muro, desenhado acima da escuridão
    fly(4);
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.selected = gob.id; App.UI.refresh(); B.requestRender(); await W(200);
    log.push('painel: voo marcado=' + ($('#token-hud .fly-row input[type=checkbox]') || {}).checked + ' metros=' + ($('#token-hud .fly-row input.num') || {}).value + ' subtítulo="' + ($('#token-hud .hud-sub') || {}).textContent + '"');
    $('#token-hud .fly-row input[type=checkbox]').click(); await W(150);
    log.push('desmarcar Voando: fly=' + CB.flyOf(T()[gob.id]) + ' · caixa agora=' + $('#token-hud .fly-row input[type=checkbox]').checked);
    $('#token-hud .fly-row input[type=checkbox]').click(); await W(150);
    log.push('marcar de novo: volta para ' + CB.flyOf(T()[gob.id]) + ' m');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
