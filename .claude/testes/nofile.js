// Plano 37 · Remover jogador (menu da coluna e "Mover jogadores", desconectar) e jogador sem token não vê o mapa
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    window.confirm = () => true;
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#e0609a' });
    S.dispatch({ type: 'player.upsert', id: 'p2', name: 'Bruno', color: '#4fd17a' });
    S.dispatch({ type: 'player.upsert', id: 'p3', name: 'Carla', color: '#38bdf8' });
    const lyra = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name)), gob = Object.values(sc().tokens).find((t) => t.id !== lyra.id);
    S.dispatch({ type: 'token.update', sceneId: sid, id: lyra.id, patch: { owner: 'p1' } });
    // ficha da Carla (para ver se fica com o mestre)
    const ac = Object.assign({}, S.state.actors[lyra.actorId], { id: 'ac_carla', name: 'Ficha da Carla', owner: 'p3' });
    S.dispatch({ type: 'actor.add', actor: ac });
    S.dispatch({ type: 'token.add', sceneId: sid, token: Object.assign({}, lyra, { id: 'tk_carla', name: 'Carla', owner: 'p3', actorId: 'ac_carla', x: 2 * g, y: 2 * g }) });
    S.dispatch({ type: 'scene.movePlayers', id: sid, players: [] });
    // conexão de mentira da Carla (para ver o "desconectar")
    const sent = []; let closed = false;
    App.Net.conns.set('peerC', { conn: { open: true, send: (m) => sent.push(m), close: () => { closed = true; } }, playerId: 'p3', name: 'Carla' });
    // pixel no meio do goblin: escuro = não vê o mapa
    const px = () => {
      B.render();
      const t = sc().tokens[gob.id], p = B.toScreen(t.x + g / 2, t.y + g / 2), cv = B.canvas, k = cv.width / B.w;
      const d = cv.getContext('2d').getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data;
      return d[0] + d[1] + d[2];
    };
    const lightOff = () => S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { enabled: false }) } });
    lightOff();
    UI.setMode('play'); UI.refresh(); await W(80);
    UI.setViewAs('p1'); await W(60); const withTok = px();
    UI.setViewAs(null); UI.setViewAs('p2'); await W(60); const noTok = px();
    log.push(`sem iluminação: Ana (com token) vê o goblin = ${withTok > 40} (${withTok}) · Bruno (sem token) = ${noTok} (escuro: ${noTok < 40}) · painel do token escondido = ${$('#token-hud').hidden}`);
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { enabled: true, global: true }) } });
    const noTokLit = px();
    log.push('com iluminação clara: Bruno continua no escuro = ' + (noTokLit < 40));
    UI.setViewAs(null); lightOff();
    // token escondido pelo mestre conta como "sem token"
    S.dispatch({ type: 'token.update', sceneId: sid, id: lyra.id, patch: { hidden: true } });
    UI.setViewAs('p1'); await W(60); const hidden = px();
    UI.setViewAs(null);
    S.dispatch({ type: 'token.update', sceneId: sid, id: lyra.id, patch: { hidden: false } });
    UI.setViewAs('p1'); await W(60); const back = px(); UI.setViewAs(null);
    log.push(`token escondido: Ana no escuro = ${hidden < 40} · mestre mostrou o token: Ana vê = ${back > 40}`);
    // chat continua
    log.push('Bruno sem token: o chat continua (painel existe) = ' + !!$('#p-chat'));

    // remover pelo menu da coluna (Carla, online)
    UI.refresh(); await W(80);
    const avs = () => [...document.querySelectorAll('.party-av')];
    log.push('coluna antes: ' + avs().map((a) => a.title.split(' · ')[0]).join(', '));
    avs().find((a) => /^Carla/.test(a.title)).click(); await W(50);
    log.push('menu: ' + [...document.querySelectorAll('.party-menu .btn')].map((b) => b.textContent.trim()).join(' | '));
    [...document.querySelectorAll('.party-menu .btn')].find((b) => /Remover da mesa/.test(b.textContent)).click(); await W(400); UI.refresh(); await W(80);
    log.push(`removeu a Carla: na lista = ${!!S.state.players.p3} · coluna: ${avs().map((a) => a.title.split(' · ')[0]).join(', ')} · aviso enviado = ${sent.some((m) => m.t === 'kicked')} · desconectada = ${closed}`);
    log.push(`fichas e tokens dela com o mestre: ficha dono "${S.state.actors.ac_carla.owner}" · token dono "${sc().tokens.tk_carla.owner}" · token continua no mapa = ${!!sc().tokens.tk_carla}`);
    // remover pela janela "Mover jogadores"
    UI.setMode('edit'); UI.leftTab = 'scenes'; UI.refresh(); await W(100);
    [...document.querySelectorAll('.scene-item')][0].querySelector('button[title^="Escolher quais"]').click(); await W(80);
    const rows = () => [...document.querySelectorAll('.move-row')];
    log.push('Mover jogadores: ' + rows().map((r) => r.querySelector('b').textContent).join(', ') + ' · botão remover em cada = ' + rows().every((r) => r.querySelector('[title^="Remover"]')));
    rows().find((r) => /Bruno/.test(r.textContent)).querySelector('[title^="Remover"]').click(); await W(80);
    log.push('removeu o Bruno na janela: linhas = ' + rows().map((r) => r.querySelector('b').textContent).join(', ') + ' · na lista = ' + !!S.state.players.p2);
    document.querySelectorAll('.modal-back').forEach((x) => x.remove());
    // pode entrar de novo (o "hello" recria o jogador)
    S.dispatch({ type: 'player.upsert', id: 'p3', name: 'Carla', color: '#38bdf8' });
    log.push('Carla entrou de novo: na lista = ' + !!S.state.players.p3);
    // jogador não pode remover ninguém
    const before = !!S.state.players.p1;
    S.remoteAction({ type: 'player.remove', id: 'p1' }, 'p3');
    log.push('jogador tentando remover outro: recusado = ' + (before && !!S.state.players.p1));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
