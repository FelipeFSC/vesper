# Funcionalidades e regras de jogo (versão 1.0)

O manual para o usuário final está em `wiki/index.html`. Aqui fica o resumo técnico de cada parte e as regras decididas com o usuário.

## Menu inicial (`js/main.js`)
- Opções: **Jogar** (Abrir mesa online / Entrar na mesa online), **Preparar tabuleiro** (offline), **Criar ficha**, **Tutorial**, **Wiki**.
- Teclado: setas, Enter, Esc. Nome em "Jogando como" (obrigatório só para jogar online).
- Fundo: `imagens/imgHomeHD.jpg` com estrelas, 12 janelas acesas do castelo (coordenadas em escala 1024×572), névoa, halo da lua e faíscas em canvas. "Trocar fundo" guarda uma imagem no navegador; com fundo próprio, só as faíscas aparecem.
- Na mesa, o botão **VÉSPER** (canto superior esquerdo) e o menu ⋯ voltam ao menu, salvando antes. A wiki também tem "Voltar ao menu".

## Fichas
- Abas: **Ações · Atributos · Notas · Configurar**. Topo fixo com retrato, nome e barras.
- Atributos e barras são escolhidos das **listas da campanha** (painel Mesa, editáveis como etiquetas). Nome fora da lista aparece como "(fora da lista)".
- Configurar: tipo, dono, tamanho, cor, **Altura (m)** e **Atrás de muro baixo** (só o mestre muda os dois).
- Fórmulas com erro ou `@` inexistente ficam em vermelho (`Dice.check`).

## Bestiário (Plano 25, `js/bestiary.js` + `data/5etools/`; ainda sem tutorial/wiki)
- Base: criaturas e NPCs do 5etools do usuário, gerada por `node tools/importar-5etools.mjs [pasta do 5etools-src]` (padrão `D:\Projetos\5etools-src`). Usa o carregador do próprio 5etools (`DataLoader`), que resolve as cópias (`_copy`/`_mod`).
- Saída em `data/5etools/` (**fora do git**: são dados dos livros do usuário):
  - `indice.js` = `App.BESTIARY5E_INDEX` `{books, list: [{k, n, s, cr, crn, ty, sz, npc, named, tok, art, rep, ali}]}`;
  - `livro-<SIGLA>.js` = `App.BESTIARY5E_BOOKS[sigla]`, com cada criatura inteira, mais `_token` (URL), `_fluff` (`{entries, images: [{url, title, credit}]}`) e `_txt` (tendência, tipo e iniciativa montados pelas funções do 5etools).
- Imagens: base `https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/` (`Access-Control-Allow-Origin: *`).
  - O token vira asset WebP da campanha ao adicionar (`B.imageFile` + `App.Images.add`).
  - A pasta local e a escolha à mão têm prioridade sobre o token.
  - A arte só carrega na aba Imagens.
- Janela: só o índice carrega ao abrir, e o livro da criatura só ao ver ou adicionar.
  - Filtros: busca, Livro, Tipo/NPCs, ND, tamanho, Meu bestiário, Sem imagem, Esconder versões antigas (`reprintedAs`).
  - Prévia em abas: Ficha, Descrição e Imagens. As marcações `{@…}` são limpas por `B.clean`.
- `B.toActor(m)` não converte regras (é uma escolha do usuário; ações e tradução ficam para depois).
  - Leva nome, tipo (`isNpc` → NPC), tamanho do token, PV médio, atributos (modificador), Defesa = CA e visão no escuro.
  - Leva também `hpDice` (Rolar PV), as notas = `blockText` e `dados5e` = a criatura inteira; `actions: []`.
- Unidades (`js/units.js`, `App.Units`), opcional:
  - tabela 1 pé = 0,3 m, 1 milha = 1,5 km, 1 mi/h = 1,5 km/h, 1 libra = 0,5 kg, 1 onça fluida = 30 ml, 1 pinta = 0,5 L, 1 quarto = 1 L, 1 galão = 4 L;
  - preferência `vesper-unidades` no navegador, escolhida na janela;
  - vale para a prévia e para as notas das fichas criadas depois.
- Token pronto (Plano 26): `a.imgStyle === 'token'` desenha a imagem inteira do tamanho do token, sem disco nem aro (padrão das fichas do bestiário; Configurar → Imagem no tabuleiro).
- Armazenamento do bestiário: banco `mesarpg`/`kv`, chaves `bst-pasta`, `bst-ligacoes` e `bst-meu` (Meu bestiário), fora da campanha.

