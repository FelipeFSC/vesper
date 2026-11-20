// Plano 18 · Notas do mestre: criar, editar, mover, abrir, buscar, duplicar, apagar, desfazer, laço, e não chegar aos jogadores
// Com '#shot' + -shot: foto com notas, uma aberta e outra com o mouse em cima.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, N = App.Net, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.setTool('note'); await W(200);
    log.push('opções: ' + [...document.querySelectorAll('#tool-opts .to-row')].map((b) => b.textContent).join(' | '));
    const rect = () => B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y), r = rect(); return { clientX: r.left + p.x, clientY: r.top + p.y }; };
    const ptr = (type, x, y, extra = {}) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y), extra)));
    const click = (x, y) => { ptr('pointerdown', x, y); ptr('pointerup', x, y); };
    // 1) criar com a ferramenta
    [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /Tesouro/.test(b.textContent)).click(); await W(100);
    click(5.3 * g, 4.6 * g); await W(300);
    const n1 = sc().notes[0];
    const win = () => document.querySelector('.win.note-win');
    log.push(`nota criada: "${n1.title}" cor ${n1.color} em (${n1.x / g}, ${n1.y / g}) · janela aberta = ${!!win()} · título em foco = ${document.activeElement && document.activeElement.classList.contains('note-title')}`);
    const ti = win().querySelector('.note-title'), tx = win().querySelector('.note-text');
    ti.value = 'Sala 3'; ti.dispatchEvent(new Event('change'));
    tx.value = 'Baú com 50 po.\nArmadilha de agulha: CD 15 para achar.'; tx.dispatchEvent(new Event('change')); await W(200);
    log.push(`editada: "${sc().notes[0].title}" · texto ${sc().notes[0].text.length} letras`);
    App.UI.closeWindow('note:' + n1.id);
    // 2) mais duas notas; mouse em cima mostra o texto
    B.addNote(sc(), { x: 11.5 * g, y: 2.5 * g }); App.UI.closeWindow('note:' + sc().notes[1].id);
    S.dispatch({ type: 'note.update', sceneId: sid, id: sc().notes[1].id, patch: { title: 'Capitão Rurik', text: 'Sabe onde fica a cripta. Mente sobre o irmão.', color: 'blue' } });
    B.addNote(sc(), { x: 2.5 * g, y: 8.5 * g }); App.UI.closeWindow('note:' + sc().notes[2].id);
    S.dispatch({ type: 'note.update', sceneId: sid, id: sc().notes[2].id, patch: { title: 'Fosso', text: '3 m de profundidade, 2d6.', color: 'red' } });
    B.setTool('select'); await W(150);
    window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, pointerId: 1 }, scr(11.5 * g, 2.5 * g - 16 / B.cam.z))));
    B.canvas.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, pointerId: 1 }, scr(11.5 * g, 2.5 * g - 16 / B.cam.z))));
    log.push(`mouse em cima do alfinete do capitão: mostra o texto = ${B.hoverNote === sc().notes[1].id}`);
    // 3) arrastar move; clique abre
    const a = Object.assign({}, sc().notes[0]);
    ptr('pointerdown', a.x, a.y - 16 / B.cam.z); ptr('pointermove', a.x + 2 * g, a.y - 16 / B.cam.z); ptr('pointerup', a.x + 2 * g, a.y - 16 / B.cam.z);
    log.push(`arrastou a Sala 3: x ${a.x / g} → ${sc().notes[0].x / g} · janela não abriu = ${!win()}`);
    click(sc().notes[0].x, sc().notes[0].y - 16 / B.cam.z); await W(250);
    log.push(`clique abre a nota: ${!!win()} · painel: ${(document.querySelector('#token-hud .hud-name') || {}).textContent}`);
    App.UI.closeWindow('note:' + sc().notes[0].id);
    // 4) lista com busca
    B.setTool('note'); await W(200);
    [...document.querySelectorAll('#tool-opts .to-row')].find((b) => /Notas desta cena/.test(b.textContent)).click(); await W(50);
    const search = document.querySelector('#tool-sub input[type=search]');
    search.value = 'cripta'; search.dispatchEvent(new Event('input'));
    log.push(`busca "cripta": ${[...document.querySelectorAll('#tool-sub .note-item b')].map((b) => b.textContent).join(', ')} · total ${sc().notes.length}`);
    // 5) duplicar, apagar, desfazer
    B.selectedNote = sc().notes[2].id;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
    const nd = sc().notes.length;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    log.push(`Ctrl+D → ${nd} notas · Delete → ${nd - 1} · Ctrl+Z → ${sc().notes.length}`);
    // 6) laço pega notas
    B.setTool('select'); B.selectedNote = null; await W(100);
    ptr('pointerdown', 0.2 * g, 0.2 * g, { shiftKey: true }); ptr('pointermove', 15.8 * g, 9.8 * g, { shiftKey: true }); ptr('pointerup', 15.8 * g, 9.8 * g, { shiftKey: true });
    log.push(`laço no mapa todo: ${[...B.multi].filter((k) => k.startsWith('note:')).length} notas selecionadas`);
    B.multi.clear();
    // 7) não chega aos jogadores
    const ps = N.playerState();
    log.push(`estado mandado aos jogadores: ${ps.scenes[sid].notes.length} notas (mestre tem ${sc().notes.length}) · o estado do mestre continua igual = ${S.state.scenes[sid].notes.length === sc().notes.length}`);
    const sent = [], fake = { playerId: 'p1', conn: { open: true, send: (m) => sent.push(m) } };
    N.conns.set('fake-peer', fake);
    const role = S.role; S.role = 'gm';
    S.dispatch({ type: 'note.add', sceneId: sid, note: { id: 'nx', x: g, y: g, title: 'Segredo', text: 'não pode vazar', color: 'red' } });
    S.dispatch({ type: 'note.update', sceneId: sid, id: 'nx', patch: { text: 'ainda segredo' } });
    S.dispatch({ type: 'wall.add', sceneId: sid, walls: [{ id: 'wz', x1: 0, y1: 0, x2: g, y2: 0 }] });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); // desfaz a parede
    App.History.undoLast(); // desfaz a nota (vai como undo.apply só com nota → não pode ir)
    S.role = role; N.conns.delete('fake-peer');
    log.push(`pela rede o jogador recebeu: ${sent.map((m) => m.a.type + (m.a.ops ? '[' + m.a.ops.map((o) => o.key).join(',') + ']' : '')).join(', ')} · algum texto de nota? ${JSON.stringify(sent).includes('segredo')}`);
    // 8) jogador (ver como) não vê nem clica
    S.viewAs = '*'; App.UI.setMode('play'); await W(200);
    log.push(`ver como jogador: alfinete clicável = ${!!B.noteAt(sc(), { x: sc().notes[1].x, y: sc().notes[1].y })}`);
    S.viewAs = null; App.UI.setMode('edit');
    log.push('exportar a cena leva as notas: ' + ((await App.Storage.sceneBundle(sid)).scene.notes || []).length);
    if (location.hash === '#shot') {
      B.setTool('select'); App.UI.openNote(sid, sc().notes[0].id); B.hoverNote = sc().notes[1].id; App.UI.refresh(); B.requestRender();
      const w = App.UI.windows.get('note:' + sc().notes[0].id); w.el.style.left = '900px'; w.el.style.top = '420px';
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
