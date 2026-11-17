window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), [g1, g2] = toks.filter((t) => /goblin/i.test(t.name));
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 3 * g, y: 4 * g });
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    // painel do token (mestre)
    B.selected = g1.id; B.requestRender(); App.UI.refresh(); await W(200);
    log.push('painel: botões de visibilidade = ' + [...document.querySelectorAll('#token-hud .vis-seg button')].map((b) => b.textContent).join('/'));
    [...document.querySelectorAll('#token-hud .vis-seg button')].find((b) => /Vulto/.test(b.textContent)).click(); await W(100);
    log.push('goblin 1 virou vulto: masked=' + sc().tokens[g1.id].masked + ' hidden=' + !!sc().tokens[g1.id].hidden);
    // grupo
    S.dispatch({ type: 'group.add', sceneId: sc().id, group: { id: 'gA', name: 'Emboscada' }, tokens: [g1.id, g2.id] });
    S.dispatch({ type: 'group.vis', sceneId: sc().id, id: 'gA', vis: 'hidden' });
    log.push('grupo invisível: ' + [g1, g2].map((t) => sc().tokens[t.id].hidden).join(','));
    S.viewAs = '*'; B.requestRender(); await W(200);
    log.push('jogador vê (invisível): ' + Object.values(sc().tokens).filter((t) => !t.hidden).map((t) => t.name).join(','));
    S.viewAs = null;
    S.dispatch({ type: 'group.vis', sceneId: sc().id, id: 'gA', vis: 'masked' });
    S.viewAs = '*'; B.requestRender(); await W(200);
    log.push('grupo vulto, jogador vê silhuetas: ' + [g1, g2].map((t) => B.silhouettes.has(t.id)).join(','));
    // ataque do jogador num vulto: nome no chat
    const actor = S.actorOf(sc().tokens[hero.id]), idx = actor.actions.findIndex((a) => /arco/i.test(a.name));
    S.useAction({ actorId: actor.id, index: idx, sceneId: sc().id, attackerId: hero.id, targets: [g1.id] }, null);
    App.UI.showTab('chat'); await W(300);
    const last = [...document.querySelectorAll('#p-chat .msg')].pop();
    log.push('chat para o jogador: ' + (last ? last.querySelector('.act-target .who').textContent : '?'));
    S.viewAs = null; App.UI.refresh(); await W(300);
    const last2 = [...document.querySelectorAll('#p-chat .msg')].pop();
    log.push('chat para o mestre: ' + (last2 ? last2.querySelector('.act-target .who').textContent : '?'));
    S.dispatch({ type: 'group.vis', sceneId: sc().id, id: 'gA', vis: 'show' });
    log.push('grupo visível: ' + [g1, g2].map((t) => visOf(sc().tokens[t.id])).join(','));
    function visOf(t) { return t.hidden ? 'invisível' : t.masked ? 'vulto' : 'visível'; }
    // aba camadas
    App.UI.rightTab = 'layers'; App.UI.refresh(); await W(200);
    log.push('aba camadas: grupos=' + document.querySelectorAll('.grp-row').length + ' nome=' + ($('.grp-name') || {}).value);
    S.dispatch({ type: 'group.delete', sceneId: sc().id, id: 'gA' });
    log.push('desfazer grupo: tokens sem grupo=' + [g1, g2].every((t) => !sc().tokens[t.id].group) + ' continuam no mapa=' + [g1, g2].every((t) => !!sc().tokens[t.id]));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
