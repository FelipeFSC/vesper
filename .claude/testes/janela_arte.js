// Plano 78: imagem do personagem também na barra do topo da janela da ficha; enquadramento. #shot-generica, #shot-5e, #shot-rolada = fotos
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const shot = location.hash.replace('#shot-', '');
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot, #toasts > *').forEach((e) => e.remove()), 50);
    const S = App.Store, UI = App.UI;
    const waitFor = async (cond, n = 100) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    // Arte alta, com o "rosto" no alto (8% a 22% da altura), como uma ilustração de corpo inteiro
    const artFile = await new Promise((res) => {
      const c = document.createElement('canvas'); c.width = 800; c.height = 1400; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 1400); g.addColorStop(0, '#4a3a6e'); g.addColorStop(1, '#120d1c'); x.fillStyle = g; x.fillRect(0, 0, 800, 1400);
      x.fillStyle = '#e8e6ef'; x.fillRect(260, 60, 280, 520); // cabelo
      x.fillStyle = '#d9b08c'; x.beginPath(); x.ellipse(400, 210, 110, 140, 0, 0, 7); x.fill(); // rosto
      x.fillStyle = '#1a1a1a'; x.fillRect(180, 400, 440, 1000); // roupa
      c.toBlob((b) => res(new File([b], 'arte.png', { type: 'image/png' })), 'image/png');
    });
    const id = 'ac_win_arte';
    S.dispatch({ type: 'actor.add', actor: { id, name: 'Aventureiro', kind: 'pc', owner: 'all', color: '#7c5cc4', size: 1, bars: [{ name: 'PV', value: 20, max: 20 }, { name: 'Mana', value: 7, max: 10 }], stats: [], actions: [{ name: 'Espada longa', mode: 'attack', attack: '1d20+3', defense: 'Defesa', damage: '1d8+3', bar: 'PV' }], testFormula: '1d20+@valor', initFormula: '1d20', notes: '' } });
    const A = () => S.state.actors[id];
    UI.openActor(id); await W(200);
    const win = () => UI.windows.get('actor:' + id).el;
    ok(!win().classList.contains('win-art'), 'sem arte: janela como antes');
    await UI.setArt(A(), artFile); await waitFor(() => win().classList.contains('win-art'));
    const head = win().querySelector('.win-head'), cs = getComputedStyle(head);
    ok(win().classList.contains('win-art') && /url\(/.test(win().style.getPropertyValue('--win-art')), 'com arte: a janela recebe a arte');
    ok(cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent', 'barra do topo sem fundo próprio (' + cs.backgroundColor + ')');
    ok(getComputedStyle(win(), '::before').backgroundImage.includes('url('), 'arte desenhada atrás da barra');
    ok(win().style.getPropertyValue('--win-art-y') === '12%', 'enquadramento padrão 12% (mais o alto)');
    ok(getComputedStyle(win().querySelector('.sa-bg')).display === 'none', 'a camada do topo da ficha não se repete');
    log.push('janela: arte ' + win().classList.contains('win-art') + ' · barra ' + cs.backgroundColor + ' · enquadramento ' + win().style.getPropertyValue('--win-art-y'));
    if (shot === 'generica') { await W(300); log.push('foto pronta'); return; }
    if (shot === 'rolada') { const b = UI.windows.get('actor:' + id).body; b.scrollTop = 160; await W(300); log.push('foto pronta'); return; }
    // Enquadramento em Configurar → Imagens
    UI.sheetTab[id] = 'config'; const ww = UI.windows.get('actor:' + id); ww.body._sig = null; UI.refresh(); await W(250);
    const rng = win().querySelector('[data-sa="y"]');
    ok(rng && Number(rng.value) === 12, 'barra Enquadramento em Configurar');
    rng.value = '30'; rng.dispatchEvent(new Event('input')); await W(30);
    ok(win().style.getPropertyValue('--win-art-y') === '30%', 'mexer na barra mostra na hora');
    rng.dispatchEvent(new Event('change')); await waitFor(() => A().artY === 30);
    ok(A().artY === 30 && win().style.getPropertyValue('--win-art-y') === '30%', 'enquadramento guardado na ficha');
    log.push('enquadramento: ' + A().artY + '%');
    // Remover a arte com a janela aberta: barra volta ao normal
    UI.removeArt(A()); await waitFor(() => !win().classList.contains('win-art'));
    ok(!win().classList.contains('win-art'), 'remover a arte: barra volta ao normal');
    UI.closeWindow('actor:' + id);
    // Ficha 5e
    UI.newActor('pc'); await W(60); $('[data-sys="5e"]').click(); await W(300);
    const a5 = Object.values(S.state.actors).find((x) => x.sistema === '5e');
    S.dispatch({ type: 'actor.update', id: a5.id, patch: { name: 'Aventureiro 5e' } });
    await UI.setArt(S.state.actors[a5.id], artFile); await W(100);
    UI.openActor(a5.id); await W(300);
    const w5 = UI.windows.get('actor:' + a5.id).el;
    ok(w5.classList.contains('win-art') && w5.querySelector('.f5-top.sa-top'), 'ficha 5e com a arte desde o topo');
    if (shot === '5e') { await W(300); log.push('foto pronta'); return; }
    log.push('fim da janela com arte');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
