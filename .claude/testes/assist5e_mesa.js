// Plano 51 (parte B): assistente na mesa (rodar com a query padrão ?tutorial, -budget 120000)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.confirm = () => true;
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, A5 = App.Assist5e;
    App.UI.newActor('pc'); await W(40);
    ok($('[data-sys="5e-assist"]'), 'opção passo a passo na mesa');
    $('[data-sys="5e-assist"]').click();
    for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50);
    ok($('.a5'), 'assistente aberto na mesa');
    A5.set((s) => { s.name = 'Kael'; s.classId = 'fighter-xphb'; s.speciesId = 'human-xphb'; s.bgId = 'soldier-xphb'; s.level = 2; s.tab = 'resumo'; });
    await W(60);
    log.push('avisos: ' + JSON.stringify(A5.warnings()));
    $('[data-act="finish"]').click(); await W(600);
    let a = Object.values(S.state.actors).find((x) => x.name === 'Kael');
    ok(a && a.sistema === '5e' && a.dnd5e.classes[0].name === 'Fighter' && a.dnd5e.classes[0].level === 2, 'ficha criada na mesa pelo assistente');
    ok(a.bars[0].max === a.bars[0].value && a.bars[0].max > 10, 'PV cheio: ' + a.bars[0].value + '/' + a.bars[0].max);
    ok(a.dnd5e.itens.length > 0 && a.actions.length > 0, 'equipamento e ações');
    log.push('Kael: ' + a.dnd5e.classes[0].name + ' ' + a.dnd5e.classes[0].level + ' · PV ' + a.bars[0].max + ' · itens ' + a.dnd5e.itens.length + ' · ações ' + a.actions.map((x) => x.name).join(', '));
    // Subir de nível pela janela da mesa
    const win = [...document.querySelectorAll('.win')].find((w) => w.querySelector('.f5'));
    ok(win && win.querySelector('[data-act="level-up"]'), 'botão Subir de nível na janela');
    win.querySelector('[data-act="level-up"]').click();
    for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50);
    ok(A5.st.mode === 'up' && A5.st.level === 3, 'subir 2 → 3');
    A5.set((s) => { s.subId = 'fighter-xphb--champion-xphb'; s.tab = 'resumo'; }); await W(60);
    $('[data-act="finish"]').click(); await W(600);
    a = S.state.actors[a.id];
    ok(a.dnd5e.classes[0].level === 3 && a.dnd5e.classes[0].sub && a.dnd5e.caract.some((f) => f.source === 'Subclasse'), 'nível 3 com a subclasse');
    log.push('Kael nível 3: ' + (a.dnd5e.classes[0].sub || {}).name + ' · PV ' + a.bars[0].value + '/' + a.bars[0].max + ' · características ' + a.dnd5e.caract.length);
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 1500));
