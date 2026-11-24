// Plano 81: fechar, duplicar, exportar e excluir à vista na página "Criar ficha" (ficha.html). #shot = foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    const F = App.Ficha;
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    let asked = '', answer = true;
    window.confirm = (m) => { asked = m; return answer; };
    const bar = () => $('.fp-sheetbar');
    const n = () => Object.keys(F.actors).length;
    // Genérica: barra no topo
    const g = F.newActor('pc', 'generic'); await W(150);
    ok(bar() && bar() === $('#fp-main').firstElementChild, 'genérica: barra no topo da ficha');
    ok(['export', 'dup', 'del', 'close'].every((k) => bar().querySelector(`[data-fa="${k}"]`)), 'genérica: Exportar, Duplicar, Excluir e Fechar');
    ok(!$('.fp-foot'), 'rodapé antigo saiu');
    // Fechar: volta à tela inicial, a ficha continua
    bar().querySelector('[data-fa="close"]').click(); await W(150);
    ok(!F.sel && $('.fp-empty') && n() === 1 && $$('.fp-item').length === 1, 'fechar: tela inicial e a ficha continua na lista');
    F.select(g.id); await W(100);
    // Duplicar abre a cópia
    bar().querySelector('[data-fa="dup"]').click(); await W(150);
    ok(n() === 2 && F.actors[F.sel].name === g.name + ' (cópia)', 'duplicar abre a cópia');
    // Excluir: pergunta; cancelar mantém
    answer = false; bar().querySelector('[data-fa="del"]').click(); await W(100);
    ok(n() === 2 && /Excluir a ficha/.test(asked), 'excluir pergunta antes; cancelar mantém');
    answer = true; bar().querySelector('[data-fa="del"]').click(); await W(150);
    ok(n() === 1 && !F.sel && $('.fp-empty'), 'excluir tira a ficha e volta à tela inicial');

    // Criatura 5e (como a Tarrasque do bestiário): barra em todas as abas
    const m = F.newActor('monster', '5e'); await W(250);
    F.edit((x) => { x.name = 'Tarrasque'; x.source = '5etools'; }); await W(150);
    const tabs = $$('#fp-main [role="tab"], #fp-main .f5-tabs button, #fp-main .tabs button').filter((b) => b.offsetParent);
    let all = true;
    for (const t of tabs) { t.click(); await W(120); if (!bar() || !bar().querySelector('[data-fa="del"]')) all = false; }
    ok(tabs.length >= 2 && all, 'criatura 5e: a barra aparece em todas as abas (' + tabs.length + ')');
    // Duas iguais: excluir a outra pela lista, sem abrir
    F.select(m.id); await W(100);
    bar().querySelector('[data-fa="dup"]').click(); await W(150);
    const copy = F.sel;
    F.edit((x) => { x.name = 'Tarrasque'; }); await W(150);
    F.select(m.id); await W(150);
    const more = $(`.fp-more[data-more="${copy}"]`);
    ok(more, 'botão ⋯ na lista');
    more.click(); await W(100);
    const items = $$('.ctx-menu .cm-item').map((b) => b.textContent.trim());
    ok(['Abrir', 'Duplicar', 'Exportar', 'Excluir'].every((x) => items.includes(x)), 'menu ⋯: ' + items.join(', '));
    $$('.ctx-menu .cm-item').find((b) => b.textContent.trim() === 'Excluir').click(); await W(150);
    ok(!F.actors[copy] && F.sel === m.id && F.actors[m.id], 'excluir pela lista: a outra some e a aberta continua aberta');
    ok(/continua no bestiário/.test(asked), 'aviso: a criatura continua no bestiário (' + asked + ')');
    // Clique direito também abre o menu
    const item = $$('.fp-item').find((x) => x.textContent.includes('Tarrasque'));
    item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 300 })); await W(100);
    ok($('.ctx-menu') && $$('.ctx-menu .cm-item').some((b) => b.textContent.trim() === 'Duplicar'), 'clique direito abre o menu');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await W(50);
    ok(!$('.ctx-menu'), 'Esc fecha o menu');
    // Teclado: Enter na ficha da lista abre
    F.select(null); await W(100);
    const it2 = $$('.fp-item')[0]; it2.focus(); it2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(150);
    ok(F.sel, 'Enter abre a ficha da lista');
    log.push('fichas: ' + Object.values(F.actors).map((a) => a.name).join(', ') + ' · menu ' + items.join('/'));
    if (location.hash === '#shot') { F.select(m.id); await W(200); $(`.fp-more[data-more="${m.id}"]`).click(); await W(200); log.push('foto pronta'); return; }
    log.push('fim das ações da ficha');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
