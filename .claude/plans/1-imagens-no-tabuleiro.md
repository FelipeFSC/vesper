# Plano 1 · Imagens no tabuleiro

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "o mestre consegue adicionar imagens no tabuleiro?" → "Sim, esse vai ser o plano 1, adicionar imagens ao tabuleiro"

## Objetivo
O mestre solta imagens livres no mapa (baú, fogueira, carroça, árvore, mancha de sangue, armadilha) e as trata como objetos: arrasta, aumenta, gira, escolhe o nível de cada uma em relação às outras imagens e aos tokens, e decide se os jogadores veem. Hoje só existem o mapa de fundo (uma imagem por cena) e a imagem das fichas (token redondo).

## Decisões do usuário
1. **Mostrar imagem na tela dos jogadores** (fora do mapa: carta, retrato do vilão, pista): sim, mas no **Plano 2**.
2. **Quem coloca imagens:** só o mestre, por enquanto.
3. **A imagem bloqueia visão:** não. Para bloquear, o mestre desenha uma parede por cima.
4. **Biblioteca de imagens da campanha:** sim, com miniaturas para reaproveitar em outras cenas.
5. **Camadas:** em vez de "Chão / Acima", o mestre ajusta os **níveis** e escolhe quem fica em cima ou embaixo, entre imagens e tokens.

## Como funciona hoje
- **Mapa de fundo:** `sc.bg` (id de imagem), desenhado em `js/board.js` logo depois da cor do piso, ocupando a cena inteira.
- **Imagens:** `App.Images.add(file, maxSide)` converte para WebP, guarda em `Store.assets[id]` (id = hash, sem duplicatas), manda aos jogadores (`Net.sendAsset`) e salva junto da campanha. Mapas até 4096 px, tokens até 512 px.
- **Ordem de desenho:** piso → mapa de fundo → grid → desenhos → tokens (ordenados por `t.z`) → névoa → escuridão → tokens do próprio jogador → paredes e marcadores do mestre.
- **Soltar no mapa:** `onDrop` aceita ficha (`text/x-actor`) e faixa de som (`text/x-sound`). Arquivos do computador ainda não.
- **Ordem dos tokens:** o painel do token só tem "Trazer para frente".

## Proposta

### Colocar uma imagem
- Ferramenta nova **Imagem** (tecla `I`) na barra do mestre. Nas opções da ferramenta:
  - **Enviar imagem…**: abre o seletor de arquivo; a imagem aparece no centro da tela;
  - **Imagens da campanha**: miniaturas de todas as imagens já usadas, para arrastar de novo para o mapa (decisão 4).
- **Arrastar arquivos do computador** (um ou vários) direto para o mapa: cada um vira uma imagem onde foi solto.
- Tamanho inicial encaixado no grid, respeitando a proporção (ex.: 2×1 quadrados). Imagens reduzidas para no máximo 2048 px (equilíbrio entre nitidez e peso).

### Mexer na imagem (mestre, ferramenta Selecionar)
- **Clicar** seleciona: aparece uma moldura com alças.
- **Arrastar** move (encaixa no grid; `Alt` solta livre).
- **Alças nos cantos** redimensionam mantendo a proporção (`Shift` deforma).
- **Alça de giro** em cima; `Shift` gira de 15 em 15 graus.
- `Delete` apaga; `Ctrl+D` duplica.

### Painel da imagem (lado direito, como o painel do token)
- Nome (ex.: "Baú").
- **Para os jogadores:** Visível ou Invisível (para preparar a armadilha escondida e revelar depois).
- **Nível:** Trazer para frente · Subir um nível · Descer um nível · Mandar para trás.
- **Opacidade** (ex.: 50% para uma mancha ou névoa).
- **Travar:** impede mover sem querer (decoração montada).
- Espelhar na horizontal, Duplicar e Apagar.

### Níveis de camada (decisão 5)
- Imagens e tokens ficam numa **mesma ordem**: cada um tem um nível, e quem tem nível maior é desenhado por cima.
- Os 4 botões de nível aparecem no painel da imagem **e** no painel do token.
- Exemplos: tapete embaixo de todos; baú por cima do tapete e por baixo do personagem; copa da árvore por cima do goblin.
- Imagem nova entra **por baixo dos tokens** (o caso mais comum: objetos no chão). Token novo entra por cima de tudo, como hoje.
- O mapa de fundo e o grid ficam sempre embaixo de tudo.
- Detalhe: o jogador sempre vê o **próprio** token, mesmo debaixo de uma copa, porque os tokens do jogador já são desenhados por cima da escuridão para ele não perder o personagem de vista.

### Para os jogadores
- Veem as imagens visíveis, sem moldura e sem poder clicar ou mover.
- A imagem respeita a **névoa de guerra** e a **escuridão**: fica escondida onde o jogador não enxerga.

