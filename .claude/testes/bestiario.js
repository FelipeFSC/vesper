// Plano 25: bestiário a partir do 5etools (precisa de data/5etools/, gerado por tools/importar-5etools.mjs). Query padrão ?tutorial
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, BS = App.Bestiary, sc = () => S.currentScene();
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    // Token "da web" simulado: o teste não depende da internet
    const fakePng = async (color) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = color; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); return new Promise((r) => c.toBlob(r, 'image/png')); };
    const fetched = [];
    BS.fetch = async (url) => { fetched.push(url); const b = await fakePng('#c33'); return { ok: true, status: 200, blob: async () => b }; };

    ok(!App.BESTIARY5E_INDEX && !document.querySelector('script[src*="5etools"]'), 'a mesa abre sem carregar a base');
    App.UI.leftTab = 'actors'; App.UI.refresh(); await W(200);
    ok($('#btn-bestiary'), 'botão Bestiário');
    $('#btn-bestiary').click();
    for (let i = 0; i < 120 && !(BS.ready && $('.bst-list')); i++) await W(50);
    const total = BS.list.length;
    log.push('abriu: ' + total + ' criaturas · ' + Object.keys(BS.books).length + ' livros · na lista ' + $$('.bst-item').length + ' · contador "' + $('.bst-count').textContent + '"');
    ok(total > 4000 && $$('.bst-item').length === 300, 'base carregada');
    ok(!Object.keys(App.BESTIARY5E_BOOKS || {}).length, 'nenhum livro carregado só por abrir');

    // Filtros
    const setF = async (k, v) => { const el = $(`[data-bf="${k}"]`); el.focus(); if (el.type === 'checkbox') { el.checked = v; el.dispatchEvent(new Event('change')); } else { el.value = v; el.dispatchEvent(new Event(k === 'q' ? 'input' : 'change')); } await W(30); };
    const count = () => Number($('.bst-count').textContent.split(' ')[0]);
    await setF('book', 'XMM'); const xmm = count(); await setF('book', '');
    await setF('type', 'npc'); const npc = count(); await setF('type', '');
    await setF('type', 'dragon'); const dragons = count(); await setF('type', '');
    await setF('hideOld', true); const fresh = count(); await setF('hideOld', false);
    await setF('cr', '17-30'); const big = count(); await setF('cr', '');
    await setF('q', 'goblin warrior'); const gw = $$('.bst-item .name').map((e) => e.textContent);
    ok(document.activeElement && document.activeElement.dataset.bf === 'q', 'busca mantém o foco');
    log.push(`filtros: XMM ${xmm} · NPCs ${npc} · dragões ${dragons} · sem versões antigas ${fresh} de ${total} · ND 17+ ${big} · "goblin warrior": ${gw.join(', ')}`);
    ok(xmm > 400 && npc > 1000 && dragons > 100 && fresh < total && big > 50 && gw.length >= 1, 'filtros');
    const bookSel = $('[data-bf="book"]'), phb = [...bookSel.options].find((o) => o.value === 'XPHB');
    log.push('livro no filtro: ' + (phb ? phb.textContent : 'XPHB sem criaturas') + ' · ' + [...bookSel.options].find((o) => o.value === 'MM').textContent);

    // Prévia: Goblin Warrior (XMM)
    $$('.bst-item').find((e) => e.dataset.ref === 'goblin warrior|xmm').click();
    for (let i = 0; i < 60 && !$('.bst-block'); i++) await W(50);
    const pv = $('.bst-prev');
    ok(App.BESTIARY5E_BOOKS && App.BESTIARY5E_BOOKS.XMM && Object.keys(App.BESTIARY5E_BOOKS).length === 1, 'carregou só o livro da criatura');
    log.push('prévia: ' + pv.querySelector('h3').textContent + ' · ' + pv.querySelector('.bst-head .muted').textContent + ' · ' + $$('.bst-line').slice(0, 3).map((x) => x.textContent).join(' | '));
    ok(/Armor Class\s*15/.test(pv.textContent) && /Melee Attack Roll: \+4/.test(pv.textContent) && !/\{@/.test(pv.textContent), 'ficha completa sem marcações');
    // Unidades do Brasil
    await setF('units', 'br'); await W(100);
    const reach = $$('.bst-act').map((x) => x.textContent).find((t) => /Scimitar/.test(t)) || '';
    log.push('unidades Brasil: ' + reach.slice(0, 90));
    ok(/1,5 m/.test(reach) && /9 m/.test($('.bst-prev').textContent), 'unidades convertidas');
    await setF('units', 'orig'); await W(100);
    ok(/5 ft/.test($('.bst-prev').textContent), 'unidades originais');
    // Abas
    [...$$('.bst-tabs button')].find((b) => /Descrição/.test(b.textContent)).click(); await W(150);
    const desc = $('.bst-pane').textContent;
    [...$$('.bst-tabs button')].find((b) => /Imagens/.test(b.textContent)).click(); await W(150);
    const arts = $$('.bst-art img').map((i) => i.getAttribute('src'));
    log.push('descrição: ' + desc.slice(0, 80) + '… · imagens: ' + arts.length + ' (' + (arts[0] || '').slice(0, 90) + ')');
    ok(desc.length > 40 && arts.length >= 1 && arts.every((u) => /^https:\/\/raw\.githubusercontent\.com\/5etools-mirror-3\/5etools-img\//.test(u)), 'descrição e imagens');
    [...$$('.bst-tabs button')].find((b) => /Ficha/.test(b.textContent)).click(); await W(100);

    // Adicionar à campanha: token da web vira imagem da campanha
    await setF('q', '');
    const n0 = Object.keys(S.state.actors).length;
    const idG = await BS.addToCampaign('goblin warrior|xmm'); await W(100);
    const g = S.state.actors[idG];
    log.push('ficha: ' + g.name + ' · ' + g.kind + ' · PV ' + g.bars[0].max + ' · ' + g.stats.map((s) => s.name.slice(0, 3) + ' ' + s.value).join(', ') + ' · ações ' + g.actions.length + ' · dados5e ' + Object.keys(g.dados5e).length + ' campos · token baixado de ' + (fetched[0] || '').slice(-40));
    ok(g && g.img && S.assets[g.img] && /tokens\/XMM\/Goblin%20Warrior\.webp$/.test(fetched[0] || ''), 'token da web na ficha');
    // Plano 74: a primeira ilustração do 5etools vira a imagem do personagem
    ok(g.art && S.assets[g.art] && fetched.some((u) => u.includes('5etools-img/main/bestiary/XMM/')), 'ilustração do 5etools vira a imagem do personagem');
    log.push('imagem do personagem: ' + (fetched.find((u) => u.includes('5etools-img/main/bestiary/XMM/')) || 'nenhuma'));
    ok(g.bars[0].max === 10 && g.stats.find((s) => s.name === 'Defesa').value === 15 && g.stats.find((s) => s.name === 'Destreza').value === 2, 'PV, Defesa e atributos');
    // Plano 53: a ficha é a de criatura 5e, com as ações do livro prontas para a mesa
    ok(g.sistema === '5e' && g.dnd5e.npc && g.actions.length > 0 && g.dados5e && g.dados5e.name === 'Goblin Warrior', 'ficha de criatura com as ações do livro e os dados');
    ok(await BS.addToCampaign('goblin warrior|xmm') === idG && Object.keys(S.state.actors).length === n0 + 1, 'não duplica');

    // Colocar no mapa: dragão vermelho adulto (2024)
    const idD = await BS.place('adult red dragon|xmm'); await W(100);
    const dt = Object.values(sc().tokens).find((t) => t.actorId === idD);
    log.push('dragão no mapa: tamanho ' + (dt && dt.size) + ' · visão no escuro ' + (dt && dt.darkvision) + ' · imagem ' + !!S.state.actors[idD].img);
    ok(dt && dt.size === 3 && dt.darkvision === 24 && S.state.actors[idD].img, 'dragão no mapa');

    // Rolar PV de cada token
    S.dispatch({ type: 'actor.update', id: idG, patch: { rollHp: true } });
    for (let i = 0; i < 4; i++) App.Board.placeActor(idG, { x: 300 + i * 80, y: 600 });
    await W(50);
    const hps = Object.values(sc().tokens).filter((t) => t.actorId === idG).map((t) => t.bars[0].max);
    log.push('PV rolado (3d6): ' + hps.join(', '));
    ok(hps.length === 4 && hps.every((v) => v >= 3 && v <= 18), 'rolar PV');

    // Pasta local por cima do token
    const pngFile = async (name) => new File([await fakePng('#3a3')], name, { type: 'image/png' });
    BS.addFiles([[ 'Goblin_Warrior_A1.png', await pngFile('Goblin_Warrior_A1.png')], ['Red_Dragon.png', await pngFile('Red_Dragon.png')]]);
    const how = (k) => { const im = BS.imageOf(BS.byKey.get(k)); return im ? im.how + ':' + (im.path || 'web') : '-'; };
    log.push('imagens: goblin ' + how('goblin warrior|xmm') + ' · dragão adulto ' + how('adult red dragon|xmm') + ' · goblin 2014 ' + how('goblin|mm'));
    ok(/^pasta:Goblin_Warrior/.test(how('goblin warrior|xmm')) && /^grupo:Red_Dragon/.test(how('adult red dragon|xmm')) && /^token/.test(how('goblin|mm')), 'pasta local por cima do token');
    await BS.link('goblin|mm', 'Red_Dragon.png');
    ok(/^mão/.test(how('goblin|mm')), 'escolher à mão');

    // Meu bestiário pela ficha
    App.UI.openActor(idG, 'config'); await W(100);
    const saveBtn = [...$$('.win .btn')].find((b) => /meu bestiário/.test(b.textContent));
    ok(saveBtn, 'botão Salvar no meu bestiário');
    saveBtn.click();
    for (let i = 0; i < 40 && !S.state.actors[idG].mineId; i++) await W(50);
    const mineId = S.state.actors[idG].mineId;
    ok(mineId && BS.mine[mineId] && BS.mine[mineId].img, 'salvo no meu bestiário');
    S.dispatch({ type: 'actor.delete', id: idG, tokens: true }); await W(50);
    const idM = await BS.addToCampaign('mine:' + mineId);
    ok(S.state.actors[idM] && S.state.actors[idM].mineId === mineId, 'volta do meu bestiário');
    ok(S.state.actors[idM].art && BS.mine[mineId].art, 'imagem do personagem salva no meu bestiário'); // Plano 74

    // Jogador não abre
    S.viewAs = '*'; App.UI.refresh(); await W(100);
    ok(!S.gmView(), 'ver como jogador');
    S.viewAs = null; App.UI.refresh(); await W(100);
    if (location.hash === '#shot') {
      BS.links = {}; BS.files = new Map(); BS.fetch = null;
      App.UI.closeWindow('bestiary'); await W(50);
      Object.assign(BS.filter, { sel: 'adult red dragon|xmm', q: 'dragon', tab: 'ficha' }); BS.open(); await W(2500);
    }
    log.push('fim do bestiário');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
