// Plano 28: menu do botão direito. Query padrão ?tutorial; #shot + -shot = foto do menu do token
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, TG = App.Triggers, sc = () => S.currentScene(), g = sc().grid, sid = sc().id, D = (a) => S.dispatch(a);
    if (UI.mode !== 'edit') UI.setMode('edit');
    D({ type: 'wall.clear', sceneId: sid });
    B.cam.z = 1; B.cam.x = 0; B.cam.y = 0; B.requestRender(); await W(50);
    const scr = (wx, wy) => { const r = B.canvas.getBoundingClientRect(), p = B.toScreen(wx, wy); return { x: r.left + p.x, y: r.top + p.y }; };
    const ev = (type, x, y, button, target) => (target || B.canvas).dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button, buttons: type === 'pointerup' ? 0 : button === 2 ? 2 : 1, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    const rclick = async (wx, wy) => { const p = scr(wx, wy); ev('pointerdown', p.x, p.y, 2); await W(10); window.dispatchEvent(new PointerEvent('pointerup', { clientX: p.x, clientY: p.y, button: 2, buttons: 0, pointerId: 1, pointerType: 'mouse' })); await W(60); };
    const title = () => ($('.ctx-menu .cm-title') || {}).textContent || '';
    const labels = () => $$('.ctx-menu > .cm-list > .cm-item, .ctx-menu > .cm-list > .cm-has-sub > .cm-item').map((b) => b.textContent.trim());
    const item = (txt) => $$('.ctx-menu .cm-item').find((b) => b.textContent.trim().startsWith(txt));
    const esc = async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(30); };
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => /goblin/i.test(t.name));
    const mid = (t) => [t.x + ((t.size || 1) * g) / 2, t.y + ((t.size || 1) * g) / 2];

    // 1) Direito no token abre o menu do token
    await rclick(...mid(hero));
    log.push('token: "' + title() + '" · ' + labels().join(' | '));
    ok(/Token · Lyra/.test(title()) && labels().some((l) => /^Ficha/.test(l)) && labels().some((l) => /^Ações/.test(l)) && labels().some((l) => /Esconder dos jogadores/.test(l)), 'menu do token');
    // Esc fecha
    await esc(); ok(!$('.ctx-menu'), 'Esc fecha');
    // 2) Arrastar com o direito move a câmera e não abre menu
    const p0 = scr(10 * g, 8 * g), cam0 = B.cam.x;
    ev('pointerdown', p0.x, p0.y, 2); await W(10);
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: p0.x + 80, clientY: p0.y, buttons: 2, pointerId: 1, pointerType: 'mouse' })); await W(10);
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: p0.x + 80, clientY: p0.y, button: 2, buttons: 0, pointerId: 1, pointerType: 'mouse' })); await W(50);
    ok(!$('.ctx-menu') && B.cam.x < cam0 - 50, 'arrastar o direito move a câmera');
    log.push('arrastar com o direito: câmera ' + Math.round(cam0) + ' → ' + Math.round(B.cam.x) + ', menu ' + !!$('.ctx-menu'));
    B.cam.x = 0; B.cam.y = 0; B.requestRender(); await W(30);

    // 3) Ações direto do menu: Espada longa → mira
    await rclick(...mid(hero));
    const acts = item('Ações'); acts.closest('.cm-has-sub').dispatchEvent(new PointerEvent('pointerenter')); await W(30);
    const sword = $$('.ctx-menu .cm-sub .cm-item').find((b) => /Espada/.test(b.textContent));
    ok(sword, 'ação Espada no submenu'); sword.click(); await W(60);
    ok(B.targeting && /Espada/.test(B.targeting.label), 'ação pelo menu abre a mira');
    log.push('ação pelo menu: mira de "' + (B.targeting && B.targeting.label) + '"');
    B.cancelTargeting(); await W(30);
    // Condição pelo menu
    await rclick(...mid(gob));
    item('Condições').closest('.cm-has-sub').dispatchEvent(new PointerEvent('pointerenter')); await W(30);
    $$('.ctx-menu .cm-sub .cm-item').find((b) => b.textContent.trim() === 'Caído').click(); await W(50);
    ok((sc().tokens[gob.id].conditions || []).some((c) => c.name === 'Caído'), 'condição pelo menu');

    // 4) Modo Apresentar: clique esquerdo não abre o painel; o menu abre
    UI.setMode('play'); await W(100);
    const ph = scr(...mid(hero));
    ev('pointerdown', ph.x, ph.y, 0); await W(10);
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: ph.x, clientY: ph.y, button: 0, buttons: 0, pointerId: 1, pointerType: 'mouse' })); await W(120);
    B.requestRender(); await W(60);
    ok(B.selected === hero.id && $('#token-hud').hidden, 'esquerdo seleciona sem abrir o painel');
    log.push('Apresentar, esquerdo: selecionado ' + (B.selected === hero.id) + ', painel ' + ($('#token-hud').hidden ? 'fechado' : 'aberto'));
    await rclick(...mid(hero));
    item('Painel do token').click(); await W(60); B.requestRender(); await W(60);
    ok(!$('#token-hud').hidden, 'Painel do token pelo menu');
    log.push('Painel do token pelo menu: ' + ($('#token-hud').hidden ? 'fechado' : 'aberto'));
    UI.setMode('edit'); await W(100);

    // 5) Luz, gatilho, nota, porta, parede, som e mapa vazio
    const lt = B.addLight(sc(), { name: 'Tocha', x: 3.5 * g, y: 7.5 * g, on: true }); B.selectedLight = null;
    await rclick(3.5 * g, 7.5 * g);
    log.push('luz: "' + title() + '" · ' + labels().join(' | '));
    ok(/Luz/.test(title()) && labels().some((l) => /Apagar a luz/.test(l)) && labels().some((l) => /animação/i.test(l)), 'menu da luz');
    item('Apagar a luz').click(); await W(40);
    ok(sc().lights.find((o) => o.id === lt.id).on === false, 'apagou a luz pelo menu');
    await rclick(3.5 * g, 7.5 * g); item('Criar animação').click(); await W(120);
    ok(UI.windows.get('anim-editor'), 'animação pelo menu abre o editor');
    UI.closeWindow('anim-editor');
    const tr = TG.newTrigger(sc(), { shape: 'circle', x: 14.5 * g, y: 2.5 * g, r: 1, name: 'Alarme', actions: [Object.assign(TG.newAction('light'), { ids: [lt.id], op: 'on' })] });
    D({ type: 'trigger.add', sceneId: sid, trigger: tr });
    await rclick(14.5 * g, 2.5 * g);
    log.push('gatilho: "' + title() + '" · ' + labels().join(' | '));
    ok(/Gatilho · Alarme/.test(title()), 'menu do gatilho');
    item('Disparar agora').click(); await W(80);
    ok(sc().lights.find((o) => o.id === lt.id).on !== false, 'disparar pelo menu');
    await rclick(14.5 * g, 2.5 * g); item('Configurar').click(); await W(150);
    ok(UI.windows.get('trigger:' + tr.id), 'configurar abre a janela do gatilho');
    UI.closeWindow('trigger:' + tr.id);
    // Token em cima de gatilho: "Outros aqui"
    D({ type: 'token.move', sceneId: sid, id: gob.id, x: 14 * g, y: 2 * g });
    await rclick(14.5 * g, 2.5 * g);
    const other = item('Outros aqui');
    ok(/Token/.test(title()) && other, 'empilhados: o de cima + Outros aqui');
    other.closest('.cm-has-sub').dispatchEvent(new PointerEvent('pointerenter')); await W(30);
    log.push('outros aqui: ' + $$('.ctx-menu .cm-sub .cm-item').map((b) => b.textContent).join(', '));
    await esc();
    // Porta e parede
    D({ type: 'wall.add', sceneId: sid, walls: [{ id: 'w_door', x1: 6 * g, y1: 10 * g, x2: 7 * g, y2: 10 * g, cover: 'full', door: true, open: false }] });
    D({ type: 'wall.add', sceneId: sid, walls: [{ id: 'w_wall', x1: 8 * g, y1: 10 * g, x2: 11 * g, y2: 10 * g, cover: 'full' }] });
    await rclick(6.5 * g, 10 * g);
    ok(/Porta/.test(title()), 'menu da porta'); item('Abrir a porta').click(); await W(40);
    ok(sc().walls.find((w) => w.id === 'w_door').open === true, 'abrir porta pelo menu');
    await rclick(9.5 * g, 10 * g);
    ok(/Parede/.test(title()), 'menu da parede');
    item('Tipo de parede').closest('.cm-has-sub').dispatchEvent(new PointerEvent('pointerenter')); await W(30);
    $$('.ctx-menu .cm-sub .cm-item').find((b) => /Meia parede \(cintura\)/.test(b.textContent)).click(); await W(40);
    ok(sc().walls.find((w) => w.id === 'w_wall').cover === 'half', 'tipo de parede pelo menu');
    // Mapa vazio
    await rclick(9.5 * g, 6.5 * g);
    log.push('mapa vazio: ' + labels().join(' | '));
    ok(labels().some((l) => /Colocar ficha aqui/.test(l)) && labels().some((l) => /Recolher a barra da direita/.test(l)), 'menu do mapa vazio');
    const nL = sc().lights.length; item('Luz aqui').click(); await W(60);
    ok(sc().lights.length === nL + 1, 'luz aqui');
    await rclick(10.5 * g, 5.5 * g); item('Colocar ficha aqui').click(); await W(80);
    const inp = $('.cm-place input'); inp.value = 'gob'; inp.dispatchEvent(new Event('input')); await W(60);
    const n0 = Object.keys(sc().tokens).length;
    $('.cm-place-item').click(); await W(80);
    const placed = Object.values(sc().tokens).find((t) => !toks.some((o) => o.id === t.id));
    ok(Object.keys(sc().tokens).length === n0 + 1 && placed && Math.abs(placed.x - 10 * g) <= g && Math.abs(placed.y - 5 * g) <= g, 'colocar ficha aqui no ponto');
    log.push('colocar ficha aqui: ' + (placed && placed.name) + ' em ' + (placed && [placed.x / g, placed.y / g].join(',')));
    // Recolher a barra da direita
    await rclick(12.5 * g, 6.5 * g); item('Recolher a barra da direita').click(); await W(80);
    ok(UI.collapsed.right === true, 'recolher a barra pelo menu');
    UI.setCollapsed('right', false); await W(60);
    // Menu no canto não sai da tela
    const rr = B.canvas.getBoundingClientRect();
    const corner = { x: rr.right - 5, y: rr.bottom - 5 };
    ev('pointerdown', corner.x, corner.y, 2); await W(10);
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: corner.x, clientY: corner.y, button: 2, buttons: 0, pointerId: 1, pointerType: 'mouse' })); await W(60);
    const mr = $('.ctx-menu').getBoundingClientRect();
    ok(mr.right <= innerWidth && mr.bottom <= innerHeight && mr.left >= 0 && mr.top >= 0, 'menu cabe na tela');
    await esc();
    // 6) Jogador: no próprio token só o que pode; no mapa vazio, só Ping
    S.viewAs = '*'; UI.refresh(); B.requestRender(); await W(150);
    await rclick(...mid(hero));
    const pl = labels();
    log.push('jogador no token: "' + title() + '" · ' + pl.join(' | '));
    ok(!pl.some((l) => /Esconder|Apagar/.test(l)) && pl.some((l) => /Ações/.test(l)), 'jogador não vê opções do mestre');
    await esc();
    await rclick(12.5 * g, 8.5 * g);
    log.push('jogador no mapa vazio: ' + labels().join(' | '));
    ok(labels().length === 1 && /Ping/.test(labels()[0]), 'jogador: só Ping');
    await esc();
    S.viewAs = null; UI.refresh(); await W(100);
    if (location.hash === '#shot') {
      D({ type: 'token.move', sceneId: sid, id: gob.id, x: 6 * g, y: 4 * g }); B.selected = null; await W(50);
      await rclick(...mid(hero));
      item('Ações').closest('.cm-has-sub').dispatchEvent(new PointerEvent('pointerenter')); await W(200);
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
