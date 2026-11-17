'use strict';
/*
 * Estado da mesa + reducer.
 * Toda mudança passa por dispatch(ação). O mestre (host) aplica a ação, valida as dos
 * jogadores (permit) e retransmite para todos. Os jogadores só enviam ações ao mestre.
 */
(function (App) {
  const { U } = App;

  const DEFAULT_CONDITIONS = ['Atordoado', 'Caído', 'Cego', 'Surdo', 'Envenenado', 'Amedrontado', 'Agarrado',
    'Contido', 'Invisível', 'Inconsciente', 'Paralisado', 'Concentrando', 'Abençoado', 'Sangrando', 'Lento', 'Apressado'];

  // Listas da campanha: os nomes que as fichas e as ações escolhem num select
  const DEFAULT_ATTRS = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma', 'Defesa'];
  const DEFAULT_BARS = ['PV', 'Mana'];
  const uniqNames = (list) => { const seen = new Set(), out = []; for (const n of list) { const t = String(n || '').trim(), k = U.slug(t); if (t && k && !seen.has(k)) { seen.add(k); out.push(t); } } return out; };

  function newScene(name) {
    return {
      id: U.uid('s_'), name: name || 'Nova cena', cols: 30, rows: 20, grid: 70,
      showGrid: true, gridColor: '#ffffff', gridAlpha: 0.15, bgColor: '#3a3934', bg: null,
      cellDist: 1.5, unit: 'm', measure: 'cheb',
      tokens: {}, drawings: [], fog: { enabled: false, shapes: [], v: 0 },
      // Iluminação: paredes bloqueiam luz e visão; global = ambiente claro (dia)
      walls: [], wallsV: 0, light: { enabled: false, global: true },
      // Cobertura dos muros baixos (alturas em metros, sombra em quadrados): ver Combat.coverOf
      cover: JSON.parse(JSON.stringify(App.Combat.COVER_DEFAULT)),
      // Sons presos a um ponto do mapa: {id, name, size, x, y, r (alcance em quadrados), vol, on, at}
      sounds: [],
      // Salas de som: áreas à prova de som, com música própria
      // {id, name, pts: [[x,y]…], music: {name,size}|null, at, vol, ambient: 'stop'|'muffle'|'keep'}
      rooms: [],
      // Grupos de tokens: {id, name}; cada token guarda t.group
      groups: [],
    };
  }

  function sampleActors() {
    const hero = {
      id: U.uid('ac_'), name: 'Aventureiro', kind: 'pc', img: null, color: '#7c5cc4', size: 1, owner: 'all',
      bars: [{ name: 'PV', value: 20, max: 20 }, { name: 'Mana', value: 10, max: 10 }],
      stats: [{ name: 'Força', value: 3 }, { name: 'Destreza', value: 2 }, { name: 'Constituição', value: 2 },
        { name: 'Inteligência', value: 0 }, { name: 'Sabedoria', value: 1 }, { name: 'Carisma', value: 0 }, { name: 'Defesa', value: 15 }],
      testFormula: '1d20+@valor', initFormula: '1d20+@destreza',
      actions: [
        { name: 'Espada longa', mode: 'attack', attack: '1d20+@forca', defense: 'Defesa', damage: '1d8+@forca', bar: 'PV' },
        { name: 'Arco curto', mode: 'attack', attack: '1d20+@destreza', defense: 'Defesa', damage: '1d6+@destreza', bar: 'PV', range: 16 },
        { name: 'Bola de fogo', mode: 'save', save: 'Destreza', dc: '13', damage: '8d6', onSave: 'half', bar: 'PV', cost: 3, costBar: 'Mana', range: 20, area: 2 },
        { name: 'Poção de cura', mode: 'heal', damage: '2d4+2', bar: 'PV' },
        { name: 'Teste livre', mode: 'roll', formula: '1d20' },
      ],
      notes: 'Ficha de exemplo — edite à vontade, tudo é livre.',
    };
    const goblin = {
      id: U.uid('ac_'), name: 'Goblin', kind: 'monster', img: null, color: '#5f8f4e', size: 1, owner: '',
      bars: [{ name: 'PV', value: 7, max: 7 }],
      stats: [{ name: 'Destreza', value: 2 }, { name: 'Defesa', value: 13 }],
      testFormula: '1d20+@valor', initFormula: '1d20+@destreza',
      actions: [{ name: 'Cimitarra', mode: 'attack', attack: '1d20+4', defense: 'Defesa', damage: '1d6+2', bar: 'PV' }],
      notes: 'Cada token de monstro tem PV próprio.',
    };
    return { [hero.id]: hero, [goblin.id]: goblin };
  }

  // Ações de versões antigas eram só uma fórmula ("Ataque: 1d20+@forca | Dano: 1d8+@forca").
  // Viram ações com alvo, para o botão pedir o alvo no mapa em vez de só rolar no chat.
  function upgradeAction(ac, a) {
    if (!ac.mode) ac.mode = ac.attack ? 'attack' : ac.save ? 'save' : 'roll';
    if (ac.mode !== 'roll' || !ac.formula) return;
    const parts = String(ac.formula).split('|').map((p) => p.match(/^\s*([^:]+):(.+)$/)).filter(Boolean)
      .map((m) => ({ label: m[1].trim().toLowerCase(), f: m[2].trim() }));
    const find = (re) => parts.find((p) => re.test(p.label));
    const atk = find(/^(ataque|acerto|attack|to hit)/), dmg = find(/^(dano|damage)/), heal = find(/^(cura|heal)/);
    const bar = ac.bar || ((a.bars || [])[0] || {}).name || 'PV';
    if (atk) Object.assign(ac, { mode: 'attack', attack: atk.f, defense: ac.defense || 'Defesa', damage: dmg ? dmg.f : '', bar });
    else if (heal) Object.assign(ac, { mode: 'heal', damage: heal.f, bar });
    else if (dmg) Object.assign(ac, { mode: 'damage', damage: dmg.f, bar });
  }

  // Regras da automação (configuráveis na aba Mesa)
  const DEFAULT_RULES = {
    critMode: 'dice',   // 'dice' = dobra os dados | 'double' = dobra o total | 'none'
    critHits: true,     // crítico sempre acerta
    nat1Miss: true,     // 1 natural sempre erra
    minZero: true,      // barras não ficam negativas
    actOnTurn: false,   // em combate, jogador só usa ações na própria vez
    hideNumbers: true,  // jogadores não veem Defesa/PV de quem não controlam
  };

  // Som: biblioteca (categoria por nome de arquivo), o que toca em cada canal e volumes. Só o mestre altera.
  function newAudio() {
    return { lib: {}, music: null, ambient: null, sfx: null, vol: { music: 0.6, ambient: 0.5, sfx: 0.8 } };
  }

  function newCampaign() {
    const sc = newScene('Cena inicial');
    return {
      format: 'mesarpg', version: 1, name: 'Nova campanha', gm: null,
      activeSceneId: sc.id, sceneOrder: [sc.id], scenes: { [sc.id]: sc },
      actors: sampleActors(), chat: [], players: {},
      // Jogadores separados do grupo: {idDoJogador: idDaCena}. Quem não está aqui fica na cena ativa.
      playerScenes: {},
      combat: { active: false, round: 0, turn: 0, entries: [] },
      conditions: DEFAULT_CONDITIONS.slice(),
      attrs: DEFAULT_ATTRS.slice(), barNames: DEFAULT_BARS.slice(),
      rules: Object.assign({}, DEFAULT_RULES),
      audio: newAudio(),
    };
  }

  // Completa campos que faltarem (arquivos antigos / importados)
  function migrate(st) {
    const base = newCampaign();
    st = Object.assign({ name: base.name, gm: null, scenes: {}, sceneOrder: [], actors: {}, chat: [],
      combat: base.combat, players: {}, conditions: base.conditions }, st);
    for (const id of Object.keys(st.scenes)) {
      const sc = Object.assign(newScene(), st.scenes[id]);
      sc.id = id;
      sc.fog = Object.assign({ enabled: false, shapes: [], v: 0 }, sc.fog);
      sc.walls = Array.isArray(sc.walls) ? sc.walls : [];
      sc.wallsV = sc.wallsV || 0;
      sc.light = Object.assign({ enabled: false, global: true }, sc.light);
      sc.cover = App.Combat.coverCfg(sc);
      sc.sounds = Array.isArray(sc.sounds) ? sc.sounds : [];
      sc.rooms = Array.isArray(sc.rooms) ? sc.rooms : [];
      sc.groups = Array.isArray(sc.groups) ? sc.groups : [];
      st.scenes[id] = sc;
      if (!st.sceneOrder.includes(id)) st.sceneOrder.push(id);
    }
    st.sceneOrder = st.sceneOrder.filter((id) => st.scenes[id]);
    if (!st.scenes[st.activeSceneId]) st.activeSceneId = st.sceneOrder[0] || null;
    st.playerScenes = st.playerScenes && typeof st.playerScenes === 'object' ? st.playerScenes : {};
    for (const [pid, sid] of Object.entries(st.playerScenes)) if (!st.scenes[sid] || sid === st.activeSceneId) delete st.playerScenes[pid];
    for (const a of Object.values(st.actors)) {
      a.bars = a.bars || []; a.stats = a.stats || []; a.actions = a.actions || [];
      a.testFormula = a.testFormula || '1d20+@valor'; a.initFormula = a.initFormula || '1d20';
      for (const ac of a.actions) upgradeAction(ac, a);
    }
    // Campanhas antigas: a lista nasce dos nomes que as fichas já usam
    if (!Array.isArray(st.attrs)) { const used = uniqNames(Object.values(st.actors).flatMap((a) => a.stats.map((x) => x.name))); st.attrs = used.length ? uniqNames(DEFAULT_ATTRS.filter((n) => used.some((u) => U.slug(u) === U.slug(n))).concat(used)) : DEFAULT_ATTRS.slice(); }
    if (!Array.isArray(st.barNames)) { const used = uniqNames(Object.values(st.actors).flatMap((a) => a.bars.map((x) => x.name))); st.barNames = used.length ? used : DEFAULT_BARS.slice(); }
    st.combat = Object.assign({ active: false, round: 0, turn: 0, entries: [] }, st.combat);
    pruneCombat(st);
    st.rules = Object.assign({}, DEFAULT_RULES, st.rules);
    st.audio = Object.assign(newAudio(), st.audio);
    st.audio.vol = Object.assign(newAudio().vol, st.audio.vol);
    st.audio.lib = st.audio.lib || {};
    return st;
  }

  // ---------------- Reducer ----------------
  function sceneOf(s, id) {
    const sc = s.scenes[id];
    if (!sc) throw new Error('Cena não encontrada');
    return sc;
  }
  function tok(s, a) {
    const t = sceneOf(s, a.sceneId).tokens[a.id];
    if (!t) throw new Error('Token não encontrado');
    return t;
  }
  function sysMsg(s, text) {
    s.chat.push({ id: 'sys_' + s.chat.length + '_' + U.hash(text + s.combat.round), ts: Date.now(), kind: 'system', text });
  }
  function trimChat(s) { if (s.chat.length > 300) s.chat.splice(0, s.chat.length - 300); }
  // Tira do combate quem não existe mais no mapa
  function pruneCombat(s) {
    const c = s.combat, cur = c.entries[c.turn];
    const alive = c.entries.filter((e) => entryToken(s, e));
    if (alive.length === c.entries.length) return;
    c.entries = alive;
    const i = cur ? alive.indexOf(cur) : -1;
    c.turn = i >= 0 ? i : Math.min(c.turn, alive.length - 1);
    fixTurn(s);
  }
  function fixTurn(s) {
    const c = s.combat;
    if (c.turn >= c.entries.length) c.turn = 0;
    if (c.turn < 0) c.turn = 0;
    if (!c.entries.length && c.active) { c.active = false; c.round = 0; }
  }
  function sortEntries(s) {
    const c = s.combat, cur = c.entries[c.turn];
    const v = (e) => (e.init == null ? -1e9 : e.init);
    c.entries.sort((a, b) => v(b) - v(a));
    if (cur) c.turn = c.entries.indexOf(cur);
  }
  function entryToken(s, e) { const sc = s.scenes[e.sceneId]; return sc ? sc.tokens[e.tokenId] : null; }
  // Início do turno: reduz a duração das condições do token
  function startTurn(s) {
    const e = s.combat.entries[s.combat.turn];
    const t = e && entryToken(s, e);
    if (!t || !t.conditions || !t.conditions.length) return;
    const keep = [];
    for (const c of t.conditions) {
      if (c.rounds > 0) {
        c.rounds -= 1;
        if (c.rounds === 0) { sysMsg(s, `${t.name}: "${c.name}" terminou.`); continue; }
      }
      keep.push(c);
    }
    t.conditions = keep;
  }

  const R = {
    'campaign.update': (s, a) => {
      if (a.patch.name != null) s.name = String(a.patch.name);
      if (Array.isArray(a.patch.conditions)) s.conditions = a.patch.conditions;
      if (Array.isArray(a.patch.attrs)) s.attrs = uniqNames(a.patch.attrs);
      if (Array.isArray(a.patch.barNames)) s.barNames = uniqNames(a.patch.barNames);
      if (a.patch.rules) s.rules = Object.assign({}, s.rules, a.patch.rules);
    },
    // Soma 'delta' numa barra (do token, ou da ficha se o token for vinculado / sem token)
    'bar.change': (s, a) => {
      let bars, name;
      if (a.tokenId) {
        const t = tok(s, { sceneId: a.sceneId, id: a.tokenId });
        const ac = t.actorId && s.actors[t.actorId];
        bars = t.linked && ac ? ac.bars : t.bars;
        name = t.name;
      } else {
        const ac = s.actors[a.actorId];
        if (!ac) return false;
        bars = ac.bars; name = ac.name;
      }
      const b = bars && bars[a.bar];
      if (!b) return false;
      const before = Number(b.value) || 0;
      b.value = before + Number(a.delta);
      if (a.bar === 0 && Number(b.max) > 0) {
        if (before > 0 && b.value <= 0) sysMsg(s, `${name} caiu`);
        else if (before <= 0 && b.value > 0) sysMsg(s, `${name} voltou à luta`);
      }
    },
    'chat.patch': (s, a) => {
      const m = s.chat.find((x) => x.id === a.id);
      if (!m) return false;
      Object.assign(m, a.patch);
    },
    'player.upsert': (s, a) => {
      s.players[a.id] = Object.assign({}, s.players[a.id], { name: String(a.name || 'Jogador').slice(0, 40), color: U.safeColor(a.color, '#38bdf8') });
    },

    'scene.add': (s, a) => {
      s.scenes[a.scene.id] = a.scene;
      s.sceneOrder.push(a.scene.id);
      if (!s.activeSceneId) s.activeSceneId = a.scene.id;
    },
    'scene.update': (s, a) => { Object.assign(sceneOf(s, a.id), a.patch); },
    'scene.delete': (s, a) => {
      delete s.scenes[a.id];
      s.sceneOrder = s.sceneOrder.filter((x) => x !== a.id);
      s.combat.entries = s.combat.entries.filter((e) => e.sceneId !== a.id);
      if (s.activeSceneId === a.id) s.activeSceneId = s.sceneOrder[0] || null;
      // Quem estava separado nessa cena volta para o grupo
      for (const [pid, sid] of Object.entries(s.playerScenes || {})) if (sid === a.id || sid === s.activeSceneId) delete s.playerScenes[pid];
      fixTurn(s);
    },
    // Ativar leva o grupo; quem foi separado continua onde está (a não ser que já estivesse nessa cena)
    'scene.activate': (s, a) => {
      sceneOf(s, a.id); s.activeSceneId = a.id;
      for (const [pid, sid] of Object.entries(s.playerScenes || {})) if (sid === a.id) delete s.playerScenes[pid];
    },
    // Mover jogadores para uma cena. players = quem deve ficar nesta cena.
    // Na cena do grupo, marcar alguém o traz de volta; numa cena separada, desmarcar devolve ao grupo.
    'scene.movePlayers': (s, a) => {
      sceneOf(s, a.id);
      s.playerScenes = s.playerScenes || {};
      const want = new Set(a.players || []);
      for (const pid of want) { if (a.id === s.activeSceneId) delete s.playerScenes[pid]; else s.playerScenes[pid] = a.id; }
      if (a.id !== s.activeSceneId) for (const [pid, sid] of Object.entries(s.playerScenes)) if (sid === a.id && !want.has(pid)) delete s.playerScenes[pid];
    },
    'scene.move': (s, a) => {
      const i = s.sceneOrder.indexOf(a.id), j = i + a.dir;
      if (i < 0 || j < 0 || j >= s.sceneOrder.length) return false;
      [s.sceneOrder[i], s.sceneOrder[j]] = [s.sceneOrder[j], s.sceneOrder[i]];
    },

    'token.add': (s, a) => { sceneOf(s, a.sceneId).tokens[a.token.id] = a.token; },
    'token.move': (s, a) => { const t = tok(s, a); t.x = a.x; t.y = a.y; },
    'token.update': (s, a) => { Object.assign(tok(s, a), a.patch); },
    'token.delete': (s, a) => {
      delete sceneOf(s, a.sceneId).tokens[a.id];
      const c = s.combat, idx = c.entries.findIndex((e) => e.tokenId === a.id);
      if (idx >= 0) { c.entries.splice(idx, 1); if (idx < c.turn) c.turn--; fixTurn(s); }
    },

    'drawing.add': (s, a) => { sceneOf(s, a.sceneId).drawings.push(a.drawing); },
    'drawing.delete': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.drawings = sc.drawings.filter((d) => d.id !== a.id); },
    'drawing.clear': (s, a) => { sceneOf(s, a.sceneId).drawings = []; },

    // Paredes e portas: {id, x1, y1, x2, y2, door?, open?}
    'wall.add': (s, a) => { const sc = sceneOf(s, a.sceneId); for (const w of a.walls || []) sc.walls.push(w); sc.wallsV++; },
    'wall.delete': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.walls = sc.walls.filter((w) => w.id !== a.id); sc.wallsV++; },
    'wall.update': (s, a) => {
      const sc = sceneOf(s, a.sceneId), w = sc.walls.find((x) => x.id === a.id);
      if (!w || !a.patch) return;
      if ('cover' in a.patch && ['full', 'high', 'three', 'half'].includes(a.patch.cover)) w.cover = a.patch.cover;
      sc.wallsV++;
    },
    'wall.clear': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.walls = []; sc.wallsV++; },
    'wall.door': (s, a) => {
      const sc = sceneOf(s, a.sceneId), w = sc.walls.find((x) => x.id === a.id);
      if (!w || !w.door) return false;
      w.open = !!a.open; sc.wallsV++;
    },

    // Som (o mestre calcula posição e horário; aqui só guarda)
    'audio.set': (s, a) => { s.audio[a.channel === 'ambient' ? 'ambient' : 'music'] = a.play || null; },
    'audio.vol': (s, a) => { if (!(a.channel in s.audio.vol)) return false; s.audio.vol[a.channel] = Math.max(0, Math.min(1, Number(a.vol) || 0)); },
    'audio.lib': (s, a) => { s.audio.lib[a.name] = Object.assign({}, s.audio.lib[a.name], a.patch); },
    'audio.sfx': (s, a) => { s.audio.sfx = a.sfx; },
    // Efeito tocado uma vez num ponto do mapa
    'audio.spot': (s, a) => { s.audio.spot = a.spot; },
    'sound.add': (s, a) => { sceneOf(s, a.sceneId).sounds.push(a.sound); },
    'sound.update': (s, a) => { const x = sceneOf(s, a.sceneId).sounds.find((y) => y.id === a.id); if (!x) return false; Object.assign(x, a.patch); },
    'group.add': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.groups = sc.groups || []; sc.groups.push(a.group); for (const id of a.tokens || []) if (sc.tokens[id]) sc.tokens[id].group = a.group.id; },
    'group.update': (s, a) => { const g = (sceneOf(s, a.sceneId).groups || []).find((x) => x.id === a.id); if (!g) return false; Object.assign(g, a.patch); },
    'group.delete': (s, a) => {
      const sc = sceneOf(s, a.sceneId);
      sc.groups = (sc.groups || []).filter((x) => x.id !== a.id);
      for (const t of Object.values(sc.tokens)) if (t.group === a.id) delete t.group;
    },
    // Visível / vulto / invisível para o grupo inteiro de uma vez
    'group.vis': (s, a) => {
      const sc = sceneOf(s, a.sceneId);
      for (const t of Object.values(sc.tokens)) if (t.group === a.id) { t.hidden = a.vis === 'hidden'; t.masked = a.vis === 'masked'; }
    },
    'room.add': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.rooms = sc.rooms || []; sc.rooms.push(a.room); },
    'room.update': (s, a) => { const x = (sceneOf(s, a.sceneId).rooms || []).find((y) => y.id === a.id); if (!x) return false; Object.assign(x, a.patch); },
    'room.delete': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.rooms = (sc.rooms || []).filter((y) => y.id !== a.id); },
    'sound.delete': (s, a) => { const sc = sceneOf(s, a.sceneId); sc.sounds = sc.sounds.filter((y) => y.id !== a.id); },

    'fog.add': (s, a) => { const f = sceneOf(s, a.sceneId).fog; f.shapes.push(a.shape); f.v++; },
    'fog.reset': (s, a) => { const f = sceneOf(s, a.sceneId).fog; f.shapes = a.reveal ? [{ mode: 'reveal', all: true }] : []; f.v++; },

    'actor.add': (s, a) => { s.actors[a.actor.id] = a.actor; },
    'actor.update': (s, a) => { const ac = s.actors[a.id]; if (!ac) return false; Object.assign(ac, a.patch); },
    'actor.delete': (s, a) => {
      const ac = s.actors[a.id];
      if (!ac) return false;
      for (const sc of Object.values(s.scenes)) {
        for (const t of Object.values(sc.tokens)) {
          if (t.actorId !== a.id) continue;
          if (a.tokens) { delete sc.tokens[t.id]; continue; }
          if (t.linked) t.bars = U.clone(ac.bars);
          t.linked = false; t.actorId = null; t.img = t.img || ac.img; t.color = t.color || ac.color;
        }
      }
      delete s.actors[a.id];
      pruneCombat(s);
    },

    'chat.add': (s, a) => { s.chat.push(a.msg); trimChat(s); },
    'chat.clear': (s) => { s.chat = []; },

    'combat.add': (s, a) => {
      for (const e of a.entries) if (!s.combat.entries.some((x) => x.tokenId === e.tokenId)) s.combat.entries.push(e);
    },
    'combat.remove': (s, a) => {
      const c = s.combat, idx = c.entries.findIndex((e) => e.id === a.id);
      if (idx < 0) return false;
      c.entries.splice(idx, 1);
      if (idx < c.turn) c.turn--;
      fixTurn(s);
    },
    'combat.setInit': (s, a) => {
      for (const [id, v] of Object.entries(a.values)) {
        const e = s.combat.entries.find((x) => x.id === id);
        if (e) e.init = v == null || v === '' ? null : Number(v);
      }
    },
    'combat.sort': (s) => sortEntries(s),
    'combat.start': (s) => {
      if (!s.combat.entries.length) return false;
      sortEntries(s);
      Object.assign(s.combat, { active: true, round: 1, turn: 0 });
      sysMsg(s, 'Combate iniciado · Rodada 1');
      startTurn(s);
    },
    'combat.next': (s) => {
      const c = s.combat;
      if (!c.active || !c.entries.length) return false;
      c.turn++;
      if (c.turn >= c.entries.length) { c.turn = 0; c.round++; sysMsg(s, `Rodada ${c.round}`); }
      startTurn(s);
    },
    'combat.prev': (s) => {
      const c = s.combat;
      if (!c.active) return false;
      c.turn--;
      if (c.turn < 0) { if (c.round > 1) { c.round--; c.turn = c.entries.length - 1; } else c.turn = 0; }
    },
    'combat.end': (s) => {
      Object.assign(s.combat, { active: false, round: 0, turn: 0, entries: [] });
      sysMsg(s, 'Combate encerrado.');
    },
  };

  function reduce(s, a) {
    const fn = R[a.type];
    if (!fn) { console.warn('Ação desconhecida:', a.type); return false; }
    return fn(s, a) !== false;
  }

  // ---------------- Store ----------------
  const S = {
    state: null,
    assets: {},          // id -> dataURL (webp)
    role: 'offline',     // 'offline' | 'gm' | 'player'
    me: null,            // {id, name, color}
    online: [],
    viewSceneId: null,   // cena que o mestre está vendo (pode diferir da ativa)
    listeners: new Set(),
    newScene, newCampaign, migrate, DEFAULT_CONDITIONS,

    isGM() { return this.role !== 'player'; },
    // Mestre vendo a mesa como um jogador ('*' = todos os jogadores, ou o id de um jogador).
    // A autoridade continua do mestre (isGM); só a visão muda (gmView).
    viewAs: null,
    gmView() { return this.isGM() && !this.viewAs; },
    on(fn) { this.listeners.add(fn); },
    emit(kind) { for (const fn of this.listeners) { try { fn(kind); } catch (e) { console.error(e); } } },

    setState(st, assets) {
      this.state = st;
      if (assets) Object.assign(this.assets, assets);
      this.emit('reset');
    },

    dispatch(a) {
      a.by = this.me.id;
      if (a.type === 'act.use' && this.isGM()) return this.useAction(a, null);
      if (this.isGM()) return this.commit(a);
      if (!this.state) return false;
      // Movimento é aplicado localmente na hora (o mestre corrige se recusar)
      if (a.type === 'token.move') { try { reduce(this.state, a); this.emit(a.type); } catch { /* ignora */ } }
      if (!App.Net.send({ t: 'action', a })) U.toast('Sem conexão com o mestre', 'error');
      return true;
    },

    // Mestre: aplica, transmite e salva
    commit(a) {
      try { if (!reduce(this.state, a)) return false; }
      catch (e) { console.warn(e); return false; }
      App.Net.broadcast({ t: 'action', a });
      this.emit(a.type);
      App.Storage.autosave();
      return true;
    },

    // Mestre recebendo ação de um jogador
    remoteAction(a, pid) {
      if (!a || typeof a.type !== 'string') return;
      a.by = pid;
      if (a.type === 'act.use') { this.useAction(a, pid); return; }
      let ok = false;
      try { ok = permit(this.state, a, pid); } catch (e) { console.warn(e); }
      if (!ok || !this.commit(a)) App.Net.sendStateTo(pid);
    },

    // Jogador recebendo ação já validada pelo mestre
    applyRemote(a) {
      try { reduce(this.state, a); } catch (e) { console.warn(e); }
      this.emit(a.type);
    },

    // ---------- consultas ----------
    // Em que cena está o jogador (a dele, se foi separado; senão a do grupo)
    sceneIdOf(pid) {
      const st = this.state, own = st && st.playerScenes && st.playerScenes[pid];
      return own && st.scenes[own] ? own : st && st.activeSceneId;
    },
    currentScene() {
      const st = this.state;
      if (!st) return null;
      let id;
      if (this.gmView()) id = this.viewSceneId && st.scenes[this.viewSceneId] ? this.viewSceneId : st.activeSceneId;
      else {
        // Jogador: a própria cena. Mestre "vendo como" um jogador: a cena daquele jogador.
        const pid = this.isGM() ? (this.viewAs !== '*' ? this.viewAs : null) : this.me.id;
        id = pid ? this.sceneIdOf(pid) : st.activeSceneId;
      }
      return st.scenes[id] || null;
    },
    actorOf(t) { return t && t.actorId && this.state ? this.state.actors[t.actorId] || null : null; },
    barsOf(t) { const a = this.actorOf(t); return t.linked && a ? a.bars || [] : t.bars || []; },
    ownsActor(a, pid) {
      if (!a) return false;
      if (pid == null) { if (this.gmView()) return true; pid = this.isGM() ? this.viewAs : this.me.id; }
      if (pid === '*') return !!a.owner;
      return a.owner === 'all' || a.owner === pid;
    },
    canControl(t, pid) {
      if (!t) return false;
      if (pid == null) { if (this.gmView()) return true; pid = this.isGM() ? this.viewAs : this.me.id; }
      const owner = t.owner != null ? t.owner : (this.actorOf(t) || {}).owner;
      if (pid === '*') return !!owner;
      return owner === 'all' || owner === pid;
    },
    // Trava de turno: em combate, só move na sua vez
    canMoveNow(t, pid) {
      if (pid == null && this.gmView()) return true;
      const c = this.state.combat;
      if (!c.active) return true;
      const idx = c.entries.findIndex((e) => e.tokenId === t.id);
      return idx < 0 || idx === c.turn;
    },
    vars(a, t) {
      const v = {};
      if (!a) return v;
      for (const s of a.stats || []) { const k = U.slug(s.name); if (k) v[k] = Number(s.value) || 0; }
      const bars = t ? this.barsOf(t) : a.bars || [];
      for (const b of bars) {
        const k = U.slug(b.name);
        if (k) { v[k] = Number(b.value) || 0; v[k + '_max'] = Number(b.max) || 0; }
      }
      return v;
    },
    myName() { return this.isGM() ? (this.me.name || 'Mestre') + ' (Mestre)' : this.me.name; },
    playerName(pid) {
      const st = this.state;
      if (!st) return '?';
      if (st.gm && st.gm.id === pid) return st.gm.name + ' (Mestre)';
      return (st.players[pid] || {}).name || 'Jogador';
    },
    playerColor(pid) {
      const st = this.state;
      if (st && st.gm && st.gm.id === pid) return U.safeColor(st.gm.color);
      return U.safeColor(st && st.players[pid] && st.players[pid].color);
    },

    // Valor de um atributo (ou barra) de um token pelo nome. null se não existir.
    statOf(t, name) {
      const k = U.slug(name);
      if (!k) return null;
      const a = this.actorOf(t);
      const st = a && (a.stats || []).find((x) => U.slug(x.name) === k);
      if (st && Number.isFinite(Number(st.value))) return Number(st.value);
      const b = this.barsOf(t).find((x) => U.slug(x.name) === k);
      if (b && Number.isFinite(Number(b.value))) return Number(b.value);
      return null;
    },

    /*
     * Resolve uma ação automática (roda SÓ no mestre).
     * a = { sceneId, actorId, index, attackerId, targets: [tokenIds] }
     * Rola ataque/resistência/dano, aplica nas barras e publica o resultado no chat.
     */
    useAction(a, pid) {
      const st = this.state, D = App.Dice, rules = st.rules;
      const fail = (text) => {
        if (pid) this.commit({ type: 'chat.add', msg: { id: U.uid('m_'), ts: Date.now(), kind: 'system', secret: true, playerId: pid, text: text } });
        else U.toast(text, 'error');
        return false;
      };
      const actor = st.actors[a.actorId];
      if (!actor) return fail('Ficha não encontrada.');
      const act = (actor.actions || [])[a.index];
      if (!act) return fail('Ação não encontrada.');
      if (pid && !this.ownsActor(actor, pid)) return fail('Essa ficha não é sua.');
      const sc = st.scenes[a.sceneId];
      if (!sc) return fail('Cena não encontrada.');
      const src = a.attackerId ? sc.tokens[a.attackerId] : null;
      if (src && src.actorId !== actor.id) return fail('Token de origem inválido.');
      if (pid && rules.actOnTurn && src && st.combat.active) {
        const idx = st.combat.entries.findIndex((e) => e.tokenId === src.id);
        if (idx >= 0 && idx !== st.combat.turn) return fail('Aguarde a sua vez para agir.');
      }
      const mode = act.mode || 'roll';
      let targets = (Array.isArray(a.targets) ? a.targets : []).map((id) => sc.tokens[id])
        .filter((t) => t && !(pid && t.hidden));
      // Alcance, paredes e área: o mestre confere o que o jogador mandou
      const CB = App.Combat, area = CB.areaOf(act);
      const point = a.point && Number.isFinite(Number(a.point.x)) && Number.isFinite(Number(a.point.y)) ? { x: Number(a.point.x), y: Number(a.point.y) } : null;
      if (pid && src) {
        if (area > 0) {
          if (!point) return fail('Escolha o ponto da área.');
          const pc = CB.checkPoint(sc, src, act, point);
          if (!pc.ok) return fail(`${act.name}: ${pc.why.toLowerCase()} (alcance ${CB.rangeLabel(act)}).`);
          const inside = new Set(CB.areaTargets(sc, src, act, point).map((t) => t.id));
          targets = targets.filter((t) => inside.has(t.id));
        } else {
          for (const t of targets) {
            const c = CB.check(sc, src, act, t);
            if (!c.ok) return fail(`${t.name}: ${c.why.toLowerCase()} (${act.name}: ${CB.rangeLabel(act)}).`);
          }
        }
      }
      if (!targets.length) return fail(area > 0 ? 'Ninguém dentro da área.' : 'Escolha pelo menos um alvo.');

      const vars = this.vars(actor, src);
      const findBar = (bars, name) => {
        if (!name) return bars.length ? 0 : -1;
        const k = U.slug(name);
        return bars.findIndex((b) => U.slug(b.name) === k);
      };
      const pick = (r) => ({ formula: r.formula, total: r.total, detail: r.detail });
      const applied = [];
      const msg = { id: U.uid('m_'), ts: Date.now(), kind: 'action', mode, sceneId: sc.id,
        from: src ? src.name : actor.name, fromMasked: !!(src && src.masked), srcId: src ? src.id : null, point: area > 0 ? point : null, area: area > 0 ? area : 0,
        playerId: pid || this.me.id, label: act.name, targets: [], applied };

      // Aplica a mudança na barra do alvo e registra (para poder desfazer)
      const applyTo = (t, row, delta) => {
        const bars = this.barsOf(t);
        const bi = findBar(bars, act.bar);
        if (bi < 0) { row.noBar = act.bar || 'barra'; return; }
        const b = bars[bi], before = Number(b.value) || 0, max = Number(b.max) || 0;
        let after = before + delta;
        if (delta > 0 && max > 0) after = Math.max(before, Math.min(after, max));
        if (rules.minZero && delta < 0) after = Math.max(Math.min(0, before), after);
        Object.assign(row, { amount: Math.abs(delta), bar: b.name, before, after, max });
        const ch = { sceneId: sc.id, tokenId: t.id, bar: bi, delta: after - before };
        if (ch.delta !== 0) { applied.push(ch); this.commit(Object.assign({ type: 'bar.change' }, ch)); }
      };
      const rollDamage = (crit) => {
        const f = act.damage || '0';
        if (crit && rules.critMode === 'dice') {
          const r = D.roll(D.doubleDice(D.substitute(f, vars)));
          r.formula = f + ' (crítico: dados dobrados)';
          return r;
        }
        const r = D.roll(f, vars);
        if (crit && rules.critMode === 'double') { r.total *= 2; r.formula = f + ' ×2 (crítico)'; }
        return r;
      };

      try {
        // Custo (ex.: 3 de Mana) — verifica antes de rolar qualquer coisa
        let costCh = null;
        if (Number(act.cost) > 0 && act.costBar) {
          const bars = src ? this.barsOf(src) : actor.bars;
          const bi = findBar(bars, act.costBar);
          if (bi < 0) return fail(`${actor.name} não tem a barra "${act.costBar}".`);
          if ((Number(bars[bi].value) || 0) < Number(act.cost)) return fail(`${bars[bi].name} insuficiente para ${act.name} (${bars[bi].value}/${act.cost}).`);
          costCh = src ? { sceneId: sc.id, tokenId: src.id, bar: bi, delta: -Number(act.cost) } : { actorId: actor.id, bar: bi, delta: -Number(act.cost) };
          msg.cost = { bar: bars[bi].name, amount: Number(act.cost) };
        }

        if (mode === 'attack') {
          for (const t of targets) {
            const atk = D.roll(act.attack || '1d20', vars);
            const nat = atk.nat || [];
            const critMin = Number(act.critMin) || 20;
            const crit = rules.critMode !== 'none' && nat.some((v) => v >= critMin);
            const fumble = rules.nat1Miss && nat.length > 0 && nat.every((v) => v === 1);
            // Cobertura: muro baixo entre o atacante e o alvo soma na Defesa; cobertura total = não acerta
            const cov = CB.coverFromToken(sc, src, t);
            const base = this.statOf(t, act.defense || 'Defesa');
            const def = base == null ? null : base + cov.bonus;
            const hit = cov.level === 'total' ? false : fumble ? false : crit && rules.critHits ? true : def == null ? true : atk.total >= def;
            const row = { tokenId: t.id, name: t.name, masked: !!t.masked, atk: pick(atk), def, noDef: def == null, hit, crit: crit && hit, fumble };
            if (cov.level !== 'none') row.cover = { level: cov.level, label: cov.label, bonus: cov.bonus };
            if (hit && act.damage) { const d = rollDamage(row.crit); row.dmg = pick(d); applyTo(t, row, -Math.max(0, d.total)); }
            msg.targets.push(row);
          }
        } else if (mode === 'save') {
          const dc = D.roll(String(act.dc || '10'), vars).total;
          msg.dc = dc; msg.saveStat = act.save || '';
          const d = act.damage ? rollDamage(false) : null;
          if (d) msg.dmg = pick(d);
          for (const t of targets) {
            const ta = this.actorOf(t), sv = this.statOf(t, act.save) || 0;
            const f = ((ta && ta.testFormula) || '1d20+@valor').replace(/@valor/gi, '(' + sv + ')');
            const r = D.roll(f, ta ? this.vars(ta, t) : {});
            // Cobertura vista do ponto da área (ou do lançador): bônus no teste de resistência
            const cov = area > 0 && point ? CB.coverOf(sc, point, t) : CB.coverFromToken(sc, src, t);
            if (cov.bonus) { r.total += cov.bonus; r.detail += ' + ' + cov.bonus + ' (cobertura)'; }
            const ok = cov.level === 'total' || r.total >= dc;
            const row = { tokenId: t.id, name: t.name, masked: !!t.masked, save: pick(r), success: ok };
            if (cov.level !== 'none') row.cover = { level: cov.level, label: cov.label, bonus: cov.bonus };
            if (d) {
              const amt = cov.level === 'total' ? 0 : ok ? (act.onSave === 'none' ? 0 : Math.floor(d.total / 2)) : d.total;
              applyTo(t, row, -Math.max(0, amt));
            }
            msg.targets.push(row);
          }
        } else if (mode === 'damage' || mode === 'heal') {
          const r = D.roll(act.damage || '0', vars);
          msg.dmg = pick(r);
          for (const t of targets) {
            const row = { tokenId: t.id, name: t.name, masked: !!t.masked };
            applyTo(t, row, (mode === 'heal' ? 1 : -1) * Math.max(0, r.total));
            msg.targets.push(row);
          }
        } else {
          return fail('Essa ação não usa alvo.');
        }

        if (costCh) { applied.push(costCh); this.commit(Object.assign({ type: 'bar.change' }, costCh)); }
      } catch (e) {
        return fail(`${act.name}: ${e.message}`);
      }
      this.commit({ type: 'chat.add', msg });
      return true;
    },

    // Mestre desfaz o efeito de uma ação (devolve PV, Mana…)
    undoAction(msgId) {
      const m = this.state.chat.find((x) => x.id === msgId);
      if (!m || m.undone || !this.isGM()) return;
      for (const ch of m.applied || []) {
        this.commit(Object.assign({ type: 'bar.change' }, ch, { delta: -ch.delta }));
      }
      this.commit({ type: 'chat.patch', id: msgId, patch: { undone: true } });
    },

    // Rola e manda para o chat
    rollPost(formula, opts = {}) {
      let parts;
      try { parts = App.Dice.rollMulti(formula, opts.actor ? this.vars(opts.actor, opts.token) : {}); }
      catch (e) { U.toast(e.message, 'error'); return null; }
      this.dispatch({ type: 'chat.add', msg: {
        id: U.uid('m_'), ts: Date.now(), kind: 'roll', from: opts.from || this.myName(), playerId: this.me.id,
        label: opts.label || '', parts, secret: !!opts.secret,
      } });
      return parts;
    },
  };

  // Validação das ações dos jogadores (roda só no mestre)
  function permit(s, a, pid) {
    const tokenOk = (sceneId, id) => {
      const sc = s.scenes[sceneId], t = sc && sc.tokens[id];
      return t && S.canControl(t, pid) ? t : null;
    };
    switch (a.type) {
      case 'token.move': {
        const t = tokenOk(a.sceneId, a.id);
        return !!t && S.canMoveNow(t, pid) && Number.isFinite(a.x) && Number.isFinite(a.y);
      }
      case 'token.update': {
        const t = tokenOk(a.sceneId, a.id);
        return !!t && !!a.patch && Object.keys(a.patch).every((k) => k === 'bars' || k === 'conditions'); // luz e visão: só o mestre
      }
      case 'token.add': {
        const ac = a.token && s.actors[a.token.actorId];
        if (!ac || !S.ownsActor(ac, pid) || !s.scenes[a.sceneId]) return false;
        a.token.hidden = false; delete a.token.owner;
        return true;
      }
      case 'actor.add':
        if (!a.actor || !a.actor.id) return false;
        a.actor.owner = pid;
        return true;
      case 'actor.update': {
        const ac = s.actors[a.id];
        return !!ac && S.ownsActor(ac, pid) && !!a.patch && !('owner' in a.patch) && !('kind' in a.patch) && !('id' in a.patch)
          && !('height' in a.patch) && !('coverShow' in a.patch); // altura e visibilidade atrás do muro: o mestre decide
      }
      case 'chat.add':
        if (!a.msg || a.msg.kind === 'system') return false;
        a.msg.playerId = pid;
        return true;
      case 'drawing.add':
        if (!a.drawing) return false;
        a.drawing.by = pid;
        return !!s.scenes[a.sceneId];
      case 'drawing.delete': {
        const sc = s.scenes[a.sceneId], d = sc && sc.drawings.find((x) => x.id === a.id);
        return !d || d.by === pid;
      }
      case 'wall.door': {
        // Jogadores podem abrir e fechar portas (não paredes)
        const sc = s.scenes[a.sceneId], w = sc && sc.walls.find((x) => x.id === a.id);
        return !!w && !!w.door;
      }
      case 'combat.next': {
        const c = s.combat, e = c.entries[c.turn];
        return c.active && !!e && !!tokenOk(e.sceneId, e.tokenId);
      }
      case 'combat.add':
        return Array.isArray(a.entries) && a.entries.every((e) => tokenOk(e.sceneId, e.tokenId));
      case 'combat.setInit':
        return Object.keys(a.values || {}).every((id) => {
          const e = s.combat.entries.find((x) => x.id === id);
          return e && tokenOk(e.sceneId, e.tokenId);
        });
      default:
        return false; // todo o resto é exclusivo do mestre
    }
  }

  App.Store = S;
})(window.App);
