// Plano 19 · Memória de exploração: grava o que foi visto, mostra escurecido sem criaturas, espiar no arraste não grava,
// parede segura, por jogador × do grupo, esquecer, desligar, rede, desempenho. Com '#shot' + -shot: foto do jogador.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, E = App.Explore, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    const D = (a) => S.dispatch(Object.assign({ sceneId: sid }, a));
    D({ type: 'wall.clear' });
    if (!Object.keys(S.state.players).length) S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#38bdf8' });
    // duas salas: esquerda (0..7) e direita (8..16), parede em x=8 com porta fechada em y 4..5
    D({ type: 'wall.add', walls: [{ id: 'm1', x1: 8 * g, y1: 0, x2: 8 * g, y2: 4 * g, cover: 'full' }, { id: 'porta', x1: 8 * g, y1: 4 * g, x2: 8 * g, y2: 5 * g, door: true, open: false }, { id: 'm2', x1: 8 * g, y1: 5 * g, x2: 8 * g, y2: 10 * g, cover: 'full' }] });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: false, explore: true }, explored: {} } });
    D({ type: 'explore.clear' });
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name)), gobs = Object.values(sc().tokens).filter((t) => t.id !== hero.id);
    D({ type: 'token.update', id: hero.id, patch: { light: { bright: 4, dim: 6 }, darkvision: 0 } });
    D({ type: 'token.move', id: hero.id, x: 3 * g, y: 4 * g });
    D({ type: 'token.move', id: gobs[0].id, x: 5 * g, y: 2 * g }); // goblin na sala da esquerda
    D({ type: 'token.move', id: gobs[1].id, x: 12 * g, y: 4 * g }); // goblin na sala da direita
    await W(450);
    const bits = (key = '*') => { const ex = sc().explored[key]; if (!ex) return 0; return E.decode(ex, { w: ex.w, h: ex.h }).reduce((a, b) => a + b, 0); };
    const seen = (cx, cy, key = '*') => { const ex = sc().explored[key]; if (!ex) return false; const b = E.decode(ex, { w: ex.w, h: ex.h }); return !!b[Math.floor(cy * E.RES) * ex.w + Math.floor(cx * E.RES)]; };
    log.push(`com tocha na sala da esquerda: células vistas ${bits()} · (5,3) visto = ${seen(5.5, 3.5)} · atrás da parede (12,4) visto = ${seen(12.5, 4.5)} · longe no escuro (0,9) = ${seen(0.2, 9.8)}`);
    // espiar arrastando não grava (só move local); soltar grava
    const before = bits();
    B.drag = { id: hero.id, sceneId: sid, ox: 0, oy: 0, x: 10 * g, y: 4 * g, sx: 3 * g, sy: 4 * g, moved: true };
    E.recompute(sid); await W(50);
    log.push(`arrastando para o outro lado (sem soltar): células ${before} → ${bits()}`);
    B.drag = null;
    // abre a porta e entra: grava a sala da direita
    D({ type: 'wall.door', id: 'porta', open: true });
    D({ type: 'token.move', id: hero.id, x: 11 * g, y: 4 * g });
    await W(450);
    log.push(`abriu a porta e entrou: (12,4) visto = ${seen(12.5, 4.5)} · células ${bits()}`);
    // volta e a sala da direita continua lembrada
    D({ type: 'token.move', id: hero.id, x: 3 * g, y: 4 * g });
    D({ type: 'wall.door', id: 'porta', open: false });
    await W(450);
    log.push(`voltou e fechou: (12,4) continua lembrado = ${seen(12.5, 4.5)}`);
    // na tela do jogador: goblin da direita não aparece; mapa de lá aparece escurecido
    S.viewAs = 'p1'; App.UI.setMode('play'); App.UI.refresh(); B.fit(); B.render(); await W(300); B.render();
    const px = (cx, cy) => { const p = B.toScreen(cx * g, cy * g), d = B.dpr; return [...B.ctx.getImageData(Math.round(p.x * d), Math.round(p.y * d), 1, 1).data].slice(0, 3); };
    const vis = new Set([...document.querySelectorAll('x')].map(() => 0));
    const L = App.Light, viewers = L.viewers(sc());
    log.push(`jogador: goblin da direita visível = ${L.pointVisible(sc(), L.center(sc(), sc().tokens[gobs[1].id]), viewers)} · chão lembrado (14,8) = ${px(14.5, 8.5)} · chão nunca visto (0,9) = ${px(0.3, 9.7)} · chão iluminado (4,6) = ${px(4.5, 6.5)}`);
    // de cada jogador: um segundo jogador sem tokens não lembra nada
    S.viewAs = null; App.UI.setMode('edit');
    S.dispatch({ type: 'campaign.update', patch: { rules: Object.assign({}, S.state.rules, { exploreMode: 'player' }) } });
    S.dispatch({ type: 'player.upsert', id: 'p2', name: 'Bruno', color: '#e07b4f' });
    D({ type: 'token.move', id: hero.id, x: 3 * g, y: 5 * g });
    await W(450);
    log.push(`modo "de cada jogador": chaves = ${Object.keys(sc().explored).join(',')} · Ana (p1) ${bits('p1')} células · Bruno (p2) = ${bits('p2')}`);
    S.dispatch({ type: 'campaign.update', patch: { rules: Object.assign({}, S.state.rules, { exploreMode: 'group' }) } });
    // esquecer e desligar
    D({ type: 'explore.clear' });
    log.push(`esquecer o explorado: chaves ${Object.keys(sc().explored).length}`);
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { explore: false }) } });
    D({ type: 'token.move', id: hero.id, x: 4 * g, y: 5 * g });
    await W(450);
    log.push(`desligada na cena: nada gravado = ${!Object.keys(sc().explored).length}`);
    // painel e regra
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: Object.assign({}, sc().light, { explore: true }) } });
    App.UI.rightTab = 'layers'; App.UI.refresh(); await W(200);
    log.push(`painel Iluminação: chave = ${!!document.querySelector('#explore-on')} ligada = ${document.querySelector('#explore-on') && document.querySelector('#explore-on').checked} · botão esquecer = ${[...document.querySelectorAll('#light-sec button')].some((b) => /Esquecer/.test(b.textContent))}`);
    // desempenho: mapa 40×40 com 4 tokens
    const big = S.newScene('Grande'); big.cols = 40; big.rows = 40; big.light = { enabled: true, global: true, explore: true };
    S.dispatch({ type: 'scene.add', scene: big });
    for (let i = 0; i < 4; i++) S.dispatch({ type: 'token.add', sceneId: big.id, token: { id: 'bt' + i, actorId: hero.actorId, name: 'P' + i, size: 1, x: (5 + i * 8) * g, y: 20 * g, z: i, linked: false, bars: [], conditions: [] } });
    S.dispatch({ type: 'wall.add', sceneId: big.id, walls: Array.from({ length: 40 }, (_, i) => ({ id: 'bw' + i, x1: i * g, y1: (i % 7 + 3) * g, x2: (i + 1) * g, y2: (i % 7 + 3) * g, cover: 'full' })) });
    // Desempenho: o Edge de teste usa tempo virtual (o relógio não anda durante o cálculo), então medimos fora, em perf_explore.js
    const cells = (night) => { S.dispatch({ type: 'scene.update', id: big.id, patch: { light: { enabled: true, global: !night, explore: true } } }); S.dispatch({ type: 'explore.clear', sceneId: big.id }); E.recompute(big.id); const ex = S.state.scenes[big.id].explored['*']; return ex ? E.decode(ex, ex).reduce((a, b) => a + b, 0) : 0; };
    log.push(`mapa 40×40, 4 tokens, 40 paredes: de dia ${cells(false)} células vistas de 6400 (as de trás das paredes não) · de noite sem luz ${cells(true)}`);
    if (location.hash === '#shot') {
      D({ type: 'explore.clear' });
      D({ type: 'token.move', id: hero.id, x: 11 * g, y: 4 * g }); D({ type: 'wall.door', id: 'porta', open: true }); await W(400);
      D({ type: 'token.move', id: hero.id, x: 3 * g, y: 4 * g }); D({ type: 'wall.door', id: 'porta', open: false }); await W(400);
      S.viewAs = 'p1'; App.UI.setMode('play'); App.UI.refresh(); B.fit(); B.requestRender();
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
