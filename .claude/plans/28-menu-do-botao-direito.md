# Plano 28 · Menu do botão direito

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Vamos adicionar botão direito agora no sistema… quando eu clico no personagem que eu quero mover, eu só quero mover ele, não abrir o menu, agora com o direito sim eu abro o menu, existem outros pontos, como por exemplo animação, trigger, lanterna, todos esses itens seria interessante abrir a modal deles com o botão direito, só de eu conseguir apertar onde eu quero mexer e já ter as opções já vai salvar muito o sistema."

## Objetivo
- **Clique esquerdo:** só seleciona e move. Nada abre por cima do mapa.
- **Clique direito:** abre um **menu no lugar do clique**, com as opções do que está embaixo do mouse (token, imagem, luz, gatilho, porta, som, nota ou mapa vazio). O menu tem atalhos para as janelas de cada coisa: ficha, animação, gatilho, lanterna.

## Como funciona hoje
- **Esquerdo:** seleciona. No modo Apresentar, ou com a barra da direita recolhida, o **painel do token flutua ao lado dele** (`hudFloats`/`placeHud` em `js/ui.js`). Esse painel aparece a cada clique, até quando a ideia é só mover.
- **Direito** (`js/board.js`):
  - arrastar com ele **move a câmera** (`onDown` → `startPan`);
  - apertar enquanto o esquerdo arrasta um token, ou a régua, **marca ponto de passagem**;
  - o menu do navegador está bloqueado (`contextmenu` com `preventDefault`).
- **Janelas de cada coisa:**
  - imagem e luz: painel lateral e o editor de animação (Plano 27);
  - gatilho: janela Configurar gatilho;
  - token: ficha e painel do token;
  - nota: janela da nota.

## Proposta

### Como o direito decide
- **Clicar com o direito, sem arrastar** (menos de 5 px): abre o menu.
- **Arrastar com o direito:** continua movendo a câmera, como hoje.
- **Direito enquanto arrasta um token ou a régua:** continua marcando ponto de passagem.
- **Fechar o menu:** Esc, clicar fora, rolar o mapa ou escolher uma opção.
- **Posição:** o menu nunca sai da tela.

### O esquerdo fica só para mexer
- O **painel flutuante do token não abre mais** com o clique esquerdo. Ele abre pelo menu do direito (**Painel do token**) e fica aberto até fechar.
- No modo **Editar**, o painel da barra da direita continua mostrando o que está selecionado, porque não cobre o mapa.
- **Duplo clique:** continua abrindo a ficha do token e a janela do gatilho, como hoje.

### O que aparece em cada menu (o mestre vê tudo; o jogador, só o que pode)
| Clicou em | Opções |
|---|---|
| **Token** | Ficha · Painel do token · **Ações** (as da ficha, direto: "Espada longa", "Bola de fogo"…) · **Lanterna** (ligar/apagar e alcance) · Condições · Visão no escuro · Voo · (mestre) Mostrar/Esconder, Vulto, Grupo, Trazer para frente / Mandar para trás, Duplicar, Apagar |
| **Imagem no mapa** | Editar (painel) · **Animação** (abre o editor) · Tocar/Parar animação · Área de dano · Travar/Destravar · Trazer para frente / Mandar para trás · Duplicar · Apagar |
| **Ponto de luz** | Editar (painel) · Acender/Apagar · **Animação** (editor) · Tocar/Parar animação · Duplicar · Apagar |
| **Gatilho** | **Configurar** (janela) · **Testar** · Disparar agora · Ligar/Desligar · Rearmar · Duplicar · Apagar |
| **Porta** | Abrir/Fechar · Trancar/Destrancar · Tipo de parede · Apagar |
| **Parede** | Tipo de parede · Apagar o traço |
| **Som do mapa** | Tocar · Ligar/Desligar · Editar · Apagar |
| **Nota do mestre** | Abrir · Duplicar · Apagar |
| **Mapa vazio** | (mestre) **Colocar ficha aqui** (busca nas fichas e no bestiário) · Luz aqui · Gatilho aqui · Nota aqui · Som aqui · Colar · Ping · Centralizar aqui. (Jogador) Ping |
| **Vários selecionados** (Plano 20) | Mover junto · Duplicar · Apagar · Grupo |

- **Vários objetos no mesmo lugar** (um token em cima de um gatilho, por exemplo): o menu mostra primeiro o de cima e, no fim, "Outros aqui: Gatilho Alarme, Luz Tocha".
- Cada opção leva o mesmo ícone Lucide do resto da mesa e o atalho de teclado, quando tiver (Delete, Ctrl+D).
- Uma opção que abre janela abre a janela que já existe: ficha, painel, editor de animação, Configurar gatilho.

## Perguntas para o usuário
1. **Painel do token no modo Editar:** continua na barra da direita, mostrando o selecionado com o clique esquerdo? *Recomendo que sim*, porque não cobre o mapa. Só o flutuante deixa de abrir sozinho.
2. **Ações direto no menu do token** ("Espada longa", "Bola de fogo"), para atacar sem abrir a ficha? *Recomendo que sim*: é o atalho que mais economiza.
3. **"Colocar ficha aqui"** no mapa vazio, com busca nas fichas e no bestiário? *Recomendo que sim.*
4. **Segurar o dedo** no celular abre o menu? *Recomendo que sim.*

