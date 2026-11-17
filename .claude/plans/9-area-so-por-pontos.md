# Plano 9 · Área de luz só por pontos

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "Está muito bom, só quero remover o quadrado, ele ficou ruim, deixa uma maneira de desenhar o ponto de luz" → escolheu "Só o modo Retângulo da Área".

Ajuste pequeno de interface (sem regra de jogo nova): executado direto, com o plano registrado.

## O que mudou
- A forma **Área** da ferramenta Luz agora tem um jeito só de desenhar: **clicar em cada canto** e fechar no primeiro ponto, com dois cliques ou Enter (Backspace desfaz o último ponto, Esc cancela).
- Saiu a escolha Retângulo/Polígono e o arraste de retângulo (`B.lightAreaMode` e o rascunho retangular em `js/board.js`; botões em `js/ui.js`).
- Áreas já criadas continuam iguais (cada uma é uma lista de cantos).
- Wiki atualizada.

## Testes
- `lights.js`: as opções mostram só Luz, Escuridão, Círculo, Cone e Área; 4 cliques + Enter criam uma área de 4 cantos com luz plena dentro; demais casos do Plano 8 iguais.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste.

## Resultado
Concluído.
