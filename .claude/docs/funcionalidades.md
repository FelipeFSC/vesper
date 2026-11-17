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
- `token.move` leva `path` e `at` → `t.lastMove`; o token desliza pelo caminho e todos veem o rastro por `rules.trailSecs` segundos (Mesa → Regras; 0 desliga).

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
- Escuro: jogador vê o que está iluminado **e** na linha de visão de um token dele. Claro: tudo iluminado, paredes ainda escondem.
- Luz do token (vela, tocha 4/8, lanterna, fogueira) e visão no escuro. Ver como os jogadores (todos ou um).
- Névoa de guerra manual (revelar/esconder retângulos).

## Som (`js/audio.js`)
- Pasta escolhida pelo mestre (`Sons/` com `musicas`, `ambiente`, `Efeitos`). A campanha guarda só nomes; os jogadores recebem as faixas por P2P (streaming de mp3 grandes) e guardam em cache.
- Canais: música, ambiente (contínuos, com volume), efeitos (uma vez). Trilha da cena toca ao ativar.
- Sons no mapa: volume pela distância, lado esquerdo/direito, abafado atrás de paredes.
- **Salas de som** (ferramenta M, retângulo ou polígono): à prova de som. Música da sala toca na sala inteira; para quem está dentro, a música da cena para (volume 0, continua em sincronia), o ambiente de fora para/abafa/continua, efeitos seguem. Cada jogador ouve pelo próprio token; o mestre, pelo centro da câmera.

## Painéis
- Atualizam na hora; só esperam quando alguém digita (`isTyping`).
- Painel Mesa: conexão, salvar/exportar, regras, listas da campanha (atributos, barras, condições) como etiquetas.

## Atalhos
`V` selecionar · `H` câmera · `R` régua · `P` ping · `D` desenho · `L` linha · `B` retângulo · `E` círculo · `X` borracha · `F`/`G` névoa · `W` parede · `O` porta · `M` sala de som · `I` imagem · `1`–`9` ações · setas movem · `Delete` remove · `Esc` cancela · `Alt` sem encaixe.
