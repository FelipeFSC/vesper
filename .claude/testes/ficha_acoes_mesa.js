// Plano 81: na mesa, Duplicar, Exportar e Excluir na barra da janela da ficha e no ⋯ / clique direito da lista. Query padrão ?tutorial. #shot = foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, UI = App.UI;
    let asked = '', answer = true;
    window.confirm = (m) => { asked = m; return answer; };
    const mk = (id, name, extra) => Object.assign({ id, kind: 'monster', name, owner: '', bars: [{ name: 'PV', value: 10, max: 10 }], stats: [], actions: [], testFormula: '1d20+@valor', initFormula: '1d20' }, extra || {});
    S.dispatch({ type: 'actor.add', actor: mk('ac_t1', 'Tarrasque', { source: '5etools' }) });
    S.dispatch({ type: 'actor.add', actor: mk('ac_t2', 'Tarrasque', { source: '5etools' }) });
    await W(150);
    App.Board.placeActor('ac_t2'); await W(200);
    // Janela: ícones na barra do topo, em qualquer aba
    UI.openActor('ac_t1'); await W(200);
    const win = () => UI.windows.get('actor:ac_t1');
    const head = () => win().el.querySelector('.win-head');
    ok(['dup', 'export', 'del'].every((k) => head().querySelector(`.win-acts [data-wa="${k}"]`)), 'janela: Duplicar, Exportar e Excluir na barra');
    ok(head().lastElementChild.title === 'Fechar', 'o X continua por último');
    const tabs = [...win().el.querySelectorAll('.win-body .tabs button, .win-body [role="tab"]')];
    let all = true;
    for (const t of tabs) { t.click(); await W(120); if (!head().querySelector('[data-wa="del"]')) all = false; }
    ok(tabs.length >= 2 && all, 'os ícones ficam em todas as abas (' + tabs.length + ')');
    ok(!win().el.querySelector('.sheet-footer') || ![...win().el.querySelectorAll('.sheet-footer .btn')].some((b) => /Excluir|Duplicar|Exportar/.test(b.textContent)), 'rodapé do Configurar sem os três');
    // Duplicar pela barra
    const before = Object.keys(S.state.actors).length;
    head().querySelector('[data-wa="dup"]').click(); await W(200);
    ok(Object.keys(S.state.actors).length === before + 1, 'duplicar pela barra');
    const copy = Object.values(S.state.actors).find((a) => a.name === 'Tarrasque (cópia)');
    // Lista: ⋯ e clique direito
    const more = $('.ai-more[data-more="ac_t2"]');
    ok(more, 'botão ⋯ na lista da mesa');
    more.click(); await W(100);
    const items = $$('.ctx-menu .cm-item').map((b) => b.textContent.trim());
    ok(['Abrir', 'Colocar no mapa', 'Duplicar', 'Exportar', 'Excluir'].every((x) => items.includes(x)), 'menu ⋯ da mesa: ' + items.join(', '));
    // Excluir pelo menu: cancelar mantém; confirmar apaga a ficha e o token
    answer = false; $$('.ctx-menu .cm-item').find((b) => b.textContent.trim() === 'Excluir').click(); await W(100);
    ok(S.state.actors.ac_t2 && /token/.test(asked) && /continua no bestiário/.test(asked), 'excluir pergunta, avisa do token e do bestiário: ' + asked);
    answer = true; $('.ai-more[data-more="ac_t2"]').click(); await W(100);
    $$('.ctx-menu .cm-item').find((b) => b.textContent.trim() === 'Excluir').click(); await W(200);
    const toks = Object.values(S.currentScene().tokens).filter((t) => t.actorId === 'ac_t2');
    ok(!S.state.actors.ac_t2 && !toks.length && S.state.actors.ac_t1, 'excluir apaga a ficha e o token; a outra continua');
    // Clique direito
    const item = $$('.actor-item').find((x) => x.textContent.includes('Tarrasque (cópia)'));
    item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 300 })); await W(100);
    ok($('.ctx-menu') && /Tarrasque \(cópia\)/.test($('.ctx-menu .cm-title').textContent), 'clique direito na lista abre o menu da ficha');
    App.U.closeMenu();
    // Jogador: sem Duplicar e Excluir
    const gv = S.gmView; S.gmView = () => false;
    UI.closeWindow('actor:ac_t1'); UI.openActor('ac_t1'); await W(200);
    ok(!head().querySelector('[data-wa="del"]') && !head().querySelector('[data-wa="dup"]') && head().querySelector('[data-wa="export"]'), 'jogador: só Exportar na barra');
    ok(!UI.actorMenuItems(S.state.actors.ac_t1).filter(Boolean).some((x) => x.label === 'Excluir' || x.label === 'Duplicar'), 'jogador: menu sem Excluir e Duplicar');
    S.gmView = gv;
    UI.closeWindow('actor:ac_t1'); UI.openActor('ac_t1'); await W(200);
    // O menu do botão direito do mapa continua funcionando (agora pela peça comum)
    const tk = Object.values(S.currentScene().tokens)[0];
    if (tk) { UI.contextMenu(300, 300, S.currentScene(), { x: tk.x, y: tk.y }, [{ kind: 'token', obj: tk }]); await W(80); ok($('.ctx-menu .cm-item'), 'menu do mapa continua abrindo'); App.U.closeMenu(); }
    log.push('mesa: menu ' + items.join('/') + ' · cópia ' + !!copy);
    if (location.hash === '#shot') { $('.ai-more[data-more="ac_t1"]').click(); await W(200); log.push('foto pronta'); return; }
    log.push('fim das ações da ficha na mesa');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
