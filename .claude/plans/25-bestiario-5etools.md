# Plano 25 · Bestiário a partir do 5etools

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Vamos pegar do 5etools mesmo… é pedido para usar só os livros no qual o jogador tem acesso, e eu tenho todos… deixei o projeto com os jsons no workspace D:\Projetos\5etools-src. Agora vamos precisar pegar as informações dos monstros, npcs e fichas no geral, as imagens vamos pegar da web mesmo de acordo com https://github.com/5etools-mirror-3/5etools-img. Os links existem dentro dos jsons… vamos montar o nosso próprio com tudo, não se preocupa com tradução ou conversão agora, só remove o anterior e vamos adicionar os novos monstros, eu quero tudo de cada monstro, até a ficha, provavelmente vamos usar o próprio token do monstro."

## Objetivo
O bestiário passa a ter as criaturas e NPCs de todos os livros do 5etools, com:
- **tudo** de cada um: bloco de estatísticas, descrição, arte e token;
- o **token do próprio monstro**, buscado na web.

A base do SRD 5.2 (Plano 24) sai. Tradução e conversão ficam para depois.

## O que foi conferido em `D:\Projetos\5etools-src`
- **Monstros:** `data/bestiary/bestiary-*.json`, de 113 livros, com 4.683 registros. 1.145 deles são cópias de outro com mudanças (`_copy` com `_mod`).
- **Cópias:** o próprio carregador do 5etools (`DataLoader.pCacheAndGetAllSite('monster')`) roda no Node sem instalar nada.
  - Ele resolve todas as cópias: saem **5.051 criaturas**, nenhuma pendente, em menos de 1 segundo.
  - Uso esse código deles em vez de reescrever, então as cópias saem iguais às do site.
- **Descrição e arte:** `fluff-bestiary-*.json`, com 4.300 descrições. A arte vem como `{type: image, href: {path: 'bestiary/MM/Goblin.webp'}}`.
- **Token:** o endereço segue a regra do próprio site (`Renderer.monster.getTokenUrl`): `bestiary/tokens/<livro>/<nome>.webp`. 4.574 têm token.
  - Base das imagens: `https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/`.
  - Conferido: o token do Goblin (MM) responde.
- **Formato:** em inglês, com marcações próprias (`{@hit 4}`, `{@damage 1d6 + 2}`, `{@atk mw}`, `{@spell …}`).

## Proposta

### 1. Ferramenta `tools/importar-5etools.mjs`
Roda no Node, uma vez, e toda vez que você atualizar o 5etools-src:
- carrega tudo com o carregador do 5etools (cópias resolvidas, descrições e artes);
- grava **cada criatura inteira, sem cortar nenhum campo**, mais três coisas: o endereço do token, os endereços das artes e a descrição;
- o caminho do 5etools-src é um parâmetro (padrão `D:\Projetos\5etools-src`).

### 2. Arquivos gerados (fora do git)
São dados dos livros, então **não vão para o repositório público**. Ficam em `data/5etools/`, no `.gitignore`.
- `indice.js`: a lista leve (nome, livro, ND, tipo, tamanho, token), uns 600 KB, carregada quando o bestiário abre.
- `livro-<sigla>.js`, um por livro: as criaturas completas. Cada arquivo só é carregado quando alguém abre uma criatura daquele livro.
  - O total fica em torno de 25 a 30 MB; abrir um livro de cada vez mantém a janela rápida.
- São `.js`, não `.json`, para funcionar abrindo o `index.html` direto do computador.
- Em outro computador: basta rodar a ferramenta de novo, ou copiar a pasta `data/5etools/`.

### 3. Janela Bestiário (a mesma, com o conteúdo novo)
- **Lista e filtros:** os de hoje, mais **Livro** (com sigla e nome) e **Esconder versões antigas**.
  - "Versões antigas" é quando a criatura foi reimpressa num livro mais novo (`reprintedAs`), por exemplo o Goblin de 2014 virando o Goblin Warrior de 2024.
- **Prévia** em abas:
  - **Ficha:** o bloco completo, com as marcações limpas (`{@hit 4}` vira "+4" e `{@spell fireball}` vira "fireball").
  - **Descrição:** o texto de história do livro.
  - **Imagens:** a arte, da web.
- **Token:** a imagem da lista e do retrato é o token do monstro, da web.

