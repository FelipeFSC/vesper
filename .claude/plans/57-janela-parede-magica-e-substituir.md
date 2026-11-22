# Plano 57 · Janela, parede mágica, desenhar por cima e pontas conectadas

**Status:** Implementado
**Versão:** 1.x
**Pedido do usuário:** "Mecanica de janela, vai ser igual a parede porem vai ser uma parede que a gente não consegue atravessar mas consegue olhar do outro lado, outro ponto, adicionar parede magica onde o mesmtre consegue desativar a parede, mais um ponto, a possibilidade (se não tiver ainda) de pintar em cima da parede, por exemplo eu coloquei a parede e depois quero colocar as portas e janelas e o sistema já substitui a área que eu selecionei."
Depois: "conexão dos pontos, o sistema conectar os pontos da porta com a parede ou janela ou parede magica [...] hoje é muito facil fazer parede na porta, ficar um buraco e fica passando luz, agora se o sistema conectar o ponto, nunca vai ficar sobrando."

## Objetivo
Quatro melhorias nas paredes:
1. **Janela:** ninguém atravessa, mas todos enxergam o outro lado.
2. **Parede mágica:** o mestre liga e desliga. Desligada, é como se não existisse.
3. **Desenhar por cima:** porta, janela ou parede de outro tipo desenhada sobre uma parede substitui só aquele trecho.
4. **Pontas conectadas:** as pontas do que é desenhado grudam nas paredes, portas e janelas próximas, sem deixar fresta por onde passa luz.

## Como funciona hoje
- Parede: `sc.walls[]` com `{x1, y1, x2, y2, cover}`. Os tipos são `full`, `high`, `three` e `half` (`App.Combat.wallType`, `COVER_TYPES`). Porta: `door`, `open`, `locked`.
- `js/light.js` `prepare()`: segmentos que bloqueiam luz e visão. `L.moveBlocked` usa os mesmos segmentos para travar o movimento (`permit` de `token.move`) e para deixar a tela escura no "Sem espiar" (Plano 11).
- Porta desenhada em cima de parede **não** corta a parede (`js/board.js`, fim do arraste em `B.wallDraft`). Só o Procurar paredes corta (`cutByDoor` em `js/scan.js`).
- A ferramenta de Reta encaixa as pontas nos cantos do grid, mas não nas paredes que já existem. Paredes que vêm do Procurar paredes ou do Lápis quase nunca ficam em cantos do grid, então sobra fresta.

## Proposta

### 1. Janela
- Novo tipo na ferramenta Parede, ao lado de Absoluta/Total/¾/Meia: **Janela** (`cover: 'window'`).
- **Movimento:** ninguém atravessa (o mestre continua sem trava). O caminho fica vermelho ao cruzar.
- **Cego:** como em qualquer trecho vermelho, o jogador fica cego enquanto arrasta por cima, e soltar não move (regra do usuário: ficou vermelho, fica cego; evita vantagens e bugs).
- **Visão:** parado, a janela não tapa. Quem está de um lado vê o outro, inclusive na névoa de guerra e na memória de exploração.
- **Luz:** passa.
- **Ataques:** fechada, nada passa. A janela bloqueia ataques como uma parede (cobertura total).
- **Abrir:** a janela abre e fecha como a porta (`w.open`), com um marcador no meio da janela, que todos veem.
  - **Aberta:** vira um vão. Passa movimento, visão, luz e ataque.
  - **Opção "Jogadores podem abrir"** (`w.playersOpen`, desligada por padrão): ligada, qualquer jogador abre e fecha clicando no marcador. Desligada, só o mestre abre.
  - **Quebrar:** sem regra automática. O jogador rola o dado no chat e o mestre decide; se ele liberar, abre a janela.
  - A ferramenta Parede, com Janela escolhida, tem a chave "Jogadores podem abrir" para as próximas janelas; cada janela também troca no painel e no botão direito.
- No mapa do mestre: linha azul-clara dupla (tracejada quando aberta).

### 2. Parede mágica
- Opção **Mágica** que vale para qualquer tipo de parede, inclusive a janela (`w.magic`). A porta fica de fora.
- **Ligada** (padrão): funciona como uma parede normal do tipo dela.
- **Desligada** (`w.off`): não bloqueia nada (movimento, visão, luz, ataque).
- Só o mestre liga e desliga:
  - clique no marcador (um losango roxo no meio da parede);
  - botão direito → **Ligar** / **Desligar**;
  - painel da parede.
- Visual do mestre: roxo com brilho quando ligada, roxo tracejado e apagado quando desligada. Os jogadores não veem marca nenhuma.
- **Gatilhos:** ação nova "Parede mágica" com **Ligar** / **Desligar**, escolhida no mapa como a porta.
- Ação nova `wall.magic` (só o mestre, `permit`), um passo no desfazer.

### 3. Desenhar por cima da parede
- Na ferramenta Parede (modo Reta) e na Porta: o trecho desenhado em cima de uma parede existente, paralelo e colado nela, **substitui** aquele pedaço.
  - Porta de 1 quadrado no meio de uma parede de 6: a parede vira 2 trechos, com a porta no vão.
  - 2 quadrados de Janela, ou de Meia, sobre uma parede Total: só esse pedaço muda de tipo.
