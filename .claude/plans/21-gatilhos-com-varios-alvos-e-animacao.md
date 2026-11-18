# Plano 21 · Gatilhos com vários alvos e animação

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Gosto muito da parte de edição do geometry dash, acho extremamente rico. E eu gostaria de importar alguns pontos da parte de trigger para cá também, por exemplo hoje a trigger você seleciona 1 por 1 na animação, gostaria de opção de selecionar vários, por exemplo ascender 3 luzes ao mesmo tempo, outro ponto, controlar animações também, por isso pedi para adicionar imagens no tabuleiro, podemos simular movimento, fazer a imagem ir de um lado ao outro para parecer uma armadilha ou também controlar a luz com animação, como fazer uma luz iluminando um canhão, sabe ? Gosto muito dessas ideias de trigger e animação dinâmica que o geometry dash dá para o jogador fazer."

## Objetivo
Um gatilho passa a mexer em **vários objetos de uma vez** (acender 3 luzes num só cartão) e ganha **animação**: imagens e luzes que se movem, giram, aparecem e somem aos poucos, vão e voltam ou ficam em repetição. Com isso o mestre monta lâminas que passam pelo corredor, holofotes que varrem o pátio, um farol girando, tochas que pulsam.

## Como funciona hoje
- `js/triggers.js`: cada ação tem **um** alvo (`wallId`, `lightId`, `soundId`, `triggerId`, `target`). `runAction` executa e muda o estado na hora, sem transição.
- Imagens no mapa (`sc.props`, Plano 1) têm `x, y, w, h, rot, opacity, hidden`, mas nada as anima.
- Luzes (`sc.lights`, Plano 8) têm `x, y, dir, angle, bright, dim, color, on`, e só o tremor (`flicker`) é animado.
- O editor de gatilho (Plano 15) já tem "Escolher no mapa" com vários seguidos (`pick(..., {multi})`), mas cada escolha vira um cartão separado.

## Proposta

### Parte A · Vários alvos por ação
- Cada cartão de ação passa a ter uma **lista de alvos** (`ids: []`). "Luz → Acender" com 3 luzes acende as 3 juntas.
- No cartão, **Escolher no mapa** passa a deixar marcar vários (clique soma ou tira, Shift + arrastar faz o laço, Enter ou "Concluir" fecha). Os alvos aparecem como chips com o número de destaque do Plano 16, e cada chip tem um X para tirar.
- **Grupos de objetos** (a ideia dos grupos do Geometry Dash): no painel de qualquer imagem, luz, porta ou som, um campo **Grupo** com um nome livre ("lâminas", "tochas do salão"). O cartão pode mirar um grupo em vez de objetos soltos. Objetos colocados no grupo depois também passam a obedecer, e copiar e colar o grupo leva o nome junto.
- Gatilhos antigos continuam funcionando: `migrate()` transforma `lightId` em `ids: [lightId]` (o mesmo para porta, som e gatilho).

### Parte B · Ação "Animar"
Um tipo de ação novo, **Animar**, para imagens e luzes (com vários alvos ou um grupo, como na Parte A).

| Movimento | Imagem | Luz | Como se configura |
|---|---|---|---|
| Mover | sim | sim | Até um ponto escolhido no mapa, ou "andar X, Y quadrados" |
| Girar | sim | sim (direção do cone) | Graus (ex.: 90, -45) ou giro sem parar (voltas por segundo) |
| Varrer | — | sim | O cone vai e volta entre dois ângulos (holofote) |
| Aparecer ou sumir aos poucos | sim (opacidade) | sim (intensidade) | Até a opacidade ou intensidade alvo |
| Crescer ou encolher | sim (tamanho) | sim (raio) | Porcentagem (ex.: 150%) |
| Mudar de cor | — | sim | Cor de destino |

Cada animação tem:
- **Duração** em segundos, por exemplo 1,5 s.
- **Curva:** constante, suave (acelera e freia), acelerando ou freando. É o "easing" do Geometry Dash.
- **Repetição:**
  - uma vez;
  - ir e voltar N vezes;
  - ir e voltar sem parar;
  - repetir sem parar (o giro e o farol).
