// Plano 57 · Janela, parede mágica, desenhar por cima e pontas conectadas
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  const check = (name, ok, extra) => log.push((ok ? 'ok ' : 'FALHOU ') + name + (extra ? ' · ' + extra : ''));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, L = App.Light, C = App.Combat, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    window.confirm = () => true;
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#e0609a' });
    const lyra = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name)), gob = Object.values(sc().tokens).find((t) => t.id !== lyra.id);
    S.dispatch({ type: 'token.update', sceneId: sid, id: lyra.id, patch: { owner: 'p1' } });
    const place = (t, cx, cy) => S.dispatch({ type: 'token.move', sceneId: sid, id: t.id, x: cx * g, y: cy * g });
    const H = sc().rows * g;
    const P = (cx, cy) => ({ x: (cx + 0.5) * g, y: (cy + 0.5) * g });
    const eye = L.eyeOf(sc().tokens[lyra.id]);
    const clear = () => S.dispatch({ type: 'wall.clear', sceneId: sid });

    // ---------- 1. Janela ----------
    clear();
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'win', x1: 5 * g, y1: 0, x2: 5 * g, y2: H, door: true, window: true, open: false, playersOpen: false }] });
    place(sc().tokens[lyra.id], 4, 3); place(sc().tokens[gob.id], 6, 3);
    const a = P(4, 3), b = P(6, 3);
    check('janela: movimento bloqueado', L.moveBlocked(sc(), a, b, eye));
    check('janela: enxerga o outro lado', !L.blocked(sc(), a.x, a.y, b.x, b.y, eye));
    check('janela: a luz passa', !L.blocked(sc(), a.x, a.y, b.x, b.y, 0));
    check('janela: ataque bloqueado', C.blocked(sc(), sc().tokens[lyra.id], sc().tokens[gob.id]));
    check('janela: caminho vermelho', B.crossesWall(sc(), a, b));
    check('janela: arrastar por cima deixa cego', B.pathBlind(sc(), sc().tokens[lyra.id], [a, b]));
    S.remoteAction({ type: 'token.move', sceneId: sid, id: lyra.id, x: 6 * g, y: 3 * g }, 'p1');
    check('janela: jogador não atravessa (permit)', sc().tokens[lyra.id].x === 4 * g);
    S.remoteAction({ type: 'wall.door', sceneId: sid, id: 'win', open: true }, 'p1');
    check('janela: jogador não abre sem permissão', !sc().walls[0].open);
    S.dispatch({ type: 'wall.lock', sceneId: sid, id: 'win', locked: true });
    check('janela: não tranca', !sc().walls[0].locked);
    S.dispatch({ type: 'wall.update', sceneId: sid, id: 'win', patch: { playersOpen: true } });
    S.remoteAction({ type: 'wall.door', sceneId: sid, id: 'win', open: true }, 'p1');
    check('janela: com "jogadores podem abrir", o jogador abre', sc().walls[0].open === true);
    check('janela aberta: passa movimento', !L.moveBlocked(sc(), a, b, eye) && !B.crossesWall(sc(), a, b));
    check('janela aberta: passa ataque', !C.blocked(sc(), sc().tokens[lyra.id], sc().tokens[gob.id]));
    S.dispatch({ type: 'wall.door', sceneId: sid, id: 'win', open: false });
    S.dispatch({ type: 'wall.door', sceneId: sid, id: 'win', open: true });
    check('janela: o mestre abrir não muda "jogadores podem abrir"', sc().walls[0].playersOpen === true);
    // jogador: marca só com a janela aberta
    S.dispatch({ type: 'wall.update', sceneId: sid, id: 'win', patch: { cover: 'high' } });
    const wv = sc().walls[0];
    check('janela → parede comum', !wv.window && !wv.door && wv.cover === 'high');
    S.dispatch({ type: 'wall.update', sceneId: sid, id: 'win', patch: { cover: 'window' } });
    check('parede → janela (fechada, só o mestre abre)', sc().walls[0].window && sc().walls[0].door && !sc().walls[0].open && !sc().walls[0].playersOpen);

    // ---------- 2. Parede mágica ----------
    clear();
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'mg', x1: 5 * g, y1: 0, x2: 5 * g, y2: H, cover: 'full', magic: true }] });
    check('mágica ligada: tapa a visão e o movimento', L.blocked(sc(), a.x, a.y, b.x, b.y, eye) && L.moveBlocked(sc(), a, b, eye));
    S.remoteAction({ type: 'wall.magic', sceneId: sid, ids: ['mg'], off: true }, 'p1');
    check('mágica: jogador não desliga', !sc().walls[0].off);
    S.dispatch({ type: 'wall.magic', sceneId: sid, ids: ['mg'], off: true });
    check('mágica desligada: não bloqueia nada', !L.blocked(sc(), a.x, a.y, b.x, b.y, eye) && !L.blocked(sc(), a.x, a.y, b.x, b.y, 0)
      && !L.moveBlocked(sc(), a, b, eye) && !C.blocked(sc(), sc().tokens[lyra.id], sc().tokens[gob.id]) && !B.crossesWall(sc(), a, b));
    // gatilho liga de novo
    const act = Object.assign(App.Triggers.newAction('magic'), { ids: ['mg'], op: 'on' });
    const tr = App.Triggers.newTrigger(sc(), { id: 'tr57', x: 1 * g, y: 1 * g, actions: [act] });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: tr });
    const sum = App.Triggers.summary(sc(), act);
    check('gatilho: resumo', /^Parede \(\d+, \d+\)$/.test(sum.target) && sum.op === 'Ligar' && !sum.missing, sum.target + ' · ' + sum.op);
    try { App.Triggers.fire(sid, 'tr57', null, { manual: true, quiet: true }); } catch (e) { log.push('EXC fire ' + e.message); }
    await W(300);
    check('gatilho liga a parede mágica', !sc().walls[0].off);

    // ---------- 3. Desenhar por cima ----------
    clear();
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'base', x1: 2 * g, y1: 5 * g, x2: 8 * g, y2: 5 * g, cover: 'high', magic: true, stroke: 'st_x' }] });
    const door = { id: 'dnew', x1: 4 * g, y1: 5 * g + 0.2 * g, x2: 5 * g, y2: 5 * g + 0.2 * g, door: true, open: false };
    const cut = B.replaceCut(sc(), door);
    check('substituir: porta torta vai para a linha da parede', cut && cut.a.y === 5 * g && cut.b.y === 5 * g, cut && JSON.stringify([cut.a, cut.b]));
    Object.assign(door, { x1: cut.a.x, y1: cut.a.y, x2: cut.b.x, y2: cut.b.y });
    const undoBefore = App.History.undo.length;
    S.dispatch({ type: 'wall.replace', sceneId: sid, remove: cut.remove, walls: cut.pieces.concat([door]) });
    const ws = sc().walls, pieces = ws.filter((w) => !w.door);
    const ends = pieces.map((w) => [w.x1 / g, w.y1 / g, w.x2 / g, w.y2 / g].join(',')).sort();
    check('substituir: sobram 2 trechos colados na porta', pieces.length === 2 && ends.join(' | ') === '2,5,4,5 | 5,5,8,5', ends.join(' | '));
    check('substituir: os trechos guardam tipo, mágica e traço', pieces.every((w) => w.cover === 'high' && w.magic && w.stroke === 'st_x'));
    check('substituir: um passo no desfazer', App.History.undo.length === undoBefore + 1);
    // sem fresta: luz atravessando exatamente na junta parede/porta
    // Linha que passa a 0,3 px da junta, dos dois lados: as duas precisam bater (sem vão entre a parede e a porta)
    for (const x of [4 * g, 5 * g]) check('sem fresta na junta x=' + x / g, [-0.3, 0.3].every((k) => L.blocked(sc(), x + k, 4 * g, x + k, 6 * g, 0)));
    // Polígono de visão da luz logo acima da junta: o ponto logo abaixo da junta fica de fora
    for (const x of [4 * g, 5 * g]) {
      const poly = L.visibility(sc(), x, 4 * g, 4 * g, 0), pts = [];
      for (let i = 0; i < poly.length; i += 2) pts.push([poly[i], poly[i + 1]]);
      const flat = Array.isArray(poly[0]) ? poly : pts;
      check('a luz não vaza pela junta x=' + x / g, !L.inPoly(x, 5 * g + 4, flat));
    }
    App.History.undoLast();
    check('desfazer volta a parede inteira', sc().walls.length === 1 && sc().walls[0].id === 'base');
    // janela por cima de uma parede total: só o pedaço muda
    const win = { id: 'w2', x1: 6 * g, y1: 5 * g, x2: 7 * g, y2: 5 * g, door: true, window: true, open: false };
    const cut2 = B.replaceCut(sc(), win);
    check('janela sobre parede: corta 1 e sobra 2', cut2 && cut2.remove.length === 1 && cut2.pieces.length === 2);
    // fora de qualquer parede: não substitui
    check('porta longe da parede: não substitui', B.replaceCut(sc(), { x1: 4 * g, y1: 8 * g, x2: 5 * g, y2: 8 * g }) === null);
    // perpendicular: não substitui
    check('parede perpendicular: não substitui', B.replaceCut(sc(), { x1: 4 * g, y1: 4 * g, x2: 4 * g, y2: 6 * g }) === null);

    // ---------- 4. Pontas conectadas ----------
    clear();
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'sc1', x1: 130, y1: 77, x2: 400, y2: 77.5, cover: 'high' }] });
    const s1 = B.wallSnap(sc(), { x: 130 + 0.2 * g, y: 77 + 3 }, true);
    check('grude: ponta perto gruda na ponta', s1.x === 130 && s1.y === 77 && s1.stuck, JSON.stringify(s1));
    const s2 = B.wallSnap(sc(), { x: 250, y: 77 + 0.2 * g }, true);
    check('grude: perto da linha gruda na linha (T)', s2.stuck && Math.abs(s2.y - 77.22) < 0.2, JSON.stringify(s2));
    const s3 = B.wallSnap(sc(), { x: 250, y: 77 + 0.6 * g }, true);
    check('grude: longe, vai para o canto do grid', !s3.stuck && s3.x % g === 0 && s3.y % g === 0, JSON.stringify(s3));
    clear();
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'gr', x1: 2 * g, y1: 5 * g, x2: 8 * g, y2: 5 * g, cover: 'high' }] });
    const s4 = B.wallSnap(sc(), { x: 4 * g + 6, y: 5 * g + 5 }, true);
    check('grude: parede no grid prefere o canto do grid', s4.x === 4 * g && s4.y === 5 * g && s4.stuck, JSON.stringify(s4));
    // lápis: ponta solta gruda
    const pw = B.pencilWalls(sc(), [[3 * g + 5, 2 * g], [3 * g + 5, 3 * g], [3 * g + 4, 4 * g], [3 * g + 6, 5 * g - 6]], true);
    check('lápis: a ponta final gruda na parede', pw.length && pw[pw.length - 1].y2 === 5 * g, pw.length && JSON.stringify(pw[pw.length - 1]));

    // ---------- desenho (sem erro) ----------
    clear();
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [
      { id: 'r1', x1: 2 * g, y1: 2 * g, x2: 8 * g, y2: 2 * g, cover: 'high', magic: true },
      { id: 'r2', x1: 2 * g, y1: 2 * g, x2: 2 * g, y2: 6 * g, cover: 'high', magic: true, off: true },
      { id: 'r3', x1: 4 * g, y1: 2 * g, x2: 5 * g, y2: 2 * g, door: true, window: true, open: true, playersOpen: true, magic: true } ] });
    App.UI.setMode('edit'); B.tool = 'wall'; B.render(); await W(50);
    App.UI.setMode('play'); App.UI.setViewAs('p1'); B.render(); await W(50); App.UI.setViewAs(null);
    log.push('erros: ' + JSON.stringify(window.__err || []));
    log.push('fim das paredes 57');
  } catch (e) { log.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); log.push('fim das paredes 57'); }
}, 1500));
