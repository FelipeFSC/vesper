# Plano 60 · Filtro de fonte por edição

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** Ajustar o botão de fonte para não ficar maior que a barra de pesquisa e separar, no menu do filtro, os livros da versão 5e e da 5.5e.

## Objetivo

Alinhar visualmente o botão **Fonte** com a busca e tornar clara a edição de cada livro no filtro.

## Como funciona hoje

`css/style.css` dá margem inferior à busca; o botão em `css/ficha5e.css` ocupa toda a altura da linha. `js/dados5e.js` mostra as fontes em uma lista única, reutilizada pelo assistente e pela ficha.

## Proposta

- Remover a margem inferior da busca apenas nas linhas que contêm o botão, mantendo a altura do botão igual à do campo.
- Agrupar as fontes disponíveis pelos registros de edição **5e (2014)** e **5.5e (2024)**. Fontes sem edição definida ficam em um terceiro grupo. O filtro continua aceitando vários livros e combinando com busca e edição.
- Usar o mesmo agrupamento nas listagens do assistente e nos seletores da ficha.

## Perguntas para o usuário

Nenhuma; os nomes das edições e o comportamento do filtro já foram definidos no Plano 58.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `css/ficha5e.css` | Altura da linha de busca e título dos grupos. |
| `js/dados5e.js` | Agrupamento das fontes por edição. |
| `.claude/testes/assist5e.js` | Verificação da altura e dos grupos. |

## Tutorial, wiki e README

O filtro já existe; este ajuste muda apenas apresentação e organização do menu.

## Testes

- Teste de navegador do assistente, com as duas edições visíveis.
- Build e verificação do diff.

## Resultado

O botão ficou da mesma altura que o campo de busca. O menu separa as fontes disponíveis por **5e (2014)**, **5.5e (2024)** e, quando houver, **Sem edição**. `typecheck`, build e teste de navegador `assist5e` passaram sem erros; o teste confirmou a altura e os dois grupos de edição.
