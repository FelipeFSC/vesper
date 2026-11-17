'use strict';
/*
 * Rede P2P com PeerJS (WebRTC).
 * O mestre é o host: recebe as ações dos jogadores, valida, aplica e retransmite.
 * Mensagens:
 *   jogador -> mestre: hello, action, asset, ping, audio-req
 *   mestre -> jogador: welcome (estado completo + imagens), state, action, asset, presence, ping,
 *                      audio-chunk (faixa em pedaços), audio-preload, audio-missing
 */
(function (App) {
  const { U } = App;
  const PREFIX = 'mesarpg-v1-';
  const N = { peer: null, conns: new Map(), hostConn: null, code: null, everConnected: false, retry: 0 };

  const status = (kind, text) => App.UI && App.UI.setNetStatus(kind, text);
  const S = () => App.Store;

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
  N.host = function (code) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') return reject(new Error('PeerJS não carregou (sem internet?)'));
      if (N.peer) { try { N.peer.destroy(); } catch { /* */ } }
      N.code = code;
      status('connecting', 'Abrindo mesa…');
      const peer = new Peer(PREFIX + code);
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
      const pid = String(msg.playerId || '').slice(0, 40);
      if (!pid) return;
      // Mesma pessoa reconectando: derruba a conexão antiga
      for (const [peerId, e] of N.conns) {
        if (e !== entry && e.playerId === pid) { try { e.conn.close(); } catch { /* */ } N.conns.delete(peerId); }
      }
      entry.playerId = pid;
      entry.name = String(msg.name || 'Jogador').slice(0, 40);
      S().commit({ type: 'player.upsert', id: pid, name: entry.name, color: msg.color, by: S().me.id });
      conn.send({ t: 'welcome', you: pid, state: S().state, assets: S().assets });
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
        if (/^img_[0-9a-f]{16}$/.test(msg.id) && typeof msg.data === 'string' && msg.data.startsWith('data:image/')) {
          S().assets[msg.id] = msg.data;
          N.broadcast({ t: 'asset', id: msg.id, data: msg.data }, conn.peer);
          App.Board.requestRender();
          App.Storage.autosave();
        }
        break;
      case 'ping':
        N.broadcast(msg);
        App.Board.addPing(msg);
        break;
      case 'audio-req':
        // Jogador pediu uma faixa: o mestre envia o arquivo em pedaços
        if (App.Audio && typeof msg.name === 'string') App.Audio.serve(conn, msg.name);
        break;
    }
  }

  function dropConn(conn) {
    const e = N.conns.get(conn.peer);
    if (!e) return;
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

  N.broadcast = function (msg, exceptPeer) {
    if (S().role !== 'gm') return;
    for (const [peerId, e] of N.conns) {
      if (!e.playerId || peerId === exceptPeer || !e.conn.open) continue;
      try { e.conn.send(msg); } catch (err) { console.warn(err); }
    }
  };
  N.broadcastFull = function () {
    for (const e of N.conns.values()) {
      if (e.playerId && e.conn.open) e.conn.send({ t: 'welcome', you: e.playerId, state: S().state, assets: S().assets });
    }
  };
  N.sendStateTo = function (pid) {
    for (const e of N.conns.values()) if (e.playerId === pid && e.conn.open) e.conn.send({ t: 'state', state: S().state });
  };

  // ================= JOGADOR =================
  N.join = function (code) {
    N.code = code.toUpperCase();
    if (typeof Peer === 'undefined') { status('error', 'PeerJS não carregou'); U.toast('Sem internet? A biblioteca PeerJS não carregou.', 'error'); return; }
    status('connecting', 'Conectando…');
    const peer = new Peer();
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
      conn.send({ t: 'hello', playerId: me.id, name: me.name, color: me.color });
      status('player', 'Jogador · ' + N.code);
    });
    conn.on('data', onClientData);
    conn.on('close', () => { if (N.hostConn === conn) { N.hostConn = null; scheduleReconnect(); } });
  }

  let reconnectTimer = null;
  function scheduleReconnect() {
    if (reconnectTimer) return;
    N.retry++;
    status('connecting', 'Reconectando… (' + N.retry + ')');
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, Math.min(10000, 1500 * N.retry));
  }

  function onClientData(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'welcome':
        N.everConnected = true;
        S().setState(S().migrate(msg.state), msg.assets || {});
        break;
      case 'state':
        S().setState(S().migrate(msg.state));
        break;
      case 'action':
        if (S().state) S().applyRemote(msg.a);
        break;
      case 'asset':
        S().assets[msg.id] = msg.data;
        App.Images.invalidate(msg.id);
        App.Board.requestRender();
        S().emit('asset');
        break;
      case 'presence':
        S().online = msg.online || [];
        S().emit('presence');
        break;
      case 'ping':
        App.Board.addPing(msg);
        break;
      case 'audio-chunk':
      case 'audio-preload':
      case 'audio-missing':
        if (App.Audio) App.Audio.onMessage(msg);
        break;
    }
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
    if (S().role === 'player') N.send({ t: 'asset', id, data });
    else N.broadcast({ t: 'asset', id, data });
  };
  N.ping = function (p) {
    if (S().role === 'player') N.send(p);
    else { N.broadcast(p); App.Board.addPing(p); }
  };

  App.Net = N;
})(window.App);