## Página "Criar ficha" (Plano 23, `ficha.html` + `js/ficha.js`; ainda sem wiki)
- O botão **Criar ficha** da home abre `ficha.html`, uma página só da ficha: sem mesa, sem rede e sem tabuleiro.
- Uso típico (é só um exemplo; os textos da página não falam em mestre): o jogador monta a ficha, **Exportar** gera o `.json` `mesarpg-actor` (com a imagem), e o mestre importa na mesa (`applyImport`). Na mesa vira uma ficha normal; o mestre escolhe o jogador em Configurar → Controlado por.
- As fichas ficam neste navegador: IndexedDB `mesarpg`/`kv`, chave `fichas` = `{actors, assets, savedAt}`, separada da `campaign`. A ficha aberta é lembrada em `localStorage` (`vesper-ficha-sel`).
- Tem tudo o que a janela da mesa tem, menos "Controlado por" (o mestre decide ao importar) e Colocar no mapa / usar ação no alvo:
  - identidade (retrato, nome, tipo, tamanho, cor, altura com vírgula, atrás de muro baixo);
  - barras (atual aceita +5/-2d6);
  - atributos em cartões (dado de teste);
  - fórmulas de teste e iniciativa com aviso;
  - ações (os 5 tipos, "+ atributo", Testar, Duplicar);
  - notas;
  - Duplicar, Exportar, Excluir, Importar.
- Nomes de atributos e barras são livres (sem lista da campanha), com sugestões (`datalist`) da lista padrão e da própria ficha. Na mesa, nome fora da lista do mestre aparece como "(fora da lista)".
- Rolagens: não há chat; o resultado aparece no quadro "Rolagens" no canto (só quem está na página vê).
- Redesenho: cada mudança redesenha depois que o foco já foi ao próximo campo, e devolve o foco pelo `data-f`.
- Celular (até 760 px): uma coluna, e a lista "Minhas fichas" fecha quando há ficha aberta.

## Dados (`js/dice.js`)
`2d6+3`, `kh/kl/dh/dl`, `!` (explode), `dF`, `d%`, `[comentário]`, `(@nivel)d6`, várias rolagens com `|`. No crítico, `doubleDice` dobra a quantidade de dados (inclusive `(expr)dN`).

## Combate (`Store.useAction`, `js/combat.js`)
- Tipos de ação: Ataque (rolagem × atributo de defesa), Resistência (teste × CD, metade ou nada), Dano direto, Cura, Só rolar.
- Alcance em quadrados (vazio = padrão: corpo a corpo, arco/arremesso 16, magia 12, cura toque; 0 = sem limite). Área = raio.
- Lados: grupo (pc ou com dono), criatura (monster), neutro (npc). Ataque mira o outro lado; cura, o próprio. Alt+clique do mestre ignora.
- Regras da campanha: crítico (dobra dados / dobra total / sem), crítico sempre acerta, 1 natural erra, barras negativas, agir só na vez, esconder números dos monstros.
- Desfazer pelo mestre (devolve barras e custo).

## Paredes e cobertura
Quatro tipos (`w.cover`), definidos **por cena** em Configurar cena → Cobertura:

| Tipo | Chave | Padrão | Comportamento |
|---|---|---|---|
| Parede absoluta | `full` | sem altura | Casa com telhado. Bloqueia luz, visão e ataque sempre, para todos. Portas fechadas também. |
| Cobertura total | `high` | 3 m | O padrão (paredes antigas sem tipo também). Bloqueia a luz e a visão de quem não é mais alto que ela. |
| Três quartos | `three` | 1,4 m | A luz passa por cima. Bloqueia a visão de quem não é mais alto. |
| Meia | `half` | 0,9 m | Idem. |

