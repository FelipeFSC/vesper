// Plano 38 · Menu das ferramentas no estilo Photoshop: linhas, sub-menus (abrir, escolher, Esc, clique fora), nada cortado
// #shot-<ferramenta>[-<sub>]: deixa o menu (e o sub-menu) aberto para a foto. Ex.: #shot-note-notes, #shot-rect-fill, #shot-wall
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, sc = () => S.currentScene();
    UI.setMode('edit'); UI.refresh(); await W(100);
    const rows = () => [...document.querySelectorAll('#tool-opts .to-row')];
    const row = (re) => rows().find((b) => re.test(b.textContent));
    const sub = () => $('#tool-sub');
    const fits = (el) => el.scrollWidth <= el.clientWidth + 1;
    const shot = location.hash.startsWith('#shot-') ? location.hash.slice(6).split('-') : null;
    if (shot) {
      S.dispatch({ type: 'note.add', sceneId: sc().id, note: { id: 'n1', x: 200, y: 200, title: 'Sala do trono', text: 'O rei está escondido atrás do trono.', color: 'gold' } });
      S.dispatch({ type: 'note.add', sceneId: sc().id, note: { id: 'n2', x: 400, y: 300, title: 'Armadilha', text: 'Agulha envenenada, CD 15.', color: 'red' } });
      B.setTool(shot[0]); UI.refresh(); await W(150);
      if (shot[1]) { rows().find((b) => b.classList.contains('has-sub') && ({ notes: /Notas/, lib: /Imagens/, color: /^Cor/, width: /Espessura/, fill: /Preench/ })[shot[1]].test(b.textContent)).click(); await W(100); }
      log.push('foto: ' + location.hash);
      return;
    }
    const TOOLS = ['path', 'line', 'rect', 'ellipse', 'wall', 'door', 'light', 'prop', 'note', 'trigger', 'portal', 'ruler'];
    for (const t of TOOLS) {
      B.setTool(t); UI.refresh(); await W(60);
      const box = $('#tool-opts');
      log.push(`${t}: ${rows().map((b) => b.querySelector('.to-label').textContent + (b.classList.contains('on') ? '*' : '') + (b.classList.contains('has-sub') ? '›' : '')).join(' | ')} · sem textos de ajuda = ${!box.querySelector('p.hint, .eyebrow')} · cabe = ${fits(box)} · largura ${box.offsetWidth}`);
    }
    // Desenho: cor, espessura e preenchimento pelos sub-menus
    B.setTool('rect'); UI.refresh(); await W(60);
    row(/^Cor/).click(); await W(40);
    log.push(`sub-menu de cor aberto = ${!!sub()} · ao lado do menu = ${sub() && sub().getBoundingClientRect().left >= $('#tool-opts').getBoundingClientRect().right} · ${sub().querySelectorAll('.swatch').length} cores`);
    sub().querySelectorAll('.swatch')[3].click(); await W(40);
    log.push(`escolheu a cor: ${B.style.color} · sub-menu fechou = ${!sub()}`);
    row(/Espessura/).click(); await W(40);
    [...sub().querySelectorAll('.to-row')].find((b) => /14 px/.test(b.textContent)).click(); await W(40);
    log.push(`espessura: ${B.style.width} · linha mostra "${row(/Espessura/).querySelector('.to-val').textContent}" · fechou = ${!sub()}`);
    row(/Preench/).click(); await W(40);
    [...sub().querySelectorAll('.to-row')].find((b) => /Sólido/.test(b.textContent)).click(); await W(40);
    log.push(`preenchimento: ${B.style.fill} · linha mostra "${row(/Preench/).querySelector('.to-val').textContent}"`);
    // Esc e clique fora fecham; clicar de novo na linha fecha; só um aberto
    row(/^Cor/).click(); await W(30);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(30);
    log.push(`Esc fecha = ${!sub()} · ferramenta continua ${B.tool}`);
    row(/^Cor/).click(); await W(30);
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 600, clientY: 400, button: 0, pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 600, clientY: 400, button: 0, pointerId: 1 })); await W(30);
    log.push('clique no mapa fecha = ' + !sub());
    row(/^Cor/).click(); await W(30); row(/^Cor/).click(); await W(30);
    log.push('clicar de novo na linha fecha = ' + !sub());
    row(/^Cor/).click(); await W(30); row(/Espessura/).click(); await W(30);
    log.push(`só um aberto: ${document.querySelectorAll('#tool-sub').length} · é o da espessura = ${!!(sub() && /px/.test(sub().textContent))}`);
    B.setTool('select'); UI.refresh(); await W(40);
    log.push('trocar de ferramenta fecha = ' + !sub());
    // Parede: modo e tipo
    B.setTool('wall'); UI.refresh(); await W(60);
    row(/Lápis/).click(); await W(30); row(/Meia/).click(); await W(30);
    log.push(`parede: modo ${B.wallMode} · tipo ${B.wallType} · destacados: ${rows().filter((b) => b.classList.contains('on')).map((b) => b.querySelector('.to-label').textContent).join(', ')}`);
    row(/Reta/).click(); B.wallType = 'high'; UI.refresh();
    // Porta, Luz, Gatilho
    B.setTool('door'); UI.refresh(); await W(40); row(/^Trancada/).click(); await W(30);
    log.push('porta trancada = ' + B.doorLocked); row(/Destrancada/).click();
    B.setTool('light'); UI.refresh(); await W(40); row(/Escuridão/).click(); await W(30); row(/Cone/).click(); await W(30);
    log.push(`luz: ${B.lightKind} ${B.lightShape}`); row(/^Luz/).click(); row(/Círculo/).click();
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: Object.assign({}, sc().light, { enabled: false }) } }); UI.refresh(); await W(40);
    log.push('iluminação desligada: linha "Ligar iluminação" = ' + !!row(/Ligar ilumina/));
    row(/Ligar ilumina/).click(); UI.refresh(); await W(40);
    log.push('ligou = ' + sc().light.enabled + ' · linha sumiu = ' + !row(/Ligar ilumina/));
    B.setTool('trigger'); UI.refresh(); await W(40); row(/Polígono/).click(); await W(30);
    log.push('gatilho: forma ' + B.trigShape); row(/Retângulo/).click();
    // Nota: cor e lista com busca
    S.dispatch({ type: 'note.add', sceneId: sc().id, note: { id: 'n1', x: 200, y: 200, title: 'Sala do trono', text: 'O rei', color: 'gold' } });
    S.dispatch({ type: 'note.add', sceneId: sc().id, note: { id: 'n2', x: 400, y: 300, title: 'Armadilha', text: 'Agulha', color: 'red' } });
    B.setTool('note'); UI.refresh(); await W(50);
    row(/Tesouro/).click(); await W(30);
    log.push(`nota: cor ${B.noteColor} · linha da lista mostra ${row(/Notas desta cena/).querySelector('.to-val').textContent}`);
    row(/Notas desta cena/).click(); await W(50);
    const q = sub().querySelector('input[type=search]');
    log.push(`lista: ${[...sub().querySelectorAll('.note-item b')].map((b) => b.textContent).join(', ')} · busca em foco = ${document.activeElement === q}`);
    q.value = 'arma'; q.dispatchEvent(new Event('input'));
    log.push('busca "arma": ' + [...sub().querySelectorAll('.note-item b')].map((b) => b.textContent).join(', '));
    sub().querySelector('.note-item').click(); await W(150);
    log.push(`clicar abre a nota: janela = ${!!$('.win.note-win')} · sub-menu fechou = ${!sub()}`);
    UI.closeWindow('note:n2');
    // Imagem: enviar e biblioteca
    B.setTool('prop'); UI.refresh(); await W(50);
    log.push('imagem: ' + rows().map((b) => b.querySelector('.to-label').textContent).join(' | '));
    row(/Imagens da campanha/).click(); await W(50);
    log.push('biblioteca aberta: ' + (sub().querySelectorAll('.img-lib img').length + ' imagem(ns)') + ' · ou aviso: ' + ((sub().querySelector('.to-empty') || {}).textContent || '-'));
    // Régua
    B.setTool('ruler'); UI.refresh(); await W(40);
    const before = B.rulerShare !== false; row(/Mostrar aos jogadores/).click(); await W(30);
    log.push(`régua: mostrar ${before} → ${B.rulerShare !== false} · destacado = ${row(/Mostrar aos jogadores/).classList.contains('on')}`);
    row(/Mostrar aos jogadores/).click();
    B.setTool('select');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