### 4. Na mesa e na ficha
- **Colocar no mapa / Adicionar à campanha:** o token é baixado da web uma vez, convertido em WebP e entra na campanha como hoje. Os jogadores recebem pela rede, e depois funciona sem internet.
- **Ficha criada, em inglês por enquanto:**
  - nome;
  - tamanho do token e visão no escuro;
  - atributos (modificador) e Defesa = CA;
  - PV, com os dados de vida e Rolar PV;
  - ações de **Ataque** lidas de `{@hit N}` e `{@damage}`, e de **Resistência** lidas de `{@dc N}` e do atributo;
  - o bloco inteiro nas notas.

  Sem isso a criatura entraria na mesa sem conseguir atacar. A tradução fica para depois.
- **Meu bestiário, pasta local e Escolher imagem à mão:** continuam e têm prioridade sobre o token da web, para trocar a imagem de quem você quiser.
- **Página "Criar ficha":** **A partir do bestiário** usa a base nova.

### 5. O que sai
- `data/bestiario.js` (SRD), `tools/converter-srd.js` e `tools/srd/` (fonte e os 15 lotes de tradução).
- **Recomendo guardar a tradução** dos 15 lotes numa pasta de arquivo: ela vale para os monstros do SRD, que também estão no 5etools, quando a gente traduzir.
- O crédito do SRD no README e no rodapé troca para "dados do 5etools, a partir dos livros do próprio usuário".

## Perguntas para o usuário
1. **Tradução já feita:** apago de vez, ou guardo para reaproveitar depois? *Recomendo guardar*: são 2.324 textos, e boa parte serve para os mesmos monstros no 5etools.
2. **Ficha automática:** faço as ações automáticas (Ataque e Resistência) já agora, em inglês? *Recomendo que sim*: senão a criatura entra na mesa sem atacar.
3. **Arte da descrição:** buscar da web só quando você abre a aba Imagens? *Recomendo que sim*: a arte é grande, e só o token vai para a campanha.
4. **Outros dados do 5etools** ("fichas no geral"): por "fichas" você quer dizer as criaturas e os NPCs (os NPCs também estão no bestiário), ou também magias, itens e classes? *Recomendo só criaturas e NPCs agora*; o resto pode vir num plano próprio.

## Respostas do usuário
1. **Recomeçar:** descartar o que foi feito no Plano 24 (base do SRD, conversor e tradução). "Percebi erros que é melhor tratar depois com calma."
2. **Só importar as fichas.** Nada de ações automáticas agora.
3. **Imagens:** a arte só na aba Imagens, e o **token no tabuleiro** ("os tokens estão bonitos").
4. **Só criaturas e NPCs.** Itens são outra função.
5. **Filtro por livro**, porque o mesmo monstro aparece em vários livros. Exemplos dados: PHB (Livro do Jogador 2014/5e), XPHB (Livro do Jogador 2024/5.5e), DMG (Livro do Mestre 2014/5e), XDMG (Livro do Mestre 2024/5.5e). Os nomes completos de todos os livros (68) e aventuras (104) saem de `data/books.json` e `data/adventures.json`.
6. **Conversor de unidades, opcional**, com a tabela do usuário:

| Original | Brasil |
|---|---|
| 1 pé | 0,3 m (5 pés = 1,5 m) |
| 1 milha | 1,5 km |
| 1 milha por hora | 1,5 km/h |
| 1 libra | 0,5 kg |
| 1 onça fluida | 30 ml |
| 1 pinta | 0,5 L |
| 1 quarto | 1 L |
| 1 galão | 4 L |

7. Tradução fica para depois.

### O que muda na proposta por causa das respostas
- **Ficha criada na campanha**, sem conversão de regras:
  - nome, tipo (criatura ou NPC), tamanho do token, **token como imagem**;
  - barra PV com o PV médio;
  - os atributos com o modificador e a Defesa = CA (são números diretos do bloco, não regras);
  - o bloco inteiro nas notas;
  - os **dados originais inteiros** guardados na ficha (`dados5e`), para a conversão de regras e a tradução trabalharem depois a partir deles.
  - **Ações automáticas: não** (fica para depois).
