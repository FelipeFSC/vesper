window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const S = App.Store, A = App.Audio, B = App.Board, g = S.currentScene().grid, sc = () => S.currentScene();
    const tav = 'musicas/Medieval Fantasy Tavern _ D&D Fantasy Music and Ambience.mp3', cave = 'musicas/- Dark Tomb - _ Cave Sounds _ 45 Minutes 🦇.mp3';
    for (const n of [tav, cave]) {
      const blob = await (await fetch('Sons/' + n.split('/').map(encodeURIComponent).join('/'))).blob();
      A.addFiles([[n, new File([blob], 'x.mp3', { type: 'audio/mpeg' })]], 'teste');
    }
    B.viewCenter = () => ({ x: 9 * g, y: 8 * g });
    A.play('music', cave); await W(2500);
    const mus = A.ch.music.el, room = () => A.roomCh.el;
    const st = (lbl) => log.push(`${lbl}: música da cena ${mus.paused ? 'parada' : 'vol ' + mus.volume.toFixed(2)} · sala ${room() && !room().paused ? 'vol ' + room().volume.toFixed(2) : 'parada'}`);
    st('fora, música da cena tocando');
    B.addRoom(sc(), [[g, g], [6 * g, g], [6 * g, 5 * g], [g, 5 * g]]);
    A.setRoomMusic(sc(), sc().rooms[0], tav);
    B.viewCenter = () => ({ x: 2 * g, y: 2 * g }); await W(2500); st('entrou na sala');
    B.viewCenter = () => ({ x: 9 * g, y: 8 * g }); await W(2500); st('saiu');
    B.viewCenter = () => ({ x: 2 * g, y: 2 * g }); await W(2500); st('entrou de novo');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
