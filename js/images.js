'use strict';
import { ImageUrls, joinAsset, setAsset, withImageUrl } from '../src/services/image-assets.ts';
/* Imagens: converte para WebP (redimensionando), deduplica por hash e mantém cache de <img>. */
(function (App) {
  const cache = new Map();
  const urls = new ImageUrls();
  let nextCleanup = 0;

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Não foi possível ler a imagem'));
      im.src = src;
    });
  }

  const canvasImage = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível converter a imagem'));
    }, 'image/webp', quality);
  });

  function toWebP(file, maxSide) {
    return withImageUrl(file, async (url) => {
      const img = await loadImg(url);
      const ow = img.naturalWidth, oh = img.naturalHeight;
      const k = Math.min(1, maxSide / Math.max(ow, oh));
      const w = Math.max(1, Math.round(ow * k)), h = Math.max(1, Math.round(oh * k));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return { blob: await canvasImage(c, 0.8), w, h, ow, oh };
    });
  }

  const I = {
    MAP: 4096,
    TOKEN: 512,
    PROP: 2048, // imagens soltas no mapa
    ART: 1600, // Plano 74: imagem do personagem (a arte do topo da ficha)

    async add(file, maxSide) {
      const r = await toWebP(file, maxSide);
      const id = await I.idOf(r.blob);
      if (!App.Store.assets[id]) {
        setAsset(App.Store.assets, id, r.blob);
        App.Net.sendAsset(id, r.blob);
        App.Storage.autosave();
      }
      App.U.toast(`Imagem convertida: ${r.w}×${r.h} · ${App.U.fmtSize(r.blob.size)}`);
      return { id, w: r.w, h: r.h, ow: r.ow, oh: r.oh };
    },

    // Imagem já pronta (ex.: token recortado da arte): guarda sem converter de novo
    async addBlob(blob) {
      const id = await I.idOf(blob);
      if (!App.Store.assets[id]) {
        setAsset(App.Store.assets, id, blob);
        App.Net.sendAsset(id, blob);
        App.Storage.autosave();
      }
      return { id };
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
      const now = performance.now();
      if (cache.size > 128 && now >= nextCleanup) {
        nextCleanup = now + 5000;
        for (const [key, entry] of cache) if (now - entry.used > 15_000) cache.delete(key);
      }
      let e = cache.get(id);
      if (!e || e.src !== data) {
        const im = new Image();
        im.onload = () => { if (cache.get(id)?.img === im) App.Board.requestRender(); };
        im.src = I.src(id);
        e = { img: im, src: data, used: now };
        cache.set(id, e);
      }
      e.used = now;
      return e.img.complete && e.img.naturalWidth ? e.img : null;
    },
    src(id) { return id ? urls.src(id, App.Store.assets[id]) : null; },
    invalidate(id) { cache.delete(id); urls.delete(id); },
    retain(ids) {
      urls.retain(ids);
      for (const id of cache.keys()) if (!ids.has(id)) cache.delete(id);
    },
    canvasImage,
    idOf: async (asset) => 'img_' + App.U.hash(await joinAsset(asset)),
  };

  I.toWebP = toWebP;
  App.Images = I;
})(window.App);