- **Portas** (`door`, `open`, `locked`; Plano 13): fechada tapa luz e visão (tipo 'full'). **Destrancada** (padrão, portas antigas também): qualquer um abre/fecha e dá para atravessar fechada (`Light.passDoors` é ignorado em `moveBlocked`; não fica vermelho; continua fechada). **Trancada** (`wall.lock`, só o mestre: Shift+clique no marcador ou painel da porta; ferramenta Porta escolhe o padrão das novas): fecha; jogador não abre (`permit` de `wall.door`) nem passa; cadeado só para o mestre; o mestre abrindo destranca.
- **Lápis** (Plano 12, `B.wallMode`): traço livre → `pencilWalls` simplifica (Ramer-Douglas-Peucker, tolerância 8% do quadrado), fecha se terminar a até meio quadrado do começo, e cria um trecho de parede por segmento, todos com o mesmo `w.stroke`. Borracha e clique de troca de tipo agem no traço inteiro (`wall.delete`/`wall.update` aceitam `ids`).
- **Proteção = altura do muro ÷ altura do alvo:** ≥100% cobertura total (não pode ser alvo), ≥75% bônus de ¾ (+5), ≥50% bônus de ½ (+2). Limites e bônus configuráveis. O bônus soma na Defesa e no teste de resistência.
- Testa 5 linhas (centro e cantos do alvo) e vale a de **menor** cobertura. Vários muros: vale o maior.
- Quem está encostado no muro ataca por cima dele (opção da cena).
- Altura da criatura: campo Altura da ficha; sem ele, 1,8 m por quadrado de tamanho (0,9 m para minúsculo).
- **Sombra:** até N quadrados atrás de um muro (padrão: total 3, ¾ 3, meia 1). Quem está na sombra aparece para os jogadores como Normal (padrão), Vulto ou Escondido (regra da cena; cada ficha pode sobrepor).
- Desligar a cobertura na cena: a total bloqueia tudo, ¾ e meia não fazem nada.

## Voo
- Painel do token (mestre): **Voando** + metros (`t.fly`; `t.lastFly` lembra a última altura).
- Topo = altura + voo. Quem voa vê e é visto por cima de muros mais baixos que o topo; a parede absoluta bloqueia sempre.
- Cobertura de quem voa: só conta a parte do corpo abaixo do topo do muro.
- Atacante voando acima do muro: a linha desce, e quanto mais longe do muro o alvo está, menos ele fica escondido (só vale para quem voa; no chão a conta é horizontal).
- A luz de quem voa ilumina da altura dele. Token voando é desenhado acima da escuridão, mas nunca por cima da névoa de guerra. Etiqueta "↑ 6 m" e sombra no chão.

## Movimento por caminho (Plano 5)
- Arrastando um token (ou a Régua), o botão direito marca pontos de passagem (via `mousedown`, porque o 2º botão não gera `pointerdown`); Backspace desfaz. Sem segurar nada, o direito move a câmera.
- `drawPath`: trechos com distância, total, vermelho onde atravessa parede (só aviso). `pathCost` soma na medida da cena; na 1-2-1 as diagonais acumulam entre trechos.
- **Sem espiar (Plano 11):** jogador arrastando com algum trecho que atravessa parede que tapa a visão dele (`Light.moveBlocked` com a altura do olho: absoluta, cobertura total, porta fechada; muro baixo só para quem é mais baixo que ele) fica cego (tela preta, só o próprio token e o caminho vermelho, sem mensagem). Soltar assim não move (o token volta); setas também param. `permit()` confere o caminho inteiro de `token.move` vindo de jogador (posição atual → pontos → destino). O mestre não tem trava. "Atravessa" testa duas linhas paralelas a 1 px: pega o canto de sala na diagonal e deixa passar rente à ponta solta de uma parede (vale também para o vermelho).
- `token.move` leva `path` e `at` → `t.lastMove`; o token vai direto ao destino (sem deslizar, Plano 7) e todos veem o rastro por `rules.trailSecs` segundos (Mesa → Regras; 0 desliga).

## Visibilidade dos tokens
- **Visível / Vulto / Invisível** (`t.hidden`, `t.masked`). Vulto: jogadores veem um círculo escuro com "?", sem imagem, nome, vida nem condições; podem atacá-lo; o nome aparece como "Vulto" no chat, na mira e no combate. O mestre vê o token com um aro tracejado.
- **Grupos de tokens** (`sc.groups`, `t.group`): o painel do token e a aba Camadas mudam a visibilidade do grupo inteiro de uma vez.

## Imagens no mapa (Plano 1)
- Clicar de novo na ferramenta ativa fecha as opções dela e volta para Selecionar (Plano 4).
- Ferramenta **Imagem** (`I`, só o mestre): Enviar imagem…, arrastar arquivos do computador para o mapa, ou a biblioteca **Imagens da campanha** (miniaturas de tudo o que já foi usado em qualquer cena).
- `sc.props`: {img, name, x, y, w, h, rot, flip, hidden, opacity, locked, z}. Entra com o lado maior em 2 quadrados, proporção mantida, encaixada no grid, reduzida a no máximo 2048 px.
- Seleção com moldura: arrastar move (encaixe no grid; Alt solta), cantos redimensionam mantendo a proporção (Shift deforma, o canto oposto fica parado), bolinha de cima gira (Shift: 15 em 15°). `Delete` apaga, `Ctrl+D` duplica. Painel: visível/invisível, nível, largura/altura em quadrados, giro, opacidade, travar, espelhar.
- **Níveis:** imagens e tokens dividem a mesma ordem (`z`); empate = imagem embaixo. Ação `order.move` (front/up/down/back) renumera tudo. Imagem nova entra abaixo de tudo; token novo acima de tudo (`Board.maxZ`). Painel do token também tem os 4 botões.
- Jogador vê imagens visíveis, sem moldura e sem poder mexer; ficam embaixo da névoa e da escuridão. Imagem não bloqueia visão. Exportar cena/campanha leva as imagens.

