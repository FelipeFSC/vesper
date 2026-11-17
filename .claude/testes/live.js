window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const on = (sel) => [...document.querySelectorAll(sel + ' button.on')].map((b) => b.textContent.trim()).join('/');
  const press = (sel, txt) => { const b = [...document.querySelectorAll(sel + ' button')].find((x) => x.textContent.includes(txt)); b.focus(); b.click(); return b; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene();
    const g1 = Object.values(sc().tokens).find((t) => /goblin/i.test(t.name));
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.selected = g1.id; B.requestRender(); await W(200);
    press('#token-hud .vis-sec > .vis-seg', 'Vulto'); await W(150);
    log.push('token → Vulto: marcado agora = ' + on('#token-hud .vis-sec > .vis-seg') + ' · foco ainda no botão: ' + (document.activeElement.tagName === 'BUTTON' || document.activeElement === document.body));
    press('#token-hud .vis-sec > .vis-seg', 'Invisível'); await W(150);
    log.push('token → Invisível: marcado agora = ' + on('#token-hud .vis-sec > .vis-seg'));
    // grupo pela lista
    S.dispatch({ type: 'group.add', sceneId: sc().id, group: { id: 'gX', name: 'Grupo 1' }, tokens: [] });
    await W(100);
    const sel = $('#token-hud .vis-sec select'); sel.focus(); sel.value = 'gX'; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(150);
    log.push('escolher grupo na lista: quadro do grupo apareceu = ' + !!$('#token-hud .grp-box'));
    press('#token-hud .grp-box', 'Vulto'); await W(150);
    log.push('grupo → Vulto: grupo marcado = ' + on('#token-hud .grp-box') + ' · token marcado = ' + on('#token-hud .vis-sec > .vis-seg'));
    // digitando no nome: não pode reconstruir no meio
    const name = $('#token-hud input.hud-name'); name.focus(); name.value = 'Gob';
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: g1.id, patch: { conditions: [{ name: 'Caído' }] } }); await W(150);
    log.push('digitando no nome enquanto algo muda: campo preservado = ' + ($('#token-hud input.hud-name') === name && name.value === 'Gob'));
    name.blur(); await W(150);
    // ficha: select na aba Configurar
    const a = S.actorOf(g1);
    App.UI.openActor(a.id, 'config'); await W(200);
    const sh = [...document.querySelectorAll('.win select')].find((s) => [...s.options].some((o) => o.value === 'silhouette'));
    sh.focus(); sh.value = 'hide'; sh.dispatchEvent(new Event('change', { bubbles: true })); await W(150);
    const sh2 = [...document.querySelectorAll('.win select')].find((s) => [...s.options].some((o) => o.value === 'silhouette'));
    log.push('ficha "Atrás de muro baixo" → Escondido: ficha salva = ' + S.state.actors[a.id].coverShow + ' · janela mostra = ' + sh2.value + ' (reconstruída: ' + (sh2 !== sh) + ')');
    // painel Mesa: checkbox de regra
    App.UI.showTab('table'); await W(200);
    const cb = [...document.querySelectorAll('#p-table label.check')].find((l) => /1 natural/.test(l.textContent)).querySelector('input');
    const before = cb.checked; cb.focus(); cb.click(); await W(150);
    const cb2 = [...document.querySelectorAll('#p-table label.check')].find((l) => /1 natural/.test(l.textContent)).querySelector('input');
    log.push('painel Mesa, caixa de marcar: regra=' + S.state.rules.nat1Miss + ' tela=' + cb2.checked + ' (antes ' + before + ')');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
