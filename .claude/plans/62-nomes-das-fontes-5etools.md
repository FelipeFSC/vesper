# Plano 62 · Nomes das fontes importadas do 5etools

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** "Alguns livros não tem a informação do nome no repositório do sistema, mas nos dados do 5etools tem"

## Objetivo

Mostrar o nome completo das fontes importadas no bestiário e nos cadastros, inclusive quando o código da fonte não coincide com o `id` do livro no 5etools. Manter a sigla nos registros para filtros e vínculos existentes.

## Como funciona hoje

- `tools/importar-cadastros.mjs` monta o mapa de nomes de `books.json` e `adventures.json` pelo campo `id` (`sources[b.id] = b.name`). Se o registro usa outro código em `source`, o importador grava a sigla como nome. Exemplo confirmado: **Plane Shift: Amonkhet** tem `id: PS-A` e `source: PSA`; `PSA` fica sem nome.
- `tools/importar-5etools.mjs` já usa `b.source || b.id`, mas fontes ausentes dos dois catálogos caem na sigla. O 5etools também mantém nomes em `Parser.SOURCE_JSON_TO_FULL`/`Parser.sourceJsonToFull`.
- `js/cadastros.js` e `js/bestiary.js` mostram os nomes que os arquivos gerados fornecem. `data/cadastros/*.json` e `.js` estão versionados; `data/5etools/` é gerado localmente e ignorado pelo Git.
- Nos arquivos gerados atuais, 12 códigos distintos aparecem como nome igual à sigla nos cadastros: `EEPC`, `EET`, `HAT-LMI`, `MCV2DC`, `PSA`, `PSD`, `PSI`, `PSK`, `PSX`, `PSZ`, `RoTOS`, `TftYP`. No índice local do bestiário são 8: `ESK`, `MCV2DC`, `MCV3MC`, `MisMV1`, `MFF`, `SADS`, `TftYP`, `VD`.

## Proposta

1. Na geração, indexar livros e aventuras por `source` e por `id` quando existirem. Preservar também os códigos de `parentSource` como candidatos ao nome do livro pai quando o catálogo trouxer `parentName`.
2. Para código ainda sem nome, usar o nome oficial resolvido pelo `Parser` do clone do 5etools. Se o próprio 5etools não conhecer o código, conservar a sigla. Não manter uma tabela manual duplicada no Vésper.
3. Aplicar a mesma regra aos dois importadores, sem alterar o campo `source` de criaturas ou cadastros. Regenerar `data/cadastros/*.json` e `.js` a partir do clone local `C:\Users\Felype\Documents\Git\5etools-src`; regenerar o índice e os livros locais de `data/5etools/`.
4. Confirmar as mudanças dos arquivos versionados e registrar qualquer fonte que continue sem nome completo após a geração.

## Perguntas para o usuário

Nenhuma escolha de interface ou regra de jogo. O plano usa os nomes originais em inglês do 5etools, conforme a decisão anterior de adiar a tradução.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `tools/importar-cadastros.mjs` | Resolver nomes por `source`/`id` e pelo catálogo de fontes do 5etools |
| `tools/importar-5etools.mjs` | Aplicar a mesma resolução aos nomes do índice do bestiário |
| `tools/fontes-5etools.mjs` | Compartilhar a regra de resolução entre os importadores |
| `data/cadastros/*.json` e `.js` | Atualizar os nomes gerados, mantendo registros e códigos de fonte |
| `data/5etools/` (fora do Git) | Regenerar o índice e livros para uso local |

## Tutorial, wiki e README

Sem passo ou seção novos: trata-se de corrigir os rótulos de fonte existentes. O comando de importação documentado no README permanece o mesmo.

## Testes

- Comparar todos os códigos de fonte usados nos arquivos gerados com os nomes resolvidos pelo clone do 5etools; conferir especialmente `PSA`, `EEPC`, `TftYP` e `MCV2DC`.
- Conferir que quantidade, IDs e códigos `source` dos registros não mudam por causa da correção; examinar o diff dos arquivos gerados.
- Abrir cadastros e bestiário, verificar nomes em filtros e detalhes e executar os testes específicos dessas telas e o tutorial completo conforme `.claude/docs/testes.md`.
- Encerrar servidor e Edge dos testes e conferir 0 processos remanescentes.

## Resultado

- Os dois importadores agora usam `tools/fontes-5etools.mjs`: primeiro o campo `source` de livros e aventuras, depois `id` e `parentSource`, e por fim `Parser.SOURCE_JSON_TO_FULL`. Em colisões de sigla, o livro tem prioridade sobre a aventura; nomes existentes como `MOT` e `FRAiF` foram preservados.
- Regenerados os nove pares `.json`/`.js` versionados em `data/cadastros/` e a pasta local `data/5etools/`. As 12 siglas sem nome nos cadastros e as 8 do índice do bestiário agora têm nome completo. Nenhuma fonte usada ficou com nome igual à sigla.
- Comparação semântica com o Git confirmou que todos os registros dos nove cadastros permaneceram idênticos; mudaram apenas nomes de fontes e a data de geração. O bestiário manteve 5.051 criaturas de 113 fontes.
- Testes: `node --check` nos três módulos, `npm.cmd run build`, `node tests/browser.mjs --legacy=cadastros --legacy=bestiario --legacy=walk` (três casos `OK`, todos com `erros: []`, tutorial `final: Pronto`), e verificação no navegador de `PSA`/`EEPC` no cadastro e `MCV2DC`/`ESK` no bestiário. `git diff --check` passou e restaram 0 processos de teste.
