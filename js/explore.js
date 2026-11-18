'use strict';
/*
 * Memória de exploração (Plano 19). O que os tokens dos jogadores já viram fica no mapa, escurecido (~25%),
 * sem tokens; o nunca visto continua preto. Quem calcula é o MESTRE: depois de um movimento aceito, porta,
 * luz ou parede mudar, ele confere as células ainda não vistas (grade de 2×2 por quadrado) e soma as novas.
 * sc.explored = { chave: {w, h, d (bits em base64)} }; chave '*' = do grupo, ou o id de cada jogador
 * (regra da campanha rules.exploreMode: 'group' | 'player'). Liga por cena em sc.light.explore.
 */
(function (App) {
  const S = () => App.Store;
  const RES = 2; // células por quadrado (em cada direção)
  const E = { RES, dirty: new Set(), timer: null, cache: new Map() };

  const dims = (sc) => ({ w: Math.max(1, sc.cols * RES), h: Math.max(1, sc.rows * RES) });
  E.on = (sc) => !!(sc && sc.light && sc.light.enabled && sc.light.explore);
  function decode(entry, d) {
    const out = new Uint8Array(d.w * d.h);
    if (!entry || entry.w !== d.w || entry.h !== d.h || !entry.d) return out;
    const bin = atob(entry.d);
    for (let i = 0; i < out.length; i++) out[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
    return out;
  }
  function encode(bits) {
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i++) if (bits[i]) bytes[i >> 3] |= 1 << (i & 7);
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return btoa(s);
  }
  E.decode = decode;

  // Quem enxerga para cada chave: o grupo (todos os tokens com dono) ou cada jogador
  function viewerSets(st, sc) {
    const toks = Object.values(sc.tokens).filter((t) => !t.hidden);
    if ((st.rules || {}).exploreMode === 'player') {
      const out = [];
      for (const pid of Object.keys(st.players || {})) {
        if (S().sceneIdOf(pid) !== sc.id) continue;
        const v = toks.filter((t) => S().canControl(t, pid));
        if (v.length) out.push([pid, v]);
      }
      return out;
    }
    const v = toks.filter((t) => S().canControl(t, '*'));
    return v.length ? [['*', v]] : [];
  }
  // Soma ao explorado as células que estes olhos veem agora; devolve o novo valor (ou null se nada mudou)
  function grow(sc, entry, viewers) {
    const d = dims(sc), bits = decode(entry, d), cell = sc.grid / RES, L = App.Light;
    // De noite, só pode ser visto o que está perto de uma luz ou na visão no escuro de alguém: testa só essas regiões
    let rects = null;
    if (!sc.light.global) {
      rects = [];
      for (const s of L.sources(sc)) {
        if (s.kind === 'dark') continue;
        if (s.shape === 'area') { const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]); rects.push([Math.min(...xs) - s.edge, Math.min(...ys) - s.edge, Math.max(...xs) + s.edge, Math.max(...ys) + s.edge]); }
        else rects.push([s.x - s.dim, s.y - s.dim, s.x + s.dim, s.y + s.dim]);
      }
      for (const v of viewers) { const dv = (Number(v.darkvision) || 0) * sc.grid; if (dv) { const c = L.center(sc, v); rects.push([c.x - dv, c.y - dv, c.x + dv, c.y + dv]); } }
      if (!rects.length) return null;
    }
    let added = 0;
    for (let y = 0; y < d.h; y++) {
      const py = (y + 0.5) * cell;
      if (rects && !rects.some((r) => py >= r[1] && py <= r[3])) continue;
      for (let x = 0; x < d.w; x++) {
        const i = y * d.w + x;
        if (bits[i]) continue;
        if (rects) { const px = (x + 0.5) * cell; if (!rects.some((r) => px >= r[0] && px <= r[2] && py >= r[1] && py <= r[3])) continue; }
        if (L.pointVisible(sc, { x: (x + 0.5) * cell, y: (y + 0.5) * cell }, viewers)) { bits[i] = 1; added++; }
      }
    }
    return added ? { w: d.w, h: d.h, d: encode(bits) } : null;
  }

  const RELEVANT = /^(token\.(move|update|add|delete)|lightpt\.|anim\.|wall\.|scene\.(update|activate|movePlayers)|undo\.apply|group\.vis)/;
  // Chamado no mestre depois de cada ação aplicada (Store.commit)
  E.touch = function (st, a) {
    if (!a || !RELEVANT.test(a.type)) return;
    if (a.type === 'scene.activate' || a.type === 'scene.movePlayers' || (a.type === 'scene.update' && a.id)) E.dirty.add(a.id || a.sceneId);
    else if (a.sceneId) E.dirty.add(a.sceneId);
    clearTimeout(E.timer);
    E.timer = setTimeout(E.flush, 250);
  };
  E.flush = function () {
    const st = S().state;
    if (!st || !S().isGM()) { E.dirty.clear(); return; }
    for (const sid of [...E.dirty]) {
      E.dirty.delete(sid);
      // Com animação rodando, vale onde as luzes e os tokens estão agora (Plano 21)
      const sc = App.Anim ? App.Anim.view(st.scenes[sid]) : st.scenes[sid];
      if (!E.on(sc)) continue;
      for (const [key, viewers] of viewerSets(st, sc)) {
        const next = grow(sc, (sc.explored || {})[key], viewers);
        if (next) S().dispatch({ type: 'explore.set', sceneId: sid, key, data: next, noUndo: true });
      }
    }
  };
  E.recompute = (sid) => { E.dirty.add(sid); E.flush(); };

  // Máscara para desenhar (cinza onde já foi visto); chave do cliente: o jogador, ou o "ver como" do mestre
  E.maskCanvas = function (sc) {
    if (!E.on(sc)) return null;
    const st = S().state, ex = sc.explored || {}, d = dims(sc);
    const mode = (st.rules || {}).exploreMode === 'player' ? 'player' : 'group';
    let keys;
    if (mode === 'group') keys = ['*'];
    else { const me = S().isGM() ? S().viewAs : S().me.id; keys = me === '*' || !me ? Object.keys(ex).filter((k) => k !== '*') : [me]; }
    const sig = sc.id + '|' + d.w + 'x' + d.h + '|' + keys.map((k) => (ex[k] && ex[k].d) || '').join('|');
    const hit = E.cache.get(sc.id);
    if (hit && hit.sig === sig) return hit.canvas;
    const bits = new Uint8Array(d.w * d.h);
    for (const k of keys) { const b = decode(ex[k], d); for (let i = 0; i < b.length; i++) bits[i] |= b[i]; }
    const c = (hit && hit.canvas) || document.createElement('canvas');
    c.width = d.w; c.height = d.h;
    const x = c.getContext('2d'), img = x.createImageData(d.w, d.h);
    for (let i = 0; i < bits.length; i++) if (bits[i]) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 64; img.data[i * 4 + 3] = 255; }
    x.putImageData(img, 0, 0);
    E.cache.set(sc.id, { sig, canvas: c, bits, w: d.w, h: d.h });
    return c;
  };
  // Esta posição do mundo já foi explorada (para o contorno das paredes)?
  E.seen = function (sc, x, y) {
    const hit = E.cache.get(sc.id);
    if (!hit) return false;
    const cell = sc.grid / RES, cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    if (cx < 0 || cy < 0 || cx >= hit.w || cy >= hit.h) return false;
    return !!hit.bits[cy * hit.w + cx];
  };

  App.Explore = E;
})(window.App);
