# Plano 71 · Dados param no centro da tela

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "gostaria que tivesse uma div imaginaria no centro da tela e os dados sempre parassem dentro dessa div, tem horas que o dado para bem no canto da tela ai não da tempo de ver, gostaria do dado sempre cair mais para o meio, mas não exatamente no meio"

## Objetivo
Os dados 3D sempre param dentro de uma área imaginária no meio do mapa. O lugar dentro dela é sorteado: nunca exatamente no centro e nunca no canto da tela.

## Como funciona hoje
- A biblioteca (`dice-box-threejs`) cria uma mesa com quatro paredes invisíveis (`makeWorldBox`), quase na borda da área dos dados: a 93% do caminho do centro até a borda.
- Os dados nascem perto da borda (90%, em `getNotationVectors`), são jogados para dentro e quicam nas paredes. Por isso às vezes param no canto.
- A área dos dados é o mapa inteiro (`#dice3d` cobre o `#board-wrap`).

## Proposta
- **Área imaginária:** um retângulo invisível no centro do mapa. A proposta é **metade da largura e metade da altura** do mapa (ver pergunta). As quatro paredes invisíveis passam para a borda dessa área, então os dados quicam nela e não saem.
- **Lançamento:** os dados nascem na borda da área (não mais na borda da tela), com força proporcional ao tamanho dela. Continuam vindo de um lado sorteado, rolando e quicando como hoje.
- **Não exatamente no meio:** onde cada dado para continua sendo decidido pela física (direção, força, quiques), então a posição muda a cada lance dentro da área.
- **Tamanho dos dados:** não muda.
- **Tela pequena ou barra lateral recolhida:** a área acompanha o tamanho do mapa (sempre a fração escolhida dele).
- **Nada muda** no número, no tempo (até 2 s, Plano 70) nem na rede: cada tela calcula a própria área.
- **Por dentro:** em `js/dice3d.js`, depois de a biblioteca montar a mesa, as paredes vão para a borda da área. O ponto e a força do lançamento são encolhidos na mesma proporção. Nada é alterado no arquivo da biblioteca.

## Perguntas para o usuário
1. **Tamanho da área:** (a) **metade da largura e metade da altura do mapa** (recomendo); (b) menor, 40% (dados mais juntos, às vezes encostando uns nos outros); (c) maior, 60%.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/dice3d.js` | paredes na borda da área central; lançamento a partir dela; recalcula quando o mapa muda de tamanho |

## Tutorial, wiki e README
- Ficam para quando o usuário der os dados 3D por finalizados (combinado).

## Testes
- 30 lances (1, 2, 3 e 8 dados): todo dado parado fica dentro da área (posição de cada dado na tela conferida no fim do lance).
- Os lugares variam: nem todos no centro (espalhamento medido).
- Mapa com a barra da direita recolhida e tela menor: a área acompanha.
- Os números continuam certos e cada lance para em até 2 s.
- Foto com a área desenhada só no teste, para você ver.
- Tutorial inteiro (`walk.js`) e rede sem erros; 0 processos de teste no fim.

## Respostas do usuário
1. **Opção A:** metade da largura e metade da altura do mapa.

## Resultado
Implementado em 23/11/2026, só em `js/dice3d.js`:
- `makeWorldBox` passou a pôr as quatro paredes invisíveis na borda da área central (`AREA = 0.5` da largura e da altura). Como a biblioteca chama `makeWorldBox` quando o mapa muda de tamanho, a área acompanha.
- `getNotationVectors` passou a lançar de 85% do caminho até a borda da área (antes, 90% do caminho até a borda da tela), com 60% da força.
- Nada mudou no arquivo da biblioteca.

**Testes**
- `dados3d.js`: em 30 lances (1, 2, 3 e 8 dados), **101 dados, 0 fora da área**. Na tela, x foi de -0,44 a 0,44 e y de -0,40 a 0,44, sendo que a área vai de -0,5 a 0,5. Espalhamento 0,27 × 0,23; só 2 dados bem no meio. Os lances continuam parando em 1,4 a 1,9 s, e o resultado continua chegando depois do dado.
- Foto com a área desenhada (`#area`): os 8 dados dentro do tracejado.
- Tutorial inteiro (`walk.js`) e rede: sem erros. 0 processos no fim.

**Não testado:** a barra recolhida e uma tela pequena não foram fotografadas. A área usa o mesmo cálculo de tamanho da biblioteca, mas vale você olhar.
