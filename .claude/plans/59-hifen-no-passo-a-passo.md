# Plano 59 · Hífen no título do assistente D&D

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** Alterar “D&D 5ª Edição Passo a Passo” para “D&D 5ª Edição - Passo a Passo”.

## Objetivo

Exibir o título solicitado na opção de criação guiada de personagem.

## Como funciona hoje

O título está em `js/ficha.js`, e o teste de criação em `.claude/testes/assist5e.js` confere o texto anterior.

## Proposta

- Trocar somente o título visível da opção guiada.
- Atualizar a asserção correspondente no teste de navegador.
- Conferir que não restou a ocorrência antiga no código da interface.

## Perguntas para o usuário

Nenhuma; o texto exato foi informado no pedido.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `js/ficha.js` | Título da opção guiada. |
| `.claude/testes/assist5e.js` | Texto esperado. |

## Tutorial, wiki e README

Sem mudança de comportamento; a alteração é somente no título.

## Testes

- Busca pela ocorrência antiga e pelo novo título.
- Teste de navegador do assistente.

## Resultado

O título aparece como “D&D 5ª Edição - Passo a Passo”. Build e teste de navegador `assist5e` passaram, sem erros.
