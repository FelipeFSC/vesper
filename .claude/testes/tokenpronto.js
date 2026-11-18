// Plano 26: token pronto (imagem inteira do tamanho do token) × retrato (círculo). Query padrão ?tutorial; #shot + -shot = foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    // Imagem quadrada, opaca, vermelha: no token pronto ela pinta o canto do quadrado; no retrato, não
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const cg = c.getContext('2d'); cg.fillStyle = '#e0201c'; cg.fillRect(0, 0, 128, 128);
    const data = c.toDataURL('image/png'), img = 'img_' + App.U.hash(data);
    S.assets[img] = data;
    const mk = (name, style, size) => { const a = { id: App.U.uid('ac_'), kind: 'monster', name, img, color: '#335', size, owner: '', bars: [{ name: 'PV', value: 10, max: 10 }], stats: [], actions: [], imgStyle: style }; S.dispatch({ type: 'actor.add', actor: a }); return a.id; };
    const aT = mk('Pronto', 'token', 1), aP = mk('Retrato', null, 1), aG = mk('Pronto grande', 'token', 3);
    B.placeActor(aT, { x: 2.5 * g, y: 2.5 * g }); B.placeActor(aP, { x: 5.5 * g, y: 2.5 * g }); B.placeActor(aG, { x: 9.5 * g, y: 3.5 * g });
    B.selected = null;
    for (let i = 0; i < 40 && !App.Images.get(img); i++) { App.Images.get(img); await W(50); }
    B.cam.z = 1; B.cam.x = 0; B.cam.y = 0; B.render(); await W(100); B.render();
    const tok = (id) => Object.values(sc().tokens).find((t) => t.actorId === id);
    const ctx = B.canvas.getContext('2d');
    const px = (wx, wy) => { const p = B.toScreen(wx, wy); const d = ctx.getImageData(Math.round(p.x * B.dpr), Math.round(p.y * B.dpr), 1, 1).data; return [d[0], d[1], d[2]]; };
    const red = (p) => p[0] > 180 && p[1] < 80 && p[2] < 80;
    const check = (id, label) => {
      const t = tok(id), s = (t.size || 1) * g;
      const corner = px(t.x + s * 0.06, t.y + s * 0.06), center = px(t.x + s / 2, t.y + s / 2), edge = px(t.x + s * 0.5, t.y + s * 0.02);
      log.push(`${label}: canto ${corner} · centro ${center} · borda de cima ${edge}`);
      return { corner: red(corner), center: red(center), edge: red(edge) };
    };
    const T = check(aT, 'token pronto 1×1'), P = check(aP, 'retrato 1×1'), G = check(aG, 'token pronto 3×3');
    ok(T.corner && T.center && T.edge, 'token pronto ocupa o quadrado inteiro');
    ok(!P.corner && P.center && !P.edge, 'retrato continua no círculo (80%)');
    ok(G.corner && G.center, 'token pronto 3×3 ocupa o 3×3');
    // Trocar na ficha muda na hora
    App.UI.openActor(aP, 'config'); await W(150);
    const sel = $$('.win select').find((s) => [...s.options].some((o) => o.value === 'token'));
    ok(sel, 'opção Imagem no tabuleiro na ficha');
    sel.value = 'token'; sel.dispatchEvent(new Event('change')); await W(100);
    B.render(); await W(50);
    ok(S.state.actors[aP].imgStyle === 'token' && check(aP, 'retrato trocado para token').corner, 'trocar na ficha');
    sel.value = 'portrait'; sel.dispatchEvent(new Event('change')); await W(100); B.render();
    ok(S.state.actors[aP].imgStyle == null && !check(aP, 'de volta a retrato').corner, 'voltar a retrato');
    App.UI.closeWindow('actor:' + aP);
    // Seleção, caído e condições continuam no token pronto
    const t = tok(aT);
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: t.id, patch: { conditions: [{ name: 'Caído' }] } });
    B.selected = t.id; B.render();
    log.push('com seleção e condição: sem erro');
    // migrate: ficha antiga do bestiário vira token pronto
    const old = { id: 'ac_old5e', kind: 'monster', name: 'Antiga', source: '5etools', bars: [], stats: [], actions: [] };
    const st = JSON.parse(JSON.stringify(S.state)); st.actors[old.id] = old;
    S.migrate(st);
    ok(st.actors[old.id].imgStyle === 'token', 'migrate: ficha do bestiário vira token pronto');
    const kept = JSON.parse(JSON.stringify(S.state)); kept.actors[old.id] = Object.assign({}, old, { imgStyle: null }); S.migrate(kept);
    ok(kept.actors[old.id].imgStyle === null, 'migrate: quem escolheu retrato continua retrato');
    if (location.hash === '#shot') { B.selected = null; B.cam.z = 1.6; B.cam.x = g; B.cam.y = g; B.requestRender(); await W(200); }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1500));
