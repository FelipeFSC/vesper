// Plano 36 · Acompanhar os jogadores: coluna (Apresentar e Editar), Ir até (outra cena), Seguir (andar e portal), Esc, Ver como.
// #shot: deixa a coluna e o menu abertos para a foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#e0609a' });
    S.dispatch({ type: 'player.upsert', id: 'p2', name: 'Bruno', color: '#4fd17a' });
    S.online = [S.me.id, 'p1'];
    const lyra = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.update', sceneId: sid, id: lyra.id, patch: { owner: 'p1' } });
    // Bruno separado numa outra cena, com o token dele
    const crypt = S.newScene('Cripta'); S.dispatch({ type: 'scene.add', scene: crypt });
    const bt = Object.assign({}, lyra, { id: 'tk_bruno', name: 'Thorin', owner: 'p2', x: 8 * g, y: 6 * g, actorId: lyra.actorId });
    S.dispatch({ type: 'token.add', sceneId: crypt.id, token: bt });
    S.dispatch({ type: 'scene.movePlayers', id: crypt.id, players: ['p2'] });
    const center = () => { const t = sc().tokens[B.follow ? B.follow.tokenId : '']; return t; };
    const onScreen = (scId, id) => { const s2 = S.state.scenes[scId], t = s2.tokens[id], h2 = ((t.size || 1) * s2.grid) / 2, p = B.toScreen(t.x + h2, t.y + h2); return [Math.round(p.x - B.w / 2), Math.round(p.y - B.h / 2)]; };

    // 1) modo Editar: recolhida num botão
    if (UI.mode !== 'edit') UI.setMode('edit');
    UI.refresh(); await W(100);
    log.push('Editar: coluna visível = ' + !$('#party-col').hidden + ' · recolhida = ' + $('#party-col').classList.contains('closed') + ' · círculos = ' + document.querySelectorAll('.party-av').length);
    $('#party-col .party-toggle').click(); await W(50);
    log.push('Editar, abriu pelo botão: círculos = ' + document.querySelectorAll('.party-av').length);
    // 2) Apresentar: aberta
    UI.setMode('play'); UI.refresh(); await W(100);
    const avs = [...document.querySelectorAll('.party-av')];
    log.push('Apresentar: círculos = ' + avs.length + ' · ' + avs.map((a) => a.title).join(' | ') + ' · online: ' + avs.map((a) => a.querySelector('.party-dot').classList.contains('on')).join(','));
    // 3) menu e Ir até (Bruno, outra cena)
    avs[1].click(); await W(50);
    log.push('menu do Bruno: ' + [...document.querySelectorAll('.party-menu .btn')].map((b) => b.textContent.trim()).join(' | ') + ' · ' + $('.party-menu .pm-head small').textContent);
    [...document.querySelectorAll('.party-menu .btn')].find((b) => /Ir até/.test(b.textContent)).click(); await W(80); B.render(); await W(50);
    log.push(`Ir até: tela na cena "${sc().name}" · token no meio da tela (desvio em px) ${JSON.stringify(onScreen(crypt.id, 'tk_bruno'))} · grupo continua em "${S.state.scenes[S.state.activeSceneId].name}"`);
    // 4) Seguir a Ana: andar e passar por um portal para outra cena
    const sub = S.newScene('Andar de baixo'); sub.parent = sid; S.dispatch({ type: 'scene.add', scene: sub });
    const por = TG.newPortal(S.state.scenes[sid], { shape: 'rect', pts: [[12 * g, 4 * g], [13 * g, 4 * g], [13 * g, 5 * g], [12 * g, 5 * g]] });
    Object.assign(por.actions[0], { sceneId: sub.id, x: 4.5 * g, y: 4.5 * g });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: por });
    S.dispatch({ type: 'token.move', sceneId: sid, id: lyra.id, x: 6 * g, y: 4 * g, fromTrigger: true });
    document.querySelectorAll('.party-av')[0].click(); await W(50);
    [...document.querySelectorAll('.party-menu .btn')].find((b) => /Seguir/.test(b.textContent)).click(); await W(80); B.render(); await W(50);
    log.push(`Seguir a Ana: tela em "${sc().name}" · barra: ${$('#follow-bar').hidden ? 'escondida' : $('#follow-bar').textContent} · desvio ${JSON.stringify(onScreen(sid, lyra.id))}`);
    S.remoteAction({ type: 'token.move', sceneId: sid, id: lyra.id, x: 9 * g, y: 4 * g, path: [[6 * g, 4 * g], [9 * g, 4 * g]], at: Date.now() }, 'p1'); await W(30); B.render();
    log.push('ela andou: desvio ' + JSON.stringify(onScreen(sid, lyra.id)) + ' (câmera foi junto)');
    S.remoteAction({ type: 'token.move', sceneId: sid, id: lyra.id, x: 12 * g, y: 4 * g, path: [[9 * g, 4 * g], [12 * g, 4 * g]], at: Date.now() }, 'p1'); await W(50); B.render(); await W(50); B.render();
    const nl = Object.values(S.state.scenes[sub.id].tokens).find((t) => /lyra/i.test(t.name));
    log.push(`passou pelo portal: tela em "${sc().name}" · Lyra lá = ${!!nl} · desvio ${nl ? JSON.stringify(onScreen(sub.id, nl.id)) : '-'} · ainda seguindo = ${!!B.follow}`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(50);
    log.push('Esc: parou de seguir = ' + !B.follow + ' · barra escondida = ' + $('#follow-bar').hidden);
    // 5) Ver como o Bruno e voltar
    UI.refresh(); await W(50);
    document.querySelectorAll('.party-av')[1].click(); await W(50);
    [...document.querySelectorAll('.party-menu .btn')].find((b) => /Ver como/.test(b.textContent)).click(); await W(100); B.render(); await W(50);
    log.push(`Ver como: vendo como = ${S.viewAs} · cena "${sc().name}" · coluna continua = ${!$('#party-col').hidden} · círculo marcado = ${document.querySelectorAll('.party-av')[1].classList.contains('viewing')}`);
    document.querySelectorAll('.party-av')[1].click(); await W(50);
    log.push('menu enquanto vê como: ' + [...document.querySelectorAll('.party-menu .btn')].map((b) => b.textContent.trim()).join(' | '));
    [...document.querySelectorAll('.party-menu .btn')].find((b) => /Voltar a ser mestre/.test(b.textContent)).click(); await W(50);
    log.push('voltou a ser mestre: ' + !S.viewAs);
    // 6) dois cliques = Ir até
    document.querySelectorAll('.party-av')[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await W(80); B.render(); await W(50);
    log.push(`dois cliques no Bruno: tela em "${sc().name}" · desvio ${JSON.stringify(onScreen(crypt.id, 'tk_bruno'))}`);
    // 7) jogador não vê a coluna
    const role = S.role; S.role = 'player'; S.me.id = S.me.id; UI.refresh(); await W(50);
    log.push('jogador: coluna escondida = ' + $('#party-col').hidden);
    S.role = role; UI.refresh(); await W(50);
    if (location.hash === '#shot') { S.viewSceneId = null; S.emit('local'); await W(100); B.render(); document.querySelectorAll('.party-av')[0].click(); }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
