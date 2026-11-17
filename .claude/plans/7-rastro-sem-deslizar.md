# Plano 7 · Rastro sem o token deslizar

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "gostei do rastro, mas não gostei da ficha refazendo todo o caminho, mostra só o rastro mesmo."

Ajuste pequeno de interface (sem regra de jogo nova): executado direto, com o plano registrado.

## O que mudou
- Ao soltar o token, ele vai **direto para o destino**, sem deslizar pelo caminho (antes: 110 ms por quadrado, até 1,4 s).
- O **rastro** continua igual: todos veem o caminho com as distâncias por `rules.trailSecs` segundos (Mesa → Regras; 0 desliga).
- As setas do teclado também param de deslizar (o token pula para o quadrado).
- `js/board.js`: saíram `slidePos`, `alongPath` e a duração da animação; `movesActive` só considera o tempo do rastro.
- Tutorial, wiki e docs: o texto "o token desliza pelo caminho" virou "o token vai para o destino e fica o rastro".

## Testes
- `path.js`: logo após soltar, o token já está desenhado no destino e o rastro aparece; os demais casos do Plano 5 continuam.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste.

## Resultado
Concluído.

**Testado**
- `path.js`: depois de soltar, o token já é desenhado no destino (5, 3) e o rastro aparece na tela; trechos 2 + 2 = 4, Backspace, botão direito na câmera, 1-2-1, parede, régua e a regra do rastro continuam certos.
- Tutorial completo (`walk.js`): "Pronto", `erros: []`, nenhum passo sem concluir; 0 processos de teste.
