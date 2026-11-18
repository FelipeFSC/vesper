# Plano 15 · Gatilhos mais fáceis de configurar e testar

**Status:** Implementado (testes do usuário)

## Decisões do usuário
1. **Testar gatilho = simular:** nada muda de verdade; cada alvo pisca em sequência com o nome da ação e o tempo dos atrasos; o som toca só para o mestre.
2. **Barra da esquerda recolhida:** faixa fina com ícones.
3. **Barra da direita:** também recolhe, do mesmo jeito.
4. **Janela de configurar:** flutuante e arrastável, como as fichas.
**Versão:** 1.2
**Pedido do usuário:** "Quero melhorar esse gatilho, seria bom o botão testar gatilho por exemplo, outro ponto, sinto que tem pouco espaço, também seria interessante minimizar essa barra que mandei. Mandei exemplo de design também, sinto que a UX está bem ruim em relação a usabilidade, nem que abra um pequeno modal para configurar ao invés de ser tudo na barra lateral, só para deixar mais fácil de configurar e testar." (prints: barra da esquerda Fichas/Cenas; modelo com lista de gatilhos, "Condições (SE)", "O que acontece (ENTÃO)", ações em cartões resumidos, "Adicionar ação" e "Testar gatilho")

## Objetivo
Configurar e testar um gatilho num espaço confortável, lendo a regra como uma frase: **SE** (quando, quem, quantas vezes) **ENTÃO** (as ações em ordem). Liberar espaço de tela recolhendo a barra da esquerda.

## Como está hoje (Plano 14)
- Tudo no painel da direita (estreito): os campos de cada ação ficam sempre abertos, e a lista cresce muito.
- Não existe "Testar"; só Disparar agora + Rearmar.
- A barra da esquerda (Fichas/Cenas) não recolhe.

## Proposta

### 1. Janela "Configurar gatilho"
- Abre ao clicar num gatilho (ou com dois cliques no marcador). É uma **janela flutuante e arrastável**, como a das fichas, mais larga (cerca de 720 px), com **duas colunas**:
  - **SE (condições):** Quando · Quem dispara · Quantas vezes · Espera · Perguntar antes · Parar o movimento · Ligado.
  - **ENTÃO (o que acontece):** as ações como **cartões resumidos** de uma ou duas linhas: "1 · Luz (Tocha 1) · Alternar · esperar 0 s", com os botões Editar, Apagar e uma alça para **arrastar e mudar a ordem**. Só o cartão em edição abre os campos. Embaixo, **+ Adicionar ação** abre uma lista com ícones.
- **Rodapé:** Testar gatilho · Disparar agora · Rearmar · Duplicar · Apagar · Fechar.
- **Escolher no mapa:** a janela some enquanto você clica no mapa e volta sozinha.
- O painel da direita fica só com um **resumo** (nome, estado, frase "Quando o grupo entrar → 3 ações") e o botão **Configurar**.

### 2. Testar gatilho (pergunta 1)
Dois jeitos possíveis:
- (a) **Simular:** nada muda de verdade. No mapa, cada ação acende em sequência, com o mesmo tempo dos atrasos: a porta pisca com "Trancar", a tocha pisca com "Apagar", os goblins piscam com "Aparecer", e o som toca só para você. Serve para conferir a ordem, os alvos e o ritmo, sem estragar a mesa.
- (b) **Testar de verdade e voltar:** dispara de verdade (todos veem) e mostra **Desfazer teste**, que devolve portas, luzes, tokens, névoa, PV e o próprio gatilho como estavam.

*(Recomendo a para preparar a sessão. Para ver de verdade, já existem Disparar agora + Rearmar e o Ver como os jogadores.)*

### 3. Lista de gatilhos (quadro da ferramenta), como no modelo
- Cada linha: **bolinha de estado** (rosa pronto, cinza gasto, apagada desligado), nome, botão **Ligado/Desligado** e botão **▶ Testar**. Clicar no nome abre a janela.
- **Rearmar todos** embaixo.

