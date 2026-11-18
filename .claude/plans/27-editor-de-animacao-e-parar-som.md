# Plano 27 · Editor de animação maior e parar som pelo gatilho

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Gostei da animação e como o gatilho ativa. Porém a tela de animação é pequena e difícil de mexer, quero também uma opção de parar o som via gatilho também, eu testei aqui mas aparentemente o gatilho só para a música do mapa ou do ambiente, eu tentei selecionar um efeito para tocar e depois parar com um tempo específico e não deu certo."

## Objetivo
1. **Animação:** um editor de animação **grande**, numa janela própria, fácil de mexer, que também mostra o movimento no mapa enquanto você edita.
2. **Som:** o gatilho passa a conseguir **parar um efeito**, sozinho ou depois de um tempo. Exemplo: tocar um efeito e pará-lo 3 segundos depois.

## Como funciona hoje
- **Editor de animação:** `animEditor`, em `js/ui.js`, aparece em dois lugares apertados:
  - no painel lateral da imagem e da luz (`ownAnimSection`), com cerca de 256 px de largura e um movimento aberto por vez;
  - dentro do cartão da ação Animar, na janela do gatilho.
- **Som pelo gatilho** (`js/triggers.js`):
  - as opções são Efeito, Tocar/Ligar/Desligar som do mapa, Música, Parar a música, Ambiente e Parar o ambiente;
  - **não existe "parar efeito"**;
  - o efeito (`A.playSfx` → `syncSfx` em `js/audio.js`) é criado com `new Audio(url)` e tocado sem guardar referência, então ninguém consegue pará-lo depois. Por isso o teste do usuário não deu certo.

## Proposta

### 1. Editor de animação (janela própria)
- **Como abrir:** um botão **Abrir editor**:
  - na seção Animação do painel da imagem e da luz;
  - no cartão da ação Animar do gatilho, quando ela tem movimento próprio.
- **Janela larga** (cerca de 760 px), arrastável como as outras, que deixa o mapa à vista para a prévia:
```
┌ Animação · Lâmina da armadilha ──────────────────────────────────────┐
│ [▶ Tocar para todos] [❚❚ Parar] [↺ Início] [👁 Prévia só para mim]   │
│ [x] Começa sozinha com a cena                                         │
├──────────────────────┬───────────────────────────────────────────────┤
│ Movimentos (em ordem)│  Movimento: [Andar ▾]     Modelos: [Lâmina]…  │
│ 1 Andar · 1,5 s  ⋮⋮  │  Para a direita  [====|=====]  3 quad.        │
│ 2 Girar · 0,5 s  ⋮⋮  │  Para baixo      [=====|====]  0 quad.        │
│ [+ Movimento]        │  [Clicar o destino no mapa]                   │
│                      │  Duração         [==|=======]  1,5 s          │
│                      │  Curva  [suave ▾]  (desenho da curva)         │
│                      │  Repetir: [Uma vez][Vai e volta][Sem parar]   │
│                      │  No fim:  [Fica][Volta ao início]             │
└──────────────────────┴───────────────────────────────────────────────┘
```
  - **Barras deslizantes com o número ao lado**, em vez de só caixinhas: distância, graus, opacidade, tamanho e duração.
  - **Lista de movimentos** à esquerda: arrastar para mudar a ordem, duplicar e remover. O movimento escolhido abre à direita.
  - **Modelos** como botões (Lâmina, Girar, Holofote, Pulsar, Aparecer, Sumir, Ronda), não um select.
  - **Desenho da curva** (suave, linear, acelerando, freando), para ver a diferença.
  - **Prévia só para mim:** roda o movimento só na sua tela, sem mandar aos jogadores. O caminho e o fantasma do destino continuam desenhados no mapa enquanto o editor está aberto.
- O painel lateral e o cartão do gatilho continuam com o resumo e os botões rápidos (Tocar, Parar). A edição completa fica na janela.
- O formato da animação não muda: `anim.steps` e `spec`. As animações que já existem abrem do jeito que estão.

### 2. Parar som pelo gatilho
- **Ação Som → nova opção "Parar efeito"**, com o alvo:
  - **Todos os efeitos**, ou
  - **Um efeito específico** (o mesmo seletor de arquivo do Efeito).
  - Com o atraso que as ações do gatilho já têm, isso resolve o caso do usuário: ação 1 "Efeito: alarme", ação 2 "Parar efeito: alarme" com atraso de 3 s.
- **No Efeito, um campo "Parar depois de (s)"**, opcional: o efeito para sozinho depois desse tempo, sem precisar de uma segunda ação.
- **Nova opção "Parar todos os sons"**, opcional: música, ambiente, efeitos e os sons do mapa de uma vez. Serve para "silêncio de repente".
- **"Desligar som do mapa"** passa a interromper também o som que está tocando uma vez (`Tocar som do mapa`), não só o que repete.
- **Por dentro:**
  - cada computador guarda os efeitos que está tocando;
  - o mestre manda uma ordem de parar (`audio.sfxStop` com nome ou "todos"), e cada um para os seus, como já acontece com a música;
  - o "Parar depois de" vai junto na ordem de tocar.
