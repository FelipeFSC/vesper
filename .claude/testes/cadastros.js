// Planos 42 a 46: página de cadastros (rodar com -page 'cadastros.html' -query '', precisa de data/cadastros/).
// `#shot` + `-shot` = foto do ataque; `#shotw` = arma (item); `#shoti` = item mágico com imagem; `#shotf` = família; `#shotg` = grupo.
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('REJ: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const C = App.Cadastros, ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const change = async (el, v) => { if (!el) throw new Error('campo não achado'); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(30); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  const f = (k) => $(`[data-f="${k}"]`);
  const filt = async (k, v) => change($(`[data-filter="${k}"]`), v);
  const search = async (q) => { const s = $('.cd-search'); s.value = q; s.dispatchEvent(new Event('input')); await W(250); };
  const items = () => $$('.cd-item');
  const clear = async () => { $('#cd-clear').click(); await W(60); };
  const cat = async (c) => { $(`.cd-cat[data-cat="${c}"]`).click(); await W(60); };
  const open = async (name, src) => {
    const list = $('#cd-list');
    const find = () => items().find((row) => row.querySelector('b').textContent === name && (!src || row.querySelector('.cd-src').textContent === src));
    let row = find();
    if (!row) {
      list.scrollTop = 0;
      await W(50);
      row = find();
    }
    while (!row) {
      const last = list.scrollTop;
      list.scrollTop += Math.max(51, list.clientHeight - 51);
      if (list.scrollTop === last) throw new Error('não achei na lista: ' + name + ' ' + (src || ''));
      await W(50);
      row = find();
    }
    row.click();
    await W(60);
  };
  const chips = () => $$('#cd-preview .cd-chip').map((c) => c.textContent).join(' | ');
  const tab = async (k) => { $(`[data-tab="${k}"]`).click(); await W(80); };
  let confirmAns = true; window.confirm = () => confirmAns;
  let downloaded = null; App.U.download = (name, text) => { downloaded = { name, text }; };
  try {
    for (let i = 0; i < 200 && !C.loaded; i++) await W(50);
    const shot = location.hash;
    try { localStorage.removeItem('vesper-cadastros-ui'); } catch { /* */ }
    if (shot) {
      if (shot === '#shot') { await search('breath weapon fire cone'); items()[0].click(); }
      if (shot === '#shotw') { await tab('items'); await cat('Weapon'); await search('longsword'); await filt('edition', '2024'); await open('Longsword'); }
      if (shot === '#shoti') { await tab('items'); await search('flame tongue'); await open('Flame Tongue', 'XDMG'); C.famBase[C.sel.items] = 'longsword-xphb'; C.render(); }
      if (shot === '#shotf') { await tab('items'); await search('ring of protection'); await open('Ring of Protection', 'XDMG'); }
      if (shot === '#shota') { await search('censer devotee'); await filt('origin', 'weapon'); log.push('busca "censer devotee" (fora de ordem): ' + items().length); items()[0].click(); await W(100);
        const hd = $('.cd-head').getBoundingClientRect(), fs = $('fieldset.cd-ro').getBoundingClientRect(), sc = $('fieldset.cd-ro .fp-sec').getBoundingClientRect(), dsc = $$('.cd-edit > .fp-sec').pop().getBoundingClientRect();
        log.push(`alinhamento: topo ${Math.round(hd.left)}–${Math.round(hd.right)} · só leitura ${Math.round(fs.left)}–${Math.round(fs.right)} · seção ${Math.round(sc.left)}–${Math.round(sc.right)} · descrição ${Math.round(dsc.left)}–${Math.round(dsc.right)} · rolagem horizontal ${document.documentElement.scrollWidth > innerWidth || $('#cd-main').scrollWidth > $('#cd-main').clientWidth}`); }
      if (shot === '#shots') { await tab('spells'); await search('fireball'); await filt('edition', '2024'); await open('Fireball'); }
      if (shot === '#shotsa') { await search('fire bolt'); await filt('origin', 'spell'); await filt('edition', '2024'); await open('Fire Bolt'); }
      if (shot === '#shotft') { await tab('feats'); await search('magic initiate'); await filt('edition', '2024'); await open('Magic Initiate'); }
      if (shot === '#shotft2') { await tab('feats'); await search('fey touched'); await open('Fey Touched', 'TCE'); const el = $$('.cd-sec')[2]; if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#shotbg') { await tab('backgrounds'); await search('acolyte'); await open('Acolyte', 'XPHB'); const el = $$('.cd-sec')[2]; if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#shotbg2') { await tab('backgrounds'); await search('acolyte'); await open('Acolyte', 'PHB'); const el = $$('.cd-sec')[4]; if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#shotsp') { await tab('species'); await search('elf'); await open('Elf', 'XPHB'); await change(f('opt-view'), 'elf-xphb--drow-lineage'); const el = $$('.cd-sec').find((x) => /Sub-raças/.test(x.textContent)); if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#shotsp2') { await tab('species'); await search('elf'); await open('Elf', 'PHB'); C.optOpen['elf-phb'] = 'elf-phb--drow'; C.render(); await W(100); const el = $$('.cd-sec').find((x) => /Sub-raças/.test(x.textContent)); if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#shotop') { await tab('options'); await search('thirsting blade'); await open('Thirsting Blade', 'XPHB'); }
      if (shot === '#shotcl') { await tab('classes'); await search('wizard'); await open('Wizard', 'XPHB'); const el = $$('.cd-sec').find((x) => /Progressão/.test(x.textContent)); if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#shotcl2') { await tab('classes'); await search('monk'); await open('Monk', 'XPHB'); C.featOpen['monk-xphb:0'] = true; C.render(); await W(100); const el = $$('.cd-sec').find((x) => /Características \(/.test(x.textContent)); if (el) $('#cd-main').scrollTop = el.offsetTop - 20; }
      if (shot === '#probecl') { await tab('classes'); await search('wizard'); await open('Wizard', 'XPHB'); await W(200);
        const main = $('#cd-main');
        log.push('main: scroll ' + main.scrollWidth + ' / client ' + main.clientWidth + ' · página ' + document.documentElement.scrollWidth + ' / ' + innerWidth);
        const wide = [...main.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > main.getBoundingClientRect().right + 1 && !el.closest('.cd-grid-wrap')).slice(0, 6);
        log.push('passam da direita: ' + wide.map((el) => el.tagName + '.' + String(el.className).split(' ').join('.') + ' ' + Math.round(el.getBoundingClientRect().right)).join(' | ')); }
      if (shot === '#shotsc') { await tab('subclasses'); await search('light'); await filt('ced', '2024'); await open('Light Domain'); }
      if (shot === '#shotg') { await tab('items'); await search('staff of skulls'); await open('Staff of Skulls'); }
      await W(1500); log.push('foto'); return;
    }
    // ---------- Abertura ----------
    const na = C.records('attacks').length, ni = C.records('items').filter((r) => !r.memberOf).length;
    log.push('abas: ' + $$('.cd-tab').map((t) => t.textContent).join(' | ') + ' · ataques ' + na + ' · itens na lista ' + ni);
    ok(!$('[data-tab="weapons"]'), 'aba Armas saiu');
    ok(C.records('attacks').filter((a) => a._virtual).length > 250, 'ataques das armas montados dos itens');
    log.push('ataques gravados: ' + C.records('attacks').filter((a) => !a._virtual).length + ' · da arma: ' + C.records('attacks').filter((a) => a._virtual).length);

    // ---------- Ataques (Plano 42) ----------
    await search('unarmed strike'); await filt('edition', '2024');
    await open('Unarmed Strike');
    log.push('Unarmed Strike 2024: ' + chips() + ' · exemplo ' + $('#cd-atk-calc').textContent);
    await change(f('attack.bonus'), '1');
    ok($('#cd-atk-calc').textContent === '= +6', 'cálculo do exemplo');
    await change(f('type'), 'attack-save');
    ok(f('save.ability') && !f('attack.ability'), 'trocar o tipo troca as seções');
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(60);
    ok(f('type').value === 'melee', 'voltar ao padrão');
    await clear();
    await search('bite naga'); items()[0].click(); await W(50);
    log.push('Bite (Naga): teste ao acertar ' + f('saveOnHit').checked + ' · dano 2 = ' + f('damage.1.dice').value + ' ' + f('damage.1.type').value);
    await clear();
    $('#cd-new').click(); await W(60);
    await change($('.cd-name'), 'Chicote de Fogo');
    await change(f('damage.1.dice'), '1d6'); await change(f('damage.1.type'), 'fire');
    ok(Object.values(C.local.attacks.custom).some((a) => a.name === 'Chicote de Fogo'), 'criar ataque');
    // Ataque da arma: vem do item, só leitura
    await clear(); await search('longsword'); await filt('origin', 'weapon');
    log.push('ataques "longsword" da arma: ' + items().length + ' (' + items().slice(0, 4).map((i) => i.querySelector('b').textContent).join(', ') + '…)');
    await filt('edition', '2024'); await open('Longsword');
    ok($('fieldset.cd-ro') && !$$('.cd-head .btn').some((b) => /Apagar/.test(b.textContent)), 'ataque da arma só leitura, sem Apagar');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (' + C.tab + ')');
    log.push('Longsword (da arma): ' + chips() + ' · aviso: ' + !!$('.cd-banner'));
    $('[data-act="edit-weapon"]').click(); await W(120);
    ok(C.tab === 'items' && C.sel.items === 'longsword-xphb', 'Editar a arma leva ao item');
    log.push('"Editar a arma" → aba ' + C.tab + ', item ' + C.sel.items);

    // ---------- Itens: categorias e filtros ----------
    await clear();
    log.push('categorias: ' + $$('.cd-cat').slice(0, 12).map((c) => c.textContent).join(' · ') + ' …');
    await cat('Weapon');
    const nWeap = items().length;
    log.push('Weapon: ' + $('#cd-found').textContent + ' (lista mostra ' + nWeap + ') · filtro Propriedade aparece: ' + !!$('[data-filter="prop"]'));
    await filt('prop', 'Finesse'); await filt('kind', 'mundane');
    log.push('Weapon + Finesse + mundanos: ' + $('#cd-found').textContent);
    await filt('prop', 'Mastery: Vex'); log.push('Weapon + Mastery Vex + mundanos: ' + items().map((i) => i.querySelector('b').textContent).slice(0, 6).join(', '));
    await clear(); await cat('Armor'); await filt('armor', 'heavy'); await filt('kind', 'mundane');
    log.push('Armor heavy mundanos: ' + items().map((i) => i.querySelector('b').textContent + ' ' + i.querySelector('.cd-src').textContent).join(', '));
    await clear(); await filt('rarity', 'Legendary'); await filt('attune', 'no');
    log.push('Legendary sem sintonização: ' + $('#cd-found').textContent);
    await clear(); await search('portable hole');
    log.push('busca "portable hole": ' + items().map((i) => i.querySelector('b').textContent + ' (' + i.querySelector('.cd-item-sub').textContent + ')').join(' / '));

    // Itens conhecidos (regras do catálogo do amigo)
    await clear(); await search('longsword'); await filt('edition', '2024'); await open('Longsword');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (' + C.tab + ')');
    log.push('Longsword 2024: ' + chips());
    log.push('descrição: ' + $('.cd-desc-view').textContent.slice(0, 120) + '…');
    log.push('linha do ataque: ' + $('.cd-attack-line b').textContent);
    await clear(); await search('potion of healing'); await filt('edition', '2024');
    log.push('busca "potion of healing" 2024: ' + items().map((i) => i.querySelector('b').textContent + ' [' + i.querySelector('.cd-item-sub').textContent + ']').join(' / '));
    await open('Potions of Healing');
    log.push('grupo: versões = ' + $$('.cd-version b').map((b) => b.textContent).join(', '));
    $$('.cd-version')[0].click(); await W(80);
    log.push('versão: ' + $('.cd-name').value + ' · ' + chips() + ' · aviso de grupo: ' + !!$('[data-act="to-group"]'));
    $('[data-act="to-group"]').click(); await W(60);
    ok($('.cd-name').value === 'Potions of Healing', 'voltar ao grupo');
    await clear(); await search('spell scroll 3rd'); await open('Spell Scroll', 'DMG');
    log.push('grupo Spell Scroll (DMG): ' + $$('.cd-version').length + ' versões');
    $$('.cd-version').find((v) => /3rd Level/.test(v.textContent)).click(); await W(80);
    log.push('Spell Scroll (3rd Level): ' + chips());
    await clear(); await search('bag of holding'); await filt('edition', '2024'); await open('Bag of Holding');
    log.push('Bag of Holding: ' + chips() + ' · imagem: ' + !!$('.cd-img img'));
    await clear(); await search('boots of speed'); await filt('edition', '2024'); await open('Boots of Speed');
    log.push('Boots of Speed: ' + chips());
    await clear(); await search('plate armor'); await filt('edition', '2024'); await open('Plate Armor');
    log.push('Plate Armor: ' + chips());
    await clear(); await search('ring of protection'); await open('Ring of Protection', 'XDMG');
    log.push('Ring of Protection: ' + chips());

    // Família: +1 Weapon
    await clear(); await cat('Weapon'); await filt('kind', 'family'); await search('+1 weapon');
    log.push('famílias "+1 weapon": ' + items().map((i) => i.querySelector('b').textContent + ' ' + i.querySelector('.cd-src').textContent + ' [' + i.querySelector('.cd-item-sub').textContent + ']').join(' / '));
    await open('+1 Weapon', 'DMG');
    const opts = [...f('family-base').options].map((o) => o.textContent);
    ok(!opts.some((o) => /^Net/.test(o)) && !opts.some((o) => /\(2024\)/.test(o)), '+1 Weapon (DMG): sem Net, sem bases de 2024');
    log.push('+1 Weapon DMG: ' + opts.length + ' bases, net ' + opts.some((o) => /^Net/.test(o)) + ', alguma de 2024 ' + opts.some((o) => /\(2024\)/.test(o)));
    await change(f('family-base'), 'longsword-phb');
    log.push('com Longsword: ' + $('.cd-fam-res > b').textContent + ' · ' + $$('.cd-fam-res .cd-chip').map((c) => c.textContent).join(' | '));
    await clear(); await search('flame tongue'); await open('Flame Tongue', 'XDMG');
    log.push('Flame Tongue (XDMG): ' + chips() + ' · bases ' + f('family-base').options.length);
    // busca pelo nome de uma combinação acha a família
    await clear(); await search('+2 rapier');
    log.push('busca "+2 rapier": ' + items().map((i) => i.querySelector('b').textContent + ' ' + i.querySelector('.cd-src').textContent).join(', '));

    // Evolutivo: estágio inicial criado
    await clear(); await search('staff of skulls'); await open('Staff of Skulls');
    log.push('Staff of Skulls: versões ' + $$('.cd-version').map((v) => v.textContent).join(' / '));

    // ---------- Itens: editar, criar, apagar ----------
    await clear(); await search('longsword'); await filt('edition', '2024'); await open('Longsword');
    await change(f('weapon.bonusAttack'), '1'); await change(f('weapon.bonusDamage'), '1');
    await change(f('weapon.extraDamage.0.dice'), '1d6'); await change(f('weapon.extraDamage.0.type'), 'fire');
    const ed = C.local.items.edited['longsword-xphb'];
    ok(ed && ed.weapon.bonusAttack === 1 && ed.weapon.extraDamage[0].type === 'fire', 'editar arma');
    const va = C.find('attacks', 'w:longsword-xphb');
    ok(va.attack.bonus === 1 && va.damage[0].dice === '1d8+1' && va.damage[1].type === 'fire', 'o ataque acompanha a arma');
    log.push('arma +1 com 1d6 fire → ataque: ' + TABSsum(va));
    await change(f('weapon.kind'), 'ranged');
    log.push('virou Ranged: alcance normal ' + !!f('weapon.range.normal') + ' · munição ' + !!f('weapon.ammo') + ' · alcance corpo a corpo ' + !!f('weapon.reach'));
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(60);
    ok(!C.local.items.edited['longsword-xphb'] && C.find('attacks', 'w:longsword-xphb').attack.bonus === 0, 'voltar ao padrão (item e ataque)');
    // descrição: ver e editar
    [...$$('.cd-desc-foot .btn')].find((b) => /Editar o texto/.test(b.textContent)).click(); await W(60);
    ok($('textarea.cd-desc'), 'editar o texto');
    await change($('textarea.cd-desc'), 'Primeiro parágrafo.\n\nRoll. Role na tabela:\n| d4 | Effect |\n| 1 | Nada |\n| 2–4 | Algo |');
    $$('.cd-desc-foot .btn')[0].click(); await W(60);
    log.push('descrição editada: ' + $$('.cd-desc-view > *').map((e) => e.tagName).join(',') + ' · tabela com ' + $$('.cd-table tr').length + ' linhas');
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(60);
    // novo item com a categoria Weapon escolhida já vem com dados de arma
    await clear(); await cat('Weapon');
    $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Martelo Anão');
    const mine = C.local.items.custom[C.sel.items];
    ok(mine && mine.category === 'Weapon' && mine.weapon, 'novo item na categoria Weapon');
    await change(f('rarity'), 'Rare');
    log.push('novo: ' + chips() + ' · ataque em Ataques: ' + !!C.find('attacks', 'w:' + mine.id));
    await change(f('category'), 'Armor');
    log.push('trocou para Armor: dados de armadura ' + !!f('armor.type') + ' · arma continua ' + !!f('weapon.kind'));
    confirmAns = true;
    [...$$('.cd-head .btn')].find((b) => /Apagar/.test(b.textContent)).click(); await W(60);
    ok(!C.local.items.custom[mine.id] && !C.find('attacks', 'w:' + mine.id), 'apagar item apaga o ataque da arma');
    $('.toast .toast-act').click(); await W(60);
    ok(C.local.items.custom[mine.id], 'desfazer');

    // ---------- Magias (Plano 45) ----------
    await tab('spells');
    ok(C.records('spells').length > 900 && !C.records('spells').some((s) => s.source === 'WoW'), 'magias carregadas, sem WoW');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (magias)');
    log.push('magias: ' + C.records('spells').length + ' · níveis: ' + $$('.cd-cat').map((c) => c.textContent).join(' · '));
    await search('fireball'); await filt('edition', '2024'); await open('Fireball');
    log.push('Fireball: ' + chips());
    log.push('Fireball nível superior: +' + f('higher.perSlot').value + ' · ataque: ' + $('.cd-attack-line b').textContent);
    await clear(); await search('fire bolt'); await filt('edition', '2024'); await open('Fire Bolt');
    log.push('Fire Bolt: ' + chips() + ' · truque: ' + ['1', '5', '11', '17'].map((l) => f('cantrip-' + l).value).join(' → '));
    for (const [n, what] of [['Cure Wounds', ''], ['Shield', ''], ['Detect Magic', ''], ['Revivify', ''], ['Hold Person', '']]) {
      await clear(); await search(n.toLowerCase()); await filt('edition', '2024'); await open(n);
      log.push(n + ': ' + chips());
    }
    // filtros: Wizard 3º nível, concentração, ritual, fogo
    await clear(); $('[data-level="3"]').click(); await W(80); await filt('cls', 'Wizard'); await filt('edition', '2024');
    log.push('Wizard 3º (2024): ' + $('#cd-found').textContent + ' (' + items().slice(0, 5).map((i) => i.querySelector('b').textContent).join(', ') + '…)');
    await clear(); await filt('flag', 'ritual'); log.push('rituais: ' + $('#cd-found').textContent);
    await clear(); await filt('flag', 'conc'); log.push('concentração: ' + $('#cd-found').textContent);
    await clear(); await filt('dmg', 'fire'); $('[data-level="0"]').click(); await W(80); log.push('truques de fogo: ' + items().map((i) => i.querySelector('b').textContent + ' ' + i.querySelector('.cd-src').textContent).join(', '));
    // ataques das magias
    await tab('attacks'); await clear(); await filt('origin', 'spell');
    log.push('ataques da magia: ' + $('#cd-found').textContent);
    await search('fireball'); await filt('edition', '2024'); await open('Fireball');
    log.push('Fireball (da magia): ' + chips() + ' · só leitura ' + !!$('fieldset.cd-ro'));
    $('[data-act="edit-spell"]').click(); await W(120);
    ok(C.tab === 'spells' && C.sel.spells === 'fireball-xphb', 'Editar a magia leva à magia');
    await change(f('damage.0.dice'), '10d6');
    ok(C.find('attacks', 's:fireball-xphb').damage[0].dice === '10d6', 'o ataque acompanha a magia');
    log.push('Fireball com 10d6 → ataque: ' + C.find('attacks', 's:fireball-xphb').damage[0].dice);
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(60);
    // criar uma magia
    await clear(); $('[data-level="2"]').click(); await W(80);
    $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Raio Gelado');
    await change(f('attack'), 'ranged');
    await change(f('damage.0.dice'), '3d8'); await change(f('damage.0.type'), 'cold');
    await change(f('range.distance'), App.Units.sys('dist') === 'imperial' ? '60' : '18');
    await change(f('duration.concentration'), true);
    $$('[data-f="cls-Wizard"]')[0].click(); await W(60);
    const mysp = C.local.spells.custom[C.sel.spells];
    ok(mysp && mysp.level === 2 && mysp.classes.includes('Wizard') && C.find('attacks', 's:' + mysp.id), 'criar magia (e o ataque dela)');
    log.push('magia criada: ' + chips() + ' · em Ataques: ' + TABSsum(C.find('attacks', 's:' + mysp.id)));
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (magia nova)');

    // ---------- Talentos (Plano 44) ----------
    await tab('feats');
    const FT = C.records('feats');
    ok(FT.length === 305 && !FT.some((x) => x.source === 'WoW'), 'talentos carregados, sem WoW');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (talentos)');
    log.push('talentos: ' + FT.length + ' · ' + $$('.cd-cat').map((c) => c.textContent).join(' · '));
    const ftOpen = async (n, src) => { await clear(); await search(n.toLowerCase()); await open(n, src); };
    await ftOpen('Magic Initiate', 'XPHB');
    log.push('Magic Initiate: ' + chips() + ' · listas: ' + $$('[data-f$="-name"][data-f^="sp-"]').map((i) => i.value).join(' / '));
    await ftOpen('Great Weapon Master', 'XPHB'); log.push('Great Weapon Master: ' + chips());
    await ftOpen('Resilient', 'XPHB'); log.push('Resilient: ' + chips());
    await ftOpen('Skilled', 'XPHB'); log.push('Skilled: ' + chips());
    await ftOpen('Elven Accuracy', 'XGE'); log.push('Elven Accuracy: ' + chips());
    await ftOpen('Archery', 'XPHB'); log.push('Archery: ' + chips());
    await ftOpen('Boon of Fate', 'XPHB'); log.push('Boon of Fate: ' + chips());
    await ftOpen('Fey Touched', 'TCE');
    log.push('Fey Touched: ' + chips());
    $('[data-act="open-spell"]').click(); await W(120);
    ok(C.tab === 'spells' && C.sel.spells === 'misty-step-phb', 'abrir a magia pelo talento');
    log.push('Fey Touched → magia: ' + C.sel.spells);
    const ftLink = $$('.cd-granted .cd-link').find((a) => a.textContent === 'Fey Touched');
    ok(ftLink, 'magia mostra o talento que a dá');
    ftLink.click(); await W(120);
    ok(C.tab === 'feats' && /^fey-touched/.test(C.sel.feats), 'abrir o talento pela magia');
    // filtros
    await clear(); $('.cd-cat[data-cat="Origin"]').click(); await W(80); await filt('edition', '2024');
    log.push('Origin 2024: ' + $('#cd-found').textContent);
    await clear(); await filt('gives', 'spells'); log.push('dão magias: ' + $('#cd-found').textContent);
    await clear(); await filt('pre', 'none'); await filt('ab', 'con'); log.push('sem pré-requisito e aumentam CON: ' + $('#cd-found').textContent);
    // criar e editar com os editores
    await clear(); $('.cd-cat[data-cat="General"]').click(); await W(80);
    $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Mestre das Brumas');
    $('[data-act="pre-add"]').click(); await W(60);
    await change(f('pre-0-0-value'), '8');
    $('[data-act="pre-add"]').click(); await W(60);
    await change(f('pre-1-0-type'), 'ability');
    await change(f('pre-1-0-min'), '15');
    $('[data-act="ab-add"]').click(); await W(60);
    await change(f('ab-0-mode'), 'fixed'); await change(f('ab-0-str'), ''); await change(f('ab-0-dex'), '1');
    $('[data-act="sp-add"]').click(); await W(60);
    await change(f('sp-0-0-spell'), 'Misty Step | XPHB');
    await change(f('sp-0-0-how'), 'innate'); await change(f('sp-0-0-uses'), '1/day');
    await change(f('sp-ability'), 'wis');
    $('[data-act="se-add"]').click(); await W(60);
    await change(f('se-0-range'), App.Units.sys('dist') === 'imperial' ? '60' : '18');
    $('[data-act="resist-add"]').click(); await W(60);
    await change(f('resist-fixed'), 'cold, necrotic');
    $('[data-act="pr-add"]').click(); await W(60);
    await change(f('pr-0-kind'), 'skill'); await change(f('pr-0-count'), '2'); await change(f('pr-0-from'), 'arcana, history, nature');
    const myf = C.local.feats.custom[C.sel.feats];
    ok(myf && myf.prerequisites.length === 2 && myf.prerequisites[0][0].value === 8 && myf.prerequisites[1][0].min === 15, 'pré-requisitos (ou)');
    ok(myf.benefits.ability[0].fixed.dex === 1 && myf.benefits.spells.groups[0].items[0].spell === 'misty-step-xphb' && myf.benefits.spells.ability.fixed === 'wis', 'benefícios: atributo e magia ligada');
    ok(myf.benefits.senses[0].range === 18 && myf.benefits.resist.fixed.length === 2 && myf.benefits.proficiencies[0].choose.count === 2, 'sentido, resistência e perícias');
    log.push('talento criado: ' + chips());
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (talento novo)');
    // editar um padrão e voltar
    await ftOpen('Alert', 'XPHB');
    $('[data-act="ab-add"]').click(); await W(80);
    ok(C.local.feats.edited['alert-xphb'] && $$('.cd-head .btn').some((b) => /Voltar ao padrão/.test(b.textContent)), 'editar padrão mostra Voltar ao padrão');
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(60);
    ok(!C.local.feats.edited['alert-xphb'], 'voltar ao padrão (talento)');

    // ---------- Antecedentes (Plano 46) ----------
    await tab('backgrounds');
    const BG = C.records('backgrounds');
    ok(BG.length === 175 && BG.filter((x) => x.variantOf).length === 26, 'antecedentes carregados (175, 26 variantes)');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (antecedentes)');
    log.push('antecedentes: ' + BG.length + ' · variantes ' + BG.filter((x) => x.variantOf).length);
    const bgOpen = async (n, src) => { await clear(); await search(n.toLowerCase()); await open(n, src); };
    await bgOpen('Acolyte', 'XPHB');
    log.push('Acolyte 2024: ' + chips());
    ok($('[data-f="ab-0-weights"]') && $('[data-f="ab-0-weights"]').value === '2, 1', 'pesos no editor');
    $('[data-act="open-feat"]').click(); await W(120);
    ok(C.tab === 'feats' && C.sel.feats === 'magic-initiate-xphb', 'abrir o talento pelo antecedente');
    const back = $$('.cd-linklist .cd-base').find((b) => /^Acolyte/.test(b.textContent) && /XPHB/.test(b.textContent));
    ok(back, 'talento mostra os antecedentes que o dão');
    log.push('Magic Initiate ← antecedentes: ' + $$('.cd-linklist .cd-base').length + ' (' + $$('.cd-linklist .cd-base span').slice(0, 4).map((x) => x.textContent).join(', ') + '…)');
    back.click(); await W(120);
    ok(C.tab === 'backgrounds' && C.sel.backgrounds === 'acolyte-xphb', 'voltar ao antecedente pelo talento');
    $$('[data-act="open-item"]')[0].click(); await W(120);
    ok(C.tab === 'items' && C.sel.items === 'book-xphb', 'abrir o item do equipamento');
    await tab('backgrounds');
    await bgOpen('Acolyte', 'PHB');
    log.push('Acolyte 2014: ' + chips());
    log.push('tabelas: ' + $$('.cd-table-ed').map((t) => t.querySelector('input').value + ' d' + t.querySelector('[data-f$="-die"]').value + ' (' + t.querySelector('textarea').value.split('\n').length + ')').join(', ') + ' · característica: ' + f('feature-name').value);
    await bgOpen("Baldur's Gate Acolyte");
    ok($('[data-act="to-original"]'), 'aviso de variante');
    log.push("Baldur's Gate Acolyte: " + $('.cd-banner').textContent.trim());
    await clear(); await filt('gives', 'spells'); log.push('dão magias: ' + $('#cd-found').textContent);
    await clear(); await filt('skill', 'stealth'); await filt('edition', '2024'); log.push('Stealth 2024: ' + items().map((i) => i.querySelector('b').textContent).join(', '));
    // criar com os editores
    await clear(); $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Guarda da Ponte');
    await change(f('edition'), '2024');
    $('[data-act="ab-add"]').click(); await W(60);
    await change(f('ab-0-mode'), 'weighted');
    await change(f('ab-0-weights'), '2, 1');
    $('[data-act="ft-add"]').click(); await W(60);
    await change(f('ft-0-feat'), 'Alert | XPHB');
    $('[data-act="eq-add-choice"]').click(); await W(60);
    $('[data-act="eq-0-0-add"]').click(); await W(60);
    await change(f('eq-0-0-0-name'), 'Spear | XPHB');
    await change(f('eq-0-0-0-qty'), '2');
    await change(f('eq-0-1-0-gold'), '30');
    $('[data-act="feature-add"]').click(); await W(60);
    await change(f('feature-name'), 'Passagem Livre');
    $('[data-act="ch-add"]').click(); await W(60);
    await change(f('ch-0-name'), 'Ideal');
    await change(f('ch-0-rows'), 'Ordem\nDever\nLiberdade\nHonra');
    const mb = C.local.backgrounds.custom[C.sel.backgrounds];
    ok(mb && mb.benefits.ability[0].weighted.weights.join() === '2,1' && mb.feats[0].feat === 'alert-xphb', 'pesos e talento ligado');
    ok(mb.equipment[0].options[0].items[0].item === 'spear-xphb' && mb.equipment[0].options[0].items[0].qty === 2 && mb.equipment[0].options[1].items[0].gold === 3000, 'equipamento A/B com item ligado e ouro');
    ok(mb.feature.name === 'Passagem Livre' && mb.characteristics.tables[0].rows.length === 4 && mb.characteristics.tables[0].die === 6, 'característica e tabela');
    log.push('antecedente criado: ' + chips());
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (antecedente novo)');

    // ---------- Espécies (Plano 47) ----------
    await tab('species');
    const SP = C.records('species');
    ok(SP.length === 160 && !SP.some((x) => x.source === 'WoW'), 'espécies carregadas (160, sem WoW)');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (espécies)');
    log.push('espécies: ' + SP.length + ' · opções ' + SP.reduce((n, x) => n + (x.options || []).length, 0));
    const spOpen = async (n, src) => { await clear(); await search(n.toLowerCase()); await open(n, src); };
    await spOpen('Elf', 'XPHB');
    log.push('Elf 2024: ' + chips());
    log.push('opções: ' + $$('.cd-opt .cd-version b').map((b) => b.textContent).join(', '));
    await change(f('opt-view'), 'elf-xphb--drow-lineage');
    log.push('Elf com Drow: ' + $$('.cd-fam-res .cd-chip').map((c) => c.textContent).join(' | '));
    ok(/darkvision 36 m/.test($('.cd-fam-res').textContent) && /Dancing Lights/.test($('.cd-fam-res').textContent), 'Drow: visão 36 m e Dancing Lights');
    await spOpen('Elf', 'PHB');
    log.push('Elf 2014: ' + chips());
    await change(f('opt-view'), 'elf-phb--high');
    log.push('Elf com High: ' + $$('.cd-fam-res .cd-chip').map((c) => c.textContent).join(' | '));
    await spOpen('Human', 'XPHB'); log.push('Human 2024: ' + chips());
    await spOpen('Dragonborn', 'XPHB');
    log.push('Dragonborn 2024: ' + chips() + ' · ataques: ' + $$('.cd-linklist .cd-base span').map((x) => x.textContent).slice(0, 4).join(', ') + '…');
    $$('.cd-linklist .cd-base')[0].click(); await W(120);
    ok(C.tab === 'attacks' && $('[data-act="open-species"]'), 'ataque da espécie e link de volta');
    $('[data-act="open-species"]').click(); await W(120);
    ok(C.tab === 'species' && /^dragonborn/.test(C.sel.species), 'voltar à espécie pelo ataque');
    await spOpen('Tiefling', 'XPHB'); log.push('Tiefling 2024: ' + chips() + ' · ' + $$('.cd-opt .cd-version b').map((b) => b.textContent).join(', '));
    await spOpen('Aarakocra', 'MPMM'); log.push('Aarakocra: ' + chips());
    // filtros
    await clear(); await filt('move', 'fly'); log.push('voam: ' + $('#cd-found').textContent);
    await clear(); await filt('gives', 'options'); log.push('têm sub-raças/linhagens: ' + $('#cd-found').textContent);
    // magia → espécie
    await tab('spells'); await clear(); await search('hellish rebuke'); await filt('edition', '2024'); await open('Hellish Rebuke');
    const spLink = $$('.cd-granted .cd-link').find((a) => /Tiefling/.test(a.textContent));
    log.push('Hellish Rebuke → espécies com link: ' + $$('.cd-granted .cd-link').map((a) => a.textContent).filter((x) => /Tiefling/.test(x)).slice(0, 3).join(', '));
    if (spLink) { spLink.click(); await W(120); ok(C.tab === 'species', 'abrir a espécie pela magia'); }
    // criar com corpo, traço e opção
    await tab('species'); await clear();
    $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Povo da Névoa');
    $$('[data-f="size-Small"]')[0].click(); await W(60);
    await change(f('speed-fly'), App.Units.sys('dist') === 'imperial' ? '30' : '9');
    $('[data-act="tr-add"]').click(); await W(60);
    await change(f('tr-0-name'), 'Corpo de Névoa'); await change(f('tr-0-text'), 'Você pode passar por frestas.');
    $('[data-act="se-add"]').click(); await W(60);
    $('[data-act="opt-add"]').click(); await W(80);
    await change(f('opt-0-name'), 'Névoa Rubra');
    $('[data-act="otr-add"]').click(); await W(60);
    await change(f('otr-0-name'), 'Toque Rubro');
    const ms = C.local.species.custom[C.sel.species];
    ok(ms && ms.size.includes('Small') && ms.size.includes('Medium') && ms.speed.fly === 9 && ms.traits[0].name === 'Corpo de Névoa' && ms.benefits.senses[0].type === 'darkvision', 'corpo, traço e sentido');
    ok(ms.options.length === 1 && ms.options[0].name === 'Névoa Rubra' && ms.options[0].traits[0].name === 'Toque Rubro', 'opção com traço próprio');
    log.push('espécie criada: ' + chips());
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (espécie nova)');

    // ---------- Opções de classe (Plano 48) ----------
    await tab('options');
    const OPx = C.records('options');
    ok(OPx.length === 221 && !OPx.some((x) => x.source === 'WoW'), 'opções carregadas (221, sem WoW)');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (opções)');
    log.push('opções: ' + OPx.length + ' · tipos: ' + $$('.cd-cat').map((c) => c.textContent).join(' · '));
    const opOpen = async (n, src) => { await clear(); await search(n.toLowerCase()); await open(n, src); };
    await opOpen('Agonizing Blast', 'XPHB'); log.push('Agonizing Blast: ' + chips());
    await opOpen('Eldritch Spear', 'PHB'); log.push('Eldritch Spear (PHB): ' + chips());
    $('[data-act="open-pre-spell"]').click(); await W(120);
    ok(C.tab === 'spells' && C.sel.spells === 'eldritch-blast-phb', 'abrir a magia exigida');
    const opBack = $$('.cd-granted .cd-link').find((a) => /Eldritch Spear|Agonizing/.test(a.textContent));
    log.push('Eldritch Blast → opções com link: ' + $$('.cd-granted .cd-link').map((a) => a.textContent).filter((x) => /Eldritch|Agonizing|Repelling/.test(x)).slice(0, 4).join(', '));
    await tab('options');
    await opOpen('Thirsting Blade', 'XPHB');
    log.push('Thirsting Blade: ' + chips());
    $('[data-act="open-pre-option"]').click(); await W(120);
    ok(C.sel.options === 'pact-of-the-blade-xphb', 'abrir a opção exigida');
    await opOpen('Twinned Spell', 'XPHB'); log.push('Twinned Spell: ' + chips());
    await opOpen('Archery', 'PHB'); log.push('Archery (PHB): ' + chips() + ' · aviso: ' + ($('.cd-banner') || {}).textContent);
    $('[data-act="open-reprint"]').click(); await W(120);
    ok(C.tab === 'feats' && C.sel.feats === 'archery-xphb', 'abrir o talento de 2024');
    await tab('options');
    await opOpen('Riposte', 'XPHB'); log.push('Riposte: ' + chips());
    await opOpen('Enhanced Defense', 'TCE'); log.push('Enhanced Defense: ' + chips());
    // filtros
    await clear(); $('.cd-cat[data-cat="EI"]').click(); await W(80); await filt('lvl', '2'); await filt('edition', '2024');
    log.push('Invocações 2024 no nível 2: ' + $('#cd-found').textContent);
    await clear(); await filt('ocls', 'Sorcerer'); log.push('do Sorcerer: ' + $('#cd-found').textContent);
    // talento → tipo de opção
    await tab('feats'); await clear(); await search('eldritch adept'); await open('Eldritch Adept');
    $('[data-act="open-opt-type"]').click(); await W(120);
    ok(C.tab === 'options' && (C.filters.options || {}).cat === 'EI', 'talento abre o tipo de opção');
    log.push('Eldritch Adept → ' + $('.cd-cat.on').textContent + ' (' + $('#cd-found').textContent + ')');
    // criar com custo e pré-requisito de magia
    await clear(); $('.cd-cat[data-cat="MM"]').click(); await W(80);
    $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Magia Ecoante');
    $('[data-act="cost-add"]').click(); await W(60);
    await change(f('cost-resource'), 'Sorcery Point'); await change(f('cost.amount'), '2');
    $('[data-act="pre-add"]').click(); await W(60);
    await change(f('pre-0-0-type'), 'spell');
    await change(f('pre-0-0-names'), 'Fire Bolt | XPHB');
    const mo = C.local.options.custom[C.sel.options];
    ok(mo && mo.types.includes('MM') && mo.cost.amount === 2 && mo.prerequisites[0][0].spells[0] === 'fire-bolt-xphb', 'criar opção com custo e magia exigida');
    log.push('opção criada: ' + chips());
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (opção nova)');

    // ---------- Classes (Plano 49) ----------
    await tab('classes');
    ok(C.records('classes').length === 26, 'classes carregadas (26)');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (classes)');
    log.push('classes: ' + items().map((i) => i.querySelector('b').textContent + ' ' + i.querySelector('.cd-src').textContent).join(', '));
    const clOpen = async (n, src) => { await clear(); await search(n.toLowerCase()); await open(n, src); };
    await clOpen('Wizard', 'XPHB');
    log.push('Wizard 2024: ' + chips());
    const grid = $('.cd-grid');
    log.push('grade: ' + grid.querySelectorAll('tbody tr').length + ' linhas · colunas ' + [...grid.querySelectorAll('thead th')].map((t) => (t.querySelector('input') || t).value || t.textContent).join('|'));
    log.push('nível 1: ' + [...grid.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map((t) => (t.querySelector('input') || {}).value ?? t.textContent).join('|'));
    log.push('características: ' + $$('.cd-feat summary').slice(0, 6).map((x) => x.textContent).join(' · '));
    $('[data-act="open-class-spells"]').click(); await W(150);
    ok(C.tab === 'spells' && (C.filters.spells || {}).cls === 'Wizard', 'abrir as magias da classe');
    log.push('magias do Wizard 2024: ' + $('#cd-found').textContent);
    await tab('classes');
    await clOpen('Barbarian', 'XPHB'); log.push('Barbarian 2024: ' + chips());
    await clOpen('Warlock', 'XPHB'); log.push('Warlock 2024: ' + chips());
    $('[data-act="open-cls-opt"]').click(); await W(150);
    ok(C.tab === 'options' && (C.filters.options || {}).cat === 'EI', 'classe abre o tipo de opção');
    await clear(); await search('agonizing blast'); await open('Agonizing Blast', 'XPHB');
    log.push('Agonizing Blast ← classes: ' + $$('.cd-linklist .cd-base span').map((x) => x.textContent).join(', '));
    await tab('feats'); await clear(); await search('archery'); await open('Archery', 'XPHB');
    log.push('Archery (talento) ← classes: ' + $$('.cd-sec').filter((x) => /Classes que dão/.test(x.textContent)).map((x) => [...x.querySelectorAll('.cd-base span')].map((y) => y.textContent).join(', ')).join(''));
    await tab('spells'); await clear(); await search('fireball'); await filt('edition', '2024'); await open('Fireball');
    log.push('Fireball → classes: ' + $$('.cd-granted .cd-link').filter((a) => /\(20/.test(a.textContent)).map((a) => a.textContent).join(', '));
    await tab('classes');
    await clOpen('Fighter', 'XPHB');
    log.push('Fighter 2024: ' + chips() + ' · multiclasse: ' + $$('.cd-sec').find((x) => /Multiclasse/.test(x.textContent)).querySelector('.hint').textContent.slice(0, 40));
    await clOpen('Monk', 'XPHB');
    log.push('Monk 2024 nível 2: ' + [...$('.cd-grid').querySelectorAll('tbody tr')[1].querySelectorAll('td')].map((t) => (t.querySelector('input') || {}).value ?? t.textContent).join('|'));
    // editar a grade e uma característica de um padrão; voltar
    const cellIn = $('[data-f="cell-0-0"]');
    await change(cellIn, '1d8');
    ok(C.local.classes.edited['monk-xphb'] && C.local.classes.edited['monk-xphb'].progression.rows[0][0] === '1d8', 'editar a grade');
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(80);
    ok(!C.local.classes.edited['monk-xphb'], 'voltar ao padrão (classe)');
    // criar
    await clear(); $('#cd-new').click(); await W(80);
    await change($('.cd-name'), 'Cavaleiro Rúnico');
    await change(f('hd'), '10');
    await change(f('primary'), 'STR or CON');
    $('[data-act="col-add"]').click(); await W(60);
    await change(f('col-0'), 'Runas');
    await change(f('cell-0-0'), '2');
    $('[data-act="feature-add"]').click(); await W(60);
    await change(f('ft-0-name'), 'Marca Rúnica');
    $('[data-act="cast-add"]').click(); await W(60);
    $('[data-act="options-add"]').click(); await W(60);
    await change(f('options-0-type'), 'RN'); await change(f('options-0-levels'), '0, 0, 2, 2, 2, 2, 3');
    const mc = C.local.classes.custom[C.sel.classes];
    ok(mc && mc.hd === 10 && mc.primary.length === 2 && mc.progression.columns[0] === 'Runas' && mc.progression.rows[0][0] === '2' && mc.features[0].name === 'Marca Rúnica' && mc.spellcasting && mc.optionProgression[0].byLevel[19] === 3, 'criar classe');
    log.push('classe criada: ' + chips());
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (classe nova)');

    // ---------- Subclasses (Plano 50) ----------
    await tab('subclasses');
    ok(C.records('subclasses').length === 324, 'subclasses carregadas (324)');
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (subclasses)');
    log.push('subclasses: ' + $$('.cd-cat').map((c) => c.textContent).join(' · '));
    await clear(); $('.cd-cat[data-cat="Wizard"]').click(); await W(80); await filt('ced', '2024');
    log.push('Wizard 2024: ' + $('#cd-found').textContent + ' · ' + items().slice(0, 5).map((i) => i.querySelector('b').textContent).join(', ') + '…');
    await search('evoker'); await open('Evoker', 'XPHB');
    log.push('Evoker: ' + chips());
    $('[data-act="open-class"]').click(); await W(150);
    ok(C.tab === 'classes' && C.sel.classes === 'wizard-xphb', 'subclasse abre a classe');
    const subSec = $$('.cd-sec').find((x) => /^Subclasses \(/.test(x.querySelector('h2').textContent));
    log.push('Wizard 2024 → ' + subSec.querySelector('h2').textContent);
    [...subSec.querySelectorAll('.cd-base')].find((b) => /Evoker/.test(b.textContent)).click(); await W(150);
    ok(C.tab === 'subclasses' && C.sel.subclasses === 'wizard-xphb--evoker-xphb', 'classe abre a subclasse');
    // cópia de 2014 na classe de 2024
    await clear(); await search('divination'); await filt('gives', 'copy');
    items()[0].click(); await W(100);
    log.push('cópia: ' + $('.cd-head .cd-name').value + ' · ' + ($('.cd-banner') || {}).textContent);
    $('[data-act="to-original-sub"]').click(); await W(120);
    ok(C.sel.subclasses === 'wizard-phb--divination-phb', 'abrir a original');
    // magia → subclasse
    await tab('spells'); await clear(); await search('scorching ray'); await filt('edition', '2024'); await open('Scorching Ray');
    const subLink = $$('.cd-granted .cd-link').find((a) => /Cleric: Light/.test(a.textContent));
    log.push('Scorching Ray → ' + (subLink ? subLink.textContent : '(sem link)'));
    if (subLink) { subLink.click(); await W(120); ok(C.tab === 'subclasses' && /cleric/.test(C.sel.subclasses), 'magia abre a subclasse'); }
    log.push('Light 2024: ' + chips());
    // manobra → Battle Master
    await tab('options'); await clear(); await search('riposte'); await open('Riposte', 'XPHB');
    log.push('Riposte ← subclasses: ' + $$('.cd-sec').filter((x) => /Subclasses que escolhem/.test(x.textContent)).map((x) => [...x.querySelectorAll('.cd-base span')].map((y) => y.textContent).join(', ')).join(''));
    await tab('subclasses'); await clear(); await search('eldritch knight'); await filt('ced', '2024'); await open('Eldritch Knight', 'XPHB');
    log.push('Eldritch Knight 2024: ' + chips() + ' · grade: ' + !!$('.cd-grid'));
    // editar um padrão e voltar
    $$('.cd-feat summary')[0].click(); await W(60);
    await change(f('ft-0-name'), 'Spellcasting (editado)');
    ok(C.local.subclasses.edited['fighter-xphb--eldritch-knight-xphb'], 'editar subclasse padrão');
    [...$$('.cd-head .btn')].find((b) => /Voltar ao padrão/.test(b.textContent)).click(); await W(80);
    ok(!C.local.subclasses.edited['fighter-xphb--eldritch-knight-xphb'], 'voltar ao padrão (subclasse)');
    // criar pela classe
    await tab('classes'); await clear(); await search('paladin'); await open('Paladin', 'XPHB');
    $('[data-act="sub-add"]').click(); await W(150);
    ok(C.tab === 'subclasses' && C.local.subclasses.custom[C.sel.subclasses].classId === 'paladin-xphb', 'nova subclasse pela classe');
    await change($('.cd-name'), 'Juramento da Aurora');
    $('[data-act="feature-add"]').click(); await W(60);
    await change(f('ft-0-name'), 'Luz Nascente'); await change(f('ft-0-level'), '3');
    $('[data-act="sp-add"]').click(); await W(60);
    await change(f('sp-0-0-spell'), 'Daylight | XPHB'); await change(f('sp-0-0-how'), 'prepared'); await change(f('sp-0-0-at'), '5');
    const ms2 = C.local.subclasses.custom[C.sel.subclasses];
    ok(ms2.features[0].level === 3 && ms2.spells.groups[0].items[0].spell === 'daylight-xphb', 'subclasse criada com característica e magia');
    log.push('subclasse criada: ' + chips());
    ok(!/(^|[^a-z_])null([^a-z_]|$)/i.test(document.body.innerText), 'texto null na tela (subclasse nova)');

    // ---------- Migração: arquivo antigo com a aba Armas ----------
    App.U.pickFile = async () => new File([JSON.stringify({ format: 'vesper-cadastros', v: 1,
      weapons: { custom: { wpn_x: { id: 'wpn_x', name: 'Espada Velha', source: 'custom', edition: '', category: 'martial', kind: 'melee', damage: { dice: '1d10', type: 'slashing' }, versatile: '', properties: ['Heavy'], mastery: [], reach: 1.5, range: null, weight: 2, cost: 2000, description: '' } },
        edited: { 'dagger-phb': { id: 'dagger-phb', name: 'Dagger', source: 'PHB', edition: '2014', category: 'simple', kind: 'melee', damage: { dice: '1d6', type: 'piercing' }, properties: ['Finesse', 'Light', 'Thrown'], mastery: [], reach: 1.5, range: { normal: 6, long: 18 }, weight: 0.5, cost: 200 } },
        deleted: ['club-phb'] },
      attacks: { custom: {}, edited: { 'w-dagger-phb': { id: 'w-dagger-phb' } }, deleted: ['w-club-phb'] } })], 'velho.json');
    $$('.cd-foot-row .btn')[1].click(); for (let i = 0; i < 30 && !$$('.toast').some((t) => /Importado/.test(t.textContent)); i++) await W(100);
    const I = C.local.items;
    ok(I.custom.wpn_x && I.custom.wpn_x.category === 'Weapon' && I.edited['dagger-phb'].weapon.damage.dice === '1d6' && I.deleted.includes('club-phb'), 'migração das armas');
    ok(!C.local.attacks.edited['w-dagger-phb'] && !C.local.attacks.deleted.includes('w-club-phb'), 'ataques antigos das armas saem');
    log.push('arquivo antigo: ' + ($$('.toast').pop() || {}).textContent + ' · Dagger editada vira item com 1d6: ' + (C.find('items', 'dagger-phb').weapon.damage.dice));

    // Exportar / salvar
    $$('.cd-foot-row .btn')[0].click(); await W(30);
    const ex = JSON.parse(downloaded.text);
    ok(ex.items && !ex.weapons && Object.keys(ex.items.custom).length >= 2, 'exportar com itens');
    await W(400); await C.saveNow();
    const saved = await new Promise((res) => { const r = indexedDB.open('mesarpg', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('cadastros'); q.onsuccess = () => res(q.result); }; });
    ok(saved && saved.items && !saved.weapons, 'IndexedDB no formato novo');
    log.push('exportou ' + Object.keys(ex.items.custom).length + ' itens meus · IndexedDB sem "weapons": ' + !saved.weapons);

    // Pés e libras
    App.Units.setMine({ dist: 'imperial', weight: 'imperial', speed: 'imperial', liquid: 'imperial' });
    await tab('items'); await clear(); await search('longbow'); await filt('edition', '2024'); await open('Longbow');
    log.push('em pés/libras: ' + chips());
    App.Units.setMine(null);
    log.push('largura sem rolagem horizontal: ' + (document.documentElement.scrollWidth <= innerWidth));
  } catch (e) { (window.__err = window.__err || []).push('EXC: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  flush();
  function TABSsum(a) { return a.type + ' · bônus ' + a.attack.bonus + ' · ' + a.damage.map((d) => d.dice + ' ' + d.type).join(' + '); }
}, 300));
