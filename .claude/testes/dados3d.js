// Plano 69: dados 3D. Query padrão ?tutorial; #shot = para na rolagem para a foto
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { (window.__err = window.__err || []).push('PROMESSA: ' + (e.reason && e.reason.stack || e.reason)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const ok = (c, m) => { if (!c) (window.__err = window.__err || []).push('FALHOU: ' + m); };
  const flush = () => document.body.setAttribute('data-log', JSON.stringify(log.concat('erros: ' + JSON.stringify(window.__err || []))));
  log.push = (...x) => { Array.prototype.push.apply(log, x); flush(); return log.length; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, Dc = App.Dice, D3 = App.Dice3D, UI = App.UI;
    const shot = location.hash === '#shot';
    const waitFor = async (cond, n = 200) => { for (let i = 0; i < n && !cond(); i++) await W(50); return cond(); };
    const lastMsg = () => S.state.chat[S.state.chat.length - 1];
    ok(D3, 'módulo dos dados 3D carregado');
    D3.setEnabled(true);

    // ---------- 1. A rolagem anota os dados ----------
    Dc.roll('1d20+2d6+3');
    const t1 = Dc.take();
    ok(t1.length === 3 && t1[0].f === 20 && t1[1].f === 6, 'roll anota cada dado');
    Dc.isFormula('1d8'); Dc.check('1d12+@forca', ['forca']);
    ok(Dc.take().length === 0, 'conferir fórmula não anota dados');
    Dc.roll('1d4'); await W(10);
    ok(Dc.take().length === 0, 'dados soltos somem sozinhos (rolagem que não foi ao chat)');
    log.push('anotação: ' + JSON.stringify(t1));

    // ---------- 2. Notação para a biblioteca ----------
    const N = (d) => (D3.notationOf(d) || {}).notation || null;
    const cases = [
      [[{ f: 100, v: 74 }], '1d100+1d10@70,4'], [[{ f: 100, v: 100 }], '1d100+1d10@100,10'], [[{ f: 100, v: 5 }], '1d100+1d10@100,5'],
      [[{ f: 100, v: 30 }], '1d100+1d10@30,10'], [[{ f: 3, v: 2 }], null], [[{ f: 'F', v: 1 }], null], [[{ f: 20, v: 21 }], null],
      [[{ f: 20, v: 15 }, { f: 20, v: 3, drop: true }], '1d20+1d20@15,3'],
    ];
    for (const [d, want] of cases) ok(N(d) === want, 'notação ' + JSON.stringify(d) + ' → ' + N(d) + ' (esperado ' + want + ')');
    ok(D3.notationOf(Array.from({ length: 30 }, () => ({ f: 6, v: 2 }))).notation.split('+').length === 20, 'no máximo 20 dados na tela');
    log.push('notação: 74 → ' + N([{ f: 100, v: 74 }]) + ' · 100 → ' + N([{ f: 100, v: 100 }]) + ' · d3 → ' + N([{ f: 3, v: 2 }]));

    // ---------- 3. Rolagem no chat: a mensagem leva os dados e eles caem na tela ----------
    // Plano 70: quando cada mensagem chega, os dados daquela rolagem já pararam?
    const arrivals = [];
    S.on((k, a) => { if (k === 'chat.add' && a && a.msg && a.msg.dice) arrivals.push({ id: a.msg.id, at: Date.now(), done: !!(D3.last && D3.last.done), notation: D3.last && D3.last.notation }); });
    const n0 = S.state.chat.length, tClick = Date.now();
    S.rollPost('2d20kh1+5', { label: 'Vantagem' });
    ok(S.state.chat.length === n0, 'resultado da rolagem ainda não está no chat');
    await waitFor(() => S.state.chat.length > n0);
    const m1 = lastMsg(), arr1 = arrivals.find((x) => x.id === m1.id);
    ok(arr1 && arr1.done && arr1.notation === N(m1.dice), 'dado parou antes de o resultado aparecer');
    log.push('vantagem: resultado ' + (arr1.at - tClick) + ' ms depois do clique; dados começaram ' + (D3.last.at - tClick) + ' ms depois do clique e pararam em ' + (D3.last.done - D3.last.at) + ' ms (acel. ' + D3.speed + ')');
    ok(m1.kind === 'roll' && Array.isArray(m1.dice) && m1.dice.length === 2 && m1.dice.filter((x) => x.drop).length === 1, 'mensagem da vantagem com 2 dados, 1 descartado');
    const kept = m1.dice.find((x) => !x.drop).v;
    ok(m1.parts[0].total === kept + 5, 'total do chat bate com o dado mantido');
    await waitFor(() => D3.last && D3.last.done);
    ok(D3.last && D3.last.done, 'dados 3D terminaram de rolar');
    ok(D3.last.notation === N(m1.dice), 'dados 3D com os números do chat');
    ok($('#dice3d') && $('#dice3d canvas') && $('#dice3d').classList.contains('on'), 'camada dos dados à mostra');
    ok(getComputedStyle($('#dice3d')).pointerEvents === 'none', 'camada não pega cliques');
    const dims = (D3.box.diceList || []).map((d) => [].concat(d.material).some((m) => m.transparent && m.opacity < 0.5));
    ok(dims.length === 2 && dims.filter(Boolean).length === 1, 'dado descartado fica apagado');
    log.push(`vantagem: chat ${m1.parts[0].total} (dados ${m1.dice.map((x) => x.v + (x.drop ? ' descartado' : '')).join(', ')}) · 3D "${D3.last.notation}" em ${D3.last.done - D3.last.at} ms · apagados ${dims.filter(Boolean).length}`);
    if (shot) { S.rollPost('1d4+1d6+1d8+1d10+1d12+1d20+1d100'); await waitFor(() => D3.last && D3.last.done && /d4/.test(D3.last.notation)); log.push('foto pronta'); return; }
    await waitFor(() => !$('#dice3d').classList.contains('on'), 100);
    ok(!$('#dice3d').classList.contains('on'), 'dados somem depois de parar');

    // ---------- 4. Ação de combate: ataque e dano levam os dados ----------
    const sc = S.currentScene(), toks = Object.values(sc.tokens);
    const hero = toks.find((t) => { const a = S.actorOf(t); return a && a.kind === 'pc' && (a.actions || []).some((x) => x.mode === 'attack'); });
    const foe = toks.find((t) => { const a = S.actorOf(t); return a && a.kind !== 'pc'; });
    if (hero && foe) {
      const a = S.actorOf(hero), idx = a.actions.findIndex((x) => x.mode === 'attack');
      S.dispatch({ type: 'token.move', sceneId: sc.id, id: hero.id, x: foe.x - sc.grid, y: foe.y });
      // Ataque que acerta sempre, com dano: a vida só cai depois dos dados
      const act = a.actions[idx];
      const old = { attack: act.attack, damage: act.damage, parts: act.parts };
      act.attack = '1d20+100'; act.damage = '2d6+1'; delete act.parts;
      const hp = () => { const t = S.currentScene().tokens[foe.id]; return t && t.bars && t.bars[0] ? Number(t.bars[0].value) : null; };
      S.dispatch({ type: 'token.update', sceneId: sc.id, id: foe.id, patch: { bars: [{ name: 'PV', value: 500, max: 500 }].concat((foe.bars || []).slice(1)) } });
      const hp0 = hp(), c0 = S.state.chat.length, tA = Date.now();
      S.dispatch({ type: 'act.use', sceneId: sc.id, actorId: a.id, index: idx, attackerId: hero.id, targets: [foe.id] });
      S.dispatch({ type: 'act.use', sceneId: sc.id, actorId: a.id, index: idx, attackerId: hero.id, targets: [foe.id] });
      ok(hp() === hp0 && S.state.chat.length === c0, 'logo depois do clique: vida e chat iguais');
      await W(1200);
      ok(hp() === hp0, 'durante os dados a vida não muda');
      await waitFor(() => S.state.chat.slice(c0).filter((x) => x.kind === 'action').length === 1);
      const tHit = Date.now(), hp1 = hp();
      const am = S.state.chat.slice(c0).find((x) => x.kind === 'action'), arr = arrivals.find((x) => x.id === am.id);
      ok(am && am.dice.some((x) => x.f === 20) && am.dice.filter((x) => x.f === 6).length === 2, 'ataque com o d20 e os 2d6 do dano');
      ok(arr && arr.done && arr.notation === N(am.dice), 'dados do ataque pararam antes do resultado');
      ok(hp1 === hp0 - am.targets[0].dmg.total, 'vida cai junto com o resultado');
      await waitFor(() => S.state.chat.slice(c0).filter((x) => x.kind === 'action').length === 2);
      const am2 = S.state.chat.slice(c0).filter((x) => x.kind === 'action')[1];
      ok(am2.targets[0].before === hp1, 'segundo ataque usa a vida que o primeiro deixou');
      ok(Date.now() - tHit >= 2000, 'segundo ataque espera os próprios dados');
      log.push('ataque: vida ' + hp0 + ' → ' + hp1 + ' (' + (tHit - tA) + ' ms depois do clique) → ' + hp() + ' no segundo · dados ' + JSON.stringify(am.dice));
      Object.assign(act, old);
      // Desfazer os dois ataques depois que aparecem: a vida volta
      S.undoAction(am2.id); S.undoAction(am.id); await W(100);
      ok(hp() === hp0, 'desfazer os ataques devolve a vida');
      log.push('desfazer: vida volta a ' + hp());
      // Limite de tempo: cada lance para em até ~2 s
      const times = [];
      for (const d of [[{ f: 20, v: 5 }], [{ f: 20, v: 9 }, { f: 20, v: 2 }], Array.from({ length: 8 }, (_, i) => ({ f: 6, v: 1 + (i % 6) })), [{ f: 8, v: 3 }, { f: 6, v: 6 }, { f: 6, v: 1 }]]) {
        for (let k = 0; k < 2; k++) {
          const prev = D3.last;
          D3.show({ kind: 'roll', dice: d });
          await waitFor(() => D3.last !== prev && D3.last.done);
          times.push(D3.last.done - D3.last.at + ' (acel. ' + (Math.round((D3.speed || 1) * 100) / 100) + ')');
        }
      }
      ok(Math.max(...times.map((x) => parseInt(x, 10))) <= 2300, 'cada lance para em até ~2 s');
      log.push('tempo dos lances (ms): ' + times.join(', '));
    } else log.push('ataque: tutorial sem herói com ataque (pulado)');

    // ---------- 5. Secreta, jogador e desligado ----------
    const sec = { kind: 'roll', secret: true, playerId: 'outro_jogador', dice: [{ f: 20, v: 7 }] };
    ok(D3.show(sec) === true, 'mestre vê a rolagem secreta');
    D3.queue = [];
    S.viewAs = '*';
    ok(D3.show(sec) === false, 'jogador não vê a secreta de outro');
    ok(D3.show(Object.assign({}, sec, { secret: false })) === true, 'jogador vê a pública');
    D3.queue = [];
    S.viewAs = null;
    D3.setEnabled(false);
    ok(D3.show({ kind: 'roll', dice: [{ f: 6, v: 2 }] }) === false, 'desligado: nada aparece');
    const c1 = S.state.chat.length;
    S.rollPost('1d6');
    await waitFor(() => S.state.chat.length > c1);
    ok(Array.isArray(lastMsg().dice), 'desligado: o chat continua com os dados (para quem tem ligado)');
    D3.setEnabled(true);

    // ---------- Plano 71: os dados param na área do centro (metade da largura e da altura do mapa) ----------
    const area = location.hash === '#area';
    if (area) {
      const r = $('#dice3d');
      r.append(Object.assign(document.createElement('div'), { id: 'area-teste' }));
      Object.assign($('#area-teste').style, { position: 'absolute', left: '25%', top: '25%', width: '50%', height: '50%', border: '2px dashed #f2b24c', boxSizing: 'border-box' });
    }
    const spots = [], outside = [];
    const sets = [[{ f: 20, v: 11 }], [{ f: 20, v: 3 }, { f: 20, v: 18 }], [{ f: 8, v: 4 }, { f: 6, v: 2 }, { f: 6, v: 6 }], Array.from({ length: 8 }, (_, i) => ({ f: 6, v: 1 + (i % 6) }))];
    for (let k = 0; k < (area ? 1 : 30); k++) {
      const d = area ? sets[3] : sets[k % 4], prev = D3.last;
      D3.show({ kind: 'roll', dice: d });
      await waitFor(() => D3.last !== prev && D3.last.done);
      for (const die of D3.box.diceList || []) {
        const p = die.position.clone().project(D3.box.camera); // -1…1 na tela dos dados
        spots.push([p.x, p.y]);
        if (Math.abs(p.x) > 0.55 || Math.abs(p.y) > 0.55) outside.push([Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]);
      }
    }
    if (area) { log.push('foto pronta'); return; }
    const xs = spots.map((p) => p[0]), ys = spots.map((p) => p[1]);
    const sd = (a) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
    const near = spots.filter(([x, y]) => Math.hypot(x, y) < 0.08).length;
    ok(!outside.length, 'todo dado parou dentro da área do centro (fora: ' + JSON.stringify(outside.slice(0, 6)) + ')');
    ok(sd(xs) > 0.1 && sd(ys) > 0.1, 'os lugares variam dentro da área');
    log.push(`área do centro: ${spots.length} dados em 30 lances · fora ${outside.length} · x de ${Math.min(...xs).toFixed(2)} a ${Math.max(...xs).toFixed(2)} · y de ${Math.min(...ys).toFixed(2)} a ${Math.max(...ys).toFixed(2)} (a área vai de -0,5 a 0,5) · espalhamento ${sd(xs).toFixed(2)} × ${sd(ys).toFixed(2)} · bem no meio ${near}`);

    // ---------- 6. Painel Mesa ----------
    UI.showTab('table'); await W(150);
    const box = $('#dice3d-sec');
    ok(box && box.querySelector('[data-dice3d="on"]').checked && box.querySelector('[data-dice3d="vol"]'), 'seção Dados 3D no painel Mesa');
    box.querySelector('[data-dice3d="on"]').click(); await W(80);
    ok(!D3.enabled() && !$('#dice3d-sec [data-dice3d="vol"]'), 'desligar pelo painel');
    $('#dice3d-sec [data-dice3d="on"]').click(); await W(80);
    const vr = $('#dice3d-sec [data-dice3d="vol"]'); vr.value = '0.3'; vr.dispatchEvent(new Event('change')); await W(50);
    ok(Math.abs(D3.volume() - 0.3) < 0.01, 'volume pelo painel');
    log.push('painel Mesa: ligado ' + D3.enabled() + ' · volume ' + D3.volume());
    D3.setVolume(0.6);
    log.push('fim dos dados 3D');
  } catch (e) { log.push('EXC ' + e.stack); }
  flush();
}, 1500));
