'use strict';
/*
 * Persistência: IndexedDB (automático) + exportar/importar arquivo .json ou código de texto.
 * Histórias (Plano 33): várias campanhas no mesmo navegador. 'story:<id>' = {state, assets, savedAt};
 * 'stories' = lista dos cartões [{id, name, cover (imagem do mestre), thumb (mapa da cena, automático), thumbOf, savedAt, scenes}].
 * A chave antiga 'campaign' (uma campanha só) vira a primeira história.
 * Formatos:
 *   mesarpg        -> campanha completa
 *   mesarpg-scene  -> uma cena (com as fichas usadas nela)
 *   mesarpg-actor  -> uma ficha (personagem/monstro)
 */
(function (App) {
  const { U } = App;
  const DB = 'mesarpg', STORE = 'kv', CODE_PREFIX = 'MESARPG1.';
  let dbp = null;

  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  // St.mem (Map) = guardar só na memória (testes: o IndexedDB não responde no Edge sem tela com tempo simulado)
  async function get(key) {
    if (St.mem) return St.mem.get(key);
    const d = await db();
    return new Promise((res, rej) => {
      const rq = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }
  async function del(key) {
    if (St.mem) { St.mem.delete(key); return; }
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  async function set(key, val) {
    if (St.mem) { St.mem.set(key, JSON.parse(JSON.stringify(val === undefined ? null : val))); return; }
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  // Só as imagens realmente usadas (limpa as órfãs)
  function usedAssets(obj) {
    const all = App.Store.assets, out = {};
    const ids = new Set(JSON.stringify(obj).match(/img_[0-9a-f]{16}/g) || []);
    for (const id of ids) if (all[id]) out[id] = all[id];
    return out;
  }

  function bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const s = atob(b64), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  async function pack(str) {
    if (typeof CompressionStream === 'undefined') return 'u' + bytesToB64(new TextEncoder().encode(str));
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    return 'g' + bytesToB64(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  async function unpack(code) {
    const kind = code[0], bytes = b64ToBytes(code.slice(1).replace(/\s+/g, ''));
    if (kind === 'u') return new TextDecoder().decode(bytes);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  const St = {
    lastSaved: null,

    async save() {
      const S = App.Store;
      if (!S.isGM() || !S.state) return;
      try {
        const now = Date.now();
        if (!St.currentId) St.currentId = await St.newId();
        await set('story:' + St.currentId, { state: S.state, assets: usedAssets(S.state), savedAt: now });
        await St.touchCard(St.currentId, S.state, now);
        St.lastSaved = now;
        if (App.UI && App.UI.onSaved) App.UI.onSaved();
      } catch (e) {
        console.error(e);
        U.toast('Erro ao salvar no navegador: ' + e.message, 'error');
      }
    },
    autosave: null,

    // ---------- Histórias (Plano 33) ----------
    currentId: null,
    kv: { get: (k) => get(k), set: (k, v) => set(k, v) }, // leitura e gravação direta (testes)
    async newId() { return 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    // Lista dos cartões, a última mexida primeiro. Na primeira vez, a campanha antiga vira a primeira história.
    async listStories() {
      let list = await get('stories');
      if (!Array.isArray(list)) {
        list = [];
        const old = await get('campaign');
        if (old && old.state) {
          const id = await St.newId();
          await set('story:' + id, old);
          list.push(St.cardOf(id, old.state, old.savedAt || Date.now()));
        }
        await set('stories', list);
        if (list.length) await St.refreshThumb(list[0].id);
        list = (await get('stories')) || list;
      }
      return list.slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    },
    cardOf(id, state, savedAt) {
      return { id, name: (state && state.name) || 'Sem nome', cover: null, thumb: null, thumbOf: null, savedAt: savedAt || Date.now(), scenes: state ? (state.sceneOrder || []).length : 0 };
    },
    async saveCards(fn) {
      const list = (await get('stories')) || [];
      const out = fn(list) || list;
      await set('stories', out);
      return out;
    },
    // Depois de salvar: nome, data, cenas e, se o mapa da cena do grupo mudou, a miniatura automática
    async touchCard(id, state, savedAt) {
      let card = null;
      await St.saveCards((list) => {
        card = list.find((c) => c.id === id);
        if (!card) { card = St.cardOf(id, state, savedAt); list.push(card); }
        Object.assign(card, { name: state.name || card.name, savedAt, scenes: (state.sceneOrder || []).length });
        return list;
      });
      const sc = state.scenes && state.scenes[state.activeSceneId];
      if (sc && sc.bg !== card.thumbOf) St.refreshThumb(id, state, App.Store.assets);
    },
    // Miniatura automática: o mapa da cena do grupo, em 360 px
    async refreshThumb(id, state, assets) {
      try {
        if (!state) { const d = await get('story:' + id); if (!d) return; state = d.state; assets = d.assets || {}; }
        const sc = state.scenes && state.scenes[state.activeSceneId], src = sc && sc.bg && assets && assets[sc.bg];
        const thumb = src ? await St.shrink(src, 360, 220) : null;
        await St.saveCards((list) => { const c = list.find((x) => x.id === id); if (c) { c.thumb = thumb; c.thumbOf = sc ? sc.bg || null : null; } return list; });
        if (App.Stories && App.Stories.onCards) App.Stories.onCards();
      } catch (e) { console.warn('miniatura', e); }
    },
    // Recorta para caber (cover) em w×h e devolve WebP pequeno
    shrink(src, w, h) {
      return new Promise((res) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const k = Math.max(w / im.width, h / im.height), dw = im.width * k, dh = im.height * k;
          c.getContext('2d').drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
          res(c.toDataURL('image/webp', 0.72));
        };
        im.onerror = () => res(null);
        im.src = src;
      });
    },
    async createStory(name, state, assets) {
      const id = await St.newId(), st = state || App.Store.newCampaign();
      st.name = String(name || st.name || 'Nova história').slice(0, 60);
      const now = Date.now();
      await set('story:' + id, { state: st, assets: assets || {}, savedAt: now });
      await St.saveCards((list) => { list.push(St.cardOf(id, st, now)); return list; });
      if (assets && Object.keys(assets).length) await St.refreshThumb(id, st, assets);
      return id;
    },
    async renameStory(id, name) {
      name = String(name || '').trim().slice(0, 60);
      if (!name) return;
      const d = await get('story:' + id);
      if (d && d.state) { d.state.name = name; await set('story:' + id, d); }
      await St.saveCards((list) => { const c = list.find((x) => x.id === id); if (c) c.name = name; return list; });
    },
    // Imagem do cartão escolhida pelo mestre (null = volta para o mapa da cena)
    async setCover(id, dataUrl) {
      const cover = dataUrl ? await St.shrink(dataUrl, 360, 220) : null;
      await St.saveCards((list) => { const c = list.find((x) => x.id === id); if (c) c.cover = cover; return list; });
    },
    async duplicateStory(id) {
      const d = await get('story:' + id), card = ((await get('stories')) || []).find((x) => x.id === id);
      if (!d) return null;
      const nid = await St.newId(), now = Date.now(), st = JSON.parse(JSON.stringify(d.state));
      st.name = (st.name || 'História') + ' (cópia)';
      await set('story:' + nid, { state: st, assets: d.assets || {}, savedAt: now });
      await St.saveCards((list) => { list.push(Object.assign({}, card || St.cardOf(nid, st, now), { id: nid, name: st.name, savedAt: now })); return list; });
      return nid;
    },
    async deleteStory(id) {
      await del('story:' + id);
      await St.saveCards((list) => list.filter((x) => x.id !== id));
    },
    async storyBundle(id) {
      const d = await get('story:' + id);
      return d ? { format: 'mesarpg', version: 1, exportedAt: new Date().toISOString(), state: d.state, assets: d.assets || {} } : null;
    },
    // Com tempo limite: se o IndexedDB travar/estiver bloqueado, a mesa abre mesmo assim
    async load() {
      try {
        return await Promise.race([
          St.currentId ? get('story:' + St.currentId) : Promise.resolve(null),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
        ]);
      } catch (e) {
        console.warn('IndexedDB indisponível:', e);
        St.unavailable = true;
        U.toast('Não consegui acessar o salvamento do navegador. Use Exportar para guardar a campanha.', 'error', 7000);
        return null;
      }
    },

    campaignBundle(includeAssets = true) {
      const st = App.Store.state;
      return { format: 'mesarpg', version: 1, exportedAt: new Date().toISOString(), state: st, assets: includeAssets ? usedAssets(st) : {} };
    },
    sceneBundle(sceneId) {
      const st = App.Store.state, sc = st.scenes[sceneId];
      // Plano 31: a cena principal leva as sub-cenas junto (e os portais entre elas)
      const subs = sc.parent ? [] : st.sceneOrder.filter((id) => st.scenes[id] && st.scenes[id].parent === sceneId).map((id) => st.scenes[id]);
      const actors = {};
      for (const s of [sc].concat(subs)) for (const t of Object.values(s.tokens)) if (t.actorId && st.actors[t.actorId]) actors[t.actorId] = st.actors[t.actorId];
      const obj = { format: 'mesarpg-scene', version: 1, scene: sc, actors };
      if (subs.length) obj.subs = subs;
      obj.assets = usedAssets(obj);
      return obj;
    },
    actorBundle(actorId) {
      const obj = { format: 'mesarpg-actor', version: 1, actor: App.Store.state.actors[actorId] };
      obj.assets = usedAssets(obj);
      return obj;
    },

    downloadJSON(obj, baseName) {
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      U.download(`${U.slug(baseName) || 'mesa'}_${stamp}.json`, JSON.stringify(obj));
    },
    async toCode(obj) { return CODE_PREFIX + (await pack(JSON.stringify(obj))); },

    async parse(text) {
      text = String(text || '').trim();
      if (!text) throw new Error('Nada para importar');
      let obj;
      try { obj = text.startsWith(CODE_PREFIX) ? JSON.parse(await unpack(text.slice(CODE_PREFIX.length))) : JSON.parse(text); }
      catch { throw new Error('Arquivo ou código inválido/corrompido'); }
      if (!obj || typeof obj.format !== 'string' || !obj.format.startsWith('mesarpg')) throw new Error('Formato não reconhecido');
      return obj;
    },
  };
  St.autosave = U.debounce(() => St.save(), 800);

  App.Storage = St;
})(window.App);
