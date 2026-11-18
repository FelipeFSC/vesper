# Plano 14 · Gatilhos

**Status:** Em andamento (só implementação; tutorial, wiki e README depois que o usuário testar e finalizar)
**Versão:** 1.2
**Pedido do usuário:** "Vamos implementar triggers agora, essas triggers vão ligar ou desligar ações no mapa, vamos planificar bem antes de implementar, isso vai deixar o jogo VIVO"

## Objetivo
O mestre prepara o mapa antes da sessão e o mapa **reage sozinho** durante o jogo. Um gatilho tem três partes: **quando** algo acontece (um personagem pisa numa área, alguém puxa uma alavanca), **quem** pode disparar, e **o que** acontece em seguida (a porta bate, a tocha apaga, os goblins aparecem, a armadilha dispara).

## Exemplos que queremos que funcionem
1. **Emboscada:** o grupo entra no salão → a porta atrás **fecha e tranca**, as tochas **apagam**, um **som** de tambor toca e, 1 s depois, os 3 goblins (grupo "Emboscada") **aparecem**.
2. **Armadilha de dardos:** quem pisa na placa faz um **teste de Destreza CD 13**; falhou, leva **2d6** de dano. A armadilha **para o movimento** de quem pisou nela.
3. **Alavanca:** um jogador clica na alavanca (uma imagem no mapa) → a **porta secreta** abre e uma **luz** acende do outro lado.
4. **Sala do tesouro:** entrar na sala **revela a névoa** dela e mostra a **carta** (entrega) "O diário do mago" para quem entrou.
5. **Portal:** pisar no círculo **leva o personagem** para outra cena (ou outro ponto do mapa).
6. **Atmosfera:** sair da floresta **troca a música** e a cor da luz da lua.

## Como funciona hoje (o que dá para reaproveitar)
O mestre é a autoridade: toda ação passa por ele (`Store.dispatch`/`permit`). As ações que um gatilho precisa já existem:

| O que o gatilho faz | O que já existe |
|---|---|
| Porta: abrir, fechar, trancar | `wall.door`, `wall.lock` (Plano 13) |
| Luz: acender, apagar, trocar cor | `lightpt.update` (Plano 8) |
| Token ou grupo: aparecer, sumir, vulto | `token.update`, `group.vis` |
| Som: tocar efeito, ligar som do mapa, trocar música | `App.Audio` (`trigger`, `sound.update`, canais) |
| Entrega: mostrar carta ou imagem | `handouts` + mensagem `handout` (Plano 2) |
| Névoa: revelar ou esconder área | `fog.add` |
| Mensagem no chat | `chat.add` (system) |
| Dano ou teste | `Store.useAction` (resistência, dano, cura, com Desfazer) |
| Levar para outra cena | `playerScenes` (Mover jogadores) |
| Mover token | `token.move` |

Falta só o **gatilho em si**: a área, a detecção e a lista de ações.

## Proposta

### 1. O gatilho no mapa
- Ferramenta nova **Gatilho** (tecla `T`, só o mestre). Formas: **círculo**, **retângulo** ou **polígono** (ponto a ponto, como a área de luz).
- O mestre vê a área com contorno tracejado e um ícone de raio. Os jogadores **não veem nada** (pergunta 5).
- Também pode ser preso a uma **imagem do mapa** (alavanca, baú, estátua): o gatilho dispara quando alguém **clica** na imagem.

### 2. Quando (evento)
| Evento | Exemplo |
|---|---|
| **Entrar** na área | placa de pressão, porta da sala |
| **Sair** da área | sair da floresta, fugir do círculo mágico |
| **Clicar** na imagem ligada | alavanca, baú, botão na parede |
| **Botão do mestre** | o mestre dispara na hora certa, pelo painel |

Na fase 2 (depois): início da rodada, início do turno de quem está na área, porta aberta, vida abaixo de X.

**Passar no meio do caminho:** arrastar o token por cima da área (sem parar nela) também conta como entrar (pergunta 2). Na armadilha com **Parar o movimento**, o token para no primeiro quadrado da área e o resto do caminho é cancelado.

### 3. Quem dispara
- **Personagens do grupo** (padrão), **Criaturas**, **Qualquer token**, ou **tokens escolhidos**.
- Tokens invisíveis e o que o mestre arrasta: opção "o mestre também dispara" (padrão: desligado, para o mestre poder arrumar o mapa sem disparar nada).

### 4. Quantas vezes
- **Uma vez** (padrão), **Sempre**, ou **N vezes**; opção de **tempo de espera** entre disparos.
- Disparado, ele fica **gasto** (cinza para o mestre). O mestre **rearma** com um clique.
- **Ligado/Desligado**: um gatilho pode ficar desligado até outro gatilho ligá-lo (ex.: a alavanca liga a armadilha).

