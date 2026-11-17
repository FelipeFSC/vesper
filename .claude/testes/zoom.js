// Plano 2: o controle de zoom não fica embaixo do dock nem dos botões da direita
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    App.UI.refresh(); await W(200);
    const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    const z = $('#zoom').getBoundingClientRect(), d = $('#dock').getBoundingClientRect(), ba = $('#board-actions').getBoundingClientRect();
    log.push(`tela ${innerWidth}: zoom encosta no dock ${hit(z, d)}, nos botões ${hit(z, ba)} · dock encosta nos botões ${hit(d, ba)}`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
