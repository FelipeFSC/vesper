// Plano 52: multiclasse na ficha 5e e no assistente (rodar com -page 'ficha.html' -query '' -budget 240000)
// #shot = foto da Principal com duas classes; #shotup = foto da etapa "Em qual classe?"; #shotmag = foto das Magias com duas classes
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.confirm = () => true;
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const F = App.Ficha, A5 = App.Assist5e, R = App.Regras5e, ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const change = async (el, v, what) => { ok(el, 'campo ' + (what || v)); if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(40); };
  const click = async (sel, what) => { const el = $(sel); ok(el, 'achou ' + (what || sel)); if (el) el.click(); await W(50); return el; };
  const waitA5 = async () => { for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50); };
  const pickModal = async (q, id) => {
    for (let i = 0; i < 200 && !$('.f5-pick-item'); i++) await W(50);
    const inp = $('.f5-pick input[data-f="f5-pick-q"]'); inp.value = q; inp.dispatchEvent(new Event('input')); await W(30);
    const b = $('.f5-pick-item[data-id="' + id + '"]'); ok(b, 'no seletor: ' + id);
    if (b) b.click(); else $('.f5-pick-back').remove();
    await W(80);
  };
  const junk = (where) => { const t = ($('.a5-pane') || $('.f5')).innerText; ok(!/\bnull\b|\bundefined\b|\bNaN\b|\[object/.test(t), 'texto estranho (' + where + ')'); };
  const checkSpells = async (n0, n1) => {
    await click('[data-step="magias"]', 'etapa magias');
    const secs = () => $$('.a5-pane .f5-sec').filter((s) => s.querySelector('.a5-spell-list'));
    for (let i = 0; i < n0; i++) { secs()[0].querySelector('.a5-spell:not(.on) input').click(); await W(30); }
    for (let i = 0; i < n1; i++) { secs()[secs().length - 1].querySelector('.a5-spell:not(.on) input').click(); await W(30); }
  };
  const shot = location.hash.replace('#', '');
  try {
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    // ===== Fighter 2 (2024) pelo assistente, Int 8 =====
    [...$$('.fp-empty .btn')].find((b) => /personagem/i.test(b.textContent)).click(); await W(30);
    await click('[data-sys="5e-assist"]'); await waitA5();
    A5.set((s) => { s.name = 'Bran'; s.level = 2; s.method = 'manual'; s.manual = { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }; s.classId = 'fighter-xphb'; s.speciesId = 'human-xphb'; s.bgId = 'soldier-xphb'; s.tab = 'resumo'; });
    await W(60);
    await click('[data-act="finish"]', 'criar Bran'); await W(500);
    let a = Object.values(F.actors).find((x) => x.name === 'Bran');
    ok(a && a.dnd5e.classes.length === 1 && a.dnd5e.classes[0].level === 2, 'Fighter 2 criado');
    // ===== Sobe 3 níveis em Wizard (multiclasse) =====
    await click('[data-act="level-up"]', 'Subir de nível'); await waitA5();
    ok(A5.st.tab === 'classe' && $('.a5-which'), 'subir começa em "Em qual classe?"');
    await click('[data-up="nova"]', 'classe nova');
    for (let i = 0; i < 100 && !$('.a5-item[data-id="wizard-xphb"]'); i++) await W(50);
    await click('.a5-item[data-id="wizard-xphb"]', 'Wizard');
    let W1 = A5.warnings();
    ok((W1.classe || []).some((m) => /Multiclasse em Wizard pede INT 13/.test(m)), 'aviso de Int 13: ' + JSON.stringify(W1.classe));
    if (shot === 'shotup') { await W(300); return; }
    await click('[data-step="regras"]'); await change($('[data-f="a5-level"]'), '5', 'subir até o 5');
    ok(A5.clsTo() === 3, 'Wizard 1 → 3');
    await click('[data-step="classe"]'); await click('[data-sub="wizard-xphb--evoker-xphb"]', 'Evoker');
    const keys = A5.needs().map((c) => c.key);
    log.push('escolhas do Wizard 1–3: ' + (keys.join(', ') || '(nenhuma)') + ' · avisos ' + JSON.stringify(A5.warnings()));
    ok(!keys.some((k) => /^asi/.test(k)), 'sem ASI no Wizard 3');
    await checkSpells(3, 6);
    junk('magias do Wizard');
    await click('[data-step="resumo"]'); junk('resumo');
    await click('[data-act="finish"]', 'aplicar Wizard'); await W(500);
    a = F.actors[a.id];
    let d = a.dnd5e, c = R.calc(a);
    ok(d.classes.map((x) => x.name + ' ' + x.level).join('/') === 'Fighter 2/Wizard 3' && d.classes[1].sub && d.classes[1].sub.name === 'Evoker', 'Fighter 2 / Wizard 3 (Evoker)');
    ok(c.hpMax === 38 && c.pb === 3 && c.hdTxt === '2d10 + 3d6', 'PV 38, +3, 2d10 + 3d6: ' + c.hpMax + ' ' + c.pb + ' ' + c.hdTxt);
    ok(d.saves.str && d.saves.con && !d.saves.int && !d.saves.wis, 'salvaguardas só do Fighter');
    ok(c.spell.slots.slice(0, 2).join('/') === '4/2' && c.spell.dc === 10, 'espaços 4/2 e CD de Wizard 10 (Int 8)');
    ok(d.magia.list.filter((s) => s.cls === 'Wizard').length === 9, 'magias marcadas como de Wizard');
    ok(d.caract.some((f) => f.name === 'Arcane Recovery') && d.caract.some((f) => f.name === 'Second Wind') && !d.caract.some((f) => f.name === 'Memorize Spell'), 'características pelo nível de cada classe');
    log.push('Bran: ' + d.classes.map((x) => x.name + ' ' + x.level).join(' / ') + ' · PV ' + a.bars[0].value + '/' + c.hpMax + ' · ' + c.hdTxt + ' · espaços ' + c.spell.slots.filter(Boolean).join('/') + ' · CD ' + c.spell.dc + ' · magias ' + d.magia.list.length);
    // ===== Sobe 2 níveis em Fighter (2 → 4): subclasse e ASI no 4º nível de Fighter =====
    await click('[data-act="level-up"]', 'Subir de nível 2'); await waitA5();
    await click('[data-up="0"]', 'subir em Fighter');
    await click('[data-step="regras"]'); await change($('[data-f="a5-level"]'), '7', 'subir até o 7');
    ok(A5.clsTo() === 4, 'Fighter 2 → 4');
    const k2 = A5.needs().map((x) => x.key);
    ok(k2.includes('asi:4'), 'ASI no 4º nível de Fighter: ' + k2.join(', '));
    await click('[data-step="classe"]'); await click('[data-sub="fighter-xphb--champion-xphb"]', 'Champion');
    await click('[data-step="escolhas"]'); await click('[data-asi="asi:4=asi"]'); await click('[data-ab="asi:4=con"]', '+2 Con');
    ok(!$('[data-step="magias"]') || !A5.warnings().magias, 'Fighter não pede magias');
    await click('[data-step="resumo"]');
    await click('[data-act="finish"]', 'aplicar Fighter'); await W(500);
    a = F.actors[a.id]; d = a.dnd5e; c = R.calc(a);
    ok(d.classes.map((x) => x.name + ' ' + x.level).join('/') === 'Fighter 4/Wizard 3' && d.abil.con === 16, 'Fighter 4 / Wizard 3, Con 16');
    ok(c.hpMax === 10 + 3 + 3 * (6 + 3) + 3 * (4 + 3), 'PV com Con 16: ' + c.hpMax);
    log.push('Bran nível 7: ' + d.classes.map((x) => x.name + ' ' + x.level).join(' / ') + ' · PV ' + a.bars[0].value + '/' + c.hpMax + ' · ' + c.hdTxt);
    // Tela: duas linhas de classe, gastar d10 e d6
    ok($$('.f5-clsrow').length === 2 && $('[data-act="add-class"]'), 'duas linhas de classe e "+ Classe"');
    ok(/4d10 \+ 3d6/.test($('[data-box="hp"]') ? document.querySelector('.f5-top').textContent : ''), 'topo com os dados por tipo');
    if (shot === 'shot') { await W(300); return; }
    junk('principal');
    $('[data-tab5="acoes"]').click(); await W(60);
    ok($('[data-die="10"]') && $('[data-die="6"]'), 'gastar d10 e d6');
    $('[data-die="6"]').click(); await W(60);
    ok(F.actors[a.id].dnd5e.hp.hdUsedBy[6] === 1, 'gastou um d6');
    // ===== Cleric 3 / Wizard 3 à mão =====
    const m = F.newActor('pc', '5e'); await W(60);
    await click('[data-act="pick-class"]'); await pickModal('cleric', 'cleric-xphb');
    await change($('[data-f="nivel"]'), '3', 'Cleric 3');
    await change($('[data-f="abil-wis"]'), '16'); await change($('[data-f="abil-int"]'), '14');
    await click('[data-act="add-class"]'); await pickModal('wizard', 'wizard-xphb');
    await change($('[data-f="nivel-1"]'), '3', 'Wizard 3');
    let x = F.actors[m.id]; c = R.calc(x);
    ok(x.dnd5e.classes.length === 2 && c.level === 6 && c.spell.casterLevel === 6 && c.spell.slots.slice(0, 3).join('/') === '4/3/3', 'Cleric 3 / Wizard 3: conjurador 6, espaços 4/3/3');
    ok(x.dnd5e.saves.wis && x.dnd5e.saves.cha && !x.dnd5e.saves.int, 'salvaguardas só do Cleric');
    $('[data-tab5="magias"]').click(); await W(60);
    ok($$('[data-caster]').length === 2, 'dois quadros de conjuração');
    await click('[data-act="spell-add"]'); await pickModal('fireball', 'fireball-xphb');
    await click('[data-act="spell-add"]'); await pickModal('sacred flame', 'sacred-flame-xphb');
    x = F.actors[m.id]; c = R.calc(x);
    const fb = x.dnd5e.magia.list.find((s) => s.name === 'Fireball'), sf = x.dnd5e.magia.list.find((s) => s.name === 'Sacred Flame');
    ok(fb && fb.cls === 'Wizard' && sf && sf.cls === 'Cleric', 'cada magia com a sua classe: ' + (fb && fb.cls) + ', ' + (sf && sf.cls));
    const aFb = x.actions.find((y) => y.name === 'Fireball'), aSf = x.actions.find((y) => y.name === 'Sacred Flame');
    ok(aFb && aFb.dc === '13' && aSf && aSf.dc === '14', 'CD por classe: Fireball 13 (Int), Sacred Flame 14 (Sab): ' + (aFb && aFb.dc) + ', ' + (aSf && aSf.dc));
    log.push('Cleric 3 / Wizard 3: espaços ' + c.spell.slots.filter(Boolean).join('/') + ' · ' + c.casters.map((y) => y.name + ' CD ' + y.dc).join(', ') + ' · tags ' + $$('.f5-spcls').map((t) => t.textContent).join(','));
    if (shot === 'shotmag') { await W(300); return; }
    junk('magias');
    ok(document.documentElement.scrollWidth <= innerWidth + 1 && $('#fp-main').scrollWidth <= $('#fp-main').clientWidth + 1, 'sem rolagem lateral');
    // Tirar a classe
    $('[data-tab5="principal"]').click(); await W(60);
    await click('[data-act="del-class-1"]', 'tirar Wizard');
    ok(F.actors[m.id].dnd5e.classes.length === 1 && R.calc(F.actors[m.id]).spell.slots.slice(0, 2).join('/') === '4/2', 'tirar a classe volta para Cleric 3 (espaços 4/2)');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 300));
