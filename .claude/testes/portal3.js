// Plano 41 · Ligar dois portais: desenha os dois, escolhe a cena e clica no outro; ida e volta ou só ida; outra cena; Esc;
// religar pergunta; apagar desfaz; sem ligação não leva; portal antigo ligado continua. #shot: painel do portal ligado
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    if (UI.mode !== 'edit') UI.setMode('edit');
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'combat.end' });
    (sc().triggers || []).slice().forEach((t) => S.dispatch({ type: 'trigger.delete', sceneId: sid, id: t.id }));
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    if (!Object.keys(S.state.players).length) S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#38bdf8' });
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || 'p1';
    const place = (id, cx, cy, scId) => S.dispatch({ type: 'token.move', sceneId: scId || sid, id, x: cx * g, y: cy * g, fromTrigger: true });
    const walk = (id, pts, scId) => S.remoteAction({ type: 'token.move', sceneId: scId || sid, id, x: pts[pts.length - 1][0] * g, y: pts[pts.length - 1][1] * g, path: pts.map(([x, y]) => [x * g, y * g]), at: Date.now() }, pid);
    B.cam.x = 0; B.cam.y = 0; B.cam.z = 0.6; B.render(); await W(50);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const ev = (type, x, y) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y))));
    const click = (x, y) => { ev('pointerdown', x, y); ev('pointerup', x, y); };
    const tr = (id, scId) => ((S.state.scenes[scId || sid].triggers) || []).find((t) => t.id === id);
    const hudBtn = (re) => [...document.querySelectorAll('#token-hud .btn')].find((b) => re.test(b.textContent));
    const sel = (t) => { B.selectObj('trigger', t); UI.refresh(); B.render(); };
    const at = (id, scId) => { const t = (S.state.scenes[scId || sid].tokens || {})[id]; return t ? '(' + t.x / g + ', ' + t.y / g + ')' : 'fora'; };
    let asks = [];
    window.confirm = (m) => { asks.push(m); return window.__yes !== false; };

    // 1) dois portais no mesmo mapa, cada um com a sua forma; sem ligação não leva a lugar nenhum
    const A = B.addTrigger(sc(), { shape: 'rect', pts: [[9 * g, 2 * g], [10 * g, 2 * g], [10 * g, 3 * g], [9 * g, 3 * g]], portal: true, name: 'Porta azul' });
    const Bq = B.addTrigger(sc(), { shape: 'rect', pts: [[2 * g, 6 * g], [5 * g, 6 * g], [5 * g, 8 * g], [2 * g, 8 * g]], portal: true, name: 'Porta vermelha' });
    sel(tr(A.id)); await W(60);
    log.push(`painel sem ligação: "${($('#token-hud .hud-section .hint') || {}).textContent}" · botão "Ligar a um portal" = ${!!hudBtn(/Ligar a um portal/)} · "Ida e volta" escondido = ${![...document.querySelectorAll('#token-hud label.check')].some((l) => /Ida e volta/.test(l.textContent))} · "Desenhar a chegada" saiu = ${!hudBtn(/Desenhar a chegada/)}`);
    place(hero.id, 7, 2); walk(hero.id, [[7, 2], [9, 2]]);
    log.push('pisou no portal sem ligação: token em ' + at(hero.id) + ' (esperado (9, 2))');
    // 2) ligar: botão, clique no outro portal
    hudBtn(/Ligar a um portal/).click(); await W(50);
    log.push('escolhendo um portal = ' + !!(B.picking && B.picking.kind === 'portal'));
    click(12 * g, 12 * g); await W(30);
    log.push('clique fora de um portal: continua escolhendo = ' + !!B.picking);
    click(9.5 * g, 2.5 * g); await W(30);
    log.push('clique no próprio portal: não liga, continua escolhendo = ' + !!B.picking);
    click(3.5 * g, 7 * g); await W(80); B.render(); await W(50);
    log.push(`ligou: A → "${(TG.portalPartner(sc(), tr(A.id)) || { tr: {} }).tr.name}" · ida e volta = ${TG.portalTwoWay(sc(), tr(A.id))} · A selecionado de novo = ${B.selectedTrigger === A.id}`);
    log.push('painel: ' + [...document.querySelectorAll('#token-hud .portal-link b, #token-hud label.check')].map((e) => e.textContent).slice(0, 2).join(' | ') + ' · botões: ' + [...document.querySelectorAll('#token-hud .portal-link .icon-btn')].map((b) => b.title.split(' (')[0]).join(', '));
    // 3) passar: chega dentro do outro (sorteado) e volta
    const cells = new Set(); let inside = 0;
    for (let i = 0; i < 8; i++) {
      place(hero.id, 7, 2); walk(hero.id, [[7, 2], [9, 2]]);
      const t = sc().tokens[hero.id], cx = t.x / g, cy = t.y / g;
      if (cx >= 2 && cx < 5 && cy >= 6 && cy < 8) inside++;
      cells.add(cx + ',' + cy);
    }
    log.push(`8 passagens: ${inside} dentro da porta vermelha · ${cells.size} quadrados diferentes`);
    place(hero.id, 1, 6); walk(hero.id, [[1, 6], [2, 6]]);
    log.push('pisou na vermelha: voltou para ' + at(hero.id) + ' (esperado (9, 2))');
    // 4) só ida: desmarcar "Ida e volta"
    sel(tr(A.id)); await W(50);
    [...document.querySelectorAll('#token-hud label.check')].find((l) => /Ida e volta/.test(l.textContent)).querySelector('input').click(); await W(50);
    log.push(`só ida: A continua ligado = ${!!TG.portalPartner(sc(), tr(A.id))} · a vermelha leva a algum lugar = ${!!TG.portalPartner(sc(), tr(Bq.id))}`);
    place(hero.id, 1, 6); walk(hero.id, [[1, 6], [2, 6]]);
    log.push('pisou na vermelha (só ida): token fica em ' + at(hero.id) + ' (esperado (2, 6))');
    sel(tr(A.id)); await W(50);
    [...document.querySelectorAll('#token-hud label.check')].find((l) => /Ida e volta/.test(l.textContent)).querySelector('input').click(); await W(50);
    log.push('marcou de novo: ida e volta = ' + TG.portalTwoWay(sc(), tr(A.id)));
    // 5) outra cena: escolhe a cena na lista, a tela vai para lá, clica no portal, volta
    const sub = S.newScene('Andar de baixo'); sub.parent = sid; S.dispatch({ type: 'scene.add', scene: sub });
    const C = B.addTrigger(sc(), { shape: 'circle', x: 13.5 * g, y: 4.5 * g, r: 0.5, portal: true, name: 'Escada' });
    sel(tr(C.id)); await W(60);
    const pick = $('#token-hud .portal-scene select');
    pick.value = sub.id; pick.dispatchEvent(new Event('change')); await W(60);
    log.push('outra cena sem portal: avisa = ' + [...document.querySelectorAll('.toast')].some((t) => /Não há outro portal/.test(t.textContent)) + ' · não foi para lá = ' + (sc().id === sid));
    const D = TG.newPortal(S.state.scenes[sub.id], { shape: 'rect', pts: [[5 * g, 5 * g], [7 * g, 5 * g], [7 * g, 6 * g], [5 * g, 6 * g]], name: 'Escada de baixo' });
    S.dispatch({ type: 'trigger.add', sceneId: sub.id, trigger: D });
    sel(tr(C.id)); await W(60);
    $('#token-hud .portal-scene select').value = sub.id; $('#token-hud .portal-scene select').dispatchEvent(new Event('change')); await W(100); B.render();
    log.push('tela foi para "' + sc().name + '" · escolhendo = ' + !!B.picking);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(100); B.render(); await W(50);
    log.push('Esc: voltou = ' + (sc().id === sid) + ' · não ligou = ' + !TG.portalPartner(sc(), tr(C.id)));
    sel(tr(C.id)); await W(60);
    $('#token-hud .portal-scene select').value = sub.id; $('#token-hud .portal-scene select').dispatchEvent(new Event('change')); await W(100); B.render();
    click(6 * g, 5.5 * g); await W(100); B.render(); await W(100);
    log.push(`clicou na escada de baixo: voltou = ${sc().id === sid} · C → "${(TG.portalPartner(sc(), tr(C.id)) || { tr: {} }).tr.name}" · ida e volta = ${TG.portalTwoWay(sc(), tr(C.id))}`);
    place(hero.id, 12, 4); walk(hero.id, [[12, 4], [13, 4]]); await W(50);
    const there = Object.values(S.state.scenes[sub.id].tokens).find((t) => /lyra/i.test(t.name));
    log.push('desceu: Lyra na sub-cena em ' + (there ? '(' + there.x / g + ', ' + there.y / g + ')' : 'não') + ' (dentro de (5..6, 5))');
    place(there.id, 4, 5, sub.id); walk(there.id, [[4, 5], [5, 5]], sub.id); await W(50);
    const home = Object.values(S.state.scenes[sid].tokens).find((t) => /lyra/i.test(t.name));
    log.push('subiu de volta: ' + (home ? 'na principal em (' + home.x / g + ', ' + home.y / g + ')' : 'não voltou'));
    // 6) religar a um portal que já está ligado: pergunta; "não" mantém, "sim" desfaz a anterior
    sel(tr(C.id)); await W(60);
    asks = []; window.__yes = false;
    UI.linkPortals(sid, C.id, sid, A.id);
    log.push(`religar a Escada na Porta azul (já ligadas): perguntou ${asks.length}x · "${(asks[0] || '').slice(0, 60)}…" · respondeu não: C continua na escada de baixo = ${(TG.portalPartner(sc(), tr(C.id)) || { tr: {} }).tr.id === D.id}`);
    asks = []; window.__yes = true;
    UI.linkPortals(sid, C.id, sid, A.id);
    log.push(`respondeu sim: C → "${TG.portalPartner(sc(), tr(C.id)).tr.name}" · A → "${TG.portalPartner(sc(), tr(A.id)).tr.name}" · vermelha solta = ${!TG.portalPartner(sc(), tr(Bq.id))} · escada de baixo solta = ${!TG.portalPartner(S.state.scenes[sub.id], tr(D.id, sub.id))}`);
    // 7) desfazer pelo painel e apagar um ligado
    sel(tr(C.id)); await W(60);
    [...document.querySelectorAll('#token-hud .portal-link .icon-btn')].find((b) => /Desfazer/.test(b.title)).click(); await W(50);
    log.push(`desfez: C solto = ${!TG.portalPartner(sc(), tr(C.id))} · A solto = ${!TG.portalPartner(sc(), tr(A.id))}`);
    TG.connectPortals(sid, A.id, sid, Bq.id, true);
    S.dispatch({ type: 'trigger.delete', sceneId: sid, id: Bq.id });
    log.push(`apagou a vermelha: A sem ligação = ${!TG.portalPartner(sc(), tr(A.id))} · A não leva a lugar nenhum = ${!!TG.portalDest(sc(), tr(A.id)).center}`);
    // 8) menu do botão direito
    const hits = B.hitAll(sc(), TG.center(tr(A.id))).filter((x) => x.kind === 'trigger');
    UI.contextMenu(300, 300, sc(), TG.center(tr(A.id)), hits); await W(50);
    log.push('menu: ' + [...document.querySelectorAll('.ctx-menu > .cm-list > .cm-item')].map((b) => b.textContent.trim()).join(' | '));
    UI.closeContextMenu();
    // 9) campanha antiga com ida e volta (os dois apontam um para o outro) continua ligada
    const v1 = TG.newPortal(sc(), { shape: 'circle', x: 1.5 * g, y: 1.5 * g, r: 0.5, name: 'Ida' }), v2 = TG.newPortal(sc(), { shape: 'circle', x: 14.5 * g, y: 8.5 * g, r: 0.5, name: 'Volta de Ida' });
    Object.assign(v1.actions[0], { portalId: v2.id, x: 14.5 * g, y: 8.5 * g }); Object.assign(v2.actions[0], { portalId: v1.id, x: 1.5 * g, y: 1.5 * g });
    const m = S.migrate(Object.assign(JSON.parse(JSON.stringify(S.state)), {}));
    m.scenes[sid].triggers.push(v1, v2);
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: v1 }); S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: v2 });
    log.push(`portal antigo com ida e volta: ligado = ${!!TG.portalPartner(sc(), tr(v1.id))} · ida e volta = ${TG.portalTwoWay(sc(), tr(v1.id))}`);
    if (location.hash === '#shot') { TG.connectPortals(sid, C.id, sub.id, D.id, true); sel(tr(C.id)); B.cam.z = 1; await W(200); B.render(); }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
