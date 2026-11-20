# Plano 39 · A luz e a visão só mudam quando o token é solto

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "quando o jogador mover o token a luz não ir junto, a luz só vai depois que ele soltar a peça, por que hoje o jogador pode simplesmente sair movimentando o token e ninguém ver ele passando no mapa todo e ele vai conseguir ver tudo antes da hora, já nesse modelo não, ele consegue mover normal, mas andar no escuro vai ser um risco."

Print: o token arrastado para a porta, no escuro; a luz deveria continuar onde o token estava.

## Como funciona hoje
- Durante o arraste, `posOf(t)` (`js/board.js`) devolve a posição do arraste, e ela é usada para tudo: desenhar o token, a luz que o token carrega e de onde ele enxerga (`App.Light.render`, `pointVisible`, portas e dicas de parede).
- Resultado: o jogador "passeia" com o token pelo mapa sem soltar e vê tudo, sem que ninguém veja ele andando.

## Proposta
1. Durante o arraste, a **luz do token e a visão** ficam na **posição onde ele estava** (a última posição solta). O token em si continua acompanhando o mouse, normalmente.
2. Ao **soltar**, o token vai para o destino e a luz e a visão vão junto, como hoje.
3. Vale também para os outros que veem o arraste ao vivo (regra "Em tempo real"): a luz do token só muda quando ele é solto.
4. O que é revelado ao explorar (névoa de memória) já usa só a posição solta; não muda.

## Perguntas para o usuário
1. **O mestre** arrastando um token (um NPC com tocha, por exemplo): a luz também fica parada até soltar (recomendo, fica igual para todos e o mestre vê o mapa inteiro de qualquer jeito), ou para o mestre a luz acompanha o arraste?

## Decisões do usuário
- "vamos deixar as duas opções, na opção performace o jogador só vai ver depois de soltar o token, agora na opção tempo real, continua normal, mas todo mundo vai ver ele se movendo." → segue a regra que já existe em Mesa → Regras, "Régua e movimento dos outros":
  - **Desempenho:** durante o arraste a luz e a visão ficam onde o token estava; mudam ao soltar;
  - **Em tempo real:** a luz e a visão acompanham o arraste (como antes) e todos veem o token se movendo.
- A regra vale igual para o mestre (a pergunta 1 ficou resolvida pela regra da mesa).

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/board.js` | uma função de posição "solta" para luz e visão (`App.Light.render`, `pointVisible`, portas, dicas de parede); o desenho do token continua com a posição do arraste |

## Testes
- Jogador arrasta o token para o escuro sem soltar: a área nova continua escura e o token inimigo ali não aparece (por pixels); ao soltar, a luz vai junto e o inimigo aparece.
- A tocha do token não sai do lugar durante o arraste.
- `blind.js`, `lights.js`, `path.js`, `shareruler.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- `lightPos(t)` em `js/board.js`: no modo Desempenho, durante o arraste, devolve a posição solta; no Em tempo real, a do arraste. Usada na luz (`App.Light.render`), na visão dos outros tokens (`pointVisible`), nas portas, nas dicas de parede, nos marcadores de portal e no clique em imagem com gatilho. O desenho do token continua seguindo o mouse.
- O título da opção em Mesa → Regras explica o efeito na luz.
- Ajuste pedido depois ("a regra do tempo real agora é para a ficha, hoje só mostra a régua"): em Em tempo real, quem vê o arraste de outra pessoa vê o **próprio token andando** (não só a linha do caminho), com a luz junto. `posOf` usa o último ponto do arraste recebido (`B.remote`, tipo drag, ainda não solto); ao soltar ou cancelar volta para a posição salva. `drawToken` passou a usar `posOf`.
- A tela escura ao arrastar através de uma parede (Plano 11) continua valendo nos dois modos.

**Testado** (`lightdrag.js`, regressão)
- Desempenho, arrastando até o goblin no escuro sem soltar: o chão antigo continua iluminado (258), o novo escuro (0), goblin invisível, token acompanha o mouse. Soltou: a luz foi junto e o goblin apareceu.
- Em tempo real: a luz acompanha o arraste e o goblin aparece antes de soltar.
- Arraste de outra pessoa em tempo real: o token aparece em 6 e depois em 11 (posição salva continua 2), a luz vai junto e o goblin aparece; ao soltar fica em 11; cancelar volta para a posição salva.
- `groups`, `props`, `portal`, `blind`, `lights`, `path`, `shareruler`, `high`, `eye`, `fly`, `party`, `nofile` e o tutorial completo sem erros; 0 processos.
