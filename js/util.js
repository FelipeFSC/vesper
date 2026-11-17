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

  U.toast = (msg, type = 'info', ms = 3200) => {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
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
  U.fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB');

  App.U = U;
})(window.App);
