# Plano 66 · Cores dos títulos do tooltip de magias

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** "Na tooltip das magias aplique cor a alguns titulos: Roxo: Nível, Escola, Edição, Conjuração, Alcance, Componentes, Duração, Ritual, Concentração, Classes. Verde: Espécies. Azul: Subclasses. Vermelho: Talentos. Amarelo: Opções de classe. Marrom: Antecedentes."

## Objetivo

Destacar com as cores solicitadas os rótulos dos dados no tooltip de magias, facilitando a leitura das informações. Os valores e a descrição da magia continuam com as cores atuais.

## Como funciona hoje

`spellBookContent()` em `js/ficha5e.js` monta os rótulos com `<small>` dentro de `.f5-spell-book-facts`. A regra genérica `.f5-kv small` em `css/ficha5e.css` dá a mesma cor a todos eles.

## Proposta

1. Associar uma classe de cor a cada rótulo solicitado em `spellBookContent()`. O grupo roxo inclui também “Classes adicionais”, por ser um rótulo da mesma categoria. “Área” e os demais rótulos não citados mantêm a cor atual.
2. Usar as variáveis da paleta existente para roxo, verde, azul, vermelho e amarelo; definir um marrom local com contraste suficiente sobre o fundo escuro do tooltip.
3. Aplicar as cores apenas aos títulos `<small>` do tooltip, sem mudar os valores ou os rótulos em outras áreas da ficha.

## Perguntas para o usuário

Nenhuma: as cores e os títulos foram especificados no pedido. “Classes adicionais” seguirá a cor de “Classes”.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `js/ficha5e.js` | Classe de cor em cada título solicitado |
| `css/ficha5e.css` | Regras de cor restritas ao tooltip |
| `.claude/testes/ficha5e.js` | Verificar as cores dos rótulos e a cor padrão dos demais |

## Tutorial, wiki e README

Sem função nova nem mudança de uso. O tutorial, a wiki e o README atuais continuam válidos.

## Testes

- Abrir o tooltip de uma magia com classes, espécies, subclasses, talentos, opções e antecedentes; conferir a cor de cada título solicitado e garantir que só o rótulo foi colorido.
- Confirmar que “Área” e os rótulos não especificados preservam a cor padrão.
- Executar typecheck, build, teste de navegador da ficha e tutorial completo; conferir zero processos de teste ao final.

## Resultado

- `spellBookContent()` associa as classes de cor aos títulos pedidos, incluindo “Classes adicionais” no grupo roxo. “Área” e os outros títulos não citados continuam com a cor padrão; os valores mantêm a cor do texto.
- As regras de cor ficam restritas a `.f5-spell-book-facts` e usam a paleta existente, com marrom local para “Antecedentes”.
- `npm.cmd run typecheck`: 0 erros e 0 avisos. `npm.cmd run build`: concluído. `node tests/browser.mjs --legacy=ficha5e --legacy=walk`: os dois fluxos passaram com `erros: []`, incluindo as cores calculadas dos títulos, a cor padrão de “Área”, a cor dos valores e o tutorial `final: Pronto`.
- `git diff --check` passou e restaram 0 processos temporários de teste.
- Ajuste posterior pedido pelo usuário: o título “Classes” passou de roxo para amarelo. “Classes adicionais” permaneceu roxo.
- Após o ajuste, `typecheck`, build, teste de navegador da ficha e tutorial completo passaram com `erros: []`; `git diff --check` passou e restaram 0 processos temporários.
