# Plano 80 · Imagem do personagem no topo da página "Criar ficha"

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Perfeito, sobre a imagem no fundo que eu tinha pedido antes, ficou muito bom, só não refletiu na tela de criar ficha, atualiza ela também por favor, lá também é sobre ficha"

## Objetivo
Na página "Criar ficha", a imagem do personagem fica como na janela da ficha na mesa (Plano 78): começa no topo, atrás da barra, ocupa a largura toda, escurece à esquerda para o nome ficar legível e some no escuro para baixo.

## Como funciona hoje
- **Janela na mesa (Plano 78):** `.win.win-art::before` desenha a arte com 400 px de altura, atrás da barra do topo, de ponta a ponta. A barra fica transparente, com o título e os ícones brancos com sombra. O conteúdo rola por cima da arte, que fica parada. A camada `.sa-bg` de dentro da ficha fica escondida.
- **Página "Criar ficha"** (`ficha.html`, `js/ficha.js`): a arte é só a camada `.sa-bg` do topo da ficha (`App.SheetArt.decorate`). Ela fica numa **caixa** dentro da coluna, com margem dos lados e em cima, **abaixo** da barra "Criar ficha" (que tem fundo próprio e linha embaixo), com até 320 px, e rola junto com a ficha.

## Proposta
Quando a ficha aberta tem imagem do personagem:
- **Arte de ponta a ponta no topo da coluna da ficha:** sem margem nem caixa, com o mesmo escurecimento à esquerda, a mesma altura (400 px), a mesma passagem suave para o escuro e o mesmo **Enquadramento** (`artY`, padrão 12%) da janela.
- **Atrás da barra do topo (ver pergunta):** na parte da barra que fica acima da ficha ("Criar ficha", "Salvo neste navegador…", "Voltar ao menu"), o fundo fica transparente e a arte aparece atrás, com um escurecimento suave em cima. Textos e botão ficam brancos, com sombra. A parte da barra acima da lista de fichas ("VÉSPER") continua como está.
- **Ao rolar:** como na janela, a arte fica parada no topo e a ficha rola por cima dela.
- **Trocar de ficha na lista:** a arte acompanha a ficha aberta. Uma ficha sem imagem deixa a página como hoje.
- Vale para a ficha genérica e para a 5e (personagem e criatura).
- No celular (tela estreita), a arte acompanha a mesma regra, com a altura menor que já existe (`.sa-top` com 72 px de folga).

## Perguntas para o usuário
1. **A arte passa por trás da barra "Criar ficha"?** (a) **Sim**, como na janela da mesa, onde ela passa por trás do nome e do X (recomendo, é o que deixa as duas iguais); (b) não, começa logo abaixo da barra, mas de ponta a ponta e com o mesmo visual.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ficha.js` | a página recebe a arte da ficha aberta (classe e variáveis CSS, como `applyWinArt`), atualiza ao trocar de ficha, ao trocar ou remover a arte e ao mexer no Enquadramento |
| `css/style.css` | `.fp.fp-art`: arte de ponta a ponta atrás da barra (só acima da ficha) e do topo; barra transparente nessa parte; texto com sombra; `.sa-bg` da página escondida (para não repetir a arte) |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Página com ficha genérica com arte e com 5e com arte: a arte começa no topo, atrás da barra, de ponta a ponta (fotos para você aprovar).
- Sem arte: página como antes.
- Trocar de ficha na lista: a arte troca ou some.
- Remover a arte e mudar o Enquadramento: a página acompanha na hora.
- Rolar: a arte fica, a ficha passa por cima.
- **Já está falhando, antes deste plano:** o `imagens_pagina.js` acusa "genérica: arte ao fundo e token recortado dela". Vou achar a causa e corrigir junto.
- `imagens_pagina.js`, `ficha.js`, `janela_arte.js` sem erros; 0 processos no fim.

## Resposta do usuário
- Arte por trás da barra toda ("Criar ficha", "Salvo", "Voltar ao menu"), como o X na janela da mesa.
- "Quando você ajusta a ficha do tabuleiro não ajusta a ficha da tela de cadastro de ficha, não faz sentido, a tela de cadastro é tão importante quanto." Virou regra (memória): toda mudança de ficha vale para as duas telas.
- Pediu para achar e corrigir a falha do `imagens_pagina.js`.

## Resultado
Implementado em 24/11/2026.
- **`js/ficha.js`:** `applyPageArt` põe na página a classe `fp-art` e as variáveis `--fp-art` (a imagem) e `--fp-art-y` (o enquadramento) da ficha aberta, a cada desenho (trocar de ficha, trocar ou remover a arte). A barra **Enquadramento** do Plano 78, que só existia na mesa, entrou na página (embaixo dos botões da imagem; vale para a genérica e, em Configurar, para a 5e).
- **`css/ficha.css`** (tela larga): a arte com 400 px, fixa, a partir do topo da janela e acima da ficha (a partir de 260 px), com os mesmos escurecimentos e a mesma passagem para o escuro da janela da mesa. A barra fica sem fundo nessa parte, com "Criar ficha", "Salvo" e "Voltar ao menu" em branco com sombra. A parte acima da lista ("VÉSPER") continua com fundo. A camada `.sa-bg` de dentro da ficha fica escondida. Na genérica, o topo (retrato e nome) fica sem caixa e com 104 px em cima, como na janela.
- Em tela estreita (até 760 px), a lista de fichas fica entre a barra e a ficha, então continua a arte dentro do topo da ficha, como antes.

**Falha do `imagens_pagina.js` (achada e corrigida; era um defeito de verdade):**
- Ao pôr a arte, a página guardava a imagem e depois recortava o token dela, o que leva um tempo. Se nesse meio tempo disparava o salvamento automático de uma edição anterior (400 ms), ele tirava da memória toda imagem que nenhuma ficha usava ainda, inclusive a arte recém-guardada. A ficha ficava apontando para uma imagem que não existia mais, e o topo não mostrava nada.
- Correção: a página só tira da memória uma imagem sem uso se ela tiver sido guardada há mais de 1 minuto (`putAsset` e `fresh` em `js/ficha.js`). O que vai para o navegador continua sendo só o que alguma ficha usa. A mesa não tinha o problema, porque não apaga imagens da memória.

**Testes**
- `pagina_arte.js` (novo): todos os casos sem erros (sem arte, genérica, barra sem fundo e a parte da lista com fundo, camada fixa de 400 px, título branco, camada de dentro escondida, enquadramento padrão, mudar e guardar o enquadramento, rolar, trocar de ficha, voltar, remover a arte, 5e). Fotos da genérica, da 5e e rolada conferidas.
- `imagens_pagina.js` (agora passa), `ficha.js`, `ficha5e.js`, `janela_arte.js` e `imagens.js`: sem erros.
- 0 processos no fim.
