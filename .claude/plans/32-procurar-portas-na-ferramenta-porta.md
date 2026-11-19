# Plano 32 · Procurar portas pela ferramenta Porta

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Melhoria, hoje só tem como colocar a porta automatica na tela de parede, eu acho que só de falar isso você já entendeu o problema."

Pedido pequeno e direto: implementado na hora, sem rodada de perguntas.

## Problema
- A busca automática de portas (Plano 22) só existia dentro de "Procurar paredes no mapa", na ferramenta **Parede**. A ferramenta **Porta** não tinha nada.
- Quem já tinha desenhado as paredes e queria só as portas precisava abrir a busca de paredes, que pede o clique no vazio e sugere paredes de novo.
- E mesmo assim, a porta criada ficava **em cima** da parede que já existia: a parede continuava tapando a passagem.

## O que entrou
- Ferramenta **Porta** → **Ajuda** → **Procurar portas no mapa**. Abre a mesma janela, no modo **só portas**:
  - só as etapas **1. Onde** e **2. Portas** ("Mostrar uma porta" da imagem, "Quão parecida", palpite);
  - não procura paredes e não pede o clique no vazio;
  - o **palpite** ("aberturas de 1 quadrado viram porta") usa as **paredes que já estão no mapa** e já vem ligado quando há paredes.
- **Criar** (nos dois modos): onde uma porta nova cai em cima de uma parede que já existe, a parede ganha a passagem (é cortada no trecho da porta). Um Ctrl+Z desfaz tudo.
- A ferramenta Parede continua abrindo a janela completa.

## Arquivos
| Arquivo | O que muda |
|---|---|
| `js/scan.js` | `run()` com `opts.only === 'doors'` (sem paredes; palpite pelas paredes do mapa); `apply()` corta as paredes existentes sob as portas novas |
| `js/ui.js` | botão na ferramenta Porta; `UI.openScan('doors')`; janela com as etapas do modo só portas |

## Testes (`doorscan.js`, regressão)
- Botão na ferramenta Porta; janela "Procurar portas no mapa" com "1. Onde | 2. Portas"; palpite já ligado.
- Mapa com 2 portas desenhadas e paredes inteiras por cima: mostrou uma porta → 0 paredes, 2 portas; Criar → as paredes deixam de tapar as portas e o resto continua; Ctrl+Z desfaz tudo.
- Palpite pelas paredes do mapa acha a abertura de 1 quadrado; sem exemplo nem palpite, pede um dos dois.
- Ferramenta Parede: janela completa. `scan.js`, `door.js`, `toggle.js` sem erros; 0 processos (sobrou um Edge de teste numa rodada; encerrado e conferido).

## Tutorial, wiki e README
Depois que o usuário finalizar: citar o botão na ferramenta Porta no passo/seção de portas e de "Procurar paredes".
