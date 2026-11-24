'use strict';
import { binaryAsset, ImageUrls, setAsset } from '../src/services/image-assets.ts';
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
      for (const mine of Object.values(B.mine)) if (mine.img) mine.img = binaryAsset(mine.img);
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
  B.file = async (path) => { const hd = B.files.get(path); try { return hd ? await hd.getFile() : null; } catch { return null; } };
  B.showFileImage = async function (img, path, urls) {
    const file = await B.file(path);
    if (file && img.isConnected) img.src = urls.src(U.uid('bst_img_'), file);
  };
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

  // Plano 74: ilustração do 5etools (aba Imagens) para virar a imagem do personagem. B.artPick[chave] = qual delas
  B.artPick = {};
  B.artFile = async function (m, idx) {
    const imgs = (m && m._fluff && m._fluff.images) || [];
    const im = imgs[idx != null ? idx : B.artPick[(m.name + '|' + m.source).toLowerCase()] || 0] || imgs[0];
    if (!im || !im.url) return null;
    const fetcher = B.fetch || ((u) => fetch(u, { mode: 'cors' }));
    const r = await fetcher(im.url);
    if (!r.ok) throw new Error('Ilustração não encontrada (' + r.status + ')');
    const blob = await r.blob();
    return new File([blob], m.name + '.webp', { type: blob.type || 'image/webp' });
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
  B.plain = (list) => plain(list);
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

  // ---------- Criatura → bloco da ficha 5e (Plano 53): nada do livro se perde ----------
  const FT = 0.3;
  // Na ficha 5e tudo fica em metros (Plano 40); cada tela mostra na unidade de quem vê
  const br = (t) => (App.Units && App.Units.toBR ? App.Units.toBR(t) : String(t == null ? '' : t));
  const ftM = (ft) => Math.round(Number(ft) * FT * 100) / 100;
  const ABK = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
  const skillKey = (k) => String(k).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const spellId = (body, ed) => { const p = String(body || '').split('|'); const nm = p[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return nm + '-' + (p[1] ? p[1].toLowerCase() : ed === '2024' ? 'xphb' : 'phb'); };
  // Vulnerabilidades, resistências e imunidades: as sem condição primeiro; cada uma com condição depois de ";"
  function defText(arr, key) {
    const plainL = [], cond = [];
    for (const x of [].concat(arr || [])) {
      if (typeof x === 'string') plainL.push(x);
      else if (x.special) cond.push(clean(x.special));
      else if (x[key]) { const inner = defText(x[key], key); if (x.note || x.cond || x.preNote) cond.push(((x.preNote ? x.preNote + ' ' : '') + inner + (x.note ? ' ' + x.note : '')).trim()); else plainL.push(inner); }
    }
    return [plainL.join(', ')].concat(cond).filter(Boolean).map(clean).join('; ');
  }
  // Uma entrada do bloco (traço, ação…) → item com nome, texto e, se houver, os números do ataque ou da salvaguarda
  function npcItem(it, key, i, who) {
    const raw = (it.entries || []).filter((x) => typeof x === 'string').join(' ');
    let name = String(it.name || '');
    const o = { id: key + i, name: '', text: br(plain(it.entries || [])), kind: 'text' };
    const rc = /\{@recharge(?: (\d))?\}/.exec(name);
    if (rc) { o.recharge = Number(rc[1] || 6); o.used = false; name = name.replace(rc[0], ''); }
    name = clean(name).trim();
    const uses = /\((\d+)\/(day|turn|rest|short rest|long rest|round)( each)?\)/i.exec(name);
    if (uses) o.uses = { max: Number(uses[1]), cur: Number(uses[1]), per: uses[2].toLowerCase(), each: !!uses[3] };
    const cost = /\(costs (\d+) actions?\)/i.exec(name);
    if (cost) o.cost = Number(cost[1]);
    o.name = name;
    const hit = /\{@hit ([+-]?\d+)\}/.exec(raw);
    const atk = /\{@atkr? ([^}]+)\}/.exec(raw);
    const dmg = [];
    const reD = /\{@damage ([^}]+)\}\)?\s*([a-z]+)\s+damage/gi;
    let m;
    // Dano com condição ("if the attack roll had Advantage", "or … if used with two hands") fica só no texto
    while ((m = reD.exec(raw))) {
      const before = raw.slice(Math.max(0, m.index - 12), m.index), after = raw.slice(reD.lastIndex).split(/[.;]|\bplus\b|\{@damage/i)[0];
      const cond = /\bor\s+\d*\s*\(?$/i.test(before) || /\b(if|while|when|instead|against)\b/i.test(after);
      dmg.push({ dice: m[1].replace(/\s+/g, ''), type: m[2].toLowerCase(), cond: cond || undefined });
    }
    if (!dmg.length) { const flat = /(?:\{@h\}|Hit: )\s*(\d+) ([a-z]+) damage/i.exec(raw); if (flat) dmg.push({ dice: flat[1], type: flat[2].toLowerCase() }); }
    o.dmg = dmg;
    const reach = /reach (\d+) ft/i.exec(raw), range = /range (\d+)(?:\/(\d+))? ft/i.exec(raw);
    if (reach) o.reach = ftM(reach[1]);
    if (range) o.range = { normal: ftM(range[1]), long: range[2] ? ftM(range[2]) : null };
    const area = /(\d+)-foot[- ](cone|line|cube|sphere|radius|emanation|cylinder)/i.exec(raw);
    if (area) o.area = { size: ftM(area[1]), shape: area[2].toLowerCase() };
    const dc = /\{@dc (\d+)\}/.exec(raw);
    const sv = /\{@actSave (\w+)\}/.exec(raw) || /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i.exec(raw);
    if (hit) { o.kind = 'attack'; o.hit = Number(hit[1]); o.atk = atk ? (/r/.test(atk[1]) && /m/.test(atk[1]) ? 'both' : /r/.test(atk[1]) ? 'ranged' : 'melee') : 'melee'; }
    if (dc) { o.dc = Number(dc[1]); o.save = sv ? (ABK[sv[1].toLowerCase()] || sv[1].toLowerCase()) : 'dex'; o.onSave = /half as much|half damage|\{@actSaveSuccess\}\s*half/i.test(raw) ? 'half' : 'none'; }
    // Salvaguarda de quem é atingido; não a da própria criatura ("the tarrasque must succeed on a DC 20 Constitution saving throw")
    const dcSentence = (raw.split(/(?<=\.)\s+/).find((x) => /\{@dc /.test(x)) || '');
    const selfSave = (who || []).some((w) => w && new RegExp('(?<!\\b(?:of|from|to|near|around|by)\\s)\\bthe ' + w.replace(/[^a-z ]/g, '') + ' must (succeed|make)', 'i').test(dcSentence));
    const targetSaves = /\{@actSave /.test(raw) || !selfSave;
    if (!hit && dc && sv && targetSaves && dmg.length) o.kind = 'save';
    return o;
  }
  function npcSpells(sc, ed, i) {
    const raw = (sc.headerEntries || []).filter((x) => typeof x === 'string').join(' ');
    const dc = /\{@dc (\d+)\}/.exec(raw), hit = /\{@hit ([+-]?\d+)\}/.exec(raw);
    const list = (arr) => [].concat(arr || []).map((x) => { const sp = /\{@spell ([^}]+)\}/.exec(typeof x === 'string' ? x : ''); return sp ? { name: clean('{@spell ' + sp[1] + '}') + (typeof x === 'string' ? clean(x.replace(sp[0], '')) : ''), ref: spellId(sp[1], ed) } : { name: clean(typeof x === 'string' ? x : x.entry || ''), ref: null }; });
    const groups = [];
    if (sc.will) groups.push({ label: 'À vontade', spells: list(sc.will) });
    for (const [k, v] of Object.entries(sc.daily || {})) { const n = Number(k.replace('e', '')); groups.push({ label: n + '/dia' + (/e$/.test(k) ? ' cada' : ''), uses: { max: n, cur: n, each: /e$/.test(k) }, spells: list(v) }); }
    for (const [k, v] of Object.entries(sc.spells || {})) groups.push({ label: k === '0' ? 'Truques' : k + 'º nível', level: Number(k), slots: v.slots ? { max: v.slots, cur: v.slots } : null, spells: list(v.spells) });
    for (const [k, v] of Object.entries(sc.rest || {})) groups.push({ label: k.replace('e', '') + '/descanso' + (/e$/.test(k) ? ' cada' : ''), uses: { max: Number(k.replace('e', '')), cur: Number(k.replace('e', '')) }, spells: list(v) });
    for (const [k, v] of Object.entries(sc.recharge || {})) groups.push({ label: 'Recarga ' + k, spells: list(v) });
    return { id: 'sc' + i, name: clean(sc.name || 'Spellcasting'), place: sc.displayAs || 'trait', ability: sc.ability || '', dc: dc ? Number(dc[1]) : null, atk: hit ? Number(hit[1]) : null,
      text: br(plain(sc.headerEntries || [])), footer: br(plain(sc.footerEntries || [])), groups };
  }
  B.toNpc = function (m) {
    const ed = /^X/.test(String(m.source || '')) ? '2024' : '2014';
    const sp = m.speed || {};
    const speed = {};
    for (const k of ['walk', 'fly', 'swim', 'climb', 'burrow']) if (sp[k] != null) speed[k] = ftM(typeof sp[k] === 'object' ? sp[k].number : sp[k]);
    if (sp.canHover) speed.hover = true;
    const saves = {}; for (const [k, v] of Object.entries(m.save || {})) saves[k] = Number(String(v).replace(/[^\d-]/g, '')) || 0;
    const skills = {}; for (const [k, v] of Object.entries(m.skill || {})) if (k !== 'other' && App.Regras5e && App.Regras5e.SKILL[skillKey(k)]) skills[skillKey(k)] = Number(String(v).replace(/[^\d-]/g, '')) || 0;
    const cr = m.cr == null ? '0' : typeof m.cr === 'object' ? String(m.cr.cr) : String(m.cr);
    const lists = { traits: [].concat(m.trait || []), actions: [].concat(m.action || []), bonus: [].concat(m.bonus || []), reactions: [].concat(m.reaction || []), legendary: [].concat(m.legendary || []), mythic: [].concat(m.mythic || []), lair: [] };
    const n = {
      size: SIZE[[].concat(m.size || ['M'])[0]] || 'Medium', type: typeOf(m), align: alignOf(m),
      ac: acNum(m.ac), acNote: clean(acText(m.ac)).replace(/^\d+\s*/, ''),
      hp: m.hp && m.hp.average != null ? m.hp.average : 1, hpFormula: m.hp && m.hp.formula ? m.hp.formula : m.hp && m.hp.special ? clean(m.hp.special) : '',
      speed, speedText: Object.values(sp).some((v) => v && typeof v === 'object' && v.condition) || sp.alternate ? br(speedText(m.speed)) : '',
      saves, skills,
      vuln: br(defText(m.vulnerable, 'vulnerable')), resist: br(defText(m.resist, 'resist')), immune: br(defText(m.immune, 'immune')), condImmune: condList(m.conditionImmune),
      senses: br([].concat(m.senses || []).map((x) => clean(x).replace(/\.$/, '')).join(', ')).replace(/\.(?=,|$)/g, ''), passive: m.passive != null ? Number(m.passive) : null,
      langs: [].concat(m.languages || []).map(clean).join(', '),
      cr, crNote: typeof m.cr === 'object' ? clean(crText(m.cr)) : '', xp: null, pb: null, init: m._txt && m._txt.init != null ? Number(m._txt.init) : null,
      legendaryCount: lists.legendary.length ? Number(m.legendaryActions || 3) : 0, legendaryUsed: 0,
      legendaryText: br(plain(m.legendaryHeader || [])), mythicText: br(plain(m.mythicHeader || [])), lairText: '',
      gear: [].concat(m.gear || []).map((g) => clean(typeof g === 'string' ? g : g.item + (g.quantity ? ' (' + g.quantity + ')' : '')).replace(/\|[^,()]*/g, '')).join(', '),
      spellcasting: [].concat(m.spellcasting || []).map((sc, i) => npcSpells(sc, ed, i)), extra: [],
    };
    const nm = String(m.name || '').toLowerCase().replace(/\(.*?\)/g, '').trim(), words = nm.split(/\s+/);
    const who = [nm, words[words.length - 1], words[0]];
    for (const [k, arr] of Object.entries(lists)) n[k] = arr.map((it, i) => npcItem(it, k.slice(0, 2), i, who));
    return n;
  };
  // Criatura → ficha de criatura 5e
  function npcActor(m, e) {
    const dv = [].concat(m.senses || []).map(String).join(' ').match(/darkvision (\d+)/i);
    const R = App.Regras5e;
    const a = {
      kind: m.isNpc ? 'npc' : 'monster', name: m.name, img: null, color: B.colorOf(e || m), size: TOKEN[[].concat(m.size || ['M'])[0]] || 1, owner: '',
      bars: [], stats: [], actions: [], testFormula: '1d20+@valor', initFormula: '1d20', notes: '',
      darkvision: dv ? Math.round(Number(dv[1]) / 5) : 0, hpDice: m.hp && m.hp.formula ? m.hp.formula.replace(/\s+/g, '') : null,
      imgStyle: 'token', source: '5etools', bestiaryId: (m.name + '|' + m.source).toLowerCase(), dados5e: JSON.parse(JSON.stringify(m)),
    };
    const d = R.blank(/^X/.test(String(m.source || '')) ? '2024' : '2014');
    for (const k of SHORT) d.abil[k] = m[k] != null ? Number(m[k]) : 10;
    d.npc = B.toNpc(m);
    d.tamanho = d.npc.size;
    a.dnd5e = d;
    R.apply(a);
    return a;
  }
  B.toNpcActor = npcActor;
  // Fichas antigas do bestiário (genéricas, com a criatura em dados5e) → ficha de criatura 5e
  // Fica: nome, imagem, dono, tipo, tamanho, cor, PV atual, dados de vida, notas e as ações feitas à mão
  B.upgrade = function (a) {
    if (!a || a.sistema || !a.dados5e || !App.Regras5e) return false;
    const n = npcActor(a.dados5e, null);
    const pv = (a.bars || []).find((b) => /^pv$/i.test(b.name));
    n.dnd5e.npc.extra = (a.actions || []).map((x) => JSON.parse(JSON.stringify(x)));
    for (const k of ['kind', 'name', 'img', 'owner', 'size', 'color', 'imgStyle', 'hpDice', 'rollHp', 'height', 'coverShow', 'mineId', 'bestiaryId']) if (a[k] !== undefined) n[k] = a[k];
    if (a.notes && a.notes !== B.blockText(a.dados5e)) n.dnd5e.bio.notas = a.notes;
    const keep = { id: a.id };
    for (const k of Object.keys(a)) delete a[k];
    Object.assign(a, n, keep);
    App.Regras5e.apply(a);
    if (pv) { const b = a.bars.find((x) => x.name === 'PV'); if (b) b.value = Math.max(0, Math.min(b.max, Number(pv.value) || 0)); }
    return true;
  };

  // ---------- Criatura → ficha genérica (antes do Plano 53; ainda usada quando a ficha 5e não carregou) ----------
  const TYPE_COLOR = { aberration: '#7a4fa8', beast: '#6b8f4e', celestial: '#c9a44a', construct: '#7c8794', dragon: '#b04848', elemental: '#3f8f86', fey: '#5fae8a', fiend: '#8a3a3a', giant: '#9b6b3c', humanoid: '#5b7fbf', monstrosity: '#a0683b', ooze: '#6c9a3a', plant: '#4e7d3a', undead: '#6b6f80' };
  B.colorOf = (e) => TYPE_COLOR[String((e && (e.ty || typeText(e.type))) || '').split(/[ /(]/)[0]] || '#6b7280';
  const STAT = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'];
  B.toActor = function (m, e) {
    if (App.Regras5e) return npcActor(m, e);
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
  B.saveMine = async function (actor, imgData, artData) {
    const c = U.clone(actor);
    const id = c.mineId || U.uid('mb_');
    c.mineId = id; delete c.id; c.owner = '';
    B.mine[id] = { actor: c, img: imgData ? binaryAsset(imgData) : null, art: artData ? binaryAsset(artData) : null, savedAt: Date.now() };
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
      B.upgrade(a); // Plano 53: as salvas antes viram ficha de criatura 5e
      if (mine.img) {
        const id = a.img || await App.Images.idOf(mine.img);
        if (!S().assets[id]) {
          setAsset(S().assets, id, mine.img);
          App.Net.sendAsset(id, S().assets[id]);
        }
        a.img = id;
      }
      // Plano 74: a imagem do personagem salva junto
      if (mine.art) {
        const id = a.art || await App.Images.idOf(mine.art);
        if (!S().assets[id]) { setAsset(S().assets, id, mine.art); App.Net.sendAsset(id, S().assets[id]); }
        a.art = id;
      } else a.art = null;
    } else {
      const m = await B.full(e);
      if (!m) throw new Error('Não achei ' + e.n + ' no arquivo do livro.');
      a = B.toActor(m, e);
      try { const f = await B.imageFile(e); if (f) a.img = (await App.Images.add(f, App.Images.TOKEN)).id; }
      catch (err) { U.toast('Sem imagem para ' + e.n + ': ' + err.message, 'error'); }
      // Plano 74: a ilustração do 5etools vira a imagem do personagem (sem internet, fica só o token)
      try { const f = await B.artFile(m); if (f) a.art = (await App.Images.add(f, App.Images.ART)).id; }
      catch (err) { console.warn('ilustração', err); }
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
  B.thumb = function (e, size, urls, mine) {
    const letter = (e?.n || '?').slice(0, 1).toUpperCase();
    const el = h('div', { class: 'avatar bst-thumb', style: { width: size + 'px', height: size + 'px', fontSize: size * 0.42 + 'px', background: U.hexA(e ? B.colorOf(e) : '#6b7280', 1) } },
      letter);
    const put = (src) => {
      el.replaceChildren(h('img', { src, alt: '', loading: 'lazy', onerror: () => { el.textContent = letter; } }));
    };
    if (mine?.img) put(urls.src('mine:' + mine.actor.mineId, mine.img));
    else if (e) {
      const image = B.imageOf(e);
      if (image?.path) void B.file(image.path).then((file) => {
        if (file && el.isConnected) put(urls.src(U.uid('bst_img_'), file));
      });
      else if (image?.url) put(image.url);
    }
    return el;
  };

  B.open = async function () {
    const UI = App.UI;
    if (!S().gmView()) { U.toast('O bestiário é do mestre.'); return; }
    const w = UI.openWindow('bestiary', 'Bestiário', (win) => (win.root ? null : (win.root = h('div', { class: 'bst' }, h('p', { class: 'muted' }, 'Abrindo o bestiário…')))), { w: Math.min(1040, window.innerWidth - 24), icon: 'book-open' });
    w.imageUrls ||= new ImageUrls();
    w.el.classList.add('bst-win');
    try {
      const [{ renderBestiary }] = await Promise.all([import('./bestiary-window.js'), B.load()]);
      if (UI.windows.get('bestiary') !== w) return;
      const draw = () => renderBestiary(w, App, { CR, SIZES, SHORT, sizeText, typeOf, alignOf, crText, lines, units, clean, sign, mod, sections, text, renderEntries });
      if (!w.off) {
        const unsubscribe = B.on(draw);
        w.off = () => { unsubscribe(); w.imageUrls.clear(); };
      }
      draw();
    } catch (err) {
      w.root.replaceChildren(h('p', { class: 'muted' }, err.message),
        btnI('refresh-cw', 'Tentar novamente', { onclick: () => B.open() }));
    }
  };

})(window.App);
