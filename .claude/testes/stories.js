// Plano 33 · Histórias: campanha antiga vira a 1ª, tela de cartões, nova, abrir, salvar na certa, miniatura,
// menu do cartão (renomear, imagem, duplicar, apagar), importar como nova. Rodar com -query '' (menu).
// Com -query '?historias=offline' (como o "Voltar ao menu" do mestre): confere que a tela de Histórias abre sozinha.
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  log.push('início');
  const idb = (fn) => new Promise((res, rej) => { const r = indexedDB.open('mesarpg', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const d = r.result, tx = d.transaction('kv', 'readwrite'), st = tx.objectStore('kv'); const q = fn(st); tx.oncomplete = () => { res(q && q.result); d.close(); }; tx.onerror = () => rej(tx.error); }; });
  const getK = (k) => App.Storage.kv.get(k);
  try {
    const S = App.Store, St = App.Storage;
    St.mem = new Map(); // o IndexedDB não responde no Edge sem tela: a lógica é a mesma, só guarda na memória
    if (!$('#st-screen').hidden) { // aberto com ?historias=offline (o endereço já foi limpo)
      await W(400);
      log.push('voltar ao menu (mestre): tela de Histórias aberta = ' + !$('#st-screen').hidden + ' · título: ' + $('#st-crumb').textContent + ' · cartões: ' + document.querySelectorAll('#st-grid .st-card').length);
      log.push('erros: ' + JSON.stringify(window.__err || []));
      document.body.setAttribute('data-log', JSON.stringify(log));
      return;
    }
    // 1) campanha antiga (uma chave só) com um mapa: vira a primeira história
    const c = document.createElement('canvas'); c.width = 400; c.height = 250;
    const x = c.getContext('2d'); x.fillStyle = '#3a6b3a'; x.fillRect(0, 0, 400, 250); x.fillStyle = '#8a5a2a'; x.fillRect(100, 60, 200, 120);
    const data = c.toDataURL('image/png'), imgId = 'img_' + App.U.hash(data);
    log.push('canvas ok');
    const old = S.newCampaign(); old.name = 'Campanha antiga'; log.push('campanha ok'); old.scenes[old.activeSceneId].bg = imgId;
    await App.Storage.kv.set('campaign', { state: old, assets: { [imgId]: data }, savedAt: Date.now() - 3 * 86400000 });
    log.push('gravou campaign');
    $('#lb-name').value = 'Mestre Teste';
    $('#lb-offline').click(); await W(600);
    const cards = () => [...document.querySelectorAll('#st-grid .st-card')];
    log.push('tela de Histórias: aberta = ' + !$('#st-screen').hidden + ' · menu escondido = ' + $('.mn-main').hidden + ' · título: ' + $('#st-crumb').textContent);
    log.push('cartões: ' + cards().map((el) => (el.querySelector('.st-info b') || {}).textContent + ' [' + ((el.querySelector('.st-info small') || {}).textContent || '') + ']').join(' | '));
    await W(500);
    const list1 = await St.listStories();
    log.push('campanha antiga virou história: ' + (list1[0] && list1[0].name) + ' · miniatura do mapa = ' + !!(list1[0] && list1[0].thumb));
    // 2) menu do cartão
    cards()[0].querySelector('.st-more').click(); await W(50);
    log.push('menu do cartão: ' + [...document.querySelectorAll('.st-menu .st-mi')].map((b) => b.textContent).join(' | '));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await W(30);
    // 3) duplicar e renomear pela API (o menu chama as mesmas funções)
    const dupId = await St.duplicateStory(list1[0].id);
    await St.renameStory(dupId, 'Cópia renomeada');
    const cover = c.toDataURL('image/png');
    await St.setCover(dupId, cover);
    let L = await St.listStories();
    const dup = L.find((s) => s.id === dupId);
    log.push(`duplicar + renomear + imagem: "${dup.name}" · imagem do mestre = ${!!dup.cover} · nome dentro da história = ${(await getK('story:' + dupId)).state.name}`);
    await St.deleteStory(dupId);
    L = await St.listStories();
    log.push('apagar: ' + L.length + ' história(s) · chave apagada = ' + !(await getK('story:' + dupId)));
    // 4) nova história pela tela
    // (renderiza de novo para refletir a lista atual)
    $('#st-back').click(); await W(100); $('#lb-offline').click(); await W(400);
    const add = $('#st-grid .st-new');
    add.click(); await W(50);
    const inp = add.querySelector('input');
    inp.value = 'Torre do Mago';
    add.querySelector('.btn.primary').click(); await W(1200);
    log.push('criou e abriu: mesa aberta = ' + $('#lobby').hidden + ' · campanha: ' + (S.state && S.state.name) + ' · história aberta = ' + !!St.currentId);
    const torre = St.currentId;
    // 5) mexer e salvar: grava na história certa (e não na antiga)
    S.dispatch({ type: 'scene.add', scene: S.newScene('Porão') });
    await St.save();
    const saved = await getK('story:' + torre), first = await getK('story:' + list1[0].id);
    log.push(`salvou na certa: Torre tem ${saved.state.sceneOrder.length} cenas · a antiga continua com ${first.state.sceneOrder.length}`);
    L = await St.listStories();
    log.push('ordem (última mexida primeiro): ' + L.map((s) => s.name + ' (' + s.scenes + ')').join(', '));
    // 6) importar campanha: pergunta; "Criar história nova" cria outra e abre
    const bundle = { format: 'mesarpg', version: 1, state: Object.assign(S.newCampaign(), { name: 'Importada' }), assets: {} };
    const pr = App.UI.importParsed(bundle); await W(100);
    log.push('importar pergunta: ' + [...document.querySelectorAll('.modal-foot .btn')].map((b) => b.textContent).join(' | '));
    [...document.querySelectorAll('.modal-foot .btn')].find((b) => /Criar história nova/.test(b.textContent)).click();
    await pr; await W(300);
    L = await St.listStories();
    log.push(`importou como nova: aberta = ${S.state.name} · histórias = ${L.map((s) => s.name).join(', ')} · a Torre continua = ${!!(await getK('story:' + torre))}`);
    // 7) o "Voltar ao menu" do mestre leva para a tela de Histórias
    log.push('aviso de que salvou o cartão da importada: ' + !!L.find((s) => s.name === 'Importada' && s.id === St.currentId));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
