// Plano 77: token 3D com a abertura em relógio e as molduras Vermelho e Branco. Query padrão ?tutorial; #shot-relogio, #shot-molduras = fotos
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
    const T = App.Token3D, UI = App.UI, S = App.Store;
    await T.ready;
    const waitFor = async (cond, n = 100) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    const canvasImg = (w, hh, draw) => new Promise((res) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d')); const im = new Image(); im.onload = () => res(im); im.src = c.toDataURL('image/png'); });
    // Mesmo personagem do teste do Plano 76: rosto no alto do círculo (passa pela moldura às 12h)
    const drawChar = (x) => {
      x.clearRect(0, 0, 700, 900);
      x.fillStyle = '#1b1b22'; x.beginPath(); x.moveTo(150, 900); x.lineTo(200, 420); x.lineTo(500, 420); x.lineTo(560, 900); x.fill();
      x.fillStyle = '#e8e6ef'; x.fillRect(360, 130, 90, 360);
      x.fillStyle = '#d9b08c'; x.beginPath(); x.arc(350, 280, 120, 0, 7); x.fill();
    };
    const cut = await canvasImg(700, 900, drawChar);
    const base = Object.assign({ cutout: 'x', bg: 'color', bgColor: '#3b2a5a', frame: 'gold', frameW: 'thick', frameColor: null }, T.defaultPlace(cut));
    const CY = 640 - 256, R = 250, fw = 2 * R * 0.12;
    const px = (c, x, y) => [...c.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data];
    const ringAt = (hour) => { const a = (hour / 12) * Math.PI * 2 - Math.PI / 2, d = R - fw / 2; return [256 + Math.cos(a) * d, CY + Math.sin(a) * d]; };
    const face = (p) => p[0] > 190 && p[1] > 150 && p[1] < 200 && p[2] > 110 && p[2] < 170; // #d9b08c
    // 1) Fatias do relógio: às 12h o rosto passa pela moldura
    const at12 = (from, to) => px(T.compose(Object.assign({}, base, { popFrom: from, popTo: to }), { cutout: cut }), ...ringAt(12));
    const p93 = at12(9, 3), p102 = at12(10, 2), p12 = at12(1, 2), pAll = at12(0, 0);
    ok(face(p93) && face(p102) && face(pAll), 'com 9h–3h, 10h–2h e a volta inteira o rosto passa por cima da moldura às 12h');
    ok(!face(p12) && p12[0] > p12[2] + 40, 'com 1h–2h a moldura fica na frente do rosto às 12h: ' + p12.join(','));
    log.push('às 12h: 9h–3h ' + p93.join(',') + ' · 10h–2h ' + p102.join(',') + ' · 1h–2h ' + p12.join(',') + ' · volta inteira ' + pAll.join(','));
    // Corpo embaixo fica atrás da moldura (9h–3h), mas sai com a volta inteira
    const p6a = px(T.compose(Object.assign({}, base, { popFrom: 9, popTo: 3 }), { cutout: cut }), ...ringAt(6));
    const p6b = px(T.compose(Object.assign({}, base, { popFrom: 0, popTo: 0 }), { cutout: cut }), ...ringAt(6));
    ok(p6a[0] > p6a[2] + 40 && p6b[0] < 60 && p6b[1] < 60, 'às 6h: moldura na frente (9h–3h), corpo escuro na frente (volta inteira)');
    log.push('às 6h: 9h–3h ' + p6a.join(',') + ' · volta inteira ' + p6b.join(','));
    // 2) Molduras novas
    const white = T.compose(Object.assign({}, base, { frame: 'white', frameColor: '#ff0000' }), { cutout: cut });
    const w6 = px(white, ...ringAt(6)), w9 = px(white, ...ringAt(9));
    ok(w6[0] > 200 && w6[1] < 70 && w6[2] < 70 && w9[0] > 200 && w9[1] < 70 && w9[2] < 70, 'Branco + vermelho escolhido: o aro sai vermelho (6h ' + w6.join(',') + ' · 9h ' + w9.join(',') + ')');
    const oldTint = px(T.compose(Object.assign({}, base, { frame: 'stone', frameColor: '#ff0000' }), { cutout: cut }), ...ringAt(6));
    log.push('vermelho escolhido: Branco 6h ' + w6.join(',') + ' · 9h ' + w9.join(',') + ' · (Pedra tingida, para comparar: ' + oldTint.join(',') + ')');
    const red = T.compose(Object.assign({}, base, { frame: 'red' }), { cutout: cut });
    const r10 = px(red, ...ringAt(10.5)), r4 = px(red, ...ringAt(4.5));
    ok(r10[0] > 200 && r10[1] > 140 && r4[0] > 90 && r4[1] < 80 && r4[0] > r4[1] * 2, 'Vermelho: dourado no alto à esquerda (' + r10.join(',') + '), vermelho escuro embaixo à direita (' + r4.join(',') + ')');
    log.push('Vermelho: 10h30 ' + r10.join(',') + ' · 4h30 ' + r4.join(','));
    const w0 = px(T.compose(Object.assign({}, base, { frame: 'white' }), { cutout: cut }), ...ringAt(6));
    ok(w0[0] > 170 && Math.abs(w0[0] - w0[2]) < 25, 'Branco sem cor: claro e neutro (' + w0.join(',') + ')');
    ok(T.hourLabel(9) === '9h' && T.hourLabel(2.5) === '2h30' && T.hourLabel(0) === '12h', 'nomes das horas');

    // 3) Na janela: relógio, atalhos e arrastar a bolinha
    const mk = (w, hh, draw, name) => new Promise((res) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d')); c.toBlob((b) => res(new File([b], name, { type: 'image/png' })), 'image/png'); });
    const file = await mk(700, 900, drawChar, 'p.png');
    const id = 'ac_t3r';
    S.dispatch({ type: 'actor.add', actor: { id, name: 'Rubra', kind: 'pc', owner: 'all', color: '#c33', size: 1, bars: [{ name: 'PV', value: 10, max: 10 }], stats: [], actions: [], testFormula: '1d20+@valor', initFormula: '1d20', notes: '' } });
    const A = () => S.state.actors[id];
    const p = UI.make3d(A()); await waitFor(() => $('.t3-modal [data-t3="cutout"]'));
    const pf = App.U.pickFile; App.U.pickFile = async () => file; $('[data-t3="cutout"]').click(); await waitFor(() => $('[data-t3="clock"]')); App.U.pickFile = pf;
    ok($('[data-t3="clock"]') && $('[data-t3="clock-txt"]').textContent === 'Das 9h às 3h', 'relógio na janela, começando em 9h às 3h');
    $('[data-t3="pop-10-2"]').click(); await W(60);
    ok($('[data-t3="clock-txt"]').textContent === 'Das 10h às 2h', 'atalho Só o alto');
    // arrastar a bolinha do começo até as 7h
    const dial = $('[data-t3="clock"]').getBoundingClientRect(), hA = $('[data-t3="from"]');
    const a7 = (7 / 12) * Math.PI * 2 - Math.PI / 2, tx = dial.left + dial.width / 2 + Math.cos(a7) * 40, ty = dial.top + dial.height / 2 + Math.sin(a7) * 40;
    hA.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: tx, clientY: ty, pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: tx, clientY: ty, pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); await W(60);
    ok($('[data-t3="clock-txt"]').textContent === 'Das 7h às 2h', 'arrastar a bolinha muda o horário (' + $('[data-t3="clock-txt"]').textContent + ')');
    $('[data-t3="red"]').click(); await W(80);
    ok($('[data-t3="red"]') && $('[data-t3="white"]'), 'molduras Vermelho e Branco na janela');
    if (shot === 'relogio') { await W(300); log.push('foto pronta'); return; }
    $('[data-t3="ok"]').click(); await p;
    ok(A().token3d && A().token3d.popFrom === 7 && A().token3d.popTo === 2 && A().token3d.frame === 'red', 'gravou o horário e a moldura');
    UI.make3d(A()); await waitFor(() => $('[data-t3="clock-txt"]'));
    ok($('[data-t3="clock-txt"]').textContent === 'Das 7h às 2h', 'reabrir traz o horário');
    $$('.t3-modal .btn').find((b) => b.textContent.trim() === 'Cancelar').click(); await W(60);
    log.push('janela: relógio, atalho, arrastar, gravar e reabrir ok');

    if (shot === 'molduras') {
      // Vitrine: Vermelho, Branco + vermelho, Branco + azul, Branco puro
      const box = document.createElement('div'); Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: 999, background: '#2b241c', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' });
      for (const o of [{ frame: 'red' }, { frame: 'white', frameColor: '#d01010' }, { frame: 'white', frameColor: '#2f6fe0' }, { frame: 'white' }]) {
        const c = T.compose(Object.assign({}, base, { popFrom: 9, popTo: 3 }, o), { cutout: cut }); Object.assign(c.style, { width: '300px', height: '375px' }); box.append(c);
      }
      document.body.append(box); await W(200); log.push('foto pronta'); return;
    }
    log.push('fim do relógio');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
