# Plano 74 · Imagem do personagem e imagem do token

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Vamos melhorar isso ai, primeiro que as fichas devem ter 2 imagens, a imagem do personagem em si (se tiver) e a imagem do token (se tiver). O token aparece na mesa como já é hoje, e os monstros estão todos bem feitos, e a imagem do personagem mesmo vai aparecer, te mandei um EXEMPLO de uso da imagem do personagem junto da imagem do token, não é para fazer exatamente igual é só um exemplo de design mesmo que gerei com ia"

Exemplo mandado pelo usuário (só como referência de design, não para copiar): a ficha com a arte do personagem grande ao fundo do topo, que vai sumindo no escuro; à esquerda, o token num aro redondo; por cima da arte, o nome e o tipo, e as barras logo abaixo.

## Objetivo
Toda ficha pode ter duas imagens: a **imagem do personagem** (a arte, o retrato grande) e a **imagem do token** (a que vai no mapa). O token continua no mapa como hoje. A imagem do personagem aparece no topo da ficha, ao fundo, atrás do nome e das barras.

## Como funciona hoje
- A ficha guarda **uma imagem só**, `a.img` (512 px, `Images.TOKEN`). Ela é usada:
  - no mapa (`board.js`, `drawToken`);
  - nas listas da esquerda, na coluna de jogadores, no combate e no painel do token (`avatar` em `js/ui.js`);
  - no topo da ficha (genérica: `buildSheet` em `js/ui.js`; D&D 5e: `js/ficha5e.js`, mesma na mesa e na página "Criar ficha"; página genérica: `js/ficha.js`).
- `a.imgStyle` (Plano 26) diz como o token aparece no mapa: **Retrato** (recortado em círculo) ou **Token pronto** (imagem inteira).
- **Bestiário:** a ficha recebe o **token** do 5etools (baixado da internet) ou da pasta local. A **ilustração** da criatura só aparece na aba "Imagens" da prévia, vinda da internet, e não é guardada.

## Proposta
### Dados
- **Campo novo `a.art`:** a imagem do personagem. Guardada em WebP com até **1600 px** no lado maior (tamanho novo `Images.ART`), sem cortar.
- **`a.img` continua sendo o token.** Ficha antiga: nada muda (fica só com o token).
- Exportar e importar campanha, ficha e cena, e enviar aos jogadores pela rede, passam a levar a imagem do personagem também.

### Onde aparece a imagem do personagem
- **Topo da ficha (janela na mesa, ficha genérica e 5e, e a página "Criar ficha"):**
  - a arte fica ao fundo do topo, preenchendo a largura;
  - ela vai escurecendo para baixo até sumir no fundo do painel, para o nome e as barras continuarem legíveis;
  - altura de uns 180 px na janela da mesa, que diminui um pouco quando a ficha é estreita;
  - o **token** fica num círculo à esquerda (como o avatar de hoje), por cima da arte, com o aro dourado do Vésper;
  - o **nome** em EB Garamond, grande, com o tipo e o dono embaixo.
- **Sem imagem do personagem:** o topo fica como hoje.
- **Só no Vésper, sem copiar o exemplo:** sem as molduras ornamentadas, o selo de cera ou as penas do exemplo. Usamos as cores, as fontes e os ícones do projeto.

### Trocar as imagens
- Na ficha, em **Configurar → Imagens**, duas linhas, cada uma com prévia, **Trocar** e **Remover**:
  - **Imagem do personagem**: a arte;
  - **Imagem do token**: a do mapa, com a escolha que já existe, "Imagem no tabuleiro: Retrato (círculo) / Token pronto".
- **Atalhos no topo da ficha:** clicar no círculo do token troca o token (como hoje); um botão pequeno com ícone de imagem, no canto da arte, troca a imagem do personagem. Só para quem pode editar a ficha.
- **Arrastar um arquivo** para o topo da ficha troca a imagem do personagem.

### Bestiário
- Ao trazer uma criatura para a campanha, a **primeira ilustração** do 5etools vira a imagem do personagem (precisa de internet nesse momento, como o token). Ela fica guardada na campanha e depois funciona sem internet. Ver pergunta 1.
- Na aba "Imagens" da prévia, cada ilustração ganha o botão **Usar como imagem do personagem** (para escolher outra, quando houver mais de uma).

