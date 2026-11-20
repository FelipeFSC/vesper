'use strict';
/*
 * Leitura dos cadastros (Planos 42–50) para a ficha de D&D 5e (Plano 51), sem desenhar a página de cadastros.
 * - Padrões: data/cadastros/<cadastro>.json (ou o .js de mesmo nome, quando a página abre direto do arquivo).
 * - Mudanças locais: IndexedDB 'mesarpg', chave 'cadastros' = { <cadastro>: { custom, edited, deleted } } (as mesmas regras de cadastros.js).
 * Cada cadastro só carrega quando a ficha precisa dele (os itens têm 4 MB).
 * A ficha guarda uma cópia do que usa (dado de vida, espaços, dados da arma…), então funciona sem os cadastros abertos.
 */
(function (App) {
  const D = { lists: {}, byId: {}, sources: {} };
  App.Dados5e = D;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  function script(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('não achei ' + src)); document.head.append(s); });
  }
  let localP = null;
  function local() {
    // Se o banco não responder (já aconteceu no Edge sem tela), segue só com os padrões
    if (!localP) localP = new Promise((res) => {
      setTimeout(() => res({}), 3000);
      try {
        const r = indexedDB.open('mesarpg', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => {
          try {
            const q = r.result.transaction('kv', 'readonly').objectStore('kv').get('cadastros');
            q.onsuccess = () => res(q.result || {});
            q.onerror = () => res({});
          } catch { res({}); }
        };
        r.onerror = () => res({});
      } catch { res({}); }
    });
    return localP;
  }
  async function defaults(tab) {
    let data = null;
    try { const r = await fetch('data/cadastros/' + tab + '.json', { cache: 'no-cache' }); if (r.ok) data = await r.json(); } catch { /* sem servidor: usa o .js */ }
    if (!data) {
      try { await script('data/cadastros/' + tab + '.js'); data = (window.VesperCadastros || {})[tab] || null; } catch { data = null; }
    }
    if (!data) return [];
    Object.assign(D.sources, data.sources || {});
    return data[tab] || [];
  }
  const pending = {};
  // Lista de um cadastro: padrões (menos os apagados, trocados pelos editados) + os criados neste navegador
  D.load = function (tab) {
    if (D.lists[tab]) return Promise.resolve(D.lists[tab]);
    if (!pending[tab]) pending[tab] = (async () => {
      const [defs, loc] = await Promise.all([defaults(tab), local()]);
      const L = loc[tab] || {}, del = new Set(L.deleted || []), edited = L.edited || {};
      const out = [];
      for (const d of defs) { if (del.has(d.id)) continue; out.push(edited[d.id] ? clone(edited[d.id]) : d); }
      for (const c of Object.values(L.custom || {})) out.push(clone(c));
      D.lists[tab] = out;
      D.byId[tab] = new Map(out.map((r) => [r.id, r]));
      return out;
    })();
    return pending[tab];
  };
  D.get = async (tab, id) => { if (!id) return null; await D.load(tab); return D.byId[tab].get(id) || null; };
  D.srcName = (s) => D.sources[s] || s || '';
})(window.App);
