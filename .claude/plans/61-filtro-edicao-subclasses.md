# Plano 61 · Edição das subclasses na etapa Classe

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** Fazer as subclasses respeitarem “Só da edição 5.5e (2024)”, mover esse checkbox para o menu Fonte, remover o botão Fonte das subclasses e deixar amarelo o título “Ranger Subclass (nível 3)” (e os títulos equivalentes).

## Objetivo

Usar o mesmo filtro de edição para classes e subclasses, sem duplicar controles na parte direita da etapa Classe.

## Como funciona hoje

`recordList()` em `js/assistente5e.js` guarda o checkbox de edição fora do menu Fonte. A lista de subclasses é filtrada apenas pelo botão Fonte próprio, e o título usa a cor padrão de `.a5-detail h4`.

## Proposta

- Na etapa Classe, colocar o checkbox de edição dentro do menu Fonte da lista de classes. Ao alterná-lo, atualizar também as subclasses exibidas; se a subclasse selecionada deixar de pertencer à edição visível, limpar essa escolha.
- Remover o filtro Fonte exclusivo das subclasses e manter a diferenciação entre nomes repetidos quando as duas edições estiverem visíveis.
- Aplicar `var(--gold)` somente ao título da seção de subclasses, para qualquer classe.

## Perguntas para o usuário

Nenhuma; o comportamento solicitado é específico da etapa Classe.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `js/dados5e.js` | Permitir um controle adicional dentro do menu Fonte. |
| `js/assistente5e.js` | Integrar o checkbox ao menu e filtrar as subclasses. |
| `css/ficha5e.css` | Cor do título da seção. |
| `.claude/testes/assist5e.js` | Verificar os dois estados do filtro e o título. |

## Tutorial, wiki e README

Sem alteração de regra ou nova etapa do fluxo.

## Testes

- Teste de navegador do assistente nas duas edições, build e typecheck.

## Resultado

O filtro de edição da classe agora fica no menu Fonte e também controla as subclasses. Uma subclasse de outra edição selecionada é limpa quando o filtro volta a ser exclusivo. O botão Fonte das subclasses foi removido, e o título da seção usa amarelo. `typecheck`, build e teste de navegador `assist5e` passaram.