## Mostrar aos jogadores (Plano 2)
- Painel **Mostrar** no dock (só o mestre): entregas preparadas `st.handouts` {title, img, text}; imagem, texto ou os dois.
- **Mostrar** → Todos ou jogadores escolhidos → mensagem de chat `kind: handout` com `to`; abre uma janela arrastável (zoom na imagem) para quem recebe; o mestre vê a prévia. Cada um fecha a sua; o chat guarda a entrega com miniatura para reabrir.
- `permit()` recusa `handout` de jogador; `visibleMsg` respeita `to`.
- Barra de baixo: `placeZoom` tira o zoom do caminho do dock e sobe os botões da direita quando encostariam.

## Cenas
- **Ativar** leva o grupo (`activeSceneId`). **Mover jogadores** separa um ou vários numa cena só deles (`playerScenes`); bolinhas mostram quem está em cada cena. Ativar não puxa quem foi separado. Excluir a cena devolve ao grupo.
- Chat, dados, combate e música geral continuam compartilhados.

## Luz e visão (`js/light.js`)
- **Três níveis** (decisão do usuário, Plano 8): 2 luz plena (vê tudo), 1 meia luz (vê escurecido), 0 escuridão (preto). **Visão no escuro sobe um nível** no alcance dela. Visível = nível ≥ 1 e na linha de visão (`levelAt`, `levelFor`, `pointVisible`).
- Escuro: jogador vê o que está em meia luz ou mais **e** na linha de visão de um token dele. Claro: tudo em luz plena (menos onde há escuridão), paredes ainda escondem.
- Luz do token (vela, tocha 4/8, lanterna, fogueira): bright = raio de luz plena, dim = raio de meia luz. Opções `t.light.shape` (circle|cone), `angle`, `color`, `tint`, `flicker`. O cone aponta para `t.facing` (graus, 0 = direita, 90 = baixo), que o `token.move` atualiza pela direção do último trecho; o dono do token pode mudar `facing` (`permit`).
- **Pontos de luz** (`sc.lights`, ferramenta Luz `U`, só o mestre): círculo e cone (bright/dim em quadrados, `dir`, `angle`; borda lateral do cone de 10° em meia luz), área (`pts`, `edge` = faixa de meia luz em volta). A área ilumina a partir de até 25 pontos de dentro dela (`areaSamples`), então paredes fazem sombra e a luz não vaza. `kind: 'dark'` = escuridão: miolo vira nível 0 e borda no máximo 1, vale de dia e sobre tochas; visão no escuro sobe um nível dentro dela. `on` acende e apaga (dois cliques no marcador).
- Desenho: máscara em cinza (branco/cinza/preto) com `lighten` para luzes e `darken` para escuridão, multiplicada sobre o mapa. A cor (`soft-light` + `lighter`) é só visual. Tremor: raio e intensidade oscilam; o tabuleiro anima enquanto houver luz tremulando (`flickering`).
- **Contorno das paredes no escuro** (Plano 10, `drawWallHints` em `js/board.js`): só para jogadores (e "ver como"), com a iluminação ligada. Linha clara nas paredes dentro da linha de visão dos tokens dele, mesmo sem luz; portas em dourado (tracejado se aberta). Recortado pelo polígono de visão (metade da linha aparece na borda) e apagado debaixo da névoa de guerra.
- Ver como os jogadores (todos ou um).
- Névoa de guerra manual (revelar/esconder retângulos).

