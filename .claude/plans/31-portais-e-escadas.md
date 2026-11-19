# Plano 31 · Portais e escadas (teleporte no mapa e para outra cena)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "vamos adicionar 2 novas features, teleporte dentro do tabuleiro ou teleporte para uma sub cena, te mandei 2 exemplos, o trains moving é um exemplo de teleporte dentro da cena mesmo, agora o mountain é o teleporte para outra cena, isso serve para simular escadas ou cenas que se complementam. O jogador vai pisar na área e vai para a outra cena, entende ?"

Exemplos do usuário:
- **Trem:** um mapa só, com o trem cortado em 5 faixas. Quem sai pela ponta de uma faixa aparece no começo da faixa seguinte (teleporte dentro do mapa).
- **Fortaleza na montanha:** duas cenas (andar de cima e de baixo) com o mesmo terreno. Quem pisa na escada vai para a outra cena, no lugar da escada correspondente (teleporte para outra cena).

## Objetivo
O mestre cria um **portal** desenhando uma área no mapa (a escada, a ponta do vagão) e escolhendo para onde ela leva: um ponto do mesmo mapa ou um ponto de outra cena.
Quando um token pisa na área, ele aparece no destino. Se for outra cena, quem controla o token vai junto.

## Como funciona hoje
Já existe, mas escondido dentro dos **gatilhos** (`js/triggers.js`, ação `teleport`):
- **Como se monta:** criar um gatilho, abrir a janela, adicionar a ação "Teletransporte" e escolher o destino. São 4 ou 5 passos para cada escada.
- **Outra cena:** o token chega sempre no **centro do mapa** da outra cena. Não dá para escolher o ponto (para escada isso não serve).
- **Ida e volta:** não existe. Para subir e descer é preciso montar dois gatilhos à mão.
- **Repetição:** o gatilho começa como "uma vez". Uma escada precisa ser "sempre".
- **Chegada:** vários tokens que passam juntos caem **no mesmo quadrado**, um em cima do outro.
- **Câmera:** no teleporte dentro do mesmo mapa (trem), a câmera do jogador não acompanha o token.
- **Mestre arrastando monstros:** gatilho não dispara quando o próprio mestre move o token (`store.js`, `a.by !== this.me.id || !this.gmView()`).

## Proposta
1. **Ferramenta nova "Portal"** na barra (ícone de escada ou de porta mágica, tecla a definir). Por dentro é um gatilho com a ação de teletransporte, então reaproveita o desenho de área, o desfazer, o exportar e o botão direito. O mestre vê um painel simples, sem a janela de gatilho:
   - **Área de entrada:** retângulo, círculo ou polígono, igual ao gatilho.
   - **Destino:** "Neste mapa" ou uma cena da lista. Depois, **Escolher no mapa**: se for outra cena, a tela do mestre vai para lá, ele clica no ponto e volta sozinha.
   - **Ida e volta** (ver pergunta 2): cria junto o portal de volta no destino, ligado a este. Apagar ou mover um avisa o outro.
   - **Quem passa:** qualquer token (padrão), só o grupo, só criaturas.
   - **Ligado/Desligado** (ex.: escada bloqueada até achar a chave).
2. **Arrumar o teletransporte** (vale também para o gatilho comum):
   - Outra cena: chega no **ponto escolhido**, não mais no centro.
   - Vários tokens juntos: cada um vai para o **quadrado livre mais perto** do destino.
   - Quem chega **não dispara** o portal de volta na mesma hora (senão ficaria indo e voltando). Para voltar, sai da área e pisa de novo.
   - Teletransporte no mesmo mapa: a **câmera de quem controla** o token vai junto.
   - Um efeito rápido de brilho na saída e na chegada, para todos que veem.
3. **Outra cena:**
   - Quem controla o token vai para a cena de destino. Quem não passou fica onde está (o sistema de cenas separadas, Plano "Separar jogadores", já existe).
   - O mestre recebe um aviso: "Lyra desceu para Andar de baixo", com o botão **Ir para lá**.
4. **No mapa:**
   - Mestre: área com contorno (cor própria, diferente do rosa do gatilho), ícone de portal e uma seta para o destino quando selecionado.
   - Jogador: não vê nada (a arte do mapa já mostra a escada). Ver pergunta 4.

## Perguntas para o usuário
1. **Ferramenta separada "Portal"** (recomendo: simples, 2 passos) ou só melhorar o teletransporte dentro do gatilho?
2. **Ida e volta:** já vem ligado ao criar (recomendo **sim** para outra cena, porque escada sempre tem volta; **não** para o mesmo mapa, porque o trem só anda para frente)?
3. **Monstros do mestre:** quando o mestre arrasta um monstro para dentro do portal, ele também passa? Recomendo **sim** só para portais (os outros gatilhos continuam sem disparar com o mestre).
4. **Jogadores veem o portal?** Recomendo **não** por padrão, com a opção "Mostrar aos jogadores" (um brilho suave na área) para portais mágicos que não estão desenhados no mapa.
5. **Outra cena, o resto do grupo:** fica onde está até ir também (recomendo), ou o grupo inteiro vai junto quando o primeiro passa?

