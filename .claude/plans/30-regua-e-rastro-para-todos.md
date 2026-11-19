# Plano 30 · Régua e rastro do movimento para todos

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "1 - a regua que mostra o que o jogador andou fica um tempo mostrando e isso é de proposito, por que ? para outros jogadores e o mestre poderem ver. só isso, e não está acontecendo 2 - a regua só regua serve para o mesmo ponto. mais 2 pontos, se possivel deixa a opção de ficar em tempo real também, mas ai o mestre ativa ou desativa nas opções da mesa, ai deixa como regua em tempo real ou desempenho (já que hoje não é em tempo real por conta de desempenho)."

## Objetivo
Quando alguém move um token ou mede com a régua, **todos na mesa** veem o caminho e a distância.
O mestre escolhe, em Mesa → Regras, se os outros veem isso **em tempo real** (enquanto a pessoa arrasta) ou só **no fim** (modo desempenho, como hoje).

## Como funciona hoje
- **Rastro do movimento:** ao soltar o token, a ação `token.move` leva o caminho e a hora (`t.lastMove = { pts, at }`, em `js/store.js`).
  - Cada tela desenha o rastro por `trailSecs` segundos (padrão 3, em Mesa → Regras), em `moveInfo()` de `js/board.js`.
  - **Defeito:** para não mostrar rastro velho ao abrir a campanha, `moveInfo()` só mostra se `Date.now() - at` for menor que 10 s. Mas `at` é a hora do **computador de quem moveu**. Se o relógio do mestre e o do jogador diferem mais de 10 s (comum), o rastro **nunca aparece** nas outras telas. Na tela de quem moveu aparece, por isso parece funcionar quando se testa sozinho.
- **Régua (tecla R):** é só local (`B.ruler` em `js/board.js`). Nada vai pela rede: só quem mede vê a linha e a distância.
- **Arrastar o token:** os outros só veem o token pular para o destino ao soltar. Durante o arraste nada é enviado.

## Proposta
1. **Corrigir o rastro.** A tela passa a considerar "novo" todo movimento que **chega enquanto a mesa está aberta**, sem comparar relógios. Rastro velho (de campanha recém-carregada ou de quem acabou de entrar) continua sem aparecer.
2. **Régua para todos.** Quando alguém mede, todos veem a linha, os pontos de passagem e a distância, com a cor e o nome de quem está medindo. Ao soltar, a régua some das outras telas junto com a de quem mediu (ou fica `trailSecs` segundos, ver pergunta 2).
3. **Opção do mestre em Mesa → Regras:** "Régua e movimento dos outros"
   - **Em tempo real:** enquanto alguém arrasta um token ou mede, os outros veem a linha andando, cerca de **10 vezes por segundo** (só o ponto atual vai pela rede, não o estado inteiro).
   - **Desempenho** (padrão, como hoje): os outros veem só no fim: o rastro do token ao soltar e a régua ao soltar.
   - O mestre sempre envia e recebe pela mesma regra; vale para todos os jogadores.
4. **Regras de visão continuam:** um jogador não vê a régua nem o rastro de um token que ele não enxerga (escondido, no escuro ou atrás de parede). O token oculto do mestre nunca aparece.

## Perguntas para o usuário
1. **Ponto 2:** entendi que "a régua só serve para o mesmo ponto" quer dizer que **só quem mede vê a régua**. É isso? Ou é outra coisa (por exemplo, medir de um ponto a vários)? Hoje já dá para marcar pontos de passagem com o botão direito enquanto mede.
2. **Régua depois de soltar:** nas outras telas, a régua some na hora (recomendo, ela é para mostrar enquanto mede) ou fica os mesmos segundos do rastro do movimento?
3. **Régua do mestre:** quando o mestre mede, os jogadores também veem? Recomendo **sim, com um botão** na régua "Mostrar aos jogadores" ligado por padrão, para o mestre poder medir escondido (ex.: alcance de uma armadilha).
4. **Padrão da opção:** começo em **Desempenho** (como hoje) e o mestre liga o tempo real se quiser? Recomendo sim.

