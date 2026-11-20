// Plano 12 · Parede a lápis: traço livre vira paredes (simplificadas), fecha o contorno, borracha e troca de tipo no traço inteiro.
// Com -shot: foto do mestre com uma caverna desenhada a lápis.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, L = App.Light, sc = () => S.currentScene(), g = sc().grid;
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.setTool('wall'); await W(200);
    const pencilBtn = [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /Lápis/.test(b.textContent));
    log.push('opções da Parede: ' + [...document.querySelectorAll('#tool-opts .to-row')].map((b) => b.textContent).join(' | '));
    pencilBtn.click(); await W(100);
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const draw = (pts) => {
      B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(...pts[0]))));
      for (const q of pts.slice(1)) window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(...q))));
      window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(...pts[pts.length - 1]))));
    };
    // arco aberto (meia volta), com um pouco de tremido da mão
    const arc = [];
    for (let i = 0; i <= 80; i++) { const a = Math.PI + (i / 80) * Math.PI; arc.push([4 * g + Math.cos(a) * 2.5 * g + Math.sin(i * 1.7) * 1.5, 5 * g + Math.sin(a) * 2.5 * g]); }
    draw(arc); await W(50);
    const w1 = sc().walls.slice();
    const strokes = new Set(w1.map((w) => w.stroke));
    log.push(`arco a lápis: ${arc.length} pontos do mouse → ${w1.length} paredes · mesmo traço: ${strokes.size === 1 && !!w1[0].stroke} · tipo: ${w1[0].cover} (escolhido: ${B.wallType})`);
    const P = (cx, cy) => ({ x: cx * g, y: cy * g });
    log.push(`bloqueia a visão de dentro para fora do arco: ${L.blocked(sc(), 4 * g, 4 * g, 4 * g, 1.5 * g, 1.8)} · por baixo (aberto): ${L.blocked(sc(), 4 * g, 4 * g, 4 * g, 7 * g, 1.8)}`);
    // contorno fechado (círculo) terminando perto do início
    const circ = [];
    for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2 * 0.97; circ.push([11 * g + Math.cos(a) * 2 * g, 5 * g + Math.sin(a) * 2 * g]); }
    draw(circ); await W(50);
    const w2 = sc().walls.filter((w) => !w1.some((o) => o.id === w.id));
    const first = w2[0], last = w2[w2.length - 1];
    log.push(`círculo a lápis: ${w2.length} paredes · fechou (fim = começo): ${last.x2 === first.x1 && last.y2 === first.y1} · de dentro vê fora: ${!L.blocked(sc(), 11 * g, 5.3 * g, 15 * g, 5.3 * g, 1.8) ? 'sim' : 'não'}`);
    // clique (sem desenhar) num trecho do círculo com outro tipo escolhido: troca o traço inteiro
    B.wallType = 'half';
    draw([[13 * g, 5 * g], [13 * g, 5 * g]]); await W(50);
    log.push(`clique no círculo com Meia escolhida: tipos do traço = ${[...new Set(sc().walls.filter((w) => w.stroke === first.stroke).map((w) => w.cover))].join(',')} · arco continua ${[...new Set(sc().walls.filter((w) => w.stroke === w1[0].stroke).map((w) => w.cover))].join(',')}`);
    B.wallType = 'high';
    // borracha num trecho do arco: apaga o arco inteiro
    const n0 = sc().walls.length;
    B.setTool('erase');
    const m = w1[Math.floor(w1.length / 2)];
    draw([[(m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2], [(m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2]]); await W(50);
    log.push(`borracha num trecho do arco: ${n0} → ${sc().walls.length} paredes (apagou ${n0 - sc().walls.length}, o arco tinha ${w1.length})`);
    // modo reta continua igual
    B.setTool('wall'); await W(100);
    [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /Reta/.test(b.textContent)).click(); await W(50);
    const n1 = sc().walls.length;
    draw([[1 * g, 9 * g], [3 * g, 9 * g], [5 * g, 9 * g]]); await W(50);
    const nw = sc().walls[sc().walls.length - 1];
    log.push(`modo reta: ${sc().walls.length - n1} parede de (${nw.x1 / g},${nw.y1 / g}) a (${nw.x2 / g},${nw.y2 / g}) · sem traço: ${!nw.stroke}`);
    // foto: caverna a lápis
    if (location.hash === '#shot') {
      S.dispatch({ type: 'wall.clear', sceneId: sc().id });
      [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /Lápis/.test(b.textContent)).click(); await W(50);
      const cave = [];
      for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2 * 0.98, r = 3.2 + 0.7 * Math.sin(a * 3) + 0.3 * Math.sin(a * 7); cave.push([8 * g + Math.cos(a) * r * g * 1.6, 5 * g + Math.sin(a) * r * g]); }
      draw(cave); await W(100);
      B.requestRender();
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
