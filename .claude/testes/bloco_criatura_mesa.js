// Plano 82 na mesa: o mesmo bloco em cartões na janela da ficha, com o ▶ (usar no mapa) e sem o Testar. Query padrão ?tutorial; precisa de data/5etools. #shot = foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + String(e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    for (let i = 0; i < 100 && !(App.Store.state && App.Store.currentScene()); i++) await W(100);
    const S = App.Store, BS = App.Bestiary, UI = App.UI;
    BS.fetch = () => Promise.reject(new Error('sem rede no teste'));
    await BS.load();
    const e = BS.list.find((x) => x.n === 'Tarrasque' && x.s === 'XMM');
    let id = await BS.addToCampaign(e.k);
    if (!id) { const m = await BS.full(e); const a0 = BS.toActor(m, e); a0.id = 'ac_tz'; S.dispatch({ type: 'actor.add', actor: a0 }); id = 'ac_tz'; }
    await W(200);
    UI.openActor(id); await W(400);
    const win = UI.windows.get('actor:' + id).el;
    const cards = [...win.querySelectorAll('.f5-card')];
    const bite = cards.find((c) => c.querySelector('.f5-card-name').textContent.startsWith('Bite'));
    ok(cards.length >= 8 && bite && bite.classList.contains('k-attack'), 'mesa: cartões no bloco (' + cards.length + ')');
    ok(bite.querySelector('.act-use') && !win.querySelector('.f5-test'), 'mesa: ▶ para usar no mapa, sem Testar');
    ok(bite.querySelector('.n-dmg.dt-piercing') && bite.querySelector('button.f5-tx-dice'), 'mesa: dano com cor e texto com destaques');
    ok(getComputedStyle(bite).borderRadius !== '0px' && getComputedStyle(bite, '::before').backgroundColor !== 'rgba(0, 0, 0, 0)', 'mesa: o cartão tem o estilo (faixa)');
    // ▶ abre a mira
    const tok = App.Board.placeActor(id); await W(200);
    bite.querySelector('.act-use').click(); await W(150);
    ok(App.Board.targeting && /Bite/.test(App.Board.targeting.label), 'mesa: ▶ abre a mira do Bite');
    App.Board.cancelTargeting(); void tok;
    log.push('mesa: ' + cards.length + ' cartões');
    if (location.hash === '#shot') { let body = bite.parentElement; while (body && !(body.scrollHeight > body.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(body).overflowY))) body = body.parentElement; if (body) body.scrollTop += bite.getBoundingClientRect().top - body.getBoundingClientRect().top - 20; await W(300); log.push('foto pronta'); return; }
    log.push('fim do bloco da criatura na mesa');
  } catch (e2) { log.push('EXC ' + e2.stack); }
  flush();
}, 1500));