### Camadas
- A aba **Camadas** ganha a linha **Imagens**, com o olho para esconder só na sua tela, como as outras.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | `sc.props = [{id, img, name, x, y, w, h, rot, flip, hidden, opacity, locked, z}]` no `newScene` e no `migrate`; ações `prop.add`, `prop.update`, `prop.delete`; ação `order.move` (frente, subir, descer, trás) que reordena o nível de imagens **e** tokens juntos; tudo só do mestre. O `migrate` dá níveis às imagens e tokens antigos sem mudar a ordem atual. |
| `js/images.js` | Tamanho máximo para objetos (`PROP = 2048`). |
| `js/board.js` | Desenhar imagens e tokens juntos, ordenados pelo nível (antes da névoa e da escuridão); ferramenta `prop`; seleção com moldura, mover, redimensionar, girar; soltar arquivos do computador; `Delete`, `Ctrl+D`, tecla `I`; camada "Imagens" no olho. |
| `js/light.js` | Nada (as imagens ficam embaixo da escuridão, que já esconde o que o jogador não vê). |
| `js/ui.js` | Botão da ferramenta; opções da ferramenta (enviar imagem e biblioteca da campanha); painel da imagem; 4 botões de nível no painel da imagem e no do token; linha "Imagens" na aba Camadas. |
| `css/style.css` | Estilos do painel, das alças e da biblioteca de miniaturas. |
| `js/storage.js` | Conferir que exportar cena e campanha leva as imagens dos objetos. |

## Tutorial, wiki e README
- **Tutorial:** passo novo "Imagens no mapa": "Escolha a ferramenta Imagem e coloque uma imagem no mapa" (concluído quando a cena tiver uma imagem). O texto explica os níveis.
- **Wiki:** seção "Imagens no mapa" dentro de *Cenas e mapas*, com foto da imagem selecionada (moldura e alças) e do painel; atalho `I` na tabela de atalhos.
- **README:** acrescentar "imagens soltas no mapa, com níveis de camada" no item *Mapas e cenas*.

## Testes
- Colocar imagem pela ferramenta, pela biblioteca e soltando um arquivo no mapa → aparece encaixada no grid com a proporção certa.
- Mover, redimensionar (proporção mantida), girar 15° com Shift, espelhar, opacidade, travar (não move).
- Níveis: imagem nova entra abaixo dos tokens; Frente/Subir/Descer/Trás mudam a ordem entre imagens e tokens; campanhas antigas mantêm a ordem dos tokens.
- Invisível: o mestre vê apagada; o jogador ("ver como") não vê. Névoa e escuridão escondem a imagem do jogador.
- Jogador não consegue mover nem apagar (`permit`).
- Exportar e importar a cena mantém as imagens.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste no fim.

## Resultado
Implementado como proposto, com as 5 decisões do usuário.

**O que entrou**
- Ferramenta **Imagem** (`I`): Enviar imagem…, arrastar arquivos do computador (vários de uma vez) e a biblioteca **Imagens da campanha** (clicar coloca no centro; arrastar coloca onde soltar).
- Imagem nova: lado maior com 2 quadrados, proporção mantida, encaixada no grid, abaixo de todos os tokens, já selecionada.
- Moldura com alças: mover (encaixe no grid; Alt solta), cantos redimensionam (proporção mantida; Shift deforma; o canto oposto fica parado), bolinha de cima gira (Shift: 15 em 15°). Delete apaga, Ctrl+D duplica.
- Painel: nome, Visível/Invisível, **Nível** (frente, subir, descer, trás), largura/altura em quadrados e giro em graus, opacidade, travar, espelhar, duplicar, apagar.
- **Níveis compartilhados** entre imagens e tokens (`order.move`); o painel do token trocou o antigo "Trazer para frente" pelos 4 botões. Token novo entra acima de tudo.
- Camada **Imagens** na aba Camadas. Tudo só do mestre (`permit()` recusa). Exportar cena e campanha leva as imagens.
- Tutorial (passo "Imagens no mapa"), wiki (seção com foto e atalho `I`) e README atualizados.

**Testado** (`props.js`, `props_view.js`, `walk.js`)
- Soltar arquivo 2:1 → 2×1 quadrados, encaixado, selecionado, abaixo dos tokens.
- Ordem: subir, frente, token para frente e imagem para trás deram a ordem esperada.
- Mover (4,2) → (6,3); redimensionar 2×1 → 4×2 com o canto parado; girar com Shift → 90°; travada não move.
- Invisível não aparece para o jogador; biblioteca coloca a mesma figura com o mesmo nome; Ctrl+D e Delete; exportar inclui a imagem; token novo fica acima.
- Jogador tentando mover, apagar ou mudar o nível pela rede: nada muda.
- Tutorial completo sem erros; 0 processos de teste.

**Limitações**
- Redimensionar não encaixa no grid (só mover encaixa); para medidas exatas, use Largura e Altura no painel.
- Não há desfazer para mexidas em imagens (como já acontece com desenhos e paredes).
