# Plano 72 · Formas num botão só

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Agora vamos trabalhar algumas melhorias de usabilidade, primeiro ponto são as opções de desenho, eu acredito que a gente consegue juntar as formas geometricas com a linha reta do desenhar no tabuleiro e ficar como sub menu"

## Objetivo
A barra de ferramentas fica mais curta: Linha, Retângulo e Círculo viram um botão só, **Formas**. A forma é escolhida no menu desse botão.

## Como funciona hoje
- Na barra da esquerda (`TOOLS` em `js/ui.js`), o desenho tem 5 botões seguidos: Desenho livre (D), Linha (L), Retângulo (B), Círculo (E) e Apagar desenho (X).
- Cada botão abre o seu menu (Plano 38) com Cor e Espessura; o Retângulo e o Círculo têm também Preenchimento.
- A Parede já funciona do jeito pedido: um botão, com "Reta" e "Lápis" no menu.

## Proposta
- **Barra:** Desenho livre · **Formas** · Apagar desenho (de 5 para 3 botões).
- **Botão Formas:** o ícone mostra a última forma usada (linha, quadrado ou círculo). O clique liga a última forma usada; na primeira vez, a Linha.
- **Menu do botão Formas** (no mesmo estilo do menu da Parede):
  - **Linha**, **Retângulo** e **Círculo** no topo, com a escolhida destacada;
  - uma separação;
  - Cor, Espessura e, no Retângulo e no Círculo, Preenchimento (igual a hoje).
- **Atalhos não mudam:** L, B e E escolhem direto a forma (o botão Formas acende).
- **O desenho em si não muda:** nem como se desenha, nem o desenho salvo, nem o que os jogadores veem.
- **Título do botão** (ao passar o mouse): "Formas: linha (L), retângulo (B), círculo (E)".

## Perguntas para o usuário
1. **Desenho livre (lápis):** (a) **continua como botão próprio** (recomendo: é o mais usado e fica a um clique); (b) também entra no menu Formas (a barra fica com 2 botões de desenho).
2. **Apagar desenho:** (a) **continua como botão próprio** (recomendo); (b) vai para o menu Formas.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | `TOOLS`: Linha, Retângulo e Círculo no grupo "Formas" (um botão na barra); menu com a escolha da forma no topo; botão aceso quando qualquer forma está ativa |
| `js/board.js` | guarda a última forma usada (`B.lastShape`) |
| `js/icons.js` | só se faltar um ícone |

## Tutorial, wiki e README
- Passo do tutorial: não há passo que clique em Linha, Retângulo ou Círculo (conferido). O tutorial não muda.
- Wiki: o texto sobre as ferramentas de desenho cita os botões; atualizar quando você der a função por finalizada (combinado).

## Testes
- Barra com 3 botões de desenho; Formas acende com Linha, Retângulo e Círculo.
- O clique no botão liga a última forma; o menu troca a forma e mostra Preenchimento só no Retângulo e no Círculo.
- Atalhos L, B e E; clicar de novo no botão aceso volta para Selecionar (como os outros).
- Desenhar uma linha, um retângulo e um círculo depois da mudança (desenho salvo igual a antes).
- `toolmenu.js` (menus das ferramentas, ajustado), tutorial inteiro (`walk.js`) e menu em tela baixa (`menus.js`) sem erros; 0 processos de teste no fim.

## Respostas do usuário
"Pode implementar": seguiu as recomendações (lápis e Apagar continuam como botões próprios).

## Resultado
Implementado em 23/11/2026.
- `js/ui.js`:
  - Em `TOOLS`, Linha, Retângulo e Círculo ganharam `group: 'shape'`. A barra mostra um botão só (`data-tool="shape"`): o ícone é a última forma usada, ele fica aceso com qualquer forma, o clique liga a última forma e o clique de novo volta para Selecionar.
  - O menu das formas começa com Linha, Retângulo e Círculo e uma separação; depois vêm Cor, Espessura e Preenchimento, como antes.
- `js/board.js`: `B.SHAPES` e `B.lastShape`, gravado no `setTool`.
- O desenho, os atalhos (L, B, E) e o que já estava salvo não mudaram.

**Testes**
- `formas.js` (novo): todos os casos sem erros. Foto do menu conferida.
- `toolmenu.js` (menus de todas as ferramentas) e `menus.js` (tela baixa): sem erros.
- `walk.js`: na primeira rodada, 3 passos com dados não concluíram a tempo. Na segunda passou inteiro. A causa foi o tempo de espera do roteiro diante da fila de dados do Plano 70; a espera subiu de 6 s para 10 s.
- 0 processos de teste no fim.
