'use strict';
/* Tabuleiro: canvas com câmera (pan/zoom), grid, mapa, desenhos, tokens, névoa, régua e pings. */
(function (App) {
  const { U } = App;
  const S = () => App.Store;

  const B = {
    canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
    cam: { x: 0, y: 0, z: 1 },
    tool: 'select', selected: null,
    drag: null, pan: null, ruler: null, draft: null, fogDraft: null, erasing: false,
    pings: [], animating: false, spaceDown: false, needs: false, lastSceneId: null,
    fogCache: { key: null, canvas: null },
    style: { color: '#d9574f', width: 4, fill: 0, snap: true },
    layers: { tokens: true, drawings: true, fog: true, map: true, walls: true, light: true, sounds: true, rooms: true, props: true, lights: true },
    // Pontos de luz: tipo e forma dos próximos (opções da ferramenta), selecionado, arraste e rascunhos
    lightKind: 'light', lightShape: 'circle', selectedLight: null, lightDrag: null, lightDraft: null, lightPoly: null,
    // Imagens no mapa: selecionada e arraste em andamento ({id, mode: move|resize|rotate, start, cur, moved})
    selectedProp: null, propDrag: null,
    selectedSound: null, soundDrag: null,
    // Salas de som: modo de desenho, rascunho (retângulo ou polígono) e a sala selecionada
    roomMode: 'rect', roomDraft: null, roomPoly: null, selectedRoom: null,
    wallDraft: null,
    fx: [], fxSeen: undefined, hoverP: null, lastTurnKey: undefined,
  };

  // Paleta do tabuleiro (combina com css/style.css)
  const C = {
    board: '#0d0d10', dots: 'rgba(255,255,255,0.07)', sel: '#8b72f0', turn: '#d2a24c', gold: '#d2a24c', danger: '#d9574f',
    ok: '#4fb27a', warn: '#d9a441', plate: 'rgba(17,17,20,0.92)', plateLine: 'rgba(255,255,255,0.10)', text: '#ece9f2',
  };
  const SERIF = '"EB Garamond", Georgia, serif';
  const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
  const shade = (hex, k) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    const f = (x) => Math.round(Math.max(0, Math.min(255, parseInt(x, 16) * (1 + k))));
    return 'rgb(' + f(m[1]) + ',' + f(m[2]) + ',' + f(m[3]) + ')';
  };
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  const CURSORS = { select: 'default', pan: 'grab', erase: 'cell', prop: 'default' };
  const LT = () => App.Light;
  const CB = () => App.Combat;

  // ---------- setup ----------
  B.init = function (canvas) {
    B.canvas = canvas;
    B.ctx = canvas.getContext('2d');
    new ResizeObserver(() => B.resize()).observe(canvas.parentElement);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Botão direito apertado enquanto o esquerdo segura o token (ou a régua): ponto de passagem.
    // (o navegador não manda pointerdown para o 2º botão; mousedown sim)
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 2 || !(B.drag || B.ruler)) return;
      e.preventDefault(); addWaypoint();
    });
    canvas.addEventListener('dragover', (e) => {
      const types = [...e.dataTransfer.types];
      if (types.includes('text/x-actor') || types.includes('text/x-sound') || (S().gmView() && (types.includes('text/x-image') || types.includes('Files')))) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
    canvas.addEventListener('drop', onDrop);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') B.spaceDown = false; });
    S().on((kind) => { scanFx(kind); B.requestRender(); });
    B.resize();
  };

  B.resize = function () {
    const r = B.canvas.parentElement.getBoundingClientRect();
    B.dpr = window.devicePixelRatio || 1;
    B.w = r.width; B.h = r.height;
    B.canvas.width = Math.round(r.width * B.dpr);
    B.canvas.height = Math.round(r.height * B.dpr);
    B.canvas.style.width = r.width + 'px';
    B.canvas.style.height = r.height + 'px';
    B.render();
  };

  B.requestRender = function () {
    if (B.needs || !B.ctx) return;
    B.needs = true;
    const run = () => { if (!B.needs) return; B.needs = false; B.render(); };
    requestAnimationFrame(run);
    setTimeout(run, 150); // reserva para abas em segundo plano
  };

  // ---------- mira (escolher alvos de uma ação) ----------
  // opts = { label, mode, act, area, multi, sourceId, onDone(ids, point) }
  B.startTargeting = function (opts) {
    B.targeting = Object.assign({ ids: [], chance: new Map() }, opts);
    B.canvas.style.cursor = 'crosshair';
    App.UI.renderTargetBar();
    B.requestRender();
    ensureAnim();
  };
  B.cancelTargeting = function () {
    B.targeting = null;
    B.hoverP = null;
    B.canvas.style.cursor = CURSORS[B.tool] || 'crosshair';
    App.UI.renderTargetBar();
    B.requestRender();
  };
  B.confirmTargeting = function () {
    const tg = B.targeting;
    if (!tg) return;
    if (!tg.ids.length) { U.toast('Clique em pelo menos um alvo.'); return; }
    B.cancelTargeting();
    tg.onDone(tg.ids.slice(), tg.point || null);
  };
  // Situação de cada token para a ação em mira: Map id → { ok, d, why }
  function targetChecks(sc) {
    const tg = B.targeting, out = new Map();
    if (!tg || !tg.act || tg.area) return out;
    const src = tg.sourceId && sc.tokens[tg.sourceId];
    for (const t of visibleTokens(sc)) out.set(t.id, src ? CB().check(sc, src, tg.act, t) : { ok: true, d: null });
    return out;
  }
  // Quantos alvos válidos existem agora (para a barra de mira)
  B.validTargetCount = function () {
    const sc = S().currentScene();
    if (!sc || !B.targeting) return 0;
    let n = 0;
    for (const c of targetChecks(sc).values()) if (c.ok) n++;
    return n;
  };

  B.setTool = function (t) {
    if ((t.startsWith('fog') || t === 'wall' || t === 'door' || t === 'room' || t === 'prop' || t === 'light') && !S().gmView()) return;
    if (t !== 'room') B.roomPoly = null;
    if (t !== 'light') { B.lightPoly = null; B.lightDraft = null; }
    B.tool = t;
    B.canvas.style.cursor = CURSORS[t] || 'crosshair';
    if (App.UI) App.UI.renderToolbar();
  };

  // ---------- câmera ----------
  function toWorld(e) {
    const r = B.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / B.cam.z + B.cam.x, y: (e.clientY - r.top) / B.cam.z + B.cam.y };
  }
  function toScreen(x, y) { return { x: (x - B.cam.x) * B.cam.z, y: (y - B.cam.y) * B.cam.z }; }
  B.toScreen = toScreen;

  function fitCam(sc) {
    const W = sc.cols * sc.grid, H = sc.rows * sc.grid;
    const z = U.clamp(Math.min((B.w - 60) / W, (B.h - 60) / H), 0.1, 2);
    B.cam.z = z;
    B.cam.x = W / 2 - B.w / 2 / z;
    B.cam.y = H / 2 - B.h / 2 / z;
  }
  B.fit = function () { const sc = S().currentScene(); if (sc && B.w) { fitCam(sc); B.requestRender(); } };
  B.zoomBy = function (f) {
    const cx = B.w / 2 / B.cam.z + B.cam.x, cy = B.h / 2 / B.cam.z + B.cam.y;
    B.cam.z = U.clamp(B.cam.z * f, 0.1, 6);
    B.cam.x = cx - B.w / 2 / B.cam.z;
    B.cam.y = cy - B.h / 2 / B.cam.z;
    B.requestRender();
  };
  B.centerOn = function (x, y) {
    B.cam.x = x - B.w / 2 / B.cam.z;
    B.cam.y = y - B.h / 2 / B.cam.z;
    B.requestRender();
  };
  B.viewCenter = () => ({ x: B.w / 2 / B.cam.z + B.cam.x, y: B.h / 2 / B.cam.z + B.cam.y });
  B.tokenScreenRect = function (t, sc) {
    const s = (t.size || 1) * sc.grid, p = toScreen(t.x, t.y);
    return { x: p.x, y: p.y, w: s * B.cam.z, h: s * B.cam.z };
  };

  // ---------- consultas ----------
  // Posição atual do token (acompanha o arrasto)
  function posOf(t) {
    const sc = S().currentScene(), s = (t.size || 1) * sc.grid;
    if (B.drag && B.drag.id === t.id) return { x: B.drag.x + s / 2, y: B.drag.y + s / 2 };
    return { x: t.x + s / 2, y: t.y + s / 2 };
  }
  // ---------- movimento por um caminho ----------
  // Cada movimento novo (t.lastMove) ganha um início local; o token vai direto ao destino e o rastro fica trailSecs segundos
  B.moves = new Map();
  function moveInfo(t) {
    const lm = t.lastMove;
    if (!lm || !lm.pts || lm.pts.length < 2) return null;
    const key = lm.at + ':' + lm.pts.length + ':' + lm.pts[lm.pts.length - 1].join(',');
    let m = B.moves.get(t.id);
    if (!m || m.key !== key) {
      // movimento antigo (ex.: campanha recém-carregada) não mostra o rastro de novo
      const fresh = Math.abs(Date.now() - lm.at) < 10000;
      let len = 0;
      for (let i = 1; i < lm.pts.length; i++) len += Math.hypot(lm.pts[i][0] - lm.pts[i - 1][0], lm.pts[i][1] - lm.pts[i - 1][1]);
      m = { key, t0: fresh ? performance.now() : -1e9, len };
      B.moves.set(t.id, m);
    }
    return m;
  }
  // Algum token com rastro na tela? (mantém a animação rodando para o rastro sumir aos poucos)
  function movesActive(sc) {
    const secs = Number((S().state.rules || {}).trailSecs ?? 3);
    const now = performance.now();
    for (const t of Object.values(sc.tokens)) {
      const m = moveInfo(t);
      if (m && now - m.t0 < secs * 1000) return true;
    }
    return false;
  }
  // Custo do caminho em quadrados, trecho a trecho, na medida da cena.
  // Na regra alternada (1-2-1) a contagem das diagonais continua de um trecho para o outro.
  function pathCost(sc, pts) {
    const segs = [];
    let total = 0, diag = 0;
    const f = (k) => k + Math.floor(k / 2);
    for (let i = 1; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - pts[i - 1].x) / sc.grid, dy = Math.abs(pts[i].y - pts[i - 1].y) / sc.grid;
      let c;
      if (sc.measure === 'euclid') c = Math.round(Math.hypot(dx, dy) * 10) / 10;
      else {
        const mx = Math.round(Math.max(dx, dy)), mn = Math.round(Math.min(dx, dy));
        if (sc.measure === 'alt') { c = (mx - mn) + f(diag + mn) - f(diag); diag += mn; } else c = mx;
      }
      segs.push(c); total += c;
    }
    return { segs, total: Math.round(total * 10) / 10 };
  }
  B.pathCost = pathCost;
  // O trecho a→b atravessa alguma parede ou porta fechada? (só aviso: o movimento é permitido)
  function crossesWall(sc, a, b) {
    const cr = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    for (const w of sc.walls || []) {
      if (w.door && w.open) continue;
      const d1 = cr(w.x1, w.y1, w.x2, w.y2, a.x, a.y), d2 = cr(w.x1, w.y1, w.x2, w.y2, b.x, b.y);
      const d3 = cr(a.x, a.y, b.x, b.y, w.x1, w.y1), d4 = cr(a.x, a.y, b.x, b.y, w.x2, w.y2);
      if (((d1 > 1e-6 && d2 < -1e-6) || (d1 < -1e-6 && d2 > 1e-6)) && ((d3 > 1e-6 && d4 < -1e-6) || (d3 < -1e-6 && d4 > 1e-6))) return true;
    }
    return false;
  }
  B.crossesWall = crossesWall;
  B.posOf = posOf;
  B.movesActive = movesActive;
  // Olhos deste cliente quando a iluminação vale para ele (jogador, ou mestre na prévia); null = vê tudo
  function lightViewers(sc) {
    if (!LT().active(sc) || S().gmView()) return null;
    return LT().viewers(sc);
  }
  // Tokens na sombra de um muro baixo que aparecem só como vulto (para este cliente)
  B.silhouettes = new Set();
  function visibleTokens(sc) {
    const gm = S().gmView(), viewers = lightViewers(sc);
    const ids = viewers && new Set(viewers.map((t) => t.id));
    // Sombra dos muros baixos: só vale para quem joga (ou o mestre vendo como jogador)
    const eyes = gm ? null : (viewers || LT().viewers(sc));
    B.silhouettes.clear();
    return Object.values(sc.tokens).filter((t) => {
      if (t.hidden && !gm) return false;
      const top = CB().flyOf(t) > 0 ? CB().topOf(t) : 0;
      if (viewers && !ids.has(t.id) && !LT().pointVisible(sc, posOf(t), viewers, posOf, top)) return false;
      // Vulto escolhido pelo mestre: o jogador vê só a silhueta
      if (t.masked && !gm && !S().canControl(t)) { B.silhouettes.add(t.id); return true; }
      if (eyes && eyes.length && !S().canControl(t)) {
        const mode = CB().shadowMode(sc, t);
        if (mode !== 'show' && CB().inShadow(sc, eyes, t)) {
          if (mode === 'hide') return false;
          B.silhouettes.add(t.id);
        }
      }
      return true;
    }).sort((a, b) => (a.z || 0) - (b.z || 0));
  }
  function tokenAt(sc, p) {
    const list = visibleTokens(sc);
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i], s = (t.size || 1) * sc.grid;
      if (B.silhouettes.has(t.id) && !B.targeting) continue; // vulto: só dá para mirar, não selecionar
      if (p.x >= t.x && p.x <= t.x + s && p.y >= t.y && p.y <= t.y + s) return t;
    }
    return null;
  }
  function norm(d) {
    return { x: Math.min(d.x1, d.x2), y: Math.min(d.y1, d.y2), w: Math.abs(d.x2 - d.x1), h: Math.abs(d.y2 - d.y1) };
  }
  function distSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
    const t = l ? U.clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1) : 0;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function drawingAt(sc, p) {
    const tol = 8 / B.cam.z;
    for (let i = sc.drawings.length - 1; i >= 0; i--) {
      const d = sc.drawings[i], w = (d.width || 2) / 2 + tol;
      if (d.type === 'path') {
        for (let k = 0; k + 3 < d.points.length; k += 2) {
          if (distSeg(p.x, p.y, d.points[k], d.points[k + 1], d.points[k + 2], d.points[k + 3]) <= w) return d;
        }
      } else if (d.type === 'line') {
        if (distSeg(p.x, p.y, d.x1, d.y1, d.x2, d.y2) <= w) return d;
      } else {
        const r = norm(d);
        if (p.x >= r.x - w && p.x <= r.x + r.w + w && p.y >= r.y - w && p.y <= r.y + r.h + w) return d;
      }
    }
    return null;
  }
  function snapPt(sc, p) {
    const g = sc.grid / 2; // snap em meio quadrado: cantos e centros
    return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
  }
  function cellsBetween(sc, a, b) {
    const dx = Math.abs(b.x - a.x) / sc.grid, dy = Math.abs(b.y - a.y) / sc.grid;
    if (sc.measure === 'euclid') return Math.round(Math.hypot(dx, dy) * 10) / 10;
    const mx = Math.round(Math.max(dx, dy)), mn = Math.round(Math.min(dx, dy));
    if (sc.measure === 'alt') return mx + Math.floor(mn / 2);
    return mx;
  }
  function currentTurnTokenId(sc) {
    const c = S().state.combat;
    if (!c.active) return null;
    const e = c.entries[c.turn];
    return e && e.sceneId === sc.id ? e.tokenId : null;
  }

  // ---------- render ----------
  B.render = function () {
    const ctx = B.ctx;
    if (!ctx || !B.w) return;
    const { dpr, cam } = B;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.board;
    ctx.fillRect(0, 0, B.w, B.h);
    drawDots(ctx);

    const sc = S().currentScene();
    if (!sc) {
      ctx.fillStyle = '#8f8d9a'; ctx.font = '16px ' + SANS; ctx.textAlign = 'center';
      ctx.fillText(S().state ? 'Nenhuma cena. Crie uma na aba Cenas.' : 'Aguardando a mesa…', B.w / 2, B.h / 2);
      App.UI && App.UI.updateHud(null, null);
      return;
    }
    if (sc.id !== B.lastSceneId) {
      // Jogador levado para outra cena: avisa onde ele está agora
      if (B.lastSceneId && !S().gmView()) U.toast('Você está em "' + sc.name + '"', 'info', 4000);
      B.lastSceneId = sc.id; B.selected = null; B.selectedSound = null; B.selectedRoom = null; B.roomPoly = null; B.selectedProp = null; B.propDrag = null; B.selectedLight = null; B.lightDrag = null; B.lightPoly = null; fitCam(sc); }

    const g = sc.grid, W = sc.cols * g, H = sc.rows * g, gm = S().gmView();
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, -cam.x * cam.z * dpr, -cam.y * cam.z * dpr);

    const L = B.layers;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40 * cam.z; ctx.shadowOffsetY = 10 * cam.z;
    ctx.fillStyle = sc.bgColor || '#3a3934';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const bg = L.map && App.Images.get(sc.bg);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    if (sc.showGrid) drawGrid(ctx, sc, W, H);

    if (L.drawings) for (const d of sc.drawings) drawShape(ctx, d);
    if (B.draft) drawShape(ctx, B.draft);

    if (B.wallDraft) drawWall(ctx, B.wallDraft, true);

    const cur = currentTurnTokenId(sc);
    // Começou a vez de um token seu: ele já fica selecionado, com as ações à mão
    const cb = S().state.combat, turnKey = cur ? cb.round + ':' + cb.turn + ':' + cur : null;
    if (turnKey !== B.lastTurnKey) {
      B.lastTurnKey = turnKey;
      if (cur && !B.targeting && S().canControl(sc.tokens[cur])) B.selected = cur;
    }
    const tokens = L.tokens ? visibleTokens(sc) : [];
    // Rastro do último movimento de cada token visível (o mestre escolhe quantos segundos em Mesa → Regras)
    const trailMs = Number((S().state.rules || {}).trailSecs ?? 3) * 1000;
    if (trailMs > 0) {
      const now = performance.now();
      for (const t of tokens) {
        const m = moveInfo(t);
        if (!m || m.len <= 0 || (B.drag && B.drag.id === t.id)) continue;
        const age = now - m.t0;
        if (age < 0 || age > trailMs) continue;
        const s2 = (t.size || 1) * g / 2;
        const alpha = Math.min(1, (trailMs - age) / 600);
        drawPath(ctx, sc, t.lastMove.pts.map(([px, py]) => ({ x: px + s2, y: py + s2 })), { alpha, trail: true });
      }
    }
    if (movesActive(sc)) ensureAnim();
    const viewers = lightViewers(sc);
    const eyes = viewers ? new Set(viewers.map((t) => t.id)) : null;
    const asPlayer = !gm;
    const above = [];
    // Imagens e tokens na mesma ordem de nível (empate: a imagem fica embaixo)
    const props = L.props ? (sc.props || []).filter((p) => gm || !p.hidden) : [];
    const items = tokens.map((t) => ({ t, z: t.z || 0, k: 1 })).concat(props.map((p) => ({ p, z: p.z || 0, k: 0 })))
      .sort((a, b) => a.z - b.z || a.k - b.k);
    for (const it of items) {
      if (it.p) { drawProp(ctx, it.p); continue; }
      const t = it.t;
      // Jogador sempre enxerga os próprios tokens (desenhados por cima da névoa e da escuridão)
      if (asPlayer && (eyes ? eyes.has(t.id) : S().canControl(t))) { above.push(t); continue; }
      // Voando por cima de um muro: aparece acima da escuridão (mas nunca por cima da névoa do mestre)
      if (asPlayer && CB().flyOf(t) > 0 && !fogCovers(sc, posOf(t))) { above.push(t); continue; }
      drawToken(ctx, sc, t, t.id === cur);
    }
    if (L.fog || asPlayer) drawFog(ctx, sc, W, H);
    if (LT().active(sc) && (asPlayer || L.light)) {
      // Ponto de luz sendo arrastado: a luz acompanha na hora
      const lsc = B.lightDrag ? Object.assign({}, sc, { lights: (sc.lights || []).map(lightNow) }) : sc;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LT().render(ctx, lsc, cam, B.w, B.h, { viewers, alpha: !gm ? 1 : 0.55, posOf });
      ctx.restore();
      if (LT().flickering(sc)) ensureAnim();
      if (asPlayer) drawWallHints(ctx, sc, viewers);
    }
    for (const t of above) drawToken(ctx, sc, t, t.id === cur);
    if (gm && L.rooms && (App.UI.mode === 'edit' || B.tool === 'room' || B.selectedRoom)) drawRooms(ctx, sc);
    if (gm && L.sounds) drawSounds(ctx, sc);
    if (gm && L.lights) drawLightPoints(ctx, sc);
    drawWalls(ctx, sc, gm && L.walls && (App.UI.mode === 'edit' || B.tool === 'wall' || B.tool === 'door'), viewers);
    if (gm && B.selectedProp) { const sp = (sc.props || []).find((p) => p.id === B.selectedProp); if (sp) drawPropFrame(ctx, propNow(sp)); }

    if (B.drag && B.drag.moved) {
      const t = sc.tokens[B.drag.id];
      if (t) {
        const s = (t.size || 1) * g;
        const sx = Math.round(B.drag.x / g) * g, sy = Math.round(B.drag.y / g) * g;
        if (B.style.snap) { ctx.fillStyle = 'rgba(139,114,240,.18)'; ctx.fillRect(sx, sy, s, s); }
        drawPath(ctx, sc, [{ x: B.drag.sx + s / 2, y: B.drag.sy + s / 2 }].concat(B.drag.points || [],
          [B.style.snap ? { x: sx + s / 2, y: sy + s / 2 } : { x: B.drag.x + s / 2, y: B.drag.y + s / 2 }]));
      }
    }
    if (B.ruler) drawPath(ctx, sc, [B.ruler.a].concat(B.ruler.points || [], [B.ruler.b]));
    if (B.fogDraft) {
      const r = norm(B.fogDraft);
      ctx.save();
      ctx.fillStyle = B.fogDraft.mode === 'reveal' ? 'rgba(210,162,76,.16)' : 'rgba(0,0,0,.5)';
      ctx.strokeStyle = C.gold; ctx.setLineDash([8 / cam.z, 6 / cam.z]); ctx.lineWidth = 2 / cam.z;
      ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    drawPings(ctx, sc);
    if (B.targeting) drawTargets(ctx, sc);
    if (B.fx.length) drawFx(ctx, sc);

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1 / cam.z;
    ctx.strokeRect(0, 0, W, H);

    const zv = document.getElementById('zoom-val');
    if (zv) zv.textContent = Math.round(cam.z * 100) + '%';

    const sel = B.selected && sc.tokens[B.selected];
    const showHud = sel && !B.drag && (gm || (!sel.hidden && S().canControl(sel)));
    App.UI && App.UI.updateHud(showHud ? sc : null, showHud ? sel : null);
  };

  // ---------- sons no mapa (marcadores do mestre) ----------
  function soundPos(snd) {
    if (B.soundDrag && B.soundDrag.id === snd.id) return { x: B.soundDrag.x, y: B.soundDrag.y };
    return { x: snd.x, y: snd.y };
  }
  // Cores do volume: dourado = máximo, violeta = médio, azul = mínimo (mesma escala da legenda no painel)
  const VOL_COLORS = [[1, [242, 178, 76]], [0.6, [226, 120, 92]], [0.35, [168, 108, 240]], [0.12, [84, 128, 240]], [0, [84, 128, 240]]];
  B.VOL_COLORS = VOL_COLORS;
  function volGradient(ctx, x, y, R, alpha) {
    const Au = App.Audio, g = ctx.createRadialGradient(x, y, 0, x, y, R);
    for (const [v, c] of VOL_COLORS) {
      const a = v === 0 ? 0 : alpha * (0.45 + 0.55 * v);
      g.addColorStop(U.clamp(Au.distanceFor(v), 0, 1), `rgba(${c[0]},${c[1]},${c[2]},${a})`);
    }
    return g;
  }
  function drawSoundRange(ctx, sc, snd, p, R, sel) {
    const z = B.cam.z, base = sel ? 0.42 : 0.16, occ = App.Audio.OCCLUDED;
    const grad = volGradient(ctx, p.x, p.y, R, base);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, sc.cols * sc.grid, sc.rows * sc.grid); ctx.clip(); // só dentro do mapa
    // Atrás das paredes o som chega abafado: área mais apagada
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = occ; ctx.fillStyle = grad; ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    ctx.restore();
    const poly = App.Light && (sc.walls || []).length ? App.Light.visibility(sc, p.x, p.y, R) : null;
    ctx.save();
    ctx.beginPath();
    if (poly) { ctx.moveTo(poly[0], poly[1]); for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]); ctx.closePath(); }
    else ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = (1 - occ) / (1 - occ * base);
    ctx.fillStyle = grad; ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    ctx.restore();
    ctx.restore();
    // borda e anéis de volume (no som selecionado)
    ctx.save();
    ctx.setLineDash([8 / z, 7 / z]); ctx.lineWidth = (sel ? 1.6 : 1) / z;
    ctx.strokeStyle = sel ? 'rgba(120,150,245,.9)' : 'rgba(120,150,245,.35)';
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke();
    if (sel) {
      ctx.font = '600 ' + 10.5 / z + 'px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const v of [0.75, 0.5, 0.25, 0.1]) {
        const rr = R * App.Audio.distanceFor(v);
        ctx.setLineDash([3 / z, 5 / z]); ctx.lineWidth = 1 / z; ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
        const lbl = Math.round(v * 100) + '%', ly = p.y - rr, tw = ctx.measureText(lbl).width;
        ctx.setLineDash([]);
        roundRect(ctx, p.x - tw / 2 - 4 / z, ly - 7 / z, tw + 8 / z, 14 / z, 3 / z);
        ctx.fillStyle = 'rgba(17,17,20,.85)'; ctx.fill();
        ctx.fillStyle = '#e8e6ef'; ctx.fillText(lbl, p.x, ly + 0.5 / z);
      }
    }
    ctx.restore();
  }
  // ---------- imagens no mapa ----------
  // Maior nível entre tokens e imagens (para pôr algo por cima de tudo) e o menor (para pôr por baixo)
  B.maxZ = (sc) => Object.values(sc.tokens).concat(sc.props || []).reduce((m, o) => Math.max(m, o.z || 0), 0);
  B.minZ = (sc) => Object.values(sc.tokens).concat(sc.props || []).reduce((m, o) => Math.min(m, o.z || 0), 0);
  // Estado da imagem agora (com o arraste em andamento aplicado)
  const propNow = (p) => (B.propDrag && B.propDrag.id === p.id ? Object.assign({}, p, B.propDrag.cur) : p);
  const pCenter = (q) => ({ x: q.x + q.w / 2, y: q.y + q.h / 2 });
  function pLocal(q, p) {
    const c = pCenter(q), a = -((q.rot || 0) * Math.PI) / 180, dx = p.x - c.x, dy = p.y - c.y;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  }
  function pWorld(q, l) {
    const c = pCenter(q), a = ((q.rot || 0) * Math.PI) / 180;
    return { x: c.x + l.x * Math.cos(a) - l.y * Math.sin(a), y: c.y + l.x * Math.sin(a) + l.y * Math.cos(a) };
  }
  function drawProp(ctx, p0) {
    const q = propNow(p0), img = App.Images.get(q.img), gm = S().gmView(), c = pCenter(q);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(((q.rot || 0) * Math.PI) / 180);
    if (q.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = (q.opacity ?? 1) * (q.hidden && gm ? 0.45 : 1);
    if (img) ctx.drawImage(img, -q.w / 2, -q.h / 2, q.w, q.h);
    else { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); }
    if (q.hidden && gm) {
      ctx.globalAlpha = 1; ctx.setLineDash([6 / B.cam.z, 4 / B.cam.z]); ctx.lineWidth = 1.5 / B.cam.z; ctx.strokeStyle = 'rgba(10,9,14,.9)';
      ctx.strokeRect(-q.w / 2, -q.h / 2, q.w, q.h);
    }
    ctx.restore();
  }
  const ROT_OFF = 26; // distância da alça de giro (px de tela)
  function drawPropFrame(ctx, q) {
    const z = B.cam.z, c = pCenter(q), hs = 5 / z;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(((q.rot || 0) * Math.PI) / 180);
    ctx.lineWidth = 1.5 / z; ctx.strokeStyle = C.sel; ctx.setLineDash(q.locked ? [6 / z, 4 / z] : []);
    ctx.strokeRect(-q.w / 2, -q.h / 2, q.w, q.h);
    ctx.setLineDash([]);
    if (!q.locked) {
      ctx.beginPath(); ctx.moveTo(0, -q.h / 2); ctx.lineTo(0, -q.h / 2 - ROT_OFF / z); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.fillRect(sx * q.w / 2 - hs, sy * q.h / 2 - hs, hs * 2, hs * 2); ctx.strokeRect(sx * q.w / 2 - hs, sy * q.h / 2 - hs, hs * 2, hs * 2); }
      ctx.beginPath(); ctx.arc(0, -q.h / 2 - ROT_OFF / z, 6 / z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // Imagem do topo no ponto (só o mestre mexe em imagens)
  function propAt(sc, p) {
    if (!S().gmView() || !B.layers.props) return null;
    const list = (sc.props || []).slice().sort((a, b) => (b.z || 0) - (a.z || 0));
    for (const q of list) { const l = pLocal(q, p); if (Math.abs(l.x) <= q.w / 2 && Math.abs(l.y) <= q.h / 2) return q; }
    return null;
  }
  // Alça sob o ponteiro: canto (redimensionar) ou bolinha de cima (girar)
  function propHandleAt(q, p) {
    if (q.locked) return null;
    const z = B.cam.z, tol = 9 / z, l = pLocal(q, p);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) if (Math.abs(l.x - sx * q.w / 2) <= tol && Math.abs(l.y - sy * q.h / 2) <= tol) return { mode: 'resize', sx, sy };
    if (Math.hypot(l.x, l.y + q.h / 2 + ROT_OFF / z) <= tol * 1.3) return { mode: 'rotate' };
    return null;
  }
  // Coloca uma imagem no mapa: lado maior com 2 quadrados, proporção mantida, encaixada no grid, por baixo dos tokens
  B.addProp = function (sc, imgId, p, natW, natH, name) {
    if (!sc || !S().gmView()) return null;
    const g = sc.grid, half = g / 2, r = natW && natH ? natW / natH : 1, long = 2 * g;
    let w = r >= 1 ? long : long * r, h = r >= 1 ? long / r : long;
    w = Math.max(half, Math.round(w / half) * half); h = Math.max(half, Math.round(h / half) * half);
    const x = Math.round((p.x - w / 2) / g) * g, y = Math.round((p.y - h / 2) / g) * g;
    const prop = { id: U.uid('pr_'), img: imgId, name: name || 'Imagem', x, y, w, h, rot: 0, flip: false, hidden: false, opacity: 1, locked: false, z: B.minZ(sc) - 1 };
    S().dispatch({ type: 'prop.add', sceneId: sc.id, prop });
    B.selectedProp = prop.id; B.selected = null; B.selectedSound = null; B.selectedRoom = null;
    B.requestRender();
    return prop;
  };
  B.addPropFromFile = async function (file, p) {
    const sc = S().currentScene();
    if (!sc) return null;
    try {
      const r = await App.Images.add(file, App.Images.PROP);
      return B.addProp(sc, r.id, p || B.viewCenter(), r.w, r.h, String(file.name || 'Imagem').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 40));
    } catch (e) { U.toast(e.message, 'error'); return null; }
  };
  // Imagem que já está na campanha (biblioteca): descobre o tamanho e coloca
  B.placeImage = function (imgId, p) {
    const sc = S().currentScene(), src = App.Images.src(imgId);
    if (!sc || !src) return;
    const old = (Object.values(S().state.scenes).flatMap((x) => x.props || [])).find((x) => x.img === imgId);
    const im = new Image();
    im.onload = () => B.addProp(S().currentScene(), imgId, p || B.viewCenter(), im.naturalWidth, im.naturalHeight, old && old.name);
    im.src = src;
  };
  B.duplicateProp = function (sc, id) {
    const q = (sc.props || []).find((x) => x.id === id);
    if (!q) return;
    const c = Object.assign({}, q, { id: U.uid('pr_'), x: q.x + sc.grid, y: q.y + sc.grid, z: (q.z || 0) + 0.5 });
    S().dispatch({ type: 'prop.add', sceneId: sc.id, prop: c });
    S().dispatch({ type: 'order.move', sceneId: sc.id, kind: 'prop', id: c.id, dir: 'none' });
    B.selectedProp = c.id;
  };

  // ---------- salas de som ----------
  const ROOM_C = '#5fd0c8';
  function roomPath(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function drawRooms(ctx, sc) {
    const z = B.cam.z, mine = App.Audio && App.Audio.myRoom ? App.Audio.myRoom() : null;
    for (const r of sc.rooms || []) {
      if (!r.pts || r.pts.length < 3) continue;
      const sel = B.selectedRoom === r.id;
      ctx.save();
      roomPath(ctx, r.pts);
      ctx.fillStyle = sel ? 'rgba(95,208,200,.16)' : 'rgba(95,208,200,.07)'; ctx.fill();
      ctx.setLineDash([10 / z, 5 / z]); ctx.lineWidth = (sel ? 3 : 2) / z; ctx.strokeStyle = sel ? '#fff' : ROOM_C; ctx.stroke();
      ctx.setLineDash([]);
      // etiqueta no canto de cima: nome e música
      const top = r.pts.reduce((a, p) => (p[1] < a[1] || (p[1] === a[1] && p[0] < a[0]) ? p : a), r.pts[0]);
      const lbl = (r.name || 'Sala') + (r.music ? '  ♪ ' + App.Audio.label(r.music.name) : '  · sem música') + (mine && mine.id === r.id ? '  (ouvindo)' : '');
      ctx.font = '600 ' + 11 / z + 'px ' + SANS; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lbl).width, lx = top[0] + 6 / z, ly = top[1] + 12 / z;
      roundRect(ctx, lx - 5 / z, ly - 8 / z, tw + 10 / z, 16 / z, 4 / z);
      ctx.fillStyle = 'rgba(12,22,24,.88)'; ctx.fill();
      ctx.lineWidth = 1 / z; ctx.strokeStyle = sel ? '#fff' : ROOM_C; ctx.stroke();
      ctx.fillStyle = r.music ? ROOM_C : '#9aa'; ctx.fillText(lbl, lx, ly + 0.5 / z);
      ctx.restore();
    }
    // rascunhos
    ctx.save();
    ctx.setLineDash([10 / z, 5 / z]); ctx.lineWidth = 2 / z; ctx.strokeStyle = ROOM_C; ctx.fillStyle = 'rgba(95,208,200,.12)';
    if (B.roomDraft) { const d = norm(B.roomDraft); ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeRect(d.x, d.y, d.w, d.h); }
    if (B.roomPoly && B.roomPoly.pts.length) {
      const pts = B.roomPoly.pts.concat(B.roomPoly.hover ? [B.roomPoly.hover] : []);
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.setLineDash([]);
      B.roomPoly.pts.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, (i ? 4 : 7) / z, 0, Math.PI * 2); ctx.fillStyle = i ? ROOM_C : '#fff'; ctx.fill(); });
    }
    ctx.restore();
  }
  function finishRoomPoly(sc) {
    const pts = [];
    for (const p of (B.roomPoly && B.roomPoly.pts) || []) { const l = pts[pts.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) pts.push(p); }
    B.roomPoly = null;
    if (pts.length < 3) { U.toast('Uma sala precisa de pelo menos 3 cantos.'); return; }
    addRoom(sc, pts);
  }
  function addRoom(sc, pts) {
    const n = (sc.rooms || []).length + 1;
    const room = { id: U.uid('room_'), name: 'Sala ' + n, pts: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), music: null, at: Date.now(), vol: 1, ambient: 'stop' };
    S().dispatch({ type: 'room.add', sceneId: sc.id, room });
    B.selectedRoom = room.id; B.selected = null; B.selectedSound = null;
    U.toast('Sala criada. Solte uma música dentro dela ou escolha no painel.');
  }
  B.addRoom = addRoom;

  function drawSounds(ctx, sc) {
    const z = B.cam.z;
    for (const snd of sc.sounds || []) {
      const p = soundPos(snd), sel = B.selectedSound === snd.id, R = (Number(snd.r) || 8) * sc.grid, r = 13 / z;
      ctx.save();
      drawSoundRange(ctx, sc, snd, p, R, sel);
      // marcador: violeta = repetindo, cinza = silenciado, dourado = efeito (toca quando o mestre mandar)
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = snd.once ? C.gold : snd.on ? C.sel : '#3a3550'; ctx.fill();
      ctx.lineWidth = (sel ? 2.5 : 1.5) / z; ctx.strokeStyle = sel ? '#fff' : 'rgba(17,17,20,.9)'; ctx.stroke();
      // alto-falante
      const u = r / 13;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 / z; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - 6 * u, p.y - 2.5 * u); ctx.lineTo(p.x - 3 * u, p.y - 2.5 * u); ctx.lineTo(p.x + 1 * u, p.y - 6 * u);
      ctx.lineTo(p.x + 1 * u, p.y + 6 * u); ctx.lineTo(p.x - 3 * u, p.y + 2.5 * u); ctx.lineTo(p.x - 6 * u, p.y + 2.5 * u); ctx.closePath(); ctx.fill();
      if (snd.once) ctx.fillStyle = '#17130a';
      if (snd.on || snd.once) {
        ctx.beginPath(); ctx.arc(p.x + 1 * u, p.y, 4.5 * u, -0.7, 0.7); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x + 1 * u, p.y, 7.5 * u, -0.7, 0.7); ctx.stroke();
      }
      // nome
      const label = App.Audio ? App.Audio.label(snd.name) : snd.name;
      ctx.font = '600 ' + 11 / z + 'px ' + SANS;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const tw = ctx.measureText(label).width;
      roundRect(ctx, p.x - tw / 2 - 6 / z, p.y + r + 4 / z, tw + 12 / z, 17 / z, 4 / z);
      ctx.fillStyle = C.plate; ctx.fill();
      ctx.fillStyle = sel ? '#fff' : '#cfc9e6';
      ctx.fillText(label, p.x, p.y + r + 7 / z);
      ctx.restore();
    }
  }
  function soundAt(sc, p) {
    if (!S().gmView() || !B.layers.sounds) return null;
    const r = 16 / B.cam.z;
    const list = sc.sounds || [];
    for (let i = list.length - 1; i >= 0; i--) if (Math.hypot(p.x - list[i].x, p.y - list[i].y) <= r) return list[i];
    return null;
  }
  B.soundScreenPos = function (snd) { return toScreen(snd.x, snd.y); };

  // ---------- pontos de luz e de escuridão (marcadores do mestre) ----------
  const DARK_C = '#9a8cff';
  // Estado do ponto agora (com o arraste em andamento aplicado)
  function lightNow(o) { return B.lightDrag && B.lightDrag.id === o.id ? Object.assign({}, o, B.lightDrag.cur) : o; }
  const lightCenter = (o) => (o.shape === 'area' && o.pts && o.pts.length ? LT().areaCenter(o.pts) : { x: o.x, y: o.y });
  // Alças: alcance total (dim) e luz plena (bright), na direção do ponto
  function lightHandles(sc, o) {
    if (o.shape === 'area') return [];
    const a = ((Number(o.dir) || 0) * Math.PI) / 180, g = sc.grid, c = lightCenter(o);
    const at = (r) => ({ x: c.x + Math.cos(a) * r * g, y: c.y + Math.sin(a) * r * g });
    return [Object.assign(at(Number(o.dim) || 0), { mode: 'dim' }), Object.assign(at(Math.min(Number(o.bright) || 0, Number(o.dim) || 0)), { mode: 'bright' })];
  }
  function lightAt(sc, p) {
    if (!S().gmView() || !B.layers.lights) return null;
    const r = 15 / B.cam.z, list = sc.lights || [];
    const sel = B.selectedLight && list.find((o) => o.id === B.selectedLight);
    if (sel) for (const hd of lightHandles(sc, sel)) if (Math.hypot(p.x - hd.x, p.y - hd.y) <= 9 / B.cam.z) return { o: sel, mode: hd.mode };
    for (let i = list.length - 1; i >= 0; i--) { const c = lightCenter(list[i]); if (Math.hypot(p.x - c.x, p.y - c.y) <= r) return { o: list[i], mode: 'move' }; }
    return null;
  }
  B.lightAt = lightAt;
  function lightOutline(ctx, sc, o, col, z) {
    const g = sc.grid, c = lightCenter(o);
    ctx.strokeStyle = col;
    if (o.shape === 'area') { if (o.pts && o.pts.length >= 3) { roomPath(ctx, o.pts); ctx.stroke(); } return; }
    const R = (Number(o.dim) || 0) * g, r = Math.min(Number(o.bright) || 0, Number(o.dim) || 0) * g;
    if (o.shape === 'cone') {
      const a = ((Number(o.dir) || 0) * Math.PI) / 180, hf = ((U.clamp(Number(o.angle) || 60, 10, 340) / 2) * Math.PI) / 180;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.arc(c.x, c.y, R, a - hf, a + hf); ctx.closePath(); ctx.stroke();
      if (r > 0) { ctx.lineWidth /= 1.6; ctx.beginPath(); ctx.arc(c.x, c.y, r, a - hf, a + hf); ctx.stroke(); ctx.lineWidth *= 1.6; }
      return;
    }
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
    if (r > 0) { ctx.lineWidth /= 1.6; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth *= 1.6; }
  }
  function drawLightPoints(ctx, sc) {
    const z = B.cam.z, showAll = B.tool === 'light';
    for (const o0 of sc.lights || []) {
      const o = lightNow(o0), sel = B.selectedLight === o.id, dark = o.kind === 'dark', on = o.on !== false;
      const col = dark ? DARK_C : U.safeColor(o.color, LT().WARM), c = lightCenter(o), r = 12 / z;
      ctx.save();
      if (sel || showAll) {
        ctx.setLineDash([8 / z, 6 / z]); ctx.lineWidth = (sel ? 2 : 1.3) / z; ctx.globalAlpha = sel ? 0.95 : 0.55;
        lightOutline(ctx, sc, o, col, z);
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      if (sel) {
        const hs = lightHandles(sc, o);
        if (hs.length) {
          ctx.lineWidth = 1.2 / z; ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(hs[0].x, hs[0].y); ctx.stroke();
          for (const hd of hs) {
            const s = (hd.mode === 'dim' ? 6 : 4.5) / z;
            ctx.fillStyle = hd.mode === 'dim' ? '#fff' : col; ctx.strokeStyle = 'rgba(17,17,20,.9)';
            ctx.fillRect(hd.x - s, hd.y - s, s * 2, s * 2); ctx.strokeRect(hd.x - s, hd.y - s, s * 2, s * 2);
          }
        }
      }
      // marcador: lâmpada (luz), lua (escuridão), cinza quando apagado
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = !on ? '#3a3550' : dark ? '#1b1830' : col; ctx.fill();
      ctx.lineWidth = (sel ? 2.5 : 1.5) / z; ctx.strokeStyle = sel ? '#fff' : dark ? DARK_C : 'rgba(17,17,20,.9)'; ctx.stroke();
      const u = r / 12, ink = !on ? '#9b97ad' : dark ? DARK_C : '#1c1712';
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.5 / z;
      if (dark) {
        ctx.beginPath(); ctx.arc(c.x, c.y, 6 * u, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b1830'; ctx.beginPath(); ctx.arc(c.x + 3 * u, c.y - 2.5 * u, 5.2 * u, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(c.x, c.y - 1.5 * u, 4.6 * u, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(c.x - 2.2 * u, c.y + 3 * u, 4.4 * u, 2.4 * u);
        if (o.shape === 'cone') { // seta da direção
          const a = ((Number(o.dir) || 0) * Math.PI) / 180;
          ctx.strokeStyle = sel ? '#fff' : col; ctx.lineWidth = 2 / z;
          ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); ctx.lineTo(c.x + Math.cos(a) * (r + 7 / z), c.y + Math.sin(a) * (r + 7 / z)); ctx.stroke();
        }
      }
      if (!on) { ctx.strokeStyle = '#9b97ad'; ctx.lineWidth = 1.6 / z; ctx.beginPath(); ctx.moveTo(c.x - 7 * u, c.y + 7 * u); ctx.lineTo(c.x + 7 * u, c.y - 7 * u); ctx.stroke(); }
      if (sel || showAll) {
        const label = (o.name || (dark ? 'Escuridão' : 'Luz')) + (on ? '' : ' · apagada');
        ctx.font = '600 ' + 11 / z + 'px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const tw = ctx.measureText(label).width;
        roundRect(ctx, c.x - tw / 2 - 6 / z, c.y + r + 4 / z, tw + 12 / z, 17 / z, 4 / z);
        ctx.fillStyle = C.plate; ctx.fill();
        ctx.fillStyle = sel ? '#fff' : '#cfc9e6';
        ctx.fillText(label, c.x, c.y + r + 7 / z);
      }
      ctx.restore();
    }
    // rascunhos
    const d = B.lightDraft, col = B.lightKind === 'dark' ? DARK_C : LT().WARM;
    ctx.save();
    ctx.setLineDash([8 / z, 6 / z]); ctx.lineWidth = 2 / z; ctx.strokeStyle = col; ctx.fillStyle = B.lightKind === 'dark' ? 'rgba(20,16,40,.35)' : 'rgba(255,180,90,.12)';
    if (d && d.moved) lightOutline(ctx, sc, draftLight(sc, d), col, z);
    if (B.lightPoly && B.lightPoly.pts.length) {
      const pts = B.lightPoly.pts.concat(B.lightPoly.hover ? [B.lightPoly.hover] : []);
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.setLineDash([]);
      B.lightPoly.pts.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, (i ? 4 : 7) / z, 0, Math.PI * 2); ctx.fillStyle = i ? col : '#fff'; ctx.fill(); });
    }
    ctx.restore();
  }
  // Ponto de luz completo, com os valores padrão
  B.newLight = function (sc, part) {
    const dark = part.kind === 'dark', shape = part.shape || 'circle';
    const name = dark ? 'Escuridão' : shape === 'cone' ? 'Holofote' : shape === 'area' ? 'Área de luz' : 'Luz';
    const o = Object.assign({ id: U.uid('lt_'), name, kind: dark ? 'dark' : 'light', shape, x: 0, y: 0,
      bright: dark ? 3 : 4, dim: dark ? 4 : 8, dir: 0, angle: 60, pts: null, edge: 0, color: LT().WARM, tint: 0.4, flicker: false, on: true }, part);
    if (o.shape === 'area' && o.pts) { const c = LT().areaCenter(o.pts); o.x = Math.round(c.x); o.y = Math.round(c.y); }
    return o;
  };
  B.addLight = function (sc, part) {
    if (!sc || !S().gmView()) return null;
    const o = B.newLight(sc, part);
    S().dispatch({ type: 'lightpt.add', sceneId: sc.id, light: o });
    B.selectedLight = o.id; B.selected = null; B.selectedSound = null; B.selectedRoom = null; B.selectedProp = null;
    if (!LT().active(sc)) U.toast('Ligue "Luz e visão dinâmicas" (Camadas → Iluminação) para a luz fazer efeito.', 'info', 5000);
    B.requestRender();
    return o;
  };
  B.duplicateLight = function (sc, id) {
    const o = (sc.lights || []).find((x) => x.id === id);
    if (!o) return;
    const g = sc.grid, c = Object.assign(U.clone(o), { id: U.uid('lt_'), x: o.x + g, y: o.y + g });
    if (c.pts) c.pts = c.pts.map(([x, y]) => [x + g, y + g]);
    S().dispatch({ type: 'lightpt.add', sceneId: sc.id, light: c });
    B.selectedLight = c.id;
    B.requestRender();
  };
  // Círculo ou cone em criação: arrastar define o alcance (e a direção do cone)
  function draftLight(sc, d) {
    const g = sc.grid, dist = Math.hypot(d.p.x - d.x, d.p.y - d.y) / g, dark = B.lightKind === 'dark';
    const dim = Math.max(0.5, Math.round(dist * 2) / 2);
    const dir = Math.round((Math.atan2(d.p.y - d.y, d.p.x - d.x) * 180) / Math.PI);
    if (d.shape === 'cone') return { shape: 'cone', kind: B.lightKind, x: d.x, y: d.y, dim, bright: Math.round(dim * 0.6 * 2) / 2, dir, angle: 60 };
    return { shape: 'circle', kind: B.lightKind, x: d.x, y: d.y, dim, bright: dark ? Math.max(0, dim - 1) : Math.round(dim / 2 * 2) / 2, dir: 0 };
  }
  function finishLightPoly(sc) {
    const pts = [];
    for (const p of (B.lightPoly && B.lightPoly.pts) || []) { const l = pts[pts.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) pts.push(p); }
    B.lightPoly = null;
    if (pts.length < 3) { U.toast('Uma área precisa de pelo menos 3 cantos.'); return; }
    B.addLight(sc, { kind: B.lightKind, shape: 'area', pts: pts.map(([x, y]) => [Math.round(x), Math.round(y)]) });
  }
  // Arraste de um ponto: mover, alcance total (dim) ou luz plena (bright)
  function dragLight(sc, d, p, e) {
    const s0 = d.start, g = sc.grid, cur = d.cur;
    if (d.mode === 'move') {
      let dx = p.x - d.p0.x, dy = p.y - d.p0.y;
      if (B.style.snap && !e.altKey) {
        const c0 = lightCenter(s0), half = g / 2;
        dx = Math.round((c0.x + dx) / half) * half - c0.x; dy = Math.round((c0.y + dy) / half) * half - c0.y;
      }
      cur.x = s0.x + dx; cur.y = s0.y + dy;
      if (s0.pts) cur.pts = s0.pts.map(([x, y]) => [x + dx, y + dy]);
      d.moved = d.moved || Math.abs(dx) + Math.abs(dy) > 2;
      return;
    }
    const c = lightCenter(s0), r = Math.max(0, Math.round((Math.hypot(p.x - c.x, p.y - c.y) / g) * 2) / 2);
    let dir = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;
    if (e.shiftKey) dir = Math.round(dir / 15) * 15;
    if (d.mode === 'dim') { cur.dim = Math.max(0.5, r); cur.bright = Math.min(Number(s0.bright) || 0, cur.dim); cur.dir = Math.round(dir); }
    else cur.bright = Math.min(r, Number(s0.dim) || 0);
    d.moved = true;
  }

  // ---------- paredes e portas ----------
  const WALL_COLOR = { full: '#b07cff', high: '#e07b4f', three: '#e8b44f', half: '#6fc2b0' };
  B.wallType = 'high'; // tipo das próximas paredes (escolhido nas opções da ferramenta)
  function drawWall(ctx, w, draft) {
    const z = B.cam.z;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 6 / z; ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    ctx.lineWidth = 3 / z;
    const type = w.door ? 'full' : CB().wallType(w);
    ctx.strokeStyle = w.door ? C.gold : WALL_COLOR[type];
    if (w.door && w.open) ctx.setLineDash([6 / z, 6 / z]);
    else if (type === 'three') ctx.setLineDash([12 / z, 6 / z]);
    else if (type === 'half') ctx.setLineDash([2 / z, 6 / z]);
    if (draft) ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    // Etiqueta no meio: A (parede absoluta), ¾ ou ½. A cobertura total, a mais comum, fica sem marca
    if (!w.door && type !== 'high' && Math.hypot(w.x2 - w.x1, w.y2 - w.y1) * z > 40) {
      const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2, rr = 8 / z;
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(mx, my, rr, 0, Math.PI * 2); ctx.fillStyle = '#17151d'; ctx.fill();
      ctx.lineWidth = 1.5 / z; ctx.strokeStyle = WALL_COLOR[type]; ctx.stroke();
      ctx.fillStyle = WALL_COLOR[type]; ctx.font = '700 ' + 10 / z + 'px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(type === 'three' ? '¾' : type === 'half' ? '½' : 'A', mx, my + 0.5 / z);
    }
    ctx.restore();
  }
  function drawDoorMark(ctx, w) {
    const z = B.cam.z, mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2, r = 9 / z;
    ctx.save();
    roundRect(ctx, mx - r, my - r, r * 2, r * 2, 3 / z);
    ctx.fillStyle = w.open ? 'rgba(17,17,20,.85)' : C.gold; ctx.fill();
    ctx.lineWidth = 1.5 / z; ctx.strokeStyle = w.open ? C.gold : 'rgba(17,17,20,.9)'; ctx.stroke();
    ctx.fillStyle = w.open ? C.gold : '#17130a';
    ctx.beginPath(); ctx.arc(mx + r * 0.35, my, 1.6 / z, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Mestre (modo edição) vê as paredes; portas aparecem para todos que as enxergam
  function drawWalls(ctx, sc, showWalls, viewers) {
    const walls = sc.walls || [];
    if (!walls.length) return;
    if (showWalls) for (const w of walls) drawWall(ctx, w);
    for (const w of walls) {
      if (!w.door) continue;
      const m = { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 };
      if (!showWalls && viewers && !doorVisible(sc, w, viewers)) continue;
      drawDoorMark(ctx, w);
    }
  }
  /*
   * Contorno das paredes para o jogador no escuro: uma linha clara nas paredes que os tokens dele enxergam
   * (linha de visão, mesmo sem luz), para ele saber o limite da sala. Portas em dourado; nada aparece debaixo da névoa.
   */
  function drawWallHints(ctx, sc, viewers) {
    const walls = sc.walls || [];
    if (!walls.length || !viewers || !viewers.length) return;
    const { dpr, cam } = B, cw = B.canvas.width, ch = B.canvas.height, z = cam.z;
    const c = B.hintCanvas || (B.hintCanvas = document.createElement('canvas'));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, ch);
    x.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * z * dpr, -cam.y * z * dpr);
    const diag = Math.hypot(sc.cols * sc.grid, sc.rows * sc.grid) * 1.5;
    x.save();
    x.beginPath();
    for (const v of viewers) {
      const p = posOf(v), poly = LT().visibility(sc, p.x, p.y, diag, LT().eyeOf(v));
      x.moveTo(poly[0], poly[1]);
      for (let i = 2; i < poly.length; i += 2) x.lineTo(poly[i], poly[i + 1]);
      x.closePath();
    }
    x.clip(); // só o que algum token vê (a linha fica na borda da visão: metade dela aparece)
    // Bem sutil: o foco é o desenho do mapa, a linha só sugere o limite
    x.lineCap = 'round'; x.lineWidth = 2.4 / z;
    for (const w of walls) {
      x.strokeStyle = w.door ? 'rgba(226,186,110,.38)' : 'rgba(225,223,235,.2)';
      x.setLineDash(w.door && w.open ? [6 / z, 6 / z] : []);
      x.beginPath(); x.moveTo(w.x1, w.y1); x.lineTo(w.x2, w.y2); x.stroke();
    }
    x.restore();
    // Debaixo da névoa de guerra não aparece nada
    if (sc.fog && sc.fog.enabled && B.fogCache.canvas) {
      x.globalCompositeOperation = 'destination-out';
      x.drawImage(B.fogCache.canvas, 0, 0, sc.cols * sc.grid, sc.rows * sc.grid);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
  function doorVisible(sc, w, viewers) {
    // Testa um ponto um pouco antes da porta, dos dois lados
    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, nx = -(w.y2 - w.y1) / len * 6, ny = (w.x2 - w.x1) / len * 6;
    return LT().pointVisible(sc, { x: mx + nx, y: my + ny }, viewers, posOf) || LT().pointVisible(sc, { x: mx - nx, y: my - ny }, viewers, posOf);
  }
  function doorAt(sc, p) {
    const r = 12 / B.cam.z, viewers = lightViewers(sc);
    for (const w of sc.walls || []) {
      if (!w.door) continue;
      const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
      if (Math.abs(p.x - mx) <= r && Math.abs(p.y - my) <= r && (!viewers || doorVisible(sc, w, viewers))) return w;
    }
    return null;
  }
  function wallAt(sc, p) {
    const tol = 8 / B.cam.z;
    let best = null, bd = tol;
    for (const w of sc.walls || []) {
      const d = distSeg(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
      if (d <= bd) { bd = d; best = w; }
    }
    return best;
  }
  const snapVertex = (sc, p) => ({ x: Math.round(p.x / sc.grid) * sc.grid, y: Math.round(p.y / sc.grid) * sc.grid });

  // Pontos de fundo fora do mapa (acompanham a câmera)
  function drawDots(ctx) {
    const z = B.cam.z;
    const sp = 24 * Math.max(1, Math.round(1 / Math.max(z, 0.25)));
    const d = sp * z;
    if (d < 8) return;
    const ox = -(((B.cam.x * z) % d) + d) % d, oy = -(((B.cam.y * z) % d) + d) % d;
    ctx.fillStyle = C.dots;
    for (let x = ox; x < B.w; x += d) for (let y = oy; y < B.h; y += d) ctx.fillRect(x, y, 1.4, 1.4);
  }

  function drawGrid(ctx, sc, W, H) {
    const g = sc.grid, z = B.cam.z;
    const x0 = Math.max(0, Math.floor(B.cam.x / g) * g), x1 = Math.min(W, B.cam.x + B.w / z);
    const y0 = Math.max(0, Math.floor(B.cam.y / g) * g), y1 = Math.min(H, B.cam.y + B.h / z);
    ctx.save();
    ctx.strokeStyle = U.hexA(sc.gridColor || '#ffffff', (sc.gridAlpha ?? 0.15) * 0.7);
    ctx.lineWidth = 1 / z;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += g) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += g) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawShape(ctx, d) {
    ctx.save();
    ctx.strokeStyle = d.color;
    ctx.fillStyle = U.hexA(d.color, d.fill || 0.35);
    ctx.lineWidth = d.width;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (d.type === 'path') {
      const p = d.points;
      if (p.length >= 2) {
        ctx.moveTo(p[0], p[1]);
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
        if (p.length === 2) ctx.lineTo(p[0] + 0.1, p[1]);
        ctx.stroke();
      }
    } else if (d.type === 'line') {
      ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
    } else if (d.type === 'rect') {
      const r = norm(d);
      ctx.rect(r.x, r.y, r.w, r.h);
      if (d.fill) ctx.fill();
      ctx.stroke();
    } else if (d.type === 'ellipse') {
      const r = norm(d);
      ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
      if (d.fill) ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCover(ctx, img, x, y, w, h) {
    const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }

  function drawToken(ctx, sc, t, isTurn) {
    const g = sc.grid, s = (t.size || 1) * g, z = B.cam.z;
    let x = t.x, y = t.y;
    if (B.drag && B.drag.id === t.id) { x = B.drag.x; y = B.drag.y; }
    const a = S().actorOf(t);
    const img = App.Images.get(t.img || (a && a.img));
    const cx = x + s / 2, cy = y + s / 2, r = s * 0.4;
    const color = U.safeColor(t.color || (a && a.color), '#6b6a75');
    const bars = S().barsOf(t);
    const dead = bars[0] && bars[0].max > 0 && Number(bars[0].value) <= 0;
    const sel = B.selected === t.id;

    if (B.silhouettes.has(t.id)) { drawSilhouette(ctx, cx, cy, r, s, z); return; }
    const fly = CB().flyOf(t);
    if (fly > 0) {
      // sombra no chão, mais afastada e menor quanto mais alto
      const k = Math.min(1, fly / 12);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx + r * 0.25 * k, cy + r * (0.55 + 0.35 * k), r * (0.85 - 0.25 * k), r * (0.32 - 0.1 * k), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.42 - 0.18 * k) + ')'; ctx.fill();
      ctx.restore();
    }
    ctx.save();
    if (t.hidden) ctx.globalAlpha = 0.45;
    // Mestre vê o token normal, com um aro tracejado escuro: para os jogadores ele é um vulto
    if (t.masked) {
      ctx.save();
      ctx.setLineDash([5 / z, 4 / z]); ctx.lineWidth = Math.max(2, s * 0.05); ctx.strokeStyle = 'rgba(10,9,14,.9)';
      ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(4, s * 0.07), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Halo de turno / seleção
    if (isTurn || sel) {
      ctx.save();
      ctx.shadowColor = isTurn ? C.turn : C.sel; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(3, s * 0.05), 0, Math.PI * 2);
      ctx.strokeStyle = isTurn ? C.turn : C.sel; ctx.lineWidth = Math.max(2.5, s * 0.04); ctx.stroke();
      ctx.restore();
    }
    // Disco com sombra no chão
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = s * 0.18; ctx.shadowOffsetY = s * 0.05;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    grad.addColorStop(0, shade(color, 0.25)); grad.addColorStop(1, shade(color, -0.35));
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (img) {
      ctx.save(); ctx.clip(); drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2); ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.font = '600 ' + r * 0.82 + 'px ' + SERIF;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((t.name || '?').trim().slice(0, 1).toUpperCase(), cx, cy + r * 0.04);
    }
    // Aro claro
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.strokeStyle = 'rgba(236,229,214,.85)';
    ctx.stroke();

    if (dead) {
      ctx.fillStyle = 'rgba(13,13,16,.55)'; ctx.fill();
      ctx.strokeStyle = C.danger; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
      ctx.beginPath();
      const k = r * 0.5;
      ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k);
      ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k);
      ctx.stroke();
    }

    // Placa com o nome (+ barra principal para o mestre e o dono)
    const showBar = (S().gmView() || S().canControl(t)) && bars[0] && Number(bars[0].max) > 0;
    const fs = U.clamp(g * 0.2, 11 / z, 22);
    ctx.font = '600 ' + fs + 'px ' + SERIF;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = t.name || '';
    const tw = Math.min(ctx.measureText(name).width, s * 2.2);
    const pw = Math.max(tw + fs * 1.2, showBar ? s * 0.95 : 0), ph = fs * 1.45 + (showBar ? fs * 0.55 : 0);
    const px = cx - pw / 2, py = cy + r + Math.max(4, s * 0.06);
    roundRect(ctx, px, py, pw, ph, Math.min(4, fs * 0.3));
    ctx.fillStyle = C.plate; ctx.fill();
    ctx.lineWidth = 1 / z; ctx.strokeStyle = C.plateLine; ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.fillText(name, cx, py + fs * 0.75, s * 2.2);
    if (showBar) {
      const b0 = bars[0], pct = U.clamp(Number(b0.value) / Number(b0.max), 0, 1);
      const bw = pw - fs * 0.8, bh = Math.max(2, fs * 0.2), bx = cx - bw / 2, by = py + ph - fs * 0.45;
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = pct > 0.5 ? C.ok : pct > 0.25 ? C.warn : C.danger;
      ctx.fillRect(bx, by, bw * pct, bh);
    }

    if (fly > 0) {
      const lbl = '↑ ' + String(Math.round(fly * 10) / 10).replace('.', ',') + ' m';
      const fsz = U.clamp(g * 0.17, 10 / z, 18);
      ctx.font = '700 ' + fsz + 'px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lbl).width, bx = cx + r * 0.75, by = cy - r * 0.95;
      roundRect(ctx, bx - tw / 2 - fsz * 0.45, by - fsz * 0.7, tw + fsz * 0.9, fsz * 1.4, fsz * 0.7);
      ctx.fillStyle = 'rgba(91,139,224,.95)'; ctx.fill();
      ctx.lineWidth = 1 / z; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(lbl, bx, by + 0.5 / z);
    }

    // Condições (marcas douradas com a inicial)
    const conds = t.conditions || [];
    const cr = Math.max(6, g * 0.11);
    conds.slice(0, 5).forEach((c, i) => {
      const ang = -Math.PI / 4 + i * 0.62;
      const qx = cx + Math.cos(ang) * (r + cr * 0.2), qy = cy + Math.sin(ang) * (r + cr * 0.2) - r * 0.35;
      ctx.beginPath(); ctx.arc(qx, qy, cr, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2215'; ctx.fill();
      ctx.lineWidth = 1.5 / z; ctx.strokeStyle = C.gold; ctx.stroke();
      ctx.fillStyle = C.gold; ctx.font = '700 ' + cr * 1.05 + 'px ' + SANS;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(c.name.slice(0, 1).toUpperCase(), qx, qy + 0.5);
    });
    ctx.restore();
  }

  // Vulto: alguém agachado atrás de um muro baixo (sem nome, barras nem condições)
  function drawSilhouette(ctx, cx, cy, r, s, z) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12,11,16,.82)'; ctx.fill();
    ctx.setLineDash([4 / z, 4 / z]); ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.strokeStyle = 'rgba(236,229,214,.55)'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(236,229,214,.7)'; ctx.font = '600 ' + r * 0.9 + 'px ' + SERIF;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + r * 0.04);
    ctx.restore();
  }

  // O ponto está coberto pela névoa de guerra? (refaz as formas na ordem em que foram pintadas)
  function fogCovers(sc, p) {
    if (!sc.fog || !sc.fog.enabled) return false;
    let covered = true;
    for (const sh of sc.fog.shapes) if (sh.all || (p.x >= sh.x && p.x <= sh.x + sh.w && p.y >= sh.y && p.y <= sh.y + sh.h)) covered = sh.mode !== 'reveal';
    return covered;
  }

  function drawFog(ctx, sc, W, H) {
    if (!sc.fog || !sc.fog.enabled) return;
    const key = `${sc.id}:${sc.fog.v}:${sc.fog.shapes.length}:${W}x${H}`;
    const fc = B.fogCache;
    if (fc.key !== key) {
      const k = Math.min(1, 2048 / Math.max(W, H));
      const c = fc.canvas || document.createElement('canvas');
      c.width = Math.ceil(W * k); c.height = Math.ceil(H * k);
      const x = c.getContext('2d');
      x.setTransform(k, 0, 0, k, 0, 0);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#0a0a0c';
      x.fillRect(0, 0, W, H);
      for (const sh of sc.fog.shapes) {
        x.globalCompositeOperation = sh.mode === 'reveal' ? 'destination-out' : 'source-over';
        if (sh.all) x.fillRect(0, 0, W, H); else x.fillRect(sh.x, sh.y, sh.w, sh.h);
      }
      fc.key = key; fc.canvas = c;
    }
    ctx.save();
    ctx.globalAlpha = S().gmView() ? 0.45 : 1;
    ctx.drawImage(fc.canvas, 0, 0, W, H);
    ctx.restore();
  }

  // Caminho em vários trechos: linha tracejada (vermelha onde atravessa parede), pontos, distância de cada trecho e total
  function drawPath(ctx, sc, pts, opts = {}) {
    if (pts.length < 2) return;
    const z = B.cam.z, cost = pathCost(sc, pts);
    ctx.save();
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.lineWidth = (opts.trail ? 2 : 2.5) / z; ctx.setLineDash([10 / z, 6 / z]);
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = crossesWall(sc, pts[i - 1], pts[i]) ? C.danger : C.gold;
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
    ctx.setLineDash([]);
    pts.slice(0, -1).forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, (i ? 5 : 4) / z, 0, Math.PI * 2); ctx.fillStyle = i ? '#fff' : C.gold; ctx.fill(); if (i) { ctx.lineWidth = 2 / z; ctx.strokeStyle = C.gold; ctx.stroke(); } });
    // distância de cada trecho, no meio da linha (só quando há mais de um)
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    if (pts.length > 2) {
      ctx.font = '600 ' + 10.5 / z + 'px ' + SANS;
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1].x + pts[i].x) / 2, my = (pts[i - 1].y + pts[i].y) / 2, lbl = String(cost.segs[i - 1]).replace('.', ',');
        const tw = ctx.measureText(lbl).width;
        roundRect(ctx, mx - tw / 2 - 5 / z, my - 8 / z, tw + 10 / z, 16 / z, 4 / z); ctx.fillStyle = C.plate; ctx.fill();
        ctx.fillStyle = C.gold; ctx.fillText(lbl, mx, my + 0.5 / z);
      }
    }
    const b = pts[pts.length - 1], dist = Math.round(cost.total * sc.cellDist * 10) / 10;
    const label = `${String(cost.total).replace('.', ',')} quad. · ${String(dist).replace('.', ',')} ${sc.unit}`;
    ctx.font = '600 ' + 12.5 / z + 'px ' + SANS; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const tw = ctx.measureText(label).width, lx = b.x + 14 / z, ly = b.y - 28 / z;
    roundRect(ctx, lx - 8 / z, ly - 6 / z, tw + 16 / z, 25 / z, 6 / z);
    ctx.fillStyle = C.plate; ctx.fill();
    ctx.lineWidth = 1 / z; ctx.strokeStyle = 'rgba(210,162,76,.5)'; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.fillText(label, lx, ly);
    ctx.restore();
  }
  B.drawPath = drawPath;

  // Quadrados ao alcance da ação (recalculado só quando o token, o alcance ou as paredes mudam)
  function rangeZone(sc, src, act) {
    const R = CB().rangeOf(act), g = sc.grid, tg = B.targeting;
    if (!isFinite(R)) return null;
    const key = src.x + ',' + src.y + ',' + (src.size || 1) + ',' + R + ',' + (sc.wallsV || 0) + ',' + sc.measure + ',' + CB().heightOf(src) + JSON.stringify((sc.cover || {}).heights || {});
    if (tg.zoneKey === key) return tg.zone;
    const cells = new Set(), list = [], sz = (src.size || 1) * g;
    const c0 = Math.max(0, Math.floor(src.x / g) - R - 1), c1 = Math.min(sc.cols - 1, Math.floor((src.x + sz) / g) + R + 1);
    const r0 = Math.max(0, Math.floor(src.y / g) - R - 1), r1 = Math.min(sc.rows - 1, Math.floor((src.y + sz) / g) + R + 1);
    const o = CB().center(sc, src), walls = (sc.walls || []).length;
    for (let cx = c0; cx <= c1; cx++) {
      for (let cy = r0; cy <= r1; cy++) {
        const p = { x: cx * g + g / 2, y: cy * g + g / 2 };
        if (CB().distToPoint(sc, src, p) > R) continue;
        if (walls && LT().blocked(sc, o.x, o.y, p.x, p.y, CB().heightOf(src))) continue;
        cells.add(cx + ',' + cy); list.push([cx, cy]);
      }
    }
    const edges = [];
    for (const [cx, cy] of list) {
      if (!cells.has(cx + ',' + (cy - 1))) edges.push([cx, cy, cx + 1, cy]);
      if (!cells.has(cx + ',' + (cy + 1))) edges.push([cx, cy + 1, cx + 1, cy + 1]);
      if (!cells.has((cx - 1) + ',' + cy)) edges.push([cx, cy, cx, cy + 1]);
      if (!cells.has((cx + 1) + ',' + cy)) edges.push([cx + 1, cy, cx + 1, cy + 1]);
    }
    tg.zoneKey = key;
    tg.zone = { list, edges };
    return tg.zone;
  }

  // Chance de acerto contra o alvo (o jogador não vê se o mestre esconde a Defesa dos monstros)
  function hitChanceFor(sc, src, t) {
    const tg = B.targeting, act = tg.act;
    if (!act || act.mode !== 'attack' || !src) return null;
    const rules = S().state.rules || {};
    if (!S().gmView() && rules.hideNumbers && !S().canControl(t)) return null;
    if (!tg.chance.has(t.id)) {
      const base = S().statOf(t, act.defense || 'Defesa');
      const def = base == null ? null : base + CB().coverFromToken(sc, src, t).bonus;
      tg.chance.set(t.id, CB().hitChance(act, S().vars(S().actorOf(src), src), def));
    }
    return tg.chance.get(t.id);
  }

  // Etiqueta com tamanho fixo na tela, acima de um ponto do mapa
  function screenLabel(ctx, x, y, lines, color) {
    const p = toScreen(x, y);
    ctx.save();
    ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    const fontOf = (i) => (i ? '500 11.5px ' : '600 12.5px ') + SANS;
    const w = Math.max(...lines.map((l, i) => { ctx.font = fontOf(i); return ctx.measureText(l).width; })) + 20;
    const hgt = 10 + lines.length * 17;
    const lx = U.clamp(p.x - w / 2, 6, B.w - w - 6), ly = U.clamp(p.y - hgt - 10, 6, B.h - hgt - 6);
    roundRect(ctx, lx, ly, w, hgt, 7);
    ctx.fillStyle = C.plate; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = color; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => {
      ctx.font = fontOf(i);
      ctx.fillStyle = i ? '#b9b6c4' : C.text;
      ctx.fillText(l, lx + w / 2, ly + 6 + i * 17);
    });
    ctx.restore();
  }

  function drawTargets(ctx, sc) {
    const z = B.cam.z, tg = B.targeting, g = sc.grid;
    const src = tg.sourceId && sc.tokens[tg.sourceId];
    const heal = tg.mode === 'heal', tone = heal ? C.ok : C.danger;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
    ctx.save();
    // zona de alcance em volta de quem age
    if (src && tg.act) {
      const zone = rangeZone(sc, src, tg.act);
      if (zone) {
        ctx.fillStyle = heal ? 'rgba(79,178,122,.10)' : 'rgba(139,114,240,.11)';
        for (const [cx, cy] of zone.list) ctx.fillRect(cx * g, cy * g, g, g);
        ctx.strokeStyle = heal ? 'rgba(79,178,122,.7)' : 'rgba(139,114,240,.75)';
        ctx.lineWidth = 2 / z; ctx.setLineDash([7 / z, 5 / z]);
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of zone.edges) { ctx.moveTo(x1 * g, y1 * g); ctx.lineTo(x2 * g, y2 * g); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      const sp = posOf(src), ss = (src.size || 1) * g;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5 / z;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, ss / 2 + 5 / z, 0, Math.PI * 2); ctx.stroke();
    }
    const srcC = src && posOf(src);
    const hp = B.hoverP;

    if (tg.area) {
      // a área segue o cursor
      if (hp) {
        const p = CB().snapCell(sc, hp), pc = src ? CB().checkPoint(sc, src, tg.act, p) : { ok: true, d: null };
        const R = tg.area * g, hits = pc.ok ? CB().areaTargets(sc, src, tg.act, p, visibleTokens(sc)) : [];
        if (srcC) {
          ctx.strokeStyle = pc.ok ? 'rgba(210,162,76,.6)' : 'rgba(217,87,79,.5)'; ctx.lineWidth = 2 / z; ctx.setLineDash([8 / z, 6 / z]);
          ctx.beginPath(); ctx.moveTo(srcC.x, srcC.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
        }
        const col = heal ? '79,178,122' : pc.ok ? '232,140,60' : '217,87,79';
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        grad.addColorStop(0, `rgba(${col},${pc.ok ? 0.38 : 0.12})`); grad.addColorStop(1, `rgba(${col},${pc.ok ? 0.16 : 0.05})`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 2 / z;
        if (!pc.ok) ctx.setLineDash([6 / z, 5 / z]);
        ctx.stroke(); ctx.setLineDash([]);
        for (const t of hits) {
          const c = posOf(t), r = (t.size || 1) * g / 2 + (4 + pulse * 3) / z;
          ctx.strokeStyle = tone; ctx.lineWidth = 3 / z;
          ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();
        }
        const lines = pc.ok ? [hits.length ? hits.length + (hits.length === 1 ? ' alvo na área' : ' alvos na área') : 'Ninguém na área'] : [pc.why];
        if (pc.d != null) lines.push('a ' + pc.d + ' quad. · alcance: ' + CB().rangeLabel(tg.act));
        screenLabel(ctx, p.x, p.y - R, lines, pc.ok ? C.gold : C.danger);
      }
      ctx.restore();
      return;
    }

    // alvos um a um: válidos pulsam, os outros escurecem
    const checks = targetChecks(sc);
    const hoverT = hp && tokenAt(sc, hp);
    for (const [id, c] of checks) {
      const t = sc.tokens[id];
      if (!t || (src && id === src.id && !heal)) continue;
      const cp = posOf(t), r = (t.size || 1) * g / 2;
      if (!c.ok) {
        ctx.fillStyle = 'rgba(10,10,14,.55)';
        ctx.beginPath(); ctx.arc(cp.x, cp.y, r + 1 / z, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.strokeStyle = tone; ctx.lineWidth = (hoverT && hoverT.id === id ? 4 : 2.5) / z;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, r + (5 + pulse * 3) / z, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // marcados (vários alvos) e linha até o alvo sob o mouse
    const marked = tg.ids.map((id) => sc.tokens[id]).filter(Boolean);
    const hc = hoverT && checks.get(hoverT.id);
    if (hoverT && hc && hc.ok && !marked.includes(hoverT)) marked.push(hoverT);
    for (const t of marked) {
      const cp = posOf(t), r = (t.size || 1) * g / 2 + 6 / z;
      if (srcC && t.id !== src.id) {
        ctx.strokeStyle = heal ? 'rgba(79,178,122,.6)' : 'rgba(217,87,79,.6)'; ctx.lineWidth = 3 / z; ctx.setLineDash([8 / z, 6 / z]);
        ctx.beginPath(); ctx.moveTo(srcC.x, srcC.y); ctx.lineTo(cp.x, cp.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (!tg.ids.includes(t.id)) continue;
      ctx.strokeStyle = tone; ctx.lineWidth = 3 / z;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.moveTo(cp.x + dx * (r - 10 / z), cp.y + dy * (r - 10 / z));
        ctx.lineTo(cp.x + dx * (r + 10 / z), cp.y + dy * (r + 10 / z));
      }
      ctx.stroke();
    }
    // dica sobre o token sob o mouse
    if (hoverT && hc && !(src && hoverT.id === src.id && !heal)) {
      const cp = posOf(hoverT), top = cp.y - (hoverT.size || 1) * g / 2;
      const lines = [B.silhouettes.has(hoverT.id) ? (hoverT.masked ? 'Vulto' : 'Vulto atrás do muro') : hoverT.name];
      if (hc.ok) {
        const ch = hitChanceFor(sc, src, hoverT), bits = [];
        if (ch != null) bits.push(Math.round(ch * 100) + '% de acerto');
        if (hc.d) bits.push(hc.d + (hc.d === 1 ? ' quadrado' : ' quadrados'));
        if (bits.length) lines.push(bits.join(' · '));
        if (hc.cover && hc.cover.bonus) lines.push(hc.cover.label + ' +' + hc.cover.bonus);
      } else {
        lines.push(hc.why + (hc.why === 'Fora de alcance' ? `: a ${hc.d} quad. (alcance: ${CB().rangeLabel(tg.act)})` : ''));
      }
      screenLabel(ctx, cp.x, top, lines, hc.ok ? tone : 'rgba(255,255,255,.18)');
    }
    ctx.restore();
  }

  // ---------- efeitos do resultado: números subindo, golpe, explosão ----------
  function animActive() {
    const sc = S().currentScene();
    return B.pings.length || B.fx.length || B.targeting || (sc && (movesActive(sc) || (LT().flickering(sc) && (!S().gmView() || B.layers.light))));
  }
  function ensureAnim() {
    if (B.animating) return;
    B.animating = true;
    const step = () => {
      const now = performance.now();
      B.pings = B.pings.filter((q) => now - q.t < 1800);
      B.fx = B.fx.filter((f) => now - f.t < f.dur);
      B.render();
      if (animActive()) requestAnimationFrame(step); else { B.animating = false; B.render(); }
    };
    requestAnimationFrame(step);
  }
  // Toda ação nova vira efeito no mapa, em todas as telas
  function scanFx(kind) {
    const st = S().state;
    if (!st) return;
    const last = st.chat[st.chat.length - 1], lastId = last ? last.id : '';
    if (kind === 'reset' || B.fxSeen === undefined) { B.fxSeen = lastId; return; }
    if (kind !== 'chat.add' || lastId === B.fxSeen) return;
    const i = st.chat.findIndex((m) => m.id === B.fxSeen);
    const fresh = i < 0 ? st.chat.slice(-1) : st.chat.slice(i + 1);
    B.fxSeen = lastId;
    for (const m of fresh) if (m.kind === 'action') spawnFx(m);
  }
  function spawnFx(m) {
    const sc = S().currentScene();
    if (!sc || m.sceneId !== sc.id) return;
    const vis = new Set(visibleTokens(sc).map((t) => t.id)), now = performance.now(), g = sc.grid;
    const src = m.srcId && sc.tokens[m.srcId], heal = m.mode === 'heal', grey = '#a9a6b4';
    if (m.point) B.fx.push({ kind: 'blast', x: m.point.x, y: m.point.y, r: (Number(m.area) || 1) * g, heal, t: now, dur: 900 });
    (m.targets || []).forEach((r, k) => {
      const t = sc.tokens[r.tokenId];
      if (!t || !vis.has(t.id)) return;
      const c = CB().center(sc, t), s = (t.size || 1) * g, at = now + 260 + k * 140;
      if (src && vis.has(src.id) && !m.point && src.id !== t.id) B.fx.push({ kind: 'trail', a: CB().center(sc, src), b: c, heal, t: now, dur: 420 });
      let text, sub = '', color = C.danger, big = false;
      const amt = r.amount != null ? Number(r.amount) : null;
      if (m.mode === 'attack') {
        if (!r.hit) { text = r.fumble ? 'Falha crítica' : 'Errou'; color = grey; }
        else { text = amt != null ? '−' + amt : 'Acertou'; if (r.crit) { sub = 'CRÍTICO'; color = C.gold; big = true; } }
      } else if (m.mode === 'save') {
        text = amt ? '−' + amt : (r.success ? 'Resistiu' : 'Falhou');
        if (amt && r.success) sub = 'resistiu · metade';
        if (!amt) color = grey;
      } else if (heal) { text = '+' + (amt || 0); color = C.ok; }
      else text = '−' + (amt || 0);
      B.fx.push({ kind: 'float', x: c.x, y: c.y - s * 0.62, text, sub, color, big, t: at, dur: 1700 });
      if (amt) B.fx.push({ kind: 'hit', x: c.x, y: c.y, r: s / 2, color: heal ? C.ok : C.danger, t: at, dur: 450 });
      if (!heal && r.after != null && r.after <= 0 && r.before > 0) B.fx.push({ kind: 'float', x: c.x, y: c.y + s * 0.25, text: 'Caiu', sub: '', color: C.text, t: at + 500, dur: 1800 });
    });
    ensureAnim();
  }
  B.spawnFx = spawnFx;
  function drawFx(ctx) {
    const now = performance.now(), z = B.cam.z;
    for (const f of B.fx) {
      const age = (now - f.t) / f.dur;
      if (age < 0) continue;
      ctx.save();
      if (f.kind === 'trail') {
        const e = Math.min(1, age * 1.6), b0 = Math.max(0, age * 1.6 - 0.45);
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = f.heal ? C.ok : '#f2d9a0'; ctx.lineWidth = 4 / z; ctx.lineCap = 'round';
        ctx.shadowColor = f.heal ? C.ok : C.gold; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(f.a.x + (f.b.x - f.a.x) * b0, f.a.y + (f.b.y - f.a.y) * b0);
        ctx.lineTo(f.a.x + (f.b.x - f.a.x) * e, f.a.y + (f.b.y - f.a.y) * e);
        ctx.stroke();
      } else if (f.kind === 'hit') {
        ctx.globalAlpha = (1 - age) * 0.55;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = f.color; ctx.lineWidth = 3 / z;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r + age * 26 / z, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'blast') {
        const col = f.heal ? '79,178,122' : '240,140,60';
        ctx.globalAlpha = 1 - age;
        const rr = f.r * (0.4 + 0.6 * Math.min(1, age * 2.5));
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr);
        grad.addColorStop(0, 'rgba(255,230,170,.75)'); grad.addColorStop(0.5, `rgba(${col},.5)`); grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'float') {
        const p = toScreen(f.x, f.y);
        ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
        const pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.55 : age < 0.22 ? 1.15 - ((age - 0.12) / 0.1) * 0.15 : 1;
        ctx.globalAlpha = age > 0.65 ? 1 - (age - 0.65) / 0.35 : 1;
        const y = p.y - age * 46, size = (f.big ? 34 : 27) * pop;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.font = '700 ' + size + 'px ' + SANS;
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,10,14,.9)';
        ctx.strokeText(f.text, p.x, y);
        ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, y);
        if (f.sub) {
          ctx.font = '700 11px ' + SANS; ctx.lineWidth = 4;
          ctx.strokeText(f.sub, p.x, y - size * 0.8); ctx.fillText(f.sub, p.x, y - size * 0.8);
        }
      }
      ctx.restore();
    }
  }

  // ---------- pings ----------
  B.addPing = function (p) {
    const sc = S().currentScene();
    if (!sc || p.sceneId !== sc.id) return;
    B.pings.push({ x: Number(p.x), y: Number(p.y), color: U.safeColor(p.color, C.gold), name: String(p.name || '').slice(0, 30), t: performance.now() });
    ensureAnim();
  };
  function drawPings(ctx) {
    const now = performance.now(), z = B.cam.z;
    for (const p of B.pings) {
      const age = (now - p.t) / 1800;
      ctx.save();
      for (let k = 0; k < 2; k++) {
        const a = (age + k * 0.25) % 1;
        ctx.globalAlpha = (1 - a) * (1 - age * 0.5);
        ctx.strokeStyle = p.color; ctx.lineWidth = 4 / z;
        ctx.beginPath(); ctx.arc(p.x, p.y, (8 + a * 70) / z, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color; ctx.font = '600 ' + 13 / z + 'px ' + SANS; ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - 20 / z);
      ctx.restore();
    }
  }

  // ---------- interação ----------
  function startPan(e) { B.pan = { sx: e.clientX, sy: e.clientY, cx: B.cam.x, cy: B.cam.y }; B.canvas.style.cursor = 'grabbing'; }

  function onDown(e) {
    if (!S().state) return;
    const sc = S().currentScene();
    if (!sc) return;
    const p = toWorld(e), gm = S().gmView();
    if (e.button === 1 || e.button === 2 || B.spaceDown || B.tool === 'pan') { startPan(e); return; }
    if (e.button !== 0) return;
    const st = B.style;

    if (B.targeting) {
      const tg = B.targeting, src = tg.sourceId && sc.tokens[tg.sourceId], force = gm && e.altKey;
      if (tg.area) {
        const q = CB().snapCell(sc, p), pc = src ? CB().checkPoint(sc, src, tg.act, q) : { ok: true };
        if (!pc.ok && !force) { U.toast(pc.why + (pc.d != null ? `: a ${pc.d} quad. (alcance: ${CB().rangeLabel(tg.act)})` : '')); return; }
        const hits = CB().areaTargets(sc, src, tg.act, q, visibleTokens(sc));
        if (!hits.length) { U.toast('Ninguém dentro da área.'); return; }
        tg.ids = hits.map((t) => t.id); tg.point = q;
        B.confirmTargeting();
        return;
      }
      const t = tokenAt(sc, p);
      if (!t) { startPan(e); return; }
      const c = targetChecks(sc).get(t.id);
      if (c && !c.ok && !force) {
        U.toast(`${t.name}: ${c.why.toLowerCase()}` + (c.why === 'Fora de alcance' ? `: a ${c.d} quad. (alcance: ${CB().rangeLabel(tg.act)})` : '') + (gm ? ' · Alt+clique ignora' : ''));
        return;
      }
      const i = tg.ids.indexOf(t.id);
      if (i >= 0) tg.ids.splice(i, 1); else tg.ids.push(t.id);
      if (!tg.multi && !e.shiftKey) { B.confirmTargeting(); return; }
      App.UI.renderTargetBar();
      B.requestRender();
      return;
    }

    if (B.tool === 'select' || B.tool === 'wall' || B.tool === 'door') {
      const door = doorAt(sc, p);
      if (door && (B.tool === 'select' || B.tool === 'door')) {
        S().dispatch({ type: 'wall.door', sceneId: sc.id, id: door.id, open: !door.open });
        B.requestRender();
        return;
      }
    }

    switch (B.tool) {
      case 'wall': case 'door': {
        if (!gm) break;
        const q = st.snap && !e.altKey ? snapVertex(sc, p) : p;
        B.wallDraft = { x1: q.x, y1: q.y, x2: q.x, y2: q.y, door: B.tool === 'door', p0: { x: p.x, y: p.y } };
        break;
      }
      case 'room': {
        if (!gm) break;
        const q = st.snap && !e.altKey ? snapVertex(sc, p) : { x: Math.round(p.x), y: Math.round(p.y) };
        if (B.roomMode === 'poly') {
          const P = B.roomPoly;
          if (!P) { B.roomPoly = { pts: [[q.x, q.y]], hover: null }; B.selectedRoom = null; break; }
          const [fx, fy] = P.pts[0];
          if (P.pts.length >= 3 && Math.hypot(q.x - fx, q.y - fy) <= 10 / B.cam.z) { finishRoomPoly(sc); break; }
          P.pts.push([q.x, q.y]);
          break;
        }
        B.roomDraft = { x1: q.x, y1: q.y, x2: q.x, y2: q.y, p0: { x: p.x, y: p.y } };
        break;
      }
      case 'light': {
        if (!gm) break;
        if (grabLight(sc, p)) break;
        B.selectedLight = null;
        if (B.lightShape === 'area') {
          // Área: clique em cada canto (feche no primeiro ponto, com dois cliques ou Enter)
          const q = st.snap && !e.altKey ? snapVertex(sc, p) : { x: Math.round(p.x), y: Math.round(p.y) };
          const P = B.lightPoly;
          if (!P) { B.lightPoly = { pts: [[q.x, q.y]], hover: null }; break; }
          const [fx, fy] = P.pts[0];
          if (P.pts.length >= 3 && Math.hypot(q.x - fx, q.y - fy) <= 10 / B.cam.z) { finishLightPoly(sc); break; }
          P.pts.push([q.x, q.y]);
          break;
        }
        const q = st.snap && !e.altKey ? snapPt(sc, p) : p;
        B.lightDraft = { shape: B.lightShape, x: Math.round(q.x), y: Math.round(q.y), p: { x: q.x, y: q.y }, moved: false };
        break;
      }
      case 'select': case 'prop': {
        if (gm && grabLight(sc, p)) break;
        B.selectedLight = null;
        const snd = soundAt(sc, p);
        if (snd) {
          B.selected = null; B.selectedSound = snd.id; B.selectedProp = null;
          B.soundDrag = { id: snd.id, sceneId: sc.id, x: snd.x, y: snd.y, ox: p.x - snd.x, oy: p.y - snd.y, moved: false };
          break;
        }
        B.selectedSound = null;
        const pick = (q, mode, extra) => {
          B.selectedProp = q.id; B.selected = null; B.selectedRoom = null;
          if (q.locked || !mode) return;
          B.propDrag = Object.assign({ id: q.id, sceneId: sc.id, mode, start: { x: q.x, y: q.y, w: q.w, h: q.h, rot: q.rot || 0 }, cur: { x: q.x, y: q.y, w: q.w, h: q.h, rot: q.rot || 0 }, ox: p.x - q.x, oy: p.y - q.y, moved: false }, extra);
        };
        const selP = gm && B.selectedProp && (sc.props || []).find((x) => x.id === B.selectedProp);
        const hdl = selP && propHandleAt(selP, p);
        if (hdl) { pick(selP, hdl.mode, hdl); break; }
        const t = tokenAt(sc, p), pr = gm ? propAt(sc, p) : null;
        if (pr && (!t || (pr.z || 0) > (t.z || 0))) { pick(pr, 'move'); break; }
        B.selectedProp = null;
        if (!t) { B.selected = null; startPan(e); break; }
        B.selected = t.id;
        if (!S().canControl(t)) break;
        if (!S().canMoveNow(t)) { U.toast('Aguarde a sua vez para mover.'); break; }
        B.drag = { id: t.id, sceneId: sc.id, ox: p.x - t.x, oy: p.y - t.y, x: t.x, y: t.y, sx: t.x, sy: t.y, moved: false };
        break;
      }
      case 'ruler':
        B.ruler = { a: st.snap ? snapPt(sc, p) : p, b: p };
        break;
      case 'path':
        B.draft = { type: 'path', points: [Math.round(p.x), Math.round(p.y)], color: st.color, width: st.width };
        break;
      case 'line': case 'rect': case 'ellipse': {
        const q = st.snap ? snapPt(sc, p) : p;
        B.draft = { type: B.tool, x1: q.x, y1: q.y, x2: q.x, y2: q.y, color: st.color, width: st.width, fill: B.tool === 'line' ? 0 : st.fill };
        break;
      }
      case 'erase':
        B.erasing = true;
        eraseAt(sc, p);
        break;
      case 'fog-reveal': case 'fog-hide': {
        if (!gm) break;
        if (!sc.fog.enabled) { U.toast('A névoa está desligada nesta cena (ative em Configurar cena).'); break; }
        const q = st.snap ? snapPt(sc, p) : p;
        B.fogDraft = { mode: B.tool === 'fog-reveal' ? 'reveal' : 'hide', x1: q.x, y1: q.y, x2: q.x, y2: q.y };
        break;
      }
      case 'ping':
        App.Net.ping({ t: 'ping', sceneId: sc.id, x: p.x, y: p.y, color: S().me.color, name: S().me.name });
        break;
    }
    B.requestRender();
  }

  // Clique num ponto de luz (marcador ou alça do selecionado): seleciona e começa o arraste
  function grabLight(sc, p) {
    const hit = lightAt(sc, p);
    if (!hit) return false;
    const o = hit.o;
    B.selectedLight = o.id; B.selected = null; B.selectedSound = null; B.selectedRoom = null; B.selectedProp = null;
    B.lightDrag = { id: o.id, sceneId: sc.id, mode: hit.mode, start: U.clone(o), cur: {}, p0: { x: p.x, y: p.y }, moved: false };
    return true;
  }

  function eraseAt(sc, p) {
    const snd = soundAt(sc, p);
    if (snd) { S().dispatch({ type: 'sound.delete', sceneId: sc.id, id: snd.id }); if (B.selectedSound === snd.id) B.selectedSound = null; return; }
    if (S().gmView()) {
      const w = wallAt(sc, p);
      if (w) { S().dispatch({ type: 'wall.delete', sceneId: sc.id, id: w.id }); return; }
    }
    const d = drawingAt(sc, p);
    if (d && (S().gmView() || d.by === S().me.id)) S().dispatch({ type: 'drawing.delete', sceneId: sc.id, id: d.id });
  }

  function onMove(e) {
    if (B.pan) {
      B.cam.x = B.pan.cx - (e.clientX - B.pan.sx) / B.cam.z;
      B.cam.y = B.pan.cy - (e.clientY - B.pan.sy) / B.cam.z;
      B.requestRender();
      return;
    }
    if (B.targeting && e.target === B.canvas) { B.hoverP = toWorld(e); B.requestRender(); }
    for (const P of [B.roomPoly, B.lightPoly]) {
      if (!P || e.target !== B.canvas) continue;
      const sc0 = S().currentScene();
      if (sc0) { const w = toWorld(e), q = B.style.snap && !e.altKey ? snapVertex(sc0, w) : w; P.hover = [q.x, q.y]; B.requestRender(); }
    }
    if (!B.drag && !B.ruler && !B.draft && !B.fogDraft && !B.erasing && !B.wallDraft && !B.soundDrag && !B.roomDraft && !B.propDrag && !B.lightDrag && !B.lightDraft) return;
    const sc = S().currentScene();
    if (!sc) return;
    const p = toWorld(e), snap = B.style.snap;
    if (B.drag) {
      B.drag.x = p.x - B.drag.ox; B.drag.y = p.y - B.drag.oy;
      if (Math.abs(B.drag.x - B.drag.sx) + Math.abs(B.drag.y - B.drag.sy) > 3) B.drag.moved = true;
    }
    if (B.ruler) B.ruler.b = snap ? snapPt(sc, p) : p;
    if (B.draft) {
      if (B.draft.type === 'path') {
        const pts = B.draft.points, lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (Math.hypot(p.x - lx, p.y - ly) > 3 / B.cam.z) pts.push(Math.round(p.x), Math.round(p.y));
      } else {
        const q = snap ? snapPt(sc, p) : p;
        B.draft.x2 = q.x; B.draft.y2 = q.y;
      }
    }
    if (B.fogDraft) { const q = snap ? snapPt(sc, p) : p; B.fogDraft.x2 = q.x; B.fogDraft.y2 = q.y; }
    if (B.wallDraft) { const q = snap && !e.altKey ? snapVertex(sc, p) : p; B.wallDraft.x2 = q.x; B.wallDraft.y2 = q.y; }
    if (B.roomDraft) { const q = snap && !e.altKey ? snapVertex(sc, p) : p; B.roomDraft.x2 = q.x; B.roomDraft.y2 = q.y; }
    if (B.propDrag) dragProp(B.propDrag, p, e);
    if (B.lightDrag) dragLight(sc, B.lightDrag, p, e);
    if (B.lightDraft) {
      const d = B.lightDraft;
      d.p = { x: p.x, y: p.y }; if (Math.hypot(p.x - d.x, p.y - d.y) > 6 / B.cam.z) d.moved = true;
    }
    if (B.soundDrag) {
      const d = B.soundDrag, nx = p.x - d.ox, ny = p.y - d.oy;
      if (Math.abs(nx - d.x) + Math.abs(ny - d.y) > 2 / B.cam.z) d.moved = true;
      d.x = nx; d.y = ny;
    }
    if (B.erasing) eraseAt(sc, p);
    B.requestRender();
  }

  function onUp(e) {
    const sc = S().currentScene();
    if (B.pan) { B.pan = null; B.canvas.style.cursor = CURSORS[B.tool] || 'crosshair'; }
    if (B.drag) {
      const d = B.drag;
      B.drag = null;
      if (d.moved && sc) {
        let x = d.x, y = d.y;
        if (B.style.snap && !e.altKey) { x = Math.round(x / sc.grid) * sc.grid; y = Math.round(y / sc.grid) * sc.grid; }
        const t = sc.tokens[d.id], s = ((t && t.size) || 1) * sc.grid / 2;
        const path = [[d.sx, d.sy]].concat((d.points || []).map((p) => [p.x - s, p.y - s]), [[x, y]]);
        S().dispatch({ type: 'token.move', sceneId: d.sceneId, id: d.id, x, y, path, at: Date.now() });
      }
    }
    if (B.propDrag) {
      const d = B.propDrag;
      B.propDrag = null;
      if (d.moved && sc) {
        const c = d.cur;
        let x = c.x, y = c.y;
        if (d.mode === 'move' && B.style.snap && !e.altKey) { x = Math.round(x / sc.grid) * sc.grid; y = Math.round(y / sc.grid) * sc.grid; }
        S().dispatch({ type: 'prop.update', sceneId: d.sceneId, id: d.id, patch: { x: Math.round(x), y: Math.round(y), w: Math.round(c.w), h: Math.round(c.h), rot: c.rot } });
      }
    }
    if (B.lightDrag) {
      const d = B.lightDrag;
      B.lightDrag = null;
      if (d.moved && sc) {
        const patch = Object.assign({}, d.cur);
        if ('x' in patch) { patch.x = Math.round(patch.x); patch.y = Math.round(patch.y); }
        if (patch.pts) patch.pts = patch.pts.map(([x, y]) => [Math.round(x), Math.round(y)]);
        S().dispatch({ type: 'lightpt.update', sceneId: d.sceneId, id: d.id, patch });
      }
    }
    if (B.lightDraft && sc) {
      const d = B.lightDraft;
      B.lightDraft = null;
      if (d.moved) B.addLight(sc, draftLight(sc, d));
      else B.addLight(sc, d.shape === 'cone' ? { kind: B.lightKind, shape: 'cone', x: d.x, y: d.y, bright: 6, dim: 10, dir: 0, angle: 60 } : { kind: B.lightKind, shape: 'circle', x: d.x, y: d.y });
    }
    B.ruler = null;
    if (B.draft && sc) {
      const d = B.draft;
      B.draft = null;
      const ok = d.type === 'path' ? d.points.length >= 4 : Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 2;
      if (ok) { d.id = U.uid('d_'); S().dispatch({ type: 'drawing.add', sceneId: sc.id, drawing: d }); }
    }
    if (B.fogDraft && sc) {
      const f = B.fogDraft, r = norm(f);
      B.fogDraft = null;
      if (r.w > 2 && r.h > 2) S().dispatch({ type: 'fog.add', sceneId: sc.id, shape: { mode: f.mode, x: r.x, y: r.y, w: r.w, h: r.h } });
    }
    if (B.soundDrag) {
      const d = B.soundDrag;
      B.soundDrag = null;
      if (d.moved && sc) S().dispatch({ type: 'sound.update', sceneId: d.sceneId, id: d.id, patch: { x: Math.round(d.x), y: Math.round(d.y) } });
    }
    if (B.wallDraft && sc) {
      const w = B.wallDraft;
      B.wallDraft = null;
      if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) > 4) {
        const wall = { id: U.uid('w_'), x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
        if (w.door) { wall.door = true; wall.open = false; } else wall.cover = B.wallType;
        S().dispatch({ type: 'wall.add', sceneId: sc.id, walls: [wall] });
      } else if (!w.door) {
        // Clique sem arrastar em cima de uma parede: aplica o tipo escolhido
        const hit = w.p0 && wallAt(sc, w.p0);
        if (hit && !hit.door && CB().wallType(hit) !== B.wallType) {
          S().dispatch({ type: 'wall.update', sceneId: sc.id, id: hit.id, patch: { cover: B.wallType } });
          U.toast('Parede agora é: ' + CB().COVER_TYPES.find((x) => x[0] === B.wallType)[1]);
        }
      }
    }
    if (B.roomDraft && sc) {
      const d = B.roomDraft, r = norm(d);
      B.roomDraft = null;
      if (r.w >= sc.grid / 2 && r.h >= sc.grid / 2) addRoom(sc, [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]]);
      else {
        // Clique sem arrastar: seleciona a sala que está ali
        const room = App.Audio.roomAt(sc, d.p0);
        B.selectedRoom = room ? room.id : null;
        if (room) { B.selected = null; B.selectedSound = null; }
      }
    }
    B.erasing = false;
    B.requestRender();
  }

  // Arraste da imagem: mover, redimensionar pelo canto (Shift deforma) ou girar (Shift: 15 em 15 graus)
  function dragProp(d, p, e) {
    const s0 = d.start, cur = d.cur, min = 8;
    if (d.mode === 'move') {
      cur.x = p.x - d.ox; cur.y = p.y - d.oy;
    } else if (d.mode === 'resize') {
      const l = pLocal(s0, p), ax = -d.sx * s0.w / 2, ay = -d.sy * s0.h / 2; // canto oposto fica parado
      let w = Math.max(min, (l.x - ax) * d.sx), h = Math.max(min, (l.y - ay) * d.sy);
      if (!e.shiftKey) { const k = Math.max(w / s0.w, h / s0.h); w = Math.max(min, s0.w * k); h = Math.max(min, s0.h * k); }
      const c = pWorld(s0, { x: ax + d.sx * w / 2, y: ay + d.sy * h / 2 });
      Object.assign(cur, { w, h, x: c.x - w / 2, y: c.y - h / 2 });
    } else if (d.mode === 'rotate') {
      const c = pCenter(s0);
      let a = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      cur.rot = ((Math.round(a) % 360) + 360) % 360;
    }
    if (Math.abs(cur.x - s0.x) + Math.abs(cur.y - s0.y) + Math.abs(cur.w - s0.w) + Math.abs(cur.h - s0.h) + Math.abs(cur.rot - s0.rot) > 1) d.moved = true;
  }

  function addWaypoint() {
    const sc = S().currentScene();
    if (!sc) return;
    if (B.drag) {
      const t = sc.tokens[B.drag.id];
      if (!t) return;
      const g = sc.grid, s = (t.size || 1) * g;
      const x = B.style.snap ? Math.round(B.drag.x / g) * g : B.drag.x, y = B.style.snap ? Math.round(B.drag.y / g) * g : B.drag.y;
      const pts = (B.drag.points = B.drag.points || []), last = pts[pts.length - 1] || { x: B.drag.sx + s / 2, y: B.drag.sy + s / 2 };
      if (Math.abs(last.x - (x + s / 2)) + Math.abs(last.y - (y + s / 2)) > 1) pts.push({ x: x + s / 2, y: y + s / 2 });
      B.drag.moved = true;
    } else if (B.ruler) {
      const pts = (B.ruler.points = B.ruler.points || []);
      pts.push({ x: B.ruler.b.x, y: B.ruler.b.y });
    }
    B.requestRender();
  }

  function onWheel(e) {
    e.preventDefault();
    const r = B.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = mx / B.cam.z + B.cam.x, wy = my / B.cam.z + B.cam.y;
    const z = U.clamp(B.cam.z * Math.exp(-e.deltaY * 0.0015), 0.1, 6);
    B.cam.z = z;
    B.cam.x = wx - mx / z;
    B.cam.y = wy - my / z;
    B.requestRender();
  }

  function onDbl(e) {
    const sc = S().currentScene();
    if (!sc) return;
    if (B.tool === 'room' && B.roomPoly) { finishRoomPoly(sc); B.requestRender(); return; }
    if (B.tool === 'light' && B.lightPoly) { finishLightPoly(sc); B.requestRender(); return; }
    // Dois cliques no marcador de luz: acende ou apaga
    const lh = lightAt(sc, toWorld(e));
    if (lh && lh.mode === 'move') { S().dispatch({ type: 'lightpt.update', sceneId: sc.id, id: lh.o.id, patch: { on: lh.o.on === false } }); return; }
    const snd = soundAt(sc, toWorld(e));
    if (snd) {
      if (snd.once) App.Audio.trigger(snd);
      else S().dispatch({ type: 'sound.update', sceneId: sc.id, id: snd.id, patch: snd.on ? { on: false } : { on: true, at: Date.now() } });
      return;
    }
    const t = tokenAt(sc, toWorld(e));
    if (!t) return;
    const a = S().actorOf(t);
    if (a && S().ownsActor(a)) App.UI.openActor(a.id);
  }

  function onDrop(e) {
    // Imagens: arquivos do computador ou miniatura da biblioteca (só o mestre)
    if (S().gmView()) {
      const lib = e.dataTransfer.getData('text/x-image');
      if (lib) { e.preventDefault(); B.placeImage(lib, toWorld(e)); return; }
      const files = [...(e.dataTransfer.files || [])].filter((f) => /^image\//.test(f.type));
      if (files.length) {
        e.preventDefault();
        const p = toWorld(e), sc = S().currentScene();
        files.forEach((file, i) => B.addPropFromFile(file, { x: p.x + i * (sc ? sc.grid : 70), y: p.y }));
        return;
      }
    }
    const snd = e.dataTransfer.getData('text/x-sound');
    if (snd) { e.preventDefault(); App.Audio.dropAt(snd, toWorld(e)); return; }
    const id = e.dataTransfer.getData('text/x-actor');
    if (!id) return;
    e.preventDefault();
    B.placeActor(id, toWorld(e));
  }

  B.placeActor = function (actorId, p) {
    const st = S().state, sc = S().currentScene(), a = st && st.actors[actorId];
    if (!a || !sc) return;
    if (!S().ownsActor(a)) { U.toast('Essa ficha não é sua.'); return; }
    p = p || B.viewCenter();
    const size = a.size || 1, g = sc.grid;
    const x = Math.round((p.x - (size * g) / 2) / g) * g, y = Math.round((p.y - (size * g) / 2) / g) * g;
    const linked = a.kind === 'pc';
    let name = a.name;
    if (!linked) {
      const n = Object.values(sc.tokens).filter((t) => t.actorId === a.id).length;
      if (n > 0) name = `${a.name} ${n + 1}`;
    }
    const z = B.maxZ(sc) + 1;
    const token = { id: U.uid('t_'), actorId: a.id, name, size, x, y, z, linked,
      bars: linked ? null : U.clone(a.bars || []), conditions: [], hidden: false };
    S().dispatch({ type: 'token.add', sceneId: sc.id, token });
    B.selected = token.id;
    B.requestRender();
  };

  function onKey(e) {
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (!S().state) return;
    if (e.code === 'Space') { B.spaceDown = true; e.preventDefault(); return; }
    if (e.key === 'Backspace' && ((B.drag && (B.drag.points || []).length) || (B.ruler && (B.ruler.points || []).length))) {
      e.preventDefault(); (B.drag || B.ruler).points.pop(); B.requestRender(); return;
    }
    if (e.key === 'Backspace' && (B.drag || B.ruler)) { e.preventDefault(); return; }
    const sc = S().currentScene();
    const t = sc && B.selected && sc.tokens[B.selected];

    if (B.roomPoly && sc) {
      if (e.key === 'Enter') { finishRoomPoly(sc); B.requestRender(); return; }
      if (e.key === 'Escape') { B.roomPoly = null; B.requestRender(); return; }
      if (e.key === 'Backspace') { B.roomPoly.pts.pop(); if (!B.roomPoly.pts.length) B.roomPoly = null; B.requestRender(); return; }
    }
    if (B.lightPoly && sc) {
      if (e.key === 'Enter') { finishLightPoly(sc); B.requestRender(); return; }
      if (e.key === 'Escape') { B.lightPoly = null; B.requestRender(); return; }
      if (e.key === 'Backspace') { B.lightPoly.pts.pop(); if (!B.lightPoly.pts.length) B.lightPoly = null; B.requestRender(); return; }
    }
    if (B.selectedLight && sc && S().gmView()) {
      if (e.key === 'Delete' || e.key === 'Backspace') { S().dispatch({ type: 'lightpt.delete', sceneId: sc.id, id: B.selectedLight }); B.selectedLight = null; return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); B.duplicateLight(sc, B.selectedLight); return; }
    }
    if (B.selectedProp && sc && S().gmView()) {
      if (e.key === 'Delete' || e.key === 'Backspace') { S().dispatch({ type: 'prop.delete', sceneId: sc.id, id: B.selectedProp }); B.selectedProp = null; return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); B.duplicateProp(sc, B.selectedProp); return; }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && B.selectedRoom && sc && S().gmView()) {
      S().dispatch({ type: 'room.delete', sceneId: sc.id, id: B.selectedRoom });
      B.selectedRoom = null;
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && B.selectedSound && sc && S().gmView()) {
      S().dispatch({ type: 'sound.delete', sceneId: sc.id, id: B.selectedSound });
      B.selectedSound = null;
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && t && S().gmView()) {
      S().dispatch({ type: 'token.delete', sceneId: sc.id, id: t.id });
      B.selected = null;
      return;
    }
    if (B.targeting) {
      if (e.key === 'Escape') { B.cancelTargeting(); return; }
      if (e.key === 'Enter') { B.confirmTargeting(); return; }
    }
    if (e.key === 'Escape') { B.selected = null; B.selectedRoom = null; B.selectedProp = null; B.selectedLight = null; B.setTool('select'); B.requestRender(); return; }
    const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (arrows[e.key] && t && S().canControl(t)) {
      e.preventDefault();
      if (!S().canMoveNow(t)) { U.toast('Aguarde a sua vez para mover.'); return; }
      const [dx, dy] = arrows[e.key];
      const nx = t.x + dx * sc.grid, ny = t.y + dy * sc.grid;
      S().dispatch({ type: 'token.move', sceneId: sc.id, id: t.id, x: nx, y: ny, path: [[t.x, t.y], [nx, ny]], at: Date.now() });
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key) && t && S().canControl(t)) {
      const a = S().actorOf(t), i = Number(e.key) - 1;
      if (a && (a.actions || [])[i]) { if (B.targeting) B.cancelTargeting(); App.UI.useAction(a, i, t); }
      return;
    }
    const map = { v: 'select', h: 'pan', r: 'ruler', p: 'ping', d: 'path', l: 'line', b: 'rect', e: 'ellipse', x: 'erase', f: 'fog-reveal', g: 'fog-hide', w: 'wall', o: 'door', m: 'room', i: 'prop', u: 'light' };
    const tool = map[e.key.toLowerCase()];
    if (tool) B.setTool(tool);
  }

  App.Board = B;
})(window.App);