## Som (`js/audio.js`)
- Pasta escolhida pelo mestre (`Sons/` com `musicas`, `ambiente`, `Efeitos`). A campanha guarda só nomes; os jogadores recebem as faixas por P2P (streaming de mp3 grandes) e guardam em cache.
- Canais: música, ambiente (contínuos, com volume), efeitos (uma vez). Trilha da cena toca ao ativar.
- Sons no mapa: volume pela distância, lado esquerdo/direito, abafado atrás de paredes.
- **Salas de som** (ferramenta M, retângulo ou polígono): à prova de som. Música da sala toca na sala inteira; para quem está dentro, a música da cena para (volume 0, continua em sincronia), o ambiente de fora para/abafa/continua, efeitos seguem. Cada jogador ouve pelo próprio token; o mestre, pelo centro da câmera.

## Gatilhos (Plano 14, `js/triggers.js`; ainda sem tutorial/wiki)
- Ferramenta **Gatilho** (`T`, só o mestre): retângulo (clique = 1 quadrado), círculo ou polígono. Jogadores nunca veem a área.
- **Quando:** entrar (inclusive passando por cima no meio do caminho), sair, clicar numa imagem ligada (`propId`; jogador clica, o mestre confere dono e visibilidade). **Disparar agora** no painel (mesmo gasto).
- **Quem:** grupo (`Combat.side` = party, padrão), criaturas, qualquer, escolhidos. **Arrastar como mestre não dispara**; em "ver como" dispara.
- **Vezes:** uma (padrão), sempre, N; espera entre disparos; gasto = cinza; Rearmar / Rearmar todos; Ligado.
- **Perguntar antes**: fila no mestre (`#trig-ask`, Disparar/Ignorar). **Parar o movimento**: o mestre corta o caminho no primeiro quadrado da área antes de aplicar (o jogador recebe a posição corrigida).
- **Ações** em ordem, atraso acumulado: porta (abrir/fechar/trancar/destrancar/alternar), luz (acender/apagar/alternar), token ou grupo (aparecer/sumir/vulto), som (efeito, som do mapa, música, ambiente), armadilha (`useAction` com `a.trap`: teste + dano, com Desfazer; atinge quem disparou ou, no botão, quem está na área), névoa (revelar/esconder o retângulo da área), teletransporte (ponto deste mapa, ou outra cena: o token passa para lá e quem o controla vai junto), outro gatilho (ligar/desligar/rearmar/disparar; profundidade máx. 5). "Escolher no mapa" (`B.pick`).
- **Configurar** (Plano 15): janela flutuante `trigger:<id>` (SE | ENTÃO, cartões com arrastar, "No mapa" esconde a janela); painel da direita só com resumo; lista no quadro da ferramenta (estado, ligar, testar). **Testar = simulação** (`simulate`: piscar no mapa do mestre + prévia de som; não muda estado).
- **Escolher no mapa** (Plano 16): botão na coluna ENTÃO; `anyObjectAt` reconhece luz, porta, som, gatilho ou token e `actionFromPick` cria a ação com o contrário do estado atual; vários seguidos até Esc/Concluir. Alvos numerados no mapa; ação em foco (aberta ou hover) destacada. Luzes novas com nome numerado.
- **Sem mensagens para os jogadores** (decisão: o mestre narra). O mestre recebe aviso e uma linha secreta no chat a cada disparo.

## Vários alvos e animação (Plano 21, `js/anim.js`; ainda sem tutorial/wiki)
- **Vários alvos:** cada ação tem `ids` (lista) e `tag` (grupo de objetos). Porta, luz, som do mapa, outro gatilho, token (`t:`/`g:`) e Animar (`prop:`/`light:`/`token:`). No cartão: chips (clique tira), "Somar da lista…" e "No mapa" (vários cliques; clicar de novo tira; Enter/Concluir). Objeto de outro tipo transforma o cartão (Plano 16). Na coluna ENTÃO, objetos iguais clicados em seguida entram na mesma ação.
- **Grupo de objetos:** campo no painel da imagem, luz, porta e som. O gatilho que mira o grupo pega também os objetos postos nele depois. Gatilhos antigos (`lightId`, `wallId`…) viram `ids` no `migrate` e no reducer.
- **Animar** (imagem, luz, token): mover (quadrados ou destino no mapa), ronda (pontos marcados no mapa), girar/varrer, opacidade (imagem) ou intensidade (luz, campo `power`), tamanho (imagem), cor (luz). Duração, curva (suave, constante, acelerando, freando), repetir (uma vez, ir e voltar N vezes ou sem parar, repetir sem parar), no fim fica ou volta. Modelos prontos (lâmina, girar, holofote, pulsar, aparecer, sumir, ronda).
- Ações: **Tocar a animação do objeto** (a do painel), **Animação nova** (a do cartão; vários alvos fazem o mesmo movimento), **Parar onde está**, **Voltar ao início** (`animHome`).
- **Animação própria** no painel da imagem e da luz (seção Animação): movimentos, "Começa sozinha com a cena" (calculada pelo relógio, sem estado; para tokens, só por gatilho), Tocar/Parar/Voltar.
- **Rede:** uma mensagem para começar (`anim.start`) e uma para terminar (`anim.end`, grava o resultado); cada tela calcula o quadro (`Anim.view`) pelo relógio do mestre (`now` no welcome/state e `clock` a cada 20 s).
- Luz animada vale para a visão e as paredes; a memória de exploração grava a cada 1 s enquanto luz ou token anima. Token anda olhando para onde vai e termina no grid. Testar = prévia só na tela do mestre (até 6 s). Animação rodando não entra no Ctrl+Z.
- **Área de dano da imagem** ("Machuca quem tocar"): retângulo ajustado no mapa (`hurt.box`, gira e espelha com a imagem), só em movimento ou sempre, quem, teste/CD/dano/barra (como a armadilha). Um golpe por passagem. Os jogadores não recebem a área (`Net.playerState`/`forPlayers`).
- Mestre vê o caminho tracejado (com sombra no destino e o arco do giro) do objeto selecionado ou do cartão Animar aberto, e a área de dano em vermelho.

