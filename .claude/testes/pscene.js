window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, st = () => S.state;
    S.dispatch({ type: 'player.upsert', id: 'pA', name: 'Ana', color: '#e07b4f' });
    S.dispatch({ type: 'player.upsert', id: 'pB', name: 'Bruno', color: '#4fb27a' });
    S.online = ['pA', 'pB'];
    const s1 = st().activeSceneId;
    const c2 = S.newScene('Cripta'); S.dispatch({ type: 'scene.add', scene: c2 });
    const c3 = S.newScene('Rua'); S.dispatch({ type: 'scene.add', scene: c3 });
    const name = (pid) => st().scenes[S.sceneIdOf(pid)].name;
    log.push('início: Ana=' + name('pA') + ' Bruno=' + name('pB'));
    // pelo diálogo, como o mestre faria
    App.UI.leftTab = 'scenes'; App.UI.refresh(); await W(200);
    App.UI.movePlayersDialog(c2.id); await W(200);
    const rows = [...document.querySelectorAll('.move-row')];
    log.push('diálogo: ' + rows.map((r) => r.querySelector('b').textContent + (r.querySelector('input').checked ? '[x]' : '[ ]')).join(' '));
    rows.find((r) => /Ana/.test(r.textContent)).querySelector('input').click();
    [...document.querySelectorAll('.modal button, #modal-root button')].find((b) => b.textContent.trim() === 'Mover').click(); await W(200);
    log.push('Ana movida: Ana=' + name('pA') + ' Bruno=' + name('pB'));
    S.viewAs = 'pA'; log.push('vendo como Ana: cena=' + S.currentScene().name);
    S.viewAs = 'pB'; log.push('vendo como Bruno: cena=' + S.currentScene().name);
    S.viewAs = '*'; log.push('vendo como todos: cena=' + S.currentScene().name);
    S.viewAs = null;
    S.dispatch({ type: 'scene.activate', id: c3.id });
    log.push('ativar Rua: Ana=' + name('pA') + ' Bruno=' + name('pB'));
    App.UI.refresh(); await W(200);
    log.push('bolinhas: ' + [...document.querySelectorAll('.scene-item')].map((it) => it.querySelector('.name').textContent + '=' + [...it.querySelectorAll('.scene-people .avatar')].map((a) => a.title.split(' ')[0]).join('+')).join(' · '));
    log.push('aviso no topo: "' + $('#scene-warn').textContent + '"');
    S.dispatch({ type: 'scene.movePlayers', id: c3.id, players: ['pA'] });
    log.push('trazer Ana para a cena do grupo: Ana=' + name('pA') + ' separados=' + JSON.stringify(st().playerScenes));
    S.dispatch({ type: 'scene.movePlayers', id: c2.id, players: ['pA', 'pB'] });
    S.dispatch({ type: 'scene.delete', id: c2.id });
    log.push('excluir a cena onde estavam: Ana=' + name('pA') + ' Bruno=' + name('pB'));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
