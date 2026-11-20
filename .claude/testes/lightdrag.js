// Plano 39 · Desempenho: durante o arraste a luz e a visão ficam onde o token estava; Em tempo real: acompanham o arraste
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: false } } });
    const tk = Object.values(sc().tokens), hero = tk.find((t) => /lyra/i.test(t.name)), gob = tk.find((t) => t.id !== hero.id);
    for (const t of tk) if (t.id !== hero.id && t.id !== gob.id) S.dispatch({ type: 'token.delete', sceneId: sid, id: t.id });
    S.dispatch({ type: 'token.update', sceneId: sid, id: hero.id, patch: { light: { dim: 3, bright: 2 }, darkvision: 0 } });
    S.dispatch({ type: 'token.update', sceneId: sid, id: gob.id, patch: { light: null, darkvision: 0 } });
    const mv = (t, cx, cy) => S.dispatch({ type: 'token.move', sceneId: sid, id: t.id, x: cx * g, y: cy * g });
    mv(hero, 2, 4); mv(gob, 12, 4);
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || '*';
    S.viewAs = pid; App.UI.setMode('play'); App.UI.refresh(); B.fit(); B.render(); await W(200);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const pd = (x, y) => B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y))));
    const pm = (x, y) => window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(x, y))));
    const pu = (x, y) => window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(x, y))));
    const c = (cx, cy) => [cx * g + g / 2, cy * g + g / 2];
    // brilho do chão numa casa (soma RGB)
    const lum = (cx, cy) => { B.render(); const p = B.toScreen(cx * g + g / 2, cy * g + g / 2), d = B.dpr; const v = B.ctx.getImageData(Math.round(p.x * d), Math.round(p.y * d), 1, 1).data; return v[0] + v[1] + v[2]; };
    const gobSeen = () => B.visibleTokens ? B.visibleTokens(sc()).some((t) => t.id === gob.id) : null;
    const rules = (live) => S.dispatch({ type: 'campaign.update', patch: { rules: { liveRuler: live } } });

    // --- Desempenho
    rules(false);
    log.push(`antes: chão perto da Lyra (2,6) = ${lum(2, 6)} · chão perto do goblin (11,6) = ${lum(11, 6)}`);
    pd(...c(2, 4)); pm(...c(5, 4)); pm(...c(8, 4)); pm(...c(11, 4));
    const nearOld = lum(2, 6), nearNew = lum(11, 6);
    log.push(`Desempenho, arrastando até o goblin sem soltar: luz ficou onde estava = ${nearOld > nearNew * 2} (antigo ${nearOld}, novo ${nearNew}) · goblin visível = ${gobSeen()} · token acompanha o mouse = ${B.drag && Math.round(B.drag.x / g)}`);
    pu(...c(11, 4)); await W(400);
    log.push(`soltou: token em ${sc().tokens[hero.id].x / g} · chão perto do goblin = ${lum(11, 6)} · chão antigo = ${lum(2, 6)} · goblin visível = ${gobSeen()}`);

    // --- Em tempo real
    rules(true); mv(hero, 2, 4); await W(400); B.render();
    pd(...c(2, 4)); pm(...c(5, 4)); pm(...c(8, 4)); pm(...c(11, 4));
    const o2 = lum(2, 6), n2 = lum(11, 6);
    log.push(`Em tempo real, arrastando sem soltar: luz acompanha = ${n2 > o2 * 2} (antigo ${o2}, novo ${n2}) · goblin visível = ${gobSeen()}`);
    pu(...c(11, 4)); await W(200);

    // --- Em tempo real, outra pessoa arrastando: esta tela vê o token andando, com a luz junto
    mv(hero, 2, 4); await W(400); B.render();
    const msg = (x, extra) => B.onRuler(Object.assign({ t: 'ruler', kind: 'drag', sceneId: sid, from: 'outro', name: 'Ana', color: '#e0609a', tokenId: hero.id,
      pts: [[2 * g + g / 2, 4 * g + g / 2], [x * g + g / 2, 4 * g + g / 2]] }, extra || {}));
    msg(6); const p6 = B.posOf(sc().tokens[hero.id]);
    msg(11); const p11 = B.posOf(sc().tokens[hero.id]);
    log.push(`arraste de outra pessoa: token desenhado em ${Math.round(p6.x / g - 0.5)} → ${Math.round(p11.x / g - 0.5)} (posição salva continua ${sc().tokens[hero.id].x / g}) · luz no destino = ${lum(11, 6)} · luz antiga = ${lum(2, 6)} · goblin visível = ${gobSeen()}`);
    msg(11, { done: true }); mv(hero, 11, 4); await W(100);
    log.push(`ela soltou: token em ${Math.round(B.posOf(sc().tokens[hero.id]).x / g - 0.5)} · luz = ${lum(11, 6)}`);
    msg(5); msg(5, { clear: true });
    log.push(`cancelou o arraste: token volta para ${Math.round(B.posOf(sc().tokens[hero.id]).x / g - 0.5)}`);
    rules(false);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
