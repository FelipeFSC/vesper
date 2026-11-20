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
  // =============== Plano 40: unidade da mesa (e a de cada pessoa) ===============
  // Tudo fica guardado em metros, quilos, km/h e litros; cada tela mostra na unidade de quem vê,
  // pela tabela prática: 1 pé = 0,3 m · 1 milha = 1,5 km · 1 mph = 1,5 km/h · 1 libra = 0,5 kg · 1 onça fluida = 30 ml · 1 galão = 4 L
  const MINE = 'vesper-unidades-minhas';
  Units.CATS = [
    ['dist', 'Distância', [['metric', 'Metros / Quilômetros'], ['imperial', 'Pés / Milhas']]],
    ['weight', 'Peso', [['metric', 'Quilogramas'], ['imperial', 'Libras']]],
    ['speed', 'Velocidade', [['metric', 'Quilômetros por hora'], ['imperial', 'Milhas por hora']]],
    ['liquid', 'Líquidos', [['metric', 'Litros / Mililitros'], ['imperial', 'Galões / Onças']]],
  ];
  Units.DEFAULT = { dist: 'metric', weight: 'metric', speed: 'metric', liquid: 'metric' };
  const ok = (v) => v === 'metric' || v === 'imperial';
  // da mesa (o mestre escolhe)
  Units.table = () => Object.assign({}, Units.DEFAULT, ((App.Store && App.Store.state && App.Store.state.rules) || {}).units);
  // desta pessoa: null = igual à mesa
  Units.mine = function () {
    if (Units._mine !== undefined) return Units._mine;
    try { const o = JSON.parse(localStorage.getItem(MINE) || 'null'); Units._mine = o && typeof o === 'object' ? o : null; } catch { Units._mine = null; }
    return Units._mine;
  };
  Units.setMine = function (o) {
    Units._mine = o ? Object.fromEntries(Units.CATS.map(([k]) => [k, ok(o[k]) ? o[k] : Units.table()[k]])) : null;
    try { if (Units._mine) localStorage.setItem(MINE, JSON.stringify(Units._mine)); else localStorage.removeItem(MINE); } catch { /* vale só agora */ }
  };
  Units.sys = function (cat) { const m = Units.mine(); return m && ok(m[cat]) ? m[cat] : (ok(Units.table()[cat]) ? Units.table()[cat] : 'metric'); };
  const plural = (v, one, many) => num(v) + ' ' + (Math.abs(v - 1) < 1e-9 ? one : many);
  // distância guardada em metros → texto na unidade de quem vê
  Units.dist = function (m) {
    m = Number(m) || 0;
    if (Units.sys('dist') === 'imperial') return Math.abs(m) >= 1500 ? plural(m / 1500, 'milha', 'milhas') : plural(m / 0.3, 'pé', 'pés');
    return Math.abs(m) >= 1000 ? num(m / 1000) + ' km' : num(m) + ' m';
  };
  // número nos campos (sempre em m ou em pés, para digitar) e a volta para metros
  Units.distUnit = () => (Units.sys('dist') === 'imperial' ? 'pés' : 'm');
  Units.distIn = (m) => Math.round((Number(m) || 0) / (Units.sys('dist') === 'imperial' ? 0.3 : 1) * 100) / 100;
  Units.distOut = (v) => (Number(String(v).replace(',', '.')) || 0) * (Units.sys('dist') === 'imperial' ? 0.3 : 1);
  Units.weight = (kg) => (Units.sys('weight') === 'imperial' ? plural((Number(kg) || 0) / 0.5, 'libra', 'libras') : num(Number(kg) || 0) + ' kg');
  Units.speed = (kmh) => (Units.sys('speed') === 'imperial' ? num((Number(kmh) || 0) / 1.5) + ' mph' : num(Number(kmh) || 0) + ' km/h');
  Units.liquid = function (l) {
    l = Number(l) || 0;
    if (Units.sys('liquid') === 'imperial') return l >= 4 ? plural(l / 4, 'galão', 'galões') : plural(l * 1000 / 30, 'onça', 'onças');
    return l >= 1 ? num(l) + ' L' : num(l * 1000) + ' ml';
  };
  // unidade escrita nas cenas antigas → metros por unidade (0 = não reconhecida)
  Units.legacyFactor = function (u) {
    const k = String(u == null ? 'm' : u).trim().toLowerCase().replace(/\.$/, '');
    if (['', 'm', 'metro', 'metros'].includes(k)) return 1;
    if (['pé', 'pe', 'pés', 'pes', 'ft', 'feet', 'foot'].includes(k)) return 0.3;
    if (['km', 'quilômetro', 'quilômetros', 'quilometro', 'quilometros'].includes(k)) return 1000;
    if (['mi', 'milha', 'milhas', 'mile', 'miles'].includes(k)) return 1500;
    return 0;
  };
  App.Units = Units;
})(window.App);
