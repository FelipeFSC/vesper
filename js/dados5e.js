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
  D.editionName = (edition) => edition === '2014' ? '5e (2014)' : edition === '2024' ? '5.5e (2024)' : edition || '';
  D.editionShort = (edition) => edition === '2014' ? '5e' : edition === '2024' ? '5.5e' : edition || '';
  // Filtro reutilizado nas listas do assistente e nos seletores da ficha.
  D.sourceControl = (rows, initial, onChange, opts = {}) => {
    let selected = Array.isArray(initial) ? new Set(initial) : null;
    const wrap = document.createElement('div'); wrap.className = 'f5-source-filter';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn small';
    button.setAttribute('aria-label', 'Filtrar por fonte'); button.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div'); menu.className = 'f5-source-menu'; menu.hidden = true;
    const groups = () => {
      const out = { 2014: new Set(), 2024: new Set(), other: new Set() };
      for (const row of rows()) if (row.source) (out[row.edition] || out.other).add(row.source);
      return out;
    };
    const label = () => { button.textContent = selected === null ? 'Fonte' : 'Fonte (' + selected.size + ')'; };
    const refresh = () => {
      menu.replaceChildren();
      const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'f5-source-reset'; reset.textContent = 'Todos os livros';
      reset.onclick = () => { selected = null; label(); refresh(); onChange(null); };
      menu.append(reset);
      if (opts.top) menu.append(opts.top());
      const grouped = groups();
      const all = [...new Set(Object.values(grouped).flatMap((sources) => [...sources]))];
      for (const [edition, title] of [['2014', D.editionName('2014')], ['2024', D.editionName('2024')], ['other', 'Sem edição']]) {
        const sources = [...grouped[edition]].sort((a, b) => D.srcName(a).localeCompare(D.srcName(b)));
        if (!sources.length) continue;
        const heading = document.createElement('div'); heading.className = 'f5-source-group-title'; heading.textContent = title; menu.append(heading);
        for (const source of sources) {
          const row = document.createElement('label'); row.className = 'check-row';
          const input = document.createElement('input'); input.type = 'checkbox'; input.checked = selected === null || selected.has(source);
          input.onchange = () => {
            if (selected === null) selected = new Set(all);
            if (input.checked) selected.add(source); else selected.delete(source);
            if (selected.size === all.length) selected = null;
            label(); refresh(); onChange(selected === null ? null : [...selected]);
          };
          row.append(input, document.createTextNode(D.srcName(source))); menu.append(row);
        }
      }
      if (!all.length) menu.append(document.createTextNode('Nenhum livro disponível.'));
    };
    button.onclick = () => { menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) refresh(); };
    label(); wrap.append(button, menu);
    return { element: wrap, matches: (r) => selected === null || selected.has(r.source), refresh };
  };
})(window.App);
