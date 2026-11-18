// Plano 20 · Seleção múltipla: laço (Shift + arrastar), Shift + clique, mover junto, setas, Delete, Ctrl+D, copiar e colar em outra cena
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, H = App.History, TG = App.Triggers, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.setTool('select');
    // uma "sala": 4 paredes com porta, luz, imagem e um gatilho que fecha a porta e apaga a luz
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [
      { id: 'a', x1: 2 * g, y1: 2 * g, x2: 6 * g, y2: 2 * g }, { id: 'b', x1: 6 * g, y1: 2 * g, x2: 6 * g, y2: 6 * g },
      { id: 'c', x1: 6 * g, y1: 6 * g, x2: 2 * g, y2: 6 * g }, { id: 'porta', x1: 2 * g, y1: 6 * g, x2: 2 * g, y2: 2 * g, door: true, open: true },
      { id: 'fora', x1: 9 * g, y1: 1 * g, x2: 12 * g, y2: 1 * g } ] });
    const lamp = B.addLight(sc(), { x: 4.5 * g, y: 3.5 * g }); B.selectedLight = null;
    const pr = B.addProp(sc(), 'img-falsa', { x: 3.5 * g, y: 4.5 * g }, 100, 100, 'Mesa'); B.selectedProp = null;
    const tr = TG.newTrigger(sc(), { name: 'Entrada', shape: 'rect', pts: [[2 * g, 4 * g], [3 * g, 4 * g], [3 * g, 5 * g], [2 * g, 5 * g]], x: 2.5 * g, y: 4.5 * g,
      actions: [Object.assign(TG.newAction('door'), { wallId: 'porta', op: 'close' }), Object.assign(TG.newAction('light'), { lightId: lamp.id, op: 'off' })] });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: tr });
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sid, id: hero.id, x: 4 * g, y: 3 * g });
    H.clear(); await W(150);
    const rect = () => B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y), r = rect(); return { clientX: r.left + p.x, clientY: r.top + p.y }; };
    const ptr = (type, x, y, extra = {}) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y), extra)));
    const sel = () => [...B.multi].map((k) => k.split(':')[0]).sort().join(',');

    // 1) laço com Shift em volta da sala (1,1)-(7,7): pega paredes (as 4), luz, imagem, gatilho, Lyra; não pega a parede de fora
    ptr('pointerdown', 1.2 * g, 1.2 * g, { shiftKey: true }); ptr('pointermove', 4 * g, 4 * g, { shiftKey: true }); ptr('pointermove', 6.8 * g, 6.8 * g, { shiftKey: true }); ptr('pointerup', 6.8 * g, 6.8 * g, { shiftKey: true });
    await W(200);
    log.push(`laço: ${B.multi.size} itens (${sel()}) · parede de fora fora = ${!B.multi.has('wall:fora')}`);
    log.push('painel: ' + (document.querySelector('#token-hud .hud-sub') || {}).textContent);
    // 2) Shift + clique tira a Lyra e põe de novo
    ptr('pointerdown', 4.5 * g, 3.5 * g, { shiftKey: true }); ptr('pointerup', 4.5 * g, 3.5 * g, { shiftKey: true });
    const without = B.multi.has('token:' + hero.id);
    // (a luz está no mesmo ponto? não: Lyra em (4,3) centro (4.5,3.5) = luz (4.5,3.5) → a luz tem prioridade) — testa com a imagem
    ptr('pointerdown', 3.5 * g, 4.5 * g, { shiftKey: true }); ptr('pointerup', 3.5 * g, 4.5 * g, { shiftKey: true });
    log.push(`Shift + clique: no ponto da luz tirou a luz = ${!B.multi.has('light:' + lamp.id)} (Lyra continua = ${without}) · na imagem tirou a imagem = ${!B.multi.has('prop:' + pr.id)}`);
    ptr('pointerdown', 4.5 * g, 3.5 * g, { shiftKey: true }); ptr('pointerup', 4.5 * g, 3.5 * g, { shiftKey: true });
    ptr('pointerdown', 3.5 * g, 4.5 * g, { shiftKey: true }); ptr('pointerup', 3.5 * g, 4.5 * g, { shiftKey: true });
    // 3) arrastar um selecionado move tudo 3 quadrados para a direita
    const wa = () => sc().walls.find((w) => w.id === 'a');
    ptr('pointerdown', 2.5 * g, 4.5 * g); ptr('pointermove', 4.1 * g, 4.6 * g); ptr('pointermove', 5.55 * g, 4.5 * g); ptr('pointerup', 5.55 * g, 4.5 * g);
    await W(100);
    const l1 = sc().lights.find((x) => x.id === lamp.id), p1 = sc().props.find((x) => x.id === pr.id), t1 = sc().triggers.find((x) => x.id === tr.id), h1 = sc().tokens[hero.id];
    log.push(`moveu tudo +3: parede a x1=${wa().x1 / g} · luz x=${l1.x / g} · imagem x=${p1.x / g} · gatilho centro x=${t1.x / g} · Lyra x=${h1.x / g} · parede de fora x1=${sc().walls.find((w) => w.id === 'fora').x1 / g}`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    log.push(`seta para baixo: parede a y1=${wa().y1 / g} · luz y=${sc().lights.find((x) => x.id === lamp.id).y / g}`);
    // 4) Ctrl+Z desfaz o movimento inteiro (um passo)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    log.push(`2× Ctrl+Z (seta e arraste): parede a x1=${wa().x1 / g} y1=${wa().y1 / g} · luz (${sc().lights.find((x) => x.id === lamp.id).x / g}, ${sc().lights.find((x) => x.id === lamp.id).y / g})`);
    // 5) Ctrl+D duplica tudo deslocado 1 quadrado
    const n0 = { w: sc().walls.length, l: sc().lights.length, t: sc().triggers.length };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
    log.push(`Ctrl+D: +${sc().walls.length - n0.w} paredes, +${sc().lights.length - n0.l} luz, +${sc().triggers.length - n0.t} gatilho · seleção agora = cópias (${B.multi.size})`);
    const dupTr = sc().triggers[sc().triggers.length - 1];
    log.push(`gatilho duplicado aponta para a porta e a luz duplicadas: porta ${dupTr.actions[0].ids[0] !== 'porta' && !!sc().walls.find((w) => w.id === dupTr.actions[0].ids[0])} · luz ${dupTr.actions[1].ids[0] !== lamp.id && !!sc().lights.find((o) => o.id === dupTr.actions[1].ids[0])}`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    log.push(`Delete apaga as cópias: paredes ${sc().walls.length} (era ${n0.w}) · luzes ${sc().lights.length} · gatilhos ${sc().triggers.length}`);
    // 6) copiar a sala e colar em outra cena
    B.multi = new Set(['wall:a', 'wall:b', 'wall:c', 'wall:porta', 'light:' + lamp.id, 'prop:' + pr.id, 'trigger:' + tr.id]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    const other = S.newScene('Taverna'); other.grid = 50;
    S.dispatch({ type: 'scene.add', scene: other });
    S.viewSceneId = other.id; App.UI.refresh(); B.render(); await W(200);
    B.mouseWorld = { x: 5.2 * 50, y: 3.3 * 50 };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    const o2 = S.state.scenes[other.id], ct = o2.triggers[0];
    log.push(`colou na cena Taverna (grid 50): ${o2.walls.length} paredes, ${o2.lights.length} luz, ${o2.props.length} imagem, ${o2.triggers.length} gatilho · canto da sala em (${Math.min(...o2.walls.map((w) => w.x1)) / 50}, ${Math.min(...o2.walls.map((w) => w.y1)) / 50}) · parede a mede ${Math.hypot(o2.walls[0].x2 - o2.walls[0].x1, o2.walls[0].y2 - o2.walls[0].y1) / 50} quad.`);
    log.push(`gatilho colado aponta para a porta e a luz da Taverna: ${!!o2.walls.find((w) => w.id === ct.actions[0].ids[0] && w.door)} / ${!!o2.lights.find((o) => o.id === ct.actions[1].ids[0])}`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    log.push(`Ctrl+Z desfaz o colar inteiro: ${o2.walls.length} paredes, ${o2.triggers.length} gatilhos`);
    // 7) jogador não seleciona vários
    S.viewSceneId = null; App.UI.refresh(); await W(150);
    S.viewAs = '*'; App.UI.setMode('play'); B.multi.clear(); await W(200);
    ptr('pointerdown', 1.2 * g, 1.2 * g, { shiftKey: true }); ptr('pointermove', 6.8 * g, 6.8 * g, { shiftKey: true }); ptr('pointerup', 6.8 * g, 6.8 * g, { shiftKey: true });
    log.push(`jogador com Shift + arrastar: selecionados ${B.multi.size}`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
