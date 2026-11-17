'use strict';
/*
 * Regras do combate "estilo videogame": alcance das ações, quem pode ser alvo, área de efeito e chance de acerto.
 * Usado pela mira do tabuleiro, pelo painel do token e pela validação do mestre (Store.useAction).
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;
  const C = {};

  // Nomes que indicam ataque à distância (quando a ação não diz o alcance)
  const RANGED = /arco|besta|arremess|funda|dardo|azagaia|pistola|rifle|rev[oó]lver|espingarda|arma de fogo|\bbow\b|crossbow|\bgun\b|javelin|sling/i;

  // Alcance em quadrados. Campo vazio = padrão pelo tipo; 0 = sem limite.
  C.defaultRange = (ac) => {
    const m = (ac && ac.mode) || 'roll';
    if (m === 'attack') return RANGED.test((ac && ac.name) || '') ? 16 : 1;
    if (m === 'heal') return 1;
    return 12;
  };
  C.hasRange = (ac) => ac && ac.range != null && String(ac.range).trim() !== '';
  C.rangeOf = (ac) => {
    if (!C.hasRange(ac)) return C.defaultRange(ac);
    const n = Number(ac.range);
    return n > 0 ? n : Infinity;
  };
  // Raio da área em quadrados (0 = alvo escolhido um a um)
  C.areaOf = (ac) => (ac && ['save', 'damage', 'heal'].includes(ac.mode) ? Math.max(0, Number(ac.area) || 0) : 0);
  C.rangeLabel = (ac) => {
    const r = C.rangeOf(ac);
    if (r === Infinity) return 'sem limite';
    if (r <= 1 && ac.mode === 'heal') return 'toque';
    if (r <= 1) return 'corpo a corpo';
    return r + ' quad.';
  };

  // ---------- geometria ----------
  const box = (sc, t) => ({ x: Number(t.x) || 0, y: Number(t.y) || 0, s: (t.size || 1) * sc.grid });
  const cellBox = (sc, p) => ({ x: Math.floor(p.x / sc.grid) * sc.grid, y: Math.floor(p.y / sc.grid) * sc.grid, s: sc.grid });
  C.center = (sc, t) => { const b = box(sc, t); return { x: b.x + b.s / 2, y: b.y + b.s / 2 }; };
  function measure(sc, gx, gy) {
    if (sc.measure === 'euclid') return Math.round(Math.hypot(gx, gy) * 10) / 10;
    const mx = Math.max(gx, gy), mn = Math.min(gx, gy);
    if (sc.measure === 'alt') return mx + Math.floor(mn / 2);
    return mx;
  }
  // Distância em quadrados entre dois espaços ocupados (vizinhos, inclusive na diagonal = 1)
  function distBox(sc, a, b) {
    const g = sc.grid;
    const gx = Math.max(0, Math.round(Math.max(b.x - (a.x + a.s), a.x - (b.x + b.s)) / g));
    const gy = Math.max(0, Math.round(Math.max(b.y - (a.y + a.s), a.y - (b.y + b.s)) / g));
    return measure(sc, gx, gy) + 1;
  }
  C.dist = (sc, a, b) => (a.id === b.id ? 0 : distBox(sc, box(sc, a), box(sc, b)));
  C.distToPoint = (sc, a, p) => distBox(sc, box(sc, a), cellBox(sc, p));
  // Ponto central do quadrado (onde a área "cai")
  C.snapCell = (sc, p) => { const b = cellBox(sc, p); return { x: b.x + b.s / 2, y: b.y + b.s / 2 }; };

  // eyeH = altura de quem olha/ataca: muros baixos da altura dele ou mais altos também tapam a visão
  const wallBetween = (sc, a, b, eyeH) => !!(App.Light && (sc.walls || []).length && App.Light.blocked(sc, a.x, a.y, b.x, b.y, eyeH));
  C.blocked = (sc, a, b) => wallBetween(sc, C.center(sc, a), C.center(sc, b), C.sightH(C.topOf(a), b));

  // ---------- cobertura (muros baixos) ----------
  /*
   * Cada parede tem um tipo (w.cover): 'full' (parede absoluta: casa com telhado, nunca deixa ver o outro lado),
   * 'high' (cobertura total, a regra oficial; o padrão, e paredes antigas sem tipo também), 'three' (três quartos) ou 'half' (meia).
   * Total, ¾ e meia funcionam pela altura: quem é mais alto que o muro enxerga por cima.
   * A proteção depende da altura do muro ÷ altura do alvo: ≥100% = cobertura total (não pode ser alvo),
   * ≥ limite de ¾ = bônus de ¾, ≥ limite de ½ = bônus de ½. Tudo configurável por cena (sc.cover).
   */
  C.COVER_DEFAULT = { enabled: true, heights: { high: 3, three: 1.4, half: 0.9 }, shadow: { high: 3, three: 3, half: 1 },
    levels: { three: 75, half: 50 }, bonus: { three: 5, half: 2 }, show: 'show', lean: true };
  C.COVER_TYPES = [['full', 'Parede absoluta'], ['high', 'Cobertura total'], ['three', 'Três quartos'], ['half', 'Meia cobertura']];
  C.COVER_LABEL = { none: '', half: 'Meia cobertura', three: 'Cobertura ¾', total: 'Cobertura total' };
  const RANK = { none: 0, half: 1, three: 2, total: 3 };
  C.coverCfg = (sc) => {
    const c = (sc && sc.cover) || {}, D = C.COVER_DEFAULT;
    const heights = Object.assign({}, D.heights, c.heights);
    // Versão anterior: heights.full era a altura do que hoje é a cobertura total ('high')
    if (c.heights && c.heights.full != null && c.heights.high == null) heights.high = c.heights.full;
    delete heights.full;
    return { enabled: c.enabled !== false, heights, shadow: Object.assign({}, D.shadow, c.shadow),
      levels: Object.assign({}, D.levels, c.levels), bonus: Object.assign({}, D.bonus, c.bonus), show: c.show || D.show, lean: c.lean !== false };
  };
  C.wallType = (w) => (w.door ? 'full' : w.cover === 'full' || w.cover === 'three' || w.cover === 'half' ? w.cover : 'high');
  // Altura do token em metros: a da ficha, ou pelo tamanho (1 quadrado = 1,8 m)
  C.heightOf = (t) => {
    const a = S().actorOf(t), hgt = Number((a && a.height) || t.height);
    if (hgt > 0) return hgt;
    const s = Number(t.size) || 1;
    return s < 1 ? 0.9 : 1.8 * s;
  };
  // Voo: o mestre diz quantos metros o token subiu (t.fly). Topo = altura do corpo + altura do voo.
  C.flyOf = (t) => Math.max(0, Number(t && t.fly) || 0);
  C.topOf = (t) => C.heightOf(t) + C.flyOf(t);
  // Altura da linha de visão entre quem olha e o alvo: o olho de quem olha;
  // se o alvo voa, dá para vê-lo por cima de qualquer muro mais baixo que ele (menos a parede absoluta)
  C.sightH = (eye, t) => (C.flyOf(t) > 0 ? Math.max(eye || 0, C.topOf(t)) : eye || 0);
  C.defaultHeight = (size) => { const s = Number(size) || 1; return s < 1 ? 0.9 : 1.8 * s; };

  function segDist(px, py, w) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, l = dx * dx + dy * dy;
    const k = l ? Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / l)) : 0;
    return Math.hypot(px - (w.x1 + k * dx), py - (w.y1 + k * dy));
  }
  function crosses(ax, ay, bx, by, w) {
    const cr = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const d1 = cr(w.x1, w.y1, w.x2, w.y2, ax, ay), d2 = cr(w.x1, w.y1, w.x2, w.y2, bx, by);
    const d3 = cr(ax, ay, bx, by, w.x1, w.y1), d4 = cr(ax, ay, bx, by, w.x2, w.y2);
    return ((d1 > 1e-6 && d2 < -1e-6) || (d1 < -1e-6 && d2 > 1e-6)) && ((d3 > 1e-6 && d4 < -1e-6) || (d3 < -1e-6 && d4 > 1e-6));
  }
  // Em que fração do caminho a→b a linha cruza o muro w (0 = em a, 1 = em b)
  function crossFrac(ax, ay, bx, by, w) {
    const rx = bx - ax, ry = by - ay, sx = w.x2 - w.x1, sy = w.y2 - w.y1, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return 0;
    return ((w.x1 - ax) * sy - (w.y1 - ay) * sx) / den;
  }
  const lowWalls = (sc) => (sc.walls || []).filter((w) => C.wallType(w) !== 'full');
  // Encostado no muro (o atacante se debruça e atira por cima)
  const leaning = (sc, tok, w) => {
    const c = C.center(sc, tok);
    return segDist(c.x, c.y, w) <= ((tok.size || 1) * sc.grid) / 2 + sc.grid * 0.6;
  };
  const levelFor = (cfg, wallH, targetH) => {
    const pct = (wallH / Math.max(0.1, targetH)) * 100;
    if (pct >= 100) return 'total';
    if (pct >= Number(cfg.levels.three)) return 'three';
    if (pct >= Number(cfg.levels.half)) return 'half';
    return 'none';
  };

  /*
   * Cobertura do alvo t vista de `from` (ponto {x,y}); fromTok = token atacante (para a regra de se debruçar).
   * Testa 5 linhas (centro e 4 cantos do alvo) e vale a de MENOR cobertura: a parede precisa cobrir o alvo todo.
   * → { level: 'none'|'half'|'three'|'total', bonus, label }
   */
  C.coverOf = (sc, from, t, fromTok) => {
    const none = { level: 'none', bonus: 0, label: '' };
    const cfg = C.coverCfg(sc);
    if (!cfg.enabled || !t) return none;
    const walls = lowWalls(sc).filter((w) => !(fromTok && cfg.lean && leaning(sc, fromTok, w)));
    if (!walls.length) return none;
    const th = C.heightOf(t), fly = C.flyOf(t), c = C.center(sc, t), q = (t.size || 1) * sc.grid * 0.35;
    const atkEye = fromTok ? C.topOf(fromTok) : 0, atkFlies = !!fromTok && C.flyOf(fromTok) > 0, eye = C.sightH(atkEye, t);
    const pts = [c, { x: c.x - q, y: c.y - q }, { x: c.x + q, y: c.y - q }, { x: c.x - q, y: c.y + q }, { x: c.x + q, y: c.y + q }];
    let best = 'total';
    for (const p of pts) {
      let lv = 'none';
      if (wallBetween(sc, from, p, eye)) lv = 'total';
      else for (const w of walls) {
        if (!crosses(from.x, from.y, p.x, p.y, w)) continue;
        // Quanto do corpo do alvo fica atrás do muro. No chão: até o topo do muro (menos o que ele voa).
        // Atacante voando acima do muro: a linha desce, quanto mais longe
        // do muro o alvo está, menos dele fica escondido.
        const H = Number(cfg.heights[C.wallType(w)]) || 0;
        let hidden = H - fly;
        if (atkFlies && atkEye > H) { const f = crossFrac(from.x, from.y, p.x, p.y, w); if (f > 0) hidden = atkEye - (atkEye - H) / f - fly; }
        const l = levelFor(cfg, hidden, th);
        if (RANK[l] > RANK[lv]) lv = l;
      }
      if (RANK[lv] < RANK[best]) best = lv;
      if (best === 'none') break;
    }
    const bonus = best === 'three' || best === 'half' ? Number(cfg.bonus[best]) || 0 : 0;
    return { level: best, bonus, label: C.COVER_LABEL[best] };
  };
  C.coverFromToken = (sc, src, t) => (src ? C.coverOf(sc, C.center(sc, src), t, src) : { level: 'none', bonus: 0, label: '' });

  /*
   * Está na "sombra" de um muro baixo para todos os olhos deste cliente?
   * (muro entre os dois, alvo a até N quadrados do muro, e quem olha não está encostado nele)
   */
  C.inShadow = (sc, viewers, t) => {
    const cfg = C.coverCfg(sc);
    if (!cfg.enabled || !viewers || !viewers.length) return false;
    const walls = lowWalls(sc);
    if (!walls.length) return false;
    const c = C.center(sc, t), fly = C.flyOf(t);
    return viewers.every((v) => {
      if (v.id === t.id) return false;
      const o = C.center(sc, v);
      return walls.some((w) => {
        const reach = (Number(cfg.shadow[C.wallType(w)]) || 0) * sc.grid;
        return reach > 0 && fly < (Number(cfg.heights[C.wallType(w)]) || 0) && crosses(o.x, o.y, c.x, c.y, w) && segDist(c.x, c.y, w) <= reach && !leaning(sc, v, w);
      });
    });
  };
  // Como o token aparece na sombra: a ficha decide, senão vale a regra da cena
  C.shadowMode = (sc, t) => {
    const a = S().actorOf(t), m = a && a.coverShow;
    return m === 'show' || m === 'silhouette' || m === 'hide' ? m : C.coverCfg(sc).show;
  };

  // Lado de cada token: grupo (personagem ou token com dono), criatura do mestre, ou NPC (neutro: vale para tudo)
  C.side = (t) => {
    const a = S().actorOf(t) || {};
    const owner = t.owner != null ? t.owner : a.owner;
    if (owner || a.kind === 'pc') return 'party';
    return a.kind === 'npc' ? 'neutral' : 'foe';
  };

  /*
   * Este token pode ser alvo da ação? → { ok, d (quadrados), why }
   * Ataques e magias miram o outro lado; cura mira o próprio lado (inclusive você).
   */
  C.check = (sc, src, ac, t) => {
    if (!src) return { ok: true, d: null };
    const heal = ac.mode === 'heal';
    const d = C.dist(sc, src, t);
    if (t.id === src.id) return heal ? { ok: true, d: 0 } : { ok: false, d: 0, why: 'Você mesmo' };
    const st = C.side(t), ss = C.side(src), same = st === ss;
    if (st !== 'neutral' && ss !== 'neutral' && (heal ? !same : same)) return { ok: false, d, why: heal ? 'Não é aliado' : 'Aliado' };
    if (d > C.rangeOf(ac)) return { ok: false, d, why: 'Fora de alcance' };
    if (C.blocked(sc, src, t)) return { ok: false, d, why: 'Atrás de parede' };
    if (heal) return { ok: true, d };
    const cover = C.coverFromToken(sc, src, t);
    if (cover.level === 'total') return { ok: false, d, why: 'Cobertura total', cover };
    return { ok: true, d, cover };
  };

  // O ponto central de uma área pode ser escolhido? (dentro do alcance e à vista)
  C.checkPoint = (sc, src, ac, p) => {
    if (!src) return { ok: true, d: null };
    const d = C.distToPoint(sc, src, p);
    if (d > C.rangeOf(ac)) return { ok: false, d, why: 'Fora de alcance' };
    if (wallBetween(sc, C.center(sc, src), p, C.topOf(src))) return { ok: false, d, why: 'Atrás de parede' };
    return { ok: true, d };
  };

  // Tokens atingidos por uma área centrada em p (a parede protege quem está atrás dela)
  C.areaTargets = (sc, src, ac, p, list) => {
    const R = C.areaOf(ac) * sc.grid;
    return (list || Object.values(sc.tokens)).filter((t) => {
      if (src && t.id === src.id) return false;
      const c = C.center(sc, t), s = (t.size || 1) * sc.grid;
      return Math.hypot(c.x - p.x, c.y - p.y) <= R + s * 0.35 && !wallBetween(sc, p, c)
        && (ac.mode === 'heal' || C.coverOf(sc, p, t).level !== 'total');
    });
  };

  // ---------- chance de acerto (para mostrar antes de atacar) ----------
  C.hitChance = (ac, vars, def) => {
    if (def == null) return 1;
    const D = App.Dice, rules = S().state.rules || {};
    const critMin = Number(ac.critMin) || 20;
    let f;
    try { f = D.substitute(ac.attack || '1d20', vars); } catch { return null; }
    // Caso comum (1d20 + bônus): conta exata
    const m = /^\s*1d20\s*(?:([+-])\s*(\d+))?\s*$/i.exec(f);
    if (m) {
      const bonus = m[1] ? (m[1] === '-' ? -1 : 1) * Number(m[2]) : 0;
      let hit = 0;
      for (let n = 1; n <= 20; n++) {
        const crit = rules.critMode !== 'none' && n >= critMin;
        if (rules.nat1Miss && n === 1) continue;
        if ((crit && rules.critHits) || n + bonus >= def) hit++;
      }
      return hit / 20;
    }
    // Qualquer outra fórmula: estimativa rolando várias vezes
    let hit = 0;
    const N = 300;
    try {
      for (let i = 0; i < N; i++) {
        const r = D.roll(f, {}), nat = r.nat || [];
        const crit = rules.critMode !== 'none' && nat.some((v) => v >= critMin);
        const fumble = rules.nat1Miss && nat.length > 0 && nat.every((v) => v === 1);
        if (!fumble && ((crit && rules.critHits) || r.total >= def)) hit++;
      }
    } catch { return null; }
    return hit / N;
  };

  App.Combat = C;
})(window.App);
