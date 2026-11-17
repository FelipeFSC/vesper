window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s);
  const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const sel = () => (document.querySelector('#lobby .mn-item.sel') || {}).textContent;
  try {
    log.push('itens: ' + [...document.querySelectorAll('#mn-root .mn-item')].map((e) => e.textContent).join(' / '));
    document.activeElement.blur();
    log.push('selecionado: ' + sel() + ' | desc: ' + $('#mn-desc').textContent);
    key('ArrowDown'); key('ArrowDown'); log.push('2x baixo: ' + sel());
    key('ArrowUp'); key('ArrowUp'); key('ArrowUp'); log.push('3x cima (volta ao fim): ' + sel());
    $('[data-sub="mn-play"]').click(); await W(50);
    log.push('submenu: ' + [...document.querySelectorAll('#mn-play .mn-item')].map((e) => e.textContent).join(' / ') + ' | raiz visível: ' + !$('#mn-root').hidden);
    $('#lb-join-open').click(); log.push('campo código visível: ' + !$('#mn-join').hidden + ' foco: ' + document.activeElement.id);
    $('#lb-code').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); log.push('esc fecha código: ' + $('#mn-join').hidden);
    key('Escape'); log.push('esc volta: raiz visível ' + !$('#mn-root').hidden + ', sel ' + sel());
    $('#lb-name').value = '';
    $('#lb-host').click(); await W(50); log.push('abrir sem nome pede nome: ' + $('.mn-profile').classList.contains('need') + ', lobby visível ' + !$('#lobby').hidden);
    $('#lb-sheet').click(); await W(1500);
    log.push('criar ficha: lobby escondido ' + $('#lobby').hidden + ', janela: ' + ([...document.querySelectorAll('.win')].map((w) => w.querySelector('input') && w.querySelector('input').value).join(',')) + ', nome ' + App.Store.me.name);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
