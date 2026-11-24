# Plano 79 · Dados legíveis no chat

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Gostaria que melhorasse a visualização dos dados no chat, te mandei um print mostrando um ataque do tarrasque e ele jogou uns 15 dados, mas o chat não mostra isso, não sei quando deu em cada dado, teria que melhorar a visualização"

Print: cartão do **Thunderous Bellow** da Tarrasque (resistência CD 27, Constituição). Mostra só "dano 82"; os dados do dano não aparecem em lugar nenhum.

## Objetivo
Em todo cartão de ação no chat dá para ver **cada dado rolado**, organizado por grupo (um grupo por tipo de dano), com a soma de cada grupo, e entender como o total virou o número que saiu da vida de cada alvo.

## Como funciona hoje
- `js/ui.js`, `actionMsgHtml`:
  - **Resistência** (`save`): a linha de cima mostra só `CD 27 · Constituição · dano 82`. Os dados do dano **existem** na mensagem (`m.dmg.detail`), mas não são mostrados.
  - **Ataque** e **Dano**: os dados aparecem numa linha corrida de texto miúdo (`.roll-detail`, 11 px), algo como `12d10 trovejante → 12d10 [6][3][10]… + 2d6 …`. Com muitos dados fica uma fila difícil de ler, e as partes de tipos diferentes se misturam.
  - O teste do alvo aparece como `1d20+(2) → 1d20 [15] + (2)` (com os parênteses da troca do `@valor`).
- `js/store.js`, `rollDamage`: com dano em partes (Plano 53), guarda o total de cada parte, mas **não guarda os dados de cada parte** separados, só tudo junto num texto.
- No alvo, quando o dano cai pela metade (passou na resistência) ou muda por resistência, imunidade ou vulnerabilidade, aparece só o número final (−82) e, às vezes, a nota "trovejante: resistência". Não aparece a conta.

## Proposta
### Bloco "Dano" no cartão (resistência, ataque, dano e cura)
Logo abaixo do título, um bloco com o total e os dados, **um grupo por linha**:

```
 Dano 82
 ┌─ 12d10 trovejante ──────────────────────── 66 ┐
 │ [6] [3] [10] [1] [8] [4] [7] [2] [9] [5] [6] [5] │
 └─ 2d8 + 4 concussão ─────────────────────── 16 ┘
   [7] [5]  + 4
```
- Cada dado é uma **pecinha** legível (maior que hoje), que quebra a linha quando não cabe. Máximo em dourado e 1 em vermelho, como já é. Dado descartado (vantagem) fica apagado e riscado.
- À direita de cada grupo, a **soma do grupo**. O tipo do dano em português (trovejante, fogo…).
- Bônus fixos aparecem depois dos dados (`+ 4`), sem os parênteses.

### Em cada alvo: de onde veio o número
- O teste do alvo fica limpo: `1d20 [15] + 2 = 17`.
- Quando o dano do alvo não é o total, uma linha curta mostra a conta: `82 → metade (passou) = 41`; `66 trovejante: resistência → 33`; `imune a fogo → 0`.
- No **ataque**, cada alvo tem o próprio dano (cada um rola o seu): o bloco de dados fica dentro do alvo, no mesmo formato de grupos.

### Cartão pequeno sobre o mapa
Não muda: continua o resumo; clicar nele leva ao chat, onde estão os dados.

### Mensagens antigas
Mensagens já no chat (sem os dados separados por grupo) mostram os dados num grupo só, no formato novo de pecinhas. Nada some.

## Perguntas para o usuário
1. **Muitos dados (ex.: 40d6 de uma Bola de Fogo de nível alto):** (a) **mostrar sempre todos**, quebrando a linha (recomendo: com as pecinhas, 40 dados ocupam umas 3 linhas); (b) mostrar os primeiros 20 e um "ver todos".
2. **Ordem dos dados:** (a) **na ordem em que caíram** (recomendo, é o que os dados 3D mostraram); (b) do maior para o menor.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/dice.js` | `roll` devolve também a lista dos grupos de dados (`groups`: fórmula, faces, descartados, soma) e os bônus fixos, além do texto de hoje |
| `js/store.js` | `rollDamage` e `pick` guardam os grupos de cada parte (com o tipo); o alvo guarda a conta do dano (metade, resistência, imune, vulnerável) |
| `js/ui.js` | `actionMsgHtml`: bloco de dano em grupos (resistência, ataque, dano, cura); teste do alvo limpo; linha da conta no alvo; mensagens antigas num grupo só |
| `css/style.css` | pecinhas maiores, grupos com a soma à direita |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Resistência com 12d10 + 2d8+4 de tipos diferentes: aparecem 2 grupos com 12 e 2 pecinhas, as somas batem com o total e com o "−" do alvo que falhou.
- Alvo que passou: a linha "metade (passou)" e o número certo. Alvo com resistência e alvo imune: a conta aparece.
- Ataque com 2 alvos: cada um tem os seus dados; crítico com dados dobrados mostra todos.
- Vantagem: o dado descartado aparece riscado.
- Mensagem antiga (sem grupos) continua aparecendo, num grupo só.
- Jogador com "esconder números" ligado: continua sem ver a vida do alvo.
- Foto do cartão da Tarrasque para você aprovar.
- `walk.js`, `dados3d.js` e `criatura5e.js` sem erros; 0 processos no fim.

## Resposta do usuário
"1 - Mostra tudo. 2 - que cairam é legal.": todos os dados sempre, na ordem em que caíram.

## Resultado
Implementado em 24/11/2026.
- `js/dice.js`: `roll` devolve `groups` (n, faces, modificador, valores na ordem, descartados, soma) e `flat` (bônus fixo), só quando a conta é simples (somas). Com ×, / ou dado subtraído fica só o texto de antes. `Dice.TYPE_PT` (tipos de dano em português) passou a morar aqui.
- `js/store.js`: a mensagem da ação guarda os grupos no teste, no ataque e em cada parte do dano (com o tipo e a fórmula); crítico ×2 guarda `mult`; o bônus de cobertura entra no `flat`.
- `js/ui.js`: bloco **Dano**/**Cura** com um grupo por tipo (fórmula limpa, tipo, soma e as pecinhas); teste e ataque numa linha `[15] + 2 = 17` (sem parênteses, descartado riscado); conta do alvo quando o dano muda (`79 → metade (passou) = 39`, `79 → trovejante: resistência = 45`, `passou: sem dano`). Mensagens antigas: um grupo só com os dados do texto.
- `css/style.css`: pecinhas maiores e grupos.

**Testes**
- `dados_chat.js` (novo): todos os casos sem erros (2 grupos e 14 dados, somas, falhou/passou/resistência, vantagem com 1 descartado por alvo, 8d6 sem dano ao passar, cura +2, 40d6 todos visíveis sem rolagem de lado, mensagem antiga). Fotos dos cartões conferidas.
- `walk.js` (Pronto, sem erros), `dados3d.js`, `ficha_mesa.js`, `ficha5e_mesa.js`: sem erros.
- `criatura5e_mesa.js` falha na linha 46 **igual sem esta mudança** (conferido com o código anterior): o teste lê a mensagem antes de os dados 3D pararem (Plano 70). Não tem relação com este plano.
- 0 processos no fim.
