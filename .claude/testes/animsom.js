// Plano 27: editor de animação em janela + parar som pelo gatilho. Query padrão ?tutorial; #shot + -shot = foto do editor
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, A = App.Anim, Au = App.Audio, sc = () => S.currentScene(), g = sc().grid, sid = sc().id, D = (a) => S.dispatch(a);
    const shot = location.hash === '#shot';
    if (UI.mode !== 'edit') UI.setMode('edit');

    // ---------- Editor de animação ----------
    const lt = B.addLight(sc(), { name: 'Holofote', x: 6.5 * g, y: 3.5 * g, on: true, shape: 'cone', angle: 50, bright: 4, dim: 6 });
    B.selectedLight = null;
    D({ type: 'lightpt.update', sceneId: sid, id: lt.id, patch: { anim: { steps: [A.newSpec('rotate')], auto: false } } });
    const L = () => sc().lights.find((o) => o.id === lt.id), steps = () => L().anim.steps;
    // Abre pelo painel da luz (botão Abrir editor)
    B.selectedLight = lt.id; UI.refresh(); await W(150);
    const openBtn = $$('.btn').find((b) => /Abrir editor/.test(b.textContent));
    ok(openBtn, 'botão Abrir editor no painel');
    openBtn.click(); await W(150);
    const win = () => UI.windows.get('anim-editor');
    ok(win() && $('.aw') && $$('.aw-step').length === 1, 'janela aberta com 1 movimento');
    log.push('janela: ' + Math.round(win().el.getBoundingClientRect().width) + ' px · título "' + win().titleEl.textContent + '" · barras ' + $$('.aw-slider').length);
    // Barra de graus
    const rng = $('[data-aw-range="deg"]');
    rng.value = 180; rng.dispatchEvent(new Event('input')); rng.dispatchEvent(new Event('change')); await W(80);
    ok(steps()[0].deg === 180, 'barra salva os graus');
    const num = $('[data-aw="dur"]'); num.value = '2,5'; num.dispatchEvent(new Event('change')); await W(80);
    ok(steps()[0].dur === 2.5, 'número da duração (com vírgula)');
    // Modelo
    const preset = $$('.aw-presets .btn').find((b) => /Holofote/.test(b.textContent));
    ok(preset, 'modelo Holofote varrendo'); preset.click(); await W(80);
    ok(steps()[0].deg === 120 && steps()[0].repeat === 'pingpong', 'modelo aplicado');
    // Curva
    $$('.aw-form .seg button').find((b) => b.textContent === 'Constante').click(); await W(80);
    ok(steps()[0].ease === 'linear' && $('.aw-curve svg path'), 'curva constante com desenho');
    // + Movimento, duplicar, remover
    $$('.aw-list .btn').find((b) => /Movimento/.test(b.textContent)).click(); await W(80);
    ok(steps().length === 2, 'adicionou movimento');
    $$('.aw-step')[0].querySelector('[title="Duplicar"]').click(); await W(80);
    ok(steps().length === 3 && steps()[1].deg === 120, 'duplicou');
    $$('.aw-step')[2].querySelector('[title="Tirar este movimento"]').click(); await W(80);
    ok(steps().length === 2, 'removeu');
    log.push('movimentos: ' + steps().map((s) => s.kind + ' ' + (s.deg ?? '') + '° ' + s.dur + 's ' + s.repeat + ' ' + s.ease).join(' | '));
    // Prévia só para mim × Tocar para todos
    const anims0 = (sc().anims || []).length;
    $$('.aw-head .btn').find((b) => /Prévia/.test(b.textContent)).click(); await W(80);
    ok(A.local.length > 0 && (sc().anims || []).length === anims0, 'prévia só local');
    $$('.aw-head .btn').find((b) => /Tocar para todos/.test(b.textContent)).click(); await W(80);
    ok((sc().anims || []).length > anims0, 'tocar para todos');
    $$('.aw-head .btn').find((b) => /Parar/.test(b.textContent)).click(); await W(80);
    ok(!A.running(sc(), 'light:' + lt.id).length, 'parar');
    const auto = $('.aw-auto input'); auto.click(); await W(80);
    ok(L().anim.auto === true, 'começa sozinha');
    $('.aw-auto input').click(); await W(80);
    ok(L().anim.auto === false, 'desliga o começa sozinha');
    // Fecha
    UI.closeWindow('anim-editor');
    ok(!UI.animWin, 'fechar limpa o editor');
    // Pelo gatilho: ação Animar → Animação nova
    const act = Object.assign(TG.newAction('anim'), { ids: ['light:' + lt.id], op: 'play', spec: A.newSpec('move') });
    const tr = TG.newTrigger(sc(), { shape: 'circle', x: 12.5 * g, y: 7.5 * g, r: 0.5, name: 'Alarme', actions: [act] });
    D({ type: 'trigger.add', sceneId: sid, trigger: tr });
    UI.openAnimEditor({ mode: 'trig', sceneId: sid, trigId: tr.id, actId: act.id }); await W(120);
    ok($$('.aw-step').length === 1 && !$$('.aw-list .btn').length, 'editor da ação: um movimento, sem + Movimento');
    const dx = $('[data-aw-range="dx"]'); dx.value = 5; dx.dispatchEvent(new Event('change')); await W(80);
    const spec = () => sc().triggers.find((x) => x.id === tr.id).actions[0].spec;
    ok(spec().dx === 5, 'editor salva na ação do gatilho');
    log.push('ação do gatilho: ' + spec().kind + ' dx ' + spec().dx + ' · título "' + win().titleEl.textContent + '"');
    if (shot) {
      UI.closeWindow('anim-editor');
      UI.openAnimEditor({ mode: 'own', sceneId: sid, kind: 'light', id: lt.id }); await W(300);
      flush(); return;
    }
    UI.closeWindow('anim-editor');

    // ---------- Parar som ----------
    // Efeito de 4 s gerado aqui (WAV), entregue como se fosse da pasta de músicas
    const wav = (sec) => { const rate = 8000, n = rate * sec, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / 8) * 3000, true); return new File([buf], 'x.wav', { type: 'audio/wav' }); };
    Au.addFiles([['efeitos/alarme.wav', wav(4)], ['efeitos/trovao.wav', wav(4)]]);
    await W(100);
    const playing = (name) => Au.fx.filter((x) => !name || x.name === name).length;
    const waitFx = async (cond) => { for (let i = 0; i < 40 && !cond(); i++) await W(50); };
    // 1) Efeito + Parar efeito com atraso (o caso do usuário)
    const play = Object.assign(TG.newAction('sound'), { op: 'sfx', name: 'efeitos/alarme.wav' });
    const stop = Object.assign(TG.newAction('sound'), { op: 'sfx-stop', name: 'efeitos/alarme.wav', delay: 1 });
    const t1 = TG.newTrigger(sc(), { shape: 'circle', x: 1.5 * g, y: 1.5 * g, r: 0.5, name: 'Som', actions: [play, stop], times: 'always' });
    D({ type: 'trigger.add', sceneId: sid, trigger: t1 });
    TG.fire(sid, t1.id, null, { manual: true, quiet: true });
    await waitFx(() => playing('efeitos/alarme.wav'));
    const before = playing('efeitos/alarme.wav');
    await W(1500);
    log.push(`efeito + parar (1 s): tocando ${before} → ${playing('efeitos/alarme.wav')}`);
    ok(before === 1 && playing('efeitos/alarme.wav') === 0, 'parar efeito com atraso');
    log.push('resumo: ' + TG.summary(sc(), stop).target + ' · ' + TG.summary(sc(), stop).op);
    // 2) Parar depois de (s)
    Au.playSfx('efeitos/trovao.wav', { stopAfter: 0.6 });
    await waitFx(() => playing('efeitos/trovao.wav'));
    const b2 = playing('efeitos/trovao.wav'); await W(1000);
    log.push(`parar depois de 0,6 s: ${b2} → ${playing('efeitos/trovao.wav')}`);
    ok(b2 === 1 && playing('efeitos/trovao.wav') === 0, 'parar depois de');
    log.push('resumo do efeito com tempo: ' + TG.summary(sc(), Object.assign({}, play, { stopAfter: 3 })).op);
    // 3) Parar todos os efeitos (sem escolher qual)
    Au.playSfx('efeitos/alarme.wav'); await W(30); Au.playSfx('efeitos/trovao.wav');
    await waitFx(() => playing() >= 2);
    const b3 = playing(); Au.stopFx({}); await W(200);
    ok(b3 === 2 && playing() === 0, 'parar todos os efeitos');
    log.push(`parar todos os efeitos: ${b3} → ${playing()}`);
    // 4) Som do mapa de uma vez: desligar interrompe
    const snd = { id: 'snd_t1', name: 'efeitos/trovao.wav', size: 0, x: 3 * g, y: 3 * g, r: 12, vol: 1, on: false, once: true, at: Date.now() };
    D({ type: 'sound.add', sceneId: sid, sound: snd });
    const fireSpot = Object.assign(TG.newAction('sound'), { op: 'spot-fire', ids: [snd.id] }), offSpot = Object.assign(TG.newAction('sound'), { op: 'spot-off', ids: [snd.id], delay: 0.5 });
    const t2 = TG.newTrigger(sc(), { shape: 'circle', x: 2.5 * g, y: 1.5 * g, r: 0.5, name: 'Mapa', actions: [fireSpot, offSpot], times: 'always' });
    D({ type: 'trigger.add', sceneId: sid, trigger: t2 });
    TG.fire(sid, t2.id, null, { manual: true, quiet: true });
    await waitFx(() => Au.fx.some((x) => x.spotId === snd.id));
    const b4 = Au.fx.filter((x) => x.spotId === snd.id).length; await W(900);
    log.push(`som do mapa de uma vez + desligar: ${b4} → ${Au.fx.filter((x) => x.spotId === snd.id).length}`);
    ok(b4 === 1 && !Au.fx.some((x) => x.spotId === snd.id), 'desligar som do mapa interrompe o de uma vez');
    // 5) Parar todos os sons
    D({ type: 'audio.set', channel: 'music', play: { name: 'efeitos/alarme.wav', at: Date.now(), pos: 0, loop: true } });
    const loopSnd = { id: 'snd_t2', name: 'efeitos/alarme.wav', size: 0, x: 4 * g, y: 3 * g, r: 8, vol: 1, on: true, once: false, at: Date.now() };
    D({ type: 'sound.add', sceneId: sid, sound: loopSnd });
    Au.playSfx('efeitos/trovao.wav'); await waitFx(() => playing('efeitos/trovao.wav'));
    const all = Object.assign(TG.newAction('sound'), { op: 'all-stop' });
    const t3 = TG.newTrigger(sc(), { shape: 'circle', x: 3.5 * g, y: 1.5 * g, r: 0.5, name: 'Silêncio', actions: [all], times: 'always' });
    D({ type: 'trigger.add', sceneId: sid, trigger: t3 });
    TG.fire(sid, t3.id, null, { manual: true, quiet: true }); await W(300);
    const st = S.state.audio, loopNow = sc().sounds.find((x) => x.id === loopSnd.id);
    log.push(`parar todos os sons: música ${st.music ? 'tocando' : 'parada'} · ambiente ${st.ambient ? 'tocando' : 'parado'} · efeitos ${playing()} · som do mapa ${loopNow.on ? 'ligado' : 'desligado'}`);
    ok(!st.music && !st.ambient && playing() === 0 && !loopNow.on, 'parar todos os sons');
    // 6) Ordem antiga não repete para quem entra depois (stopN começa no valor atual)
    ok(Au.stopN === S.state.audio.stop.n, 'contador da ordem de parar');
    // Cartão da ação na janela do gatilho
    B.selectedTrigger = t1.id; UI.openTrigger(sid, t1.id); await W(150); UI.trigEdit = play.id; UI.refresh(); const tw = UI.windows.get('trigger:' + t1.id); if (tw) { tw.body._sig = null; } await W(200);
    const opts = $$('.win select option').map((o) => o.textContent);
    ok(opts.includes('Parar um efeito') && opts.includes('Parar todos os sons'), 'opções novas no cartão');
    const hasAfter = $$('.win label').some((l) => /Parar depois de/.test(l.textContent));
    log.push('cartão: opções ' + ['Parar um efeito', 'Parar todos os sons'].filter((x) => opts.includes(x)).join(', ') + ' · campo Parar depois de: ' + hasAfter);
    ok(hasAfter, 'campo Parar depois de');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