## Scan de paredes e portas (Plano 22, `js/scan.js`; ainda sem tutorial/wiki)
- Ferramenta Parede → **Procurar paredes no mapa** (janela `scan`). Precisa de imagem de mapa na cena.
- **O que separa as salas:** Lado de fora (clique no vazio; todo vazio daquela cor, inclusive pátios), Cor da parede (clique na linha; meio da linha) ou Escuro. Sensibilidade. Retas (meio-quadrado, 0°/45°/90°) ou Livre (um traço por trecho). Mapa inteiro ou só uma área.
- **Portas:** Mostrar uma porta (retângulo justo em volta) → procura as parecidas, giradas e espelhadas; Outra porta para outro desenho; Quão parecida; palpite pelas aberturas (desligado). A porta corta a parede debaixo.
- Prévia tracejada (verde-água paredes, laranja portas); clique tira/põe, Shift + arrastar tira várias; não repete paredes existentes; **Criar** = um passo no Ctrl+Z.
- **Importar mapa com paredes** (aba Cenas, ícone de envio): `.dd2vtt`/`.uvtt` → cena nova com imagem, grid, paredes, portas e luzes.

## Montagem do mapa (Planos 17, 18, 20; ainda sem tutorial/wiki)
- **Desfazer/refazer** (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, botões ↶ ↷): só o mestre, 100 passos por sessão, só montagem e tokens do mestre.
- **Seleção múltipla:** Shift + arrastar (laço), Shift + clique; mover junto, setas, Delete, Ctrl+D, Ctrl+C/Ctrl+V em qualquer cena (escala se o grid for outro; gatilhos colados religados às cópias). Shift + clique numa porta continua trancando.
- **Notas do mestre** (`N`): alfinete colorido com título, texto no hover, janela própria, lista com busca. Nunca vão para os jogadores.

## Memória de exploração (Plano 19; ainda sem tutorial/wiki)
- Por cena (Iluminação → Memória de exploração; Esquecer o explorado). Regra da campanha: do grupo ou de cada jogador.
- O já visto fica ~25% e sem tokens na tela do jogador; o contorno das paredes vale nas áreas lembradas. Espiar no arraste não grava.

## Painéis
- Atualizam na hora; só esperam quando alguém digita (`isTyping`).
- Barras laterais recolhem (Plano 15): faixa de ícones; lembrado em `localStorage` `vesper.paineis`. Direita recolhida = painel do selecionado flutua (`hudFloats`/`placeHud`). Larguras via `--lw`/`--rw` no `#app`.
- Janelas (`UI.openWindow`): o `build` pode devolver `null` para "nada mudou, não redesenha".
- Painel Mesa: conexão, salvar/exportar, regras, listas da campanha (atributos, barras, condições) como etiquetas.

## Atalhos
`V` selecionar · `H` câmera · `R` régua · `P` ping · `D` desenho · `L` linha · `B` retângulo · `E` círculo · `X` borracha · `F`/`G` névoa · `W` parede · `O` porta · `U` luz · `T` gatilho · `N` nota · `M` sala de som · `I` imagem · `1`–`9` ações · setas movem · `Delete` remove · `Esc` cancela · `Alt` sem encaixe.
