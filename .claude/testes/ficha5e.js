// Plano 51 (parte A): ficha de D&D 5e na página Criar ficha (rodar com -page 'ficha.html' -query '' -budget 120000)
// #shot = foto da aba Principal; #shotacoes, #shotmagias, #shotinventario, #shotcaract, #shotbio = foto da aba
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('promise: ' + String(e.reason && e.reason.message || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const F = App.Ficha, R = App.Regras5e, ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const change = async (el, v) => { ok(el, 'campo existe (' + v + ')'); if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(30); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const tab = async (t) => { $('[data-tab5="' + t + '"]').click(); await W(40); };
  const pick = async (act, q, id) => {
    const b0 = $('[data-act="' + act + '"]'); ok(b0, 'botão ' + act); if (!b0) return;
    b0.click();
    for (let i = 0; i < 300 && !$('.f5-pick-item'); i++) await W(50);
    const inp = $('.f5-pick input[data-f="f5-pick-q"]'); inp.value = q; inp.dispatchEvent(new Event('input')); await W(30);
    const b = $('.f5-pick-item[data-id="' + id + '"]'); ok(b, 'achou ' + id + ' em ' + act);
    if (b) b.click(); else $('.f5-pick-back').remove();
    await W(60);
  };
  const box = (k) => { const b = $('[data-box="' + k + '"] > b'); return b ? b.textContent : null; };
  const noJunk = (where) => { const t = $('.f5').innerText; ok(!/\bnull\b|\bundefined\b|\bNaN\b|\[object/.test(t), 'texto estranho em ' + where + ': ' + (t.match(/.{0,30}(null|undefined|NaN|\[object).{0,30}/) || [''])[0]); };
  try {
    for (let i = 0; i < 100 && !F.ready; i++) await W(50);
    const shot = location.hash.replace('#', '');
    // Ficha nova: pergunta o tipo
    [...$$('.fp-empty .btn')].find((b) => /personagem/i.test(b.textContent)).click(); await W(30);
    ok($('[data-sys="5e"]') && $('[data-sys="generic"]'), 'pergunta genérica ou 5e');
    $('[data-sys="5e"]').click(); await W(60);
    let a = Object.values(F.actors)[0];
    ok(a && a.sistema === '5e' && a.dnd5e && $('.f5'), 'ficha 5e criada');
    ok(a.bars.length === 1 && a.bars[0].name === 'PV' && a.stats.some((s) => s.name === 'Defesa'), 'campos da mesa');
    log.push('nova: ' + a.name + ' · ' + a.sistema + ' · abas ' + $$('[data-tab5]').map((b) => b.textContent).join('/'));
    await change($('.f5-name'), 'Brom Pedraforte');
    ok(F.actors[a.id].name === 'Brom Pedraforte', 'nome');

    // Classe Fighter 2024 nível 5, atributos
    await pick('pick-class', 'fighter', 'fighter-xphb');
    a = F.actors[a.id];
    ok(a.dnd5e.classes[0].name === 'Fighter' && a.dnd5e.saves.str && a.dnd5e.saves.con, 'classe e salvaguardas');
    ok(/heavy/.test(a.dnd5e.prof.armor) && /martial/.test(a.dnd5e.prof.weapons), 'proficiências fixas da classe');
    await change($('[data-f="nivel"]'), '5');
    await change($('[data-f="abil-str"]'), '16');
    await change($('[data-f="abil-con"]'), '14');
    a = F.actors[a.id];
    ok(box('pb') === '+3' && a.bars[0].max === 44, 'nível 5: proficiência +3 e PV 44 (' + box('pb') + ', ' + a.bars[0].max + ')');
    log.push('Fighter 5: PV ' + a.bars[0].value + '/' + a.bars[0].max + ' · CA ' + box('ac') + ' · prof ' + box('pb') + ' · salv. FOR ' + $('[data-abil="str"] .f5-save .f5-link').textContent);
    // Perícia: proficiente e especialista
    $('[data-skill="athletics"] .f5-dot').click(); await W(40);
    ok($('[data-skill="athletics"] b').textContent === '+6', 'Atletismo proficiente +6');
    $('[data-skill="athletics"] .f5-dot').click(); await W(40);
    ok($('[data-skill="athletics"] b').textContent === '+9', 'Atletismo especialista +9');

    // Espécie e antecedente
    await pick('pick-species', 'dwarf', 'dwarf-xphb');
    a = F.actors[a.id];
    ok(a.dnd5e.especie.name === 'Dwarf' && a.dnd5e.sentidos.darkvision === 36 && /poison/.test(a.dnd5e.defesas.resist) && a.darkvision === 24, 'espécie: visão no escuro e resistência');
    await pick('pick-bg', 'soldier', 'soldier-xphb');
    a = F.actors[a.id];
    ok(a.dnd5e.antecedente && a.dnd5e.antecedente.name === 'Soldier', 'antecedente');
    log.push('origem: ' + $('.f5-origin').textContent + ' · perícias ' + Object.keys(a.dnd5e.skills).filter((k) => a.dnd5e.skills[k]).join(', '));
    await change($('[data-f="hp-per"]'), '1');
    ok(F.actors[a.id].bars[0].max === 49, 'PV extra por nível (Dwarven Toughness): 49');
    $('[data-act="sync-feats"]').click(); await W(60);
    a = F.actors[a.id];
    const names = a.dnd5e.caract.map((f) => f.name);
    ok(names.includes('Second Wind') && names.includes('Extra Attack') && names.includes('Darkvision') && !names.includes('Indomitable'), 'características até o nível 5');
    $('[data-act="sync-feats"]').click(); await W(60);
    ok(F.actors[a.id].dnd5e.caract.length === names.length, 'não repete características');
    log.push('características: ' + names.length + ' (' + names.slice(0, 6).join(', ') + '…)');
    if (shot === 'shot') { await W(200); return; }
    noJunk('Principal');

    // Inventário: armadura e arma
    await tab('inventario');
    await pick('item-add', 'chain mail', 'chain-mail-xphb');
    await pick('item-add', 'longsword', 'longsword-xphb');
    await pick('item-add', 'shield', 'shield-xphb');
    a = F.actors[a.id];
    ok(a.dnd5e.itens.length === 3 && a.dnd5e.itens.every((x) => x.ref === 'longsword-xphb' || x.equipped), 'itens e armaduras vestidas');
    ok(box('ac') === '18', 'CA 18 com Chain Mail e escudo (' + box('ac') + ')');
    $('[data-eq="2"]').click(); await W(40);
    ok(box('ac') === '16', 'tirar o escudo: CA 16');
    log.push('inventário: ' + a.dnd5e.itens.map((x) => x.name + (x.equipped ? ' (vestido)' : '')).join(', ') + ' · carga ' + box('carry'));
    await change($('[data-f="coin-gp"]'), '15');
    ok(F.actors[a.id].dnd5e.moedas.gp === 15, 'moedas');
    if (shot === 'shotinventario') { await W(200); return; }
    noJunk('Inventário');

    // Ajuste manual da CA
    $('[data-adj="ac"]').click(); await W(40);
    await change($('[data-f="adj-add-ac"]'), '1');
    ok(box('ac') === '17' && $('[data-box="ac"]').classList.contains('adj'), 'CA +1 = 17, marcada');
    $('[data-act="adj-reset"]').click(); await W(40);
    ok(box('ac') === '16', 'voltar ao calculado');

    // Ações: o ataque da arma
    await tab('acoes');
    a = F.actors[a.id];
    const row = $('.f5-atk');
    ok(row && /Longsword/.test(row.textContent) && /\+6/.test(row.textContent) && /1d8\+3/.test(row.textContent), 'Longsword +6 1d8+3');
    ok(a.actions.length === 1 && a.actions[0].attack === '1d20+6' && a.actions[0].damage === '1d8+3', 'ação da mesa');
    row.querySelector('[data-roll="atk"]').click(); await W(40);
    ok(!$('#fp-rolls').hidden && /Longsword/.test($('#fp-rolls').textContent), 'rolagem do ataque');
    $('.f5-atk-name').click(); await W(40);
    await change($('[data-f="atk-bonus"]'), '1');
    ok(/\+7/.test($('.f5-atk-row').textContent) && F.actors[a.id].actions[0].attack === '1d20+7', 'arma +1');
    await pick('atk-cad', 'unarmed', 'unarmed-strike-xphb');
    ok(F.actors[a.id].dnd5e.attacks.length === 2, 'ataque do cadastro');
    // Recursos e descanso
    $('[data-act="res-cls"]') && $('[data-act="res-cls"]').click(); await W(40);
    $('[data-act="res-new"]').click(); await W(40);
    a = F.actors[a.id];
    const ri = a.dnd5e.recursos.length - 1;
    await change($('[data-f="res-name-' + ri + '"]'), 'Second Wind');
    await change($('[data-f="res-max-' + ri + '"]'), '2');
    await change($('[data-f="res-reset-' + ri + '"]'), 'short');
    await change($('[data-f="res-cur-' + ri + '"]'), '0');
    log.push('recursos: ' + F.actors[a.id].dnd5e.recursos.map((r) => r.name + ' ' + r.cur + '/' + r.max).join(', '));
    // Dano com PV temporário
    await change($('[data-f="f5-temp"]'), '4');
    await change($('[data-f="f5-hp"]'), '-10');
    a = F.actors[a.id];
    ok(a.dnd5e.hp.temp === 0 && a.bars[0].value === 43, 'dano gasta o temporário primeiro (' + a.dnd5e.hp.temp + ', ' + a.bars[0].value + ')');
    $('[data-act="spend-hd"]').click(); await W(60);
    a = F.actors[a.id];
    ok(a.dnd5e.hp.hdUsed === 1 && a.bars[0].value > 43, 'gastar dado de vida');
    $('[data-act="short-rest"]').click(); await W(40);
    ok(F.actors[a.id].dnd5e.recursos[ri].cur === 2, 'descanso curto recupera Second Wind');
    $('[data-act="long-rest"]').click(); await W(40);
    a = F.actors[a.id];
    ok(a.bars[0].value === a.bars[0].max && a.dnd5e.hp.hdUsed === 0, 'descanso longo');
    if (shot === 'shotacoes') { $('.f5-atk-name').click(); await W(200); return; }
    noJunk('Ações');

    // Magias: Wizard 5
    const w = F.newActor('pc', '5e'); await W(60);
    await pick('pick-class', 'wizard', 'wizard-xphb');
    await change($('[data-f="nivel"]'), '5');
    await change($('[data-f="abil-int"]'), '16');
    await pick('pick-sub', 'evoker', 'wizard-xphb--evoker-xphb');
    ok(F.actors[w.id].dnd5e.classes[0].sub && F.actors[w.id].dnd5e.classes[0].sub.name === 'Evoker', 'subclasse');
    await tab('magias');
    await pick('spell-add', 'fire bolt', 'fire-bolt-xphb');
    await pick('spell-add', 'fireball', 'fireball-xphb');
    await pick('spell-add', 'magic missile', 'magic-missile-xphb');
    await pick('spell-add', 'shield', 'shield-xphb');
    let x = F.actors[w.id];
    ok(x.dnd5e.magia.list.length === 4 && x.dnd5e.attacks.length === 3, 'magias e ataques delas (' + x.dnd5e.magia.list.length + ', ' + x.dnd5e.attacks.length + ')');
    ok(box('spellDc') === '14' && box('spellAtk') === '+6', 'CD 14 e ataque +6');
    ok(x.bars.map((b) => b.name + ' ' + b.max).join('|') === 'PV 22|Espaços 1º 4|Espaços 2º 3|Espaços 3º 2', 'barras de espaços (' + x.bars.map((b) => b.name + ' ' + b.max).join('|') + ')');
    $('[data-prep]').click(); await W(40);
    ok(F.actors[w.id].dnd5e.magia.list.some((s) => s.prepared), 'preparar');
    $$('.f5-pip.on')[0].click(); await W(40);
    ok(F.actors[w.id].bars.find((b) => b.name === 'Espaços 1º').value === 0, 'clicar no 1º espaço: gasta todos daquele em diante');
    $$('.f5-pip')[2].click(); await W(40);
    ok(F.actors[w.id].bars.find((b) => b.name === 'Espaços 1º').value === 3, 'recuperar até o 3º');
    x = F.actors[w.id];
    const fb = x.actions.find((y) => y.name === 'Fire Bolt'), fbl = x.actions.find((y) => y.name === 'Fireball');
    ok(fb.attack === '1d20+6' && fb.damage === '2d10' && fbl.mode === 'save' && fbl.dc === '14' && fbl.costBar === 'Espaços 3º', 'ações das magias');
    $('.f5-spell-name').click(); await W(40);
    ok($('.f5-spell-body .f5-text') && /fire/i.test($('.f5-spell-body').textContent), 'texto da magia');
    log.push('Wizard 5 (Evoker): ' + x.dnd5e.magia.list.map((s) => s.name).join(', ') + ' · ' + fb.attack + ' ' + fb.damage + ' · Fireball CD ' + fbl.dc);
    if (shot === 'shotmagias') { await W(200); return; }
    noJunk('Magias');
    // Remover a magia remove o ataque dela
    const nA = x.dnd5e.attacks.length;
    $$('.f5-spell [aria-label="Remover magia"]').find((b) => /Fire Bolt/.test(b.closest('.f5-spell').textContent)).click(); await W(40);
    ok(F.actors[w.id].dnd5e.attacks.length === nA - 1, 'remover magia remove o ataque');

    // Características e talentos
    await tab('caract');
    await pick('feat-add', 'alert', 'alert-xphb');
    ok(F.actors[w.id].dnd5e.talentos.length === 1, 'talento');
    if (shot === 'shotcaract') { $('.f5-feat .f5-link').click(); await W(200); return; }
    noJunk('Características');
    await tab('bio');
    await change($('[data-f="bio-personalidade"]'), 'Curioso.');
    ok(F.actors[w.id].dnd5e.bio.personalidade === 'Curioso.', 'biografia');
    if (shot === 'shotbio') { await W(200); return; }
    await tab('config');
    ok($('[data-f="tipo"]') && $('.fp-foot'), 'configurar com tipo e exportar');
    noJunk('Configurar');

    // Exportar e importar
    const bun = F.bundle(F.actors[w.id]);
    ok(bun.format === 'mesarpg-actor' && bun.actor.sistema === '5e' && bun.actor.dnd5e.magia.list.length === 3, 'exportar');
    const imp = F.importObj(JSON.parse(JSON.stringify(bun))); await W(60);
    ok(imp.sistema === '5e' && imp.id !== w.id && imp.actions.length === F.actors[w.id].actions.length, 'importar');
    // Ficha genérica continua igual
    const g = F.newActor('npc', 'generic'); await W(40);
    ok(!g.sistema && g.stats.length === 7 && $('.fp-stats') && !$('.f5'), 'ficha genérica');
    // Lista
    ok($$('.fp-item .sub').some((s) => /^5e · Fighter 5/.test(s.textContent)), 'lista mostra 5e e a classe');
    // Largura
    F.select(a.id); await W(60);
    for (const t of ['principal', 'acoes', 'magias', 'inventario', 'caract', 'bio']) { await tab(t); ok(document.documentElement.scrollWidth <= innerWidth + 1 && $('#fp-main').scrollWidth <= $('#fp-main').clientWidth + 1, 'sem rolagem lateral em ' + t + ' (' + innerWidth + ')'); }
    log.push('largura ' + innerWidth + ': ok');
  } catch (e) { (window.__err = window.__err || []).push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
}, 300));
