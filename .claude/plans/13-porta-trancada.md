# Plano 13 · Porta trancada e destrancada

**Status:** Concluído

## Decisões do usuário
1. **Atravessar porta destrancada fechada:** (b) o token passa e a porta **continua fechada**. O caminho não fica vermelho nem cega por causa dela; a visão continua tapada pela porta fechada.
2. **Trancar:** (c) os dois: **Shift + clique** no marcador e um **painel da porta** (clicar no marcador, como mestre, abre ou fecha e mostra o painel).
3. **Cadeado:** (b) só o mestre vê; o jogador descobre ao tentar abrir ("A porta está trancada").

Detalhes decididos na implementação: trancar fecha a porta; se o mestre abrir uma porta trancada, ela fica destrancada.
**Versão:** 1.1
**Pedido do usuário:** "vamos adicionar uma mecânica simples mas importante, porta trancada e porta aberta. Quem decide é o mestre. E a porta não trancada a gente pode atravessar, hoje o sistema não permite atravessar porta fechada, mas a porta destrancada pode passar sim."

## Objetivo
Cada porta passa a ter um estado a mais, **trancada** ou **destrancada**, que só o mestre muda. Porta destrancada não segura ninguém: o jogador arrasta o token por ela mesmo fechada. Porta trancada segura: ninguém passa e o jogador não abre.

## Como funciona hoje
- Porta = parede com `door: true` e `open`. Marcador dourado no meio; um clique abre ou fecha (`wall.door`). Jogadores também podem (`permit`).
- Porta fechada tapa a luz e a visão como parede absoluta (`Combat.wallType` → 'full').
- Desde o Plano 11, atravessar porta fechada deixa o jogador cego e o token volta ao soltar (`Light.moveBlocked`, `pathBlind`, `permit` de `token.move`).

## Proposta
- Campo novo `w.locked` (padrão: destrancada; portas antigas também).
- **Destrancada:**
  - qualquer um abre e fecha com um clique, como hoje;
  - fechada, continua tapando luz e visão;
  - **dá para atravessar**: o caminho do arraste não fica cego por causa dela e o movimento vale (pergunta 1: a porta abre sozinha?).
- **Trancada:**
  - fica sempre fechada;
  - o jogador que clica no marcador recebe o aviso "A porta está trancada" e nada acontece;
  - ninguém atravessa (cego no arraste e o token volta, como uma parede);
  - o mestre ainda pode abrir.
- **Como o mestre tranca:** pergunta 2.
- **Marcador:** a porta trancada ganha um cadeado no marcador (pergunta 3: quem vê o cadeado?).
- **Ferramenta Porta** (`O`): opção para as próximas portas nascerem **Destrancada** (padrão) ou **Trancada**.

## Perguntas para o usuário
1. **Ao atravessar uma porta destrancada fechada:**
   - (a) a porta **abre sozinha** quando o token passa (e fica aberta: todos veem o outro lado);
   - (b) o token passa e a porta **continua fechada**.

   *(Recomendo a: é o que acontece na mesa de verdade, e evita token "atravessando" porta fechada.)*
2. **Como o mestre tranca e destranca:**
   - (a) **Shift + clique** no marcador da porta;
   - (b) clicar na porta abre um **painel** com Aberta/Fechada e Trancada/Destrancada;
   - (c) os dois.

   *(Recomendo c: o atalho no jogo, o painel para quem não lembra.)*
3. **Os jogadores veem que a porta é trancada (cadeado no marcador)?**
   - (a) Sim, sempre.
   - (b) Não: só descobrem quando tentam abrir (aviso "A porta está trancada"). Só o mestre vê o cadeado.

   *(Recomendo b: dá mais suspense.)*

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | ação `wall.lock` (só o mestre); `wall.door` recusa abrir porta trancada vindo de jogador; `permit` de `token.move` deixa passar por porta destrancada; se 1a, `token.move` abre as portas destrancadas atravessadas. |
| `js/light.js` | `moveBlocked` ignora porta destrancada (a visão continua tapada por ela fechada). |
| `js/board.js` | cadeado no marcador; clique do jogador em porta trancada mostra o aviso; Shift+clique do mestre (se 2a/c); painel (se 2b/c); vermelho/cego no caminho conforme a regra nova. |
| `js/ui.js` | opção Destrancada/Trancada na ferramenta Porta; painel da porta (se 2b/c). |

## Tutorial, wiki e README
- Tutorial: no passo "Erga uma parede" (que já fala de portas), frase sobre trancar.
- Wiki: "Luz, paredes e portas" e "Andar por um caminho"; atalho Shift+clique.
- README: "portas trancadas" no item Luz e visão.

## Testes
- Jogador atravessa porta destrancada fechada: não fica cego, movimento vale (e a porta abre, se 1a).
- Porta trancada: o arraste cega, o token volta, o clique do jogador não abre (aviso) e a rede recusa abrir e atravessar.
- O mestre tranca e destranca; trancar fecha a porta.
- Cadeado visível conforme a resposta 3.
- Portas antigas: destrancadas.
- `blind.js`, tutorial completo (`walk.js`), 0 processos de teste.

## Resultado
Implementado com as decisões acima.

**O que entrou**
- `w.locked` nas portas (antigas = destrancadas). Ação `wall.lock` (só o mestre): trancar fecha; `wall.door` aberto pelo mestre destranca.
- Porta destrancada fechada: não fica vermelha, não cega e deixa passar (local e no `permit`), e continua fechada tapando a visão (`Light.passDoors`).
- Porta trancada: jogador que clica recebe "A porta está trancada."; `permit` recusa abrir, destrancar e atravessar; arraste fica vermelho, cego, e o token volta.
- Mestre: Shift + clique no marcador tranca/destranca; clique abre/fecha e mostra o **painel da porta** (Aberta/Fechada, Destrancada/Trancada, Apagar porta; Delete também apaga). Cadeado vermelho no marcador só para o mestre. Ferramenta Porta: "Novas portas: Destrancada | Trancada".
- Tutorial ("Erga uma parede"), wiki, README e docs.

**Testado** (`door.js`, `blind.js` atualizado, `path.js`, `walk.js`)
- Porta antiga: destrancada, não fica vermelha, não cega, mas tapa a visão; jogador atravessa arrastando (8, 4) e ela continua fechada; pela rede também.
- Shift+clique tranca e fecha; painel mostra "Fechada · trancada" com os botões certos.
- Jogador: clique mostra o aviso e não abre; arraste volta (5, 4) e fica vermelho; pela rede abrir, destrancar e atravessar são recusados.
- Mestre abre a trancada: aberta e destrancada; painel tranca e destranca.
- Ferramenta Porta com "Trancada" cria porta trancada.
- Foto do mestre com cadeado e painel conferida. `blind.js`: porta fechada destrancada não cega, trancada cega. Tutorial completo sem erros; 0 processos de teste.

**Limitações**
- Um clique do mestre no marcador sempre abre ou fecha a porta (além de mostrar o painel). Para só trancar sem mexer, use Shift + clique.
