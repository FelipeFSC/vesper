// Plano 5 · Movimento com pontos de passagem
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 3 * g, y: 5 * g });
    B.setTool('select');
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const pd = (x, y) => B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y))));
    const pm = (x, y) => window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(x, y))));
    const pu = (x, y) => window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(x, y))));
    const right = (x, y) => window.dispatchEvent(new MouseEvent('mousedown', Object.assign({ bubbles: true, button: 2, buttons: 3 }, scr(x, y))));
    const c = (cx, cy) => [cx * g + g / 2, cy * g + g / 2];

    // pedido do usuário: 2 para a direita, ponto, 2 para cima
    pd(...c(3, 5)); pm(...c(4, 5)); pm(...c(5, 5)); right(...c(5, 5)); pm(...c(5, 4)); pm(...c(5, 3));
    await W(50);
    const cost = B.pathCost(sc(), [{ x: c(3, 5)[0], y: c(3, 5)[1] }].concat(B.drag.points, [{ x: c(5, 3)[0], y: c(5, 3)[1] }]));
    log.push(`durante o arraste: ${B.drag.points.length} ponto(s) · trechos ${cost.segs.join(' + ')} = ${cost.total} quad. (reta seria 2)`);
    pu(...c(5, 3)); await W(30);
    const t = () => sc().tokens[hero.id];
    log.push(`soltou: token em (${t().x / g}, ${t().y / g}) · caminho guardado com ${t().lastMove.pts.length} pontos: ${t().lastMove.pts.map((p) => '(' + p[0] / g + ',' + p[1] / g + ')').join(' → ')}`);
    const mid = B.posOf(t());
    log.push(`logo depois de soltar, o token ainda está deslizando: posição desenhada (${Math.round((mid.x - g / 2) / g * 10) / 10}, ${Math.round((mid.y - g / 2) / g * 10) / 10}) ≠ destino`);
    await W(1600);
    const end = B.posOf(t());
    log.push(`depois de 1,6 s chegou: (${(end.x - g / 2) / g}, ${(end.y - g / 2) / g})`);

    // Backspace tira o último ponto
    pd(...c(5, 3)); pm(...c(6, 3)); right(...c(6, 3)); pm(...c(7, 3)); right(...c(7, 3)); pm(...c(7, 4));
    const n1 = B.drag.points.length;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    log.push(`Backspace: pontos ${n1} → ${B.drag.points.length} · token continua no mapa: ${!!sc().tokens[hero.id]}`);
    pu(...c(7, 4)); await W(30);

    // botão direito sem segurar nada: move a câmera
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 2, buttons: 2, pointerId: 2 }, scr(200, 200))));
    log.push('botão direito sozinho move a câmera: ' + !!B.pan);
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 2, pointerId: 2 }, scr(200, 200))));

    // regra 1-2-1: 2 diagonais em trechos diferentes = 1 + 2 = 3
    const old = sc().measure; sc().measure = 'alt';
    const alt = B.pathCost(sc(), [{ x: 0, y: 0 }, { x: g, y: g }, { x: 2 * g, y: 0 }]);
    log.push(`regra 1-2-1, uma diagonal em cada trecho: ${alt.segs.join(' + ')} = ${alt.total} (esperado 1 + 2 = 3)`);
    sc().measure = old;

    // parede no caminho: aviso
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'pw', x1: 9 * g, y1: 0, x2: 9 * g, y2: 9 * g }] });
    log.push('trecho atravessando parede fica vermelho: ' + B.crossesWall(sc(), { x: 8.5 * g, y: 4 * g }, { x: 9.5 * g, y: 4 * g }) + ' · trecho livre: ' + B.crossesWall(sc(), { x: 2 * g, y: 4 * g }, { x: 3 * g, y: 4 * g }));

    // régua com pontos (não move ninguém)
    const before = JSON.stringify(t());
    B.setTool('ruler');
    pd(1 * g, 1 * g); pm(4 * g, 1 * g); right(4 * g, 1 * g); pm(4 * g, 3 * g);
    log.push(`régua: ${B.ruler.points.length} ponto · total ${B.pathCost(sc(), [B.ruler.a].concat(B.ruler.points, [B.ruler.b])).total} quad.`);
    pu(4 * g, 3 * g); B.setTool('select');
    log.push('régua não moveu ninguém: ' + (JSON.stringify(t()) === before));

    // configuração do rastro
    App.UI.showTab('table'); await W(150);
    const inp = [...document.querySelectorAll('#p-table label')].find((l) => /Rastro do movimento/.test(l.textContent));
    log.push('painel Mesa tem "Rastro do movimento": ' + !!inp + ' valor ' + (inp && inp.querySelector('input').value));
    S.dispatch({ type: 'campaign.update', patch: { rules: { trailSecs: 0 } } });
    log.push('rastro em 0: ' + S.state.rules.trailSecs);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
