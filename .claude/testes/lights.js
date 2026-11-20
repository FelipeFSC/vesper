// Plano 8 · Pontos de luz e de escuridão: níveis (plena, meia, escuridão), formas, paredes, escuridão, visão no escuro, cone do token
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, L = App.Light, sc = () => S.currentScene(), g = sc().grid;
    const NV = L.LEVELS;
    const P = (cx, cy) => ({ x: cx * g, y: cy * g });
    const src = (id) => L.sources(sc()).find((s) => s.id === id);
    const lv = (id, cx, cy) => NV[L.levelOf(sc(), src(id), P(cx, cy))];
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });
    for (const t of Object.values(sc().tokens)) S.dispatch({ type: 'token.update', sceneId: sc().id, id: t.id, patch: { light: null, darkvision: 0 } });
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: false } } });

    // Círculo: 4 de luz plena, 8 no total
    const c = B.addLight(sc(), { kind: 'light', shape: 'circle', x: 10.5 * g, y: 10.5 * g, bright: 4, dim: 8 });
    log.push(`círculo 4/8: a 3 quad. ${lv(c.id, 13.5, 10.5)} · a 6 ${lv(c.id, 10.5, 16.5)} · a 9 ${lv(c.id, 1.5, 10.5)}`);
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'wa', x1: 12 * g, y1: 8 * g, x2: 12 * g, y2: 13 * g, cover: 'full' }] });
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'wb', x1: 9 * g, y1: 14 * g, x2: 12 * g, y2: 14 * g, cover: 'half' }] });
    log.push(`parede absoluta no meio: a 3 quad. atrás dela ${lv(c.id, 13.5, 10.5)} · meia parede deixa passar: ${lv(c.id, 10.5, 14.5)}`);
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });

    // Cone: 60°, para a direita, 4/6
    const k = B.addLight(sc(), { kind: 'light', shape: 'cone', x: 2.5 * g, y: 2.5 * g, bright: 4, dim: 6, dir: 0, angle: 60 });
    const ang = (deg, r) => [2.5 + Math.cos(deg * Math.PI / 180) * r, 2.5 + Math.sin(deg * Math.PI / 180) * r];
    log.push(`cone 60° 4/6: à frente a 3 ${lv(k.id, ...ang(0, 3))} · à frente a 5 ${lv(k.id, ...ang(0, 5))} · atrás ${lv(k.id, ...ang(180, 2))} · a 35° (borda) ${lv(k.id, ...ang(35, 3))} · a 50° ${lv(k.id, ...ang(50, 3))}`);
    S.dispatch({ type: 'lightpt.update', sceneId: sc().id, id: k.id, patch: { dir: 90 } });
    log.push(`cone virado para baixo: à direita ${lv(k.id, ...ang(0, 3))} · embaixo ${lv(k.id, ...ang(90, 3))}`);

    // Área 4×4 com 1 quad. de meia luz em volta; parede no lado direito
    const a = B.addLight(sc(), { kind: 'light', shape: 'area', pts: [[20 * g, 2 * g], [24 * g, 2 * g], [24 * g, 6 * g], [20 * g, 6 * g]], edge: 1 });
    log.push(`área: dentro ${lv(a.id, 22, 4)} · 0,5 fora ${lv(a.id, 24.5, 4)} · 2 fora ${lv(a.id, 26, 4)}`);
    S.dispatch({ type: 'wall.add', sceneId: sc().id, walls: [{ id: 'wc', x1: 24 * g, y1: 1 * g, x2: 24 * g, y2: 7 * g, cover: 'full' }, { id: 'wd', x1: 22 * g, y1: 2 * g, x2: 22 * g, y2: 6 * g, cover: 'full' }] });
    log.push(`área com paredes: além da parede da direita ${lv(a.id, 24.5, 4)} · 0,5 acima ${lv(a.id, 21, 1.5)} · dos dois lados da parede de dentro ${lv(a.id, 21, 4)} / ${lv(a.id, 23, 4)}`);
    S.dispatch({ type: 'wall.clear', sceneId: sc().id });

    // Escuridão 2/3 no meio do círculo de luz
    const d = B.addLight(sc(), { kind: 'dark', shape: 'circle', x: 10.5 * g, y: 10.5 * g, bright: 2, dim: 3 });
    const at = (cx, cy) => NV[L.levelAt(sc(), P(cx, cy))];
    log.push(`escuridão 2/3 sobre a luz: centro ${at(10.5, 10.5)} · a 2,5 ${at(13, 10.5)} · a 3,5 ${at(14, 10.5)}`);
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: true } } });
    log.push(`de dia: centro da escuridão ${at(10.5, 10.5)} · longe ${at(25, 15)}`);
    S.dispatch({ type: 'scene.update', id: sc().id, patch: { light: { enabled: true, global: false } } });

    // Visão no escuro: um nível acima
    const hero = Object.values(sc().tokens).find((t) => /lyra/i.test(t.name));
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: 15 * g, y: 10 * g });
    const vh = sc().tokens[hero.id];
    log.push(`sem visão no escuro: centro ${NV[L.levelFor(sc(), P(10.5, 10.5), vh)]} · vê o centro? ${L.pointVisible(sc(), P(10.5, 10.5), [vh])}`);
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: hero.id, patch: { darkvision: 12 } });
    const vh2 = sc().tokens[hero.id];
    log.push(`com visão no escuro: centro ${NV[L.levelFor(sc(), P(10.5, 10.5), vh2)]} · borda ${NV[L.levelFor(sc(), P(13, 10.5), vh2)]} · longe no escuro ${NV[L.levelFor(sc(), P(25, 18), vh2)]} · vê o centro? ${L.pointVisible(sc(), P(10.5, 10.5), [vh2])}`);
    S.dispatch({ type: 'lightpt.update', sceneId: sc().id, id: d.id, patch: { on: false } });
    log.push(`escuridão desligada: centro ${at(10.5, 10.5)}`);

    // Lanterna do token em cone: aponta para onde andou
    S.dispatch({ type: 'token.update', sceneId: sc().id, id: hero.id, patch: { darkvision: 0, light: { bright: 4, dim: 8, shape: 'cone', angle: 60, color: '#8fb4ff' } } });
    const t0 = sc().tokens[hero.id];
    S.dispatch({ type: 'token.move', sceneId: sc().id, id: hero.id, x: t0.x, y: t0.y - g, path: [[t0.x, t0.y], [t0.x, t0.y - g]], at: Date.now() });
    const t1 = sc().tokens[hero.id], hc = { x: t1.x + g / 2, y: t1.y + g / 2 };
    const ts = L.sources(sc()).find((s) => s.id === hero.id);
    log.push(`token andou para cima: olha para ${t1.facing}° · acima a 3 ${NV[L.levelOf(sc(), ts, { x: hc.x, y: hc.y - 3 * g })]} · abaixo a 3 ${NV[L.levelOf(sc(), ts, { x: hc.x, y: hc.y + 3 * g })]}`);

    // Permissões
    const pid = Object.keys(S.state.players)[0] || 'p1';
    const n0 = sc().lights.length;
    S.remoteAction({ type: 'lightpt.add', sceneId: sc().id, light: B.newLight(sc(), { x: 0, y: 0 }) }, pid);
    S.remoteAction({ type: 'lightpt.update', sceneId: sc().id, id: c.id, patch: { on: false } }, pid);
    S.remoteAction({ type: 'lightpt.delete', sceneId: sc().id, id: c.id }, pid);
    log.push(`jogador tentando criar, apagar ou remover luz: recusado = ${sc().lights.length === n0 && sc().lights.find((o) => o.id === c.id).on !== false}`);
    S.remoteAction({ type: 'token.update', sceneId: sc().id, id: hero.id, patch: { facing: 180 } }, pid);
    log.push(`dono vira a lanterna (${pid}, dono do token: ${S.canControl(sc().tokens[hero.id], pid)}): facing = ${sc().tokens[hero.id].facing}`);
    S.remoteAction({ type: 'token.update', sceneId: sc().id, id: hero.id, patch: { light: null } }, pid);
    log.push(`jogador tentando apagar a luz do token: recusado = ${!!sc().tokens[hero.id].light}`);

    // Interface: ferramenta, criar arrastando, painel
    if (App.UI.mode !== 'edit') App.UI.setMode('edit');
    B.setTool('light'); await W(200);
    log.push('opções da ferramenta: ' + [...document.querySelectorAll('#tool-opts .to-row')].map((b) => b.textContent).join(' | '));
    const rect = B.canvas.getBoundingClientRect();
    const scr = (x, y) => { const p = B.toScreen(x, y); return { clientX: rect.left + p.x, clientY: rect.top + p.y }; };
    const n1 = sc().lights.length;
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(5.5 * g, 14.5 * g))));
    window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(8.5 * g, 14.5 * g))));
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(8.5 * g, 14.5 * g))));
    await W(300);
    const nl = sc().lights[sc().lights.length - 1];
    log.push(`arrastou 3 quadrados: ${sc().lights.length - n1} luz nova · ${nl.shape} ${nl.bright}/${nl.dim} · selecionada: ${B.selectedLight === nl.id}`);
    log.push('painel: ' + [...document.querySelectorAll('#token-hud .eyebrow')].map((e) => e.textContent).join(' | ') + ' · campos: ' + [...document.querySelectorAll('#token-hud .prop-grid label')].map((e) => e.firstChild.textContent).join(', '));
    // alça do alcance: arrastar até 5 quadrados
    const hd = { x: nl.x + nl.dim * g, y: nl.y };
    B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(hd.x, hd.y))));
    window.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, buttons: 1, pointerId: 1 }, scr(nl.x + 5 * g, nl.y))));
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(nl.x + 5 * g, nl.y))));
    log.push(`alça do alcance até 5: ${sc().lights.find((o) => o.id === nl.id).dim}`);
    // cor
    const sw = [...document.querySelectorAll('#token-hud .light-colors .swatch')].find((b) => b.title === 'Lua');
    if (sw) sw.click();
    log.push('cor Lua: ' + sc().lights.find((o) => o.id === nl.id).color);
    // Delete e duplicar
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
    const n2 = sc().lights.length;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    log.push(`Ctrl+D duplicou (${n2 - n1 - 1}), Delete apagou (${n2 - sc().lights.length})`);
    // Área: só ponto a ponto (sem o modo retângulo)
    B.lightShape = 'area'; App.UI.refresh(); await W(200);
    log.push('opções com Área: ' + [...document.querySelectorAll('#tool-opts .to-row')].map((b) => b.textContent).join(' | '));
    const na = sc().lights.length;
    const clk = (x, y) => { B.canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, buttons: 1, pointerId: 1 }, scr(x, y)))); window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, scr(x, y)))); };
    clk(1 * g, 6 * g); clk(4 * g, 6 * g); clk(4 * g, 9 * g); clk(2 * g, 9 * g);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const ar = sc().lights[sc().lights.length - 1];
    log.push(`área por cliques: ${sc().lights.length - na} nova · ${ar.shape} com ${ar.pts.length} cantos · dentro ${NV[L.levelOf(sc(), src(ar.id), P(2.5, 7.5))]}`);
    B.lightShape = 'circle';
    // exportar cena leva as luzes
    const bundle = App.Storage.sceneBundle(sc().id);
    log.push('exportar cena leva as luzes: ' + (bundle.scene.lights || []).length);
    log.push('tremular: ' + L.flickering(sc()) + ' → ' + (S.dispatch({ type: 'lightpt.update', sceneId: sc().id, id: c.id, patch: { flicker: true } }), L.flickering(sc())));
    B.setTool('select');
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
  document.body.setAttribute('data-log', JSON.stringify(log));
}, 1200));
