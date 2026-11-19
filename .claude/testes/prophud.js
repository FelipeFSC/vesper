// Painel da imagem flutuando (barra da direita recolhida): abre ao lado da imagem, como o da luz
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, sc = () => S.currentScene(), g = sc().grid;
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    const c = B.viewCenter();
    S.dispatch({ type: 'prop.add', sceneId: sc().id, prop: { id: 'px', name: 'serra', src: 'imagens/imgHome.webp', x: c.x - g, y: c.y - g, w: g * 2, h: g * 2, rot: 0 } });
    const prop = (sc().props || []).find((x) => x.id === 'px');
    App.UI.setCollapsed('right', true); await W(150);
    B.setTool('select');
    App.UI.contextMenu(300, 300, sc(), { x: c.x, y: c.y }, [{ kind: 'prop', obj: prop }]); await W(50);
    const cfg = [...document.querySelectorAll('.ctx-menu .cm-item')].find((b) => /Configurar|Ajustar|Editar/.test(b.textContent));
    log.push('item do menu: ' + (cfg && cfg.textContent.trim()));
    cfg && cfg.click(); await W(200);
    const hud = $('#token-hud'), r = B.toScreen(prop.x + prop.w, prop.y);
    const m = /translate\(([\d.-]+)px, ([\d.-]+)px\)/.exec(hud.style.transform);
    log.push('painel aberto: ' + !hud.hidden + ' · posição: ' + hud.style.transform + ' · borda direita da imagem na tela: ' + Math.round(r.x) + ' · painel começa depois da imagem: ' + (m && Number(m[1]) >= r.x));
    App.UI.setCollapsed('right', false); await W(100);
    App.UI.refresh(); await W(100);
    log.push('barra aberta: posição "' + hud.style.transform + '"');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
