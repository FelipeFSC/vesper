// Plano 15 · Gatilhos mais fáceis: janela de configurar, cartões, arrastar para reordenar, Escolher no mapa,
// Testar (simulação: nada muda), lista na ferramenta e barras laterais recolhidas.
// Com '#shot' + -shot: foto da janela aberta com uma ação em edição e a barra da esquerda recolhida.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    try { localStorage.removeItem('vesper.paineis'); } catch { /* */ }
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: true } } });
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'porta', x1: 10 * g, y1: 4 * g, x2: 10 * g, y2: 5 * g, door: true, open: true }] });
    const lamp = B.addLight(sc(), { name: 'Tocha da entrada', x: 8.5 * g, y: 2.5 * g });
    B.selectedLight = null;
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gobs = toks.filter((t) => t.id !== hero.id);
    S.dispatch({ type: 'group.add', sceneId: sid, group: { id: 'emb', name: 'Emboscada' }, tokens: gobs.map((t) => t.id) });
    if (UI.mode !== 'edit') UI.setMode('edit');
    B.setTool('trigger'); await W(200);
    const tr0 = TG.newTrigger(sc(), { name: 'Porta de entrada', shape: 'rect', pts: [[6 * g, 3 * g], [8 * g, 3 * g], [8 * g, 6 * g], [6 * g, 6 * g]], x: 7 * g, y: 4.5 * g });
    S.dispatch({ type: 'trigger.add', sceneId: sid, trigger: tr0 });
    const tr = () => sc().triggers.find((x) => x.id === tr0.id);
    await W(150);
    const rect = () => B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y), r = rect(); return { clientX: r.left + p.x, clientY: r.top + p.y }; };
    const click = (x, y) => { const o = Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y)); B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); };
    const win = () => document.querySelector('.win.trig-win');
    const q = (sel, txt) => [...win().querySelectorAll(sel)].find((e) => !txt || e.textContent.includes(txt));

    // 1) clicar no marcador abre a janela
    click(7 * g, 4.5 * g); await W(300);
    log.push(`clicar no marcador abre a janela: ${!!win()} · colunas: ${[...win().querySelectorAll('.tw-h')].map((e) => e.textContent).join(' | ')}`);
    log.push('painel da direita (resumo): ' + (document.querySelector('#token-hud .trig-sentence') || {}).textContent);

    // 2) adicionar ações pela lista com ícones
    const addType = async (label) => { q('button', 'Adicionar ação').click(); await W(150); q('.ta-type', label).click(); await W(200); };
    await addType('Porta'); await addType('Luz'); await addType('Token ou grupo');
    log.push(`3 ações: ${tr().actions.map((a) => a.type).join(',')} · cartões: ${win().querySelectorAll('.ta-card').length} · aberto (último): ${win().querySelectorAll('.ta-card.open').length}`);
    log.push('cartões sem alvo avisam: ' + [...win().querySelectorAll('.ta-card')].map((c) => c.classList.contains('missing')).join(','));

    // 3) Escolher no mapa: a janela some e volta
    const sel = win().querySelector('.ta-card.open select'); // a ação recém-adicionada já abre para editar
    sel.value = 'g:emb'; sel.dispatchEvent(new Event('change')); await W(200);
    q('.ta-card .ta-row', 'Porta').click(); await W(200);
    q('.ta-card.open button', 'No mapa').click(); await W(100);
    const hidden = win().style.display === 'none';
    click(10 * g, 4.5 * g); await W(300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(200);
    log.push(`Escolher no mapa: janela sumiu = ${hidden} · voltou = ${win().style.display !== 'none'} · porta = ${(tr().actions[0].ids || [])[0]}`);
    q('.ta-card .ta-row', 'Luz').click(); await W(200);
    const ls = win().querySelector('.ta-card.open select');
    ls.value = lamp.id; ls.dispatchEvent(new Event('change')); await W(200);
    const dl = win().querySelector('.ta-card.open .ta-delay input');
    dl.value = '0.5'; dl.dispatchEvent(new Event('change')); await W(200);
    log.push('resumos: ' + [...win().querySelectorAll('.ta-sum')].map((e) => e.textContent).join(' | '));

    // 4) arrastar para reordenar: o 3º (grupo) vira o 1º
    const cards = () => [...win().querySelectorAll('.ta-card')];
    const dt = new DataTransfer();
    cards()[2].querySelector('.ta-grip').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    cards()[2].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    cards()[0].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    cards()[0].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    await W(250);
    log.push(`arrastou o 3º para cima: ordem = ${tr().actions.map((a) => a.type).join(',')}`);

    // 5) Testar = simular: nada muda de verdade, os alvos piscam no tempo certo
    const before = JSON.stringify([sc().walls, sc().lights, Object.values(sc().tokens).map((t) => [t.hidden, t.masked]), tr().used]);
    q('.tw-foot button', 'Testar gatilho').click();
    await W(700);
    const f1 = B.flashes.map((f) => f.label);
    await W(700);
    const f2 = B.flashes.map((f) => f.label);
    log.push(`testar (0,7 s): ${f1.join(' / ')}`);
    log.push(`testar (1,4 s): ${f2.join(' / ')}`);
    log.push(`nada mudou de verdade: ${before === JSON.stringify([sc().walls, sc().lights, Object.values(sc().tokens).map((t) => [t.hidden, t.masked]), tr().used])}`);

    // 6) menu da ferramenta: só a forma da área (a lista de gatilhos saiu a pedido do usuário)
    UI.refresh(); await W(200);
    log.push(`menu da ferramenta: formas = ${[...document.querySelectorAll('#tool-opts .seg button')].map((b) => b.textContent).join(' | ')} · lista de gatilhos = ${document.querySelectorAll('#tool-opts .trig-row').length}`);

    // 7) barras recolhidas
    const w0 = B.w;
    document.querySelector('#left-tabs .side-min').click(); await W(300);
    const w1 = B.w;
    log.push(`recolheu a esquerda: faixa com ${document.querySelectorAll('#left-tabs .rail-btn').length} ícones · mapa ${Math.round(w0)} → ${Math.round(w1)} px · lembrou = ${(localStorage.getItem('vesper.paineis') || '').includes('"left":true')}`);
    document.querySelector('#right-tabs .side-min').click(); await W(300);
    B.selected = hero.id; B.selectedTrigger = null; UI.refresh(); B.requestRender(); await W(300);
    const hud = document.querySelector('#token-hud');
    log.push(`recolheu a direita: mapa ${Math.round(B.w)} px · painel do token flutua = ${hud.classList.contains('floating') && hud.parentElement.id === 'board-wrap'} · visível = ${!hud.hidden}`);
    document.querySelector('#right-tabs .rail-btn').click(); await W(300);
    log.push(`abriu a direita de novo: painel no lugar = ${document.querySelector('#token-hud').parentElement.id === 'props-slot'}`);
    if (location.hash === '#shot') {
      UI.openTrigger(sid, tr0.id); UI.trigEdit = tr().actions[1].id; const w = UI.windows.get('trigger:' + tr0.id); w._sig = null; UI.refresh();
      B.requestRender();
    } else {
      document.querySelector('#left-tabs .rail-btn').click(); await W(200);
      log.push(`abriu a esquerda de novo: lembrou = ${(localStorage.getItem('vesper.paineis') || '').includes('"left":false')}`);
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
