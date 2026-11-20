// Plano 30 · Régua e rastro do movimento para todos (rede simulada: captura o que sai e injeta o que chega)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: Object.assign({}, sc().light, { enabled: false }) } });
    // rede simulada
    const sent = [];
    App.Net.isOnline = () => true;
    App.Net.shareRuler = (m) => sent.push(JSON.parse(JSON.stringify(m)));
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const ev = (type, x, y, opt) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y), opt || {})));
    const setR = (k, v) => S.dispatch({ type: 'campaign.update', patch: { rules: { [k]: v } } });
    const tk = Object.values(sc().tokens)[0];
    B.cam.x = tk.x - 5 * g; B.cam.y = tk.y - 4 * g; B.requestRender(); await W(50);

    // 1) rastro com relógios diferentes: movimento com hora 1 minuto atrás (relógio do jogador atrasado)
    B.render();
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: tk.id, x: tk.x + g, y: tk.y, path: [[tk.x, tk.y], [tk.x + g, tk.y]], at: Date.now() - 60000 });
    B.render();
    const m1 = B.moves.get(tk.id);
    log.push('rastro com relógio 1 min atrasado: aparece = ' + !!(m1 && performance.now() - m1.t0 < 3000));
    // 2) campanha recém-aberta: token nunca visto com movimento velho não mostra rastro
    const id2 = 'tk_old';
    S.dispatch({ type: 'token.add', sceneId: sc().id, token: Object.assign({}, tk, { id: id2, x: tk.x, y: tk.y + 2 * g, lastMove: { pts: [[0, 0], [g, 0]], at: Date.now() - 600000 } }) });
    B.render();
    const m2 = B.moves.get(id2);
    log.push('movimento velho de campanha aberta: aparece = ' + !!(m2 && performance.now() - m2.t0 < 3000));
    // 3) o mestre carimba a hora do movimento do jogador
    const a = { type: 'token.move', sceneId: sc().id, id: tk.id, x: tk.x, y: tk.y, path: [[tk.x, tk.y], [tk.x - g, tk.y]], at: 5 };
    const perm = S.canControl; S.remoteAction(a, 'p_fake');
    log.push('hora do movimento do jogador pelo relógio do mestre: ' + (Math.abs(a.at - Date.now()) < 2000));

    // 4) régua no modo desempenho (padrão): nada durante, uma mensagem ao soltar
    log.push('padrão da regra: ' + (S.state.rules.liveRuler ? 'tempo real' : 'desempenho'));
    B.setTool('ruler'); App.UI.refresh(); await W(50);
    sent.length = 0;
    const x0 = tk.x + g / 2, y0 = tk.y + g / 2;
    ev('pointerdown', x0, y0);
    for (let i = 1; i <= 6; i++) { ev('pointermove', x0 + i * g / 2, y0); await W(60); }
    log.push('desempenho, medindo: ' + sent.length + ' mensagens');
    ev('pointerup', x0 + 3 * g, y0); await W(30);
    log.push('desempenho, soltou: ' + sent.length + ' mensagem (' + (sent[0] && (sent[0].kind + ', fim=' + !!sent[0].done + ', pontos=' + sent[0].pts.length)) + ')');
    log.push('minha régua continua na tela depois de soltar: ' + B.remote.has('me:ruler'));

    // 5) tempo real
    setR('liveRuler', true); sent.length = 0;
    ev('pointerdown', x0, y0);
    for (let i = 1; i <= 10; i++) { ev('pointermove', x0 + i * g / 3, y0 + i * g / 6); await W(50); }
    const during = sent.length;
    await W(1700);
    const beat = sent.length - during;
    ev('pointerup', x0 + 3 * g, y0 + g); await W(30);
    log.push(`tempo real: ${during} mensagens em 0,5 s medindo · parado 1,7 s: ${beat} sinal de vida · última: fim=${!!sent[sent.length - 1].done}`);

    // 6) mestre com "Mostrar aos jogadores" desligado
    App.UI.refresh(); await W(50);
    const cb = [...document.querySelectorAll('#tool-opts .to-row')].find((l) => /Mostrar aos jogadores/.test(l.textContent));
    log.push('opção na régua do mestre: ' + !!cb + ' · ligada = ' + (cb && cb.classList.contains('on')));
    cb.click(); await W(30);
    sent.length = 0;
    ev('pointerdown', x0, y0); ev('pointermove', x0 + 2 * g, y0); await W(150); ev('pointerup', x0 + 2 * g, y0);
    log.push('desligada: mensagens = ' + sent.length + ' · B.rulerShare = ' + B.rulerShare);
    B.rulerShare = true;

    // 7) arraste do token em tempo real; token escondido não vai
    B.setTool('select'); sent.length = 0;
    const t = sc().tokens[tk.id], cx = t.x + g / 2, cy = t.y + g / 2;
    ev('pointerdown', cx, cy);
    for (let i = 1; i <= 5; i++) { ev('pointermove', cx + i * g / 2, cy); await W(60); }
    const dragMsgs = sent.filter((m) => m.kind === 'drag').length;
    ev('pointerup', cx + 2.5 * g, cy); await W(30);
    log.push(`arraste em tempo real: ${dragMsgs} mensagens · ao soltar: ${sent[sent.length - 1].clear ? 'limpa a linha (vira rastro)' : JSON.stringify(sent[sent.length - 1])}`);
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: tk.id, patch: { hidden: true } });
    sent.length = 0;
    const t2 = sc().tokens[tk.id], cx2 = t2.x + g / 2, cy2 = t2.y + g / 2;
    ev('pointerdown', cx2, cy2); for (let i = 1; i <= 4; i++) { ev('pointermove', cx2 - i * g / 2, cy2); await W(60); } ev('pointerup', cx2 - 2 * g, cy2);
    log.push('token escondido do mestre: mensagens = ' + sent.filter((m) => m.kind === 'drag').length);
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: tk.id, patch: { hidden: false } });

    // 8) chegou a régua de outra pessoa
    B.remote.clear();
    B.onRuler({ t: 'ruler', kind: 'ruler', sceneId: sc().id, from: 'p1', name: 'Lyra', color: '#5fd0c8', pts: [[x0, y0], [x0 + 3 * g, y0]] });
    B.onRuler({ t: 'ruler', kind: 'ruler', sceneId: 'outra', from: 'p2', name: 'Outro', color: '#fff', pts: [[0, 0], [g, 0]] });
    log.push('régua da Lyra chegou: ' + B.remote.has('p1:ruler') + ' · de outra cena ignorada: ' + !B.remote.has('p2:ruler'));
    B.onRuler({ t: 'ruler', kind: 'ruler', sceneId: sc().id, from: 'p1', clear: true });
    log.push('Lyra cancelou: ' + !B.remote.has('p1:ruler'));
    setR('trailSecs', 1);
    B.onRuler({ t: 'ruler', kind: 'ruler', sceneId: sc().id, from: 'p1', name: 'Lyra', color: '#5fd0c8', pts: [[x0, y0], [x0 + 3 * g, y0]], done: true });
    await W(400); const still = B.remote.has('p1:ruler');
    await W(1000);
    B.render();
    log.push(`Lyra soltou (rastro 1 s): 0,4 s = ${still} · 1,4 s = ${B.remote.has('p1:ruler')}`);
    setR('trailSecs', 3);
    // sem sinal de vida por 5 s some (a pessoa caiu da mesa)
    B.onRuler({ t: 'ruler', kind: 'ruler', sceneId: sc().id, from: 'p3', name: 'Caiu', color: '#fff', pts: [[x0, y0], [x0 + g, y0]] });
    await W(5300); B.render();
    log.push('sem sinal de vida por 5 s: some = ' + !B.remote.has('p3:ruler'));

    // 9) Mesa → Regras
    App.UI.showTab('table'); await W(150);
    const lbl = [...document.querySelectorAll('#p-table label.row')].find((l) => /Régua e movimento dos outros/.test(l.textContent));
    log.push('Mesa → Regras: ' + (lbl ? [...lbl.querySelectorAll('option')].map((o) => o.textContent).join(' | ') : 'não achou (aba fechada)'));
    if (B.shareTest) B.render();
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
