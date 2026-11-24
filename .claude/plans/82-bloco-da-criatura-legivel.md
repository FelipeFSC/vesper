# Plano 82 · Bloco da criatura legível e com teste das ações

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Hoje temos tudo que precisamos ou pelo menos eu acho que tem, eu pedi tudo. Mas olha como o texto está todo da mesma cor, como é fácil se perder em meio a tudo, eu acho que falta um pouco de formatação, espaçamento, talvez destacar os elementos de um ataque ou status, sabe? me ajuda a melhorar essa visualização, os botões de play que tem no tabuleiro não tem aqui, então nem parece que dá para testar os ataques, tem pontos a serem melhorados"

Print: aba **Bloco** da Tarrasque na página "Criar ficha" (Traços, Ações, Ações bônus). Os nomes das ações estão em itálico, mas o resto é um parágrafo da mesma cor. Embaixo de cada ação vêm pílulas iguais (`+19`, `CD 20 Des`, `4d12+10 perfurante`, `alcance 4,5 m`) e não há botão para usar ou testar.

## Objetivo
Bater o olho no bloco e achar cada ação, o bônus de ataque, a CD, o dano e o tipo. Poder **testar** cada ataque também na página "Criar ficha", não só na mesa. Vale para as duas telas, porque o bloco é o mesmo.

## Como funciona hoje
- `js/ficha5e.js`, `npcBlock` e `npcItemView`: cada traço ou ação é um parágrafo `<p>` com o nome em negrito e itálico e o texto corrido. Embaixo, a linha `.f5-sb-btns` com pílulas `f5-rchip` todas iguais (ataque, CD, dano, alcance, recarga).
- **Botão play (usar no mapa):** só aparece quando quem desenha a ficha passa `ctx.use`. A mesa passa; a página não, porque lá não há mapa nem alvo.
- **Rolagens na página:** aparecem no painel "Rolagens" (`renderRolls`, `js/ficha.js`) num texto corrido de dados, sem as pecinhas do chat (Plano 79).

## Proposta
### 1. Cada ação vira um cartão
```
┌──────────────────────────────────────────────────────────────┐
│ ▍Bite                                    [▶ Testar]          │
│ ▍ATAQUE CORPO A CORPO                                        │
│ ▍ ⚔ +19   ◎ 4d12+10 perfurante (36)   ↔ alcance 4,5 m        │
│ ▍                                                            │
│ ▍Melee Attack Roll: +19, reach 4,5 m. Hit: 36 (4d12 + 10)    │
│ ▍Piercing damage, and the target has the Grappled condition  │
│ ▍(escape DC 20)…                                             │
└──────────────────────────────────────────────────────────────┘
```
- **Nome** maior, na fonte de título, com uma **faixa colorida à esquerda** pelo tipo: ataque (vermelho), resistência (azul), traço (cinza), lendária (dourado). Embaixo, o tipo em letra pequena ("Ataque corpo a corpo", "Resistência de Constituição", "Traço").
- **Linha de números** logo abaixo do nome, cada um com ícone e a sua cor:
  - ataque `⚔ +19` (clique rola o d20);
  - CD `🛡 CD 27 Con`;
  - dano `4d12+10 perfurante (36)`, com a **cor do tipo de dano** (fogo laranja, frio azul-claro, trovejante roxo, ácido verde, veneno verde-escuro, elétrico amarelo, necrótico cinza-esverdeado, radiante dourado, psíquico rosa, energia lilás; cortante, perfurante e concussão em cinza-claro); clique rola o dano;
  - alcance ou distância em cinza;
  - recarga `Recarga 5–6` e "usada".
- **Texto com destaques:** dentro do texto, ganham destaque os números de dano com os dados (`36 (4d12 + 10)`, clicável para rolar), as CDs (`DC 20`), os rótulos `Hit:`, `Failure:`, `Success:`, `Trigger:`, `Response:` em negrito e cor, e as **condições** (Grappled, Restrained, Prone, Frightened…) em destaque.
- Mais **espaço** entre os cartões e entre as seções (Traços, Ações, Ações bônus, Reações, Lendárias).

### 2. Testar as ações na página
- Na página "Criar ficha", cada ataque e cada resistência ganham o botão **▶ Testar** (no lugar do play da mesa):
  - **ataque:** rola o ataque e o dano juntos ("Ataque 1d20+19 = 31 · Dano 4d12+10 = 38"). Com 20 natural, o dano sai com os dados dobrados, como na mesa;
  - **resistência:** mostra a CD e rola o dano inteiro e a metade (se a ação tiver metade ao passar).
- Os resultados aparecem no painel **Rolagens** da página com as **pecinhas de dados** do chat (Plano 79): cada dado à mostra, um grupo por tipo de dano, com a soma.
- Na mesa, o **▶** continua usando no mapa (escolher o alvo), como hoje.

