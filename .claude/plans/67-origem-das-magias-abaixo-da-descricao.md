# Plano 67 · Origens das magias abaixo da descrição

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** "Ajuste para que Espécies, Subclasses, Talentos, Opções e Antecedentes fiquem abaixo da descrição da magia."

## Objetivo

No tooltip de magias, mostrar primeiro os dados da magia e seu texto completo. As listas de Espécies, Subclasses, Talentos, Opções de classe e Antecedentes aparecem depois da descrição e do texto de níveis superiores, quando houver.

## Como funciona hoje

`spellBookContent()` em `js/ficha5e.js` adiciona essas listas ao mesmo conjunto de dados que Nível, Escola e Classes. Assim, `.f5-spell-book-facts` aparece inteira antes da descrição.

## Proposta

1. Separar os cinco grupos pedidos do conjunto de dados principais e renderizá-los num bloco abaixo da descrição completa e do texto para níveis superiores.
2. Manter “Classes” e “Classes adicionais” junto aos dados principais. Conservar as cores atribuídas no plano 66 e omitir grupos vazios.
3. Preservar a rolagem e o fechamento do tooltip, sem alterar os dados das magias ou a seleção nas listagens.

## Perguntas para o usuário

Nenhuma. “Opções” corresponde ao rótulo atual “Opções de classe”; “abaixo da descrição” inclui o texto de níveis superiores quando existir.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `js/ficha5e.js` | Separar e reposicionar os cinco grupos de origem no tooltip |
| `css/ficha5e.css` | Espaçamento e divisória do bloco inferior, se necessário |
| `.claude/testes/ficha5e.js` | Conferir ordem dos blocos, cores e ausência de grupos vazios |

## Tutorial, wiki e README

Sem função nova nem mudança de uso; a documentação existente continua válida.

## Testes

- Abrir uma magia com os cinco grupos e outra com grupos ausentes; conferir ordem após a descrição e níveis superiores, cores e omissão dos vazios.
- Executar typecheck, build, teste da ficha e tutorial completo; conferir zero processos temporários ao final.

## Resultado

- `spellBookContent()` mantém os dados principais e as classes acima da descrição. Subclasses, Espécies, Talentos, Antecedentes e Opções de classe aparecem num bloco separado após a descrição e o texto de níveis superiores. O bloco é omitido quando os cinco grupos estão vazios; as cores foram preservadas.
- A ficha foi testada com Fireball e Disguise Self para a ordem dos blocos, e com Glibness para a ausência do bloco inferior. `npm.cmd run typecheck`: 0 erros e 0 avisos. `npm.cmd run build`: concluído. `node tests/browser.mjs --legacy=ficha5e --legacy=walk`: ambos passaram com `erros: []` e tutorial `final: Pronto`.