- **Testar** (simulação do gatilho) também mostra "para o efeito X".

## Perguntas para o usuário
1. **Editor:** janela grande arrastável, com o mapa à vista para a prévia, como acima? *Recomendo que sim.* A alternativa é tela cheia, que esconde o mapa.
2. **"Parar depois de (s)" no próprio Efeito:** entra? *Recomendo que sim*: é o jeito mais curto para o seu caso.
3. **"Parar todos os sons":** entra? *Recomendo que sim.*

## Respostas do usuário
1. **Editor:** janela grande arrastável, com o mapa à vista: sim.
2. **"Parar depois de (s)" no Efeito:** sim.
3. **"Parar todos os sons":** "interessante, mas é opção nova". Entrou como uma opção nova na lista da ação Som.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | Janela "Animação" (lista de movimentos, formulário com barras, modelos em botões, desenho da curva, prévia só para mim); botão Abrir editor no painel e no cartão Animar; ação Som com Parar efeito, Parar depois de e Parar todos os sons |
| `js/anim.js` | Prévia local de um movimento só (já existe `preview`; ajuste para o editor), reordenar e duplicar |
| `js/triggers.js` | Ops `sfx-stop` e `all-stop`, `stopAfter` no `sfx`, simulação |
| `js/audio.js` | Guardar os efeitos tocando; parar por nome ou todos; parar depois de N s; som do mapa de uma vez para ao desligar |
| `js/store.js` | Ação `audio.sfxStop` (com contador, como `audio.sfx`) |
| `js/net.js` | Se precisar, a ordem de parar vai aos jogadores como a de tocar |
| `css/style.css` | Janela de animação, barras, modelos, curva |

## Testes
- **Som:**
  - Efeito + Parar efeito (atraso 3 s): o efeito para;
  - "Parar depois de 2 s" para sozinho;
  - Parar todos os efeitos;
  - Parar todos os sons (música, ambiente, efeitos, sons do mapa);
  - o jogador também para (a ordem vai pela rede);
  - Desligar som do mapa interrompe o som de uma vez;
  - Testar do gatilho mostra a ação.
- **Editor:**
  - abre pelo painel e pelo cartão;
  - as barras mudam o movimento;
  - destino no mapa;
  - modelos;
  - reordenar, duplicar e remover;
  - prévia só para mim não vai aos jogadores;
  - Tocar, Parar e Início;
  - a animação já existente abre igual.
- Foto da janela.
- Regressão completa, tutorial completo e 0 processos.

## Resultado
- **Janela "Animação"** (`UI.openAnimEditor`, em `js/ui.js`), com 800 px.
  - **Como abrir:** pelo botão **Abrir editor** no painel da imagem e da luz (`mode: 'own'`) e no cartão Animar → Animação nova do gatilho (`mode: 'trig'`).
  - **Topo:** Tocar para todos, Parar, Voltar ao início, Prévia só para mim (`A.preview`, local) e Começa sozinha.
  - **Lista à esquerda:** os movimentos de um objeto acontecem **juntos** (não em sequência), então a lista não reordena. Ela permite duplicar, remover e + Movimento; a ação do gatilho tem um movimento só.
  - **Formulário:** barras deslizantes com o número ao lado (o número aceita vírgula), modelos em botões, curva com desenho, repetir, idas e voltas, e o que fazer no fim. Destino e ronda continuam sendo clicados no mapa, e a janela some enquanto você escolhe.
  - **Mapa:** o caminho é desenhado enquanto a janela está aberta (`UI.animWinTargets`, em `drawAnimGuides`).
  - **Redesenho:** a janela só redesenha quando a animação muda (assinatura), para não atrapalhar o arraste das barras.
- **Som:**
  - `js/audio.js` guarda os efeitos tocando (`A.fx`, inclusive o "uma vez" do som do mapa, com `spotId`);
  - a ordem `audio.stop {name|null, spotId|null, n, at}` para em cada computador;
  - um efeito que ainda está carregando quando chega a ordem não toca;
  - `stopAfter` vai junto no `audio.sfx`.
- **Gatilho:**
  - **Parar um efeito** (um ou todos), **Parar depois de (s)** no Efeito e **Parar todos os sons** (`A.stopAll`: música, ambiente, efeitos e os sons do mapa da cena);
  - **Desligar som do mapa** também interrompe o som de uma vez daquele ponto;
  - os resumos mostram "Parar efeito" e "para em 3 s".
- **Teste `animsom.js`:**
  - editor: barras, vírgula, modelo, curva, adicionar, duplicar, remover, prévia local, tocar e parar, começa sozinha, ação do gatilho, fechar;
  - som, com um WAV gerado no teste: efeito e parar com atraso de 1 s (o caso do usuário), parar depois de 0,6 s, parar todos, som do mapa de uma vez e desligar, parar todos os sons, e as opções no cartão.