## Decisões do usuário
1. "a logica da regua é a mesma do jogador, por que de vez em quando o mestre que mostrar algo ao jogadores ou o contrario." → a régua vale nos dois sentidos: mestre → jogadores e jogador → mestre e outros jogadores.
2. "E o mesmo esquema do jogador, vai ter as duas opções de tempo real ou sumir depois de um tempo." → a régua segue a mesma regra do movimento: depois de soltar, fica `trailSecs` segundos e some aos poucos (para todos, inclusive quem mediu); no tempo real, os outros também a veem enquanto a pessoa mede.
3. Botão "Mostrar aos jogadores" na régua do mestre, ligado por padrão: sim.
4. Padrão Desempenho: sim.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/board.js` | `moveInfo()`: "novo" = chegou com a mesa aberta, sem relógio; desenhar réguas e arrastes dos outros (`B.remote`), com cor e nome; enviar régua/arraste (a cada ~100 ms no tempo real, ao soltar no desempenho) |
| `js/net.js` | mensagem leve `ruler` (quem, cena, pontos, token) jogador → mestre → outros; o mestre filtra pela visão de cada jogador e pela cena dele |
| `js/store.js` | regra nova `rules.liveRuler` (`false` = desempenho) e `migrate()` |
| `js/ui.js` | Mesa → Regras: "Régua e movimento dos outros: Em tempo real / Desempenho"; botão da pergunta 3 nas opções da régua |

## Tutorial, wiki e README
Depois que você finalizar: passo do tutorial da régua (dizer que todos veem), seção da wiki da régua e do movimento, linha do README se a opção de tempo real for importante.

## Testes
- Dois relógios diferentes (jogador 1 minuto adiantado): o mestre vê o rastro por `trailSecs` segundos.
- Campanha recém-aberta: rastro antigo não aparece.
- Régua do jogador: aparece na tela do mestre e de outro jogador, com cor e nome; some ao soltar.
- Tempo real: durante o arraste, a outra tela recebe ~10 atualizações por segundo; desempenho: nenhuma até soltar.
- Token escondido ou fora da visão: o outro jogador não vê a régua nem o rastro.
- `walk.js` e a regressão de caminho (`path.js`) sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário (de preferência com dois computadores de verdade).

**O que entrou**
- **Rastro corrigido:** movimento que chega com a mesa aberta é sempre novo (`B.moveSeen`), sem comparar relógios. O mestre carimba a hora do movimento do jogador com o relógio dele; token ainda não visto (campanha recém-aberta) usa essa hora pelo relógio do mestre (`App.Anim.now`).
- **Régua para todos:** mensagem leve `ruler` (não mexe no estado). Os outros veem a linha, os pontos de passagem, a distância e o nome de quem mede. Depois de soltar ela fica `trailSecs` segundos para todos, inclusive para quem mediu.
- **Mesa → Regras → "Régua e movimento dos outros":** Desempenho (padrão, só ao soltar) ou Em tempo real (régua e arraste do token ~10 vezes por segundo, sinal de vida a cada 1,5 s; some depois de 5 s sem notícia).
- **Régua do mestre:** "Mostrar aos jogadores" nas opções da régua (ligado por padrão; aparece também no modo Apresentar). Token escondido do mestre não é enviado; quem não enxerga o token não vê o arraste dele.

**Testado** (`shareruler.js` com a rede simulada, regressão)
- Rastro com relógio 1 min atrasado aparece; movimento velho de campanha aberta não; mestre carimba a hora.
- Desempenho: 0 mensagens medindo, 1 ao soltar. Tempo real: 6 em 0,5 s, 1 sinal de vida parado, a última marca o fim.
- "Mostrar aos jogadores" desligado: 0 mensagens. Arraste ao vivo: 3 mensagens e "limpa a linha" ao soltar. Token escondido: 0.
- Régua de outro: aparece; de outra cena, não; cancelar tira; some depois de `trailSecs` e depois de 5 s sem sinal.
- `path.js`, `toggle.js`, `ctxmenu.js`, `blind.js` e o tutorial completo (`walk.js`) sem erros; 0 processos.
- Limitação: a conexão real entre dois computadores não foi testada aqui (o teste simula a rede).

**Pendente (depois que o usuário finalizar):** passo do tutorial "Andar por um caminho" (dizer que todos veem a régua), seção da wiki da régua e da opção nova.
