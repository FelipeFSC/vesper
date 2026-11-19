# Plano 34 · Procurar paredes em mapas com textura

**Status:** Primeira versão (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Consegue me dar ideias para escanear paredes de mapas como esse que eu mandei a foto ? Por que manas com cores fixas eu vi que funciona perfeitamente, mas e esses ?" → "Gosto da ideia, vamos testar essas ideias,"

Exemplo do usuário: "Dwarven Mountain Keep" (rocha com textura, neve, fortaleza de pedra com chão de lajotas).

## Problema
A busca (Plano 22) compara a cor pixel a pixel, com um desfoque fixo de 3×3. Em rocha, neve e lajotas cada pixel tem uma cor: o "lado de fora" não se espalha pela rocha e a "cor da parede" acha parede no meio da pedra.

## Proposta (aprovada: "vamos testar essas ideias")
1. **Varinha mágica no chão** (modo novo "Chão das salas"): o mestre clica no chão de cada sala; o chão é "enchido" até a parede e a borda dele vira parede. Vários cliques = várias salas.
   - Móveis e manchas pequenas dentro da sala não viram parede (buracos pequenos são preenchidos).
2. **Ignorar textura** (barra, vale para todos os modos): borra a imagem por dentro antes de comparar (raio de 1 a ~7 pixels da leitura), para a rocha virar uma mancha e o chão outra.
3. **Tamanho mínimo** (barra): manchas menores que isso (árvores, pedras, móveis) não viram parede.
4. **Depois, se precisar:** pincel que gruda na borda.

## Arquivos
| Arquivo | O que muda |
|---|---|
| `js/scan.js` | `boxBlur` com raio (somas acumuladas); modo `floor` (inundação a partir dos cliques, buracos pequenos preenchidos); tamanho mínimo |
| `js/ui.js` | "Chão das salas" em "1. O que separa as salas"; barras "Ignorar textura" e "Tamanho mínimo" |

## Testes
- Mapa da fortaleza (do usuário, fora do git): cliques no chão das salas → paredes no contorno, com foto para conferir.
- `scan.js` (mapas sintéticos) sem regressão; 0 processos de teste no fim.

## Resultado
Primeira versão; o resultado no mapa da fortaleza é **parcial** (ajuda, mas precisa de acerto à mão).

**O que entrou**
- Modo **Chão das salas** em "1. O que separa as salas". Ao escolher, já vem com Ignorar textura 20% e Sensibilidade 35%.
- O chão enche a partir de cada clique até bater numa **borda forte** (força da borda na imagem borrada, `C.edges`); o limite é calculado **pelas bordas perto dos cliques** (não pelo mapa todo, porque rocha e neve têm bordas fortes demais). A cor do clique só impede de vazar para algo bem diferente.
- 2ª etapa: o chão avança até ~0,6 quadrado, parando só nas bordas mais fortes (o contorno das paredes); depois é alisado (fecha dentes e frestas).
- Barras **Ignorar textura** (desfoque com raio, `C.boxBlur`) e **Tamanho mínimo**, em todos os modos. No padrão, os modos antigos ficam como antes.

**Testado**
- Diagnóstico (`scandiag.js`: imagem borrada | bordas | chão) e foto das paredes sugeridas (`scanreal.js`), com o mapa da fortaleza (`_mapa_fortaleza.jpg`, fora do git).
- O que se viu no caminho: borrar demais (raio 5) apaga as paredes; limite de borda pelo mapa todo deixa o chão vazar; clique em cima de parede ou de rocha enche o lado de fora.
- Versão final: contorno de fora da fortaleza e boa parte das salas certos, 144 paredes, sem vazar para fora; alguns trechos ainda cortam o meio das salas (tochas, móveis e rejunte forte).
- `scan.js` (mapas sintéticos) e `doorscan.js` iguais a antes; 0 processos.

**Próximo passo sugerido:** o **pincel que gruda na borda** (o mestre passa o pincel por cima da parede e o sistema encaixa na linha), que resolve os trechos que a varinha erra.
