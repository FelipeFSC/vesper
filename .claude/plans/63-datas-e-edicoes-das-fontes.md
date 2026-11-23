# Plano 63 · Datas e edições das fontes do 5etools

**Status:** Proposto
**Versão:** 1.x
**Pedido do usuário:** "Corrija isso" — referência às datas de publicação que não chegam ao Vésper e aos conteúdos sem edição definida.

## Objetivo

Preencher a data das fontes importadas a partir dos metadados que já existem no 5etools e classificar os registros como 2014 ou 2024 de maneira consistente. O filtro por edição deve refletir essa classificação sem alterar os dados de regras ou os códigos das fontes.

## Como funciona hoje

- Os 68 livros e 104 aventuras em `5etools-src/data/books.json` e `adventures.json` têm `published`. O `Parser.SOURCE_JSON_TO_DATE` do 5etools fornece datas para as fontes adicionais. Todas as 127 siglas usadas nos dados importados têm data em pelo menos um desses lugares.
- `tools/importar-cadastros.mjs` cria `bookDates` apenas por `id`. Como alguns registros usam outra sigla em `source` (por exemplo, `PS-A`/`PSA`), a consulta atual falha para 130 registros de cadastro.
- `tools/importar-5etools.mjs` deixa `date` vazio em 8 fontes do índice local do bestiário, embora o `Parser` conheça suas datas.
- 169 registros de cadastro gerados têm `edition` vazia. A falta de data explica parte deles; `tools/cadastros-itens.mjs` também deixa itens base sem edição quando o registro não traz `edition` explícita.
- Os conversores usam regras diferentes de edição. Em `js/bestiary.js`, uma criatura cuja sigla começa com `X` é classificada como 2024 ao criar a ficha, o que também alcança fontes antigas como `XGE`.

## Proposta

1. Compartilhar em `tools/fontes-5etools.mjs` a consulta da data por `source`, depois `id` e `parentSource`, e por fim pelo catálogo `Parser.SOURCE_JSON_TO_DATE`. Preservar a prioridade do livro quando livro e aventura compartilharem sigla. Fonte realmente sem data continua sem data e é relatada na geração.
2. Centralizar a classificação da edição: `edition: one` significa 2024; `edition: classic`, 2014; quando o registro não informa, usar a data da fonte em relação à publicação de `XPHB` (mesmo marco já usado pelo 5etools). Se a data for desconhecida, manter a edição vazia. Aplicar a mesma regra aos conversores de cadastros, inclusive itens base, sem alterar IDs, fontes ou texto de regras.
3. Gravar no índice do bestiário as datas recuperadas. Ao criar uma ficha de criatura, determinar sua edição pelo campo explícito do registro ou pela data da fonte; remover a regra da sigla iniciada por `X`.
4. Regenerar `data/cadastros/*.json` e `.js` e a pasta local `data/5etools/` a partir do clone `C:\Users\Felype\Documents\Git\5etools-src`. Conferir no diff qualquer alteração além de `edition`, metadados de fonte e data de geração.

## Perguntas para o usuário

Nenhuma escolha nova de regra: a proposta preserva a prioridade da edição explícita no 5etools e usa a mesma data de corte já adotada pelos importadores e pelo 5etools.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `tools/fontes-5etools.mjs` | Resolver datas e edição em uma regra compartilhada |
| `tools/importar-cadastros.mjs` e `tools/cadastros-*.mjs` | Usar a regra compartilhada em todos os registros |
| `tools/importar-5etools.mjs` | Completar datas no índice do bestiário |
| `js/bestiary.js` | Classificar a ficha pela edição explícita ou data da fonte |
| `data/cadastros/*.json` e `.js` | Regenerar os padrões com `edition` corrigida |
| `data/5etools/` (fora do Git) | Regenerar o índice local com datas completas |

## Tutorial, wiki e README

Sem funcionalidade nova ou comando diferente para o usuário. O filtro e a ficha passam a usar dados corrigidos; não há passo ou seção novos.

## Testes

- Conferir que todos os códigos de fonte usados resolvem uma data com o clone atual; conferir `PSA`, `TftYP`, `EEPC` e `MCV2DC`.
- Confirmar que as 8 datas vazias do índice do bestiário e as 169 edições vazias dos cadastros foram tratadas, ou listar precisamente os casos que continuarem indefinidos por falta real de metadados.
- Comparar os registros gerados com a versão anterior: IDs, códigos de fonte, quantidades e demais campos de regras devem permanecer iguais.
- Conferir que uma fonte antiga iniciada por `X` não cria ficha 2024 por causa da sigla, e que uma criatura `XMM` cria ficha 2024.
- Executar build, testes de cadastros, bestiário e tutorial no navegador; verificar `erros: []` e 0 processos de teste ao final.

## Resultado

(Preencher após a implementação aprovada: mudanças, testes e eventuais fontes sem data ou edição.)
