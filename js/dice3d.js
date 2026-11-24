'use strict';
/*
 * Dados 3D (Plano 69). A mesa sorteia os números (js/dice.js) e a mensagem do chat leva a lista (msg.dice).
 * Aqui cada tela mostra os dados caindo por cima do mapa e parando nesses números (dice-box-threejs com resultado
 * definido). Nada novo vai pela rede. Cada pessoa liga, desliga e escolhe o volume na própria tela (navegador).
 * A biblioteca só é carregada na primeira rolagem com os dados ligados.
 */
(function (App) {
  const S = () => App.Store;
  const KEY = 'vesper-dados3d', KEY_VOL = 'vesper-dados3d-volume';
  const SHOW = new Set([4, 6, 8, 10, 12, 20, 100]); // dados com modelo 3D; os outros (d3, dF…) ficam só no chat
  const MAX = 20; // dados na tela de uma vez; o resto fica só no chat
  const HOLD = 2200, FADE = 450;
  // Plano 70: todo lance para em até MAX_MS (o mestre mostra o resultado 2,4 s depois do aviso)
  const MAX_MS = 1900;
  // Plano 71: área imaginária no centro, onde os dados param (fração da largura e da altura do mapa)
  const AREA = 0.5;
  // Sons da biblioteca: no build, o vite.config copia para dados3d/ (arquivos de áudio não entram no git)
  const ASSETS = import.meta.env && import.meta.env.DEV ? '/node_modules/@3d-dice/dice-box-threejs/public/' : './dados3d/';

  const D3 = { box: null, el: null, loading: null, queue: [], busy: false, hideTimer: 0, last: null };
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* navegador sem armazenamento: vale até fechar */ } };
  D3.enabled = () => get(KEY, '1') !== '0';
  D3.volume = () => { const v = Number(get(KEY_VOL, '0.6')); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.6; };
  D3.setEnabled = (on) => { put(KEY, on ? '1' : '0'); if (!on) { D3.queue = []; hide(true); } };
  D3.setVolume = (v) => put(KEY_VOL, String(Math.min(1, Math.max(0, Number(v) || 0))));

  // Quem vê: a mesma regra do chat (secreta = quem rolou e o mestre)
  const canSee = (m) => !m.secret || S().gmView() || m.playerId === S().me.id;

  // Lista da mensagem → notação da biblioteca ("1d20+1d100+1d10@17,70,4") e quais dados ficam apagados
  D3.notationOf = function (dice) {
    const parts = [], vals = [], drop = [];
    for (const d of dice || []) {
      const f = Number(d && d.f), v = Math.round(Number(d && d.v));
      if (!SHOW.has(f) || !(v >= 1 && v <= f)) continue;
      if (parts.length >= MAX) break;
      if (f === 100) {
        // d% = dezena (10…90, 100 = "00") + unidade (1…9, 10 = "0"): 100 → 00 + 0
        parts.push('1d100', '1d10'); vals.push(Math.floor((v % 100) / 10) * 10 || 100, v % 10 || 10); drop.push(!!d.drop, !!d.drop);
      } else { parts.push('1d' + f); vals.push(v); drop.push(!!d.drop); }
    }
    return parts.length ? { notation: parts.join('+') + '@' + vals.join(','), drop } : null;
  };

  // Cor do dado = cor de quem rolou; número claro ou escuro conforme o fundo
  function colorset(hex) {
    const c = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')) ? String(hex).replace('#', '') : '6c4fe0';
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
    const light = 0.299 * r + 0.587 * g + 0.114 * b > 165;
    return { name: 'vesper-' + c, background: '#' + c, foreground: light ? '#17130a' : '#ffffff', outline: light ? '#ffffff' : '#000000', texture: 'none', material: 'plastic' };
  }

  async function ensure() {
    if (D3.box) return D3.box;
    if (!D3.loading) D3.loading = (async () => {
      const wrap = document.getElementById('board-wrap');
      if (!wrap) throw new Error('sem mapa');
      const el = document.createElement('div');
      el.id = 'dice3d'; el.className = 'dice3d'; el.setAttribute('aria-hidden', 'true');
      wrap.append(el);
      const { default: DiceBox } = await import('@3d-dice/dice-box-threejs');
      const box = new DiceBox('#dice3d', {
        assetPath: ASSETS, sounds: D3.volume() > 0, volume: Math.round(D3.volume() * 100), shadows: true,
        theme_surface: 'green-felt', theme_material: 'plastic', theme_customColorset: colorset('#6c4fe0'),
        baseScale: 90, strength: 0.7, gravity_multiplier: 1200, // Plano 70: lance mais curto (média ~2 s), pouco precisa acelerar
      });
      await box.initialize();
      // Plano 70: o lance é calculado inteiro antes de aparecer (simulateThrow); se for durar mais que MAX_MS,
      // a animação anda mais depressa na mesma proporção (o resultado e o caminho dos dados não mudam)
      const sim = box.simulateThrow, anim = box.animateThrow;
      // O prazo conta desde que a rolagem chegou nesta tela (se começou atrasada, corre um pouco mais)
      box.simulateThrow = function () {
        sim.call(this);
        const left = Math.max(500, (D3.deadline || Date.now() + MAX_MS) - Date.now());
        D3.speed = Math.max(1, (this.iteration * this.framerate * 1000) / left);
      };
      box.animateThrow = function (e, t) {
        if (this.last_time && D3.speed > 1) { const n = Date.now(); this.last_time = n - (n - this.last_time) * D3.speed; }
        return anim.call(this, e, t);
      };
      // Plano 71: os dados param numa área imaginária no centro do mapa (AREA da largura e da altura).
      // As paredes invisíveis da biblioteca vão para a borda dessa área, e o lançamento sai de dentro dela.
      const mk = box.makeWorldBox, gv = box.getNotationVectors;
      box.makeWorldBox = function () {
        mk.call(this);
        const w = this.display.containerWidth * AREA, h = this.display.containerHeight * AREA, b = this.box_body;
        b.topWall.position.set(0, h, 0); b.bottomWall.position.set(0, -h, 0);
        b.leftWall.position.set(w, 0, 0); b.rightWall.position.set(-w, 0, 0);
      };
      box.makeWorldBox();
      box.getNotationVectors = function (...args) {
        const r = gv.apply(this, args);
        // A biblioteca lança da borda da tela (90%): passa para perto da borda da área, com menos força
        for (const v of (r && r.vectors) || []) { v.pos.x *= AREA * 0.85; v.pos.y *= AREA * 0.85; v.velocity.x *= 0.6; v.velocity.y *= 0.6; }
        return r;
      };
      D3.box = box; D3.el = el;
      return box;
    })().catch((e) => { D3.loading = null; throw e; });
    return D3.loading;
  }

  function hide(now) {
    clearTimeout(D3.hideTimer);
    if (!D3.el) return;
    D3.el.classList.remove('on');
    D3.hideTimer = setTimeout(() => { if (!D3.busy && D3.box) D3.box.clearDice(); }, now ? 0 : FADE);
  }

  async function run() {
    if (D3.busy) return;
    D3.busy = true;
    try {
      while (D3.queue.length) {
        const job = D3.queue.shift();
        if (!D3.enabled()) continue;
        const box = await ensure();
        clearTimeout(D3.hideTimer);
        // Tamanho do mapa mudou (barra recolhida, janela): a área dos dados acompanha
        const c = box.renderer && box.renderer.domElement;
        if (c && (c.width !== D3.el.clientWidth || c.height !== D3.el.clientHeight)) box.setDimensions({ x: D3.el.clientWidth, y: D3.el.clientHeight });
        if (job.color !== D3.color) { await box.updateConfig({ theme_customColorset: colorset(job.color) }); D3.color = job.color; }
        const vol = D3.volume();
        box.sounds = vol > 0; box.volume = Math.round(vol * 100);
        D3.el.classList.add('on');
        D3.last = { notation: job.notation, at: Date.now(), asked: job.t0 };
        D3.deadline = job.t0 + MAX_MS;
        await box.roll(job.notation);
        dimDropped(box, job.drop);
        D3.last.done = Date.now();
        // Segura os dados parados; uma rolagem nova (o mestre já mandou) começa na hora
        await new Promise((r) => { const t = setTimeout(r, HOLD); D3.wake = () => { clearTimeout(t); r(); }; if (D3.queue.length) D3.wake(); });
        D3.wake = null;
      }
    } catch (e) { console.warn('dados 3D', e); }
    finally {
      D3.busy = false;
      if (!D3.queue.length) hide(false);
    }
  }
  // Dado descartado (vantagem, "descarta o menor"): fica apagado
  function dimDropped(box, drop) {
    if (!drop || !drop.some(Boolean)) return;
    (box.diceList || []).forEach((die, i) => {
      if (!die || !drop[i]) return;
      const mats = Array.isArray(die.material) ? die.material : [die.material];
      const out = mats.map((m) => { const c = m.clone(); c.transparent = true; c.opacity = 0.3; return c; });
      die.material = Array.isArray(die.material) ? out : out[0];
    });
    if (box.renderer && box.scene && box.camera) box.renderer.render(box.scene, box.camera);
  }

  // Mensagem nova no chat com dados: entra na fila (no máximo 3 esperando; as mais velhas saem)
  D3.show = function (msg) {
    if (!msg || !Array.isArray(msg.dice) || !msg.dice.length || !D3.enabled() || !canSee(msg)) return false;
    const n = D3.notationOf(msg.dice);
    if (!n) return false;
    D3.queue.push({ notation: n.notation, drop: n.drop, color: S().playerColor(msg.playerId), t0: Date.now() });
    while (D3.queue.length > 3) D3.queue.shift();
    if (D3.wake) D3.wake();
    run();
    return true;
  };
  // Plano 70: aviso do mestre (antes do resultado). A mensagem do chat que chega depois não rola de novo
  D3.announced = new Set();
  D3.announce = function (m) {
    if (!m || !m.id) return false;
    D3.announced.add(m.id);
    if (D3.announced.size > 200) D3.announced.delete(D3.announced.values().next().value);
    return D3.show(m);
  };

  D3.init = function () {
    S().on((kind, a) => { if (kind === 'chat.add' && a && a.msg && !D3.announced.has(a.msg.id)) D3.show(a.msg); });
    // Plano 70: a biblioteca carrega logo, para o primeiro lance não atrasar
    if (D3.enabled()) setTimeout(() => { ensure().catch((e) => console.warn('dados 3D', e)); }, 300);
  };

  App.Dice3D = D3;
})(window.App);
