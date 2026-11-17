// Plano 2 · Mostrar aos jogadores: entregas preparadas, quem vê, janela, zoom, chat, permissão
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, UI = App.UI;
    S.dispatch({ type: 'player.upsert', id: 'pA', name: 'Ana', color: '#e07b4f' });
    S.dispatch({ type: 'player.upsert', id: 'pB', name: 'Bruno', color: '#4fb27a' });
    S.online = ['pA', 'pB'];
    // imagem da carta
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; const x = cv.getContext('2d');
    x.fillStyle = '#e9dcc0'; x.fillRect(0, 0, 400, 300); x.fillStyle = '#7a1f1f'; x.beginPath(); x.arc(330, 240, 30, 0, 7); x.fill();
    x.fillStyle = '#3a2a1a'; for (let i = 0; i < 7; i++) x.fillRect(40, 50 + i * 26, 260 - (i % 3) * 30, 6);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const img = await App.Images.add(new File([blob], 'carta.png', { type: 'image/png' }), App.Images.PROP);
    S.dispatch({ type: 'handout.add', handout: { id: 'h1', title: 'Carta do duque', img: img.id, text: 'O selo está quebrado.\nA letra é apressada, como se escrita no escuro.' } });
    S.dispatch({ type: 'handout.add', handout: { id: 'h2', title: 'Sussurro', img: null, text: 'Alguém chama seu nome atrás da porta.' } });

    // painel do mestre
    UI.showTab('handouts'); await W(150);
    log.push('painel Mostrar: ' + document.querySelectorAll('#p-handouts .ho-item').length + ' entregas · botão no dock: ' + !!$('#dock [data-dock="handouts"]'));
    log.push('biblioteca de imagens inclui a carta: ' + (() => { App.Board.setTool('prop'); UI.refresh(); return [...document.querySelectorAll('#tool-opts .img-lib img')].length >= 1; })());
    App.Board.setTool('select');

    // mostrar para todos pelo diálogo: o mestre (que mostrou) vê a prévia
    [...document.querySelectorAll('#p-handouts .ho-item')][0].querySelector('.btn.primary').click(); await W(100);
    [...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === 'Mostrar').click(); await W(250);
    const prev = [...document.querySelectorAll('.win')].find((w) => /Carta do duque/.test(w.textContent));
    log.push('mestre mostrou para todos → prévia aberta: ' + !!prev + ' · com imagem: ' + !!(prev && prev.querySelector('.ho-view img')) + ' · com texto: ' + !!(prev && prev.querySelector('.ho-text')));
    // zoom
    const view = prev.querySelector('.ho-view'), im = view.querySelector('img');
    const r = view.getBoundingClientRect();
    view.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
    log.push('zoom com a roda: ' + im.style.transform);
    view.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    log.push('dois cliques volta: ' + im.style.transform);
    UI.closeWindow([...UI.windows.keys()].find((k) => k.startsWith('handout:')));

    // mostrar só para a Ana (chega como se viesse do mestre enquanto vemos como cada jogador)
    S.viewAs = 'pA'; UI.refresh(); await W(100);
    const before = UI.windows.size;
    UI.showHandout(S.state.handouts[1], ['pA']); await W(250);
    log.push('Ana (escolhida): janela abriu = ' + (UI.windows.size > before));
    UI.showTab('chat'); await W(150);
    const anaSees = [...document.querySelectorAll('#chat-log .msg.handout')].map((m) => m.querySelector('b:not([style])') && m.querySelector('.ho-msg b').textContent);
    log.push('chat da Ana: ' + anaSees.join(' | '));
    for (const k of [...UI.windows.keys()]) UI.closeWindow(k);
    S.viewAs = 'pB'; UI.chatSig = ''; UI.refresh(); await W(150);
    const brunoSees = [...document.querySelectorAll('#chat-log .msg.handout .ho-msg b')].map((b) => b.textContent);
    log.push('chat do Bruno (não escolhido): ' + brunoSees.join(' | '));
    // reabrir pelo chat
    document.querySelector('#chat-log .msg.handout').click(); await W(150);
    log.push('clicar na mensagem reabre: ' + [...document.querySelectorAll('.win')].some((w) => /Carta do duque/.test(w.textContent)));
    for (const k of [...UI.windows.keys()]) UI.closeWindow(k);
    S.viewAs = null;
    // mestre vê para quem foi
    UI.chatSig = ''; UI.refresh(); await W(150);
    log.push('mestre vê no chat: ' + [...document.querySelectorAll('#chat-log .msg.handout .ho-eyebrow')].map((e) => e.textContent).join(' | '));
    // jogador tentando mostrar algo pela rede
    const n = S.state.chat.length;
    S.remoteAction({ type: 'chat.add', msg: { id: 'x', ts: Date.now(), kind: 'handout', title: 'falso', to: '*' } }, 'pA');
    log.push('jogador tentando mostrar uma entrega: recusado = ' + (S.state.chat.length === n));
    S.remoteAction({ type: 'handout.add', handout: { id: 'hx', title: 'falso' } }, 'pA');
    log.push('jogador tentando criar entrega: recusado = ' + !S.state.handouts.some((h) => h.id === 'hx'));
    // editar e apagar
    S.dispatch({ type: 'handout.update', id: 'h2', patch: { title: 'Sussurro na porta' } });
    S.dispatch({ type: 'handout.delete', id: 'h1' });
    UI.showTab('handouts'); await W(150);
    log.push('depois de editar e apagar: ' + [...document.querySelectorAll('#p-handouts .ho-info b')].map((b) => b.textContent).join(', '));
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
