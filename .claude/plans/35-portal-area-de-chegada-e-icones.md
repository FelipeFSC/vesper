# Plano 35 · Portal: área de chegada desenhada e marcador para os jogadores

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "agora vamos melhorar o teleporte, hoje o outro lado é só um circulo, não gostei muito dessa ideia, entendi o ponto de mostrar exatamente onde o jogador vai ir, mas se eu selecionar uma área, o jogador deve ir para dentro daquela área aleatoriamente. Nesse exemplo eu gostaria de ter um regangulo dos 2 lados, mas não estou sendo litera, é um exemplo, o que eu quero é ter a opção de desenhar dos 2 lados, tanto circulo, quadrado ou poligono. Segundo ponto icones demonstativos, esse é opcional e o mestre pode trocar o icone ou o sistema vai colocar o icone proprio de ponto de teleporte, eu gosto muito do estilo final fantasy 12, mandei um segundo print, onde mostra tipo um pontilhado e no meio o icone, mandei mais um exemplo, vai ter os incones default, porta, escada subindo, escada descendo ou portal, mas o jogador pode trocar o icone."

Prints: (1) portal com círculo de um lado e retângulo do outro; (2) a passagem de zona no estilo de um RPG de console (linha de pontos brilhantes no chão e o nome da área no meio); (3) esboço do usuário: linha vermelha pontilhada na passagem com um ícone no meio.

## Objetivo
1. **Os dois lados do portal são áreas desenhadas** (círculo, retângulo ou polígono). Quem passa cai num **lugar livre sorteado dentro da área** do outro lado.
2. **Marcador opcional para os jogadores:** um pontilhado brilhante na área e um ícone no meio (porta, escada subindo, escada descendo, portal), que o mestre pode trocar.

## Como funciona hoje (Plano 31)
- A entrada é desenhada; o outro lado (ida e volta) é criado sozinho como **círculo de 1 quadrado** no ponto escolhido (`T.linkPortal`).
- A chegada é o **centro** do portal do outro lado (`T.portalDest`), ou o quadrado livre mais perto (`T.freeSpot`).
- Os jogadores não veem nada (decisão do Plano 31, que agora vira opção).

## Proposta
### 1. Desenhar a chegada
- No painel do portal, **"Escolher no mapa"** vira **"Desenhar a chegada"**: a forma da área (Retângulo, Círculo, Polígono) e o desenho igual ao da entrada. Em outra cena, a tela vai para lá e volta depois, como hoje.
- **Com ida e volta:** a área desenhada é o portal de volta (os dois lados são portais com forma livre). Sem volta: é só a área de chegada (guardada no próprio portal, `act.area`).
- O lado de chegada pode ser editado como qualquer portal (arrastar, mudar o raio, trocar a forma desenhando de novo).
- **Chegada sorteada:** cada token vai para um quadrado livre **sorteado dentro da área**; vários juntos não repetem quadrado. Área pequena demais (todos ocupados): o quadrado livre mais perto, como hoje.
- Portais antigos (ponto ou círculo de 1 quadrado) continuam funcionando.

### 2. Marcador para os jogadores (opcional, por portal)
- **"Mostrar aos jogadores"** (desligado por padrão). Ligado, os jogadores veem:
  - **pontilhado brilhante** na borda da área (pontos de luz que piscam devagar, na cor escolhida);
  - **ícone no meio**, numa bolinha; com o mouse em cima, o **nome** do portal (ex.: "Andar de baixo").
- **Ícones prontos:** Portal (padrão), Porta, Escada subindo, Escada descendo; mais alguns úteis (Seta, Saída, Caverna, Barco). **Trocar ícone:** escolher outro da lista ou **enviar uma imagem** do computador.
- **Ida e volta:** o outro lado ganha o par certo (escada subindo ↔ escada descendo; porta ↔ porta; portal ↔ portal).
- **Cor** do pontilhado: escolhida pelo mestre (padrão azul).
- O marcador respeita a visão: o jogador só vê o que o token dele enxerga (luz, paredes, névoa).

## Perguntas para o usuário
1. **Pontilhado:** na **borda inteira da área** (recomendo; funciona para círculo, retângulo e polígono) ou só uma linha atravessando a passagem, como no print do jogo?
2. **Nome do portal:** aparecer **com o mouse em cima** (recomendo, para não poluir o mapa) ou sempre escrito embaixo do ícone, como no print?
3. **Ícone próprio:** a lista pronta **mais enviar uma imagem** (recomendo), ou só a lista?
4. **Visão:** o marcador só aparece onde o jogador enxerga (recomendo), ou aparece sempre, mesmo no escuro e atrás da névoa?

