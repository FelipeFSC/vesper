# Plano 64 · Filtro de edição dentro de Fonte no assistente

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** "Na criação de personagem passo a passo, alguns Steps ainda estão com o 'Só da edição 5.5e (2024)' fora do tooltip de Fonte como Espécie e Antencedente"

## Objetivo

Nas etapas Classe, Espécie e Antecedente do assistente D&D 5e, mostrar a opção “Só da edição 5.5e (2024)” dentro do menu Fonte. A busca, a seleção e o filtro por edição devem continuar funcionando como hoje.

## Como funciona hoje

- `js/assistente5e.js`, em `recordList()`, é usado nas três etapas. Para Classe, passa `editionControl` como conteúdo superior do menu `D5.sourceControl`; para Espécie e Antecedente, desenha outro checkbox fora do menu.
- `js/dados5e.js`, em `sourceControl()`, já aceita `opts.top` e atualiza o conteúdo quando o menu Fonte abre ou é atualizado.
- `.claude/testes/assist5e.js` verifica que o controle está dentro do menu na etapa Classe, mas ainda não confere isso nas outras duas etapas.

## Proposta

1. Usar `editionControl` como `opts.top` em todas as chamadas de `recordList()`, sem desenhar o checkbox externo nas etapas Espécie e Antecedente.
2. Ao alternar o checkbox, manter o estado por etapa em `A5.edAll`, atualizar a lista e os grupos de fontes e conservar a regra atual que remove uma subclasse incompatível quando o filtro da Classe é reativado.
3. Manter o rótulo dinâmico: “Só da edição 5.5e (2024)” ou “Só da edição 5e (2014)”, conforme a edição escolhida para a personagem.

## Perguntas para o usuário

Nenhuma escolha de regra: a etapa Classe já estabelece a posição e o comportamento desejados.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `js/assistente5e.js` | Mover o controle de edição de Espécie e Antecedente para dentro do menu Fonte |
| `.claude/testes/assist5e.js` | Conferir posição e funcionamento do controle nas três etapas |

## Tutorial, wiki e README

Sem função nova. A mudança organiza um controle existente no assistente; não requer novo passo, seção ou instrução.

## Testes

- Abrir o assistente em 2024 e em 2014; nas três etapas, o checkbox aparece somente dentro de Fonte e mostra o rótulo correspondente.
- Em Espécie e Antecedente, alternar o checkbox e confirmar que a lista e os grupos de fontes mudam, sem perder o filtro de livro escolhido.
- Em Classe, confirmar que a seleção de subclasse incompatível ainda é removida quando o filtro da edição é reativado.
- Executar `typecheck`, build, teste de navegador `assist5e` e tutorial completo; conferir `erros: []` e 0 processos de teste ao final.

## Resultado

- `recordList()` agora passa o checkbox de edição para o menu Fonte nas etapas Classe, Espécie e Antecedente. O checkbox externo de Espécie e Antecedente foi removido; a lógica de filtro e o estado por etapa permaneceram os mesmos.
- O teste `assist5e.js` verificou a posição e o rótulo do controle em 2014 e 2024, a mudança das listas de Espécie e Antecedente, a preservação de um filtro de livro ao alternar a edição e a regressão da seleção de subclasse da etapa Classe.
- `npm.cmd run typecheck`: 0 erros e 0 avisos. `npm.cmd run build`: concluído. `node tests/browser.mjs --legacy=assist5e --legacy=walk`: os dois fluxos passaram com `erros: []`; tutorial `final: Pronto`. `git diff --check` passou e restaram 0 processos de teste.
