// Plano 80: página "Criar ficha" com a arte no topo, atrás da barra, como na janela da mesa (Plano 78). Página ficha.html.
// #shot-generica, #shot-5e, #shot-rolada = fotos
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const shot = location.hash.replace('#shot-', '');
  try {
    const F = App.Ficha, B = document.body;
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    const waitFor = async (cond, n = 160) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    const makeFile = (w, hh, color) => new Promise((res) => {
      const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, w, hh); g.addColorStop(0, '#2d2350'); g.addColorStop(1, '#7a3b2e'); x.fillStyle = g; x.fillRect(0, 0, w, hh);
      x.fillStyle = color; x.beginPath(); x.arc(w * 0.62, hh * 0.28, w * 0.16, 0, 7); x.fill();
      x.fillStyle = '#e8e6ef'; x.fillRect(w * 0.5, hh * 0.42, w * 0.24, hh * 0.5);
      c.toBlob((b) => res(new File([b], 'arte.png', { type: 'image/png' })), 'image/png');
    });
    const css = (el, p) => getComputedStyle(el)[p];
    const before = () => getComputedStyle(B, '::before');
    // Sem arte: página como antes
    const plain = F.newActor('pc', 'generic').id; await W(150);
    ok(!B.classList.contains('fp-art') && css($('.fp-top'), 'backgroundColor') !== 'rgba(0, 0, 0, 0)' && before().content === 'none', 'sem arte: barra com fundo, sem camada');
    // Genérica com arte
    const gid = F.newActor('pc', 'generic').id; await W(150);
    await F.setArt(await makeFile(900, 1300, '#d9b08c'));
    await waitFor(() => B.classList.contains('fp-art'));
    ok(B.classList.contains('fp-art') && /url\(/.test(B.style.getPropertyValue('--fp-art')), 'genérica: a página recebe a arte');
    ok(css($('.fp-top'), 'backgroundColor') === 'rgba(0, 0, 0, 0)', 'barra do topo sem fundo próprio');
    ok(css($('.fp-brand'), 'backgroundColor') !== 'rgba(0, 0, 0, 0)', 'a parte da barra acima da lista continua com fundo');
    const bf = before();
    ok(bf.position === 'fixed' && bf.top === '0px' && bf.left === '260px' && bf.height === '400px' && /url\(/.test(bf.backgroundImage), 'arte desde o topo, acima da ficha, 400 px: ' + bf.position + ' ' + bf.top + ' ' + bf.left + ' ' + bf.height);
    ok(css($('.fp-title'), 'color') === 'rgb(255, 255, 255)', '"Criar ficha" em branco');
    ok($('#fp-main .sa-bg') && css($('#fp-main .sa-bg'), 'display') === 'none', 'a camada de dentro da ficha não repete a arte');
    ok(/ 12%/.test(bf.backgroundPosition) || /12%/.test(B.style.getPropertyValue('--fp-art-y')), 'enquadramento padrão 12%');
    const art = F.actors[F.sel];
    ok(art.img && art.imgFromArt, 'token recortado da arte');
    log.push('genérica: ' + bf.position + ' · left ' + bf.left + ' · altura ' + bf.height + ' · barra ' + css($('.fp-top'), 'backgroundColor'));
    if (shot === 'generica') { await W(400); log.push('foto pronta'); return; }
    if (shot === 'rolada') { $('#fp-main').scrollTop = 220; await W(400); log.push('foto pronta'); return; }
    // Enquadramento na página
    const y = $('[data-sa="y"]');
    ok(y && y.value === '12', 'barra Enquadramento na página (12)');
    y.value = '40'; y.dispatchEvent(new Event('input')); await W(50);
    ok(B.style.getPropertyValue('--fp-art-y') === '40%', 'enquadramento muda na hora');
    y.dispatchEvent(new Event('change')); await W(200);
    ok(F.actors[gid].artY === 40, 'enquadramento guardado na ficha');
    // Rolar: a arte fica parada (fixa), a ficha passa por cima
    $('#fp-main').scrollTop = 200; await W(100);
    ok(before().position === 'fixed' && css($('.fp-wrap'), 'zIndex') === '1', 'ao rolar a arte fica e a ficha passa por cima');
    // Trocar de ficha na lista
    const withArt = F.sel;
    F.select(plain); await W(200);
    ok(!B.classList.contains('fp-art') && !B.style.getPropertyValue('--fp-art'), 'ficha sem arte: a arte some');
    F.select(withArt); await W(200);
    ok(B.classList.contains('fp-art') && B.style.getPropertyValue('--fp-art-y') === '40%', 'voltar à ficha com arte: a arte volta com o enquadramento');
    // Remover a arte
    const rm = [...document.querySelectorAll('#fp-main button')].find((b) => b.title === 'Remover a imagem do personagem');
    ok(rm, 'botão de remover a arte'); if (rm) rm.click(); await W(200);
    ok(!B.classList.contains('fp-art') && css($('.fp-top'), 'backgroundColor') !== 'rgba(0, 0, 0, 0)', 'remover a arte: a barra volta ao normal');
    // 5e com arte
    F.newActor('pc', '5e'); await W(250);
    await F.setArt(await makeFile(1200, 800, '#c33'));
    await waitFor(() => B.classList.contains('fp-art'));
    ok(B.classList.contains('fp-art') && $('.f5-top.sa-top') && css($('.f5-top .sa-bg'), 'display') === 'none', '5e: a página recebe a arte, o topo da ficha sem a camada própria');
    if (shot === '5e') { await W(400); log.push('foto pronta'); return; }
    log.push('fim da arte na página');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
