# Plano 76 · Montar token 3D

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "a gente consegue criar token com efeito 3D dentro do sistema ? te mandei um exemplo" → "Legal, prefiro a opção 1, monta o plan para mim por favor, ai fica como terceira opção, montar token 3d"

Exemplo mandado pelo usuário: o personagem dentro de uma moldura redonda de pedra, com a cabeça, o cabelo e o corvo **saindo por cima da moldura**. A parte de baixo do corpo fica dentro do círculo.

Opção escolhida (entre as três explicadas): **a pessoa envia a arte já sem fundo (PNG transparente)** e o sistema monta o token. Remover o fundo automaticamente fica para depois, se um dia quiser.

## Objetivo
O token ganha uma terceira forma de ser criado, ao lado de **Enviar token** e **Recortar da imagem**: **Montar token 3D**. A pessoa envia o personagem sem fundo, escolhe o fundo e a moldura e posiciona o personagem. O sistema gera um token em que a parte de cima do personagem sai por cima da moldura.

## Como funciona hoje
- O token é a imagem `a.img`, desenhada no mapa de dois jeitos (`a.imgStyle`): recortada em círculo com o aro do Vésper (Retrato) ou inteira, do tamanho do quadrado (Token pronto). Ver Planos 26, 74 e 75.
- Configurar → Imagens tem, na linha do token: **Recortar da imagem**, **Enviar token** e **Remover**. A página "Criar ficha" tem o mesmo.
- Nenhuma imagem passa do tamanho do quadrado no mapa.

## Proposta

### Onde fica
- Configurar → Imagens, na linha do token: o botão **Montar token 3D** (ícone de camadas), ao lado de Recortar e Enviar. O mesmo na página "Criar ficha".

### A janela "Montar token 3D"
- **Prévia grande** do token pronto, sobre um quadrado do mapa, para ver o tamanho real e o quanto sai por cima.
- **Personagem (sem fundo):** botão para enviar um PNG com fundo transparente. Se a imagem do personagem (Plano 74) já não tiver fundo, ela aparece como sugestão. Se o arquivo não tiver transparência, um aviso explica que o efeito precisa de uma imagem sem fundo (o resto funciona, mas o personagem não sai da moldura).
- **Posicionar:** arrastar o personagem e mudar o tamanho com a barra ou a roda do mouse, como no recorte do Plano 74.
- **Fundo dentro do círculo** (ver pergunta 1):
  - **Imagem do personagem** (a arte com fundo, quando houver), posicionada por trás;
  - **Cor**, com um degradê suave para dar profundidade;
  - **Outra imagem** enviada só para o fundo.
- **Moldura:** 4 estilos feitos pelo próprio sistema (desenho, não imagem pronta): **Pedra**, **Ouro**, **Prata** e **Madeira**, mais **Sem moldura**. Também a **espessura** (fina, média, grossa) e a **cor** (para tingir o estilo).
- **Como o efeito é montado** (o mesmo cálculo para qualquer imagem):
  1. o fundo, recortado no círculo;
  2. a moldura;
  3. o personagem por cima: **dentro do círculo da metade para baixo** e **livre da metade para cima**. Assim a cabeça, o cabelo ou asas saem pela borda de cima e pelos lados de cima, e as pernas e a parte de baixo ficam dentro;
  4. uma sombra suave do personagem sobre a moldura, para parecer que ele está na frente dela.
- **Botões:** Cancelar e **Usar este token**.

### O que é gravado
- O token gerado vira a imagem do token (`a.img`), em WebP com transparência, **512 px de largura e até 640 px de altura**: o círculo ocupa o quadrado e sobra até 25% em cima para o que sai da moldura.
- O jeito de desenhar passa a ser **Token 3D** (`imgStyle: 'pop'`).
- As escolhas (personagem, posição, tamanho, fundo, moldura) ficam guardadas em `a.token3d`, para **reabrir e ajustar** depois sem enviar tudo de novo.

### No mapa e nas listas
- **Mapa:** o círculo ocupa o quadrado como qualquer token. A parte que sai por cima é desenhada acima do quadrado, por cima do que estiver atrás (ver pergunta 2). Seleção, barras, nome e condições continuam no lugar de hoje.
- **Clique:** continua valendo só o quadrado do token (ver pergunta 3).
- **Ficha, listas, painel e combate:** o token aparece inteiro, sem borda por cima (como o Token pronto do Plano 75).
- **Trocar para outra opção** (Enviar token ou Recortar) apaga o Token 3D, mas `a.token3d` fica guardado e "Montar token 3D" abre com as escolhas anteriores.

