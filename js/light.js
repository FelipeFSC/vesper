'use strict';
/*
 * Iluminação dinâmica.
 * - Parede absoluta e portas fechadas bloqueiam tudo. Cobertura total (muro alto) bloqueia a luz e a visão de quem não é mais alto que ele.
 *   Muros de ¾ e meia deixam a luz passar e só tapam a visão de quem é baixo (ver Combat.coverOf).
 * - Três níveis de luz: 2 = luz plena, 1 = meia luz, 0 = escuridão. A visão no escuro sobe um nível no alcance dela.
 * - Fontes: tokens (t.light = {bright, dim, shape, angle, color, tint, flicker}; o cone aponta para t.facing)
 *   e pontos de luz da cena (sc.lights: círculo, cone ou área). Pontos de escuridão (kind 'dark') baixam o nível:
 *   o miolo vira escuridão e a borda fica, no máximo, em meia luz.
 * - Ambiente claro (sc.light.global): tudo em luz plena (menos onde há escuridão), mas as paredes ainda cortam a linha de visão.
 * - Jogador vê só o que está em meia luz ou mais E na linha de visão de algum token dele.
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;
  const DEG = Math.PI / 180;
  const SOFT = 10 * DEG; // borda de meia luz nas laterais do cone
  const WARM = '#ffb45a';

  const PRESETS = [
    { id: 'none', label: 'Sem luz', bright: 0, dim: 0 },
    { id: 'candle', label: 'Vela', bright: 1, dim: 2, flicker: true },
    { id: 'torch', label: 'Tocha', bright: 4, dim: 8, flicker: true },
    { id: 'lantern', label: 'Lanterna', bright: 6, dim: 12 },
    { id: 'bonfire', label: 'Fogueira', bright: 8, dim: 16, flicker: true },
  ];
  // Presets dos pontos de luz no mapa
  const POINT_PRESETS = [
    { id: 'candle', label: 'Vela', shape: 'circle', bright: 1, dim: 2, flicker: true },
    { id: 'torch', label: 'Tocha', shape: 'circle', bright: 4, dim: 8, flicker: true },
    { id: 'lantern', label: 'Lanterna', shape: 'circle', bright: 6, dim: 12, flicker: false },
    { id: 'bonfire', label: 'Fogueira', shape: 'circle', bright: 8, dim: 16, flicker: true },
    { id: 'spot', label: 'Holofote', shape: 'cone', bright: 6, dim: 10, angle: 50, flicker: false },
    { id: 'room', label: 'Sala acesa', shape: 'area', edge: 0, flicker: false },
  ];
  const COLORS = [['#ffb45a', 'Quente'], ['#ffffff', 'Branca'], ['#8fb4ff', 'Lua'], ['#6fe08a', 'Verde'], ['#ff5a4f', 'Vermelha'], ['#b07cff', 'Roxa']];
  const DARKVISION = [[0, 'Não'], [6, '6 quadrados'], [12, '12 quadrados'], [24, '24 quadrados']];
  const LEVELS = ['Escuridão', 'Meia luz', 'Luz plena'];

  const L = { PRESETS, POINT_PRESETS, COLORS, DARKVISION, LEVELS, WARM, segKey: '', segs: [], walls: [], low: [], byEye: new Map(), cache: new Map(), canvases: [], areaCache: new Map() };

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
    L.areaCache.clear();
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
    if (L.cache.size > 600) L.cache.clear();
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

  // ---------- geometria ----------
  function inPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function distSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
    const t = l ? U.clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1) : 0;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function polyDist(px, py, pts) {
    let d = Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) d = Math.min(d, distSeg(px, py, pts[j][0], pts[j][1], pts[i][0], pts[i][1]));
    return d;
  }
  function bbox(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }
  // Centro da área (média dos cantos): onde fica o marcador
  L.areaCenter = (pts) => ({ x: pts.reduce((s, p) => s + p[0], 0) / pts.length, y: pts.reduce((s, p) => s + p[1], 0) / pts.length });
  L.inPoly = inPoly;
  const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
  const seedOf = (id) => { let h = 0; for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) % 9973; return h / 97; };
  function rgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 180, 90];
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${U.clamp(a, 0, 1)})`;

  // ---------- fontes ----------
  function tokenSource(sc, t, posOf) {
    const li = t.light;
    if (!li || !(Number(li.dim) > 0 || Number(li.bright) > 0)) return null;
    const c = posOf ? posOf(t) : center(sc, t), g = sc.grid;
    const dim = Math.max(Number(li.dim) || 0, Number(li.bright) || 0) * g;
    const cone = li.shape === 'cone';
    return { id: t.id, t, kind: 'light', shape: cone ? 'cone' : 'circle', x: c.x, y: c.y, dim,
      bright: Math.min(Number(li.bright) || 0, Number(li.dim) || li.bright || 0) * g,
      dir: (Number(t.facing) || 0) * DEG, half: (U.clamp(Number(li.angle) || 60, 10, 340) / 2) * DEG, soft: SOFT,
      color: li.color || WARM, tint: li.tint ?? 0.4, flicker: !!li.flicker, seed: seedOf(t.id) };
  }
  function pointSource(sc, o) {
    if (!o || o.on === false) return null;
    const g = sc.grid, dark = o.kind === 'dark';
    const s = { id: o.id, kind: dark ? 'dark' : 'light', shape: o.shape === 'cone' || o.shape === 'area' ? o.shape : 'circle', x: Number(o.x) || 0, y: Number(o.y) || 0,
      color: o.color || WARM, tint: o.tint ?? 0.4, flicker: !dark && !!o.flicker, seed: seedOf(o.id) };
    if (s.shape === 'area') {
      if (!Array.isArray(o.pts) || o.pts.length < 3) return null;
      s.pts = o.pts; s.edge = Math.max(0, Number(o.edge) || 0) * g;
      return s;
    }
    s.dim = Math.max(Number(o.dim) || 0, Number(o.bright) || 0) * g;
    if (!(s.dim > 0)) return null;
    s.bright = U.clamp(Number(o.bright) || 0, 0, s.dim / g) * g;
    s.dir = (Number(o.dir) || 0) * DEG;
    s.half = (U.clamp(Number(o.angle) || 60, 10, 340) / 2) * DEG;
    s.soft = SOFT;
    return s;
  }
  // Todas as fontes da cena (tokens com luz e pontos acesos)
  function sources(sc, posOf) {
    const out = [];
    for (const t of Object.values(sc.tokens)) { const s = tokenSource(sc, t, posOf); if (s) out.push(s); }
    for (const o of sc.lights || []) { const s = pointSource(sc, o); if (s) out.push(s); }
    return out;
  }
  L.sources = sources;

  // Pontos de dentro da área de onde a luz "sai" (assim as paredes fazem sombra e a luz não vaza)
  function areaSamples(sc, s) {
    prepare(sc);
    const key = s.id + ':' + JSON.stringify(s.pts);
    let out = L.areaCache.get(key);
    if (out) return out;
    const b = bbox(s.pts), area = Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
    const step = Math.max(sc.grid, Math.sqrt(area / 16));
    out = [];
    for (let y = b.y0 + step / 2; y < b.y1; y += step) for (let x = b.x0 + step / 2; x < b.x1; x += step) if (inPoly(x, y, s.pts)) out.push({ x, y });
    if (!out.length) {
      const c = L.areaCenter(s.pts);
      out.push(inPoly(c.x, c.y, s.pts) ? c : { x: s.pts[0][0] * 0.9 + c.x * 0.1, y: s.pts[0][1] * 0.9 + c.y * 0.1 });
    }
    const R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) + s.edge + sc.grid;
    out = out.slice(0, 25).map((q) => ({ x: q.x, y: q.y, R }));
    if (L.areaCache.size > 200) L.areaCache.clear();
    L.areaCache.set(key, out);
    return out;
  }

  /*
   * Nível de uma fonte num ponto: 2 = plena, 1 = meia, 0 = nada.
   * (Para a escuridão: 2 = miolo, 1 = borda.)
   */
  function levelOf(sc, s, p, targetTop) {
    const eye = Math.max(lightH(s), targetTop || 0) || undefined;
    if (s.shape === 'area') {
      const lvl = inPoly(p.x, p.y, s.pts) ? 2 : (s.edge > 0 && polyDist(p.x, p.y, s.pts) <= s.edge ? 1 : 0);
      if (!lvl) return 0;
      return areaSamples(sc, s).some((q) => !blocked(sc, q.x, q.y, p.x, p.y, eye)) ? lvl : 0;
    }
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d > s.dim) return 0;
    let lvl = d <= s.bright ? 2 : 1;
    if (s.shape === 'cone' && d > 1) {
      const da = angDiff(Math.atan2(p.y - s.y, p.x - s.x), s.dir);
      if (da > s.half + s.soft) return 0;
      if (da > s.half) lvl = 1;
    }
    return blocked(sc, s.x, s.y, p.x, p.y, eye) ? 0 : lvl;
  }
  L.levelOf = levelOf;

  // Nível de luz no ponto (sem contar a visão no escuro de ninguém)
  function levelAt(sc, p, posOf, targetTop, srcs) {
    srcs = srcs || sources(sc, posOf);
    let lv = sc.light.global ? 2 : 0;
    if (lv < 2) for (const s of srcs) { if (s.kind !== 'dark') { lv = Math.max(lv, levelOf(sc, s, p, targetTop)); if (lv === 2) break; } }
    for (const s of srcs) {
      if (!lv) break;
      if (s.kind === 'dark') { const d = levelOf(sc, s, p, targetTop); if (d) lv = Math.min(lv, 2 - d); }
    }
    return lv;
  }
  L.levelAt = levelAt;
  // Nível que um token enxerga no ponto (a visão no escuro sobe um nível dentro do alcance dela)
  L.levelFor = function (sc, p, viewer, posOf) {
    const lv = levelAt(sc, p, posOf);
    if (!viewer) return lv;
    const c = posOf ? posOf(viewer) : center(sc, viewer), dv = (Number(viewer.darkvision) || 0) * sc.grid;
    return dv && Math.hypot(p.x - c.x, p.y - c.y) <= dv ? Math.min(2, lv + 1) : lv;
  };

  // Quem "enxerga" para este cliente: tokens do jogador (ou do jogador que o mestre está simulando)
  L.viewers = (sc) => Object.values(sc.tokens).filter((t) => S().canControl(t));

  // Ponto visível para o conjunto de "olhos"? (meia luz ou mais, contando a visão no escuro)
  // targetTop: topo do alvo quando ele voa (vê-se por cima dos muros mais baixos; a luz também chega)
  L.pointVisible = function (sc, p, viewers, posOf, targetTop) {
    let lv = null;
    const lit = () => (lv == null ? (lv = levelAt(sc, p, posOf, targetTop)) : lv);
    if (!viewers.length) return lit() >= 1;
    for (const v of viewers) {
      const c = posOf ? posOf(v) : center(sc, v);
      if (blocked(sc, c.x, c.y, p.x, p.y, Math.max(L.eyeOf(v), targetTop || 0))) continue;
      if (lit() >= 1) return true;
      const dv = (Number(v.darkvision) || 0) * sc.grid;
      if (dv && Math.hypot(p.x - c.x, p.y - c.y) <= dv) return true; // escuridão + visão no escuro = meia luz
    }
    return false;
  };

  // Alguma luz tremulando na cena? (o tabuleiro mantém a animação rodando)
  L.flickering = (sc) => active(sc) && !sc.light.global && (Object.values(sc.tokens).some((t) => t.light && t.light.flicker && Number(t.light.dim) > 0)
    || (sc.lights || []).some((o) => o.flicker && o.on !== false && o.kind !== 'dark'));
  // Fator do tremor (raio e intensidade oscilam um pouco)
  const flick = (s, now) => (s.flicker ? 1 + 0.035 * Math.sin(now * 0.0093 + s.seed) + 0.022 * Math.sin(now * 0.0231 + s.seed * 1.7) + 0.012 * Math.sin(now * 0.051 + s.seed * 0.3) : 1);

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
  function ptsPath(x, pts, fresh = true) {
    if (fresh) x.beginPath();
    pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.closePath();
  }
  /*
   * Pinta a forma de uma fonte com três cores: cFull (miolo, nível 2), cHalf (borda, nível 1) e cZero (fora).
   * Recorta pelas paredes (polígono de visibilidade). x está em coordenadas do mundo.
   */
  function paint(x, sc, s, cFull, cHalf, cZero, f) {
    if (s.shape === 'area') {
      const samples = areaSamples(sc, s);
      x.save();
      x.beginPath();
      for (const q of samples) {
        const poly = visibility(sc, q.x, q.y, q.R);
        x.moveTo(poly[0], poly[1]);
        for (let i = 2; i < poly.length; i += 2) x.lineTo(poly[i], poly[i + 1]);
        x.closePath();
      }
      x.clip(); // união: todos os polígonos giram no mesmo sentido (regra nonzero)
      x.fillStyle = cFull; ptsPath(x, s.pts); x.fill();
      if (s.edge > 0) {
        x.save();
        x.beginPath(); x.rect(-1e6, -1e6, 2e6, 2e6); ptsPath(x, s.pts, false); x.clip('evenodd'); // só do lado de fora
        x.lineJoin = 'round'; x.lineWidth = s.edge * 2; x.strokeStyle = cHalf;
        ptsPath(x, s.pts); x.stroke();
        x.restore();
      }
      x.restore();
      return;
    }
    const R = s.dim * f, b = R > 0 ? U.clamp((s.bright * f) / R, 0, 0.95) : 0;
    const poly = visibility(sc, s.x, s.y, s.flicker ? s.dim * 1.1 : s.dim, lightH(s) || undefined);
    const grad = (onlyHalf) => {
      const g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      if (!onlyHalf && b > 0) { g.addColorStop(0, cFull); g.addColorStop(b, cFull); g.addColorStop(Math.min(0.96, b + 0.03), cHalf); } else g.addColorStop(0, cHalf);
      g.addColorStop(0.97, cHalf); g.addColorStop(1, cZero);
      return g;
    };
    x.save();
    polyPath(x, poly);
    x.clip();
    if (s.shape === 'cone') {
      const wedge = (a0, a1) => { x.beginPath(); x.moveTo(s.x, s.y); x.arc(s.x, s.y, R + 1, a0, a1); x.closePath(); };
      x.fillStyle = grad(false); wedge(s.dir - s.half, s.dir + s.half); x.fill();
      x.fillStyle = grad(true);
      wedge(s.dir - s.half - s.soft, s.dir - s.half); x.fill();
      wedge(s.dir + s.half, s.dir + s.half + s.soft); x.fill();
    } else {
      x.fillStyle = grad(false);
      x.fillRect(s.x - R, s.y - R, R * 2, R * 2);
    }
    x.restore();
  }

  /*
   * Desenha a luz sobre o mapa. ctx está em coordenadas de tela (CSS px); cam = câmera do tabuleiro.
   * A máscara é em tons de cinza (branco = luz plena, cinza = meia luz, preto = escuridão) e escurece o mapa por multiplicação.
   * opts = { viewers: [...] | null, alpha, posOf }
   */
  L.render = function (ctx, sc, cam, W, H, opts) {
    const w = Math.max(1, Math.ceil(W)), h = Math.max(1, Math.ceil(H));
    const viewers = opts.viewers;
    const srcs = sources(sc, opts.posOf);
    const darks = srcs.filter((s) => s.kind === 'dark'), lights = srcs.filter((s) => s.kind !== 'dark');
    if (!viewers && sc.light.global && !darks.length) return; // mestre, dia, sem escuridão: nada a escurecer
    const world = (x) => x.setTransform(cam.z, 0, 0, cam.z, -cam.x * cam.z, -cam.y * cam.z);
    const diag = Math.hypot(sc.cols * sc.grid, sc.rows * sc.grid) * 1.5;
    const now = performance.now();

    // Máscara de luz: preto no escuro (ou branco de dia); luzes clareiam (lighten), escuridões escurecem (darken)
    const [litC, lit] = canvasN(0, w, h);
    lit.fillStyle = sc.light.global ? '#fff' : '#000';
    lit.fillRect(0, 0, w, h);
    world(lit);
    if (!sc.light.global) {
      lit.globalCompositeOperation = 'lighten';
      for (const s of lights) paint(lit, sc, s, '#ffffff', '#808080', 'rgba(128,128,128,0)', flick(s, now));
    }
    lit.globalCompositeOperation = 'darken';
    for (const s of darks) paint(lit, sc, s, '#000000', '#808080', 'rgba(128,128,128,0)', 1);

    // Área vista = luz ∩ linha de visão (a visão no escuro sobe um nível)
    let seenC = litC;
    if (viewers && viewers.length) {
      const [sC, seen] = canvasN(1, w, h);
      seenC = sC;
      seen.fillStyle = '#000'; seen.fillRect(0, 0, w, h);
      seen.globalCompositeOperation = 'lighten';
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
          g.addColorStop(0, '#808080'); g.addColorStop(0.96, '#808080'); g.addColorStop(1, 'rgba(128,128,128,0)');
          tmp.globalCompositeOperation = 'lighter';
          tmp.fillStyle = g;
          tmp.fillRect(c.x - dv, c.y - dv, dv * 2, dv * 2);
        }
        tmp.globalCompositeOperation = 'destination-in';
        polyPath(tmp, visibility(sc, c.x, c.y, diag, L.eyeOf(v)));
        tmp.fillStyle = '#fff';
        tmp.fill();
        seen.drawImage(tmpC, 0, 0);
      }
    }

    ctx.save();
    // Cor das luzes (só no escuro): tinge o chão e dá um brilho leve; a escuridão aplicada depois apaga o que ninguém vê
    if (!sc.light.global && lights.length) {
      ctx.save();
      const k = ctx.getTransform().a; // dpr
      ctx.setTransform(k * cam.z, 0, 0, k * cam.z, -cam.x * cam.z * k, -cam.y * cam.z * k);
      for (const s of lights) {
        const c = rgb(s.color), f = flick(s, now), a = (s.tint ?? 0.4) * (s.flicker ? 0.9 + (f - 1) * 3 : 1);
        if (a <= 0) continue;
        ctx.globalCompositeOperation = 'soft-light';
        paint(ctx, sc, s, rgba(c, a), rgba(c, a * 0.6), rgba(c, 0), f);
        ctx.globalCompositeOperation = 'lighter';
        paint(ctx, sc, s, rgba(c, a * 0.4), rgba(c, a * 0.2), rgba(c, 0), f);
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.drawImage(seenC, 0, 0, W, H);
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