### 5. O que acontece (ações)
Uma **lista em ordem**. Cada ação tem um **atraso** opcional em segundos, para montar a cena (porta bate → 1 s → goblins aparecem).

| Ação | Opções |
|---|---|
| **Porta** | escolher a porta no mapa → Abrir / Fechar / Trancar / Destrancar / Alternar |
| **Luz** | escolher o ponto de luz → Acender / Apagar / Alternar / mudar cor |
| **Token ou grupo** | Aparecer / Sumir / Virar vulto |
| **Som** | tocar efeito, ligar ou desligar um som do mapa, trocar a música (ou parar) |
| **Mensagem** | texto no chat e um aviso na tela, para quem disparou, para todos ou só para o mestre |
| **Mostrar entrega** | escolher uma entrega do painel Mostrar → para quem disparou ou para todos |
| **Névoa** | revelar ou esconder a própria área do gatilho (ou um retângulo) |
| **Armadilha** | teste (atributo + CD) e dano (fórmula, barra), metade se passar; ou só dano; usa o combate automático, com Desfazer |
| **Teletransporte** | levar quem disparou para um ponto deste mapa ou para outra cena |
| **Outro gatilho** | ligar, desligar, rearmar ou disparar outro gatilho |

**Escolher no mapa:** nas ações de porta, luz, token e ponto de destino, o mestre clica em **"Escolher no mapa"** e depois no objeto, em vez de procurar nome numa lista.

### 6. Automático ou com o mestre
- **Automático** (padrão): dispara na hora.
- **Perguntar ao mestre**: aparece para o mestre "Lyra entrou em *Placa de pressão*: disparar?" com **Disparar / Ignorar**. Os jogadores não veem nada até ele decidir.
(Pergunta 3.)

### 7. Painel e lista
- Clicar num gatilho abre o **painel**: nome, Quando, Quem, Quantas vezes, Automático/Perguntar, Ligado, a lista de ações (adicionar, reordenar, atraso, apagar), e os botões **Disparar agora**, **Rearmar**, **Testar** (mostra o que aconteceria, sem fazer), **Duplicar**, **Apagar**.
- Na aba **Camadas**: a lista **Gatilhos da cena**, com o estado de cada um (pronto, gasto, desligado) e o botão de disparar.
- O **chat do mestre** registra cada disparo ("Placa de pressão disparou por Lyra"), e os jogadores só veem as mensagens que o gatilho mandar para eles.

### 8. Regras técnicas
- Quem detecta é **o mestre** (o "servidor"): depois que um `token.move` é aceito, ele confere o caminho contra as áreas e executa as ações. Os jogadores não conseguem disparar nada fora de um movimento ou clique de verdade.
- O gatilho e o estado dele (gasto, contador, ligado) ficam salvos na cena (`sc.triggers`) e vão junto ao exportar.
- Ações com atraso continuam mesmo que alguém mova outro token no meio. Se o mestre recarregar a página no meio de uma sequência, o que faltava não acontece (limitação aceitável).

## Fases
- **Fase 1 (este plano):** ferramenta, formas, eventos Entrar / Sair / Clicar / Botão do mestre, quem dispara, quantas vezes, automático ou perguntar, e as ações da tabela da seção 5, com atraso, Escolher no mapa, painel e lista.
- **Fase 2 (outro plano, se quiser):** eventos de combate (rodada, turno), condições (só se a vida estiver abaixo de X, só se carregar certo item), percepção passiva para notar a armadilha antes, gatilhos visíveis (placa revelada).

## Decisões do usuário
1. **Ações da fase 1:** porta, luz, token/grupo, som, armadilha, névoa, teletransporte e outro gatilho.
   **Sem mensagem e sem entrega:** "o mestre é parte do jogo, ele precisa participar". O gatilho não fala com os jogadores; quem narra é o mestre. Para isso, o mestre recebe um aviso só dele quando um gatilho dispara ("Placa de pressão disparou por Lyra"), para saber a hora de narrar.
2. **Passar por cima conta como entrar**, com a opção "Parar o movimento" por gatilho.
3. **Automático ou perguntar:** escolha por gatilho, Automático como padrão.
4. **Quantas vezes:** cada gatilho escolhe (Uma vez, Sempre, N vezes); o **padrão é Uma vez**. Rearmar tem que ser fácil, porque o mestre vai testar várias vezes: botão **Rearmar** no painel, **Rearmar todos** na lista da cena, e o gatilho gasto continua clicável para rearmar.
5. **O mestre arrastando não dispara** (padrão). Para testar, o mestre usa **Ver como os jogadores**: aí os movimentos dele contam como de jogador e disparam. Também dá para usar **Disparar agora** no painel.
6. **Jogadores não veem a área** na fase 1.

