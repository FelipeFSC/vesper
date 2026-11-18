# Plano 17 · Desfazer e refazer na montagem do mapa

**Status:** Implementado (testes do usuário)
**Versão:** 1.2
**Pedido do usuário:** escolheu da lista de ideias: "Desfazer e refazer (Ctrl+Z / Ctrl+Y) para paredes, imagens, luzes e gatilhos. Hoje não existe, e montar mapa sem desfazer é sofrido."

## Objetivo
O mestre erra ao montar o mapa (apagou a parede errada, moveu a imagem, mexeu no gatilho) e volta com **Ctrl+Z**. **Ctrl+Y** (ou Ctrl+Shift+Z) refaz.

## Como funciona hoje
Nenhuma mudança no mapa tem volta, a não ser as ações de combate (Desfazer no chat, que devolve PV e custo).

## Proposta
- Vale para **o que o mestre faz montando a cena**: paredes e portas (criar, apagar, mover, trocar tipo, trancar), imagens, pontos de luz, gatilhos, sons do mapa, salas de som, desenhos, névoa (revelar/esconder), notas do mapa (Plano 18), e colocar, apagar, mover e configurar tokens (pergunta 1).
- **Não** desfaz: chat, dados, combate e PV (já têm o próprio Desfazer), música, o que os jogadores fazem, e o que um gatilho fez ao disparar.
- Pilha do mestre com até **100 passos**, por sessão (recarregar a página zera). Cada passo desfaz uma ação inteira: um traço de lápis com 8 trechos volta de uma vez; mover 5 objetos selecionados (Plano 20) volta de uma vez.
- Aviso curto: "Desfeito: apagar parede" / "Refeito: mover imagem".
- Botões ↶ ↷ na barra de baixo (ao lado do zoom), apagados quando não há o que desfazer.
- Mudou de cena: o Ctrl+Z desfaz na cena em que a ação foi feita (e avisa).

## Técnico
- Antes de cada ação de montagem, o mestre guarda o "antes" só do que a ação mexe (a lista de paredes, a imagem, o token…) e o "depois". Desfazer = mandar uma ação `undo.restore` com o "antes"; refazer = com o "depois". Passa pela rede como qualquer ação, então todos veem.
- Ações que entram: `wall.*`, `prop.*`, `lightpt.*`, `trigger.add/update/delete`, `sound.add/update/delete`, `room.*`, `drawing.*`, `fog.*`, `note.*`, `token.add/delete/update` e `token.move` feitos pelo mestre, `order.move`, `group.*`.

## Decisões do usuário
1. **Tokens do mestre entram:** sim (colocar, apagar, mover e configurar). Ações dos jogadores, combate e o que um gatilho faz não entram.

## Perguntas (respondidas)
1. **Mover e colocar tokens como mestre também entra no Ctrl+Z?** *(Recomendo sim; o que o jogador move não entra.)*

## Testes
- Para cada tipo: criar → Ctrl+Z some → Ctrl+Y volta; apagar → Ctrl+Z volta igual; mover → volta ao lugar.
- Traço de lápis inteiro; seleção múltipla inteira (Plano 20).
- O jogador recebe o desfazer (vê a parede voltar). Ações do jogador e de combate não entram.
- 100 passos; pilha de refazer limpa ao fazer algo novo.
- Tutorial completo, 0 processos.

## Resultado
Implementado (falta o usuário testar; tutorial e wiki depois).
- `js/history.js`: pilha do mestre (100 passos), diferença campo a campo (desfazer não atropela o que os jogadores mudaram em outro campo/objeto); `History.batch` junta várias ações num passo (duplicar imagem, mover/apagar/colar seleção). Ação `undo.apply` (passa pela rede). Gatilhos e combate não entram (`noUndo`).
- Ctrl+Z, Ctrl+Y e Ctrl+Shift+Z; botões ↶ ↷ na barra de baixo com o nome do passo no título.
- **Testado** (`undo.js`): paredes, traço de lápis inteiro, imagem (mover, duplicar = 1 passo), luz, gatilho, token do mestre, névoa; gatilho disparando e rolagem fora da pilha; movimento do jogador mantido ao desfazer o "esconder"; refazer limpo após ação nova; limite de 100; botões.
