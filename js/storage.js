'use strict';
/*
 * Persistência: IndexedDB (automático) + exportar/importar arquivo .json ou código de texto.
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
  async function get(key) {
    const d = await db();
    return new Promise((res, rej) => {
      const rq = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }
  async function set(key, val) {
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
        await set('campaign', { state: S.state, assets: usedAssets(S.state), savedAt: Date.now() });
        St.lastSaved = Date.now();
        if (App.UI && App.UI.onSaved) App.UI.onSaved();
      } catch (e) {
        console.error(e);
        U.toast('Erro ao salvar no navegador: ' + e.message, 'error');
      }
    },
    autosave: null,
    // Com tempo limite: se o IndexedDB travar/estiver bloqueado, a mesa abre mesmo assim
    async load() {
      try {
        return await Promise.race([
          get('campaign'),
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
      const actors = {};
      for (const t of Object.values(sc.tokens)) if (t.actorId && st.actors[t.actorId]) actors[t.actorId] = st.actors[t.actorId];
      const obj = { format: 'mesarpg-scene', version: 1, scene: sc, actors };
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