Com isso, a tabela de ações da seção 5 fica sem as linhas Mensagem e Mostrar entrega.

## Perguntas para o usuário
1. **Ações da fase 1:** a tabela da seção 5 está boa, ou falta alguma ação importante?
2. **Passar por cima da área no meio do caminho conta como entrar?** *(Recomendo sim, com a opção "Parar o movimento" por gatilho.)*
3. **Automático ou o mestre confirma?** *(Recomendo escolha por gatilho, com Automático como padrão.)*
4. **Quantas vezes, padrão:** Uma vez ou Sempre? *(Recomendo Uma vez, com o mestre rearmando.)*
5. **Os jogadores veem a área?** *(Recomendo não, nunca, na fase 1.)*
6. **O mestre arrastando tokens dispara gatilhos?** *(Recomendo não por padrão.)*

## Mudanças por arquivo (previsão)
| Arquivo | O que muda |
|---|---|
| `js/store.js` | `sc.triggers` (`newScene`, `migrate`); ações `trigger.add/update/delete/fire/rearm`; detecção depois de `token.move` aceito (no mestre); fila de ações com atraso; armadilha via `useAction`; teletransporte; `permit` (jogador só dispara por movimento ou clique em imagem ligada). |
| `js/triggers.js` (novo) | geometria (dentro, entrou ou saiu pelo caminho, primeiro ponto da área), execução das ações, textos de resumo. |
| `js/board.js` | ferramenta Gatilho (formas, alças, polígono), desenho para o mestre, "Escolher no mapa", clique em imagem ligada, parar o movimento. |
| `js/ui.js` | painel do gatilho (editor de ações), lista na aba Camadas, caixa "disparar?" para o mestre. |
| `index.html` | carregar `js/triggers.js` (depois de `store`, antes de `board`). |
| `css/style.css` | painel e lista. |

## Tutorial, wiki e README
- Tutorial: capítulo novo **Gatilhos**, com um passo prático: criar uma placa na frente da porta que fecha a porta e faz os goblins aparecerem, e ver como os jogadores.
- Wiki: seção "Gatilhos" com os exemplos da seção inicial, a tabela de ações e fotos (mapa do mestre e painel).
- README: "gatilhos: o mapa reage (portas, luzes, sons, emboscadas, armadilhas, teletransporte)".

## Testes
- Cada evento: entrar (parando dentro e passando por cima), sair, clicar na imagem, botão do mestre.
- Quem dispara: grupo, criaturas, escolhidos; o mestre arrastando não dispara.
- Uma vez, sempre, N vezes, espera; rearmar; ligado/desligado por outro gatilho.
- Cada ação (porta, luz, token/grupo, som, mensagem, entrega, névoa, armadilha com Desfazer, teletransporte na cena e para outra cena, outro gatilho) e a ordem com atrasos.
- Perguntar ao mestre: Disparar e Ignorar.
- Parar o movimento na armadilha.
- Pela rede: o jogador não dispara nem altera gatilhos sem se mover; ver como jogador não mostra as áreas.
- Exportar e importar a cena com gatilhos.
- Tutorial completo (`walk.js`) sem erros; `menus.js`; 0 processos de teste.

## Resultado (implementação; falta o usuário testar)
**O que entrou:** tudo da fase 1 com as decisões acima. Ferramenta `T`, painel completo, lista na ferramenta e camada "Gatilhos", caixa "Disparar?" do mestre, Escolher no mapa, Ctrl+D, Delete. Saiu da proposta original o botão "Testar" (mostrar o que aconteceria): usar Disparar agora + Rearmar.

**Testado** (`trig.js`, `trig_view.js` + foto): todos os exemplos do topo (menos mensagem e entrega, que ficaram com o mestre); regressão `door`, `blind`, `lights`, `path`, `cover`, `groups`, `menus` (1280×620) e tutorial completo sem erros; 0 processos.

**Limitações conhecidas**
- Ações com atraso não sobrevivem a recarregar a página do mestre no meio da sequência.
- "Parar o movimento" com "Perguntar antes": o token para na hora, mesmo que o mestre depois clique em Ignorar.
- O jogador vê o resultado da armadilha no chat (como um ataque), com os números conforme a regra "esconder números".
- Teletransporte para outra cena chega no centro do mapa (não dá para escolher o ponto na outra cena).
- Clicar na alavanca não exige estar perto dela, só enxergar.

**Pendente:** tutorial, wiki e README depois que o usuário testar e finalizar.
