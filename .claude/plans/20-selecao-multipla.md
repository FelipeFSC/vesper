# Plano 20 · Selecionar vários, copiar e colar

**Status:** Implementado (testes do usuário)
**Versão:** 1.2
**Pedido do usuário:** escolheu: "Selecionar vários (laço ou Shift+clique) para mover, apagar ou copiar tudo junto, e copiar e colar entre cenas."

## Objetivo
Mexer num pedaço do mapa de uma vez: mover a sala inteira (paredes, imagens, luzes, gatilhos) dois quadrados para o lado, apagar um canto montado errado, ou copiar a "taverna pronta" de uma cena para outra.

## Como funciona hoje
Só um objeto selecionado por vez. Na ferramenta Selecionar, arrastar no vazio move a câmera.

## Proposta
- **Laço:** retângulo que seleciona tudo que estiver dentro (pergunta 1 sobre como ativar).
- **Shift + clique:** soma ou tira um objeto da seleção.
- O que entra: **tokens, imagens, luzes, gatilhos, sons do mapa, notas** e **paredes/portas** (pergunta 2).
- Selecionados ficam com moldura violeta, e um quadro mostra "7 itens: 3 paredes, 2 luzes, 2 imagens".
- **Mover:** arrastar qualquer um move todos juntos (encaixe no grid; Alt solta). Setas do teclado também.
- **Delete** apaga todos. **Ctrl+D** duplica todos.
- **Ctrl+C / Ctrl+V:** copia e cola **em qualquer cena**, no ponto do mouse, mantendo as posições entre eles. Gatilhos colados apontam para as cópias das portas e luzes coladas junto (a emboscada copiada funciona sozinha na cena nova).
- **Esc** limpa a seleção. Tudo entra no Ctrl+Z como um passo (Plano 17).
- Só o mestre. Jogadores continuam com um token por vez.

## Decisões do usuário
1. **Laço:** Shift + arrastar no vazio (arrastar sem Shift continua movendo a câmera).
2. **Paredes entram** quando as duas pontas estão dentro do laço (recomendação).

## Perguntas (respondidas)
1. **Como fazer o laço**, já que hoje arrastar no vazio move a câmera?
   - (a) **Shift + arrastar** no vazio faz o laço; arrastar sem Shift continua movendo a câmera. *(Recomendo: não muda o costume.)*
   - (b) Arrastar no vazio faz o laço; a câmera fica com o botão direito, o do meio, Espaço ou a ferramenta Mão.
2. **Paredes entram na seleção?** *(Recomendo sim: entra a parede que tiver as duas pontas dentro do laço. Sem isso, mover uma sala deixa as paredes para trás.)*

## Testes
- Laço pega cada tipo; Shift+clique soma e tira; parede só com as duas pontas dentro (se 2 = sim).
- Mover tudo junto (encaixe), setas, Delete, Ctrl+D.
- Copiar numa cena e colar em outra, no ponto do mouse; gatilho colado aponta para a porta colada.
- Ctrl+Z desfaz o mover e o colar inteiros.
- Jogador não seleciona vários; tutorial completo, 0 processos.

## Resultado
Implementado (falta o usuário testar; tutorial e wiki depois).
- Shift + arrastar no vazio (laço), Shift + clique (soma/tira; o que já estava selecionado entra junto). Tokens, imagens, luzes, gatilhos, sons, notas e paredes (as duas pontas dentro). Destaque violeta; painel "N itens: …" com Copiar, Duplicar, Apagar, Limpar.
- Arrastar um selecionado move todos (de quadrado em quadrado; Alt livre); setas; Delete; Ctrl+D; Ctrl+C / Ctrl+V no ponto do mouse em qualquer cena (grid diferente = escala). Gatilhos colados apontam para as cópias coladas junto. Cada operação = 1 passo no Ctrl+Z. Ação nova `wall.shift`.
- **Testado** (`multi.js`): laço (8 itens, parede de fora não), Shift+clique, mover +3, seta, 2× Ctrl+Z, Ctrl+D com gatilho religado às cópias, Delete, colar numa cena com grid 50 (tamanho e ligações certos), Ctrl+Z do colar, jogador sem seleção múltipla.
- **Detalhe:** Shift + clique numa **porta** continua trancando/destrancando (Plano 13); para pôr portas na seleção, use o laço.