## Sub-cenas (pedido junto com as respostas)
"Como a ferramente já tem, só vamos mover e melhorar ela, vamos adicionar a opção de sub cena também, hoje só tem cenas principais."

- **O que é:** uma cena "filha" de uma cena principal (ex.: "Fortaleza" → "Andar de baixo", "Torre"). Funciona igual a qualquer cena (mapa, paredes, luz, Ativar, Mover jogadores), só fica **agrupada embaixo da principal** na lista. Um nível só (sub-cena não tem sub-cena).
- **Criar:** botão **"Nova sub-cena"** em cada cena principal. Ela nasce igual a uma cena nova e abre a configuração (o mestre põe mapa se quiser).
- **Lista de cenas:** a principal mostra quantas sub-cenas tem e uma setinha para recolher ou abrir; as sub-cenas aparecem recuadas embaixo, com as bolinhas de quem está nelas.
- **Portal:** no destino, as sub-cenas da mesma principal aparecem primeiro ("Andar de baixo (sub-cena)"), depois as outras cenas.
- **Dados:** `sc.parent = id da principal` (`js/store.js`, `migrate()` limpa pai que não existe mais). A ordem continua em `sceneOrder`.

## Decisões do usuário
1. "vamos adicioanar uma nova opção portal, eu acho melhor." → ferramenta separada **Portal**; o teletransporte sai da lista de ações do gatilho e passa para o portal (gatilhos antigos com teletransporte viram portais).
2. Ida e volta: ligado ao criar para outra cena, **com opção de tirar** ("vai que é uma armadilha").
3. Monstro arrastado pelo mestre passa pelo portal: sim.
4. Jogadores não veem o portal: "Não, não tem por que mostrar." (sem a opção "Mostrar aos jogadores").
5. Outra cena: "O resto do grupo fica onde está, é individual."
6. Sub-cena: "Começa igual uma cena, o mestre decide se já vai colocar mapa ou não, não vamos criar uma ferramenta nova, vamos criar uma categoria nova." → nasce como uma cena nova comum (mesmo padrão de "Nova cena"); sub-cena é só uma categoria na lista.
7. Apagar a principal: perguntar "apagar tudo" ou "manter" (as sub-cenas viram cenas principais).
8. Exportar a principal leva as sub-cenas e os portais: sim.

