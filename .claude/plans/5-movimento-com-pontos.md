# Plano 5 · Movimento com pontos de passagem

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "hoje o personagem só anda em linha reta, mas seria interessante fazer igual o roll20, onde o player consegue segurar a sua ficha com o esquerdo do mouse e com o direito do mouse ele coloca pontos, por exemplo eu arrasto a ficha 2 quadrados para a direita, clico com o direito e depois subo mais 2 quadrados, ao invés de uma linha reta de um ponto ao outro vai ter duas linhas e vai mostrar a régua total do caminho"

## Objetivo
Ao arrastar um token, o jogador (ou o mestre) marca pontos de passagem com o **botão direito**. O caminho vira várias linhas, cada trecho mostra a distância, e a régua mostra o **total do caminho**, para contornar paredes, mesas e aliados sem "cortar caminho" na contagem.

## Como funciona hoje
- Arrastar um token (`B.drag` em `js/board.js`) desenha uma única régua do ponto de saída até onde o token está, com a distância em linha reta (`drawRuler`, `cellsBetween`, que respeita a medida da cena: diagonal = 1, alternada 1-2-1 ou real).
- Ao soltar, o token pula para o destino (`token.move`).
- O botão direito hoje move a câmera (`startPan`), mesmo durante o arraste.
- A ferramenta Régua mede uma linha reta.

## Proposta

### Arrastando um token
1. Segure o token com o **botão esquerdo** e arraste.
2. Cada clique com o **botão direito** (sem soltar o esquerdo) fixa um **ponto de passagem** onde o token está naquele momento, encaixado no centro do quadrado.
3. O desenho mostra:
   - as linhas do caminho, de ponto em ponto, até o token;
   - um marcador em cada ponto;
   - a distância de **cada trecho** pequena no meio da linha;
   - o **total** em destaque perto do token (ex.: `4 quad. · 6 m`).
4. **`Backspace`** (sem soltar o mouse) desfaz o último ponto.
5. Ao **soltar** o esquerdo, o token vai para o destino.

### Exemplo do pedido
Arrastar 2 quadrados para a direita, clicar com o direito, subir 2 quadrados e soltar: duas linhas (2 + 2) e total **4 quadrados**, em vez da diagonal reta (2 quadrados na regra "diagonal = 1").

### Contagem
- O total é a soma dos trechos, usando a medida da cena.
- Na regra **alternada 1-2-1** (Pathfinder), a contagem das diagonais continua de um trecho para o outro (a 2ª diagonal do caminho todo vale 2, mesmo que esteja em outro trecho), como manda a regra.

### Régua
A ferramenta **Régua** ganha os mesmos pontos com o botão direito, para medir um caminho sem mover ninguém.

## Decisões do usuário
1. **O que os outros veem:** (b) ao soltar, todos veem o rastro com o total e o token desliza pelo caminho. **O mestre escolhe por quanto tempo** o rastro fica (Mesa → Regras automáticas → Rastro do movimento, em segundos; 0 desliga; padrão 3).
2. **Parede no caminho:** (a) trecho vermelho como aviso; o movimento é permitido.
3. **Limite de deslocamento:** gostou da ideia; virou o **Plano 6**.
4. **Botão direito:** só marca ponto enquanto segura o token (ou a régua); sem segurar nada, continua movendo a câmera.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/board.js` | `B.drag.points` (pontos de passagem); botão direito durante o arraste adiciona ponto em vez de mover a câmera; `Backspace` remove o último; desenho do caminho com distância por trecho e total; mesma coisa na Régua (`B.ruler.points`); contagem acumulada da regra 1-2-1; trecho vermelho se atravessar parede (resposta 2a). Se a resposta 1 for (b): animação do token deslizando e rastro ao soltar. |
| `js/store.js` | Se 1(b): `token.move` aceita `path` (lista de pontos) só para a animação e o rastro; a posição final continua sendo `x, y`. `permit()` continua conferindo turno e dono. |
| `js/net.js` | Nada (o `path` vai junto na ação). Se 1(c): mensagem leve com o caminho ao vivo. |
| `js/ui.js` | Nada além do tutorial. |

## Tutorial, wiki e README
- **Tutorial:** no passo "Mova o token" (Primeiros passos), explicar o botão direito para marcar pontos e a régua total. Passo de leitura curto, para não complicar o começo.
- **Wiki:** em *Tokens no mapa*, seção "Andar por um caminho" com foto do caminho de duas linhas e o total; na *Régua*, os pontos com o botão direito; atalhos (`botão direito` durante o arraste, `Backspace`).
- **README:** citar no item *Combate* ou *Mapas*: "movimento com pontos de passagem e régua do caminho".

## Testes
- Arrastar 2 quadrados para a direita, ponto, 2 para cima, soltar: duas linhas, trechos 2 + 2, total 4; token no destino.
- Regra 1-2-1: caminho com diagonais em trechos diferentes soma certo (ex.: 2 diagonais em trechos separados = 3).
- `Backspace` remove o último ponto; botão direito fora do arraste ainda move a câmera.
- Trecho atravessando parede fica vermelho (se 2a).
- Régua com pontos mede o total sem mover nada.
- Trava de turno continua funcionando (jogador fora da vez não move).
- Se 1(b): os outros veem o rastro e o token deslizando.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste.

## Resultado
Implementado com as decisões acima.

**O que entrou**
- Arrastando um token (ou com a Régua), o botão direito marca pontos no centro do quadrado (o navegador não manda pointerdown para o 2º botão; usamos mousedown). Backspace desfaz o último.
- Caminho tracejado com a distância de cada trecho e o total (quadrados e unidade da cena); trecho que atravessa parede ou porta fechada em vermelho.
- Regra 1-2-1 com diagonais acumuladas entre trechos (`pathCost`).
- Ao soltar, `token.move` leva `path` e `at`; o reducer guarda `t.lastMove`; cada tela anima o token pelo caminho (110 ms por quadrado, até 1,4 s) e desenha o rastro pelo tempo da regra `trailSecs`. Movimentos com mais de 10 s não animam de novo (campanha carregada). As setas do teclado também deslizam.
- A régua reta antiga (`drawRuler`) foi substituída por `drawPath`.
- Tutorial (passo de leitura "Andar por um caminho"), wiki (seção com foto, regra do rastro, atalhos) e README.

**Testado** (`path.js`, `path_shot.js`, `walk.js`)
- Pedido do usuário: 2 → ponto → 2 para cima: trechos 2 + 2 = 4 (reta seria 2); token no destino; caminho guardado com 3 pontos.
- Logo após soltar o token ainda está no início (deslizando); 1,6 s depois está no destino.
- Backspace tira o último ponto sem apagar o token; botão direito sozinho move a câmera.
- 1-2-1: uma diagonal em cada trecho = 1 + 2 = 3.
- Parede no caminho detectada; régua com ponto mede 3 + 2 = 5 sem mover ninguém.
- Painel Mesa mostra "Rastro do movimento" (3) e aceita 0.
- Tutorial completo sem erros; 0 processos de teste.

**Limitações**
- Os outros jogadores veem o caminho só depois que o token é solto (não ao vivo, opção c).