## Decisões do usuário
1. "Eu acho muito interessante o mestre decidir, se ele vai adicionar a linha e configurar em que ponto a linha fica, ou se a linha vai preencher a área" → estilo do marcador: **Linha** (o mestre desenha onde ela fica) ou **Área** (o pontilhado preenche a área).
2. Nome: opcional, o mestre escreve (vazio = sem nome); aparece com o mouse em cima.
3. Ícone: lista própria e enviar imagem.
4. Visão: "só o que ele consegue ver" (sem spoiler do mapa).

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/triggers.js` | `portalDest` devolve a área; `freeSpot` sorteia dentro da área; `linkPortal` cria a volta com a forma desenhada; par de ícones na volta |
| `js/board.js` | "Desenhar a chegada" (inclusive em outra cena); desenho do marcador para os jogadores (pontilhado animado + ícone + nome com o mouse em cima), respeitando a visão |
| `js/ui.js` | painel do portal: Desenhar a chegada, Mostrar aos jogadores, ícone (lista + enviar imagem), cor |
| `js/net.js` | portal com "Mostrar aos jogadores" vai para os jogadores só com o que o marcador precisa (forma, ícone, cor, nome) |
| `js/icons.js` | ícones novos (escada subindo, escada descendo, saída, caverna, barco) |

## Tutorial, wiki e README
Depois que o usuário finalizar: atualizar o passo e a seção de portais.

## Testes
- Retângulo nos dois lados: 10 passagens caem em quadrados sorteados dentro da área de chegada; 3 juntos não repetem.
- Círculo e polígono na chegada; outra cena com "Desenhar a chegada" lá.
- Marcador: jogador vê com "Mostrar aos jogadores" e não vê sem; não vê no escuro/atrás da parede; ícone trocado e imagem enviada; par de ícones na volta.
- `portal.js`, `trig.js`, `walk.js` sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Desenhar a chegada** (no lugar de "Escolher no mapa"): a ferramenta Portal fica ativa e o próximo desenho (Retângulo, Círculo ou Polígono) vira a área de chegada; em outra cena a tela vai para lá e volta com o portal selecionado; Esc cancela.
  - Com ida e volta, a área desenhada é o próprio portal de volta (a volta já nasce com a forma, se a área foi desenhada antes de ligar a volta). Sem volta, fica guardada no portal (`act.area`).
- **Chegada sorteada:** cada token vai para um quadrado livre sorteado dentro da área (`T.freeSpotIn`); vários juntos não repetem. O painel diz quantos quadrados a área tem. Portais antigos (só um ponto) continuam iguais.
- **Para os jogadores** (por portal, desligado por padrão; vale para a volta também, com o ícone par):
  - estilo **Área** (pontilhado brilhante na borda e um véu leve por dentro) ou **Linha** (dois cliques, encaixa no meio-quadrado);
  - **ícone** no meio, numa bolinha: Portal, Porta, Escada subindo, Escada descendo, Seta, Saída, Caverna, Barco, ou **imagem enviada**;
  - **cor** e **nome** opcional (aparece com o mouse em cima do ícone).
  - Os pontos piscam devagar (o mapa redesenha ~8 vezes por segundo enquanto há marcador na cena).
  - **Visão:** o marcador fica embaixo dos tokens e da escuridão e névoa, então o jogador só vê o que o token dele enxerga; o nome só aparece se o ponto estiver à vista.
- Ícones novos em `js/icons.js`: saída, seta, caverna, barco (Lucide) e **escada subindo / descendo** (o Lucide não tem escada: desenhadas no mesmo estilo).

**Testado** (`portal2.js`, foto `portal2.js#shot`, regressão)
- Chegada desenhada (retângulo 3×2 = 6 quadrados) sem criar outro portal; 10 passagens: 10 dentro da área, 5 quadrados diferentes; 3 juntos diferentes.
- Ida e volta: a volta nasce retângulo; voltar cai na entrada. Outra cena: a tela foi e voltou; a volta virou círculo de raio 1,5. Esc cancela e volta.
- Marcador: desligado por padrão; ligar liga a volta com "escada descendo"; 8 ícones + enviar imagem; nome. Visão do jogador (pixels do ícone): com luz 396, no escuro 0, desligado 0. Linha por dois cliques. Portal antigo de um ponto continua levando ao ponto.
- `portal.js`, `trig.js`, `ctxmenu.js` e o tutorial completo sem erros; 0 processos.