## Perguntas sobre as sub-cenas
6. A sub-cena nova começa **sem mapa** (mesmo tamanho e grade da principal) e você envia o mapa dela (recomendo), ou começa como **cópia** da principal (mesmo mapa e paredes) para você ajustar?
7. **Apagar a principal:** as sub-cenas viram cenas principais (recomendo, para não perder nada sem querer) ou são apagadas junto?
8. **Exportar a principal** leva as sub-cenas e os portais entre elas junto (recomendo sim)?

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/triggers.js` | `teleport()`: ponto na outra cena, quadrado livre mais perto, não dispara na chegada, efeito; portal = gatilho com `portal: { link }`, "sempre" |
| `js/store.js` | `permit`/`migrate` do portal; mestre dispara portal com o próprio arraste (pergunta 3) |
| `js/board.js` | ferramenta `portal` (desenho igual ao gatilho), desenho da área e da seta, escolher o ponto em outra cena, câmera seguindo o token |
| `js/ui.js` | botão na barra, painel do portal, opções da ferramenta (forma da área), aviso com "Ir para lá" |
| `js/ctxmenu.js` | botão direito no portal: Configurar, Ir para o destino, Ligar/Desligar, Apagar |
| `js/history.js` | nome no desfazer: "portal" |
| `js/ui.js` (cenas) | lista agrupada, "Nova sub-cena", recolher; destino do portal agrupado |
| `js/storage.js` | exportar/importar a principal com as sub-cenas |

## Tutorial, wiki e README
Depois que você finalizar: passo "Portais e escadas" no capítulo de Cenas, seção na wiki com o exemplo do trem e da escada, linha no README.

## Testes
- Mesmo mapa (trem): token entra na ponta da faixa 1 e aparece no começo da faixa 2; a câmera do jogador vai junto; o rastro não liga a ponta ao destino.
- Outra cena (escada): chega no ponto escolhido; quem controla vai para a cena; o mestre recebe o aviso.
- Ida e volta: subir e descer; quem chega não volta sozinho; sair e pisar de novo volta.
- Três tokens juntos: cada um num quadrado livre.
- Portal desligado não leva; "só o grupo" não leva goblin.
- Desfazer, exportar a cena e o botão direito.
- `trig.js`, `trig_ux.js`, `walk.js` sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Ferramenta Portal** (tecla K, ícone de brilho), logo depois do Gatilho. Área em retângulo (um clique = 1 quadrado), círculo ou polígono. Por dentro é um gatilho com `portal: true`, "sempre", "qualquer token" e uma ação de teletransporte.
- **Painel do portal:** nome, **Leva para** (Neste mapa, as sub-cenas da mesma principal primeiro, depois as outras cenas), **Escolher no mapa** (em outra cena a tela do mestre vai para lá, ele clica e volta com o portal selecionado), **Ida e volta**, **Quem passa**, **Ligado**, **Ir para o destino** e Apagar. Clicar no marcador do portal abre o painel (não a janela do gatilho).
- **Ida e volta:** escolher outra cena já cria o portal de volta (1 quadrado no ponto de chegada); dá para tirar (armadilha). Os dois ficam ligados por `portalId`: a chegada é o centro do portal do outro lado, e "Escolher no mapa" move o portal de volta.
- **Teletransporte melhor** (vale também para gatilhos antigos com teletransporte): chega no ponto escolhido também em outra cena; vários tokens juntos vão para quadrados livres; quem chega não volta sozinho (precisa sair e pisar de novo); brilho azul na saída e na chegada; a câmera de quem controla vai junto (o mestre, quando foi ele que arrastou).
- **Outra cena:** quem controla o token vai para a cena de destino; o resto do grupo fica onde está. O mestre recebe o aviso "Lyra foi para …" com o botão **Ir para lá**.
- **Mestre arrastando monstro** passa pelo portal (os outros gatilhos continuam sem disparar com o mestre).
- **Mapa:** portal em azul (gatilho continua rosa), anel no marcador, nome com "→ cena" e "ida e volta"; selecionado mostra a linha até o destino no mesmo mapa. Jogador não vê nada.
- **Menu do botão direito:** no portal (Configurar, Ir para o destino, Ida e volta, Ligar/Desligar, Apagar) e "Portal aqui" no mapa vazio.
- **Gatilho:** "Teletransporte" saiu da lista de ações. Campanhas antigas: gatilho que só teletransporta vira portal.
- **Sub-cenas:** botão "Nova sub-cena" em cada cena principal (nasce igual a uma cena nova). Na lista ficam recuadas embaixo da principal, com seta para recolher. Subir troca só entre irmãs. Apagar a principal pergunta: Apagar tudo ou Manter as sub-cenas (viram principais). Exportar a principal leva as sub-cenas; importar recria as duas e os portais apontam para as cópias.

**Testado** (`portal.js`, `portal_shot.js`, regressão)
- Ferramenta, tecla K, opções só com a forma; clique cria portal de 1 quadrado com "qualquer token" e "sempre".
- Mesmo mapa: escolher o ponto, jogador entra e chega no ponto; brilho na saída e na chegada; o rastro termina na ponta.
- Três tokens juntos: (2, 6) (1, 6) (2, 5). Desligado não leva; "só o grupo" não leva goblin; mestre arrastando o goblin leva, e a câmera dele vai junto.
- Sub-cena pela lista (recuada, "1 sub-cena" na principal). Destino na sub-cena cria a volta; escolher o ponto lá move a volta e a tela volta com o portal selecionado.
- Escada: Lyra chega em (5, 5) da sub-cena, o jogador vai junto, aviso com "Ir para lá"; não volta sozinha; sair e pisar de novo volta. Tirar a volta apaga o outro lado e mantém o destino.
- Menu do portal, "Portal aqui", ações do gatilho sem Teletransporte, campanha antiga, exportar/importar com sub-cena, apagar com as duas escolhas.
- `trig.js`, `trig_ux.js`, `ctxmenu.js`, `pscene.js`, `shareruler.js`, `path.js` e o tutorial completo (`walk.js`) sem erros; 0 processos.

**Ajuste (pedido do usuário: "não gostei do efeito, deixa a opção de desabilitar o efeito"):** opção "Efeito de brilho ao passar" no painel de cada portal (ligada por padrão; `tr.fx === false` desliga). Desligada, o token só aparece no destino; a câmera continua indo junto. Num portal com ida e volta, vale para os dois lados, e a volta nova nasce com o mesmo ajuste. Testado em `portal.js` (0 brilhos com o efeito desligado).

**Pendente (depois que o usuário finalizar):** passo do tutorial "Portais e escadas" (capítulo Cenas), seção da wiki (exemplo do trem e da escada), linha do README; o passo/wiki de gatilhos que ainda citam o teletransporte.
