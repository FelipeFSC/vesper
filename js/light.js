'use strict';
/*
 * Iluminação dinâmica.
 * - Parede absoluta e portas fechadas bloqueiam tudo. Cobertura total (muro alto) bloqueia a luz e a visão de quem não é mais alto que ele.
 *   Muros de ¾ e meia deixam a luz passar e só tapam a visão de quem é baixo (ver Combat.coverOf).
 * - Tokens podem emitir luz (t.light = {bright, dim} em quadrados) e ter visão no escuro (t.darkvision).
 * - Ambiente claro (sc.light.global): tudo iluminado, mas as paredes ainda cortam a linha de visão.
 * - Jogador vê só o que está iluminado E na linha de visão de algum token dele.
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;

  const PRESETS = [
    { id: 'none', label: 'Sem luz', bright: 0, dim: 0 },
    { id: 'candle', label: 'Vela', bright: 1, dim: 2 },
    { id: 'torch', label: 'Tocha', bright: 4, dim: 8 },
    { id: 'lantern', label: 'Lanterna', bright: 6, dim: 12 },
    { id: 'bonfire', label: 'Fogueira', bright: 8, dim: 16 },
  ];
  const DARKVISION = [[0, 'Não'], [6, '6 quadrados'], [12, '12 quadrados'], [24, '24 quadrados']];

  const L = { PRESETS, DARKVISION, segKey: '', segs: [], walls: [], low: [], byEye: new Map(), cache: new Map(), canvases: [] };

  const active = (sc) => !!(sc && sc.light && sc.light.enabled);
  L.active = active;

  // Segmentos que bloqueiam (paredes + portas fechadas) e as bordas do mapa
  function prepare(sc) {
    const cv = sc.cover || {};
    const key = sc.id + ':' + (sc.wallsV || 0) + ':' + sc.cols + 'x' + sc.rows + ':' + sc.grid + ':' + (cv.enabled !== false) + JSON.stringify(cv.heights || {});
    if (L.segKey === key) return;
    L.segKey = key;
    L.cache.clear();
    const W = sc.cols * sc.grid, H = sc.rows * sc.grid;
    const cfg = App.Combat ? App.Combat.coverCfg(sc) : null, on = !!(cfg && cfg.enabled);
    const seg = (w) => [w.x1, w.y1, w.x2, w.y2];
    const type = (w) => (App.Combat ? App.Combat.wallType(w) : 'full');
    const walls = (sc.walls || []).filter((w) => !(w.door && w.open));
    // Sempre bloqueiam: portas fechadas e parede absoluta (casa com telhado). Com a cobertura desligada, a cobertura total também.
    L.walls = walls.filter((w) => type(w) === 'full' || (!on && type(w) === 'high')).map(seg);
    // A luz passa por cima de ¾ e meia, mas não da cobertura total
    L.lightWalls = L.walls.concat(on ? walls.filter((w) => type(w) === 'high').map(seg) : []);
    L.border = [[0, 0, W, 0], [W, 0, W, H], [W, H, 0, H], [0, H, 0, 0]];
    L.segs = L.lightWalls.concat(L.border);
    // Muros com altura (alto, ¾ e meia): bloqueiam a visão de quem não é mais alto que eles
    L.low = !on ? [] : walls.filter((w) => type(w) !== 'full').map((w) => ({ seg: seg(w), h: Number(cfg.heights[type(w)]) || 0 }));
    L.byEye.clear();
  }
  /*
   * Paredes que bloqueiam a visão de quem tem eyeH metros: as totais e os muros
   * da altura dele ou mais altos (quem é baixo não enxerga por cima). Sem eyeH = o que bloqueia a luz e o som.
   */
  function wallsFor(eyeH) {
    if (!(eyeH > 0)) return L.lightWalls;
    const k = Math.round(eyeH * 100);
    let w = L.byEye.get(k);
    if (!w) { w = L.walls.concat(L.low.filter((x) => x.h >= eyeH - 1e-9).map((x) => x.seg)); L.byEye.set(k, w); }
    return w;
  }
  // Olho de quem olha: altura do corpo + altura do voo
  // Luz carregada por quem voa ilumina de cima: passa por cima dos muros mais baixos que ela
  const lightH = (l) => (App.Combat && l.t && App.Combat.flyOf(l.t) > 0 ? App.Combat.topOf(l.t) : 0);
  L.eyeOf = (t) => (App.Combat && t ? App.Combat.topOf(t) : 0);

  // Polígono de visibilidade a partir de (ox, oy), limitado ao raio R
  function visibility(sc, ox, oy, R, eyeH) {
    prepare(sc);
    const blockers = wallsFor(eyeH);
    const key = Math.round(ox) + ',' + Math.round(oy) + ',' + Math.round(R) + ',' + (eyeH > 0 ? Math.round(eyeH * 100) : 'luz');
    const hit = L.cache.get(key);
    if (hit) return hit;
    const segs = (blockers === L.lightWalls ? L.segs : blockers.concat(L.border)).filter((s) => Math.min(s[0], s[2]) <= ox + R && Math.max(s[0], s[2]) >= ox - R
      && Math.min(s[1], s[3]) <= oy + R && Math.max(s[1], s[3]) >= oy - R);
    const angles = [];
    for (const s of segs) {
      for (const [px, py] of [[s[0], s[1]], [s[2], s[3]]]) {
        const a = Math.atan2(py - oy, px - ox);
        angles.push(a - 1e-4, a, a + 1e-4);
      }
    }
    for (let i = 0; i < 64; i++) angles.push(-Math.PI + (i / 64) * Math.PI * 2);
    angles.sort((a, b) => a - b);
    const pts = [];
    for (const a of angles) {
      const dx = Math.cos(a), dy = Math.sin(a);
      let tmin = R;
      for (const s of segs) {
        const ex = s[2] - s[0], ey = s[3] - s[1];
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const wx = s[0] - ox, wy = s[1] - oy;
        const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
        if (t > 0 && u >= 0 && u <= 1 && t < tmin) tmin = t;
      }
      pts.push(ox + dx * tmin, oy + dy * tmin);
    }
    if (L.cache.size > 400) L.cache.clear();
    L.cache.set(key, pts);
    return pts;
  }
  L.visibility = visibility;

  // Algum segmento bloqueante cruza a linha a→b?
  function blocked(sc, ax, ay, bx, by, eyeH) {
    prepare(sc);
    const cross = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    for (const s of wallsFor(eyeH)) {
      const d1 = cross(s[0], s[1], s[2], s[3], ax, ay), d2 = cross(s[0], s[1], s[2], s[3], bx, by);
      const d3 = cross(ax, ay, bx, by, s[0], s[1]), d4 = cross(ax, ay, bx, by, s[2], s[3]);
      if (((d1 > 1e-6 && d2 < -1e-6) || (d1 < -1e-6 && d2 > 1e-6)) && ((d3 > 1e-6 && d4 < -1e-6) || (d3 < -1e-6 && d4 > 1e-6))) return true;
    }
    return false;
  }
  L.blocked = blocked;

  const center = (sc, t) => { const s = (t.size || 1) * sc.grid; return { x: t.x + s / 2, y: t.y + s / 2 }; };
  L.center = center;

  // Fontes de luz da cena (tokens com luz)
  function sources(sc, posOf) {
    const out = [];
    for (const t of Object.values(sc.tokens)) {
      const li = t.light;
      if (!li || !(Number(li.dim) > 0 || Number(li.bright) > 0)) continue;
      const c = posOf ? posOf(t) : center(sc, t);
      const dim = Math.max(Number(li.dim) || 0, Number(li.bright) || 0) * sc.grid;
      out.push({ t, x: c.x, y: c.y, dim, bright: Math.min(Number(li.bright) || 0, Number(li.dim) || li.bright || 0) * sc.grid });
    }
    return out;
  }

  // Quem "enxerga" para este cliente: tokens do jogador (ou do jogador que o mestre está simulando)
  L.viewers = (sc) => Object.values(sc.tokens).filter((t) => S().canControl(t));

  // Ponto visível para o conjunto de "olhos"?
  // targetTop: topo do alvo quando ele voa (vê-se por cima dos muros mais baixos; a luz também chega)
  L.pointVisible = function (sc, p, viewers, posOf, targetTop) {
    const lit = () => {
      if (sc.light.global) return true;
      return sources(sc, posOf).some((l) => Math.hypot(p.x - l.x, p.y - l.y) <= l.dim && !blocked(sc, l.x, l.y, p.x, p.y, Math.max(lightH(l), targetTop || 0) || undefined));
    };
    if (!viewers.length) return lit();
    for (const v of viewers) {
      const c = posOf ? posOf(v) : center(sc, v);
      if (blocked(sc, c.x, c.y, p.x, p.y, Math.max(L.eyeOf(v), targetTop || 0))) continue;
      if (lit()) return true;
      const dv = (Number(v.darkvision) || 0) * sc.grid;
      if (dv && Math.hypot(p.x - c.x, p.y - c.y) <= dv) return true;
    }
    return false;
  };

  // ---------- desenho ----------
  function canvasN(i, w, h) {
    let c = L.canvases[i];
    if (!c) { c = L.canvases[i] = document.createElement('canvas'); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    x.clearRect(0, 0, w, h);
    return [c, x];
  }
  function polyPath(x, pts) {
    x.beginPath();
    x.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
  }
  function drawLights(x, sc, srcs) {
    for (const l of srcs) {
      const poly = visibility(sc, l.x, l.y, l.dim, lightH(l) || undefined);
      x.save();
      polyPath(x, poly);
      x.clip();
      const g = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.dim);
      const b = l.dim > 0 ? U.clamp(l.bright / l.dim, 0, 0.98) : 0;
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(b, 'rgba(255,255,255,1)');
      g.addColorStop(Math.min(0.99, b + 0.02), 'rgba(255,255,255,0.55)');
      g.addColorStop(0.97, 'rgba(255,255,255,0.4)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(l.x - l.dim, l.y - l.dim, l.dim * 2, l.dim * 2);
      x.restore();
    }
  }

  /*
   * Desenha a escuridão sobre o mapa. ctx está em coordenadas de tela (CSS px); cam = câmera do tabuleiro.
   * opts = { viewers: [...] | null, alpha, posOf }
   */
  L.render = function (ctx, sc, cam, W, H, opts) {
    const w = Math.max(1, Math.ceil(W)), h = Math.max(1, Math.ceil(H));
    const viewers = opts.viewers;
    if (!viewers && sc.light.global) return; // mestre, dia: nada a escurecer
    const world = (x) => x.setTransform(cam.z, 0, 0, cam.z, -cam.x * cam.z, -cam.y * cam.z);
    const srcs = sources(sc, opts.posOf);
    const diag = Math.hypot(sc.cols * sc.grid, sc.rows * sc.grid) * 1.5;

    // Áreas iluminadas (máscara branca)
    const [litC, lit] = canvasN(0, w, h);
    world(lit);
    if (sc.light.global) { lit.fillStyle = '#fff'; lit.fillRect(-1e5, -1e5, 2e5, 2e5); } else drawLights(lit, sc, srcs);

    // Área vista = iluminado ∩ linha de visão (+ visão no escuro)
    const [seenC, seen] = canvasN(1, w, h);
    if (viewers && viewers.length) {
      const [tmpC, tmp] = canvasN(2, w, h);
      for (const v of viewers) {
        tmp.setTransform(1, 0, 0, 1, 0, 0);
        tmp.globalCompositeOperation = 'source-over';
        tmp.clearRect(0, 0, w, h);
        tmp.drawImage(litC, 0, 0);
        world(tmp);
        const c = opts.posOf ? opts.posOf(v) : center(sc, v);
        const dv = (Number(v.darkvision) || 0) * sc.grid;
        if (dv) {
          const g = tmp.createRadialGradient(c.x, c.y, 0, c.x, c.y, dv);
          g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.9, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          tmp.fillStyle = g;
          tmp.fillRect(c.x - dv, c.y - dv, dv * 2, dv * 2);
        }
        tmp.globalCompositeOperation = 'destination-in';
        polyPath(tmp, visibility(sc, c.x, c.y, diag, L.eyeOf(v)));
        tmp.fillStyle = '#fff';
        tmp.fill();
        seen.drawImage(tmpC, 0, 0);
      }
    } else seen.drawImage(litC, 0, 0);

    // Escuridão = tudo menos a área vista
    const [darkC, dark] = canvasN(3, w, h);
    dark.fillStyle = '#040406';
    dark.fillRect(0, 0, w, h);
    dark.globalCompositeOperation = 'destination-out';
    dark.drawImage(seenC, 0, 0);

    ctx.save();
    // brilho quente das fontes de luz (só no escuro)
    if (!sc.light.global && srcs.length) {
      ctx.save();
      const k = ctx.getTransform().a; // dpr
      ctx.setTransform(k * cam.z, 0, 0, k * cam.z, -cam.x * cam.z * k, -cam.y * cam.z * k);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of srcs) {
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.dim);
        g.addColorStop(0, 'rgba(255,170,80,0.16)'); g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.save();
        polyPath(ctx, visibility(sc, l.x, l.y, l.dim, lightH(l) || undefined));
        ctx.clip();
        ctx.fillStyle = g;
        ctx.fillRect(l.x - l.dim, l.y - l.dim, l.dim * 2, l.dim * 2);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.drawImage(darkC, 0, 0, W, H);
    ctx.restore();
  };

  // Paredes a partir dos desenhos (linhas, retângulos, traços livres e círculos)
  L.wallsFromDrawings = function (sc) {
    const out = [], add = (x1, y1, x2, y2) => { if (Math.hypot(x2 - x1, y2 - y1) > 2) out.push({ id: U.uid('w_'), x1, y1, x2, y2 }); };
    for (const d of sc.drawings) {
      if (d.type === 'line') add(d.x1, d.y1, d.x2, d.y2);
      else if (d.type === 'rect') {
        const x1 = Math.min(d.x1, d.x2), y1 = Math.min(d.y1, d.y2), x2 = Math.max(d.x1, d.x2), y2 = Math.max(d.y1, d.y2);
        add(x1, y1, x2, y1); add(x2, y1, x2, y2); add(x2, y2, x1, y2); add(x1, y2, x1, y1);
      } else if (d.type === 'ellipse') {
        const cx = (d.x1 + d.x2) / 2, cy = (d.y1 + d.y2) / 2, rx = Math.abs(d.x2 - d.x1) / 2, ry = Math.abs(d.y2 - d.y1) / 2;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2, b = ((i + 1) / 20) * Math.PI * 2;
          add(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cx + Math.cos(b) * rx, cy + Math.sin(b) * ry);
        }
      } else if (d.type === 'path') {
        const p = d.points, step = 8;
        let lx = p[0], ly = p[1];
        for (let i = step; i < p.length; i += step) { add(lx, ly, p[i], p[i + 1]); lx = p[i]; ly = p[i + 1]; }
        if (p.length >= 4) add(lx, ly, p[p.length - 2], p[p.length - 1]);
      }
    }
    return out;
  };

  App.Light = L;
})(window.App);
