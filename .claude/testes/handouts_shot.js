// Plano 2: fotos — painel do mestre (#gm) e janela na tela do jogador (#player)
window.addEventListener('load', () => setTimeout(async () => {
  const W = (ms) => new Promise((r) => setTimeout(r, ms));
  setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
  const S = App.Store, UI = App.UI;
  S.dispatch({ type: 'player.upsert', id: 'pA', name: 'Ana', color: '#e07b4f' });
  const cv = document.createElement('canvas'); cv.width = 480; cv.height = 340; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 480, 340); g.addColorStop(0, '#efe2c4'); g.addColorStop(1, '#d6c19a'); x.fillStyle = g; x.fillRect(0, 0, 480, 340);
  x.fillStyle = '#3a2a1a'; x.font = 'italic 26px Georgia'; x.fillText('Ao portador desta,', 40, 70);
  x.font = 'italic 19px Georgia'; ['o tesouro está sob a terceira', 'pedra do poço velho. Vá sozinho', 'e não confie no taverneiro.', '', '              — D.'].forEach((l, i) => x.fillText(l, 40, 120 + i * 32));
  x.fillStyle = '#7a1f1f'; x.beginPath(); x.arc(400, 280, 34, 0, 7); x.fill();
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const img = await App.Images.add(new File([blob], 'carta.png', { type: 'image/png' }), App.Images.PROP);
  S.dispatch({ type: 'handout.add', handout: { id: 'h1', title: 'Carta do duque', img: img.id, text: 'O selo de cera vermelha está quebrado. A letra é apressada, como se escrita no escuro.' } });
  S.dispatch({ type: 'handout.add', handout: { id: 'h2', title: 'Sussurro', img: null, text: 'Alguém chama seu nome atrás da porta.' } });
  S.dispatch({ type: 'handout.add', handout: { id: 'h3', title: 'Retrato da condessa', img: img.id, text: '' } });
  if (location.hash === '#player') { S.viewAs = 'pA'; App.UI.setMode('play'); UI.showHandout(S.state.handouts[0], ['pA']); }
  else { UI.showTab('handouts'); }
}, 1200));
