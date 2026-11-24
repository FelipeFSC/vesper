'use strict';
window.App = window.App || {};

(function (App) {
  const U = {};

  U.PALETTE = ['#7c5cc4', '#b5683b', '#3f8f86', '#8a4a5a', '#5b7fbf', '#a08a3c', '#5f8f4e', '#9b5fa8', '#6b7280', '#b04848'];

  U.uid = (p = '') => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 8);
  U.clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.randColor = () => U.PALETTE[Math.floor(Math.random() * U.PALETTE.length)];

  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.safeColor = (c, d = '#9aa1ac') => (/^#[0-9a-f]{6}$/i.test(String(c)) ? c : d);
  U.slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  U.debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  // Hash rápido de 64 bits (2x FNV) — usado para deduplicar imagens.
  U.hash = (str) => {
    let h1 = 0x811c9dc5, h2 = 0x01000193 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 ^ c, 2246822507);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  };

  U.hexA = (hex, a) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return `rgba(255,255,255,${a})`;
    return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
  };

  // Construtor de DOM: h('div', {class:'x', onclick: fn}, filhos...)
  U.h = function (tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value') el.value = v;
        else if (k in el && typeof v !== 'string') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    if (tag === 'select' && attrs && attrs.value != null) el.value = attrs.value;
    return el;
  };

  // action = {label, run}: botão dentro do aviso (ex.: "Ir para lá")
  U.toast = (msg, type = 'info', ms = 3200, action) => {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type + (action ? ' has-act' : '');
    el.textContent = msg;
    if (action) {
      const b = document.createElement('button');
      b.className = 'toast-act';
      b.textContent = action.label;
      b.onclick = () => { try { action.run(); } finally { el.remove(); } };
      el.append(b);
    }
    box.append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  };

  U.download = (name, text, mime = 'application/json') => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  U.pickFile = (accept) => new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept || '';
    i.onchange = () => res(i.files[0] || null);
    i.click();
  });

  U.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.append(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    U.toast('Copiado!');
  };

  U.fmtTime = (ts) => {
    const d = new Date(ts || Date.now());
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };
  /*
   * Plano 83: cor da ficha no chat. Clareia a cor (mistura com branco, k = 40%) mantendo o tom, e continua
   * clareando até ficar legível no fundo escuro (luminância mínima). Cor inválida = null.
   */
  U.chatColor = (c, k = 0.4) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(c || ''));
    if (!m) return null;
    const n = parseInt(m[1], 16), rgb = [n >> 16, (n >> 8) & 255, n & 255];
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (x) => 0.2126 * lin(x[0]) + 0.7152 * lin(x[1]) + 0.0722 * lin(x[2]);
    const mix = (q) => rgb.map((v) => Math.round(v + (255 - v) * q));
    let q = k, out = mix(q);
    while (lum(out) < 0.3 && q < 0.95) { q += 0.03; out = mix(q); }
    return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  U.fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB');

  /*
   * Menu flutuante (Plano 28; vira peça comum no Plano 81): o do botão direito da mesa e o ⋯ das listas de fichas.
   * U.menu(x, y, título, itens); U.closeMenu(). Itens: {icon, label, kbd, danger, disabled, on, title, sub: [...], run()} | '-' | {head}
   */
  const ic = (n) => { const t = document.createElement('template'); t.innerHTML = App.Icons.svg(n); return t.content.firstChild; };
  const h = (...x) => U.h(...x);
  let menu = null;
  function close() {
    if (!menu) return;
    menu.remove(); menu = null;
    window.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('keydown', onEsc, true);
    window.removeEventListener('wheel', close, true);
  }
  const onOutside = (e) => { if (menu && !menu.contains(e.target)) close(); };
  const onEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };

  // items: [{icon, label, kbd, danger, disabled, on (marcado), sub: [...], run()} | '-' (separador)]
  function render(x, y, title, items) {
    close();
    const build = (list) => h('div', { class: 'cm-list' }, list.filter(Boolean).map((it) => {
      if (it === '-') return h('div', { class: 'cm-sep' });
      if (it.head) return h('div', { class: 'cm-head' }, it.head);
      const row = h('button', { class: 'cm-item' + (it.danger ? ' danger' : '') + (it.on ? ' on' : ''), disabled: !!it.disabled, title: it.title || '' },
        it.icon ? ic(it.icon) : h('span', { class: 'cm-ico' }), h('span', { class: 'grow' }, it.label),
        it.kbd ? h('kbd', {}, it.kbd) : null, it.sub ? ic('chevron-right') : null);
      if (it.sub) {
        const sub = build(it.sub);
        sub.classList.add('cm-sub');
        const wrap = h('div', { class: 'cm-has-sub' }, row, sub);
        row.addEventListener('click', (e) => { e.preventDefault(); wrap.classList.toggle('open'); place(sub, true); });
        wrap.addEventListener('pointerenter', () => { wrap.classList.add('open'); place(sub, true); });
        wrap.addEventListener('pointerleave', () => wrap.classList.remove('open'));
        return wrap;
      }
      row.addEventListener('click', () => { close(); try { it.run && it.run(); } catch (err) { U.toast(err.message, 'error'); } });
      return row;
    }));
    menu = h('div', { class: 'ctx-menu', role: 'menu' }, title ? h('div', { class: 'cm-title' }, title) : null, build(items));
    document.body.append(menu);
    // Nunca sai da tela
    const r = menu.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    menu.style.left = Math.max(6, Math.min(x, W - r.width - 6)) + 'px';
    menu.style.top = Math.max(6, Math.min(y, H - r.height - 6)) + 'px';
    setTimeout(() => {
      window.addEventListener('pointerdown', onOutside, true);
      window.addEventListener('keydown', onEsc, true);
      window.addEventListener('wheel', close, true);
    }, 0);
  }
  // Submenu do lado que cabe
  function place(sub) {
    sub.classList.remove('left', 'up');
    const r = sub.getBoundingClientRect();
    if (r.right > window.innerWidth - 4) sub.classList.add('left');
    if (r.bottom > window.innerHeight - 4) sub.classList.add('up');
  }
  U.menu = render;
  U.closeMenu = close;

  App.U = U;
})(window.App);
