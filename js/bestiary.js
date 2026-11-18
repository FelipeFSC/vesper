'use strict';
/*
 * Bestiário (Plano 25): criaturas e NPCs importados do 5etools do usuário (tools/importar-5etools.mjs).
 * - data/5etools/indice.js: lista leve; data/5etools/livro-<SIGLA>.js: as criaturas completas, carregadas sob demanda.
 * - Imagens: token do 5etools (web); por cima, a pasta local ou uma imagem escolhida à mão.
 * - Meu bestiário: fichas salvas pelo mestre, valem em todas as campanhas.
 * - Sem conversão de regras: a ficha criada leva nome, tamanho, token, PV, atributos, Defesa, o bloco nas notas
 *   e os dados originais inteiros (dados5e). O núcleo não depende da mesa (a página "Criar ficha" usa o mesmo arquivo).
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const B = { list: [], byKey: new Map(), books: {}, files: new Map(), links: {}, mine: {}, dir: null, dirName: '', needPerm: false, ready: false, missing: false };
  App.Bestiary = B;
  const units = (t) => (App.Units ? App.Units.show(t) : String(t == null ? '' : t));

  // ---------- Armazenamento (banco da mesa, chaves próprias; fora da campanha) ----------
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('mesarpg', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      setTimeout(() => rej(new Error('IndexedDB lento')), 4000);
    });
    return dbp;
  }
  const KEYS = { dir: 'bst-pasta', links: 'bst-ligacoes', mine: 'bst-meu' };
  async function kv(name, val) {
    const key = KEYS[name] || name;
    try {
      const d = await db();
      return await new Promise((res, rej) => {
        const tx = d.transaction('kv', val === undefined ? 'readonly' : 'readwrite');
        const r = val === undefined ? tx.objectStore('kv').get(key) : tx.objectStore('kv').put(val, key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    } catch { return undefined; }
  }
  B.kv = kv;

  // ---------- Carregar ----------
  const script = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Não consegui abrir ' + src));
    document.head.append(s);
  });
  let loading = null;
  B.load = function () {
    if (B.ready) return Promise.resolve(B.list);
    if (!loading) loading = (async () => {
      if (!App.BESTIARY5E_INDEX) {
        try { await script((B.base || '') + 'data/5etools/indice.js'); }
        catch { B.missing = true; }
      }
      const idx = App.BESTIARY5E_INDEX || { list: [], books: {} };
      B.books = idx.books || {};
      B.list = idx.list.map((e) => Object.assign(e, { keys: keysOf(e) }));
      for (const e of B.list) B.byKey.set(e.k, e);
      B.links = (await kv('links')) || {};
      B.mine = (await kv('mine')) || {};
      await B.restore();
      B.ready = true;
      return B.list;
    })();
    return loading;
  };
  // Criatura completa: carrega o arquivo do livro dela na primeira vez
  const bookLoads = {};
  B.full = async function (e) {
    if (!e) return null;
    const books = App.BESTIARY5E_BOOKS || {};
    if (!books[e.s]) {
      bookLoads[e.s] = bookLoads[e.s] || script((B.base || '') + 'data/5etools/livro-' + e.s.replace(/[^A-Za-z0-9_-]/g, '_') + '.js');
      await bookLoads[e.s];
    }
    const list = (App.BESTIARY5E_BOOKS || {})[e.s] || [];
    return list.find((m) => (m.name + '|' + m.source).toLowerCase() === e.k) || null;
  };
  B.bookName = (s) => (B.books[s] ? B.books[s].name : s);

  // ---------- Nome do arquivo ↔ criatura (pasta local) ----------
  const sortKey = (s) => s.split('_').filter(Boolean).sort().join('_');
  function fileKey(name) {
    let s = U.slug(String(name).replace(/\.[a-z0-9]+$/i, ''));
    s = s.replace(/(^|_)(tokens?|topdown|top|portrait|retrato|art|img|image|token_pack)(?=_|$)/g, '$1').replace(/_+/g, '_').replace(/^_|_$/g, '');
    for (let i = 0; i < 3; i++) s = s.replace(/_(?:[a-z]?\d+[a-z]?|[a-z])$/, '').replace(/([a-z])\d+$/, '$1');
    s = s.replace(/^\d+_/, '');
    return sortKey(s);
  }
  B.fileKey = fileKey;
  function keysOf(e) {
    const names = [e.n].concat(e.ali || []);
    const exact = [...new Set(names.map((x) => sortKey(U.slug(x))))];
    const base = e.n.replace(/^(Ancient|Adult|Young)\s+/i, '').replace(/\s+Wyrmling$/i, '').replace(/^Giant\s+/i, '').replace(/^Swarm of\s+/i, '').replace(/,.*$/, '').replace(/\s*\(.*\)$/, '');
    const group = [...new Set([sortKey(U.slug(base)), sortKey(U.slug(base.replace(/s$/, '')))])].filter((g) => g && !exact.includes(g));
    return { exact, group };
  }

  // ---------- Pasta de imagens (por cima do token da web) ----------
  const IMG = /\.(png|jpe?g|webp|gif|avif)$/i;
  B.canPickFolder = () => typeof window.showDirectoryPicker === 'function';
  B.pickFolder = async function () {
    try {
      const d = await window.showDirectoryPicker({ id: 'vesper-bestiario', mode: 'read' });
      B.dir = d; await kv('dir', d); await B.scan();
    } catch (e) { if (e.name !== 'AbortError') U.toast('Não foi possível abrir a pasta: ' + e.message, 'error'); }
  };
  B.pickFiles = function () {
    return new Promise((res) => {
      const i = document.createElement('input');
      i.type = 'file'; i.multiple = true; i.accept = 'image/*';
      i.onchange = () => { B.addFiles([...i.files].map((f) => [f.name, f])); res(); };
      i.click();
    });
  };
  B.addFiles = function (list) {
    for (const [name, f] of list) if (IMG.test(name)) B.files.set(name, { getFile: async () => f });
    B.dirName = B.dirName || 'Arquivos escolhidos';
    reindex();
  };
  B.restore = async function () {
    const d = await kv('dir');
    if (!d || !d.queryPermission) return;
    B.dir = d; B.dirName = d.name;
    try { if ((await d.queryPermission({ mode: 'read' })) === 'granted') await B.scan(); else B.needPerm = true; }
    catch { B.needPerm = true; }
  };
  B.reconnect = async function () {
    if (!B.dir) return;
    try { if ((await B.dir.requestPermission({ mode: 'read' })) === 'granted') { B.needPerm = false; await B.scan(); } }
    catch (e) { U.toast(e.message, 'error'); }
  };
  B.scan = async function () {
    if (!B.dir) return;
    const files = new Map();
    async function walk(dir, prefix, depth) {
      for await (const [name, hd] of dir.entries()) {
        if (hd.kind === 'file' && IMG.test(name)) files.set(prefix + name, hd);
        else if (hd.kind === 'directory' && depth < 4) await walk(hd, prefix + name + '/', depth + 1);
      }
    }
    try { await walk(B.dir, '', 0); } catch { B.needPerm = true; return; }
    B.files = files; B.dirName = B.dir.name; B.needPerm = false;
    reindex();
  };
  let byFile = new Map();
  function reindex() {
    byFile = new Map();
    for (const p of [...B.files.keys()].sort()) { const k = fileKey(p.split('/').pop()); if (k && !byFile.has(k)) byFile.set(k, p); }
    B.emit();
  }
  // Imagem da criatura: à mão > pasta (nome, grupo) > token do 5etools
  B.imageOf = function (e) {
    if (!e) return null;
    const l = B.links[e.k];
    if (l && B.files.has(l)) return { path: l, how: 'mão' };
    for (const k of e.keys.exact) if (byFile.has(k)) return { path: byFile.get(k), how: 'pasta' };
    for (const k of e.keys.group) if (byFile.has(k)) return { path: byFile.get(k), how: 'grupo' };
    if (e.tok) return { url: e.tok, how: 'token' };
    return null;
  };
  B.coverage = () => B.list.filter((e) => B.imageOf(e)).length;
  B.link = async function (k, path) { if (path) B.links[k] = path; else delete B.links[k]; await kv('links', B.links); B.emit(); };
  const urls = new Map();
  B.fileUrl = async function (path) {
    if (urls.has(path)) return urls.get(path);
    const hd = B.files.get(path);
    if (!hd) return null;
    try { const u = URL.createObjectURL(await hd.getFile()); urls.set(path, u); return u; } catch { return null; }
  };
  B.file = async (path) => { const hd = B.files.get(path); try { return hd ? await hd.getFile() : null; } catch { return null; } };
  // Arquivo da imagem (pasta ou token baixado da web), para virar asset WebP
  B.imageFile = async function (e) {
    const im = B.imageOf(e);
    if (!im) return null;
    if (im.path) return B.file(im.path);
    const fetcher = B.fetch || ((u) => fetch(u, { mode: 'cors' }));
    const r = await fetcher(im.url);
    if (!r.ok) throw new Error('Token não encontrado (' + r.status + ')');
    const blob = await r.blob();
    return new File([blob], e.n + '.webp', { type: blob.type || 'image/webp' });
  };

  const subs = new Set();
  B.on = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  B.emit = () => { for (const fn of subs) try { fn(); } catch (err) { console.error(err); } };

  // ---------- Texto do 5etools ----------
  const ATK = { mw: 'Melee Weapon Attack:', rw: 'Ranged Weapon Attack:', 'mw,rw': 'Melee or Ranged Weapon Attack:', 'rw,mw': 'Melee or Ranged Weapon Attack:', ms: 'Melee Spell Attack:', rs: 'Ranged Spell Attack:', 'ms,rs': 'Melee or Ranged Spell Attack:', m: 'Melee Attack Roll:', r: 'Ranged Attack Roll:', 'm,r': 'Melee or Ranged Attack Roll:' };
  const ABIL = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
  // Tira as marcações: "{@hit 4}" → "+4", "{@spell fireball|xphb}" → "fireball", "{@creature goblin||goblins}" → "goblins"
  function clean(str) {
    let s = String(str == null ? '' : str), prev;
    do {
      prev = s;
      s = s.replace(/\{@(\w+)(?: ([^{}]*?))?\}/g, (m, tag, body) => {
        body = body || '';
        const parts = body.split('|');
        switch (tag) {
          case 'hit': return (/^[+-]/.test(parts[0]) ? '' : '+') + parts[0];
          case 'h': return 'Hit: ';
          case 'm': return 'Miss: ';
          case 'hom': return 'Hit or Miss: ';
          case 'atk': return ATK[parts[0]] || 'Attack:';
          case 'atkr': return ATK[parts[0]] || 'Attack Roll:';
          case 'dc': return 'DC ' + parts[0];
          case 'recharge': return '(Recharge ' + (parts[0] ? parts[0] + (parts[0] === '6' ? '' : '–6') : '6') + ')';
          case 'actSave': return (ABIL[parts[0]] || parts[0]) + ' Saving Throw:';
          case 'actSaveFail': return parts[0] ? 'Failure by ' + parts[0] + ' or More:' : 'Failure:';
          case 'actSaveSuccess': return 'Success:';
          case 'actSaveSuccessOrFail': return 'Failure or Success:';
          case 'actTrigger': return 'Trigger:';
          case 'actResponse': return 'Response' + (parts[0] ? '—' + parts[0] : '') + ':';
          case 'chance': return parts[1] || parts[0] + ' percent';
          case 'damage': case 'dice': case 'd20': case 'scaledice': case 'scaledamage': return parts[parts.length > 2 ? 2 : 0] || parts[0];
          case 'note': return body;
          default: return parts[2] || parts[0];
        }
      });
    } while (s !== prev);
    return s;
  }
  B.clean = clean;
  const text = (t) => units(clean(t));
  // Entradas do 5etools → DOM (texto, listas, tabelas, blocos com nome)
  function renderEntries(list, depth = 0) {
    const out = [];
    for (const it of [].concat(list || [])) {
      if (it == null) continue;
      if (typeof it === 'string') { out.push(h('p', {}, text(it))); continue; }
      const t = it.type || 'entries';
      if (t === 'list') { out.push(h('ul', {}, (it.items || []).map((x) => h('li', {}, typeof x === 'string' ? text(x) : [x.name ? h('b', {}, text(x.name) + '. ') : null, renderEntries(x.entries || x.entry || [], depth + 1)])))); continue; }
      if (t === 'item') { out.push(h('p', {}, it.name ? h('b', {}, text(it.name) + '. ') : null, ...(it.entries || [it.entry]).map((x) => (typeof x === 'string' ? text(x) : '')))); continue; }
      if (t === 'table') {
        out.push(h('table', { class: 'bst-table' }, it.caption ? h('caption', {}, text(it.caption)) : null,
          it.colLabels ? h('tr', {}, it.colLabels.map((c) => h('th', {}, text(c)))) : null,
          (it.rows || []).map((r) => h('tr', {}, [].concat(r).map((c) => h('td', {}, typeof c === 'string' || typeof c === 'number' ? text(c) : c && c.roll ? (c.roll.exact != null ? String(c.roll.exact) : `${c.roll.min}–${c.roll.max}`) : renderEntries(c && c.entries ? c.entries : [c], depth + 1)))))));
        continue;
      }
      if (t === 'image') continue;
      if (t === 'quote') { out.push(h('blockquote', { class: 'bst-quote' }, renderEntries(it.entries, depth + 1), it.by ? h('div', { class: 'faint' }, '— ' + text(it.by)) : null)); continue; }
      const inner = renderEntries(it.entries || (it.entry ? [it.entry] : []), depth + 1);
      out.push(it.name ? h('div', { class: 'bst-ent' }, h(depth ? 'h5' : 'h4', {}, text(it.name)), inner) : h('div', {}, inner));
    }
    return out;
  }
  // Mesmas entradas em texto puro (para as notas da ficha)
  function plain(list, depth = 0) {
    const L = [];
    for (const it of [].concat(list || [])) {
      if (it == null) continue;
      if (typeof it === 'string') { L.push(text(it)); continue; }
      if (it.type === 'list') { for (const x of it.items || []) L.push('• ' + (typeof x === 'string' ? text(x) : (x.name ? text(x.name) + '. ' : '') + plain(x.entries || x.entry || [], depth + 1))); continue; }
      if (it.type === 'table') { for (const r of it.rows || []) L.push([].concat(r).map((c) => (typeof c === 'string' || typeof c === 'number' ? text(c) : c && c.roll ? (c.roll.exact != null ? c.roll.exact : c.roll.min + '–' + c.roll.max) : plain(c && c.entries ? c.entries : [c]))).join(' | ')); continue; }
      if (it.type === 'image') continue;
      const inner = plain(it.entries || (it.entry ? [it.entry] : []), depth + 1);
      L.push(it.name ? text(it.name) + '. ' + inner : inner);
    }
    return L.join(depth ? ' ' : '\n');
  }

  // ---------- Bloco de estatísticas ----------
  const SIZE = { F: 'Fine', D: 'Diminutive', T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan', C: 'Colossal', V: 'Varies' };
  const TOKEN = { T: 0.5, S: 1, M: 1, L: 2, H: 3, G: 4 };
  const ALIGN = { L: 'lawful', N: 'neutral', NX: 'neutral', NY: 'neutral', C: 'chaotic', G: 'good', E: 'evil', U: 'unaligned', A: 'any alignment' };
  const SHORT = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const mod = (v) => Math.floor((Number(v) - 10) / 2);
  const sign = (n) => (n >= 0 ? '+' + n : '−' + Math.abs(n));
  B.mod = mod; B.sign = sign;
  const sizeText = (m) => [].concat(m.size || []).map((s) => SIZE[s] || s).join(' or ');
  // Tipo e tendência: o texto que o próprio 5etools montou na importação (m._txt), senão o nosso
  const typeOf = (m) => (m._txt && m._txt.type) || typeText(m.type);
  const alignOf = (m) => (m._txt && m._txt.align != null ? m._txt.align : alignText(m.alignment));
  function typeText(t) {
    if (!t) return '';
    if (typeof t === 'string') return t;
    let base = typeof t.type === 'string' ? t.type : t.type && t.type.choose ? t.type.choose.join(' or ') : '';
    if (t.swarmSize) base = `swarm of ${SIZE[t.swarmSize] || t.swarmSize} ${base}s`;
    const tags = (t.tags || []).map((x) => (typeof x === 'string' ? x : x.tag)).filter(Boolean);
    return base + (tags.length ? ` (${tags.join(', ')})` : '');
  }
  function alignText(a) {
    if (!a) return '';
    const arr = [].concat(a);
    if (arr.some((x) => typeof x === 'object')) return arr.map((x) => (typeof x === 'object' ? (x.special || alignText(x.alignment) + (x.chance ? ` (${x.chance}%)` : '')) : ALIGN[x] || x)).join(' or ');
    if (arr.length === 6 && arr.includes('G') === false) return 'any non-good alignment';
    if (arr.length >= 5) return 'any alignment';
    return arr.map((x) => ALIGN[x] || x).join(' ');
  }
  function acText(ac) {
    return [].concat(ac || []).map((x) => (typeof x === 'number' ? String(x) : x.special ? x.special : `${x.ac}${x.from ? ' (' + x.from.map(clean).join(', ') + ')' : ''}${x.condition ? ' ' + clean(x.condition) : ''}`)).join(', ');
  }
  const acNum = (ac) => { for (const x of [].concat(ac || [])) { if (typeof x === 'number') return x; if (x && typeof x.ac === 'number') return x.ac; } return 10; };
  const hpText = (hp) => (!hp ? '' : hp.special ? clean(hp.special) : `${hp.average}${hp.formula ? ' (' + hp.formula + ')' : ''}`);
  function speedText(sp) {
    if (!sp) return '';
    const out = [];
    for (const k of ['walk', 'burrow', 'climb', 'fly', 'swim']) {
      const v = sp[k];
      if (v == null) continue;
      const num = typeof v === 'object' ? v.number : v, cond = typeof v === 'object' && v.condition ? ' ' + clean(v.condition) : '';
      out.push((k === 'walk' ? '' : k + ' ') + num + ' ft.' + cond + (k === 'fly' && sp.canHover ? ' (hover)' : ''));
    }
    if (sp.alternate) for (const [k, arr] of Object.entries(sp.alternate)) for (const v of arr) out.push(k + ' ' + v.number + ' ft.' + (v.condition ? ' ' + clean(v.condition) : ''));
    return out.join(', ');
  }
  const crText = (cr) => (cr == null ? '—' : typeof cr === 'object' ? cr.cr + (cr.lair ? ` (${cr.lair} in lair)` : '') + (cr.coven ? ` (${cr.coven} in coven)` : '') : String(cr));
  function dmgList(arr, key) {
    return [].concat(arr || []).map((x) => (typeof x === 'string' ? x : x.special ? x.special : (x.preNote ? x.preNote + ' ' : '') + dmgList(x[key], key) + (x.note ? ' ' + x.note : ''))).join(', ');
  }
  const condList = (arr) => [].concat(arr || []).map((x) => (typeof x === 'string' ? x : x.conditionImmune ? condList(x.conditionImmune) + (x.note ? ' ' + x.note : '') : x.special || '')).join(', ');
  const pairs = (o) => Object.entries(o || {}).filter(([k]) => k !== 'other').map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)} ${v}`).join(', ');
  // Lista de magias de um bloco "spellcasting" do 5etools
  function spellLines(sc) {
    const L = [];
    if (sc.will) L.push('At will: ' + sc.will.map(clean).join(', '));
    if (sc.daily) for (const [k, v] of Object.entries(sc.daily)) L.push(`${k.replace('e', '')}/day${/e$/.test(k) ? ' each' : ''}: ` + v.map(clean).join(', '));
    if (sc.spells) for (const [lvl, v] of Object.entries(sc.spells)) L.push((lvl === '0' ? 'Cantrips' : `Level ${lvl}${v.slots ? ` (${v.slots} slots)` : ''}`) + ': ' + (v.spells || []).map(clean).join(', '));
    return L;
  }
  // Seções de ações, já com a conjuração no lugar certo
  function sections(m) {
    const casts = [].concat(m.spellcasting || []);
    const byPlace = (place) => casts.filter((c) => (c.displayAs || 'trait') === place).map((c) => ({ name: c.name, entries: [].concat(c.headerEntries || [], spellLines(c).length ? [{ type: 'list', items: spellLines(c) }] : [], c.footerEntries || []) }));
    return [
      ['Traits', byPlace('trait').concat(m.trait || [])],
      ['Actions', byPlace('action').concat(m.action || [])],
      ['Bonus Actions', byPlace('bonus').concat(m.bonus || [])],
      ['Reactions', byPlace('reaction').concat(m.reaction || [])],
      ['Legendary Actions', [].concat(m.legendaryHeader ? [{ entries: m.legendaryHeader }] : []).concat(byPlace('legendary'), m.legendary || [])],
      ['Mythic Actions', [].concat(m.mythicHeader ? [{ entries: m.mythicHeader }] : []).concat(m.mythic || [])],
    ].filter(([, arr]) => arr.length);
  }
  function lines(m) {
    const L = [];
    L.push(['Armor Class', acText(m.ac)], ['Hit Points', hpText(m.hp)], ['Speed', speedText(m.speed)]);
    const ini = m._txt && m._txt.init != null ? m._txt.init : m.dex != null ? mod(m.dex) : null;
    if (ini != null) L.push(['Initiative', sign(ini)]);
    L.push(['Saving Throws', pairs(m.save)], ['Skills', pairs(m.skill)], ['Damage Vulnerabilities', dmgList(m.vulnerable, 'vulnerable')],
      ['Damage Resistances', dmgList(m.resist, 'resist')], ['Damage Immunities', dmgList(m.immune, 'immune')], ['Condition Immunities', condList(m.conditionImmune)],
      ['Gear', [].concat(m.gear || []).map((g) => clean(typeof g === 'string' ? g : g.item + (g.quantity ? ` (${g.quantity})` : '')).replace(/\|[^,()]*/g, '')).join(', ')],
      ['Senses', [].concat(m.senses || []).map(clean).concat(m.passive != null ? ['passive Perception ' + m.passive] : []).join(', ')],
      ['Languages', [].concat(m.languages || []).map(clean).join(', ') || '—'],
      ['Challenge', crText(m.cr) + (m.pbNote ? ' (' + clean(m.pbNote) + ')' : '')]);
    return L.filter(([, v]) => v);
  }
  // Bloco em texto (vai nas notas da ficha)
  B.blockText = function (m) {
    const L = [m.name, `${sizeText(m)} ${typeOf(m)}${alignOf(m) ? ', ' + alignOf(m) : ''}`];
    for (const [k, v] of lines(m)) L.push(units(`${k}: ${clean(v)}`));
    L.push(SHORT.map((s) => `${s.toUpperCase()} ${m[s]} (${sign(mod(m[s]))})`).join(' · '));
    for (const [title, arr] of sections(m)) { L.push('', title.toUpperCase()); for (const it of arr) L.push((it.name ? text(it.name) + '. ' : '') + plain(it.entries || [], 1)); }
    L.push('', `Source: ${B.bookName(m.source)}${m.page ? ', p. ' + m.page : ''} (5etools).`);
    return L.join('\n');
  };

  // ---------- Criatura → ficha (sem conversão de regras) ----------
  const TYPE_COLOR = { aberration: '#7a4fa8', beast: '#6b8f4e', celestial: '#c9a44a', construct: '#7c8794', dragon: '#b04848', elemental: '#3f8f86', fey: '#5fae8a', fiend: '#8a3a3a', giant: '#9b6b3c', humanoid: '#5b7fbf', monstrosity: '#a0683b', ooze: '#6c9a3a', plant: '#4e7d3a', undead: '#6b6f80' };
  B.colorOf = (e) => TYPE_COLOR[String((e && (e.ty || typeText(e.type))) || '').split(/[ /(]/)[0]] || '#6b7280';
  const STAT = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'];
  B.toActor = function (m, e) {
    const dv = [].concat(m.senses || []).map(String).join(' ').match(/darkvision (\d+)/i);
    const hp = m.hp && m.hp.average != null ? m.hp.average : 1;
    const raw = JSON.parse(JSON.stringify(m));
    return {
      kind: m.isNpc ? 'npc' : 'monster', name: m.name, img: null, color: B.colorOf(e || m), size: TOKEN[[].concat(m.size || ['M'])[0]] || 1, owner: '',
      bars: [{ name: 'PV', value: hp, max: hp }],
      stats: STAT.map((n, i) => ({ name: n, value: m[SHORT[i]] != null ? mod(m[SHORT[i]]) : 0 })).concat([{ name: 'Defesa', value: acNum(m.ac) }]),
      testFormula: '1d20+@valor', initFormula: '1d20+@destreza',
      actions: [], notes: B.blockText(m),
      darkvision: dv ? Math.round(Number(dv[1]) / 5) : 0, hpDice: m.hp && m.hp.formula ? m.hp.formula.replace(/\s+/g, '') : null,
      imgStyle: 'token', source: '5etools', bestiaryId: (m.name + '|' + m.source).toLowerCase(), dados5e: raw,
    };
  };

  // ---------- Meu bestiário ----------
  B.saveMine = async function (actor, imgData) {
    const c = U.clone(actor);
    const id = c.mineId || U.uid('mb_');
    c.mineId = id; delete c.id; c.owner = '';
    B.mine[id] = { actor: c, img: imgData || null, savedAt: Date.now() };
    await kv('mine', B.mine);
    B.emit();
    return id;
  };
  B.removeMine = async function (id) { delete B.mine[id]; await kv('mine', B.mine); B.emit(); };

  // ---------- Na mesa ----------
  const S = () => App.Store;
  B.addToCampaign = async function (ref) {
    const st = S().state;
    if (!st) return null;
    const mine = ref.startsWith('mine:') ? B.mine[ref.slice(5)] : null;
    const e = mine ? null : B.byKey.get(ref);
    if (!mine && !e) return null;
    const found = Object.values(st.actors).find((a) => (mine ? a.mineId === ref.slice(5) : a.bestiaryId === ref && !a.mineId));
    if (found) return found.id;
    let a;
    if (mine) {
      a = U.clone(mine.actor);
      if (mine.img) { const id = 'img_' + U.hash(mine.img); if (!S().assets[id]) { S().assets[id] = mine.img; App.Net.sendAsset(id, mine.img); } a.img = id; }
    } else {
      const m = await B.full(e);
      if (!m) throw new Error('Não achei ' + e.n + ' no arquivo do livro.');
      a = B.toActor(m, e);
      try { const f = await B.imageFile(e); if (f) a.img = (await App.Images.add(f, App.Images.TOKEN)).id; }
      catch (err) { U.toast('Sem imagem para ' + e.n + ': ' + err.message, 'error'); }
    }
    a.id = U.uid('ac_');
    S().dispatch({ type: 'actor.add', actor: a });
    return a.id;
  };
  B.place = async function (ref, p) {
    const id = await B.addToCampaign(ref);
    if (id) App.Board.placeActor(id, p);
    return id;
  };

  // ---------- Janela (mesa, só o mestre) ----------
  const F = { q: '', type: '', cr: '', size: '', book: '', only: '', hideOld: false, sel: null, tab: 'ficha' };
  B.filter = F;
  const CR = [['', 'Qualquer ND'], ['0-0.5', 'ND 0 a 1/2'], ['1-4', 'ND 1 a 4'], ['5-10', 'ND 5 a 10'], ['11-16', 'ND 11 a 16'], ['17-30', 'ND 17 ou mais']];
  const SIZES = [['', 'Qualquer tamanho'], ['T', 'Miúdo (Tiny)'], ['S', 'Pequeno (Small)'], ['M', 'Médio (Medium)'], ['L', 'Grande (Large)'], ['H', 'Enorme (Huge)'], ['G', 'Imenso (Gargantuan)']];
  B.visible = function () {
    const q = U.slug(F.q);
    const mine = Object.entries(B.mine).map(([id, m]) => ({ ref: 'mine:' + id, mine: m, name: m.actor.name, kind: m.actor.kind }));
    if (F.only === 'mine') return mine.filter((m) => !q || U.slug(m.name).includes(q));
    let L = B.list;
    if (q) L = L.filter((e) => U.slug(e.n).includes(q) || (e.ali || []).some((a) => U.slug(a).includes(q)));
    if (F.type) L = L.filter((e) => (F.type === 'npc' ? e.npc : e.ty.split(/[ /]/).includes(F.type) || e.ty === F.type));
    if (F.size) L = L.filter((e) => e.sz.split('/').includes(F.size));
    if (F.book) L = L.filter((e) => e.s === F.book);
    if (F.cr) { const [a, b] = F.cr.split('-').map(Number); L = L.filter((e) => e.crn != null && e.crn >= a && e.crn <= b); }
    if (F.hideOld) L = L.filter((e) => !e.rep);
    if (F.only === 'noimg') L = L.filter((e) => !B.imageOf(e));
    return (F.only ? [] : mine.filter((m) => !q || U.slug(m.name).includes(q))).concat(L.map((e) => ({ ref: e.k, e })));
  };

  const ic = (n) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n); return t.content.firstChild; };
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn' }, attrs), ic(icon), label);
  // Miniatura: imagem da pasta, token da web (carregado só quando aparece) ou a letra na cor do tipo
  B.thumb = function (e, size, mineImg) {
    const el = h('div', { class: 'avatar bst-thumb', style: { width: size + 'px', height: size + 'px', fontSize: size * 0.42 + 'px', background: U.hexA(e ? B.colorOf(e) : '#6b7280', 1) } },
      ((e && e.n) || '?').slice(0, 1).toUpperCase());
    const put = (u) => { el.textContent = ''; el.append(h('img', { src: u, alt: '', loading: 'lazy', onerror: () => { el.textContent = ((e && e.n) || '?').slice(0, 1).toUpperCase(); } })); };
    if (mineImg) put(mineImg);
    else {
      const im = e && B.imageOf(e);
      if (im && im.path) B.fileUrl(im.path).then((u) => u && put(u));
      else if (im && im.url) put(im.url);
    }
    return el;
  };

  B.open = async function () {
    const UI = App.UI;
    if (!S().gmView()) { U.toast('O bestiário é do mestre.'); return; }
    const w = UI.openWindow('bestiary', 'Bestiário', (win) => (win.root ? null : (win.root = h('div', { class: 'bst' }, h('p', { class: 'muted' }, 'Abrindo o bestiário…')))), { w: Math.min(1040, window.innerWidth - 24), icon: 'book-open' });
    w.el.classList.add('bst-win');
    try { await B.load(); } catch (err) { w.root.textContent = err.message; return; }
    const draw = () => { if (UI.windows.get('bestiary') !== w) { if (w.off) w.off(); return; } renderWin(w); };
    if (!w.off) w.off = B.on(draw);
    draw();
  };

  function renderWin(w) {
    const root = w.root;
    if (B.missing || !B.list.length) {
      root.innerHTML = '';
      root.append(h('div', { class: 'empty-state' }, h('div', { class: 'bubble' }, ic('book-open')), h('b', {}, 'Bestiário vazio'),
        h('p', { style: { maxWidth: '440px' } }, 'A base é gerada no seu computador a partir do 5etools. Na pasta do Vésper, rode: node tools/importar-5etools.mjs "D:\\Projetos\\5etools-src" e abra o bestiário de novo.')));
      return;
    }
    const list = B.visible();
    const keep = root.querySelector('.bst-list'), top = keep ? keep.scrollTop : 0;
    const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.bf : null;
    root.innerHTML = '';
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
      }, B.thumb(e, 36, it.mine && it.mine.img),
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
      box.append(h('div', { class: 'bst-head' }, B.thumb(null, 72, it.mine.img), h('div', {}, h('h3', {}, a.name), h('div', { class: 'muted' }, 'Meu bestiário'))), acts,
        btnI('trash-2', 'Tirar do meu bestiário', { class: 'btn small danger', onclick: go(async () => { if (confirm(`Tirar "${a.name}" do meu bestiário?`)) { await B.removeMine(it.ref.slice(5)); F.sel = null; } }) }),
        h('pre', { class: 'bst-notes' }, a.notes || ''));
      return;
    }
    const e = it.e;
    box.append(h('p', { class: 'muted' }, 'Abrindo ' + e.n + '…'));
    let m;
    try { m = await B.full(e); } catch (err) { box.textContent = err.message; return; }
    if (!m) { box.textContent = 'Não achei ' + e.n + ' no arquivo do livro.'; return; }
    if (F.sel !== it.ref && it.ref !== (B.byKey.get(F.sel) || {}).k) { /* trocou de criatura enquanto carregava */ }
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
      h('div', { class: 'bst-head' }, B.thumb(e, 84),
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
    const close = () => back.remove();
    let q = U.slug(e.n).split('_')[0];
    const grid = h('div', { class: 'bst-pick' });
    const fill = () => {
      grid.innerHTML = '';
      const all = [...B.files.keys()].sort().filter((p) => !q || U.slug(p).includes(U.slug(q))).slice(0, 120);
      if (!all.length) grid.append(h('p', { class: 'empty' }, 'Nenhum arquivo com esse nome.'));
      for (const p of all) {
        const img = h('img', { alt: '', loading: 'lazy' });
        B.fileUrl(p).then((u) => { if (u) img.src = u; });
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
})(window.App);
