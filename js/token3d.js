'use strict';
/*
 * Montar token 3D (Plano 76). O personagem (PNG sem fundo) sai por cima da moldura.
 * Camadas: fundo no círculo → personagem dentro do círculo → moldura → personagem de novo, só da metade para cima
 * (com a passagem suave perto do meio) e com sombra. Resultado: WebP 512×640 com transparência; o círculo ocupa os
 * 512×512 de baixo (o quadrado do mapa) e o que sai da moldura usa a sobra de cima.
 * Não depende de Store: quem chama diz de onde vêm as imagens (srcOf) e como guardar um arquivo novo (storeFile).
 * Estado (a.token3d): { cutout, x, y, s, bg: 'art'|'color'|'image', bgColor, bgImage, frame, frameW, frameColor }.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const ic = (n) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n); return t.content.firstChild; };
  const T = {};
  const W = 512, H = 640, R = 250, CX = 256, CY = H - 256;
  T.SIZE = { w: W, h: H };
  const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Não foi possível ler a imagem')); im.src = src; });

  // ---------- Molduras (desenhadas aqui, sem imagem pronta) ----------
  T.FRAMES = [['stone', 'Pedra'], ['gold', 'Ouro'], ['silver', 'Prata'], ['wood', 'Madeira'], ['red', 'Vermelho'], ['white', 'Branco'], ['none', 'Sem moldura']];
  T.WIDTHS = [['thin', 'Fina', 0.055], ['medium', 'Média', 0.085], ['thick', 'Grossa', 0.12]];
  const STYLE = {
    stone: { mid: '#85847f', light: '#cfccc4', dark: '#33322f', speck: true },
    gold: { mid: '#c89a3e', light: '#f8df92', dark: '#5e400f' },
    silver: { mid: '#a9adb6', light: '#f3f5f8', dark: '#474b53' },
    wood: { mid: '#7a5230', light: '#b0804f', dark: '#33200f', grain: true },
    // Plano 77 (corrigido): Vermelho e Branco usam as imagens enviadas pelo usuário, sem redesenhar.
    // c = centro do aro na imagem, r = raio de fora, ri = raio de dentro (medidos em pixels na imagem 256×256).
    red: { img: new URL('../imagens/molduras/vermelho.png', import.meta.url).href, c: [126.5, 125.75], r: 124.5, ri: 105.5 },
    white: { img: new URL('../imagens/molduras/branco.png', import.meta.url).href, c: [127.5, 127.5], r: 127, ri: 113.75, multiply: true },
  };
  // Texturas das molduras com imagem: carregadas uma vez; T.ready espera todas
  const TEX = {};
  T.ready = Promise.all(Object.entries(STYLE).filter(([, S]) => S.img).map(([k, S]) => load(S.img).then((im) => {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    TEX[k] = { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data, rings: {} };
  }).catch(() => {})));
  /*
   * Aro da imagem levado para o aro do token: cada ponto do aro do token pega o ponto da imagem no mesmo ângulo e na
   * mesma fração da largura (de dentro para fora). Assim o desenho é o da imagem, em qualquer largura (Fina/Média/Grossa).
   */
  function ringFromTexture(k, S, fw) {
    const tx = TEX[k]; if (!tx) return null;
    const key = fw.toFixed(2); if (tx.rings[key]) return tx.rings[key];
    const ri = R - fw, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), out = x.createImageData(2 * R + 4, 2 * R + 4), od = out.data, ox = CX - R - 2, oy = CY - R - 2;
    const sample = (sx, sy, ch) => {
      const x0 = Math.max(0, Math.min(tx.w - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(tx.h - 2, Math.floor(sy))), fx = sx - x0, fy = sy - y0;
      const p = (xx, yy) => tx.d[(yy * tx.w + xx) * 4 + ch];
      return (p(x0, y0) * (1 - fx) + p(x0 + 1, y0) * fx) * (1 - fy) + (p(x0, y0 + 1) * (1 - fx) + p(x0 + 1, y0 + 1) * fx) * fy;
    };
    for (let py = 0; py < out.height; py++) for (let px = 0; px < out.width; px++) {
      const dx = ox + px + 0.5 - CX, dy = oy + py + 0.5 - CY, d = Math.hypot(dx, dy);
      const cov = Math.max(0, Math.min(1, R - d + 0.5)) * Math.max(0, Math.min(1, d - ri + 0.5)); // borda suave
      if (cov <= 0) continue;
      const t = Math.max(0, Math.min(1, (d - ri) / fw)), sd = S.ri + t * (S.r - S.ri);
      const sx = S.c[0] + (dx / (d || 1)) * sd - 0.5, sy = S.c[1] + (dy / (d || 1)) * sd - 0.5, i = (py * out.width + px) * 4;
      od[i] = sample(sx, sy, 0); od[i + 1] = sample(sx, sy, 1); od[i + 2] = sample(sx, sy, 2); od[i + 3] = 255 * cov;
    }
    x.putImageData(out, ox, oy);
    return (tx.rings[key] = c);
  }
  // Aleatório com semente: a mesma moldura sai sempre igual
  const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function frameWidth(st) { return R * 2 * ((T.WIDTHS.find((x) => x[0] === st.frameW) || T.WIDTHS[1])[2]); }
  function drawFrame(ctx, st) {
    const S = STYLE[st.frame];
    if (!S) return;
    const fw = frameWidth(st), ri = R - fw;
    if (S.img) {
      // Moldura da imagem: só a textura, sem relevo nem luz por cima (o desenho é o da imagem)
      const tex = ringFromTexture(st.frame, S, fw);
      if (!tex) return;
      if (!st.frameColor) { ctx.drawImage(tex, 0, 0); return; }
      const t = document.createElement('canvas'); t.width = W; t.height = H;
      const x = t.getContext('2d'); x.drawImage(tex, 0, 0);
      // Branco: multiplica (o branco vira a cor escolhida e o cinza do brilho vira a mesma cor mais escura).
      // Vermelho: tinge como os outros estilos.
      x.globalCompositeOperation = S.multiply ? 'multiply' : 'color'; x.globalAlpha = S.multiply ? 1 : 0.75;
      x.fillStyle = st.frameColor; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(tex, 0, 0);
      ctx.drawImage(t, 0, 0); return;
    }
    const ring = () => { ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.arc(CX, CY, ri, 0, Math.PI * 2, true); };
    ctx.save();
    ring(); ctx.clip();
    // Relevo: escuro nas bordas, claro no meio do aro
    const g = ctx.createRadialGradient(CX, CY, ri, CX, CY, R);
    g.addColorStop(0, S.dark); g.addColorStop(0.18, S.mid); g.addColorStop(0.5, S.light); g.addColorStop(0.82, S.mid); g.addColorStop(1, S.dark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rnd = rng(st.frame.length * 7919 + 13);
    if (S.speck) for (let i = 0; i < 900; i++) {
      const a = rnd() * Math.PI * 2, d = ri + rnd() * fw, r0 = 0.6 + rnd() * 2.2;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.14)';
      ctx.beginPath(); ctx.arc(CX + Math.cos(a) * d, CY + Math.sin(a) * d, r0, 0, Math.PI * 2); ctx.fill();
    }
    if (S.grain) for (let i = 0; i < 26; i++) {
      const d = ri + rnd() * fw, a0 = rnd() * Math.PI * 2;
      ctx.strokeStyle = rnd() < 0.6 ? 'rgba(30,15,5,.35)' : 'rgba(255,220,170,.12)'; ctx.lineWidth = 0.8 + rnd() * 1.6;
      ctx.beginPath(); ctx.arc(CX, CY, d, a0, a0 + 1 + rnd() * 3); ctx.stroke();
    }
    // Cor escolhida: tinge a moldura mantendo o relevo
    if (st.frameColor) { ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = 0.75; ctx.fillStyle = st.frameColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    // Luz de cima à esquerda
    const l = ctx.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
    l.addColorStop(0, 'rgba(255,255,255,.28)'); l.addColorStop(0.5, 'rgba(255,255,255,0)'); l.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = l; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // Linhas finas nas duas bordas
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.arc(CX, CY, R - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, ri, 0, Math.PI * 2); ctx.stroke();
  }
  const innerR = (st) => (STYLE[st.frame] ? R - frameWidth(st) : R);

  // Desenha a imagem cobrindo a caixa (sem esticar)
  function cover(ctx, im, x, y, w, hh, fy = 0.3) {
    const k = Math.max(w / im.naturalWidth, hh / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    ctx.drawImage(im, x + (w - dw) / 2, y + (hh - dh) * fy, dw, dh);
  }
  function cutoutRect(st, im) {
    const dw = st.s * 2 * R, dh = dw * (im.naturalHeight / im.naturalWidth);
    return { x: CX + st.x * R - dw / 2, y: CY + st.y * R - dh / 2, w: dw, h: dh };
  }
  // Onde fica o personagem ao abrir: largura do círculo, com o pé perto da borda de baixo
  T.defaultPlace = (im) => { const s = 1, dh = s * 2 * R * (im.naturalHeight / im.naturalWidth); return { x: 0, y: (R * 0.96 - dh / 2) / R, s }; };

  // Monta o token num canvas W×H. imgs = { cutout, bg } (HTMLImage já carregadas)
  T.compose = function (st, imgs) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    const ri = innerR(st);
    // 1) fundo no círculo
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, ri + 1, 0, Math.PI * 2); ctx.clip();
    if ((st.bg === 'art' || st.bg === 'image') && imgs.bg) { cover(ctx, imgs.bg, CX - ri, CY - ri, ri * 2, ri * 2); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, W, H); }
    else {
      const col = U.safeColor(st.bgColor, '#3b2a5a'), g = ctx.createRadialGradient(CX, CY - ri * 0.3, ri * 0.1, CX, CY, ri);
      g.addColorStop(0, U.hexA ? U.hexA(col, 1) : col); g.addColorStop(1, '#0d0b12');
      ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.85; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    // 2) personagem dentro do círculo
    const rc = imgs.cutout ? cutoutRect(st, imgs.cutout) : null;
    if (rc) ctx.drawImage(imgs.cutout, rc.x, rc.y, rc.w, rc.h);
    // sombra de dentro da moldura (profundidade)
    const sh = ctx.createRadialGradient(CX, CY, ri * 0.78, CX, CY, ri);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // 3) moldura
    drawFrame(ctx, st);
    // 4) personagem por cima da moldura, só na fatia escolhida no relógio (Plano 77; padrão 9h às 3h), com sombra
    if (rc) {
      const top = document.createElement('canvas'); top.width = W; top.height = H;
      const t = top.getContext('2d'); t.imageSmoothingQuality = 'high';
      t.drawImage(imgs.cutout, rc.x, rc.y, rc.w, rc.h);
      t.globalCompositeOperation = 'destination-in';
      t.fillStyle = sliceMask(t, st); t.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
      ctx.drawImage(top, 0, 0);
      ctx.restore();
    }
    return c;
  };
  /*
   * Plano 77: a fatia do relógio. popFrom → popTo em horas (0–12), no sentido do relógio; iguais = a volta inteira.
   * As pontas têm uma passagem suave de FEATHER horas, para não aparecer um corte reto na moldura.
   */
  const FEATHER = 0.25;
  T.span = (st) => { const a = Number(st.popFrom ?? 9), b = Number(st.popTo ?? 3), l = (((b - a) % 12) + 12) % 12; return { from: a, len: l || 12 }; };
  function sliceMask(t, st) {
    const { from, len } = T.span(st);
    if (len >= 12) return 'rgba(0,0,0,1)';
    const start = (from / 12) * Math.PI * 2 - Math.PI / 2, f = Math.min(FEATHER, len / 3) / 12, sl = len / 12;
    const g = t.createConicGradient(start, CX, CY);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, 'rgba(0,0,0,1)'); g.addColorStop(sl - f, 'rgba(0,0,0,1)'); g.addColorStop(sl, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  }
  // "9h", "9h30"
  T.hourLabel = (x) => { const v = ((Number(x) % 12) + 12) % 12 || 12, hh = Math.floor(v), m = Math.round((v - hh) * 60); return hh + 'h' + (m ? String(m).padStart(2, '0') : ''); };
  T.toBlob = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Não foi possível criar o token'))), 'image/webp', 0.9));

  // A imagem tem fundo transparente? (mais de 4% de pixels quase transparentes)
  T.hasAlpha = function (im) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 16) n++;
    return n / (64 * 64) > 0.04;
  };

  /*
   * Janela "Montar token 3D". opts = { state, artId, srcOf(id), storeFile(file) → id }.
   * Devolve { blob, state } ou null (cancelou).
   */
  T.open = function (opts) {
    return new Promise((resolve) => {
      const imgs = new Map();
      const imgOf = async (id) => { if (!id) return null; if (!imgs.has(id)) imgs.set(id, await load(opts.srcOf(id))); return imgs.get(id); };
      const st = Object.assign({ cutout: null, x: 0, y: 0, s: 1, bg: opts.artId ? 'art' : 'color', bgColor: '#3b2a5a', bgImage: null, frame: 'stone', frameW: 'medium', frameColor: null, popFrom: 9, popTo: 3 }, opts.state || {});
      if (st.bg === 'art' && !opts.artId) st.bg = 'color';
      const back = h('div', { class: 'modal-back t3-back' });
      const prev = h('canvas', { class: 't3-prev', width: W, height: H });
      const stage = h('div', { class: 't3-stage', title: 'Arraste para mover o personagem; a roda do mouse muda o tamanho' }, h('div', { class: 't3-cell' }), prev);
      const side = h('div', { class: 't3-side' });
      let artAlpha = false;
      const done = (v) => { back.remove(); window.removeEventListener('keydown', key, true); resolve(v); };
      const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
      window.addEventListener('keydown', key, true);
      back.addEventListener('pointerdown', (e) => { if (e.target === back) done(null); });

      async function paint() {
        try {
          const cut = await imgOf(st.cutout), bg = st.bg === 'art' ? await imgOf(opts.artId) : st.bg === 'image' ? await imgOf(st.bgImage) : null;
          await T.ready;
          const c = T.compose(st, { cutout: cut, bg });
          const x = prev.getContext('2d'); x.clearRect(0, 0, W, H); x.drawImage(c, 0, 0);
        } catch (e) { U.toast(e.message, 'error'); }
      }
      async function setCutout(id) {
        const im = await imgOf(id);
        st.cutout = id;
        Object.assign(st, T.defaultPlace(im));
        if (!T.hasAlpha(im)) U.toast('Esta imagem tem fundo. O efeito precisa do personagem sem fundo (PNG transparente): sem isso, ele não sai da moldura.', 'info', 7000);
        build(); paint();
      }
      const pickFile = async () => { const f = await U.pickFile('image/*'); return f ? opts.storeFile(f) : null; };
      const seg = (cur, list, onPick) => h('div', { class: 'seg' }, list.map(([k, l]) => h('button', { class: cur === k ? 'on' : '', 'data-t3': k, onclick: () => onPick(k) }, l)));
      function build() {
        side.innerHTML = '';
        const sizeIn = h('input', { type: 'range', min: 30, max: 200, step: 1, value: Math.round(st.s * 100), disabled: !st.cutout, 'data-t3': 'size', oninput: (e) => { st.s = Number(e.target.value) / 100; paint(); } });
        side.append(...[
          h('h4', {}, 'Personagem (sem fundo)'),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn small' + (st.cutout ? '' : ' primary'), 'data-t3': 'cutout', onclick: async () => { const id = await pickFile(); if (id) setCutout(id); } }, ic('upload'), st.cutout ? 'Trocar' : 'Enviar PNG sem fundo'),
            opts.artId && artAlpha && st.cutout !== opts.artId ? h('button', { class: 'btn small', 'data-t3': 'use-art', onclick: () => setCutout(opts.artId) }, ic('image'), 'Usar a imagem do personagem') : null),
          st.cutout ? h('label', { class: 't3-size' }, ic('zoom-in'), sizeIn) : h('p', { class: 'hint' }, 'O personagem precisa estar sem fundo (PNG transparente) para sair por cima da moldura.'),
          h('h4', {}, 'Por onde sai da moldura'),
          clockBox(),
          h('h4', {}, 'Fundo do círculo'),
          seg(st.bg, [opts.artId ? ['art', 'Imagem do personagem'] : null, ['color', 'Cor'], ['image', 'Outra imagem']].filter(Boolean), async (k) => {
            if (k === 'image' && !st.bgImage) { const id = await pickFile(); if (!id) return; st.bgImage = id; }
            st.bg = k; build(); paint();
          }),
          st.bg === 'color' ? h('label', { class: 'row t3-color' }, 'Cor', h('input', { type: 'color', value: st.bgColor, 'data-t3': 'bg-color', oninput: (e) => { st.bgColor = e.target.value; paint(); } })) : null,
          st.bg === 'image' ? h('button', { class: 'btn small', onclick: async () => { const id = await pickFile(); if (id) { st.bgImage = id; paint(); } } }, ic('image'), 'Trocar a imagem do fundo') : null,
          h('h4', {}, 'Moldura'),
          seg(st.frame, T.FRAMES, (k) => { st.frame = k; build(); paint(); }),
          st.frame !== 'none' ? seg(st.frameW, T.WIDTHS.map(([k, l]) => [k, l]), (k) => { st.frameW = k; build(); paint(); }) : null,
          st.frame !== 'none' ? h('label', { class: 'row t3-color' }, 'Cor',
            h('input', { type: 'color', value: st.frameColor || '#9a9890', 'data-t3': 'frame-color', oninput: (e) => { st.frameColor = e.target.value; paint(); } }),
            st.frameColor ? h('button', { class: 'btn small ghost', onclick: () => { st.frameColor = null; build(); paint(); } }, 'Cor do estilo') : null) : null].filter(Boolean)); // sem os vazios (null viraria texto)
      }
      /*
       * Plano 77: relógio. O arco aceso é a parte da moldura por onde o personagem sai; as duas bolinhas abrem e fecham
       * (de meia em meia hora). Atalhos para os casos mais comuns.
       */
      const NS = 'http://www.w3.org/2000/svg', CR = 44, C0 = 55;
      const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); return e; };
      const pt = (hour, r) => { const a = (hour / 12) * Math.PI * 2 - Math.PI / 2; return [C0 + Math.cos(a) * r, C0 + Math.sin(a) * r]; };
      function clockBox() {
        const dial = svg('svg', { viewBox: '0 0 110 110', width: 110, height: 110, class: 't3-clock', 'data-t3': 'clock' });
        dial.append(svg('circle', { cx: C0, cy: C0, r: CR, class: 't3-clock-ring' }));
        for (const [hh, tx] of [[12, '12'], [3, '3'], [6, '6'], [9, '9']]) { const [x, y] = pt(hh, CR - 13); const t = svg('text', { x, y: y + 3.5, class: 't3-clock-num' }); t.textContent = tx; dial.append(t); }
        const arc = svg('path', { class: 't3-clock-arc' }), hA = svg('circle', { r: 6, class: 't3-clock-h', 'data-t3': 'from' }), hB = svg('circle', { r: 6, class: 't3-clock-h', 'data-t3': 'to' });
        dial.append(arc, hA, hB);
        const label = h('span', { class: 't3-clock-txt', 'data-t3': 'clock-txt' });
        const draw = () => {
          const { from, len } = T.span(st), [ax, ay] = pt(from, CR), [bx, by] = pt(from + len, CR);
          arc.setAttribute('d', len >= 12 ? 'M ' + (C0 - CR) + ' ' + C0 + ' a ' + CR + ' ' + CR + ' 0 1 1 ' + 2 * CR + ' 0 a ' + CR + ' ' + CR + ' 0 1 1 ' + -2 * CR + ' 0'
            : 'M ' + ax + ' ' + ay + ' A ' + CR + ' ' + CR + ' 0 ' + (len > 6 ? 1 : 0) + ' 1 ' + bx + ' ' + by);
          hA.setAttribute('cx', ax); hA.setAttribute('cy', ay); hB.setAttribute('cx', bx); hB.setAttribute('cy', by);
          label.textContent = len >= 12 ? 'A volta inteira' : 'Das ' + T.hourLabel(st.popFrom) + ' às ' + T.hourLabel(st.popTo);
        };
        const grab = (which) => (e) => {
          e.preventDefault(); e.stopPropagation();
          const mv = (ev) => {
            const r = dial.getBoundingClientRect(), x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2);
            let hour = ((Math.atan2(y, x) + Math.PI / 2) / (Math.PI * 2)) * 12;
            hour = (Math.round(((hour % 12) + 12) % 12 * 2) / 2) % 12;
            st[which] = hour; draw(); paint();
          };
          const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
        };
        hA.addEventListener('pointerdown', grab('popFrom')); hB.addEventListener('pointerdown', grab('popTo'));
        draw();
        const preset = (a, b, l) => h('button', { class: 'btn small ghost', 'data-t3': 'pop-' + a + '-' + b, onclick: () => { st.popFrom = a; st.popTo = b; draw(); paint(); } }, l);
        return h('div', { class: 't3-clock-box' }, dial,
          h('div', { class: 't3-clock-side' }, label,
            h('div', { class: 'row wrap' }, preset(9, 3, 'Metade de cima'), preset(10, 2, 'Só o alto'), preset(7, 5, 'Quase tudo')),
            h('span', { class: 'muted small-text' }, 'Arraste as bolinhas para abrir ou fechar a borda.')));
      }
      // Arrastar move o personagem; roda do mouse muda o tamanho
      prev.addEventListener('pointerdown', (e) => {
        if (!st.cutout) return;
        e.preventDefault();
        const r = prev.getBoundingClientRect(), k = W / r.width, sx = e.clientX, sy = e.clientY, ox = st.x, oy = st.y;
        const mv = (ev) => { st.x = ox + ((ev.clientX - sx) * k) / R; st.y = oy + ((ev.clientY - sy) * k) / R; paint(); };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      prev.addEventListener('wheel', (e) => {
        if (!st.cutout) return;
        e.preventDefault(); st.s = Math.max(0.3, Math.min(2, st.s * (e.deltaY > 0 ? 1 / 1.05 : 1.05)));
        const sz = side.querySelector('[data-t3="size"]'); if (sz) sz.value = Math.round(st.s * 100);
        paint();
      }, { passive: false });
      const ok = async () => {
        if (!st.cutout) { U.toast('Envie primeiro o personagem sem fundo.', 'info'); return; }
        try {
          const cut = await imgOf(st.cutout), bg = st.bg === 'art' ? await imgOf(opts.artId) : st.bg === 'image' ? await imgOf(st.bgImage) : null;
          await T.ready;
          done({ blob: await T.toBlob(T.compose(st, { cutout: cut, bg })), state: Object.assign({}, st) });
        } catch (e) { U.toast(e.message, 'error'); }
      };
      back.append(h('div', { class: 'modal t3-modal', role: 'dialog', 'aria-label': 'Montar token 3D' },
        h('div', { class: 'win-head' }, ic('layers'), h('span', { class: 'win-title' }, 'Montar token 3D'), h('button', { class: 'icon-btn', title: 'Fechar', onclick: () => done(null) }, ic('x'))),
        h('div', { class: 'win-body' },
          h('div', { class: 't3-row' }, h('div', { class: 't3-left' }, stage, h('span', { class: 'muted small-text' }, 'O tracejado é o quadrado do mapa: o que passa dele sai por cima.')), side),
          h('div', { class: 'row t3-btns' }, h('span', { class: 'grow' }),
            h('button', { class: 'btn', onclick: () => done(null) }, 'Cancelar'),
            h('button', { class: 'btn primary', 'data-t3': 'ok', onclick: ok }, ic('check'), 'Usar este token')))));
      document.body.append(back);
      (async () => {
        if (opts.artId) { try { artAlpha = T.hasAlpha(await imgOf(opts.artId)); } catch { artAlpha = false; } }
        if (!st.cutout && artAlpha) { await setCutout(opts.artId); return; }
        build(); paint();
      })();
    });
  };

  App.Token3D = T;
})(window.App);