- Tolerância igual à do Procurar paredes: até 0,3 quadrado de distância e quase paralela.
- O que sobra da parede cortada guarda as opções dela (tipo, mágica, traço do lápis).
- Uma ação só (`wall.add` com `replace: true`): um passo no desfazer e uma mensagem na rede.
- `cutByDoor` sai de `js/scan.js` para um lugar comum, usado pelos dois.
- O Lápis fica de fora (decisão do usuário).

### 4. Pontas conectadas
- Ao desenhar (Reta, Porta e Janela; e as duas pontas do traço de Lápis), cada ponta gruda, nesta ordem:
  1. na **ponta** de uma parede, porta ou janela que esteja a até 0,25 quadrado;
  2. num **ponto da linha** de uma parede que esteja a até 0,25 quadrado (encontro em T);
  3. no canto do grid, como hoje.
- Durante o arraste, um círculo mostra onde a ponta vai grudar.
- Ao **substituir** (item 3), as pontas da porta ou janela são projetadas exatamente sobre a linha da parede, e os trechos que sobram terminam nesses mesmos pontos. Assim nunca sobra fresta, mesmo que a porta tenha sido desenhada um pouco torta.
- Segurar **Alt** desliga o grude (para os raros casos em que se quer uma ponta solta).

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/combat.js` | `COVER_TYPES` + `window`; `wallType`; janela bloqueia ataque; mágica desligada não conta |
| `js/light.js` | `prepare()`: janela fora da visão e da luz, mas bloqueia movimento; mágica desligada fora de tudo; corte de trecho e grude compartilhados |
| `js/store.js` | `wall.add` com `replace`; `wall.magic`; `wall.door` vale para janela; `wall.update` aceita `window`, `magic` e `playersOpen`; `permit` |
| `js/board.js` | desenho da janela e da mágica; marcador com clique; grude com círculo de prévia; arraste chama `replace` |
| `js/scan.js` | usa o corte compartilhado |
| `js/ui.js` | menu da ferramenta Parede: linha Janela e chave Mágica; painel da parede |
| `js/ctxmenu.js` | Tipo de parede → Janela; Ligar/Desligar |
| `js/triggers.js` + `js/ui.js` | ação Parede mágica (Ligar/Desligar) nos gatilhos |
| `css/style.css` | linha da janela e da mágica no menu |

## Tutorial, wiki e README
- Ficam para quando o usuário der a função por finalizada (combinado).

## Testes
- Janela: jogador não atravessa (permit recusa; caminho vermelho; tela escura ao arrastar por cima); parado, vê o token do outro lado; a tocha ilumina o outro lado; ataque através dela é recusado.
- Janela aberta: passa movimento e ataque. Com "Jogadores podem abrir" desligado, o jogador não abre pela rede; ligado, abre e fecha.
- Mágica ligada bloqueia como o tipo dela; desligada não bloqueia nada; jogador não liga nem desliga pela rede; o gatilho liga e desliga.
- Porta de 1 quadrado no meio de uma parede de 6: sobram 2 trechos e a porta, com as pontas iguais (sem fresta); um Ctrl+Z desfaz tudo; a luz não vaza nas pontas.
- Porta desenhada 0,2 quadrado fora da linha: é projetada sobre a parede e substitui sem fresta.
- Grude: ponta a 0,2 quadrado de uma ponta de parede vai exatamente para ela; com Alt, não gruda.
- Procurar paredes continua cortando como antes.
- Tutorial completo (`walk.js`) e teste de rede sem erros.
- 0 processos de teste no fim.

## Resultado
- Feito como acima. A janela é `door + window` e reaproveita marcador, abrir/fechar, painel e gatilho de porta.
- Diferenças do plano:
  - Não há "painel da parede" para a mágica: liga/desliga pelo losango, pelo botão direito (Ligar/Desligar, Tornar mágica, Deixar de ser mágica) e, na janela, pelo painel dela.
  - O Procurar paredes manteve o `cutByDoor` próprio (o corte novo fica em `B.replaceCut`).
  - "Sempre que ficar vermelho, fica cego" foi aplicado à janela. Muro baixo continua como antes (vermelho, mas quem é mais alto passa e enxerga).
- Limites:
  - O dado `magic` vai para os jogadores na rede: só o visual esconde.
  - O jogador abre uma janela liberada clicando no meio dela (sem marca visível) ou pelo botão direito.
  - Numa janela mágica, "No mapa" do gatilho pega a janela (porta) antes da mágica: use a lista.
- Testado em `.claude/testes/paredes57.js` (todos ok): regras da janela (movimento, visão, luz, ataque, vermelho, cego, permit, abrir com e sem permissão, não tranca, trocar tipo), mágica (liga/desliga, jogador não mexe, gatilho), substituir (porta torta projetada, 2 trechos colados, opções mantidas, 1 passo no desfazer, sem fresta e sem vazar luz na junta, casos que não substituem), grude (ponta, T, grid, preferência do grid, lápis). Fotos do mestre e do jogador conferidas.
- Wiki e tutorial: ficam para quando o usuário der a função por finalizada.
