'use strict';
/*
 * Animação de imagens, luzes e tokens (Plano 21).
 *
 * Nada é mandado a cada quadro: o mestre grava UMA vez a animação na cena (sc.anims) e cada tela calcula
 * sozinha onde o objeto está agora, pelo relógio do mestre (A.now). O estado guarda a posição "de verdade";
 * a animação só muda o que se vê (A.view) até terminar, quando o mestre grava o resultado (anim.end).
 *
 * Movimento (spec): {id, kind: move|path|rotate|fade|scale|color, dx, dy (quadrados), pts [[dx,dy]…] (ronda, quadrados),
 *   deg, from, to (%), color, dur (s), ease: linear|smooth|in|out, repeat: once|pingpong|loop, n (idas e voltas, 0 = sem parar),
 *   end: stay|back}
 * Rodando (sc.anims): {id, key: 'prop:id'|'light:id'|'token:id', spec, start (ms do mestre), from {campos no início}}
 * Do objeto (o.anim): {steps: [spec…], auto} — auto = começa sozinha com a cena (conta do relógio, sem estado).
 * Área de dano da imagem (p.hurt): {on, box [x0,y0,x1,y1] (0–1 na imagem), when: moving|always, who, save, dc, damage, bar, onSave}
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;
  const A = { offset: 0, local: [], inside: new Map(), timer: null, lastExplore: 0 };

  // Relógio do mestre (o jogador corrige pela diferença medida ao entrar na mesa)
  A.now = () => Date.now() + (S() && S().role === 'player' ? A.offset : 0);
  A.setClock = (hostNow) => { if (Number.isFinite(hostNow)) A.offset = hostNow - Date.now(); };

  A.EASE = {
    linear: (u) => u,
    smooth: (u) => u * u * (3 - 2 * u),
    in: (u) => u * u,
    out: (u) => 1 - (1 - u) * (1 - u),
  };
  A.EASES = [['smooth', 'Suave (acelera e freia)'], ['linear', 'Constante'], ['in', 'Acelerando'], ['out', 'Freando']];
  A.REPEATS = [['once', 'Uma vez'], ['pingpong', 'Ir e voltar'], ['loop', 'Repetir sem parar']];
  // O que cada tipo de objeto sabe fazer
  A.KINDS = {
    prop: [['move', 'Mover'], ['path', 'Ronda (vários pontos)'], ['rotate', 'Girar'], ['fade', 'Opacidade (aparecer ou sumir)'], ['scale', 'Tamanho']],
    light: [['move', 'Mover'], ['path', 'Ronda (vários pontos)'], ['rotate', 'Girar ou varrer (cone)'], ['fade', 'Intensidade (acender ou apagar aos poucos)'], ['color', 'Mudar de cor']],
    token: [['move', 'Mover'], ['path', 'Ronda (vários pontos)']],
  };
  A.KIND_NAME = { move: 'Mover', path: 'Ronda', rotate: 'Girar', fade: 'Opacidade', scale: 'Tamanho', color: 'Cor' };
  // Modelos prontos (o mestre escolhe e ajusta)
  A.PRESETS = [
    { id: 'blade', label: 'Lâmina indo e voltando', for: ['prop'], spec: { kind: 'move', dx: 4, dy: 0, dur: 0.8, ease: 'smooth', repeat: 'pingpong', n: 0 } },
    { id: 'spin', label: 'Girar sem parar', for: ['prop', 'light'], spec: { kind: 'rotate', deg: 360, dur: 4, ease: 'linear', repeat: 'loop' } },
    { id: 'sweep', label: 'Holofote varrendo', for: ['light'], spec: { kind: 'rotate', deg: 120, dur: 3, ease: 'smooth', repeat: 'pingpong', n: 0 } },
    { id: 'pulse', label: 'Pulsar', for: ['light', 'prop'], spec: { kind: 'fade', from: 100, to: 40, dur: 1.2, ease: 'smooth', repeat: 'pingpong', n: 0 } },
    { id: 'appear', label: 'Aparecer aos poucos', for: ['prop', 'light'], spec: { kind: 'fade', from: 0, to: 100, dur: 2, ease: 'smooth', repeat: 'once', end: 'stay' } },
    { id: 'vanish', label: 'Sumir aos poucos', for: ['prop', 'light'], spec: { kind: 'fade', from: 100, to: 0, dur: 2, ease: 'smooth', repeat: 'once', end: 'stay' } },
    { id: 'patrol', label: 'Ronda (vai e volta)', for: ['token', 'prop', 'light'], spec: { kind: 'path', pts: [[4, 0], [4, 3]], dur: 6, ease: 'linear', repeat: 'pingpong', n: 0 } },
  ];

  A.newSpec = function (kind, part) {
    const base = { id: U.uid('am_'), kind: kind || 'move', dx: 3, dy: 0, pts: [[3, 0], [3, 3]], deg: 90, from: null, to: 0, color: '#ff5040',
      dur: 1, ease: 'smooth', repeat: 'once', n: 0, end: 'stay' };
    return Object.assign(base, part || {});
  };

  // ---------- tempo ----------
  // u (0–1, já com a curva) e se acabou, t = ms desde o início
  A.progress = function (spec, t) {
    const d = Math.max(50, (Number(spec.dur) || 1) * 1000), ease = A.EASE[spec.ease] || A.EASE.smooth;
    t = Math.max(0, t);
    if (spec.repeat === 'loop') return { u: ease((t % d) / d), done: false, back: false };
    if (spec.repeat === 'pingpong') {
      const n = Math.max(0, Math.round(Number(spec.n) || 0));
      if (n > 0 && t >= n * 2 * d) return { u: 0, done: true, back: true };
      const k = Math.floor(t / d), f = (t % d) / d, back = k % 2 === 1;
      return { u: ease(back ? 1 - f : f), done: false, back };
    }
    if (t >= d) return { u: spec.end === 'back' ? 0 : 1, done: true, back: false };
    return { u: ease(t / d), done: false, back: false };
  };
  // Duração total (ms) ou Infinity
  A.total = (spec) => {
    const d = Math.max(50, (Number(spec.dur) || 1) * 1000);
    if (spec.repeat === 'loop') return Infinity;
    if (spec.repeat === 'pingpong') { const n = Math.round(Number(spec.n) || 0); return n > 0 ? n * 2 * d : Infinity; }
    return d;
  };

  // ---------- objetos ----------
  const FIELDS = ['x', 'y', 'pts', 'rot', 'dir', 'facing', 'opacity', 'power', 'w', 'h', 'color'];
  A.snapshot = function (o) {
    const out = {};
    for (const f of FIELDS) if (o[f] !== undefined) out[f] = U.clone(o[f]);
    // Valores padrão (assim "Voltar ao início" devolve também o que nunca tinha sido mudado)
    const isLight = 'bright' in o || 'dim' in o || o.kind === 'light' || o.kind === 'dark';
    const isProp = !isLight && 'w' in o && 'h' in o;
    if (isLight) { if (out.dir === undefined) out.dir = 0; if (out.power === undefined) out.power = 1; }
    else if (isProp) { if (out.rot === undefined) out.rot = 0; if (out.opacity === undefined) out.opacity = 1; }
    else if (out.facing === undefined) out.facing = 0;
    return out;
  };
  A.keyOf = (kind, id) => kind + ':' + id;
  A.split = (key) => { const i = String(key).indexOf(':'); return [key.slice(0, i), key.slice(i + 1)]; };
  A.get = function (sc, key) {
    const [k, id] = A.split(key);
    if (k === 'prop') return (sc.props || []).find((x) => x.id === id) || null;
    if (k === 'light') return (sc.lights || []).find((x) => x.id === id) || null;
    if (k === 'token') return sc.tokens[id] || null;
    return null;
  };

  // Ronda: ponto (em quadrados) na fração u do caminho [0,0] → pts…; loop fecha voltando ao começo
  function pathAt(spec, u) {
    const pts = [[0, 0]].concat((spec.pts || []).map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]));
    if (spec.repeat === 'loop') pts.push([0, 0]);
    if (pts.length < 2) return [0, 0];
    const lens = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); total += l; }
    if (!(total > 0)) return [0, 0];
    let d = U.clamp(u, 0, 1) * total;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) { const f = lens[i] ? Math.min(1, d / lens[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; }
      d -= lens[i];
    }
    return pts[pts.length - 1];
  }
  A.pathAt = pathAt;
  const lerp = (a, b, u) => a + (b - a) * u;
  function rgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 180, 90];
  }
  const hex = (c) => '#' + c.map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

  // Valores de uma animação na fração u: muda a cópia c (do tipo k = prop|light|token) a partir de f (início)
  function applyAt(sc, k, c, spec, f, u) {
    const g = sc.grid;
    const shift = (dx, dy) => {
      c.x = (f.x || 0) + dx; c.y = (f.y || 0) + dy;
      if (f.pts && k === 'light') c.pts = f.pts.map(([x, y]) => [x + dx, y + dy]);
    };
    switch (spec.kind) {
      case 'move': shift((Number(spec.dx) || 0) * g * u, (Number(spec.dy) || 0) * g * u); break;
      case 'path': { const [px, py] = pathAt(spec, u); shift(px * g, py * g); break; }
      case 'rotate': {
        const d = (Number(spec.deg) || 0) * u;
        if (k === 'prop') c.rot = (f.rot || 0) + d;
        else if (k === 'light') c.dir = (f.dir || 0) + d;
        else c.facing = (f.facing || 0) + d;
        break;
      }
      case 'fade': {
        const cur = k === 'prop' ? (f.opacity ?? 1) * 100 : (f.power ?? 1) * 100;
        const from = spec.from == null || spec.from === '' ? cur : Number(spec.from);
        const v = Math.max(0, lerp(from, Number(spec.to) || 0, u)) / 100;
        if (k === 'prop') c.opacity = Math.min(1, v); else c.power = v;
        break;
      }
      case 'scale': {
        const s = Math.max(0.05, lerp(1, (Number(spec.to) || 100) / 100, u));
        if (k === 'prop') { c.w = (f.w || g) * s; c.h = (f.h || g) * s; c.x = (f.x || 0) + ((f.w || g) - c.w) / 2; c.y = (f.y || 0) + ((f.h || g) - c.h) / 2; }
        else c.power = (f.power ?? 1) * s;
        break;
      }
      case 'color': {
        if (k !== 'light') break;
        const a = rgb(f.color), b = rgb(spec.color);
        c.color = hex([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]);
        break;
      }
    }
  }
  // Campos que cada tipo de movimento grava no fim
  const TOUCH = { move: ['x', 'y', 'pts'], path: ['x', 'y', 'pts'], rotate: ['rot', 'dir', 'facing'], fade: ['opacity', 'power'], scale: ['w', 'h', 'x', 'y', 'power'], color: ['color'] };
  // Patch para gravar no estado o valor da animação na fração u
  A.patchAt = function (sc, key, entry, u) {
    const [k] = A.split(key), o = A.get(sc, key);
    if (!o) return null;
    const c = Object.assign({}, o);
    applyAt(sc, k, c, entry.spec, entry.from || A.snapshot(o), u);
    const out = {};
    for (const fld of TOUCH[entry.spec.kind] || []) if (c[fld] !== undefined && JSON.stringify(c[fld]) !== JSON.stringify(o[fld])) out[fld] = round(fld, c[fld]);
    if (k === 'prop' && out.rot != null) out.rot = ((Math.round(out.rot) % 360) + 360) % 360;
    if (k === 'light' && out.dir != null) out.dir = ((Math.round(out.dir) % 360) + 360) % 360;
    if (k === 'token') {
      // Token termina encaixado no grid
      if (out.x != null) out.x = Math.round(out.x / sc.grid) * sc.grid;
      if (out.y != null) out.y = Math.round(out.y / sc.grid) * sc.grid;
    }
    return out;
  };
  function round(f, v) {
    if (f === 'pts') return v.map(([x, y]) => [Math.round(x), Math.round(y)]);
    if (f === 'opacity' || f === 'power') return Math.round(v * 100) / 100;
    if (typeof v === 'number') return Math.round(v);
    return v;
  }

  // ---------- o que está rodando ----------
  // Lista de animações ativas da cena: as gravadas, as automáticas dos objetos e as de teste (só nesta tela)
  A.entries = function (sc) {
    if (!sc) return [];
    const out = [], taken = new Set();
    for (const e of sc.anims || []) { out.push(e); taken.add(e.key); }
    for (const e of A.local) if (e.sceneId === sc.id) { out.push(e); taken.add(e.key); }
    const auto = (k, o) => {
      const an = o.anim;
      if (!an || !an.auto || !Array.isArray(an.steps) || !an.steps.length) return;
      const key = A.keyOf(k, o.id);
      if (taken.has(key)) return;
      for (const spec of an.steps) out.push({ id: 'auto:' + key + ':' + spec.id, key, spec, start: 0, from: null, auto: true });
    };
    for (const p of sc.props || []) auto('prop', p);
    for (const o of sc.lights || []) auto('light', o);
    for (const t of Object.values(sc.tokens || {})) auto('token', t);
    return out;
  };
  A.active = (sc) => A.entries(sc).length > 0;
  A.running = (sc, key) => A.entries(sc).filter((e) => e.key === key);

  /*
   * Cena como ela aparece agora: cópia rasa com imagens, luzes e tokens animados no lugar.
   * Sem animação, devolve a própria cena (nada muda no desenho de sempre).
   */
  A.view = function (sc, now) {
    const list = A.entries(sc);
    if (!list.length) return sc;
    now = now ?? A.now();
    const byKey = new Map();
    for (const e of list) { if (!byKey.has(e.key)) byKey.set(e.key, []); byKey.get(e.key).push(e); }
    const out = Object.assign({}, sc);
    const anim = (k, o) => {
      const es = byKey.get(A.keyOf(k, o.id));
      if (!es) return o;
      const c = Object.assign({}, o), f0 = A.snapshot(o);
      for (const e of es) {
        const { u } = A.progress(e.spec, now - e.start);
        applyAt(sc, k, c, e.spec, e.from || f0, u);
      }
      // Token em movimento olha para onde anda (lanterna do guarda acompanha)
      if (k === 'token' && es.some((e) => e.spec.kind === 'move' || e.spec.kind === 'path')) {
        const n2 = Object.assign({}, o);
        for (const e of es) applyAt(sc, k, n2, e.spec, e.from || f0, A.progress(e.spec, now + 60 - e.start).u);
        if (Math.hypot(n2.x - c.x, n2.y - c.y) > 0.5) c.facing = Math.round((Math.atan2(n2.y - c.y, n2.x - c.x) * 180) / Math.PI);
      }
      c._anim = true;
      return c;
    };
    if ((sc.props || []).length) out.props = sc.props.map((p) => anim('prop', p));
    if ((sc.lights || []).length) out.lights = sc.lights.map((o) => anim('light', o));
    const tk = {};
    let any = false;
    for (const [id, t] of Object.entries(sc.tokens || {})) { const c = anim('token', t); tk[id] = c; if (c !== t) any = true; }
    if (any) out.tokens = tk;
    return out;
  };

  // Está se mexendo de lugar, girando ou mudando de tamanho agora? (para a área de dano "só em movimento")
  A.moving = function (sc, key) {
    const now = A.now();
    return A.entries(sc).some((e) => e.key === key && ['move', 'path', 'rotate', 'scale'].includes(e.spec.kind) && !A.progress(e.spec, now - e.start).done);
  };

  // ---------- comandos (mestre) ----------
  const D = (a) => S().dispatch(Object.assign(a, { noUndo: true }));
  /*
   * Começa animações. targets = ['prop:id'…]; specs = movimentos (null = os do próprio objeto).
   * Se já roda um movimento do mesmo tipo no objeto, ele para onde está (gravado) e o novo começa dali.
   */
  A.play = function (sceneId, targets, specs) {
    const sc = S().state.scenes[sceneId];
    if (!sc || !S().isGM()) return 0;
    const now = A.now(), entries = [], commits = [], stop = [];
    for (const key of targets) {
      const o = A.get(sc, key);
      if (!o) continue;
      const list = specs || (o.anim && o.anim.steps) || [];
      if (!list.length) continue;
      const vis = Object.assign({}, o);
      // valor atual (com o que já está rodando)
      for (const e of A.entries(sc).filter((x) => x.key === key)) applyAt(sc, A.split(key)[0], vis, e.spec, e.from || A.snapshot(o), A.progress(e.spec, now - e.start).u);
      const patch = {};
      for (const e of (sc.anims || []).filter((x) => x.key === key)) {
        if (list.some((s) => s.kind === e.spec.kind) || list.some((s) => TOUCH[s.kind].some((f) => TOUCH[e.spec.kind].includes(f)))) {
          Object.assign(patch, A.patchAt(sc, key, e, A.progress(e.spec, now - e.start).u));
          stop.push(e.id);
        }
      }
      if (o.anim && o.anim.auto) patch.anim = Object.assign({}, o.anim, { auto: false });
      if (!o.animHome) patch.animHome = A.snapshot(o);
      if (Object.keys(patch).length) commits.push({ key, patch });
      const from = Object.assign(A.snapshot(o), patch);
      for (const s of list) entries.push({ id: U.uid('an_'), key, spec: U.clone(s), start: now, from: A.snapshot(from) });
    }
    if (!entries.length) return 0;
    D({ type: 'anim.start', sceneId, entries, commits, stop });
    A.ensureTick();
    return entries.length;
  };
  // Para onde está (grava a posição de agora) ou volta ao início
  A.stop = function (sceneId, targets, mode) {
    const sc = S().state.scenes[sceneId];
    if (!sc || !S().isGM()) return;
    const now = A.now(), ids = [], commits = [];
    for (const key of targets) {
      const o = A.get(sc, key);
      if (!o) continue;
      const patch = {};
      const mine = (sc.anims || []).filter((e) => e.key === key);
      if (mode === 'reset') {
        if (o.animHome) Object.assign(patch, U.clone(o.animHome));
        patch.animHome = null;
      } else {
        for (const e of mine) Object.assign(patch, A.patchAt(sc, key, e, A.progress(e.spec, now - e.start).u));
        // automática: grava onde ela está agora
        if (o.anim && o.anim.auto) {
          const c = Object.assign({}, o);
          for (const e of A.entries(sc).filter((x) => x.key === key && x.auto)) applyAt(sc, A.split(key)[0], c, e.spec, A.snapshot(o), A.progress(e.spec, now).u);
          for (const s of o.anim.steps) for (const f of TOUCH[s.kind] || []) if (c[f] !== undefined) patch[f] = round(f, c[f]);
        }
      }
      if (o.anim && o.anim.auto) patch.anim = Object.assign({}, o.anim, { auto: false });
      ids.push(...mine.map((e) => e.id));
      if (Object.keys(patch).length) commits.push({ key, patch });
    }
    A.local = A.local.filter((e) => !targets.includes(e.key));
    if (ids.length || commits.length) D({ type: 'anim.end', sceneId, ids, commits });
  };
  // Liga de novo a animação automática do objeto (a que começa sozinha)
  A.setAuto = function (sceneId, key, on) {
    const sc = S().state.scenes[sceneId], o = sc && A.get(sc, key);
    if (!o || !o.anim) return;
    if (on) A.stop(sceneId, [key], 'stop');
    const type = { prop: 'prop.update', light: 'lightpt.update', token: 'token.update' }[A.split(key)[0]];
    D({ type, sceneId, id: o.id, patch: { anim: Object.assign({}, o.anim, { auto: !!on }) } });
  };

  // Testar (só nesta tela): toca por até 6 s e volta tudo ao lugar
  A.preview = function (sceneId, targets, specs) {
    const sc = S().state.scenes[sceneId];
    if (!sc) return 0;
    const now = A.now();
    let longest = 0;
    for (const key of targets) {
      const o = A.get(sc, key);
      if (!o) continue;
      const list = specs || (o.anim && o.anim.steps) || [];
      for (const s of list) {
        const len = Math.min(6000, A.total(s));
        longest = Math.max(longest, len);
        const e = { id: U.uid('lp_'), key, spec: U.clone(s), start: now, from: A.snapshot(o), sceneId, until: now + len + 300 };
        A.local.push(e);
      }
    }
    if (App.Board) App.Board.requestRender();
    A.ensureTick();
    return longest;
  };

  // ---------- área de dano das imagens ----------
  // Polígono da área de dano no mundo (gira e espelha junto com a imagem)
  A.hurtPoly = function (p) {
    const hz = p.hurt;
    if (!hz) return null;
    const b = Array.isArray(hz.box) && hz.box.length === 4 ? hz.box : [0, 0, 1, 1];
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, a = ((p.rot || 0) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    const corner = (bx, by) => {
      let lx = (bx - 0.5) * p.w;
      const ly = (by - 0.5) * p.h;
      if (p.flip) lx = -lx;
      return [cx + lx * cs - ly * sn, cy + lx * sn + ly * cs];
    };
    return [corner(b[0], b[1]), corner(b[2], b[1]), corner(b[2], b[3]), corner(b[0], b[3])];
  };
  // Converte um retângulo do mundo (dois cantos) para a caixa da imagem (0–1)
  A.boxFrom = function (p, a, b) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, ang = -((p.rot || 0) * Math.PI) / 180, cs = Math.cos(ang), sn = Math.sin(ang);
    const loc = (q) => {
      const dx = q.x - cx, dy = q.y - cy;
      let lx = dx * cs - dy * sn;
      const ly = dx * sn + dy * cs;
      if (p.flip) lx = -lx;
      return [U.clamp(lx / p.w + 0.5, -1, 2), U.clamp(ly / p.h + 0.5, -1, 2)];
    };
    const [x1, y1] = loc(a), [x2, y2] = loc(b);
    const r = (v) => Math.round(v * 1000) / 1000;
    return [r(Math.min(x1, x2)), r(Math.min(y1, y2)), r(Math.max(x1, x2)), r(Math.max(y1, y2))];
  };
  A.newHurt = () => ({ on: true, box: [0.1, 0.1, 0.9, 0.9], when: 'moving', who: 'any', save: 'Destreza', dc: 13, damage: '2d6', bar: '', onSave: 'half' });
  function tokenTouches(sc, t, poly) {
    const g = sc.grid, s = (t.size || 1) * g, m = s * 0.2;
    const pts = [[t.x + s / 2, t.y + s / 2], [t.x + m, t.y + m], [t.x + s - m, t.y + m], [t.x + m, t.y + s - m], [t.x + s - m, t.y + s - m]];
    return pts.some(([x, y]) => App.Light.inPoly(x, y, poly));
  }
  // Mestre: quem a imagem tocou agora (uma vez por passagem: precisa sair e entrar de novo para levar outro golpe)
  function checkHurt(st) {
    for (const sc0 of Object.values(st.scenes)) {
      const props = (sc0.props || []).filter((p) => p.hurt && p.hurt.on && !p.hidden);
      if (!props.length) continue;
      const sc = A.view(sc0);
      for (const p0 of props) {
        const p = (sc.props || []).find((x) => x.id === p0.id) || p0, hz = p0.hurt, key = 'prop:' + p0.id;
        const moving = A.moving(sc0, key);
        const hits = [];
        for (const t of Object.values(sc.tokens)) {
          const k = sc0.id + '|' + p0.id + '|' + t.id;
          const ok = (hz.when !== 'moving' || moving) && App.Triggers.whoOk({ who: hz.who || 'any', whoIds: [] }, t);
          const touch = ok && tokenTouches(sc, t, A.hurtPoly(p));
          if (touch && !A.inside.has(k)) hits.push(t.id);
          if (touch) A.inside.set(k, 1); else A.inside.delete(k);
        }
        if (!hits.length) continue;
        const save = String(hz.save || '').trim();
        const trap = { name: p0.name || 'Imagem', mode: save ? 'save' : 'damage', save, dc: String(hz.dc || 10), damage: hz.damage || '0', bar: hz.bar || '', onSave: hz.onSave === 'none' ? 'none' : 'half' };
        try { S().useAction({ sceneId: sc0.id, trap, targets: hits }, null); } catch (e) { console.warn('dano da imagem', e); }
      }
    }
  }

  // ---------- relógio do mestre: termina animações, dano, exploração ----------
  function tick() {
    const st = S().state;
    const now = A.now();
    const before = A.local.length;
    A.local = A.local.filter((e) => now < e.until);
    if (A.local.length !== before && App.Board) App.Board.requestRender();
    if (!st) return;
    if (S().isGM()) {
      // De tempos em tempos, o relógio do mestre vai para os jogadores (corrige a diferença)
      if (App.Net && App.Net.isOnline() && now - (A.lastClock || 0) > 20000) { A.lastClock = now; App.Net.broadcast({ t: 'clock', now: Date.now() }); }
      for (const sc of Object.values(st.scenes)) {
        const done = (sc.anims || []).filter((e) => A.progress(e.spec, now - e.start).done);
        if (done.length) {
          const commits = [];
          for (const e of done) {
            if (e.spec.end === 'back' || e.spec.repeat === 'pingpong') continue;
            const patch = A.patchAt(sc, e.key, e, 1);
            if (patch && Object.keys(patch).length) commits.push({ key: e.key, patch });
          }
          D({ type: 'anim.end', sceneId: sc.id, ids: done.map((e) => e.id), commits });
        }
      }
      checkHurt(st);
      // Luz ou token andando: a memória de exploração grava a cada 1 s
      if (App.Explore && now - A.lastExplore > 1000) {
        A.lastExplore = now;
        for (const sc of Object.values(st.scenes)) {
          if (!App.Explore.on(sc)) continue;
          if (A.entries(sc).some((e) => /^(light|token):/.test(e.key))) App.Explore.recompute(sc.id);
        }
      }
    }
  }
  A.ensureTick = function () {
    if (A.timer) return;
    A.timer = setInterval(tick, 100);
  };

  App.Anim = A;
  A.ensureTick();
})(window.App);
