// Plano 54: etapa Atributos do assistente no modelo do Roll20 (rodar com -page 'ficha.html' -query '' -budget 150000)
// #shot = foto do conjunto padrão; #shotpb = compra de pontos; #shotroll = rolar; #shotman = digitar
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
  const card = (k) => $('[data-card="' + k + '"]');
  const shield = (k) => (card(k).querySelector('.a5-shield') || {}).textContent || '';
  const junk = (where) => { const p = $('.a5-pane'); ok(p && !/\bnull\b|\bundefined\b|\bNaN\b|\[object/.test(p.innerText), 'texto estranho (' + where + ')'); };
  const shot = location.hash.replace('#', '');
  try {
    // As duas tabelas do livro (modificador e proficiência)
    const MOD = [[1, -5], [2, -4], [3, -4], [4, -3], [5, -3], [6, -2], [7, -2], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [13, 1], [14, 2], [15, 2], [16, 3], [17, 3], [18, 4], [19, 4], [20, 5], [21, 5], [22, 6], [23, 6], [24, 7], [25, 7], [26, 8], [27, 8], [28, 9], [29, 9], [30, 10]];
    ok(MOD.every(([v, m]) => R.mod(v) === m), 'tabela de modificadores de 1 a 30');
    const PB = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
    const pbOf = (L) => { const a = { bars: [], dnd5e: R.blank() }; a.dnd5e.classes[0].level = L; return R.calc(a).pb; };
    ok(PB.every((p, i) => pbOf(i + 1) === p), 'tabela de proficiência por nível');
    log.push('tabelas do livro: modificador 1–30 e proficiência 1–20 conferem');
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    [...$$('.fp-empty .btn')].find((b) => /personagem/i.test(b.textContent)).click(); await W(30);
    await click('[data-sys="5e-assist"]');
    for (let i = 0; i < 200 && !$('.a5-steps'); i++) await W(50);
    ok(!$('[data-f="a5-method"]'), 'o método saiu da etapa Regras');
    A5.set((s) => { s.classId = 'wizard-xphb'; s.bgId = 'sage-xphb'; s.speciesId = 'elf-xphb'; });
    await click('[data-step="atributos"]');
    ok($$('[data-method]').length === 4 && $('[data-method="standard"]').classList.contains('on'), 'abas de método, padrão primeiro');
    ok($$('.a5-card').length === 6 && /!/.test(shield('str')), 'seis cartões, "!" sem valor');
    ok(A5.warnings().atributos && /Falta o valor/.test(A5.warnings().atributos.join(' ')), 'aviso de atributo sem valor');
    // Conjunto padrão: 15 em Int, depois 15 em For (troca)
    await click('[data-std="int=15"]');
    ok(/\+2/.test(shield('int')) && $('[data-std="str=15"]').classList.contains('used'), '15 em Int: +2, e o 15 fica apagado nos outros');
    await click('[data-std="str=15"]');
    ok(A5.st.std.str === 15 && A5.st.std.int == null, 'clicar no 15 de For troca: For 15, Int vazio');
    await click('[data-std="int=14"]');
    for (const [k, v] of [['dex', 13], ['con', 12], ['wis', 10], ['cha', 8]]) await click('[data-std="' + k + '=' + v + '"]');
    ok(!A5.warnings().atributos || !/Falta o valor/.test(A5.warnings().atributos.join(' ')), 'todos escolhidos');
    // Origem (Sage): +2 Int, +1 Con, nos cartões
    await change($('[data-f="a5-w-bg:ab0"]'), 'int', '+2'); await change($('[data-f="a5-w-bg:ab1"]'), 'con', '+1');
    ok(/14 \+ 2 = 16/.test(card('int').textContent) && /\+3/.test(shield('int')) && /16/.test(shield('int')), 'Int 14 + 2 = 16 (+3) no cartão: ' + card('int').textContent);
    ok($('.a5-orig') && /Sage/.test($('.a5-orig').textContent), 'aumento da origem na coluna da esquerda');
    // Botão "i"
    await click('[data-info="dex"]');
    ok(/Acrobacia/.test(card('dex').textContent) && /iniciativa/.test(card('dex').textContent), 'botão i: Destreza e as perícias');
    log.push('padrão: ' + R.AB.map((k) => R.AB_SH[k] + ' ' + shield(k).replace(/\s+/g, ' ')).join(' · '));
    if (shot === 'shot') { await W(300); return; }
    // Compra de pontos
    await click('[data-method="pointbuy"]');
    ok(/27 \/ 27/.test($('.a5-pb-count').textContent), '27 / 27 com tudo em 8');
    for (const k of ['str', 'dex', 'con']) await change($('[data-f="a5-pb-' + k + '"]'), '15', k + ' 15');
    ok(/0 \/ 27/.test($('.a5-pb-count').textContent), '15/15/15 gasta tudo');
    const P = A5.preview();
    ok(P.d.abil.int === 10 && P.d.abil.con === 16 && /8 \+ 2 = 10/.test(card('int').textContent) && /27 pontos/.test($('.a5-attr-left').textContent), 'bônus do antecedente separado dos 27 pontos');
    await change($('[data-f="a5-pb-int"]'), '9', 'Int 9');
    ok(/-1 \/ 27/.test($('.a5-pb-count').textContent) && $('.a5-pb-num.bad') && /Compra de pontos: 28/.test((A5.warnings().atributos || []).join(' ')), 'passou: −1 e aviso');
    if (shot === 'shotpb') { await W(300); return; }
    // Trocar de método e voltar guarda o que foi feito
    await click('[data-method="standard"]');
    ok(A5.st.std.int === 14, 'voltar ao padrão guarda as escolhas');
    // Rolar
    await click('[data-method="roll"]');
    ok($$('[data-rollv]').every((b) => b.disabled), 'antes de rolar, "–"');
    await click('[data-roll5="0"]');
    const r0 = A5.st.rolls[0];
    ok(r0 && r0.dice.length === 4 && r0.total === r0.dice.slice().sort((x, y) => y - x).slice(0, 3).reduce((t, x) => t + x, 0) && $('.a5-roll-dice s'), 'rolagem 1: 4 dados, o menor riscado, total certo');
    await click('[data-act="roll-all"]');
    ok(A5.st.rolls.every((r) => r && r.total >= 3 && r.total <= 18), 'rolar tudo');
    for (const [i, k] of ['str', 'dex', 'con', 'int', 'wis', 'cha'].entries()) await click('[data-rollv="' + k + '=' + i + '"]');
    await click('[data-rollv="dex=0"]');
    ok(A5.st.rollAssign.dex === 0 && A5.st.rollAssign.str === 1, 'a mesma rolagem não vale para dois: troca');
    ok(!/Falta o valor/.test((A5.warnings().atributos || []).join(' ')), 'rolagens distribuídas');
    log.push('rolagens: ' + A5.st.rolls.map((r) => r.dice.join(',') + '=' + r.total).join(' · '));
    if (shot === 'shotroll') { await W(300); return; }
    // Digitar: livre
    await click('[data-method="manual"]');
    await change($('[data-f="a5-man-str"]'), '18', 'For 18');
    ok(/\+4/.test(shield('str')), '18 → +4');
    await change($('[data-f="a5-man-con"]'), '24', 'Con 24');
    ok(/\+7/.test(shield('con')) && !(A5.warnings().atributos || []).length, '24 → +7, sem aviso (livre)');
    if (shot === 'shotman') { await W(300); return; }
    junk('atributos');
    ok(document.documentElement.scrollWidth <= innerWidth + 1, 'sem rolagem lateral');
    // Criar com o digitado: valores na ficha
    A5.set((s) => { s.tab = 'resumo'; });
    await click('[data-act="finish"]'); await W(500);
    const a = Object.values(F.actors).find((x) => x.sistema === '5e');
    ok(a && a.dnd5e.abil.str === 18 && a.dnd5e.abil.con >= 24 && a.dnd5e.criacao.metodo === 'manual', 'ficha criada com os valores digitados: ' + JSON.stringify(a && a.dnd5e.abil));
    log.push('atributos confirmados na ficha');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 300));
