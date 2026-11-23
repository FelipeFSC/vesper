/*
 * Importa as criaturas e NPCs do 5etools para o bestiário do Vésper (Plano 25).
 * Uso:  node tools/importar-5etools.mjs [pasta do 5etools-src]   (padrão: D:\Projetos\5etools-src)
 *
 * - Usa o carregador do próprio 5etools (DataLoader), que resolve as cópias (_copy/_mod) igual ao site.
 * - Grava cada criatura inteira, sem cortar campos, mais: _token (endereço do token), _fluff (descrição e artes).
 * - Saída em data/5etools/ (FORA DO GIT: são dados dos livros do usuário):
 *     indice.js        lista leve para a janela (nome, livro, ND, tipo, tamanho, token)
 *     livro-<SIGLA>.js as criaturas completas de cada livro, carregadas sob demanda
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { sourceNames } from './fontes-5etools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'data', '5etools');
const SRC = path.resolve(process.argv[2] || 'D:/Projetos/5etools-src');
const IMG_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/';

if (!fs.existsSync(path.join(SRC, 'data', 'bestiary'))) {
  console.error('Não achei ' + path.join(SRC, 'data', 'bestiary') + '. Passe a pasta do 5etools-src: node tools/importar-5etools.mjs <pasta>');
  process.exit(1);
}

// O carregador do 5etools lê caminhos relativos à pasta dele
process.chdir(SRC);
const root = pathToFileURL(SRC + path.sep).href;
for (const f of ['js/parser.js', 'js/utils.js', 'js/utils-dataloader.js', 'js/utils-config.js', 'js/render.js', 'js/render-dice.js']) await import(root + f);
const ut = await import(root + 'node/util.js');
ut.patchLoadJson();
Renderer.get().setBaseMediaUrl('img', IMG_BASE);

const t0 = Date.now();
const monsters = await DataLoader.pCacheAndGetAllSite('monster');
const fluffs = await DataLoader.pCacheAndGetAllSite('monsterFluff');
const key = (name, source) => (String(name) + '|' + String(source)).toLowerCase();
const fluffBy = new Map(fluffs.map((f) => [key(f.name, f.source), f]));

// Nomes dos livros e aventuras
const books = {};
const allBooks = [];
const addBooks = (file, prop, group) => {
  try {
    for (const b of JSON.parse(fs.readFileSync(path.join(SRC, 'data', file), 'utf8'))[prop] || []) {
      allBooks.push(b);
      if ((b.source || b.id) && !books[b.source || b.id]) books[b.source || b.id] = { name: b.name, group, date: b.published || '' };
    }
  } catch { /* sem o arquivo: fica só a sigla */ }
};
addBooks('books.json', 'book', 'livro');
addBooks('adventures.json', 'adventure', 'aventura');
const sourceName = sourceNames(allBooks);

const mediaUrl = (href) => {
  if (!href) return null;
  if (href.type === 'internal' && href.path) return IMG_BASE + href.path.split('/').map(encodeURIComponent).join('/');
  if (href.type === 'external' && href.url) return href.url;
  return null;
};
const tokenUrl = (m) => {
  if (!(m.hasToken || m.token || m.tokenHref)) return null;
  try { return encodeURI(Renderer.monster.getTokenUrl(m)); } catch { return null; }
};
const crOf = (cr) => (cr == null ? null : typeof cr === 'object' ? cr.cr : cr);
const crNum = (cr) => { const c = crOf(cr); if (c == null || c === 'Unknown') return null; if (/^\d+\/\d+$/.test(c)) { const [a, b] = c.split('/'); return a / b; } return Number(c); };
const typeOf = (t) => (typeof t === 'string' ? t : t && (typeof t.type === 'string' ? t.type : t.type && t.type.choose ? t.type.choose.join('/') : '')) || '';

const byBook = {};
const index = [];
const seen = new Set();
let dup = 0;
for (const m0 of monsters) {
  const k = key(m0.name, m0.source);
  if (seen.has(k)) { dup++; continue; }
  seen.add(k);
  const m = JSON.parse(JSON.stringify(m0));
  delete m.__prop;
  const tok = tokenUrl(m);
  const fl = fluffBy.get(k);
  if (tok) m._token = tok;
  // Textos montados pelas funções do próprio 5etools (iguais aos do site)
  const txt = {};
  try { txt.align = Parser.alignmentListToFull(m.alignment) || ''; } catch { /* */ }
  try { txt.type = Parser.monTypeToFullObj(m.type).asText || ''; } catch { /* */ }
  try { const ib = Renderer.monster.getInitiativeBonusNumber({ mon: m }); if (ib != null && !Number.isNaN(ib)) txt.init = ib; } catch { /* */ }
  m._txt = txt;
  if (fl) {
    m._fluff = { entries: fl.entries || [], images: (fl.images || []).map((im) => ({ url: mediaUrl(im.href), title: im.title || '', credit: im.credit || '' })).filter((x) => x.url) };
  }
  (byBook[m.source] = byBook[m.source] || []).push(m);
  index.push({
    k, n: m.name, s: m.source, cr: crOf(m.cr), crn: crNum(m.cr), ty: typeOf(m.type),
    sz: [].concat(m.size || []).join('/'), npc: !!m.isNpc, named: !!m.isNamedCreature, tok: tok || '', art: !!(m._fluff && m._fluff.images.length),
    rep: !!(m.reprintedAs && m.reprintedAs.length), ali: m.alias || undefined,
  });
}
index.sort((a, b) => a.n.localeCompare(b.n) || a.s.localeCompare(b.s));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const head = "'use strict';\n/* Gerado por tools/importar-5etools.mjs a partir do 5etools-src do usuário. Não edite à mão; não vai para o git. */\nwindow.App = window.App || {};\n";
const usedBooks = {};
for (const s of Object.keys(byBook)) usedBooks[s] = books[s] ? { ...books[s], name: sourceName(s) } : { name: sourceName(s), group: 'outro', date: '' };
fs.writeFileSync(path.join(OUT, 'indice.js'), head + 'window.App.BESTIARY5E_INDEX = ' + JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), imgBase: IMG_BASE, books: usedBooks, list: index }) + ';\n');
let total = 0;
for (const [s, list] of Object.entries(byBook)) {
  const file = path.join(OUT, 'livro-' + s.replace(/[^A-Za-z0-9_-]/g, '_') + '.js');
  fs.writeFileSync(file, head + '(window.App.BESTIARY5E_BOOKS = window.App.BESTIARY5E_BOOKS || {})[' + JSON.stringify(s) + '] = ' + JSON.stringify(list) + ';\n');
  total += fs.statSync(file).size;
}
const idxSize = fs.statSync(path.join(OUT, 'indice.js')).size;
console.log(`${index.length} criaturas (${index.filter((x) => x.npc).length} NPCs) de ${Object.keys(byBook).length} livros · ${index.filter((x) => x.tok).length} com token · ${index.filter((x) => x.art).length} com arte · repetidas ignoradas ${dup}`);
console.log(`índice ${(idxSize / 1024).toFixed(0)} KB · livros ${(total / 1048576).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(1)} s · saída ${OUT}`);
