// Plano 23: página "Criar ficha" (rodar com -page 'ficha.html' -query '')
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const F = App.Ficha, ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const change = async (el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(20); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    for (let i = 0; i < 100 && !App.Ficha.ready; i++) await W(50);
    const mobile = location.hash === '#mobile';
    // Página vazia
    ok($('.fp-empty'), 'estado vazio'); ok(!$('#app') && !$('canvas'), 'sem mesa nem tabuleiro');
    log.push('vazio: ' + $('.fp-empty b').textContent);
    [...$$('.fp-empty .btn')].find((b) => /personagem/i.test(b.textContent)).click(); await W(30);
    let a = Object.values(F.actors)[0];
    ok(a && a.kind === 'pc' && a.bars.length === 2 && a.stats.length === 7, 'ficha nova com padrões');
    log.push('nova: ' + a.name + ' · barras ' + a.bars.map((b) => b.name).join('/') + ' · atributos ' + a.stats.length + ' · foco no nome ' + (document.activeElement === $('.fp-name')));

    // Identidade
    await change($('.fp-name'), 'Lyra Ventobravo');
    await change($('[data-f="tipo"]'), 'npc'); await change($('[data-f="tipo"]'), 'pc');
    await change($('[data-f="tamanho"]'), '2');
    await change($('[data-f="cor"]'), '#3f8f86');
    await change($('[data-f="altura"]'), '1,6');
    await change($('[data-f="muro"]'), 'silhouette');
    a = F.actors[a.id];
    ok(a.name === 'Lyra Ventobravo' && a.size === 2 && a.color === '#3f8f86' && a.height === 1.6 && a.coverShow === 'silhouette', 'identidade');
    log.push('identidade: ' + [a.name, a.kind, a.size, a.color, a.height, a.coverShow].join(' | ') + ' · lista: ' + $('.fp-item.on .name').textContent);

    // Barras
    await change($('[data-f="bar-max-0"]'), '24');
    await change($('[data-f="bar-val-0"]'), '30');
    await change($('[data-f="bar-val-0"]'), '-4');
    ok(a.bars[0].max === 24 && a.bars[0].value === 26, 'barra +/-');
    await change($('[data-f="bar-val-1"]'), '-1d4');
    ok(a.bars[1].value >= 6 && a.bars[1].value <= 9, 'barra -1d4');
    $('[data-add="bar"]').click(); await W(20);
    ok(a.bars.length === 3, 'adicionar barra');
    await change($('[data-f="bar-nome-2"]'), 'Sanidade');
    $$('.fp-bar')[2].querySelector('.icon-btn').click(); await W(20);
    ok(a.bars.length === 2, 'remover barra');
    log.push('barras: ' + a.bars.map((b) => `${b.name} ${b.value}/${b.max}`).join(', '));

    // Atributos
    await change($('[data-f="attr-val-0"]'), '4');
    const add = $('[data-add="attr"]');
    await change(add, '+'); await W(20);
    ok(a.stats.length === 8 && a.stats[7].name === 'Novo atributo', 'atributo novo (escrito)');
    log.push('atributo novo com foco: ' + (document.activeElement && document.activeElement.dataset.f));
    await change($('[data-f="attr-nome-7"]'), 'Sorte');
    await change($('[data-f="attr-val-7"]'), '2');
    $$('.fp-stat')[1].querySelector('.fp-stat-top .icon-btn').click(); await W(20);
    ok(a.stats.length === 7 && !a.stats.some((s) => s.name === 'Destreza'), 'remover atributo');
    await change($('[data-add="attr"]'), 'Destreza');
    ok(a.stats.some((s) => s.name === 'Destreza'), 'atributo da lista');
    log.push('atributos: ' + a.stats.map((s) => s.name + ' ' + s.value).join(', ') + ' · @' + $$('.fp-stat .key').map((k) => k.textContent).join(' '));
    $$('.fp-stat')[0].querySelector('.fp-stat-foot .icon-btn').click(); await W(20);
    ok(!$('#fp-rolls').hidden && /Teste de Força/.test($('#fp-rolls').textContent), 'rolar teste');
    log.push('rolagem: ' + $('.fp-roll').textContent);
    await change($('[data-f="testFormula"]'), '1d20+@valor+@nada');
    ok($('.f-err') && /@nada não existe/.test($('.f-err').textContent), 'aviso de @variável');
    log.push('aviso: ' + $('.f-err').textContent);
    await change($('[data-f="testFormula"]'), '1d20+@valor');
    await change($('[data-f="initFormula"]'), '1d20+@destreza');
    ok(!$('.f-err'), 'sem aviso');

    // Ações: os 5 tipos
    $('[data-add="act"]').click(); await W(20);
    ok(a.actions.length === 1 && F.act === 0 && $('.fp-act-edit'), 'nova ação aberta');
    await change($('[data-f="ac-name"]'), 'Espada longa');
    await change($('[data-f="ac-attack"]'), '1d20');
    await change($('.fp-act-edit .attr-ins'), 'forca');
    ok(a.actions[0].attack === '1d20+@forca', '+ atributo na fórmula: ' + a.actions[0].attack);
    await change($('[data-f="ac-defense"]'), 'Defesa');
    await change($('[data-f="ac-damage"]'), '1d8+@forca');
    await change($('[data-f="ac-critMin"]'), '19');
    await change($('[data-f="ac-range"]'), '1');
    await change($('[data-f="ac-bar"]'), 'PV');
    await change($('[data-f="ac-cost"]'), '0');
    log.push('ataque: ' + $('.fp-act.on .act-sum').textContent);
    // Duplicar e virar resistência
    [...$$('.fp-act-edit .btn')].find((b) => /Duplicar/.test(b.textContent)).click(); await W(20);
    ok(a.actions.length === 2 && F.act === 1 && a.actions[1].name === 'Espada longa (cópia)', 'duplicar ação');
    await change($('[data-f="ac-name"]'), 'Bola de fogo');
    await change($('[data-f="ac-mode"]'), 'save');
    ok($('[data-f="ac-dc"]') && $('[data-f="ac-area"]') && $('[data-f="ac-onSave"]'), 'campos de resistência');
    await change($('[data-f="ac-save"]'), 'Destreza'); await change($('[data-f="ac-dc"]'), '13');
    await change($('[data-f="ac-damage"]'), '8d6'); await change($('[data-f="ac-onSave"]'), 'none');
    await change($('[data-f="ac-area"]'), '2'); await change($('[data-f="ac-range"]'), '20');
    await change($('[data-f="ac-multi"]'), 'true');
    await change($('[data-f="ac-cost"]'), '3'); await change($('[data-f="ac-costBar"]'), 'Mana');
    log.push('resistência: ' + $('.fp-act.on .act-sum').textContent + ' · custo ' + $('.fp-act.on .badge').textContent);
    // Dano, cura, só rolar
    for (const [mode, nm, extra] of [['damage', 'Espinhos', ['ac-damage', '2d4']], ['heal', 'Poção', ['ac-damage', '2d4+2']], ['roll', 'Teste livre', ['ac-formula', 'Ataque: 1d20+@forca | Dano: 1d6']]]) {
      $('[data-add="act"]').click(); await W(20);
      await change($('[data-f="ac-name"]'), nm); await change($('[data-f="ac-mode"]'), mode);
      await change($('[data-f="' + extra[0] + '"]'), extra[1]);
      log.push(mode + ': ' + $('.fp-act.on .act-sum').textContent + ' · campos ' + $$('.fp-act-edit [data-f]').length);
    }
    ok(!$('[data-f="ac-range"]'), 'só rolar sem alcance');
    [...$$('.fp-act-edit .btn')].find((b) => /Testar/.test(b.textContent)).click(); await W(20);
    ok(/Teste livre/.test($('.fp-roll').textContent) && $$('.fp-roll')[0].querySelectorAll('.fp-roll-part').length === 2, 'testar ação');
    log.push('testar: ' + $('.fp-roll').textContent);
    // Remover uma ação (Espinhos)
    $$('.fp-act')[2].querySelector('.icon-btn').click(); await W(20);
    ok(a.actions.length === 4 && !a.actions.some((x) => x.name === 'Espinhos'), 'remover ação');
    // Clicar em outra ação abre o formulário dela
    $$('.fp-act')[0].click(); await W(20);
    ok($('[data-f="ac-name"]').value === 'Espada longa', 'abrir outra ação');
    log.push('ações: ' + a.actions.map((x) => x.name + '(' + x.mode + ')').join(', '));

    // Notas
    await change($('[data-f="notas"]'), 'Criada pela página nova.');
    ok(a.notes === 'Criada pela página nova.', 'notas');

    // Foco: mudar um campo e ir para o próximo com Tab não perde o cursor
    const nm = $('.fp-name'); nm.focus(); nm.value = 'Lyra';
    nm.dispatchEvent(new Event('change', { bubbles: true }));
    $('[data-f="altura"]').focus(); await W(30);
    ok(document.activeElement && document.activeElement.dataset.f === 'altura', 'foco mantido depois de redesenhar');
    log.push('foco depois de mudar: ' + (document.activeElement && document.activeElement.dataset.f));

    // Imagem
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 16, 16);
    F.setImage(c.toDataURL('image/webp', 0.8)); await W(20);
    ok(a.img && F.assets[a.img] && /url\(/.test($('.fp-avatar').style.background), 'imagem');

    // Duplicar ficha e excluir a cópia
    [...$$('.fp-foot .btn')].find((b) => /Duplicar/.test(b.textContent)).click(); await W(20);
    ok(Object.keys(F.actors).length === 2 && F.actors[F.sel].name === 'Lyra (cópia)', 'duplicar ficha');
    const oc = window.confirm; window.confirm = () => true;
    $('.fp-foot .btn.danger').click(); await W(20);
    window.confirm = oc;
    ok(Object.keys(F.actors).length === 1 && !F.sel && $('.fp-empty'), 'excluir ficha');
    F.select(a.id); await W(20);

    // Exportar: mesmo formato da mesa, com a imagem
    const bun = F.bundle(a);
    ok(bun.format === 'mesarpg-actor' && bun.version === 1 && bun.assets[a.img], 'formato do arquivo');
    log.push('arquivo: ' + bun.format + ' · imagens ' + Object.keys(bun.assets).length + ' · ' + JSON.stringify(bun).length + ' bytes');
    // Importar de volta: ficha nova, igual
    const b = F.importObj(JSON.parse(JSON.stringify(bun))); await W(20);
    const same = (x) => JSON.stringify(Object.assign({}, x, { id: 0 }));
    ok(b.id !== a.id && same(b) === same(a), 'importar devolve a mesma ficha');
    ok((() => { try { F.importObj({ format: 'mesarpg', state: {} }); return false; } catch (e) { log.push('arquivo errado: ' + e.message); return true; } })(), 'recusa campanha');

    // Salvo neste navegador
    await F.saveNow();
    const saved = await new Promise((res) => { const r = indexedDB.open('mesarpg', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('fichas'); q.onsuccess = () => res(q.result); }; });
    ok(saved && Object.keys(saved.actors).length === 2 && saved.assets[a.img], 'gravado no IndexedDB');
    log.push('salvo: ' + Object.keys(saved.actors).length + ' fichas · ' + $('#fp-saved').textContent);
    // A campanha não é tocada
    const camp = await new Promise((res) => { const r = indexedDB.open('mesarpg', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('campaign'); q.onsuccess = () => res(q.result); }; });
    ok(!camp, 'campanha intacta');

    // Busca
    F.sideOpen = true; F.render();
    const s = $('[data-f="filtro"]'); s.focus(); s.value = 'zzz'; s.dispatchEvent(new Event('input')); await W(20);
    ok(!$$('.fp-item').length && document.activeElement === $('[data-f="filtro"]'), 'busca');
    s.value = ''; $('[data-f="filtro"]').value = ''; $('[data-f="filtro"]').dispatchEvent(new Event('input')); await W(20);

    if (mobile) log.push('largos: ' + $$('body *').filter((e) => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map((e) => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().width)).join(' ; '));
    // A partir do bestiário (Plano 25; token "da web" simulado)
    App.Bestiary.fetch = async () => { const c = document.createElement('canvas'); c.width = c.height = 32; c.getContext('2d').fillRect(0, 0, 32, 32); const b = await new Promise((r) => c.toBlob(r, 'image/png')); return { ok: true, status: 200, blob: async () => b }; };
    const nBefore = Object.keys(F.actors).length;
    [...$$('.fp-side-foot .btn')].find((x) => /bestiário/.test(x.textContent)).click();
    for (let i = 0; i < 100 && !$('.fp-bst-item'); i++) await W(50);
    ok($$('.fp-bst-item').length > 100, 'lista do bestiário na página');
    const bq = $('.fp-bst-modal input'); bq.value = 'wolf'; bq.dispatchEvent(new Event('input')); await W(20);
    log.push('bestiário na página: ' + $$('.fp-bst-item .name').map((x) => x.textContent).join(', '));
    $$('.fp-bst-item').find((x) => /^Wolf$/.test(x.querySelector('.name').textContent) && /\(XMM\)/.test(x.textContent)).click();
    for (let i = 0; i < 40 && Object.keys(F.actors).length === nBefore; i++) await W(50);
    const wolf = F.actors[F.sel];
    ok(wolf && wolf.bestiaryId === 'wolf|xmm' && wolf.actions.length === 0 && wolf.bars[0].max === 11 && wolf.img && F.assets[wolf.img] && wolf.dados5e && !$('.fp-bst-modal'), 'ficha a partir do lobo');
    log.push('ficha do lobo: ' + wolf.name + ' · ' + wolf.stats.map((s) => s.name.slice(0, 3) + ' ' + s.value).join(', ') + ' · token ' + !!wolf.img + ' · notas ' + wolf.notes.split('\n')[1]);
    // Gravação do bestiário no navegador (ligação à mão e Meu bestiário)
    await App.Bestiary.link('wolf|xmm', 'lobo.png');
    await App.Bestiary.saveMine(wolf, null);
    const kvl = await App.Bestiary.kv('links'), kvm = await App.Bestiary.kv('mine');
    ok(kvl && kvl['wolf|xmm'] === 'lobo.png' && kvm && Object.values(kvm).some((m) => m.actor.bestiaryId === 'wolf|xmm'), 'bestiário gravado no navegador');
    log.push('gravado: ligação ' + (kvl && kvl['wolf|xmm']) + ' · meu bestiário ' + (kvm ? Object.keys(kvm).length : 0));
    log.push('largura: página ' + document.documentElement.scrollWidth + ' / janela ' + innerWidth);
    ok(document.documentElement.scrollWidth <= innerWidth, 'sem rolagem para o lado');
    if (location.hash === '#shot' || mobile) { if (mobile && $('.fp-rolls-head .icon-btn')) $('.fp-rolls-head .icon-btn').click(); F.select(a.id); $('#fp-main').scrollTop = 0; scrollTo(0, 0); document.activeElement.blur(); }
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 600));
