# Plano 11 · Cego ao atravessar parede

**Status:** Concluído

## Decisões do usuário
1. **Quais paredes cegam:** (b) só as que tapam a visão de quem anda: parede absoluta, cobertura total e porta fechada (e, para quem é baixo, os muros da altura dele ou mais altos, como na regra de visão). Meia parede e três quartos continuam vermelhas só como aviso.
2. **Ao soltar com o caminho atravessando parede que cega:** "Ele volta para onde estava." O mestre continua podendo mover (ele arruma a mesa).

Junto: o teste de "atravessa" passa a pegar o canto da sala (diagonal exatamente pelo ponto onde duas paredes se encontram), que antes escapava.
**Versão:** 1.1
**Pedido do usuário:** "quando a fixa atravessa uma parede, a linha fica vermelha, vamos adicionar a mecânica do jogador ficar 100% cego quando a linha ficar vermelha por atravessar parede, é bom que não tem como o jogador espiar uma parede"

## Objetivo
Hoje, enquanto o jogador arrasta o token, a visão acompanha o token na hora. Arrastando por cima de uma parede, ele vê o outro lado e depois pode desistir: espiou de graça. Com a mudança, enquanto o caminho atravessa uma parede, o jogador fica **cego**: a tela fica toda escura até o caminho voltar a ser válido.

## Como funciona hoje
- `B.drag` em `js/board.js`: `posOf(t)` devolve a posição do arraste, e a luz e a visão (`Light.render`, `visibleTokens`) usam essa posição. Por isso a visão acompanha o arraste.
- `crossesWall(sc, a, b)`: o trecho fica vermelho se cruzar qualquer parede (de qualquer tipo) ou porta fechada. É só aviso: soltar é permitido (decisão 2a do Plano 5).
- Paredes com tipo: absoluta e cobertura total bloqueiam a visão; três quartos e meia, só de quem é mais baixo.

## Proposta
- Durante o arraste (jogador, ou o mestre em "ver como"), se algum trecho do caminho atravessa parede:
  - a tela fica **toda escura**: nada do mapa, nenhum outro token, nem o contorno das paredes;
  - continuam aparecendo o **próprio token**, o **caminho em vermelho** e um aviso curto perto do token: "Atravessando parede: sem visão";
  - o som do mapa não muda.
- Quando o caminho volta a ser válido (o jogador recua ou marca um ponto pela porta), a visão volta na hora.
- O mestre na visão dele não fica cego.
- Com a iluminação da cena desligada, também vale: a tela escurece durante o arraste inválido.

## Perguntas para o usuário
1. **Quais paredes cegam?**
   - (a) Todas as que ficam vermelhas, inclusive meia parede e três quartos.
   - (b) Só as que tapam a visão: parede absoluta, cobertura total e porta fechada. A meia parede e os três quartos ficam vermelhos só como aviso, como hoje.

   *(Recomendo b: um muro baixo dá para pular e enxergar por cima.)*
2. **Ao soltar com o caminho vermelho:**
   - (a) O movimento continua permitido, como hoje (o mestre vê o rastro e decide).
   - (b) O jogador não consegue soltar ali: o token volta para onde estava, com o aviso "O caminho atravessa uma parede". O mestre continua podendo.

   *(Recomendo b para paredes que cegam: senão o jogador solta do outro lado, vê, e volta.)*

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/board.js` | `B.drag.blind` calculado no `onMove` (algum trecho cruza parede que cega); no `render`, cego = escuridão total por cima de tudo, menos o próprio token, o caminho e o aviso; `visibleTokens` vazio para o jogador cego; se 2b, `onUp` recusa e devolve o token. |
| `js/store.js` | Se 2b: `permit()` também confere o caminho de `token.move` vindo do jogador (não aceita trecho que cruza parede que cega). |
| `js/light.js` | Nada. |

## Tutorial, wiki e README
- Tutorial: frase no passo "Andar por um caminho": atravessar parede deixa o jogador sem visão.
- Wiki: na seção "Andar por um caminho".
- README: não precisa.

## Testes
- Jogador arrasta por uma parede absoluta: cego (nenhum token de fora visível, tela escura); recua: volta a ver.
- Mesmo caso com meia parede: conforme a resposta 1.
- Ponto de passagem pela porta aberta: não cega.
- Soltar com caminho vermelho: conforme a resposta 2 (inclusive pela rede, no `permit`).
- Mestre: nunca cego.
- Tutorial completo (`walk.js`) sem erros; `path.js`; 0 processos de teste.

## Resultado
Implementado com as decisões acima.

**O que entrou**
- `Light.moveBlocked` (parede que tapa a visão de quem anda, pela altura do olho, como a regra da visão) e `B.pathBlind`/`B.dragCenters` em `js/board.js`.
- Jogador (e mestre em "ver como") arrastando através dessas paredes: tela preta, só o próprio token, o caminho vermelho e o aviso "Atravessando parede: sem visão". O contorno das paredes (Plano 10) também some.
- Soltar assim não move: o token volta, com o aviso "O caminho atravessa uma parede: o token voltou. Marque pontos para contornar". Setas do teclado também param ("Tem uma parede no caminho").
- `permit()` recusa `token.move` de jogador cujo caminho (posição atual → pontos → destino) atravesse essas paredes, com ou sem `path`.
- O teste de "atravessa" (vermelho e cego) agora pega a diagonal pelo canto da sala; passar rente à ponta solta de uma parede continua livre.
- O mestre não fica cego e pode mover através de paredes.
- Tutorial (passo "Andar por um caminho"), wiki (seção "Andar por um caminho") e docs.

**Testado** (`blind.js`, `blind_shot.js`, `path.js`, `walk.js`)
- Antes: chão do lado de cá visível (59,51,43); arrastando através da parede: preto; recuando: volta a cor; soltando do outro lado: o token volta para (5, 4).
- Pela porta aberta com ponto de passagem: enxerga e o movimento vale (8, 6). Porta fechada: cego.
- Meia parede: vermelho, sem cegar. Canto da sala: vermelho e cego. Rente à ponta solta: nenhum dos dois.
- Setas: para na parede; para o outro lado anda.
- Pela rede: caminho através da parede e pulo direto recusados; caminho pela porta aceito.
- Mestre arrasta através da parede: move.
- Foto do jogador cego conferida. `path.js` igual; tutorial completo sem erros; 0 processos de teste.

**Ajuste depois:** o usuário pediu para tirar a mensagem "Atravessando parede: sem visão" ("só de ficar vermelho, já sabemos"). Agora, cego, aparecem só o token e o caminho vermelho.

**Limitações**
- A trava vale só para o movimento; o mestre continua podendo mover tudo.
- Quem já está do outro lado de uma parede por engano (colocado pelo mestre) também não atravessa de volta sem contornar.
