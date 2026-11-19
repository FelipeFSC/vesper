// Plano 34 · diagnóstico: imagem borrada | força da borda | chão enchido, no recorte da fortaleza (-shot).
// Hash: #<textura 0-100>-<sens 0-100>
window.addEventListener('load', () => setTimeout(async () => {
  const log = [];
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, SC = App.Scan, C = SC.core;
    const [tex, sens] = (location.hash.slice(1) || '50-50').split('-').map(Number);
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '.claude/testes/_mapa_fortaleza.jpg'; });
    const N = 35, c = document.createElement('canvas'); c.width = N * 60; c.height = N * 60;
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/webp', 0.9), id = 'img_' + App.U.hash(data.slice(0, 5000) + data.length);
    S.assets[id] = data;
    const sc = S.newScene('F'); sc.cols = N; sc.rows = N; sc.bg = id;
    const P = await SC.prepare(sc), px = P.px, img0 = P.img;
    const r = Math.round((tex / 100) * px * 0.5), img = r > 0 ? C.boxBlur(img0, r) : C.blur(img0), E = C.edges(img);
    const s01 = sens / 100, tol = 18 + s01 * 70, pct = 0.6 + s01 * 0.35;
    const D = 1932 / N, seeds = [[1340, 450], [1700, 470], [1380, 1000], [1600, 1000], [1720, 800], [1700, 1440], [1350, 1500], [1640, 640], [1640, 1330]].map(([x, y]) => [Math.floor((x / D) * px), Math.floor((y / D) * px)]);
    const m = C.floorMask(img, seeds, tol, pct, px), edgeT = m.edgeT;
    // estatística da borda dentro e fora
    const vals = Array.from(E).sort((a, b) => a - b);
    log.push(`px ${px} · raio ${r} · tol ${Math.round(tol)} · borda limite ${Math.round(edgeT)} · borda (mediana ${Math.round(vals[vals.length >> 1])}, p75 ${Math.round(vals[(vals.length * 0.75) | 0])}, p90 ${Math.round(vals[(vals.length * 0.9) | 0])}) · chão ${m.reduce((a, v) => a + (v ? 0 : 1), 0)} px`);
    // recorte da fortaleza: x 23..34, y 4..33 quadrados
    const x0 = 22 * px, y0 = 4 * px, cw = 12 * px, ch = 29 * px;
    const out = document.createElement('canvas'); out.width = cw * 3; out.height = ch;
    const ctx = out.getContext('2d'), id3 = ctx.createImageData(cw * 3, ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = (y0 + y) * img.w + (x0 + x), o = i * 4;
      const a = (y * cw * 3 + x) * 4, b = a + cw * 4, d = b + cw * 4;
      id3.data[a] = img.data[o]; id3.data[a + 1] = img.data[o + 1]; id3.data[a + 2] = img.data[o + 2]; id3.data[a + 3] = 255;
      const e = Math.min(255, E[i] * 4), over = E[i] > edgeT;
      id3.data[b] = over ? 255 : e; id3.data[b + 1] = over ? 60 : e; id3.data[b + 2] = over ? 60 : e; id3.data[b + 3] = 255;
      const fl = !m[i];
      id3.data[d] = fl ? 40 : img0.data[o] * 0.5; id3.data[d + 1] = fl ? 220 : img0.data[o + 1] * 0.5; id3.data[d + 2] = fl ? 120 : img0.data[o + 2] * 0.5; id3.data[d + 3] = 255;
    }
    ctx.putImageData(id3, 0, 0);
    for (const [sx, sy] of seeds) { ctx.fillStyle = '#fff'; ctx.fillRect(cw * 2 + sx - x0 - 2, sy - y0 - 2, 5, 5); }
    out.style.cssText = 'position:fixed;left:0;top:0;height:100vh;z-index:99999;image-rendering:pixelated;background:#000';
    document.body.append(out);
  } catch (e) { log.push('EXC ' + e.stack); }
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