## Perguntas para o usuário
1. **Criaturas do bestiário:** (a) **já vêm com a primeira ilustração do 5etools como imagem do personagem** (recomendo; o mestre pode trocar ou remover); (b) vêm só com o token, e o mestre escolhe a ilustração na aba Imagens se quiser.
2. **Ficha sem imagem do token, mas com imagem do personagem:** (a) **o mapa usa a imagem do personagem recortada em círculo** (recomendo; é o que acontece hoje com a imagem única); (b) o mapa mostra só a cor e a inicial.
3. **Fora da ficha:** (a) **por enquanto só no topo da ficha** (recomendo, para começar); (b) também no painel do token na lateral (topo menor com a arte).

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/images.js` | tamanho `ART` (1600 px) |
| `js/store.js` | `a.art` no `migrate`, `actor.update` aceita `art`; permissão igual à do `img` |
| `js/ui.js` | topo da ficha genérica com a arte; Configurar → Imagens (duas linhas); botão e arrastar para trocar |
| `js/ficha5e.js` | topo da ficha 5e com a arte (na mesa e na página) |
| `js/ficha.js` | página "Criar ficha" com as duas imagens |
| `js/bestiary.js`, `js/bestiary-window.js` | baixa a ilustração ao trazer a criatura; botão "Usar como imagem do personagem" |
| `js/storage.js`, `js/net.js`, `src/services/image-assets.ts` | exportar, importar e mandar aos jogadores a imagem do personagem |
| `css/style.css`, `css/ficha5e.css`, `css/ficha.css` | topo com a arte, degradê, círculo do token |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Ficha nova: sem imagens, só token, só arte, as duas. Topo e mapa certos em cada caso.
- Trocar e remover cada imagem por Configurar, pelo círculo, pelo botão e arrastando um arquivo.
- Ficha antiga (só `img`): igual a antes.
- Criatura do bestiário: token e ilustração; escolher outra ilustração na aba Imagens; sem internet, só o token.
- Exportar e importar (campanha, ficha); jogador pela rede vê a arte na ficha dele.
- Fotos da ficha genérica e da 5e (janela larga e estreita), para você aprovar o visual.
- Página "Criar ficha" com as duas imagens.
- Tutorial inteiro (`walk.js`), `ficha.js`, `ficha_mesa.js`, `bestiario.js` e rede sem erros; 0 processos de teste no fim.

## Respostas do usuário
1. "Eles já vem com imagem, então vamos usar": a ilustração do 5etools vira a imagem do personagem.
2. Sim, o mapa usa a arte. E mais: "eu acho interessante o jogador conseguir usar onde o circulo vai pegar na foto, ai ele consegue meio que criar a ficha dentro do sistema mesmo". Isso virou o **recorte do token**.
3. Só no topo da ficha, por enquanto.

## Resultado
Implementado em 23/11/2026.

**O que entrou**
- **Dados:**
  - `a.art` é a imagem do personagem (WebP, até 1600 px, `Images.ART`); `a.img` continua sendo o token.
  - Token recortado da arte: `a.imgFromArt = true` e `a.artCrop = {x, y, s}`.
  - `migrate`: `art = null` nas fichas antigas.
  - Exportar, importar e mandar aos jogadores já levavam toda imagem citada na ficha, então não precisou mudar.
- **`js/sheetart.js`** (novo, usado na mesa e na página):
  - arte ao fundo do topo da ficha, escurecendo para baixo e para a esquerda, com o aro dourado no token;
  - botão de trocar no canto e soltar um arquivo no topo;
  - janela de recorte: arrastar o círculo, tamanho pela barra ou pela roda do mouse, prévia redonda "Como fica no mapa", Enter e Esc;
  - token de 512 px gerado do recorte.
- **Regras:**
  - Pôr a arte numa ficha sem token, ou cujo token saiu da arte, cria o token por um recorte automático: retrato em pé = rosto no terço de cima; deitado = centro.
  - Token próprio (enviado) não muda quando a arte muda.
  - Remover a arte remove junto o token que saiu dela.
  - Clicar no círculo do token: com arte, abre o recorte; sem arte, escolhe um arquivo.
- **Configurar → Imagens:** duas linhas com prévia.
  - Imagem do personagem: Trocar e Remover.
  - Imagem do token: Recortar da imagem, Enviar token e Remover, e diz de onde o token veio.
- **Ficha 5e:** o topo (personagem e criatura) recebe a arte por `ctx.art`, na mesa e na página.
- **Página "Criar ficha":** token e imagem do personagem na seção de identidade (arte ao fundo) e na 5e.
- **Bestiário:**
  - A primeira ilustração do 5etools vira a imagem do personagem (`B.artFile`); sem internet, fica só o token.
  - Na aba Imagens, cada ilustração tem "Usar como imagem do personagem"; se a criatura já está na campanha, troca nela.
  - "Meu bestiário" guarda e devolve a arte.
- **Ícones Lucide novos:** `crop`, `zoom-in`.

**Testes**
- `imagens.js` (novo, mesa): todos os casos sem erros. Fotos da ficha genérica, da 5e e do recorte conferidas.
- `imagens_pagina.js` (novo, página): genérica, 5e e exportar.
- `bestiario.js`: acrescentado que a ilustração vira a imagem do personagem e volta do Meu bestiário.
- `ficha.js`, `ficha_mesa.js`, `ficha5e_mesa.js`, `walk.js` e rede: sem erros.
  - O `ficha5e_mesa.js` falhou em 3 conferências de rolagem por esperar só 0,15 s. Era efeito do Plano 70 (o resultado espera os dados); a espera passou para 2,8 s.
- 0 processos no fim.

**Não testado:** a ilustração de verdade baixada do 5etools; o teste simula o download, porque o navegador de teste não acessa a internet.
