// Plano 76: montar token 3D. Query padrão ?tutorial; #shot-janela, #shot-mapa = fotos
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const shot = location.hash.replace('#shot-', '');
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, UI = App.UI, B = App.Board;
    const waitFor = async (cond, n = 100) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    const makeFile = (w, hh, draw, name) => new Promise((res) => {
      const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh);
      c.toBlob((b) => res(new File([b], name, { type: 'image/png' })), 'image/png');
    });
    // Personagem sem fundo: corpo escuro, rosto, cabelo claro e uma asa saindo à esquerda no alto
    const cutoutFile = await makeFile(700, 900, (x) => {
      x.clearRect(0, 0, 700, 900);
      x.fillStyle = '#1b1b22'; x.beginPath(); x.moveTo(150, 900); x.lineTo(200, 420); x.lineTo(500, 420); x.lineTo(560, 900); x.fill(); // corpo
      x.fillStyle = '#e8e6ef'; x.fillRect(360, 130, 90, 360); // cabelo claro
      x.fillStyle = '#d9b08c'; x.beginPath(); x.arc(350, 280, 120, 0, 7); x.fill(); // rosto
      x.fillStyle = '#0e0e12'; x.beginPath(); x.moveTo(230, 330); x.lineTo(20, 250); x.lineTo(120, 420); x.fill(); // asa
    }, 'personagem.png');
    const artFile = await makeFile(900, 1200, (x) => { const g = x.createLinearGradient(0, 0, 0, 1200); g.addColorStop(0, '#6b4a2b'); g.addColorStop(1, '#1d140c'); x.fillStyle = g; x.fillRect(0, 0, 900, 1200); }, 'arte.png');

    const id = 'ac_t3';
    S.dispatch({ type: 'actor.add', actor: { id, name: 'Corvo', kind: 'pc', owner: 'all', color: '#7c5cc4', size: 1, bars: [{ name: 'PV', value: 20, max: 20 }], stats: [], actions: [], testFormula: '1d20+@valor', initFormula: '1d20', notes: '' } });
    const A = () => S.state.actors[id];
    await UI.setArt(A(), artFile); await waitFor(() => A().art);
    UI.openActor(id); UI.sheetTab[id] = 'config'; await W(150);
    const win = () => UI.windows.get('actor:' + id).el;
    const rer = () => { const w = UI.windows.get('actor:' + id); if (w) w.body._sig = null; UI.refresh(); };
    rer(); await W(200);
    const btn3 = win().querySelector('[data-sa="t3"]');
    ok(btn3 && /Montar token 3D/.test(btn3.textContent), 'botão Montar token 3D na linha do token');
    btn3.click(); await waitFor(() => $('.t3-modal [data-t3="cutout"]'));
    ok($('.t3-modal .t3-prev') && $('.t3-modal [data-t3="cutout"]'), 'janela aberta (arte com fundo: pede o PNG sem fundo)');
    ok($('.t3-modal [data-t3="art"].on'), 'fundo começa com a imagem do personagem');
    // Enviar o personagem sem fundo (escolha de arquivo simulada)
    const pf = App.U.pickFile; App.U.pickFile = async () => cutoutFile;
    $('[data-t3="cutout"]').click(); await waitFor(() => $('[data-t3="size"]'));
    App.U.pickFile = pf;
    ok($('[data-t3="size"]'), 'personagem carregado (barra de tamanho)');
    ok(!/null|undefined/.test($('.t3-side').textContent), 'janela sem texto "null"');
    // Moldura de ouro, grossa
    $('[data-t3="gold"]').click(); await W(80); $('[data-t3="thick"]').click(); await W(80);
    if (shot === 'janela') { await W(300); log.push('foto pronta'); return; }
    $('[data-t3="ok"]').click();
    await waitFor(() => A().imgStyle === 'pop');
    ok(A().imgStyle === 'pop' && A().img && A().token3d && A().token3d.frame === 'gold' && A().token3d.frameW === 'thick' && A().token3d.cutout, 'gravou o token 3D e as escolhas');
    // Pixels do token gerado
    const im = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = App.Images.src(A().img); });
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const cx2 = cv.getContext('2d'); cx2.drawImage(im, 0, 0);
    const px = (x, y) => [...cx2.getImageData(x, y, 1, 1).data];
    const T = App.Token3D, CY = 640 - 256, R = 250;
    const st = A().token3d, rcW = st.s * 2 * R, rcH = rcW * (900 / 700), rx = 256 + st.x * R - rcW / 2, ry = CY + st.y * R - rcH / 2;
    const at = (u, v) => px(Math.round(rx + (u / 700) * rcW), Math.round(ry + (v / 900) * rcH)); // ponto do personagem original
    const hairTop = at(405, 140), corner = px(4, 636), ringBottom = px(256, CY + R - 15);
    ok(im.naturalWidth === 512 && im.naturalHeight === 640, 'token 512×640');
    ok(ry + (140 / 900) * rcH < CY - R && hairTop[3] > 200, 'o cabelo passa por cima da moldura (fora do círculo): ' + hairTop.join(','));
    ok(corner[3] < 10, 'canto de baixo transparente (fora do círculo)');
    ok(ringBottom[0] > ringBottom[2] + 30 && ringBottom[3] > 200, 'embaixo a moldura de ouro fica na frente do corpo: ' + ringBottom.join(','));
    log.push(`token: ${im.naturalWidth}×${im.naturalHeight} · cabelo acima do círculo ${hairTop.join(',')} · moldura embaixo ${ringBottom.join(',')} · canto ${corner[3]}`);
    // Configurar diz que é 3D; reabrir traz as escolhas
    rer(); await W(200);
    ok(/Token 3D/.test(win().querySelector('.sa-imgs').textContent) && /Ajustar token 3D/.test(win().querySelector('[data-sa="t3"]').textContent), 'Configurar mostra Token 3D e Ajustar');
    win().querySelector('[data-sa="t3"]').click(); await waitFor(() => $('.t3-modal [data-t3="gold"].on'));
    ok($('.t3-modal [data-t3="gold"].on') && $('.t3-modal [data-t3="thick"].on') && $('[data-t3="size"]'), 'reabrir traz as escolhas');
    $$('.t3-modal .btn').find((b) => b.textContent.trim() === 'Cancelar').click(); await W(80);
    ok(!$('.t3-modal') && A().imgStyle === 'pop', 'cancelar não muda nada');
    // No mapa: círculo no quadrado, a parte de cima sobe; o clique vale só no quadrado
    const sc = S.currentScene(), g = sc.grid;
    B.placeActor(id, { x: g * 6.5, y: g * 5.5 }); await W(200);
    const tok = Object.values(S.currentScene().tokens).find((t) => t.actorId === id);
    ok(tok, 'token colocado no mapa');
    const inSq = B.hitAll(S.currentScene(), { x: tok.x + g / 2, y: tok.y + g / 2 }).some((x) => x.kind === 'token' && x.obj.id === tok.id);
    const above = B.hitAll(S.currentScene(), { x: tok.x + g / 2, y: tok.y - g * 0.12 }).some((x) => x.kind === 'token' && x.obj.id === tok.id);
    ok(inSq && !above, 'clique só no quadrado (não na parte que sai por cima)');
    log.push('mapa: clique no quadrado ' + inSq + ' · acima ' + above);
    if (shot === 'mapa') { UI.closeWindow('actor:' + id); B.centerOn(tok.x + g / 2, tok.y); B.cam.z = 2.2; B.centerOn(tok.x + g / 2, tok.y); B.requestRender(); await W(400); log.push('foto pronta'); return; }
    // Trocar para Enviar token e voltar: as escolhas continuam guardadas
    const tokFile = await makeFile(200, 200, (x) => { x.fillStyle = '#c33'; x.fillRect(0, 0, 200, 200); }, 't.png');
    App.U.pickFile = async () => tokFile; await UI.pickToken(A()); App.U.pickFile = pf; await W(80);
    ok(A().imgStyle === 'token' && A().token3d && A().token3d.frame === 'gold', 'Enviar token troca, mas guarda as escolhas do 3D');
    log.push('fim do token 3D');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
