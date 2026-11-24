# Plano 78 · Imagem do personagem também na barra do topo da janela da ficha

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Perfeito, agora na ficha do jogador eu gostaria de que a barra no topo fosse a foto do personagem também, ai teria o nome, o icone, o icone de fechar, mas o fundo fosse a foto do personagem."

Foto mandada: a janela "Aventureiro" com a barra do topo cinza (ícone, nome e X) e, logo abaixo, a arte começando no queixo do personagem. O rosto ficou cortado.

## Objetivo
Na janela da ficha (na mesa), a imagem do personagem começa **no topo da janela**: a barra com o ícone, o nome e o X fica por cima da arte, sem a faixa cinza. A arte forma uma imagem só, da barra até o fim do topo da ficha, e vai sumindo no escuro como hoje.

## Como funciona hoje (Plano 74)
- A janela (`UI.openWindow`, `js/ui.js`) tem a barra `.win-head` (fundo do painel, linha embaixo) e o corpo `.win-body`, que rola.
- A arte é a camada `.sa-bg` dentro do topo da ficha, no corpo da janela (`App.SheetArt.decorate`). Ela começa abaixo da barra e mostra a imagem cortada a 22% da altura (`background-position: center 22%`). Numa arte alta, isso pode cortar o rosto, como na foto.

## Proposta
- **Arte da barra até o topo da ficha:** quando a ficha tem imagem do personagem, a janela inteira ganha a arte ao fundo, começando atrás da barra. A barra fica transparente, com um escurecimento suave em cima para o nome e os botões continuarem legíveis (texto com sombra). A linha cinza embaixo da barra some.
- **Ao rolar a ficha:** a arte fica parada no topo da janela e o conteúdo rola por cima dela, sumindo no escuro. As abas, que ficam grudadas no topo ao rolar, continuam com o fundo delas.
- **Sem imagem do personagem:** a janela fica como hoje.
- **Vale para** a janela da ficha na mesa, genérica e 5e, de jogador e de criatura. A página "Criar ficha" não tem essa barra e não muda.
- **Enquadramento** (ver pergunta): escolher qual altura da arte aparece, para o rosto não ficar cortado.

## Perguntas para o usuário
1. **Enquadramento da arte:** (a) **ajustável**: em Configurar → Imagens, uma barra "Enquadramento" (de "mostrar o alto da imagem" até "mostrar o meio"), guardada na ficha; e o padrão passa a mostrar mais o alto (12% em vez de 22%), onde costuma ficar o rosto (recomendo); (b) só mudar o padrão, sem barra.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | a janela da ficha recebe a arte (classe e variável CSS) e atualiza quando a arte muda; barra "Enquadramento" em Configurar → Imagens |
| `js/sheetart.js` | topo da ficha dentro da janela sem a camada própria (a da janela já cobre); enquadramento (`a.artY`) |
| `css/style.css` | `.win.win-art`: arte atrás da barra e do topo; barra transparente; texto com sombra |
| `js/store.js` | `migrate`: `artY` |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Ficha com arte: a barra sem fundo próprio e a arte começando no topo da janela (foto); nome e X legíveis.
- Ficha sem arte: barra como antes.
- Trocar e remover a arte com a janela aberta: a barra acompanha.
- Rolar a ficha: a arte fica, o conteúdo passa por cima.
- Enquadramento: mudar a barra muda o que aparece; fica guardado.
- Ficha 5e com arte (foto).
- `imagens.js`, `walk.js` sem erros; 0 processos de teste no fim.

## Resposta do usuário
"A e B": enquadramento ajustável e o padrão novo (mostrar mais o alto). A opção A já incluía os dois.

## Resultado
Implementado em 24/11/2026.
- **`js/ui.js`:**
  - Ao montar a janela da ficha, `applyWinArt` põe a classe `win-art` e as variáveis `--win-art` (a imagem) e `--win-art-y` (o enquadramento); ao remover a arte, tira as duas.
  - Configurar → Imagens ganhou a barra **Enquadramento** (0 a 60%, de "Alto" a "Meio"): mostra na hora enquanto arrasta e grava `a.artY` ao soltar.
- **`css/style.css`:**
  - `.win.win-art::before`: a arte atrás da barra e do topo, com 400 px de altura, escurecimento em cima (para o nome e o X) e à esquerda, e sumindo para baixo.
  - Barra do topo sem fundo e sem a linha; título e ícones brancos com sombra.
  - A camada `.sa-bg` de dentro da ficha fica escondida na janela, para não repetir a arte.
  - O conteúdo rola por cima da arte, que fica parada.
- **`js/sheetart.js` e `js/ficha.js`:** a camada do topo usa o enquadramento (`a.artY`, padrão 12%, antes 22%), também na página "Criar ficha".
- **`js/store.js`:** `migrate` com `artY = null` (padrão).

**Testes**
- `janela_arte.js` (novo): todos os casos sem erros. Fotos da genérica e da 5e conferidas: a arte começa no topo da janela, atrás do ícone, do nome e do X, e o rosto aparece. A foto "rolada" saiu igual à normal, porque a ficha de teste é curta e não chega a rolar.
- `imagens.js`, `token3d.js` e `imagens_pagina.js`: sem erros.

**Achado e corrigido no caminho: a falha intermitente do `walk.js`** (passos 14 e 16, desde o Plano 70)
- Diagnóstico: na hora da bola de fogo havia de 7 a 20 rolagens na fila, todas pedidas no passo 12 ("Errou o alvo? Desfaça"). O roteiro do teste atacava várias vezes seguidas até aparecer o botão Desfazer, esperando 0,3 s entre um ataque e outro. Com o resultado vindo 2,4 s depois, disparava de 8 a 16 ataques, e a bola de fogo ficava uns 30 s na fila.
- **Era do roteiro, não do Vésper:** o tutorial só arma a mira uma vez por passo, e a mira não é cancelada pelo resultado atrasado (testado à parte no Plano 77).
- Correção no `walk.js`: cada ataque espera o próprio resultado antes de tentar de novo. Duas rodadas seguidas passaram inteiras, com a fila vazia na explosão.
- 0 processos no fim.
