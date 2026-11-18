# Plano 23 · Tela de criação de ficha

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Agora eu quero fazer uma nova tela de criação de ficha, hoje já temos a opção em game, mas gostaria de um lugar separado e mais organizado e com mais opções e facilidades, entende? Por que a tela no tabuleiro é bem pequena, quero uma página só para isso, no menu já tem a opção, agora quero a tela, e na versão 1, precisa ter pelo menos tudo que a tela atual já tem."

## Objetivo
Uma **página só da ficha**, fora da mesa e sem tabuleiro, aberta pelo botão **Criar ficha** do menu inicial.

O caminho de uso fica assim:
1. A pessoa monta a ficha com espaço.
2. Ela exporta o arquivo e manda ao mestre.
3. O mestre importa na mesa dele, pelo Importar que já existe. A ficha vira uma ficha normal do jogo, e o mestre escolhe o jogador dela em **Configurar → Controlado por**. Isso já existe e não muda.

A ficha pequena dentro do jogo continua como está, para os ajustes durante a partida.

## Como funciona hoje
- **Menu inicial:** **Criar ficha** (`#lb-sheet` em `js/main.js`) abre a mesa em modo preparar e cria uma ficha lá dentro.
- **Janela da ficha:** `buildSheet(a)` em `js/ui.js`, com 480 px:
  - **Cabeçalho:** retrato, nome e barras (o atual aceita +5, -3 ou -2d6).
  - **Ações:** os 5 tipos (ataque, resistência, dano, cura, só rolar), cada um com os seus campos: alcance, área, barra afetada, alvos e custo. As fórmulas avisam quando uma @variável não existe e têm o seletor "+ atributo".
  - **Atributos:** nome, valor e rolar teste. As fórmulas de teste e de iniciativa ficam aqui também.
  - **Notas:** um campo de texto.
  - **Configurar:** tipo, quem controla, tamanho, cor, altura, regra atrás de muro baixo, imagem, barras com máximo, Duplicar, Exportar e Excluir.
- **Exportar:** gera um `.json` no formato `mesarpg-actor` (`App.Storage.actorBundle`).
- **Importar:** na mesa, o arquivo vira uma ficha nova (`applyImport`). O mestre importa e decide quem controla.

## Proposta

### A página
- É um arquivo novo, **`ficha.html`**. O botão **Criar ficha** da home passa a abrir essa página.
- Não abre mesa, não conecta e não tem tabuleiro: é só a ficha. Ela tem um **Voltar ao menu**.
- **Tudo salvo neste navegador**, numa lista própria chamada "Minhas fichas", separada da campanha. Fechar e abrir de novo mantém as fichas.

### Layout (tela larga: 2 colunas; celular: 1 coluna)
```
┌──────────────┬───────────────────────────────────────────────────┐
│ Minhas fichas│ [retrato]  Nome da ficha                          │
│ [+ Nova]     │            Tipo · Tamanho · Cor · Altura          │
│              │ ───────────────────────────────────────────────── │
│ Aventureiro  │ Barras         PV  20 / 20   Mana 10 / 10   [+]   │
│ Goblin       │ Atributos      [Força 3] [Destreza 2] [Defesa 15] │
│              │                Teste: 1d20+@valor  Iniciativa: …  │
│ [Importar]   │ Ações          lista de ações │ ação aberta       │
│              │ Notas          campo grande                       │
│              │ [Duplicar] [Exportar] [Excluir]     │
└──────────────┴───────────────────────────────────────────────────┘
```
- **Esquerda:** as fichas salvas, **+ Nova** e **Importar** (para continuar editando um arquivo recebido ou exportado antes).
- **Direita:** a ficha inteira numa página só, em blocos com espaço, sem abas apertadas.
  - **Barras:** nome, atual e máximo.
  - **Atributos:** em cartões, com o @nome embaixo e um dado que rola o teste. O resultado aparece ali mesmo, já que não tem chat.
  - **Ações:** a lista de um lado e a ação aberta do outro, com o formulário completo.

### Tudo o que a janela atual tem (versão 1)
| Janela de hoje | Na página nova |
|---|---|
| Nome, retrato, tipo, tamanho, cor, altura | Sim |
| Regra "atrás de muro baixo" | Sim |
| Barras: nome, atual (+5, -2d6) e máximo; adicionar e remover | Sim |
| Atributos: nome, valor, rolar teste, adicionar e remover | Sim (resultado na própria página) |
| Fórmulas de teste e iniciativa, com aviso de @variável | Sim |
| Ações: os 5 tipos com todos os campos e o "+ atributo" | Sim |
| Notas | Sim |
| Duplicar, Exportar, Excluir | Sim |
| Quem controla | Não: quem decide é o mestre ao importar (já é assim) |
| Colocar no mapa, usar ação no alvo | Não: não tem mapa; isso é no jogo |

