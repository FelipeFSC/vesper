'use strict';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import CatalogList from '../src/ui/CatalogList.svelte';
/*
 * Página de cadastros (cadastros.html, Planos 42 e 43). Nome provisório no menu: "test".
 * Cada aba do topo é um cadastro: Ataques, Itens (as armas são itens da categoria Weapon), Magias, Talentos, Antecedentes, Espécies, Opções de classe, Classes e Subclasses.
 * - Subclasses (Plano 50): ligadas à classe; características por nível, magias, conjuração própria e opções por nível
 *   (os editores das classes); as de 2014 também aparecem na classe de 2024, como no 5etools ("copyOf").
 * - Classes (Plano 49): as 26 classes base; progressão 1–20 em grade editável (proficiência, colunas da classe, truques, preparadas,
 *   espaços 1º–9º ou de pacto), características por nível (com marcas: aumento de atributo, característica da subclasse),
 *   opções e talentos por nível, conjuração, multiclasse, proficiências e equipamento iniciais.
 * - Opções de classe (Plano 48): invocações, manobras, metamagia…; tipos com a classe ("Eldritch Invocation · Warlock"), custo (recurso e quantidade),
 *   pré-requisitos novos (magia ligada, pacto, item, outra opção) que valem para todos os cadastros.
 * - Espécies (Plano 47): corpo (tamanho, deslocamentos, idade, altura/peso), benefícios, talento, traços (nome e texto) e opções
 *   (sub-raças 2014 / linhagens 2024) dentro da espécie, cada uma só com o que muda; "Ver com a opção" mostra a combinação.
 * - Antecedentes (Plano 46): talento (ligado a Talentos), equipamento inicial (grupos A/B, itens ligados a Itens ou texto, ouro),
 *   característica e características sugeridas (tabelas com dado); variantes com "Variante de…".
 * - Talentos (Plano 44): pré-requisitos ([[E…] OU […]]) e benefícios (atributos, proficiências, especialização, magias, sentidos,
 *   defesas, opções de classe) no formato de tools/cadastros-beneficios.mjs; os editores (prereqEditor, benefitsEditor) servem
 *   também para antecedentes, espécies e classes.
 * - Padrões: data/cadastros/<cadastro>.json, gerados do 5etools por tools/importar-cadastros.mjs
 *   (o .js de mesmo nome tem o mesmo conteúdo, para abrir sem servidor).
 * - O que a pessoa muda fica neste navegador (IndexedDB 'mesarpg', chave 'cadastros'):
 *   { attacks: { custom: {id: registro}, edited: {id: registro}, deleted: [ids] }, items: {...} }
 *   Padrão editado vai para 'edited' (o original continua no .json); padrão apagado vai para 'deleted'.
 * - Itens (Plano 43, regras do catálogo descritas no ITEM_JSON_CONTEXT.md):
 *   kind 'base' (mundano), 'item', 'family' (variante: "+1 Weapon", com as bases compatíveis) e 'group' (versões).
 *   Versões de grupo (memberOf) não aparecem soltas na lista; abrem pelo grupo.
 * - Ataque de arma e de magia: não é gravado; é montado a partir do item ou da magia (aparece em Ataques com o selo "da arma" / "da magia").
 * - Magias (Plano 45): nível, escola, conjuração, efeito, nível superior, classes; sem o livro WoW (decisão do usuário).
 * - Exportar/Importar: só o que é deste navegador (formato 'vesper-cadastros').
 * Textos dos dados em inglês, como no 5etools; medidas guardadas em metros e quilos (Plano 40), preço em peças de cobre.
 * Nada aqui está ligado à ficha nem à mesa ainda.
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const $ = (s) => document.querySelector(s);
  const ic = (n, cls) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n, cls); return t.content.firstChild; };
  const btnI = (icon, label, attrs = {}) => h('button', Object.assign({ class: 'btn' }, attrs), ic(icon), label);
  const Units = App.Units;
  const UI_KEY = 'vesper-cadastros-ui';
  const listState = writable();
  const profile = new URLSearchParams(location.search).has('perf');
  let listComponent, listTab, listId = null;
  const listScroll = new Map();

  // ---------- Vocabulário (em inglês, como o 5etools) ----------
  const ABIL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const ATK_ABIL = Object.assign({}, ABIL, { best: 'STR or DEX', spell: 'Spellcasting', none: 'None' });
  const SAVE_ABIL = Object.assign({}, ABIL, { 'str-dex': 'STR or DEX (target chooses)' });
  const DC_ABIL = Object.assign({}, ABIL, { spell: 'Spellcasting', none: 'None' });
  const PROF = { none: 'Not proficient', prof: 'Proficient', expert: 'Expertise' };
  const TYPES = { melee: 'Melee', ranged: 'Ranged', 'spell-attack': 'Spell Attack', 'spell-save': 'Spell Save', 'attack-save': 'Attack Save' };
  const HAS_ATTACK = (t) => t === 'melee' || t === 'ranged' || t === 'spell-attack';
  const DMG_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
  const DMG_OPTS = Object.assign({ '': 'Choose' }, Object.fromEntries(DMG_TYPES.map((x) => [x, x[0].toUpperCase() + x.slice(1)])));
  const AREAS = { '': 'None', cone: 'Cone', line: 'Line', cube: 'Cube', sphere: 'Sphere', cylinder: 'Cylinder', emanation: 'Emanation' };
  const ORIGINS = { weapon: 'Weapon (do item)', spell: 'Spell (da magia)', basic: 'Basic rules', species: 'Species', custom: 'Custom' };
  const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
  const LEVELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  const LEVEL_PT = ['Truque', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º'];
  const TIME_UNITS = { action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction', minute: 'Minute', hour: 'Hour', round: 'Round', day: 'Day', special: 'Special' };
  const RANGE_KINDS = { distance: 'Distance', self: 'Self', touch: 'Touch', sight: 'Sight', unlimited: 'Unlimited', special: 'Special' };
  const DUR_TYPES = { instant: 'Instantaneous', timed: 'Timed', permanent: 'Until dispelled / permanent', special: 'Special' };
  const DUR_UNITS = { round: 'Round', minute: 'Minute', hour: 'Hour', day: 'Day' };
  const SPELL_AREAS = Object.assign({}, AREAS, { hemisphere: 'Hemisphere', wall: 'Wall' });
  const FEAT_CATS = ['Origin', 'General', 'Fighting Style', 'Fighting Style (Paladin)', 'Fighting Style (Ranger)', 'Epic Boon', 'Dragonmark', 'Dark Gift', 'Uncategorized'];
  const PRE_TYPES = { level: 'Nível', ability: 'Atributo mínimo', species: 'Espécie', feat: 'Talento', background: 'Antecedente', feature: 'Característica', proficiency: 'Proficiência', spellcasting: 'Conjuração', spell: 'Magia conhecida', pact: 'Pacto', item: 'Item', option: 'Opção de classe', campaign: 'Campanha', other: 'Outro' };
  const PROF_KINDS = { skill: 'Skills', tool: 'Tools', language: 'Languages', weapon: 'Weapons', armor: 'Armor', save: 'Saving throws', skillToolLanguage: 'Skills, tools or languages' };
  const SPELL_HOW = { known: 'Known', prepared: 'Always prepared', innate: 'Cast without a slot', expanded: 'Added to the spell list' };
  const SENSES = ['darkvision', 'blindsight', 'tremorsense', 'truesight'];
  const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
  const PROPS = ['Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Reach', 'Special', 'Thrown', 'Two-Handed', 'Versatile', 'Burst Fire', 'Reload'];
  const MASTERIES = ['Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'];
  const CATS = ['Weapon', 'Armor', 'Ammunition', 'Potion', 'Scroll', 'Ring', 'Rod', 'Staff', 'Wand', 'Spellcasting Focus', 'Instrument', 'Tool', 'Adventuring Gear',
    'Explosive', 'Food and Drink', 'Mount', 'Vehicle', 'Gem', 'Trade Good', 'Amulet', 'Apparel', 'Bag/Container', 'Clockwork', 'Tome', 'Summonable', 'Service',
    'Consumable', 'Poison', 'Tattoo', 'Cursed', 'Wondrous', 'Other'];
  const CAT_ICON = { Weapon: 'sword', Armor: 'shield', Ammunition: 'target', Potion: 'flask-conical', Scroll: 'scroll-text', Ring: 'circle', Rod: 'wand', Staff: 'wand', Wand: 'wand',
    'Spellcasting Focus': 'sparkles', Instrument: 'music', Tool: 'hammer', 'Adventuring Gear': 'backpack', Gem: 'gem', 'Trade Good': 'coins', Amulet: 'gem', Apparel: 'shirt',
    'Bag/Container': 'backpack', Tome: 'book-open', Consumable: 'flask-conical', Vehicle: 'sailboat', Mount: 'footprints', Wondrous: 'sparkles' };
  const RARITIES = ['None', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies', 'Unknown'];
  const ESTIMATE = { Common: 100, Uncommon: 400, Rare: 4000, 'Very Rare': 40000, Legendary: 200000 }; // gp
  const KINDS = { base: 'Base', item: 'Item', family: 'Família', group: 'Grupo' };
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
  const sign = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const num = (v, d = 0) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const DICE_RE = /^\s*(\d+\s*(d\s*\d+)?)(\s*[+-]\s*\d+(\s*d\s*\d+)?)*\s*$/i;
  const rarClass = (r) => 'rar-' + String(r || '').toLowerCase().replace(/\s+/g, '-');

  // ---------- Estado ----------
  const C = { defaults: {}, sources: {}, local: {}, tab: 'attacks', sel: {}, filters: {}, q: {}, famBase: {}, optView: {}, optOpen: {}, featOpen: {}, descEdit: false, loaded: false };
  App.Cadastros = C;

  // ---------- IndexedDB (mesmo banco da página "Criar ficha") ----------
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('mesarpg', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function idbGet(key) {
    const d = await db();
    return new Promise((res, rej) => { const q = d.transaction('kv', 'readonly').objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async function idbSet(key, val) {
    const d = await db();
    return new Promise((res, rej) => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }
  const local = (tab) => (C.local[tab] = C.local[tab] || { custom: {}, edited: {}, deleted: [] });
  // Nunca grava antes de ler o que já estava salvo (senão um banco lento apagaria o que a pessoa tinha)
  let loadP = null, dbBroken = false;
  async function saveNow() {
    try { await loadP; } catch { /* */ }
    if (dbBroken) { U.toast('O salvamento do navegador não abriu: use Exportar para não perder o que mudou.', 'error', 6000); return; }
    try {
      await idbSet('cadastros', Object.assign({ v: 2, savedAt: Date.now() }, C.local));
      const el = $('#fp-saved');
      if (el) { el.textContent = 'Salvo neste navegador · ' + U.fmtTime(); el.classList.add('on'); }
    } catch (e) { U.toast('Erro ao salvar no navegador: ' + e.message, 'error'); }
  }
  const saveDeb = U.debounce(saveNow, 300);
  let ver = 0;
  const save = () => { ver++; saveDeb(); };
  C.saveNow = saveNow;
  function saveUi() {
    try { localStorage.setItem(UI_KEY, JSON.stringify({ tab: C.tab, sel: C.sel, filters: C.filters, q: C.q })); } catch { /* */ }
  }

  // ---------- Padrões (data/cadastros) ----------
  function script(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('não achei ' + src)); document.head.append(s); });
  }
  async function loadDefaults(file, key) {
    let data = null;
    try { const r = await fetch('data/cadastros/' + file + '.json', { cache: 'no-cache' }); if (r.ok) data = await r.json(); } catch { /* aberto direto do arquivo: usa o .js */ }
    if (!data) {
      try { await script('data/cadastros/' + file + '.js'); data = (window.VesperCadastros || {})[key] || null; } catch { data = null; }
    }
    if (!data) return [];
    Object.assign(C.sources, data.sources || {});
    if (data.types) C.optTypes = Object.assign(C.optTypes || {}, data.types);
    return (data[key] || []).map((r) => Object.assign(r, { _default: true }));
  }

  // ---------- Registros ----------
  const memo = {};
  const defIndex = {};
  function defaultOf(tab, id) {
    if (!defIndex[tab]) defIndex[tab] = new Map((C.defaults[tab] || []).map((d) => [d.id, d]));
    return defIndex[tab].get(id) || null;
  }
  // Lista atual de um cadastro: padrões (menos apagados, trocados pelos editados) + os criados aqui
  function records(tab) {
    if (memo[tab] && memo[tab].ver === ver) return memo[tab].list;
    const L = local(tab), del = new Set(L.deleted);
    const out = [];
    for (const d of C.defaults[tab] || []) {
      if (del.has(d.id)) continue;
      out.push(L.edited[d.id] ? Object.assign(clone(L.edited[d.id]), { _default: true, _edited: true }) : d);
    }
    for (const c of Object.values(L.custom)) out.push(Object.assign(clone(c), { _custom: true }));
    // Ataques das armas: montados a partir dos itens (não são gravados)
    if (tab === 'attacks') {
      for (const it of records('items')) if (it.weapon && it.kind !== 'family' && it.kind !== 'group') out.push(weaponAttack(it));
      for (const sp of records('spells')) if (sp.attack || sp.save) out.push(spellAttack(sp));
    }
    memo[tab] = { ver, list: out, byId: new Map(out.map((r) => [r.id, r])) };
    return out;
  }
  const find = (tab, id) => { records(tab); return memo[tab].byId.get(id) || null; };
  const plain = (r) => { const o = clone(r); for (const k of Object.keys(o)) if (k[0] === '_') delete o[k]; return o; };

  // Grava um registro (padrão vira "editado"; criado aqui fica em "custom")
  function put(tab, rec) {
    const L = local(tab), o = plain(rec);
    if (L.custom[o.id] || !defaultOf(tab, o.id)) L.custom[o.id] = o;
    else L.edited[o.id] = o;
    save();
  }
  function remove(tab, id) {
    const L = local(tab);
    const before = { custom: L.custom[id], edited: L.edited[id] };
    if (L.custom[id]) delete L.custom[id];
    else { delete L.edited[id]; if (!L.deleted.includes(id)) L.deleted.push(id); }
    save();
    return () => { // desfazer
      if (before.custom) L.custom[id] = before.custom;
      else { L.deleted = L.deleted.filter((x) => x !== id); if (before.edited) L.edited[id] = before.edited; }
      save(); C.sel[tab] = id; render();
    };
  }

  // ---------- Ataque montado a partir de uma arma (Plano 43, opção A) ----------
  const plus = (dice, b) => (b ? dice + (b > 0 ? '+' : '-') + Math.abs(b) : dice);
  function weaponAttack(it) {
    const w = it.weapon || {}, props = w.properties || [];
    const ab = props.includes('Finesse') ? 'best' : w.kind === 'ranged' ? 'dex' : 'str';
    const dmg = [];
    if (w.damage && w.damage.dice) dmg.push({ dice: plus(w.damage.dice, num(w.bonusDamage)), ability: ab, type: w.damage.type || '' });
    for (const d of w.extraDamage || []) if (d && d.dice) dmg.push({ dice: d.dice, ability: 'none', type: d.type || '' });
    return {
      id: 'w:' + it.id, _virtual: 'weapon', _from: 'items', _item: it.id, _custom: it._custom, name: it.name, source: it.source, page: it.page, edition: it.edition || '',
      origin: 'weapon', originName: it.name, type: w.kind === 'ranged' ? 'ranged' : 'melee',
      reach: w.kind === 'ranged' ? null : w.reach, range: w.kind === 'ranged' || props.includes('Thrown') ? w.range : null, area: null,
      attack: { ability: ab, bonus: num(w.bonusAttack), prof: 'prof' },
      save: { ability: 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'half', effect: '' }, saveOnHit: false,
      damage: dmg, versatile: w.versatile ? plus(w.versatile, num(w.bonusDamage)) : '', crit: w.critThreshold || 20, critExtra: '', ammo: w.ammo || '', uses: '', weapon: it.id,
      description: it.description || '',
    };
  }

  // ---------- Ataque montado a partir de uma magia (Plano 45) ----------
  function spellAttack(sp) {
    const dmg = (sp.damage || []).filter((d) => d && d.dice).slice(0, 2).map((d) => ({ dice: d.dice, ability: 'none', type: d.type || '' }));
    const rng = sp.range || {};
    const lvl = sp.level === 0 ? 'Cantrip' : LEVELS[sp.level] + '-level';
    return {
      id: 's:' + sp.id, _virtual: 'spell', _from: 'spells', _item: sp.id, _custom: sp._custom, name: sp.name, source: sp.source, page: sp.page, edition: sp.edition || '',
      origin: 'spell', originName: sp.name, type: sp.attack ? 'spell-attack' : 'spell-save',
      reach: null, range: rng.kind === 'distance' && rng.distance ? { normal: rng.distance, long: null } : rng.kind === 'touch' ? { normal: 1.5, long: null } : null,
      area: sp.area && sp.area.shape ? { shape: sp.area.shape, size: sp.area.size, width: sp.area.width || null } : null,
      attack: { ability: 'spell', bonus: 0, prof: 'prof' },
      save: { ability: sp.save || 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'spell', dcBonus: 0, onSuccess: sp.onSuccess || 'none', effect: (sp.conditions || []).length ? 'Conditions: ' + sp.conditions.join(', ') + '.' : '' },
      saveOnHit: !!(sp.attack && sp.save),
      damage: dmg, versatile: '', crit: 20, critExtra: '', ammo: '',
      uses: lvl + (sp.higher && sp.higher.perSlot ? ' · +' + sp.higher.perSlot + '/slot level' : sp.higher && sp.higher.cantrip ? ' · ' + Object.entries(sp.higher.cantrip).map(([l, d]) => d + ' (' + l + ')').join(', ') : ''),
      weapon: '', description: sp.description || '',
    };
  }

  // ---------- Textos curtos ----------
  const dist = (m) => (m == null || m === '' ? '' : Units.dist(Number(m)));
  const rangeTxt = (r) => (r && r.normal ? (r.long && r.long !== r.normal ? Units.dist(r.normal).replace(/ (m|pés?|km|milhas?)$/, '') + '/' + Units.dist(r.long) : Units.dist(r.normal)) : '');
  function dmgTxt(d) {
    if (!d || !d.dice) return '';
    const ab = d.ability && d.ability !== 'none' ? ' + ' + (ATK_ABIL[d.ability] || d.ability) : '';
    return d.dice + ab + (d.type ? ' ' + d.type : '');
  }
  function costTxt(cp) {
    if (cp == null || cp === '') return '';
    const gp = cp / 100;
    if (cp >= 100 && cp % 100 === 0) return gp.toLocaleString('pt-BR') + ' gp';
    if (cp >= 10 && cp % 10 === 0) return cp / 10 + ' sp';
    return cp + ' cp';
  }
  const srcName = (s) => (s === 'custom' ? 'Custom' : C.sources[s] || s);
  const dcTxt = (sv) => (sv.dc === 'fixed' ? 'DC ' + (sv.dcFixed || 10) : 'DC 8 + Prof' + (sv.dcAbility && sv.dcAbility !== 'none' ? ' + ' + DC_ABIL[sv.dcAbility] : '') + (num(sv.dcBonus) ? ' ' + sign(num(sv.dcBonus)) : ''));
  function atkTxt(a) {
    const at = a.attack || {};
    const parts = [];
    if (at.ability && at.ability !== 'none') parts.push(ATK_ABIL[at.ability]);
    if (at.prof === 'prof') parts.push('Prof'); else if (at.prof === 'expert') parts.push('2×Prof');
    if (num(at.bonus)) parts.push(String(num(at.bonus)));
    return parts.length ? parts.join(' + ').replace('+ -', '− ') : '+0';
  }
  // Exemplo de personagem para mostrar o "= +4" sem ficha ligada
  const EX = { str: 3, dex: 2, con: 1, int: 0, wis: 1, cha: 0, spell: 3, best: 3, none: 0, prof: 2 };
  function exAttack(a) {
    const at = a.attack || {};
    return (EX[at.ability] || 0) + (at.prof === 'prof' ? EX.prof : at.prof === 'expert' ? EX.prof * 2 : 0) + num(at.bonus);
  }
  function exDc(sv) { return sv.dc === 'fixed' ? num(sv.dcFixed, 10) : 8 + EX.prof + (EX[sv.dcAbility] || 0) + num(sv.dcBonus); }
  function exDmg(d) {
    if (!d || !d.dice) return '';
    const m = EX[d.ability] || 0;
    return d.dice + (m ? ' ' + sign(m).replace('+', '+ ').replace('−', '− ') : '');
  }
  const weightTxt = (kg) => (kg == null || kg === '' ? '' : Units.weight(kg));
  const attuneTxt = (a) => (a === true ? 'Requires attunement' : a ? 'Requires attunement ' + a : '');
  function weaponLine(w, bonus) {
    if (!w || !w.damage || !w.damage.dice) return '';
    const b = num(w.bonusDamage) + num(bonus);
    return plus(w.damage.dice, b) + ' ' + (w.damage.type || '') + (w.versatile ? ' (' + plus(w.versatile, b) + ' two-handed)' : '');
  }

  // ---------- Definição de cada cadastro ----------
  const TABS = {
    attacks: {
      label: 'Ataques', icon: 'swords', one: 'ataque', novo: 'Novo ataque', um: 'um',
      blank: () => ({
        id: U.uid('atk_'), name: 'New attack', source: 'custom', page: null, edition: '', origin: 'custom', originName: '',
        type: 'melee', reach: 1.5, range: null, area: null,
        attack: { ability: 'str', bonus: 0, prof: 'prof' },
        save: { ability: 'dex', dc: 'calc', dcFixed: 10, dcAbility: 'con', dcBonus: 0, onSuccess: 'half', effect: '' }, saveOnHit: false,
        damage: [{ dice: '1d6', ability: 'str', type: 'bludgeoning' }], versatile: '', crit: 20, critExtra: '', ammo: '', uses: '', weapon: '', description: '',
      }),
      filters: () => [
        ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024' }],
        ['type', 'Tipo', Object.assign({ '': 'Todos' }, TYPES)],
        ['origin', 'Origem', Object.assign({ '': 'Todas' }, ORIGINS)],
        ['source', 'Fonte', null],
      ],
      text: (a) => [a.name, a.originName, TYPES[a.type], a.source, srcName(a.source), (a.damage || []).map((d) => d.type).join(' '), a.uses, a.edition, a._virtual ? 'weapon arma' : ''].join(' '),
      match: (a, f) => (!f.edition || a.edition === f.edition) && (!f.type || a.type === f.type) && (!f.origin || (f.origin === 'custom' ? a._custom && !a._virtual : a.origin === f.origin)) && (!f.source || a.source === f.source),
      summary(a) {
        const where = a.type === 'melee' ? dist(a.reach) : rangeTxt(a.range) || (a.area && a.area.shape ? dist(a.area.size) + ' ' + a.area.shape : '');
        const hit = HAS_ATTACK(a.type) ? atkTxt(a) : dcTxt(a.save || {}).replace('DC 8 + Prof + ', 'DC ');
        return [TYPES[a.type], where, hit, dmgTxt((a.damage || [])[0])].filter(Boolean).join(' · ');
      },
      form: attackForm,
    },
    items: {
      label: 'Itens', icon: 'backpack', one: 'item', novo: 'Novo item', um: 'um',
      blank: () => {
        const cat = (C.filters.items || {}).cat;
        const r = { id: U.uid('itm_'), kind: 'item', name: 'New item', source: 'custom', page: null, edition: '', category: cat || 'Other', categories: [cat || 'Other'],
          rarity: 'None', magic: false, attune: false, weight: null, cost: null, costOrigin: null, description: '' };
        if (cat === 'Weapon') r.weapon = blankWeapon();
        if (cat === 'Armor') r.armor = blankArmor();
        return r;
      },
      filters: (f) => [
        ['kind', 'Tipo', { '': 'Todos', magic: 'Mágicos', mundane: 'Mundanos', family: 'Famílias (variantes)', group: 'Grupos', mine: 'Criados por mim' }],
        ['rarity', 'Raridade', Object.assign({ '': 'Todas' }, Object.fromEntries(RARITIES.map((r) => [r, r])))],
        ['attune', 'Sintonização', { '': 'Todas', yes: 'Exige', no: 'Não exige' }],
        ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024', none: 'Sem edição' }],
        ['source', 'Fonte', null],
        f.cat === 'Weapon' ? ['prop', 'Propriedade', Object.assign({ '': 'Todas' }, Object.fromEntries(PROPS.concat(MASTERIES.map((m) => 'Mastery: ' + m)).map((p) => [p, p])))] : null,
        f.cat === 'Armor' ? ['armor', 'Armadura', { '': 'Todas', light: 'Light', medium: 'Medium', heavy: 'Heavy', shield: 'Shield' }] : null,
      ].filter(Boolean),
      text: itemText,
      match(r, f) {
        if (r.memberOf && !f._members) return false;
        if (f.cat && !(r.categories || [r.category]).includes(f.cat)) return false;
        if (f.kind === 'magic' && !r.magic) return false;
        if (f.kind === 'mundane' && r.magic) return false;
        if ((f.kind === 'family' || f.kind === 'group') && r.kind !== f.kind) return false;
        if (f.kind === 'mine' && !r._custom) return false;
        if (f.rarity && r.rarity !== f.rarity && !(r.rarities || []).includes(f.rarity)) return false;
        if (f.attune === 'yes' && !r.attune) return false;
        if (f.attune === 'no' && r.attune) return false;
        if (f.edition && (f.edition === 'none' ? r.edition : r.edition !== f.edition)) return false;
        if (f.source && r.source !== f.source) return false;
        if (f.prop) {
          const w = r.weapon || {};
          if (f.prop.startsWith('Mastery: ') ? !(w.mastery || []).includes(f.prop.slice(9)) : !(w.properties || []).includes(f.prop)) return false;
        }
        if (f.armor && !(r.armor && r.armor.type === f.armor)) return false;
        return true;
      },
      summary(r) {
        if (r.kind === 'family') return ['Família', (r.bases || []).length + ' bases', r.rarity, r.requires].filter(Boolean).join(' · ');
        if (r.kind === 'group') return ['Grupo', (r.versions || []).length + ' versões', (r.rarities || []).join('/')].filter(Boolean).join(' · ');
        return [r.category, r.magic || r.rarity !== 'None' ? r.rarity : '', r.attune ? 'attunement' : '',
          r.weapon ? weaponLine(r.weapon) : r.armor ? 'AC ' + (r.armor.type === 'shield' ? '+' : '') + (num(r.armor.ac) + num(r.armor.bonusAc)) : '',
          costTxt(r.cost)].filter(Boolean).join(' · ');
      },
      form: itemForm,
    },
  };
  TABS.spells = {
    label: 'Magias', icon: 'sparkles', one: 'magia', novo: 'Nova magia', um: 'uma',
    blank: () => {
      const lv = (C.filters.spells || {}).level;
      return { id: U.uid('spl_'), name: 'New spell', source: 'custom', page: null, edition: '', level: lv !== '' && lv != null ? Number(lv) : 1, school: 'Evocation', ritual: false,
        time: { number: 1, unit: 'action', condition: '' }, range: { kind: 'distance', distance: 18 }, area: null,
        components: { v: true, s: true, m: false, material: '', cost: null, consume: false },
        duration: { type: 'instant', amount: null, unit: '', concentration: false, ends: '' },
        attack: '', save: '', saveAlso: [], onSuccess: 'none', damage: [], heal: '', conditions: [],
        higher: { perSlot: '', perSlotHeal: '', cantrip: null, text: '' }, classes: [], classesExpanded: [], subclasses: [], grantedBy: {}, description: '' };
    },
    filters: () => [
      ['school', 'Escola', Object.assign({ '': 'Todas' }, Object.fromEntries(SCHOOLS.map((x) => [x, x])))],
      ['cls', 'Classe', null],
      ['time', 'Conjuração', { '': 'Todas', action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction', long: '1 minuto ou mais' }],
      ['effect', 'Efeito', { '': 'Todos', attack: 'Ataque de magia', save: 'Teste de resistência', damage: 'Causa dano', heal: 'Cura', condition: 'Causa condição' }],
      ['dmg', 'Tipo de dano', Object.assign({ '': 'Todos' }, Object.fromEntries(DMG_TYPES.map((x) => [x, x[0].toUpperCase() + x.slice(1)])))],
      ['flag', 'Marcas', { '': 'Todas', conc: 'Concentração', noconc: 'Sem concentração', ritual: 'Ritual', cost: 'Material com custo', mine: 'Criadas por mim' }],
      ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024' }],
      ['source', 'Fonte', null],
    ],
    text: spellText,
    match(r, f) {
      if (f.level !== '' && f.level != null && String(r.level) !== String(f.level)) return false;
      if (f.school && r.school !== f.school) return false;
      if (f.cls && !(r.classes || []).includes(f.cls) && !(r.classesExpanded || []).includes(f.cls) && !(r.subclasses || []).some((x) => x.startsWith(f.cls + ':'))) return false;
      const u = (r.time || {}).unit;
      if (f.time === 'long' ? !['minute', 'hour', 'day'].includes(u) : f.time && u !== f.time) return false;
      if (f.effect === 'attack' && !r.attack) return false;
      if (f.effect === 'save' && !r.save) return false;
      if (f.effect === 'damage' && !(r.damage || []).length) return false;
      if (f.effect === 'heal' && !r.heal) return false;
      if (f.effect === 'condition' && !(r.conditions || []).length) return false;
      if (f.dmg && !(r.damage || []).some((d) => d.type === f.dmg)) return false;
      const d = r.duration || {}, c = r.components || {};
      if (f.flag === 'conc' && !d.concentration) return false;
      if (f.flag === 'noconc' && d.concentration) return false;
      if (f.flag === 'ritual' && !r.ritual) return false;
      if (f.flag === 'cost' && !c.cost) return false;
      if (f.flag === 'mine' && !r._custom) return false;
      if (f.edition && r.edition !== f.edition) return false;
      if (f.source && r.source !== f.source) return false;
      return true;
    },
    summary(r) {
      return [r.level === 0 ? 'Cantrip' : LEVELS[r.level], r.school, timeTxt(r.time), rangeSpellTxt(r), r.attack ? (r.attack === 'melee' ? 'melee' : 'ranged') + ' attack' : r.save ? ABIL[r.save] + ' save' : '',
        (r.damage || []).filter((x) => x.dice).map((x) => x.dice + ' ' + x.type).join(' + ') || (r.heal ? 'heal ' + r.heal : '')].filter(Boolean).join(' · ');
    },
    form: spellForm,
  };
  TABS.feats = {
    label: 'Talentos', icon: 'award', one: 'talento', novo: 'Novo talento', um: 'um',
    blank: () => ({ id: U.uid('fet_'), name: 'New feat', source: 'custom', page: null, edition: '', category: (C.filters.feats || {}).cat || 'General', repeatable: false, prerequisites: [], benefits: {}, description: '' }),
    filters: () => [
      ['pre', 'Pré-requisito', { '': 'Todos', none: 'Sem pré-requisito', level: 'Pede nível', ability: 'Pede atributo', species: 'Pede espécie', spellcasting: 'Pede conjuração', feature: 'Pede característica' }],
      ['gives', 'Dá', { '': 'Tudo', ability: 'Aumento de atributo', spells: 'Magias', prof: 'Proficiências', expertise: 'Especialização', senses: 'Sentidos', defense: 'Resistências/imunidades', options: 'Opções de classe' }],
      ['ab', 'Atributo que aumenta', Object.assign({ '': 'Todos' }, ABIL)],
      ['flag', 'Marcas', { '': 'Todas', repeatable: 'Repetível', mine: 'Criados por mim' }],
      ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024' }],
      ['source', 'Fonte', null],
    ],
    text: (r) => [r.name, r.category, r.source, srcName(r.source), r.edition, prereqTxt(r.prerequisites), benefitsTxt(r.benefits)].join(' '),
    match(r, fl) {
      const b = r.benefits || {}, P = r.prerequisites || [];
      if (fl.cat && r.category !== fl.cat) return false;
      if (fl.pre === 'none' && P.length) return false;
      if (fl.pre && fl.pre !== 'none' && !P.some((row) => row.some((c) => c.type === fl.pre))) return false;
      const g = { ability: b.ability, spells: b.spells, prof: b.proficiencies, expertise: b.expertise, senses: b.senses, defense: b.resist || b.immune || b.conditionImmune, options: b.options };
      if (fl.gives && !(g[fl.gives] && (!Array.isArray(g[fl.gives]) || g[fl.gives].length))) return false;
      if (fl.ab && !(b.ability || []).some((bl) => (bl.fixed && bl.fixed[fl.ab]) || (bl.choose && (bl.choose.from || []).includes(fl.ab)) || (bl.weighted && (bl.weighted.from || []).includes(fl.ab)))) return false;
      if (fl.flag === 'repeatable' && !r.repeatable) return false;
      if (fl.flag === 'mine' && !r._custom) return false;
      if (fl.edition && r.edition !== fl.edition) return false;
      if (fl.source && r.source !== fl.source) return false;
      return true;
    },
    summary: (r) => [r.category, r.repeatable ? 'repeatable' : '', (r.prerequisites || []).length ? 'Prereq: ' + prereqTxt(r.prerequisites) : '', benefitsTxt(r.benefits)].filter(Boolean).join(' · '),
    form: featForm,
  };
  TABS.backgrounds = {
    label: 'Antecedentes', icon: 'scroll-text', one: 'antecedente', novo: 'Novo antecedente', um: 'um',
    blank: () => ({ id: U.uid('bkg_'), name: 'New background', source: 'custom', page: null, edition: '', variantOf: null, prerequisites: [], benefits: {}, feats: [], equipment: [], feature: null, characteristics: null, description: '' }),
    filters: () => [
      ['gives', 'Dá', { '': 'Tudo', feat: 'Talento', spells: 'Magias', tool: 'Ferramenta', language: 'Idioma', feature: 'Característica (2014)', tables: 'Tabelas de personalidade' }],
      ['skill', 'Perícia', null],
      ['ab', 'Atributo', Object.assign({ '': 'Todos' }, ABIL)],
      ['flag', 'Marcas', { '': 'Todas', variant: 'É variante', original: 'Não é variante', mine: 'Criados por mim' }],
      ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024', none: 'Sem edição' }],
      ['source', 'Fonte', null],
    ],
    text: (r) => [r.name, r.source, srcName(r.source), r.edition, benefitsTxt(r.benefits), (r.feats || []).map((x) => x.name + ' ' + (x.choice || '')).join(' '), r.feature ? r.feature.name : '', r.variantOf ? 'variant' : ''].join(' '),
    match(r, fl) {
      const b = r.benefits || {};
      const kinds = (b.proficiencies || []).map((p) => p.kind);
      if (fl.gives === 'feat' && !(r.feats || []).length) return false;
      if (fl.gives === 'spells' && !b.spells) return false;
      if ((fl.gives === 'tool' || fl.gives === 'language') && !kinds.includes(fl.gives)) return false;
      if (fl.gives === 'feature' && !r.feature) return false;
      if (fl.gives === 'tables' && !(r.characteristics && (r.characteristics.tables || []).length)) return false;
      if (fl.skill && !(b.proficiencies || []).some((p) => p.kind === 'skill' && ((p.fixed || []).includes(fl.skill) || (p.choose && (p.choose.from || []).includes(fl.skill))))) return false;
      if (fl.ab && !(b.ability || []).some((bl) => (bl.fixed && bl.fixed[fl.ab]) || (bl.choose && (bl.choose.from || []).includes(fl.ab)) || (bl.weighted && (bl.weighted.from || []).includes(fl.ab)))) return false;
      if (fl.flag === 'variant' && !r.variantOf) return false;
      if (fl.flag === 'original' && r.variantOf) return false;
      if (fl.flag === 'mine' && !r._custom) return false;
      if (fl.edition && (fl.edition === 'none' ? r.edition : r.edition !== fl.edition)) return false;
      if (fl.source && r.source !== fl.source) return false;
      return true;
    },
    summary(r) {
      const b = r.benefits || {};
      const sk = (b.proficiencies || []).filter((p) => p.kind === 'skill').map(blockTxt).join(', ');
      return [r.variantOf ? 'variant' : '', (b.ability || []).length ? (b.ability[0].weighted ? (b.ability[0].weighted.from || []).map((a) => ABIL[a]).join('/') : abilityTxt(b.ability[0])) : '',
        (r.feats || []).map(featRefTxt).join(', '), sk].filter(Boolean).join(' · ');
    },
    form: backgroundForm,
  };
  const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
  const MOVES = { walk: 'Andar', fly: 'Voar', swim: 'Nadar', climb: 'Escalar', burrow: 'Escavar' };
  TABS.species = {
    label: 'Espécies', icon: 'users', one: 'espécie', novo: 'Nova espécie', um: 'uma',
    blank: () => ({ id: U.uid('spc_'), name: 'New species', source: 'custom', page: null, edition: '', size: ['Medium'], speed: { walk: 9 }, creatureTypes: ['humanoid'], benefits: {}, feats: [], traits: [], lineage: '', age: null, heightWeight: null, options: [], description: '' }),
    filters: () => [
      ['size', 'Tamanho', Object.assign({ '': 'Todos' }, Object.fromEntries(SIZES.map((x) => [x, x])))],
      ['move', 'Deslocamento', { '': 'Todos', fly: 'Voa', swim: 'Nada', climb: 'Escala', burrow: 'Escava' }],
      ['gives', 'Dá', { '': 'Tudo', darkvision: 'Visão no escuro', spells: 'Magias', feat: 'Talento', resist: 'Resistência', ability: 'Atributos (2014)', options: 'Tem sub-raças/linhagens' }],
      ['ctype', 'Tipo de criatura', null],
      ['flag', 'Marcas', { '': 'Todas', mine: 'Criadas por mim' }],
      ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024', none: 'Sem edição' }],
      ['source', 'Fonte', null],
    ],
    text: (r) => [r.name, r.source, srcName(r.source), r.edition, (r.size || []).join(' '), (r.creatureTypes || []).join(' '), (r.traits || []).map((t) => t.name).join(' '), (r.options || []).map((o) => o.name).join(' '), benefitsTxt(r.benefits)].join(' '),
    match(r, fl) {
      const b = r.benefits || {};
      if (fl.size && !(r.size || []).includes(fl.size)) return false;
      if (fl.move && !(r.speed && r.speed[fl.move]) && !(r.options || []).some((o) => o.speed && o.speed[fl.move])) return false;
      if (fl.gives === 'darkvision' && !(b.senses || []).some((x) => x.type === 'darkvision') && !(r.options || []).some((o) => ((o.benefits || {}).senses || []).some((x) => x.type === 'darkvision'))) return false;
      if (fl.gives === 'spells' && !b.spells && !(r.options || []).some((o) => (o.benefits || {}).spells)) return false;
      if (fl.gives === 'feat' && !(r.feats || []).length) return false;
      if (fl.gives === 'resist' && !b.resist && !(r.options || []).some((o) => (o.benefits || {}).resist)) return false;
      if (fl.gives === 'ability' && !(b.ability || []).length) return false;
      if (fl.gives === 'options' && !(r.options || []).length) return false;
      if (fl.ctype && !(r.creatureTypes || []).includes(fl.ctype)) return false;
      if (fl.flag === 'mine' && !r._custom) return false;
      if (fl.edition && (fl.edition === 'none' ? r.edition : r.edition !== fl.edition)) return false;
      if (fl.source && r.source !== fl.source) return false;
      return true;
    },
    summary(r) {
      const dv = ((r.benefits || {}).senses || []).find((x) => x.type === 'darkvision');
      return [(r.size || []).join('/'), speedTxt(r.speed), dv ? 'darkvision ' + dist(dv.range) : '', (r.benefits || {}).ability ? abilityTxt(r.benefits.ability[0]) : '',
        (r.options || []).length ? r.options.length + ((r.options[0] || {}).kind === 'subrace' ? ' sub-raças' : ' opções') : ''].filter(Boolean).join(' · ');
    },
    form: speciesForm,
  };
  const typeLabel = (t) => { const i = (C.optTypes || {})[t]; return i ? i.name + (i.cls ? ' · ' + i.cls : '') : t; };
  TABS.options = {
    label: 'Opções', full: 'Opções de classe', icon: 'layers', one: 'opção', novo: 'Nova opção', um: 'uma',
    blank: () => ({ id: U.uid('opt_'), name: 'New option', source: 'custom', page: null, edition: '', types: [(C.filters.options || {}).cat || 'EI'].filter(Boolean), prerequisites: [], cost: null, benefits: {}, classFeatureVariant: false, description: '' }),
    filters: () => [
      ['ocls', 'Classe', null],
      ['lvl', 'Pode pegar no nível', Object.assign({ '': 'Qualquer' }, Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), String(i + 1)])))],
      ['gives', 'Marcas', { '': 'Todas', cost: 'Tem custo', nocost: 'Sem custo', spells: 'Dá magias', prereq: 'Tem pré-requisito', variant: 'Variante de característica', reprint: 'Virou talento em 2024', mine: 'Criadas por mim' }],
      ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024' }],
      ['source', 'Fonte', null],
    ],
    text: (r) => [r.name, r.source, srcName(r.source), r.edition, (r.types || []).map(typeLabel).join(' '), prereqTxt(r.prerequisites), r.cost ? r.cost.resource : '', benefitsTxt(r.benefits)].join(' '),
    match(r, fl) {
      if (fl.cat && !(r.types || []).includes(fl.cat)) return false;
      if (fl.ocls && !(r.types || []).some((t) => ((C.optTypes || {})[t] || {}).cls === fl.ocls)) return false;
      if (fl.lvl) { const lv = Math.max(0, ...(r.prerequisites || []).flat().filter((c) => c.type === 'level').map((c) => num(c.value))); if (lv > num(fl.lvl)) return false; }
      if (fl.gives === 'cost' && !r.cost) return false;
      if (fl.gives === 'nocost' && r.cost) return false;
      if (fl.gives === 'spells' && !(r.benefits || {}).spells) return false;
      if (fl.gives === 'prereq' && !(r.prerequisites || []).length) return false;
      if (fl.gives === 'variant' && !r.classFeatureVariant) return false;
      if (fl.gives === 'reprint' && !r.reprint) return false;
      if (fl.gives === 'mine' && !r._custom) return false;
      if (fl.edition && r.edition !== fl.edition) return false;
      if (fl.source && r.source !== fl.source) return false;
      return true;
    },
    summary: (r) => [(r.types || []).map(typeLabel).join(' / '), (r.prerequisites || []).length ? 'Prereq: ' + prereqTxt(r.prerequisites) : '', r.cost ? costLine(r.cost) : ''].filter(Boolean).join(' · '),
    form: optionForm,
  };
  const CASTER = { '': 'Não conjura', full: 'Completo', '1/2': 'Meio', '1/3': 'Terço', artificer: 'Meio (arredonda para cima)', pact: 'Pacto' };
  const CASTER_SUM = { full: 'conjurador completo', '1/2': 'meio conjurador', artificer: 'meio conjurador', '1/3': 'um terço conjurador', pact: 'magia de pacto' };
  const CAST_MODE = { prepared: 'Prepara magias', known: 'Magias conhecidas', spellbook: 'Livro de magias' };
  const primTxt = (p) => (p || []).map((alt) => alt.map((a) => ABIL[a] || a).join(' + ')).join(' or ');
  TABS.classes = {
    label: 'Classes', icon: 'shield', one: 'classe', novo: 'Nova classe', um: 'uma',
    blank: () => ({ id: U.uid('cls_'), name: 'New class', source: 'custom', page: null, edition: '', hd: 8, primary: [['str']], saves: ['str', 'con'], subclassTitle: 'Subclass', subclassLevels: [3],
      proficiencies: [], equipment: [], equipmentText: [], goldAlternative: '', multiclass: { requirements: [], proficiencies: [], text: '' }, spellcasting: null,
      progression: { pb: Array.from({ length: 20 }, (_, i) => 2 + Math.floor(i / 4)), columns: [], rows: Array.from({ length: 20 }, () => []), cantrips: null, prepared: null, slots: null, pact: null },
      optionProgression: [], featProgression: [], features: [], description: '' }),
    filters: () => [
      ['caster', 'Conjuração', Object.assign({ '': 'Todas' }, { none: 'Não conjura', full: 'Completo', half: 'Meio', '1/3': 'Terço', pact: 'Pacto' })],
      ['hd', 'Dado de vida', { '': 'Todos', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12' }],
      ['ab', 'Atributo principal', Object.assign({ '': 'Todos' }, ABIL)],
      ['edition', 'Edição', { '': 'Todas', 2014: '2014', 2024: '2024' }],
      ['source', 'Fonte', null],
    ],
    text: (r) => [r.name, r.source, srcName(r.source), r.edition, 'd' + r.hd, primTxt(r.primary), r.subclassTitle, (r.features || []).map((x) => x.name).join(' ')].join(' '),
    match(r, fl) {
      const p = (r.spellcasting || {}).progression || '';
      if (fl.caster === 'none' && r.spellcasting) return false;
      if (fl.caster === 'half' && !['1/2', 'artificer'].includes(p)) return false;
      if (fl.caster && !['none', 'half'].includes(fl.caster) && p !== fl.caster) return false;
      if (fl.hd && String(r.hd) !== String(fl.hd)) return false;
      if (fl.ab && !(r.primary || []).flat().includes(fl.ab)) return false;
      if (fl.edition && r.edition !== fl.edition) return false;
      if (fl.source && r.source !== fl.source) return false;
      return true;
    },
    summary: (r) => ['d' + r.hd, primTxt(r.primary), r.spellcasting ? CASTER_SUM[r.spellcasting.progression] || 'conjurador' : '', r.subclassTitle ? r.subclassTitle + ' ' + (r.subclassLevels || [])[0] : ''].filter(Boolean).join(' · '),
    form: classForm,
  };
  const classEd = (r) => (['XPHB', 'EFA'].includes(r.classSource) ? '2024' : '2014');
  TABS.subclasses = {
    label: 'Subclasses', icon: 'git-branch', one: 'subclasse', novo: 'Nova subclasse', um: 'uma',
    blank: () => {
      const cls = records('classes').find((c) => c.name === (C.filters.subclasses || {}).cat) || records('classes').find((c) => c.name === 'Fighter' && c.edition === '2024') || records('classes')[0] || {};
      return { id: U.uid('sub_'), name: 'New subclass', shortName: 'New subclass', source: 'custom', page: null, edition: cls.edition || '', classId: cls.id || null, className: cls.name || '', classSource: cls.source || '',
        copyOf: null, features: [], spells: null, spellcasting: null, progression: null, optionProgression: [], description: '' };
    },
    filters: () => [
      ['ced', 'Classe de', { '': 'Todas', 2014: '2014', 2024: '2024' }],
      ['gives', 'Marcas', { '': 'Todas', spells: 'Dá magias', caster: 'Conjura magia', options: 'Escolhe opções', copy: 'Do livro de 2014 (na classe de 2024)', original: 'Só as originais', mine: 'Criadas por mim' }],
      ['source', 'Livro', null],
    ],
    text: (r) => [r.name, r.shortName, r.className, r.source, srcName(r.source), (r.features || []).map((x) => x.name).join(' '), r.spells ? benefitsTxt({ spells: r.spells }) : ''].join(' '),
    match(r, fl) {
      if (fl.cat && r.className !== fl.cat) return false;
      if (fl.ced && classEd(r) !== fl.ced) return false;
      if (fl.gives === 'spells' && !r.spells) return false;
      if (fl.gives === 'caster' && !r.spellcasting) return false;
      if (fl.gives === 'options' && !(r.optionProgression || []).length) return false;
      if (fl.gives === 'copy' && !r.copyOf) return false;
      if (fl.gives === 'original' && r.copyOf) return false;
      if (fl.gives === 'mine' && !r._custom) return false;
      if (fl.source && r.source !== fl.source) return false;
      return true;
    },
    summary: (r) => [r.className + ' ' + classEd(r), r.copyOf ? 'livro de 2014' : '', r.spells ? 'magias' : '', r.spellcasting ? 'conjura' : '', (r.optionProgression || []).length ? r.optionProgression.map((o) => o.name).join(', ') : '', (r.features || []).length + ' características'].filter(Boolean).join(' · '),
    form: subclassForm,
  };
  const costLine = (c) => (c ? (c.amount != null ? c.amount + ' ' : c.min != null ? c.min + '–' + (c.max ?? '?') + ' ' : '') + (c.resource || '') : '');
  // Tipos das opções: botões com a classe e a contagem
  function optTypeBar() {
    const fl = (C.filters.options = C.filters.options || {});
    const base = filtered(Object.assign({}, fl, { cat: '' }));
    const count = {};
    for (const r of base) for (const t of r.types || []) count[t] = (count[t] || 0) + 1;
    const pick = (c) => { fl.cat = c; saveUi(); renderSide(); };
    const types = Object.keys(C.optTypes || {}).filter((t) => count[t] || fl.cat === t).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
    return h('div', { class: 'cd-cats', role: 'group', 'aria-label': 'Tipos' },
      h('button', { class: 'cd-cat' + (!fl.cat ? ' on' : ''), 'data-cat': '', onclick: () => pick('') }, 'Todos', h('span', {}, String(base.length))),
      types.map((t) => h('button', { class: 'cd-cat' + (fl.cat === t ? ' on' : ''), 'data-cat': t, onclick: () => pick(fl.cat === t ? '' : t) }, typeLabel(t), h('span', {}, String(count[t] || 0)))));
  }
  function speedTxt(sp) {
    if (!sp) return '';
    return Object.entries(sp).map(([k, v]) => (k === 'walk' ? '' : k + ' ') + (v === 'walk' ? '= walk' : dist(v))).join(', ');
  }
  const T = () => TABS[C.tab];
  const spellCache = new WeakMap();
  function spellText(r) {
    let s = spellCache.get(r);
    if (s) return s;
    s = U.slug([r.name, r.school, r.level === 0 ? 'cantrip truque' : LEVELS[r.level] + ' level', r.source, srcName(r.source), r.edition, (r.classes || []).join(' '), (r.subclasses || []).join(' '),
      (r.damage || []).map((d) => d.type).join(' '), (r.conditions || []).join(' '), r.save ? ABIL[r.save] + ' save' : '', r.attack ? 'spell attack' : '', r.ritual ? 'ritual' : '', (r.duration || {}).concentration ? 'concentration' : ''].join(' '));
    spellCache.set(r, s);
    return s;
  }
  const timeTxt = (t) => (t ? (t.number || 1) + ' ' + (TIME_UNITS[t.unit] || t.unit || '').toLowerCase() + ((t.number || 1) > 1 && /^(minute|hour|round|day)$/.test(t.unit) ? 's' : '') : '');
  function rangeSpellTxt(r) {
    const g = r.range || {};
    const base = g.kind === 'distance' ? dist(g.distance) : RANGE_KINDS[g.kind] || '';
    return base + (r.area && r.area.shape ? ' (' + (r.area.size != null ? dist(r.area.size) + ' ' : '') + r.area.shape + ')' : '');
  }
  function durTxt(d) {
    if (!d) return '';
    const t = d.type === 'timed' ? (d.amount || '') + ' ' + (DUR_UNITS[d.unit] || d.unit || '').toLowerCase() + ((d.amount || 1) > 1 ? 's' : '') : DUR_TYPES[d.type] || d.type || '';
    if (d.concentration) return d.type === 'timed' ? 'Concentration, up to ' + t : 'Concentration';
    return t;
  }
  const searchCache = new WeakMap();
  function itemText(r) {
    let s = searchCache.get(r);
    if (s) return s;
    const w = r.weapon || {};
    s = [r.name, r.category, (r.categories || []).join(' '), r.rarity, r.source, srcName(r.source), r.edition, KINDS[r.kind],
      w.damage && w.damage.type, (w.properties || []).join(' '), (w.mastery || []).join(' '), r.armor && r.armor.type, (r.tags || []).join(' '),
      r.kind === 'family' ? (r.bases || []).map((b) => b.name).join(' ') : '',
      r.kind === 'group' ? (r.versions || []).map((id) => (find('items', id) || {}).name).join(' ') : ''].join(' ');
    s = U.slug(s);
    searchCache.set(r, s);
    return s;
  }
  const blankWeapon = () => ({ category: 'simple', kind: 'melee', damage: { dice: '1d6', type: 'slashing' }, versatile: '', properties: [], mastery: [], reach: 1.5, range: null, ammo: '', reload: null, bonusAttack: 0, bonusDamage: 0, critThreshold: null, extraDamage: [] });
  const blankArmor = () => ({ type: 'light', ac: 11, dexMax: null, strength: null, stealth: false, bonusAc: 0 });

  // ---------- Topo: abas ----------
  function renderTabs() {
    const nav = $('#cd-tabs');
    nav.replaceChildren(...Object.entries(TABS).map(([k, t]) => h('button', {
      class: 'cd-tab' + (k === C.tab ? ' on' : ''), role: 'tab', 'aria-selected': String(k === C.tab), 'data-tab': k, title: t.full || t.label,
      onclick: () => { if (C.tab === k) return; C.tab = k; saveUi(); render(true); },
    }, ic(t.icon), t.label, h('span', { class: 'cd-count' }, String(records(k).filter((r) => !r.memberOf).length)))));
    // a aba aberta sempre à vista (com muitas abas, a barra rola para o lado)
    const on = nav.querySelector('.cd-tab.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ---------- Esquerda: pesquisa, filtros e lista ----------
  function filtered(fOver) {
    const t = T(), f = fOver || C.filters[C.tab] || {}, q = U.slug(C.q[C.tab] || '').split(/[_-]+/).filter(Boolean);
    return records(C.tab).filter((r) => {
      if (!t.match(r, f)) return false;
      if (!q.length) return true;
      const s = C.tab === 'items' ? itemText(r) : C.tab === 'spells' ? spellText(r) : U.slug(t.text(r));
      return q.every((w) => s.includes(w));
    }).sort((a, b) => a.name.localeCompare(b.name) || String(a.edition).localeCompare(String(b.edition)) || String(a.source).localeCompare(String(b.source)));
  }
  function filterSelect(key, label, opts) {
    const f = (C.filters[C.tab] = C.filters[C.tab] || {});
    if (!opts && key === 'ocls') opts = Object.assign({ '': 'Todas' }, Object.fromEntries([...new Set(Object.values(C.optTypes || {}).map((i) => i.cls).filter(Boolean))].sort().map((x) => [x, x])));
    if (!opts && key === 'ctype') opts = Object.assign({ '': 'Todos' }, Object.fromEntries([...new Set(records('species').flatMap((r) => r.creatureTypes || []))].sort().map((x) => [x, cap(x)])));
    if (!opts && key === 'skill') opts = Object.assign({ '': 'Todas' }, Object.fromEntries([...new Set(records('backgrounds').flatMap((r) => ((r.benefits || {}).proficiencies || []).filter((p) => p.kind === 'skill').flatMap((p) => (p.fixed || []).concat((p.choose || {}).from || []))))].sort().map((x) => [x, cap(x)])));
    if (!opts && key === 'cls') opts = Object.assign({ '': 'Todas' }, Object.fromEntries(classList().map((c) => [c, c])));
    if (!opts && key === 'source') {
      const srcs = [...new Set(records(C.tab).map((r) => r.source))].sort((a, b) => srcName(a).localeCompare(srcName(b)));
      opts = Object.assign({ '': 'Todas' }, Object.fromEntries(srcs.map((s) => [s, srcName(s) + (s !== 'custom' ? ' (' + s + ')' : '')])));
    }
    return h('label', { class: 'cd-filter' }, label, h('select', {
      value: f[key] || '', 'data-filter': key,
      onchange: (e) => { f[key] = e.target.value; saveUi(); renderSide(); },
    }, Object.entries(opts).map(([v, l]) => h('option', { value: v }, l))));
  }
  // Categorias dos itens: botões com a contagem (respeitando a pesquisa e os outros filtros)
  function catBar() {
    const f = (C.filters.items = C.filters.items || {});
    const base = filtered(Object.assign({}, f, { cat: '' }));
    const count = {};
    for (const r of base) for (const c of r.categories || [r.category]) count[c] = (count[c] || 0) + 1;
    const pick = (c) => { f.cat = c; if (c !== 'Weapon') delete f.prop; if (c !== 'Armor') delete f.armor; saveUi(); renderSide(); };
    return h('div', { class: 'cd-cats', role: 'group', 'aria-label': 'Categorias' },
      h('button', { class: 'cd-cat' + (!f.cat ? ' on' : ''), 'data-cat': '', onclick: () => pick('') }, 'Todos', h('span', {}, String(base.length))),
      CATS.filter((c) => count[c] || f.cat === c).map((c) => h('button', { class: 'cd-cat' + (f.cat === c ? ' on' : ''), 'data-cat': c, onclick: () => pick(f.cat === c ? '' : c) },
        CAT_ICON[c] ? ic(CAT_ICON[c]) : null, c, h('span', {}, String(count[c] || 0)))));
  }
  // Níveis das magias: Truque, 1º … 9º, com a contagem
  function levelBar() {
    const f = (C.filters.spells = C.filters.spells || {});
    const base = filtered(Object.assign({}, f, { level: '' }));
    const count = {};
    for (const r of base) count[r.level] = (count[r.level] || 0) + 1;
    const pick = (l) => { f.level = l; saveUi(); renderSide(); };
    return h('div', { class: 'cd-cats', role: 'group', 'aria-label': 'Níveis' },
      h('button', { class: 'cd-cat' + (f.level === '' || f.level == null ? ' on' : ''), 'data-cat': '', onclick: () => pick('') }, 'Todos', h('span', {}, String(base.length))),
      LEVEL_PT.map((l, i) => h('button', { class: 'cd-cat' + (String(f.level) === String(i) ? ' on' : ''), 'data-level': String(i), onclick: () => pick(String(f.level) === String(i) ? '' : String(i)) },
        l, h('span', {}, String(count[i] || 0)))));
  }
  // Categorias dos talentos
  function featCatBar() {
    const fl = (C.filters.feats = C.filters.feats || {});
    const base = filtered(Object.assign({}, fl, { cat: '' }));
    const count = {};
    for (const r of base) count[r.category] = (count[r.category] || 0) + 1;
    const pick = (c) => { fl.cat = c; saveUi(); renderSide(); };
    return h('div', { class: 'cd-cats', role: 'group', 'aria-label': 'Categorias' },
      h('button', { class: 'cd-cat' + (!fl.cat ? ' on' : ''), 'data-cat': '', onclick: () => pick('') }, 'Todos', h('span', {}, String(base.length))),
      FEAT_CATS.filter((c) => count[c] || fl.cat === c).map((c) => h('button', { class: 'cd-cat' + (fl.cat === c ? ' on' : ''), 'data-cat': c, onclick: () => pick(fl.cat === c ? '' : c) }, c, h('span', {}, String(count[c] || 0)))));
  }
  // Classes das subclasses: botões com a contagem
  function subClassBar() {
    const fl = (C.filters.subclasses = C.filters.subclasses || {});
    const base = filtered(Object.assign({}, fl, { cat: '' }));
    const count = {};
    for (const r of base) count[r.className] = (count[r.className] || 0) + 1;
    const pick = (c) => { fl.cat = c; saveUi(); renderSide(); };
    return h('div', { class: 'cd-cats', role: 'group', 'aria-label': 'Classes' },
      h('button', { class: 'cd-cat' + (!fl.cat ? ' on' : ''), 'data-cat': '', onclick: () => pick('') }, 'Todas', h('span', {}, String(base.length))),
      Object.keys(count).sort().map((c) => h('button', { class: 'cd-cat' + (fl.cat === c ? ' on' : ''), 'data-cat': c, onclick: () => pick(fl.cat === c ? '' : c) }, c, h('span', {}, String(count[c])))));
  }
  const chipBar = () => (C.tab === 'items' ? [catBar()] : C.tab === 'spells' ? [levelBar()] : C.tab === 'feats' ? [featCatBar()] : C.tab === 'options' ? [optTypeBar()] : C.tab === 'subclasses' ? [subClassBar()] : []);
  function renderSide() {
    const t = T(), side = $('#cd-side');
    const tab = C.tab;
    const f = (C.filters[C.tab] = C.filters[C.tab] || {});
    const search = h('input', {
      type: 'search', class: 'cd-search', placeholder: C.tab === 'items' ? 'Pesquisar (nome, categoria, propriedade, base…)' : C.tab === 'spells' ? 'Pesquisar (nome, escola, classe, dano…)' : C.tab === 'feats' ? 'Pesquisar (nome, pré-requisito, benefício…)' : C.tab === 'backgrounds' ? 'Pesquisar (nome, talento, perícia…)' : C.tab === 'species' ? 'Pesquisar (nome, traço, sub-raça…)' : C.tab === 'options' ? 'Pesquisar (nome, tipo, classe, pré-requisito…)' : C.tab === 'classes' ? 'Pesquisar (nome, característica…)' : C.tab === 'subclasses' ? 'Pesquisar (nome, classe, característica, magia…)' : 'Pesquisar (nome, tipo de dano, espécie…)', value: C.q[C.tab] || '', 'data-f': 'search',
      oninput: U.debounce((e) => {
        C.q[tab] = e.target.value;
        saveUi();
        if (tab !== C.tab) return;
        const cb = $('.cd-cats'), nb = chipBar()[0];
        if (cb && nb) cb.replaceWith(nb);
        renderList();
      }, 150),
    });
    const old = $('#cd-list');
    if (old && listComponent) {
      listScroll.set(listTab, old.scrollTop);
      void unmount(listComponent);
      listComponent = null;
    }
    side.replaceChildren(
      h('div', { class: 'cd-search-row' }, ic('search'), search),
      ...chipBar(),
      h('div', { class: 'cd-filters' }, t.filters(f).map(([k, l, o]) => filterSelect(k, l, o))),
      h('div', { class: 'cd-list-head' },
        h('span', { class: 'cd-found', id: 'cd-found' }),
        h('button', { class: 'btn small ghost', id: 'cd-clear', title: 'Limpar a pesquisa e os filtros', onclick: () => { C.filters[C.tab] = {}; C.q[C.tab] = ''; saveUi(); renderSide(); } }, ic('x'), 'Limpar')),
      h('div', { class: 'cd-list', id: 'cd-list', role: 'listbox', tabindex: 0, 'aria-label': 'Resultados', 'aria-describedby': 'cd-found' }),
      h('div', { class: 'cd-side-foot' },
        btnI('plus', t.novo, { class: 'btn primary block', id: 'cd-new', onclick: () => create() }),
        h('div', { class: 'cd-foot-row' },
          btnI('download', 'Exportar', { class: 'btn small', title: 'Salvar em arquivo o que você criou, editou ou apagou (todos os cadastros)', onclick: exportLocal }),
          btnI('upload', 'Importar', { class: 'btn small', title: 'Trazer um arquivo exportado (soma ao que já existe)', onclick: importLocal }),
          btnI('rotate-ccw', 'Padrões', { class: 'btn small', title: 'Restaurar os padrões deste cadastro', onclick: restoreAll }))),
    );
    renderList();
  }
  function renderList() {
    const box = $('#cd-list'), t = T();
    if (!box) return;
    const start = profile ? performance.now() : 0;
    const list = filtered();
    if (profile) performance.measure('cadastros.filtro', { start, end: performance.now() });
    const tab = C.tab, selected = C.sel[tab] || null, fl = C.filters[tab] || {};
    $('#cd-clear').hidden = !(Object.values(fl).some(Boolean) || C.q[tab]);
    $('#cd-found').textContent = list.length.toLocaleString('pt-BR') + (list.length === 1 ? ' encontrado' : ' encontrados');
    const rows = list.map((r) => {
      const badges = [];
      if (r.kind === 'family' || r.kind === 'group') badges.push({ label: KINDS[r.kind] });
      if (r._virtual) badges.push({ label: r._virtual === 'spell' ? 'da magia' : 'da arma' });
      if (tab === 'spells' && r.duration?.concentration) badges.push({ label: 'C', title: 'Concentration' });
      if (tab === 'spells' && r.ritual) badges.push({ label: 'R', title: 'Ritual' });
      if (r.edition) badges.push({ label: r.edition, className: r.edition === '2024' ? 'blue' : '' });
      if (r._custom && !r._virtual) badges.push({ label: 'meu', className: 'gold' });
      else if (r._edited) badges.push({ label: 'editado', className: 'gold' });
      return {
        id: r.id, name: r.name, title: r.name + ' · ' + srcName(r.source),
        source: r.source === 'custom' ? '' : r.source, rarity: r.magic ? rarClass(r.rarity) : '',
        badges, summary: () => t.summary(r),
      };
    });
    const reveal = listTab !== tab || listId !== selected;
    listId = selected;
    listState.set({ rows, selected, reveal, newLabel: t.novo,
      empty: !list.length && !(C.defaults[tab] || []).length ? 'no-defaults' : '' });
    if (!listComponent) {
      listTab = tab;
      const initialOffset = listScroll.get(tab) || 0;
      listComponent = mount(CatalogList, { target: box, props: { state: listState, viewport: box, onselect: select, initialOffset } });
    }
  }

  function select(id, tab) {
    if (tab && tab !== C.tab) { C.tab = tab; C.sel[tab] = id; saveUi(); render(true); return; }
    C.sel[C.tab] = id; C.descEdit = false; saveUi();
    listId = id;
    listState.update((value) => ({ ...value, selected: id, reveal: false }));
    renderMain();
    $('#cd-main').scrollTop = 0;
  }
  C.select = select;
  function create(base) {
    const t = T();
    let r;
    if (base) {
      r = Object.assign(clone(plain(base)), { id: U.uid(C.tab === 'attacks' ? 'atk_' : 'itm_'), name: base.name + ' (copy)', source: 'custom', page: null });
      if (C.tab === 'attacks') { r.origin = 'custom'; r.originName = base.originName || base.name; }
      if (C.tab === 'items') { delete r.memberOf; if (r.kind === 'base') r.kind = 'item'; }
    } else r = t.blank();
    local(C.tab).custom[r.id] = r;
    save();
    C.sel[C.tab] = r.id; saveUi();
    render();
    setTimeout(() => { const n = $('.cd-name'); if (n) { n.focus(); n.select(); } }, 0);
  }
  function del(r) {
    const t = T();
    const msg = r._custom ? `Apagar "${r.name}"?` : `Apagar "${r.name}"? É ${t.um} ${t.one} padrão: o botão "Padrões" traz de volta.`;
    if (!confirm(msg)) return;
    const list = filtered(), i = list.findIndex((x) => x.id === r.id);
    const undo = remove(C.tab, r.id);
    const next = list[i + 1] || list[i - 1];
    C.sel[C.tab] = next ? next.id : null; saveUi();
    render();
    U.toast(`"${r.name}" apagado.`, 'info', 6000, { label: 'Desfazer', run: undo });
  }
  function restoreOne(r) {
    if (!confirm(`Desfazer as suas mudanças em "${r.name}" e voltar ao padrão?`)) return;
    delete local(C.tab).edited[r.id];
    save(); render();
  }
  function restoreAll() {
    const t = T(), L = local(C.tab);
    const n = Object.keys(L.edited).length + L.deleted.length;
    if (!n) { U.toast('Os padrões deste cadastro já estão como vieram.'); return; }
    if (!confirm(`Restaurar os padrões de ${t.label}? ${Object.keys(L.edited).length} editado(s) voltam ao original e ${L.deleted.length} apagado(s) voltam. Os criados por você continuam.`)) return;
    L.edited = {}; L.deleted = [];
    save(); render();
    U.toast('Padrões restaurados.');
  }
  function exportLocal() {
    const out = { format: 'vesper-cadastros', v: 2, exportedAt: new Date().toISOString() };
    let n = 0;
    for (const k of Object.keys(TABS)) { const L = local(k); out[k] = clone(L); n += Object.keys(L.custom).length + Object.keys(L.edited).length + L.deleted.length; }
    if (!n) { U.toast('Nada para exportar: você ainda não criou, editou nem apagou nada.'); return; }
    U.download('vesper-cadastros-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(out, null, 1));
  }
  async function importLocal() {
    const file = await U.pickFile('.json,application/json');
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { U.toast('Arquivo inválido (não é JSON).', 'error'); return; }
    if (!data || data.format !== 'vesper-cadastros') { U.toast('Este arquivo não é um cadastro exportado do Vésper.', 'error'); return; }
    migrate(data);
    const told = [];
    for (const k of Object.keys(TABS)) {
      const src = data[k];
      if (!src) continue;
      const L = local(k);
      const c = Object.keys(src.custom || {}).length, e = Object.keys(src.edited || {}).length, d = (src.deleted || []).length;
      Object.assign(L.custom, src.custom || {});
      Object.assign(L.edited, src.edited || {});
      L.deleted = [...new Set(L.deleted.concat(src.deleted || []))];
      if (c + e + d) told.push(`${TABS[k].label}: ${c} criado(s), ${e} editado(s), ${d} apagado(s)`);
    }
    save(); render();
    U.toast(told.length ? 'Importado. ' + told.join(' · ') : 'O arquivo não tinha nada para importar.', 'info', 6000);
  }

  // Plano 43: a aba Armas (Plano 42) virou itens da categoria Weapon; os ataques gravados das armas saíram
  function weaponToItem(w, def) {
    const it = def ? clone(plain(def)) : { kind: 'item', category: 'Weapon', categories: ['Weapon'], rarity: 'None', magic: false, attune: false, costOrigin: null };
    Object.assign(it, { id: w.id, name: w.name, source: w.source, page: w.page || null, edition: w.edition || '', weight: w.weight ?? null, cost: w.cost ?? null, description: w.description || it.description || '' });
    if (it.cost != null && !def) it.costOrigin = 'book';
    it.weapon = Object.assign({}, it.weapon || blankWeapon(), {
      category: w.category, kind: w.kind, damage: w.damage, versatile: w.versatile || '', properties: w.properties || [], mastery: w.mastery || [],
      reach: w.reach ?? null, range: w.range || null, ammo: w.ammo || '', reload: w.reload || null,
    });
    if (w.propertyNotes && Object.keys(w.propertyNotes).length) it.weapon.propertyNotes = w.propertyNotes;
    return it;
  }
  function migrate(store) {
    if (store.weapons) {
      const W = store.weapons;
      const I = (store.items = store.items || { custom: {}, edited: {}, deleted: [] });
      I.custom = I.custom || {}; I.edited = I.edited || {}; I.deleted = I.deleted || [];
      for (const w of Object.values(W.custom || {})) I.custom[w.id] = weaponToItem(w);
      for (const w of Object.values(W.edited || {})) { const d = defaultOf('items', w.id); if (d) I.edited[w.id] = weaponToItem(w, d); else I.custom[w.id] = weaponToItem(w); }
      for (const id of W.deleted || []) if (!I.deleted.includes(id)) I.deleted.push(id);
      delete store.weapons;
    }
    if (store.attacks) {
      const A = store.attacks;
      for (const id of Object.keys(A.edited || {})) if (id.startsWith('w-')) delete A.edited[id];
      if (A.deleted) A.deleted = A.deleted.filter((id) => !id.startsWith('w-'));
    }
    return store;
  }

  // ---------- Pedaços do formulário ----------
  // set(caminho, valor, refazer?) muda o registro aberto, salva e atualiza a lista
  function editor(r) {
    const rec = clone(plain(r));
    // primeira mudança num padrão: redesenha para aparecer o selo "editado" e o "Voltar ao padrão"
    let first = !!(r._default && !r._edited);
    const set = (path, v, rebuild) => {
      const ks = path.split('.');
      let o = rec;
      for (const k of ks.slice(0, -1)) o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {};
      o[ks[ks.length - 1]] = v;
      if (r._virtual) return;
      put(C.tab, rec);
      renderTabs();
      renderList();
      if (rebuild || first) { first = false; renderMain(); } else refreshPreview(rec);
    };
    return { rec, set };
  }
  const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  const F = {
    text(rec, set, label, path, attrs = {}) {
      return h('label', { class: attrs.cls || '' }, label, h('input', Object.assign({ value: get(rec, path) ?? '', 'data-f': path, onchange: (e) => set(path, e.target.value.trim(), attrs.rebuild) }, attrs.input || {})));
    },
    num(rec, set, label, path, attrs = {}) {
      return h('label', { class: attrs.cls || '' }, label, h('input', Object.assign({ type: 'number', value: get(rec, path) ?? '', 'data-f': path, onchange: (e) => set(path, e.target.value === '' ? null : num(e.target.value), attrs.rebuild) }, attrs.input || {})));
    },
    dice(rec, set, label, path, attrs = {}) {
      const v = get(rec, path) || '';
      const inp = h('input', { value: v, placeholder: attrs.ph || 'e.g. 2d12+3', 'data-f': path, class: v && !DICE_RE.test(v) ? 'bad' : '',
        oninput: (e) => e.target.classList.toggle('bad', !!e.target.value && !DICE_RE.test(e.target.value)),
        onchange: (e) => set(path, e.target.value.replace(/\s+/g, '').toLowerCase(), attrs.rebuild) });
      return h('label', { class: attrs.cls || '' }, label, inp);
    },
    // distância: guardada em metros, digitada na unidade de quem usa
    dist(rec, set, label, path, attrs = {}) {
      const v = get(rec, path);
      return h('label', { class: attrs.cls || '' }, label + ' (' + Units.distUnit() + ')', h('input', {
        type: 'number', min: 0, step: 'any', value: v == null || v === '' ? '' : Units.distIn(v), 'data-f': path, placeholder: attrs.ph || '',
        onchange: (e) => set(path, e.target.value === '' ? null : Math.round(Units.distOut(e.target.value) * 100) / 100, attrs.rebuild),
      }));
    },
    select(rec, set, label, path, opts, attrs = {}) {
      return h('label', { class: attrs.cls || '' }, label, h('select', { value: get(rec, path) ?? '', 'data-f': path, onchange: (e) => (attrs.onchange ? attrs.onchange(e.target.value) : set(path, e.target.value, attrs.rebuild)) },
        (Array.isArray(opts) ? opts.map((o) => [o, o]) : Object.entries(opts)).map(([v, l]) => h('option', { value: v }, l))));
    },
    check(rec, set, label, path, attrs = {}) {
      return h('label', { class: 'check ' + (attrs.cls || ''), title: attrs.title || null }, h('input', { type: 'checkbox', checked: !!get(rec, path), 'data-f': path, onchange: (e) => set(path, e.target.checked, attrs.rebuild) }), label);
    },
    // peso: guardado em kg, digitado na unidade de quem usa
    weight(rec, set, label, path) {
      const lb = Units.sys('weight') === 'imperial', v = get(rec, path);
      return h('label', {}, label + ' (' + (lb ? 'lb' : 'kg') + ')', h('input', { type: 'number', min: 0, step: 'any', 'data-f': path,
        value: v == null ? '' : Math.round(v / (lb ? 0.5 : 1) * 1000) / 1000,
        onchange: (e) => set(path, e.target.value === '' ? null : Math.round(num(e.target.value) * (lb ? 0.5 : 1) * 1000) / 1000) }));
    },
  };
  function sec(icon, title, ...body) {
    return h('section', { class: 'fp-sec cd-sec' }, h('div', { class: 'fp-sec-head' }, ic(icon), h('h2', {}, title)), ...body);
  }
  function head(r, rec, set, t, extra) {
    const src = r.source === 'custom' ? 'Criado por você' : srcName(r.source) + (r.page ? ', p. ' + r.page : '');
    const imgs = rec.images || [];
    let ii = 0;
    const img = imgs.length ? h('button', { class: 'cd-img', title: imgs.length > 1 ? 'Clique para ver a próxima imagem (' + imgs.length + ')' : 'Imagem do item (5etools)', onclick: (e) => {
      ii = (ii + 1) % imgs.length; e.currentTarget.querySelector('img').src = imgs[ii];
      const n = e.currentTarget.querySelector('.cd-img-n'); if (n) n.textContent = (ii + 1) + '/' + imgs.length;
    } }, h('img', { src: imgs[0], alt: rec.name, loading: 'lazy', referrerpolicy: 'no-referrer', onerror: (e) => { e.target.closest('.cd-img').hidden = true; } }),
    imgs.length > 1 ? h('span', { class: 'cd-img-n' }, '1/' + imgs.length) : null) : null;
    return h('div', { class: 'cd-head' + (img ? ' has-img' : '') }, img,
      h('div', { class: 'cd-head-body' },
        r._virtual ? h('div', { class: 'cd-name cd-name-ro' }, rec.name) : h('input', { class: 'cd-name', value: rec.name, 'data-f': 'name', 'aria-label': 'Nome', onchange: (e) => set('name', e.target.value.trim() || 'Untitled', true) }),
        h('div', { class: 'cd-head-row' },
          h('span', { class: 'cd-meta' }, ic('book-open'), src),
          rec.kind && KINDS[rec.kind] && rec.kind !== 'item' ? h('span', { class: 'badge' }, KINDS[rec.kind]) : null,
          rec.magic ? h('span', { class: 'badge rar ' + rarClass(rec.rarity) }, rec.rarity) : null,
          r._virtual ? h('span', { class: 'badge', title: r._virtual === 'spell' ? 'Montado a partir da magia' : 'Montado a partir do item' }, r._virtual === 'spell' ? 'da magia' : 'da arma') : null,
          rec.edition ? h('span', { class: 'badge' + (rec.edition === '2024' ? ' blue' : '') }, rec.edition) : null,
          r._edited ? h('span', { class: 'badge gold', title: 'Você mudou este padrão (o original continua guardado)' }, 'editado') : null,
          r._custom && !r._virtual ? h('span', { class: 'badge gold' }, 'meu') : null,
          h('span', { class: 'grow' }),
          extra || null,
          r._edited ? btnI('undo-2', 'Voltar ao padrão', { class: 'btn small', onclick: () => restoreOne(r) }) : null,
          btnI('copy', 'Duplicar', { class: 'btn small', title: 'Criar uma cópia sua para editar', onclick: () => create(r) }),
          r._virtual ? null : btnI('trash-2', 'Apagar', { class: 'btn small danger', onclick: () => del(r) })),
        h('div', { class: 'cd-preview', id: 'cd-preview' })));
  }
  function refreshPreview(rec) {
    const box = $('#cd-preview');
    if (!box) return;
    box.replaceChildren(...(C.tab === 'attacks' ? attackPreview(rec) : C.tab === 'spells' ? spellPreview(rec) : C.tab === 'feats' ? featPreview(rec) : C.tab === 'backgrounds' ? backgroundPreview(rec) : C.tab === 'species' ? speciesPreview(rec) : C.tab === 'options' ? optionPreview(rec) : C.tab === 'classes' ? classPreview(rec) : C.tab === 'subclasses' ? subclassPreview(rec) : itemPreview(rec)));
    for (const [k, fn] of Object.entries(liveCalc)) { const el = document.getElementById(k); if (el) el.textContent = fn(rec); }
  }
  const liveCalc = {
    'cd-atk-calc': (a) => (C.tab === 'attacks' ? '= ' + sign(exAttack(a)) : ''),
    'cd-dc-calc': (a) => (C.tab === 'attacks' ? '= DC ' + exDc(a.save || {}) : ''),
    'cd-dmg1-calc': (a) => (C.tab === 'attacks' ? exDmg((a.damage || [])[0]) : ''),
    'cd-dmg2-calc': (a) => (C.tab === 'attacks' ? exDmg((a.damage || [])[1]) : ''),
  };
  const chip = (icon, label, val, cls) => h('span', { class: 'cd-chip ' + (cls || '') }, ic(icon), h('small', {}, label), h('b', {}, val));

  // Descrição: parágrafos, listas (•) e tabelas (linhas "| a | b |"); "Nome. texto" fica em negrito
  function descView(text) {
    const box = h('div', { class: 'cd-desc-view' });
    for (const para of String(text || '').split(/\n{2,}/)) {
      const lines = para.split('\n');
      if (lines.some((l) => l.startsWith('|'))) {
        const cap = lines[0].startsWith('|') ? null : lines.shift();
        const rows = lines.filter((l) => l.startsWith('|')).map((l) => l.replace(/^\|\s?|\s?\|$/g, '').split(' | '));
        box.append(h('div', { class: 'cd-table' }, cap ? h('b', {}, cap.replace(/:$/, '')) : null,
          h('table', {}, h('thead', {}, h('tr', {}, (rows[0] || []).map((c) => h('th', {}, c)))), h('tbody', {}, rows.slice(1).map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))));
      } else if (lines.every((l) => l.startsWith('• '))) {
        box.append(h('ul', {}, lines.map((l) => h('li', {}, l.slice(2)))));
      } else {
        const m = /^([^.!?\n]{2,48}[.!?]) (.+)$/s.exec(para);
        box.append(m && /^[A-Z0-9]/.test(m[1]) && m[1].split(' ').length <= 6 ? h('p', {}, h('b', {}, m[1]), ' ' + m[2]) : h('p', {}, para));
      }
    }
    return box;
  }
  function descSec(rec, set, ph, ro) {
    if (C.descEdit && !ro) {
      return sec('file-text', 'Descrição',
        h('textarea', { class: 'cd-desc', rows: 12, 'data-f': 'description', value: rec.description || '', placeholder: ph, onchange: (e) => set('description', e.target.value) }),
        h('p', { class: 'hint' }, 'Parágrafos separados por uma linha em branco. Tabela: uma linha por fileira, como "| d6 | Effect |". Lista: linhas começando com "• ".'),
        h('div', { class: 'cd-desc-foot' }, btnI('check', 'Pronto', { class: 'btn small', onclick: () => { C.descEdit = false; renderMain(); } })));
    }
    return sec('file-text', 'Descrição',
      rec.description ? descView(rec.description) : h('p', { class: 'empty' }, 'Sem descrição.'),
      ro ? null : h('div', { class: 'cd-desc-foot' }, btnI('pen-line', 'Editar o texto', { class: 'btn small', 'data-act': 'desc-edit', onclick: () => { C.descEdit = true; renderMain(); setTimeout(() => { const t = $('.cd-desc'); if (t) t.focus(); }, 0); } })));
  }

  // ---------- Ataque ----------
  function attackPreview(a) {
    const out = [];
    out.push(chip('target', 'Tipo', TYPES[a.type] || a.type));
    if (a.type === 'melee') out.push(chip('ruler', 'Alcance', dist(a.reach) + (a.range ? ' · thrown ' + rangeTxt(a.range) : '')));
    else if (a.range && a.range.normal) out.push(chip('ruler', 'Alcance', rangeTxt(a.range)));
    if (a.area && a.area.shape) out.push(chip('cone', 'Área', dist(a.area.size) + ' ' + a.area.shape + (a.area.width ? ' × ' + dist(a.area.width) : '')));
    if (HAS_ATTACK(a.type)) out.push(chip('crosshair', 'Acerto', atkTxt(a), 'gold'));
    if (!HAS_ATTACK(a.type) || a.saveOnHit) out.push(chip('shield', 'Resistência', (SAVE_ABIL[(a.save || {}).ability] || '').replace(' (target chooses)', '') + ' · ' + dcTxt(a.save || {}), 'gold'));
    const d = (a.damage || []).filter((x) => x && x.dice).map(dmgTxt);
    if (d.length) out.push(chip('zap', 'Dano', d.join(' + '), 'red'));
    if (a.versatile) out.push(chip('hand', 'Duas mãos', a.versatile));
    if (a.uses) out.push(chip('hourglass', 'Usos', a.uses));
    return out;
  }
  function damageRow(rec, set, i) {
    const p = 'damage.' + i;
    const d = (rec.damage || [])[i] || {};
    return h('div', { class: 'cd-dmg' },
      h('span', { class: 'cd-dmg-n' }, 'Dano ' + (i + 1)),
      F.dice(rec, set, 'Dados', p + '.dice', { ph: i ? 'e.g. 2d6 (optional)' : 'e.g. 1d8' }),
      F.select(rec, set, 'Atributo somado', p + '.ability', ATK_ABIL),
      F.select(rec, set, 'Tipo de dano', p + '.type', DMG_OPTS),
      h('span', { class: 'cd-calc', id: 'cd-dmg' + (i + 1) + '-calc', title: 'Exemplo com STR +3, DEX +2, CON +1' }, d.dice ? exDmg(d) : ''));
  }
  function attackForm(r) {
    const { rec, set } = editor(r);
    rec.damage = rec.damage && rec.damage.length ? rec.damage : [];
    while (rec.damage.length < 2) rec.damage.push({ dice: '', ability: 'none', type: '' });
    const t = rec.type, atk = HAS_ATTACK(t), sv = !atk || rec.saveOnHit;
    const out = [];
    if (r._virtual) {
      const sp = r._virtual === 'spell';
      out.push(head(r, rec, set, TABS.attacks, btnI('pen-line', sp ? 'Editar a magia' : 'Editar a arma', { class: 'btn small primary', 'data-act': sp ? 'edit-spell' : 'edit-weapon', onclick: () => select(r._item, r._from) })));
      out.push(h('div', { class: 'cd-banner' }, ic('link'), h('span', {}, sp ? 'Este ataque é montado a partir da magia ' : 'Este ataque é montado a partir do item ', h('b', {}, rec.name),
        sp ? '. Para mudar dano, alcance, teste ou área, edite a magia; o ataque acompanha. "Duplicar" cria um ataque seu, separado.'
          : '. Para mudar dano, alcance ou bônus, edite a arma; o ataque acompanha. "Duplicar" cria um ataque seu, separado.')));
    } else out.push(head(r, rec, set, TABS.attacks));
    const spOf = rec.origin === 'species' && rec.originName ? speciesByName(rec.originName, rec.source) : null;
    if (spOf) out.push(h('div', { class: 'cd-banner cd-banner-lite' }, ic('users'), h('span', {}, 'Ataque da espécie ', h('b', {}, spOf.name + ' (' + spOf.source + ')'), '.'), h('span', { class: 'grow' }),
      btnI('arrow-right', 'Abrir a espécie', { class: 'btn small', 'data-act': 'open-species', onclick: () => select(spOf.id, 'species') })));

    // Básico
    const basic = h('div', { class: 'form cd-form' },
      F.select(rec, set, 'Tipo', 'type', TYPES, { rebuild: true }),
      F.select(rec, set, 'Origem', 'origin', ORIGINS),
      F.text(rec, set, 'De onde vem (arma, espécie…)', 'originName'),
      F.text(rec, set, 'Usos', 'uses', { input: { placeholder: 'e.g. Proficiency Bonus / Long Rest' } }));
    if (t === 'melee') basic.append(F.dist(rec, set, 'Alcance', 'reach', { ph: '1,5' }), F.dist(rec, set, 'Arremesso: normal', 'range.normal'), F.dist(rec, set, 'Arremesso: longo', 'range.long'));
    else if (t === 'ranged' || t === 'spell-attack') basic.append(F.dist(rec, set, 'Alcance normal', 'range.normal'), F.dist(rec, set, 'Alcance longo', 'range.long', { ph: 'opcional' }));
    else basic.append(F.dist(rec, set, 'Alcance', 'range.normal', { ph: 'vazio = você mesmo (área)' }));
    basic.append(...[
      F.select(rec, set, 'Área', 'area.shape', AREAS, { rebuild: true }),
      rec.area && rec.area.shape ? F.dist(rec, set, rec.area.shape === 'line' ? 'Comprimento' : rec.area.shape === 'cone' ? 'Comprimento do cone' : 'Tamanho', 'area.size') : null,
      rec.area && rec.area.shape === 'line' ? F.dist(rec, set, 'Largura', 'area.width') : null,
      F.select(rec, set, 'Edição', 'edition', { '': '—', 2014: '2014', 2024: '2024' }, { rebuild: true })].filter(Boolean));
    const body = [sec('swords', 'Ataque', basic)];

    // Acerto
    if (atk) {
      body.push(sec('crosshair', 'Rolagem de ataque',
        h('div', { class: 'form cd-form cd-form-4' },
          F.select(rec, set, 'Atributo', 'attack.ability', ATK_ABIL),
          F.num(rec, set, 'Bônus', 'attack.bonus', { input: { placeholder: '+0' } }),
          F.select(rec, set, 'Proficiência', 'attack.prof', PROF),
          h('div', { class: 'cd-calc-box' }, h('small', {}, 'Exemplo'), h('b', { class: 'cd-calc', id: 'cd-atk-calc', title: 'Personagem de exemplo: STR +3, DEX +2, Spellcasting +3, Proficiency +2' }, '= ' + sign(exAttack(rec))))),
        h('div', { class: 'form cd-form cd-form-4' },
          F.num(rec, set, 'Crítico a partir de', 'crit', { input: { min: 2, max: 20, placeholder: '20' } }),
          F.dice(rec, set, 'Dados extras no crítico', 'critExtra', { ph: 'e.g. 1d8' }),
          t !== 'spell-attack' ? F.text(rec, set, 'Munição', 'ammo', { input: { placeholder: 'e.g. Arrow' } }) : null,
          F.check(rec, set, 'O alvo também faz um teste de resistência ao ser atingido', 'saveOnHit', { rebuild: true, cls: 'cd-span2' })),
        h('p', { class: 'hint' }, 'O resultado de verdade vem da ficha (quando ligarmos). Aqui o exemplo usa STR +3, DEX +2, CON +1, Spellcasting +3 e Proficiency +2.')));
    }

    // Resistência
    if (sv) {
      const s = rec.save || {};
      body.push(sec('shield', atk ? 'Teste de resistência ao acertar' : 'Teste de resistência',
        h('div', { class: 'form cd-form cd-form-4' },
          F.select(rec, set, 'O alvo faz um teste de', 'save.ability', SAVE_ABIL),
          F.select(rec, set, 'CD', 'save.dc', { calc: '8 + Prof + atributo', fixed: 'Fixa' }, { rebuild: true }),
          s.dc === 'fixed'
            ? F.num(rec, set, 'Valor da CD', 'save.dcFixed', { input: { min: 1, placeholder: '13' } })
            : F.select(rec, set, 'Atributo da CD', 'save.dcAbility', DC_ABIL),
          s.dc === 'fixed' ? h('span') : F.num(rec, set, 'Bônus na CD', 'save.dcBonus', { input: { placeholder: '+0' } }),
          F.select(rec, set, 'Se o alvo passar', 'save.onSuccess', { half: 'Half damage', none: 'No damage' }),
          F.text(rec, set, 'Efeito se falhar (além do dano)', 'save.effect', { cls: 'cd-span2', input: { placeholder: 'e.g. The target has the Prone condition.' } }),
          h('div', { class: 'cd-calc-box' }, h('small', {}, 'Exemplo'), h('b', { class: 'cd-calc', id: 'cd-dc-calc' }, '= DC ' + exDc(s))))));
    }

    // Dano
    body.push(sec('zap', 'Dano',
      h('div', { class: 'cd-dmgs' }, damageRow(rec, set, 0), damageRow(rec, set, 1)),
      h('div', { class: 'form cd-form cd-form-4' },
        F.dice(rec, set, 'Com as duas mãos (Versatile)', 'versatile', { ph: 'e.g. 1d10' })),
      h('p', { class: 'hint' }, 'Dados aceitam números e somas: 1d8, 2d6+1, 1 (só o atributo). Dano 2 é opcional (ex.: veneno da mordida, dano de fogo extra).')));
    if (r._virtual) out.push(h('fieldset', { class: 'cd-ro', disabled: true }, body));
    else out.push(...body);
    out.push(descSec(rec, set, 'Texto que aparece na ficha ao ver o ataque.', r._virtual));
    return out;
  }

  // ---------- Item ----------
  function famResolve(fam, baseId) {
    const entry = (fam.bases || []).find((b) => b.id === baseId);
    const base = entry && find('items', entry.id);
    if (!base) return null;
    const res = clone(plain(base));
    Object.assign(res, { name: entry.name, rarity: fam.rarity, magic: true, attune: fam.attune, cost: entry.cost, weight: entry.weight ?? base.weight });
    const wb = fam.weaponBonus || {};
    if (res.weapon) { res.weapon.bonusAttack = num(res.weapon.bonusAttack) + num(wb.attack); res.weapon.bonusDamage = num(res.weapon.bonusDamage) + num(wb.damage); if (wb.critThreshold) res.weapon.critThreshold = wb.critThreshold; }
    if (res.armor && fam.bonus && fam.bonus.ac) res.armor.bonusAc = num(res.armor.bonusAc) + num(fam.bonus.ac);
    return res;
  }
  function itemPreview(r) {
    const out = [];
    out.push(chip(CAT_ICON[r.category] || 'tag', 'Categoria', r.category || 'Other'));
    if (r.kind === 'family') out.push(chip('layers', 'Bases', String((r.bases || []).length)));
    if (r.kind === 'group') out.push(chip('layers', 'Versões', String((r.versions || []).length)));
    if (r.magic || r.rarity !== 'None') out.push(chip('sparkles', 'Raridade', r.kind === 'group' && (r.rarities || []).length ? r.rarities.join(' / ') : r.rarity, rarClass(r.rarity)));
    if (r.attune) out.push(chip('link', 'Sintonização', r.attune === true ? 'Yes' : r.attune, 'gold'));
    const w = r.weapon;
    if (w && w.damage && w.damage.dice) out.push(chip('zap', 'Dano', weaponLine(w), 'red'));
    if (w && (num(w.bonusAttack) || num(w.bonusDamage))) out.push(chip('crosshair', 'Bônus', sign(num(w.bonusAttack)) + ' ataque / ' + sign(num(w.bonusDamage)) + ' dano', 'gold'));
    if (r.kind === 'family' && r.weaponBonus) out.push(chip('crosshair', 'Soma na arma', sign(num(r.weaponBonus.attack)) + ' ataque / ' + sign(num(r.weaponBonus.damage)) + ' dano', 'gold'));
    if (w && w.kind === 'melee') out.push(chip('ruler', 'Alcance', dist(w.reach) + ((w.properties || []).includes('Thrown') && w.range ? ' · thrown ' + rangeTxt(w.range) : '')));
    else if (w && w.range) out.push(chip('ruler', 'Alcance', rangeTxt(w.range)));
    if (w && (w.mastery || []).length) out.push(chip('sparkles', 'Mastery', w.mastery.join(', ')));
    const a = r.armor;
    if (a) out.push(chip('shield', 'CA', a.type === 'shield' ? '+' + (num(a.ac) + num(a.bonusAc)) : (num(a.ac) + num(a.bonusAc)) + (a.type === 'heavy' ? '' : a.dexMax != null ? ' + DEX (max ' + a.dexMax + ')' : ' + DEX'), 'gold'));
    if (a && a.strength) out.push(chip('triangle-alert', 'Força', 'STR ' + a.strength));
    if (a && a.stealth) out.push(chip('eye-off', 'Furtividade', 'Disadvantage'));
    const b = r.bonus || {};
    const bl = [['ac', 'AC'], ['spellAttack', 'spell attack'], ['spellSaveDc', 'spell DC'], ['savingThrow', 'saving throws'], ['abilityCheck', 'ability checks']].filter(([k]) => num(b[k])).map(([k, l]) => sign(num(b[k])) + ' ' + l);
    if (bl.length) out.push(chip('sparkles', 'Bônus', bl.join(', '), 'gold'));
    if (r.weight != null && r.weight !== '') out.push(chip('scale', 'Peso', weightTxt(r.weight)));
    if (r.cost != null && r.cost !== '') out.push(chip('coins', 'Preço', costTxt(r.cost) + (r.costOrigin === 'rarity' ? ' (estimado)' : ''), r.costOrigin === 'rarity' ? 'muted' : ''));
    return out;
  }
  function itemForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.items)];
    if (rec.memberOf) {
      const g = find('items', rec.memberOf);
      if (g) out.push(h('div', { class: 'cd-banner' }, ic('layers'), h('span', {}, 'Versão do grupo ', h('b', {}, g.name), '.'), h('span', { class: 'grow' }),
        btnI('undo-2', 'Voltar ao grupo', { class: 'btn small', 'data-act': 'to-group', onclick: () => select(g.id) })));
    }
    if (rec.kind === 'family') out.push(familySec(rec, set));
    if (rec.kind === 'group') out.push(groupSec(rec));

    // Item
    const attMode = rec.attune === true ? 'yes' : rec.attune ? 'req' : 'no';
    const setRarity = (v) => {
      rec.rarity = v;
      if (v !== 'None' && v !== 'Unknown') rec.magic = true;
      if (rec.costOrigin === 'rarity' || (rec.cost == null && ESTIMATE[v])) { rec.cost = ESTIMATE[v] != null ? ESTIMATE[v] * 100 / (rec.magic && (rec.categories || []).includes('Consumable') ? 2 : 1) : null; rec.costOrigin = rec.cost != null ? 'rarity' : null; }
      set('rarity', v, true);
    };
    const setCat = (v) => {
      rec.categories = [v, ...(rec.categories || []).filter((c) => c !== v)];
      if (v === 'Weapon' && !rec.weapon) rec.weapon = blankWeapon();
      if (v === 'Armor' && !rec.armor) rec.armor = blankArmor();
      set('category', v, true);
    };
    const main = h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Categoria principal', 'category', CATS, { onchange: setCat }),
      rec.kind === 'group' ? null : F.select(rec, set, 'Raridade', 'rarity', RARITIES, { onchange: setRarity }),
      F.select(rec, set, 'Edição', 'edition', { '': 'Sem edição', 2014: '2014', 2024: '2024' }, { rebuild: true }),
      F.check(rec, set, 'Item mágico', 'magic', { rebuild: true }),
      h('label', {}, 'Sintonização', h('select', { value: attMode, 'data-f': 'attune-mode', onchange: (e) => set('attune', e.target.value === 'yes' ? true : e.target.value === 'req' ? 'by a Spellcaster' : false, true) },
        h('option', { value: 'no' }, 'Não exige'), h('option', { value: 'yes' }, 'Exige'), h('option', { value: 'req' }, 'Exige, com requisito'))),
      attMode === 'req' ? F.text(rec, set, 'Requisito', 'attune', { input: { placeholder: 'e.g. by a Wizard' } }) : null,
      rec.kind === 'family' || rec.kind === 'group' ? null : F.weight(rec, set, 'Peso', 'weight'),
      rec.kind === 'family' || rec.kind === 'group' ? null : h('label', {}, 'Preço (gp)', h('input', { type: 'number', min: 0, step: 'any', 'data-f': 'cost', value: rec.cost == null ? '' : rec.cost / 100,
        onchange: (e) => { rec.costOrigin = e.target.value === '' ? null : 'book'; set('cost', e.target.value === '' ? null : Math.round(num(e.target.value) * 100), true); } })),
      rec.charges || rec.magic ? F.text(rec, set, 'Cargas', 'charges', { input: { placeholder: 'e.g. 7' } }) : null,
      rec.charges || rec.recharge || rec.magic ? F.text(rec, set, 'Recarga', 'recharge', { input: { placeholder: 'e.g. dawn (1d6+1)' } }) : null);
    const priceHint = rec.costOrigin === 'rarity' ? 'Preço estimado pela raridade (sem preço no livro)' + ((rec.categories || []).includes('Consumable') ? '; consumível paga a metade.' : '.')
      : rec.costOrigin === 'scroll' ? 'Preço da tabela de Spell Scroll.' : rec.kind === 'family' ? 'O preço depende da base escolhida (veja a lista acima).' : '';
    const secCats = h('div', { class: 'cd-subcats' }, h('small', {}, 'Também conta como'),
      CATS.filter((c) => c !== rec.category).map((c) => h('label', { class: 'check cd-subcat' + ((rec.categories || []).includes(c) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: (rec.categories || []).includes(c), 'data-f': 'cat-' + c, onchange: (e) => {
          const s = new Set(rec.categories || [rec.category]); if (e.target.checked) s.add(c); else s.delete(c);
          set('categories', [rec.category, ...CATS.filter((x) => x !== rec.category && s.has(x))], true);
        } }), c)));
    out.push(sec('backpack', 'Item', main, priceHint ? h('p', { class: 'hint' }, priceHint) : null, secCats));

    if (rec.weapon || rec.category === 'Weapon') out.push(weaponSec(rec, set));
    else if (rec.kind === 'family' && (rec.categories || []).includes('Weapon')) out.push(famWeaponSec(rec, set));
    if (rec.armor || rec.category === 'Armor') out.push(armorSec(rec, set));
    if (rec.magic || rec.bonus) out.push(bonusSec(rec, set));
    if (rec.focus || rec.category === 'Spellcasting Focus') out.push(sec('sparkles', 'Foco de conjuração', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Tipo', 'focus.type', { '': '—', arcane: 'Arcane', druid: 'Druidic', holy: 'Holy' }),
      h('label', { class: 'cd-span2' }, 'Classes', h('input', { value: ((rec.focus || {}).classes || []).join(', '), 'data-f': 'focus.classes', placeholder: 'e.g. Sorcerer, Warlock, Wizard',
        onchange: (e) => set('focus.classes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean)) })))));
    const defs = [['resist', 'Resistências'], ['immune', 'Imunidades'], ['vulnerable', 'Vulnerabilidades'], ['conditionImmune', 'Imune a condições']];
    if (defs.some(([k]) => (rec[k] || []).length) || rec.magic) {
      out.push(sec('shield', 'Defesas que o item dá', h('div', { class: 'form cd-form cd-form-4' }, defs.map(([k, l]) => h('label', {}, l, h('input', { value: (rec[k] || []).join(', '), 'data-f': k, placeholder: k === 'conditionImmune' ? 'e.g. charmed' : 'e.g. fire, cold',
        onchange: (e) => set(k, e.target.value.split(',').map((s) => s.trim()).filter(Boolean)) }))))));
    }
    out.push(descSec(rec, set, 'Texto que aparece ao ver o item.'));
    return out;
  }
  function weaponSec(rec, set) {
    if (!rec.weapon) {
      return sec('sword', 'Arma', h('p', { class: 'muted' }, 'Este item é da categoria Weapon, mas ainda não tem os dados de arma.'),
        btnI('plus', 'Adicionar dados de arma', { class: 'btn small', onclick: () => set('weapon', blankWeapon(), true) }));
    }
    const w = rec.weapon;
    w.properties = w.properties || []; w.mastery = w.mastery || []; w.damage = w.damage || { dice: '', type: '' }; w.extraDamage = w.extraDamage || [];
    const has = (p) => w.properties.includes(p);
    const toggleProp = (p, on) => {
      const s = new Set(w.properties); if (on) s.add(p); else s.delete(p);
      set('weapon.properties', PROPS.filter((x) => s.has(x)).concat([...s].filter((x) => !PROPS.includes(x))), true);
    };
    const rng = h('div', { class: 'form cd-form cd-form-4' });
    if (w.kind === 'melee') rng.append(F.dist(rec, set, 'Alcance', 'weapon.reach', { ph: has('Reach') ? '3' : '1,5' }));
    if (w.kind === 'ranged' || has('Thrown')) rng.append(F.dist(rec, set, w.kind === 'melee' ? 'Arremesso: normal' : 'Alcance normal', 'weapon.range.normal'), F.dist(rec, set, w.kind === 'melee' ? 'Arremesso: longo' : 'Alcance longo', 'weapon.range.long'));
    if (w.kind === 'ranged' || has('Ammunition')) rng.append(F.text(rec, set, 'Munição', 'weapon.ammo', { input: { placeholder: 'e.g. Arrow' } }));
    if (has('Reload') || w.reload) rng.append(F.num(rec, set, 'Recarga (tiros)', 'weapon.reload', { input: { min: 1 } }));
    const att = weaponAttack(Object.assign({}, rec, { id: rec.id }));
    return sec('sword', 'Arma',
      h('div', { class: 'form cd-form cd-form-4' },
        F.select(rec, set, 'Categoria', 'weapon.category', { simple: 'Simple', martial: 'Martial' }),
        F.select(rec, set, 'Tipo', 'weapon.kind', { melee: 'Melee', ranged: 'Ranged' }, { rebuild: true }),
        h('label', {}, 'Mastery', h('select', { value: w.mastery[0] || '', 'data-f': 'weapon.mastery', onchange: (e) => set('weapon.mastery', e.target.value ? [e.target.value] : [], true) },
          h('option', { value: '' }, 'None'), MASTERIES.map((m) => h('option', { value: m }, m)))),
        h('span')),
      h('div', { class: 'form cd-form cd-form-4' },
        F.dice(rec, set, 'Dano', 'weapon.damage.dice', { ph: 'e.g. 1d8' }),
        F.select(rec, set, 'Tipo de dano', 'weapon.damage.type', DMG_OPTS),
        has('Versatile') || w.versatile ? F.dice(rec, set, 'Com as duas mãos (Versatile)', 'weapon.versatile', { ph: 'e.g. 1d10' }) : null),
      h('div', { class: 'cd-props' }, PROPS.concat(w.properties.filter((p) => !PROPS.includes(p))).map((p) => h('label', { class: 'check cd-prop' + (has(p) ? ' on' : ''), title: (w.propertyNotes || {})[p] || null },
        h('input', { type: 'checkbox', checked: has(p), 'data-f': 'prop-' + p, onchange: (e) => toggleProp(p, e.target.checked) }), p + ((w.propertyNotes || {})[p] ? ' *' : '')))),
      rng.children.length ? rng : null,
      h('div', { class: 'form cd-form cd-form-4' },
        F.num(rec, set, 'Bônus no ataque', 'weapon.bonusAttack', { input: { placeholder: '+0' } }),
        F.num(rec, set, 'Bônus no dano', 'weapon.bonusDamage', { input: { placeholder: '+0' } }),
        F.num(rec, set, 'Crítico a partir de', 'weapon.critThreshold', { input: { min: 2, max: 20, placeholder: '20' } }), h('span'),
        F.dice(rec, set, 'Dano extra', 'weapon.extraDamage.0.dice', { ph: 'e.g. 2d6 (Flame Tongue)' }),
        F.select(rec, set, 'Tipo do dano extra', 'weapon.extraDamage.0.type', DMG_OPTS)),
      h('div', { class: 'cd-attack-line' }, ic('swords'), h('span', {}, h('small', {}, 'Ataque desta arma'), h('b', {}, TABS.attacks.summary(att))),
        btnI('arrow-right', 'Ver em Ataques', { class: 'btn small', 'data-act': 'to-attack', onclick: () => select('w:' + rec.id, 'attacks') })));
  }
  function famWeaponSec(rec, set) {
    return sec('sword', 'O que soma na arma', h('div', { class: 'form cd-form cd-form-4' },
      F.num(rec, set, 'Bônus no ataque', 'weaponBonus.attack', { input: { placeholder: '+0' } }),
      F.num(rec, set, 'Bônus no dano', 'weaponBonus.damage', { input: { placeholder: '+0' } }),
      F.num(rec, set, 'Crítico a partir de', 'weaponBonus.critThreshold', { input: { min: 2, max: 20, placeholder: '20' } })),
    h('p', { class: 'hint' }, 'Dano, propriedades e alcance vêm da arma escolhida como base.'));
  }
  function armorSec(rec, set) {
    if (!rec.armor) return sec('shield', 'Armadura', btnI('plus', 'Adicionar dados de armadura', { class: 'btn small', onclick: () => set('armor', blankArmor(), true) }));
    const a = rec.armor;
    const setType = (v) => { rec.armor.dexMax = v === 'medium' ? 2 : v === 'heavy' || v === 'shield' ? 0 : null; set('armor.type', v, true); };
    return sec('shield', 'Armadura', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Tipo', 'armor.type', { light: 'Light', medium: 'Medium', heavy: 'Heavy', shield: 'Shield' }, { onchange: setType }),
      F.num(rec, set, a.type === 'shield' ? 'Bônus de CA' : 'CA base', 'armor.ac', { input: { min: 0 } }),
      a.type === 'light' || a.type === 'medium' ? F.num(rec, set, 'DEX máxima', 'armor.dexMax', { input: { min: 0, placeholder: 'sem limite' } }) : null,
      F.num(rec, set, 'Força mínima', 'armor.strength', { input: { min: 0, placeholder: '—' } }),
      F.check(rec, set, 'Desvantagem em Furtividade', 'armor.stealth'),
      F.num(rec, set, 'Bônus mágico de CA', 'armor.bonusAc', { input: { placeholder: '+0' } })));
  }
  function bonusSec(rec, set) {
    return sec('sparkles', 'Bônus mágicos', h('div', { class: 'form cd-form cd-form-4' },
      rec.armor ? null : F.num(rec, set, 'CA', 'bonus.ac', { input: { placeholder: '+0' } }),
      F.num(rec, set, 'Ataque de magia', 'bonus.spellAttack', { input: { placeholder: '+0' } }),
      F.num(rec, set, 'CD de magia', 'bonus.spellSaveDc', { input: { placeholder: '+0' } }),
      F.num(rec, set, 'Testes de resistência', 'bonus.savingThrow', { input: { placeholder: '+0' } }),
      F.num(rec, set, 'Testes de atributo', 'bonus.abilityCheck', { input: { placeholder: '+0' } })));
  }
  function familySec(rec, set) {
    const bases = rec.bases || [];
    const cur = bases.some((b) => b.id === C.famBase[rec.id]) ? C.famBase[rec.id] : (bases[0] || {}).id;
    const res = cur ? famResolve(rec, cur) : null;
    const pick = h('select', { 'data-f': 'family-base', value: cur || '', onchange: (e) => { C.famBase[rec.id] = e.target.value; renderMain(); } },
      bases.map((b) => { const bi = find('items', b.id); return h('option', { value: b.id }, (bi ? bi.name : b.id) + (bi && bi.edition ? ' (' + bi.edition + ')' : '') + ' → ' + b.name); }));
    return sec('layers', 'Família de variantes',
      h('p', { class: 'muted cd-fam-req' }, ic('filter'), 'Vale para: ', h('b', {}, rec.requires || 'Any item'), ' · ' + bases.length + ' bases compatíveis da mesma edição.'),
      h('div', { class: 'form cd-form cd-form-4' },
        F.text(rec, set, 'Antes do nome', 'rule.prefix', { input: { placeholder: 'e.g. +1 ' } }),
        F.text(rec, set, 'Depois do nome', 'rule.suffix', { input: { placeholder: 'e.g.  of Warning' } }),
        h('label', { class: 'cd-span2' }, 'Ver com a base', pick)),
      res ? h('div', { class: 'cd-fam-res' }, h('b', {}, res.name), h('div', { class: 'cd-preview' }, ...itemPreview(res)),
        btnI('arrow-right', 'Abrir a base', { class: 'btn small ghost', onclick: () => select(cur) })) : h('p', { class: 'empty' }, 'Nenhuma base compatível.'),
      h('details', { class: 'cd-bases' }, h('summary', {}, 'Todas as bases (' + bases.length + ')'),
        h('div', { class: 'cd-bases-grid' }, bases.map((b) => h('button', { class: 'cd-base' + (b.id === cur ? ' on' : ''), onclick: () => { C.famBase[rec.id] = b.id; renderMain(); } },
          h('span', {}, b.name), h('small', {}, costTxt(b.cost) || '—'))))));
  }
  function groupSec(rec) {
    const vs = (rec.versions || []).map((id) => find('items', id)).filter(Boolean);
    return sec('layers', 'Versões', h('div', { class: 'cd-versions' }, vs.map((v) => h('button', { class: 'cd-version', 'data-id': v.id, onclick: () => select(v.id) },
      h('b', { class: rarClass(v.rarity) }, v.name), h('small', {}, [v.kind === 'family' ? 'Família' : '', v.rarity, v.attune ? 'attunement' : '', costTxt(v.cost)].filter(Boolean).join(' · ')), ic('chevron-right')))),
    vs.length < (rec.versions || []).length ? h('p', { class: 'hint' }, 'Algumas versões foram apagadas.') : null);
  }

  // ---------- Magia ----------
  function spellPreview(r) {
    const out = [chip('sparkles', 'Nível', (r.level === 0 ? 'Cantrip' : LEVELS[r.level] + '-level') + ' ' + (r.school || ''))];
    out.push(chip('hourglass', 'Conjuração', timeTxt(r.time) + (r.ritual ? ' or ritual' : '')));
    out.push(chip('ruler', 'Alcance', rangeSpellTxt(r) || '—'));
    const c = r.components || {};
    out.push(chip('hand', 'Componentes', [c.v && 'V', c.s && 'S', c.m && 'M'].filter(Boolean).join(', ') + (c.cost ? ' (' + costTxt(c.cost) + (c.consume ? ', consumed' : '') + ')' : '') || '—'));
    out.push(chip('clock', 'Duração', durTxt(r.duration) || '—', (r.duration || {}).concentration ? 'gold' : ''));
    if (r.attack) out.push(chip('crosshair', 'Ataque', (r.attack === 'melee' ? 'Melee' : 'Ranged') + ' spell attack', 'gold'));
    if (r.save) out.push(chip('shield', 'Resistência', [r.save].concat(r.saveAlso || []).map((x) => ABIL[x]).join('/') + ' · ' + (r.onSuccess === 'half' ? 'half on success' : 'no effect on success'), 'gold'));
    const d = (r.damage || []).filter((x) => x.dice).map((x) => x.dice + ' ' + x.type).join(' + ');
    if (d) out.push(chip('zap', 'Dano', d + (r.higher && r.higher.perSlot ? ' (+' + r.higher.perSlot + '/nível)' : ''), 'red'));
    if (r.heal) out.push(chip('heart-pulse', 'Cura', r.heal + (r.higher && r.higher.perSlotHeal ? ' (+' + r.higher.perSlotHeal + '/nível)' : ''), 'gold'));
    if ((r.conditions || []).length) out.push(chip('triangle-alert', 'Condições', r.conditions.join(', ')));
    if ((r.classes || []).length) out.push(chip('users', 'Classes', r.classes.join(', ')));
    return out;
  }
  function spellForm(r) {
    const { rec, set } = editor(r);
    rec.damage = rec.damage || [];
    while (rec.damage.length < 2) rec.damage.push({ dice: '', type: '' });
    rec.higher = rec.higher || { perSlot: '', perSlotHeal: '', cantrip: null, text: '' };
    const out = [head(r, rec, set, TABS.spells)];
    out.push(sec('sparkles', 'Magia', h('div', { class: 'form cd-form cd-form-4' },
      h('label', {}, 'Nível', h('select', { value: String(rec.level), 'data-f': 'level', onchange: (e) => set('level', Number(e.target.value), true) },
        LEVELS.map((l, i) => h('option', { value: String(i) }, i === 0 ? 'Cantrip' : l + ' level')))),
      F.select(rec, set, 'Escola', 'school', SCHOOLS),
      F.select(rec, set, 'Edição', 'edition', { '': '—', 2014: '2014', 2024: '2024' }, { rebuild: true }),
      F.check(rec, set, 'Ritual', 'ritual'))));
    const g = rec.range || {}, a = rec.area || {}, c = rec.components || {};
    out.push(sec('hourglass', 'Conjuração',
      h('div', { class: 'form cd-form cd-form-4' },
        F.num(rec, set, 'Tempo', 'time.number', { input: { min: 1 } }),
        F.select(rec, set, 'Unidade', 'time.unit', TIME_UNITS, { rebuild: true }),
        rec.time && rec.time.unit === 'reaction' ? F.text(rec, set, 'Gatilho da reação', 'time.condition', { cls: 'cd-span2', input: { placeholder: 'e.g. which you take when you are hit by an attack roll' } }) : null),
      h('div', { class: 'form cd-form cd-form-4' },
        F.select(rec, set, 'Alcance', 'range.kind', RANGE_KINDS, { rebuild: true }),
        g.kind === 'distance' ? F.dist(rec, set, 'Distância', 'range.distance') : h('span'),
        F.select(rec, set, 'Área', 'area.shape', SPELL_AREAS, { rebuild: true }),
        a.shape ? F.dist(rec, set, a.shape === 'line' ? 'Comprimento' : a.shape === 'sphere' || a.shape === 'cylinder' || a.shape === 'emanation' ? 'Raio' : 'Tamanho', 'area.size') : null,
        a.shape === 'line' ? F.dist(rec, set, 'Largura', 'area.width') : null),
      h('div', { class: 'form cd-form cd-form-4' },
        F.check(rec, set, 'Verbal (V)', 'components.v'),
        F.check(rec, set, 'Somático (S)', 'components.s'),
        F.check(rec, set, 'Material (M)', 'components.m', { rebuild: true }),
        c.m ? F.check(rec, set, 'O material é consumido', 'components.consume') : null),
      c.m ? h('div', { class: 'form cd-form cd-form-4' },
        F.text(rec, set, 'Material', 'components.material', { cls: 'cd-span2', input: { placeholder: 'e.g. a diamond worth 300+ GP' } }),
        h('label', {}, 'Custo (gp)', h('input', { type: 'number', min: 0, step: 'any', 'data-f': 'components.cost', value: c.cost == null ? '' : c.cost / 100,
          onchange: (e) => set('components.cost', e.target.value === '' ? null : Math.round(num(e.target.value) * 100)) }))) : null));
    const d = rec.duration || {};
    out.push(sec('clock', 'Duração', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Tipo', 'duration.type', DUR_TYPES, { rebuild: true }),
      d.type === 'timed' ? F.num(rec, set, 'Quanto', 'duration.amount', { input: { min: 1 } }) : null,
      d.type === 'timed' ? F.select(rec, set, 'Unidade', 'duration.unit', DUR_UNITS) : null,
      F.check(rec, set, 'Concentração', 'duration.concentration'))));
    out.push(sec('zap', 'Efeito',
      h('div', { class: 'form cd-form cd-form-4' },
        F.select(rec, set, 'Ataque de magia', 'attack', { '': 'None', melee: 'Melee spell attack', ranged: 'Ranged spell attack' }, { rebuild: true }),
        F.select(rec, set, 'Teste de resistência', 'save', Object.assign({ '': 'None' }, ABIL), { rebuild: true }),
        rec.save ? F.select(rec, set, 'Se o alvo passar', 'onSuccess', { half: 'Half damage', none: 'No damage / no effect' }) : null,
        F.dice(rec, set, 'Cura', 'heal', { ph: 'e.g. 2d8' })),
      h('div', { class: 'cd-dmgs' }, [0, 1].map((i) => h('div', { class: 'cd-dmg cd-dmg-3' },
        h('span', { class: 'cd-dmg-n' }, 'Dano ' + (i + 1)),
        F.dice(rec, set, 'Dados', 'damage.' + i + '.dice', { ph: i ? 'e.g. 4d6 (optional)' : 'e.g. 8d6' }),
        F.select(rec, set, 'Tipo de dano', 'damage.' + i + '.type', DMG_OPTS)))),
      h('div', { class: 'cd-subcats' }, h('small', {}, 'Condições'), CONDITIONS.map((cn) => h('label', { class: 'check cd-subcat' + ((rec.conditions || []).includes(cn) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: (rec.conditions || []).includes(cn), 'data-f': 'cond-' + cn, onchange: (e) => {
          const st = new Set(rec.conditions || []); if (e.target.checked) st.add(cn); else st.delete(cn);
          set('conditions', CONDITIONS.filter((x) => st.has(x)), true);
        } }), cn))),
      rec.attack || rec.save ? h('div', { class: 'cd-attack-line' }, ic('swords'), h('span', {}, h('small', {}, 'Ataque desta magia'), h('b', {}, TABS.attacks.summary(spellAttack(rec)))),
        btnI('arrow-right', 'Ver em Ataques', { class: 'btn small', 'data-act': 'to-attack', onclick: () => select('s:' + rec.id, 'attacks') })) : null));
    // nível superior
    const hi = rec.higher;
    out.push(sec('arrow-up', rec.level === 0 ? 'Aumento do truque' : 'Em nível superior',
      rec.level === 0
        ? h('div', { class: 'form cd-form cd-form-4' }, ['1', '5', '11', '17'].map((lv) => h('label', {}, 'Nível ' + lv, h('input', { value: (hi.cantrip || {})[lv] || '', 'data-f': 'cantrip-' + lv, placeholder: lv === '1' ? 'e.g. 1d10' : '',
          onchange: (e) => { const cc = Object.assign({}, hi.cantrip || {}); if (e.target.value.trim()) cc[lv] = e.target.value.trim(); else delete cc[lv]; set('higher.cantrip', Object.keys(cc).length ? cc : null); } }))))
        : h('div', { class: 'form cd-form cd-form-4' },
          F.dice(rec, set, 'Dano a mais por nível do espaço', 'higher.perSlot', { ph: 'e.g. 1d6' }),
          F.dice(rec, set, 'Cura a mais por nível do espaço', 'higher.perSlotHeal', { ph: 'e.g. 2d8' })),
      hi.text ? descView(hi.text) : null));
    // classes
    const known = classList();
    out.push(sec('users', 'Quem tem a magia',
      h('div', { class: 'cd-subcats' }, h('small', {}, 'Classes'), known.map((cl) => h('label', { class: 'check cd-subcat' + ((rec.classes || []).includes(cl) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: (rec.classes || []).includes(cl), 'data-f': 'cls-' + cl, onchange: (e) => {
          const st = new Set(rec.classes || []); if (e.target.checked) st.add(cl); else st.delete(cl);
          set('classes', known.filter((x) => st.has(x)).concat([...st].filter((x) => !known.includes(x))), true);
        } }), cl))),
      h('div', { class: 'form cd-form' },
        h('label', { class: 'cd-span2' }, 'Subclasses (Classe: Subclasse, separadas por vírgula)', h('input', { value: (rec.subclasses || []).join(', '), 'data-f': 'subclasses', placeholder: 'e.g. Cleric: Light, Warlock: Fiend',
          onchange: (e) => set('subclasses', e.target.value.split(',').map((x) => x.trim()).filter(Boolean)) })),
        h('label', { class: 'cd-span2' }, 'Listas expandidas (classes)', h('input', { value: (rec.classesExpanded || []).join(', '), 'data-f': 'classesExpanded',
          onchange: (e) => set('classesExpanded', e.target.value.split(',').map((x) => x.trim()).filter(Boolean)) }))),
      classLinks(rec.classes),
      subclassLinks(rec.subclasses),
      grantedLine(rec.grantedBy)));
    out.push(descSec(rec, set, 'Texto da magia.'));
    return out;
  }
  function classList() {
    const st = new Set();
    for (const r of records('spells')) for (const c of r.classes || []) st.add(c);
    return [...st].sort();
  }
  function grantedLine(g) {
    g = g || {};
    const parts = [['species', 'Espécies'], ['feats', 'Talentos'], ['backgrounds', 'Antecedentes'], ['options', 'Opções de classe']].filter(([k]) => (g[k] || []).length);
    if (!parts.length) return null;
    return h('div', { class: 'cd-granted' }, h('small', {}, 'Também dão esta magia (ligados quando esses cadastros existirem)'),
      parts.map(([k, l]) => h('p', {}, h('b', {}, l + ': '), k === 'species'
        ? g[k].map((n, i) => { const sp = speciesByName(n);
          return [i ? ', ' : '', sp ? h('a', { href: '#', class: 'cd-link', onclick: (e) => { e.preventDefault(); select(sp.id, 'species'); } }, n) : n]; })
        : k === 'options'
        ? g[k].map((n, i) => { const op = records('options').filter((x) => x.name === n).sort((a, b) => String(b.edition).localeCompare(String(a.edition)))[0];
          return [i ? ', ' : '', op ? h('a', { href: '#', class: 'cd-link', onclick: (e) => { e.preventDefault(); select(op.id, 'options'); } }, n) : n]; })
        : k === 'feats'
        ? g[k].map((n, i) => { const ft = records('feats').filter((x) => x.name === n).sort((a, b) => String(b.edition).localeCompare(String(a.edition)))[0];
          return [i ? ', ' : '', ft ? h('a', { href: '#', class: 'cd-link', onclick: (e) => { e.preventDefault(); select(ft.id, 'feats'); } }, n) : n]; })
        : g[k].join(', '))));
  }

  // ---------- Pré-requisitos e benefícios (Plano 44; reaproveitados por antecedentes, espécies e classes) ----------
  const csv = (a) => [].concat(a || []).join(', ');
  const uncsv = (t) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);
  function condTxt(c) {
    if (c.type === 'level') return 'Level ' + c.value + (c.cls ? ' ' + c.cls : '');
    if (c.type === 'ability') return (c.abilities || []).map((a) => ABIL[a]).join(' or ') + ' ' + c.min;
    if (['species', 'feat', 'background', 'feature', 'campaign', 'spell', 'pact', 'item', 'option'].includes(c.type)) return (c.names || []).join(' or ') + (c.type === 'campaign' ? ' campaign' : '');
    return c.text || PRE_TYPES[c.type] || '';
  }
  const prereqTxt = (P) => (P || []).map((row) => row.map(condTxt).filter(Boolean).join(', ')).filter(Boolean).join(' or ');
  function blockTxt(bl) {
    const p = [];
    if (bl.fixed && bl.fixed.length) p.push(csv(bl.fixed));
    if (bl.any) p.push(Object.entries(bl.any).map(([k, n]) => n + ' ' + (k === 'any' ? 'any' : k.replace(/^any/, 'any ').toLowerCase())).join(', '));
    if (bl.choose) p.push('choose ' + (bl.choose.count || 1) + (bl.choose.from && bl.choose.from.length ? ' from ' + bl.choose.from.join('/') : bl.choose.filter ? ' (' + bl.choose.filter + ')' : ''));
    return p.join(', ');
  }
  function abilityTxt(bl) {
    const p = [];
    if (bl.weighted) return (bl.weighted.weights || []).map((w) => '+' + w).join('/') + ' among ' + (bl.weighted.from || []).map((a) => ABIL[a]).join('/');
    if (bl.fixed) p.push(Object.entries(bl.fixed).map(([k, n]) => sign(n) + ' ' + ABIL[k]).join(', '));
    if (bl.choose) p.push(sign(bl.choose.amount || 1) + ' ' + ((bl.choose.from || []).length === 6 ? 'any' : (bl.choose.from || []).map((a) => ABIL[a]).join('/')) + ((bl.choose.count || 1) > 1 ? ' ×' + bl.choose.count : ''));
    return p.join(', ') + (bl.max ? ' (max ' + bl.max + ')' : '');
  }
  function benefitsTxt(b) {
    b = b || {};
    const p = [];
    if ((b.ability || []).length) p.push(b.ability.filter((x) => !x.hidden).map(abilityTxt).join(' or ') || abilityTxt(b.ability[0]));
    if (b.spells) {
      const g = b.spells.groups || [];
      // sem repetir (o Evoker escolhe "magia de Evocação" em vários níveis): "Cantrip–2nd-level … ×2"
      const parts = (g[0] || { items: [] }).items.map((i) => (i.spell || i.name ? i.name : (i.count > 1 ? i.count + ' × ' : '') + i.label));
      const cnt = new Map(); parts.forEach((p) => cnt.set(p, (cnt.get(p) || 0) + 1));
      const one = [...cnt].map(([p, n]) => p + (n > 1 ? ' (×' + n + ')' : '')).join(', ');
      p.push(g.length > 1 ? 'spells (' + g.length + ' lists)' : 'spells: ' + one);
    }
    for (const pr of b.proficiencies || []) p.push((PROF_KINDS[pr.kind] || pr.kind).toLowerCase() + ': ' + blockTxt(pr));
    for (const ex of b.expertise || []) p.push('expertise: ' + blockTxt(ex));
    for (const se of b.senses || []) p.push(se.type + ' ' + dist(se.range));
    for (const k of ['resist', 'immune', 'conditionImmune']) if (b[k]) p.push((k === 'resist' ? 'resistance' : k === 'immune' ? 'immunity' : 'condition immunity') + ': ' + blockTxt(b[k]));
    for (const o of b.options || []) p.push(o.name + (o.count > 1 ? ' ×' + o.count : ''));
    return p.join(' · ');
  }
  const xBtn = (title, onclick) => h('button', { class: 'icon-btn cd-x', title, 'aria-label': title, onclick }, ic('x'));
  const addBtn = (label, onclick, act) => btnI('plus', label, { class: 'btn small ghost cd-add', 'data-act': act || null, onclick });
  // Pré-requisitos: linhas = alternativas (OU); condições da linha valem juntas (E)
  function prereqEditor(rec, set, path) {
    const P = clone(get(rec, path) || []);
    const save = () => set(path, P.filter((row) => row.length), true);
    const featNames = [...new Set(records('feats').map((x) => x.name))].sort();
    const condRow = (row, ri, c, ci) => {
      const upd = (k, v) => { row[ci] = Object.assign({}, c, { [k]: v }); save(); };
      const typeSel = h('select', { value: c.type, 'data-f': 'pre-' + ri + '-' + ci + '-type', onchange: (e) => { row[ci] = { type: e.target.value }; if (e.target.value === 'ability') row[ci].abilities = ['str'], row[ci].min = 13; if (e.target.value === 'level') row[ci].value = 4; save(); } },
        Object.entries(PRE_TYPES).map(([v, l]) => h('option', { value: v }, l)));
      let body;
      if (c.type === 'level') body = [h('input', { type: 'number', min: 1, max: 20, value: c.value ?? '', 'data-f': 'pre-' + ri + '-' + ci + '-value', onchange: (e) => upd('value', num(e.target.value, 1)) }),
        h('input', { value: c.cls || '', placeholder: 'classe (opcional)', 'data-f': 'pre-' + ri + '-' + ci + '-cls', onchange: (e) => upd('cls', e.target.value.trim()) })];
      else if (c.type === 'ability') body = [h('span', { class: 'cd-abils' }, Object.entries(ABIL).map(([k, l]) => h('label', { class: 'check cd-subcat' + ((c.abilities || []).includes(k) ? ' on' : '') },
          h('input', { type: 'checkbox', checked: (c.abilities || []).includes(k), onchange: (e) => { const st = new Set(c.abilities || []); if (e.target.checked) st.add(k); else st.delete(k); upd('abilities', Object.keys(ABIL).filter((x) => st.has(x))); } }), l))),
        h('input', { type: 'number', min: 1, max: 30, value: c.min ?? 13, title: 'Valor mínimo', 'data-f': 'pre-' + ri + '-' + ci + '-min', onchange: (e) => upd('min', num(e.target.value, 13)) })];
      else if (c.type === 'spell' || c.type === 'option') {
        const tab = c.type === 'spell' ? 'spells' : 'options', ids = c.type === 'spell' ? c.spells || [] : c.ids || [];
        body = [h('input', { class: 'grow', value: csv(c.names), placeholder: c.type === 'spell' ? 'ex.: Eldritch Blast (ou um texto: "a Warlock cantrip that deals damage")' : 'ex.: Pact of the Blade', list: c.type === 'spell' ? 'cd-spell-names' : 'cd-option-names', 'data-f': 'pre-' + ri + '-' + ci + '-names',
          onchange: (e) => { const names = uncsv(e.target.value); const hits = names.map((n) => resolvePick(tab, n)); row[ci] = Object.assign({}, c, { names: hits.map((x, k) => (x ? x.name : names[k].split('|')[0].trim())), [c.type === 'spell' ? 'spells' : 'ids']: hits.map((x) => (x ? x.id : null)) }); save(); } }),
          ...ids.map((id, k) => (id ? h('button', { class: 'btn small ghost', title: 'Abrir ' + (c.names || [])[k], 'data-act': 'open-pre-' + c.type, onclick: () => select(id, tab) }, ic('arrow-right')) : null))];
        pickList(c.type === 'spell' ? 'cd-spell-names' : 'cd-option-names', tab);
      }
      else if (['species', 'feat', 'background', 'feature', 'campaign', 'pact', 'item'].includes(c.type)) body = [h('input', { class: 'grow', value: csv(c.names), placeholder: 'nomes, separados por vírgula (qualquer um serve)', list: c.type === 'feat' ? 'cd-feat-names' : null, 'data-f': 'pre-' + ri + '-' + ci + '-names', onchange: (e) => upd('names', uncsv(e.target.value)) })];
      else body = [h('input', { class: 'grow', value: c.text || '', placeholder: c.type === 'spellcasting' ? 'e.g. Spellcasting or Pact Magic feature' : 'texto', 'data-f': 'pre-' + ri + '-' + ci + '-text', onchange: (e) => upd('text', e.target.value.trim()) })];
      return h('div', { class: 'cd-cond' }, typeSel, ...body, xBtn('Tirar esta condição', () => { row.splice(ci, 1); save(); }));
    };
    const rows = P.map((row, ri) => h('div', { class: 'cd-alt' },
      ri ? h('span', { class: 'cd-or' }, 'ou') : null,
      h('div', { class: 'cd-alt-body' }, row.map((c, ci) => condRow(row, ri, c, ci)),
        h('div', { class: 'cd-alt-foot' }, addBtn('Condição (e)', () => { row.push({ type: 'level', value: 4 }); save(); }), xBtn('Tirar esta alternativa', () => { P.splice(ri, 1); save(); })))));
    return h('div', { class: 'cd-pre' }, h('datalist', { id: 'cd-feat-names' }, featNames.map((n) => h('option', { value: n }))),
      rows.length ? rows : h('p', { class: 'muted' }, 'Sem pré-requisito.'),
      addBtn(rows.length ? 'Alternativa (ou)' : 'Adicionar pré-requisito', () => { P.push([{ type: 'level', value: 4 }]); save(); }, 'pre-add'));
  }
  // Escolha/fixo genérico (proficiências, especialização, defesas)
  function blockFields(bl, upd, idp, fromPh) {
    return [
      h('label', {}, 'Fixos', h('input', { value: csv(bl.fixed), placeholder: 'e.g. perception, stealth', 'data-f': idp + '-fixed', onchange: (e) => upd('fixed', uncsv(e.target.value)) })),
      h('label', {}, 'À escolha: quantos', h('input', { type: 'number', min: 0, value: bl.choose ? bl.choose.count || 1 : '', placeholder: '0', 'data-f': idp + '-count', onchange: (e) => upd('choose', num(e.target.value) ? Object.assign({}, bl.choose || { from: [] }, { count: num(e.target.value) }) : undefined) })),
      h('label', { class: 'cd-span2' }, 'À escolha: de quais', h('input', { value: bl.choose ? csv(bl.choose.from) : '', placeholder: fromPh || 'e.g. arcana, history (vazio = qualquer)', 'data-f': idp + '-from', onchange: (e) => upd('choose', Object.assign({ count: 1 }, bl.choose || {}, { from: uncsv(e.target.value) })) })),
      bl.any ? h('label', { class: 'cd-span2' }, 'Qualquer (tipo = quantos)', h('input', { value: Object.entries(bl.any).map(([k, n]) => k + '=' + n).join(', '), 'data-f': idp + '-any',
        onchange: (e) => upd('any', Object.fromEntries(uncsv(e.target.value).map((p) => p.split('=')).filter((p) => p[0]).map(([k, n]) => [k.trim(), num(n, 1)]))) })) : null,
    ];
  }
  const BEN_SECTIONS = ['ability', 'proficiencies', 'expertise', 'spells', 'senses', 'defenses', 'options'];
  function benefitsEditor(rec, set, path, only) {
    const B = clone(get(rec, path) || {});
    const save = (k, v) => { if (v == null || (Array.isArray(v) && !v.length)) delete B[k]; else B[k] = v; set(path, B, true); };
    const out = [];
    // Aumento de atributo
    const AB = B.ability || [];
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('arrow-up'), 'Aumento de atributo'),
      AB.map((bl, i) => {
        const upd = (nb) => { AB[i] = nb; save('ability', AB); };
        const mode = bl.weighted ? 'weighted' : bl.choose ? 'choose' : 'fixed';
        if (mode === 'weighted') {
          const W = bl.weighted;
          return h('div', { class: 'cd-alt' }, i ? h('span', { class: 'cd-or' }, 'ou') : null, h('div', { class: 'cd-alt-body' }, h('div', { class: 'cd-cond' },
            h('select', { value: mode, 'data-f': 'ab-' + i + '-mode', onchange: (e) => upd(e.target.value === 'choose' ? { choose: { from: Object.keys(ABIL), count: 1, amount: 1 } } : e.target.value === 'fixed' ? { fixed: { str: 1 } } : bl) },
              h('option', { value: 'fixed' }, 'Fixo'), h('option', { value: 'choose' }, 'À escolha'), h('option', { value: 'weighted' }, 'Com pesos')),
            h('span', { class: 'cd-abils' }, Object.entries(ABIL).map(([k, l]) => h('label', { class: 'check cd-subcat' + ((W.from || []).includes(k) ? ' on' : '') },
              h('input', { type: 'checkbox', checked: (W.from || []).includes(k), 'data-f': 'ab-' + i + '-wfrom-' + k, onchange: (e) => { const st = new Set(W.from || []); if (e.target.checked) st.add(k); else st.delete(k); upd({ weighted: { from: Object.keys(ABIL).filter((x) => st.has(x)), weights: W.weights } }); } }), l))),
            h('label', { class: 'cd-abil-n' }, 'pesos', h('input', { value: (W.weights || []).join(', '), title: 'Ex.: 2, 1 (+2 em um e +1 em outro) ou 1, 1, 1', 'data-f': 'ab-' + i + '-weights', class: 'cd-weights',
              onchange: (e) => upd({ weighted: { from: W.from, weights: uncsv(e.target.value).map((x) => num(x, 1)) } }) })),
            xBtn('Tirar', () => { AB.splice(i, 1); save('ability', AB); }))));
        }
        return h('div', { class: 'cd-alt' }, i ? h('span', { class: 'cd-or' }, 'ou') : null, h('div', { class: 'cd-alt-body' },
          h('div', { class: 'cd-cond' },
            h('select', { value: mode, 'data-f': 'ab-' + i + '-mode', onchange: (e) => upd(e.target.value === 'choose' ? { choose: { from: Object.keys(ABIL), count: 1, amount: 1 }, max: bl.max } : e.target.value === 'weighted' ? { weighted: { from: ['int', 'wis', 'cha'], weights: [2, 1] } } : { fixed: { str: 1 }, max: bl.max }) },
              h('option', { value: 'fixed' }, 'Fixo'), h('option', { value: 'choose' }, 'À escolha'), h('option', { value: 'weighted' }, 'Com pesos')),
            mode === 'fixed'
              ? h('span', { class: 'cd-abils' }, Object.entries(ABIL).map(([k, l]) => h('label', { class: 'cd-abil-n' }, l, h('input', { type: 'number', value: (bl.fixed || {})[k] || '', placeholder: '0', 'data-f': 'ab-' + i + '-' + k,
                onchange: (e) => { const fx = Object.assign({}, bl.fixed || {}); if (num(e.target.value)) fx[k] = num(e.target.value); else delete fx[k]; upd(Object.assign({}, bl, { fixed: fx })); } }))))
              : h('span', { class: 'cd-abils' }, Object.entries(ABIL).map(([k, l]) => h('label', { class: 'check cd-subcat' + ((bl.choose.from || []).includes(k) ? ' on' : '') },
                h('input', { type: 'checkbox', checked: (bl.choose.from || []).includes(k), 'data-f': 'ab-' + i + '-from-' + k, onchange: (e) => { const st = new Set(bl.choose.from || []); if (e.target.checked) st.add(k); else st.delete(k); upd(Object.assign({}, bl, { choose: Object.assign({}, bl.choose, { from: Object.keys(ABIL).filter((x) => st.has(x)) }) })); } }), l)),
              h('label', { class: 'cd-abil-n' }, '+', h('input', { type: 'number', min: 1, value: bl.choose.amount || 1, title: 'Quanto aumenta', 'data-f': 'ab-' + i + '-amount', onchange: (e) => upd(Object.assign({}, bl, { choose: Object.assign({}, bl.choose, { amount: num(e.target.value, 1) }) })) })),
              h('label', { class: 'cd-abil-n' }, '×', h('input', { type: 'number', min: 1, value: bl.choose.count || 1, title: 'Em quantos atributos', 'data-f': 'ab-' + i + '-count', onchange: (e) => upd(Object.assign({}, bl, { choose: Object.assign({}, bl.choose, { count: num(e.target.value, 1) }) })) }))),
            h('label', { class: 'cd-abil-n' }, 'máx.', h('input', { type: 'number', min: 1, value: bl.max || '', placeholder: '20', 'data-f': 'ab-' + i + '-max', onchange: (e) => upd(Object.assign({}, bl, { max: num(e.target.value) || undefined })) })),
            xBtn('Tirar', () => { AB.splice(i, 1); save('ability', AB); }))));
      }),
      addBtn(AB.length ? 'Alternativa (ou)' : 'Adicionar aumento', () => { AB.push({ choose: { from: Object.keys(ABIL), count: 1, amount: 1 } }); save('ability', AB); }, 'ab-add')));
    // Proficiências
    const PR = B.proficiencies || [];
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('check'), 'Proficiências'),
      PR.map((pr, i) => {
        const upd = (k, v) => { PR[i] = Object.assign({}, pr, { [k]: v }); if (v === undefined) delete PR[i][k]; save('proficiencies', PR); };
        return h('div', { class: 'cd-brow' }, h('div', { class: 'form cd-form cd-form-4' },
          h('label', {}, 'Tipo', h('select', { value: pr.kind, 'data-f': 'pr-' + i + '-kind', onchange: (e) => upd('kind', e.target.value) }, Object.entries(PROF_KINDS).map(([v, l]) => h('option', { value: v }, l)))),
          ...blockFields(pr, upd, 'pr-' + i)), xBtn('Tirar', () => { PR.splice(i, 1); save('proficiencies', PR); }));
      }),
      addBtn('Adicionar proficiência', () => { PR.push({ kind: 'skill', fixed: [] }); save('proficiencies', PR); }, 'pr-add')));
    // Especialização
    const EX = B.expertise || [];
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('sparkles'), 'Especialização'),
      EX.map((ex, i) => {
        const upd = (k, v) => { EX[i] = Object.assign({}, ex, { [k]: v }); if (v === undefined) delete EX[i][k]; save('expertise', EX); };
        return h('div', { class: 'cd-brow' }, h('div', { class: 'form cd-form cd-form-4' }, ...blockFields(ex, upd, 'ex-' + i, 'e.g. perception (vazio = uma perícia em que já é proficiente)')), xBtn('Tirar', () => { EX.splice(i, 1); save('expertise', EX); }));
      }),
      addBtn('Adicionar especialização', () => { EX.push({ choose: { from: [], count: 1 } }); save('expertise', EX); }, 'ex-add')));
    // Magias
    const SP = B.spells || { ability: null, groups: [] };
    const saveSp = () => save('spells', SP.groups.length ? SP : null);
    const spellOpts = pickList('cd-spell-names', 'spells');
    const abMode = !SP.ability ? '' : SP.ability.choose ? 'choose' : SP.ability.fixed === 'inherit' ? 'inherit' : SP.ability.fixed;
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('sparkles'), 'Magias'), spellOpts,
      SP.groups.length ? h('div', { class: 'form cd-form cd-form-4' },
        h('label', {}, 'Atributo de conjuração', h('select', { value: abMode, 'data-f': 'sp-ability', onchange: (e) => { const v = e.target.value; SP.ability = !v ? null : v === 'choose' ? { choose: ['int', 'wis', 'cha'] } : { fixed: v }; saveSp(); } },
          h('option', { value: '' }, '—'), Object.entries(ABIL).map(([k, l]) => h('option', { value: k }, l)), h('option', { value: 'choose' }, 'À escolha'), h('option', { value: 'inherit' }, 'O que este talento aumenta'))),
        abMode === 'choose' ? h('label', { class: 'cd-span2' }, 'À escolha entre', h('input', { value: (SP.ability.choose || []).map((a) => ABIL[a] || a).join(', '), 'data-f': 'sp-ability-from',
          onchange: (e) => { SP.ability = { choose: uncsv(e.target.value).map((x) => x.toLowerCase()).filter((x) => ABIL[x]) }; saveSp(); } })) : null) : null,
      SP.groups.map((g, gi) => h('div', { class: 'cd-alt' }, gi ? h('span', { class: 'cd-or' }, 'ou') : null, h('div', { class: 'cd-alt-body' },
        h('div', { class: 'cd-cond' }, h('input', { class: 'grow', value: g.name || '', placeholder: 'Nome da lista (opcional), ex.: Wizard Spells', 'data-f': 'sp-' + gi + '-name', onchange: (e) => { g.name = e.target.value.trim(); saveSp(); } }),
          xBtn('Tirar esta lista', () => { SP.groups.splice(gi, 1); saveSp(); })),
        g.items.map((it, ii) => {
          const upd = (k, v) => { g.items[ii] = Object.assign({}, it, { [k]: v }); saveSp(); };
          const isChoice = !!it.choose && !it.name;
          const linked = it.spell && find('spells', it.spell);
          return h('div', { class: 'cd-cond cd-sprow' },
            h('select', { value: isChoice ? 'choose' : 'spell', 'data-f': 'sp-' + gi + '-' + ii + '-mode', onchange: (e) => { g.items[ii] = e.target.value === 'choose' ? { choose: 'level=0', label: 'Cantrip', count: 1, how: it.how, uses: it.uses } : { spell: null, name: '', how: it.how, uses: it.uses }; saveSp(); } },
              h('option', { value: 'spell' }, 'Magia'), h('option', { value: 'choose' }, 'À escolha')),
            isChoice
              ? [h('input', { type: 'number', min: 1, value: it.count || 1, title: 'Quantas', 'data-f': 'sp-' + gi + '-' + ii + '-count', onchange: (e) => upd('count', num(e.target.value, 1)) }),
                h('input', { class: 'grow', value: it.label || it.choose || '', title: 'Regra: ' + (it.choose || ''), placeholder: 'e.g. Cantrip Wizard', 'data-f': 'sp-' + gi + '-' + ii + '-label', onchange: (e) => upd('label', e.target.value.trim()) })]
              : [h('input', { class: 'grow', list: 'cd-spell-names', value: it.name ? it.name + (linked ? ' | ' + linked.source : '') : '', placeholder: 'nome da magia', 'data-f': 'sp-' + gi + '-' + ii + '-spell',
                  onchange: (e) => { const [n, src] = e.target.value.split('|').map((x) => x.trim()); const hit = records('spells').filter((x) => x.name.toLowerCase() === n.toLowerCase() && (!src || x.source === src)).sort((a, b) => String(b.edition).localeCompare(String(a.edition)))[0];
                    g.items[ii] = Object.assign({}, it, { spell: hit ? hit.id : null, name: hit ? hit.name : n }); saveSp(); } }),
                linked ? h('button', { class: 'btn small ghost', title: 'Abrir a magia', 'data-act': 'open-spell', onclick: () => select(it.spell, 'spells') }, ic('arrow-right')) : it.name ? h('span', { class: 'cd-warn', title: 'Não achei no cadastro de Magias' }, ic('triangle-alert')) : null],
            h('select', { value: it.how || 'known', 'data-f': 'sp-' + gi + '-' + ii + '-how', onchange: (e) => upd('how', e.target.value) }, Object.entries(SPELL_HOW).map(([v, l]) => h('option', { value: v }, l))),
            h('input', { class: 'cd-uses', value: it.uses || '', placeholder: 'usos (1/day…)', 'data-f': 'sp-' + gi + '-' + ii + '-uses', onchange: (e) => upd('uses', e.target.value.trim()) }),
            h('input', { class: 'cd-at', value: it.at || '', placeholder: 'nível', title: 'A partir do nível do personagem (vazio = sempre)', 'data-f': 'sp-' + gi + '-' + ii + '-at', onchange: (e) => upd('at', e.target.value.trim() || null) }),
            xBtn('Tirar', () => { g.items.splice(ii, 1); saveSp(); }));
        }),
        h('div', { class: 'cd-alt-foot' }, addBtn('Magia', () => { g.items.push({ spell: null, name: '', how: 'known', uses: '' }); saveSp(); }, 'sp-' + gi + '-add'),
          addBtn('Magia à escolha', () => { g.items.push({ choose: 'level=0', label: 'Cantrip', count: 1, how: 'known', uses: '' }); saveSp(); }))))),
      addBtn(SP.groups.length ? 'Outra lista (ou)' : 'Adicionar magias', () => { SP.groups.push({ name: '', items: [{ spell: null, name: '', how: 'known', uses: '' }] }); saveSp(); }, 'sp-add')));
    // Sentidos
    const SE = B.senses || [];
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('eye'), 'Sentidos'),
      SE.map((se, i) => h('div', { class: 'cd-cond' },
        h('select', { value: se.type, 'data-f': 'se-' + i + '-type', onchange: (e) => { SE[i] = Object.assign({}, se, { type: e.target.value }); save('senses', SE); } }, SENSES.map((x) => h('option', { value: x }, cap(x)))),
        h('input', { type: 'number', min: 0, step: 'any', value: se.range == null ? '' : Units.distIn(se.range), title: 'Alcance (' + Units.distUnit() + ')', 'data-f': 'se-' + i + '-range',
          onchange: (e) => { SE[i] = Object.assign({}, se, { range: Math.round(Units.distOut(e.target.value) * 100) / 100 }); save('senses', SE); } }), h('span', { class: 'muted' }, Units.distUnit()),
        xBtn('Tirar', () => { SE.splice(i, 1); save('senses', SE); }))),
      addBtn('Adicionar sentido', () => { SE.push({ type: 'darkvision', range: 18 }); save('senses', SE); }, 'se-add')));
    // Defesas
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('shield'), 'Defesas'),
      [['resist', 'Resistência a dano'], ['immune', 'Imunidade a dano'], ['conditionImmune', 'Imunidade a condição']].map(([k, l]) => {
        const d = B[k];
        if (!d) return null;
        const upd = (kk, v) => { const nd = Object.assign({}, d, { [kk]: v }); if (v === undefined) delete nd[kk]; save(k, nd); };
        return h('div', { class: 'cd-brow' }, h('div', { class: 'form cd-form cd-form-4' }, h('label', {}, 'Tipo', h('input', { value: l, disabled: true })), ...blockFields(d, upd, k, 'e.g. fire, cold')), xBtn('Tirar', () => save(k, null)));
      }),
      h('div', { class: 'cd-alt-foot' }, [['resist', 'Resistência'], ['immune', 'Imunidade'], ['conditionImmune', 'Imunidade a condição']].filter(([k]) => !B[k]).map(([k, l]) => addBtn(l, () => save(k, { fixed: [] }), k + '-add')))));
    // Opções de classe
    const OP = B.options || [];
    out.push(h('div', { class: 'cd-bsec' }, h('h3', {}, ic('layers'), 'Opções de classe'),
      OP.map((o, i) => h('div', { class: 'cd-cond' },
        h('input', { class: 'grow', value: o.name || '', placeholder: 'e.g. Eldritch Invocations', 'data-f': 'op-' + i + '-name', onchange: (e) => { OP[i] = Object.assign({}, o, { name: e.target.value.trim() }); save('options', OP); } }),
        h('input', { type: 'number', min: 1, value: o.count || 1, title: 'Quantas', 'data-f': 'op-' + i + '-count', onchange: (e) => { OP[i] = Object.assign({}, o, { count: num(e.target.value, 1) }); save('options', OP); } }),
        h('select', { value: (o.type || '').split(',')[0], title: 'Tipo no cadastro de Opções de classe', 'data-f': 'op-' + i + '-type', onchange: (e) => { OP[i] = Object.assign({}, o, { type: e.target.value }); save('options', OP); } },
          h('option', { value: '' }, '— tipo —'), Object.keys(C.optTypes || {}).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b))).map((t) => h('option', { value: t }, typeLabel(t)))),
        o.type ? h('button', { class: 'btn small ghost', title: 'Ver as opções deste tipo', 'data-act': 'open-opt-type', onclick: () => { C.filters.options = { cat: (o.type || '').split(',')[0] }; C.q.options = ''; C.sel.options = null; C.tab = 'options'; saveUi(); render(true); } }, ic('arrow-right')) : null,
        xBtn('Tirar', () => { OP.splice(i, 1); save('options', OP); }))),
      addBtn('Adicionar opção de classe', () => { OP.push({ name: '', count: 1 }); save('options', OP); }, 'op-add')));
    return only ? out.filter((_, i) => only.includes(BEN_SECTIONS[i])) : out;
  }

  // ---------- Talento ----------
  function featPreview(r) {
    const out = [chip('award', 'Categoria', r.category || '—')];
    if (r.repeatable) out.push(chip('repeat', 'Repetível', 'Yes'));
    out.push(chip('lock', 'Pré-requisito', prereqTxt(r.prerequisites) || 'None', (r.prerequisites || []).length ? 'gold' : ''));
    const b = r.benefits || {};
    if ((b.ability || []).length) out.push(chip('arrow-up', 'Atributo', b.ability.filter((x) => !x.hidden).map(abilityTxt).join(' or ') || abilityTxt(b.ability[0]), 'gold'));
    if (b.spells) out.push(chip('sparkles', 'Magias', benefitsTxt({ spells: b.spells }).replace(/^spells:? ?/, '')));
    const pr = (b.proficiencies || []).map((p) => (PROF_KINDS[p.kind] || p.kind) + ': ' + blockTxt(p));
    if (pr.length) out.push(chip('check', 'Proficiências', pr.join(' · ')));
    if ((b.expertise || []).length) out.push(chip('sparkles', 'Especialização', b.expertise.map(blockTxt).join(' · ')));
    if ((b.senses || []).length) out.push(chip('eye', 'Sentidos', b.senses.map((x) => x.type + ' ' + dist(x.range)).join(', ')));
    const df = ['resist', 'immune', 'conditionImmune'].filter((k) => b[k]).map((k) => (k === 'resist' ? 'Resist ' : k === 'immune' ? 'Immune ' : 'Cond. immune ') + blockTxt(b[k]));
    if (df.length) out.push(chip('shield', 'Defesas', df.join(' · ')));
    if ((b.options || []).length) out.push(chip('layers', 'Opções', b.options.map((o) => o.name + (o.count > 1 ? ' ×' + o.count : '')).join(', ')));
    return out;
  }
  function featForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.feats)];
    out.push(sec('award', 'Talento', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Categoria', 'category', FEAT_CATS),
      F.select(rec, set, 'Edição', 'edition', { '': '—', 2014: '2014', 2024: '2024' }, { rebuild: true }),
      F.check(rec, set, 'Repetível (pode pegar mais de uma vez)', 'repeatable', { cls: 'cd-span2' }))));
    out.push(sec('lock', 'Pré-requisitos', prereqEditor(rec, set, 'prerequisites'),
      h('p', { class: 'hint' }, 'Condições na mesma caixa valem juntas (e). Caixas diferentes são alternativas (ou).')));
    out.push(sec('gift', 'Benefícios', ...benefitsEditor(rec, set, 'benefits'),
      h('p', { class: 'hint' }, 'O que não couber nos campos continua valendo pelo texto da descrição.')));
    const clsF = records('classes').filter((c) => (c.featProgression || []).some((p) => String(p.category).split('/').includes(rec.category)));
    if (clsF.length) out.push(sec('shield', 'Classes que dão talentos de ' + rec.category, h('div', { class: 'cd-linklist' }, clsF.map((c) => h('button', { class: 'cd-base', 'data-id': c.id, onclick: () => select(c.id, 'classes') },
      h('span', {}, c.name), h('small', {}, c.source + ' · nível ' + ((c.featProgression.find((p) => String(p.category).split('/').includes(rec.category)) || { byLevel: [] }).byLevel.findIndex((n) => n > 0) + 1)))))));
    const bgs = records('backgrounds').filter((b) => (b.feats || []).some((x) => x.feat === rec.id));
    if (bgs.length) out.push(sec('scroll-text', 'Antecedentes que dão este talento', h('div', { class: 'cd-linklist' },
      bgs.sort((a, b) => a.name.localeCompare(b.name)).map((b) => h('button', { class: 'cd-base', 'data-id': b.id, onclick: () => select(b.id, 'backgrounds') },
        h('span', {}, b.name + ((b.feats.find((x) => x.feat === rec.id) || {}).choice ? ' (' + b.feats.find((x) => x.feat === rec.id).choice + ')' : '')), h('small', {}, b.source + (b.edition ? ' · ' + b.edition : '')))))));
    out.push(descSec(rec, set, 'Texto do talento.'));
    return out;
  }

  // ---------- Antecedente ----------
  const featRefTxt = (x) => (x.any ? (x.count > 1 ? x.count + ' feats' : 'any feat') + (x.category ? ' (' + x.category + ')' : '') : x.name + (x.choice ? ' (' + x.choice + ')' : ''));
  function equipTxt(EQ) {
    const it = (i) => (i.gold != null ? costTxt(i.gold) : i.name + (i.qty > 1 ? ' ×' + i.qty : '') + (i.contains ? ' (' + costTxt(i.contains) + ')' : ''));
    return (EQ || []).map((set) => (set.options.length === 1 && !set.options[0].label ? set.options[0].items.map(it).join(', ')
      : set.options.map((o) => (o.label ? o.label + ': ' : '') + o.items.map(it).join(', ')).join(' · or ')).trim()).filter(Boolean).join(' · ');
  }
  function backgroundPreview(r) {
    const out = [];
    if (r.variantOf) { const o = find('backgrounds', r.variantOf); out.push(chip('layers', 'Variante de', o ? o.name : r.variantOf)); }
    const b = r.benefits || {};
    if ((b.ability || []).length) out.push(chip('arrow-up', 'Atributos', b.ability.map(abilityTxt).join(' or '), 'gold'));
    if ((r.feats || []).length) out.push(chip('award', 'Talento', r.feats.map(featRefTxt).join(', '), 'gold'));
    const pr = (b.proficiencies || []).map((p) => (PROF_KINDS[p.kind] || p.kind) + ': ' + blockTxt(p));
    if (pr.length) out.push(chip('check', 'Proficiências', pr.join(' · ')));
    if (b.spells) out.push(chip('sparkles', 'Magias', benefitsTxt({ spells: b.spells }).replace(/^spells:? ?/, '')));
    if ((r.equipment || []).length) out.push(chip('backpack', 'Equipamento', equipTxt(r.equipment)));
    if (r.feature) out.push(chip('star', 'Característica', r.feature.name));
    if ((r.prerequisites || []).length) out.push(chip('lock', 'Pré-requisito', prereqTxt(r.prerequisites)));
    return out;
  }
  // nomes "Nome | FONTE" para escolher item, talento ou magia digitando
  // a lista fica fora do formulário e só é refeita quando o cadastro muda (itens são 3.200: refazer a cada redesenho pesa)
  const pickCache = {};
  function pickList(id, tab) {
    const c = pickCache[id];
    if (c && c.ver === ver && document.getElementById(id)) return null;
    const dl = h('datalist', { id }, records(tab).filter((x) => !x.memberOf || tab !== 'items').map((x) => h('option', { value: x.name + ' | ' + x.source })));
    const old = document.getElementById(id);
    if (old) old.replaceWith(dl); else document.body.append(dl);
    pickCache[id] = { ver };
    return null;
  }
  function resolvePick(tab, v) {
    const [n, src] = String(v || '').split('|').map((x) => x.trim());
    if (!n) return null;
    return records(tab).filter((x) => x.name.toLowerCase() === n.toLowerCase() && (!src || x.source === src)).sort((a, b) => String(b.edition).localeCompare(String(a.edition)))[0] || null;
  }
  function featsEditor(rec, set) {
    const FS = clone(rec.feats || []);
    const save = () => set('feats', FS, true);
    return h('div', { class: 'cd-bsec' }, pickList('cd-feat-picks', 'feats'),
      FS.length ? null : h('p', { class: 'muted' }, 'Este antecedente não dá talento.'),
      FS.map((x, i) => {
        const linked = x.feat && find('feats', x.feat);
        return h('div', { class: 'cd-cond' },
          h('select', { value: x.any ? 'any' : 'feat', 'data-f': 'ft-' + i + '-mode', onchange: (e) => { FS[i] = e.target.value === 'any' ? { any: true, count: 1, category: 'Origin' } : { feat: null, name: '', choice: '' }; save(); } },
            h('option', { value: 'feat' }, 'Talento'), h('option', { value: 'any' }, 'À escolha')),
          x.any
            ? [h('input', { type: 'number', min: 1, value: x.count || 1, title: 'Quantos', 'data-f': 'ft-' + i + '-count', onchange: (e) => { FS[i] = Object.assign({}, x, { count: num(e.target.value, 1) }); save(); } }),
              h('select', { value: x.category || '', 'data-f': 'ft-' + i + '-cat', onchange: (e) => { FS[i] = Object.assign({}, x, { category: e.target.value }); save(); } }, h('option', { value: '' }, 'Qualquer categoria'), FEAT_CATS.map((c) => h('option', { value: c }, c)))]
            : [h('input', { class: 'grow', list: 'cd-feat-picks', value: x.name ? x.name + (linked ? ' | ' + linked.source : '') : '', placeholder: 'nome do talento', 'data-f': 'ft-' + i + '-feat',
                onchange: (e) => { const hit = resolvePick('feats', e.target.value); FS[i] = Object.assign({}, x, { feat: hit ? hit.id : null, name: hit ? hit.name : e.target.value.split('|')[0].trim() }); save(); } }),
              h('input', { value: x.choice || '', placeholder: 'escolha (ex.: Cleric)', 'data-f': 'ft-' + i + '-choice', onchange: (e) => { FS[i] = Object.assign({}, x, { choice: e.target.value.trim() }); save(); } }),
              linked ? h('button', { class: 'btn small ghost', title: 'Abrir o talento', 'data-act': 'open-feat', onclick: () => select(x.feat, 'feats') }, ic('arrow-right')) : x.name ? h('span', { class: 'cd-warn', title: 'Não achei no cadastro de Talentos' }, ic('triangle-alert')) : null],
          xBtn('Tirar', () => { FS.splice(i, 1); save(); }));
      }),
      addBtn('Adicionar talento', () => { FS.push({ feat: null, name: '', choice: '' }); save(); }, 'ft-add'));
  }
  function equipmentEditor(rec, set) {
    const EQ = clone(rec.equipment || []);
    const save = () => set('equipment', EQ.filter((st) => st.options.length), true);
    const itemRow = (o, si, oi, it, ii) => {
      const p = 'eq-' + si + '-' + oi + '-' + ii;
      const upd = (nv) => { o.items[ii] = nv; save(); };
      const mode = it.gold != null ? 'gold' : it.item || it.pick ? 'item' : 'text';
      const linked = it.item && find('items', it.item);
      return h('div', { class: 'cd-cond' },
        h('select', { value: mode, 'data-f': p + '-mode', onchange: (e) => upd(e.target.value === 'gold' ? { gold: 100 } : e.target.value === 'item' ? { item: null, name: '', qty: 1, pick: true } : { item: null, name: it.name || '', qty: it.qty || 1 }) },
          h('option', { value: 'item' }, 'Item'), h('option', { value: 'text' }, 'Texto'), h('option', { value: 'gold' }, 'Ouro')),
        mode === 'gold'
          ? [h('input', { type: 'number', min: 0, step: 'any', value: it.gold / 100, 'data-f': p + '-gold', onchange: (e) => upd({ gold: Math.round(num(e.target.value) * 100) }) }), h('span', { class: 'muted' }, 'gp')]
          : [h('input', { class: 'grow', list: mode === 'item' ? 'cd-item-picks' : null, value: mode === 'item' && linked ? linked.name + ' | ' + linked.source : it.name || '', placeholder: mode === 'item' ? 'nome do item' : 'ex.: sticks of incense', 'data-f': p + '-name',
              onchange: (e) => { if (mode === 'item') { const hit = resolvePick('items', e.target.value); { const nv = Object.assign({}, it, { item: hit ? hit.id : null, name: hit ? hit.name : e.target.value.split('|')[0].trim() }); if (hit) delete nv.pick; upd(nv); } } else upd(Object.assign({}, it, { name: e.target.value.trim() })); } }),
            // nome que o antecedente usa ("Prayer book") quando é diferente do item ligado ("Book")
            linked ? h('input', { class: 'cd-shown', value: it.name && it.name !== linked.name ? it.name : '', placeholder: 'nome mostrado', title: 'Como o antecedente chama este item (vazio = o nome do item)', 'data-f': p + '-shown',
              onchange: (e) => upd(Object.assign({}, it, { name: e.target.value.trim() || linked.name })) }) : null,
            h('label', { class: 'cd-abil-n' }, '×', h('input', { type: 'number', min: 1, value: it.qty || 1, 'data-f': p + '-qty', onchange: (e) => upd(Object.assign({}, it, { qty: num(e.target.value, 1) })) })),
            it.contains != null ? h('label', { class: 'cd-abil-n', title: 'Ouro guardado dentro (ex.: uma bolsa com 15 gp)' }, 'com', h('input', { type: 'number', min: 0, step: 'any', value: it.contains / 100, 'data-f': p + '-contains',
              onchange: (e) => { const nv = Object.assign({}, it); if (e.target.value === '') delete nv.contains; else nv.contains = Math.round(num(e.target.value) * 100); upd(nv); } }), 'gp') : null,
            linked ? h('button', { class: 'btn small ghost', title: 'Abrir o item', 'data-act': 'open-item', onclick: () => select(it.item, 'items') }, ic('arrow-right')) : mode === 'item' && it.name ? h('span', { class: 'cd-warn', title: 'Não achei no cadastro de Itens' }, ic('triangle-alert')) : null],
        xBtn('Tirar', () => { o.items.splice(ii, 1); save(); }));
    };
    return h('div', { class: 'cd-bsec' }, pickList('cd-item-picks', 'items'),
      EQ.length ? null : h('p', { class: 'muted' }, 'Sem equipamento inicial.'),
      EQ.map((st, si) => {
        const choose = st.options.length > 1 || !!st.options[0].label;
        return h('div', { class: 'cd-alt' }, h('div', { class: 'cd-alt-body' },
          h('div', { class: 'cd-cond' }, h('b', { class: 'cd-eq-title' }, choose ? 'Escolha um' : 'Sempre'), h('span', { class: 'grow' }), xBtn('Tirar este grupo', () => { EQ.splice(si, 1); save(); })),
          st.options.map((o, oi) => h('div', { class: 'cd-eq-opt' },
            choose ? h('div', { class: 'cd-cond' }, h('input', { class: 'cd-eq-label', value: o.label || '', placeholder: 'A', title: 'Nome da opção', 'data-f': 'eq-' + si + '-' + oi + '-label', onchange: (e) => { o.label = e.target.value.trim().toUpperCase(); save(); } }),
              h('span', { class: 'grow muted' }, 'Opção'), st.options.length > 1 ? xBtn('Tirar esta opção', () => { st.options.splice(oi, 1); save(); }) : null) : null,
            o.items.map((it, ii) => itemRow(o, si, oi, it, ii)),
            h('div', { class: 'cd-alt-foot' }, addBtn('Item', () => { o.items.push({ item: null, name: '', qty: 1, pick: true }); save(); }, 'eq-' + si + '-' + oi + '-add'), addBtn('Ouro', () => { o.items.push({ gold: 100 }); save(); })))),
          choose ? h('div', { class: 'cd-alt-foot' }, addBtn('Outra opção (ou)', () => { st.options.push({ label: String.fromCharCode(65 + st.options.length), items: [] }); save(); }, 'eq-' + si + '-opt')) : null));
      }),
      h('div', { class: 'cd-alt-foot' },
        addBtn('Itens que sempre vêm', () => { EQ.push({ options: [{ label: '', items: [{ item: null, name: '', qty: 1, pick: true }] }] }); save(); }, 'eq-add-fixed'),
        addBtn('Escolha (A ou B)', () => { EQ.push({ options: [{ label: 'A', items: [] }, { label: 'B', items: [{ gold: 5000 }] }] }); save(); }, 'eq-add-choice')));
  }
  function tablesEditor(rec, set) {
    const CH = clone(rec.characteristics || { intro: '', tables: [] });
    const save = () => set('characteristics', CH.tables.length || CH.intro ? CH : null, true);
    return h('div', { class: 'cd-bsec' },
      CH.tables.length ? h('label', {}, 'Texto antes das tabelas', h('textarea', { class: 'cd-desc cd-desc-sm', rows: 3, value: CH.intro || '', 'data-f': 'ch-intro', onchange: (e) => { CH.intro = e.target.value; save(); } })) : null,
      h('div', { class: 'cd-tables-ed' }, CH.tables.map((t, ti) => h('div', { class: 'cd-alt-body cd-table-ed' },
        h('div', { class: 'cd-cond' },
          h('input', { class: 'grow', value: t.name || '', placeholder: 'ex.: Personality Trait', 'data-f': 'ch-' + ti + '-name', onchange: (e) => { t.name = e.target.value.trim(); save(); } }),
          h('label', { class: 'cd-abil-n' }, 'd', h('input', { type: 'number', min: 1, value: t.die || (t.rows || []).length, 'data-f': 'ch-' + ti + '-die', onchange: (e) => { t.die = num(e.target.value, 6); save(); } })),
          xBtn('Tirar esta tabela', () => { CH.tables.splice(ti, 1); save(); })),
        h('textarea', { class: 'cd-desc cd-desc-sm', rows: Math.min(10, Math.max(4, (t.rows || []).length + 1)), value: (t.rows || []).join('\n'), 'data-f': 'ch-' + ti + '-rows', placeholder: 'uma linha por resultado do dado',
          onchange: (e) => { t.rows = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); if (!t.die || t.die < t.rows.length) t.die = t.rows.length; save(); } }),
        h('small', { class: 'muted' }, (t.rows || []).length + ' linhas' + (t.die && t.die !== (t.rows || []).length ? ' (o dado é d' + t.die + ')' : ''))))),
      addBtn('Adicionar tabela', () => { CH.tables.push({ name: '', die: 6, rows: [] }); save(); }, 'ch-add'));
  }
  // ---------- Subclasse ----------
  // "Cleric: Light" (lista da magia) → a subclasse, de preferência a original e da mesma edição
  function subclassLinks(list) {
    const all = records('subclasses');
    const hits = (list || []).map((t) => { const [c, sn] = String(t).split(':').map((x) => x.trim()); return all.filter((x) => x.className === c && (x.shortName === sn || x.name === sn) && !x.copyOf).sort((a, b) => String(b.edition).localeCompare(String(a.edition)))[0]; }).filter(Boolean);
    if (!hits.length) return null;
    return h('div', { class: 'cd-granted' }, h('small', {}, 'Abrir a subclasse'), h('p', {}, [...new Set(hits)].map((x, i) => [i ? ', ' : '', h('a', { href: '#', class: 'cd-link', onclick: (e) => { e.preventDefault(); select(x.id, 'subclasses'); } }, x.className + ': ' + x.shortName + ' (' + x.source + ')')])));
  }
  function subclassPreview(r) {
    const out = [chip('shield', 'Classe', r.className + ' (' + classEd(r) + ')')];
    out.push(chip('star', 'Características', (r.features || []).map((x) => x.name + ' ' + x.level).join(', ') || '—'));
    if (r.spells) out.push(chip('sparkles', 'Magias', benefitsTxt({ spells: r.spells }).replace(/^spells:? ?/, '')));
    if (r.spellcasting) out.push(chip('sparkles', 'Conjuração', (ABIL[r.spellcasting.ability] || r.spellcasting.ability) + ' · ' + (CASTER[r.spellcasting.progression] || r.spellcasting.progression), 'gold'));
    for (const o of r.optionProgression || []) out.push(chip('layers', o.name || typeLabel(String(o.type).split(',')[0]), 'nível ' + (o.byLevel.findIndex((n) => n > 0) + 1) + ': ' + o.byLevel.find((n) => n > 0) + ' → 20: ' + o.byLevel[19]));
    return out;
  }
  function subclassForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.subclasses)];
    const cls = rec.classId && find('classes', rec.classId);
    if (rec.copyOf) {
      const o = find('subclasses', rec.copyOf);
      out.push(h('div', { class: 'cd-banner cd-banner-lite' }, ic('layers'), h('span', {}, 'Do livro de 2014, usada com a classe de 2024 (como no 5etools).'), h('span', { class: 'grow' }),
        o ? btnI('arrow-right', 'Abrir a original (' + o.className + ' ' + classEd(o) + ')', { class: 'btn small', 'data-act': 'to-original-sub', onclick: () => select(o.id) }) : null));
    }
    const classes = records('classes').slice().sort((a, b) => a.name.localeCompare(b.name) || String(a.edition).localeCompare(String(b.edition)));
    out.push(sec('git-branch', 'Subclasse', h('div', { class: 'form cd-form cd-form-4' },
      h('label', { class: 'cd-span2' }, 'Classe', h('div', { class: 'cd-cond' }, h('select', { class: 'grow', value: rec.classId || '', 'data-f': 'classId', onchange: (e) => { const c = find('classes', e.target.value); if (c) { rec.className = c.name; rec.classSource = c.source; } set('classId', e.target.value || null, true); } },
        h('option', { value: '' }, '—'), classes.map((c) => h('option', { value: c.id }, c.name + ' (' + c.edition + ', ' + c.source + ')'))),
        cls ? h('button', { class: 'btn small ghost', title: 'Abrir a classe', 'data-act': 'open-class', onclick: () => select(cls.id, 'classes') }, ic('arrow-right')) : null)),
      F.text(rec, set, 'Nome curto', 'shortName', { input: { placeholder: 'ex.: Evoker' } }),
      F.select(rec, set, 'Edição', 'edition', { '': '—', 2014: '2014', 2024: '2024' }, { rebuild: true })),
      cls ? h('p', { class: 'hint' }, 'A classe ' + cls.name + ' dá características de subclasse nos níveis ' + (cls.subclassLevels || []).join(', ') + '.') : null));
    out.push(sec('star', 'Características (' + (rec.features || []).length + ')', featuresEditor(rec, set)));
    out.push(sec('sparkles', 'Magias', ...benefitsEditor({ b: { spells: rec.spells } }, (p, v) => set('spells', (v || {}).spells || null, true), 'b', ['spells'])));
    const sc = rec.spellcasting;
    out.push(sec('sparkles', 'Conjuração própria', sc
      ? h('div', { class: 'cd-bsec' }, h('div', { class: 'form cd-form cd-form-4' },
        F.select(rec, set, 'Atributo', 'spellcasting.ability', ABIL, { rebuild: true }),
        F.select(rec, set, 'Tipo de conjurador', 'spellcasting.progression', Object.fromEntries(Object.entries(CASTER).filter(([k]) => k)), { rebuild: true }),
        F.select(rec, set, 'Como escolhe as magias', 'spellcasting.mode', CAST_MODE, { rebuild: true })),
        rec.progression ? progressionEditor(rec, set) : null,
        h('div', { class: 'cd-alt-foot' }, h('span', { class: 'grow' }), xBtn('Esta subclasse não conjura', () => { set('progression', null); set('spellcasting', null, true); })))
      : h('div', { class: 'cd-bsec' }, h('p', { class: 'muted' }, 'Só algumas subclasses conjuram por conta própria (Eldritch Knight, Arcane Trickster).'),
        addBtn('Esta subclasse conjura magias', () => { set('progression', { pb: Array.from({ length: 20 }, (_, i) => 2 + Math.floor(i / 4)), columns: [], rows: Array.from({ length: 20 }, () => []), cantrips: null, prepared: new Array(20).fill(0), slots: Array.from({ length: 20 }, () => new Array(9).fill(0)), pact: null }); set('spellcasting', { ability: 'int', progression: '1/3', mode: 'known' }, true); }, 'subcast-add'))));
    out.push(sec('layers', 'Opções de classe por nível', levelsEditor(rec.optionProgression, set, 'optionProgression', 'options')));
    out.push(descSec(rec, set, 'Texto da subclasse.'));
    return out;
  }

  // ---------- Classe ----------
  function classLinks(names) {
    const cls = records('classes').filter((c) => (names || []).includes(c.name));
    if (!cls.length) return null;
    return h('div', { class: 'cd-granted' }, h('small', {}, 'Abrir a classe'), h('p', {}, cls.map((c, i) => [i ? ', ' : '', h('a', { href: '#', class: 'cd-link', onclick: (e) => { e.preventDefault(); select(c.id, 'classes'); } }, c.name + ' (' + c.edition + ')')])));
  }
  const cellTxt = (v) => (v && typeof v === 'object' && v.speed != null ? (v.speed ? '+' : '') + dist(v.speed) : String(v ?? ''));
  function classPreview(r) {
    const out = [chip('heart-pulse', 'Dado de vida', 'd' + r.hd), chip('arrow-up', 'Atributo principal', primTxt(r.primary) || '—', 'gold'), chip('shield', 'Resistências', (r.saves || []).map((a) => ABIL[a]).join(', ') || '—')];
    if (r.spellcasting) out.push(chip('sparkles', 'Conjuração', (ABIL[r.spellcasting.ability] || r.spellcasting.ability) + ' · ' + CASTER[r.spellcasting.progression] + ' · ' + CAST_MODE[r.spellcasting.mode]));
    if (r.subclassTitle) out.push(chip('layers', 'Subclasse', r.subclassTitle + ' (níveis ' + (r.subclassLevels || []).join(', ') + ')'));
    const pr = (r.proficiencies || []).map((p) => (PROF_KINDS[p.kind] || p.kind) + ': ' + blockTxt(p));
    if (pr.length) out.push(chip('check', 'Proficiências', pr.join(' · ')));
    for (const o of r.optionProgression || []) out.push(chip('layers', o.name || typeLabel(String(o.type || '').split(',')[0]) || 'Opções', o.byLevel.findIndex((n) => n > 0) + 1 > 0 ? 'nível ' + (o.byLevel.findIndex((n) => n > 0) + 1) + ': ' + o.byLevel.find((n) => n > 0) + ' → 20: ' + o.byLevel[19] : '—'));
    for (const fp of r.featProgression || []) out.push(chip('award', fp.name, 'nível ' + (fp.byLevel.findIndex((n) => n > 0) + 1)));
    out.push(chip('star', 'Características', String((r.features || []).length)));
    return out;
  }
  function progressionEditor(rec, set) {
    const P = clone(rec.progression || {});
    P.rows = P.rows || Array.from({ length: 20 }, () => []);
    P.columns = P.columns || [];
    const save = (rebuild) => set('progression', P, rebuild);
    const featsAt = (lv) => (rec.features || []).filter((x) => x.level === lv).map((x) => x.name).join(', ');
    const isSpeed = (ci) => P.rows.some((r) => r[ci] && typeof r[ci] === 'object');
    const numIn = (val, onv, cls) => h('input', { type: 'number', min: 0, class: 'cd-gin ' + (cls || ''), value: val ?? '', onchange: (e) => onv(e.target.value === '' ? 0 : num(e.target.value)) });
    const head = h('tr', {}, h('th', {}, 'Nv'), h('th', {}, 'Prof.'), h('th', { class: 'cd-gfeat' }, 'Características'),
      P.columns.map((c, ci) => h('th', {}, h('input', { class: 'cd-ghead', value: c, 'data-f': 'col-' + ci, onchange: (e) => { P.columns[ci] = e.target.value.trim() || c; save(true); } }),
        h('button', { class: 'icon-btn cd-x', title: 'Tirar a coluna', onclick: () => { P.columns.splice(ci, 1); P.rows.forEach((r) => r.splice(ci, 1)); save(true); } }, ic('x')))),
      P.cantrips ? h('th', {}, 'Truques') : null, P.prepared ? h('th', {}, 'Magias') : null,
      P.slots ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('th', { class: 'cd-gslot' }, n + 'º')) : null,
      P.pact ? [h('th', {}, 'Espaços'), h('th', {}, 'Nível')] : null);
    const body = Array.from({ length: 20 }, (_, i) => h('tr', {}, h('td', { class: 'cd-glv' }, String(i + 1)),
      h('td', {}, numIn(P.pb[i], (v) => { P.pb[i] = v; save(); }, 'cd-gnum')),
      h('td', { class: 'cd-gfeat' }, featsAt(i + 1)),
      P.columns.map((c, ci) => h('td', {}, isSpeed(ci)
        ? h('input', { type: 'number', step: 'any', class: 'cd-gin', title: Units.distUnit(), value: P.rows[i][ci] && P.rows[i][ci].speed != null ? Units.distIn(P.rows[i][ci].speed) : '', 'data-f': 'cell-' + i + '-' + ci,
          onchange: (e) => { P.rows[i][ci] = { speed: Math.round(Units.distOut(e.target.value) * 100) / 100 }; save(); } })
        : h('input', { class: 'cd-gin', value: P.rows[i][ci] ?? '', 'data-f': 'cell-' + i + '-' + ci, onchange: (e) => { P.rows[i][ci] = e.target.value.trim(); save(); } }))),
      P.cantrips ? h('td', {}, numIn(P.cantrips[i], (v) => { P.cantrips[i] = v; save(); }, 'cd-gnum')) : null,
      P.prepared ? h('td', {}, numIn(P.prepared[i], (v) => { P.prepared[i] = v; save(); }, 'cd-gnum')) : null,
      P.slots ? P.slots[i].map((v, si) => h('td', { class: 'cd-gslot' }, numIn(v || '', (nv) => { P.slots[i][si] = nv; save(); }, 'cd-gnum' + (v ? '' : ' cd-gzero')))) : null,
      P.pact ? [h('td', {}, numIn(P.pact.slots[i], (v) => { P.pact.slots[i] = v; save(); }, 'cd-gnum')), h('td', {}, numIn(P.pact.level[i], (v) => { P.pact.level[i] = v; save(); }, 'cd-gnum'))] : null));
    const z = () => new Array(20).fill(0);
    return h('div', { class: 'cd-bsec' },
      h('div', { class: 'cd-grid-wrap' }, h('table', { class: 'cd-grid' }, h('thead', {}, head), h('tbody', {}, body))),
      h('div', { class: 'cd-alt-foot' },
        addBtn('Coluna', () => { P.columns.push('New column'); P.rows.forEach((r) => r.push('')); save(true); }, 'col-add'),
        P.cantrips ? null : addBtn('Truques', () => { P.cantrips = z(); save(true); }),
        P.prepared ? null : addBtn('Magias preparadas/conhecidas', () => { P.prepared = z(); save(true); }),
        P.slots || P.pact ? null : addBtn('Espaços de magia', () => { P.slots = Array.from({ length: 20 }, () => new Array(9).fill(0)); save(true); }),
        P.slots || P.pact ? null : addBtn('Espaços de pacto', () => { P.pact = { slots: z(), level: z() }; save(true); }),
        P.slots ? xBtn('Tirar os espaços de magia', () => { P.slots = null; save(true); }) : null),
      h('p', { class: 'hint' }, 'Cada linha é um nível do personagem. As características vêm da lista abaixo; a coluna de deslocamento (ex.: Unarmored Movement) fica em ' + Units.distUnit() + '.'));
  }
  function levelsEditor(list, set, path, kind) {
    const L = clone(list || []);
    const save = () => set(path, L, true);
    const types = Object.keys(C.optTypes || {}).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
    return h('div', { class: 'cd-bsec' },
      L.length ? null : h('p', { class: 'muted' }, kind === 'options' ? 'Esta classe não escolhe opções de classe.' : 'Esta classe não dá talentos por nível.'),
      L.map((o, i) => h('div', { class: 'cd-alt-body' },
        h('div', { class: 'cd-cond' },
          h('input', { class: 'grow', value: o.name || '', placeholder: kind === 'options' ? 'ex.: Eldritch Invocations' : 'ex.: Epic Boon', 'data-f': kind + '-' + i + '-name', onchange: (e) => { L[i] = Object.assign({}, o, { name: e.target.value.trim() }); save(); } }),
          kind === 'options'
            ? h('select', { value: String(o.type || '').split(',')[0], 'data-f': kind + '-' + i + '-type', onchange: (e) => { L[i] = Object.assign({}, o, { type: e.target.value }); save(); } }, h('option', { value: '' }, '— tipo —'), types.map((t) => h('option', { value: t }, typeLabel(t))))
            : h('select', { value: String(o.category || '').split('/')[0], 'data-f': kind + '-' + i + '-cat', onchange: (e) => { L[i] = Object.assign({}, o, { category: e.target.value }); save(); } }, h('option', { value: '' }, 'Qualquer categoria'), FEAT_CATS.map((c) => h('option', { value: c }, c))),
          kind === 'options' && o.type ? h('button', { class: 'btn small ghost', title: 'Ver as opções deste tipo', 'data-act': 'open-cls-opt', onclick: () => { C.filters.options = { cat: String(o.type).split(',')[0] }; C.q.options = ''; C.sel.options = null; C.tab = 'options'; saveUi(); render(true); } }, ic('arrow-right')) : null,
          kind === 'feats' && o.category ? h('button', { class: 'btn small ghost', title: 'Ver os talentos desta categoria', 'data-act': 'open-cls-feat', onclick: () => { C.filters.feats = { cat: String(o.category).split('/')[0] }; C.q.feats = ''; C.sel.feats = null; C.tab = 'feats'; saveUi(); render(true); } }, ic('arrow-right')) : null,
          xBtn('Tirar', () => { L.splice(i, 1); save(); })),
        h('label', { class: 'cd-bylevel' }, 'Quantas no total, do nível 1 ao 20', h('input', { value: (o.byLevel || []).join(', '), 'data-f': kind + '-' + i + '-levels',
          onchange: (e) => { const v = uncsv(e.target.value).map((x) => num(x)); while (v.length < 20) v.push(v.length ? v[v.length - 1] : 0); L[i] = Object.assign({}, o, { byLevel: v.slice(0, 20) }); save(); } })))),
      addBtn(kind === 'options' ? 'Adicionar opção por nível' : 'Adicionar talento por nível', () => { L.push(kind === 'options' ? { name: '', type: '', byLevel: new Array(20).fill(0) } : { name: '', category: '', byLevel: new Array(20).fill(0) }); save(); }, kind + '-add'));
  }
  function featuresEditor(rec, set) {
    const FT = clone(rec.features || []);
    const order = FT.map((x, i) => i).sort((a, b) => FT[a].level - FT[b].level || a - b);
    const save = () => set('features', FT, true);
    return h('div', { class: 'cd-bsec' },
      h('div', { class: 'cd-feats' }, order.map((i) => {
        const ft = FT[i], key = rec.id + ':' + i;
        return h('details', { class: 'cd-feat', open: !!C.featOpen[key], ontoggle: (e) => { C.featOpen[key] = e.target.open; } },
          h('summary', {}, h('span', { class: 'cd-feat-lv' }, 'Nv ' + ft.level), h('b', {}, ft.name || '(sem nome)'),
            ft.mark === 'asi' ? h('span', { class: 'badge gold' }, 'atributo') : ft.mark === 'subclass' ? h('span', { class: 'badge blue' }, 'subclasse') : null),
          h('div', { class: 'cd-feat-body' },
            h('div', { class: 'form cd-form cd-form-4' },
              h('label', {}, 'Nível', h('input', { type: 'number', min: 1, max: 20, value: ft.level, 'data-f': 'ft-' + i + '-level', onchange: (e) => { FT[i] = Object.assign({}, ft, { level: Math.min(20, Math.max(1, num(e.target.value, 1))) }); save(); } })),
              h('label', { class: 'cd-span2' }, 'Nome', h('input', { value: ft.name || '', 'data-f': 'ft-' + i + '-name', onchange: (e) => { FT[i] = Object.assign({}, ft, { name: e.target.value.trim() }); save(); } })),
              h('label', {}, 'Marca', h('select', { value: ft.mark || '', 'data-f': 'ft-' + i + '-mark', onchange: (e) => { FT[i] = Object.assign({}, ft, { mark: e.target.value || undefined }); save(); } },
                h('option', { value: '' }, '—'), h('option', { value: 'asi' }, 'Aumento de atributo'), h('option', { value: 'subclass' }, 'Característica da subclasse')))),
            h('textarea', { class: 'cd-desc cd-desc-sm', rows: Math.min(14, Math.max(3, Math.ceil(String(ft.text || '').length / 130))), value: ft.text || '', 'data-f': 'ft-' + i + '-text', onchange: (e) => { FT[i] = Object.assign({}, ft, { text: e.target.value }); save(); } }),
            h('div', { class: 'cd-alt-foot' }, h('span', { class: 'grow' }), btnI('trash-2', 'Tirar esta característica', { class: 'btn small danger', onclick: () => { FT.splice(i, 1); save(); } }))));
      })),
      addBtn('Adicionar característica', () => { FT.push({ name: 'New feature', level: 1, text: '' }); C.featOpen[rec.id + ':' + (FT.length - 1)] = true; save(); }, 'feature-add'));
  }
  function classForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.classes)];
    out.push(sec('shield', 'Classe', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Edição', 'edition', { '': '—', 2014: '2014', 2024: '2024' }, { rebuild: true }),
      h('label', {}, 'Dado de vida', h('select', { value: String(rec.hd), 'data-f': 'hd', onchange: (e) => set('hd', num(e.target.value, 8), true) }, [4, 6, 8, 10, 12].map((d) => h('option', { value: String(d) }, 'd' + d)))),
      h('label', { class: 'cd-span2', title: 'Alternativas com "or"; juntos com "+". Ex.: STR or DEX; DEX + WIS' }, 'Atributo principal', h('input', { value: primTxt(rec.primary), 'data-f': 'primary',
        onchange: (e) => set('primary', e.target.value.split(/\s+or\s+|\//i).map((alt) => alt.split('+').map((a) => a.trim().toLowerCase()).filter((a) => ABIL[a])).filter((x) => x.length), true) })),
      h('label', { class: 'cd-span2' }, 'Nome da subclasse', h('input', { value: rec.subclassTitle || '', placeholder: 'ex.: Arcane Tradition', 'data-f': 'subclassTitle', onchange: (e) => set('subclassTitle', e.target.value.trim(), true) })),
      h('label', { class: 'cd-span2' }, 'Níveis em que a subclasse dá características', h('input', { value: (rec.subclassLevels || []).join(', '), 'data-f': 'subclassLevels', onchange: (e) => set('subclassLevels', uncsv(e.target.value).map((x) => num(x)).filter((x) => x >= 1 && x <= 20), true) }))),
    h('div', { class: 'cd-subcats' }, h('small', {}, 'Testes de resistência'), Object.entries(ABIL).map(([k, l]) => h('label', { class: 'check cd-subcat' + ((rec.saves || []).includes(k) ? ' on' : '') },
      h('input', { type: 'checkbox', checked: (rec.saves || []).includes(k), 'data-f': 'save-' + k, onchange: (e) => { const st = new Set(rec.saves || []); if (e.target.checked) st.add(k); else st.delete(k); set('saves', Object.keys(ABIL).filter((x) => st.has(x)), true); } }), l)))));
    out.push(sec('check', 'Proficiências iniciais', ...benefitsEditor({ b: { proficiencies: rec.proficiencies || [] } }, (p, v) => set('proficiencies', (v || {}).proficiencies || [], true), 'b', ['proficiencies'])));
    out.push(sec('backpack', 'Equipamento inicial', equipmentEditor(rec, set),
      h('div', { class: 'form cd-form cd-form-4' }, F.text(rec, set, 'Ouro no lugar do equipamento (2014)', 'goldAlternative', { cls: 'cd-span2', input: { placeholder: 'ex.: 4d4 × 10' } })),
      (rec.equipmentText || []).length ? h('div', { class: 'cd-granted' }, h('small', {}, 'Como está no livro'), h('ul', {}, rec.equipmentText.map((x) => h('li', {}, x)))) : null));
    const sc = rec.spellcasting;
    const nSp = records('spells').filter((x) => (x.classes || []).includes(rec.name)).length;
    out.push(sec('sparkles', 'Conjuração', sc
      ? h('div', { class: 'cd-bsec' }, h('div', { class: 'form cd-form cd-form-4' },
        F.select(rec, set, 'Atributo', 'spellcasting.ability', ABIL, { rebuild: true }),
        F.select(rec, set, 'Tipo de conjurador', 'spellcasting.progression', Object.fromEntries(Object.entries(CASTER).filter(([k]) => k)), { rebuild: true }),
        F.select(rec, set, 'Como escolhe as magias', 'spellcasting.mode', CAST_MODE, { rebuild: true }),
        h('div', { class: 'cd-calc-box' }, h('small', {}, 'Lista de magias'), btnI('arrow-right', nSp + ' magias de ' + rec.name, { class: 'btn small', 'data-act': 'open-class-spells', onclick: () => { C.filters.spells = { cls: rec.name, edition: rec.edition || '' }; C.q.spells = ''; C.sel.spells = null; C.tab = 'spells'; saveUi(); render(true); } }))),
        h('div', { class: 'cd-alt-foot' }, h('span', { class: 'grow' }), xBtn('Esta classe não conjura', () => set('spellcasting', null, true))))
      : addBtn('Esta classe conjura magias', () => set('spellcasting', { ability: 'int', progression: 'full', mode: 'prepared' }, true), 'cast-add')));
    out.push(sec('list-ordered', 'Progressão (nível 1 a 20)', progressionEditor(rec, set)));
    out.push(sec('star', 'Características (' + (rec.features || []).length + ')', featuresEditor(rec, set)));
    const subs = records('subclasses').filter((x) => x.classId === rec.id).sort((a, b) => a.name.localeCompare(b.name));
    out.push(sec('git-branch', 'Subclasses (' + subs.length + ')', subs.length ? h('div', { class: 'cd-linklist' }, subs.map((x) => h('button', { class: 'cd-base', 'data-id': x.id, onclick: () => select(x.id, 'subclasses') },
      h('span', {}, x.name), h('small', {}, x.source + (x.copyOf ? ' · livro de 2014' : ''))))) : h('p', { class: 'muted' }, 'Nenhuma subclasse cadastrada para esta classe.'),
      h('div', { class: 'cd-alt-foot' }, addBtn('Nova subclasse desta classe', () => { C.filters.subclasses = { cat: rec.name }; C.tab = 'subclasses'; saveUi(); render(true); const r2 = TABS.subclasses.blank(); Object.assign(r2, { classId: rec.id, className: rec.name, classSource: rec.source, edition: rec.edition }); local('subclasses').custom[r2.id] = r2; save(); C.sel.subclasses = r2.id; render(); }, 'sub-add'))));
    out.push(sec('layers', 'Opções de classe por nível', levelsEditor(rec.optionProgression, set, 'optionProgression', 'options')));
    out.push(sec('award', 'Talentos por nível', levelsEditor(rec.featProgression, set, 'featProgression', 'feats')));
    out.push(sec('users', 'Multiclasse',
      rec.multiclass && rec.multiclass.rule === '2024' ? h('p', { class: 'hint' }, 'Regra de 2024: 13 no atributo principal da classe (calculado, o livro não traz em separado).') : null,
      h('h3', { class: 'cd-opt-h' }, 'Para entrar nesta classe'), prereqEditor(rec, set, 'multiclass.requirements'),
      h('h3', { class: 'cd-opt-h' }, 'O que ganha ao entrar por multiclasse'),
      ...benefitsEditor({ b: { proficiencies: (rec.multiclass || {}).proficiencies || [] } }, (p, v) => set('multiclass.proficiencies', (v || {}).proficiencies || [], true), 'b', ['proficiencies'])));
    out.push(descSec(rec, set, 'Texto da classe.'));
    return out;
  }

  // ---------- Opção de classe ----------
  function optionPreview(r) {
    const out = [chip('layers', 'Tipo', (r.types || []).map(typeLabel).join(' / ') || '—')];
    out.push(chip('lock', 'Pré-requisito', prereqTxt(r.prerequisites) || 'None', (r.prerequisites || []).length ? 'gold' : ''));
    if (r.cost) out.push(chip('coins', 'Custo', costLine(r.cost), 'gold'));
    const bt = benefitsTxt(r.benefits);
    if (bt) out.push(chip('gift', 'Benefícios', bt));
    if (r.classFeatureVariant) out.push(chip('repeat', 'Variante', 'Class feature'));
    return out;
  }
  function optionForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.options)];
    if (rec.reprint) {
      const ft = rec.reprint.feat && find('feats', rec.reprint.feat);
      out.push(h('div', { class: 'cd-banner cd-banner-lite' }, ic('award'), h('span', {}, 'Em 2024 virou talento: ', h('b', {}, rec.reprint.name + (ft ? ' (' + ft.source + ')' : '')), '.'), h('span', { class: 'grow' }),
        ft ? btnI('arrow-right', 'Abrir o talento', { class: 'btn small', 'data-act': 'open-reprint', onclick: () => select(ft.id, 'feats') }) : null));
    }
    const types = Object.keys(C.optTypes || {}).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
    out.push(sec('layers', 'Opção',
      h('div', { class: 'cd-subcats' }, h('small', {}, 'Tipos (de quais classes)'), types.map((t) => h('label', { class: 'check cd-subcat' + ((rec.types || []).includes(t) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: (rec.types || []).includes(t), 'data-f': 'type-' + t, onchange: (e) => { const st = new Set(rec.types || []); if (e.target.checked) st.add(t); else st.delete(t); set('types', types.filter((x) => st.has(x)), true); } }), typeLabel(t)))),
      h('div', { class: 'form cd-form cd-form-4' },
        F.select(rec, set, 'Edição', 'edition', { '': '—', 2014: '2014', 2024: '2024' }, { rebuild: true }),
        F.check(rec, set, 'Variante de característica da classe (troca ou soma uma característica)', 'classFeatureVariant', { cls: 'cd-span2' }))));
    out.push(sec('lock', 'Pré-requisitos', prereqEditor(rec, set, 'prerequisites')));
    const c = rec.cost;
    out.push(sec('coins', 'Custo', c
      ? h('div', { class: 'form cd-form cd-form-4' },
        h('label', { class: 'cd-span2' }, 'Recurso', h('input', { value: c.resource || '', placeholder: 'ex.: Sorcery Point, Superiority Die, Ki', 'data-f': 'cost-resource', onchange: (e) => set('cost.resource', e.target.value.trim(), true) })),
        F.num(rec, set, 'Quantidade', 'cost.amount', { input: { min: 0, placeholder: 'fixa' }, rebuild: true }),
        h('label', {}, 'Ou de… a…', h('span', { class: 'cd-cond' }, h('input', { type: 'number', min: 0, value: c.min ?? '', 'data-f': 'cost-min', onchange: (e) => set('cost.min', e.target.value === '' ? null : num(e.target.value), true) }),
          h('input', { type: 'number', min: 0, value: c.max ?? '', 'data-f': 'cost-max', onchange: (e) => set('cost.max', e.target.value === '' ? null : num(e.target.value), true) }))),
        h('div', { class: 'cd-alt-foot cd-span2' }, xBtn('Tirar o custo', () => set('cost', null, true))))
      : addBtn('Adicionar custo', () => set('cost', { resource: '', amount: 1, min: null, max: null }, true), 'cost-add')));
    out.push(sec('gift', 'Benefícios', ...benefitsEditor(rec, set, 'benefits')));
    // talentos que dão opções deste tipo
    const fts = records('feats').filter((ft) => ((ft.benefits || {}).options || []).some((o) => String(o.type || '').split(',').some((t) => (rec.types || []).includes(t))));
    const scs = records('subclasses').filter((x) => !x.copyOf && (x.optionProgression || []).some((o) => String(o.type || '').split(',').some((t) => (rec.types || []).includes(t))));
    if (scs.length) out.push(sec('git-branch', 'Subclasses que escolhem este tipo de opção', h('div', { class: 'cd-linklist' }, scs.map((x) => h('button', { class: 'cd-base', 'data-id': x.id, onclick: () => select(x.id, 'subclasses') },
      h('span', {}, x.className + ': ' + x.shortName), h('small', {}, x.source))))));
    const cls = records('classes').filter((c) => (c.optionProgression || []).some((o) => String(o.type || '').split(',').some((t) => (rec.types || []).includes(t))));
    if (cls.length) out.push(sec('shield', 'Classes que escolhem este tipo de opção', h('div', { class: 'cd-linklist' }, cls.map((c) => h('button', { class: 'cd-base', 'data-id': c.id, onclick: () => select(c.id, 'classes') },
      h('span', {}, c.name), h('small', {}, c.source + ' · ' + c.edition + ' · nível ' + ((c.optionProgression.find((o) => String(o.type).split(',').some((t) => (rec.types || []).includes(t))) || { byLevel: [] }).byLevel.findIndex((n) => n > 0) + 1)))))));
    if (fts.length) out.push(sec('award', 'Talentos que dão este tipo de opção', h('div', { class: 'cd-linklist' }, fts.map((ft) => h('button', { class: 'cd-base', 'data-id': ft.id, onclick: () => select(ft.id, 'feats') },
      h('span', {}, ft.name), h('small', {}, ft.source + (ft.edition ? ' · ' + ft.edition : '')))))));
    out.push(descSec(rec, set, 'Texto da opção.'));
    return out;
  }

  // ---------- Espécie ----------
  // nome como aparece nas magias e ataques ("Elf (Drow)", "Minotaur (Amonkhet)"): a espécie, de preferência da mesma fonte e a mais nova
  function speciesByName(n, src) {
    const all = records('species');
    const pick = (list) => list.sort((a, b) => (b.source === src) - (a.source === src) || String(b.edition).localeCompare(String(a.edition)))[0] || null;
    return pick(all.filter((x) => x.name === n)) || pick(all.filter((x) => x.name === String(n).replace(/ \(.*\)$/, '')));
  }
  // espécie com a opção aplicada (sub-raça ou linhagem)
  function withOption(sp, opt) {
    if (!opt) return sp;
    const r = clone(plain(sp));
    r.benefits = Object.assign({}, r.benefits || {}, opt.benefits || {});
    const rm = new Set(opt.removes || []);
    const ot = new Map((opt.traits || []).map((t) => [t.name, t]));
    r.traits = (r.traits || []).filter((t) => !rm.has(t.name) && !ot.has(t.name)).concat(opt.traits || []);
    if (opt.size && opt.size.length) r.size = opt.size;
    if (opt.speed) r.speed = opt.speed;
    if (opt.feats && opt.feats.length) r.feats = opt.feats;
    r.name = sp.name + ' — ' + opt.name;
    return r;
  }
  function speciesPreview(r) {
    const out = [chip('users', 'Tamanho', (r.size || []).join(' or ') || '—')];
    out.push(chip('footprints', 'Deslocamento', speedTxt(r.speed) || '—'));
    if ((r.creatureTypes || []).length) out.push(chip('tag', 'Tipo', r.creatureTypes.join(', ')));
    const b = r.benefits || {};
    if ((b.ability || []).length) out.push(chip('arrow-up', 'Atributos', b.ability.map(abilityTxt).join(' or '), 'gold'));
    if ((b.senses || []).length) out.push(chip('eye', 'Sentidos', b.senses.map((x) => x.type + ' ' + dist(x.range)).join(', ')));
    const pr = (b.proficiencies || []).map((p) => (PROF_KINDS[p.kind] || p.kind) + ': ' + blockTxt(p));
    if (pr.length) out.push(chip('check', 'Proficiências', pr.join(' · ')));
    if (b.spells) out.push(chip('sparkles', 'Magias', benefitsTxt({ spells: b.spells }).replace(/^spells:? ?/, '')));
    const df = ['resist', 'immune', 'conditionImmune'].filter((k) => b[k]).map((k) => (k === 'resist' ? 'Resist ' : k === 'immune' ? 'Immune ' : 'Cond. immune ') + blockTxt(b[k]));
    if (df.length) out.push(chip('shield', 'Defesas', df.join(' · ')));
    if ((r.feats || []).length) out.push(chip('award', 'Talento', r.feats.map(featRefTxt).join(', '), 'gold'));
    if ((r.traits || []).length) out.push(chip('star', 'Traços', r.traits.map((t) => t.name).join(', ')));
    if ((r.options || []).length) out.push(chip('layers', (r.options[0] || {}).kind === 'subrace' ? 'Sub-raças' : 'Opções', String(r.options.length)));
    return out;
  }
  function traitsEditor(rec, set, path, idp) {
    const TR = clone(get(rec, path) || []);
    const save = () => set(path, TR, true);
    return h('div', { class: 'cd-bsec' },
      TR.length ? null : h('p', { class: 'muted' }, 'Sem traços.'),
      TR.map((t, i) => h('div', { class: 'cd-alt-body cd-trait' },
        h('div', { class: 'cd-cond' }, h('input', { class: 'grow cd-trait-name', value: t.name || '', placeholder: 'Nome do traço', 'data-f': idp + '-' + i + '-name', onchange: (e) => { TR[i] = Object.assign({}, t, { name: e.target.value.trim() }); save(); } }),
          xBtn('Tirar este traço', () => { TR.splice(i, 1); save(); })),
        h('textarea', { class: 'cd-desc cd-desc-sm', rows: Math.min(8, Math.max(2, Math.ceil(String(t.text || '').length / 140))), value: t.text || '', 'data-f': idp + '-' + i + '-text', onchange: (e) => { TR[i] = Object.assign({}, t, { text: e.target.value }); save(); } }))),
      addBtn('Adicionar traço', () => { TR.push({ name: '', text: '' }); save(); }, idp + '-add'));
  }
  function speciesForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.species)];
    out.push(sec('users', 'Espécie', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Edição', 'edition', { '': 'Sem edição', 2014: '2014', 2024: '2024' }, { rebuild: true }),
      h('label', { class: 'cd-span2' }, 'Tipo de criatura', h('input', { value: csv(rec.creatureTypes), placeholder: 'e.g. humanoid', 'data-f': 'creatureTypes', onchange: (e) => set('creatureTypes', uncsv(e.target.value).map((x) => x.toLowerCase())) })))));
    // corpo
    const sp = rec.speed || {};
    const hw = rec.heightWeight;
    out.push(sec('footprints', 'Corpo',
      h('div', { class: 'cd-subcats' }, h('small', {}, 'Tamanho (mais de um = à escolha)'), SIZES.map((z) => h('label', { class: 'check cd-subcat' + ((rec.size || []).includes(z) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: (rec.size || []).includes(z), 'data-f': 'size-' + z, onchange: (e) => { const st = new Set(rec.size || []); if (e.target.checked) st.add(z); else st.delete(z); set('size', SIZES.filter((x) => st.has(x)), true); } }), z))),
      h('div', { class: 'form cd-form cd-form-4 cd-moves' }, Object.entries(MOVES).map(([k, l]) => h('label', {}, l + ' (' + Units.distUnit() + ')', h('input', { type: 'number', min: 0, step: 'any', 'data-f': 'speed-' + k,
        value: sp[k] == null || sp[k] === 'walk' ? '' : Units.distIn(sp[k]), placeholder: sp[k] === 'walk' ? 'igual a andar' : '—',
        onchange: (e) => { const ns = Object.assign({}, sp); if (e.target.value === '') delete ns[k]; else ns[k] = Math.round(Units.distOut(e.target.value) * 100) / 100; set('speed', ns, true); } })))),
      h('div', { class: 'form cd-form cd-form-4' },
        h('label', {}, 'Idade adulta', h('input', { type: 'number', min: 0, value: (rec.age || {}).mature ?? '', 'data-f': 'age-mature', onchange: (e) => set('age', Object.assign({}, rec.age || {}, { mature: e.target.value === '' ? null : num(e.target.value) })) })),
        h('label', {}, 'Idade máxima', h('input', { type: 'number', min: 0, value: (rec.age || {}).max ?? '', 'data-f': 'age-max', onchange: (e) => set('age', Object.assign({}, rec.age || {}, { max: e.target.value === '' ? null : num(e.target.value) })) })),
        hw ? h('label', { title: 'Como no livro: polegadas + dado' }, 'Altura (pol.) + dado', h('input', { value: hw.baseHeight + (hw.heightMod ? ' + ' + hw.heightMod : ''), 'data-f': 'hw-height', onchange: (e) => { const [b, m] = e.target.value.split('+').map((x) => x.trim()); set('heightWeight', Object.assign({}, hw, { baseHeight: num(b), heightMod: m || '' }), true); } })) : null,
        hw ? h('label', { title: 'Como no livro: libras + dado (multiplica o dado da altura)' }, 'Peso (lb) + dado', h('input', { value: hw.baseWeight + (hw.weightMod ? ' × ' + hw.weightMod : ''), 'data-f': 'hw-weight', onchange: (e) => { const [b, m] = e.target.value.split(/[×x*]/).map((x) => x.trim()); set('heightWeight', Object.assign({}, hw, { baseWeight: num(b), weightMod: m || '' }), true); } })) : null),
      hw ? h('p', { class: 'hint' }, 'Altura: ' + Math.round(hw.baseHeight * 2.5) + ' cm + ' + (hw.heightMod || '0') + ' × 2,5 cm. Peso: ' + Units.weight(hw.baseWeight * 0.5) + ' + (' + (hw.heightMod || '0') + ' × ' + (hw.weightMod || '1') + ') libras.') : null));
    out.push(sec('gift', 'Benefícios', ...benefitsEditor(rec, set, 'benefits')));
    out.push(sec('award', 'Talento', featsEditor(rec, set)));
    out.push(sec('star', 'Traços', traitsEditor(rec, set, 'traits', 'tr'),
      h('p', { class: 'hint' }, 'O texto de cada traço vale para a ficha; os números (visão no escuro, magias, resistências…) ficam nos Benefícios.')));
    // ataques que já existem em Ataques
    const atks = records('attacks').filter((a) => a.origin === 'species' && (a.originName === rec.name || a.originName === rec.name.replace(/ \(.*\)$/, '')));
    if (atks.length) out.push(sec('swords', 'Ataques da espécie', h('div', { class: 'cd-linklist' }, atks.map((a) => h('button', { class: 'cd-base', 'data-id': a.id, onclick: () => select(a.id, 'attacks') },
      h('span', {}, a.name), h('small', {}, a.source + (a.edition ? ' · ' + a.edition : '')))))));
    out.push(sec('layers', 'Sub-raças e linhagens', optionsEditor(rec, set)));
    out.push(descSec(rec, set, 'Texto da espécie.'));
    return out;
  }
  function optionsEditor(rec, set) {
    const OP = clone(rec.options || []);
    const save = () => set('options', OP, true);
    const cur = C.optView[rec.id] || '';
    const open = C.optOpen[rec.id];
    const viewSel = OP.length ? h('label', { class: 'cd-span2' }, 'Ver com a opção', h('select', { value: cur, 'data-f': 'opt-view', onchange: (e) => { C.optView[rec.id] = e.target.value; renderMain(); } },
      h('option', { value: '' }, '— só a espécie —'), OP.map((o) => h('option', { value: o.id }, o.name + (o.source !== rec.source ? ' (' + o.source + ')' : ''))))) : null;
    const res = cur && OP.find((o) => o.id === cur) ? withOption(rec, OP.find((o) => o.id === cur)) : null;
    return h('div', { class: 'cd-bsec' },
      OP.length ? h('div', { class: 'form cd-form' }, viewSel) : h('p', { class: 'muted' }, 'Sem sub-raças nem linhagens.'),
      res ? h('div', { class: 'cd-fam-res' }, h('b', {}, res.name), h('div', { class: 'cd-preview' }, ...speciesPreview(res))) : null,
      h('div', { class: 'cd-versions' }, OP.map((o, i) => {
        const isOpen = open === o.id;
        const ch = [o.traits && o.traits.length ? '+' + o.traits.map((t) => t.name).join(', +') : '', (o.removes || []).length ? '−' + o.removes.join(', −') : '', o.benefits ? benefitsTxt(o.benefits) : ''].filter(Boolean).join(' · ');
        return h('div', { class: 'cd-opt' + (isOpen ? ' open' : '') },
          h('button', { class: 'cd-version', 'data-opt': o.id, onclick: () => { C.optOpen[rec.id] = isOpen ? null : o.id; renderMain(); } },
            h('b', {}, o.name), h('small', {}, [o.kind === 'subrace' ? 'Sub-raça' : 'Linhagem', o.source, ch].filter(Boolean).join(' · ')), ic(isOpen ? 'chevron-down' : 'chevron-right')),
          isOpen ? h('div', { class: 'cd-opt-body' },
            h('div', { class: 'form cd-form cd-form-4' },
              h('label', { class: 'cd-span2' }, 'Nome', h('input', { value: o.name, 'data-f': 'opt-' + i + '-name', onchange: (e) => { OP[i] = Object.assign({}, o, { name: e.target.value.trim() || o.name }); save(); } })),
              h('label', {}, 'Tipo', h('select', { value: o.kind, 'data-f': 'opt-' + i + '-kind', onchange: (e) => { OP[i] = Object.assign({}, o, { kind: e.target.value }); save(); } }, h('option', { value: 'subrace' }, 'Sub-raça'), h('option', { value: 'lineage' }, 'Linhagem'))),
              h('label', {}, 'Tira os traços', h('input', { value: csv(o.removes), placeholder: 'nomes dos traços da espécie', 'data-f': 'opt-' + i + '-removes', onchange: (e) => { OP[i] = Object.assign({}, o, { removes: uncsv(e.target.value) }); save(); } }))),
            h('h3', { class: 'cd-opt-h' }, 'Traços desta opção (novos ou que trocam o da espécie)'),
            traitsEditor({ t: o.traits || [] }, (p, v) => { OP[i] = Object.assign({}, o, { traits: v }); save(); }, 't', 'otr'),
            h('h3', { class: 'cd-opt-h' }, 'Benefícios desta opção (trocam os da espécie)'),
            ...benefitsEditor({ b: o.benefits || {} }, (p, v) => { OP[i] = Object.assign({}, o, { benefits: v }); if (!Object.keys(v || {}).length) delete OP[i].benefits; save(); }, 'b'),
            h('div', { class: 'cd-alt-foot' }, h('span', { class: 'grow' }), btnI('trash-2', 'Tirar esta opção', { class: 'btn small danger', onclick: () => { OP.splice(i, 1); C.optOpen[rec.id] = null; save(); } }))) : null);
      })),
      addBtn('Adicionar sub-raça ou linhagem', () => { const nid = rec.id + '--' + U.uid('o'); OP.push({ id: nid, name: 'New option', kind: rec.edition === '2024' ? 'lineage' : 'subrace', source: rec.source, traits: [], removes: [] }); C.optOpen[rec.id] = nid; save(); }, 'opt-add'));
  }

  function backgroundForm(r) {
    const { rec, set } = editor(r);
    const out = [head(r, rec, set, TABS.backgrounds)];
    if (rec.variantOf) {
      const o = find('backgrounds', rec.variantOf);
      out.push(h('div', { class: 'cd-banner' }, ic('layers'), h('span', {}, 'Variante de ', h('b', {}, o ? o.name + ' (' + o.source + ')' : rec.variantOf), '.'), h('span', { class: 'grow' }),
        o ? btnI('arrow-right', 'Abrir o original', { class: 'btn small', 'data-act': 'to-original', onclick: () => select(o.id) }) : null));
    }
    out.push(sec('scroll-text', 'Antecedente', h('div', { class: 'form cd-form cd-form-4' },
      F.select(rec, set, 'Edição', 'edition', { '': 'Sem edição', 2014: '2014', 2024: '2024' }, { rebuild: true }))));
    out.push(sec('lock', 'Pré-requisitos', prereqEditor(rec, set, 'prerequisites')));
    out.push(sec('award', 'Talento', featsEditor(rec, set)));
    out.push(sec('gift', 'Benefícios', ...benefitsEditor(rec, set, 'benefits')));
    out.push(sec('backpack', 'Equipamento inicial', equipmentEditor(rec, set)));
    const ft = rec.feature;
    out.push(sec('star', 'Característica', ft
      ? h('div', { class: 'cd-bsec' }, h('div', { class: 'cd-cond' }, h('input', { class: 'grow', value: ft.name || '', placeholder: 'Nome', 'data-f': 'feature-name', onchange: (e) => set('feature.name', e.target.value.trim()) }), xBtn('Tirar a característica', () => set('feature', null, true))),
        h('textarea', { class: 'cd-desc cd-desc-sm', rows: 5, value: ft.text || '', 'data-f': 'feature-text', onchange: (e) => set('feature.text', e.target.value) }))
      : addBtn('Adicionar característica', () => set('feature', { name: '', text: '' }, true), 'feature-add')));
    out.push(sec('dices', 'Características sugeridas', tablesEditor(rec, set),
      h('p', { class: 'hint' }, 'Traços de personalidade, ideais, vínculos e defeitos. A ficha poderá sortear pelo dado ou deixar o jogador escolher.')));
    out.push(descSec(rec, set, 'Texto do antecedente.'));
    return out;
  }

  // ---------- Direita ----------
  function renderMain() {
    const main = $('#cd-main'), t = T();
    const r = C.sel[C.tab] && find(C.tab, C.sel[C.tab]);
    if (!r) {
      main.replaceChildren(h('div', { class: 'fp-empty' }, h('div', { class: 'bubble' }, ic(t.icon)), h('h2', {}, t.label),
        h('p', { class: 'muted' }, 'Escolha ' + t.um + ' ' + t.one + ' na lista para ver e editar, ou use "' + t.novo + '".'),
        btnI('plus', t.novo, { class: 'btn primary', onclick: () => create() })));
      document.title = 'Vésper · test';
      return;
    }
    const act = document.activeElement, key = act && act.dataset && act.dataset.f;
    const scroll = main.scrollTop;
    main.replaceChildren(h('div', { class: 'cd-edit' }, t.form(r)));
    refreshPreview(Object.assign(clone(plain(r)), { _virtual: r._virtual }));
    main.scrollTop = scroll;
    if (key) { const el = main.querySelector(`[data-f="${CSS.escape(key)}"]`); if (el) el.focus({ preventScroll: true }); }
    document.title = r.name + ' · Vésper · test';
  }

  function render(tabChanged) {
    renderTabs();
    renderSide();
    renderMain();
    if (tabChanged) $('#cd-main').scrollTop = 0;
  }
  C.render = render;
  C.records = records;
  C.find = find;

  async function boot() {
    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = App.Icons.svg(el.dataset.icon); });
    try {
      const u = JSON.parse(localStorage.getItem(UI_KEY) || 'null');
      if (u) {
        C.tab = TABS[u.tab] ? u.tab : u.tab === 'weapons' ? 'items' : 'attacks';
        C.sel = u.sel || {}; C.filters = u.filters || {}; C.q = u.q || {};
        if (u.tab === 'weapons' || (u.sel && u.sel.weapons)) { C.sel.items = C.sel.items || (u.sel || {}).weapons; C.filters.items = Object.assign({ cat: 'Weapon' }, C.filters.items || {}); }
        delete C.sel.weapons; delete C.filters.weapons; delete C.q.weapons;
      }
    } catch { /* */ }
    const start = profile ? performance.now() : 0;
    const [atk, itm, spl, fet, bkg, spc, opt, cls, sub] = await Promise.all([loadDefaults('attacks', 'attacks'), loadDefaults('items', 'items'), loadDefaults('spells', 'spells'), loadDefaults('feats', 'feats'), loadDefaults('backgrounds', 'backgrounds'), loadDefaults('species', 'species'), loadDefaults('options', 'options'), loadDefaults('classes', 'classes'), loadDefaults('subclasses', 'subclasses')]);
    if (profile) performance.measure('cadastros.leitura', { start, end: performance.now() });
    C.defaults.options = opt; C.defaults.classes = cls; C.defaults.subclasses = sub;
    C.defaults.attacks = atk; C.defaults.items = itm; C.defaults.spells = spl; C.defaults.feats = fet; C.defaults.backgrounds = bkg; C.defaults.species = spc;
    // O que já estava salvo entra por baixo do que a pessoa mudou enquanto o banco abria
    const apply = (saved) => {
      if (!saved) return;
      migrate(saved);
      for (const k of Object.keys(TABS)) {
        if (!saved[k]) continue;
        const L = local(k), s = saved[k];
        L.custom = Object.assign({}, s.custom || {}, L.custom);
        L.edited = Object.assign({}, s.edited || {}, L.edited);
        L.deleted = [...new Set((s.deleted || []).concat(L.deleted))];
      }
      ver++;
    };
    loadP = idbGet('cadastros');
    loadP.catch(() => { dbBroken = true; U.toast('Não consegui abrir o salvamento do navegador. Use Exportar para guardar o que mudar.', 'error', 7000); });
    let late = false, hadWeapons = false;
    try { const s = await Promise.race([loadP, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]); hadWeapons = !!(s && s.weapons); apply(s); }
    catch { late = true; } // banco lento: abre com os padrões e soma o salvo quando chegar
    if (late) loadP.then((saved) => { apply(saved); if (C.loaded) render(); }, () => {});
    if (hadWeapons) save(); // grava já no formato novo (sem 'weapons')
    render();
    C.loaded = true;
  }
  document.addEventListener('DOMContentLoaded', boot);
})(window.App);
