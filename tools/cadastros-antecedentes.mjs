/*
 * Antecedentes do cadastro (Plano 46), usado por tools/importar-cadastros.mjs.
 * - Antecedentes pelo carregador do próprio 5etools (cópias resolvidas como no site); variantes ficam separadas,
 *   com "variantOf" apontando para o original (decisão do usuário).
 * - Pré-requisitos e benefícios no formato de tools/cadastros-beneficios.mjs (atributos com pesos: +2/+1 ou +1/+1/+1).
 * - Talento: ligado ao cadastro de Talentos ("magic initiate; cleric|xphb" → Magic Initiate (XPHB) com a escolha "Cleric").
 * - Equipamento inicial: grupos ("_" = sempre; "A"/"B"… = escolha uma), itens ligados ao cadastro de Itens ou texto livre; ouro em peças de cobre.
 * - 2014: a Característica ("Feature: …") e as Características sugeridas como tabelas (dado e linhas; decisão do usuário).
 */
import fs from 'fs';
import path from 'path';
import { text, strip, slug, IMG_BASE } from './cadastros-itens.mjs';
import { benefitsOf, prereqsOf } from './cadastros-beneficios.mjs';

const EQUIP_TYPE = { toolArtisan: "Artisan's Tools (any)", setGaming: 'Gaming Set (any)', instrumentMusical: 'Musical Instrument (any)' };
const cap = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
const cap1 = (s) => { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); };
const idOf0 = (ref, defSrc) => { const [n, s] = String(ref).split('|'); return slug(n) + '-' + slug(s || defSrc); };

// Equipamento inicial do 5etools → grupos [{ options: [{ label: '' | 'A'…, items: [...] }] }] (antecedentes e classes)
export function makeEquipment({ itemIds, itemName, stats }) {
  const idOf = (ref, defSrc) => { const id = idOf0(ref, defSrc); return itemIds.has(id) ? id : itemIds.has('g-' + id) ? 'g-' + id : id; };
  const itemEntry = (e, src) => {
    if (typeof e === 'string') {
      const id = idOf(e, src);
      if (!itemIds.has(id)) stats.itemMissing.add(e);
      return { item: itemIds.has(id) ? id : null, name: itemIds.has(id) ? itemName(id) : cap(e.split('|')[0]), qty: 1 };
    }
    if (e.value != null && !e.item && !e.special && !e.equipmentType) return { gold: e.value };
    if (e.item) {
      const id = idOf(e.item, src);
      if (!itemIds.has(id)) stats.itemMissing.add(e.item);
      const r = { item: itemIds.has(id) ? id : null, name: e.displayName ? cap1(strip(e.displayName)) : itemIds.has(id) ? itemName(id) : cap(e.item.split('|')[0]), qty: e.quantity || 1 };
      if (e.containsValue) r.contains = e.containsValue;
      if (e.worthValue) r.worth = e.worthValue;
      return r;
    }
    if (e.special) { const r = { item: null, name: cap1(strip(e.special)), qty: e.quantity || 1 }; if (e.worthValue) r.worth = e.worthValue; if (e.containsValue) r.contains = e.containsValue; return r; }
    if (e.equipmentType) return { item: null, name: EQUIP_TYPE[e.equipmentType] || e.equipmentType, type: e.equipmentType, qty: e.quantity || 1 };
    return null;
  };
  return (list, src) => {
    const equipment = [];
    for (const set of [].concat(list || [])) {
      const opts = Object.entries(set).map(([label, l]) => ({ label: label === '_' ? '' : label.toUpperCase(), items: [].concat(l).map((e) => itemEntry(e, src)).filter(Boolean) }));
      const fixed = opts.filter((o) => !o.label);
      const choose = opts.filter((o) => o.label);
      for (const o of fixed) equipment.push({ options: [o] });
      if (choose.length) equipment.push({ options: choose });
    }
    return equipment;
  };
}

