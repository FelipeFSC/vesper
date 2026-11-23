# Plano 58 · Ajustes na criação de personagem D&D 5e

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** Ajustar a criação de personagem: nomes das edições e da tela inicial; dados de vida em Escolhas; chips selecionáveis; filtro por livro; texto de antecedentes 2024; subclasses repetidas; bônus de atributos do antecedente; talentos de Estilo de Luta e Origem; liberdade de atributos e talento do antecedente; subescolhas de atributo ou talento; listagem de magias em cards por nível.

## Objetivo

Deixar explícita a edição das regras usada na criação e na ficha, tornar as escolhas mais claras e permitir que os bônus e o Talento de Origem do antecedente 2024 sejam livres quando o jogador optar por isso. Facilitar a busca por livro e a escolha de magias.

## Como funcionava antes

- `js/ficha.js` chamava as duas opções iniciais de “D&D 5e”. `js/assistente5e.js` e `js/ficha5e.js` mostravam “2014” ou “2024” em vários pontos.
- `js/assistente5e.js` desenhava a rolagem de PV em Regras, antes de escolher a classe. As subescolhas de aumento de atributo apareciam antes da decisão entre atributo e talento.
- O antecedente 2024 fixava o Talento de Origem; o filtro de Estilo de Luta não reconhecia as categorias compostas de Paladino e Patrulheiro. Os JSONs de talentos já existiam em `data/cadastros/feats.json`.
- As listas do assistente e da ficha tinham busca por texto, mas nenhum filtro por fonte. As magias apareciam em linhas compactas, sem seções por nível.

## Proposta aprovada

- Mostrar **5e (2014)** e **5.5e (2024)** na criação e na ficha, mantendo `2014` e `2024` nos dados salvos. Na tela inicial, mostrar “D&D 5ª Edição” e “D&D 5ª Edição Passo a Passo”. Distinguir subclasses homônimas com **(5e)** e **(5.5e)**.
- Deixar o método de PV em Regras e mover seus campos de rolagem para Escolhas. Mostrar os controles de aumento de atributo ou talento somente após selecionar uma dessas alternativas.
- Usar roxo para chips selecionados, clarear no hover e retirar o texto riscado. Acrescentar botão **Fonte** às listas pesquisáveis e aos seletores, aceitando vários livros; por padrão, todos aparecem.
- Abrir o texto de antecedentes 2024. Oferecer dois checkboxes independentes, inicialmente desligados: atributos livres para os bônus e escolha livre de Talento de Origem 2024. Ao mudar o antecedente ou desligar a opção, descartar escolhas dependentes que deixaram de valer.
- Manter os **27 pontos** da compra apenas para os atributos base; mostrar os bônus do antecedente em separado e somá-los ao resultado final. Corrigir o filtro de Estilo de Luta e processar as subescolhas do talento livre.
- Dividir magias por nível, em cards com duas colunas quando houver espaço e uma coluna em telas estreitas, preservando a seleção e os contadores.

## Decisões do usuário

- Os rótulos de edição valem para o assistente de criação e a ficha, sem ampliar a mudança para o catálogo de cadastros.
- Os controles de atributos livres e Talento de Origem livre são separados.
- Os bônus do antecedente não aumentam o orçamento dos 27 pontos.

## Mudanças por arquivo

| Arquivo | O que mudou |
|---|---|
| `js/ficha.js` | Textos da escolha inicial. |
| `js/dados5e.js` | Rótulos de edição e controle reutilizável de filtro por livro. |
| `js/assistente5e.js` | Etapas, antecedentes, talentos, subclasses, filtros e magias. |
| `js/ficha5e.js` | Rótulos da ficha, subclasses repetidas e filtro nos seletores de cadastro. |
| `css/style.css`, `css/ficha5e.css` | Chips, filtro por fonte e cards de magias. |
| `.claude/testes/assist5e.js`, `.claude/testes/atrib5e.js` | Regressões da criação, dos talentos e dos bônus. |

## Tutorial, wiki e README

O tutorial, a wiki e o README não foram alterados nesta rodada. A documentação geral da criação 5e já constava como pendente em `.claude/docs/funcionalidades.md`.

## Testes

- `npm.cmd run typecheck`: sem erros ou avisos.
- `npm.cmd run build`: concluído.
- `npm.cmd test`: 6 testes passaram.
- `npm.cmd run test:browser -- --legacy=assist5e --legacy=atrib5e --legacy=ficha5e`: passaram os fluxos de criação, compra de pontos e ficha. O teste do assistente cobre filtros, rolagem de PV, antecedentes livres, subclasses homônimas, Estilo de Luta 2024 e cards de magia.

## Resultado

Implementado e testado. Este plano foi registrado **após a implementação** por uma falha no processo; as próximas tarefas devem começar com o arquivo de plano, como exigem as instruções do projeto.
