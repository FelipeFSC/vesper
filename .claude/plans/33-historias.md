# Plano 33 · Histórias (várias mesas preparadas)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Vamos adicionar mais um menu na home. Menu de histórias. depois desse menu que mandei print, vai ser uma tela onde vai ter vários quadrados com a imagem e o nome da história e no final um +, de criar um novo, por que o jogador pode preparar várias mesas e não só uma."

(O print é o menu Jogar: "Abrir mesa online", "Entrar na mesa online", "Voltar".)

## Objetivo
O mestre pode ter **várias histórias** (campanhas) prontas no mesmo navegador. Depois de "Abrir mesa online", aparece uma tela com um **cartão para cada história** (imagem e nome) e um cartão **+** no fim para criar uma nova. Ele escolhe uma, e a mesa abre com ela.

## Como funciona hoje
- `js/storage.js`: o IndexedDB `mesarpg` guarda **uma** campanha na chave `campaign` (`{state, assets, savedAt}`). O salvamento automático sempre grava nela.
- `js/main.js`: `startGM()` carrega essa campanha (ou cria uma nova) e abre a mesa. "Preparar tabuleiro" faz o mesmo, offline.
- Para ter outra campanha hoje, é preciso exportar a atual para um arquivo e importar outra por cima.

## Proposta
1. **Tela "Histórias"** (no lugar do menu, com o mesmo fundo):
   - **Cartões** em grade: imagem, nome, quando foi mexida pela última vez e quantas cenas tem. O último cartão é o **+ Nova história**.
   - **Clicar num cartão** abre a história: online, se veio de "Abrir mesa online"; offline, se veio de "Preparar tabuleiro" (pergunta 1).
   - **Menu do cartão** (⋯ ou botão direito): Renomear, Trocar imagem, Duplicar, Exportar (arquivo) e Apagar (com confirmação).
   - **Nova história:** pede o nome (e a imagem, opcional) e abre já pronta, com uma cena vazia.
   - **Voltar** e Esc voltam para o menu; setas e Enter escolhem, como no menu.
2. **Imagem do cartão:** a que o mestre escolher; se não escolher, o mapa da cena do grupo (pergunta 2).
3. **Salvamento:** cada história numa chave própria (`story:<id>`) e uma lista com nome, imagem pequena, data e número de cenas (`stories`). O salvamento automático grava na história aberta.
4. **Campanha que já existe:** vira a primeira história, sem perder nada.
5. **Dentro da mesa:** "Voltar ao menu" leva de volta à tela de Histórias. Importar uma campanha (menu ⋯) pergunta se é para **substituir a atual** ou **criar uma história nova** com ela.
6. **Código da mesa online:** o mesmo para todas as histórias (o link que os jogadores já têm continua valendo).

## Perguntas para o usuário
1. **"Preparar tabuleiro"** também passa pela tela de Histórias (recomendo **sim**: é ali que se prepara cada mesa), ou só "Abrir mesa online"?
2. **Imagem do cartão:** se o mestre não escolher uma, uso o **mapa da cena do grupo** (recomendo) ou um fundo padrão com a inicial do nome?
3. **Nome na interface:** a barra de cima hoje diz "Campanha". Troco para **"História"** em tudo (recomendo, para ficar igual ao menu) ou deixo "Campanha" dentro da mesa?
4. **Ordem dos cartões:** a **última mexida primeiro** (recomendo) ou a ordem que o mestre arrastar?

## Decisões do usuário
1. "Preparar tabuleiro" também passa pela tela de Histórias: sim.
2. Imagem do cartão: "O mestre escolhe, mas pode deixar como padrão o mapa da cena, gostei da ideia."
3. Nome: "O nome quem escolhe é o mestre." → cada história tem o nome que o mestre der; a barra de cima da mesa continua dizendo "Campanha" (não ficou claro se era para trocar o rótulo; perguntar).
4. Ordem: a última atualizada primeiro.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/storage.js` | várias histórias (`story:<id>`, lista `stories`), migração da chave `campaign`, salvar na história aberta, duplicar, apagar, miniatura |
| `js/main.js` | tela de Histórias entre o menu e a mesa; abrir online/offline com a história escolhida |
| `index.html`, `css/style.css` | tela de cartões (grade, cartão +, menu do cartão), no estilo do menu |
| `js/ui.js` | "Voltar ao menu" volta para as Histórias; importar campanha pergunta substituir ou nova; nome "História" (pergunta 3) |

## Tutorial, wiki e README
Depois que o usuário finalizar: wiki (seção "Histórias"), README (várias histórias), passo do tutorial se fizer sentido.

## Testes
- Campanha antiga vira a primeira história, igual.
- Criar 2 histórias, mexer em cada uma: o salvamento automático grava na certa; ao reabrir, cada uma volta como estava.
- Cartões: imagem, nome, data, cenas; + Nova; Renomear, Trocar imagem, Duplicar, Exportar, Apagar.
- Abrir online e offline pela tela; Voltar ao menu volta para a tela.
- Importar: substituir ou criar nova.
- `walk.js` e a regressão sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Tela Histórias** (`#st-screen` no menu, mesmo fundo): abre depois de "Abrir mesa online" e de "Preparar tabuleiro" (o título diz qual). Cartões com imagem, nome, "há X" e número de cenas; o último é **+ Nova história** (nome no próprio cartão, Enter cria e já abre). Setas andam pelos cartões, Enter abre, Esc volta.
- **Menu do cartão** (⋯ ou botão direito): Renomear (no próprio cartão), Trocar imagem, Usar o mapa da cena (quando há imagem do mestre), Duplicar, Exportar (arquivo .json da campanha) e Apagar (com confirmação).
- **Imagem:** a do mestre; sem ela, a miniatura do mapa da cena do grupo (refeita sozinha quando o mapa muda); sem mapa, a inicial do nome.
- **Salvamento** (`js/storage.js`): cada história em `story:<id>`; os cartões em `stories`. O salvamento automático grava na história aberta e atualiza o cartão. A campanha antiga (`campaign`) vira a primeira história na primeira vez (a chave antiga fica como estava, de reserva).
- **Voltar ao menu** (mestre) volta direto para a tela de Histórias (`?historias=online|offline`).
- **Importar campanha** (menu ⋯ → Importar): pergunta **Criar história nova** (a atual continua guardada) ou **Substituir a atual**.
- O código da mesa online é o mesmo para todas as histórias.

**Testado** (`stories.js`, `stories_shot.js`, regressão)
- Campanha antiga → primeira história, com a miniatura do mapa; cartões com "há 3 dias · 1 cena" e o + no fim.
- Menu do cartão; duplicar + renomear + imagem (o nome muda também dentro da história); apagar tira o cartão e a chave.
- Nova história pela tela abre a mesa; mexer e salvar grava na certa e a antiga continua igual; ordem com a última mexida primeiro.
- Importar pergunta e "Criar história nova" cria outra e abre, sem perder as outras.
- `?historias=offline` (Voltar ao menu) abre a tela sozinha. `menu.js` e o tutorial completo sem erros.
- **Limitação do teste:** o IndexedDB não responde no Edge sem tela com o tempo simulado (nem num banco novo). Os testes usam `App.Storage.mem` (a mesma lógica, guardando na memória). A gravação de verdade no navegador fica para o teste do usuário.
- Rodadas na página do menu deixaram processos do Edge de teste; foram encerrados e conferidos (0 processos, 0 pastas de perfil).

**Pendente (depois que o usuário finalizar):** wiki (seção "Histórias"), README (várias histórias), passo do tutorial se fizer sentido.
