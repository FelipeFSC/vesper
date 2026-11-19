# Plano 29 · Isolamento de som (no lugar da "sala de som")

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "quando eu pedi ela eu quiz um delimitador onde a musica ou som não passa e dentro desse limitador eu posso configurar se a musica de fora vai continuar tocando sim ou não, mas você fez uma area de musica, não foi isso que eu pedi, tanto que eu dei um exemplo de parede de algodão."
Pedido original: "selecionar um local, da mesma forma que a gente seleciona a parede, mas que não passa som".

## Objetivo
A ferramenta deixa de ser uma área com música própria e vira um **isolamento de som**: uma borda, desenhada como parede, que nenhum som atravessa. Ela não tapa a visão e não impede ninguém de andar, como uma "parede de algodão".
Dentro dela o mestre escolhe se a música de fora continua ou para, e o que acontece com o ambiente de fora.

## Como funciona hoje
- **Desenho:** `sc.rooms` em `js/board.js` (ferramenta `room`, tecla M), retângulo ou polígono, pintada como área cheia com o nome da música em cima.
- **Música própria:** cada sala tem `music`, `vol` e `at`. Soltar uma música dentro da sala troca a música da sala (`App.Audio.dropAt`).
- **Música da cena:** só para quando a sala tem música própria. Uma sala sem música não oferece a opção.
- **Ambiente de fora:** Para, Abafado ou Continua (`room.ambient`).
- **Sons do mapa:** `hearing()` em `js/audio.js` já não deixa som entrar nem sair (`roomAt` diferente = silêncio).
- **Painel:** `roomHud` em `js/ui.js`, com nome, música da sala, volume, ambiente e o botão Recomeçar.

## Proposta
- **Nome:** "Isolamento de som". Fica no mesmo botão e na mesma tecla M.
- **Desenho:**
  - Clicar ponto a ponto, como a parede, com encaixe na grade e nos cantos das paredes. Fecha ao clicar no primeiro ponto. O retângulo arrastado continua.
  - No mapa aparece só a **borda** (traço roxo tracejado, com bolinhas nos cantos para editar). Não aparece área pintada nem nome de música.
  - Só o mestre vê. Não bloqueia visão, luz nem movimento.
- **Regra do som:** nenhum som do mapa atravessa a borda, nem de fora para dentro nem de dentro para fora. Isso já existe e continua.
- **Configuração** (painel e menu do botão direito):
  - nome;
  - **Música de fora:** Continua ou Para. Padrão: Para.
  - **Ambiente de fora:** Para, Abafado ou Continua. Padrão: Para.
- **Sai:**
  - música própria, volume da sala, Recomeçar e o nome da música no mapa;
  - soltar uma música dentro deixa de virar "música da sala". Vira um **som do mapa** comum, que só quem está dentro ouve, porque não atravessa a borda.
- **Exemplo:** uma taverna com a música de fora em "Para" e um som do mapa com alaúde lá dentro. Quem entra deixa de ouvir a música da cena e ouve o alaúde; quem está na rua não ouve o alaúde.
- **Campanhas salvas:** as salas antigas viram isolamentos com a mesma forma.
  - Com música própria: a música vira um som do mapa no centro, com alcance para cobrir a sala, e a "Música de fora" fica em Para.
  - Sem música: a "Música de fora" fica em Continua, igual ao que acontecia.

## Perguntas para o usuário
1. **Som do mapa dentro do isolamento:** hoje ele fica mais baixo longe do ponto. Para a música de uma sala, coloco uma opção no som do mapa "Igual na área inteira do isolamento" (mesmo volume em qualquer canto da sala)? Recomendo **sim**, desligada por padrão.
2. **Paredes normais:** hoje elas abafam o som (35%) mas deixam passar. Quer também uma opção na parede "Não passa som"? Recomendo **deixar para outra vez**: o isolamento já resolve.
3. **Nome:** "Isolamento de som" está bom, ou prefere outro ("Parede de som", "Barreira de som")?

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | `migrate()`: sala com música vira som do mapa e ganha `outside: 'stop'`; sem música, `outside: 'keep'`; tira `music`, `vol` e `at` |
| `js/audio.js` | `updateRoom`: a música da cena segue `outside` (para ou continua); some o canal de música da sala; `dropAt` não troca mais a música da sala; opção da pergunta 1 em `hearing()` |
| `js/board.js` | `drawRooms` mostra só a borda e os cantos; modo ponto a ponto como padrão |
| `js/ui.js` | `roomHud` novo (nome, Música de fora, Ambiente de fora, Apagar); textos da ferramenta e do painel Som |
| `js/ctxmenu.js` | item "Isolamento de som" no menu do botão direito (Configurar, Música de fora, Apagar) |
| `js/history.js` | nome no desfazer: "isolamento de som" |

## Tutorial, wiki e README
Depois que você finalizar. O passo atual "Sala de som" (`js/tutorial.js`) e a wiki precisam ser reescritos.

