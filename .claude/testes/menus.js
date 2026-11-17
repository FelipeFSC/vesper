// Plano 3 · Menus dentro da tela: rodar com -size '1280,620' (tela baixa)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const B = App.Board, S = App.Store;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    const area = $('#board-wrap').getBoundingClientRect();
    log.push('tela ' + innerWidth + '×' + innerHeight + ' · mapa vai até y=' + Math.round(area.bottom));
    const fits = (el) => { const r = el.getBoundingClientRect(); return { ok: r.top >= area.top - 1 && r.bottom <= area.bottom + 1, top: Math.round(r.top), bottom: Math.round(r.bottom), rola: el.scrollHeight > el.clientHeight + 1 }; };
    const tb = fits($('#toolbar'));
    log.push(`barra de ferramentas: cabe=${tb.ok} (${tb.top}–${tb.bottom}) rola=${tb.rola}`);
    for (const tool of ['path', 'rect', 'wall', 'prop', 'room']) {
      B.setTool(tool); App.UI.refresh(); await W(120);
      const r = fits($('#tool-opts'));
      log.push(`opções de ${tool}: cabe=${r.ok} (${r.top}–${r.bottom}) rola=${r.rola}`);
    }
    B.setTool('select');
    // menu ⋯
    $('#btn-menu').click(); await W(100);
    const m = $('#main-menu').getBoundingClientRect();
    log.push(`menu ⋯: cabe=${m.bottom <= innerHeight + 1} (até ${Math.round(m.bottom)})`);
    $('#btn-menu').click();
    // janela da ficha, aberta e arrastada para baixo
    const a = Object.values(S.state.actors)[0];
    App.UI.openActor(a.id, 'config'); await W(200);
    const win = [...document.querySelectorAll('.win')].pop(), wr = win.getBoundingClientRect();
    log.push(`ficha: cabe=${wr.bottom <= innerHeight + 1} (até ${Math.round(wr.bottom)}) · corpo rola=${win.querySelector('.win-body').scrollHeight > win.querySelector('.win-body').clientHeight}`);
    win.style.top = '300px'; window.dispatchEvent(new Event('resize')); await W(50);
    const wr2 = win.getBoundingClientRect();
    log.push(`ficha mais para baixo: cabe=${wr2.bottom <= innerHeight + 1} (até ${Math.round(wr2.bottom)})`);
    // painel do token no modo Apresentar
    App.UI.setMode('play'); B.selected = Object.values(S.currentScene().tokens)[0].id; B.requestRender(); await W(250);
    const hr = $('#token-hud').getBoundingClientRect();
    log.push(`painel do token (Apresentar): cabe=${hr.bottom <= area.bottom + 1} (até ${Math.round(hr.bottom)})`);
    if (location.hash === '#shot') { App.UI.setMode('edit'); B.selected = null; B.setTool('wall'); App.UI.refresh(); }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
