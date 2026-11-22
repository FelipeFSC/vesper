'use strict';
import { ASSET_ID, PROTOCOL } from '../src/domain/protocol.ts';
import { AssetTransfer } from '../src/services/asset-transfer.ts';
import { assetIds, encodeAssets, joinAsset, setAsset } from '../src/services/image-assets.ts';
/*
 * Rede P2P com PeerJS (WebRTC).
 * O mestre é o host: recebe as ações dos jogadores, valida, aplica e retransmite.
 * Mensagens:
 *   jogador -> mestre: hello, action, asset, ping, ruler, audio-req
 *   mestre -> jogador: welcome (estado completo + imagens), state, action, asset, presence, ping, ruler,
 *                      audio-chunk (faixa em pedaços), audio-preload, audio-missing
 */
(function (App) {
  const { U } = App;
  const PREFIX = 'mesarpg-v1-';
  const N = { peer: null, conns: new Map(), hostConn: null, code: null, everConnected: false, retry: 0 };

  const status = (kind, text) => App.UI && App.UI.setNetStatus(kind, text);
  const S = () => App.Store;
  const hasMedia = (id) => Object.hasOwn(S().assets, id);
  let manifestQueued = false;
  let clientVersion = null, clientMedia = null;
  let requested = null, requestTimer = null;
  let waiting = [], missing = new Set();
  const clearClientMedia = () => {
    clientVersion = null;
    clientMedia?.close();
    clientMedia = null;
    waiting = [];
    missing = new Set();
    requested = null;
    clearTimeout(requestTimer);
  };

  function fetchNextMedia() {
    if (requested || clientVersion !== PROTOCOL || !N.hostConn?.open) return;
    while (waiting.length) {
      const id = waiting.shift();
      if (hasMedia(id) || missing.has(id)) continue;
      requested = id;
      N.hostConn.send({ t: 'asset-request', v: PROTOCOL, ids: [id] });
      requestTimer = setTimeout(() => {
        missing.add(id);
        requested = null;
        fetchNextMedia();
      }, 65_000);
      break;
    }
  }

  function storeClientMedia(id, data) {
    if (data) {
      setAsset(S().assets, id, data);
      App.Images.invalidate(id);
      S().emit('asset');
    } else missing.add(id);
    if (requested === id) {
      clearTimeout(requestTimer);
      requested = null;
      fetchNextMedia();
    }
  }

  function manifest(entry, state) {
    const scene = state.scenes[state.playerScenes[entry.playerId] || state.activeSceneId];
    const local = scene ? [...assetIds(scene)] : [];
    if (scene) for (const token of Object.values(scene.tokens)) {
      const image = state.actors[token.actorId]?.img;
      if (image) local.push(image);
    }
    const ids = [...new Set([...local, ...assetIds(state)])].filter(hasMedia);
    const previous = entry.allowed;
    entry.allowed = new Set(ids);
    entry.media?.retainOutgoing(entry.allowed);
    if (entry.version === PROTOCOL) entry.conn.send({ t: 'asset-manifest', v: PROTOCOL, ids });
    else if (previous) for (const id of ids) if (!previous.has(id)) enqueueLegacy(entry, async () => {
      if (!entry.allowed?.has(id) || !hasMedia(id)) return;
      const asset = S().assets[id], data = await joinAsset(asset);
      if (entry.conn.open && entry.allowed?.has(id) && S().assets[id] === asset) entry.conn.send({ t: 'asset', id, data });
    });
    return ids;
  }

  function enqueueLegacy(entry, send) {
    const pending = (entry.sending || Promise.resolve()).then(() => {
      if (entry.conn.open) return send();
    }).catch((error) => console.warn('Sincronização com cliente legado', error));
    entry.sending = pending;
    void pending.then(() => { if (entry.sending === pending) entry.sending = null; });
  }

  function sendTo(entry, msg) {
    if (!entry.sending) { entry.conn.send(msg); return; }
    const snapshot = structuredClone(msg);
    enqueueLegacy(entry, () => entry.conn.send(snapshot));
  }

  function refreshManifests() {
    if (manifestQueued || S().role !== 'gm' || !N.conns.size) return;
    manifestQueued = true;
    queueMicrotask(() => {
      manifestQueued = false;
      const state = N.playerState();
      if (!state) return;
      for (const entry of N.conns.values()) if (entry.playerId && entry.conn.open) {
        try { manifest(entry, state); } catch (error) { console.warn(error); }
      }
    });
  }

  function welcome(entry, state) {
    if (entry.version === PROTOCOL) {
      entry.conn.send({ t: 'welcome', v: PROTOCOL, you: entry.playerId, state, now: Date.now() });
      manifest(entry, state);
    } else {
      entry.allowed = null;
      const assets = Object.fromEntries(manifest(entry, state).map((id) => [id, S().assets[id]]));
      const snapshot = structuredClone(state);
      enqueueLegacy(entry, async () => {
        const encoded = { ...(await encodeAssets(assets)) }; // BinaryPack exige objeto comum.
        if (entry.conn.open) entry.conn.send({ t: 'welcome', you: entry.playerId, state: snapshot, assets: encoded, now: Date.now() });
      });
    }
  }

  function receiveUpload(id, data) {
    if (!data || hasMedia(id) || 'img_' + U.hash(data) !== id) return;
    setAsset(S().assets, id, data);
    S().emit('asset');
    App.Storage.autosave();
    refreshManifests();
  }

  N.genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };
  N.inviteLink = () => {
    const u = new URL(location.href);
    u.search = '?mesa=' + N.code;
    u.hash = '';
    return u.toString();
  };
  N.isOnline = () => !!(N.peer && !N.peer.destroyed && N.peer.open);

  // ================= MESTRE =================
  N.host = async function (code, options) {
    const { Peer } = await import('peerjs');
    return new Promise((resolve, reject) => {
      if (N.peer) { try { N.peer.destroy(); } catch { /* */ } }
      N.code = code;
      status('connecting', 'Abrindo mesa…');
      const peer = new Peer(PREFIX + code, options);
      N.peer = peer;
      let opened = false;

      peer.on('open', () => { opened = true; status('host', 'Mestre · ' + code); resolve(code); });
      peer.on('connection', (conn) => {
        conn.on('open', () => { if (!N.conns.has(conn.peer)) N.conns.set(conn.peer, { conn, playerId: null }); });
        conn.on('data', (msg) => onHostData(conn, msg));
        conn.on('close', () => dropConn(conn));
        conn.on('error', () => dropConn(conn));
      });
      peer.on('disconnected', () => {
        if (peer.destroyed) return;
        status('connecting', 'Reconectando ao servidor…');
        setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 2000);
      });
      peer.on('error', (e) => {
        console.warn('PeerJS', e.type, e);
        if (!opened) { try { peer.destroy(); } catch { /* */ } reject(e); return; }
        if (e.type === 'network' || e.type === 'server-error') status('connecting', 'Problema de rede…');
      });
    });
  };

  function onHostData(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    let entry = N.conns.get(conn.peer);
    if (!entry) { entry = { conn, playerId: null }; N.conns.set(conn.peer, entry); }

    if (msg.t === 'hello') {
      if (entry.playerId) return;
      const version = msg.v ?? 1;
      if (version !== 1 && version !== PROTOCOL) {
        conn.send({ t: 'protocol-error', v: PROTOCOL });
        setTimeout(() => conn.close(), 250);
        return;
      }
      const pid = String(msg.playerId || '').slice(0, 40);
      if (!pid) return;
      // Mesma pessoa reconectando: derruba a conexão antiga
      for (const [peerId, e] of N.conns) {
        if (e !== entry && e.playerId === pid) { try { e.conn.close(); } catch { /* */ } N.conns.delete(peerId); }
      }
      entry.playerId = pid;
      entry.version = version;
      entry.name = String(msg.name || 'Jogador').slice(0, 40);
      if (version === PROTOCOL) entry.media = new AssetTransfer(conn, U.hash, receiveUpload);
      S().commit({ type: 'player.upsert', id: pid, name: entry.name, color: msg.color, by: S().me.id });
      welcome(entry, N.playerState());
      broadcastPresence();
      U.toast(entry.name + ' entrou na mesa');
      return;
    }
    if (!entry.playerId) return;

    switch (msg.t) {
      case 'action':
        S().remoteAction(msg.a, entry.playerId);
        break;
      case 'asset':
        if (entry.version === 1 && ASSET_ID.test(msg.id) && typeof msg.data === 'string'
          && msg.data.length <= 24 * 1024 * 1024 && msg.data.startsWith('data:image/')) receiveUpload(msg.id, msg.data);
        break;
      case 'asset-request':
        if (entry.media && msg.v === PROTOCOL && Array.isArray(msg.ids)) for (const id of msg.ids.slice(0, 32)) {
          if (typeof id === 'string' && entry.allowed?.has(id)) entry.media.queue(id, S().assets[id]);
        }
        break;
      case 'asset-chunk':
      case 'asset-missing':
        entry.media?.accept(msg);
        break;
      case 'ping':
        N.broadcast(msg);
        App.Board.addPing(msg);
        break;
      case 'ruler': {
        // Régua ou arraste de um jogador (Plano 30): o mestre carimba quem é e repassa aos outros
        if (msg.kind !== 'ruler' && msg.kind !== 'drag') break;
        const m = { t: 'ruler', kind: msg.kind, sceneId: String(msg.sceneId || ''), from: entry.playerId, name: entry.name, color: msg.color,
          tokenId: msg.tokenId ? String(msg.tokenId) : null, pts: Array.isArray(msg.pts) ? msg.pts.slice(0, 66) : [], done: !!msg.done, clear: !!msg.clear };
        N.broadcast(m, conn.peer);
        App.Board.onRuler(m);
        break;
      }
      case 'audio-req':
        // Jogador pediu uma faixa: o mestre envia o arquivo em pedaços
        if (App.Audio && typeof msg.name === 'string') App.Audio.serve(conn, msg.name);
        break;
    }
  }

  function dropConn(conn) {
    const e = N.conns.get(conn.peer);
    if (!e || e.conn !== conn) return;
    e.media?.close();
    N.conns.delete(conn.peer);
    if (e.playerId) { U.toast((e.name || 'Jogador') + ' saiu'); broadcastPresence(); }
  }

  function broadcastPresence() {
    const online = [S().me.id];
    for (const e of N.conns.values()) if (e.playerId) online.push(e.playerId);
    S().online = online;
    N.broadcast({ t: 'presence', online });
    S().emit('presence');
  }

  const publicProp = (prop) => prop?.hurt ? { ...prop, hurt: null } : prop;
  function publicScene(scene) {
    let out = scene.notes?.length ? { ...scene, notes: [] } : scene;
    if (scene.props?.some((prop) => prop.hurt)) out = { ...out, props: scene.props.map(publicProp) };
    return out;
  }

  // Notas do mestre (Plano 18) não saem daqui: os jogadores recebem o estado sem elas.
  N.playerState = function () {
    const st = S().state;
    if (!st) return st;
    const scenes = {};
    for (const [id, scene] of Object.entries(st.scenes)) scenes[id] = publicScene(scene);
    return Object.assign({}, st, { scenes });
  };
  function forPlayers(msg) {
    if (!msg || msg.t !== 'action' || !msg.a) return msg;
    const a = msg.a;
    if (/^note\./.test(a.type)) return null;
    if (a.type === 'scene.add' && a.scene) return { t: 'action', a: { ...a, scene: publicScene(a.scene) } };
    if (a.type === 'scene.update' && a.patch) return { t: 'action', a: { ...a, patch: publicScene(a.patch) } };
    if (a.type === 'prop.add' && a.prop) return { t: 'action', a: { ...a, prop: publicProp(a.prop) } };
    if (a.type === 'prop.update' && a.patch && 'hurt' in a.patch) {
      const patch = Object.assign({}, a.patch);
      delete patch.hurt;
      return Object.keys(patch).length ? { t: 'action', a: Object.assign({}, a, { patch }) } : null;
    }
    if (a.type === 'undo.apply') {
      const ops = (a.ops || []).filter((o) => o.key !== 'notes').map((op) => {
        if (op.key !== 'props') return op;
        if (op.keys && Object.hasOwn(op.keys, 'hurt')) {
          const keys = { ...op.keys };
          delete keys.hurt;
          return { ...op, keys };
        }
        return { ...op, set: publicProp(op.set) };
      });
      return ops.length ? { t: 'action', a: Object.assign({}, a, { ops }) } : null;
    }
    return msg;
  }
  N.broadcast = function (msg, exceptPeer) {
    if (S().role !== 'gm') return;
    msg = forPlayers(msg);
    if (!msg) return;
    if (msg.t === 'action' && /^(actor\.|scene\.|token\.(add|update)|prop\.|handout\.|undo\.)/.test(msg.a.type)) refreshManifests();
    for (const [peerId, e] of N.conns) {
      if (!e.playerId || peerId === exceptPeer || !e.conn.open) continue;
      try { sendTo(e, msg); } catch (err) { console.warn(err); }
    }
  };
  N.broadcastFull = function () {
    const state = N.playerState();
    if (!state) return;
    for (const e of N.conns.values()) {
      if (e.playerId && e.conn.open) welcome(e, state);
    }
  };
  N.sendStateTo = function (pid) {
    for (const e of N.conns.values()) if (e.playerId === pid && e.conn.open) {
      const state = N.playerState();
      sendTo(e, { t: 'state', state, now: Date.now() });
      manifest(e, state);
    }
  };

  // ================= JOGADOR =================
  N.join = async function (code, options) {
    if (N.code && N.code !== code.toUpperCase()) {
      S().assets = Object.create(null);
      App.Images.retain(new Set());
    }
    N.code = code.toUpperCase();
    status('connecting', 'Conectando…');
    let Peer;
    try { ({ Peer } = await import('peerjs')); } catch (error) {
      status('error', 'Não foi possível carregar a conexão');
      U.toast('Não foi possível carregar a conexão. Tente entrar novamente.', 'error');
      return;
    }
    N.kicked = false;
    const peer = new Peer(options);
    N.peer = peer;
    peer.on('open', () => connect());
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 2000); });
    peer.on('error', (e) => {
      console.warn('PeerJS', e.type, e);
      if (e.type === 'peer-unavailable') {
        if (!N.everConnected) { status('error', 'Mesa não encontrada'); U.toast('Mesa não encontrada. Confira o código e se o mestre está online.', 'error', 6000); }
        scheduleReconnect();
      } else if (e.type === 'network' || e.type === 'server-error') {
        status('connecting', 'Problema de rede…');
      }
    });
  };

  function connect() {
    if (!N.peer || N.peer.destroyed || !N.peer.open) return;
    const conn = N.peer.connect(PREFIX + N.code, { reliable: true });
    N.hostConn = conn;
    conn.on('open', () => {
      N.retry = 0;
      const me = S().me;
      conn.send({ t: 'hello', v: PROTOCOL, playerId: me.id, name: me.name, color: me.color });
    });
    conn.on('data', (msg) => { if (N.hostConn === conn) onClientData(msg); });
    conn.on('close', () => {
      if (N.hostConn !== conn) return;
      N.hostConn = null;
      clearClientMedia();
      scheduleReconnect();
    });
  }

  let reconnectTimer = null;
  function scheduleReconnect() {
    if (reconnectTimer || N.kicked) return;
    N.retry++;
    status('connecting', 'Reconectando… (' + N.retry + ')');
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, Math.min(10000, 1500 * N.retry));
  }

  function onClientData(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'welcome':
        if (msg.v != null && msg.v !== PROTOCOL && msg.v !== 1) { incompatible(); return; }
        clientVersion = msg.v ?? 1;
        if (clientVersion === PROTOCOL && !clientMedia) clientMedia = new AssetTransfer(N.hostConn, U.hash, storeClientMedia);
        N.everConnected = true;
        status('player', 'Jogador · ' + N.code);
        if (App.Anim) App.Anim.setClock(msg.now);
        S().setState(S().migrate(msg.state), msg.assets || {});
        break;
      case 'state':
        if (App.Anim) App.Anim.setClock(msg.now);
        S().setState(S().migrate(msg.state));
        break;
      case 'action':
        if (S().state) S().applyRemote(msg.a);
        break;
      case 'asset':
        if (clientVersion === 1 && ASSET_ID.test(msg.id) && typeof msg.data === 'string') storeClientMedia(msg.id, msg.data);
        break;
      case 'asset-manifest':
        if (clientVersion === PROTOCOL && msg.v === PROTOCOL && Array.isArray(msg.ids)) {
          const available = new Set(msg.ids.filter((id) => typeof id === 'string' && ASSET_ID.test(id)));
          if (requested && !available.has(requested)) {
            clientMedia?.discardIncoming(requested);
            requested = null;
            clearTimeout(requestTimer);
          }
          waiting = [...available];
          fetchNextMedia();
        }
        break;
      case 'asset-chunk':
      case 'asset-missing':
        if (msg.id === requested) clientMedia?.accept(msg);
        break;
      case 'protocol-error':
        incompatible();
        break;
      case 'presence':
        S().online = msg.online || [];
        S().emit('presence');
        break;
      case 'ping':
        App.Board.addPing(msg);
        break;
      case 'clock':
        if (App.Anim) App.Anim.setClock(msg.now);
        break;
      case 'ruler':
        if (msg.from !== S().me.id) App.Board.onRuler(msg);
        break;
      case 'kicked':
        // o mestre tirou este jogador da mesa: não tenta reconectar sozinho
        N.kicked = true;
        status('error', 'Fora da mesa');
        U.toast('O mestre tirou você da mesa. Para voltar, entre de novo com o código.', 'error', 8000);
        break;
      case 'audio-chunk':
      case 'audio-preload':
      case 'audio-missing':
        if (App.Audio) App.Audio.onMessage(msg);
        break;
    }
  }

  function incompatible() {
    N.kicked = true;
    N.hostConn?.close();
    status('error', 'Versão da mesa incompatível');
    U.toast('A mesa usa outra versão do protocolo. Atualize o Vésper e tente novamente.', 'error', 8000);
  }

  // ================= comum =================
  N.send = function (msg) {
    if (S().role !== 'player') return false;
    if (!N.hostConn || !N.hostConn.open) return false;
    N.hostConn.send(msg);
    return true;
  };
  // Envia a todos os jogadores conectados (mestre)
  N.eachPlayer = function (fn) {
    for (const e of N.conns.values()) if (e.playerId && e.conn.open) fn(e.conn, e.playerId);
  };
  N.sendAsset = function (id, data) {
    if (S().role === 'player') {
      if (clientVersion === PROTOCOL) clientMedia?.queue(id, data);
      else {
        const conn = N.hostConn;
        void joinAsset(data).then((encoded) => {
          if (conn && N.hostConn === conn) N.send({ t: 'asset', id, data: encoded });
        }).catch((error) => console.warn('Não foi possível enviar a imagem', error));
      }
    } else refreshManifests();
  };
  N.ping = function (p) {
    if (S().role === 'player') N.send(p);
    else { N.broadcast(p); App.Board.addPing(p); }
  };

  // Plano 37: o mestre tira um jogador da mesa. Ele é avisado e desconectado (pode entrar de novo com o código)
  N.kick = function (pid) {
    for (const [peerId, e] of N.conns) {
      if (e.playerId !== pid) continue;
      e.media?.close();
      try { e.conn.send({ t: 'kicked' }); } catch { /* */ }
      setTimeout(() => { try { e.conn.close(); } catch { /* */ } }, 300);
      N.conns.delete(peerId);
    }
    broadcastPresence();
  };
  // Régua e arraste para os outros (Plano 30)
  N.shareRuler = function (msg) {
    if (S().role === 'player') N.send(msg);
    else N.broadcast(msg);
  };

  App.Net = N;
})(window.App);
