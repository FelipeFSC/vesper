// Plano 14 · Gatilhos pela tela: mestre em "ver como" arrastando por cima de um gatilho e clicando numa alavanca.
// Com '?tutorial#shot' + -shot: foto do mestre com o gatilho selecionado (painel e ligações).
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: true } } });
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'porta', x1: 10 * g, y1: 4 * g, x2: 10 * g, y2: 5 * g, door: true, open: true }, { id: 'w1', x1: 10 * g, y1: 0, x2: 10 * g, y2: 4 * g, cover: 'full' }, { id: 'w2', x1: 10 * g, y1: 5 * g, x2: 10 * g, y2: 10 * g, cover: 'full' }] });
    const lamp = B.addLight(sc(), { name: 'Tocha da entrada', x: 8.5 * g, y: 2.5 * g });
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gobs = toks.filter((t) => t.id !== hero.id);
    S.dispatch({ type: 'group.add', sceneId: sid, group: { id: 'emb', name: 'Emboscada' }, tokens: gobs.map((t) => t.id) });
    S.dispatch({ type: 'token.move', sceneId: sid, id: hero.id, x: 3 * g, y: 4 * g, fromTrigger: true });
    const add = (part) => { const t = TG.newTrigger(sc(), part); S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: t }); return t.id; };
    const act = (type, extra) => Object.assign(TG.newAction(type), extra);
    const amb = add({ name: 'Emboscada', shape: 'rect', pts: [[6 * g, 3 * g], [8 * g, 3 * g], [8 * g, 6 * g], [6 * g, 6 * g]], actions: [
      act('door', { wallId: 'porta', op: 'lock' }), act('light', { lightId: lamp.id, op: 'off', delay: 0.5 }), act('token', { target: 'g:emb', op: 'show', delay: 1 }) ] });
    const lever = B.addProp(sc(), 'img-falsa', { x: 4.5 * g, y: 7.5 * g }, 100, 100, 'Alavanca');
    S.dispatch({ type: 'lightpt.update', sceneId: sid, id: lamp.id, patch: { on: true } });
    const lv = add({ name: 'Alavanca', on: 'click', propId: lever.id, times: 'always', shape: 'circle', x: 4.5 * g, y: 7.5 * g, r: 0.5, actions: [act('door', { wallId: 'porta', op: 'open' })] });
    S.dispatch({ type: 'group.vis', sceneId: sid, id: 'emb', vis: 'hidden' });
    if (location.hash === '#shot') {
      if (App.UI.mode !== 'edit') App.UI.setMode('edit');
      B.setTool('trigger'); B.selectedTrigger = amb; App.UI.refresh(); B.fit(); B.requestRender();
      log.push('erros: ' + JSON.stringify(window.__err || [])); document.body.setAttribute('data-log', JSON.stringify(log)); return;
    }
    // ver como jogador e arrastar por cima da placa
    S.viewAs = '*'; App.UI.setMode('play'); App.UI.refresh(); B.fit(); await W(300);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const c = (cx, cy) => [cx * g + g / 2, cy * g + g / 2];
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(...c(3, 4)))));
    for (const x of [4, 6, 8, 9]) window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(...c(x, 4)))));
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(...c(9, 4)))));
    await W(100);
    const door = () => sc().walls.find((w) => w.id === 'porta');
    log.push(`ver como jogador, arrastou por cima: porta trancada = ${!!door().locked} · gatilho ${TG.stateLabel(sc().triggers.find((x) => x.id === amb))}`);
    await W(1700);
    log.push(`1,7 s depois: tocha acesa = ${sc().lights[0].on !== false} · goblins ${gobs.map((t) => (sc().tokens[t.id].hidden ? 'invisível' : 'visível')).join(',')}`);
    // clicar na alavanca como jogador
    const o = Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(4.5 * g, 7.5 * g));
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o));
    await W(100);
    log.push(`clicou na alavanca (ver como jogador): porta aberta = ${!!door().open} · trancada = ${!!door().locked}`);
    log.push(`jogador não vê o gatilho: desenhado só para o mestre (gmView=${S.gmView()})`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
