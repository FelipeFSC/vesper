'use strict';
/* Imagens: converte para WebP (redimensionando), deduplica por hash e mantém cache de <img>. */
(function (App) {
  const cache = new Map();

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Não foi possível ler a imagem'));
      im.src = src;
    });
  }

  async function toWebP(file, maxSide) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      const ow = img.naturalWidth, oh = img.naturalHeight;
      const k = Math.min(1, maxSide / Math.max(ow, oh));
      const w = Math.max(1, Math.round(ow * k)), h = Math.max(1, Math.round(oh * k));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      let data = c.toDataURL('image/webp', 0.8);
      if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/png'); // navegador sem WebP
      return { data, w, h, ow, oh };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const I = {
    MAP: 4096,
    TOKEN: 512,

    async add(file, maxSide) {
      const r = await toWebP(file, maxSide);
      const id = 'img_' + App.U.hash(r.data);
      if (!App.Store.assets[id]) {
        App.Store.assets[id] = r.data;
        App.Net.sendAsset(id, r.data);
        App.Storage.autosave();
      }
      App.U.toast(`Imagem convertida: ${r.w}×${r.h} · ${App.U.fmtSize(r.data.length * 0.75)}`);
      return { id, w: r.w, h: r.h, ow: r.ow, oh: r.oh };
    },

    async pick(maxSide) {
      const f = await App.U.pickFile('image/*');
      if (!f) return null;
      try { return await I.add(f, maxSide); }
      catch (e) { App.U.toast(e.message, 'error'); return null; }
    },

    // Retorna o <img> pronto (ou null enquanto carrega)
    get(id) {
      if (!id) return null;
      const data = App.Store.assets[id];
      if (!data) return null;
      let e = cache.get(id);
      if (!e || e.src !== data) {
        const im = new Image();
        im.onload = () => App.Board.requestRender();
        im.src = data;
        e = { img: im, src: data };
        cache.set(id, e);
      }
      return e.img.complete && e.img.naturalWidth ? e.img : null;
    },
    src(id) { return (id && App.Store.assets[id]) || null; },
    invalidate(id) { cache.delete(id); },
  };

  I.toWebP = toWebP;
  App.Images = I;
})(window.App);
