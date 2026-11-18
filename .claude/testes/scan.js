// Plano 22 · Scan de paredes e portas: mapa sintético (salas soltas num fundo, octógono, portas iguais, girada e diferente),
// paredes desenhadas em preto, área, repetidas, desfazer, palpite, importar .uvtt, janela.
// #real: usa o mapa de exemplo (_mapa_exemplo.png, se existir) e deixa a prévia na tela (para foto com -shot)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  log.push('início');
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, SC = App.Scan;
    const G = 50; // px por quadrado no desenho
    const sceneFrom = (canvas, cols, rows, name) => {
      const data = canvas.toDataURL('image/png'), id = 'img_' + App.U.hash(data);
      S.assets[id] = data;
      const sc = S.newScene(name); sc.cols = cols; sc.rows = rows; sc.bg = id;
      S.dispatch({ type: 'scene.add', scene: sc });
      S.viewSceneId = sc.id; S.emit('local');
      return S.state.scenes[sc.id];
    };
    let seed = 12345;
    const noise = (x, a) => { const d = x.getImageData(0, 0, x.canvas.width, x.canvas.height); for (let i = 0; i < d.data.length; i += 4) { seed = (seed * 16807) % 2147483647; const n = ((seed / 2147483647) - 0.5) * a; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0); };
    const real = location.hash === '#real';

    if (!real) {
      // ---------- mapa 1: salas soltas num fundo azul ----------
      const c = document.createElement('canvas'); c.width = 24 * G; c.height = 14 * G;
      const x = c.getContext('2d');
      x.fillStyle = '#1c2b4d'; x.fillRect(0, 0, c.width, c.height);
      const poly = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a * G, b * G) : x.moveTo(a * G, b * G))); x.closePath(); x.fillStyle = fill; x.fill(); x.lineWidth = 3; x.strokeStyle = '#142038'; x.stroke(); };
      const rect = (a, b, w, h, fill) => poly([[a, b], [a + w, b], [a + w, b + h], [a, b + h]], fill);
      rect(2, 2, 6, 5, '#6b4423');                                   // sala A (madeira)
      poly([[14, 1], [17, 1], [19, 3], [19, 6], [17, 8], [14, 8], [12, 6], [12, 3]], '#55555c'); // octógono B
      rect(8, 4, 4, 1, '#4a4a50');                                   // corredor A → B
      rect(4, 7, 1, 4, '#4a4a50');                                   // corredor A ↓ C
      rect(2, 11, 6, 2, '#5a3a1e');                                  // sala C
      x.fillStyle = '#070707'; x.beginPath(); x.arc(15.5 * G, 4.5 * G, 1.1 * G, 0, Math.PI * 2); x.fill(); // buraco dentro do octógono
      x.fillStyle = '#8a2c22'; x.fillRect(3.2 * G, 3 * G, 1.5 * G, 0.8 * G);                              // mesa na sala A
      noise(x, 22);
      const door = (a, b, w, h, fill) => { x.fillStyle = fill; x.fillRect(a * G, b * G, w * G, h * G); x.lineWidth = 2; x.strokeStyle = '#3a2a14'; x.strokeRect(a * G, b * G, w * G, h * G); };
      door(7.85, 4.05, 0.3, 0.9, '#d49a5c');   // tan vertical (A → corredor)
      door(11.85, 4.05, 0.3, 0.9, '#d49a5c');  // tan vertical (corredor → B)
      door(4.05, 6.85, 0.9, 0.3, '#d49a5c');   // tan horizontal (A ↓)
      door(4.05, 10.85, 0.9, 0.3, '#6b4cd6');  // roxa (corredor → C)
      const sc = sceneFrom(c, 24, 14, 'Scan sintético'), g = sc.grid, sid = sc.id;
      const P = (cx, cy) => ({ x: cx * g, y: cy * g });
      const near = (w, ax, ay, bx, by, tol = 0.3) => (Math.hypot(w.x1 / g - ax, w.y1 / g - ay) < tol && Math.hypot(w.x2 / g - bx, w.y2 / g - by) < tol) || (Math.hypot(w.x1 / g - bx, w.y1 / g - by) < tol && Math.hypot(w.x2 / g - ax, w.y2 / g - ay) < tol);
      const covered = (ws, ax, ay, bx, by) => { // a linha (ax,ay)-(bx,by) está coberta por paredes?
        let ok = 0, n = 10;
        for (let i = 0; i <= n; i++) { const px = (ax + (bx - ax) * i / n) * g, py = (ay + (by - ay) * i / n) * g; if (ws.some((w) => { const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / L2)); return Math.hypot(px - w.x1 - dx * t, py - w.y1 - dy * t) < g * 0.15; })) ok++; }
        return ok / (n + 1);
      };
      const opts = (p) => Object.assign({ by: 'outside', seeds: [P(0.5, 0.5)], sens: 0.5, mode: 'straight', region: null, tpls: [], doorThr: 0.86, gaps: false, sync: true }, p);

      let r = await SC.run(sc, opts({ seeds: [] }));
      log.push('sem clique no vazio: pede o clique = ' + !!r.need);
      r = await SC.run(sc, opts());
      const ang = (w) => { const a = Math.abs(Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI) % 180; return Math.round(a); };
      const angs = {};
      for (const w of r.walls) { const a = ang(w); angs[a] = (angs[a] || 0) + 1; }
      log.push(`lado de fora, retas: ${r.walls.length} paredes · ângulos ${JSON.stringify(angs)}`);
      log.push(`sala A coberta: esquerda ${covered(r.walls, 2, 2, 2, 7).toFixed(2)} · topo ${covered(r.walls, 2, 2, 8, 2).toFixed(2)} · direita acima do corredor ${covered(r.walls, 8, 2, 8, 4).toFixed(2)}`);
      log.push(`octógono: diagonal (17,1)-(19,3) coberta ${covered(r.walls, 17, 1, 19, 3).toFixed(2)} · lado (19,3)-(19,6) ${covered(r.walls, 19, 3, 19, 6).toFixed(2)}`);
      log.push(`abertura do corredor sem parede: ${covered(r.walls, 8, 4.2, 8, 4.8).toFixed(2)} · buraco preto dentro do octógono virou parede: ${r.walls.some((w) => Math.hypot((w.x1 + w.x2) / 2 - 15.5 * g, (w.y1 + w.y2) / 2 - 4.5 * g) < 1.3 * g)} · mesa virou parede: ${r.walls.some((w) => Math.hypot((w.x1 + w.x2) / 2 - 4 * g, (w.y1 + w.y2) / 2 - 3.4 * g) < 0.9 * g)}`);
      const onGrid = r.walls.filter((w) => [w.x1, w.y1, w.x2, w.y2].every((v) => Math.abs(v / (g / 2) - Math.round(v / (g / 2))) < 0.02)).length;
      log.push(`pontas no meio-quadrado: ${onGrid}/${r.walls.length}`);
      const rf = await SC.run(sc, opts({ mode: 'free' }));
      log.push(`livre: ${rf.walls.length} paredes · com traço (borracha apaga junto) = ${rf.walls.every((w) => w.stroke)} · traços ${new Set(rf.walls.map((w) => w.stroke)).size}`);
      const lo = await SC.run(sc, opts({ sens: 0.1 })), hi = await SC.run(sc, opts({ sens: 0.9 }));
      log.push(`sensibilidade 10% → ${lo.walls.length} · 90% → ${hi.walls.length}`);

      // portas por exemplo
      const tpl = { x: 3.95 * g, y: 6.75 * g, w: 1.1 * g, h: 0.5 * g };
      const rd = await SC.run(sc, opts({ tpls: [tpl] }));
      const dpos = rd.doors.map((d) => `(${((d.x1 + d.x2) / 2 / g).toFixed(1)},${((d.y1 + d.y2) / 2 / g).toFixed(1)})`).join(' ');
      log.push(`mostrou a porta de baixo: ${rd.doors.length} portas ${dpos} · roxa achada = ${rd.doors.some((d) => Math.abs((d.y1 + d.y2) / 2 / g - 11) < 0.4)}`);
      log.push('confiança: ' + rd.doors.map((d) => d.score).join(', '));
      const rd2 = await SC.run(sc, opts({ tpls: [tpl, { x: 3.95 * g, y: 10.75 * g, w: 1.1 * g, h: 0.5 * g }] }));
      log.push(`mostrou também a roxa: ${rd2.doors.length} portas · roxa = ${rd2.doors.some((d) => Math.abs((d.y1 + d.y2) / 2 / g - 11) < 0.4)} · aviso: ${rd2.doorWarn}`);
      const rg = await SC.run(sc, opts({ gaps: true }));
      log.push(`palpite pelas aberturas (sem exemplo): ${rg.doors.length} portas · marcadas como palpite = ${rg.doors.every((d) => d.guess)}`);
      // área
      const rr = await SC.run(sc, opts({ region: { x: 1 * g, y: 1 * g, w: 8 * g, h: 7 * g } }));
      log.push(`só a sala A: ${rr.walls.length} paredes · alguma fora = ${rr.walls.some((w) => (w.x1 + w.x2) / 2 > 9 * g || (w.y1 + w.y2) / 2 > 8 * g)}`);
      // criar, não repetir, desfazer
      rd2.walls[0].off = true;
      const nUndo = App.History.undo.length;
      const made = SC.apply(sc, rd2);
      const s2 = S.state.scenes[sid];
      log.push(`Criar: ${made} (tirada 1 de ${rd2.walls.length + rd2.doors.length}) · paredes ${s2.walls.filter((w) => !w.door).length} · portas ${s2.walls.filter((w) => w.door).length} · passos no desfazer +${App.History.undo.length - nUndo}`);
      const again = await SC.run(s2, opts({ tpls: [tpl] }));
      log.push(`procurar de novo depois de criar: ${again.walls.length} paredes novas (só a tirada) · ${again.doors.length} portas novas`);
      const blocks = App.Light.blocked(s2, 5 * g, 4.5 * g, 15.5 * g, 6.5 * g, 0);
      log.push(`a parede criada tapa a visão entre a sala A e o octógono (porta fechada): ${blocks}`);
      App.History.undoLast(); await W(50);
      log.push('Ctrl+Z: paredes ' + S.state.scenes[sid].walls.length);

      // ---------- mapa 2: paredes desenhadas em preto ----------
      const c2 = document.createElement('canvas'); c2.width = 12 * G; c2.height = 10 * G;
      const y = c2.getContext('2d');
      y.fillStyle = '#e9e4d6'; y.fillRect(0, 0, c2.width, c2.height);
      y.strokeStyle = '#151515'; y.lineWidth = 0.3 * G; y.lineCap = 'square';
      y.beginPath(); y.moveTo(2 * G, 2 * G); y.lineTo(10 * G, 2 * G); y.lineTo(10 * G, 8 * G); y.lineTo(2 * G, 8 * G); y.closePath(); y.stroke();
      y.beginPath(); y.moveTo(6 * G, 2 * G); y.lineTo(6 * G, 4.5 * G); y.moveTo(6 * G, 5.5 * G); y.lineTo(6 * G, 8 * G); y.stroke(); // parede do meio com abertura
      noise(y, 10);
      const sc2 = sceneFrom(c2, 12, 10, 'Scan paredes pretas'), g2 = sc2.grid;
      const rw = await SC.run(sc2, { by: 'wall', seeds: [{ x: 2 * g2, y: 5 * g2 }], sens: 0.5, mode: 'straight', tpls: [], sync: true });
      const fmt = (w) => `(${w.x1 / g2},${w.y1 / g2})-(${w.x2 / g2},${w.y2 / g2})`;
      log.push(`cor da parede: ${rw.walls.length} paredes: ${rw.walls.map(fmt).join(' ')}`);
      const rk = await SC.run(sc2, { by: 'dark', seeds: [], sens: 0.5, mode: 'straight', tpls: [], sync: true });
      log.push(`escuro automático: ${rk.walls.length} paredes: ${rk.walls.map(fmt).join(' ')}`);
      const rgap = await SC.run(sc2, { by: 'wall', seeds: [{ x: 2 * g2, y: 5 * g2 }], sens: 0.5, mode: 'straight', tpls: [], gaps: true, sync: true });
      log.push(`palpite na abertura do meio: ${rgap.doors.map(fmt).join(' ') || 'nenhum'}`);

      // ---------- importar .uvtt ----------
      const c3 = document.createElement('canvas'); c3.width = 100; c3.height = 80; c3.getContext('2d').fillRect(0, 0, 10, 10);
      const uv = { format: 0.3, resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: 10, y: 8 }, pixels_per_grid: 10 },
        line_of_sight: [[{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 4 }]], objects_line_of_sight: [[{ x: 7, y: 6 }, { x: 8, y: 6 }]],
        portals: [{ position: { x: 5, y: 2.5 }, bounds: [{ x: 5, y: 2 }, { x: 5, y: 3 }], rotation: 0, closed: true, freestanding: false }],
        lights: [{ position: { x: 3, y: 3 }, range: 4, intensity: 1, color: 'ffff8800', shadows: true }],
        image: c3.toDataURL('image/png').split(',')[1] };
      const imp = await SC.importUVTT(new File([JSON.stringify(uv)], 'Cripta.dd2vtt'));
      const isc = S.state.scenes[imp.scene.id], ig = isc.grid;
      const dr = isc.walls.find((w) => w.door);
      log.push(`importou "${isc.name}": ${isc.cols}×${isc.rows} · ${imp.walls} paredes, ${imp.doors} porta(s), ${imp.lights} luz · porta em (${dr.x1 / ig},${dr.y1 / ig})-(${dr.x2 / ig},${dr.y2 / ig}) · luz em (${isc.lights[0].x / ig},${isc.lights[0].y / ig}) alcance ${isc.lights[0].dim} cor ${isc.lights[0].color} · imagem = ${!!S.assets[isc.bg]}`);
      try { await SC.importUVTT(new File(['oi'], 'x.uvtt')); } catch (e) { log.push('arquivo inválido: ' + e.message); }

      // ---------- janela ----------
      S.viewSceneId = sid; S.emit('local'); await W(200);
      if (UI.mode !== 'edit') UI.setMode('edit');
      B.setTool('wall'); await W(200);
      const btn = [...document.querySelectorAll('button')].find((b) => /Procurar paredes no mapa/.test(b.textContent));
      log.push('botão na ferramenta Parede: ' + !!btn);
      btn.click(); await W(400);
      const win = () => document.querySelector('.win.scan-win');
      log.push('janela: ' + !!win() + ' · ' + (win().querySelector('.scan-status') || {}).textContent);
      const ping = await Promise.race([App.Scan.ping().then(() => 'respondeu'), W(4000).then(() => 'sem resposta (tempo virtual)')]);
      log.push('worker: ' + ping);
      App.Scan.forceSync = true;
      UI.scanOpts.seeds = [P(0.5, 0.5)]; UI.runScan(true); await W(800);
      log.push('depois do clique no vazio (worker): ' + (win().querySelector('.scan-status') || {}).textContent + ' · prévia no mapa = ' + B.scan.walls.length);
      const s0 = B.scan.walls[0], mid = { x: (s0.x1 + s0.x2) / 2, y: (s0.y1 + s0.y2) / 2 };
      const cr = B.canvas.getBoundingClientRect(), q = B.toScreen(mid.x, mid.y);
      const ev = { bubbles: true, button: 0, buttons: 1, pointerId: 1, clientX: cr.left + q.x, clientY: cr.top + q.y };
      B.canvas.dispatchEvent(new PointerEvent('pointerdown', ev)); window.dispatchEvent(new PointerEvent('pointerup', ev)); await W(150);
      log.push('clique numa sugestão: tirada = ' + !!s0.off + ' · ' + (win().querySelector('.scan-status') || {}).textContent);
      UI.closeWindow('scan'); await W(100);
      log.push('fechou: prévia sumiu = ' + !B.scan);
    } else {
      // ---------- mapa de exemplo do usuário ----------
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '.claude/testes/_mapa_exemplo.png'; });
      const c = document.createElement('canvas'); c.width = 2450; c.height = 1260; c.getContext('2d').drawImage(im, 0, 0, 2450, 1260);
      const sc = sceneFrom(c, 35, 18, 'Mapa de exemplo'), g = sc.grid;
      if (UI.mode !== 'edit') UI.setMode('edit');
      B.setTool('wall'); await W(200);
      UI.openScan(); await W(200);
      UI.scanOpts.seeds = [{ x: 0.3 * g, y: 0.3 * g }];
      UI.scanOpts.tpls = [{ x: 233 / 2000 * 35 * g, y: 195 / 1029 * 18 * g, w: 14 / 2000 * 35 * g, h: 36 / 1029 * 18 * g }];
      const t0 = Date.now();
      const r = await SC.run(sc, Object.assign({}, UI.scanOpts, { sync: true }));
      Object.assign(B.scan, { walls: r.walls, doors: r.doors });
      log.push(`mapa de exemplo: ${r.walls.length} paredes · ${r.doors.length} portas`);
      const dsp = (v, axis) => Math.round(v / g / (axis ? 18 : 35) * (axis ? 1029 : 2000));
      log.push('paredes longas: ' + r.walls.filter((w) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) > 4 * g).map((w) => '(' + dsp(w.x1, 0) + ',' + dsp(w.y1, 1) + ')-(' + dsp(w.x2, 0) + ',' + dsp(w.y2, 1) + ')').join(' '));
      const Pc = App.Scan.cache, at = (dx, dy) => App.Scan.colorAt(Pc, { x: dx / 2000 * 35 * g, y: dy / 1029 * 18 * g });
      log.push('cores: vazio ' + at(20, 20) + ' ' + at(700, 400) + ' · sala cinza esq. ' + at(100, 270) + ' · corredor cinza ' + at(200, 215) + ' · octógono cinza ' + at(1000, 220) + ' · sala clara ' + at(1100, 560) + ' · madeira ' + at(350, 250) + ' · linha da borda ' + at(46, 300) + ' · vazio x1600 ' + at(1600, 700) + ' x1700 ' + at(1700, 700) + ' x1900 ' + at(1900, 600) + ' · sala marrom ' + at(1650, 120) + ' ' + at(1550, 200) + ' · octógono oliva ' + at(1520, 450));
      UI.closeWindow('scan'); B.scan = Object.assign({ sceneId: sc.id }, r);
      B.fit(); B.requestRender(); await W(500);
      void t0;
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1500));
