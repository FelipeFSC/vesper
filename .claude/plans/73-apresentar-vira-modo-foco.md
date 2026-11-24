# Plano 73 · "Apresentar" vira o modo Foco

**Status:** Implementado (testes do usuário). Ver "Respostas do usuário": no fim, só o nome e a tecla mudaram.
**Versão:** 1.x
**Pedido do usuário:** "Gostei muito dos pontos levantados, principalmente o modo foco, hoje temos o 'Apresentar' esse botão veio de um exemplo que eu mostrei á IA e ela implementou como se fosse para existir de fato, esse botão pode ser o nosso modo foco."

Origem: revisão de design da tela do mestre (agente ui-ux-designer, 23/11/2026): "Modo foco do mapa, com uma tecla que esconde as duas laterais. Hoje o mapa ocupa só uns 60% da largura."

## Objetivo
O botão do topo deixa de ser "Apresentar" (outro modo de usar a mesa) e passa a ser **Foco**: esconde as duas laterais para o mapa ocupar a tela, sem tirar nenhuma ferramenta do mestre. Também ganha uma tecla.

## Como funciona hoje
- `UI.setMode('play' | 'edit')` em `js/ui.js`. O botão `#btn-mode` mostra "Apresentar" (mestre, em edição) e "Editar" (mestre, apresentando). Para o jogador, mostra "Painéis".
- No modo `play`:
  1. as laterais somem (`#app.play` em `css/style.css`);
  2. as ferramentas marcadas `edit: true` somem da barra (desenho, formas, apagar, névoa, parede, porta, luz, imagem, nota, gatilho, portal, isolamento), e a ferramenta ativa de desenho ou névoa volta para Selecionar;
  3. o painel do objeto flutua sobre o mapa e só abre pelo botão direito (o mesmo de quando a barra da direita está recolhida);
  4. a coluna de jogadores fica aberta;
  5. algumas camadas do mestre só aparecem no modo de edição: os gatilhos e o isolamento de som (fora da ferramenta deles) e as linhas das paredes.
- O jogador está sempre em `play`. O botão dele ("Painéis") abre e fecha as laterais dele.

## Proposta
- **Botão Foco** no lugar de "Apresentar": ícone `maximize-2`, texto "Foco". Ligado, vira "Sair do foco", com o ícone `minimize-2`. Dica: "Esconde as laterais para o mapa ocupar a tela (Tab)".
- **O que o Foco faz:** esconde as duas laterais (como hoje) e **mais nada muda**:
  - todas as ferramentas continuam na barra; a ferramenta ativa continua ativa;
  - o mestre continua vendo paredes, gatilhos e isolamentos como na edição;
  - o painel do objeto flutua sobre o mapa (como com a barra da direita recolhida).
- **Tecla Tab** liga e desliga o Foco, como no Photoshop. Não funciona enquanto se digita num campo. O Tab continua passando de um campo para outro dentro dos painéis e janelas.
- **A topbar e a barra de baixo** (Chat, Dados, Combate, Som, Mostrar) continuam no Foco (ver pergunta 1).
- **O navegador lembra** se o Foco estava ligado (como as laterais recolhidas, Plano 15).
- **Jogador:** nada muda. O botão "Painéis" dele continua igual.
- **O "modo jogo" do mestre deixa de existir.** O mestre que quiser ver como o jogador vê continua tendo "Ver como" (já existe).
- **Por dentro:** `UI.mode` continua existindo para o jogador (`play`). Para o mestre, o Foco passa a ser só um estado visual (`UI.focus`) e as regras de "só no modo edição" deixam de olhar o Foco. Assim ferramentas, camadas e atalhos funcionam igual com o Foco ligado ou desligado.