- **Unidades:** a prévia e as notas mostram o texto original ou com as unidades do Brasil, numa opção **Unidades: originais | Brasil**. A escolha fica salva no navegador. O conversor é uma função própria (`App.Units`), para a mesa usar depois em outros lugares.
- **Sai de vez:** `data/bestiario.js`, `tools/converter-srd.js` e `tools/srd/` (com a tradução).
- **Ferramenta:** `tools/importar-5etools.mjs` (código do Vésper; lê o 5etools-src do seu computador). Os dados gerados ficam em `data/5etools/`, fora do git.
- **Token:** vem do GitHub com permissão para o navegador usar (`Access-Control-Allow-Origin: *`) e fundo transparente. Ao colocar no mapa, ele é convertido e entra na campanha.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/importar-5etools.mjs` (novo) | Usa o carregador do 5etools e grava `data/5etools/` (índice e um arquivo por livro) |
| `data/5etools/` (gerado, fora do git) | Índice e livros |
| `.gitignore` | `data/5etools/` |
| `js/bestiary.js` | Lê o índice e os livros sob demanda; filtro Livro e versões antigas; prévia com abas (Ficha, Descrição, Imagens); limpeza das marcações; token da web; `toActor` a partir do formato do 5etools |
| `js/ficha.js` | A partir do bestiário com a base nova |
| `css/style.css` | Abas da prévia e arte |
| `README.md` | Créditos e como gerar a base |
| Remover | `data/bestiario.js`, `tools/converter-srd.js`, `tools/srd/` (a tradução vai para arquivo, se você aprovar) |

## Testes
- **A ferramenta:**
  - gera todas as criaturas, sem nenhuma cópia pendente;
  - cada uma tem nome, livro e endereço de token;
  - conferir à mão o Goblin (MM), o Goblin Warrior (XMM) e o Archduke Zariel (cópia com mudanças).
- **Na mesa:**
  - abrir não carrega nada;
  - abrir o bestiário carrega só o índice, e abrir uma criatura carrega o livro dela;
  - filtros (livro, versões antigas, ND, tipo, tamanho, busca);
  - abas da prévia;
  - Colocar no mapa com o token da web (num teste sem internet, uma imagem falsa no lugar);
  - ataque e resistência funcionando;
  - Rolar PV;
  - Meu bestiário e a imagem local por cima do token.
- **Página de ficha:** A partir do bestiário.
- Regressão completa, tutorial completo e 0 processos.

## Resultado
- **Plano 24 descartado:** saíram a base do SRD, o conversor e a tradução (`data/bestiario.js`, `tools/converter-srd.js`, `tools/srd/`).
- **`tools/importar-5etools.mjs`:** usa o `DataLoader` do 5etools e roda em cerca de 1 s.
  - Saem **5.051 criaturas (1.160 NPCs) de 113 livros**, nenhuma cópia pendente, com **4.603 tokens** e **3.419 artes**.
  - Índice de 1,3 MB e livros com 18 MB, em `data/5etools/` (fora do git).
  - Uma amostra aleatória de 30 tokens e 10 artes respondeu toda (200).
- **Cada criatura vai inteira**, mais:
  - `_token`;
  - `_fluff` (descrição e artes);
  - `_txt`: tendência, tipo e iniciativa montados pelas funções do próprio 5etools ("any evil alignment", "Dragon (Chromatic)", iniciativa +12).
- **Janela:**
  - o índice abre na hora e o livro carrega só quando a criatura é aberta;
  - filtros Livro (nome e sigla, com a contagem), Tipo/NPCs, ND, tamanho, Esconder versões antigas, Meu bestiário e Sem imagem;
  - prévia em abas: Ficha (bloco completo, sem nenhuma marcação `{@…}` em nenhuma das 5.051), Descrição e Imagens (arte só nesta aba);
  - os tokens aparecem na lista, carregados aos poucos.
- **Unidades:** `js/units.js`, com a tabela do usuário, opcional (Originais | Brasil) e lembrada no navegador. Por exemplo, "reach 5 ft." vira "reach 1,5 m".
- **Na mesa:**
  - Colocar no mapa e Adicionar à campanha baixam o token, que entra na campanha como WebP;
  - a ficha não tem ações automáticas (ficam para depois);
  - Rolar PV e visão no escuro funcionam;
  - pasta local e Escolher da pasta continuam, por cima do token.
- **Página "Criar ficha":** A partir do bestiário usa a base nova (com o token).
- **Testes:** `bestiario.js` foi reescrito e `ficha.js` foi atualizado; o token é simulado para não depender da internet. A foto (`#shot`) usa os tokens de verdade.
- **Para depois:** tradução; ações automáticas a partir de `dados5e`; ações de covil (`legendarygroups.json`).
