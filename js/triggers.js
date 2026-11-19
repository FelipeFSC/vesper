'use strict';
/*
 * Gatilhos (Plano 14): áreas do mapa que fazem coisas acontecerem.
 * Tudo roda no MESTRE (a autoridade): depois de um movimento aceito ou de um clique numa imagem ligada,
 * ele confere os gatilhos e executa as ações com os dispatches de sempre (portas, luzes, tokens, som, névoa…).
 *
 * Gatilho (sc.triggers):
 * {id, name, shape: circle|rect|poly, x, y, r (raio em quadrados, círculo), pts [[x,y]…] (retângulo e polígono),
 *  on: enter|leave|click, propId (imagem ligada, para click), who: party|foes|any|pick, whoIds [],
 *  times: once|always|n, n, used, cooldown (s), lastAt, ask, stop, enabled, actions: [{id, type, delay, …}]}
 *
 * Portal (Plano 31): um gatilho com portal: true e uma ação só, teleport {sceneId, x, y, portalId}.
 * portalId = o portal do outro lado (ida e volta): a chegada é o centro dele. Sem portalId, chega em x, y.
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;
  const T = {};

  T.EVENTS = [['enter', 'Entrar na área'], ['leave', 'Sair da área'], ['click', 'Clicar numa imagem']];
  T.WHO = [['party', 'Personagens do grupo'], ['foes', 'Criaturas'], ['any', 'Qualquer token'], ['pick', 'Tokens escolhidos']];
  T.ACTIONS = [
    ['door', 'Porta'], ['light', 'Luz'], ['token', 'Token ou grupo'], ['sound', 'Som'],
    ['anim', 'Animar'], ['trap', 'Armadilha'], ['fog', 'Névoa'], ['trigger', 'Outro gatilho'],
  ];

  T.ICON = { door: 'door-closed', light: 'lightbulb', token: 'users', sound: 'volume-2', trap: 'swords', fog: 'cloud-fog', teleport: 'sparkles', trigger: 'zap', anim: 'move' };
  const OPS = {
    door: { open: 'Abrir', close: 'Fechar', lock: 'Trancar', unlock: 'Destrancar', toggle: 'Alternar' },
    light: { on: 'Acender', off: 'Apagar', toggle: 'Alternar' },
    token: { show: 'Aparecer', hide: 'Sumir', mask: 'Virar vulto' },
    sound: { sfx: 'Efeito', 'spot-fire': 'Tocar som do mapa', 'spot-on': 'Ligar som do mapa', 'spot-off': 'Desligar som do mapa', music: 'Música', 'music-stop': 'Parar a música', ambient: 'Ambiente', 'ambient-stop': 'Parar o ambiente', 'sfx-stop': 'Parar efeito', 'all-stop': 'Parar todos os sons' },
    fog: { reveal: 'Revelar a área', hide: 'Esconder a área' },
    trigger: { enable: 'Ligar', disable: 'Desligar', rearm: 'Rearmar', fire: 'Disparar' },
    anim: { own: 'Tocar a animação do objeto', play: 'Animação nova', stop: 'Parar onde está', reset: 'Voltar ao início' },
  };
  T.OPS = OPS;
  const cellOf = (sc, x, y) => `(${Math.floor(x / sc.grid) + 1}, ${Math.floor(y / sc.grid) + 1})`;
  /*
   * Resumo curto de uma ação para os cartões: {target, op, missing}
   * missing = falta escolher o alvo (o cartão avisa).
   */
  /*
   * Alvos de uma ação (Plano 21): a lista a.ids e o grupo de objetos a.tag (nome livre posto no painel de cada objeto).
   * Devolve [{kind, key, obj, name}] sem repetir. kind = door|light|sound|trigger|token|prop.
   */
  const ACT_KIND = { door: 'door', light: 'light', sound: 'sound', trigger: 'trigger' };
  T.tagKinds = { door: ['door'], light: ['light'], sound: ['sound'], anim: ['prop', 'light'] };
  function objOf(sc, kind, id) {
    if (kind === 'door') { const w = (sc.walls || []).find((x) => x.id === id); return w && w.door ? w : null; }
    if (kind === 'light') return (sc.lights || []).find((x) => x.id === id) || null;
    if (kind === 'sound') return (sc.sounds || []).find((x) => x.id === id) || null;
    if (kind === 'trigger') return (sc.triggers || []).find((x) => x.id === id) || null;
    if (kind === 'prop') return (sc.props || []).find((x) => x.id === id) || null;
    if (kind === 'token') return sc.tokens[id] || null;
    return null;
  }
  T.objOf = objOf;
  T.nameOf = function (sc, kind, o) {
    if (kind === 'door') return 'Porta ' + cellOf(sc, (o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2);
    if (kind === 'light') return o.name || 'Luz';
    if (kind === 'sound') return App.Audio.label(o.name);
    if (kind === 'trigger') return o.name || 'Gatilho';
    if (kind === 'prop') return o.name || 'Imagem';
    if (kind === 'token') return o.name || 'Token';
    return '';
  };
  // Objetos de um tipo com este grupo de objetos
  T.tagged = function (sc, kind, tag) {
    if (!tag) return [];
    const list = kind === 'door' ? (sc.walls || []).filter((w) => w.door) : kind === 'light' ? sc.lights || [] : kind === 'sound' ? sc.sounds || [] : kind === 'prop' ? sc.props || [] : [];
    return list.filter((o) => o.tag === tag);
  };
  // Todos os nomes de grupos de objetos usados na cena (para as listas)
  T.allTags = function (sc) {
    const out = new Set();
    for (const o of [].concat((sc.walls || []).filter((w) => w.door), sc.lights || [], sc.sounds || [], sc.props || [])) if (o.tag) out.add(o.tag);
    return [...out].sort((x, y) => x.localeCompare(y));
  };
  T.targets = function (sc, a) {
    const out = [], seen = new Set();
    const add = (kind, o) => { const key = kind + ':' + o.id; if (seen.has(key)) return; seen.add(key); out.push({ kind, key, obj: o, name: T.nameOf(sc, kind, o) }); };
    const ids = Array.isArray(a.ids) ? a.ids : [];
    if (a.type === 'token') {
      for (const ref of ids) {
        const s = String(ref);
        if (s.startsWith('g:')) { for (const t of Object.values(sc.tokens)) if (t.group === s.slice(2)) add('token', t); }
        else { const t = sc.tokens[s.replace(/^t:/, '')]; if (t) add('token', t); }
      }
      return out;
    }
    if (a.type === 'anim') {
      for (const ref of ids) { const i = String(ref).indexOf(':'), k = ref.slice(0, i), o = objOf(sc, k, ref.slice(i + 1)); if (o) add(k, o); }
    } else if (ACT_KIND[a.type]) {
      for (const id of ids) { const o = objOf(sc, ACT_KIND[a.type], id); if (o) add(ACT_KIND[a.type], o); }
    }
    for (const k of T.tagKinds[a.type] || []) for (const o of T.tagged(sc, k, a.tag)) add(k, o);
    return out;
  };
  // "Luz (Tocha)", "3 luzes", "Grupo tochas (3)"
  const PLURAL = { door: 'portas', light: 'luzes', sound: 'sons', trigger: 'gatilhos', token: 'tokens', prop: 'imagens' };
  const SING = { door: 'Porta', light: 'Luz', sound: 'Som', trigger: 'Gatilho', token: 'Token', prop: 'Imagem' };
  T.PLURAL = PLURAL;
  function targetLabel(sc, a, list, fallback) {
    const groups = a.type === 'token' ? (a.ids || []).filter((r) => String(r).startsWith('g:')).map((r) => (sc.groups || []).find((x) => x.id === r.slice(2))).filter(Boolean) : [];
    if (a.tag && !(a.ids || []).length) return 'Grupo "' + a.tag + '"' + (list.length ? ' (' + list.length + ')' : ' (vazio)');
    if (groups.length === 1 && (a.ids || []).length === 1) return 'Grupo ' + groups[0].name;
    if (!list.length) return fallback;
    if (list.length === 1) { const x = list[0]; return x.kind === 'door' || x.kind === 'token' ? x.name : SING[x.kind] + ' (' + x.name + ')'; }
    const kinds = [...new Set(list.map((x) => x.kind))];
    return kinds.length === 1 ? list.length + ' ' + PLURAL[kinds[0]] : list.length + ' objetos';
  }
  T.summary = function (sc, a) {
    const st = S().state, Au = App.Audio, op = (OPS[a.type] || {})[a.op] || '';
    switch (a.type) {
      case 'door': { const l = T.targets(sc, a); return { target: targetLabel(sc, a, l, 'Porta'), op, missing: !l.length }; }
      case 'light': { const l = T.targets(sc, a); return { target: targetLabel(sc, a, l, 'Luz'), op, missing: !l.length }; }
      case 'token': { const l = T.targets(sc, a); return { target: targetLabel(sc, a, l, 'Token ou grupo'), op, missing: !l.length && !(a.ids || []).some((r) => String(r).startsWith('g:')) }; }
      case 'anim': {
        const l = T.targets(sc, a);
        const what = a.op === 'play' ? (a.spec ? App.Anim.KIND_NAME[a.spec.kind] || '' : '') : '';
        return { target: targetLabel(sc, a, l, 'Animar'), op: op + (what ? ': ' + what.toLowerCase() : ''), missing: !l.length };
      }
      case 'sound': {
        const needsTrack = ['sfx', 'music', 'ambient'].includes(a.op), spot = String(a.op).startsWith('spot');
        const l = spot ? T.targets(sc, a) : [];
        const what = needsTrack || a.op === 'sfx-stop' ? (a.name ? Au.label(a.name) : a.op === 'sfx-stop' ? 'todos' : '') : '';
        const after = a.op === 'sfx' && Number(a.stopAfter) > 0 ? ' · para em ' + String(a.stopAfter).replace('.', ',') + ' s' : '';
        return { target: spot ? targetLabel(sc, a, l, 'Som do mapa') : 'Som' + (what ? ' (' + what + ')' : ''), op: op + after, missing: (needsTrack && !a.name) || (spot && !l.length) };
      }
      case 'trap': return { target: 'Armadilha', op: (a.save ? `${a.save} CD ${a.dc} · ` : '') + (a.damage || '0') + (a.save ? (a.onSave === 'none' ? ' (passou: nada)' : ' (passou: metade)') : ''), missing: false };
      case 'fog': return { target: 'Névoa', op, missing: false };
      case 'teleport': {
        const other = a.sceneId && a.sceneId !== sc.id && st.scenes[a.sceneId];
        const d = T.portalDest(sc, null, a);
        return { target: 'Teletransporte', op: other ? 'para a cena ' + other.name + (d && !d.center ? ' ' + cellOf(other, d.x, d.y) : '') : d && !d.center ? 'para ' + cellOf(sc, d.x, d.y) : '', missing: !other && (!d || d.center) };
      }
      case 'trigger': { const l = T.targets(sc, a); return { target: l.length === 1 ? 'Gatilho ' + l[0].name : targetLabel(sc, a, l, 'Outro gatilho'), op, missing: !l.length }; }
    }
    return { target: a.type, op: '', missing: false };
  };
  /*
   * Objeto escolhido no mapa → ação do tipo certo, já com o alvo e com o contrário do estado atual
   * (luz acesa → apagar, porta aberta → fechar, token invisível → aparecer…). pick = {kind, obj}.
   * base = ação existente a reaproveitar (mantém id e atraso) ou nada.
   */
  T.actionFromPick = function (pick, base) {
    const o = pick.obj, keep = base ? { id: base.id, delay: base.delay || 0 } : {};
    switch (pick.kind) {
      case 'light': return Object.assign(T.newAction('light'), keep, { ids: [o.id], op: o.on === false ? 'on' : 'off' });
      case 'door': return Object.assign(T.newAction('door'), keep, { ids: [o.id], op: o.open ? 'close' : 'open' });
      case 'token': return Object.assign(T.newAction('token'), keep, { ids: ['t:' + o.id], op: o.hidden || o.masked ? 'show' : 'hide' });
      case 'sound': return Object.assign(T.newAction('sound'), keep, { ids: [o.id], op: o.once ? 'spot-fire' : o.on ? 'spot-off' : 'spot-on' });
      case 'trigger': return Object.assign(T.newAction('trigger'), keep, { ids: [o.id], op: o.enabled === false ? 'enable' : 'fire' });
      case 'prop': return Object.assign(T.newAction('anim'), keep, { ids: ['prop:' + o.id], op: o.anim && (o.anim.steps || []).length ? 'own' : 'play' });
    }
    return null;
  };
  // Referência que este objeto ganha na lista de alvos da ação (ou null se não serve para ela)
  T.refFor = function (a, pick) {
    const k = pick.kind, id = pick.obj.id;
    if (a.type === 'anim') return ['prop', 'light', 'token'].includes(k) ? k + ':' + id : null;
    if (a.type === 'token') return k === 'token' ? 't:' + id : null;
    if (a.type === 'sound') return k === 'sound' ? id : null;
    return ACT_KIND[a.type] === k ? id : null;
  };
  // Soma o objeto à ação (true) ou tira se já estava (false); null = não serve
  T.toggleRef = function (a, pick) {
    const ref = T.refFor(a, pick);
    if (!ref) return null;
    a.ids = Array.isArray(a.ids) ? a.ids : [];
    const i = a.ids.indexOf(ref);
    if (i >= 0) { a.ids.splice(i, 1); return false; }
    a.ids.push(ref);
    return true;
  };
  T.PICK_NAME = { light: 'Luz', door: 'Porta', token: 'Token', sound: 'Som do mapa', trigger: 'Gatilho', prop: 'Imagem' };

  // Frase do gatilho: "Quando o grupo entrar na área"
  T.sentence = function (tr) {
    const who = { party: 'o grupo', foes: 'uma criatura', any: 'alguém', pick: 'um token escolhido' }[tr.who] || 'o grupo';
    const ev = { enter: 'entrar na área', leave: 'sair da área', click: 'clicar na imagem' }[tr.on] || '';
    return `Quando ${who} ${ev}`;
  };

  /*
   * Testar gatilho (simulação): nada muda de verdade. Cada alvo pisca no mapa do mestre com o nome da ação,
   * no tempo dos atrasos, e o som toca só para o mestre. Devolve o tempo total (ms).
   */
  T.simulate = function (sceneId, trId) {
    const st = S().state, sc = st.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    const B = App.Board;
    if (!tr || !B) return 0;
    const c = T.center(tr), g = sc.grid;
    B.flash({ x: c.x, y: c.y, r: 16, label: 'Testando: ' + (tr.name || 'Gatilho') });
    if (!(tr.actions || []).length) U.toast('Este gatilho ainda não tem ações.');
    let wait = 600;
    for (const a of tr.actions || []) {
      wait += Math.max(0, Number(a.delay) || 0) * 1000;
      setTimeout(() => {
        const s = T.summary(sc, a), label = s.target + (s.op ? ' · ' + s.op : '') + (s.missing ? ' (sem alvo)' : '');
        const spots = simTargets(sc, tr, a);
        if (!spots.length) spots.push(c);
        for (const p of spots) B.flash({ x: p.x, y: p.y, r: p.r, label });
        if (a.type === 'sound') previewSound(sc, a);
        if (a.type === 'anim' && (a.op === 'play' || a.op === 'own')) {
          const keys = T.targets(sc, a).filter((x) => ['prop', 'light', 'token'].includes(x.kind)).map((x) => x.key);
          App.Anim.preview(sc.id, keys, a.op === 'play' && a.spec ? [a.spec] : null);
        }
      }, wait);
    }
    return wait + 1600;
  };
  // Onde piscar cada ação
  // Onde fica um alvo no mapa (para piscar e para as ligações numeradas)
  T.spotOf = function (sc, x) {
    const L = App.Light, o = x.obj;
    if (x.kind === 'door') return { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 };
    if (x.kind === 'light') return o.shape === 'area' && o.pts ? L.areaCenter(o.pts) : { x: o.x, y: o.y };
    if (x.kind === 'token') return Object.assign(L.center(sc, o), { r: ((o.size || 1) * sc.grid) / 2 + 4 });
    if (x.kind === 'prop') return { x: o.x + o.w / 2, y: o.y + o.h / 2, r: Math.max(o.w, o.h) / 2 };
    if (x.kind === 'trigger') return T.center(o);
    return { x: o.x, y: o.y };
  };
  function simTargets(sc, tr, a) {
    if (a.type === 'sound' && !String(a.op).startsWith('spot')) return [];
    if (a.type === 'teleport') return (!a.sceneId || a.sceneId === sc.id) && a.x != null ? [{ x: a.x, y: a.y }] : [];
    return T.targets(sc, a).map((x) => T.spotOf(sc, x));
  }
  // Toca o som só aqui (no mestre), por alguns segundos
  async function previewSound(sc, a) {
    const name = ['sfx', 'music', 'ambient'].includes(a.op) ? a.name : String(a.op).startsWith('spot') ? ((T.targets(sc, a)[0] || {}).obj || {}).name : null;
    if (!name || !App.Audio.previewUrl) return;
    try {
      const url = await App.Audio.previewUrl(name);
      if (!url) return;
      const el = new Audio(url);
      el.volume = 0.8;
      el.play().catch(() => {});
      if (a.op !== 'sfx' && a.op !== 'spot-fire') setTimeout(() => el.pause(), 4000);
    } catch { /* sem som */ }
  }

  // ---------- geometria ----------
  function inPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  T.center = (tr) => (tr.shape === 'circle' || !tr.pts || !tr.pts.length ? { x: tr.x, y: tr.y }
    : { x: tr.pts.reduce((s, p) => s + p[0], 0) / tr.pts.length, y: tr.pts.reduce((s, p) => s + p[1], 0) / tr.pts.length });
  T.inside = function (sc, tr, p) {
    if (tr.shape === 'circle') return Math.hypot(p.x - tr.x, p.y - tr.y) <= (Number(tr.r) || 0.5) * sc.grid;
    return !!(tr.pts && tr.pts.length >= 3 && inPoly(p.x, p.y, tr.pts));
  };
  // Retângulo que contém a área (para a névoa)
  T.bbox = function (sc, tr) {
    if (tr.shape === 'circle') { const R = (Number(tr.r) || 0.5) * sc.grid; return { x: tr.x - R, y: tr.y - R, w: R * 2, h: R * 2 }; }
    const xs = tr.pts.map((p) => p[0]), ys = tr.pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  /*
   * Percorre o caminho (centros do token) em passos pequenos e devolve onde ele entrou e onde saiu da área.
   * {enter: {d, p, seg}, leave: {d, p, seg}} — d = distância andada até ali (para pôr os disparos em ordem).
   */
  function crossing(sc, tr, pts) {
    const out = {}, step = Math.max(4, sc.grid / 6);
    let was = T.inside(sc, tr, pts[0]), dist = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / step));
      for (let k = 1; k <= n; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n }, d = dist + (len * k) / n;
        const now = T.inside(sc, tr, p);
        if (now && !was && !out.enter) out.enter = { d, p, seg: i };
        if (!now && was && !out.leave) out.leave = { d, p, seg: i };
        was = now;
      }
      dist += len;
    }
    return out;
  }
  T.crossing = crossing;

  // ---------- estado ----------
  T.spent = (tr) => (tr.times === 'once' && (tr.used || 0) >= 1) || (tr.times === 'n' && (tr.used || 0) >= Math.max(1, Number(tr.n) || 1));
  T.cooling = (tr) => Number(tr.cooldown) > 0 && tr.lastAt && Date.now() - tr.lastAt < Number(tr.cooldown) * 1000;
  T.ready = (tr) => tr.enabled !== false && !T.spent(tr) && !T.cooling(tr);
  T.stateLabel = (tr) => (tr.enabled === false ? 'Desligado' : T.spent(tr) ? 'Gasto' : T.cooling(tr) ? 'Esperando' : 'Pronto');
  function whoOk(tr, t) {
    const side = App.Combat.side(t);
    if (tr.who === 'foes') return side === 'foe';
    if (tr.who === 'any') return true;
    if (tr.who === 'pick') return (tr.whoIds || []).includes(t.id);
    return side === 'party';
  }
  T.whoOk = whoOk;
  T.newTrigger = function (sc, part) {
    const n = (sc.triggers || []).length + 1;
    return Object.assign({ id: U.uid('tg_'), name: 'Gatilho ' + n, shape: 'circle', x: 0, y: 0, r: 0.5, pts: null, on: 'enter', propId: null,
      who: 'party', whoIds: [], times: 'once', n: 3, used: 0, cooldown: 0, lastAt: 0, ask: false, stop: false, enabled: true, actions: [] }, part);
  };
  // Portal: qualquer token passa, sempre (Plano 31)
  T.isPortal = (tr) => !!(tr && tr.portal);
  T.newPortal = function (sc, part) {
    const n = (sc.triggers || []).filter((x) => x.portal).length + 1;
    const act = T.newAction('teleport');
    return T.newTrigger(sc, Object.assign({ name: 'Portal ' + n, portal: true, who: 'any', times: 'always', actions: [act] }, part));
  };
  // O teletransporte do portal e o portal do outro lado (se existir)
  T.portalAct = (tr) => (tr && (tr.actions || []).find((a) => a.type === 'teleport')) || null;
  T.portalPartner = function (sc, tr) {
    const a = T.portalAct(tr);
    if (!a || !a.portalId) return null;
    const st = S().state, dest = st.scenes[a.sceneId || sc.id];
    const o = dest && (dest.triggers || []).find((x) => x.id === a.portalId && x.portal);
    return o ? { scene: dest, tr: o } : null;
  };
  // Para onde o portal leva: {scene, x, y} (o centro do portal de volta, o ponto escolhido ou o meio do mapa)
  T.portalDest = function (sc, tr, act) {
    const a = act || T.portalAct(tr), st = S().state;
    if (!a) return null;
    const dest = a.sceneId && st.scenes[a.sceneId] ? st.scenes[a.sceneId] : a.sceneId ? null : sc;
    if (!dest) return null;
    const o = a.portalId && (dest.triggers || []).find((x) => x.id === a.portalId);
    if (o) { const c = T.center(o); return { scene: dest, x: c.x, y: c.y, linked: true }; }
    if (a.x != null && Number.isFinite(Number(a.x))) return { scene: dest, x: Number(a.x), y: Number(a.y), linked: false };
    return { scene: dest, x: (dest.cols * dest.grid) / 2, y: (dest.rows * dest.grid) / 2, linked: false, center: true };
  };
  // Ida e volta: cria o portal de volta no destino (1 quadrado), ligado a este
  T.linkPortal = function (sceneId, trId) {
    const st = S().state, sc = st.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    const d = tr && T.portalDest(sc, tr);
    if (!d || d.linked) return null;
    const c = T.center(tr), g = d.scene.grid;
    const px = Math.floor(d.x / g) * g + g / 2, py = Math.floor(d.y / g) * g + g / 2;
    const back = T.newPortal(d.scene, { name: 'Volta de ' + (tr.name || 'Portal'), shape: 'circle', x: px, y: py, r: 0.5, fx: tr.fx !== false });
    Object.assign(back.actions[0], { sceneId: d.scene.id === sc.id ? null : sc.id, x: Math.round(c.x), y: Math.round(c.y), portalId: tr.id });
    S().dispatch({ type: 'trigger.add', sceneId: d.scene.id, trigger: back });
    const acts = U.clone(tr.actions).map((a) => (a.type === 'teleport' ? Object.assign(a, { portalId: back.id, x: px, y: py }) : a));
    S().dispatch({ type: 'trigger.update', sceneId, id: trId, patch: { actions: acts } });
    return back;
  };
  // Tira a volta: apaga o portal do outro lado e este passa a levar ao ponto onde ele estava
  T.unlinkPortal = function (sceneId, trId) {
    const st = S().state, sc = st.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    if (!tr) return;
    const p = T.portalPartner(sc, tr), c = p ? T.center(p.tr) : null;
    const acts = U.clone(tr.actions).map((a) => (a.type === 'teleport' ? Object.assign(a, { portalId: null }, c ? { x: Math.round(c.x), y: Math.round(c.y) } : {}) : a));
    S().dispatch({ type: 'trigger.update', sceneId, id: trId, patch: { actions: acts } });
    if (p) S().dispatch({ type: 'trigger.delete', sceneId: p.scene.id, id: p.tr.id });
  };
  // Muda o destino (patch: {sceneId} ou {x, y}). Com volta: move o portal de volta (ou recria na cena nova)
  T.setPortalDest = function (sceneId, trId, patch) {
    const st = S().state, sc = st.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    if (!tr) return;
    const p = T.portalPartner(sc, tr);
    if ('sceneId' in patch) {
      const had = !!p;
      if (p) T.unlinkPortal(sceneId, trId);
      const t2 = (S().state.scenes[sceneId].triggers || []).find((x) => x.id === trId);
      const acts = U.clone(t2.actions).map((a) => (a.type === 'teleport' ? Object.assign(a, { sceneId: patch.sceneId || null, x: null, y: null, portalId: null }) : a));
      S().dispatch({ type: 'trigger.update', sceneId, id: trId, patch: { actions: acts } });
      // Outra cena: já vem com ida e volta (o mestre pode tirar); no mesmo mapa, mantém o que estava
      if (patch.sceneId && patch.sceneId !== sceneId ? true : had) T.linkPortal(sceneId, trId);
      return;
    }
    if (p && patch.x != null) {
      const g = p.scene.grid, c = T.center(p.tr), px = Math.floor(patch.x / g) * g + g / 2, py = Math.floor(patch.y / g) * g + g / 2, dx = px - c.x, dy = py - c.y;
      S().dispatch({ type: 'trigger.update', sceneId: p.scene.id, id: p.tr.id, patch: Object.assign({ x: p.tr.x + dx, y: p.tr.y + dy }, p.tr.pts ? { pts: p.tr.pts.map(([x, y]) => [x + dx, y + dy]) } : {}) });
      const acts = U.clone(tr.actions).map((a) => (a.type === 'teleport' ? Object.assign(a, { x: px, y: py }) : a));
      S().dispatch({ type: 'trigger.update', sceneId, id: trId, patch: { actions: acts } });
      return;
    }
    const acts = U.clone(tr.actions).map((a) => (a.type === 'teleport' ? Object.assign(a, patch) : a));
    S().dispatch({ type: 'trigger.update', sceneId, id: trId, patch: { actions: acts } });
  };

  T.newAction = function (type) {
    const base = { id: U.uid('ta_'), type, delay: 0 };
    const def = {
      door: { ids: [], tag: '', op: 'close' }, light: { ids: [], tag: '', op: 'toggle' }, token: { ids: [], op: 'show' },
      sound: { op: 'sfx', name: '', ids: [], tag: '' }, trap: { save: 'Destreza', dc: 13, damage: '2d6', bar: '', onSave: 'half' },
      fog: { op: 'reveal' }, teleport: { sceneId: null, x: null, y: null }, trigger: { ids: [], op: 'enable' },
      anim: { ids: [], tag: '', op: 'play', spec: App.Anim.newSpec('move') },
    };
    return Object.assign(base, def[type] || {});
  };

  // ---------- detecção (mestre) ----------
  // O que um gatilho faz não entra no Desfazer do mestre (Plano 17)
  const D = (a) => S().dispatch(Object.assign(a, { noUndo: true }));
  // Antes de aplicar um movimento de jogador: descobre os gatilhos e, se um deles para o movimento, corta o caminho
  T.beforeMove = function (st, a, opts) {
    const sc = st.scenes[a.sceneId], t = sc && sc.tokens[a.id];
    if (!t || !(sc.triggers || []).length) return null;
    const g = sc.grid, s = ((t.size || 1) * g) / 2;
    const raw = (Array.isArray(a.path) && a.path.length >= 2 ? a.path.slice(1, -1) : []).map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]);
    const corners = [[t.x, t.y]].concat(raw, [[a.x, a.y]]);
    const pts = corners.map(([x, y]) => ({ x: x + s, y: y + s }));
    let fires = [];
    for (const tr of sc.triggers) {
      if (!T.ready(tr) || tr.on === 'click' || !whoOk(tr, t) || (opts && opts.portalsOnly && !tr.portal)) continue;
      const c = crossing(sc, tr, pts), ev = tr.on === 'leave' ? c.leave : c.enter;
      if (ev) fires.push({ tr, ev });
    }
    if (!fires.length) return null;
    fires.sort((x, y) => x.ev.d - y.ev.d);
    // Parar o movimento: o token fica no primeiro quadrado da área da primeira armadilha que pede isso
    const stop = fires.find((f) => f.tr.stop && f.tr.on === 'enter');
    if (stop) {
      const p = stop.ev.p;
      let x = Math.round((p.x - s) / g) * g, y = Math.round((p.y - s) / g) * g;
      if (!T.inside(sc, stop.tr, { x: x + s, y: y + s })) { x = Math.floor((p.x - s + g / 2) / g) * g; y = Math.floor((p.y - s + g / 2) / g) * g; }
      a.x = x; a.y = y;
      a.path = corners.slice(0, stop.ev.seg).concat([[x, y]]);
      a.stopped = true;
      fires = fires.filter((f) => f.ev.d <= stop.ev.d);
    }
    return fires.map((f) => ({ sceneId: sc.id, trId: f.tr.id, tokenId: t.id }));
  };
  // Depois do movimento aplicado: dispara (ou pergunta ao mestre)
  T.afterMove = function (fires) {
    for (const f of fires || []) T.request(f.sceneId, f.trId, f.tokenId, 'move');
  };
  // Clique numa imagem ligada (jogador, ou o mestre vendo como jogador)
  T.click = function (a, pid) {
    const st = S().state, sc = st && st.scenes[a.sceneId];
    if (!sc) return false;
    const tr = (sc.triggers || []).find((x) => x.id === a.id);
    const prop = tr && (sc.props || []).find((p) => p.id === tr.propId);
    const t = sc.tokens[a.tokenId];
    if (!tr || tr.on !== 'click' || !prop || prop.hidden || !t) return false;
    if (pid && !S().canControl(t, pid)) return false;
    if (!T.ready(tr)) return false;
    if (!whoOk(tr, t)) return false;
    T.request(sc.id, tr.id, t.id, 'click');
    return true;
  };
  // Dispara agora ou pergunta ao mestre, conforme o gatilho
  T.queue = [];
  T.request = function (sceneId, trId, tokenId, why) {
    const sc = S().state.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    if (!tr) return;
    if (tr.ask) {
      if (T.queue.some((q) => q.trId === trId && q.tokenId === tokenId)) return;
      T.queue.push({ sceneId, trId, tokenId, why, at: Date.now() });
      if (App.UI && App.UI.renderTriggerAsk) App.UI.renderTriggerAsk();
      return;
    }
    T.fire(sceneId, trId, tokenId);
  };
  T.answer = function (i, yes) {
    const q = T.queue.splice(i, 1)[0];
    if (q && yes) T.fire(q.sceneId, q.trId, q.tokenId, { force: true });
    if (App.UI && App.UI.renderTriggerAsk) App.UI.renderTriggerAsk();
  };

  // ---------- execução ----------
  /*
   * Dispara: conta o uso, avisa só o mestre e roda as ações em ordem (cada atraso conta a partir da ação anterior).
   * opts.manual = botão do mestre (não precisa estar pronto); opts.depth evita gatilho disparando gatilho sem fim.
   */
  T.fire = function (sceneId, trId, tokenId, opts = {}) {
    const st = S().state, sc = st.scenes[sceneId], tr = sc && (sc.triggers || []).find((x) => x.id === trId);
    if (!tr || !S().isGM()) return false;
    if (!opts.manual && !opts.force && !T.ready(tr)) return false;
    if ((opts.depth || 0) > 5) return false;
    D({ type: 'trigger.update', sceneId, id: trId, patch: { used: (tr.used || 0) + 1, lastAt: Date.now() } });
    const tok = tokenId && sc.tokens[tokenId];
    const who = tok ? tok.name : opts.manual ? 'você' : '';
    // Portal: sem aviso no chat a cada passagem (o trem passaria o tempo todo); quem muda de cena avisa no teleport()
    if (tr.portal) {
      for (const act of tr.actions || []) { try { runAction(sceneId, tr, act, tokenId, opts); } catch (e) { console.warn('portal', e); } }
      return true;
    }
    D({ type: 'chat.add', msg: { id: U.uid('m_'), ts: Date.now(), kind: 'system', secret: true, playerId: S().me.id,
      text: `Gatilho "${tr.name}" disparou` + (who ? ` (${who})` : '') + '.' } });
    if (!opts.quiet) U.toast(`Gatilho "${tr.name}" disparou` + (tok ? ' por ' + tok.name : ''), 'info', 3500);
    let wait = 0;
    for (const act of tr.actions || []) {
      wait += Math.max(0, Number(act.delay) || 0) * 1000;
      const run = () => { try { runAction(sceneId, tr, act, tokenId, opts); } catch (e) { console.warn('gatilho', e); } };
      if (wait > 0) setTimeout(run, wait); else run();
    }
    return true;
  };

  // Tokens que o gatilho atinge: quem disparou; no botão do mestre, os que estão dentro da área (e passam no "quem")
  function victims(sc, tr, tokenId) {
    if (tokenId && sc.tokens[tokenId]) return [tokenId];
    return Object.values(sc.tokens).filter((t) => whoOk(tr, t) && T.inside(sc, tr, App.Light.center(sc, t))).map((t) => t.id);
  }

  function runAction(sceneId, tr, act, tokenId, opts) {
    const st = S().state, sc = st.scenes[sceneId];
    if (!sc) return;
    switch (act.type) {
      case 'door': {
        for (const { obj: w } of T.targets(sc, act)) {
          if (act.op === 'open') D({ type: 'wall.door', sceneId, id: w.id, open: true });
          else if (act.op === 'close') D({ type: 'wall.door', sceneId, id: w.id, open: false });
          else if (act.op === 'lock') D({ type: 'wall.lock', sceneId, id: w.id, locked: true });
          else if (act.op === 'unlock') D({ type: 'wall.lock', sceneId, id: w.id, locked: false });
          else D({ type: 'wall.door', sceneId, id: w.id, open: !w.open });
        }
        return;
      }
      case 'light': {
        for (const { obj: o } of T.targets(sc, act)) {
          const on = act.op === 'on' ? true : act.op === 'off' ? false : o.on === false;
          D({ type: 'lightpt.update', sceneId, id: o.id, patch: { on } });
        }
        return;
      }
      case 'token': {
        const vis = act.op === 'hide' ? 'hidden' : act.op === 'mask' ? 'masked' : 'show';
        const done = new Set();
        for (const ref of act.ids || []) {
          const tg = String(ref);
          if (tg.startsWith('g:')) {
            if (!(sc.groups || []).some((x) => x.id === tg.slice(2))) continue;
            D({ type: 'group.vis', sceneId, id: tg.slice(2), vis });
            for (const t of Object.values(sc.tokens)) if (t.group === tg.slice(2)) done.add(t.id);
            continue;
          }
          const t = sc.tokens[tg.replace(/^t:/, '')];
          if (t && !done.has(t.id)) { done.add(t.id); D({ type: 'token.update', sceneId, id: t.id, patch: { hidden: vis === 'hidden', masked: vis === 'masked' } }); }
        }
        return;
      }
      case 'anim': {
        const keys = T.targets(sc, act).filter((x) => ['prop', 'light', 'token'].includes(x.kind)).map((x) => x.key);
        if (!keys.length) return;
        if (act.op === 'stop' || act.op === 'reset') App.Anim.stop(sceneId, keys, act.op);
        else App.Anim.play(sceneId, keys, act.op === 'play' && act.spec ? [act.spec] : null);
        return;
      }
      case 'sound': {
        const A = App.Audio;
        if (act.op === 'sfx' && act.name) A.playSfx(act.name, { stopAfter: act.stopAfter });
        else if (act.op === 'sfx-stop') A.stopFx({ name: act.name || null });
        else if (act.op === 'all-stop') A.stopAll();
        else if ((act.op === 'music' || act.op === 'ambient') && act.name) A.play(act.op, act.name);
        else if (act.op === 'music-stop') A.stop('music');
        else if (act.op === 'ambient-stop') A.stop('ambient');
        else {
          for (const { obj: snd } of T.targets(sc, act)) {
            if (act.op === 'spot-fire') A.trigger(snd);
            else {
              D({ type: 'sound.update', sceneId, id: snd.id, patch: act.op === 'spot-on' ? { on: true, at: Date.now() } : { on: false } });
              // Desligar também interrompe o som de uma vez que está tocando daquele ponto (Plano 27)
              if (act.op === 'spot-off') A.stopFx({ spotId: snd.id });
            }
          }
        }
        return;
      }
      case 'trap': {
        const targets = victims(sc, tr, tokenId);
        if (!targets.length) return;
        const save = String(act.save || '').trim();
        const trap = { name: tr.name, mode: save ? 'save' : 'damage', save, dc: String(act.dc || 10), damage: act.damage || '0', bar: act.bar || '', onSave: act.onSave === 'none' ? 'none' : 'half' };
        S().useAction({ sceneId, trap, targets }, null);
        return;
      }
      case 'fog': {
        const b = T.bbox(sc, tr);
        D({ type: 'fog.add', sceneId, shape: { mode: act.op === 'hide' ? 'hide' : 'reveal', x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) } });
        return;
      }
      case 'teleport': {
        const taken = new Set();
        for (const id of victims(sc, tr, tokenId)) teleport(sc, sc.tokens[id], act, tr, taken);
        return;
      }
      case 'trigger': {
        for (const { obj: other } of T.targets(sc, act)) {
        if (other.id === tr.id && act.op === 'fire') continue;
        if (act.op === 'enable') D({ type: 'trigger.update', sceneId, id: other.id, patch: { enabled: true } });
        else if (act.op === 'disable') D({ type: 'trigger.update', sceneId, id: other.id, patch: { enabled: false } });
        else if (act.op === 'rearm') D({ type: 'trigger.update', sceneId, id: other.id, patch: { used: 0, lastAt: 0 } });
        else if (act.op === 'fire') T.fire(sceneId, other.id, tokenId, { manual: true, quiet: true, depth: (opts.depth || 0) + 1 });
        }
      }
    }
  }

  // Quadrado livre mais perto do destino (vários tokens passando juntos não caem um em cima do outro)
  function freeSpot(dest, t, cx, cy, taken, skipId) {
    const g = dest.grid, n = t.size || 1, s = (n * g) / 2;
    const bx = Math.round((cx - s) / g), by = Math.round((cy - s) / g);
    const busy = new Set(taken);
    for (const o of Object.values(dest.tokens)) {
      if (o.id === skipId) continue;
      const on = o.size || 1, ox = Math.round(o.x / g), oy = Math.round(o.y / g);
      for (let i = 0; i < on; i++) for (let j = 0; j < on; j++) busy.add((ox + i) + ',' + (oy + j));
    }
    const fits = (x, y) => {
      if (x < 0 || y < 0 || x + n > dest.cols || y + n > dest.rows) return false;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (busy.has((x + i) + ',' + (y + j))) return false;
      return true;
    };
    let best = null;
    for (let r = 0; r <= 6 && !best; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !fits(bx + dx, by + dy)) continue;
        const d = Math.hypot(dx, dy);
        if (!best || d < best.d) best = { x: bx + dx, y: by + dy, d };
      }
    }
    const c = best || { x: bx, y: by };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) taken.add((c.x + i) + ',' + (c.y + j));
    return { x: c.x * g, y: c.y * g };
  }
  T.freeSpot = freeSpot;

  // Leva o token para um ponto deste mapa ou para outra cena (com quem controla o token)
  function teleport(sc, t, act, tr, taken) {
    if (!t) return;
    const st = S().state, d = T.portalDest(sc, null, act);
    if (!d) return;
    const dest = d.scene;
    const pos = freeSpot(dest, t, d.x, d.y, taken || new Set(), dest === sc ? t.id : null);
    // warp: cada tela mostra o brilho na saída e na chegada; a câmera de quem controla vai junto
    if (dest === sc) { D({ type: 'token.move', sceneId: sc.id, id: t.id, x: pos.x, y: pos.y, fromTrigger: true, warp: true, fx: !(tr && tr.fx === false), at: Date.now() }); return; }
    // Outra cena: o token passa para lá e quem o controla vai junto (o resto do grupo fica onde está)
    const nt = Object.assign(U.clone(t), { id: U.uid('t_'), x: pos.x, y: pos.y, lastMove: null, warp: { at: Date.now(), fx: !(tr && tr.fx === false) } });
    D({ type: 'token.add', sceneId: dest.id, token: nt });
    D({ type: 'token.delete', sceneId: sc.id, id: t.id });
    const owners = Object.keys(st.players || {}).filter((pid) => S().canControl(nt, pid));
    if (owners.length) {
      const there = Object.keys(st.players).filter((pid) => S().sceneIdOf(pid) === dest.id);
      D({ type: 'scene.movePlayers', id: dest.id, players: [...new Set(there.concat(owners))] });
    }
    const cur = S().currentScene();
    if (tr && tr.portal && cur && cur.id !== dest.id) {
      U.toast(t.name + ' foi para "' + dest.name + '"', 'info', 6000, { label: 'Ir para lá', run: () => { S().viewSceneId = dest.id; S().emit('local'); } });
    }
  }

  App.Triggers = T;
})(window.App);
