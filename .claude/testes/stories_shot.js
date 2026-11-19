// Plano 33 · foto da tela de Histórias (rodar com -query '' -shot)
window.addEventListener('load', () => setTimeout(async () => {
  const S = App.Store, St = App.Storage;
  St.mem = new Map();
  const mk = (color, draw) => { const c = document.createElement('canvas'); c.width = 600; c.height = 380; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 600, 380); draw(x); return c.toDataURL('image/png'); };
  const a = mk('#2d4a2d', (x) => { x.fillStyle = '#7a5530'; for (let i = 0; i < 5; i++) x.fillRect(40 + i * 110, 120, 90, 140); });
  const b = mk('#3b3b44', (x) => { x.fillStyle = '#c9a25a'; x.fillRect(220, 80, 160, 220); x.fillStyle = '#1b1b22'; x.fillRect(260, 120, 80, 140); });
  const add = async (name, img, days, scenes) => {
    const st = S.newCampaign(); st.name = name;
    for (let i = 1; i < scenes; i++) { const sc = S.newScene('Cena ' + (i + 1)); st.scenes[sc.id] = sc; st.sceneOrder.push(sc.id); }
    const id = await St.createStory(name, st);
    if (img) await St.setCover(id, img);
    await St.saveCards((list) => { const c = list.find((x) => x.id === id); c.savedAt = Date.now() - days * 86400000; return list; });
  };
  await add('Trem Fantasma', a, 0.02, 5);
  await add('Fortaleza na Montanha', b, 1, 3);
  await add('Cripta Esquecida', null, 6, 1);
  document.querySelector('#lb-name').value = 'Mestre';
  document.querySelector('#lb-host').click();
}, 1200));
