// Plano 40 · Unidade de medida da mesa e a de cada pessoa: conversão, régua, nome da cena, escala, alturas, voo, migração
// #shot: painel Mesa aberto na seção Unidade de medida, com "as minhas" em pés
window.addEventListener('error', (e) => { (window.__err = window.__err || []).push(String(e.message)); });
window.addEventListener('load', () => setTimeout(async () => {
  const log = [], W = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (q) => document.querySelector(q);
  const _p = log.push.bind(log); log.push = (...a) => { const r = _p(...a); document.body.setAttribute('data-log', JSON.stringify(log)); return r; };
  try {
    setInterval(() => document.querySelectorAll('#tut-panel, #tut-spot').forEach((e) => e.remove()), 50);
    const S = App.Store, B = App.Board, UI = App.UI, Un = App.Units, sc = () => S.currentScene(), g = sc().grid;
    Un.setMine(null);
    const setTable = (o) => S.dispatch({ type: 'campaign.update', patch: { rules: { units: Object.assign({}, Un.table(), o) } } });
    if (location.hash === '#shot') { UI.showTab('table'); await W(100); Un.setMine({ dist: 'imperial' }); UI.refresh(); await W(50); $('#units-sec').scrollIntoView(); log.push('foto'); return; }
    // tabela prática
    log.push(`padrão: ${JSON.stringify(Un.table())} · 1,5 m = ${Un.dist(1.5)} · 1500 m = ${Un.dist(1500)} · 2 kg = ${Un.weight(2)} · 3 km/h = ${Un.speed(3)} · 0,5 L = ${Un.liquid(0.5)}`);
    setTable({ dist: 'imperial', weight: 'imperial', speed: 'imperial', liquid: 'imperial' });
    log.push(`mesa imperial: 1,5 m = ${Un.dist(1.5)} · 0,3 m = ${Un.dist(0.3)} · 1,5 km = ${Un.dist(1500)} · 3 km = ${Un.dist(3000)} · 0,5 kg = ${Un.weight(0.5)} · 2 kg = ${Un.weight(2)} · 1,5 km/h = ${Un.speed(1.5)} · 30 ml = ${Un.liquid(0.03)} · 4 L = ${Un.liquid(4)} · 0,5 L = ${Un.liquid(0.5)}`);
    // régua e nome da cena
    UI.refresh(); await W(50);
    log.push('nome da cena (mesa em pés): ' + $('#scene-label span').textContent);
    // jogador/mestre com a própria unidade
    Un.setMine({ dist: 'metric' }); UI.refresh(); await W(50);
    log.push(`"minhas" em metros numa mesa em pés: ${Un.dist(1.5)} · nome da cena: ${$('#scene-label span').textContent} · mesa continua ${Un.table().dist}`);
    Un.setMine(null); setTable(App.Units.DEFAULT); UI.refresh(); await W(50);
    log.push('de volta à mesa (métrico): ' + $('#scene-label span').textContent);
    // painel Mesa: o mestre escolhe a da mesa; "na minha tela"
    UI.showTab('table'); await W(100);
    const sel = (k) => $(`#p-table [data-unit="${k}"]`);
    log.push(`painel: seção = ${!!$('#units-sec')} · quadros da mesa = ${document.querySelectorAll('#p-table [data-unit^="mesa-"]').length} · "usar as da mesa" marcado = ${sel('same').checked}`);
    sel('mesa-dist').value = 'imperial'; sel('mesa-dist').dispatchEvent(new Event('change')); await W(80);
    log.push('mestre trocou a distância da mesa: ' + Un.table().dist + ' · 1,5 m = ' + Un.dist(1.5));
    sel('same').click(); await W(80);
    log.push(`desmarcou "usar as da mesa": quadros meus = ${document.querySelectorAll('#p-table [data-unit^="minha-"]').length}`);
    sel('minha-dist').value = 'metric'; sel('minha-dist').dispatchEvent(new Event('change')); await W(80);
    log.push(`escolheu metros só para si: ${Un.dist(1.5)} · mesa ${Un.table().dist} · guardado no navegador = ${!!localStorage.getItem('vesper-unidades-minhas')}`);
    sel('same').click(); await W(80);
    log.push('voltou a usar as da mesa: ' + Un.dist(1.5) + ' · guardado = ' + !!localStorage.getItem('vesper-unidades-minhas'));
    // escala da cena em pés: digitar 5 pés = 1,5 m guardado
    UI.setMode('edit'); UI.leftTab = 'scenes'; UI.refresh(); await W(100); document.querySelector('button[title="Configurar cena"]').click(); await W(100);
    const cd = [...document.querySelectorAll('label')].find((l) => /Cada quadrado vale/.test(l.textContent));
    log.push('Configurar cena: ' + (cd ? cd.firstChild.textContent + ' = ' + cd.querySelector('input').value : 'campo não achado') + ' · campo Unidade sumiu = ' + ![...document.querySelectorAll('label')].some((l) => /^Unidade$/.test(l.firstChild && l.firstChild.textContent)));
    document.querySelectorAll('.modal-back').forEach((x) => x.remove());
    // voo e altura dos muros
    log.push(`voo 3 m: "${'↑ ' + Un.dist(3)}" · campo do voo mostra ${Un.distIn(3)} ${Un.distUnit()} · digitar 10 pés guarda ${Un.distOut(10)} m`);
    setTable(App.Units.DEFAULT);
    // migração: cena antiga em pés, em "m" e em léguas
    const old = S.migrate({ name: 'antiga', scenes: {
      a: Object.assign(S.newScene(), { id: 'a', cellDist: 5, unit: 'pés' }),
      b: Object.assign(S.newScene(), { id: 'b', cellDist: 1.5, unit: 'm' }),
      c: Object.assign(S.newScene(), { id: 'c', cellDist: 2, unit: 'léguas' }) }, sceneOrder: ['a', 'b', 'c'] });
    log.push(`migração: 5 pés → ${old.scenes.a.cellDist} m · 1,5 m → ${old.scenes.b.cellDist} m · 2 léguas → ${old.scenes.c.cellDist} (${old.scenes.c.unit}) · mesa antiga com cena em pés começa em ${old.rules.units.dist}`);
    const novo = S.migrate({ name: 'nova', scenes: { b: Object.assign(S.newScene(), { id: 'b' }) }, sceneOrder: ['b'] });
    log.push('mesa só em metros: ' + novo.rules.units.dist);
    S.dispatch({ type: 'scene.add', scene: Object.assign(S.newScene(), { id: 's_imp', name: 'Importada', cellDist: 10, unit: 'ft' }) });
    log.push('cena importada em ft: ' + S.state.scenes.s_imp.cellDist + ' ' + S.state.scenes.s_imp.unit);
  } catch (e) { log.push('EXC ' + e.stack); }
  log.push('erros: ' + JSON.stringify(window.__err || []));
}, 1200));
