// Plano 29 (bug): painel do isolamento flutuante preso por cima das ferramentas
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    S.dispatch({ type: 'room.add', sceneId: sc().id, room: { id: 'rx', name: 'Teste', pts: [[g * 3, g * 3], [g * 6, g * 3], [g * 6, g * 6], [g * 3, g * 6]], outside: 'stop', ambient: 'stop' } });
    const room = sc().rooms[0];
    App.UI.setCollapsed('right', true); await W(150);
    B.setTool('select');
    App.UI.contextMenu(300, 300, sc(), { x: g * 4, y: g * 4 }, [{ kind: 'room', obj: room }]); await W(50);
    const cfg = [...document.querySelectorAll('.ctx-menu .cm-item')].find((b) => /Configurar/.test(b.textContent));
    cfg && cfg.click(); await W(200);
    const hud = $('#token-hud');
    log.push('painel aberto: ' + !hud.hidden + ' · flutuando: ' + hud.classList.contains('floating') + ' · posição: ' + hud.style.transform);
    // clicar no vazio com a seleção solta o isolamento e fecha o painel
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const o = Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(g * 12, g * 12));
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); await W(200);
    log.push('depois de clicar no vazio: selecionado ' + B.selectedRoom + ' · painel escondido: ' + hud.hidden);
    // barra aberta de novo: painel volta para a lateral
    App.UI.setCollapsed('right', false); await W(100);
    B.selectObj('room', room); App.UI.refresh(); await W(150);
    log.push('barra aberta: painel na lateral, posição "' + hud.style.transform + '"');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
