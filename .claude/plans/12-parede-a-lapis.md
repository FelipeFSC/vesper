# Plano 12 · Parede a lápis

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "Adiciona uma opção de LAPIS para as paredes por favor. hoje só conseguimos fazer paredes retas"

Opção nova de uma ferramenta que já existe, sem regra de jogo nova: executada direto, com o plano registrado.

## O que mudou
- No quadro da ferramenta **Parede** (`W`): **Desenhar → Reta | Lápis**. Reta continua como antes.
- **Lápis:** segurar e desenhar à mão livre. Ao soltar, o traço é simplificado (Ramer-Douglas-Peucker, tolerância de 8% do quadrado: um arco de 81 pontos do mouse vira 8 trechos) e cada trecho vira uma parede do **tipo escolhido** (absoluta, total, ¾, meia). Todos guardam o mesmo `stroke`.
- Terminando a até **meio quadrado** de onde começou, o contorno se fecha sozinho.
- **Borracha** num trecho apaga o **traço inteiro**. Clicar num traço (sem desenhar) com outro tipo escolhido troca o tipo do **traço inteiro** (vale também para clicar com o modo Reta).
- O lápis não usa o encaixe no grid.
- `js/store.js`: `wall.delete` e `wall.update` aceitam `ids` (várias paredes de uma vez).
- Tutorial (passo "Erga uma parede"), wiki (Luz, paredes e portas) e docs.

## Testes
- `wallpencil.js`: opções Reta | Lápis; arco vira 8 paredes do mesmo traço e do tipo escolhido; bloqueia a visão de um lado e deixa a abertura livre; círculo fecha (fim = começo) e de dentro não se vê fora; clique com Meia troca só aquele traço; borracha apaga as 8 do arco; modo reta igual (1 parede, sem traço). Foto de uma caverna conferida.
- `menus.js` (opções da Parede cabem em 1280×620); tutorial completo (`walk.js`) sem erros; 0 processos de teste.

## Limitações
- O traço é simplificado: curvas muito pequenas (menos de 8% de um quadrado) viram reta.
- Não dá para editar um traço depois (mover pontos); apague e desenhe de novo.

## Resultado
Concluído.
