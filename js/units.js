'use strict';
/*
 * Conversor de unidades (Plano 25): pés, milhas, libras… → metros, km, kg, litros, pela tabela prática
 * usada nos livros em português (1 pé = 0,3 m; 5 pés = 1,5 m). Opcional: quem chama decide se converte.
 *   App.Units.toBR(texto)  → texto com as medidas convertidas
 *   App.Units.mode()       → 'orig' | 'br' (preferência deste navegador)
 */
(function (App) {
  const KEY = 'vesper-unidades';
  const num = (v) => {
    const r = Math.round(v * 10) / 10;
    return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const n = (s) => Number(String(s).replace(/,/g, ''));
  // [expressão, fator, unidade]; a ordem importa (milhas por hora antes de milhas, "5-foot" antes de "foot")
  const RULES = [
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)(?:miles? per hour|mph)\b/gi, 1.5, 'km/h'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)miles?\b/gi, 1.5, 'km'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)(?:fluid ounces?|fl\.? oz\.?)/gi, 30, 'ml'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)gallons?\b/gi, 4, 'L'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)quarts?\b/gi, 1, 'L'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)pints?\b/gi, 0.5, 'L'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)(?:pounds?|lbs?\.?)(?![a-z])/gi, 0.5, 'kg'],
    [/(\d[\d,]*(?:\.\d+)?)(\s*|-)(?:feet|foot|ft\.?)(?![a-z])/gi, 0.3, 'm'],
  ];
  function toBR(text) {
    let s = String(text == null ? '' : text);
    // Alcances "80/320 ft." → "24/96 m"
    // "ft." que também fecha a frase: o ponto fica
    const dot = (m, at, all) => (/\.$/.test(m) && (at + m.length >= all.length || /^\s+[A-Z{]/.test(all.slice(at + m.length))) ? '.' : '');
    s = s.replace(/(\d[\d,]*)\/(\d[\d,]*)\s*(?:feet|foot|ft\.?)(?![a-z])/gi, (m, a, b, at, all) => `${num(n(a) * 0.3)}/${num(n(b) * 0.3)} m${dot(m, at, all)}`);
    for (const [re, k, unit] of RULES) s = s.replace(re, (m, v, sep, at, all) => `${num(n(v) * k)}${sep === '-' ? '-' : ' '}${unit}${dot(m, at, all)}`);
    return s;
  }
  const Units = {
    toBR,
    mode() { try { return localStorage.getItem(KEY) === 'br' ? 'br' : 'orig'; } catch { return 'orig'; } },
    setMode(m) { try { localStorage.setItem(KEY, m === 'br' ? 'br' : 'orig'); } catch { /* sem armazenamento: vale só agora */ } Units._mem = m; },
    // Converte só se a preferência for Brasil
    show(text) { return (Units._mem || Units.mode()) === 'br' ? toBR(text) : String(text == null ? '' : text); },
  };
  App.Units = Units;
})(window.App);
