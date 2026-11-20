// Plano 35 · Portal: marcador para os jogadores (visão), linha, ícones; chegada antiga (área e ponto) continua funcionando.
// (A área de chegada desenhada e a ida e volta automática saíram no Plano 41: ver portal3.js)
// #shot: deixa a tela pronta para a foto do marcador (visão do jogador)
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
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name));
    if (!Object.keys(S.state.players).length) S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#38bdf8' });
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || 'p1';
    const place = (id, cx, cy, scId) => S.dispatch({ type: 'token.move', sceneId: scId || sid, id, x: cx * g, y: cy * g, fromTrigger: true });
    const walk = (id, pts, scId) => S.remoteAction({ type: 'token.move', sceneId: scId || sid, id, x: pts[pts.length - 1][0] * g, y: pts[pts.length - 1][1] * g, path: pts.map(([x, y]) => [x * g, y * g]), at: Date.now() }, pid);
    B.cam.x = 0; B.cam.y = 0; B.cam.z = 0.6; B.render(); await W(50);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const ev = (type, x, y) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y))));
    const drag = (x1, y1, x2, y2) => { ev('pointerdown', x1, y1); ev('pointermove', (x1 + x2) / 2, (y1 + y2) / 2); ev('pointermove', x2, y2); ev('pointerup', x2, y2); };
    const hudBtn = (re) => [...document.querySelectorAll('#token-hud .btn')].find((b) => re.test(b.textContent));
    const tr = (id, scId) => ((S.state.scenes[scId || sid].triggers) || []).find((t) => t.id === id);

    // 1) chegada antiga desenhada (área 3×2 guardada no portal): sorteio dentro dela
    const A = B.addTrigger(sc(), { shape: 'rect', pts: [[9 * g, 2 * g], [10 * g, 2 * g], [10 * g, 3 * g], [9 * g, 3 * g]], portal: true, name: 'Vagão' });
    const acts = JSON.parse(JSON.stringify(tr(A.id).actions)); acts[0].area = { shape: 'rect', pts: [[2 * g, 5 * g], [5 * g, 5 * g], [5 * g, 7 * g], [2 * g, 7 * g]] }; acts[0].x = 3.5 * g; acts[0].y = 6 * g;
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: A.id, patch: { actions: acts } });
    B.selectObj('trigger', tr(A.id)); UI.refresh(); B.render(); await W(80);
    log.push('painel: "Desenhar a chegada" saiu = ' + !hudBtn(/Desenhar a chegada/) + ' · aviso: ' + ($('#token-hud .hud-section .hint') || {}).textContent);
    const cells = new Set();
    let inside = 0;
    for (let i = 0; i < 10; i++) {
      place(hero.id, 7, 2); walk(hero.id, [[7, 2], [9, 2]]);
      const t = sc().tokens[hero.id], cx = t.x / g, cy = t.y / g;
      if (cx >= 2 && cx < 5 && cy >= 5 && cy < 7) inside++;
      cells.add(cx + ',' + cy);
    }
    log.push(`chegada antiga, 10 passagens: ${inside} dentro da área · ${cells.size} quadrados diferentes (sorteio)`);
    // portal na sub-cena, ligado (ida e volta)
    const sub = S.newScene('Andar de baixo'); sub.parent = sid; S.dispatch({ type: 'scene.add', scene: sub });
    const Bp = B.addTrigger(sc(), { shape: 'circle', x: 12.5 * g, y: 4.5 * g, r: 0.5, portal: true, name: 'Escada' });
    const down = TG.newPortal(S.state.scenes[sub.id], { shape: 'circle', x: 5.5 * g, y: 5.5 * g, r: 0.5, name: 'Escada de baixo' });
    S.dispatch({ type: 'trigger.add', sceneId: sub.id, trigger: down });
    TG.connectPortals(sid, Bp.id, sub.id, down.id, true);

    // 4) marcador para os jogadores: escada subindo; a volta ganha a escada descendo
    B.selectObj('trigger', tr(Bp.id)); UI.refresh(); B.render(); await W(80);
    const chk = [...document.querySelectorAll('#token-hud label.check')].find((l) => /Mostrar aos jogadores/.test(l.textContent));
    log.push('opção "Mostrar aos jogadores": ' + !!chk + ' · desligada = ' + !chk.querySelector('input').checked);
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: Bp.id, patch: { mark: TG.newMark({ icon: 'up' }) } }); B.render(); await W(50);
    [...document.querySelectorAll('#token-hud label.check')].find((l) => /Mostrar aos jogadores/.test(l.textContent)).querySelector('input').click(); await W(50); B.render(); await W(80);
    const bk2 = TG.portalPartner(S.state.scenes[sid], tr(Bp.id));
    log.push(`ligou: portal mostra = ${tr(Bp.id).mark.show} · o outro portal tem o marcador dele (não copia) = ${!(bk2.tr.mark && bk2.tr.mark.show)}`);
    log.push('ícones no painel: ' + [...document.querySelectorAll('#token-hud .mk-icon')].map((b) => b.title).join(', '));
    // nome
    const nameIn = [...document.querySelectorAll('#token-hud input.hud-input')][0];
    nameIn.value = 'Andar de baixo'; nameIn.dispatchEvent(new Event('change')); await W(50);
    log.push('nome para os jogadores: ' + tr(Bp.id).mark.label);

    // 5) visão: o jogador vê o marcador com luz e não vê no escuro
    const c = B.markSpot(tr(Bp.id)), toS = () => ({ x: (c.x - B.cam.x) * B.cam.z, y: (c.y - B.cam.y) * B.cam.z });
    const blue = () => {
      B.render();
      const cv = B.canvas, ctx = cv.getContext('2d'), dpr = cv.width / B.w, p = toS(), R = Math.round(g * 0.34 * B.cam.z * dpr);
      const d = ctx.getImageData(Math.round(p.x * dpr) - R, Math.round(p.y * dpr) - R, R * 2, R * 2).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 170 && d[i + 1] > 140 && d[i] < 140) n++;
      return n;
    };
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { enabled: true, global: true }) } });
    UI.setViewAs('*'); await W(100);
    const vis = blue();
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { enabled: true, global: false }) } });
    S.dispatch({ type: 'token.update', sceneId: sid, id: hero.id, patch: { light: null, vision: 0 } });
    await W(50);
    const dark = blue();
    UI.setViewAs(null); await W(50);
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: Bp.id, patch: { mark: Object.assign({}, tr(Bp.id).mark, { show: false }) } });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { enabled: true, global: true }) } });
    UI.setViewAs('*'); await W(50);
    const off = blue();
    UI.setViewAs(null); await W(50);
    log.push(`visão do jogador (pixels azuis no ícone): com luz ${vis} · no escuro ${dark} · desligado ${off}`);

    // 6) linha: dois cliques
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: Bp.id, patch: { mark: Object.assign({}, tr(Bp.id).mark, { show: true, style: 'area' }) } });
    B.selectObj('trigger', tr(Bp.id)); UI.refresh(); B.render(); await W(80);
    [...document.querySelectorAll('#token-hud .seg button')].find((b) => b.textContent === 'Linha').click(); await W(50);
    const click = (x, y) => { ev('pointerdown', x, y); ev('pointerup', x, y); };
    click(12 * g, 4 * g); await W(30); click(13.1 * g, 4.1 * g); await W(50);
    log.push('linha: ' + JSON.stringify((tr(Bp.id).mark.line || []).map(([x, y]) => [x / g, y / g])) + ' · estilo ' + tr(Bp.id).mark.style);
    // portal antigo (ponto) continua funcionando
    const old = TG.newPortal(sc(), { shape: 'circle', x: 14.5 * g, y: 8.5 * g, r: 0.5 });
    Object.assign(old.actions[0], { x: 1.5 * g, y: 1.5 * g });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: old });
    place(hero.id, 14, 6); walk(hero.id, [[14, 6], [14, 8]]);
    log.push('portal antigo (só um ponto): token em (' + sc().tokens[hero.id].x / g + ', ' + sc().tokens[hero.id].y / g + ') (esperado (1, 1))');
    if (location.hash === '#shot') {
      S.dispatch({ type: 'trigger.delete', sceneId: sid, id: old.id });
      S.dispatch({ type: 'trigger.update', sceneId: sid, id: A.id, patch: { mark: TG.newMark({ show: true, icon: 'door', label: 'Vagão 2' }) } });
      S.dispatch({ type: 'trigger.update', sceneId: sid, id: Bp.id, patch: { mark: Object.assign({}, tr(Bp.id).mark, { show: true }) } });
      place(hero.id, 11, 3);
      B.markHover = Bp.id; B.cam.z = 1; B.cam.x = 0; B.cam.y = 0;
      UI.setViewAs('*'); await W(200); B.render();
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
