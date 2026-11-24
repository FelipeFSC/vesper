// Plano 79: dados legíveis no chat. Query padrão ?tutorial. #shot = deixa o chat com os cartões para foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + String(e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $$ = (el, q) => [...el.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, R = App.Regras5e, sid = S.currentScene().id;
    const mk = (id, name, stats, extra) => Object.assign({ id, kind: 'npc', name, owner: '', bars: [{ name: 'PV', value: 500, max: 500 }], stats, testFormula: '1d20+@valor', initFormula: '1d20', actions: [] }, extra || {});
    S.dispatch({ type: 'actor.add', actor: mk('ac_tz', 'Tarrasque', [{ name: 'Defesa', value: 10 }], { actions: [
      { name: 'Thunderous Bellow', mode: 'save', save: 'Constituição', dc: '27', damage: '1', parts: [{ f: '12d10', type: 'thunder' }, { f: '2d8+4', type: 'bludgeoning' }], onSave: 'half', bar: 'PV', area: '20' },
      { name: 'Mordida', mode: 'attack', attack: '2d20kh1+19', damage: '1', parts: [{ f: '4d12+10', type: 'piercing' }], bar: 'PV' },
      { name: 'Bola de fogo', mode: 'save', save: 'Constituição', dc: '15', damage: '8d6', onSave: 'none', bar: 'PV', area: '20' },
      { name: 'Cura', mode: 'heal', damage: '2d4+2', bar: 'PV' },
    ] }) });
    S.dispatch({ type: 'actor.add', actor: mk('ac_fr', 'Aventureiro', [{ name: 'Constituição', value: -60 }]) });
    S.dispatch({ type: 'actor.add', actor: mk('ac_fo', 'Guardião', [{ name: 'Constituição', value: 60 }]) });
    const pc = { id: 'ac_rs', kind: 'pc', name: 'Bardo', owner: '', bars: [], stats: [], actions: [] };
    pc.dnd5e = R.blank(); pc.dnd5e.abil.con = 1; pc.dnd5e.defesas.resist = 'thunder'; R.apply(pc);
    S.dispatch({ type: 'actor.add', actor: pc });
    await W(60);
    for (const id of ['ac_tz', 'ac_fr', 'ac_fo', 'ac_rs']) { App.Board.placeActor(id); await W(120); }
    const tok = (aid) => Object.values(S.currentScene().tokens).find((x) => x.actorId === aid);
    const tz = tok('ac_tz'), fr = tok('ac_fr'), fo = tok('ac_fo'), rs = tok('ac_rs');
    const use = async (index, targets) => { const n = S.state.chat.length; S.useAction({ sceneId: sid, actorId: 'ac_tz', index, attackerId: tz.id, targets: targets.map((t) => t.id), point: { x: tz.x, y: tz.y } }, null); for (let i = 0; i < 100 && S.state.chat.length === n; i++) await W(50); await W(150); return S.state.chat[S.state.chat.length - 1]; };
    App.UI.showTab('chat'); await W(100);
    const card = () => { const c = [...document.querySelectorAll('#chat-log .msg.act')]; return c[c.length - 1]; };
    const sumG = (p) => p.groups.reduce((t, g) => t + g.sum, 0) + (p.flat || 0);

    // 1) Resistência com dois tipos: 12d10 trovejante + 2d8+4 concussão, três alvos (falhou, passou, resistência)
    let m = await use(0, [fr, fo, rs]);
    ok(m.kind === 'action' && m.dmg.parts.length === 2, 'duas partes no dano');
    const [p1, p2] = m.dmg.parts;
    ok(p1.groups[0].v.length === 12 && p2.groups[0].v.length === 2 && p2.flat === 4, 'grupos guardados: 12 e 2 dados, +4');
    ok(sumG(p1) === p1.total && sumG(p2) === p2.total && p1.total + p2.total === m.dmg.total, 'as somas batem com o total');
    let c = card();
    ok($$(c, '.dgroup').length === 2 && $$(c, '.dg-dice .die').length === 14, 'no chat: 2 grupos e 14 dados (' + $$(c, '.dg-dice .die').length + ')');
    ok(/trovejante/.test(c.textContent) && /concussão/.test(c.textContent) && /12d10/.test(c.textContent) && /2d8 \+ 4/.test(c.textContent), 'tipos e fórmulas nos grupos');
    ok(c.querySelector('.dg-dice').textContent.replace(/\D/g, '').length >= 12, 'valores visíveis');
    const rowOf = (name) => [...c.querySelectorAll('.act-target')].find((x) => x.textContent.includes(name));
    const tf = m.targets.find((t) => t.name === 'Aventureiro'), tp = m.targets.find((t) => t.name === 'Guardião'), tr = m.targets.find((t) => t.name === 'Bardo');
    ok(!tf.success && tf.amount === m.dmg.total && !rowOf('Aventureiro').querySelector('.act-calc'), 'falhou: dano inteiro, sem conta');
    ok(tp.success && tp.amount === Math.floor(m.dmg.total / 2) && /metade \(passou\)/.test(rowOf('Guardião').querySelector('.act-calc').textContent), 'passou: metade, com a conta');
    const calcR = rowOf('Bardo').querySelector('.act-calc');
    ok(calcR && /trovejante: resistência/.test(calcR.textContent), 'resistência na conta: ' + (calcR && calcR.textContent));
    ok(rowOf('Aventureiro').querySelector('.dline .die') && /= -?\d+/.test(rowOf('Aventureiro').querySelector('.dline').textContent), 'teste do alvo em pecinhas com o total');
    ok(!/\(-?\d+\)/.test(rowOf('Aventureiro').querySelector('.dline').textContent), 'teste do alvo sem os parênteses');
    log.push('Bramido: ' + m.dmg.total + ' (' + p1.total + ' + ' + p2.total + ') · Aventureiro −' + tf.amount + ' · Guardião: ' + rowOf('Guardião').querySelector('.act-calc').textContent + ' · Bardo: ' + calcR.textContent);
    log.push('teste do alvo: ' + rowOf('Aventureiro').querySelector('.dline').textContent);
    ok(!/undefined|NaN|null/.test(c.textContent), 'sem texto estranho');

    // 2) Ataque com vantagem em dois alvos: cada um com os seus dados, o descartado riscado
    m = await use(1, [fr, fo]); c = card();
    ok($$(c, '.dline .die.drop').length === 2, 'vantagem: um dado descartado por alvo (' + $$(c, '.dline .die.drop').length + ')');
    ok($$(c, '.act-target .dgroup').length === 2, 'cada alvo com o seu bloco de dano');
    const a0 = m.targets[0];
    if (a0.dmg) ok(sumG(a0.dmg.parts[0]) === a0.dmg.total, 'soma do dano do ataque');
    log.push('Mordida: ' + [...c.querySelectorAll('.act-target')].map((x) => x.querySelector('.dline').textContent).join(' | '));

    // 3) Resistência sem dano ao passar
    m = await use(2, [fo]); c = card();
    ok(m.targets[0].amount === 0 && /passou: sem dano/.test(c.textContent) && $$(c, '.dg-dice .die').length === 8, 'passou sem dano, com os 8d6 à mostra');
    // 4) Cura
    m = await use(3, [fr]); c = card();
    ok(/Cura/.test(c.textContent) && $$(c, '.dg-dice .die').length === 2 && /\+ 2/.test(c.querySelector('.dg-dice').textContent), 'cura com 2 dados e +2');
    // 5) Muitos dados: todos aparecem
    S.state.actors.ac_tz.actions[0].parts = [{ f: '40d6', type: 'fire' }];
    m = await use(0, [fr]); c = card();
    ok($$(c, '.dg-dice .die').length === 40, '40d6: os 40 dados aparecem');
    ok(c.scrollWidth <= c.clientWidth + 1, 'sem rolagem de lado');
    // 6) Mensagem antiga (sem grupos)
    S.dispatch({ type: 'chat.add', msg: { id: 'm_velha', ts: Date.now(), kind: 'action', mode: 'save', sceneId: sid, from: 'Velho', playerId: S.me.id, label: 'Antiga', dc: 12, saveStat: 'Destreza',
      dmg: { formula: '3d6', total: 9, detail: '3d6 <span class="die">2</span><span class="die">3</span><span class="die">4</span>', parts: [{ type: '', total: 9 }] },
      targets: [{ tokenId: fr.id, name: 'Aventureiro', save: { formula: '1d20+(1)', total: 5, detail: '1d20 <span class="die">4</span> + (1)' }, success: false, amount: 9, bar: 'PV', before: 10, after: 1, max: 10 }], applied: [] } });
    await W(150); c = card();
    ok($$(c, '.dgroup').length === 1 && $$(c, '.dg-dice .die').length === 3 && /3d6/.test(c.textContent), 'mensagem antiga: um grupo com os 3 dados');
    ok(!/undefined|NaN/.test(c.textContent), 'mensagem antiga sem texto estranho');

    if (location.hash === '#shot') {
      S.state.actors.ac_tz.actions[0].parts = [{ f: '12d10', type: 'thunder' }, { f: '2d8+4', type: 'bludgeoning' }];
      await use(1, [fr]); await use(0, [fr, fo]);
      document.body.classList.add('shot');
      const lg = document.querySelector('#chat-log'); lg.scrollTop = lg.scrollHeight;
    }
    log.push('fim dos dados no chat');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 1500));
