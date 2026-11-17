// Plano 4 · Clicar de novo na ferramenta fecha as opções
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    for (const tool of ['room', 'wall', 'prop', 'path', 'ruler']) {
      const btn = () => $(`#toolbar [data-tool="${tool}"]`);
      btn().click(); await W(80);
      const open = !$('#tool-opts').hidden, t1 = App.Board.tool;
      btn().click(); await W(80);
      log.push(`${tool}: 1º clique → ferramenta ${t1}, opções ${open ? 'abertas' : 'sem opções'} · 2º clique → ferramenta ${App.Board.tool}, opções ${$('#tool-opts').hidden ? 'fechadas' : 'abertas'}`);
    }
    $('#toolbar [data-tool="select"]').click(); $('#toolbar [data-tool="select"]').click(); await W(50);
    log.push('Selecionar clicado duas vezes continua: ' + App.Board.tool);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
