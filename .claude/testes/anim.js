// Plano 21 · Gatilhos com vários alvos e animação (imagens, luzes, tokens), área de dano das imagens
// #shot: monta a cena com o caminho da lâmina, a área de dano e a janela do gatilho (para foto)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, TG = App.Triggers, UI = App.UI, A = App.Anim, sc = () => S.currentScene(), g = sc().grid, sid = sc().id;
    const shot = location.hash === '#shot';
    S.dispatch({ type: 'wall.clear', sceneId: sid });
    S.dispatch({ type: 'scene.update', id: sid, patch: { light: { enabled: true, global: false, explore: false } } });
    const toks = Object.values(sc().tokens), hero = toks.find((t) => /lyra/i.test(t.name)), gob = toks.find((t) => t.id !== hero.id);
    const pv = () => S.barsOf(sc().tokens[hero.id])[0].value;
    const lights = [1, 2, 3].map((i) => { const o = B.addLight(sc(), { name: 'Tocha ' + i, x: (2 + i * 2) * g + g / 2, y: 1.5 * g, on: false }); return o; });
    B.selectedLight = null;
    const L = (id) => sc().lights.find((o) => o.id === id);
    const D = (a) => S.dispatch(a);
    const act = (type, part) => Object.assign(TG.newAction(type), part);
    const addTr = (part) => { const tr = TG.newTrigger(sc(), Object.assign({ shape: 'circle', x: 14.5 * g, y: 8.5 * g, r: 0.5, times: 'always' }, part)); D({ type: 'trigger.add', sceneId: sid, trigger: tr }); return tr.id; };
    const trOf = (id) => sc().triggers.find((x) => x.id === id);

    if (!shot) {
      // 1) vários alvos numa ação
      const t1 = addTr({ name: 'Acender', actions: [act('light', { ids: lights.map((o) => o.id), op: 'on' })] });
      TG.fire(sid, t1, null, { manual: true, quiet: true }); await W(50);
      log.push('uma ação, 3 luzes: acesas = ' + lights.map((o) => L(o.id).on !== false).join(','));
      log.push('resumo: ' + TG.summary(sc(), trOf(t1).actions[0]).target);
      // grupo de objetos: duas tochas com o mesmo grupo; uma terceira entra depois
      D({ type: 'lightpt.update', sceneId: sid, id: lights[0].id, patch: { tag: 'salão' } });
      D({ type: 'lightpt.update', sceneId: sid, id: lights[1].id, patch: { tag: 'salão' } });
      const t2 = addTr({ name: 'Apagar o salão', actions: [act('light', { tag: 'salão', op: 'off' })] });
      log.push('grupo "salão" antes: ' + TG.summary(sc(), trOf(t2).actions[0]).target);
      D({ type: 'lightpt.update', sceneId: sid, id: lights[2].id, patch: { tag: 'salão' } });
      log.push('depois de pôr a 3ª no grupo: ' + TG.summary(sc(), trOf(t2).actions[0]).target + ' · lista de grupos: ' + TG.allTags(sc()).join(','));
      TG.fire(sid, t2, null, { manual: true, quiet: true }); await W(50);
      log.push('disparou o grupo: acesas = ' + lights.map((o) => L(o.id).on !== false).join(','));
      // gatilho no formato antigo (um alvo só) continua funcionando
      const old = { id: 'old', name: 'Antigo', shape: 'circle', x: 1, y: 1, r: 0.5, on: 'enter', who: 'party', times: 'always', enabled: true, actions: [{ id: 'oa', type: 'light', delay: 0, lightId: lights[0].id, op: 'on' }] };
      D({ type: 'trigger.add', sceneId: sid, trigger: old });
      TG.fire(sid, 'old', null, { manual: true, quiet: true }); await W(50);
      log.push(`gatilho antigo (lightId): virou ids = ${JSON.stringify(trOf('old').actions[0].ids)} · acendeu = ${L(lights[0].id).on !== false}`);
      // migrate de campanha antiga
      const mig = S.migrate({ scenes: { s1: { triggers: [{ id: 'x', actions: [{ id: 'a', type: 'door', wallId: 'w9' }, { id: 'b', type: 'token', target: 'g:grp' }] }] } } });
      log.push('migrate: ' + JSON.stringify(mig.scenes.s1.triggers[0].actions.map((a) => a.ids)));

      // 2) tempo das animações
      const sp = (p) => A.newSpec('move', p);
      const pr = (s, t) => { const r = A.progress(s, t); return Math.round(r.u * 100) / 100 + (r.done ? '!' : ''); };
      log.push('uma vez 1 s (suave): ' + [0, 250, 500, 1000, 1500].map((t) => pr(sp({ dur: 1 }), t)).join(' '));
      log.push('constante: ' + [250, 500].map((t) => pr(sp({ dur: 1, ease: 'linear' }), t)).join(' ') + ' · volta no fim: ' + pr(sp({ dur: 1, end: 'back' }), 1200));
      log.push('ir e voltar 1×: ' + [500, 1000, 1500, 2000, 2100].map((t) => pr(sp({ dur: 1, ease: 'linear', repeat: 'pingpong', n: 1 }), t)).join(' '));
      log.push('repetir: ' + [500, 1500, 2250].map((t) => pr(sp({ dur: 1, ease: 'linear', repeat: 'loop' }), t)).join(' ') + ' · total ' + A.total(sp({ repeat: 'loop' })));
      log.push('ronda (4,0)→(4,3) na metade: ' + A.pathAt({ pts: [[4, 0], [4, 3]] }, 0.5).map((v) => Math.round(v * 100) / 100).join(','));

      // 3) imagem andando: uma mensagem para começar, nada por quadro, uma para terminar
      const blade = B.addProp(sc(), null, { x: 3 * g, y: 6 * g }, 100, 100, 'Lâmina'); B.selectedProp = null;
      const P = () => sc().props.find((p) => p.id === blade.id), x0 = P().x;
      const sent = [];
      const origD = S.dispatch.bind(S);
      S.dispatch = (a) => { if (/^(anim|prop)\./.test(a.type)) sent.push(a.type); return origD(a); };
      A.play(sid, ['prop:' + blade.id], [sp({ dx: 4, dy: 0, dur: 1, ease: 'linear' })]);
      await W(500);
      const mid = (A.view(sc()).props.find((p) => p.id === blade.id) || {}).x;
      log.push(`no meio (0,5 s): visto em x = ${Math.round((mid - x0) / g * 10) / 10} quad. · estado continua = ${P().x === x0} · rodando = ${sc().anims.length}`);
      await W(800);
      log.push(`no fim: estado x = ${(P().x - x0) / g} quad. · rodando = ${sc().anims.length} · mensagens: ${sent.join(',')}`);
      S.dispatch = origD;
      // ir e voltar sem parar + parar no meio
      A.play(sid, ['prop:' + blade.id], [sp({ dx: 2, dy: 0, dur: 1, ease: 'linear', repeat: 'pingpong', n: 0 })]);
      await W(1500);
      log.push('vai e volta sem parar depois de 1,5 s: rodando = ' + sc().anims.length);
      A.stop(sid, ['prop:' + blade.id], 'stop'); await W(50);
      log.push(`Parar: ficou em x = ${Math.round((P().x - x0) / g * 10) / 10} quad. (perto de 5) · rodando = ${sc().anims.length}`);
      A.stop(sid, ['prop:' + blade.id], 'reset'); await W(50);
      log.push(`Voltar ao início: x = ${(P().x - x0) / g} quad. · casa apagada = ${!P().animHome}`);
      // girar + opacidade juntos
      A.play(sid, ['prop:' + blade.id], [A.newSpec('rotate', { deg: 90, dur: 1, ease: 'linear' }), A.newSpec('fade', { from: 100, to: 20, dur: 1, ease: 'linear' })]);
      await W(1300);
      log.push(`girar 90 + opacidade 20%: rot = ${P().rot} · opacidade = ${P().opacity}`);
      A.stop(sid, ['prop:' + blade.id], 'reset'); await W(50);

      // 4) animação própria que começa sozinha (sem estado rodando)
      D({ type: 'prop.update', sceneId: sid, id: blade.id, patch: { anim: { steps: [A.newSpec('rotate', { deg: 360, dur: 2, ease: 'linear', repeat: 'loop' })], auto: true } } });
      const r1 = A.view(sc()).props.find((p) => p.id === blade.id).rot; await W(400);
      const r2 = A.view(sc()).props.find((p) => p.id === blade.id).rot;
      log.push(`começa sozinha: gira na tela = ${Math.round(r1) !== Math.round(r2)} · rodando no estado = ${sc().anims.length} · desenho contínuo = ${A.active(sc())}`);
      A.stop(sid, ['prop:' + blade.id], 'stop'); await W(50);
      log.push(`Parar a automática: desligou = ${P().anim.auto === false} · gravou o giro = ${Number.isFinite(P().rot)}`);
      D({ type: 'prop.update', sceneId: sid, id: blade.id, patch: { rot: 0 } });

      // 5) luz: holofote varrendo e apagar aos poucos
      const spot = B.addLight(sc(), { name: 'Holofote', shape: 'cone', x: 8 * g, y: 5 * g, bright: 3, dim: 6, angle: 40, dir: 0 }); B.selectedLight = null;
      A.play(sid, ['light:' + spot.id], [A.newSpec('rotate', { deg: 120, dur: 1, ease: 'linear', repeat: 'pingpong', n: 0 })]);
      await W(500);
      const dv = A.view(sc()).lights.find((o) => o.id === spot.id).dir;
      const src = App.Light.sources(A.view(sc())).find((s) => s.id === spot.id);
      log.push(`holofote na metade: direção ${Math.round(dv)}° · fonte de luz anda junto = ${Math.round(src.dir * 180 / Math.PI)}°`);
      A.stop(sid, ['light:' + spot.id], 'reset');
      A.play(sid, ['light:' + spot.id], [A.newSpec('fade', { from: 100, to: 0, dur: 1, ease: 'linear', end: 'stay' })]);
      await W(500);
      const half = App.Light.sources(A.view(sc())).find((s) => s.id === spot.id);
      log.push(`apagando aos poucos (0,5 s): alcance ${Math.round(half.dim / g * 10) / 10} de 6 quad.`);
      await W(800);
      log.push(`no fim: intensidade ${L(spot.id).power} · fonte sumiu = ${!App.Light.sources(sc()).some((s) => s.id === spot.id)}`);
      A.stop(sid, ['light:' + spot.id], 'reset'); await W(50);
      log.push(`voltar ao início: intensidade ${L(spot.id).power}`);

      // 6) token fazendo ronda e olhando para onde anda
      const gx = sc().tokens[gob.id].x;
      A.play(sid, ['token:' + gob.id], [A.newSpec('path', { pts: [[3, 0], [3, 2]], dur: 1, ease: 'linear', repeat: 'once' })]);
      await W(300);
      const gv = A.view(sc()).tokens[gob.id];
      log.push(`ronda do goblin: andou ${Math.round((gv.x - gx) / g * 10) / 10} quad. · olhando ${gv.facing}° (direita = 0)`);
      await W(1000);
      log.push(`ronda no fim: token em (${(sc().tokens[gob.id].x - gx) / g}, ${(sc().tokens[gob.id].y - S.currentScene().tokens[gob.id].y) / g + 2}) do início · no grid = ${sc().tokens[gob.id].x % g === 0}`);

      // 7) área de dano: a lâmina passa pela Lyra
      D({ type: 'token.move', sceneId: sid, id: hero.id, x: 6 * g, y: 6 * g, fromTrigger: true });
      D({ type: 'prop.update', sceneId: sid, id: blade.id, patch: { x: 3 * g, y: 6 * g, w: g, h: g, rot: 0, hurt: Object.assign(A.newHurt(), { save: '', damage: '3', box: [0, 0, 1, 1] }) } });
      const pv0 = pv();
      log.push(`parada não machuca ("só em movimento"): PV ${pv()} (era ${pv0})`);
      A.play(sid, ['prop:' + blade.id], [sp({ dx: 5, dy: 0, dur: 0.6, ease: 'linear', repeat: 'pingpong', n: 1 })]);
      await W(1600);
      log.push(`lâmina foi e voltou passando pela Lyra: PV ${pv0} → ${pv()} (2 golpes de 3 = ${pv0 - 6})`);
      log.push('chat: ' + (S.state.chat.slice(-1)[0] || {}).text);
      D({ type: 'prop.update', sceneId: sid, id: blade.id, patch: { hurt: Object.assign({}, sc().props.find((p) => p.id === blade.id).hurt, { when: 'always' }) } });
      D({ type: 'token.move', sceneId: sid, id: hero.id, x: 9 * g, y: 9 * g, fromTrigger: true }); await W(300);
      const pv1 = pv();
      D({ type: 'token.move', sceneId: sid, id: hero.id, x: 3 * g, y: 6 * g, fromTrigger: true }); await W(300);
      log.push(`"Sempre": Lyra andou para cima da lâmina parada: PV ${pv1} → ${pv()} · parada em cima não leva outro: ${await W(400).then(() => pv())}`);
      const ps = App.Net.playerState().scenes[sid].props.find((p) => p.id === blade.id);
      log.push(`jogadores não recebem a área de dano: ${ps.hurt == null} · área no mestre: ${!!P().hurt}`);
      const box = A.boxFrom(P(), { x: P().x + g * 0.2, y: P().y }, { x: P().x + g * 0.8, y: P().y + g });
      log.push('caixa a partir do arraste: ' + box.join(','));

      // 8) ação Animar no gatilho (própria, nova, parar)
      D({ type: 'prop.update', sceneId: sid, id: blade.id, patch: { hurt: null, x: 3 * g, y: 6 * g, anim: { steps: [sp({ dx: 0, dy: 2, dur: 0.5, ease: 'linear' })], auto: false } } });
      const t3 = addTr({ name: 'Lâminas', actions: [act('anim', { ids: ['prop:' + blade.id], op: 'own' }), act('anim', { ids: ['light:' + lights[0].id, 'light:' + lights[1].id], op: 'play', spec: sp({ dx: 1, dy: 0, dur: 0.5, ease: 'linear' }) })] });
      log.push('resumos: ' + trOf(t3).actions.map((a) => { const s = TG.summary(sc(), a); return s.target + ' · ' + s.op; }).join(' | '));
      const ly0 = L(lights[0].id).x;
      TG.fire(sid, t3, null, { manual: true, quiet: true }); await W(50);
      log.push('disparou: animações rodando = ' + sc().anims.length);
      await W(800);
      log.push(`terminou: lâmina desceu ${(P().y - 6 * g) / g} quad. · tocha 1 andou ${(L(lights[0].id).x - ly0) / g} quad.`);
      // Testar = só na tela do mestre, nada muda
      const y1 = P().y;
      TG.simulate(sid, t3); await W(900);
      log.push(`Testar: prévia local = ${A.local.length > 0} · estado continua = ${P().y === y1} · nada gravado = ${sc().anims.length === 0}`);
      await W(6000);
      log.push('prévia acabou: ' + (A.local.length === 0));

      // 9) desfazer: montar entra, animação rodando não
      const H = App.History, before = H.undo.length;
      A.play(sid, ['prop:' + blade.id], [sp({ dx: 1, dur: 0.2 })]); await W(500);
      log.push(`animação não entra no desfazer: passos ${before} → ${H.undo.length}`);

      // 10) colar leva os alvos novos
      B.multi = new Set(['prop:' + blade.id, 'light:' + lights[0].id, 'light:' + lights[1].id, 'trigger:' + t3]);
      B.copySelection(sc());
      B.paste(sc(), { x: 12 * g, y: 12 * g }); await W(100);
      const copy = sc().triggers.find((x) => x.name === 'Lâminas' && x.id !== t3);
      log.push(`colado: alvos novos = ${copy && copy.actions.every((a) => a.ids.every((r) => !r.includes(blade.id) && !r.includes(lights[0].id)) && a.ids.length)}`);
    }

    // 11) janela do gatilho e painéis
    if (UI.mode !== 'edit') UI.setMode('edit');
    const lam = shot ? B.addProp(sc(), null, { x: 4 * g, y: 4.5 * g }, 160, 60, 'Lâmina') : sc().props.find((p) => p.name === 'Lâmina');
    if (shot) {
      D({ type: 'prop.update', sceneId: sid, id: lam.id, patch: { hurt: Object.assign(A.newHurt(), { box: [0.05, 0.2, 0.95, 0.8] }), anim: { steps: [A.newSpec('move', { dx: 5, dy: 0, dur: 0.8, repeat: 'pingpong' })], auto: false } } });
    }
    const tw = addTr({ name: 'Corredor das lâminas', x: 6.5 * g, y: 8.5 * g, actions: [] });
    B.setTool('trigger'); await W(200);
    UI.openTrigger(sid, tw); await W(300);
    const win = () => document.querySelector('.win.trig-win');
    const q = (sel, txt) => [...win().querySelectorAll(sel)].find((b) => b.textContent.includes(txt));
    q('button', 'Adicionar ação').click(); await W(150);
    q('.ta-type', 'Animar').click(); await W(250);
    const card = win().querySelector('.ta-card.open');
    log.push('cartão Animar: ' + [...card.querySelectorAll('.ta-field > span')].map((s) => s.textContent).join(' | '));
    const add = card.querySelector('.ta-targets select');
    add.value = 'prop:' + lam.id; add.dispatchEvent(new Event('change')); await W(250);
    log.push('alvos: ' + [...win().querySelectorAll('.ta-card.open .chip')].map((c) => c.textContent).join(', ') + ' · faltando = ' + !!win().querySelector('.ta-card.open.missing'));
    const pre = win().querySelector('.ta-card.open .anim-preset');
    pre.value = 'blade'; pre.dispatchEvent(new Event('change')); await W(250);
    const a0 = sc().triggers.find((x) => x.id === tw).actions[0];
    log.push(`modelo "lâmina": ${a0.spec.kind} ${a0.spec.dx},${a0.spec.dy} · ${a0.spec.dur} s · ${a0.spec.repeat} · repetição marcada = ${(win().querySelector('.ta-card.open .anim-rep .on') || {}).textContent}`);
    // No mapa: clicar em duas luzes soma as duas
    if (!shot) {
      const lc = win().querySelector('.ta-card.open .ta-targets button');
      lc.click(); await W(120);
      const rect = B.canvas.getBoundingClientRect();
      const click = (x, y) => { const p = B.toScreen(x, y), o = { bubbles: true, button: 0, buttons: 1, pointerId: 1, clientX: rect.left + p.x, clientY: rect.top + p.y }; B.canvas.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); };
      for (const o of [L(lights[1].id), L(lights[2].id)]) { click(o.x, o.y); await W(150); }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(250);
      log.push('No mapa com 2 luzes: alvos = ' + sc().triggers.find((x) => x.id === tw).actions[0].ids.length + ' · janela de volta = ' + (win().style.display !== 'none'));
      // painel da imagem
      UI.closeWindow('trigger:' + tw); B.setTool('select'); B.selectedTrigger = null;
      B.multi.clear(); B.selectedLight = null; B.selectedProp = lam.id; UI.refresh(); await W(300);
      const secs = [...document.querySelectorAll('.anim-sec, .hurt-sec, .tag-field')].map((e) => e.className.split(' ').pop());
      log.push('painel da imagem tem: ' + secs.join(', '));
      const addMv = [...document.querySelectorAll('#token-hud button')].find((b) => /Adicionar movimento/.test(b.textContent));
      log.push('animação própria: ' + (lam.anim ? 'já tem' : 'nenhuma') + ' · botão Adicionar = ' + !!addMv);
      if (addMv) { addMv.click(); await W(300); }
      const lp = sc().props.find((p) => p.id === lam.id);
      log.push('depois de Adicionar: movimentos = ' + ((lp.anim && lp.anim.steps) || []).length + ' · editor aberto = ' + !!document.querySelector('#token-hud .anim-box'));
      const auto = [...document.querySelectorAll('#token-hud .switch-row')].find((r) => /sozinha/.test(r.textContent));
      if (auto) { auto.querySelector('input').click(); await W(200); }
      log.push('começa sozinha marcado: ' + !!(sc().props.find((p) => p.id === lam.id).anim || {}).auto + ' · desenhando = ' + A.active(sc()));
    }
    if (shot) {
      UI.closeWindow('trigger:' + tw); UI.trigEdit = a0.id;
      B.selectedTrigger = tw;
      B.requestRender(); await W(400);
    }
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1500));
