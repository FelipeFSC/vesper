// Plano 51 (parte A): ficha 5e na mesa (rodar com a query padrão ?tutorial, -budget 120000). #shot = foto da janela
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const change = async (el, v) => { ok(el, 'campo (' + v + ')'); if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(60); };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, R = App.Regras5e, D5 = App.Dados5e, sid = S.currentScene().id;
    // Nova ficha na mesa: pergunta o tipo
    const nA = Object.keys(S.state.actors).length;
    App.UI.newActor('pc'); await W(40);
    ok($('[data-sys="5e"]'), 'pergunta genérica ou 5e');
    $('[data-sys="5e"]').click(); await W(200);
    let a = Object.values(S.state.actors).find((x) => x.sistema === '5e');
    ok(a && Object.keys(S.state.actors).length === nA + 1, 'ficha 5e criada na mesa');
    let win = UI_win(a);
    ok(win && win.querySelector('.f5') && win.offsetWidth >= 600, 'janela com a ficha 5e (' + (win && win.offsetWidth) + ' px)');
    // Monta um Fighter 5 com Longsword (mesmo caminho da página: cadastros + regras)
    const fighter = await D5.get('classes', 'fighter-xphb'), sword = await D5.get('items', 'longsword-xphb'), mail = await D5.get('items', 'chain-mail-xphb');
    const x = App.U.clone(a);
    x.dnd5e.classes[0] = R.classFrom(fighter, 5);
    Object.assign(x.dnd5e.abil, { str: 16, con: 14, dex: 12 });
    x.dnd5e.saves = { str: true, con: true };
    App.Ficha5e.addItem(x.dnd5e, sword); App.Ficha5e.addItem(x.dnd5e, mail);
    R.apply(x);
    S.dispatch({ type: 'actor.update', id: a.id, patch: { name: 'Brom', dnd5e: x.dnd5e, stats: x.stats, bars: x.bars, actions: x.actions, initFormula: x.initFormula } });
    await W(200);
    a = S.state.actors[a.id]; win = UI_win(a);
    ok(a.bars[0].max === 44 && a.stats.find((s) => s.name === 'Defesa').value === 16 && a.actions[0].attack === '1d20+6', 'Fighter 5 na mesa (PV 44, CA 16, +6)');
    // Editar pela janela: Força 18
    await change(win.querySelector('[data-f="abil-str"]'), '18');
    a = S.state.actors[a.id];
    ok(a.dnd5e.abil.str === 18 && a.stats.find((s) => s.name === 'Força').value === 4 && a.actions[0].attack === '1d20+7', 'editar na janela recalcula (Força 18 → +7)');
    log.push('Brom: PV ' + a.bars[0].value + '/' + a.bars[0].max + ' · CA ' + a.stats.find((s) => s.name === 'Defesa').value + ' · ' + a.actions.map((y) => y.name + ' ' + y.attack + ' ' + y.damage).join(', ') + ' · iniciativa ' + a.initFormula);
    // Rolar uma perícia vai para o chat
    const nChat = S.state.chat.length;
    win = UI_win(a);
    win.querySelector('[data-skill="athletics"] .f5-link').click(); await W(150);
    ok(S.state.chat.length === nChat + 1 && /Atletismo/.test(JSON.stringify(S.state.chat[S.state.chat.length - 1])), 'rolagem no chat');
    // Aba Ações: botão de usar na mesa
    UI_win(a).querySelector('[data-tab5="acoes"]').click(); await W(100);
    ok(UI_win(a).querySelector('[data-use="0"]'), 'botão de usar na mesa');
    // Combate: Brom ataca e leva uma Fireball genérica com salvaguarda (a 5e soma a proficiência na salvaguarda de Con)
    App.Board.placeActor(a.id); await W(150);
    const tk = Object.values(S.currentScene().tokens).find((t) => t.actorId === a.id);
    ok(tk && tk.linked, 'token da ficha 5e');
    const caster = { id: 'ac_mago', kind: 'npc', name: 'Mago', owner: '', bars: [{ name: 'PV', value: 10, max: 10 }], stats: [{ name: 'Defesa', value: 10 }], testFormula: '1d20+@valor', initFormula: '1d20',
      actions: [{ name: 'Rajada', mode: 'save', save: 'Constituição', dc: '40', damage: '6', onSave: 'half', bar: 'PV' }] };
    S.dispatch({ type: 'actor.add', actor: caster }); await W(60);
    App.Board.placeActor('ac_mago'); await W(150);
    const ct = Object.values(S.currentScene().tokens).find((t) => t.actorId === 'ac_mago');
    S.useAction({ sceneId: sid, actorId: 'ac_mago', index: 0, attackerId: ct.id, targets: [tk.id] }, null); await W(150);
    const msg = S.state.chat[S.state.chat.length - 1], row = msg && msg.targets && msg.targets[0];
    a = S.state.actors[a.id];
    ok(row && row.save && / \+ ?\(?5\)?|\(5\)/.test(row.save.formula || ''), 'salvaguarda de Con usa +5 (2 + prof 3): ' + (row && row.save && row.save.formula));
    ok(a.bars[0].value === 38, 'dano chega no PV da ficha 5e (44 − 6 = 38): ' + a.bars[0].value);
    log.push('Rajada CD 40 Con: ' + (row && row.save ? row.save.formula + ' = ' + row.save.total : JSON.stringify(row)) + ' · PV ' + a.bars[0].value + '/' + a.bars[0].max);
    // Brom ataca o mago
    const nC2 = S.state.chat.length;
    S.useAction({ sceneId: sid, actorId: a.id, index: 0, attackerId: tk.id, targets: [ct.id] }, null); await W(150);
    const m2 = S.state.chat[S.state.chat.length - 1];
    ok(S.state.chat.length > nC2 && m2.label === 'Longsword' && m2.targets[0].atk.formula === '1d20+7', 'ataque da ficha 5e: ' + (S.state.chat.length - nC2) + ' ' + (m2 && m2.label));
    // A janela mostra o PV novo
    win = UI_win(a);
    ok(win.querySelector('[data-f="f5-hp"]').value === '38', 'janela com o PV novo');
    // Configurar: sem as barras genéricas
    win.querySelector('[data-tab5="config"]').click(); await W(100);
    win = UI_win(a);
    ok(win.querySelector('.sheet-footer') && ![...win.querySelectorAll('h4')].some((h) => h.textContent === 'Barras'), 'Configurar sem barras genéricas');
    // Exportar/importar pela mesa
    const bun = await App.Storage.actorBundle(a.id);
    ok(bun.actor.sistema === '5e' && bun.actor.dnd5e.classes[0].name === 'Fighter', 'exportar da mesa');
    if (location.hash === '#shot') { win.querySelector('[data-tab5="principal"]').click(); await W(300); }
    ok(!/\bnull\b|\bundefined\b|\bNaN\b/.test(UI_win(a).innerText), 'sem texto estranho');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
  function UI_win(a) { return [...document.querySelectorAll('.win')].find((w) => w.querySelector('.f5') && w.querySelector('.f5-name') && w.querySelector('.f5-name').value === a.name) || [...document.querySelectorAll('.win')].find((w) => w.querySelector('.f5')); }
}, 1500));
