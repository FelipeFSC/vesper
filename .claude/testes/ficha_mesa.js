// Plano 23: arquivo feito na página "Criar ficha" importado pelo mestre na mesa (rodar com a query padrão ?tutorial)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store;
    // Mesmo formato que js/ficha.js exporta (F.bundle), com imagem e os 5 tipos de ação
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d'); g.fillStyle = '#3c6'; g.fillRect(0, 0, 16, 16);
    const data = c.toDataURL('image/webp', 0.8), img = 'img_' + App.U.hash(data);
    const actor = {
      id: 'ac_pagina1', kind: 'pc', img, color: '#3f8f86', size: 2, owner: '', height: 1.6, coverShow: 'silhouette',
      name: 'Lyra da página',
      bars: [{ name: 'PV', value: 26, max: 24 }, { name: 'Sanidade', value: 5, max: 10 }],
      stats: [{ name: 'Força', value: '4' }, { name: 'Sorte', value: '2' }, { name: 'Defesa', value: 15 }],
      testFormula: '1d20+@valor', initFormula: '1d20+@sorte', notes: 'Criada pela página nova.',
      actions: [
        { name: 'Espada longa', mode: 'attack', attack: '1d20+@forca', defense: 'Defesa', damage: '1d8+@forca', critMin: '19', range: '1', bar: 'PV', cost: '0' },
        { name: 'Bola de fogo', mode: 'save', save: 'Destreza', dc: '13', damage: '8d6', onSave: 'none', area: '2', range: '20', multi: true, cost: '3', costBar: 'Mana' },
        { name: 'Espinhos', mode: 'damage', damage: '2d4' },
        { name: 'Poção', mode: 'heal', damage: '2d4+2' },
        { name: 'Teste livre', mode: 'roll', formula: 'Ataque: 1d20+@forca | Dano: 1d6' },
      ],
    };
    const bundle = { format: 'mesarpg-actor', version: 1, actor, assets: { [img]: data } };
    const before = Object.keys(S.state.actors).length;
    await App.UI.applyImport(JSON.parse(JSON.stringify(bundle))); await W(200);
    const got = Object.values(S.state.actors).find((a) => a.name === 'Lyra da página');
    ok(got && Object.keys(S.state.actors).length === before + 1, 'importada');
    ok(got.id !== actor.id && got.owner === 'all', 'id novo e dono do mestre: ' + got.owner);
    const strip = (a) => JSON.stringify(Object.assign({}, a, { id: 0, owner: 0 }));
    ok(strip(got) === strip(actor), 'tudo igual ao arquivo');
    ok(S.assets[img] === data && App.Images.src(got.img), 'imagem chegou');
    log.push('importada: ' + got.name + ' · dono ' + got.owner + ' · ações ' + got.actions.map((x) => x.mode).join('/') + ' · imagem ' + !!S.assets[img]);
    // Abre a janela da ficha normal do jogo
    const win = [...document.querySelectorAll('.win')].find((w) => /Lyra da página/.test(w.textContent));
    ok(win, 'janela da ficha aberta');
    log.push('janela: ' + (win ? win.querySelector('.win-title').textContent + ' · ações ' + win.querySelectorAll('.act-card').length : 'nenhuma'));
    // O mestre escolhe o jogador em Configurar → Controlado por
    S.dispatch({ type: 'actor.update', id: got.id, patch: { owner: '' } });
    ok(S.state.actors[got.id].owner === '', 'mestre muda o dono');
    // Usa uma ação: as fórmulas com @ funcionam
    const v = S.vars(got);
    ok(v.forca === 4 && v.sorte === 2 && v.sanidade === 5 && v.sanidade_max === 10, 'variáveis');
    log.push('variáveis: ' + JSON.stringify(v));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1500));
