// Plano 82: bloco da criatura legível e Testar na página "Criar ficha" (ficha.html; precisa de data/5etools). #shot = foto do bloco; #shot-rolagem = foto com o painel Rolagens
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + String(e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const shot = location.hash.replace('#', '');
  try {
    const F = App.Ficha, BS = App.Bestiary, D = App.Dice;
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    BS.fetch = () => Promise.reject(new Error('sem rede no teste'));
    await BS.load();
    const e = BS.list.find((x) => x.n === 'Tarrasque' && x.s === 'XMM');
    ok(e, 'Tarrasque 2024 no bestiário');
    const a = await F.fromEntry(e); await W(300);
    const card = (name) => $$('.f5-card').find((c) => c.querySelector('.f5-card-name').textContent.startsWith(name));
    const bite = card('Bite'), bellow = card('Thunderous Bellow'), legres = card('Legendary Resistance');
    ok(bite && bite.classList.contains('k-attack') && /Ataque corpo a corpo/i.test(bite.querySelector('.f5-card-kind').textContent), 'Bite: cartão de ataque corpo a corpo');
    ok(bellow && bellow.classList.contains('k-save') && /Resistência de Constituição/i.test(bellow.querySelector('.f5-card-kind').textContent), 'Thunderous Bellow: cartão de resistência de Constituição');
    ok(legres && legres.classList.contains('k-trait'), 'Legendary Resistance: traço');
    ok(bite.querySelector('.n-atk') && /\+19/.test(bite.querySelector('.n-atk').textContent), 'Bite: ataque +19 com ícone');
    const bd = bite.querySelector('.n-dmg');
    ok(bd && bd.classList.contains('dt-piercing') && /4d12\+10 perfurante \(36\)/.test(bd.textContent), 'Bite: dano com tipo e média: ' + (bd && bd.textContent));
    ok(bellow.querySelector('.n-dmg.dt-thunder') && bellow.querySelector('.n-dc'), 'Thunderous Bellow: CD e dano trovejante com a cor do tipo');
    ok(getComputedStyle(bellow.querySelector('.n-dmg')).color !== getComputedStyle(bd).color, 'cores diferentes para trovejante e perfurante');
    // Destaques no texto
    const tx = bite.querySelector('.f5-card-text');
    ok(tx.querySelector('button.f5-tx-dice[data-txroll="4d12+10"]'), 'texto: 36 (4d12 + 10) clicável');
    ok([...tx.querySelectorAll('.f5-tx-dc')].some((x) => /DC 20/.test(x.textContent)), 'texto: DC 20 em destaque');
    ok([...tx.querySelectorAll('.f5-tx-cond')].some((x) => x.textContent === 'Grappled'), 'texto: condição Grappled em destaque');
    ok([...tx.querySelectorAll('.f5-tx-lbl')].some((x) => x.textContent === 'Hit:'), 'texto: "Hit:" em destaque');
    ok([...tx.querySelectorAll('.f5-tx-type')].some((x) => x.classList.contains('dt-piercing')), 'texto: Piercing damage com a cor');
    ok(tx.textContent === (a.dnd5e.npc.actions.find((x) => x.name === 'Bite') || {}).text, 'o texto do livro continua inteiro');
    ok($$('.f5-sb-line .f5-tx-type.dt-fire').length >= 1, 'imunidades: fire com a cor do fogo');
    ok($$('.f5-sb-v').length >= 3, 'números do topo em destaque');
    ok(!$('.act-use') && $$('.f5-test').length >= 3, 'página: Testar no lugar do play (' + $$('.f5-test').length + ')');
    // Testar o Bite: ataque e dano juntos, com as pecinhas
    bite.querySelector('.f5-test').click(); await W(150);
    let r = F.rolls[0];
    ok(r && r.label === 'Bite' && r.parts[0].label.startsWith('Ataque') && r.parts.some((p) => /^Dano perfurante/.test(p.label) && p.groups && p.groups[0].v.length === 4), 'Testar Bite: ataque e 4d12 de dano');
    ok($('.fp-roll.new .dline .die'), 'painel Rolagens com as pecinhas');
    // Crítico: 20 natural dobra os dados
    const orig = D.roll; D.roll = (f, v) => { const x = orig(f, v); if (/^1d20/.test(f)) { x.nat = [20]; x.crit = true; } return x; };
    bite.querySelector('.f5-test').click(); await W(150); D.roll = orig;
    r = F.rolls[0];
    const cd = r.parts.find((p) => /^Dano/.test(p.label));
    ok(/crítico/.test(r.parts[0].label) && cd && cd.groups && cd.groups[0].v.length === 8, 'crítico: 8d12 de dano');
    ok(r.parts.some((p) => /^CD do efeito/.test(p.label) && p.total === 20), 'no ataque, a CD 20 aparece como CD do efeito');
    // Testar o Thunderous Bellow: CD, dano e metade
    bellow.querySelector('.f5-test').click(); await W(150);
    r = F.rolls[0];
    const dmg = r.parts.find((p) => /^Dano/.test(p.label)), half = r.parts.find((p) => /metade/.test(p.label)), dc = r.parts.find((p) => p.label.startsWith('CD'));
    ok(dc && dc.total === 27 && dmg && dmg.groups[0].v.length === 12 && half && half.total === Math.floor(dmg.total / 2), 'Testar Thunderous Bellow: CD 27, 12d12 e a metade');
    // Clicar no dano do texto rola
    tx.querySelector('button.f5-tx-dice').click(); await W(100);
    ok(/4d12\+10/.test(F.rolls[0].label), 'dano do texto rola: ' + F.rolls[0].label);
    ok(!/undefined|NaN|\[object/.test($('.f5-sb').textContent), 'sem texto estranho');
    log.push('cartões: ' + $$('.f5-card').length + ' · Bite ' + bd.textContent + ' · testes ' + $$('.f5-test').length);
    if (shot === 'shot') { bite.scrollIntoView({ block: 'start' }); $('#fp-main').scrollTop -= 60; F.rolls = []; F.render(); await W(300); log.push('foto pronta'); return; }
    if (shot === 'shot-rolagem') { F.rolls = []; card('Bite').querySelector('.f5-test').click(); await W(100); card('Thunderous Bellow').querySelector('.f5-test').click(); await W(200); card('Bite').scrollIntoView({ block: 'start' }); await W(200); log.push('foto pronta'); return; }
    log.push('fim do bloco da criatura');
  } catch (e2) { log.push('EXC ' + e2.stack); }
  flush();
}, 1500));