## Testes
- Token dentro com "Música de fora: Para": música da cena com volume 0. Com Continua: volume normal.
- Ambiente de fora: Para, Abafado (30%) e Continua.
- Som do mapa dentro: o token de fora não ouve; o token de dentro ouve. Som de fora: não entra.
- Soltar uma música dentro: cria um som do mapa, não muda o isolamento.
- Campanha antiga com sala e música: vira isolamento + som do mapa no centro.
- Menu do botão direito no isolamento; desenho ponto a ponto e retângulo.
- `walk.js` e o resto da regressão sem erros; 0 processos de teste no fim.

## Decisões do usuário
"Pode implementar então, aproveita e verifica se o mestre consegue ajustar o isolamento." → aprovado com as recomendações:
1. Opção **"Igual na área inteira do isolamento"** no som do mapa: sim, desligada por padrão.
2. Opção "Não passa som" na parede normal: fica para outra vez.
3. Nome: **Isolamento de som**.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- Ferramenta **Isolamento de som** (tecla M, ícone de som cortado). Desenho **ponto a ponto** por padrão (cada clique é um canto; fecha no primeiro, com dois cliques ou Enter); **arrastar no vazio** faz um retângulo. Encaixa na grade e nas **pontas das paredes** (até 12 px); Alt solta.
- No mapa, só a **borda** roxa tracejada e as bolinhas dos cantos; o nome aparece no selecionado. Só o mestre vê. Não tapa visão nem impede de andar.
- **Ajustar o formato** (pedido do usuário): com a ferramenta, arrastar um **canto** move o canto; arrastar a **borda ou o meio** move o isolamento inteiro; **dois cliques na borda** criam um canto; **dois cliques num canto** apagam (mínimo 3). Clicar num isolamento já seleciona e permite arrastar. Shift começa outro desenho por cima de um isolamento. Tudo entra no desfazer/refazer.
- Painel: nome, **Música de fora** (Continua / Para), **Ambiente de fora** (Para / Abafado / Continua), quantos sons do mapa há dentro, **Ajustar formato** (liga a ferramenta) e Apagar.
- Menu do botão direito: Configurar, Música de fora, Ambiente de fora, Ajustar formato, Apagar.
- Som do mapa dentro de um isolamento ganha a opção **"Igual na área inteira do isolamento"** (`fill`). Soltar uma faixa dentro cria um som do mapa comum e avisa que só quem está dentro ouve.
- Saiu a "música da sala" (canal próprio, volume da sala, Recomeçar). Campanhas antigas: sala com música vira isolamento com Música de fora = Para + som do mapa no centro (alcance cobrindo a sala, mesmo volume, "igual na área inteira" ligado); sala sem música vira isolamento com Música de fora = Continua.
- Camada "Isolamentos de som"; desfazer chama de "isolamento de som".

**Testado** (`iso.js`, regressão)
- Desenho ponto a ponto: 4 cantos, fecha no primeiro; retângulo arrastando no vazio.
- Ajuste: canto (6,5) arrastado para (7,4; 6,2) encaixou em (7,6); arrastar a borda moveu tudo 1→ 1↓; dois cliques na borda: 5 cantos; dois cliques no canto novo: 4; Ctrl+Z voltou para 5.
- Som dentro: dentro 65%, fora 0%; som fora: fora 65%, dentro 0%; canto longe: 0% normal e 100% com "igual na área inteira".
- Música de fora Para: música 0 e ambiente 0 dentro; Continua + Abafado: 1 e 0,3; fora: 1 e 1.
- Soltar faixa dentro cria som do mapa; painel do som mostra a opção nova; painel e menu do isolamento com todas as opções; "Ajustar formato" liga a ferramenta.
- Campanha antiga com sala + música e sala sem música convertidas como planejado.
- Tutorial completo (`walk.js`) e testes de grupos, caminho, imagens, Mostrar, painéis, ferramentas, cenas e voo sem erros; 0 processos.
- `rooms.js` e `roomplay2.js` (da sala de som antiga) foram removidos; `iso.js` os substitui.

**Correção (bug do usuário):** com a barra da direita recolhida, o painel do isolamento ficava preso por cima das ferramentas. Clicar no vazio não soltava o isolamento, e o painel não tinha posição. Agora clicar no mapa com a seleção solta o isolamento e fecha o painel, e o painel flutuante abre ao lado do isolamento (teste `isohud.js`).

**Ajuste (pedido do usuário):** a ferramenta não abre mais menu ao lado da barra (saiu a lista "Nesta cena"). O botão só liga a ferramenta; para configurar um isolamento, clique nele no mapa ou use o botão direito.

**Pendente (depois que o usuário finalizar):** reescrever o passo "Salas de som" do tutorial (`js/tutorial.js`, texto ainda fala de música da sala), a seção da wiki e a linha do README.