### 4. Recolher a barra da esquerda (pergunta 2)
- Botão no topo da barra (Fichas/Cenas) para **recolher**. Recolhida, ela vira uma **faixa fina com os ícones** (Fichas, Cenas, Importar). Clicar num ícone abre de novo. O mapa ganha o espaço.
- O navegador lembra se estava recolhida (só nesta máquina).
- A barra da direita também ganha o mesmo botão? (pergunta 3)

## Perguntas para o usuário
1. **Testar gatilho:** (a) simular sem mudar nada, ou (b) de verdade com Desfazer teste? *(Recomendo a.)*
2. **Barra da esquerda recolhida:** faixa fina com ícones, ou sumir de vez (com um botão para voltar)? *(Recomendo a faixa com ícones.)*
3. **Barra da direita:** também recolhe? *(Recomendo sim, mesmo jeito.)*
4. **Janela de configurar:** flutuante e arrastável sobre o mapa (como as fichas), ou centralizada escurecendo o resto? *(Recomendo flutuante: dá para ver o mapa e escolher alvos.)*

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | janela "Configurar gatilho" (`openTrigger`), cartões resumidos com editar e arrastar, lista com ícones das ações, resumo no painel da direita, lista nova no quadro da ferramenta, botões de recolher as barras |
| `js/triggers.js` | `summary(acao)` (texto curto de cada ação), `simulate(...)` (se 1a) ou instantâneo e desfazer (se 1b) |
| `js/board.js` | efeito de "piscar" nos alvos durante o teste; dois cliques no marcador abrem a janela |
| `css/style.css` | janela larga em duas colunas, cartões, barras recolhidas |

## Testes
- Abrir e fechar a janela; editar cada tipo de ação; arrastar para reordenar; Escolher no mapa com a janela voltando.
- Testar gatilho conforme a resposta 1 (nada muda, se for simular).
- Lista: estado, ligar/desligar, testar.
- Recolher e abrir as barras; o mapa ocupa o espaço; lembra depois de recarregar.
- `trig.js` adaptado, `menus.js` em tela baixa, tutorial completo, 0 processos.
- Tutorial e wiki continuam pendentes até o usuário finalizar os gatilhos.

## Resultado (implementação; falta o usuário testar)
**O que entrou**
- Janela **Configurar gatilho** (flutuante, ~760 px, duas colunas SE | ENTÃO). Abre ao clicar no marcador (sem arrastar), no nome da lista ou em Configurar no painel. Uma janela de gatilho por vez.
- Ações como **cartões resumidos** (ícone, alvo, operação, espera; laranja quando falta o alvo); só o cartão aberto mostra os campos; a ação nova já abre. **Alça para arrastar** e mudar a ordem. "+ Adicionar ação" abre a lista de tipos com ícones.
- **Escolher no mapa** ("No mapa"): a janela some e volta sozinha (também ao cancelar com Esc).
- **Testar gatilho = simulação** (`Triggers.simulate`): o gatilho e cada alvo piscam no mapa do mestre com o rótulo da ação, no tempo dos atrasos; som de efeito/música toca só no mestre (prévia de 4 s para música). Nada muda no estado.
- Painel da direita virou **resumo**: frase ("Quando o grupo entrar na área → 3 ações"), lista curta, Configurar, Testar, Disparar agora, Rearmar, Apagar.
- **Lista no quadro da ferramenta**: bolinha de estado (pronto/esperando/gasto/desligado), nome (abre a janela), olho liga/desliga, ▶ testa; Rearmar todos embaixo.
- **Barras recolhíveis** (esquerda e direita): botão no topo; recolhida = faixa de 52 px com ícones (abrir, abas, Importar). Lembra no navegador (`vesper.paineis`). Com a direita recolhida, o painel do que estiver selecionado **flutua no mapa** (como no modo Apresentar).

**Testado** (`trig_ux.js` + foto; regressão `trig`, `trig_view`, `lights`, `door`, `blind`, `path`, `handouts`, `props`, `groups`, `menus`, tutorial completo; 0 processos)

**Pendente:** tutorial, wiki e README dos gatilhos (Planos 14 e 15) quando o usuário finalizar.
