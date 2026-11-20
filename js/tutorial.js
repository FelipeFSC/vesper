'use strict';
/*
 * Tutorial interativo (index.html?tutorial).
 * Roda a mesa de verdade com uma campanha de demonstração e um guia que destaca onde clicar
 * e espera você executar cada passo. Nada é salvo.
 *
 * Para adicionar passos: inclua objetos em STEPS:
 *   { ch, title, body, task?, spot?, done?, enter?, auto? }
 *   - ch:    nome do capítulo (passos seguidos com o mesmo ch formam um capítulo)
 *   - body:  texto explicativo (HTML)
 *   - task:  o que a pessoa precisa fazer (aparece como "Sua vez")
 *   - spot:  função que retorna {x,y,w,h} da área a destacar (use tokRect / el / union)
 *   - done:  função que retorna true quando a tarefa foi feita
 *   - enter: função chamada ao entrar no passo (preparar o cenário)
 *   - auto:  false = não avança sozinho ao concluir
 */
(function (App) {
  const { U } = App;
  const h = U.h;
  const S = () => App.Store;
  const B = () => App.Board;
  const T = { i: 0, ids: {}, base: {}, doneAt: 0, panel: null, spot: null, min: false };

  // ================= campanha de demonstração =================
  T.demoState = function () {
    const st = S().newCampaign();
    st.name = 'Tutorial';
    const sc = st.scenes[st.activeSceneId];
    Object.assign(sc, { name: 'Caverna do Goblin', cols: 16, rows: 10, bgColor: '#231f1c' });
    const g = sc.grid;
    sc.drawings.push(
      { id: 'd_floor', type: 'rect', x1: g, y1: g, x2: 15 * g, y2: 9 * g, color: '#6b5a48', width: 10, fill: 0.35 },
      { id: 'd_wall', type: 'line', x1: 7 * g, y1: g, x2: 7 * g, y2: 3 * g, color: '#6b5a48', width: 10, fill: 0 });
    const [hero, gob] = Object.values(st.actors);
    hero.name = 'Lyra';
    gob.bars = [{ name: 'PV', value: 15, max: 15 }];
    const mk = (actor, name, cx, cy, linked) => {
      const t = { id: U.uid('t_'), actorId: actor.id, name, size: 1, x: cx * g, y: cy * g, z: 1, linked,
        bars: linked ? null : U.clone(actor.bars), conditions: [], hidden: false };
      sc.tokens[t.id] = t;
      return t.id;
    };
    T.ids = {
      hero: mk(hero, 'Lyra', 3, 5, true), g1: mk(gob, 'Goblin 1', 10, 4, false), g2: mk(gob, 'Goblin 2', 11, 6, false),
      heroActor: hero.id, gobActor: gob.id,
    };
    st.chat.push({ id: 'sys_tut', ts: Date.now(), kind: 'system', text: 'Bem-vindo ao tutorial. Siga o painel no canto da tela.' });
    st.gm = { id: S().me.id, name: S().me.name, color: S().me.color };
    return st;
  };

  // ================= ajudantes =================
  const scene = () => S().currentScene();
  const heroActor = () => S().state.actors[T.ids.heroActor];
  const heroTok = () => { const s = scene(); return s && s.tokens[T.ids.hero]; };
  const select = (key) => { B().selected = T.ids[key]; B().requestRender(); };
  const toRect = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });

  // Área de um token na tela
  const tokRect = (key) => () => {
    const s = scene(), t = s && s.tokens[T.ids[key]];
    if (!t) return null;
    const r = B().tokenScreenRect(t, s), c = B().canvas.getBoundingClientRect();
    return { x: c.left + r.x, y: c.top + r.y, w: r.w, h: r.h };
  };
  // Elemento da interface (por seletor CSS e, opcionalmente, pelo texto)
  const el = (css, text, last) => () => {
    const list = [...document.querySelectorAll(css)].filter((e) => e.getClientRects().length && (!text || e.textContent.includes(text)));
    const e = last ? list[list.length - 1] : list[0];
    return e ? toRect(e.getBoundingClientRect()) : null;
  };
  const union = (...fns) => () => {
    const rs = fns.map((f) => f()).filter(Boolean);
    if (!rs.length) return null;
    const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
    return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
  };
  // Mensagens de ação criadas desde que o passo começou
  const newActionMsgs = (label) => S().state.chat.slice(T.base.chat).filter((m) => m.kind === 'action' && (!label || m.label === label));
  const lastActionMsg = () => S().state.chat.slice().reverse().find((m) => m.kind === 'action');
  const k = (x) => `<kbd>${x}</kbd>`;

  // ================= roteiro =================
  const STEPS = [
    // ---------- 1. Primeiros passos ----------
    { ch: 'Primeiros passos', title: 'Bem-vindo ao Vésper',
      body: `Este tutorial usa a <b>mesa de verdade</b>, com uma cena de exemplo: a <b>Lyra</b> (sua personagem) contra <b>dois goblins</b>.
        <p>O guia vai <span class="tut-hl">destacar</span> onde clicar e espera você fazer cada passo. Pode mexer à vontade: <b>nada aqui é salvo</b>, e sua campanha real não é tocada.</p>
        <p>Use o menu de capítulos aqui em cima para pular direto para o que quiser aprender.</p>
        <p>Para sair a qualquer momento, clique em <b>VÉSPER</b> no canto de cima à esquerda: ele volta ao menu inicial.</p>` },
    { ch: 'Primeiros passos', title: 'Movendo a câmera',
      body: `<ul><li><b>Arrastar</b> num espaço vazio do mapa move a câmera.</li>
        <li><b>Roda do mouse</b> aproxima e afasta.</li>
        <li>O botão de enquadrar, ao lado do zoom (embaixo, no meio), mostra a cena inteira.</li></ul>
        Experimente um pouco e clique em <b>Próximo</b>.`,
      spot: () => { const r = B().canvas.getBoundingClientRect(); return { x: r.left + 20, y: r.top + 20, w: r.width - 40, h: r.height - 40 }; } },
    { ch: 'Primeiros passos', title: 'Selecione sua personagem',
      body: 'Os círculos no mapa são os <b>tokens</b>. A <b>Lyra</b> é a roxa à esquerda.',
      task: 'Clique na Lyra.',
      spot: tokRect('hero'), done: () => B().selected === T.ids.hero,
      enter: () => { B().selected = null; B().fit(); } },
    { ch: 'Primeiros passos', title: 'Mova o token',
      body: 'Arraste a Lyra alguns quadrados. Ela <b>encaixa no grid</b> sozinha e uma régua mostra a distância percorrida (1 quadrado = 1,5 m).<p>Dica: com o token selecionado, as <b>setas do teclado</b> também movem.</p>',
      task: 'Arraste a Lyra para outro quadrado.',
      spot: tokRect('hero'),
      enter: () => { select('hero'); const t = heroTok(); T.base.pos = t && t.x + ',' + t.y; },
      done: () => { const t = heroTok(); return t && t.x + ',' + t.y !== T.base.pos; } },
    { ch: 'Primeiros passos', title: 'Andar por um caminho',
      body: `Para contornar uma parede ou um aliado, marque <b>pontos de passagem</b>:
        <ul><li>Segure o token com o <b>botão esquerdo</b> e arraste.</li>
        <li>Sem soltar, clique com o <b>botão direito</b> para fixar um ponto. Continue arrastando e marque quantos quiser.</li>
        <li>Cada trecho mostra a distância, e a régua mostra o <b>total do caminho</b>. Trecho que atravessa parede fica <b>vermelho</b>.</li>
        <li>Atravessando uma parede que tapa a visão (ou uma porta fechada), o jogador fica <b>sem visão</b> até voltar, e se soltar ali o token volta para onde estava. Nada de espiar o outro lado. Muros baixos só ficam vermelhos.</li>
        <li><b>Backspace</b> (ainda segurando) desfaz o último ponto. Ao soltar, o token vai para o destino e todos veem o rastro do caminho por alguns segundos.</li></ul>
        <p>A <b>Régua</b> ${k('R')} aceita os mesmos pontos, para medir sem mover ninguém. Sem segurar nada, o botão direito continua movendo a câmera.</p>`,
      spot: tokRect('hero') },
    { ch: 'Primeiros passos', title: 'O painel do token',
      body: `Com um token selecionado, o painel da direita mostra os detalhes dele:
        <ul><li><b>PV e Mana</b>: digite ${k('-5')} para dano, ${k('+3')} para cura, ${k('12')} para definir, ou até ${k('-2d6')}.</li>
        <li><b>Adicionar condição</b>: Envenenado, Caído… com duração em rodadas, que acaba sozinha.</li>
        <li><b>Ações</b> (os botões com ícone colorido): ataques e magias <b>automáticos</b>. O número em cada botão é o atalho do teclado (${k('1')}, ${k('2')}…). É aí que está a mágica, e é o próximo capítulo.</li></ul>`,
      spot: el('#token-hud'), enter: () => select('hero') },

    // ---------- 2. Ataque automático ----------
    { ch: 'Ataque automático', title: 'Escolha o ataque',
      body: 'Lutar aqui é como num videogame: você escolhe o golpe, o jogo pergunta <b>quem</b> atacar, e o resto (rolar, comparar com a defesa, descontar o PV) acontece sozinho.',
      task: 'No painel da Lyra, clique em Espada longa (ou aperte 1).',
      spot: el('#token-hud .act-btn', 'Espada'), enter: () => select('hero'),
      done: () => B().targeting && B().targeting.label.includes('Espada') },
    { ch: 'Ataque automático', title: 'Longe demais',
      body: `A área <b>roxa</b> em volta da Lyra é o <b>alcance</b> da espada: corpo a corpo, só o quadrado do lado.
        <ul><li>Quem dá para atacar <b>pulsa em vermelho</b>. Quem não dá fica <b>escuro</b>.</li>
        <li>Passe o mouse num goblin: ele diz por que não dá (<i>fora de alcance</i>, <i>atrás de parede</i>).</li>
        <li>O arco alcança 16 quadrados; uma magia pode ter alcance e área.</li></ul>
        <p>Aperte ${k('Esc')} e leve a Lyra até o lado do Goblin 1.</p>`,
      task: 'Arraste a Lyra até ficar colada no Goblin 1.',
      spot: union(tokRect('hero'), tokRect('g1')),
      enter: () => { if (!B().targeting) { select('hero'); App.UI.useAction(heroActor(), 0, heroTok()); } },
      done: () => { const s = scene(), t = heroTok(), g = s && s.tokens[T.ids.g1]; return !!(t && g && App.Combat.dist(s, t, g) <= 1); } },
    { ch: 'Ataque automático', title: 'Agora ataque',
      body: 'Escolha a Espada longa de novo. Agora o Goblin 1 <b>pulsa</b>: passe o mouse nele para ver a <b>chance de acerto</b> e clique.',
      task: 'Clique em Espada longa (ou aperte 1) e depois no Goblin 1.',
      spot: () => (B().targeting ? tokRect('g1')() : el('#token-hud .act-btn', 'Espada')()),
      enter: () => select('hero'),
      done: () => newActionMsgs('Espada longa').length > 0 },
    { ch: 'Ataque automático', title: 'O resultado aparece no mapa',
      body: `<ul><li>O número <b>sobe do goblin</b>: <b style="color:var(--danger)">−7</b> é o dano, já descontado do PV. <i>Errou</i> quando não passa da defesa, <b style="color:var(--gold)">CRÍTICO</b> no 20 natural (dados de dano dobrados).</li>
        <li>O cartão no canto resume o golpe. O mestre tem ali o botão <b>Desfazer</b>.</li>
        <li>Quer conferir os dados? Clique no cartão: o <b>chat</b> guarda o histórico com cada rolagem (<code>1d20+@forca</code> contra a <b>Defesa</b> do goblin).</li></ul>
        <p>Os <b>jogadores</b> não veem a Defesa nem o PV do monstro: só o mestre vê os números.</p>`,
      spot: () => el('#roll-feed .msg', null, true)() || tokRect('g1')() },
    { ch: 'Ataque automático', title: 'Confira o PV do goblin',
      body: 'Selecione o goblin: a barra em cima dele e o painel mostram o PV atualizado.<p>Se o ataque <b>errou</b>, o PV continua 15. Volte na Lyra e ataque de novo! Quando o PV chega a 0, o goblin <b>cai</b> e aparece um <b>X vermelho</b>.</p>',
      task: 'Clique no Goblin 1.',
      spot: tokRect('g1'), done: () => B().selected === T.ids.g1, auto: false },

    // ---------- 3. Desfazer ----------
    { ch: 'Desfazer', title: 'Errou o alvo? Desfaça',
      body: 'Toda ação automática tem o botão <b>Desfazer</b> para o mestre, no cartão do resultado e no chat. Ele <b>devolve o PV</b> (e a Mana, se a ação tiver custo) e risca o resultado.<p>Se o seu último ataque errou, não há nada para desfazer: ataque de novo com a Espada longa até acertar.</p>',
      task: 'Clique em Desfazer.',
      // Sem botão de desfazer (o ataque errou)? Destaca a Espada para atacar de novo
      spot: () => el('[data-undo]', null, true)() || el('#token-hud .act-btn', 'Espada')(),
      enter: () => { select('hero'); if (!document.querySelector('#roll-feed [data-undo]')) App.UI.showTab('chat'); T.base.undone = S().state.chat.filter((m) => m.undone).length; },
      done: () => S().state.chat.filter((m) => m.undone).length > T.base.undone },

    // ---------- 4. Magia em área ----------
    { ch: 'Magia em área', title: 'Bola de fogo',
      body: 'Agora uma magia de <b>área</b> com <b>teste de resistência</b>: quem é atingido tenta se esquivar.',
      task: 'Selecione a Lyra e clique em Bola de fogo.',
      spot: union(tokRect('hero'), el('#token-hud .act-btn', 'Bola')), enter: () => select('hero'),
      done: () => B().targeting && B().targeting.label.includes('Bola') },
    { ch: 'Magia em área', title: 'Escolha onde explode',
      body: 'A Bola de fogo alcança <b>20 quadrados</b> e explode numa <b>área de 2</b>. Passe o mouse pelo mapa: o círculo laranja segue o cursor e marca <b>quem vai ser atingido</b>. Paredes protegem quem está atrás delas.<p>Clique para lançar.</p>',
      task: 'Lance a bola de fogo pegando os dois goblins.',
      spot: union(tokRect('g1'), tokRect('g2')),
      enter: () => { if (!B().targeting) { select('hero'); App.UI.useAction(heroActor(), 2, heroTok()); } },
      done: () => newActionMsgs('Bola de fogo').length > 0 },
    { ch: 'Magia em área', title: 'Como a resistência funciona',
      body: `<ul><li><b>CD 13</b>: a dificuldade da magia.</li>
        <li>O dano (<code>8d6</code>) é rolado <b>uma vez</b> para todos.</li>
        <li><b>Cada goblin</b> rola o teste de <b>Destreza</b> da própria ficha. Quem <b>resiste</b> leva <b>metade</b>; quem <b>falha</b> leva tudo.</li>
        <li><b>−3 Mana</b>: a magia tem custo e foi descontada da Lyra sozinha. Sem Mana suficiente, o sistema não deixa lançar.</li></ul>`,
      spot: () => el('#roll-feed .msg', null, true)() || union(tokRect('g1'), tokRect('g2'))() },

    // ---------- 5. Cura ----------
    { ch: 'Cura', title: 'Poção de cura',
      body: 'A Lyra levou uma pancada (deixamos ela com 8 PV). Cura também é uma ação com alvo: pelo <b>toque</b>, em você mesma ou num aliado do lado (os inimigos ficam escuros). O sistema <b>não passa do máximo</b>.',
      task: 'Clique em Poção de cura e depois na própria Lyra.',
      spot: union(tokRect('hero'), el('#token-hud .act-btn', 'Poção')),
      enter: () => {
        const a = heroActor(), bars = U.clone(a.bars);
        bars[0].value = 8;
        S().dispatch({ type: 'actor.update', id: a.id, patch: { bars } });
        select('hero');
      },
      done: () => newActionMsgs('Poção de cura').length > 0 },

    // ---------- 6. Crie suas ações ----------
    { ch: 'Crie suas ações', title: 'Abra a ficha',
      body: 'Todas essas ações vêm da <b>ficha</b> da personagem, e você pode criar as suas.<p>A ficha tem o retrato, o nome e as barras no topo, e quatro abas: <b>Ações</b>, <b>Atributos</b>, <b>Notas</b> e <b>Configurar</b> (tipo, dono, tamanho, barras, duplicar e exportar).</p>',
      task: 'Clique em Ficha no painel da Lyra (ou dê dois cliques nela).',
      spot: el('#token-hud .btn', 'Ficha'), enter: () => select('hero'),
      done: () => App.UI.windows.has('actor:' + T.ids.heroActor) },
    { ch: 'Crie suas ações', title: 'Por dentro de uma ação',
      body: 'Na aba <b>Ações</b> cada linha mostra o resumo: <code>1d20+@forca vs Defesa → 1d8+@forca PV</code>.',
      task: 'Clique no lápis da Espada longa para ver como ela é configurada.',
      spot: el('.win .act-card .act-edit'),
      enter: () => App.UI.openActor(T.ids.heroActor, 'acoes'),
      done: () => App.UI.openActs.has(T.ids.heroActor + ':0') },
    { ch: 'Crie suas ações', title: 'Os campos de um ataque',
      body: `<ul><li><b>Tipo</b>: Ataque, Resistência, Dano direto, Cura ou Só rolar.</li>
        <li><b>Rolagem de ataque</b>: dado + atributo da ficha, como <code>1d20+@forca</code>. O seletor <b>+ atributo</b> ao lado escreve o <code>@</code> certo para você.</li>
        <li><b>Contra o atributo do alvo</b>: escolha na lista (<code>Defesa</code>, <code>CA</code>, <code>Esquiva</code>… o que seu sistema usar).</li>
        <li><b>Dano</b> e <b>Barra afetada</b>: qual barra desconta (<code>PV</code>, <code>Mana</code>…).</li>
        <li><b>Alcance</b>: em quadrados. <code>1</code> é corpo a corpo, <code>16</code> um arco, <code>0</code> sem limite. Vazio usa o padrão (arco, besta e armas de arremesso já vêm com alcance longo).</li>
        <li><b>Área</b> (magias e dano direto): raio da explosão. Com área, você escolhe o ponto em vez do alvo.</li>
        <li><b>Crítico a partir de</b>: 19 = crítico com 19 ou 20.</li>
        <li><b>Custo</b> + <b>Gasta da barra</b>: ex. 2 de <code>Mana</code>.</li></ul>
        Os atributos e as barras vêm da <b>lista da campanha</b>, que o mestre edita no painel <b>Mesa</b> (clique no nome da campanha). Assim todo mundo usa o mesmo nome, em <b>qualquer sistema</b>.`,
      spot: el('.win .act-form') },
    { ch: 'Crie suas ações', title: 'Crie a sua ação',
      body: 'Vamos criar uma <b>Adaga</b>:<ol><li>Clique em <b>Nova ação</b> (no fim da lista de ações).</li><li>Mude o <b>Nome</b> para <code>Adaga</code>.</li><li>Ataque: <code>1d20</code> e, em <b>+ atributo</b>, escolha <b>Destreza</b>.</li><li>Dano: <code>1d4</code> e, de novo, <b>+ atributo → Destreza</b>.</li></ol>',
      task: 'Clique em Nova ação na ficha.',
      spot: el('.win .btn', 'Nova ação'),
      enter: () => { App.UI.openActor(T.ids.heroActor, 'acoes'); T.base.nActs = heroActor().actions.length; },
      done: () => heroActor().actions.length > T.base.nActs },
    { ch: 'Crie suas ações', title: 'Use a sua ação',
      body: 'Preencha os campos da nova ação (cada campo salva sozinho ao sair dele). Depois ela aparece <b>no painel do token</b> e na ficha, pronta para usar.<p>Clique no botão roxo da ação na ficha (ou no botão no painel da Lyra) e depois num goblin <b>ao alcance</b>: corpo a corpo, se você não mudou o Alcance.</p>',
      task: 'Use a nova ação em um goblin.',
      spot: el('.win .act-card', null, true),
      done: () => newActionMsgs().some((m) => !['Espada longa', 'Arco curto', 'Bola de fogo', 'Poção de cura'].includes(m.label)) },

    // ---------- 7. Combate e turnos ----------
    { ch: 'Combate e turnos', title: 'Combate',
      body: 'Feche a ficha (X) se ela estiver atrapalhando. O combate organiza a <b>ordem de iniciativa</b> e os <b>turnos</b>.',
      task: 'Clique em Combate, na barra de baixo.',
      spot: el('#dock .dock-btn', 'Combate'), done: () => App.UI.tab === 'combat' },
    { ch: 'Combate e turnos', title: 'Monte a iniciativa',
      body: 'Coloque todo mundo no combate e role a iniciativa de uma vez. Cada um usa a <b>fórmula de iniciativa</b> da própria ficha (a da Lyra é <code>1d20+@destreza</code>). Os resultados vão para o chat.',
      task: 'Clique em Todos da cena e depois em Rolar faltantes.',
      spot: union(el('#p-combat .btn', 'Todos'), el('#p-combat .btn', 'faltantes')),
      enter: () => App.UI.showTab('combat'),
      done: () => { const c = S().state.combat; return c.entries.length >= 3 && c.entries.every((e) => e.init != null); } },
    { ch: 'Combate e turnos', title: 'Comece o combate',
      body: 'A lista já está ordenada da maior para a menor iniciativa.',
      task: 'Clique em Iniciar combate.',
      spot: el('#p-combat .btn', 'Iniciar'), enter: () => App.UI.showTab('combat'),
      done: () => S().state.combat.active },
    { ch: 'Combate e turnos', title: 'Passe os turnos',
      body: `<ul><li>Quem está agindo fica com <b>borda dourada</b> na lista, <b>no mapa</b> e na faixa de iniciativa no topo.</li>
        <li>O <b>jogador só move o próprio token na vez dele</b> e recebe o aviso <i>"Sua vez"</i>. Para ele aparece o botão <b>Encerrar meu turno</b>.</li>
        <li>Quando chega a vez de um token seu, ele <b>já fica selecionado</b> com as ações à mão: aperte ${k('1')}, ${k('2')}… e escolha o alvo.</li>
        <li>Condições com duração (ex.: Atordoado por 2 rodadas) diminuem sozinhas no início do turno do token.</li></ul>`,
      task: 'Clique em Próximo turno.',
      spot: el('#p-combat .btn', 'Próximo'), enter: () => App.UI.showTab('combat'),
      done: () => { const c = S().state.combat; return c.active && (c.turn > 0 || c.round > 1); } },

    // ---------- 8. Regras ----------
    { ch: 'Regras automáticas', title: 'Ajuste as regras da sua mesa',
      body: 'Cada grupo joga de um jeito: as regras da automação ficam nas configurações da <b>Mesa</b>, abertas pelo nome da campanha no topo.',
      task: 'Clique no nome da campanha, no topo, e role até "Regras automáticas".',
      spot: el('#crumb-campaign'), done: () => App.UI.tab === 'table' },
    { ch: 'Regras automáticas', title: 'O que cada regra faz',
      body: `<ul><li><b>Acerto crítico</b>: dobra os dados (D&D 5e), dobra o total ou desliga.</li>
        <li><b>Crítico sempre acerta</b> / <b>1 natural sempre erra</b>.</li>
        <li><b>Barras não ficam negativas</b>: o PV para no 0.</li>
        <li><b>Jogador só usa ações na própria vez</b>: trava ataques fora do turno.</li>
        <li><b>Esconder Defesa e PV dos monstros</b>: os jogadores veem só "acertou" e o dano.</li></ul>`,
      spot: el('#p-table h4', 'Regras'), enter: () => App.UI.showTab('table') },

    // ---------- fim ----------
    // ---------- 9. Luz e paredes ----------
    { ch: 'Luz e paredes', title: 'Apague as luzes',
      body: 'Masmorras são escuras. Com a <b>iluminação</b> ligada, os jogadores só enxergam o que alguma luz ilumina, e as <b>paredes bloqueiam a visão</b>. É assim que dá para esconder monstros e armadilhas.',
      task: 'No painel da direita, em Iluminação, ligue "Luz e visão dinâmicas" e escolha Escuro.',
      spot: el('#light-sec'),
      enter: () => { App.UI.rightTab = 'props'; B().selected = null; App.UI.setViewAs(null); App.UI.refresh(); B().requestRender(); },
      done: () => { const l = scene().light; return l.enabled && !l.global; } },
    { ch: 'Luz e paredes', title: 'Acenda uma tocha',
      body: 'Como mestre, você continua vendo tudo: a escuridão aparece translúcida. Mas a Lyra precisa de luz.<p>A luz tem três níveis: <b>luz plena</b> (tudo visível), <b>meia luz</b> (escurecido) e <b>escuridão</b> (preto). A <b>tocha</b> dá luz plena até 4 quadrados e meia luz até 8. A <b>visão no escuro</b> enxerga um nível acima até a distância escolhida: escuridão vira meia luz, e meia luz vira luz plena.</p>',
      task: 'Selecione a Lyra e, em Luz e visão, escolha Tocha.',
      spot: () => el('#token-hud .light-row')() || tokRect('hero')(),
      enter: () => select('hero'),
      done: () => { const t = heroTok(); return !!(t && t.light && t.light.dim > 0); } },
    { ch: 'Luz e paredes', title: 'Erga uma parede',
      body: 'As paredes bloqueiam a luz e a visão. Quem mostra a parede é o desenho do mapa, mas no escuro o jogador vê uma <b>linha clara</b> nas paredes que o personagem enxerga (e as portas em dourado), para saber o limite da sala.<p>Use a ferramenta <b>Parede</b> ' + k('W') + ' na barra da esquerda e arraste de um canto do grid a outro. Para muros curvos e cavernas, troque para <b>Lápis</b> no quadro ao lado e desenhe à mão livre. A <b>Porta</b> ' + k('O') + ' funciona igual, e qualquer um abre ou fecha clicando no marcador dourado. Porta fechada deixa passar; para segurar o grupo, <b>Shift + clique</b> no marcador <b>tranca</b> a porta: ninguém abre nem passa, e só você vê o cadeado.</p><p>Dica: <b>Paredes dos desenhos</b> transforma as linhas e retângulos já desenhados em paredes de uma vez.</p>',
      task: 'Desenhe uma parede entre a Lyra e os goblins.',
      spot: el('#toolbar [data-tool="wall"]'),
      enter: () => { T.base.walls = (scene().walls || []).length; },
      done: () => (scene().walls || []).length > T.base.walls },
    { ch: 'Luz e paredes', title: 'Muros baixos e cobertura',
      body: `Nem toda parede vai até o teto. Com a ferramenta Parede ativa, escolha o tipo ao lado da barra:
        <ul><li><b>Parede absoluta</b>: casa com telhado. Nunca deixa ver nem atacar o outro lado.</li>
        <li><b>Cobertura total</b> (o padrão, 3 m): tapa a luz e a visão de quem é mais baixo que ela. Um gigante enxerga por cima.</li>
        <li><b>Três quartos</b> (altura do ombro): o alvo ganha <b>+5</b> na Defesa e nos testes de resistência.</li>
        <li><b>Meia cobertura</b> (altura da cintura): <b>+2</b>.</li></ul>
        <p>A proteção depende da <b>altura</b>: um muro que cobre a criatura inteira vira cobertura total, e um gigante aparece por cima de um muro baixo. Quem é mais baixo que o muro também não enxerga por cima dele. Alturas, bônus e a "sombra" atrás do muro ficam em <b>Configurar cena → Cobertura</b>. Clicar numa parede já desenhada troca o tipo dela.</p>`,
      task: 'Escolha Meia cobertura e desenhe um muro (ou clique na parede que você fez).',
      spot: el('#tool-opts'),
      enter: () => { App.UI.setViewAs(null); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); B().setTool('wall'); },
      done: () => (scene().walls || []).some((w) => w.cover === 'half' || w.cover === 'three') },
    { ch: 'Luz e paredes', title: 'Veja pelos olhos dos jogadores',
      body: 'Confira o que os jogadores enxergam antes de revelar a surpresa. A tela inteira vira a de um jogador: sem os seus painéis, sem tokens ocultos, com a luz e o som do ponto de vista dele. Quem está fora da luz ou atrás de uma parede <b>some do mapa</b> e não dá nem para clicar.<p>No menu ⋯ você também pode ver como um jogador específico.</p>',
      task: 'Clique em "Ver como os jogadores".',
      spot: el('#btn-preview'),
      done: () => !!S().viewAs },
    { ch: 'Luz e paredes', title: 'Surpreenda o grupo',
      body: `<ul><li>Mova a Lyra: a visão acompanha o token na hora, até enquanto você arrasta.</li>
        <li><b>Ambiente Claro</b> (dia): tudo iluminado, mas as paredes ainda escondem o outro lado.</li>
        <li>Coloque um monstro numa sala escura atrás de uma porta fechada: quando o grupo abrir a porta, a luz entra e ele aparece.</li></ul>
        <p>Clique em <b>Voltar a ser mestre</b>, no topo, quando terminar.</p>`,
      spot: el('#viewas-bar') },
    { ch: 'Luz e paredes', title: 'Vultos e grupos',
      body: `No painel do token, <b>Para os jogadores</b> tem três opções:
        <ul><li><b>Visível</b>: todos veem normalmente.</li>
        <li><b>Vulto</b>: os jogadores veem só uma silhueta escura com "?", sem imagem, nome nem vida. Dá para atacar, e no chat aparece "Vulto".</li>
        <li><b>Invisível</b>: só você vê.</li></ul>
        <p>Em <b>Grupo</b>, junte vários tokens (a emboscada de goblins, por exemplo). O grupo tem os mesmos três botões e muda <b>todos de uma vez</b>. A lista de grupos também fica na aba <b>Camadas</b>.</p>`,
      task: 'Selecione o Goblin 1 e transforme ele em Vulto.',
      spot: () => el('#token-hud .vis-seg')() || tokRect('g1')(),
      enter: () => { App.UI.setViewAs(null); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); select('g1'); },
      done: () => Object.values(scene().tokens).some((t) => t.masked) },
    { ch: 'Luz e paredes', title: 'Criaturas que voam',
      body: `Uma harpia sobrevoando o muro do castelo: no painel do token, em <b>Voo</b>, marque <b>Voando</b> e diga quantos <b>metros</b> ela subiu.
        <ul><li>Ela passa a <b>ver e ser vista</b> por cima de qualquer muro mais baixo que o topo dela (altura do corpo + voo). A <b>parede absoluta</b> continua bloqueando.</li>
        <li>A cobertura também muda: voando acima de um muro, ela fica menos escondida atrás dele, e quem voa ataca de cima.</li>
        <li>No mapa, o token ganha a etiqueta <b>↑ 6 m</b> e uma sombra no chão. A tocha de quem voa ilumina por cima dos muros.</li></ul>
        <p>Só o mestre decide quem voa.</p>`,
      task: 'Selecione o Goblin 2 e marque Voando.',
      spot: () => el('#token-hud .fly-row')() || tokRect('g2')(),
      enter: () => { App.UI.setViewAs(null); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); select('g2'); },
      done: () => Object.values(scene().tokens).some((t) => Number(t.fly) > 0) },
    { ch: 'Luz e paredes', title: 'Pontos de luz',
      body: `Nem toda luz vem de um personagem. Com a ferramenta <b>Luz</b> ${k('U')} você põe luzes presas ao mapa:
        <ul><li><b>Círculo</b>: um lustre ou uma fogueira. Clique para pôr, ou arraste para escolher o alcance.</li>
        <li><b>Cone</b>: um holofote ou a luz entrando pela janela. Arraste para a direção.</li>
        <li><b>Área</b>: a sala inteira acesa por igual. As paredes seguram a luz.</li></ul>
        <p>No painel da luz ficam a <b>cor</b>, a intensidade da cor, <b>tremular</b> e acesa ou apagada (dois cliques no marcador também). O tipo <b>Escuridão</b> faz o contrário: apaga qualquer luz onde está, até de dia.</p>
        <p>A luz dos tokens também tem cor, tremor e <b>cone</b>: a lanterna aponta para onde o personagem andou.</p>`,
      task: 'Escolha a ferramenta Luz e clique no mapa para pôr uma luz.',
      spot: el('#toolbar [data-tool="light"]'),
      enter: () => { App.UI.setViewAs(null); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); B().selected = null; T.base.lights = (scene().lights || []).length; },
      done: () => (scene().lights || []).length > (T.base.lights || 0) },

    // ---------- 10. Música e sons ----------
    { ch: 'Música e sons', title: 'O som da mesa',
      body: 'Só o <b>mestre</b> controla a música: os jogadores não veem botões nem volume, eles só ouvem.',
      task: 'Clique em Som, na barra de baixo.',
      spot: el('#dock .dock-btn', 'Som'),
      enter: () => { App.UI.setViewAs(null); },
      done: () => App.UI.tab === 'audio' },
    { ch: 'Música e sons', title: 'Sua pasta de músicas',
      body: `<ol><li>Crie uma pasta <code>musicas</code> dentro do projeto e coloque seus arquivos (mp3, ogg, m4a, wav).</li>
        <li>Clique em <b>Escolher pasta</b> e aponte para ela (Chrome ou Edge). Música nova colocada na pasta aparece sozinha.</li>
        <li>O sistema separa sozinho em <b>Música</b>, <b>Ambiente</b> (chuva, vento, fogueira…) e <b>Efeito</b> (sons curtos). Se errar, troque na lista.</li></ol>
        <ul><li><b>Música</b> e <b>Ambiente</b> tocam juntos, cada um com seu volume, e trocam de faixa suavemente.</li>
        <li><b>Efeitos</b> tocam uma vez: porta rangendo, trovão, rugido.</li>
        <li>O botão de mapa numa faixa faz dela a <b>trilha da cena</b>, que começa sozinha quando você ativa a cena.</li>
        <li>Os jogadores recebem as faixas pela conexão da mesa. Ao entrar, cada um clica uma vez em <b>Ativar som</b> (exigência do navegador).</li></ul>
        <p>A campanha guarda só os nomes das faixas, então o arquivo exportado continua leve.</p>`,
      spot: el('#p-audio') },
    { ch: 'Música e sons', title: 'Som que vem de um lugar',
      body: `Arraste uma faixa da biblioteca e solte no mapa:
        <ul><li><b>Música ou ambiente</b> vira um som preso àquele ponto, tocando sem parar: um rio, uma fogueira, um monstro rosnando atrás da porta.</li>
        <li><b>Efeito</b> fica parado no ponto esperando o seu <b>play</b> (no painel ou com dois cliques no marcador): prepare o grito no fim do corredor e dispare na hora certa.</li></ul>
        <p>Cada jogador ouve pelo <b>próprio token</b>: mais alto perto do ponto, mais do lado esquerdo ou direito (com fone dá para se guiar pelo som) e <b>abafado atrás de paredes</b>. Quando abrem a porta, o som fica nítido.</p>
        <p>Os marcadores só você vê. O alcance aparece colorido: <b>dourado</b> é volume máximo e <b>azul</b> é o mínimo, com anéis de 75%, 50%, 25% e 10%. A parte apagada fica atrás de paredes. Clique no marcador para ajustar alcance e volume, ou arraste para mudar de lugar.</p>`,
      spot: () => el('#p-audio .au-list')() || el('#p-audio')() },
    { ch: 'Música e sons', title: 'Salas de som',
      body: `Uma taverna com o seu alaúde, uma cripta em silêncio: a <b>Sala de som</b> ${k('M')} marca uma área à prova de som.
        <ul><li>Arraste um <b>retângulo</b>, ou use o modo <b>Polígono</b> e clique em cada canto para salas tortas.</li>
        <li>Solte uma <b>música</b> dentro da sala (ou escolha no painel dela): ela vira a música da sala inteira.</li>
        <li>Quem entra ouve só a música da sala: a música da cena para, e os <b>efeitos continuam</b>. O ambiente de fora (chuva, vento) para, fica abafado ou continua, você escolhe.</li>
        <li>Sons do mapa dentro da sala só se ouvem lá dentro, e os de fora não entram.</li></ul>
        <p>As salas só você vê. Para conferir, mova a câmera para dentro de uma: você ouve como quem está lá.</p>`,
      task: 'Escolha a ferramenta Sala de som e desenhe uma sala no mapa.',
      spot: el('#toolbar [data-tool="room"]'),
      enter: () => { App.UI.closeDock && App.UI.closeDock(); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); T.base.rooms = (scene().rooms || []).length; },
      done: () => (scene().rooms || []).length > (T.base.rooms || 0) },

    { ch: 'Cenas', title: 'Imagens no mapa',
      body: `Baú, fogueira, carroça, árvore, armadilha: a ferramenta <b>Imagem</b> ${k('I')} solta imagens no mapa.
        <ul><li>Clique em <b>Enviar imagem…</b> ou <b>arraste arquivos</b> do computador direto para o mapa. As imagens já usadas ficam em <b>Imagens da campanha</b>, para usar de novo em qualquer cena.</li>
        <li>Clique na imagem para mover. Os <b>cantos</b> redimensionam e a <b>bolinha de cima</b> gira (Shift: de 15 em 15°).</li>
        <li>No painel: <b>Visível</b> ou <b>Invisível</b> para os jogadores, opacidade, travar, espelhar e duplicar.</li>
        <li><b>Nível:</b> imagens e tokens dividem a mesma ordem. Use os botões de nível para pôr a copa da árvore por cima do goblin ou o tapete por baixo de todos.</li></ul>`,
      task: 'Escolha a ferramenta Imagem e coloque uma imagem no mapa.',
      spot: () => el('#tool-opts .to-row', 'Enviar imagem')() || el('#toolbar [data-tool="prop"]')(),
      enter: () => { App.UI.setViewAs(null); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); T.base.props = (scene().props || []).length; },
      done: () => (scene().props || []).length > (T.base.props || 0) },
    { ch: 'Cenas', title: 'Mostrar aos jogadores',
      body: `Uma carta, o retrato do vilão, uma pista: prepare antes e mostre na hora.
        <ul><li>No dock, abra <b>Mostrar</b> e clique em <b>Nova entrega</b>: título, uma <b>imagem</b>, um <b>texto</b> ou os dois.</li>
        <li>Na hora do jogo, clique em <b>Mostrar</b> e escolha <b>Todos</b> ou alguns jogadores.</li>
        <li>Abre uma janela na tela deles, com <b>zoom</b> na imagem (roda do mouse, arrastar, dois cliques volta). Cada um fecha a sua.</li>
        <li>No chat de quem recebeu fica a entrega com a miniatura: clicar abre de novo.</li></ul>
        <p>Neste tutorial ninguém está conectado: quem mostra (você) vê a prévia.</p>`,
      task: 'Abra Mostrar, crie uma entrega e mostre para todos.',
      spot: () => el('#p-handouts .btn.primary')() || el('#dock [data-dock="handouts"]')(),
      enter: () => { App.UI.setViewAs(null); T.base.handouts = S().state.chat.filter((m) => m.kind === 'handout').length; },
      done: () => S().state.chat.filter((m) => m.kind === 'handout').length > (T.base.handouts || 0) },
    { ch: 'Cenas', title: 'Separar jogadores',
      body: `Na aba <b>Cenas</b>, cada cena mostra as <b>bolinhas</b> de quem está nela.
        <ul><li><b>Ativar</b> leva o grupo para a cena.</li>
        <li><b>Mover jogadores</b> separa um ou vários jogadores numa cena só deles: um explora a cripta sozinho enquanto o resto continua na taverna. Cada um vê e ouve só a cena em que está.</li>
        <li>Para trazer de volta, abra <b>Mover jogadores</b> na cena do grupo e marque quem estava separado.</li></ul>
        <p>Neste tutorial ninguém está conectado, então a lista fica vazia. Na mesa online, ela mostra todos os jogadores.</p>`,
      spot: () => el('.scene-item .btn', 'Mover jogadores')() || el('#left-tabs')(),
      enter: () => { App.UI.setViewAs(null); if (App.UI.mode !== 'edit') App.UI.setMode('edit'); App.UI.leftTab = 'scenes'; App.UI.refresh(); } },

    { ch: 'Fim', title: 'Pronto',
      body: `Você já sabe usar:
        <ul><li>Tokens, painel e PV rápido</li><li>Ataque com alcance, alvo e dano automático</li><li>Magia em área com resistência e custo</li>
        <li>Cura e Desfazer</li><li>Criar suas próprias ações</li><li>Combate, iniciativa e turnos</li><li>Luz, paredes e portas</li><li>Música e sons</li></ul>
        <p>Este tutorial cresce junto com a mesa: cada função nova ganha um capítulo aqui.</p>`,
      final: true },
  ];

  T.steps = STEPS;

  // ================= motor =================
  T.start = function () {
    buildPanel();
    T.spot = h('div', { id: 'tut-spot', hidden: true });
    document.body.append(T.spot);
    go(0);
    setInterval(tick, 200);
    S().on(() => setTimeout(tick, 0));
    window.addEventListener('resize', tick);
  };

  T.reset = function () {
    for (const id of [...App.UI.windows.keys()]) App.UI.closeWindow(id);
    if (B().targeting) B().cancelTargeting();
    B().selected = null;
    App.UI.setViewAs(null);
    App.UI.openActs.clear();
    S().setState(T.demoState());
    App.UI.closeDock();
    go(0);
  };

  function go(i) {
    T.i = U.clamp(i, 0, STEPS.length - 1);
    T.base = { chat: S().state.chat.length };
    T.doneAt = 0;
    const st = STEPS[T.i];
    try { if (st.enter) st.enter(); } catch (e) { console.warn(e); }
    renderPanel();
    tick();
  }

  const chapters = () => [...new Set(STEPS.map((s) => s.ch))];

  function buildPanel() {
    T.panel = h('div', { id: 'tut-panel' });
    document.body.append(T.panel);
    // arrastar pelo cabeçalho
    T.panel.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.tut-head') || e.target.closest('button,select')) return;
      const r = T.panel.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
      const move = (ev) => {
        T.dragged = true;
        T.panel.style.left = U.clamp(r.left + ev.clientX - sx, 0, innerWidth - 80) + 'px';
        T.panel.style.top = U.clamp(r.top + ev.clientY - sy, 0, innerHeight - 40) + 'px';
        T.panel.style.bottom = 'auto';
      };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
    });
  }

  function renderPanel() {
    const st = STEPS[T.i], chs = chapters(), chIdx = chs.indexOf(st.ch);
    const inCh = STEPS.filter((s) => s.ch === st.ch), pos = inCh.indexOf(st) + 1;
    const p = T.panel;
    p.innerHTML = '';
    p.classList.toggle('min', T.min);
    p.append(h('div', { class: 'tut-head' },
      h('span', { class: 'tut-badge' }, 'Tutorial'),
      h('select', { class: 'tut-ch', title: 'Ir para capítulo', value: st.ch, onchange: (e) => go(STEPS.findIndex((s) => s.ch === e.target.value)) },
        chs.map((c, i) => h('option', { value: c }, `${i + 1}. ${c}`))),
      h('span', { class: 'grow' }),
      h('button', { class: 'icon-btn', title: T.min ? 'Expandir' : 'Minimizar', onclick: () => { T.min = !T.min; renderPanel(); } }, App.UI.icon(T.min ? 'chevron-up' : 'chevron-down'))));
    p.append(h('div', { class: 'tut-progress' }, h('div', { style: { width: ((T.i + 1) / STEPS.length) * 100 + '%' } })));
    if (T.min) { p.append(h('div', { class: 'tut-title' }, st.title)); return; }

    p.append(h('div', { class: 'tut-step' }, `Capítulo ${chIdx + 1} de ${chs.length} · passo ${pos} de ${inCh.length}`));
    p.append(h('div', { class: 'tut-title' }, st.title));
    p.append(h('div', { class: 'tut-body', html: st.body }));
    if (st.task) {
      p.append(T.doneAt
        ? h('div', { class: 'tut-task ok' }, 'Isso aí!' + (st.auto === false ? ' Clique em Próximo quando quiser.' : ''))
        : h('div', { class: 'tut-task' }, h('span', { class: 'tut-pulse' }), h('span', {}, h('b', {}, 'Sua vez: '), st.task)));
    }
    if (st.final) {
      p.append(h('div', { class: 'row wrap', style: { marginTop: '8px' } },
        h('button', { class: 'btn', onclick: () => T.reset() }, 'Recomeçar tutorial'),
        h('a', { class: 'btn primary', href: location.pathname }, 'Ir para a mesa')));
    }
    const waiting = st.done && !T.doneAt;
    p.append(h('div', { class: 'tut-foot' },
      h('button', { class: 'btn', disabled: T.i === 0, onclick: () => go(T.i - 1) }, 'Voltar'),
      h('span', { class: 'grow' }),
      !st.final && h('button', { class: 'btn' + (waiting ? '' : ' primary'), title: waiting ? 'Pular este passo' : '', onclick: () => go(T.i + 1) }, waiting ? 'Pular' : 'Próximo')));
  }

  function tick() {
    const st = STEPS[T.i];
    if (!st || !T.panel) return;
    // conclusão do passo
    if (st.done && !T.doneAt) {
      let ok = false;
      try { ok = !!st.done(); } catch { ok = false; }
      if (ok) {
        T.doneAt = Date.now();
        renderPanel();
        if (st.auto !== false) {
          const cur = T.i;
          setTimeout(() => { if (T.i === cur) go(cur + 1); }, 1300);
        }
      }
    }
    // destaque
    let r = null;
    if (st.spot && !T.doneAt) { try { r = st.spot(); } catch { r = null; } }
    if (r && r.w > 0) {
      const pad = 6;
      Object.assign(T.spot.style, { left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.w + pad * 2 + 'px', height: r.h + pad * 2 + 'px' });
      T.spot.hidden = false;
    } else T.spot.hidden = true;
    // painel foge do destaque (se não foi arrastado)
    if (!T.dragged && r) {
      const pr = T.panel.getBoundingClientRect();
      const bottomY = innerHeight - 16 - pr.height;
      const overlapsBottom = r.x < pr.left + pr.width && r.x + r.w > pr.left && r.y + r.h > bottomY;
      T.panel.classList.toggle('top', overlapsBottom);
    }
  }

  App.Tutorial = T;
})(window.App);
