// Plano 17 · Desfazer e refazer: cada tipo, passo único, jogador no meio tempo, gatilho e combate fora, limite, atalhos e botões
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, H = App.History, TG = App.Triggers, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    const D = (a) => S.dispatch(Object.assign({ sceneId: sid }, a));
    const key = (k, shift) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: true, shiftKey: !!shift, bubbles: true }));
    D({ type: 'wall.clear' }); H.clear();
    // paredes
    D({ type: 'wall.add', walls: [{ id: 'w1', x1: 0, y1: 0, x2: 3 * g, y2: 0 }, { id: 'w2', x1: 3 * g, y1: 0, x2: 3 * g, y2: 3 * g }] });
    D({ type: 'wall.delete', id: 'w1' });
    log.push(`paredes: ${sc().walls.map((w) => w.id)} · Ctrl+Z (apagar) → ${(key('z'), sc().walls.map((w) => w.id))} · Ctrl+Z (criar) → [${(key('z'), sc().walls.map((w) => w.id))}] · Ctrl+Y → ${(key('y'), sc().walls.map((w) => w.id))} · Ctrl+Shift+Z → ${(key('z', true), sc().walls.map((w) => w.id))}`);
    // lápis: um traço inteiro num passo
    const pencil = B.pencilWalls(sc(), Array.from({ length: 30 }, (_, i) => [5 * g + Math.cos(i / 9) * 2 * g, 5 * g + Math.sin(i / 9) * 2 * g]));
    D({ type: 'wall.add', walls: pencil });
    const nP = sc().walls.length;
    key('z');
    log.push(`traço de lápis (${pencil.length} trechos): ${nP} → Ctrl+Z → ${sc().walls.length} paredes`);
    // imagem: mover e duplicar (duplicar = 2 ações, 1 passo)
    const pr = B.addProp(sc(), 'img-falsa', { x: 4 * g, y: 4 * g }, 100, 100, 'Baú');
    D({ type: 'prop.update', id: pr.id, patch: { x: 8 * g, y: 2 * g } });
    key('z');
    const p1 = sc().props.find((x) => x.id === pr.id);
    log.push(`mover imagem e desfazer: volta para (${p1.x / g}, ${p1.y / g})`);
    const nProps = sc().props.length, nUndo = H.undo.length;
    B.duplicateProp(sc(), pr.id);
    log.push(`duplicar imagem: +${sc().props.length - nProps} imagem, +${H.undo.length - nUndo} passo · Ctrl+Z → ${(key('z'), sc().props.length - nProps)} a mais`);
    // luz e gatilho
    const lt = B.addLight(sc(), { x: 2.5 * g, y: 7.5 * g });
    D({ type: 'lightpt.update', id: lt.id, patch: { color: '#8fb4ff', dim: 6 } });
    key('z');
    const l1 = sc().lights.find((x) => x.id === lt.id);
    log.push(`luz: mudar cor e alcance, desfazer → ${l1.color} ${l1.dim}`);
    const tr = TG.newTrigger(sc(), { name: 'Placa', shape: 'circle', x: 6.5 * g, y: 6.5 * g, actions: [Object.assign(TG.newAction('light'), { lightId: lt.id, op: 'off' })] });
    D({ type: 'trigger.add', trigger: tr });
    D({ type: 'trigger.delete', id: tr.id });
    key('z');
    log.push(`gatilho apagado e desfeito: volta = ${!!sc().triggers.find((x) => x.id === tr.id)} com ${sc().triggers.find((x) => x.id === tr.id).actions.length} ação`);
    // gatilho disparando não entra na pilha
    const n0 = H.undo.length;
    TG.fire(sid, tr.id, null, { manual: true });
    log.push(`gatilho disparou (apagou a luz): passos ${n0} → ${H.undo.length} · luz apagada = ${sc().lights.find((x) => x.id === lt.id).on === false}`);
    // token do mestre e jogador no meio tempo
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name)), gob = Object.values(sc().tokens).find((t) => t.id !== hero.id);
    D({ type: 'token.move', id: gob.id, x: 10 * g, y: 5 * g });
    D({ type: 'token.move', id: gob.id, x: 12 * g, y: 5 * g });
    key('z');
    log.push(`mestre moveu o goblin 2 vezes, Ctrl+Z: (${sc().tokens[gob.id].x / g}, ${sc().tokens[gob.id].y / g})`);
    if (!Object.keys(S.state.players).length) D({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#38bdf8' });
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p));
    D({ type: 'token.update', id: hero.id, patch: { hidden: true } });
    S.remoteAction({ type: 'token.move', sceneId: sid, id: hero.id, x: 2 * g, y: 2 * g, path: [[sc().tokens[hero.id].x, sc().tokens[hero.id].y], [2 * g, 2 * g]], at: Date.now() }, pid);
    const nBefore = H.undo.length;
    key('z');
    const hh = sc().tokens[hero.id];
    log.push(`mestre escondeu a Lyra, o jogador moveu: o movimento do jogador não entrou (passos ${nBefore}); Ctrl+Z → invisível = ${!!hh.hidden} · posição do jogador mantida (${hh.x / g}, ${hh.y / g})`);
    // combate não entra
    const nC = H.undo.length;
    S.useAction({ sceneId: sid, actorId: hero.actorId, index: 4, attackerId: hero.id, targets: [hero.id] }, null);
    log.push(`rolagem/combate: passos ${nC} → ${H.undo.length}`);
    // névoa
    D({ type: 'scene.update', id: sid, patch: { fog: { enabled: true, shapes: [], v: 1 } } });
    D({ type: 'fog.add', shape: { mode: 'reveal', x: 0, y: 0, w: 2 * g, h: 2 * g } });
    key('z');
    log.push(`névoa: revelar e desfazer → ${sc().fog.shapes.length} formas`);
    // refazer some ao fazer algo novo
    D({ type: 'wall.add', walls: [{ id: 'w9', x1: 0, y1: 9 * g, x2: 2 * g, y2: 9 * g }] });
    key('z');
    const canRedo = H.redo.length;
    D({ type: 'wall.add', walls: [{ id: 'w10', x1: 0, y1: 8 * g, x2: 2 * g, y2: 8 * g }] });
    log.push(`refazer disponível ${canRedo} → depois de uma ação nova: ${H.redo.length}`);
    // limite de 100
    for (let i = 0; i < 130; i++) D({ type: 'wall.add', walls: [{ id: 'x' + i, x1: i, y1: 0, x2: i + 5, y2: 5 }] });
    log.push(`depois de 130 ações: ${H.undo.length} passos guardados`);
    // botões
    App.UI.refresh(); await W(200);
    const bu = document.querySelector('#btn-undo'), br = document.querySelector('#btn-redo');
    log.push(`botões: desfazer ativo = ${!bu.disabled} ("${bu.title}") · refazer ativo = ${!br.disabled}`);
    bu.click(); await W(100);
    log.push(`clique em desfazer: refazer ativo = ${!document.querySelector('#btn-redo').disabled}`);
    // jogador não tem desfazer
    S.viewAs = pid; const nV = H.undo.length; key('z'); S.viewAs = null;
    log.push(`mestre em "ver como" com Ctrl+Z: desfaz também (é o mestre): ${nV} → ${H.undo.length}`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
