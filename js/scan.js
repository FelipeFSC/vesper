'use strict';
/*
 * Scan de paredes e portas (Plano 22). Tudo no navegador do mestre: a imagem não sai do computador.
 *
 * 1. A imagem do mapa é lida reduzida (~20 px por quadrado).
 * 2. Máscara do que NÃO é chão:
 *    - outside = "lado de fora": inundação a partir dos cliques no vazio (só o que está ligado a ele, com cor parecida);
 *    - wall = cor da parede (linhas desenhadas): usa o meio da linha (afinamento);
 *    - dark = o que for bem escuro;
 *    - floor = chão das salas (Plano 34): inundação a partir de cliques no chão; a borda do chão vira parede.
 *    "Ignorar textura" borra a imagem antes (raio maior = rocha e lajotas viram manchas lisas).
 * 3. Contorno → linhas simplificadas → (Retas) encaixadas no grid e em 0°/45°/90°.
 * 4. Portas por exemplo: o desenho que o mestre mostrou é procurado no mapa (4 giros + espelho).
 * O cálculo pesado roda num Web Worker criado a partir do texto de CORE (sem arquivo extra); sync = no próprio thread.
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;

  // ===================== núcleo (roda no worker ou aqui) =====================
  function CORE() {
    const C = {};
    // desfoque 3×3 (tira a textura do chão e do vazio)
    C.blur = function (img) {
      const { w, h, data } = img, out = new Uint8ClampedArray(data.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0, n = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              const i = (yy * w + xx) * 4;
              r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
            }
          }
          const o = (y * w + x) * 4;
          out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
        }
      }
      return { w, h, data: out };
    };
    // Desfoque de caixa com raio r (horizontal + vertical, duas vezes): tira a textura de rocha, neve e lajotas
    C.boxBlur = function (img, r) {
      const { w, h } = img;
      let src = img.data;
      const pass = (a, horiz) => {
        const out = new Uint8ClampedArray(a.length), n = horiz ? w : h, m = horiz ? h : w;
        for (let j = 0; j < m; j++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0, cnt = 0;
            const at = (i) => (horiz ? (j * w + i) : (i * w + j)) * 4 + c;
            for (let i = 0; i <= Math.min(r, n - 1); i++) { sum += a[at(i)]; cnt++; }
            for (let i = 0; i < n; i++) {
              out[at(i)] = sum / cnt;
              const add = i + r + 1, del = i - r;
              if (add < n) { sum += a[at(add)]; cnt++; }
              if (del >= 0) { sum -= a[at(del)]; cnt--; }
            }
          }
          for (let i = 0; i < n; i++) out[(horiz ? (j * w + i) : (i * w + j)) * 4 + 3] = 255;
        }
        return out;
      };
      for (let k = 0; k < 2; k++) src = pass(pass(src, true), false);
      return { w, h, data: src };
    };
    // Força da borda em cada pixel (diferença de brilho e de tom com os vizinhos), na imagem já borrada
    C.edges = function (img) {
      const { w, h, data } = img, e = new Float32Array(w * h);
      const Y = new Float32Array(w * h), U2 = new Float32Array(w * h), V = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) { const o = i * 4, y = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]; Y[i] = y; U2[i] = (data[o + 2] - y) * 1.5; V[i] = (data[o] - y) * 1.5; }
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        let g = 0;
        for (const A of [Y, U2, V]) { const gx = A[i + 1] - A[i - 1], gy = A[i + w] - A[i - w]; g += gx * gx + gy * gy; }
        e[i] = Math.sqrt(g);
      }
      return e;
    };
    // Chão das salas: cada clique inunda a sala dele até bater numa borda forte (o contorno da parede).
    // A cor também conta, mas com folga larga (só impede de vazar para algo bem diferente, como a neve lá fora)
    // edgePct (0–1): a borda que barra o chão é a deste ponto da lista das bordas do mapa (0,8 = as 20% mais fortes)
    C.floorMask = function (img, seeds, tol, edgePct, cell) {
      const { w, h, data } = img, m = new Uint8Array(w * h).fill(1), q = new Int32Array(w * h), E = C.edges(img);
      // as bordas de perto dos cliques (o interior das salas), não as do mapa todo (rocha e neve têm bordas fortes demais)
      const smp = [], R = Math.max(20, Math.round(Math.sqrt(w * h) * 0.08));
      for (const [sx, sy] of seeds) for (let y = Math.max(0, sy - R); y < Math.min(h, sy + R); y += 2) for (let x = Math.max(0, sx - R); x < Math.min(w, sx + R); x += 2) smp.push(E[y * w + x]);
      if (!smp.length) for (let i = 0; i < E.length; i += 7) smp.push(E[i]);
      smp.sort((a, b) => a - b);
      const edgeT = smp[Math.min(smp.length - 1, Math.floor(smp.length * edgePct))] || 1e9;
      const tol2 = (tol * 1.15) ** 2;
      for (const [sx, sy] of seeds) {
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const s0 = sy * w + sx;
        if (!m[s0]) continue;
        const cols = toYc([C.colorAt(img, sx, sy, 4)]);
        let qh = 0, qt = 0;
        m[s0] = 0; q[qt++] = s0;
        while (qh < qt) {
          const i = q[qh++], x = i % w, y = (i - x) / w;
          const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
          for (const j of nb) { if (j < 0 || !m[j] || E[j] > edgeT || !near(data, j * 4, cols, tol2)) continue; m[j] = 0; q[qt++] = j; }
        }
      }
      // 2ª etapa: o chão avança mais um pouco (até ~0,6 quadrado), parando só nas bordas mais fortes (o contorno da parede)
      const edgeT2 = smp[Math.min(smp.length - 1, Math.floor(smp.length * Math.min(0.97, edgePct + 0.12)))] || edgeT;
      const steps = Math.max(2, Math.round((cell || 20) * 0.6)), guard2 = (tol * 1.4) ** 2, ref = toYc(seeds.map(([x, y]) => C.colorAt(img, Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y)), 4)));
      let front = [];
      for (let i = 0; i < w * h; i++) if (!m[i]) { const x = i % w; if ((x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (i >= w && m[i - w]) || (i < w * (h - 1) && m[i + w])) front.push(i); }
      for (let k = 0; k < steps && front.length; k++) {
        const next = [];
        for (const i of front) {
          const x = i % w, y = (i - x) / w;
          const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
          for (const j of nb) { if (j < 0 || !m[j] || E[j] > edgeT2 || !near(data, j * 4, ref, guard2)) continue; m[j] = 0; next.push(j); }
        }
        front = next;
      }
      // alisar: fecha dentes e frestas pequenas (dilata e encolhe o chão)
      const rad = Math.max(1, Math.round((cell || 20) * 0.2));
      const morph = (src, grow) => {
        const out = new Uint8Array(src.length);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          let any = false;
          for (let dy = -rad; dy <= rad && !any; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -rad; dx <= rad; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; if ((src[yy * w + xx] === 0) === grow) { any = true; break; } } }
          out[y * w + x] = grow ? (any ? 0 : 1) : (any ? 1 : 0);
        }
        return out;
      };
      const closed = morph(morph(m, true), false);
      closed.edgeT = edgeT; closed.edgeT2 = edgeT2;
      return closed;
    };
    C.colorAt = function (img, x, y, r) {
      r = r || 2;
      let R = 0, G = 0, B = 0, n = 0;
      for (let yy = Math.max(0, y - r); yy <= Math.min(img.h - 1, y + r); yy++) {
        for (let xx = Math.max(0, x - r); xx <= Math.min(img.w - 1, x + r); xx++) {
          const i = (yy * img.w + xx) * 4;
          R += img.data[i]; G += img.data[i + 1]; B += img.data[i + 2]; n++;
        }
      }
      return n ? [R / n, G / n, B / n] : [0, 0, 0];
    };
    // Distância de cor que pesa mais o TOM do que o brilho (azul escuro × cinza escuro são bem diferentes)
    const yc = (r, g, b) => { const Y = 0.299 * r + 0.587 * g + 0.114 * b; return [Y, (b - Y) * 3, (r - Y) * 3]; };
    const near = (d, i, cols, tol2) => {
      const [Y, Cb, Cr] = yc(d[i], d[i + 1], d[i + 2]);
      for (const c of cols) { const a = Y - c[0], b = Cb - c[1], e = Cr - c[2]; if (a * a + b * b + e * e <= tol2) return true; }
      return false;
    };
    const toYc = (cols) => cols.map((c) => yc(c[0], c[1], c[2]));
    // Lado de fora: inunda a partir das sementes, comparando com a cor das sementes (não com o vizinho: não vaza)
    C.outsideMask = function (img, seeds, tol) {
      const { w, h, data } = img, m = new Uint8Array(w * h), tol2 = tol * tol;
      const cols = toYc(seeds.map((s) => C.colorAt(img, s[0], s[1], 2)));
      const q = new Int32Array(w * h);
      let qh = 0, qt = 0;
      for (const [x, y] of seeds) { if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = y * w + x; if (!m[i]) { m[i] = 1; q[qt++] = i; } }
      while (qh < qt) {
        const i = q[qh++], x = i % w, y = (i - x) / w;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
        for (const j of nb) { if (j < 0 || m[j]) continue; if (near(data, j * 4, cols, tol2)) { m[j] = 1; q[qt++] = j; } }
      }
      return m;
    };
    C.colorMask = function (img, colors, tol) {
      const { w, h, data } = img, m = new Uint8Array(w * h), tol2 = tol * tol, cols = toYc(colors);
      for (let i = 0; i < w * h; i++) if (near(data, i * 4, cols, tol2)) m[i] = 1;
      return m;
    };
    C.darkMask = function (img, lum) {
      const { w, h, data } = img, m = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) { const o = i * 4; if (0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2] < lum) m[i] = 1; }
      return m;
    };
    // Tira ilhas pequenas (manchas de 0 ou de 1 com menos de min pixels viram o outro valor)
    C.despeckle = function (m, w, h, min, minOn) {
      const seen = new Uint8Array(w * h), q = new Int32Array(w * h);
      for (let s = 0; s < w * h; s++) {
        if (seen[s]) continue;
        const v = m[s];
        let qh = 0, qt = 0;
        q[qt++] = s; seen[s] = 1;
        while (qh < qt) {
          const i = q[qh++], x = i % w, y = (i - x) / w;
          const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
          for (const j of nb) if (j >= 0 && !seen[j] && m[j] === v) { seen[j] = 1; q[qt++] = j; }
        }
        if (qt < (v ? minOn || min : min)) for (let k = 0; k < qt; k++) m[q[k]] = v ? 0 : 1;
      }
      return m;
    };
    // Bordas entre chão (0) e não-chão (1) nos cantos dos pixels, encadeadas em laços (chão à esquerda)
    C.loops = function (m, w, h) {
      const solid = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : m[y * w + x]);
      const out = new Map(), key = (x, y) => y * (w + 1) + x;
      const add = (x1, y1, x2, y2) => { const k = key(x1, y1); let l = out.get(k); if (!l) { l = []; out.set(k, l); } l.push([x2, y2]); };
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (m[y * w + x]) continue; // só pixels de chão
          if (solid(x, y - 1) === 1) add(x + 1, y, x, y);         // em cima: anda para a esquerda
          if (solid(x, y + 1) === 1) add(x, y + 1, x + 1, y + 1); // embaixo: para a direita
          if (solid(x - 1, y) === 1) add(x, y, x, y + 1);         // à esquerda: para baixo
          if (solid(x + 1, y) === 1) add(x + 1, y + 1, x + 1, y); // à direita: para cima
        }
      }
      const res = [];
      for (const [k0, list] of out) {
        while (list.length) {
          const sx = k0 % (w + 1), sy = (k0 - sx) / (w + 1);
          const pts = [[sx, sy]];
          let [cx, cy] = list.pop(), guard = 0, closed = false;
          while (guard++ < 1e6) {
            pts.push([cx, cy]);
            if (cx === sx && cy === sy) { closed = true; break; }
            const l = out.get(key(cx, cy));
            if (!l || !l.length) break; // chão encostado na borda da imagem: o contorno fica aberto
            [cx, cy] = l.pop();
          }
          if (pts.length > 3) res.push({ pts, closed });
        }
      }
      return res;
    };
    // Afinamento (Zhang-Suen): a linha grossa da parede vira o meio dela
    C.thin = function (m, w, h) {
      const a = Uint8Array.from(m), del = [];
      const P = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[y * w + x]);
      let changed = true, it = 0;
      while (changed && it++ < 60) {
        changed = false;
        for (const step of [0, 1]) {
          del.length = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (!a[y * w + x]) continue;
              const p2 = P(x, y - 1), p3 = P(x + 1, y - 1), p4 = P(x + 1, y), p5 = P(x + 1, y + 1), p6 = P(x, y + 1), p7 = P(x - 1, y + 1), p8 = P(x - 1, y), p9 = P(x - 1, y - 1);
              const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
              if (B < 2 || B > 6) continue;
              const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
              let A = 0;
              for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) A++;
              if (A !== 1) continue;
              if (step === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
              del.push(y * w + x);
            }
          }
          if (del.length) { changed = true; for (const i of del) a[i] = 0; }
        }
      }
      return a;
    };
    // Esqueleto → linhas (de ponta a ponta, ou de cruzamento a cruzamento)
    C.trace = function (a, w, h) {
      const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[y * w + x];
      const nbs = (x, y) => { const o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && on(x + dx, y + dy)) o.push([x + dx, y + dy]); return o; };
      const used = new Set(), ek = (i, j) => (i < j ? i + ',' + j : j + ',' + i);
      const deg = (x, y) => nbs(x, y).length;
      const res = [];
      const walk = (x0, y0, x1, y1) => {
        const pts = [[x0, y0]];
        let px = x0, py = y0, cx = x1, cy = y1;
        used.add(ek(py * w + px, cy * w + cx));
        for (let g = 0; g < 1e6; g++) {
          pts.push([cx, cy]);
          if (deg(cx, cy) !== 2) break;
          const nx = nbs(cx, cy).find(([x, y]) => !(x === px && y === py) && !used.has(ek(cy * w + cx, y * w + x)));
          if (!nx) break;
          used.add(ek(cy * w + cx, nx[1] * w + nx[0]));
          px = cx; py = cy; [cx, cy] = nx;
        }
        return pts;
      };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!a[y * w + x] || deg(x, y) === 2) continue;
        for (const [nx, ny] of nbs(x, y)) if (!used.has(ek(y * w + x, ny * w + nx))) { const p = walk(x, y, nx, ny); if (p.length > 2) res.push(p); }
      }
      // laços fechados (sem ponta)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!a[y * w + x]) continue;
        for (const [nx, ny] of nbs(x, y)) if (!used.has(ek(y * w + x, ny * w + nx))) { const p = walk(x, y, nx, ny); if (p.length > 4) res.push(p); }
      }
      return res.map((p) => p.map(([x, y]) => [x + 0.5, y + 0.5]));
    };
    // Douglas-Peucker
    C.rdp = function (pts, eps) {
      if (pts.length < 3) return pts.slice();
      const keep = new Uint8Array(pts.length);
      keep[0] = keep[pts.length - 1] = 1;
      const st = [[0, pts.length - 1]];
      while (st.length) {
        const [a, b] = st.pop();
        const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
        let md = -1, mi = -1;
        for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > md) { md = d; mi = i; } }
        if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
      }
      return pts.filter((_, i) => keep[i]);
    };
    // Laço fechado: começa no ponto mais longe do primeiro (o Douglas-Peucker precisa de duas pontas fixas)
    C.rdpLoop = function (pts, eps) {
      const n = pts.length - 1;
      if (n < 4) return pts;
      let far = 0, fd = -1;
      for (let i = 0; i < n; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
      const a = C.rdp(pts.slice(0, far + 1), eps), b = C.rdp(pts.slice(far, n + 1), eps);
      return a.concat(b.slice(1));
    };
    C.walls = function (img0, o) {
      const img = o.smooth > 0 ? C.boxBlur(img0, o.smooth) : C.blur(img0), { w, h } = img, out = [];
      // minK = quantas vezes o tamanho mínimo padrão (1 = como antes)
      const cell2 = o.cell * o.cell, k = o.minK || 1, minA = Math.max(4, cell2 * 0.1 * k), holeA = Math.max(8, cell2 * 1.5 * k);
      let m;
      if (o.by === 'floor') {
        // Chão (0) e o resto (1). Buracos do tamanho de móveis dentro da sala viram chão; migalhas de chão somem
        m = C.floorMask(img, o.seeds, o.tol, o.edgePct, o.cell);
        C.despeckle(m, w, h, Math.max(6, cell2 * 0.25), holeA);
        for (const p of C.loops(m, w, h)) out.push({ pts: p.closed ? C.rdpLoop(p.pts, o.eps) : C.rdp(p.pts, o.eps), closed: p.closed });
        return out;
      }
      if (o.by === 'wall' || o.by === 'dark') {
        // Linhas de parede (pela cor clicada ou pelo escuro): o meio da linha vira parede
        m = o.by === 'dark' ? C.darkMask(img, o.lum) : C.colorMask(img, o.seeds.map((s) => C.colorAt(img, s[0], s[1], 1)), o.tol);
        C.despeckle(m, w, h, Math.max(4, cell2 * 0.1), minA);
        const sk = C.thin(m, w, h);
        for (const p of C.trace(sk, w, h)) out.push({ pts: C.rdp(p, o.eps), closed: false });
        return out;
      }
      if (o.by === 'outside') {
        // Todo vazio da cor clicada (também os pátios cercados por salas); manchas pequenas dessa cor dentro das salas não contam
        const cols = o.seeds.map((s) => C.colorAt(img, s[0], s[1], 2));
        m = C.colorMask(img, cols, o.tol);
        const lone = C.outsideMask(img, o.seeds, o.tol);
        for (let i = 0; i < m.length; i++) if (lone[i]) m[i] = 1;
        C.despeckle(m, w, h, Math.max(6, cell2 * 0.25), holeA);
      }
      for (const p of C.loops(m, w, h)) out.push({ pts: p.closed ? C.rdpLoop(p.pts, o.eps) : C.rdp(p.pts, o.eps), closed: p.closed });
      return out;
    };

    // ---------- portas por exemplo ----------
    C.crop = function (img, x, y, w, h) {
      const d = new Uint8ClampedArray(w * h * 3);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const s = ((y + j) * img.w + (x + i)) * 4, t = (j * w + i) * 3;
        d[t] = img.data[s]; d[t + 1] = img.data[s + 1]; d[t + 2] = img.data[s + 2];
      }
      return { w, h, d };
    };
    // Os 8 jeitos do desenho (giros de 90° e espelho), sem repetir
    C.variants = function (t) {
      const rot = (a) => { const o = { w: a.h, h: a.w, d: new Uint8ClampedArray(a.d.length) }; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const s = (y * a.w + x) * 3, nx = a.h - 1 - y, ny = x, t2 = (ny * o.w + nx) * 3; o.d[t2] = a.d[s]; o.d[t2 + 1] = a.d[s + 1]; o.d[t2 + 2] = a.d[s + 2]; } return o; };
      const flip = (a) => { const o = { w: a.w, h: a.h, d: new Uint8ClampedArray(a.d.length) }; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const s = (y * a.w + x) * 3, t2 = (y * a.w + (a.w - 1 - x)) * 3; o.d[t2] = a.d[s]; o.d[t2 + 1] = a.d[s + 1]; o.d[t2 + 2] = a.d[s + 2]; } return o; };
      const out = [], seen = new Set();
      let a = t;
      for (let k = 0; k < 4; k++) {
        for (const v of [a, flip(a)]) { let hsh = v.w + 'x' + v.h + ':'; for (let i = 0; i < v.d.length; i += 7) hsh += v.d[i] >> 3; if (!seen.has(hsh)) { seen.add(hsh); out.push(v); } }
        a = rot(a);
      }
      return out;
    };
    // Somas acumuladas por canal (média e variância de qualquer retângulo em tempo constante)
    C.integrals = function (img) {
      if (img.__int) return img.__int;
      const { w, h, data } = img, W1 = w + 1, S = [0, 1, 2].map(() => new Float64Array(W1 * (h + 1))), Q = [0, 1, 2].map(() => new Float64Array(W1 * (h + 1)));
      for (let y = 0; y < h; y++) {
        const rs = [0, 0, 0], rq = [0, 0, 0];
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4, o = (y + 1) * W1 + x + 1, u = y * W1 + x + 1;
          for (let c = 0; c < 3; c++) { const v = data[i + c]; rs[c] += v; rq[c] += v * v; S[c][o] = S[c][u] + rs[c]; Q[c][o] = Q[c][u] + rq[c]; }
        }
      }
      img.__int = { S, Q, W1 };
      return img.__int;
    };
    /*
     * Procura o desenho (correlação normalizada nos 3 canais): mede o formato, não só a cor.
     * Antes, filtra pela cor média do retângulo (rápido). score 0–1.
     */
    C.match = function (img, t, thr) {
      const { w, h, data } = img, n = t.w * t.h, I = C.integrals(img), W1 = I.W1;
      const tm = [0, 0, 0];
      for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) tm[c] += t.d[k * 3 + c];
      for (let c = 0; c < 3; c++) tm[c] /= n;
      const tp = new Float32Array(n * 3);
      let tv = 0;
      for (let k = 0; k < n * 3; k++) { tp[k] = t.d[k] - tm[k % 3]; tv += tp[k] * tp[k]; }
      const hits = [];
      if (tv < n * 3 * 30) { hits.vague = true; return hits; } // exemplo liso demais (só chão)
      const box = (A, x, y) => A[(y + t.h) * W1 + x + t.w] - A[y * W1 + x + t.w] - A[(y + t.h) * W1 + x] + A[y * W1 + x];
      for (let y = 0; y + t.h <= h; y++) {
        for (let x = 0; x + t.w <= w; x++) {
          let md = 0, vi = 0;
          for (let c = 0; c < 3; c++) { const sm = box(I.S[c], x, y); md += Math.abs(sm / n - tm[c]); vi += box(I.Q[c], x, y) - (sm * sm) / n; }
          if (md > 75 || vi < 1) continue;
          let num = 0;
          for (let j = 0; j < t.h; j++) {
            let s2 = ((y + j) * w + x) * 4, k = j * t.w * 3;
            for (let i = 0; i < t.w; i++, s2 += 4, k += 3) num += data[s2] * tp[k] + data[s2 + 1] * tp[k + 1] + data[s2 + 2] * tp[k + 2];
          }
          const ncc = num / Math.sqrt(tv * vi);
          if (ncc >= thr) { hits.push({ x, y, w: t.w, h: t.h, score: Math.round(ncc * 100) / 100 }); if (hits.length > 3000) { hits.vague = true; return hits; } }
        }
      }
      return hits;
    };
    C.doors = function (img0, o) {
      const img = img0, all = [], vague = [];
      o.tpls.forEach((b, ti) => {
        const x = Math.max(0, Math.round(b[0])), y = Math.max(0, Math.round(b[1]));
        const w = Math.min(img.w - x, Math.round(b[2])), h = Math.min(img.h - y, Math.round(b[3]));
        if (w < 2 || h < 2) return;
        const mine = [];
        for (const v of C.variants(C.crop(img, x, y, w, h))) {
          const hs = C.match(img, v, o.thr);
          if (hs.vague) { vague.push(ti); return; } // exemplo que parece com tudo: fica de fora
          for (const hit of hs) mine.push(hit);
        }
        all.push(...mine);
      });
      // fica o melhor de cada lugar
      all.sort((a, b) => b.score - a.score);
      const keep = [];
      for (const a of all) {
        const ov = keep.some((k) => {
          const ix = Math.max(0, Math.min(a.x + a.w, k.x + k.w) - Math.max(a.x, k.x)), iy = Math.max(0, Math.min(a.y + a.h, k.y + k.h) - Math.max(a.y, k.y));
          return ix * iy > 0.3 * Math.min(a.w * a.h, k.w * k.h);
        });
        if (!ov) keep.push(a);
      }
      return { hits: keep, vague };
    };
    return C;
  }

  const Sc = { core: CORE(), cache: null, worker: null, seq: 0, wait: new Map() };
  // Worker criado a partir do texto do núcleo (sem build e sem arquivo extra)
  function worker() {
    if (Sc.worker !== null) return Sc.worker;
    try {
      const src = 'const C = (' + CORE.toString() + ')();\nonmessage = (e) => { const { id, cmd, args } = e.data; let r, err; try { r = C[cmd](...args); } catch (x) { err = String(x && x.message || x); } postMessage({ id, r, err }); };';
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = (e) => { const p = Sc.wait.get(e.data.id); if (!p) return; Sc.wait.delete(e.data.id); if (e.data.err) p.rej(new Error(e.data.err)); else p.res(e.data.r); };
      w.onerror = () => { Sc.worker = false; for (const [id, p] of Sc.wait) { Sc.wait.delete(id); try { p.res(Sc.core[p.cmd](...p.args)); } catch (x) { p.rej(x); } } };
      Sc.worker = w;
    } catch { Sc.worker = false; }
    return Sc.worker;
  }
  function call(cmd, args, sync) {
    const w = !sync && worker();
    if (!w || Sc.forceSync) return Promise.resolve().then(() => Sc.core[cmd](...args));
    return new Promise((res, rej) => { const id = ++Sc.seq; Sc.wait.set(id, { res, rej, cmd, args }); w.postMessage({ id, cmd, args }); });
  }

  Sc.ping = () => call('colorAt', [{ w: 1, h: 1, data: new Uint8ClampedArray(4) }, 0, 0, 0]);

  // ===================== imagem do mapa =====================
  Sc.PX = 20; // pixels por quadrado na leitura
  Sc.prepare = async function (sc) {
    if (!sc || !sc.bg) throw new Error('Esta cena não tem imagem de mapa.');
    const key = sc.bg + '|' + sc.cols + 'x' + sc.rows;
    if (Sc.cache && Sc.cache.key === key) return Sc.cache;
    const src = App.Images.src(sc.bg);
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Não foi possível ler a imagem do mapa.')); i.src = src; });
    let px = Sc.PX;
    while (sc.cols * px * sc.rows * px > 3.2e6 && px > 6) px--;
    const w = Math.max(8, Math.round(sc.cols * px)), h = Math.max(8, Math.round(sc.rows * px));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h);
    Sc.cache = { key, img: { w, h, data: d.data }, px, k: sc.grid / px, canvas: c };
    return Sc.cache;
  };
  // Cor (para mostrar no quadro) num ponto do mundo
  Sc.colorAt = function (P, p) { const c = Sc.core.colorAt(P.img, Math.floor(p.x / P.k), Math.floor(p.y / P.k), 2); return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); };

  // ===================== geometria no mundo =====================
  const ang = (s) => Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  const len = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  // Encaixa os cantos no meio-quadrado (quando perto) e junta trechos na mesma direção
  function straighten(pts, sc, closed) {
    const g = sc.grid, half = g / 2, tol = g * 0.28;
    let p = pts.map(([x, y]) => {
      const sx = Math.round(x / half) * half, sy = Math.round(y / half) * half;
      return Math.abs(sx - x) <= tol && Math.abs(sy - y) <= tol ? [sx, sy] : [x, y];
    });
    // trecho quase reto (até 9° de 0/45/90): o segundo ponto se alinha ao primeiro
    for (let i = 1; i < p.length; i++) {
      const [x1, y1] = p[i - 1], [x2, y2] = p[i], dx = x2 - x1, dy = y2 - y1, ax = Math.abs(dx), ay = Math.abs(dy);
      if (ay <= ax * 0.16) p[i] = [x2, y1];
      else if (ax <= ay * 0.16) p[i] = [x1, y2];
      else if (Math.abs(ax - ay) <= Math.max(ax, ay) * 0.16) { const m = (ax + ay) / 2; p[i] = [x1 + Math.sign(dx) * m, y1 + Math.sign(dy) * m]; }
    }
    if (closed && p.length > 2) p[p.length - 1] = p[0].slice();
    // tira pontos repetidos e os do meio de uma reta
    const out = [];
    for (const q of p) { const l = out[out.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 1) out.push(q); }
    for (let i = out.length - 2; i >= 1; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) <= 0.02 * Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1])) out.splice(i, 1);
    }
    return out;
  }
  // Mesma parede que uma já existente (paralela, colada e sobreposta)?
  function dup(s, list, g) {
    const a = ang(s), mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
    return list.some((w) => {
      let d = Math.abs(ang(w) - a) % Math.PI;
      if (Math.min(d, Math.PI - d) > 0.15) return false;
      const L = len(w) || 1, t = ((mx - w.x1) * (w.x2 - w.x1) + (my - w.y1) * (w.y2 - w.y1)) / (L * L);
      if (t < -0.05 || t > 1.05) return false;
      const px = w.x1 + (w.x2 - w.x1) * t, py = w.y1 + (w.y2 - w.y1) * t;
      return Math.hypot(px - mx, py - my) < g * 0.2;
    });
  }
  // Tira de uma parede o trecho onde fica a porta (paralela e colada)
  function cutByDoor(walls, d, g) {
    const out = [], L = len(d);
    if (!L) return walls;
    const ux = (d.x2 - d.x1) / L, uy = (d.y2 - d.y1) / L, a = ang(d);
    for (const w of walls) {
      const da = Math.abs(ang(w) - a) % Math.PI;
      const d1 = Math.abs((w.x1 - d.x1) * uy - (w.y1 - d.y1) * ux), d2 = Math.abs((w.x2 - d.x1) * uy - (w.y2 - d.y1) * ux);
      if (Math.min(da, Math.PI - da) > 0.15 || Math.max(d1, d2) > g * 0.3) { out.push(w); continue; }
      const t1 = (w.x1 - d.x1) * ux + (w.y1 - d.y1) * uy, t2 = (w.x2 - d.x1) * ux + (w.y2 - d.y1) * uy;
      const lo = Math.min(t1, t2), hi = Math.max(t1, t2);
      if (hi <= 0 || lo >= L) { out.push(w); continue; }
      const P = (t) => { const k = (t - t1) / ((t2 - t1) || 1); return [Math.round(w.x1 + (w.x2 - w.x1) * k), Math.round(w.y1 + (w.y2 - w.y1) * k)]; };
      if (lo < -1) { const [ax, ay] = P(lo), [bx, by] = P(0); out.push(Object.assign({}, w, { x1: ax, y1: ay, x2: bx, y2: by })); }
      if (hi > L + 1) { const [ax, ay] = P(L), [bx, by] = P(hi); out.push(Object.assign({}, w, { id: U.uid('w_'), x1: ax, y1: ay, x2: bx, y2: by })); }
    }
    return out;
  }
  // Aberturas de ~1 quadrado entre duas paredes na mesma linha (palpite de porta)
  function gapDoors(walls, g) {
    const out = [], ends = [];
    walls.forEach((w, i) => { ends.push({ i, x: w.x1, y: w.y1 }, { i, x: w.x2, y: w.y2 }); });
    for (let a = 0; a < ends.length; a++) for (let b = a + 1; b < ends.length; b++) {
      const p = ends[a], q = ends[b];
      if (p.i === q.i) continue;
      const wa = walls[p.i], wb = walls[q.i], gl = Math.hypot(q.x - p.x, q.y - p.y);
      if (gl < g * 0.6 || gl > g * 1.6) continue;
      const ga = Math.atan2(q.y - p.y, q.x - p.x);
      const par = (w) => { const d = Math.abs(ang(w) - ga) % Math.PI; return Math.min(d, Math.PI - d) < 0.08; };
      if (!par(wa) || !par(wb)) continue;
      if (out.some((d) => Math.hypot((d.x1 + d.x2) / 2 - (p.x + q.x) / 2, (d.y1 + d.y2) / 2 - (p.y + q.y) / 2) < g * 0.4)) continue;
      out.push({ id: U.uid('w_'), x1: p.x, y1: p.y, x2: q.x, y2: q.y, door: true, guess: true });
    }
    return out;
  }

  /*
   * Procura. opts = {by: outside|wall|dark, seeds: [{x,y}] (mundo), sens (0–1), mode: straight|free, region {x,y,w,h}|null,
   *                  tpls: [{x,y,w,h}] (mundo), doorThr (0–1), gaps (palpite pelas aberturas), sync}
   * Devolve {walls: [...], doors: [...]} no mundo (sugestões, ainda não criadas).
   */
  Sc.run = async function (sc, opts) {
    const P = await Sc.prepare(sc), k = P.k, g = sc.grid, sens = opts.sens ?? 0.5;
    const seeds = (opts.seeds || []).map((p) => [Math.floor(p.x / k), Math.floor(p.y / k)]);
    const onlyDoors = opts.only === 'doors'; // Plano 32: ferramenta Porta
    if (onlyDoors && !(opts.tpls || []).length && !opts.gaps) return { walls: [], doors: [], need: true };
    if (!onlyDoors && opts.by !== 'dark' && !seeds.length) return { walls: [], doors: [], need: true };
    // smooth (0–1) → raio do desfoque em pixels da leitura; minSize (0–1, padrão 0,1) → tamanho mínimo (0,1 = como antes)
    const o = { by: opts.by || 'outside', seeds, tol: 18 + sens * 70, lum: 30 + sens * 90, eps: opts.mode === 'free' ? 1.2 : 2.2, cell: P.px,
      smooth: Math.round((opts.smooth || 0) * P.px * 0.5), edgePct: 0.6 + sens * 0.35, minK: Math.max(0.2, (opts.minSize ?? 0.1) * 10) };
    const polys = onlyDoors ? [] : await call('walls', [P.img, o], opts.sync);
    const strokeOf = () => (opts.mode === 'free' ? U.uid('st_') : null);
    let walls = [];
    const minLen = g * (opts.mode === 'free' ? 0.25 : 0.4);
    for (const poly of polys) {
      let pts = poly.pts.map(([x, y]) => [x * k, y * k]);
      if (opts.mode !== 'free') pts = straighten(pts, sc, poly.closed);
      let stroke = strokeOf();
      for (let i = 1; i < pts.length; i++) {
        if (stroke && i > 1) {
          const a1 = Math.atan2(pts[i - 1][1] - pts[i - 2][1], pts[i - 1][0] - pts[i - 2][0]), a2 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
          let d = Math.abs(a2 - a1) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
          if (d > 0.9) stroke = strokeOf();
        }
        const s = { id: U.uid('w_'), x1: Math.round(pts[i - 1][0]), y1: Math.round(pts[i - 1][1]), x2: Math.round(pts[i][0]), y2: Math.round(pts[i][1]), cover: 'full' };
        if (stroke) s.stroke = stroke;
        if (len(s) >= minLen || (stroke && len(s) > 2)) walls.push(s);
      }
    }
    // portas por exemplo
    let doors = [], doorWarn = null;
    if ((opts.tpls || []).length) {
      const tpls = opts.tpls.map((b) => [b.x / k, b.y / k, b.w / k, b.h / k]);
      const found = await call('doors', [P.img, { tpls, thr: opts.doorThr ?? 0.86 }], opts.sync);
      if ((found.vague || []).length) doorWarn = 'O exemplo ' + found.vague.map((i) => i + 1).join(', ') + ' parece demais com o chão: arraste um retângulo mais justo, só em volta da porta.';
      for (const hb of found.hits) {
        const x = hb.x * k, y = hb.y * k, w = hb.w * k, h = hb.h * k;
        let d = w >= h ? { x1: x, y1: y + h / 2, x2: x + w, y2: y + h / 2 } : { x1: x + w / 2, y1: y, x2: x + w / 2, y2: y + h };
        if (opts.mode !== 'free') { const [a, b] = straighten([[d.x1, d.y1], [d.x2, d.y2]], sc, false).concat([[d.x2, d.y2]]); d = { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }; }
        doors.push({ id: U.uid('w_'), x1: Math.round(d.x1), y1: Math.round(d.y1), x2: Math.round(d.x2), y2: Math.round(d.y2), door: true, open: false, locked: false, cover: 'full', score: Math.round(hb.score * 100) / 100, box: { x, y, w, h } });
      }
      for (const d of doors) walls = cutByDoor(walls, d, g);
    }
    const gapBase = onlyDoors ? (sc.walls || []).filter((w) => !w.door) : walls;
    if (opts.gaps) doors = doors.concat(gapDoors(gapBase, g).filter((d) => !doors.some((o2) => Math.hypot((o2.x1 + o2.x2) / 2 - (d.x1 + d.x2) / 2, (o2.y1 + o2.y2) / 2 - (d.y1 + d.y2) / 2) < g * 0.5)));
    // só a área escolhida; sem repetir as paredes que já existem
    const inR = (s) => { const r = opts.region; if (!r) return true; const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2; return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h; };
    const old = sc.walls || [];
    walls = walls.filter((s) => inR(s) && !dup(s, old, g));
    doors = doors.filter((s) => inR(s) && !dup(s, old.filter((w) => w.door), g));
    return { walls, doors, doorWarn };
  };

  // Cria as sugestões que ficaram (um passo só no Ctrl+Z)
  Sc.apply = function (sc, res) {
    const clean = (s) => { const o = Object.assign({}, s); delete o.off; delete o.score; delete o.box; delete o.guess; return o; };
    const walls = res.walls.filter((s) => !s.off).map(clean), doors = res.doors.filter((s) => !s.off).map(clean);
    const all = walls.concat(doors);
    if (!all.length) return 0;
    const g = sc.grid, gone = [], pieces = [];
    for (const w of (sc.walls || []).filter((x) => !x.door)) {
      let parts = [w];
      for (const d of doors) parts = cutByDoor(parts, d, g);
      if (parts.length === 1 && parts[0] === w) continue;
      gone.push(w.id); pieces.push(...parts.map((p) => Object.assign({}, p, { id: U.uid('w_') })));
    }
    const run = () => {
      if (gone.length) S().dispatch({ type: 'wall.delete', sceneId: sc.id, ids: gone });
      S().dispatch({ type: 'wall.add', sceneId: sc.id, walls: pieces.concat(all) });
    };
    if (App.History) App.History.batch('scan: ' + walls.length + ' paredes e ' + doors.length + ' portas', run); else run();
    return all.length;
  };

  // ===================== importar .dd2vtt / .uvtt =====================
  Sc.importUVTT = async function (file) {
    const txt = await file.text();
    let j;
    try { j = JSON.parse(txt); } catch { throw new Error('O arquivo não é um mapa .dd2vtt/.uvtt válido.'); }
    const res = j.resolution || {}, size = res.map_size || {}, org = res.map_origin || { x: 0, y: 0 };
    if (!j.image || !size.x || !size.y) throw new Error('O arquivo não tem a imagem ou o tamanho do mapa.');
    const sc = S().newScene(String(file.name || 'Mapa').replace(/\.(dd2vtt|uvtt|df2vtt|json)$/i, '').slice(0, 40) || 'Mapa importado');
    sc.cols = Math.max(1, Math.round(size.x)); sc.rows = Math.max(1, Math.round(size.y));
    const g = sc.grid, X = (p) => Math.round((Number(p.x) - (org.x || 0)) * g), Y = (p) => Math.round((Number(p.y) - (org.y || 0)) * g);
    // imagem → WebP
    const b64 = String(j.image).replace(/^data:[^,]*,/, '');
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const kind = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/webp';
    const im = await App.Images.add(new Blob([bytes], { type: kind }), App.Images.MAP);
    sc.bg = im.id;
    const walls = [];
    const lines = [].concat(j.line_of_sight || [], j.objects_line_of_sight || []);
    for (const line of lines) {
      for (let i = 1; i < (line || []).length; i++) {
        const a = line[i - 1], b = line[i];
        const w = { id: U.uid('w_'), x1: X(a), y1: Y(a), x2: X(b), y2: Y(b), cover: 'full' };
        if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) > 1) walls.push(w);
      }
    }
    for (const p of j.portals || []) {
      const bd = p.bounds || [];
      if (bd.length < 2) continue;
      walls.push({ id: U.uid('w_'), x1: X(bd[0]), y1: Y(bd[0]), x2: X(bd[1]), y2: Y(bd[1]), cover: 'full', door: true, open: p.closed === false, locked: false });
    }
    sc.walls = walls; sc.wallsV = 1;
    const lights = [];
    for (const l of j.lights || []) {
      const r = Math.max(0.5, Number(l.range) || 4), col = String(l.color || 'ffffd699').replace('#', '');
      const hex = '#' + (col.length === 8 ? col.slice(2) : col.slice(0, 6));
      lights.push({ id: U.uid('lt_'), name: 'Luz ' + (lights.length + 1), kind: 'light', shape: 'circle', x: X(l.position || {}), y: Y(l.position || {}),
        bright: Math.round(r * 0.5 * 2) / 2, dim: r, dir: 0, angle: 60, pts: null, edge: 0, color: /^#[0-9a-f]{6}$/i.test(hex) ? hex : App.Light.WARM, tint: 0.4, flicker: false, on: true });
    }
    sc.lights = lights;
    sc.light = Object.assign({}, sc.light, { enabled: true, global: !lights.length });
    S().dispatch({ type: 'scene.add', scene: sc });
    return { scene: sc, walls: walls.filter((w) => !w.door).length, doors: walls.filter((w) => w.door).length, lights: lights.length };
  };

  App.Scan = Sc;
})(window.App);
