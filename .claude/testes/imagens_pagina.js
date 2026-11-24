// Plano 74: página "Criar ficha" com a imagem do personagem e a imagem do token. -page 'ficha.html' -query ''; #shot = foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    const F = App.Ficha;
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    const waitFor = async (cond, n = 160) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    const makeFile = (w, hh, color) => new Promise((res) => {
      const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d');
      x.fillStyle = '#251a3a'; x.fillRect(0, 0, w, hh); x.fillStyle = color; x.beginPath(); x.arc(w / 2, hh * 0.3, w * 0.18, 0, 7); x.fill();
      c.toBlob((b) => res(new File([b], 'arte.png', { type: 'image/png' })), 'image/png');
    });
    // Genérica
    F.newActor('pc', 'generic'); await W(100);
    let a = Object.values(F.actors)[0];
    ok(!$('.fp-id.sa-top') && $('[data-sa="art"]'), 'sem arte: botão Imagem do personagem');
    await F.setArt(await makeFile(800, 1200, '#d9b08c'));
    await waitFor(() => $('.fp-id.sa-top .sa-bg'));
    a = F.actors[a.id];
    ok(a.art && a.img && a.imgFromArt && $('.fp-id.sa-top .sa-bg'), 'genérica: arte ao fundo e token recortado dela');
    log.push('genérica: arte ' + !!a.art + ' · token da arte ' + !!a.imgFromArt);
    // 5e
    F.newActor('pc', '5e'); await W(200);
    await F.setArt(await makeFile(1000, 700, '#c33'));
    await waitFor(() => $('.f5-top.sa-top .sa-bg'));
    const b = Object.values(F.actors).find((x) => x.sistema === '5e');
    ok(b && b.art && b.img && $('.f5-top.sa-top .sa-bg'), '5e: arte no topo');
    log.push('5e: arte ' + !!(b && b.art) + ' · topo ' + !!$('.f5-top.sa-top'));
    // Exportar a ficha leva as duas
    if (F.bundle) { const bun = await F.bundle(b); ok(bun.assets[b.art] && bun.assets[b.img], 'exportar leva arte e token'); }
    if (location.hash === '#shot') { log.push('foto pronta'); return; }
    log.push('fim das imagens da página');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
