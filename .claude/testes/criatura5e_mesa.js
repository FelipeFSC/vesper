// Plano 53: ficha de criatura e dano com tipo na mesa (rodar com a query padrão ?tutorial, -budget 150000; precisa de data/5etools). #shot = foto da janela
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, BS = App.Bestiary, R = App.Regras5e, sid = S.currentScene().id;
    BS.fetch = () => Promise.reject(new Error('sem rede no teste'));
    await BS.load();
    // Tarrasque pelo bestiário da mesa
    const e = BS.list.find((x) => x.n === 'Tarrasque' && x.s === 'MM');
    const id = await BS.addToCampaign(e.k);
    let t = id && S.state.actors[id];
    if (!t) { const m = await BS.full(e); const a0 = BS.toActor(m, e); a0.id = 'ac_tarr'; S.dispatch({ type: 'actor.add', actor: a0 }); await W(100); t = S.state.actors.ac_tarr; }
    ok(t && t.sistema === '5e' && t.dnd5e.npc, 'Tarrasque na mesa com a ficha de criatura');
    App.UI.openActor(t.id); await W(300);
    const win = [...document.querySelectorAll('.win')].find((w) => w.querySelector('.f5-npc'));
    ok(win && win.querySelector('.f5-sb') && /Sab \+9/.test(win.textContent), 'janela com o bloco');
    if (location.hash === '#shot') { await W(300); flush(); return; }
    App.Board.placeActor(t.id); await W(200);
    const tk = Object.values(S.currentScene().tokens).find((x) => x.actorId === t.id);
    // Um mago genérico com raio de fogo (tipado), raio elétrico e uma salvaguarda de Sabedoria CD 40
    const mago = { id: 'ac_mg', kind: 'npc', name: 'Mago', owner: '', bars: [{ name: 'PV', value: 10, max: 10 }], stats: [{ name: 'Defesa', value: 10 }], testFormula: '1d20+@valor', initFormula: '1d20',
      actions: [
        { name: 'Raio de fogo', mode: 'damage', damage: '20', parts: [{ f: '20', type: 'fire' }], bar: 'PV' },
        { name: 'Raio elétrico', mode: 'damage', damage: '20', parts: [{ f: '20', type: 'lightning' }], bar: 'PV' },
        { name: 'Comando', mode: 'save', save: 'Sabedoria', dc: '40', damage: '10', parts: [{ f: '10', type: 'psychic' }], onSave: 'half', bar: 'PV' },
      ] };
    S.dispatch({ type: 'actor.add', actor: mago }); await W(60);
    App.Board.placeActor('ac_mg'); await W(200);
    const mk = Object.values(S.currentScene().tokens).find((x) => x.actorId === 'ac_mg');
    const pv = () => (S.barsOf(S.currentScene().tokens[tk.id]).find((b) => b.name === 'PV') || {}).value;
    const before = pv();
    S.useAction({ sceneId: sid, actorId: 'ac_mg', index: 0, attackerId: mk.id, targets: [tk.id] }, null); await W(100);
    let msg = S.state.chat[S.state.chat.length - 1];
    ok(pv() === before && msg.targets[0].dmgNote === 'fogo: imune', 'fogo no Tarrasque: imune (0): ' + JSON.stringify(msg.targets[0]));
    S.useAction({ sceneId: sid, actorId: 'ac_mg', index: 1, attackerId: mk.id, targets: [tk.id] }, null); await W(100);
    ok(pv() === before - 20, 'elétrico entra inteiro (20)');
    S.useAction({ sceneId: sid, actorId: 'ac_mg', index: 2, attackerId: mk.id, targets: [tk.id] }, null); await W(100);
    msg = S.state.chat[S.state.chat.length - 1];
    ok(/\(9\)/.test(msg.targets[0].save.formula), 'salvaguarda de Sabedoria do Tarrasque com +9: ' + msg.targets[0].save.formula);
    log.push('Tarrasque: PV ' + before + ' → ' + pv() + ' · ' + S.state.chat.slice(-3).map((m) => m.label + ': ' + (m.targets[0].dmgNote || m.targets[0].amount)).join(' | '));
    // Tarrasque ataca o mago: Mordida 1d20+19, dano perfurante
    const bi = t.actions.findIndex((x) => x.name === 'Bite');
    S.useAction({ sceneId: sid, actorId: t.id, index: bi, attackerId: tk.id, targets: [mk.id] }, null); await W(100);
    msg = S.state.chat[S.state.chat.length - 1];
    ok(msg.label === 'Bite' && msg.targets[0].atk.formula === '1d20+19', 'Mordida do Tarrasque: ' + (msg.targets[0] && msg.targets[0].atk.formula));
    // Personagem 5e com resistência a fogo e vulnerável a frio
    const pc = { id: 'ac_pc', kind: 'pc', name: 'Heroína', owner: '', bars: [], stats: [], actions: [] };
    pc.dnd5e = R.blank(); pc.dnd5e.abil.con = 20; pc.dnd5e.defesas.resist = 'fire'; pc.dnd5e.defesas.vuln = 'lightning'; R.apply(pc);
    S.dispatch({ type: 'actor.add', actor: pc }); await W(60);
    App.Board.placeActor('ac_pc'); await W(200);
    const pk = Object.values(S.currentScene().tokens).find((x) => x.actorId === 'ac_pc');
    const pcPv = () => S.state.actors.ac_pc.bars[0].value;
    const b0 = pcPv();
    S.useAction({ sceneId: sid, actorId: 'ac_mg', index: 0, attackerId: mk.id, targets: [pk.id] }, null); await W(100);
    ok(b0 - pcPv() === 10, 'resistência a fogo: 20 → 10 (' + (b0 - pcPv()) + ')');
    const b1 = pcPv();
    S.useAction({ sceneId: sid, actorId: 'ac_mg', index: 1, attackerId: mk.id, targets: [pk.id] }, null); await W(100);
    ok(b1 - pcPv() === Math.min(40, b1), 'vulnerável a elétrico: 20 → 40 (' + (b1 - pcPv()) + ')');
    log.push('Heroína: ' + S.state.chat.filter((m) => m.kind === 'action').slice(-2).map((m) => m.label + ': ' + m.targets[0].dmgNote + ' −' + m.targets[0].amount).join(' | '));
    // Ficha antiga importada pela mesa vira ficha de criatura
    const m = await BS.full(BS.list.find((x) => x.n === 'Goblin' && x.s === 'MM'));
    await App.UI.applyImport({ format: 'mesarpg-actor', version: 1, actor: { id: 'velho', kind: 'monster', name: 'Goblin velho', bars: [{ name: 'PV', value: 2, max: 7 }], stats: [], actions: [], notes: '', source: '5etools', dados5e: m } }); await W(200);
    const g = Object.values(S.state.actors).find((x) => x.name === 'Goblin velho');
    ok(g && g.sistema === '5e' && g.dnd5e.npc && g.bars[0].value === 2, 'ficha antiga importada → criatura, PV 2 mantido');
    // migrate: campanha antiga com a ficha genérica do bestiário
    const st = S.migrate(JSON.parse(JSON.stringify(Object.assign({}, S.state, { actors: { velho2: { id: 'velho2', kind: 'monster', name: 'Goblin 2', bars: [{ name: 'PV', value: 5, max: 7 }], stats: [], actions: [], source: '5etools', dados5e: m } } }))));
    ok(st.actors.velho2.sistema === '5e' && st.actors.velho2.bars[0].value === 5, 'migrate converte a ficha antiga');
    ok(!/\bnull\b|\bundefined\b|\bNaN\b/.test(win.innerText), 'sem texto estranho');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 1500));
