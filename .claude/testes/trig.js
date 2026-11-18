// Plano 14 · Gatilhos: eventos, quem dispara, vezes, ações, perguntar, parar o movimento, teletransporte, permissões, painel
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    const wl = (id, x1, y1, x2, y2, extra) => Object.assign({ id, x1: x1 * g, y1: y1 * g, x2: x2 * g, y2: y2 * g, cover: 'full' }, extra);
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: true } } });
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [wl('porta', 15, 0, 15, 1, { door: true, open: true })] });
    const door = () => sc().walls.find((w) => w.id === 'porta');
    const lamp = B.addLight(sc(), { name: 'Lustre', x: 12.5 * g, y: 8.5 * g });
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gobs = toks.filter((t) => t.id !== hero.id);
    S.dispatch({ type: 'group.add', sceneId: sid, group: { id: 'emb', name: 'Emboscada' }, tokens: gobs.map((t) => t.id) });
    S.dispatch({ type: 'group.vis', sceneId: sid, id: 'emb', vis: 'hidden' });
    if (!Object.keys(S.state.players).length) S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#38bdf8' });
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || 'p1';
    const at = (cx, cy) => S.dispatch({ type: 'token.move', sceneId: sid, id: hero.id, x: cx * g, y: cy * g, fromTrigger: true });
    const walk = (pts) => S.remoteAction({ type: 'token.move', sceneId: sid, id: hero.id, x: pts[pts.length - 1][0] * g, y: pts[pts.length - 1][1] * g, path: pts.map(([x, y]) => [x * g, y * g]), at: Date.now() }, pid);
    const pos = () => { const t = sc().tokens[hero.id]; return t ? `(${t.x / g}, ${t.y / g})` : '(fora da cena)'; };
    const tr = (id) => sc().triggers.find((x) => x.id === id);
    const cellRect = (x, y, w = 1, h = 1) => [[x * g, y * g], [(x + w) * g, y * g], [(x + w) * g, (y + h) * g], [x * g, (y + h) * g]];
    const add = (part) => { const t = TG.newTrigger(sc(), part); S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: t }); return t.id; };
    const act = (type, extra) => Object.assign(TG.newAction(type), extra);

    // 1) Emboscada: entrar na placa (passando por cima) fecha e tranca a porta, apaga o lustre e, 0,3 s depois, os goblins aparecem
    const amb = add({ id: 'amb', name: 'Emboscada', shape: 'rect', pts: cellRect(4, 4), actions: [
      act('door', { wallId: 'porta', op: 'lock' }), act('light', { lightId: lamp.id, op: 'off' }), act('token', { target: 'g:emb', op: 'show', delay: 0.3 }),
    ] });
    at(2, 4);
    walk([[2, 4], [6, 4]]);
    const gv = () => gobs.map((t) => (sc().tokens[t.id].hidden ? 'invisível' : 'visível')).join(',');
    log.push(`emboscada (passou por cima da placa): token em ${pos()} · porta aberta=${door().open} trancada=${door().locked} · lustre aceso=${sc().lights.find((o) => o.id === lamp.id).on !== false} · goblins logo: ${gv()}`);
    await W(500);
    log.push(`0,5 s depois: goblins ${gv()} · estado: ${TG.stateLabel(tr(amb))} (disparou ${tr(amb).used})`);
    walk([[6, 4], [2, 4]]);
    log.push(`passou de novo (uma vez): disparou ${tr(amb).used}`);
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: amb, patch: { used: 0 } });
    at(6, 4); S.dispatch({ type: 'token.move', sceneId: sid, id: hero.id, x: 2 * g, y: 4 * g, path: [[6 * g, 4 * g], [2 * g, 4 * g]], at: Date.now() });
    log.push(`rearmado e o mestre arrastou por cima: disparou ${tr(amb).used} (esperado 0)`);
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: amb, patch: { who: 'foes' } });
    walk([[2, 4], [6, 4]]);
    log.push(`só criaturas disparam, a Lyra passou: disparou ${tr(amb).used} (esperado 0)`);
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: amb, patch: { who: 'party', enabled: false } });
    walk([[6, 4], [2, 4]]);
    log.push(`desligado: disparou ${tr(amb).used} (esperado 0) · estado ${TG.stateLabel(tr(amb))}`);

    // 2) Armadilha que para o movimento: teste de Destreza CD 13, 2d6
    const trap = add({ id: 'trap', name: 'Dardos', shape: 'rect', pts: cellRect(9, 7), stop: true, actions: [act('trap', { save: 'Destreza', dc: 13, damage: '2d6', bar: '' })] });
    at(7, 7);
    const pvBefore = S.barsOf(sc().tokens[hero.id])[0].value;
    const nChat = S.state.chat.length;
    walk([[7, 7], [12, 7]]);
    const tm = S.state.chat.slice(nChat).find((m) => m.kind === 'action' && m.trap);
    const pvAfter = S.barsOf(sc().tokens[hero.id])[0].value;
    log.push(`armadilha: parou em ${pos()} (esperado (9, 7)) · teste ${tm && tm.targets[0].save.total} vs CD ${tm && tm.dc} → ${tm && tm.targets[0].success ? 'passou' : 'falhou'} · PV ${pvBefore} → ${pvAfter}`);
    if (tm) { S.undoAction(tm.id); log.push(`desfazer a armadilha: PV ${S.barsOf(sc().tokens[hero.id])[0].value}`); }
    log.push(`aviso só para o mestre: ${S.state.chat.slice(nChat).filter((m) => m.kind === 'system' && m.secret && /Dardos/.test(m.text)).length} mensagem(ns) secreta(s)`);

    // 3) Sair da área liga outro gatilho (que estava desligado)
    const late = add({ id: 'late', name: 'Ponte', shape: 'circle', x: 13.5 * g, y: 2.5 * g, r: 0.5, enabled: false, actions: [act('fog', { op: 'reveal' })] });
    const leave = add({ id: 'leave', name: 'Saída da floresta', on: 'leave', shape: 'circle', x: 2.5 * g, y: 8.5 * g, r: 1.5, actions: [act('trigger', { triggerId: late, op: 'enable' })] });
    at(2, 8);
    walk([[2, 8], [6, 8]]);
    log.push(`saiu do círculo: "Ponte" ligada = ${tr(late).enabled !== false}`);
    // 4) névoa: a "Ponte" revela a área dela
    S.dispatch({ type: 'scene.update', id: sid, patch: { fog: { enabled: true, shapes: [], v: 1 } } });
    at(11, 2);
    walk([[11, 2], [13, 2]]);
    const fs = sc().fog.shapes.slice(-1)[0];
    log.push(`névoa revelada pela Ponte: ${fs ? fs.mode + ' ' + fs.w / g + '×' + fs.h / g + ' em (' + fs.x / g + ', ' + fs.y / g + ')' : 'nada'}`);
    S.dispatch({ type: 'scene.update', id: sid, patch: { fog: { enabled: false, shapes: [], v: 2 } } });

    // 5) Alavanca: clicar na imagem destranca e abre a porta
    const lever = B.addProp(sc(), 'img-falsa', { x: 1.5 * g, y: 1.5 * g }, 100, 100, 'Alavanca');
    const lv = add({ id: 'lever', name: 'Alavanca', on: 'click', propId: lever.id, times: 'always', shape: 'circle', x: 1.5 * g, y: 1.5 * g, r: 0.5, actions: [act('door', { wallId: 'porta', op: 'open' })] });
    S.remoteAction({ type: 'trigger.click', sceneId: sid, id: lv, tokenId: hero.id }, pid);
    log.push(`jogador clicou na alavanca: porta aberta=${door().open} trancada=${!!door().locked}`);
    S.dispatch({ type: 'wall.door', sceneId: sid, id: 'porta', open: false });
    S.remoteAction({ type: 'trigger.click', sceneId: sid, id: lv, tokenId: gobs[0].id }, pid);
    log.push(`jogador tentando usar a alavanca com um goblin (não é dele): porta continua fechada = ${!door().open}`);

    // 6) Perguntar ao mestre
    const ask = add({ id: 'ask', name: 'Altar', shape: 'rect', pts: cellRect(5, 1), ask: true, actions: [act('light', { lightId: lamp.id, op: 'on' })] });
    at(3, 1);
    walk([[3, 1], [7, 1]]);
    await W(150);
    log.push(`perguntar: na fila ${TG.queue.length} · lustre ainda apagado = ${sc().lights.find((o) => o.id === lamp.id).on === false} · caixa do mestre: ${(document.querySelector('#trig-ask') || {}).textContent || '(sem caixa)'}`);
    TG.answer(0, true);
    log.push(`mestre disse Disparar: lustre aceso = ${sc().lights.find((o) => o.id === lamp.id).on !== false} · fila ${TG.queue.length}`);

    // 7) Teletransporte: para um ponto deste mapa, e para outra cena
    const tp = add({ id: 'tp', name: 'Portal', shape: 'rect', pts: cellRect(12, 5), actions: [act('teleport', { x: 14.5 * g, y: 8.5 * g })] });
    at(10, 5);
    walk([[10, 5], [12, 5]]);
    log.push(`portal no mesmo mapa: token em ${pos()} (esperado (14, 8))`);
    if (S.state.sceneOrder.length < 2) S.dispatch({ type: 'scene.add', scene: S.newScene('Cripta') });
    const other = S.state.sceneOrder.find((id) => id !== sid);
    if (other) {
      add({ id: 'tp2', name: 'Portal da cripta', shape: 'rect', pts: cellRect(1, 6), actions: [act('teleport', { sceneId: other })] });
      at(0, 6);
      walk([[0, 6], [1, 6]]);
      const there = Object.values(S.state.scenes[other].tokens).find((t) => t.actorId === hero.actorId);
      log.push(`portal para outra cena: na cena atual = ${!!sc().tokens[hero.id]} · na outra (${S.state.scenes[other].name}) = ${!!there} · jogador ${pid} agora em: ${S.state.scenes[S.sceneIdOf(pid)].name}`);
    }

    // 8) Pela rede: jogador não mexe em gatilhos
    const n0 = sc().triggers.length;
    S.remoteAction({ type: 'trigger.update', sceneId: sid, id: amb, patch: { enabled: true } }, pid);
    S.remoteAction({ type: 'trigger.delete', sceneId: sid, id: amb }, pid);
    S.remoteAction({ type: 'trigger.add', sceneId: sid, trigger: TG.newTrigger(sc(), {}) }, pid);
    log.push(`jogador tentando ligar, apagar ou criar gatilho: recusado = ${sc().triggers.length === n0 && tr(amb).enabled === false}`);

    // 9) Disparar agora (mestre), mesmo gasto
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: amb, patch: { enabled: true, used: 1 } });
    S.dispatch({ type: 'wall.lock', sceneId: sid, id: 'porta', locked: false });
    TG.fire(sid, amb, null, { manual: true });
    log.push(`Disparar agora num gatilho gasto: porta trancada = ${!!door().locked} · disparou ${tr(amb).used}`);
    S.dispatch({ type: 'trigger.rearmAll', sceneId: sid });
    log.push(`Rearmar todos: ${sc().triggers.map((x) => TG.stateLabel(x)).join(', ')}`);

    // 10) Interface básica: ferramenta, criar com clique, Ctrl+D, Delete (a janela de configurar é testada em trig_ux.js)
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.setTool('trigger'); await W(250);
    log.push('opções: ' + [...document.querySelectorAll('#tool-opts .seg button')].map((b) => b.textContent).join(' | ') + ' · lista: ' + document.querySelectorAll('#tool-opts .trig-row').length);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const o = Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(8.5 * g, 2.5 * g));
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o));
    await W(300);
    const nt = sc().triggers[sc().triggers.length - 1];
    log.push(`clique com Retângulo: ${nt.name} · ${nt.pts.map((p) => p.map((v) => v / g).join(',')).join(' ')} · selecionado = ${B.selectedTrigger === nt.id}`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
    const n1 = sc().triggers.length;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    log.push(`Ctrl+D e Delete: ${n1 - 1} → ${n1} → ${sc().triggers.length}`);
    log.push('exportar a cena leva os gatilhos: ' + (App.Storage.sceneBundle(sid).scene.triggers || []).length);
    B.setTool('select');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
