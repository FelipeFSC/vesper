// Plano 51 (parte B): assistente de personagem na página Criar ficha (rodar com -page 'ficha.html' -query '' -budget 240000)
// #shot = foto da aba Escolhas do Wizard; #shotclasse, #shotatrib, #shotmagias, #shotresumo, #shotup = foto daquela etapa
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.confirm = () => true;
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const F = App.Ficha, A5 = App.Assist5e, ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const change = async (el, v, what) => { ok(el, 'campo ' + (what || v)); if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(40); };
  const click = async (sel, what) => { const el = $(sel); ok(el, 'achou ' + (what || sel)); if (el) el.click(); await W(40); return el; };
  const junk = (where) => { const p = $('.a5-pane'); if (p) ok(!/\bnull\b|\bundefined\b|\bNaN\b|\[object/.test(p.innerText), 'texto estranho no assistente (' + where + '): ' + (p.innerText.match(/.{0,30}(null|undefined|NaN|\[object).{0,20}/) || [''])[0]); };
  const step = async (id) => { junk('antes de ' + id); await click('[data-step="' + id + '"]', 'etapa ' + id); junk(id); };
  const pickModal = async (q, id) => {
    for (let i = 0; i < 200 && !$('.f5-pick-item'); i++) await W(50);
    const inp = $('.f5-pick input[data-f="f5-pick-q"]'); inp.value = q; inp.dispatchEvent(new Event('input')); await W(30);
    const b = $('.f5-pick-item[data-id="' + id + '"]'); ok(b, 'no seletor: ' + id);
    if (b) b.click(); else $('.f5-pick-back').remove();
    await W(60);
  };
  const shot = location.hash.replace('#', '');
  const pend = () => A5.needs().filter((c) => !A5.st.ch[c.key] || !(['ability', 'asi'].includes(c.type) ? true : [].concat(A5.st.ch[c.key]).length >= c.count)).map((c) => c.key);
  try {
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    // ===== Wizard 5 (2024), High Elf, Sage =====
    [...$$('.fp-empty .btn')].find((b) => /personagem/i.test(b.textContent)).click(); await W(30);
    await click('[data-sys="5e-assist"]', 'opção passo a passo');
    for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50);
    ok($('.a5') && $$('.a5-steps button').length >= 8, 'assistente aberto com as etapas');
    await change($('[data-f="a5-name"]'), 'Lia Folhaverde');
    await change($('[data-f="a5-level"]'), '5');
    await step('classe');
    await click('.a5-item[data-id="wizard-xphb"]', 'Wizard 2024');
    await click('[data-sub="wizard-xphb--evoker-xphb"]', 'Evoker');
    ok(A5.st.classId === 'wizard-xphb' && A5.st.subId === 'wizard-xphb--evoker-xphb', 'classe e subclasse');
    if (shot === 'shotclasse') { await W(300); return; }
    await step('especie');
    await click('.a5-item[data-id="elf-xphb"]', 'Elf 2024');
    await change($('[data-f="a5-spopt"]'), 'High Elf Lineage', 'linhagem');
    await step('antecedente');
    await click('.a5-item[data-id="sage-xphb"]', 'Sage 2024');
    // Atributos: conjunto padrão + origem (+2 Int, +1 Con)
    await step('atributos');
    const std = { int: 15, con: 14, dex: 13, wis: 12, cha: 10, str: 8 };
    for (const [k, v] of Object.entries(std)) await click('[data-std="' + k + '=' + v + '"]', 'padrão ' + k);
    await change($('[data-f="a5-w-bg:ab0"]'), 'int', '+2');
    await change($('[data-f="a5-w-bg:ab1"]'), 'con', '+1');
    let P = A5.preview();
    ok(P.d.abil.int === 17 && P.d.abil.con === 15 && P.d.abil.str === 8, 'atributos com a origem (Int 17, Con 15): ' + JSON.stringify(P.d.abil));
    if (shot === 'shotatrib') { await W(300); return; }
    // Escolhas
    await step('escolhas');
    const keys = A5.needs().map((c) => c.key + '(' + c.type + ')');
    log.push('escolhas do Wizard 5: ' + keys.join(', '));
    await click('[data-ch="cls:pf1=investigation"]', 'perícia 1'); await click('[data-ch="cls:pf1=medicine"]', 'perícia 2');
    await click('[data-ch="sp:pf0=perception"]', 'Keen Senses');
    await click('[data-ch="sp:sab=int"]', 'atributo das magias do elfo');
    await click('[data-asi="asi:4=asi"]', 'ASI'); await click('[data-ab="asi:4=int"]', '+2 Int');
    // Magic Initiate (Wizard) do Sage: atributo e magias à escolha
    const mi = A5.needs().filter((c) => /^ft:bgft:0/.test(c.key));
    log.push('Magic Initiate: ' + mi.map((c) => c.key + ' ' + c.type + ' ' + c.count).join(', '));
    ok(mi.some((c) => c.type === 'spell') && !mi.some((c) => c.type === 'group'), 'Magic Initiate já na lista Wizard (sem perguntar a lista)');
    const abKey = mi.find((c) => c.kind === 'abil'); if (abKey) await click('[data-ch="' + abKey.key + '=int"]', 'atributo do Magic Initiate');
    for (const c of A5.needs().filter((x) => x.type === 'spell')) {
      const want = /0\|/.test(c.filter) || /level=0/.test(c.filter) ? ['mage-hand-xphb', 'minor-illusion-xphb', 'light-xphb'] : ['magic-missile-xphb', 'sleep-xphb', 'shield-xphb'];
      for (let i = 0; i < c.count; i++) { await click('[data-pick="' + c.key + '"]', 'magia ' + c.key); await pickModal(want[i].split('-xphb')[0].replace(/-/g, ' '), want[i]); }
    }
    if (shot === 'shot') { await W(300); return; }
    P = A5.preview();
    ok(P.d.abil.int === 19, 'ASI +2 Int (19)');
    log.push('pendentes: ' + JSON.stringify(Object.values(A5.warnings()).flat()));
    // Magias da classe: 4 truques, 9 preparadas
    await step('magias');
    const secs = $$('.a5-pane .f5-sec').filter((s) => s.querySelector('.a5-spell-list'));
    ok(secs.length === 2, 'truques e preparadas');
    for (const [sx, n] of [[secs[0], 4], [secs[1], 9]]) { for (let i = 0; i < n; i++) { const cb = [...document.querySelectorAll('.a5-pane .f5-sec')].filter((s) => s.querySelector('.a5-spell-list'))[sx === secs[0] ? 0 : 1].querySelectorAll('.a5-spell:not(.on) input')[0]; cb.click(); await W(30); } }
    ok(A5.st.spells.cantrips.length === 4 && A5.st.spells.list.length === 9, 'magias escolhidas (' + A5.st.spells.cantrips.length + ', ' + A5.st.spells.list.length + ')');
    if (shot === 'shotmagias') { await W(300); return; }
    await step('equip');
    for (let i = 0; i < 300 && !$('[data-eq]'); i++) await W(50);
    await click('[data-eq="cls0=A"]', 'pacote A da classe'); await click('[data-eq="bg0=A"]', 'pacote A do antecedente');
    await step('resumo');
    junk('resumo');
    const W1 = A5.warnings();
    log.push('avisos no resumo: ' + JSON.stringify(W1));
    ok(!Object.keys(W1).length, 'sem avisos');
    if (shot === 'shotresumo') { await W(300); return; }
    await click('[data-act="finish"]', 'Criar ficha'); await W(400);
    let a = Object.values(F.actors).find((x) => x.name === 'Lia Folhaverde');
    ok(a && a.sistema === '5e', 'ficha criada pelo assistente');
    let d = a.dnd5e, c = App.Regras5e.calc(a);
    ok(d.classes[0].name === 'Wizard' && d.classes[0].level === 5 && d.classes[0].sub && d.classes[0].sub.name === 'Evoker', 'Wizard 5 Evoker');
    ok(c.hpMax === 6 + 4 * 4 + 2 * 5 && a.bars[0].value === c.hpMax, 'PV 32 e cheio: ' + c.hpMax + ' / ' + a.bars[0].value);
    ok(d.skills.arcana === 1 && d.skills.history === 1 && d.skills.investigation === 1 && d.skills.medicine === 1 && d.skills.perception === 1, 'perícias');
    ok(d.saves.int && d.saves.wis && d.sentidos.darkvision === 18 && d.especie.option === 'High Elf Lineage', 'salvaguardas, visão no escuro, linhagem');
    ok(d.talentos.some((t) => t.name.startsWith('Magic Initiate')), 'talento do antecedente');
    const names = d.magia.list.map((s) => s.name);
    ok(names.includes('Detect Magic') && names.includes('Misty Step') && names.includes('Mage Hand') && names.includes('Magic Missile'), 'magias da linhagem e do Magic Initiate');
    ok(d.itens.some((x) => x.name === 'Quarterstaff') && d.moedas.gp > 0, 'equipamento e ouro');
    ok(d.caract.some((f) => f.name === 'Potent Cantrip') && d.caract.some((f) => f.name === 'Arcane Recovery') && d.caract.some((f) => f.source === 'Espécie'), 'características');
    log.push('Lia: ' + d.classes[0].name + ' ' + d.classes[0].level + ' · PV ' + c.hpMax + ' · CA ' + c.ac + ' · Int ' + d.abil.int + ' · CD ' + c.spell.dc + ' · magias ' + names.length + ' · itens ' + d.itens.map((x) => x.name).join(', ') + ' · PO ' + d.moedas.gp);
    // Dano antes de subir: o PV atual cai
    a.bars[0].value = 20;
    // ===== Subir para o nível 6 =====
    F.render(); await W(60);
    await click('[data-act="level-up"]', 'Subir de nível');
    for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50);
    ok(A5.st.mode === 'up' && A5.st.fromLevel === 5 && A5.st.level === 6, 'subir 5 → 6');
    ok(!$('[data-step="especie"]') && !$('[data-step="equip"]'), 'sem espécie, antecedente e equipamento ao subir');
    log.push('escolhas no nível 6: ' + A5.needs().map((x) => x.key).join(', ') + ' · avisos ' + JSON.stringify(A5.warnings()));
    await step('magias');
    const sec2 = $$('.a5-pane .f5-sec').filter((s) => s.querySelector('.a5-spell-list'));
    const prepSec = sec2[sec2.length - 1];
    prepSec.querySelector('.a5-spell:not(.on) input').click(); await W(40);
    if (shot === 'shotup') { await step('resumo'); await W(300); return; }
    await click('[data-act="finish"]', 'Aplicar'); await W(300);
    a = F.actors[a.id]; d = a.dnd5e; c = App.Regras5e.calc(a);
    ok(d.classes[0].level === 6 && c.hpMax === 32 + 4 + 2, 'nível 6, PV 38: ' + c.hpMax);
    ok(a.bars[0].value === 26, 'PV atual ganhou a diferença (20 + 6 = 26): ' + a.bars[0].value);
    ok(d.magia.list.length === names.length + 1 && d.itens.some((x) => x.name === 'Quarterstaff'), 'uma magia a mais, itens mantidos');
    log.push('Lia nível 6: PV ' + a.bars[0].value + '/' + c.hpMax + ' · magias ' + d.magia.list.length);

    // ===== Fighter 4 (2014), anão da colina, soldado, estilo de luta e Tough =====
    F.select(null); await W(30);
    [...$$('.fp-empty .btn')].find((b) => /personagem/i.test(b.textContent)).click(); await W(30);
    await click('[data-sys="5e-assist"]', 'passo a passo 2');
    for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50);
    await change($('[data-f="a5-name"]'), 'Torvin');
    await change($('[data-f="a5-ed"]'), '2014', 'edição');
    await change($('[data-f="a5-level"]'), '4');
    await step('classe'); await click('.a5-item[data-id="fighter-phb"]', 'Fighter 2014');
    await step('especie'); await click('.a5-item[data-id="dwarf-phb"]', 'Dwarf 2014');
    await change($('[data-f="a5-spopt"]'), 'Hill', 'Hill');
    await step('antecedente'); await click('.a5-item[data-id="soldier-phb"]', 'Soldier 2014');
    await step('atributos');
    await click('[data-method="pointbuy"]', 'compra de pontos');
    await change($('[data-f="a5-pb-str"]'), '15', 'For 15'); await change($('[data-f="a5-pb-con"]'), '14', 'Con 14'); await change($('[data-f="a5-pb-dex"]'), '13', 'Des 13');
    P = A5.preview();
    ok(A5.st.base.str === 15 && A5.st.base.con === 14 && P.d.abil.con === 16 && P.d.abil.wis === 9, 'compra de pontos e anão da colina (+2 Con, +1 Sab): ' + JSON.stringify(P.d.abil));
    log.push('compra: ' + JSON.stringify(A5.st.base) + ' · avisos atributos ' + JSON.stringify(A5.warnings().atributos || []));
    await step('escolhas');
    log.push('escolhas do Fighter 4: ' + A5.needs().map((x) => x.key + '(' + x.type + ')').join(', '));
    await click('[data-ch="cls:pf2=perception"]', 'perícia 1'); await click('[data-ch="cls:pf2=survival"]', 'perícia 2');
    const fs = A5.needs().find((x) => x.type === 'option');
    ok(fs, 'estilo de luta (opção FS:F)');
    if (fs) { await click('[data-pick="' + fs.key + '"]', 'escolher estilo'); await pickModal('defense', 'defense-phb'); }
    await click('[data-asi="asi:4=feat"]', 'talento no 4');
    await click('[data-pickfeat="asi:4"]', 'escolher talento'); await pickModal('tough', 'tough-phb');
    const txt = A5.needs().filter((x) => x.type === 'text');
    for (const t of txt) { const inp = $('[data-f="a5-t-' + t.key + '0"]'); await change(inp, t.kind === 'language' ? 'Giant' : 'Dice Set', t.key); }
    const tool = A5.needs().find((y) => y.key === 'sp:pf0');
    if (tool) await click('[data-ch="sp:pf0=' + tool.opts[0].v + '"]', 'ferramenta do anão');
    await step('classe'); await click('[data-sub="fighter-phb--champion-phb"]', 'Champion');
    await step('equip');
    for (let i = 0; i < 300 && !$('[data-eq]'); i++) await W(50);
    await click('[data-eq="cls0=A"]', 'Chain Mail'); await click('[data-eq="cls1=A"]', 'arma marcial e escudo');
    await change($('[data-f="a5-eqp-cls10"]'), 'longsword-phb', 'arma marcial');
    log.push('avisos do Fighter: ' + JSON.stringify(A5.warnings()));
    ok(!Object.keys(A5.warnings()).length, 'Fighter sem avisos');
    await step('resumo');
    await click('[data-act="finish"]', 'Criar Torvin'); await W(400);
    a = Object.values(F.actors).find((x) => x.name === 'Torvin');
    d = a.dnd5e; c = App.Regras5e.calc(a);
    ok(d.edicao === '2014' && d.classes[0].name === 'Fighter' && d.especie.option === 'Hill', 'Torvin 2014');
    ok(d.hp.perLevel === 3, 'PV extra por nível: Dwarven Toughness 1 + Tough 2 = 3 (' + d.hp.perLevel + ')');
    ok(c.hpMax === 10 + 3 + 3 * (6 + 3) + 3 * 4, 'PV 52 (Con 16): ' + c.hpMax);
    ok(d.caract.some((f) => f.name === 'Defense') && d.talentos.some((t) => t.name === 'Tough'), 'estilo de luta e talento');
    ok(c.ac === 18 + 1 || c.ac === 18, 'CA com Chain Mail e escudo: ' + c.ac);
    ok(d.itens.some((x) => x.name === 'Longsword') && d.attacks.some((x) => x.name === 'Longsword'), 'arma marcial escolhida vira ataque');
    ok(/Giant/.test(d.prof.langs) || /Dice/.test(d.prof.tools), 'idioma ou jogo escrito');
    log.push('Torvin: PV ' + c.hpMax + ' · CA ' + c.ac + ' · For ' + d.abil.str + ' Con ' + d.abil.con + ' · ' + d.talentos.map((t) => t.name).join(', ') + ' · ' + d.itens.map((x) => x.name).join(', '));
    ok(!/\bnull\b|\bundefined\b|\bNaN\b/.test($('.f5').innerText), 'sem texto estranho na ficha');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 300));
