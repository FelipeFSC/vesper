// Teste: percorre o tutorial inteiro com cliques de verdade no canvas (copiado para a pasta do projeto só durante o teste)
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const __log = [];
  window.__err = window.__err || [];
  try {
    const W = (ms) => new Promise((r) => setTimeout(r, ms)); const T = App.Tutorial, S = App.Store, B = App.Board, ids = () => T.ids;
    const q = (css, txt) => [...document.querySelectorAll(css)].find((e) => !txt || e.textContent.includes(txt));
    const click = (css, txt) => { const e = q(css, txt); if (!e) throw new Error('não achei ' + css + ' ' + (txt || '')); e.click(); };
    const hero = () => S.state.actors[ids().heroActor];
    const sc = () => S.currentScene();
    // clique real no canvas, no centro de um ponto do mapa
    const at = (x, y) => { const r = B.canvas.getBoundingClientRect(), p = B.toScreen(x, y); return { clientX: r.left + p.x, clientY: r.top + p.y }; };
    const canvasClick = (x, y) => {
      const o = Object.assign({ button: 0, bubbles: true, pointerId: 1 }, at(x, y));
      B.canvas.dispatchEvent(new PointerEvent('pointermove', o));
      B.canvas.dispatchEvent(new PointerEvent('pointerdown', o));
      window.dispatchEvent(new PointerEvent('pointerup', o));
    };
    const tokC = (key) => { const t = sc().tokens[ids()[key]], s = (t.size || 1) * sc().grid; return [t.x + s / 2, t.y + s / 2]; };
    const actions = {
      2: () => { B.selected = ids().hero; B.requestRender(); },
      3: () => { const t = sc().tokens[ids().hero]; S.dispatch({ type: 'token.move', sceneId: sc().id, id: t.id, x: t.x + sc().grid, y: t.y }); },
      6: () => click('#token-hud .act-btn', 'Espada'),
      7: async () => {
        const bar = document.querySelector('#target-bar').textContent;
        __log.push('   barra longe: ' + bar.replace(/\s+/g, ' ').slice(0, 90));
        canvasClick(...tokC('g1')); // fora de alcance: não pode atacar
        await W(200);
        __log.push('   clicar longe atacou? ' + (S.state.chat.some((m) => m.kind === 'action')) + ' · mira continua: ' + !!B.targeting);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        const g = sc().tokens[ids().g1];
        S.dispatch({ type: 'token.move', sceneId: sc().id, id: ids().hero, x: g.x - sc().grid, y: g.y });
      },
      8: async () => {
        B.selected = ids().hero; B.requestRender(); await W(300);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
        await W(200);
        __log.push('   atalho 1 abriu a mira: ' + !!(B.targeting && B.targeting.label === 'Espada longa') + ' · alvos válidos: ' + B.validTargetCount());
        canvasClick(...tokC('g1'));
        await W(400);
        __log.push('   efeitos no mapa: ' + B.fx.map((f) => f.kind + (f.text ? '(' + f.text + ')' : '')).join(' '));
        await W(200);
        __log.push('   cartão: ' + (document.querySelector('#roll-feed .msg.compact') || {}).textContent);
      },
      10: () => { B.selected = ids().g1; B.requestRender(); },
      11: async () => {
        for (let n = 0; n < 30 && !q('[data-undo]'); n++) {
          // Plano 70: o resultado chega depois dos dados (2,4 s); espera cada ataque aparecer antes de tentar de novo
          const n0 = S.state.chat.filter((m) => m.kind === 'action').length;
          App.UI.useAction(hero(), 0, sc().tokens[ids().hero]); await W(50); canvasClick(...tokC('g1'));
          for (let k = 0; k < 40 && S.state.chat.filter((m) => m.kind === 'action').length === n0; k++) await W(100);
          await W(150);
        }
        click('[data-undo]');
      },
      12: () => click('#token-hud .act-btn', 'Bola'),
      13: async () => {
        const g = sc().grid, g1 = sc().tokens[ids().g1];
        canvasClick(g1.x + g / 2, g1.y + g * 1.5);
        await W(300);
        const m = S.state.chat.filter((x) => x.kind === 'action').pop();
        __log.push('   explosão: ponto=' + JSON.stringify(m && m.point) + ' alvos=' + (m && m.targets.map((r) => r.name).join(', ')) + ' · avisos: ' + [...document.querySelectorAll('#toasts > *')].map((t) => t.textContent).join(' / ') + ' · mirando=' + !!B.targeting + ' · fila=' + S._rq.length + '/' + S._rqBusy);
      },
      15: async () => { click('#token-hud .act-btn', 'Poção'); await W(100); canvasClick(...tokC('hero')); },
      16: () => click('#token-hud .btn', 'Ficha'),
      17: () => click('.win .act-card .act-edit'),
      19: () => click('.win .btn', 'Nova ação'),
      20: async () => { const a = hero(); App.UI.useAction(a, a.actions.length - 1, sc().tokens[ids().hero]); await W(100); canvasClick(...tokC('g1')); },
      21: () => { for (const id of [...App.UI.windows.keys()]) App.UI.closeWindow(id); click('#dock .dock-btn', 'Combate'); },
      22: async () => { click('#p-combat .btn', 'Todos'); await W(300); click('#p-combat .btn', 'faltantes'); },
      23: () => click('#p-combat .btn', 'Iniciar'),
      24: () => click('#p-combat .btn', 'Próximo'),
      25: () => click('#crumb-campaign'),
      27: async () => { click('#light-on'); await W(400); click('#light-sec .seg button', 'Escuro'); },
      28: async () => { B.selected = ids().hero; B.requestRender(); await W(500); const s = q('#token-hud .light-row select'); s.value = 'torch'; s.dispatchEvent(new Event('change')); },
      29: () => { const s = sc(), g = s.grid; S.dispatch({ type: 'wall.add', sceneId: s.id, walls: [{ id: 'wt', x1: 7 * g, y1: 3 * g, x2: 7 * g, y2: 9 * g }] }); },
      30: async () => { click('#tool-opts .wall-type', 'Meia'); await W(200); S.dispatch({ type: 'wall.update', sceneId: sc().id, id: 'wt', patch: { cover: B.wallType } }); },
      31: async () => { S.dispatch({ type: 'wall.update', sceneId: sc().id, id: 'wt', patch: { cover: 'full' } }); click('#btn-preview'); },
      33: async () => { await W(300); const b = [...document.querySelectorAll('#token-hud .vis-seg button')].find((x) => /Vulto/.test(x.textContent)); if (b) b.click(); },
      34: async () => { await W(300); const c = document.querySelector('#token-hud .fly-row input[type=checkbox]'); if (c) c.click(); },
      35: async () => { click('#toolbar [data-tool="light"]'); await W(200); const s = sc(), g = s.grid; B.addLight(s, { shape: 'circle', x: 4.5 * g, y: 4.5 * g }); },
      36: () => click('#dock .dock-btn', 'Som'),
      39: async () => { click('#toolbar [data-tool="room"]'); await W(200); const s = sc(), g = s.grid; B.addRoom(s, [[g, g], [5 * g, g], [5 * g, 4 * g], [g, 4 * g]]); },
      40: async () => { click('#toolbar [data-tool="prop"]'); await W(200); const cv = document.createElement('canvas'); cv.width = 120; cv.height = 60; cv.getContext('2d').fillRect(0, 0, 120, 60); const blob = await new Promise((r) => cv.toBlob(r, 'image/png')); await B.addPropFromFile(new File([blob], 'bau.png', { type: 'image/png' }), B.viewCenter()); },
      41: async () => { click('#dock .dock-btn', 'Mostrar'); await W(200); S.dispatch({ type: 'handout.add', handout: { id: 'hw', title: 'Carta', img: null, text: 'Uma pista.' } }); App.UI.showHandout(S.state.handouts.find((h) => h.id === 'hw'), '*'); },
    };
    for (let guard = 0; guard < 60 && T.i < T.steps.length - 1; guard++) {
      const i = T.i, st = T.steps[i]; await W(300);
      const spot = st.spot ? (!document.querySelector('#tut-spot').hidden ? 'spot ok' : 'SEM SPOT') : '-';
      if (actions[i]) await actions[i]();
      // Plano 70: o resultado das rolagens chega depois dos dados (2,4 s, em fila); espera o passo concluir (até 10 s)
      if (st.done) { await W(600); for (let k = 0; k < 47 && T.i === i && !T.doneAt; k++) await W(200); } else await W(200);
      let res;
      if (T.i !== i) res = 'auto ok';
      else if (st.done && !T.doneAt) { res = 'NÃO CONCLUIU'; click('#tut-panel .btn', 'Pular'); }
      else { res = st.done ? 'feito ok' : 'leitura'; click('#tut-panel .btn', 'Próximo'); }
      await W(100);
      __log.push(`${i + 1}. [${st.ch}] ${st.title} — ${spot} ${res}`);
    }
    __log.push('final: ' + T.steps[T.i].title + ' · visão: ' + (S.viewAs || 'mestre'));

    // ---- validação do mestre para um jogador ----
    App.UI.setViewAs(null);
    const s = sc(), h = s.tokens[ids().hero], g2 = s.tokens[ids().g2], g1 = s.tokens[ids().g1];
    S.dispatch({ type: 'wall.clear', sceneId: s.id });
    S.dispatch({ type: 'combat.end' });
    S.dispatch({ type: 'token.move', sceneId: s.id, id: h.id, x: 2 * s.grid, y: 2 * s.grid });
    const before = S.state.chat.length;
    const okFar = S.useAction({ sceneId: s.id, actorId: hero().id, index: 0, attackerId: h.id, targets: [g2.id] }, 'p1');
    const sys = S.state.chat.slice(before).map((m) => m.text).join(' | ');
    __log.push('jogador ataca de longe: aceito=' + okFar + ' · aviso: ' + sys);
    const okFire = S.useAction({ sceneId: s.id, actorId: hero().id, index: 2, attackerId: h.id, targets: [g1.id], point: { x: 40 * s.grid, y: 40 * s.grid } }, 'p1');
    __log.push('bola de fogo fora do alcance: aceito=' + okFire + ' · ' + S.state.chat.slice(-1)[0].text);
    S.dispatch({ type: 'token.move', sceneId: s.id, id: h.id, x: g1.x - s.grid, y: g1.y });
    const okNear = S.useAction({ sceneId: s.id, actorId: hero().id, index: 0, attackerId: h.id, targets: [g1.id] }, 'p1');
    __log.push('jogador ataca do lado: aceito=' + okNear);
    const C = App.Combat;
    __log.push('lados: Lyra=' + C.side(h) + ' goblin=' + C.side(g1) + ' · arco alcance=' + C.rangeOf(hero().actions[1]) + ' · cura=' + C.rangeLabel(hero().actions[3]));
    __log.push('chance 1d20+3 vs 13 = ' + C.hitChance({ attack: '1d20+3' }, {}, 13));
  } catch (e) { __log.push('EXCEÇÃO no passo ' + App.Tutorial.i + ': ' + e.stack); }
  __log.push('erros: ' + JSON.stringify(window.__err));
  document.body.setAttribute('data-log', JSON.stringify(__log));
}, 800));
