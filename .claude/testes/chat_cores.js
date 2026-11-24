// Plano 83: cor da ficha no chat (opção E, "Degradê"). Query padrão ?tutorial. #shot = foto do chat
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + String(e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, U = App.U, UI = App.UI, sid = S.currentScene().id;
    // Clarear
    const hexLum = (c) => { const n = parseInt(c.slice(1), 16), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
    const dark = U.chatColor('#8b1e1e'), light = U.chatColor('#f0e0a0');
    ok(dark && hexLum(dark) >= 0.3 && parseInt(dark.slice(1, 3), 16) > parseInt(dark.slice(5, 7), 16), 'vermelho escuro sai claro e continua avermelhado: ' + dark);
    ok(light && hexLum(light) >= hexLum('#f0e0a0'), 'cor clara fica clara: ' + light);
    ok(U.chatColor('red') === null && U.chatColor('#12') === null, 'cor inválida = sem cor');
    // Duas criaturas do mestre com cores diferentes
    const mk = (id, name, color, stats) => ({ id, kind: 'monster', name, color, owner: '', bars: [{ name: 'PV', value: 100, max: 100 }], stats: stats || [{ name: 'Defesa', value: 5 }, { name: 'Constituição', value: -50 }], testFormula: '1d20+@valor', initFormula: '1d20',
      actions: [{ name: 'Mordida', mode: 'attack', attack: '1d20+50', damage: '1d6', bar: 'PV' }, { name: 'Rugido', mode: 'save', save: 'Constituição', dc: '15', damage: '2d6', onSave: 'half', bar: 'PV', area: '20' }] });
    S.dispatch({ type: 'actor.add', actor: mk('ac_rd', 'Dragão', '#8b1e1e') });
    S.dispatch({ type: 'actor.add', actor: mk('ac_bl', 'Golem', '#1d4ed8') });
    await W(80);
    App.Board.placeActor('ac_rd'); await W(150); App.Board.placeActor('ac_bl'); await W(150);
    const tok = (aid) => Object.values(S.currentScene().tokens).find((t) => t.actorId === aid);
    const rd = tok('ac_rd'), bl = tok('ac_bl');
    const use = async (aid, src, i, targets) => { const n = S.state.chat.length; S.useAction({ sceneId: sid, actorId: aid, index: i, attackerId: src.id, targets: targets.map((t) => t.id), point: { x: src.x, y: src.y } }, null); for (let k = 0; k < 100 && S.state.chat.length === n; k++) await W(50); await W(150); };
    UI.showTab('chat'); await W(100);
    const last = () => { const c = $$('#chat-log .msg'); return c[c.length - 1]; };
    await use('ac_rd', rd, 0, [bl]);
    let c = last();
    const cRd = c.style.getPropertyValue('--c');
    ok(c.classList.contains('tinted') && cRd === U.chatColor('#8b1e1e'), 'ataque do Dragão: cartão com a cor dele clareada (' + cRd + ')');
    ok(getComputedStyle(c).borderLeftWidth === '3px' && /gradient/.test(getComputedStyle(c).backgroundImage), 'faixa à esquerda e degradê');
    ok(c.querySelector('.msg-head b').style.color && c.querySelector('.act-target').style.getPropertyValue('--tc') === U.chatColor('#1d4ed8'), 'nome na cor e alvo (Golem) na cor dele');
    await use('ac_bl', bl, 1, [rd]);
    c = last();
    ok(c.style.getPropertyValue('--c') === U.chatColor('#1d4ed8') && c.style.getPropertyValue('--c') !== cRd, 'Golem com outra cor');
    // Rolagem da ficha (com ficha e token) e rolagem livre
    S.rollPost('1d20+2', { from: 'Dragão', label: 'Teste', actor: S.state.actors.ac_rd, token: rd }); await W(2600);
    c = last();
    ok(c.classList.contains('roll') && c.classList.contains('tinted') && c.style.getPropertyValue('--c') === cRd, 'rolagem da ficha com a cor');
    S.rollPost('1d20', {}); await W(2600);
    c = last();
    ok(c.classList.contains('roll') && !c.classList.contains('tinted'), 'rolagem livre: cor do jogador, sem degradê');
    // Mensagem antiga (sem actorId / srcId)
    S.dispatch({ type: 'chat.add', msg: { id: 'm_old', ts: Date.now(), kind: 'roll', from: 'Velho', playerId: S.me.id, label: 'x', parts: [{ total: 3, formula: '1d6', detail: '1d6 <span class="die">3</span>' }] } }); await W(150);
    ok(!last().classList.contains('tinted'), 'mensagem antiga sem cor de ficha');
    // Token escondido: jogador vê cinza
    S.dispatch({ type: 'token.update', sceneId: sid, id: rd.id, patch: { masked: true } }); await W(100);
    const gv = S.gmView; S.gmView = () => false;
    const ma = S.state.chat.filter((m) => m.kind === 'action')[0];
    ok(UI.msgColor(ma) === '#8f8d9a', 'jogador: token escondido em cinza');
    S.gmView = gv;
    ok(UI.msgColor(ma) === cRd, 'mestre: continua a cor');
    S.dispatch({ type: 'token.update', sceneId: sid, id: rd.id, patch: { masked: false } }); await W(100);
    // Cartão pequeno sobre o mapa (aparece com o chat fechado)
    UI.showTab('table'); await W(100);
    await use('ac_rd', rd, 0, [bl]);
    const feed = $$('#roll-feed .msg.compact');
    ok(feed.length && feed[feed.length - 1].classList.contains('tinted'), 'cartão sobre o mapa com a cor');
    log.push('cores: Dragão ' + cRd + ' · Golem ' + U.chatColor('#1d4ed8') + ' · claro ' + light);
    if (location.hash === '#shot') { S.rollPost('1d20+3', { from: 'Golem', label: 'Teste de Força', actor: S.state.actors.ac_bl, token: bl }); await W(2800); UI.showTab('chat'); await W(300); log.push('foto pronta'); return; }
    log.push('fim das cores no chat');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