## Perguntas para o usuário
1. **Fundo padrão ao abrir a janela:** (a) **a imagem do personagem quando houver, senão a cor** (recomendo: com a arte e o recorte dela, fica como o seu exemplo); (b) sempre a cor.
2. **Parte que sai por cima, no mapa:** (a) **pode cobrir o token de trás e o mapa** (recomendo; é o efeito); (b) fica atrás dos outros tokens.
3. **Clique no token:** (a) **só no quadrado** (recomendo: o cabelo saindo por cima não "rouba" o clique de quem está na casa de cima); (b) também na parte que sai.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/token3d.js` (novo) | janela "Montar token 3D", desenho das molduras, montagem das camadas e geração do WebP; usado pela mesa e pela página |
| `js/ui.js` | botão na linha do token; grava `img`, `imgStyle: 'pop'` e `token3d` |
| `js/ficha.js` | o mesmo na página "Criar ficha" |
| `js/board.js` | `drawToken` desenha o Token 3D (quadrado + sobra em cima) |
| `js/store.js` | `migrate`: `token3d` |
| `css/style.css` | janela e prévia |
| `src/entries/mesa.ts`, `src/entries/ficha.ts` | carregar o módulo novo |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- PNG sem fundo: o personagem sai por cima, a metade de baixo fica dentro do círculo (conferido pelos pixels do token gerado).
- Os quatro estilos de moldura, sem moldura, espessuras e cor.
- Fundo: imagem do personagem, cor e outra imagem.
- Reabrir e ajustar (as escolhas voltam); trocar para Enviar ou Recortar e voltar.
- No mapa: a parte de cima aparece acima do quadrado; o clique vale só no quadrado; seleção, barras e nome no lugar.
- Imagem sem transparência: aviso, e o token sai sem a parte de cima "para fora".
- Exportar e importar a ficha; jogador pela rede vê o token.
- Fotos para você aprovar o visual (a janela e o token no mapa).
- `imagens.js`, `tokenpronto.js`, `walk.js` sem erros; 0 processos de teste no fim.

## Respostas do usuário
"Pode seguir o recomendado": (1) fundo = imagem do personagem quando houver; (2) a parte de cima pode cobrir quem está atrás; (3) clique só no quadrado.

## Resultado
Implementado em 23/11/2026.
- **`js/token3d.js`** (novo, mesa e página):
  - **Janela:** prévia sobre um quadrado do mapa tracejado. Personagem: enviar o PNG sem fundo, ou a imagem do personagem quando ela já não tem fundo; arrastar para mover e barra ou roda para o tamanho. Fundo: imagem do personagem, cor ou outra imagem. Moldura: Pedra, Ouro, Prata, Madeira ou Sem moldura, com Fina/Média/Grossa e cor.
  - **Molduras:** desenhadas pelo sistema (relevo, pontilhado da pedra, veios da madeira, luz de cima, tinta da cor escolhida).
  - **Montagem:** fundo → personagem no círculo → sombra interna → moldura → personagem só da metade para cima, com passagem suave perto do meio e sombra.
  - **Aviso** quando a imagem do personagem tem fundo.
- **Mesa:** em Configurar → Imagens, o botão "Montar token 3D", ou "Ajustar token 3D" quando já existe. Grava `img` (WebP 512×640), `imgStyle: 'pop'` e `token3d`. "Enviar token" e "Recortar" continuam funcionando e as escolhas do 3D ficam guardadas.
- **Página "Criar ficha":** botão na seção de identidade.
- **Mapa:** o círculo fica no quadrado e a sobra sobe por cima de quem está atrás; seleção, barras e nome no lugar; o clique vale só no quadrado. Listas, ficha e painel mostram o token inteiro, sem borda.
- **`migrate`:** `token3d = null`.

**Testes**
- `token3d.js` (novo): todos os casos sem erros. Pelos pixels do token gerado: cabelo opaco acima do círculo, ouro da moldura na frente do corpo embaixo, canto transparente. No mapa: clique no quadrado sim, acima não.
- A primeira foto mostrou "nullnull" na janela (controles vazios viravam texto). Foi corrigido, e o teste passou a conferir isso.
- `imagens.js`, `tokenpronto.js`, `imagens_pagina.js` e `walk.js`: sem erros. 0 processos no fim.

**Não testado:**
- o botão da página "Criar ficha" com uma imagem de verdade (o módulo é o mesmo da mesa);
- uma arte real recortada (o teste usa um desenho simples).