export async function buildBackgrounds(SRC, { bookDate, featIds, itemIds, itemName, spellIds }) {
  const all = await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_BACKGROUNDS);
  let fluff = [];
  try { fluff = await DataLoader.pCacheAndGetAllSite('backgroundFluff'); } catch { /* sem imagens */ }
  const raw = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'backgrounds.json'), 'utf8')).background;
  const key = (n, s) => (String(n).trim() + '|' + String(s || '').trim()).toLowerCase();
  const copyOf = new Map(raw.filter((b) => b._copy).map((b) => [key(b.name, b.source), b._copy]));
  const imgOf = new Map();
  for (const f of fluff) {
    const imgs = (f.images || []).filter((x) => x && x.type === 'image' && x.href && x.href.type === 'internal' && x.href.path).map((x) => IMG_BASE + x.href.path.split('/').map(encodeURIComponent).join('/'));
    if (imgs.length) imgOf.set(key(f.name, f.source), imgs);
  }
  const stats = { featMissing: [], itemMissing: new Set() };
  const used = new Set();
  const usedSources = new Set();
  const out = [];
  const equipOf = makeEquipment({ itemIds, itemName, stats });
  for (const b of all) {
    if (b._versionBase_isVersion) continue;
    let id = slug(b.name) + '-' + slug(b.source); let n = 2; while (used.has(id)) id = slug(b.name) + '-' + slug(b.source) + '-' + n++; used.add(id);
    usedSources.add(b.source);
    const ed = b.edition === 'one' || b.source === 'XPHB' ? '2024' : b.edition === 'classic' ? '2014' : bookDate(b.source) > '2024-09-16' ? '2024' : bookDate(b.source) ? '2014' : '';
    // talento
    const feats = [];
    for (const o of [].concat(b.feats || [])) for (const [k, v] of Object.entries(o)) {
      if (v !== true) { feats.push({ any: true, count: typeof v === 'number' ? v : 1 }); continue; }
      const [nm, src] = k.split('|');
      const [baseName, choice] = nm.split(';').map((x) => x.trim());
      const fid = slug(baseName) + '-' + slug(src || 'phb');
      if (!featIds.has(fid)) stats.featMissing.push(b.name + ' → ' + k);
      feats.push({ feat: featIds.has(fid) ? fid : null, name: cap(baseName), choice: choice ? cap(choice) : '' });
    }
    // equipamento
    const equipment = equipOf(b.startingEquipment, b.source);
    // característica e características sugeridas (2014); saem da descrição
    let feature = null, characteristics = null;
    const rest = [];
    for (const e of b.entries || []) {
      if (e && typeof e === 'object' && /^Feature: /.test(e.name || '')) { feature = { name: strip(e.name.replace(/^Feature: /, '')), text: text(e.entries) }; continue; }
      if (e && typeof e === 'object' && /^Suggested Characteristics$/i.test(e.name || '')) {
        const tables = [], intro = [];
        for (const x of e.entries || []) {
          if (x && x.type === 'table') {
            const die = Number(String((x.colLabels || [])[0] || '').replace(/\D/g, '')) || (x.rows || []).length;
            tables.push({ name: strip((x.colLabels || [])[1] || x.caption || 'Table'), die, rows: (x.rows || []).map((r) => strip(typeof r[1] === 'string' ? r[1] : text(r[1]))) });
          } else intro.push(x);
        }
        characteristics = { intro: text(intro), tables };
        continue;
      }
      rest.push(e);
    }
    const cp = copyOf.get(key(b.name, b.source));
    const r = {
      id, name: b.name, source: b.source, page: b.page || null, edition: ed,
      variantOf: cp ? slug(cp.name) + '-' + slug(cp.source) : null,
      prerequisites: prereqsOf(b.prerequisite),
      benefits: benefitsOf(b, spellIds || new Set()),
      feats, equipment, feature, characteristics,
      description: text(rest),
    };
    const img = imgOf.get(key(b.name, b.source));
    if (img) r.images = img;
    if (b.srd || b.srd52) r.srd = true;
    out.push(r);
  }
  // variante que aponta para um original que não existe: tira a ligação
  const ids = new Set(out.map((x) => x.id));
  for (const r of out) if (r.variantOf && !ids.has(r.variantOf)) r.variantOf = null;
  return { backgrounds: out, usedSources, stats };
}
