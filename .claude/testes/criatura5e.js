// Plano 53: ficha de criatura 5e na página Criar ficha (rodar com -page 'ficha.html' -query '' -budget 200000; precisa de data/5etools)
// #shot = foto do bloco do Tarrasque; #shotedit = foto do modo editar; #shotlich = foto da conjuração do Lich
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.confirm = () => true;
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const F = App.Ficha, R = App.Regras5e, BS = App.Bestiary, ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const change = async (el, v, what) => { ok(el, 'campo ' + (what || v)); if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(40); };
  const click = async (sel, what) => { const el = $(sel); ok(el, 'achou ' + (what || sel)); if (el) el.click(); await W(60); return el; };
  const txt = () => (($('.f5') || {}).textContent || '').replace(/\s+/g, ' ');
  const junk = (where) => ok(!/\bnull\b|\bundefined\b|\bNaN\b|\[object/.test(txt()), 'texto estranho (' + where + '): ' + (txt().match(/.{0,30}(null|undefined|NaN|\[object).{0,20}/) || [''])[0]);
  const shot = location.hash.replace('#', '');
  const fromBook = async (name, src) => { const e = BS.list.find((x) => x.n === name && x.s === src); ok(e, 'no bestiário: ' + name); return e ? F.fromEntry(e) : null; };
  try {
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    BS.fetch = () => Promise.reject(new Error('sem rede no teste'));
    await BS.load();
    // ===== Tarrasque =====
    let a = await fromBook('Tarrasque', 'MM'); await W(200);
    a = F.actors[a.id];
    ok(a.sistema === '5e' && a.dnd5e.npc && $('.f5-npc') && $('.f5-sb'), 'Tarrasque vira ficha de criatura');
    const t = txt();
    for (const s of ['Classe de Armadura 25 (natural armor)', 'Pontos de Vida 676 (33d20 + 330)', '30 (+10)', 'Int +5', 'Sab +9', 'Car +9', 'Imunidades a dano fire, poison; bludgeoning, piercing, slashing from nonmagical attacks',
      'Imunidades a condições charmed, frightened, paralyzed, poisoned', 'blindsight 36 m', 'Percepção passiva 10', '30 (155.000 XP)', 'Proficiência +9', 'Legendary Resistance (3/Day)', 'Ações lendárias'])
      ok(t.includes(s), 'bloco mostra: ' + s);
    log.push('Tarrasque: ' + $$('.f5-sb-line').slice(0, 4).map((x) => x.textContent).join(' | '));
    if (shot === 'shot') { await W(300); return; }
    // Mordida: acerto e dano clicáveis
    const bite = $$('.f5-sb-item').find((x) => /^Bite\b/.test((x.querySelector('.f5-card-name') || x).textContent)); // Plano 82: o nome fica no cartão, sem o ponto
    ok(bite && /\+19/.test(bite.textContent) && /4d12\+10 perfurante/.test(bite.textContent), 'Mordida +19, 4d12+10 perfurante');
    bite.querySelector('[data-roll="atk"]').click(); await W(60);
    ok(/Bite: ataque/.test($('#fp-rolls').textContent), 'rolou a Mordida');
    ok(a.actions.find((x) => x.name === 'Bite').attack === '1d20+19', 'ação da mesa 1d20+19');
    // Usos: Resistência Lendária e ações lendárias
    $$('[data-use-pip]')[0].click(); await W(60);
    ok(F.actors[a.id].dnd5e.npc.traits.find((x) => /Legendary Resistance/.test(x.name)).uses.cur === 0, 'marcar a Resistência Lendária (clicar no 1º pip zera)');
    $$('[data-leg]')[2].click(); await W(60);
    ok(F.actors[a.id].dnd5e.npc.legendaryUsed === 1, 'gastar uma ação lendária');
    // Salvaguarda clicável
    $('[data-sv="wis"]').click(); await W(60);
    ok(/Salvaguarda de Sabedoria/.test($('#fp-rolls').textContent) && /\+ ?9|\+9/.test($('#fp-rolls').textContent), 'salvaguarda de Sabedoria +9');
    junk('Tarrasque');
    // Editar: CA 26 e uma ação nova
    await click('[data-act="npc-edit"]', 'editar');
    if (shot === 'shotedit') { await W(300); return; }
    await change($('[data-f="npc-ac"]'), '26', 'CA');
    await click('[data-act="npc-done"]', 'pronto');
    ok($('[data-box="ac"] > b').textContent === '26' && F.actors[a.id].stats.find((s) => s.name === 'Defesa').value === 26, 'CA editada');
    // Descrição
    $('[data-tab5="desc"]').click(); await W(60);
    ok($('[data-f="bio-notas"]'), 'aba Descrição');
    $('[data-tab5="bloco"]').click(); await W(60);
    // ===== Dragão vermelho adulto: recarga =====
    a = await fromBook('Adult Red Dragon', 'MM'); await W(200);
    const breath = $$('.f5-sb-item').find((x) => /^Fire Breath/.test(x.textContent));
    ok(breath && /CD 21 Des/.test(breath.textContent) && /18d6 fogo/.test(breath.textContent) && breath.querySelector('[data-act="recharge"]'), 'sopro com CD, dano e recarga');
    breath.querySelector('[data-act="recharge"]').click(); await W(60);
    ok(/Fire Breath: recarga/.test($('#fp-rolls').textContent), 'rolou a recarga');
    const fb = F.actors[a.id].actions.find((x) => /Fire Breath/.test(x.name));
    ok(fb.mode === 'save' && fb.dc === '21' && fb.save === 'Destreza' && fb.area === 12 && fb.parts[0].type === 'fire', 'sopro na mesa');
    log.push('Dragão: ' + F.actors[a.id].actions.map((x) => x.name + ' ' + (x.attack || 'CD ' + x.dc)).join(', '));
    // ===== Lich: conjuração com o texto do cadastro =====
    a = await fromBook('Lich', 'MM'); await W(200);
    ok($('.f5-sb-cast') && /CD 20/.test($('.f5-sb-cast').textContent) && /\+12 ataque/.test($('.f5-sb-cast').textContent), 'conjuração do Lich: CD 20, +12');
    const fbBtn = $$('.f5-sb-spell').find((x) => /^fireball/i.test(x.textContent));
    ok(fbBtn, 'Fireball na lista');
    fbBtn.closest('.f5-sb-spell-entry').querySelector('.f5-spell-book-btn').click();
    for (let i = 0; i < 100 && !/streak|explodes/i.test($('#f5-spell-book')?.textContent || ''); i++) await W(50);
    ok(/streak|explodes/i.test($('#f5-spell-book')?.textContent || '') && /higher|level/i.test($('#f5-spell-book')?.textContent || ''), 'livro da criatura mostra descrição e níveis superiores');
    ok(!$('.f5-sb-sptext'), 'livro não expande o nome da magia');
    App.Ficha5e.closeSpellBook();
    fbBtn.click();
    for (let i = 0; i < 100 && !(($('.f5-sb-sptext') || {}).textContent || '').match(/streak|explodes/i); i++) await W(50);
    ok(/streak|explodes/i.test(($('.f5-sb-sptext') || {}).textContent || ''), 'texto da Fireball do cadastro');
    ok($$('[data-sp-pip]').length >= 18, 'espaços do Lich marcáveis');
    if (shot === 'shotlich') { await W(300); return; }
    junk('Lich');
    // ===== Criatura do zero =====
    const z = F.newActor('monster', '5e'); await W(80);
    ok($('.f5-npc') && F.actors[z.id].dnd5e.npc, 'criatura nova com bloco');
    await click('[data-act="npc-edit"]');
    await click('[data-add5="actions"]', 'nova ação');
    await change($('[data-f="ne-name-actions0"]'), 'Mordida');
    await change($('[data-f="ne-kind-actions0"]'), 'attack');
    await change($('[data-f="ne-hit-actions0"]'), '5');
    $$('.f5-npc-edit[data-edit5="actions0"] .btn').find((b) => /Dano/.test(b.textContent)).click(); await W(60);
    const zz = F.actors[z.id];
    ok(zz.actions.length === 1 && zz.actions[0].attack === '1d20+5' && zz.actions[0].damage === '1d6', 'ação nova vira ação da mesa: ' + JSON.stringify(zz.actions[0]));
    await click('[data-act="npc-done"]');
    junk('criatura nova');
    // ===== Ficha antiga (genérica com dados5e) importada → convertida =====
    const m = await BS.full(BS.list.find((x) => x.n === 'Goblin' && x.s === 'MM'));
    const old = { format: 'mesarpg-actor', version: 1, actor: { id: 'x', kind: 'monster', name: 'Goblin antigo', bars: [{ name: 'PV', value: 3, max: 7 }], stats: [{ name: 'Defesa', value: 15 }], actions: [], notes: '', source: '5etools', dados5e: m } };
    const imp = F.importObj(old); await W(100);
    ok(imp.sistema === '5e' && imp.dnd5e.npc && imp.bars[0].value === 3 && imp.actions.some((x) => x.name === 'Scimitar'), 'ficha antiga convertida (PV 3 mantido)');
    ok(document.documentElement.scrollWidth <= innerWidth + 1 && $('#fp-main').scrollWidth <= $('#fp-main').clientWidth + 1, 'sem rolagem lateral');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 300));
