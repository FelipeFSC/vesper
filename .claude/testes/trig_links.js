// Plano 16 · foto: ligações numeradas do gatilho aos alvos, com a ação aberta destacada (usar com -shot)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: false } } });
    const pos = [[9.5, 1.5], [13.5, 2.5], [14.5, 6.5], [11.5, 8.5], [6.5, 8.5]];
    const lights = pos.map(([x, y]) => B.addLight(sc(), { name: 'Luz', x: x * g, y: y * g, bright: 1, dim: 2 }));
    B.selectedLight = null;
    const gob = Object.values(sc().tokens).find((t) => !/lyra/i.test(t.name));
    const tr = TG.newTrigger(sc(), { name: 'Gatilho 1', shape: 'rect', pts: [[2 * g, 4 * g], [3 * g, 4 * g], [3 * g, 6 * g], [2 * g, 6 * g]], x: 2.5 * g, y: 5 * g,
      actions: lights.map((o) => Object.assign(TG.newAction('light'), { lightId: o.id, op: 'toggle' })).concat([Object.assign(TG.newAction('token'), { target: 't:' + gob.id, op: 'show' }), Object.assign(TG.newAction('light'), { lightId: lights[2].id, op: 'on', delay: 2 })]) });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: tr });
    if (UI.mode !== 'edit') UI.setMode('edit');
    B.setTool('trigger');
    UI.openTrigger(sid, tr.id);
    UI.trigEdit = tr.actions[2].id;
    const w = UI.windows.get('trigger:' + tr.id); w._sig = null;
    w.el.style.left = '60px'; w.el.style.top = '60px'; w.el.style.width = '420px';
    UI.refresh(); B.fit(); B.requestRender();
    await W(300);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
