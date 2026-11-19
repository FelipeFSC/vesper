# Plano 37 · Remover jogador e jogador sem ficha não vê o mapa

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Outro 2 pontos, remover o jogador e quando o jogador está sem fixa no game ele não pode ver nada do mapa, não faz sentido ele receber espoiler de tudo de graça"

## Como funciona hoje
- **Jogadores:** quem entra na mesa vira um registro em `st.players` (`player.upsert`) e fica lá para sempre, mesmo que nunca volte. Não há como remover.
- **Sem ficha:** a visão do jogador vem dos tokens que ele controla (`App.Light.viewers`). Sem nenhum token, a lista fica vazia e ele vê **tudo o que está iluminado**; com a iluminação desligada na cena, vê o mapa inteiro, os tokens e as imagens. É o "spoiler de graça".

## Proposta
1. **Remover jogador** (só o mestre):
   - no menu do círculo da coluna de jogadores (Plano 36) e na janela "Mover jogadores": **Remover da mesa**, com confirmação;
   - sai da lista de jogadores e das cenas separadas; se estiver online, é **desconectado** na hora;
   - os tokens e as fichas dele **ficam** (o mestre decide o que fazer com eles); as fichas que eram dele passam a ser do mestre.
2. **Jogador sem token na cena dele não vê o mapa:**
   - a tela fica **escura**, com o aviso "Você ainda não tem um personagem nesta cena. Peça ao mestre para colocar o seu token.";
   - nada do mapa aparece: imagem do mapa, tokens, imagens soltas, desenhos, marcadores de portal;
   - continua funcionando: chat, dados, ficha, música e as imagens que o mestre mostrar ("Mostrar");
   - vale **com ou sem iluminação** na cena;
   - conta como "ter token": um token dele ou do grupo todo (dono "Todos") na cena em que ele está;
   - o mestre, no "Ver como" esse jogador, vê a mesma tela escura (para conferir).

## Perguntas para o usuário
1. **Remover:** o jogador pode **entrar de novo** com o código (recomendo: remover é só limpar a lista e desconectar), ou fica **bloqueado** nesta mesa até o mestre liberar?
2. **Fichas do removido:** passam a ser do mestre (recomendo) ou são apagadas junto?
3. **Token escondido** pelo mestre (o jogador ainda não "chegou"): conta como "sem token" e a tela fica escura (recomendo, assim o mestre pode deixar o personagem pronto e liberar na hora certa), ou conta como tendo token?

## Decisões do usuário
1. O removido pode entrar de novo com o código: sim.
2. Fichas do removido: "vão ser minha por enquanto, ai eu vejo o que faço" → passam a ser do mestre.
3. Token escondido conta como "sem token": sim ("vai que eu esqueço e coloco o player sem token na mesa, ai ele vê tudo ? não gosto").

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | ação `player.remove` (lista, cenas separadas, fichas); `permit` só do mestre |
| `js/net.js` | desconectar o jogador removido (e, se a pergunta 1 for "bloquear", recusar a entrada) |
| `js/board.js` | jogador sem token na cena: não desenha o mapa e mostra o aviso |
| `js/ui.js` | "Remover da mesa" no menu da coluna e em "Mover jogadores" |

## Testes
- Remover: some da lista, da coluna e das cenas separadas; online é desconectado; fichas ficam com o mestre.
- Jogador sem token: tela escura e aviso, com e sem iluminação; recebe "Mostrar" e chat; ao ganhar um token, passa a ver; "Ver como" do mestre igual.
- `walk.js` e a regressão sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Remover da mesa** (com confirmação) no menu do círculo da coluna de jogadores e em cada linha da janela "Mover jogadores". Ação `player.remove` (só o mestre): sai da lista e das cenas separadas; fichas e tokens dele passam a ser do mestre (dono vazio) e continuam no mapa.
- `App.Net.kick`: avisa o jogador ("O mestre tirou você da mesa…") e desconecta; ele não tenta reconectar sozinho, mas pode entrar de novo com o código.
- **Sem token, sem mapa:** se o jogador não tem nenhum token visível que controla na cena dele (dele ou do grupo todo; escondido não conta), a tela fica escura com o aviso "Você ainda não tem um personagem nesta cena. Peça ao mestre para colocar o seu token." Vale com ou sem iluminação. Chat, dados, ficha, som e "Mostrar" continuam. O "Ver como" do mestre mostra o mesmo; o menu do círculo avisa "Sem token na cena: X não vê nada do mapa".

**Testado** (`nofile.js`, regressão)
- Sem iluminação: Ana (com token) vê o goblin; Bruno (sem token) no escuro, painel do token escondido. Com iluminação clara: Bruno continua no escuro.
- Token escondido: Ana no escuro; ao mostrar, volta a ver.
- Remover a Carla pelo menu: some da lista e da coluna, recebe o aviso e é desconectada; a ficha e o token dela ficam com o mestre e o token continua no mapa.
- Remover o Bruno em "Mover jogadores"; a Carla entra de novo; jogador tentando remover outro é recusado.
- `party.js`, `blind.js`, `lights.js`, `high.js` e o tutorial completo sem erros; 0 processos.
