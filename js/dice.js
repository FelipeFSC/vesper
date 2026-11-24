'use strict';
/*
 * Rolador de dados.
 * Suporta: 2d6+3, d20, 4d6kh3 (mantém maiores), 2d20kl1 (menor), 4d6dl1 (descarta menor),
 * 1d6! (explosivo), d% (d100), 4dF (fudge), parênteses, * e /, [comentários],
 * e variáveis da ficha: @forca, @pv, @pv_max ...
 * Vários resultados em uma ação: "Ataque: 1d20+@forca | Dano: 1d8+@forca"
 */
(function (App) {
  /*
   * Plano 69: dados 3D. Cada rolagem anota os dados que caíram ({f: faces, v: valor, drop: descartado}).
   * A mensagem do chat criada logo em seguida (no mesmo instante) leva a lista (Store: msg.dice) e cada tela
   * mostra os dados caindo com esses números. Fora disso a lista se apaga sozinha.
   */
  let pending = [], clearTimer = 0, muted = 0;
  function note(f, rolls) {
    if (muted) return;
    for (const r of rolls) pending.push(r.drop ? { f, v: r.v, drop: true } : { f, v: r.v });
    if (!clearTimer) clearTimer = setTimeout(() => { pending = []; clearTimer = 0; }, 0);
  }
  function take() { const out = pending; pending = []; return out; }
  // Plano 70: algum desses dados tem modelo 3D? (aí o resultado espera os dados pararem)
  const SHOW3D = new Set([4, 6, 8, 10, 12, 20, 100]);
  const showable = (dice) => Array.isArray(dice) && dice.some((d) => d && SHOW3D.has(Number(d.f)));
  const quiet = (fn) => { muted++; try { return fn(); } finally { muted--; } };
  function rnd(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] % n) + 1;
  }

  function substitute(formula, vars) {
    return String(formula).replace(/@\{?([\p{L}0-9_]+)\}?/gu, (m, k) => {
      const v = vars ? vars[App.U.slug(k)] : undefined;
      const n = Number(v);
      return v == null || v === '' || !Number.isFinite(n) ? '0' : '(' + n + ')';
    });
  }

  function evaluate(src) {
    let i = 0, crit = false, fumble = false;
    const groups = []; // Plano 79: cada grupo de dados (n×d faces, modificador, valores na ordem em que caíram, descartados, soma)
    const nat = []; // valores naturais dos d20 mantidos (para crítico/falha)
    const err = (m) => { throw new Error(m || 'Fórmula inválida perto de "' + src.slice(i) + '"'); };
    const peek = () => src[i];
    const num = () => {
      const s = i;
      while (i < src.length && /[0-9.]/.test(src[i])) i++;
      return s === i ? null : parseFloat(src.slice(s, i));
    };

    function expr() {
      let v = term();
      while (peek() === '+' || peek() === '-') {
        const op = src[i++]; const r = term();
        v = { val: op === '+' ? v.val + r.val : v.val - r.val, txt: v.txt + ' ' + op + ' ' + r.txt };
      }
      return v;
    }
    function term() {
      let v = factor();
      while (peek() === '*' || peek() === '/') {
        const op = src[i++]; const r = factor();
        v = op === '/'
          ? { val: r.val === 0 ? 0 : Math.floor(v.val / r.val), txt: v.txt + ' / ' + r.txt }
          : { val: v.val * r.val, txt: v.txt + ' × ' + r.txt };
      }
      return v;
    }
    function factor() {
      if (peek() === '-') { i++; const f = factor(); return { val: -f.val, txt: '-' + f.txt }; }
      if (peek() === '+') { i++; return factor(); }
      return primary();
    }
    function primary() {
      if (peek() === '(') {
        i++; const v = expr();
        if (peek() !== ')') err('Falta fechar parênteses');
        i++;
        // (@nivel)d6: a quantidade de dados vem de uma conta ou de um atributo
        if (peek() === 'd') { i++; return dice(v.val); }
        return { val: v.val, txt: '(' + v.txt + ')' };
      }
      const n = num();
      if (peek() === 'd') { i++; return dice(n == null ? 1 : n); }
      if (n == null) err();
      return { val: n, txt: String(n) };
    }
    function dice(count) {
      let sides;
      if (peek() === '%') { i++; sides = 100; }
      else if (peek() === 'f') { i++; sides = 'F'; }
      else { sides = num(); if (!sides || sides < 1) err('Dado sem número de faces'); sides = Math.floor(sides); }
      count = Math.floor(count);
      if (count < 1) return { val: 0, txt: '0' };
      if (count > 500) err('Dados demais (máx. 500)');

      let sel = null, explode = false, mod = '';
      for (;;) {
        if (src.startsWith('kh', i)) { i += 2; sel = { mode: 'keep', hi: true, n: num() ?? 1 }; mod += 'kh' + sel.n; }
        else if (src.startsWith('kl', i)) { i += 2; sel = { mode: 'keep', hi: false, n: num() ?? 1 }; mod += 'kl' + sel.n; }
        else if (src.startsWith('dh', i)) { i += 2; sel = { mode: 'drop', hi: true, n: num() ?? 1 }; mod += 'dh' + sel.n; }
        else if (src.startsWith('dl', i)) { i += 2; sel = { mode: 'drop', hi: false, n: num() ?? 1 }; mod += 'dl' + sel.n; }
        else if (peek() === 'k') { i++; sel = { mode: 'keep', hi: true, n: num() ?? 1 }; mod += 'k' + sel.n; }
        else if (peek() === '!') { i++; explode = true; mod += '!'; }
        else break;
      }

      const rolls = [];
      for (let c = 0; c < count; c++) {
        if (sides === 'F') { rolls.push({ v: rnd(3) - 2 }); continue; }
        let v = rnd(sides);
        rolls.push({ v });
        let guard = 0;
        while (explode && sides > 1 && v === sides && guard++ < 50) { v = rnd(sides); rolls.push({ v }); }
      }
      if (sel) {
        const idx = rolls.map((r, k) => k).sort((a, b) => (sel.hi ? rolls[b].v - rolls[a].v : rolls[a].v - rolls[b].v));
        const chosen = new Set(idx.slice(0, sel.n));
        rolls.forEach((r, k) => { r.drop = sel.mode === 'keep' ? !chosen.has(k) : chosen.has(k); });
      }

      note(sides, rolls);
      let total = 0;
      for (const r of rolls) if (!r.drop) total += r.v;
      groups.push({ n: count, s: sides, m: mod, v: rolls.map((r) => r.v), x: rolls.map((r, k) => (r.drop ? k : -1)).filter((k) => k >= 0), sum: total });
      if (sides === 20) for (const r of rolls) if (!r.drop) { nat.push(r.v); if (r.v === 20) crit = true; if (r.v === 1) fumble = true; }

      const faces = rolls.map((r) => {
        let cls = 'die';
        if (sides !== 'F' && r.v === sides) cls += ' max';
        if (sides !== 'F' && r.v === 1) cls += ' min';
        if (r.drop) cls += ' drop';
        const shown = sides === 'F' ? (r.v > 0 ? '+' : r.v < 0 ? '−' : '0') : r.v;
        return `<span class="${cls}">${shown}</span>`;
      }).join('');
      return { val: total, txt: `${count}d${sides}${mod} ${faces}` };
    }

    const r = expr();
    if (i < src.length) err();
    const total = Math.round(r.val * 100) / 100;
    // Plano 79: conta simples (só somas de dados e números) = dados + bônus fixo; com × / ou dado subtraído fica só o texto
    const plain = r.txt.replace(/<[^>]*>/g, ''), simple = !/[×/]/.test(plain) && !/-\s*\d+d[\d%f]/i.test(plain);
    const res = { total, detail: r.txt, crit, fumble, nat };
    if (simple) { res.groups = groups; res.flat = Math.round((total - groups.reduce((t, g) => t + g.sum, 0)) * 100) / 100; }
    return res;
  }

  // Crítico: dobra a quantidade de dados ("2d6+3" -> "4d6+3"). Use após substitute().
  // "(@nivel)d6" -> "(2*((4)))d6": acha o parêntese que abre o grupo antes do "d"
  function doubleDice(formula) {
    const src = String(formula);
    let out = '', last = 0;
    const re = /d(\d+|%|f)/gi;
    let m;
    while ((m = re.exec(src))) {
      let j = m.index, count;
      if (src[j - 1] === ')') {
        let depth = 0, k = j - 1;
        for (; k >= 0; k--) { if (src[k] === ')') depth++; else if (src[k] === '(' && --depth === 0) break; }
        if (k < last) continue;
        count = '(2*' + src.slice(k, j) + ')'; j = k;
      } else {
        let k = j;
        while (k > last && /\d/.test(src[k - 1])) k--;
        if (k > 0 && /[a-z]/i.test(src[k - 1])) continue; // parte de uma palavra, não é dado
        count = String(Number(src.slice(k, j) || 1) * 2); j = k;
      }
      out += src.slice(last, j) + count + m[0];
      last = m.index + m[0].length;
    }
    return out + src.slice(last);
  }

  function roll(formula, vars) {
    const sub = substitute(formula, vars);
    const src = sub.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '').toLowerCase();
    if (!src) throw new Error('Fórmula vazia');
    const res = evaluate(src);
    res.formula = String(formula).trim();
    return res;
  }

  function rollMulti(text, vars) {
    const parts = String(text).split('|').map((p) => p.trim()).filter(Boolean).map((p) => {
      const m = p.match(/^([^:]+):(.+)$/);
      return Object.assign({ label: m ? m[1].trim() : '' }, roll(m ? m[2] : p, vars));
    });
    if (!parts.length) throw new Error('Fórmula vazia');
    return parts;
  }

  function isFormula(text) {
    try { quiet(() => roll(text, {})); return /d/i.test(text); } catch { return false; }
  }

  // Confere uma fórmula sem rolar para valer: devolve o problema em texto, ou null se está tudo certo.
  // known = nomes de @variáveis que existem (atributos e barras da ficha, @valor…)
  function check(text, known) {
    const parts = String(text || '').split('|').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    const have = new Set((known || []).map((k) => App.U.slug(k)));
    const missing = [];
    for (const p of parts) {
      const m = p.match(/^([^:]+):(.+)$/), f = m ? m[2] : p;
      String(f).replace(/@\{?([\p{L}0-9_]+)\}?/gu, (x, k) => { const s = App.U.slug(k); if (!have.has(s) && !missing.includes(s)) missing.push(s); return x; });
      const vars = {}; for (const k of have) vars[k] = 1;
      try { quiet(() => roll(f, vars)); } catch (e) { return (m ? m[1].trim() + ': ' : '') + e.message; }
    }
    if (missing.length) return missing.map((k) => '@' + k).join(', ') + (missing.length > 1 ? ' não existem' : ' não existe') + ' nesta ficha (vale 0).';
    return null;
  }

  /*
   * Plano 79 (movido no Plano 82): os dados em pecinhas, na ordem em que caíram, um grupo por linha com a soma.
   * A rolagem traz groups ({ n, s, m, v, x, sum }) e flat (bônus fixo); rolagens antigas só têm o texto (detail).
   * html.line(r): os dados, o bônus e o total; html.block(d): um grupo por parte (tipo de dano). Devolvem HTML (texto).
   */
  const esc = (x) => App.U.esc(x);
  const cleanDetail = (s) => String(s || '').replace(/<(?!\/?span(\s+class="[a-z ]*")?>)[^>]*>/gi, '');
  const dieChip = (g, v, k) => {
    const fudge = g.s === 'F', s = Number(g.s);
    let cls = 'die';
    if (!fudge && v === s) cls += ' max';
    if (!fudge && v === 1) cls += ' min';
    if ((g.x || []).includes(k)) cls += ' drop';
    return `<span class="${cls}">${esc(fudge ? (v > 0 ? '+' : v < 0 ? '−' : '0') : v)}</span>`;
  };
  const signedHtml = (n) => (n < 0 ? '− ' : '+ ') + esc(Math.abs(n));
  const hasGroups = (r) => !!(r && Array.isArray(r.groups) && r.groups.length);
  const groupsLabel = (r) => r.groups.map((g) => esc(g.n + 'd' + g.s + (g.m || ''))).join(' + ') + (r.flat ? ' ' + signedHtml(Number(r.flat)) : '') + (r.mult ? ' ×' + esc(r.mult) : '');
  const diceChips = (r) => r.groups.map((g) => (Array.isArray(g.v) ? g.v : []).map((v, k) => dieChip(g, Number(v), k)).join('')).join('<span class="dsep">+</span>')
    + (r.flat ? `<span class="dflat">${signedHtml(Number(r.flat))}</span>` : '') + (r.mult ? `<span class="dflat">×${esc(r.mult)}</span>` : '');
  // Uma linha: os dados, o bônus e o total (teste do alvo, ataque)
  function rollLine(r) {
    if (!hasGroups(r)) return `<div class="roll-detail">${esc(r.formula)} → ${cleanDetail(r.detail)}</div>`;
    return `<div class="dline">${diceChips(r)}<span class="dtot">= <b>${esc(r.total)}</b></span></div>`;
  }
  // Bloco do dano (ou cura): um grupo por parte (tipo de dano), com a fórmula, o tipo, a soma e os dados
  function diceBlock(d) {
    const parts = Array.isArray(d.parts) && d.parts.length && d.parts.every((p) => hasGroups(p) || p.detail) ? d.parts : [Object.assign({}, d, { type: d.parts && d.parts.length === 1 ? d.parts[0].type : '' })];
    return '<div class="dblock">' + parts.map((p) => {
      const type = p.type ? (TYPE_PT[p.type] || p.type) : '';
      const label = hasGroups(p) ? groupsLabel(p) : esc(p.formula || '');
      const body = hasGroups(p) ? diceChips(p) : cleanDetail(p.detail);
      return `<div class="dgroup"><div class="dg-head"><span>${label}${type ? ` <span class="dg-type">${esc(type)}</span>` : ''}</span><b>${esc(p.total)}</b></div><div class="dg-dice">${body}</div></div>`;
    }).join('') + '</div>';
  }


  const html = { line: rollLine, block: diceBlock, chips: (r) => (hasGroups(r) ? diceChips(r) : cleanDetail(r && r.detail)), hasGroups, cleanDetail };

  // Tipos de dano em português (Plano 53; usado também no chat, Plano 79)
  const TYPE_PT = { acid: 'ácido', bludgeoning: 'concussão', cold: 'frio', fire: 'fogo', force: 'energia', lightning: 'elétrico', necrotic: 'necrótico', piercing: 'perfurante', poison: 'veneno', psychic: 'psíquico', radiant: 'radiante', slashing: 'cortante', thunder: 'trovejante' };
  App.Dice = { roll, rollMulti, substitute, isFormula, doubleDice, check, take, quiet, showable, TYPE_PT, html };
})(window.App);
