# Plano 83 · Cor da ficha no chat

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Quero fazer um teste, hoje no chat todos tem a mesma cor, eu gostaria de pegar a cor que a gente escolhe na ficha e usar ela no chat, cada um vai ter a sua, assim só de bater o olho eu sei de quem eu recebi o ataque ou quem atacou, mas não a cor mesmo, vamos usar a cor que o cara escolheu ou a cor que já tem no caso e deixar ela mais clara, para não ficar feio"

## Objetivo
No chat, cada personagem e cada criatura aparecem com a cor **da ficha** (a mesma do token), **clareada** para ler bem no fundo escuro. Assim, de relance, dá para saber quem atacou e quem recebeu.

## Como funciona hoje
- `js/ui.js`, `msgHtml`: o nome de quem rolou usa a cor do **jogador** que mandou (`S().playerColor(m.playerId)`). Tudo o que o mestre rola (todas as criaturas e NPCs) sai na cor do mestre, e um jogador com dois personagens tem os dois na mesma cor.
- Os nomes dos alvos no cartão de ação (ex.: "Aventureiro FALHOU") não têm cor.
- A cor da ficha existe: `a.color` (campo "Cor" da ficha) ou a cor do próprio token (`t.color`), a mesma do círculo do token no mapa.
- A mensagem de ação guarda o token de quem agiu (`srcId`) e o de cada alvo (`tokenId`). A rolagem simples (`rollPost`) não guarda de qual ficha veio.

## Proposta
- **Nome de quem agiu** no topo da mensagem: a cor do token (ou da ficha), **clareada**.
- **Faixa fina à esquerda** da mensagem nessa mesma cor (ver pergunta), para achar de relance no meio de várias.
- **Nomes dos alvos** no cartão de ação ("Aventureiro", "Guardião"): cada um com a sua cor clareada.
- **Clarear:** a cor é misturada com branco até ficar clara o bastante para ler no fundo escuro, mantendo o tom. Exemplos: vermelho escuro `#8b1e1e` vira um rosado-avermelhado; azul `#1d4ed8` vira azul-claro; uma cor que já é clara fica quase igual. Assim nenhuma fica escura demais nem gritante.
- **Quando não há ficha** (rolagem livre do jogador na caixa do chat, mensagens antigas): continua a cor do jogador, como hoje.
- **Token com nome escondido** ("?" para os jogadores): para quem não é o mestre, sai em cinza, para a cor não entregar quem é.
- Vale também para o **cartão pequeno** que aparece sobre o mapa depois de um ataque.
- A rolagem simples a partir da ficha passa a guardar de qual token ou ficha veio, para ter a cor.
- A página "Criar ficha" não tem chat (só o painel Rolagens, que só você vê), então não muda.

## Perguntas para o usuário
1. **Faixa colorida à esquerda da mensagem:** (a) **sim**, além do nome (recomendo: é o que mais ajuda a achar de relance); (b) não, só o nome colorido.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/util.js` | `U.chatColor(cor)`: clareia a cor mantendo o tom |
| `js/store.js` | `rollPost` guarda o token ou a ficha (`srcId` / `actorId`) |
| `js/ui.js` | `msgHtml`, `actionMsgHtml`, `compactActionHtml`: cor de quem agiu e dos alvos; faixa |
| `css/style.css` | faixa à esquerda da mensagem |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Duas criaturas do mestre com cores diferentes atacando: nomes e faixas com cores diferentes, ambas claras (contraste suficiente no fundo).
- Cor escura (`#8b1e1e`) sai clara; cor clara quase igual.
- Alvos com as suas cores; rolagem simples da ficha com a cor; rolagem livre e mensagem antiga com a cor do jogador.
- Token com nome escondido: jogador vê cinza; mestre vê a cor.
- Foto do chat para você aprovar.
- `dados_chat.js`, `walk.js` sem erros; 0 processos no fim.

## Resposta do usuário
- "Não é só o nome, é a cor do card, mas a borda com a cor é uma boa, faz o seguinte, monta um html separado com alguns design, quero ver." Protótipo local temporário com 6 opções, apagado depois da escolha (A faixa, B faixa e fundo, C cabeçalho tingido, D borda inteira, E degradê, F selo), com cores, Clarear e Fundo ajustáveis.
- Escolheu **E: Degradê** (com os valores padrão do protótipo: clarear 40%, fundo 8% e cor também nos alvos).

## Resultado
Implementado em 24/11/2026.
- **`js/util.js`:** `U.chatColor(cor, k = 0.4)`: mistura com branco e continua clareando até a luminância 0,3 (legível no fundo escuro); cor inválida = sem cor. Ex.: `#8b1e1e` → `#c48c8c`; `#1d4ed8` → `#7795e8`.
- **`js/store.js`:** a rolagem a partir da ficha (`rollPost`) guarda `actorId`, `srcId`, `sceneId` e `fromMasked`; a mensagem de ação guarda `actorId`.
- **`js/ui.js`:** `tokenColor` (cor do token, senão da ficha) e `msgColor`; os cartões de ação e de rolagem com ficha ganham a classe `tinted` e `--c`; o nome de quem agiu na cor; cada alvo na sua cor (`--tc`), também no cartão pequeno sobre o mapa. Sem ficha (rolagem livre, mensagens antigas): a cor do jogador, sem degradê. Token com o nome escondido: cinza para os jogadores.
- **`css/style.css`:** `.msg.tinted`: faixa de 3 px à esquerda e o degradê (14% da cor sumindo até 65% da largura).

**Testes**
- `chat_cores.js` (novo): todos os casos sem erros. Foto do chat conferida.
- `dados_chat.js`, `dados3d.js`, `ficha5e_mesa.js` e `walk.js` (Pronto): sem erros.
- 0 processos no fim.