### Nomes de atributos e barras
Na mesa, os nomes saem da lista da campanha. A página não tem campanha, então:
- os nomes são **escritos livres**, com sugestões da lista padrão do Vésper (Força, Destreza… PV, Mana);
- quando o mestre importa, um nome que não está na lista dele aparece como "(fora da lista)", como já acontece hoje.

### Ficha nova
Ela nasce com as barras e os atributos padrão, como a ficha nova de hoje. Opções mais completas ficam para depois, como você pediu.

## Perguntas para o usuário
Nenhuma. As respostas já definiram o plano:
1. É uma página própria, aberta pelo Criar ficha da home.
2. O jogador exporta e manda ao mestre, e o mestre importa.
3. A página é só da ficha, sem nada do tabuleiro.
4. A ficha do jogo continua para os ajustes.
5. Agora entra só a tela; as opções a mais ficam para depois.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `ficha.html` (novo) | Página da ficha. Usa `util.js`, `icons.js`, `dice.js` e o estilo da mesa |
| `js/ficha.js` (novo) | Lista "Minhas fichas" (IndexedDB), editor da ficha, rolar teste na página, importar e exportar no formato `mesarpg-actor` (com a imagem) |
| `js/main.js` | Criar ficha abre `ficha.html` |
| `index.html` | Texto do botão Criar ficha ("Monte a ficha e exporte para o mestre") |
| `css/style.css` (ou `css/ficha.css`) | Layout da página, 2 colunas e versão de celular |

## Tutorial, wiki e README
Ficam para quando você testar e finalizar:
- seção da wiki;
- linha no README;
- um passo no tutorial, se fizer sentido (o tutorial é dentro da mesa).

## Testes
- Criar ficha na home abre `ficha.html`.
- Criar, editar, fechar e reabrir a página: a ficha continua lá.
- Cada linha da tabela acima, editada na página, chega igual na mesa depois de exportar e importar. Isso inclui a imagem, os 5 tipos de ação, as barras, os atributos, as fórmulas e as notas.
- Importar na página um arquivo exportado pela mesa abre a ficha para editar.
- Rolar teste mostra o resultado na página.
- Aviso de @variável que não existe.
- Celular: uma coluna, sem rolagem para o lado.
- Regressão completa, tutorial completo e 0 processos.

## Resultado
- **`ficha.html` + `js/ficha.js` + `css/ficha.css`:** página própria, sem mesa. Usa só `util`, `icons`, `dice`, `images` e `combat`.
- **Minhas fichas:** lista com busca e os três grupos com +. Fica no IndexedDB, chave `fichas`, separada da campanha (o teste confere que a campanha não é tocada).
- **A ficha em uma página:** identidade, barras, atributos em cartões, fórmulas, ações (lista + ação aberta), notas e rodapé. Tudo o que a janela tem, menos "Controlado por" e "Colocar no mapa".
- **Pequenas ajudas que vieram junto** (para a página funcionar sem chat e sem campanha):
  - quadro "Rolagens" no canto;
  - **Testar** e **Duplicar** na ação;
  - "Outro (escrever o nome)…" em + Atributo;
  - "Salvo neste navegador · hora" no topo.
- **Altura:** aceita vírgula ("1,6"). O campo numérico perdia a vírgula.
- **Exportar:** gera o mesmo `mesarpg-actor` da mesa, com a imagem. O teste `ficha_mesa.js` importa na mesa e confere que chega igual: ações, barras, atributos, imagem, id novo e dono definido pelo mestre.
- **Celular:** uma coluna, e a lista fecha quando há ficha aberta. O Edge de teste não abre janela menor que ~492 px; nessa largura não há rolagem para o lado.
- **Testes novos:** `ficha.js` (`-page 'ficha.html'`) e `ficha_mesa.js`. `menu.js` atualizado. `runwalk.ps1` ganhou `-page`.
- **Limitações:**
  - As fichas da página ficam só neste navegador (como a campanha). Para levar a outro computador, use Exportar.
  - Importar na página aceita o arquivo `.json`, não o código de texto.