- **No fim:** a imagem fica onde parou, ou volta à posição inicial.

Ações de controle no mesmo cartão: **Parar animação** (o objeto congela onde está) e **Voltar ao início**.

**Exemplos que a mesa monta com isso:**
- **Lâmina no corredor:** imagem de uma lâmina, Animar → Mover 4 quadros para a direita, 0,6 s, ir e voltar sem parar. O gatilho "Entrar na sala" começa a animação.
- **Holofote do pátio:** luz em cone, Animar → Varrer de 30° a 150°, 4 s, suave, sem parar. Começa com a cena.
- **Farol:** luz em cone girando 0,2 volta por segundo.
- **Teto desabando:** imagem de pedras aparecendo aos poucos em 2 s, junto com uma ação Armadilha no mesmo gatilho.

### Começar sem gatilho
Muitas animações são do cenário (farol, ventilador, tocha pulsando) e não precisam de gatilho. Proposta: no painel da imagem e da luz, uma seção **Animação** com as mesmas opções e a chave "Começa sozinha com a cena". Por baixo é a mesma coisa que um gatilho "Animar".

### Como fica na rede (para não travar a mesa)
- O mestre não manda a posição a cada quadro. Ele manda **uma vez** a animação: o alvo, de onde, para onde, a hora de início, a duração, a curva e a repetição.
- Cada navegador calcula sozinho onde o objeto está em cada momento. Para todos verem igual, usa o relógio do mestre: o atraso é medido na conexão.
- Quando uma animação "uma vez" termina, o mestre grava a posição final no estado. Assim quem entra depois e o salvamento ficam certos.

### Regras de jogo
- **Luz animada conta para a visão de verdade:** o holofote que passa por um jogador ilumina o jogador, e as paredes bloqueiam a luz enquanto ela se move.
- **Memória de exploração:** só grava o que a luz animada revela quando ela para, ou a cada 1 s nas animações sem fim. Assim o cálculo não roda a cada quadro.
- **A imagem animada é só visual.** O dano da lâmina vem do gatilho (área + Armadilha). Ver a pergunta 3 para a lâmina que acerta quem estiver no caminho.
- **Desfazer:** montar a animação no gatilho entra no Ctrl+Z. A animação rodando, não (como os outros efeitos de gatilho).

### Editor
- **Prévia no mapa:** com o cartão Animar aberto, o caminho aparece como uma linha pontilhada, com uma "sombra" da imagem no ponto final e o arco do giro ou da varredura.
- **Testar** (Plano 15) toca a animação só na tela do mestre e devolve tudo ao lugar no fim. Os jogadores não veem.

## Perguntas para o usuário
1. **Grupos de objetos** (campo Grupo no painel de cada objeto, com o gatilho mirando o grupo): faço agora junto com "vários alvos", ou só os vários alvos por enquanto? *Recomendo fazer agora*: é o que deixa montar cenas grandes sem escolher um por um.
2. **Animação sem gatilho** (seção Animação no painel da imagem e da luz, "começa sozinha com a cena"): entra? *Recomendo que sim.*
3. **A lâmina que acerta:** quer uma opção na imagem animada "Machuca quem tocar" (dano ou teste de resistência, uma vez por passagem)? Ou o dano fica só pela área do gatilho? *Recomendo deixar para um plano seguinte* e começar só com o visual.
4. **Animar tokens também** (um guarda que faz ronda, um barco que anda)? *Recomendo deixar para depois*, porque mexe com movimento, combate, cobertura e gatilhos de entrar e sair.
5. **Ordem de entrega:** Parte A (vários alvos e grupos) primeiro, você testa, depois a Parte B (animação)? Ou tudo junto? *Recomendo em duas etapas.*

