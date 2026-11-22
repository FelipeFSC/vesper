import { ImageUrls } from '../src/services/image-assets.ts';

export function renderBestiary(w, App, { CR, SIZES, SHORT, sizeText, typeOf, alignOf, crText, lines, units, clean, sign, mod, sections, text, renderEntries }) {
  const { U, Bestiary: B } = App;
  const { h } = U;
  const F = B.filter;
  const S = () => App.Store;
  const ic = (n) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n); return t.content.firstChild; };
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn' }, attrs), ic(icon), label);

  function renderWin(w) {
    const root = w.root;
    if (B.missing || !B.list.length) {
      root.innerHTML = '';
      w.imageUrls.clear();
      root.append(h('div', { class: 'empty-state' }, h('div', { class: 'bubble' }, ic('book-open')), h('b', {}, 'Bestiário vazio'),
        h('p', { style: { maxWidth: '440px' } }, 'A base é gerada no seu computador a partir do 5etools. Na pasta do Vésper, rode: node tools/importar-5etools.mjs "D:\\Projetos\\5etools-src" e abra o bestiário de novo.')));
      return;
    }
    const list = B.visible();
    const keep = root.querySelector('.bst-list'), top = keep ? keep.scrollTop : 0;
    const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.bf : null;
    root.innerHTML = '';
    w.imageUrls.clear();
    const redraw = () => renderWin(w);
    const sel = (k, opts, v, label) => h('select', { 'data-bf': k, value: v, title: label, onchange: (e) => { F[k] = e.target.value; redraw(); } }, opts.map(([a, b]) => h('option', { value: a }, b)));
    const typeSet = new Set();
    for (const e of B.list) { const t = e.ty.split(/[ /]/)[0]; if (t) typeSet.add(t); }
    const types = [['', 'Todos os tipos'], ['npc', 'NPCs']].concat([...typeSet].sort().map((t) => [t, t[0].toUpperCase() + t.slice(1)]));
    const counts = {};
    for (const e of B.list) counts[e.s] = (counts[e.s] || 0) + 1;
    const bookOpts = [['', 'Todos os livros']].concat(Object.keys(counts).sort((a, b) => B.bookName(a).localeCompare(B.bookName(b))).map((s) => [s, `${B.bookName(s)} (${s}) · ${counts[s]}`]));
    const n = B.coverage(), tot = B.list.length;
    const folder = h('div', { class: 'bst-folder' }, ic('image'),
      h('span', {}, `${n} de ${tot} com imagem (token do 5etools`, B.files.size ? [', pasta ', h('b', {}, B.dirName)] : '', ')'),
      B.needPerm ? h('span', { class: 'muted' }, ' · a pasta precisa de permissão de novo') : null,
      h('span', { class: 'grow' }),
      h('label', { class: 'bst-units', title: 'Mostra pés, milhas e libras em metros, km e kg (tabela dos livros em português)' }, 'Unidades',
        h('select', { 'data-bf': 'units', value: App.Units ? App.Units.mode() : 'orig', onchange: (ev) => { App.Units.setMode(ev.target.value); redraw(); } },
          h('option', { value: 'orig' }, 'Originais (pés, libras)'), h('option', { value: 'br' }, 'Brasil (metros, kg)'))),
      B.needPerm ? btnI('refresh-cw', 'Reconectar', { class: 'btn small primary', onclick: () => B.reconnect() }) : null,
      B.canPickFolder() ? btnI('folder-open', B.files.size ? 'Trocar pasta' : 'Pasta de imagens', { class: 'btn small', title: 'Imagens suas por cima dos tokens, achadas pelo nome do arquivo', onclick: () => B.pickFolder() })
        : btnI('image', 'Escolher imagens', { class: 'btn small', onclick: () => B.pickFiles() }));
    const filters = h('div', { class: 'bst-filters' },
      h('div', { class: 'search-box' }, ic('search'), h('input', { placeholder: 'Buscar pelo nome…', value: F.q, 'data-bf': 'q', oninput: (e) => { F.q = e.target.value; redraw(); } })),
      sel('book', bookOpts, F.book, 'Livro'), sel('type', types, F.type, 'Tipo'), sel('cr', CR, F.cr, 'Nível de desafio'), sel('size', SIZES, F.size, 'Tamanho'),
      sel('only', [['', 'Tudo'], ['mine', 'Meu bestiário (' + Object.keys(B.mine).length + ')'], ['noimg', 'Sem imagem']], F.only, 'Mostrar'),
      h('label', { class: 'bst-check', title: 'Esconde as criaturas que foram reimpressas num livro mais novo (por exemplo, o Goblin de 2014 que virou Goblin Warrior em 2024)' },
        h('input', { type: 'checkbox', 'data-bf': 'hideOld', checked: F.hideOld, onchange: (e) => { F.hideOld = e.target.checked; redraw(); } }), 'Esconder versões antigas'));
    const ul = h('div', { class: 'bst-list' });
    for (const it of list.slice(0, 300)) {
      const e = it.e;
      ul.append(h('div', {
        class: 'bst-item' + (F.sel === it.ref ? ' on' : ''), draggable: true, title: 'Clique para ver · arraste para o mapa', 'data-ref': it.ref,
        onclick: () => { F.sel = it.ref; redraw(); },
        ondragstart: (ev) => { ev.dataTransfer.setData('text/x-bestiary', it.ref); ev.dataTransfer.effectAllowed = 'copy'; },
      }, B.thumb(e, 36, w.imageUrls, it.mine),
      h('div', { class: 'grow' }, h('div', { class: 'name' }, it.name || e.n),
        h('div', { class: 'sub' }, e ? `${e.ty || '—'} · ND ${e.cr == null ? '—' : e.cr} · ${e.s}${e.npc ? ' · NPC' : ''}` : 'Meu bestiário'))));
    }
    if (list.length > 300) ul.append(h('p', { class: 'hint' }, `Mostrando 300 de ${list.length}. Use a busca ou os filtros para achar o resto.`));
    if (!list.length) ul.append(h('p', { class: 'empty' }, F.only === 'mine' ? 'Nada salvo ainda. Na ficha, Configurar → Salvar no meu bestiário.' : 'Nada com esses filtros.'));
    const cur = list.find((x) => x.ref === F.sel) || (F.sel && B.byKey.get(F.sel) ? { ref: F.sel, e: B.byKey.get(F.sel) } : null);
    const prev = h('div', { class: 'bst-prev' });
    root.append(folder, filters, h('div', { class: 'bst-body' }, h('div', { class: 'bst-left' }, h('div', { class: 'bst-count muted small-text' }, list.length + ' ' + (list.length === 1 ? 'registro' : 'registros')), ul), prev),
      h('p', { class: 'bst-credit' }, 'Dados e imagens do 5etools, a partir dos livros do próprio usuário.'));
    fillPreview(prev, cur, redraw);
    const nl = root.querySelector('.bst-list'); if (nl) nl.scrollTop = top;
    if (focus) { const el = root.querySelector(`[data-bf="${focus}"]`); if (el) { el.focus(); if (el.setSelectionRange && typeof el.value === 'string') try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* */ } } }
  }

  // Prévia: cabeçalho, botões e abas (Ficha, Descrição, Imagens)
  async function fillPreview(box, it, redraw) {
    if (!it) { box.append(h('div', { class: 'empty-state' }, h('div', { class: 'bubble' }, ic('book-open')), h('b', {}, 'Escolha uma criatura'), h('p', {}, 'Arraste da lista para o mapa, ou clique para ver a ficha completa.'))); return; }
    const go = (fn) => async () => { try { await fn(); } catch (err) { U.toast(err.message, 'error'); } };
    const inCamp = S().state && Object.values(S().state.actors).some((a) => (it.mine ? a.mineId === it.ref.slice(5) : a.bestiaryId === it.ref && !a.mineId));
    const acts = h('div', { class: 'row wrap bst-acts' },
      btnI('map-pin', 'Colocar no mapa', { class: 'btn primary', onclick: go(async () => { await B.place(it.ref); U.toast('Token criado no centro da tela.'); }) }),
      btnI(inCamp ? 'check' : 'plus', inCamp ? 'Já está na campanha' : 'Adicionar à campanha', { class: 'btn', disabled: inCamp, onclick: go(async () => { const id = await B.addToCampaign(it.ref); U.toast('Ficha criada na aba Fichas.'); B.emit(); if (id) App.UI.openActor(id); }) }));
    if (it.mine) {
      const a = it.mine.actor;
      box.append(h('div', { class: 'bst-head' }, B.thumb(null, 72, w.imageUrls, it.mine), h('div', {}, h('h3', {}, a.name), h('div', { class: 'muted' }, 'Meu bestiário'))), acts,
        btnI('trash-2', 'Tirar do meu bestiário', { class: 'btn small danger', onclick: go(async () => { if (confirm(`Tirar "${a.name}" do meu bestiário?`)) { await B.removeMine(it.ref.slice(5)); F.sel = null; } }) }),
        h('pre', { class: 'bst-notes' }, a.notes || ''));
      return;
    }
    const e = it.e;
    box.append(h('p', { class: 'muted' }, 'Abrindo ' + e.n + '…'));
    let m;
    try { m = await B.full(e); } catch (err) { box.textContent = err.message; return; }
    if (!box.isConnected) return;
    if (!m) { box.textContent = 'Não achei ' + e.n + ' no arquivo do livro.'; return; }
    box.innerHTML = '';
    const im = B.imageOf(e);
    const imgRow = h('div', { class: 'bst-img muted small-text' },
      im ? h('span', {}, 'Imagem: ', h('b', {}, im.how === 'token' ? 'token do 5etools' : im.path), im.how === 'grupo' ? ' (do grupo)' : im.how === 'mão' ? ' (escolhida)' : '') : h('span', {}, 'Sem imagem.'),
      B.files.size ? h('button', { class: 'btn small ghost', onclick: () => chooseImage(e) }, ic('image'), 'Escolher da pasta') : null,
      B.links[e.k] ? h('button', { class: 'btn small ghost', onclick: () => B.link(e.k, null) }, ic('x'), 'Voltar ao automático') : null);
    const fl = m._fluff || {};
    const tabs = [['ficha', 'Ficha'], ['desc', 'Descrição' + (fl.entries && fl.entries.length ? '' : ' (vazia)')], ['img', 'Imagens (' + ((fl.images || []).length) + ')']];
    const tabBar = h('div', { class: 'sheet-tabs bst-tabs' }, tabs.map(([id, label]) => h('button', { class: F.tab === id ? 'on' : '', onclick: () => { F.tab = id; redraw(); } }, label)));
    box.append(
      h('div', { class: 'bst-head' }, B.thumb(e, 84, w.imageUrls),
        h('div', { class: 'grow' }, h('h3', {}, m.name), h('div', { class: 'muted' }, `${sizeText(m)} ${typeOf(m)}${alignOf(m) ? ', ' + alignOf(m) : ''}`),
          h('div', { class: 'faint small-text' }, `${B.bookName(m.source)} (${m.source})${m.page ? ', p. ' + m.page : ''}${m.isNpc ? ' · NPC' : ''}`)),
        h('div', { class: 'bst-cr' }, h('b', {}, 'ND ' + crText(m.cr).split(' ')[0]), m.hp && m.hp.average != null ? h('span', {}, m.hp.average + ' PV') : null)),
      imgRow, acts, tabBar);
    const pane = h('div', { class: 'bst-pane' });
    box.append(pane);
    if (F.tab === 'desc') {
      if (fl.entries && fl.entries.length) pane.append(...renderEntries(fl.entries)); else pane.append(h('p', { class: 'empty' }, 'Este livro não traz descrição para esta criatura.'));
    } else if (F.tab === 'img') {
      const imgs = fl.images || [];
      if (!imgs.length) pane.append(h('p', { class: 'empty' }, 'Sem arte no 5etools.'));
      for (const x of imgs) pane.append(h('figure', { class: 'bst-art' }, h('img', { src: x.url, alt: m.name, loading: 'lazy' }), x.credit || x.title ? h('figcaption', { class: 'faint small-text' }, [x.title, x.credit].filter(Boolean).join(' · ')) : null));
      if (e.tok) pane.append(h('figure', { class: 'bst-art bst-art-token' }, h('img', { src: e.tok, alt: 'Token', loading: 'lazy' }), h('figcaption', { class: 'faint small-text' }, 'Token')));
    } else {
      pane.append(h('div', { class: 'bst-block' },
        lines(m).map(([k, v]) => h('div', { class: 'bst-line' }, h('b', {}, k + ' '), units(clean(v)))),
        h('div', { class: 'bst-abil' }, SHORT.map((s) => h('div', {}, h('b', {}, s.toUpperCase()), h('span', {}, String(m[s] != null ? m[s] : '—')), h('small', {}, m[s] != null ? sign(mod(m[s])) : ''))))));
      for (const [title, arr] of sections(m)) pane.append(h('div', { class: 'bst-sec' }, h('h4', {}, title), arr.map((x) => h('div', { class: 'bst-act' }, x.name ? h('b', {}, text(x.name) + '. ') : null, renderEntries(x.entries || [], 1)))));
      if (m.legendaryGroup) pane.append(h('p', { class: 'hint' }, 'Ações de covil e efeitos regionais: ' + m.legendaryGroup.name + ' (no 5etools, em legendarygroups.json).'));
    }
  }

  // Escolher à mão uma imagem da pasta
  function chooseImage(e) {
    const back = h('div', { class: 'modal-back' });
    const urls = new ImageUrls();
    const close = () => { back.remove(); urls.clear(); };
    let q = U.slug(e.n).split('_')[0];
    const grid = h('div', { class: 'bst-pick' });
    const fill = () => {
      grid.innerHTML = '';
      urls.clear();
      const all = [...B.files.keys()].sort().filter((p) => !q || U.slug(p).includes(U.slug(q))).slice(0, 120);
      if (!all.length) grid.append(h('p', { class: 'empty' }, 'Nenhum arquivo com esse nome.'));
      for (const p of all) {
        const img = h('img', { alt: '', loading: 'lazy' });
        void B.showFileImage(img, p, urls);
        grid.append(h('button', { class: 'bst-pick-item', title: p, onclick: async () => { await B.link(e.k, p); close(); } }, img, h('span', {}, p.split('/').pop())));
      }
    };
    back.append(h('div', { class: 'modal bst-pick-modal' },
      h('div', { class: 'win-head' }, ic('image'), h('span', { class: 'win-title' }, 'Imagem para ' + e.n), h('button', { class: 'icon-btn', title: 'Fechar', onclick: close }, ic('x'))),
      h('div', { class: 'win-body' }, h('div', { class: 'search-box' }, ic('search'), h('input', { value: q, placeholder: 'Buscar arquivo…', oninput: (ev) => { q = ev.target.value; fill(); } })), grid)));
    back.addEventListener('pointerdown', (ev) => { if (ev.target === back) close(); });
    document.body.append(back);
    fill();
  }
  renderWin(w);
}