### 3. Status do topo do bloco
- CA, PV, Deslocamento e Iniciativa: o rótulo fica na cor de destaque (como hoje) e o **número em negrito e maior**.
- Linhas de Resistências, Imunidades e Sentidos com mais espaço, e os tipos de dano nessas linhas com a cor do tipo.

## Perguntas para o usuário
1. **Cores por tipo de dano** (fogo laranja, frio azul etc.): (a) **sim**, no dano e nas linhas de resistência e imunidade (recomendo: ajuda a achar "fire" de relance); (b) não, uma cor só para todo dano.
2. **Botão Testar na mesa também** (além do ▶ que usa no mapa)? (a) **não**, na mesa fica só o ▶, para não ter dois botões parecidos (recomendo); (b) sim, os dois.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ficha5e.js` | `npcItemView`: cartão (faixa, tipo, linha de números com ícones, texto com destaques, botão Testar quando há `ctx.test`); `npcBlock`: números do topo |
| `js/ficha.js` | passa `test` para a ficha 5e (rola ataque e dano juntos); painel Rolagens com as pecinhas de dados |
| `js/ui.js` | as pecinhas de dados (Plano 79) num lugar que a página também use |
| `css/ficha5e.css` | cartões, faixa por tipo, cores por tipo de dano, destaques do texto, espaçamento |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Tarrasque do bestiário, na página e na janela da mesa: cartões com o tipo certo (Bite = ataque, Thunderous Bellow = resistência, Legendary Resistance = traço); números com ícones; cor do dano por tipo; destaques no texto (`36 (4d12 + 10)` rola 4d12+10; `DC 20`; Grappled).
- Página: Testar no Bite põe ataque e dano no painel Rolagens com as pecinhas; Testar no Thunderous Bellow mostra a CD e o dano inteiro e a metade.
- Mesa: o ▶ continua abrindo a mira.
- Fotos do bloco na página e na mesa.
- `criatura5e.js`, `criatura5e_mesa.js` (que já falhava antes, Plano 79), `bestiario.js`, `ficha_acoes.js`, `walk.js` sem erros novos; 0 processos no fim.

## Resposta do usuário
"1 - Sim. 2 - Concordo, deixa como não por enquanto": cores por tipo de dano; na mesa só o ▶.

## Resultado
Implementado em 24/11/2026.
- **`js/ficha5e.js`** (vale para a página e para a mesa):
  - `npcItemView`: cada traço ou ação é um cartão (`.f5-card`) com faixa à esquerda pelo tipo (`k-attack` vermelho, `k-save` azul, `k-leg` dourado, `k-trait` cinza); nome na fonte de título; o tipo por extenso ("Ataque corpo a corpo", "Resistência de Constituição", "Traço", "Ação bônus"…); a linha de números com ícones (ataque, CD, dano com o tipo e a média, alcance, distância, recarga); o texto do livro com destaques.
  - `richText`: no texto, o dano com dados (`36 (4d12 + 10)`) vira botão que rola; CD/DC, os rótulos (`Hit:`, `Failure:`, `Success:`, `Trigger:`, `Melee Attack Roll:`, `Constitution Saving Throw:`…), as condições e o tipo do dano ganham destaque. O texto continua inteiro (conferido).
  - Linhas de vulnerabilidade, resistência e imunidade com a cor de cada tipo; os valores do topo (CA, PV, Deslocamento…) em negrito e maiores.
  - Botão **▶ Testar** quando quem desenha passa `ctx.test` (só a página); na mesa continua o ▶ de usar no mapa.
- **`js/ficha.js`:** `testAction`: ataque e dano juntos (20 natural dobra os dados); resistência: a CD, o dano e "Se passar (metade)"; num ataque com CD (ex.: escapar da agarrada), ela aparece como "CD do efeito". O painel Rolagens mostra os dados em pecinhas.
- **`js/dice.js`:** as pecinhas de dados do Plano 79 (`App.Dice.html`) saíram de `js/ui.js` para cá, para as duas telas usarem.
- **`css/ficha5e.css`:** cartões, cores por tipo de dano (`dt-fire`, `dt-cold`…), destaques e espaçamento.

**Testes**
- `bloco_criatura.js` (página, novo) e `bloco_criatura_mesa.js` (mesa, novo): todos os casos sem erros. Fotos da página (bloco e painel Rolagens) conferidas. A foto da mesa não chegou aos cartões (a janela volta ao topo); o teste confere lá os cartões, as cores, os destaques e o ▶ abrindo a mira.
- `criatura5e.js` (ajustado: o nome no cartão não tem mais o ponto final), `dados_chat.js`, `ficha5e_mesa.js`, `ficha_acoes.js`, `bestiario.js` e `walk.js` (Pronto): sem erros.
- `criatura5e_mesa.js` continua falhando na linha 46, igual a antes (já anotado no Plano 79).
- 0 processos no fim.