## Respostas do usuário
1. **Painel na barra da direita (modo Editar):** tudo bem, "contanto que tenha a opção de minimizar essa barra". A barra já recolhe (Plano 15, ícone no topo dela); o botão fica mais visível e entra também no menu do mapa vazio (**Recolher/abrir barra da direita**).
2. **Ações no menu do token:** sim ("se ficar ruim eu peço para tirar").
3. **Colocar ficha aqui:** explicado ao usuário (busca nas fichas e no bestiário e o token entra no ponto clicado); entra, e sai se ele não gostar.
4. **Toque no celular:** não agora.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/board.js` | Direito sem arrastar → menu (`B.hitAll(p)`: tudo que está no ponto, do de cima para o de baixo); arrastar continua câmera; toque longo |
| `js/ui.js` | `UI.contextMenu(x, y, itens)`: o menu, as listas por tipo e os atalhos para as janelas; painel flutuante só pelo menu |
| `css/style.css` | Menu (itens, separadores, submenu, atalho à direita) |

## Testes
- Esquerdo num token no modo Apresentar não abre o painel; direito abre o menu, e Painel do token abre o painel.
- Arrastar com o direito move a câmera e não abre o menu.
- Direito durante o arraste do token marca ponto de passagem.
- Cada tipo tem as suas opções e cada uma faz o que diz: ficha, animação, gatilho (Configurar, Testar, Disparar), lanterna, porta, som, nota, luz, imagem, mapa vazio (Colocar ficha aqui, Luz aqui…), vários selecionados.
- Objetos empilhados: "Outros aqui".
- Jogador: só as opções dele; no mapa vazio, só Ping.
- O menu fecha com Esc, clique fora e rolagem, e não sai da tela nos cantos.
- Toque longo.
- Regressão completa, tutorial completo (o tutorial pode citar o painel flutuante) e 0 processos.

## Resultado
- **`js/board.js`:**
  - **Clique direito sem arrastar** (menos de 5 px) abre o menu (`B.rdown` em `onDown`, decidido em `onUp`);
  - arrastar com o direito continua movendo a câmera, e o direito durante o arraste de um token ou da régua continua marcando ponto;
  - `B.hitAll(sc, p)` lista tudo que está no ponto (nota, luz, som, porta, tokens, imagem pela ordem z, gatilhos pelo centro ou pela área, parede);
  - `B.selectObj` seleciona um objeto, e `B.keyAct` usa os atalhos que já existem (Delete, Ctrl+D, Ctrl+C) para manter o desfazer e as regras.
- **`js/ctxmenu.js` (novo):** `App.UI.contextMenu`, com submenus que abrem do lado que cabe e um menu que nunca sai da tela. Fecha com Esc, clique fora ou rolagem.
  - **Token:** Ficha, Painel do token, **Ações** (com os atalhos 1, 2…), Condições, Lanterna e luz e Visão no escuro (com a iluminação ligada), Mostrar ou Esconder, Vulto, Frente ou Trás, Outro igual e Apagar.
  - **Imagem:** Editar, Animação ou Criar animação, Tocar ou Parar, Área de dano, Travar, Mostrar ou Esconder, Frente ou Trás, Duplicar e Apagar.
  - **Luz:** Editar, Acender ou Apagar, Animação, Tocar ou Parar, Duplicar e Apagar.
  - **Gatilho:** Configurar, Testar, Disparar agora, Ligar ou Desligar, Rearmar, Duplicar e Apagar.
  - **Porta:** Abrir ou Fechar (o jogador não abre a trancada), Trancar, Editar, Tipo de parede e Apagar.
  - **Parede:** Tipo de parede (do traço inteiro) e Apagar o traço ou esta parede.
  - **Som:** Tocar ou Ligar e Desligar, Editar e Apagar.
  - **Nota:** Abrir, Duplicar e Apagar.
  - **Mapa vazio:** Colocar ficha aqui (busca nas fichas e no bestiário; o token entra no ponto), Luz aqui, Gatilho aqui, Nota aqui, Colar aqui, Ping aqui, Centralizar aqui e Recolher ou abrir a barra da direita.
  - **Seleção múltipla:** Painel da seleção, Duplicar, Copiar e Apagar.
  - **Empilhados:** "Outros aqui".
  - **Jogador:** só o que pode; no mapa vazio, só Ping.
- **`js/ui.js`:** quando o painel flutua (Apresentar ou barra recolhida), ele só abre se for pedido pelo menu (`UI.hudFor` igual a `UI.selKey()`). O clique esquerdo só seleciona e move. No modo Editar, o painel da barra continua como antes.
- **Teste `ctxmenu.js`:**
  - clique direito de verdade (apertar e soltar o botão 2): menu do token, Esc, arrastar move a câmera;
  - ação pelo menu abre a mira, condição pelo menu;
  - Apresentar: o esquerdo não abre o painel e Painel do token abre;
  - luz (apagar, criar animação), gatilho (disparar, configurar), Outros aqui, porta (abrir), parede (tipo);
  - mapa vazio (luz aqui, colocar ficha aqui no ponto, recolher a barra), menu no canto cabe na tela;
  - jogador no token e no mapa vazio.
- **Fora agora:** toque longo no celular (o usuário não quer agora).