## Perguntas para o usuário
1. **O que o Foco esconde:** (a) **só as duas laterais** (recomendo: a barra de ferramentas, a barra de baixo e o botão Foco continuam à mão); (b) as laterais e a topbar (sobra mais altura, mas o botão Foco fica só na tecla Tab e num botão pequeno no canto).
2. **Tecla:** (a) **Tab** (recomendo, como no Photoshop); (b) outra tecla de sua preferência.
3. **Painel do token no Foco:** (a) **como hoje com a barra recolhida**: flutua e abre pelo botão direito → "Painel do token" (recomendo, para o mapa ficar limpo); (b) abre sozinho ao clicar no token.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | botão Foco (texto, ícone, dica); `UI.setFocus`; o mestre sai do `play`; regras de "só na edição" passam a valer também com o Foco; lembrar no navegador |
| `js/board.js` | tecla Tab; desenho das camadas do mestre deixa de depender do modo `play` |
| `js/ctxmenu.js` | o comentário e a regra do painel flutuante seguem o Foco |
| `css/style.css` | `#app.focus` esconde as laterais (o mesmo efeito do `#app.play` de hoje) |
| `js/tutorial.js` | conferir os passos que falam de "Apresentar" e trocar o texto para "Foco" |

## Tutorial, wiki e README
- Tutorial: os passos que citam "Apresentar" precisam mudar no texto (senão ficam errados). Isso entra nesta tarefa.
- Wiki e README: quando você der a função por finalizada (combinado).

## Testes
- Foco pelo botão e pelo Tab: laterais somem e voltam; o mapa se ajusta.
- Com o Foco ligado: todas as ferramentas na barra; desenhar, parede e luz funcionam; paredes e gatilhos aparecem para o mestre.
- Tab dentro de um campo de texto não liga o Foco.
- O navegador lembra o Foco ao recarregar.
- Jogador: "Painéis" igual a antes.
- `party.js`, `ctxmenu.js`, `prophud.js`, `isohud.js` (usam o modo Apresentar), tutorial inteiro (`walk.js`) e menus em tela baixa sem erros; 0 processos de teste no fim.

## Respostas do usuário (mudam a proposta acima)
1. "Hoje o design é bom na verdade": mover o mapa, régua e ping continuam no Foco, e a barra de baixo também. Os botões que o Apresentar já mostra são suficientes. **O Foco fica igual ao Apresentar de hoje**: ele não passa a manter as ferramentas de montagem.
2. **Tab**.
3. **Painel como hoje.** "Olhando bem o 'Apresentar' já está bem na verdade, só o nome que é muito ruim."

## Resultado
Implementado em 23/11/2026: só o nome, os ícones e a tecla Tab. O comportamento é o mesmo do antigo "Apresentar".
- `js/ui.js`: o botão do mestre é **Foco** (ícone `maximize-2`) e, ligado, **Sair do foco** (`minimize-2`), com a dica citando Tab. O jogador continua com "Painéis".
- `js/board.js`: Tab (sem Shift, Ctrl ou Alt) liga e desliga o Foco para o mestre. Funciona com o foco do teclado no mapa, na página, na barra de ferramentas, na barra de baixo, no zoom ou no próprio botão. Fora disso (campos, janelas, painéis), o Tab continua passando de um campo para outro. Na visão de jogador ("Ver como"), não faz nada.
- `js/icons.js`: `maximize-2` e `minimize-2` (Lucide).
- Comentários e `docs/funcionalidades.md` passaram a dizer "Foco".

**Testes**
- `foco.js` (novo): nome e dica, clique liga e desliga, régua/ping/mover ficam e a montagem some, Tab no mapa e depois de clicar numa ferramenta, Tab num campo não liga, jogador continua com "Painéis" e o Tab não mexe nele.
- `party.js`, `ctxmenu.js`, `prophud.js`, `isohud.js`, `menus.js` e `walk.js` (tutorial inteiro): sem erros. 0 processos no fim.

**Falta (combinado para depois):** a wiki ainda fala em "Apresentar" e "Editar" em 4 lugares (seção "Editar e Apresentar" e a legenda da foto `img/play.jpg`).
