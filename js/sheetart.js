'use strict';
/*
 * Imagem do personagem (Plano 74). Usado pela ficha da mesa (genérica e 5e) e pela página "Criar ficha".
 * - decorate(el, opts): a arte ao fundo do topo da ficha, sumindo no escuro; botão para trocar; soltar arquivo.
 * - crop(src, crop): janela para escolher onde o círculo do token pega na arte. Devolve o recorte ou null.
 * - cropBlob(src, crop): o token recortado (512×512, WebP), para virar a imagem do token.
 * Recorte = { x, y } centro (0…1 da largura e da altura) e s = lado do quadrado (0…1 do lado menor da imagem).
 * Não depende de Store nem de UI: quem chama guarda as imagens do seu jeito.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const ic = (n) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n); return t.content.firstChild; };
  const SA = {};
  const TOKEN = 512;

  const load = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Não foi possível ler a imagem'));
    im.src = src;
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Mantém o quadrado do recorte dentro da imagem
  function fit(c, w, hh) {
    const m = Math.min(w, hh), s = clamp(Number(c.s) || 0.6, 0.12, 1), side = s * m;
    const hx = side / 2 / w, hy = side / 2 / hh;
    return { x: clamp(Number(c.x) || 0.5, hx, 1 - hx), y: clamp(Number(c.y) || 0.5, hy, 1 - hy), s };
  }
  // Recorte padrão: retrato em pé = rosto no terço de cima; deitado ou quadrado = centro
  SA.defaultCrop = (w, hh) => fit(hh > w * 1.15 ? { x: 0.5, y: 0.3, s: 0.62 } : { x: 0.5, y: 0.5, s: 0.7 }, w, hh);
  SA.defaultCropOf = async (src) => { const im = await load(src); return SA.defaultCrop(im.naturalWidth, im.naturalHeight); };

  SA.cropBlob = async function (src, crop) {
    const im = await load(src), w = im.naturalWidth, hh = im.naturalHeight;
    const c = fit(crop || SA.defaultCrop(w, hh), w, hh), side = c.s * Math.min(w, hh);
    const cv = document.createElement('canvas');
    cv.width = cv.height = TOKEN;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, c.x * w - side / 2, c.y * hh - side / 2, side, side, 0, 0, TOKEN, TOKEN);
    const blob = await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Não foi possível criar o token'))), 'image/webp', 0.85));
    return { blob, crop: c };
  };

  // Janela de recorte: arrastar o círculo, mudar o tamanho (barra ou roda do mouse), prévia redonda
  SA.crop = function (src, start) {
    return new Promise((resolve) => {
      load(src).then((im) => {
        const w = im.naturalWidth, hh = im.naturalHeight, m = Math.min(w, hh);
        let c = fit(start || SA.defaultCrop(w, hh), w, hh);
        const MAXW = Math.min(520, window.innerWidth - 80), MAXH = Math.min(440, window.innerHeight - 260);
        const k = Math.min(MAXW / w, MAXH / hh), vw = Math.round(w * k), vh = Math.round(hh * k);
        const ring = h('div', { class: 'sa-ring' });
        const stage = h('div', { class: 'sa-stage', style: { width: vw + 'px', height: vh + 'px' } }, h('img', { src, alt: '', draggable: 'false' }), ring);
        const prev = h('canvas', { class: 'sa-prev', width: 120, height: 120 });
        const range = h('input', { type: 'range', min: 12, max: 100, step: 1, value: Math.round(c.s * 100), 'aria-label': 'Tamanho do recorte' });
        const draw = () => {
          const side = c.s * m * k;
          Object.assign(ring.style, { width: side + 'px', height: side + 'px', left: c.x * vw - side / 2 + 'px', top: c.y * hh * k - side / 2 + 'px' });
          const ctx = prev.getContext('2d'), sd = c.s * m;
          ctx.clearRect(0, 0, 120, 120);
          ctx.save(); ctx.beginPath(); ctx.arc(60, 60, 60, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(im, c.x * w - sd / 2, c.y * hh - sd / 2, sd, sd, 0, 0, 120, 120);
          ctx.restore();
          range.value = Math.round(c.s * 100);
        };
        const set = (n) => { c = fit(Object.assign({}, c, n), w, hh); draw(); };
        range.oninput = () => set({ s: Number(range.value) / 100 });
        stage.addEventListener('wheel', (e) => { e.preventDefault(); set({ s: c.s * (e.deltaY > 0 ? 1.06 : 1 / 1.06) }); }, { passive: false });
        stage.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const r = stage.getBoundingClientRect();
          const to = (ev) => set({ x: (ev.clientX - r.left) / vw, y: (ev.clientY - r.top) / vh });
          to(e);
          const up = () => { window.removeEventListener('pointermove', to); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', to);
          window.addEventListener('pointerup', up);
        });
        const back = h('div', { class: 'modal-back sa-back' });
        const done = (v) => { back.remove(); window.removeEventListener('keydown', key, true); resolve(v); };
        const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } if (e.key === 'Enter') { e.stopPropagation(); done(c); } };
        window.addEventListener('keydown', key, true);
        back.addEventListener('pointerdown', (e) => { if (e.target === back) done(null); });
        back.append(h('div', { class: 'modal sa-crop', role: 'dialog', 'aria-label': 'Recortar o token' },
          h('div', { class: 'win-head' }, ic('crop'), h('span', { class: 'win-title' }, 'Token a partir da imagem do personagem'), h('button', { class: 'icon-btn', title: 'Fechar', onclick: () => done(null) }, ic('x'))),
          h('div', { class: 'win-body' },
            h('p', { class: 'hint', style: { marginTop: 0 } }, 'Arraste para escolher onde o círculo pega. A roda do mouse ou a barra mudam o tamanho.'),
            h('div', { class: 'sa-row' }, stage, h('div', { class: 'sa-side' }, prev, h('span', { class: 'muted small-text' }, 'Como fica no mapa'))),
            h('label', { class: 'sa-size' }, ic('zoom-in'), range),
            h('div', { class: 'row sa-btns' }, h('span', { class: 'grow' }),
              h('button', { class: 'btn', onclick: () => done(null) }, 'Cancelar'),
              h('button', { class: 'btn primary', 'data-sa': 'ok', onclick: () => done(c) }, ic('check'), 'Usar este recorte')))));
        document.body.append(back);
        draw();
      }).catch((e) => { U.toast(e.message, 'error'); resolve(null); });
    });
  };

  /*
   * Topo da ficha com a arte ao fundo. opts = { src, can, onPick(), onFile(file) }.
   * Sem arte e sem poder editar: não muda nada.
   */
  SA.decorate = function (el, opts = {}) {
    if (!el) return el;
    if (opts.src) {
      el.classList.add('sa-top');
      el.prepend(h('div', { class: 'sa-bg', 'aria-hidden': 'true', style: { backgroundImage: 'url("' + opts.src + '")', backgroundPosition: 'center ' + (opts.y != null ? opts.y : 12) + '%' } }));
    }
    if (opts.can && opts.onPick) {
      el.classList.add('sa-can');
      el.append(h('button', { class: 'icon-btn sa-pick', 'data-sa': 'pick', title: opts.src ? 'Trocar a imagem do personagem (ou solte um arquivo aqui)' : 'Pôr uma imagem do personagem (ou solte um arquivo aqui)', onclick: opts.onPick }, ic('image')));
    }
    if (opts.can && opts.onFile) {
      el.addEventListener('dragover', (e) => { if ([...(e.dataTransfer && e.dataTransfer.items) || []].some((x) => x.kind === 'file')) { e.preventDefault(); el.classList.add('sa-drop'); } });
      el.addEventListener('dragleave', () => el.classList.remove('sa-drop'));
      el.addEventListener('drop', (e) => {
        el.classList.remove('sa-drop');
        const f = [...((e.dataTransfer && e.dataTransfer.files) || [])].find((x) => /^image\//.test(x.type));
        if (!f) return;
        e.preventDefault();
        opts.onFile(f);
      });
    }
    return el;
  };

  App.SheetArt = SA;
})(window.App);
