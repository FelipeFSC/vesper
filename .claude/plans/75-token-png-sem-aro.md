# Plano 75 · Token enviado em PNG aparece inteiro, sem aro

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Eu enviei um token png e o sistema mesmo assim adicionou uma borda branca ao redor, não tem como o sistema só aceitar o png ou eu ajustar para o tamanho minimo ou algo do tipo ? os monstros estão bons, mas o token enviado do player ficou ruim"

## Objetivo
Quem envia um token pronto (PNG com fundo transparente e moldura própria) vê no mapa exatamente a imagem enviada, como os monstros do bestiário. Não aparece o círculo nem o aro do Vésper por cima.

## Como funciona hoje
- O mapa desenha o token de dois jeitos (Plano 26), conforme `a.imgStyle` da ficha (Configurar → **Imagem no tabuleiro**):
  - **Retrato (círculo)**, o padrão: a imagem é recortada num círculo, sobre um disco, com o aro do Vésper em volta. Por isso o PNG ganha borda e fica menor.
  - **Token pronto (imagem inteira)**: a imagem inteira, do tamanho do quadrado, sem disco nem aro. É o padrão das criaturas do bestiário.
- O botão **Enviar token** (Plano 74) troca a imagem, mas não muda esse jeito. A ficha continua em "Retrato".
- O sistema não olha a imagem para saber se ela já é um token pronto.

## Proposta
- **Detectar sozinho ao enviar o token** (mesa e página "Criar ficha"): se a imagem tem os **cantos transparentes**, é um token pronto (um círculo ou moldura recortada dentro de um quadrado). A ficha passa para **Token pronto** e o mapa mostra a imagem inteira. Uma foto comum, sem transparência, continua como **Retrato**.
  - Regra: os quatro cantos (8% do lado) com mais de 90% de pixels quase transparentes.
- **Aviso** depois do envio: "Token pronto: aparece inteiro no mapa." ou "Imagem recortada em círculo no mapa.", com o botão **Trocar**, que inverte a escolha na hora.
- **A escolha manual continua** em Configurar → Imagem no tabuleiro, e ganha uma dica: "Use Token pronto para PNG com fundo transparente."
- **Token recortado da imagem do personagem** (Plano 74) continua como Retrato (círculo com o aro), porque é um recorte quadrado de uma foto.
- **Fichas que já existem:** nada muda sozinho. Para elas, basta escolher Token pronto em Configurar, ou enviar o token de novo.
- **A imagem não é cortada nem reduzida:** o PNG é convertido para WebP mantendo a transparência, com até 512 px, como hoje.

## Perguntas para o usuário
1. **Fichas que já têm token enviado:** (a) **ficam como estão** (recomendo; você ajusta em Configurar ou envia de novo); (b) ao abrir a campanha, o sistema confere os tokens de todas as fichas e passa para Token pronto os que têm cantos transparentes.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/sheetart.js` | `isReadyToken(src)`: confere os cantos transparentes |
| `js/ui.js` | `UI.pickToken` define o `imgStyle` e mostra o aviso com Trocar; dica na escolha manual |
| `js/ficha.js` | o mesmo no "Enviar token" da página |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- PNG com fundo transparente e moldura → Token pronto, desenhado inteiro no mapa (conferido pelos pixels: sem o aro).
- Foto comum (JPG, sem transparência) → Retrato.
- Aviso com Trocar inverte a escolha.
- Página "Criar ficha": o mesmo.
- Token recortado da arte continua Retrato.
- `tokenpronto.js`, `imagens.js`, `walk.js` sem erros; 0 processos de teste no fim.

## Resposta do usuário (muda a proposta)
"No plano passado eu já tinha falado, vai ter 2 opções para o jogador, subir o token ou escolher o token circulando a imagem do personagem [...] na hora de subir o token o sistema simplesmente adiciona um circulo no meu token [...] o meu token já tem borda e você adicionou uma borda na borda."

Então não há detecção pelos cantos transparentes: **token enviado = Token pronto, sempre**. Token recortado da imagem do personagem = círculo com o aro do Vésper. A pergunta sobre as fichas antigas ficou na opção (a): ficam como estão.

## Resultado
Implementado em 23/11/2026.
- **Enviar token** (`UI.pickToken` na mesa, `pickImage` na página) grava `imgStyle: 'token'`: no mapa, a imagem aparece inteira, sem disco nem aro. "Recortar da imagem" continua gravando `imgStyle: null` (círculo com aro).
- **Círculo da ficha e listas** (`avatar` na mesa e na página): token pronto aparece inteiro (`contain`), sem recorte, sem borda e sem o aro dourado do topo com arte (classe `token-ready`). Vale nas listas de fichas, no painel do token, na coluna de jogadores e no combate.
- **Configurar → Imagens** diz "Imagem própria, inteira no mapa" ou "recortada em círculo". A dica de "Imagem no tabuleiro" explica os dois padrões. A escolha manual continua.
- **Fichas antigas:** não mudam sozinhas. Basta enviar o token de novo, ou escolher "Token pronto" em Configurar → Imagem no tabuleiro.

**Testes**
- `imagens.js`: enviar um PNG com moldura e fundo transparente (escolha de arquivo simulada) vira Token pronto e mantém a arte; o topo da ficha mostra o token sem borda; Configurar diz "inteira no mapa"; recortar da arte volta ao círculo. Foto conferida.
- `tokenpronto.js` e `walk.js`: sem erros.
- `imagens_pagina.js`: passou na segunda rodada. A primeira falhou por tempo (espera de 4 s ao rodar logo depois de outro teste); a espera subiu para 8 s.
- 0 processos no fim.
