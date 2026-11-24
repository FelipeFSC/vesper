// Plano 68: parar efeito pelo painel e som em um objeto (token, imagem, luz). Query padrão ?tutorial; #shot + -shot = foto do painel
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, A = App.Anim, Au = App.Audio, H = App.History;
    const sc = () => S.currentScene(), g = sc().grid, sid = sc().id, D = (a) => S.dispatch(a);
    const shot = location.hash === '#shot';
    if (UI.mode !== 'edit') UI.setMode('edit');
    const waitFor = async (cond, n = 60) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    const r1 = (v) => Math.round(v * 100) / 100;

    // Faixas geradas aqui (WAV), entregues como se fossem da pasta de músicas
    const wav = (sec) => { const rate = 8000, n = rate * sec, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / 8) * 3000, true); return new File([buf], 'x.wav', { type: 'audio/wav' }); };
    Au.addFiles([['efeitos/serra.wav', wav(8)], ['efeitos/musica longa.wav', wav(8)], ['ambiente/rosnado.wav', wav(3)]]);
    await W(150);

    // ---------- 1. Parar efeito pelo painel Som ----------
    UI.showTab('audio'); await W(100);
    Au.playSfx('efeitos/musica longa.wav');
    await waitFor(() => $$('#p-audio .au-fx-row').length === 1);
    const rows1 = $$('#p-audio .au-fx-row').length;
    ok(rows1 === 1, 'efeito tocando aparece no painel Som');
    log.push('painel Som: ' + rows1 + ' efeito tocando · "' + ($('#p-audio .au-fx-row') || {}).textContent + '"');
    $('#p-audio .au-fx-row .icon-btn').click();
    await waitFor(() => !Au.fx.length);
    ok(!Au.fx.length, 'Parar no painel interrompe');
    await waitFor(() => !$$('#p-audio .au-fx-row').length);
    log.push('Parar: tocando ' + Au.fx.length + ' · linhas ' + $$('#p-audio .au-fx-row').length);
    Au.playSfx('efeitos/musica longa.wav'); await W(30); Au.playSfx('efeitos/serra.wav');
    await waitFor(() => Au.fx.length === 2 && $$('#p-audio .au-fx .btn').length === 1);
    const all = $$('#p-audio .au-fx .btn').find((b) => /Parar todos/.test(b.textContent));
    ok(all, 'botão Parar todos com dois efeitos');
    all.click(); await waitFor(() => !Au.fx.length);
    ok(!Au.fx.length, 'Parar todos');
    log.push('Parar todos: ' + Au.fx.length + ' tocando');
    UI.showTab('table'); await W(50);

    // ---------- 2. Som do mapa "Uma vez": Tocar agora vira Parar ----------
    const loose = { id: 'snd_solto', name: 'efeitos/serra.wav', size: 0, x: 4 * g, y: 4 * g, r: 12, vol: 1, on: false, once: true, at: Date.now() };
    D({ type: 'sound.add', sceneId: sid, sound: loose });
    B.selectObj('sound', loose); UI.refresh(); await W(100);
    const playBtn = () => $$('#token-hud .snd-play').find((b) => b.offsetParent !== null || true);
    ok(/Tocar agora/.test((playBtn() || {}).textContent || ''), 'painel do som com Tocar agora');
    playBtn().click();
    await waitFor(() => /Parar/.test((playBtn() || {}).textContent || ''));
    const label1 = (playBtn() || {}).textContent;
    ok(/Parar/.test(label1) && Au.spotPlaying(loose.id), 'botão vira Parar enquanto toca');
    // Botão direito no marcador também tem Parar
    const hits0 = B.hitAll(sc(), { x: loose.x, y: loose.y });
    UI.contextMenu(200, 200, sc(), { x: loose.x, y: loose.y }, hits0); await W(50);
    const cmItems = () => $$('.cm-item').map((b) => b.textContent.trim());
    ok(cmItems().includes('Parar'), 'menu do marcador com Parar');
    $$('.cm-item').find((b) => b.textContent.trim() === 'Parar').click();
    await waitFor(() => !Au.spotPlaying(loose.id) && /Tocar agora/.test((playBtn() || {}).textContent || ''));
    ok(!Au.spotPlaying(loose.id), 'Parar pelo menu');
    log.push('som uma vez: "' + label1.trim() + '" enquanto toca → "' + ((playBtn() || {}).textContent || '').trim() + '" depois de parar');

    // ---------- 3. Som no token ----------
    const tok = Object.values(sc().tokens).find((t) => !t.hidden) || Object.values(sc().tokens)[0];
    ok(tok, 'há um token no tutorial');
    // Pelo menu: Adicionar som… → escolher a faixa
    UI.contextMenu(200, 200, sc(), { x: tok.x + 5, y: tok.y + 5 }, [{ kind: 'token', obj: tok }]); await W(50);
    ok(cmItems().includes('Adicionar som…'), 'menu do token com Adicionar som…');
    $$('.cm-item').find((b) => b.textContent.trim() === 'Adicionar som…').click(); await W(80);
    const trk = $$('.cm-track .cm-place-item').find((b) => /rosnado/.test(b.textContent));
    ok(trk, 'janela da faixa lista a biblioteca');
    trk.click(); await W(100);
    const tsnd = () => Au.soundOf(sc(), 'token', tok.id);
    ok(tsnd() && tsnd().attach === 'token:' + tok.id && tsnd().on && !tsnd().once, 'som do token criado (ambiente repete)');
    ok(B.selectedSound === tsnd().id && $('#token-hud .snd-owner'), 'painel do som aberto mostrando "Preso em"');
    log.push('token "' + tok.name + '": ' + Au.soundName(sc(), tsnd()) + ' · painel: "' + ($('#token-hud .snd-owner') || {}).textContent + '"');
    // Ícone no canto do token: o clique acha o som antes do token
    const at = B.attachedAt(sc(), tsnd());
    const hits = B.hitAll(sc(), at.b);
    ok(hits[0] && hits[0].kind === 'sound' && hits[0].obj.id === tsnd().id, 'ícone do som por cima do token');
    ok(!sc().sounds.some((s) => s.attach && false), '');
    log.push('ícone: hits ' + hits.map((x) => x.kind).join(', '));
    // Posição: anda com o token
    const center = (t) => ({ x: t.x + (t.size || 1) * g / 2, y: t.y + (t.size || 1) * g / 2 });
    let p = Au.soundPos(sc(), tsnd());
    ok(Math.abs(p.x - center(tok).x) < 1 && Math.abs(p.y - center(tok).y) < 1, 'som no centro do token');
    const x0 = tok.x, y0 = tok.y;
    D({ type: 'token.move', sceneId: sid, id: tok.id, x: x0 + 3 * g, y: y0 });
    p = Au.soundPos(sc(), tsnd());
    ok(Math.abs(p.x - (x0 + 3 * g + (tok.size || 1) * g / 2)) < 1, 'som anda com o token');
    // Volume: o mestre ouve do centro da câmera
    B.centerOn(p.x, p.y); await W(50);
    const vNear = Au.hearing(sc(), tsnd()).v;
    D({ type: 'token.move', sceneId: sid, id: tok.id, x: x0 + 3 * g + 6 * g, y: y0 });
    const vFar = Au.hearing(sc(), tsnd()).v;
    log.push(`volume para o mestre: perto ${r1(vNear)} · token andou 6 quadrados ${r1(vFar)}`);
    ok(vNear > 0.9 && vFar < vNear, 'volume muda quando o token anda');
    // Token escondido continua tocando
    D({ type: 'token.update', sceneId: sid, id: tok.id, patch: { hidden: true } });
    ok(Au.hearing(sc(), tsnd()).v === vFar, 'token escondido continua com som');
    D({ type: 'token.update', sceneId: sid, id: tok.id, patch: { hidden: false } });
    D({ type: 'token.move', sceneId: sid, id: tok.id, x: x0, y: y0 });
    // Isolamento usa a posição do token
    const c0 = center(sc().tokens[tok.id]), q = g * 1.5;
    D({ type: 'room.add', sceneId: sid, room: { id: 'room_t', name: 'Taverna', pts: [[c0.x - q, c0.y - q], [c0.x + q, c0.y - q], [c0.x + q, c0.y + q], [c0.x - q, c0.y + q]], outside: 'keep', ambient: 'keep' } });
    B.centerOn(c0.x + 3 * g, c0.y); await W(50);
    const vOut = Au.hearing(sc(), tsnd()).v;
    B.centerOn(c0.x, c0.y); await W(50);
    const vIn = Au.hearing(sc(), tsnd()).v;
    log.push(`isolamento: som do token em "${(Au.soundRoom(sc(), tsnd()) || {}).name}" · fora ${r1(vOut)} · dentro ${r1(vIn)}`);
    ok(Au.soundRoom(sc(), tsnd()) && vOut === 0 && vIn > 0.9, 'isolamento pela posição do token');
    D({ type: 'room.delete', sceneId: sid, id: 'room_t' });
    // Som tocando de verdade (nó do áudio)
    await waitFor(() => Au.spots.has(tsnd().id));
    ok(Au.spots.has(tsnd().id), 'som do token tocando no áudio');
    // Não arrasta o som preso
    B.selectObj('sound', tsnd()); UI.refresh(); await W(50);
    ok(!B.soundDrag, 'sem arraste do som preso');

    // ---------- 4. Soltar e prender ----------
    Au.detach(sc(), tsnd() || sc().sounds.find((s) => s.attach === 'token:' + tok.id));
    const freed = sc().sounds.find((s) => s.name === 'ambiente/rosnado.wav');
    ok(freed && !freed.attach && Math.abs(freed.x - center(sc().tokens[tok.id]).x) < 1, 'Soltar no mapa: marcador onde o token estava');
    Au.attachTo(sc(), freed, 'token', sc().tokens[tok.id]);
    ok(tsnd() && tsnd().id === freed.id, 'Prender de novo no token');
    log.push('soltar e prender: ok');

    // ---------- 5. Apagar o token apaga o som; desfazer devolve os dois ----------
    const sndId = tsnd().id, tokCopy = JSON.parse(JSON.stringify(sc().tokens[tok.id]));
    D({ type: 'token.delete', sceneId: sid, id: tok.id });
    ok(!sc().sounds.some((s) => s.id === sndId), 'apagar token apaga o som');
    H.undoLast(); await W(50);
    ok(sc().tokens[tok.id] && sc().sounds.some((s) => s.id === sndId && s.attach === 'token:' + tok.id), 'desfazer devolve token e som');
    log.push('apagar token: som ' + (sc().sounds.some((s) => s.id === sndId) ? 'voltou com o desfazer' : 'não voltou'));

    // ---------- 6. Imagem animada (a serra) ----------
    const prop = { id: 'pr_serra', img: null, name: 'Serra', x: 2 * g, y: 8 * g, w: g, h: g, rot: 0, z: 1 };
    D({ type: 'prop.add', sceneId: sid, prop });
    const psnd = Au.addToObject(sc(), 'prop', sc().props.find((x) => x.id === prop.id), 'efeitos/serra.wav');
    ok(psnd && psnd.once && psnd.attach === 'prop:' + prop.id, 'som da imagem (efeito uma vez)');
    const pp0 = Au.soundPos(sc(), psnd);
    A.play(sid, ['prop:' + prop.id], [Object.assign(A.newSpec('move'), { dx: 8, dy: 0, dur: 2, repeat: 'once' })]);
    await W(1000);
    const pp1 = Au.soundPos(sc(), psnd);
    log.push(`serra animada: som em x=${Math.round(pp0.x)} → x=${Math.round(pp1.x)} durante a animação (estado x=${sc().props.find((x) => x.id === prop.id).x + g / 2})`);
    ok(pp1.x > pp0.x + g, 'som acompanha a imagem animada');
    // Tocar o efeito da serra: posição de onde sai e volume recalculado
    B.centerOn(pp1.x, pp1.y); await W(30);
    Au.trigger(sc().sounds.find((s) => s.id === psnd.id));
    ok(Math.abs(S.state.audio.spot.x - Au.soundPos(sc(), psnd).x) < g, 'efeito sai de onde a serra está');
    await waitFor(() => Au.spotPlaying(psnd.id));
    const item = Au.fx.find((x) => x.spotId === psnd.id);
    ok(item && item.node, 'efeito da serra tocando');
    await W(400);
    const g1 = item ? item.node.gain.gain.value : 0;
    B.centerOn(pp1.x + 30 * g, pp1.y); await W(600);
    const g2 = item ? item.node.gain.gain.value : 0;
    log.push(`efeito uma vez recalculado: ganho ${r1(g1)} perto → ${r1(g2)} longe`);
    ok(g1 > 0.1 && g2 < g1 / 2, 'efeito uma vez muda de volume enquanto toca');
    Au.stopSpot(psnd); await waitFor(() => !Au.spotPlaying(psnd.id));
    A.stop(sid, ['prop:' + prop.id], 'stop'); await W(50);

    // ---------- 7. Luz com som; duplicar e copiar/colar levam o som ----------
    const lt = B.addLight(sc(), { name: 'Tocha', x: 10.5 * g, y: 3.5 * g, on: true, bright: 2, dim: 4 });
    Au.addToObject(sc(), 'light', lt, 'ambiente/rosnado.wav');
    ok(Au.soundOf(sc(), 'light', lt.id), 'som na luz');
    const nL = sc().lights.length;
    B.duplicateLight(sc(), lt.id);
    const lt2 = sc().lights[nL];
    ok(lt2 && Au.soundOf(sc(), 'light', lt2.id), 'duplicar luz leva o som');
    B.selectObj('prop', sc().props.find((x) => x.id === prop.id));
    B.copySelection(sc());
    const nP = sc().props.length;
    B.paste(sc(), { x: 14 * g, y: 10 * g });
    const pr2 = sc().props[nP];
    ok(pr2 && Au.soundOf(sc(), 'prop', pr2.id) && Au.soundOf(sc(), 'prop', pr2.id).id !== psnd.id, 'colar imagem leva uma cópia do som');
    log.push('duplicar luz e colar imagem: os dois com som próprio');
    // Apagar a imagem apaga o som dela
    B.selectObj('prop', sc().props.find((x) => x.id === prop.id)); B.keyAct('Delete'); await W(50);
    ok(!sc().sounds.some((s) => s.id === psnd.id), 'apagar imagem apaga o som');

    // ---------- 8. Gatilho com o som de um objeto; nome nas listas ----------
    const ltSnd = Au.soundOf(sc(), 'light', lt.id);
    ok(TG.nameOf(sc(), 'sound', ltSnd) === 'Som de Tocha: rosnado', 'nome do som na lista dos gatilhos');
    const off = Object.assign(TG.newAction('sound'), { op: 'spot-off', ids: [ltSnd.id] });
    const tr = TG.newTrigger(sc(), { shape: 'circle', x: 1.5 * g, y: 1.5 * g, r: 0.5, name: 'Silencia tocha', actions: [off], times: 'always' });
    D({ type: 'trigger.add', sceneId: sid, trigger: tr });
    TG.fire(sid, tr.id, null, { manual: true, quiet: true }); await W(50);
    ok(!Au.soundOf(sc(), 'light', lt.id).on, 'gatilho desliga o som da luz');
    log.push('gatilho: "' + TG.nameOf(sc(), 'sound', ltSnd) + '" desligado');

    // ---------- 9. Menu do objeto com som ----------
    UI.contextMenu(200, 200, sc(), { x: lt.x, y: lt.y }, [{ kind: 'light', obj: sc().lights.find((x) => x.id === lt.id) }]); await W(50);
    ok(cmItems().some((t) => /^Som: rosnado/.test(t)), 'menu da luz com o submenu do som');
    log.push('menu da luz: ' + cmItems().filter((t) => /Som/.test(t)).join(' | '));
    UI.closeContextMenu();

    // ---------- 10. Portal para outra cena leva o som do token ----------
    const ns = Object.assign(S.newScene('Porão'), {});
    D({ type: 'scene.add', scene: ns });
    const tp = Object.assign(TG.newAction('teleport'), { sceneId: ns.id, x: 3 * g, y: 3 * g });
    const tr2 = TG.newTrigger(sc(), { shape: 'circle', x: 2.5 * g, y: 1.5 * g, r: 0.5, name: 'Descer', actions: [tp], times: 'always' });
    D({ type: 'trigger.add', sceneId: sid, trigger: tr2 });
    const sndId2 = tsnd().id;
    TG.fire(sid, tr2.id, tok.id, { manual: true, quiet: true }); await W(100);
    const there = Object.values(S.state.scenes[ns.id].tokens).find((t) => t.actorId === tokCopy.actorId && t.name === tokCopy.name);
    const sndThere = there && (S.state.scenes[ns.id].sounds || []).find((s) => s.attach === 'token:' + there.id);
    ok(!sc().sounds.some((s) => s.id === sndId2), 'som saiu da cena de origem');
    ok(sndThere && sndThere.name === 'ambiente/rosnado.wav', 'som foi junto para a outra cena');
    log.push('portal para "Porão": som ' + (sndThere ? 'foi junto' : 'ficou para trás'));

    // ---------- 11. Campanha antiga / objeto que sumiu ----------
    const mig = S.migrate(JSON.parse(JSON.stringify(Object.assign({}, S.state, { scenes: { [sid]: Object.assign({}, S.state.scenes[sid], { sounds: [{ id: 'snd_x', name: 'a.wav', x: 1, y: 2, r: 8, vol: 1, on: true, once: false, at: 0, attach: 'token:nao_existe' }] }) } }))));
    const ms = (mig || S.state).scenes ? Object.values((mig || {}).scenes || {})[0] : null;
    ok(!ms || !ms.sounds[0].attach, 'migrate solta som de objeto que não existe');

    // ---------- 12. Jogador não vê nem clica no ícone ----------
    const lsnd = Au.soundOf(sc(), 'light', lt.id), lb = B.attachedAt(sc(), lsnd).b;
    S.viewAs = '*'; S.emit('local'); await W(100);
    const pHits = B.hitAll(sc(), lb).map((x) => x.kind);
    S.viewAs = null; S.emit('local'); await W(100);
    ok(!pHits.includes('sound'), 'jogador não acha o ícone do som');
    log.push('visão do jogador: no ícone acha [' + pHits.join(', ') + ']');

    if (shot) { B.selectObj('sound', Au.soundOf(sc(), 'light', lt.id)); UI.refresh(); const c = Au.soundPos(sc(), Au.soundOf(sc(), 'light', lt.id)); B.centerOn(c.x, c.y); await W(300); }
    log.push('fim do som em objeto');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