## Respostas do usuário
1. Grupos de objetos: sim ("vai do controle do jogador, se ele quer agrupar ou fazer uma reação em cadeia como é hoje").
2. Animação sem gatilho: são animações do próprio sistema (mover, girar, pulsar…), não GIF.
3. Lâmina que machuca: sim, com a **área de dano escolhida pelo mestre** na imagem ("o mestre prepara a área de dano do objeto e depois só usa").
4. Animar tokens: sim, como opção.
5. Tudo junto, com um resumo curto de como usar.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | `ids` nas ações, `group` em props, luzes, portas e sons; `sc.anims` (animações rodando); ações `anim.start`, `anim.stop`, `anim.end`; `migrate()` |
| `js/triggers.js` | `runAction` com vários alvos e grupos; ação `anim`; `summary` e `actionFromPick` com listas; Testar com prévia local |
| `js/anim.js` (novo) | Curvas, cálculo da posição no tempo, relógio do mestre, `valueAt(obj)` usado pelo desenho e pela luz |
| `js/light.js` | Fontes usam a posição, direção, raio e cor animados; cache por quadro só quando há luz animada |
| `js/explore.js` | Grava quando a animação para, ou a cada 1 s nas animações sem fim |
| `js/board.js` | Laço de desenho contínuo enquanto houver animação; escolher vários no pick; prévia do caminho e do giro |
| `js/net.js` | Medir o atraso e a diferença de relógio para o mestre |
| `js/ui.js` | Cartão com chips de alvos e grupo; cartão Animar; campo Grupo e seção Animação nos painéis |
| `css/style.css` | Chips, cartão Animar, prévia |

## Tutorial, wiki e README
Ficam para quando você testar e finalizar (como nos Planos 14 a 20):
- passo "Animar uma imagem";
- seções da wiki "Grupos de objetos" e "Animação";
- linha no README.

## Testes
- **Vários alvos:**
  - 3 luzes acendem juntas;
  - um grupo pega um objeto colocado depois;
  - um gatilho antigo de um alvo continua funcionando.
- **Animação:**
  - posição no meio do tempo, com cada curva;
  - ir e voltar, repetir e parar;
  - posição final gravada;
  - quem entra no meio da animação vê o objeto no lugar certo.
- **Luz animada:**
  - ilumina e é bloqueada por parede durante o movimento;
  - a memória de exploração grava no fim.
- **Rede:** só uma mensagem por animação, nenhuma por quadro.
- **Desempenho:** 10 luzes animadas num mapa grande, medido no node como no Plano 19.
- Regressão de todos os testes de gatilho, tutorial completo, 0 processos.

## Resultado
- **Vários alvos:** ações com `ids` + `tag`; cartão com chips, "Somar da lista…" e "No mapa" (vários cliques). Na coluna ENTÃO, objetos iguais em seguida entram na mesma ação. Gatilhos antigos convertidos no `migrate` e no reducer.
- **Grupo de objetos:** campo no painel da imagem, luz, porta e som; vale para quem entra no grupo depois.
- **`js/anim.js`:** mover, ronda, girar/varrer, opacidade/intensidade, tamanho, cor; curvas; uma vez / ir e voltar / repetir; fica ou volta; modelos prontos. Ações Tocar a do objeto, Animação nova, Parar, Voltar ao início. Animação própria no painel com "Começa sozinha" (pelo relógio, sem estado).
- **Rede:** `anim.start` e `anim.end` (1 mensagem cada), cada tela calcula pelo relógio do mestre (`now` no welcome/state, `clock` a cada 20 s).
- **Área de dano** das imagens: ajustada arrastando no mapa, só em movimento ou sempre, um golpe por passagem, escondida dos jogadores.
- **Tokens:** mover e ronda por gatilho (olham para onde andam e terminam no grid).
- **Teste novo:** `anim.js` (e foto `#shot`). Testes antigos de gatilho ajustados para `ids`.
- **Limitações:** a área de luz (forma "área") só liga e desliga na intensidade (abaixo de 50% apaga); a imagem animada é clicada (selecionar/arrastar) onde está gravada, não onde aparece no meio do movimento; animação que começa sozinha não existe para tokens (só por gatilho); "Tocar" numa animação automática desliga o "começa sozinha" (ela passa a rodar a partir de agora).
