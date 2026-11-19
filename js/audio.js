'use strict';
/*
 * Som da mesa. Só o mestre controla; os jogadores apenas ouvem.
 * - O mestre escolhe uma pasta (ex.: "musicas" dentro do projeto); a mesa lista os arquivos de áudio.
 * - A campanha guarda só os NOMES das faixas (st.audio); os arquivos ficam na pasta.
 * - Dois canais contínuos (música e ambiente) + efeitos curtos.
 * - Os jogadores recebem cada faixa do mestre pela conexão P2P e guardam no navegador (IndexedDB).
 */
(function (App) {
  const { U } = App;
  const S = () => App.Store;
  const EXT = /\.(mp3|ogg|oga|opus|m4a|aac|wav|flac|webm)$/i;
  const CHUNK = 16000;

  const A = {
    dir: null, dirName: '', needPerm: false, files: new Map(), sizes: {}, durations: {},
    urls: new Map(), loading: new Set(), recv: new Map(), serving: new Set(), streaming: new Set(),
    ch: {}, blocked: false, sfxN: undefined, listeners: new Set(),
  };
  const emit = () => { for (const f of A.listeners) f(); };
  A.on = (f) => A.listeners.add(f);

  // ---------- IndexedDB próprio (pasta escolhida + cache das faixas dos jogadores) ----------
  let dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('vespera-audio', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('cache'); };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        setTimeout(() => rej(new Error('IndexedDB lento')), 3000);
      });
    }
    return dbp;
  }
  async function idb(store, key, val) {
    try {
      const d = await db();
      return await new Promise((res, rej) => {
        const tx = d.transaction(store, val === undefined ? 'readonly' : 'readwrite');
        const r = val === undefined ? tx.objectStore(store).get(key) : tx.objectStore(store).put(val, key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    } catch { return undefined; }
  }

  // ---------- Pasta de músicas (mestre) ----------
  A.canPickFolder = () => typeof window.showDirectoryPicker === 'function';

  A.pickFolder = async function () {
    try {
      const h = await window.showDirectoryPicker({ id: 'vespera-musicas', mode: 'read' });
      A.dir = h;
      await idb('kv', 'dir', h);
      await A.scan();
    } catch (e) { if (e.name !== 'AbortError') U.toast('Não foi possível abrir a pasta: ' + e.message, 'error'); }
  };
  // Navegadores sem acesso a pastas: escolher vários arquivos (vale só nesta sessão)
  A.pickFiles = function () {
    const i = document.createElement('input');
    i.type = 'file'; i.multiple = true; i.accept = 'audio/*';
    i.onchange = () => A.addFiles([...i.files].map((f) => [f.name, f]), 'Arquivos escolhidos');
    i.click();
  };
  // Acrescenta arquivos soltos: [[nome, File], ...]
  A.addFiles = function (list, label) {
    for (const [name, f] of list) { if (!EXT.test(name)) continue; A.files.set(name, { getFile: async () => f }); A.sizes[name] = f.size; }
    A.dirName = A.dirName || label || 'Arquivos';
    emit(); measureAll();
  };
  A.restore = async function () {
    const h = await idb('kv', 'dir');
    if (!h || !h.queryPermission) return;
    A.dir = h; A.dirName = h.name;
    try {
      if ((await h.queryPermission({ mode: 'read' })) === 'granted') await A.scan();
      else { A.needPerm = true; emit(); }
    } catch { A.needPerm = true; emit(); }
  };
  A.reconnect = async function () {
    if (!A.dir) return;
    try {
      if ((await A.dir.requestPermission({ mode: 'read' })) === 'granted') { A.needPerm = false; await A.scan(); }
    } catch (e) { U.toast(e.message, 'error'); }
  };
  A.scan = async function () {
    if (!A.dir) return;
    const files = new Map();
    async function walk(dir, prefix, depth) {
      for await (const [name, h] of dir.entries()) {
        if (h.kind === 'file' && EXT.test(name)) files.set(prefix + name, h);
        else if (h.kind === 'directory' && depth < 3) await walk(h, prefix + name + '/', depth + 1);
      }
    }
    try { await walk(A.dir, '', 0); }
    catch (e) { A.needPerm = true; emit(); return; }
    A.files = files; A.dirName = A.dir.name; A.needPerm = false;
    for (const [name, h] of files) if (A.sizes[name] == null) { try { A.sizes[name] = (await h.getFile()).size; } catch { /* */ } }
    emit();
    measureAll();
    A.sync();
  };
  async function fileOf(name) {
    const h = A.files.get(name);
    if (!h) return null;
    try { return await h.getFile(); } catch { return null; }
  }

  // Duração de cada faixa (ajuda a separar efeitos curtos)
  async function measureAll() {
    for (const name of A.files.keys()) {
      if (A.durations[name] != null) continue;
      const url = await urlFor(name);
      if (!url) continue;
      A.durations[name] = await new Promise((res) => {
        const a = new Audio();
        a.preload = 'metadata';
        a.onloadedmetadata = () => res(a.duration);
        a.onerror = () => res(0);
        a.src = url;
      });
    }
    emit();
  }

  // ---------- Categoria: o sistema arruma sozinho; o mestre pode trocar ----------
  const RX_SFX = /(^|[^a-z])(sfx|efeito|efeitos|fx|porta|door|trov|thunder|grito|scream|espada|sword|explos|rugido|roar|passo|steps|hit|golpe|sino|bell|magia|spell)/i;
  // Só palavras que quase sempre indicam som de fundo (taverna, masmorra etc. costumam ser música)
  const RX_AMB = /(ambien|ambience|atmosf|chuva|rain|vento|wind|ondas|waves|\bmar\b|ocean|\brio\b|river|riacho|fogueira|campfire|lareira|fireplace|tempestade|storm|grilos|crickets|p[aá]ssaros|birds|multid[aã]o|crowd|ru[ií]do|noise)/i;
  A.guess = function (name) {
    const n = name.toLowerCase();
    const folder = n.includes('/') ? n.slice(0, n.lastIndexOf('/')) : '';
    if (/(sfx|efeito)/.test(folder)) return 'sfx';
    if (/ambien/.test(folder)) return 'ambient';
    if (/(m[uú]sica|music|trilha)/.test(folder)) return 'music';
    const d = A.durations[name];
    if (d && d < 20) return 'sfx';
    if (RX_SFX.test(n)) return 'sfx';
    if (RX_AMB.test(n)) return 'ambient';
    return 'music';
  };
  A.catOf = function (name) {
    const lib = S().state && S().state.audio.lib[name];
    return (lib && lib.cat) || A.guess(name);
  };
  A.label = (name) => String(name || '').replace(/^.*\//, '').replace(EXT, '').replace(/[_]+/g, ' ');

  // ---------- URLs das faixas ----------
  A.previewUrl = (name) => urlFor(name); // usado pelo "Testar gatilho" (toca só no mestre)
  async function urlFor(name, size) {
    if (A.urls.has(name)) return A.urls.get(name);
    if (S().role !== 'player') {
      const f = await fileOf(name);
      if (!f) return null;
      const u = URL.createObjectURL(f);
      A.urls.set(name, u);
      return u;
    }
    // Jogador: cache local, senão pede ao mestre
    const blob = await idb('cache', name + '|' + (size || ''));
    if (blob) { const u = URL.createObjectURL(blob); A.urls.set(name, u); return u; }
    request(name);
    return null;
  }
  function request(name) {
    if (A.loading.has(name)) return;
    A.loading.add(name);
    App.Net.send({ t: 'audio-req', name });
    setTimeout(() => A.loading.delete(name), 60000); // permite tentar de novo
  }

  // Mestre: envia uma faixa para um jogador, em pedaços
  A.serve = async function (conn, name) {
    const key = conn.peer + '|' + name;
    if (A.serving.has(key)) return;
    const f = await fileOf(name);
    if (!f) { try { conn.send({ t: 'audio-missing', name }); } catch { /* */ } return; }
    A.serving.add(key);
    try {
      // Lê blocos de ~1 MB do disco e envia em pedaços menores
      const n = Math.ceil(f.size / CHUNK), mime = f.type || mimeOf(name), SLAB = CHUNK * 64;
      let slab = null, slabStart = -1;
      for (let i = 0; i < n; i++) {
        if (!conn.open) break;
        const dc = conn.dataChannel;
        while (dc && dc.bufferedAmount > 1 << 21) await U.sleep(40);
        const off = i * CHUNK, s0 = Math.floor(off / SLAB) * SLAB;
        if (s0 !== slabStart) { slab = await f.slice(s0, s0 + SLAB).arrayBuffer(); slabStart = s0; }
        conn.send({ t: 'audio-chunk', name, i, n, size: f.size, mime, data: slab.slice(off - s0, off - s0 + CHUNK) });
      }
    } catch (e) { console.warn('audio serve', e); }
    A.serving.delete(key);
  };
  // Mestre: avisa os jogadores para baixarem as faixas antes de tocar
  A.preload = function (names) {
    names = names.filter(Boolean);
    if (names.length && S().role === 'gm') App.Net.broadcast({ t: 'audio-preload', names: names.map((n) => ({ name: n, size: A.sizes[n] })) });
  };

  // Jogador: recebe mensagens de áudio
  A.onMessage = async function (msg) {
    if (msg.t === 'audio-preload') {
      for (const it of msg.names || []) { if (!A.urls.has(it.name) && !(await idb('cache', it.name + '|' + (it.size || '')))) request(it.name); }
      return;
    }
    if (msg.t === 'audio-missing') { A.loading.delete(msg.name); return; }
    if (msg.t !== 'audio-chunk' || typeof msg.name !== 'string') return;
    const name = msg.name, mime = String(msg.mime || mimeOf(name));
    let r = A.recv.get(name);
    if (!r || r.n !== msg.n) {
      r = { n: msg.n, parts: new Array(msg.n), got: 0, next: 0 };
      A.recv.set(name, r);
      if (!A.urls.has(name) && wanted(name) && canStream(mime)) openStream(r, name, mime);
    }
    if (!r.parts[msg.i]) { r.parts[msg.i] = msg.data; r.got++; }
    if (r.ms) {
      pump(r);
      if (r.got === 6) A.sync(); // já dá para começar a tocar
    }
    if (r.got < r.n) return;
    A.recv.delete(name);
    const blob = new Blob(r.parts, { type: mime });
    r.parts = null;
    await idb('cache', name + '|' + (msg.size || ''), blob);
    const url = URL.createObjectURL(blob);
    A.urls.set(name, url);
    A.loading.delete(name);
    if (r.ms) { clearTimeout(r.wait); swapToBlob(r.url, url); A.streaming.delete(name); }
    A.sync();
  };

  // ---------- Streaming: começa a tocar com os primeiros pedaços ----------
  const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', flac: 'audio/flac', webm: 'audio/webm' };
  function mimeOf(name) { const m = /\.([a-z0-9]+)$/i.exec(name); return (m && MIME[m[1].toLowerCase()]) || 'audio/mpeg'; }
  const canStream = (mime) => typeof MediaSource !== 'undefined' && mime === 'audio/mpeg' && MediaSource.isTypeSupported(mime);
  // A faixa está tocando (ou vai tocar) agora?
  function wanted(name) {
    const st = S().state, sc = S().currentScene();
    if (!st) return false;
    const au = st.audio;
    return (au.music && au.music.name === name) || (au.ambient && au.ambient.name === name)
      || !!(sc && (sc.sounds || []).some((x) => x.name === name));
  }
  function openStream(r, name, mime) {
    const ms = new MediaSource();
    r.ms = ms;
    r.url = URL.createObjectURL(ms);
    ms.addEventListener('sourceopen', () => {
      try {
        r.sb = ms.addSourceBuffer(mime);
        r.sb.mode = 'sequence';
        r.sb.addEventListener('updateend', () => pump(r));
        pump(r);
      } catch (e) { console.warn('stream', e); }
    }, { once: true });
    A.urls.set(name, r.url);
    A.streaming.add(name);
  }
  function streamEls(url) {
    const out = [];
    for (const c of Object.values(A.ch)) if (c.el.src === url) out.push(c.el);
    for (const n of A.spots.values()) if (n.el.src === url) out.push(n.el);
    return out;
  }
  // Coloca os pedaços no buffer do navegador sem passar de ~90 s à frente (o navegador limita a memória de áudio)
  function pump(r) {
    if (!r.sb || r.sb.updating || r.ms.readyState !== 'open' || !r.parts) return;
    const els = streamEls(r.url), cur = els.length ? Math.min(...els.map((e) => e.currentTime)) : 0;
    const b = r.sb.buffered, end = b.length ? b.end(b.length - 1) : 0;
    const later = () => { clearTimeout(r.wait); r.wait = setTimeout(() => pump(r), 1000); };
    if (b.length && b.start(0) < cur - 60) { try { r.sb.remove(0, cur - 30); } catch { later(); } return; }
    if (end - cur > 90) { later(); return; }
    if (r.next < r.n && r.parts[r.next]) {
      const d = r.parts[r.next++];
      try { r.sb.appendBuffer(d); } catch { r.next--; later(); }
    }
  }
  // Download completo: troca o streaming pelo arquivo inteiro, no mesmo ponto da música
  function swapToBlob(streamUrl, blobUrl) {
    for (const el of streamEls(streamUrl)) {
      const t = el.currentTime, playing = !el.paused;
      el.src = blobUrl;
      el.addEventListener('loadedmetadata', () => {
        try { el.currentTime = t; } catch { /* */ }
        if (playing) el.play().catch(() => {});
      }, { once: true });
    }
  }

  // ---------- Reprodução (todos os clientes) ----------
  function chan(ch) {
    if (!A.ch[ch]) {
      const el = new Audio();
      el.preload = 'auto';
      A.ch[ch] = { el, name: null, key: null, queue: Promise.resolve() };
    }
    return A.ch[ch];
  }
  function fadeTo(el, v, ms, done) {
    clearInterval(el._fade);
    const from = el.volume, t0 = performance.now();
    if (ms <= 0 || Math.abs(from - v) < 0.01) { el.volume = v; if (done) done(); return; }
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = U.clamp(from + (v - from) * k, 0, 1);
      if (k >= 1) { clearInterval(el._fade); if (done) done(); }
    }, 40);
  }
  const fadeOut = (el, ms) => new Promise((res) => fadeTo(el, 0, ms, res));
  A.position = function (p) {
    if (!p) return 0;
    return p.playing ? (Number(p.pos) || 0) + Math.max(0, (Date.now() - p.at) / 1000) : (Number(p.pos) || 0);
  };

  async function syncChannel(ch) {
    const st = S().state;
    if (!st) return;
    const c = chan(ch), el = c.el, p = st.audio[ch], vol = (st.audio.vol[ch] ?? 0.6) * duck(ch);
    if (!p || !p.name) {
      if (c.name) { await fadeOut(el, 900); el.pause(); c.name = null; }
      c.key = null;
      return;
    }
    const key = [p.name, p.at, p.playing, p.pos].join('|');
    el.loop = p.loop !== false;
    if (key === c.key) { if (!el.paused) fadeTo(el, vol, 300); return; }
    if (c.name !== p.name) {
      const url = await urlFor(p.name, p.size);
      if (!url) return; // ainda baixando: o recebimento chama sync de novo
      if (c.name && !el.paused) await fadeOut(el, 900);
      el.src = url;
      c.name = p.name;
      await new Promise((res) => { if (el.readyState >= 1) res(); else { el.onloadedmetadata = res; el.onerror = res; setTimeout(res, 4000); } });
    }
    c.key = key;
    let t = A.position(p);
    if (isFinite(el.duration) && el.duration > 0) t = el.loop ? t % el.duration : Math.min(t, el.duration);
    if (!A.streaming.has(p.name) && Math.abs(el.currentTime - t) > 1.5) { try { el.currentTime = t; } catch { /* */ } }
    if (p.playing) {
      if (el.paused) el.volume = 0;
      // Não espera o play terminar: se o navegador demorar para começar, a fila não trava
      el.play().then(() => { if (c.key === key) fadeTo(el, (S().state.audio.vol[ch] ?? 0.6) * duck(ch), 1200); })
        .catch((e) => { if (e.name === 'NotAllowedError') { c.key = null; setBlocked(true); } });
      fadeTo(el, vol, 1200);
    } else {
      await fadeOut(el, 500);
      el.pause();
    }
  }

  async function syncSfx() {
    const st = S().state, fx = st && st.audio.sfx;
    if (!fx) { A.sfxN = A.sfxN ?? 0; return; }
    if (A.sfxN === undefined) { A.sfxN = fx.n; return; } // ao entrar, não toca o efeito antigo
    if (fx.n === A.sfxN) return;
    A.sfxN = fx.n;
    if (Date.now() - fx.at > 15000) return;
    const url = await urlFor(fx.name, fx.size);
    if (!url) return;
    if (stoppedSince({ name: fx.name }, fx.at)) return; // mandaram parar enquanto o arquivo carregava
    const a = new Audio(url);
    a.volume = st.audio.vol.sfx ?? 0.8;
    const item = track({ name: fx.name, el: a });
    // "Parar depois de (s)": conta desde que o mestre mandou tocar
    if (Number(fx.stopAfter) > 0) setTimeout(() => stopItem(item), Math.max(0, Number(fx.stopAfter) * 1000 - (Date.now() - fx.at)));
    a.play().catch((e) => { if (e.name === 'NotAllowedError') setBlocked(true); });
  }

  // ---------- Parar efeitos (Plano 27) ----------
  // Cada computador guarda os efeitos que está tocando (de uma vez, soltos ou presos a um som do mapa)
  A.fx = [];
  A.lastStop = null;
  function track(item) {
    A.fx.push(item);
    item.el.addEventListener('ended', () => { A.fx = A.fx.filter((x) => x !== item); }, { once: true });
    return item;
  }
  function stopItem(item) {
    if (!item || item.stopped) return;
    item.stopped = true;
    try { item.el.pause(); } catch { /* */ }
    if (item.node) { try { item.node.gain.disconnect(); } catch { /* */ } }
    A.fx = A.fx.filter((x) => x !== item);
  }
  // A ordem de parar vale para este efeito? (sem nome nem som do mapa = todos)
  const stopMatches = (so, item) => (so.spotId ? item.spotId === so.spotId : so.name ? item.name === so.name : true);
  const stoppedSince = (item, at) => { const so = A.lastStop; return !!so && so.at >= at && stopMatches(so, item); };
  function syncStop() {
    const so = S().state.audio.stop;
    if (A.stopN === undefined) { A.stopN = so ? so.n : 0; return; } // ao entrar, não repete a ordem antiga
    if (!so || so.n === A.stopN) return;
    A.stopN = so.n;
    if (Date.now() - so.at > 15000) return;
    A.lastStop = so;
    for (const item of A.fx.slice()) if (stopMatches(so, item)) stopItem(item);
  }
  // Mestre: para um efeito pelo nome, o efeito de um som do mapa, ou todos ({} = todos)
  A.stopFx = function (opts = {}) {
    const prev = S().state.audio.stop;
    D({ type: 'audio.stop', stop: { name: opts.name || null, spotId: opts.spotId || null, n: ((prev && prev.n) || 0) + 1, at: Date.now() } });
  };
  // Mestre: silêncio — música, ambiente, efeitos e os sons do mapa desta cena
  A.stopAll = function () {
    const st = S().state, sc = S().currentScene();
    if (st.audio.music) A.stop('music');
    if (st.audio.ambient) A.stop('ambient');
    A.stopFx({});
    for (const s of (sc && sc.sounds) || []) if (s.on) D({ type: 'sound.update', sceneId: sc.id, id: s.id, patch: { on: false } });
  };

  // ---------- Sons no mapa (posicionais) ----------
  // Cada token do jogador é um "ouvido": volume pela distância, lado esquerdo/direito, abafado atrás de paredes.
  let actxObj = null, master = null;
  function actx() {
    if (!actxObj) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actxObj = new C();
      master = actxObj.createGain();
      master.connect(actxObj.destination);
    }
    return actxObj;
  }
  function chain(el) {
    const c = actx();
    const src = c.createMediaElementSource(el), filter = c.createBiquadFilter(), gain = c.createGain(), pan = c.createStereoPanner();
    filter.type = 'lowpass'; filter.frequency.value = 20000; gain.gain.value = 0;
    src.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(master);
    return { filter, gain, pan };
  }
  // Pontos de onde este cliente ouve: tokens do jogador; o mestre ouve do centro da câmera
  function listeners(sc) {
    const B = App.Board;
    if (S().gmView()) return B.viewCenter && B.w ? [B.viewCenter()] : [];
    return Object.values(sc.tokens).filter((t) => S().canControl(t)).map((t) => (B.posOf ? B.posOf(t) : { x: t.x, y: t.y }));
  }
  // Curva de volume pela distância (0 = no ponto, 1 = borda do alcance) e o inverso
  const OCCLUDED = 0.35;
  A.OCCLUDED = OCCLUDED;
  A.volumeAt = (x) => Math.pow(Math.max(0, 1 - x), 1.5);
  A.distanceFor = (v) => 1 - Math.pow(v, 2 / 3);
  // Quanto (0..1), de que lado (-1..1) e se está abafado
  function hearing(sc, s, lis) {
    const g = sc.grid, R = Math.max(1, Number(s.r) || 8) * g;
    const home = A.roomAt(sc, s);
    let best = null;
    for (const p of lis) {
      if (A.roomAt(sc, p) !== home) continue; // isolamento de som: nada entra nem sai
      if (s.fill && home) { if (!best || best.v < 1) best = { v: 1, pan: 0, occl: false }; continue; }
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d > R) continue;
      const occl = !!(App.Light && App.Light.blocked(sc, p.x, p.y, s.x, s.y));
      const v = A.volumeAt(d / R) * (occl ? OCCLUDED : 1);
      if (!best || v > best.v) best = { v, pan: U.clamp((s.x - p.x) / Math.min(R, 6 * g), -1, 1) * 0.85, occl };
    }
    return best || { v: 0, pan: 0, occl: false };
  }
  A.hearing = (sc, s) => hearing(sc, s, listeners(sc));
  A.spots = new Map();
  let spotQueue = Promise.resolve(), tickTimer = null;

  function dropSpot(id) {
    const n = A.spots.get(id);
    if (!n) return;
    n.el.pause();
    try { n.gain.disconnect(); } catch { /* */ }
    A.spots.delete(id);
  }
  async function syncSpots() {
    const sc = S().currentScene(), list = ((sc && sc.sounds) || []).filter((s) => !s.once);
    const ids = new Set(list.map((s) => s.id));
    for (const id of [...A.spots.keys()]) if (!ids.has(id)) dropSpot(id);
    if (!list.length || !actx()) { if (sc && (sc.rooms || []).length) startTick(); else { stopTick(); updateRoom(sc); } return; }
    for (const s of list) {
      let n = A.spots.get(s.id);
      if (n && n.name !== s.name) { dropSpot(s.id); n = null; }
      if (!n) {
        const url = await urlFor(s.name, s.size);
        if (!url) continue;
        const el = new Audio();
        el.loop = true; el.src = url;
        n = Object.assign({ el, name: s.name, key: null }, chain(el));
        A.spots.set(s.id, n);
      }
      const key = s.on + '|' + s.at;
      if (n.key === key) continue;
      n.key = key;
      if (s.on) {
        const t = Math.max(0, (Date.now() - s.at) / 1000);
        const seek = () => { if (!A.streaming.has(s.name) && isFinite(n.el.duration) && n.el.duration > 0) { try { n.el.currentTime = t % n.el.duration; } catch { /* */ } } };
        if (n.el.readyState >= 1) seek(); else n.el.addEventListener('loadedmetadata', seek, { once: true });
        n.el.play().catch((e) => { if (e.name === 'NotAllowedError') { n.key = null; setBlocked(true); } });
      } else n.el.pause();
    }
    resumeCtx();
    startTick();
  }
  function resumeCtx() {
    if (!actxObj || actxObj.state !== 'suspended') return;
    actxObj.resume().catch(() => {});
    setTimeout(() => { if (actxObj.state === 'suspended' && A.spots.size) setBlocked(true); }, 600);
  }
  // Atualiza volume e direção 10 vezes por segundo (tokens andando, câmera do mestre mexendo)
  function tick() {
    const sc = S().currentScene();
    updateRoom(sc);
    if (!sc || !actxObj) return;
    const lis = listeners(sc), now = actxObj.currentTime, vol = S().state.audio.vol.sfx ?? 0.8;
    for (const s of sc.sounds || []) {
      const n = A.spots.get(s.id);
      if (!n) continue;
      const h = hearing(sc, s, lis);
      n.gain.gain.setTargetAtTime(s.on ? h.v * (s.vol ?? 1) * vol : 0, now, 0.15);
      n.pan.pan.setTargetAtTime(h.pan, now, 0.15);
      n.filter.frequency.setTargetAtTime(h.occl ? 650 : 20000, now, 0.2);
    }
  }
  function startTick() { if (!tickTimer) tickTimer = setInterval(tick, 100); tick(); }
  function stopTick() { clearInterval(tickTimer); tickTimer = null; }

  // Efeito tocado uma vez num ponto: cada um ouve conforme a distância no momento
  async function syncSpotFx() {
    const fx = S().state.audio.spot;
    if (A.spotN === undefined) { A.spotN = fx ? fx.n : 0; return; }
    if (!fx || fx.n === A.spotN) return;
    A.spotN = fx.n;
    if (Date.now() - fx.at > 15000) return;
    const sc = S().currentScene();
    if (!sc || sc.id !== fx.sceneId) return;
    const h = hearing(sc, fx, listeners(sc));
    if (h.v <= 0.01) return;
    const url = await urlFor(fx.name, fx.size);
    if (!url || !actx()) return;
    if (stoppedSince({ name: fx.name, spotId: fx.id }, fx.at)) return;
    const el = new Audio(url), n = chain(el);
    track({ name: fx.name, spotId: fx.id || null, el, node: n });
    n.gain.gain.value = h.v * (fx.vol ?? 1) * (S().state.audio.vol.sfx ?? 0.8);
    n.pan.pan.value = h.pan;
    n.filter.frequency.value = h.occl ? 650 : 20000;
    el.onended = () => { try { n.gain.disconnect(); } catch { /* */ } };
    resumeCtx();
    el.play().catch((e) => { if (e.name === 'NotAllowedError') setBlocked(true); });
  }

  // ---------- Isolamento de som ----------
  // Borda que nenhum som do mapa atravessa: o que toca dentro só se ouve dentro, e o de fora não entra.
  // Não tapa a visão nem impede de andar. Para quem está dentro, a música da cena continua ou para (r.outside)
  // e o ambiente de fora para, fica abafado ou continua (r.ambient).
  function inPoly(p, pts) {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  const polyArea = (pts) => Math.abs(pts.reduce((a, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x * y2 - x2 * y; }, 0)) / 2;
  // O isolamento (o menor, se um estiver dentro do outro) que contém o ponto, ou null
  A.roomAt = function (sc, p) {
    let best = null, area = Infinity;
    for (const r of (sc && sc.rooms) || []) {
      if (!r.pts || r.pts.length < 3 || !inPoly(p, r.pts)) continue;
      const a = polyArea(r.pts);
      if (a < area) { area = a; best = r; }
    }
    return best;
  };
  A.inPoly = inPoly;
  // Em que isolamento este cliente está: com vários tokens, ganha o que para a música de fora
  function myRoom(sc) {
    if (!sc || !(sc.rooms || []).length) return null;
    const rooms = listeners(sc).map((p) => A.roomAt(sc, p)).filter(Boolean);
    return rooms.find((r) => r.outside !== 'keep') || rooms[0] || null;
  }
  A.myRoom = () => myRoom(S().currentScene());
  // Quanto cada canal global toca agora (1 = normal): a sala abafa ou para
  A.duckState = { music: 1, ambient: 1 };
  function duck(ch) { return A.duckState[ch] ?? 1; }
  const AMB = { stop: 0, muffle: 0.3, keep: 1 };
  function setDuck(ch, v) {
    if (A.duckState[ch] === v) return;
    A.duckState[ch] = v;
    const c = A.ch[ch], st = S().state;
    if (c && c.name && !c.el.paused && st) fadeTo(c.el, (st.audio.vol[ch] ?? 0.6) * v, 900);
  }
  // Música e ambiente de fora para quem está dentro do isolamento
  function updateRoom(sc) {
    const st = S().state;
    if (!st) return;
    const r = myRoom(sc);
    setDuck('music', r && r.outside !== 'keep' ? 0 : 1);
    setDuck('ambient', r ? (AMB[r.ambient || 'stop'] ?? 0) : 1);
  }

  A.sync = function () {
    if (!S().state) return;
    for (const ch of ['music', 'ambient']) {
      const c = chan(ch);
      c.queue = c.queue.then(() => syncChannel(ch)).catch((e) => console.warn('audio', e));
    }
    syncSfx();
    spotQueue = spotQueue.then(syncSpots).catch((e) => console.warn('audio spots', e));
    syncSpotFx();
    syncStop();
  };

  // Mestre solta uma faixa no mapa: vira um marcador.
  // Música/ambiente já começa tocando em repetição; efeito fica parado esperando o mestre dar play.
  A.dropAt = function (name, p) {
    const sc = S().currentScene();
    if (!sc || !S().gmView()) return;
    const iso = A.roomAt(sc, p);
    if (iso) U.toast('Dentro de "' + (iso.name || 'Isolamento') + '": só quem está dentro ouve.');
    const once = A.catOf(name) === 'sfx';
    const s = { id: U.uid('snd_'), name, size: A.sizes[name] || 0, x: Math.round(p.x), y: Math.round(p.y),
      r: once ? 12 : 8, vol: 1, on: !once, once, at: Date.now() };
    D({ type: 'sound.add', sceneId: sc.id, sound: s });
    A.preload([name]);
    App.Board.selected = null;
    App.Board.selectedSound = s.id;
    App.Board.requestRender();
  };

  // Mestre dispara um marcador de efeito: toca uma vez daquele ponto para todos
  A.trigger = function (snd) {
    const sc = S().currentScene();
    if (!sc || !snd) return;
    const prev = S().state.audio.spot;
    D({ type: 'audio.spot', spot: { sceneId: sc.id, id: snd.id, name: snd.name, size: snd.size || A.sizes[snd.name] || 0, x: snd.x, y: snd.y,
      r: snd.r, vol: snd.vol ?? 1, n: ((prev && prev.n) || 0) + 1, at: Date.now() } });
    App.Board.addPing({ sceneId: sc.id, x: snd.x, y: snd.y, color: '#d2a24c', name: A.label(snd.name) });
  };
  // Alterna entre "repete" e "uma vez"
  A.setOnce = function (sc, snd, once) {
    D({ type: 'sound.update', sceneId: sc.id, id: snd.id, patch: once ? { once: true, on: false } : { once: false, on: true, at: Date.now() } });
  };

  // Navegador bloqueou o som até a pessoa clicar: um único botão "Ativar som"
  function setBlocked(v) {
    A.blocked = v;
    let b = document.getElementById('sound-unlock');
    if (!v) { if (b) b.hidden = true; return; }
    if (!b) {
      b = U.h('button', { id: 'sound-unlock', class: 'sound-unlock', onclick: () => {
        setBlocked(false);
        if (actxObj) actxObj.resume().catch(() => {});
        for (const c of Object.values(A.ch)) c.key = null;
        for (const n of A.spots.values()) n.key = null;
        A.sync();
      } });
      b.innerHTML = App.Icons.svg('volume-2') + '<span><b>Ativar som</b>Clique para ouvir a música da mesa</span>';
      document.body.append(b);
    }
    b.hidden = false;
  }

  // ---------- Comandos do mestre ----------
  const D = (a) => S().dispatch(a);
  A.play = function (channel, name) {
    const prev = S().state.audio[channel];
    D({ type: 'audio.set', channel, play: { name, size: A.sizes[name] || 0, pos: 0, at: Date.now(), playing: true, loop: prev ? prev.loop !== false : true } });
    A.preload([name]);
  };
  A.toggle = function (channel) {
    const p = S().state.audio[channel];
    if (!p) return;
    if (p.playing) D({ type: 'audio.set', channel, play: Object.assign({}, p, { playing: false, pos: currentPos(channel, p), at: Date.now() }) });
    else D({ type: 'audio.set', channel, play: Object.assign({}, p, { playing: true, at: Date.now() }) });
  };
  A.stop = (channel) => D({ type: 'audio.set', channel, play: null });
  A.setLoop = function (channel, loop) {
    const p = S().state.audio[channel];
    if (p) D({ type: 'audio.set', channel, play: Object.assign({}, p, { loop, pos: currentPos(channel, p), at: Date.now() }) });
  };
  A.setVolume = (channel, vol) => D({ type: 'audio.vol', channel, vol });
  // Prévia local do volume enquanto arrasta o controle (sem mandar pela rede a cada pixel)
  A.previewVolume = function (channel, vol) {
    if (channel === 'sfx') return;
    const c = A.ch[channel];
    if (c && !c.el.paused) { clearInterval(c.el._fade); c.el.volume = vol * duck(channel); }
  };
  // stopAfter (s, opcional): o efeito para sozinho depois desse tempo (Plano 27)
  A.playSfx = function (name, opts = {}) {
    const fx = S().state.audio.sfx, stopAfter = Number(opts.stopAfter) > 0 ? Number(opts.stopAfter) : null;
    D({ type: 'audio.sfx', sfx: { name, size: A.sizes[name] || 0, n: ((fx && fx.n) || 0) + 1, at: Date.now(), stopAfter } });
    A.preload([name]);
  };
  function currentPos(channel, p) {
    const c = A.ch[channel];
    if (c && c.name === p.name && isFinite(c.el.currentTime)) return c.el.currentTime;
    return A.position(p);
  }
  // Cena ativada: toca a trilha dela (se tiver)
  A.onSceneActivated = function (sc) {
    if (!sc || S().role === 'player') return;
    const st = S().state.audio;
    if (sc.music && (!st.music || st.music.name !== sc.music)) A.play('music', sc.music);
    if (sc.ambient && (!st.ambient || st.ambient.name !== sc.ambient)) A.play('ambient', sc.ambient);
  };

  A.init = function () {
    S().on(() => A.sync());
    if (S().role !== 'player') A.restore();
    A.sync();
  };

  App.Audio = A;
})(window.App);
