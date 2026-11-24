// Plano 73: o botão "Apresentar" passou a se chamar Foco, com a tecla Tab. Query padrão ?tutorial
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, UI = App.UI;
    if (UI.mode !== 'edit') UI.setMode('edit');
    await W(100);
    const btn = () => $('#btn-mode'), txt = () => btn().textContent.trim();
    const tab = (target) => (target || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true }));
    ok(txt() === 'Foco' && btn().querySelector('svg'), 'botão se chama Foco');
    ok(/Tab/.test(btn().title), 'dica cita a tecla Tab');
    log.push('mestre editando: "' + txt() + '" · ' + btn().title);
    // Botão liga e desliga (mesmo comportamento do antigo Apresentar)
    btn().click(); await W(150);
    ok(UI.mode === 'play' && txt() === 'Sair do foco' && $('#app').classList.contains('play'), 'clique liga o Foco');
    ok(!$('#toolbar [data-tool="wall"]') && $('#toolbar [data-tool="ruler"]') && $('#toolbar [data-tool="ping"]') && $('#toolbar [data-tool="pan"]'), 'no Foco: régua, ping e mover continuam; montagem some');
    log.push('Foco ligado: "' + txt() + '" · ferramentas: ' + [...document.querySelectorAll('#toolbar [data-tool]')].map((b) => b.dataset.tool).join(', '));
    btn().click(); await W(150);
    ok(UI.mode === 'edit' && txt() === 'Foco', 'clique desliga o Foco');
    // Tecla Tab: no mapa, na barra de ferramentas e no próprio botão
    tab(); await W(120);
    ok(UI.mode === 'play', 'Tab liga');
    tab(App.Board.canvas); await W(120);
    ok(UI.mode === 'edit', 'Tab desliga (com o mapa em foco)');
    $('#toolbar [data-tool="select"]').focus(); tab($('#toolbar [data-tool="select"]')); await W(120);
    ok(UI.mode === 'play', 'Tab funciona depois de clicar numa ferramenta');
    tab(); await W(120);
    // Tab digitando ou dentro de um painel não liga
    UI.showTab('chat'); await W(100);
    const input = $('#p-chat input') || $('input');
    input.focus(); tab(input); await W(120);
    ok(UI.mode === 'edit', 'Tab num campo de texto não liga o Foco');
    input.blur();
    log.push('Tab: liga e desliga · não liga dentro de campo');
    // Jogador (ver como): botão continua "Painéis"
    UI.setViewAs('*'); await W(150);
    UI.setMode('play'); await W(100);
    ok(txt() === 'Painéis', 'jogador continua com "Painéis"');
    tab(); await W(120);
    ok(UI.mode === 'play', 'Tab não mexe na tela do jogador');
    log.push('jogador: "' + txt() + '"');
    UI.setViewAs(null); await W(100); UI.setMode('edit');
    log.push('fim do foco');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
