// Plano 16 · Escolher no mapa: o gatilho reconhece o objeto clicado e cria a ação certa (com o contrário do estado atual)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: true } } });
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'porta', x1: 12 * g, y1: 2 * g, x2: 12 * g, y2: 3 * g, door: true, open: false }] });
    const lamp = B.addLight(sc(), { name: 'Lustre', x: 3.5 * g, y: 1.5 * g }); B.selectedLight = null;
    S.dispatch({ type: 'sound.add', sceneId: sid, sound: { id: 'snd1', name: 'Efeitos/rio.mp3', x: 14.5 * g, y: 8.5 * g, r: 4, vol: 1, on: true } });
    const gob = Object.values(sc().tokens).find((t) => !/lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sid, id: gob.id, x: 8 * g, y: 7 * g, fromTrigger: true });
    S.dispatch({ type: 'token.update', sceneId: sid, id: gob.id, patch: { hidden: true } });
    const other = TG.newTrigger(sc(), { name: 'Armadilha escondida', shape: 'circle', x: 5.5 * g, y: 8.5 * g, r: 0.5, enabled: false });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: other });
    const main = TG.newTrigger(sc(), { name: 'Emboscada', shape: 'rect', pts: [[6 * g, 3 * g], [8 * g, 3 * g], [8 * g, 5 * g], [6 * g, 5 * g]], x: 7 * g, y: 4 * g });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: main });
    const tr = () => sc().triggers.find((x) => x.id === main.id);
    if (UI.mode !== 'edit') UI.setMode('edit');
    B.setTool('trigger'); await W(200);
    UI.openTrigger(sid, main.id); await W(300);
    const win = () => document.querySelector('.win.trig-win');
    const rect = () => B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y), r = rect(); return { clientX: r.left + p.x, clientY: r.top + p.y }; };
    const click = (x, y) => { const o = Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y)); B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); };
    const btn = (txt) => [...win().querySelectorAll('button')].find((b) => b.textContent.includes(txt));

    log.push('botões da coluna ENTÃO: ' + [...win().querySelectorAll('.ta-add button')].map((b) => b.textContent).join(' | '));
    btn('Escolher no mapa').click(); await W(150);
    log.push(`escolhendo: janela escondida = ${win().style.display === 'none'} · faixa = ${(document.querySelector('#pick-bar') || {}).textContent}`);
    click(3.5 * g, 1.5 * g); await W(80);   // luz acesa
    click(12 * g, 2.5 * g); await W(80);    // porta fechada
    click(8.5 * g, 7.5 * g); await W(80);   // goblin invisível
    click(14.5 * g, 8.5 * g); await W(80);  // som do mapa ligado
    click(5.5 * g, 8.5 * g); await W(80);   // outro gatilho desligado
    const nBefore = tr().actions.length;
    click(1.5 * g, 6.5 * g); await W(80);   // vazio: avisa e continua
    log.push(`clique no vazio: ações continuam ${tr().actions.length} (era ${nBefore}) · ainda escolhendo = ${!!B.picking}`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(250);
    log.push(`Esc concluiu: janela de volta = ${win().style.display !== 'none'} · faixa sumiu = ${!document.querySelector('#pick-bar')} · escolhendo = ${!!B.picking}`);
    log.push('ações criadas: ' + tr().actions.map((a) => { const s = TG.summary(sc(), a); return s.target + ' · ' + s.op; }).join(' | '));
    log.push('cartões na janela: ' + win().querySelectorAll('.ta-card').length);

    // cartão de porta + "No mapa" numa luz: vira ação de luz
    const doorIdx = tr().actions.findIndex((a) => a.type === 'door');
    UI.trigEdit = tr().actions[doorIdx].id; const w = UI.windows.get('trigger:' + main.id); w._sig = null; UI.refresh(); await W(200);
    [...win().querySelectorAll('.ta-card.open button')].find((b) => /No mapa/.test(b.textContent)).click(); await W(100);
    click(3.5 * g, 1.5 * g); await W(250);
    const conv = tr().actions[doorIdx];
    log.push(`cartão de porta + clique na luz: virou ${conv.type} (${(conv.ids || [])[0] === lamp.id ? 'Lustre' : '?'}) · mesmo id = ${conv.id === UI.trigEdit} · janela de volta = ${win().style.display !== 'none'}`);
    // Concluir pela faixa
    btn('Escolher no mapa').click(); await W(120);
    click(12 * g, 2.5 * g); await W(80);
    document.querySelector('#pick-bar button').click(); await W(200);
    log.push(`Concluir pela faixa: ${tr().actions.length} ações · escolhendo = ${!!B.picking} · janela de volta = ${win().style.display !== 'none'}`);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
