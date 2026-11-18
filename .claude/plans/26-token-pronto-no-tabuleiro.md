# Plano 26 · Token pronto no tabuleiro

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Conseguimos fazer um ajuste no tabuleiro? Onde tem dois tipos de imagem, 1 é a imagem e o outro é o token, eu gostaria de quando fosse o token a gente usasse a imagem do token mesmo, já que ela respeita o tamanho e é bem mais acabada."

## Objetivo
Quando a imagem da ficha já é um **token pronto** (com moldura e fundo transparente, como os do 5etools), o tabuleiro desenha a imagem **inteira, do tamanho do quadrado**, sem cortar em círculo e sem o disco e o aro do Vésper por cima.

Imagens comuns (retratos, fotos) continuam como hoje.

## Como funciona hoje
`drawToken` em `js/board.js` desenha todo token do mesmo jeito:
1. um disco colorido com raio de 40% do tamanho, ou seja, 80% do quadrado;
2. a imagem recortada em círculo dentro desse disco (`drawCover`, que corta as sobras);
3. um aro claro por cima.

Num token do 5etools, isso corta a moldura dele, encolhe a imagem e põe um segundo aro em volta.

## Proposta
- **Opção na ficha (Configurar):** **Imagem no tabuleiro**, com duas escolhas:
  - **Retrato:** recortado em círculo, como hoje;
  - **Token pronto:** a imagem inteira.
- **Padrão:**
  - criaturas vindas do bestiário (token do 5etools) entram como **Token pronto**;
  - as demais continuam **Retrato**;
  - o mestre troca quando quiser, inclusive para uma imagem própria que já seja um token.
- **Como o Token pronto é desenhado:**
  - a imagem ocupa o quadrado inteiro do tamanho do token (1×1, 2×2…), sem cortar (proporção mantida), com a sombra no chão;
  - sem disco colorido e sem aro;
  - **continua igual:** o halo de seleção e de turno, o aro tracejado do "vulto" (mestre), o X de caído (0 PV), a placa com o nome e a barra, o voo e as condições, só encostados na borda do quadrado em vez do círculo menor;
  - se a imagem ainda não carregou, aparece o disco com a inicial, como hoje.
- **Fichas que já estão na campanha** (as do bestiário adicionadas antes) passam a ser Token pronto, porque vieram do 5etools.

## Perguntas para o usuário
1. **Tamanho:** o Token pronto ocupa o **quadrado inteiro** (100%)? *Recomendo que sim*, porque é o tamanho que os tokens do 5etools foram feitos para ter. A outra opção é um pouco menor (90%), deixando um respiro entre tokens vizinhos.
2. **Padrão para imagens próprias:** imagens enviadas pelo mestre continuam como Retrato, com a opção de trocar? *Recomendo que sim*, porque a maioria é retrato, não token.

## Respostas do usuário
1. **Tamanho:** sim, o token ocupa o tamanho da ficha (1×1, 2×2…).
2. **Imagens próprias:** continuam Retrato. O mestre troca para Token pronto quando a imagem dele já for um token (feito num site de tokens, por exemplo).

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/board.js` | `drawToken`: modo Token pronto (imagem inteira, halo, X, placa, condições e voo pela borda do quadrado) |
| `js/ui.js` | Configurar → Imagem no tabuleiro |
| `js/bestiary.js` | Fichas do bestiário nascem com `imgStyle: 'token'` |
| `js/store.js` | `migrate`: fichas com `source: '5etools'` sem `imgStyle` viram Token pronto |

## Testes
- Ficha do bestiário desenha a imagem inteira, sem disco nem aro (conferir pelos pixels nos cantos do quadrado).
- Retrato continua recortado.
- Trocar a opção na ficha muda o tabuleiro na hora.
- Seleção, turno, caído, vulto, nome e barra, voo e condições aparecem nos dois modos.
- Tokens 1×1, 2×2 e 3×3.
- Foto de antes e depois.
- Regressão completa, tutorial completo e 0 processos.

## Resultado
- **`drawToken`** (`js/board.js`): com `imgStyle: 'token'` e a imagem carregada, ela é desenhada **inteira**, do tamanho do token (`drawContain`), com uma sombra que segue o desenho, sem disco e sem aro.
  - O raio usado pelo halo, pelo vulto, pela placa, pelo voo e pelas condições passa a ser a borda do quadrado.
  - O X de caído escurece um círculo de 86%.
  - Enquanto a imagem não carrega, aparece o disco com a inicial.
- **Ficha → Configurar → Imagem no tabuleiro:** Retrato (círculo) ou Token pronto (imagem inteira).
- **Padrões:**
  - o bestiário cria com `imgStyle: 'token'`;
  - o `migrate` passa as fichas antigas do 5etools sem a opção para Token pronto;
  - quem escolheu Retrato (`null`) continua Retrato.
- **Teste `tokenpronto.js`:** confere pelos pixels.
  - Token pronto 1×1 e 3×3: canto, centro e borda pintados.
  - Retrato: só o centro.
  - Também confere trocar na ficha e voltar, seleção com condição e o `migrate`.
- **Foto:** com os tokens reais (Tarrasque, Goblin Warrior, Dragão Vermelho Adulto), os chifres do Tarrasque passam da moldura como na arte.
