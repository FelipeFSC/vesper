// Plano 31 · Portais e sub-cenas: ferramenta, mesmo mapa (trem), outra cena (escada) com ida e volta,
// grupo junto, desligado, "quem passa", mestre arrastando, câmera, painel, menu, migração, sub-cenas (lista, apagar, exportar/importar)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    if (UI.mode !== 'edit') UI.setMode('edit');
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'combat.end' });
    (sc().triggers || []).slice().forEach((t) => S.dispatch({ type: 'trigger.delete', sceneId: sid, id: t.id }));
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => t.id !== hero.id);
    if (!Object.keys(S.state.players).length) S.dispatch({ type: 'player.upsert', id: 'p1', name: 'Ana', color: '#38bdf8' });
    const pid = Object.keys(S.state.players).find((p) => S.canControl(sc().tokens[hero.id], p)) || 'p1';
    const place = (id, cx, cy, scId) => S.dispatch({ type: 'token.move', sceneId: scId || sid, id, x: cx * g, y: cy * g, fromTrigger: true });
    const walk = (id, pts, scId) => S.remoteAction({ type: 'token.move', sceneId: scId || sid, id, x: pts[pts.length - 1][0] * g, y: pts[pts.length - 1][1] * g, path: pts.map(([x, y]) => [x * g, y * g]), at: Date.now() }, pid);
    const cellOf = (t) => (t ? `(${t.x / g}, ${t.y / g})` : '(sumiu)');
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => ({ clientX: rect.left + (x - B.cam.x) * B.cam.z, clientY: rect.top + (y - B.cam.y) * B.cam.z });
    const ev = (type, x, y) => (type === 'pointerdown' ? B.canvas : window).dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y))));
    const click = (x, y) => { ev('pointerdown', x, y); ev('pointerup', x, y); };
    const trs = () => sc().triggers || [];
    B.cam.x = 0; B.cam.y = 0; B.cam.z = 0.6; B.requestRender(); await W(50);

    // 1) ferramenta Portal: botão, tecla K, opções (só a forma), clique cria um portal de 1 quadrado
    const btn = $('#toolbar [data-tool="portal"]');
    log.push('botão Portal na barra: ' + !!btn + ' · título: ' + (btn && btn.title.split('\n')[0]));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true })); await W(50);
    log.push('tecla K: ferramenta ' + B.tool + ' · opções: ' + [...document.querySelectorAll('#tool-opts .to-row')].map((b) => b.textContent).join(' | '));
    B.trigShape = 'rect';
    click(9.5 * g, 2.5 * g); await W(50);
    const p1 = trs().find((t) => t.portal);
    log.push(`clique criou: ${p1 && p1.name} · portal=${p1 && p1.portal} · quem=${p1 && p1.who} · vezes=${p1 && p1.times} · ações=${p1 && p1.actions.map((a) => a.type)}`);
    UI.refresh(); B.render(); await W(100);
    log.push('painel: ' + [...document.querySelectorAll('#token-hud .eyebrow')].map((e) => e.textContent).join(' | ') + ' · sem destino: ' + /Escolha o ponto/.test($('#token-hud').textContent));

    // 2) mesmo mapa (trem): escolher o ponto no mapa e passar
    const p1b = B.addTrigger(sc(), { shape: 'circle', x: 2.5 * g, y: 6.5 * g, r: 0.5, portal: true, name: 'Fim do trem' });
    B.selectObj('trigger', trs().find((t) => t.id === p1.id)); UI.refresh(); B.render(); await W(50);
    [...document.querySelectorAll('#token-hud .btn')].find((b) => /Ligar a um portal/.test(b.textContent)).click(); await W(50);
    click(2.5 * g, 6.5 * g); await W(80);
    TG.setTwoWay(sid, p1.id, false);
    const d1 = TG.portalDest(sc(), trs().find((t) => t.id === p1.id));
    log.push(`destino escolhido: (${d1.x / g - 0.5}, ${d1.y / g - 0.5}) · mesmo mapa: ${d1.scene.id === sid}`);
    place(hero.id, 7, 2);
    walk(hero.id, [[7, 2], [9, 2]]); await W(50);
    const h1 = sc().tokens[hero.id];
    log.push(`jogador andou para dentro: token em ${cellOf(h1)} (esperado (2, 6)) · marca de brilho: ${!!h1.warp} · rastro termina na ponta: ${JSON.stringify(h1.lastMove && h1.lastMove.pts[h1.lastMove.pts.length - 1])}`);
    B.render(); await W(30);
    log.push('brilho na tela: ' + B.warps.length + ' (saída e chegada)');
    // efeito desligado: passa sem brilho
    const fxBox = [...document.querySelectorAll('#token-hud label.check')].find((l) => /Efeito de brilho/.test(l.textContent));
    log.push('opção "Efeito de brilho ao passar" no painel: ' + !!fxBox + ' · ligada = ' + (fxBox && fxBox.querySelector('input').checked));
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: p1.id, patch: { fx: false } });
    B.warps = []; place(hero.id, 7, 2); B.render();
    walk(hero.id, [[7, 2], [9, 2]]); B.render();
    log.push(`efeito desligado: token em ${cellOf(sc().tokens[hero.id])} · brilhos = ${B.warps.length}`);
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: p1.id, patch: { fx: true } });

    // 3) três tokens juntos: cada um num quadrado livre
    const extra = [];
    for (let i = 0; i < 2; i++) { const t = Object.assign({}, gob, { id: 'tk_p' + i, name: 'Guarda ' + (i + 1), x: 9 * g, y: 2 * g }); S.dispatch({ type: 'token.add', sceneId: sid, token: t }); extra.push(t.id); }
    place(hero.id, 9, 2);
    TG.fire(sid, p1.id, null, { manual: true }); await W(30);
    const cells = [hero.id].concat(extra).map((id) => cellOf(sc().tokens[id]));
    log.push(`três juntos (Disparar agora): ${cells.join(' ')} · todos diferentes: ${new Set(cells).size === 3}`);
    extra.forEach((id) => S.dispatch({ type: 'token.delete', sceneId: sid, id }));

    // 4) desligado não leva; "só o grupo" não leva goblin; mestre arrastando o goblin passa (e a câmera dele vai junto)
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: p1.id, patch: { enabled: false } });
    place(hero.id, 7, 2); walk(hero.id, [[7, 2], [9, 2]]);
    log.push('desligado: token em ' + cellOf(sc().tokens[hero.id]) + ' (esperado (9, 2))');
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: p1.id, patch: { enabled: true, who: 'party' } });
    place(gob.id, 7, 2);
    S.dispatch({ type: 'token.move', sceneId: sid, id: gob.id, x: 9 * g, y: 2 * g, path: [[7 * g, 2 * g], [9 * g, 2 * g]], at: Date.now() });
    log.push('só o grupo, goblin arrastado pelo mestre: ' + cellOf(sc().tokens[gob.id]) + ' (esperado (9, 2))');
    S.dispatch({ type: 'trigger.update', sceneId: sid, id: p1.id, patch: { who: 'any' } });
    place(gob.id, 7, 2); B.lastDragId = gob.id; B.lastDragAt = Date.now(); const cam0 = B.cam.x;
    S.dispatch({ type: 'token.move', sceneId: sid, id: gob.id, x: 9 * g, y: 2 * g, path: [[7 * g, 2 * g], [9 * g, 2 * g]], at: Date.now() });
    B.render();
    log.push(`qualquer token, mestre arrastou o goblin: ${cellOf(sc().tokens[gob.id])} · câmera do mestre foi junto: ${B.cam.x !== cam0}`);

    // 5) sub-cena pela lista de cenas
    UI.leftTab = 'scenes'; UI.refresh(); await W(150);
    const mainItem = [...document.querySelectorAll('.scene-item')].find((el) => el.querySelector('.name').textContent === S.state.scenes[sid].name);
    mainItem.querySelector('[title^="Nova sub-cena"]').click(); await W(150);
    const subId = S.state.sceneOrder.find((id) => S.state.scenes[id].parent === sid);
    document.querySelectorAll('.win').forEach((w) => { const c = w.querySelector('.win-close, [title="Fechar"]'); if (c) c.click(); });
    S.viewSceneId = null; S.emit('local'); UI.refresh(); await W(150);
    const subEl = [...document.querySelectorAll('.scene-item.sub-scene')];
    log.push(`sub-cena criada: "${subId && S.state.scenes[subId].name}" · pai certo: ${S.state.scenes[subId].parent === sid} · na lista recuada: ${subEl.length} · principal diz: ${mainItem && [...document.querySelectorAll('.scene-item')].find((el) => !el.classList.contains('sub-scene')).querySelector('.sub').textContent}`);

    // 6) outra cena (escada): o destino já vem com ida e volta; escolher o ponto na sub-cena
    const p2 = B.addTrigger(sc(), { shape: 'rect', pts: [[12 * g, 4 * g], [13 * g, 4 * g], [13 * g, 5 * g], [12 * g, 5 * g]], portal: true });
    B.selectObj('trigger', p2); UI.refresh(); B.render(); await W(100);
    const opts = [...document.querySelectorAll('#token-hud select')][0];
    log.push('destinos no painel: ' + [...opts.options].map((o) => o.textContent).join(' | ') + ' · portalTargets: ' + JSON.stringify(UI.portalTargets(sc())) + ' · hud: ' + document.querySelector('#token-hud').textContent.slice(0, 80) + ' · ordem: ' + S.state.sceneOrder.length + ' · sel=' + B.selectedTrigger + ' p1=' + p1.id + ' p2=' + (p2 && p2.id) + ' · foco: ' + (document.activeElement && document.activeElement.className) + ' · cena: ' + sc().id + ' sid ' + sid);
    const bk0 = App.Triggers.newPortal(S.state.scenes[subId], { shape: 'circle', x: 5.5 * g, y: 5.5 * g, r: 0.5, name: 'Escada de baixo' });
    S.dispatch({ type: 'trigger.add', sceneId: subId, trigger: bk0 });
    const back = bk0;
    opts.value = subId; opts.dispatchEvent(new Event('change')); await W(150);
    B.render(); log.push('ligar a um portal: tela foi para a sub-cena = ' + (sc().id === subId) + ' · escolhendo = ' + !!B.picking);
    click(5.5 * g, 5.5 * g); await W(100); B.render(); await W(100);
    const back2 = (S.state.scenes[subId].triggers || []).find((t) => t.id === back.id), bc = TG.center(back2);
    log.push(`depois do clique: voltou = ${sc().id === sid} · portal selecionado = ${B.selectedTrigger === p2.id} · ligado a "${(TG.portalPartner(sc(), trs().find((t) => t.id === p2.id)) || { tr: {} }).tr.name}" em (${bc.x / g - 0.5}, ${bc.y / g - 0.5}) · ida e volta = ${TG.portalTwoWay(sc(), trs().find((t) => t.id === p2.id))}`);

    // 7) passar pela escada: vai para a sub-cena, quem controla vai junto, o mestre recebe o aviso com "Ir para lá"
    place(hero.id, 10, 4);
    walk(hero.id, [[10, 4], [12, 4]]); await W(50);
    const there = Object.values(S.state.scenes[subId].tokens).find((t) => /lyra/i.test(t.name));
    log.push(`Lyra na sub-cena: ${cellOf(there)} (esperado (5, 5)) · saiu da principal: ${!Object.values(S.state.scenes[sid].tokens).some((t) => /lyra/i.test(t.name))} · jogador agora em: ${S.state.scenes[S.sceneIdOf(pid)].name}`);
    const toast = [...document.querySelectorAll('.toast')].find((t) => /foi para/.test(t.textContent));
    log.push('aviso do mestre: ' + (toast ? toast.textContent : 'nenhum'));
    // quem chega não volta sozinho; sair e pisar de novo volta
    log.push('chegou e não voltou: ' + !!Object.values(S.state.scenes[subId].tokens).find((t) => t.id === there.id));
    walk(there.id, [[5, 5], [6, 5]], subId);
    log.push('saiu da área (para o lado): continua na sub-cena = ' + !!S.state.scenes[subId].tokens[there.id]);
    walk(there.id, [[6, 5], [5, 5]], subId); await W(50);
    const home = Object.values(S.state.scenes[sid].tokens).find((t) => /lyra/i.test(t.name));
    log.push(`pisou de novo: voltou para a principal em ${cellOf(home)} (ao lado da escada (12, 4)) · jogador em: ${S.state.scenes[S.sceneIdOf(pid)].name}`);
    // só ida: o portal de baixo fica, mas não leva de volta
    TG.setTwoWay(sid, p2.id, false);
    const bk3 = (S.state.scenes[subId].triggers || []).find((t) => t.id === back.id);
    log.push(`só ida: portais na sub-cena = ${(S.state.scenes[subId].triggers || []).filter((t) => t.portal).length} · o de baixo leva a algum lugar = ${!!TG.portalPartner(S.state.scenes[subId], bk3)} · o de cima continua ligado = ${!!TG.portalPartner(sc(), trs().find((t) => t.id === p2.id))}`);

    // 8) menu do botão direito
    const hits = B.hitAll(sc(), TG.center(trs().find((t) => t.id === p2.id))).filter((x) => x.kind === 'trigger');
    UI.contextMenu(300, 300, sc(), TG.center(p2), hits); await W(50);
    log.push('menu: ' + ($('.ctx-menu .cm-title') || {}).textContent + ' → ' + [...document.querySelectorAll('.ctx-menu > .cm-list > .cm-item')].map((b) => b.textContent.trim()).join(' | '));
    UI.closeContextMenu();
    UI.contextMenu(300, 300, sc(), { x: 15.5 * g, y: 9.5 * g }, []); await W(50);
    log.push('mapa vazio tem "Portal aqui": ' + [...document.querySelectorAll('.ctx-menu .cm-item')].some((b) => /Portal aqui/.test(b.textContent)));
    UI.closeContextMenu();
    // gatilho comum não oferece mais Teletransporte
    log.push('ações do gatilho: ' + TG.ACTIONS.map(([, l]) => l).join(', '));

    // 9) campanha antiga: gatilho só com teletransporte vira portal
    const old = JSON.parse(JSON.stringify(S.state));
    old.scenes[sid].triggers.push({ id: 'velho', name: 'Velho', shape: 'circle', x: g, y: g, r: 0.5, on: 'enter', who: 'party', times: 'once', actions: [{ id: 'a', type: 'teleport', sceneId: null, x: 3 * g, y: 3 * g }] });
    old.scenes[subId].parent = 'nao-existe';
    const m = S.migrate(old);
    log.push(`campanha antiga: gatilho de teletransporte virou portal = ${!!m.scenes[sid].triggers.find((t) => t.id === 'velho').portal} · sub-cena sem pai virou principal = ${!m.scenes[subId].parent}`);

    // 10) exportar a principal leva a sub-cena; importar recria as duas, com o portal apontando para a cópia
    TG.setTwoWay(sid, p2.id, true);
    const bundle = App.Storage.sceneBundle(sid);
    log.push('exportar a principal: sub-cenas no arquivo = ' + (bundle.subs || []).length);
    const before = new Set(S.state.sceneOrder);
    await App.UI.importParsed(await App.Storage.parse(JSON.stringify(bundle))); // mesmo caminho do botão Importar
    const newIds = S.state.sceneOrder.filter((id) => !before.has(id));
    const nm = newIds.find((id) => !S.state.scenes[id].parent), ns = newIds.find((id) => S.state.scenes[id].parent);
    const np = nm && (S.state.scenes[nm].triggers || []).find((t) => t.id === p2.id);
    log.push(`importou: ${newIds.length} cenas · sub-cena da cópia = ${ns && S.state.scenes[ns].parent === nm} · portal da cópia leva para a sub-cena da cópia = ${np && TG.portalAct(np).sceneId === ns}`);

    // 11) apagar a principal com sub-cena: pergunta; "Manter" deixa a sub-cena como principal; "Apagar tudo" apaga as duas
    UI.deleteScene(nm); await W(80);
    log.push('pergunta ao apagar: ' + [...document.querySelectorAll('.modal-foot .btn')].map((b) => b.textContent).join(' | '));
    [...document.querySelectorAll('.modal-foot .btn')].find((b) => /Manter/.test(b.textContent)).click(); await W(50);
    log.push(`manter: principal apagada = ${!S.state.scenes[nm]} · sub-cena virou principal = ${!!S.state.scenes[ns] && !S.state.scenes[ns].parent}`);
    S.dispatch({ type: 'scene.delete', id: ns });
    const s3 = S.newScene('Teste'), s4 = S.newScene('Teste sub'); s4.parent = s3.id;
    S.dispatch({ type: 'scene.add', scene: s3 }); S.dispatch({ type: 'scene.add', scene: s4 });
    UI.deleteScene(s3.id); await W(80);
    [...document.querySelectorAll('.modal-foot .btn')].find((b) => /Apagar tudo/.test(b.textContent)).click(); await W(50);
    log.push(`apagar tudo: principal = ${!S.state.scenes[s3.id]} · sub = ${!S.state.scenes[s4.id]}`);
    S.viewSceneId = null; S.emit('local'); await W(50);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
