# Plano 77 · Token 3D: abertura em relógio e molduras Vermelho e Branco

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Perfeito, só um favor, deixa a gente escolher a área do efeito da borda, hoje está na metade fixo, deixa a gente escolhe como se fosse um relogio, sabe ? escolhe abrindo a borda e também deixa um efeito de cor mais proximo do fixo na borda, eu tentei deixar uma borda vermelha mas nanhuma ficava vermelha 100% sempre tinha um efeito atrapalhando, não precisa remover, só adicionar esses 2 ai por favor, o vermelho é o mais usado pela comunidade e o branco que mandei vai pegar melhor as cores que a pessoa escolher."

Duas imagens de referência: (1) moldura **vermelha**, com o dourado claro no canto de cima à esquerda indo para o laranja e um vermelho escuro embaixo, com textura de metal manchado; (2) moldura **branca** lisa, com um leve brilho prateado.

## Objetivo
1. No Token 3D, a pessoa escolhe **por qual parte da moldura** o personagem sai, como os ponteiros de um relógio: "das 9h às 3h" (a metade de cima, como hoje), "das 10h às 2h" (só o alto), "das 7h às 5h" (quase tudo).
2. Dois estilos novos de moldura: **Vermelho** (o mais usado pela comunidade) e **Branco**. No Branco, a cor escolhida sai **pura**, igual à que foi escolhida, mantendo só um relevo leve.

## Como funciona hoje (Plano 76)
- `js/token3d.js`, `compose`: o personagem passa por cima da moldura **da metade para cima**, com uma passagem suave perto do meio (máscara horizontal fixa).
- Molduras: Pedra, Ouro, Prata, Madeira e Sem moldura. A cor escolhida tinge a moldura com o modo "color" a 75%, por cima do relevo e da luz. Por isso nenhuma fica com a cor 100%.

## Proposta
### Abertura em relógio
- Na janela, nova seção **Por onde sai da moldura**, com um **relógio pequeno** (um círculo com as horas 12, 3, 6 e 9):
  - o **arco aceso** mostra a parte da moldura por onde o personagem sai;
  - duas **bolinhas** nas pontas do arco: arraste cada uma pelo relógio para abrir ou fechar a borda (de meia em meia hora);
  - embaixo, o texto "Das 9h às 3h";
  - **atalhos:** "Metade de cima" (9h–3h, o padrão de hoje), "Só o alto" (10h–2h) e "Quase tudo" (7h–5h).
- **No token:** o personagem fica por cima da moldura e do lado de fora do círculo **só dentro dessa fatia** (como uma fatia de pizza a partir do centro). Fora dela, a moldura fica na frente, como hoje embaixo. As pontas da fatia têm uma passagem suave de poucos graus, para não aparecer um corte reto.
- A prévia da janela atualiza na hora. A escolha fica guardada em `token3d` (`popFrom`, `popTo`, em horas).
- Tokens 3D já montados continuam iguais. Ao reabrir, o relógio começa em 9h–3h.

### Molduras novas
- **Vermelho:** degradê como na referência: dourado claro no alto à esquerda, laranja e vermelho escuro embaixo à direita, com relevo e textura manchada de metal. Aceita a cor escolhida como as outras.
- **Branco:** branco liso com brilho prateado leve. Com uma cor escolhida, a moldura fica **naquela cor exata**: o branco vira a cor e só sobram o relevo e o brilho, bem leves.
- Os estilos de hoje não mudam.

## Perguntas para o usuário
1. **Padrão do relógio ao montar um token novo:** (a) **9h às 3h** (recomendo, é o de hoje); (b) outro horário de sua preferência.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/token3d.js` | máscara em fatia (`popFrom`/`popTo`); relógio na janela com arrastar e atalhos; estilos Vermelho e Branco; cor pura no Branco |
| `css/style.css` | relógio da janela |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Pelos pixels do token: com 9h–3h o cabelo sai em cima e o corpo fica atrás da moldura embaixo; com 10h–2h, uma asa às 9h fica atrás da moldura; com 7h–5h, sai quase tudo.
- Arrastar as bolinhas do relógio muda o texto e o token; os atalhos funcionam; reabrir traz o horário.
- Moldura Branca + vermelho escolhido: os pixels do aro saem próximos do vermelho escolhido. Moldura Vermelho sem cor: dourado em cima e vermelho embaixo.
- Foto da janela com o relógio e das duas molduras novas, para você aprovar.
- `token3d.js` (ampliado), `imagens.js`, `walk.js` sem erros; 0 processos de teste no fim.

## Resposta do usuário
"Perfeito, pode fazer": padrão 9h às 3h.

## Resultado
Implementado em 24/11/2026, só em `js/token3d.js` (mais o CSS do relógio).
- **Fatia do relógio:** `token3d.popFrom` / `popTo` (horas, padrão 9 e 3). O personagem passa por cima da moldura só dentro da fatia: máscara em cone a partir do centro (`createConicGradient`), com passagem suave de 15 minutos nas pontas. Horários iguais = a volta inteira. Tokens antigos abrem com 9h–3h.
- **Relógio na janela:** SVG com 12, 3, 6 e 9; o arco aceso; duas bolinhas para arrastar (de meia em meia hora); o texto "Das 9h às 3h"; atalhos "Metade de cima", "Só o alto" e "Quase tudo".
- **Moldura Vermelho:** degradê na diagonal (dourado claro → laranja → vermelho escuro), relevo de luz e sombra com brilho fraco (para não desbotar) e manchas de metal.
- **Moldura Branco:** a cor escolhida, ou o branco, chapada, com relevo e luz leves. Medido: com vermelho #ff0000 o aro saiu 246,38,38. Com a Pedra tingida, o jeito antigo, sairia 226,178,176.
- Os outros estilos e a tinta deles não mudaram.

**Testes**
- `token3d_relogio.js` (novo): todos os casos sem erros. Fotos do relógio e das molduras conferidas.
- `token3d.js` e `imagens.js`: sem erros.
- `walk.js`: os passos 14 (bola de fogo) e 16 (poção) não concluíram numa rodada e passaram na seguinte. Esse problema intermitente já aparecia desde o Plano 70 e não tem relação com este plano.
  - O registro mostrou que, quando falha, a bola de fogo nem chega ao chat.
  - A hipótese "o resultado atrasado do ataque cancela a mira" foi testada à parte e **descartada** (a mira continua).
  - A causa segue em aberto. O `walk.js` agora registra os avisos e o estado da fila nesse passo, para a próxima investigação.
- 0 processos no fim.
