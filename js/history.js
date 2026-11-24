'use strict';
/*
 * Desfazer e refazer (Plano 17): só o mestre, só a montagem do mapa (e tokens que ele mexe).
 * Antes de cada ação de montagem, guarda uma cópia do que ela mexe (paredes, imagens, tokens…); depois compara
 * e registra só o que mudou, campo por campo. Desfazer manda a ação 'undo.apply' com os valores antigos — assim
 * o que os jogadores mexeram nesse meio tempo (outro campo, outro objeto) não é atropelado.
 * Não entram: chat, dados, combate, PV, som, ações dos jogadores, o que um gatilho faz (a.noUndo / a.fromTrigger).
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;
  const H = { undo: [], redo: [], group: null, MAX: 100 };

  // Que partes da cena cada ação mexe
  const KEYS = (type) => {
    const p = type.split('.')[0];
    if (p === 'wall') return ['walls'];
    // Plano 68: apagar o objeto apaga o som dele (o desfazer devolve os dois)
    if (p === 'prop') return type === 'prop.delete' ? ['props', 'sounds'] : ['props'];
    if (p === 'lightpt') return type === 'lightpt.delete' ? ['lights', 'sounds'] : ['lights'];
    if (p === 'trigger' && type !== 'trigger.click') return ['triggers'];
    if (p === 'sound') return ['sounds'];
    if (p === 'room') return ['rooms'];
    if (p === 'drawing') return ['drawings'];
    if (p === 'fog') return ['fog'];
    if (p === 'note') return ['notes'];
    if (p === 'group') return ['groups', 'tokens'];
    if (p === 'token') return type === 'token.delete' ? ['tokens', 'sounds'] : ['tokens'];
    if (type === 'order.move') return ['tokens', 'props'];
    if (type === 'batch') return ['walls', 'props', 'lights', 'triggers', 'sounds', 'rooms', 'drawings', 'notes', 'tokens'];
    return null;
  };
  const LABEL = { walls: 'paredes', props: 'imagens', lights: 'luzes', triggers: 'gatilhos', sounds: 'sons', rooms: 'isolamentos de som', drawings: 'desenhos', fog: 'névoa', notes: 'notas', groups: 'grupos', tokens: 'tokens' };
  const VERB = { add: 'criar', delete: 'apagar', update: 'mudar', move: 'mover', clear: 'limpar', door: 'porta', lock: 'trancar', vis: 'visibilidade' };
  function labelOf(a) {
    if (a.label) return a.label;
    const [p, v] = String(a.type).split('.');
    const isPortal = p === 'trigger' && ((a.trigger && a.trigger.portal) || (() => { const sc = S().state && S().state.scenes[a.sceneId]; const t = sc && (sc.triggers || []).find((x) => x.id === a.id); return !!(t && t.portal); })());
    const what = { wall: 'parede', prop: 'imagem', lightpt: 'luz', trigger: isPortal ? 'portal' : 'gatilho', sound: 'som', room: 'isolamento de som', drawing: 'desenho', fog: 'névoa', note: 'nota', group: 'grupo', token: 'token', order: 'nível' }[p] || p;
    return (VERB[v] ? VERB[v] + ' ' : '') + what;
  }

  H.wants = function (a) {
    const st = S();
    return !!(st.state && st.isGM() && a && a.by === st.me.id && !a.noUndo && !a.fromTrigger && a.sceneId && st.state.scenes[a.sceneId] && KEYS(a.type));
  };
  // Cópia do que a ação vai mexer
  H.before = function (state, a) {
    const sc = state.scenes[a.sceneId], snap = {};
    for (const k of KEYS(a.type)) snap[k] = U.clone(k === 'tokens' ? sc.tokens || {} : sc[k] == null ? (k === 'fog' ? null : []) : sc[k]);
    return { sceneId: a.sceneId, snap };
  };
  // Compara antes × depois e guarda só o que mudou
  H.after = function (state, a, rec) {
    const sc = state.scenes[rec.sceneId];
    if (!sc) return;
    const items = [];
    for (const [k, before] of Object.entries(rec.snap)) {
      const now = k === 'tokens' ? sc.tokens || {} : sc[k];
      if (k === 'fog') { if (JSON.stringify(before) !== JSON.stringify(now)) items.push({ key: k, whole: [before, U.clone(now)] }); continue; }
      const bm = toMap(before), am = toMap(now);
      for (const id of new Set([...bm.keys(), ...am.keys()])) {
        const b = bm.get(id), n = am.get(id);
        if (!b) items.push({ key: k, id, before: null, after: U.clone(n) });
        else if (!n) items.push({ key: k, id, before: b, after: null, index: Array.isArray(before) ? before.findIndex((x) => x && x.id === id) : -1 });
        else if (JSON.stringify(b) !== JSON.stringify(n)) {
          const keys = {};
          for (const f of new Set([...Object.keys(b), ...Object.keys(n)])) {
            if (JSON.stringify(b[f]) !== JSON.stringify(n[f])) keys[f] = [b[f] === undefined ? null : b[f], n[f] === undefined ? null : U.clone(n[f])];
          }
          items.push({ key: k, id, keys });
        }
      }
    }
    if (!items.length) return;
    const step = { sceneId: rec.sceneId, items, label: labelOf(a) };
    if (H.group) { H.group.steps.push(step); return; }
    push(step);
  };
  function toMap(coll) {
    const m = new Map();
    if (Array.isArray(coll)) { for (const x of coll) if (x && x.id != null) m.set(x.id, x); }
    else if (coll) for (const [id, x] of Object.entries(coll)) m.set(id, x);
    return m;
  }
  function push(step) {
    H.undo.push(step);
    if (H.undo.length > H.MAX) H.undo.shift();
    H.redo = [];
    changed();
  }
  // Várias ações viram um passo só (mover uma seleção, colar, duplicar…)
  H.batch = function (label, fn) {
    if (H.group) return fn();
    H.group = { steps: [], label };
    try { return fn(); } finally {
      const g = H.group;
      H.group = null;
      const bySc = new Map();
      for (const s of g.steps) { const t = bySc.get(s.sceneId) || { sceneId: s.sceneId, items: [], label: g.label || s.label }; t.items.push(...s.items); bySc.set(s.sceneId, t); }
      for (const t of bySc.values()) if (t.items.length) push(t);
    }
  };

  // Monta as operações para voltar (undo) ou ir de novo (redo)
  function ops(step, dir) {
    const out = [], items = dir === 'undo' ? step.items.slice().reverse() : step.items;
    for (const it of items) {
      if (it.key === 'fog') { out.push({ key: 'fog', whole: it.whole[dir === 'undo' ? 0 : 1] }); continue; }
      if (it.keys) { const keys = {}; for (const [f, [b, a]] of Object.entries(it.keys)) keys[f] = dir === 'undo' ? b : a; out.push({ key: it.key, id: it.id, keys }); continue; }
      const val = dir === 'undo' ? it.before : it.after;
      out.push({ key: it.key, id: it.id, set: val, index: it.index });
    }
    return out;
  }
  function apply(dir) {
    const from = dir === 'undo' ? H.undo : H.redo, to = dir === 'undo' ? H.redo : H.undo;
    const step = from.pop();
    if (!step) { U.toast(dir === 'undo' ? 'Nada para desfazer.' : 'Nada para refazer.'); return false; }
    if (!S().state.scenes[step.sceneId]) { changed(); return apply(dir); }
    S().dispatch({ type: 'undo.apply', sceneId: step.sceneId, ops: ops(step, dir), noUndo: true });
    to.push(step);
    const other = S().currentScene() && S().currentScene().id !== step.sceneId ? ' (na cena "' + S().state.scenes[step.sceneId].name + '")' : '';
    U.toast((dir === 'undo' ? 'Desfeito: ' : 'Refeito: ') + step.label + other, 'info', 2200);
    changed();
    return true;
  }
  H.undoLast = () => apply('undo');
  H.redoLast = () => apply('redo');
  H.clear = () => { H.undo = []; H.redo = []; changed(); };
  function changed() { if (App.UI && App.UI.renderUndo) App.UI.renderUndo(); }
  H.LABEL = LABEL;

  App.History = H;
})(window.App);
