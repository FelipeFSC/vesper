// Plano 72: Linha, Retângulo e Círculo num botão só (Formas). Query padrão ?tutorial; #shot = menu aberto para a foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, D = (a) => S.dispatch(a);
    if (UI.mode !== 'edit') UI.setMode('edit');
    B.setTool('select'); UI.refresh(); await W(80);
    const tools = () => $$('#toolbar [data-tool]').map((b) => b.dataset.tool);
    const btn = () => $('#toolbar [data-tool="shape"]');
    const rows = () => $$('#tool-opts .to-row');
    const labels = () => rows().map((b) => b.querySelector('.to-label').textContent + (b.classList.contains('on') ? '*' : ''));
    const iconOf = () => btn().dataset.icon;

    // Barra: Desenho livre · Formas · Apagar
    const t = tools();
    ok(!t.includes('line') && !t.includes('rect') && !t.includes('ellipse') && t.includes('shape'), 'formas viraram um botão só');
    ok(t.indexOf('path') + 1 === t.indexOf('shape') && t.indexOf('shape') + 1 === t.indexOf('erase'), 'ordem: livre, formas, apagar');
    log.push('barra: ' + t.join(' · '));

    // Primeiro clique: Linha
    btn().click(); await W(80);
    ok(B.tool === 'line' && btn().classList.contains('on'), 'primeiro clique liga a Linha');
    ok(labels().slice(0, 3).join(',') === 'Linha*,Retângulo,Círculo', 'menu começa com as formas');
    ok(!labels().some((l) => /Preench/.test(l)), 'linha sem preenchimento');
    log.push('menu da linha: ' + labels().join(' | '));
    // Trocar pela linha do menu
    rows().find((b) => /Retângulo/.test(b.textContent)).click(); await W(80);
    ok(B.tool === 'rect' && btn().classList.contains('on') && iconOf() === 'square', 'menu troca para Retângulo (ícone acompanha)');
    ok(labels().some((l) => /Preench/.test(l)), 'retângulo com preenchimento');
    log.push('menu do retângulo: ' + labels().join(' | '));
    // Clicar de novo no botão aceso volta para Selecionar; depois volta para a última forma
    btn().click(); await W(60);
    ok(B.tool === 'select' && !btn().classList.contains('on') && $('#tool-opts').hidden, 'clicar de novo volta para Selecionar');
    btn().click(); await W(60);
    ok(B.tool === 'rect', 'o botão lembra a última forma');
    // Atalhos L, B, E
    const key = (k) => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); };
    B.setTool('select'); key('e'); await W(60);
    ok(B.tool === 'ellipse' && btn().classList.contains('on') && iconOf() === 'circle', 'atalho E');
    key('l'); await W(60); ok(B.tool === 'line' && iconOf() === 'slash', 'atalho L');
    key('b'); await W(60); ok(B.tool === 'rect', 'atalho B');
    log.push('atalhos: ok · ícone agora ' + iconOf());

    // Desenhar as três formas (como antes)
    const sc = S.currentScene(), g = sc.grid, n0 = sc.drawings.length;
    const drag = async (x1, y1, x2, y2) => {
      const r = B.canvas.getBoundingClientRect(), a = B.toScreen(x1, y1), b = B.toScreen(x2, y2);
      const ev = (type, p, target) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + p.x, clientY: r.top + p.y, button: 0, buttons: 1, pointerId: 1 }));
      ev('pointerdown', a, B.canvas); await W(20); ev('pointermove', b, window); await W(20); ev('pointerup', b, window); await W(40);
    };
    for (const [k, i] of [['l', 0], ['b', 1], ['e', 2]]) { key(k); await W(40); await drag(3 * g, (2 + 2 * i) * g, 6 * g, (3 + 2 * i) * g); }
    const made = S.currentScene().drawings.slice(n0).map((d) => d.type);
    ok(made.join(',') === 'line,rect,ellipse', 'desenhou linha, retângulo e círculo (' + made.join(',') + ')');
    log.push('desenhos: ' + made.join(', '));
    // Jogador (Apresentar): ferramentas de desenho somem como antes
    UI.setMode('play'); await W(60);
    ok(!$('#toolbar [data-tool="shape"]'), 'no modo Apresentar não aparece');
    UI.setMode('edit'); await W(60);
    if (location.hash === '#shot') { btn().click(); await W(80); if (B.tool === 'select') { btn().click(); await W(80); } rows().find((b) => /Círculo/.test(b.textContent)).click(); await W(150); log.push('foto pronta'); return; }
    log.push('fim das formas');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
