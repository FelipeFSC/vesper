# Plano 65 · Descrição das magias e cores no assistente

**Status:** Concluído
**Versão:** 1.x
**Pedido do usuário:** "Ajuste as listagens de magias colocando um botão de Livro que mostra a descrição completa em um tooltip. Ajuste as cores dos textos: amarelo para Características de Barbarian até o nível 5, azul para Barbarian Subclass (nível 3), vermelho para Dado de vida e laranja para Salvaguardas."

## Objetivo

Mostrar a descrição completa das magias nas listagens do assistente e da ficha por um botão de Livro, aberto por clique ou toque. Destacar os quatro rótulos pedidos na etapa Classe com cores distintas.

## Como funciona hoje

- `js/assistente5e.js` mostra magias selecionáveis e sempre preparadas sem um controle de descrição. Os rótulos da etapa Classe usam as cores padrão.
- `js/ficha5e.js` mostra magias na ficha, em criaturas e na janela de escolha. Algumas têm expansão de texto ao clicar no nome, mas não há botão de Livro uniforme.
- Os registros de `data/cadastros/spells.json` oferecem `description` e, quando cabível, `higher.text`. A ficha de personagem guarda um texto consolidado da magia.

## Proposta

1. Adicionar um botão com ícone Lucide `book-open` a cada magia das listagens do assistente e da ficha. O botão abre um painel com nome, fonte, descrição integral e texto de níveis superiores, quando existir. Se o texto não estiver disponível, o painel informa isso.
2. Fazer o painel abrir por clique ou toque, comportar textos longos com rolagem e caber na tela. Fechar por clique fora, Esc ou saída da listagem. O botão não seleciona, prepara nem remove magias.
3. Na etapa Classe, colorir de amarelo o título "Características de … até o nível …", de azul o título da subclasse, de vermelho o rótulo "Dado de vida" e de laranja o rótulo "Salvaguardas". Manter classe e nível dinâmicos.

## Perguntas para o usuário

Resolvidas antes da aprovação: escopo **assistente e ficha**; painel aberto por **clique ou toque**.

## Mudanças por arquivo

| Arquivo | O que muda |
|---|---|
| `js/assistente5e.js` | Botão de Livro nas listagens e classes dos quatro destaques |
| `js/ficha5e.js` | Painel de descrição e botões nas listagens da ficha, de criaturas e da janela de escolha |
| `css/ficha5e.css` | Layout e cores do botão, painel e rótulos |
| `.claude/testes/assist5e.js`, `.claude/testes/ficha5e.js`, `.claude/testes/criatura5e.js` | Conferências do comportamento novo |

## Tutorial, wiki e README

- Acrescentar orientação sobre o botão de Livro ao tutorial e à wiki, com a ação correspondente no teste do tutorial se houver novo passo.
- README apenas se o recurso couber na lista geral de funções.

## Testes

- Conferir descrição integral e níveis superiores em cada tipo de listagem, com clique, toque, teclado, Esc, clique fora e tela estreita.
- Confirmar que o botão não altera seleção ou preparo da magia e que as quatro cores aparecem nos rótulos certos.
- Executar typecheck, build, testes de navegador do assistente, ficha, criatura e tutorial completo; conferir zero processos de teste ao final.

## Resultado

- O botão de Livro foi adicionado aos truques, magias preparadas e sempre preparadas do assistente, à janela de escolha de magias, à lista da ficha de personagem e às magias ligadas às criaturas. O painel mostra nome, fonte, descrição integral e texto de níveis superiores quando disponível; avisa quando não há descrição.
- O painel abre por clique ou toque, aceita rolagem, cabe na tela e fecha com clique fora, Esc, troca de etapa ou fechamento da janela. O botão não altera escolha, preparo ou expansão pelo nome.
- Na etapa Classe, os títulos das características e da subclasse e os rótulos de dado de vida e salvaguardas receberam, respectivamente, amarelo, azul, vermelho e laranja. Tutorial, wiki e README foram atualizados.
- `npm.cmd run typecheck`: 0 erros e 0 avisos. `npm.cmd run build`: concluído. `node tests/browser.mjs --legacy=assist5e --legacy=ficha5e --legacy=criatura5e --legacy=walk`: os quatro fluxos passaram com `erros: []`; tutorial `final: Pronto`. O assistente foi repetido após acrescentar a conferência de magias sempre preparadas e passou novamente.
- Em navegador com viewport 390 × 667 e toque simulado, o painel coube na tela, permitiu rolagem e exibiu o texto de níveis superiores. `git diff --check` passou; nenhum processo temporário de teste permaneceu ativo.
- Correção posterior: o painel passou a mostrar os dados de conjuração, alcance, área, componentes, duração, efeitos, classes e origens, além do texto integral. A ficha consulta o registro completo quando há referência e usa sua cópia se o cadastro estiver indisponível. Valores ausentes são removidos antes de atualizar o DOM, evitando o texto literal `null` no fim de magias como Disguise Self.
- A regressão de Disguise Self conferiu os campos e a ausência de `null`. `typecheck`, build e os quatro fluxos de navegador (`assist5e`, `ficha5e`, `criatura5e`, `walk`) passaram com `erros: []`.
