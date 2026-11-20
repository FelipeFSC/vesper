# Plano 46 · Cadastro de antecedentes

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Perfeito, pode continuar" (ordem combinada: Magias → Talentos → **Antecedente** → Espécie → Opções de classe → Classe → Subclasse; só cadastros, as fichas vêm depois).

## Objetivo
Uma aba **Antecedentes** na página "test": pesquisar, criar, editar, duplicar e apagar, já com os do 5etools. O antecedente usa o que já existe: o **talento** que ele dá (ligado ao cadastro de Talentos), o **equipamento inicial** (ligado ao cadastro de Itens) e o editor de **benefícios** do Plano 44.

## Como funciona hoje
- Página `cadastros.html` com Ataques, Itens, Magias e Talentos; o formato de pré-requisitos e benefícios está em `tools/cadastros-beneficios.mjs` e os editores (`prereqEditor`, `benefitsEditor`) em `js/cadastros.js`.
- No 5etools, `backgrounds.json` tem **175 antecedentes**:
  - **2024:** 16 do XPHB, mais os de outros livros;
  - **2014:** 20 do PHB, mais os de outros livros;
  - **cópias:** 26 são variantes de outro (ex.: "Baldur's Gate Acolyte" ← Acolyte; "Augen Trust (Spy)" ← Criminal);
  - **imagens:** 99 têm.
- **O que cada antecedente traz:**
  - **2024:**
    - atributos com pesos: +2/+1 ou +1/+1/+1 entre três (Acolyte: INT, WIS, CHA);
    - um talento de origem, às vezes já com a escolha (Acolyte → Magic Initiate, Cleric);
    - 2 perícias, 1 ferramenta;
    - equipamento "A ou B" (A: itens + 8 GP; B: 50 GP).
  - **2014:**
    - perícias, ferramentas e idiomas;
    - equipamento com escolhas ("um livro de orações ou uma roda de orações");
    - uma **Característica** com nome (Acolyte: "Shelter of the Faithful");
    - as **Características sugeridas**: tabelas de Personality Trait (d8), Ideal (d6), Bond (d6) e Flaw (d6).
  - **Alguns:** magias (15), pré-requisito (4: campanha) ou "um talento à escolha" (15).

## Proposta
1. **Aba Antecedentes** (ícone `scroll-text`):
   - filtros: edição, fonte, "dá talento", "dá magias", perícia que dá, "é variante", "criados por mim";
   - pesquisa por várias palavras.
2. **Formulário do antecedente:**
   - **Identidade:** nome, edição, fonte, imagem; se for variante, o aviso "Variante de Acolyte" com link.
   - **Pré-requisitos:** o editor do Plano 44.
   - **Benefícios** (o editor do Plano 44, com uma novidade):
     - **atributos com pesos:** "+2 em um e +1 em outro, ou +1 em três, entre INT/WIS/CHA";
     - proficiências (perícias, ferramentas, idiomas), magias, sentidos…
   - **Talento:**
     - o talento que o antecedente dá, ligado ao cadastro de Talentos, com a escolha quando houver (Magic Initiate → Cleric) e o link "→" para abrir;
     - ou "um talento à escolha" (com a categoria, ex.: Origin).
   - **Equipamento inicial:**
     - grupos de escolha (A / B…); cada grupo com uma lista de itens, quantidade e ouro;
     - item ligado ao cadastro de Itens (link "→") ou texto livre ("sticks of incense", "vestments");
     - resumo "A: Book, Calligrapher's Supplies, Holy Symbol, Parchment ×10, Robe, 8 GP · ou B: 50 GP".
   - **Característica** (2014): nome e texto.
   - **Características sugeridas** (2014): as quatro tabelas (traço, ideal, vínculo, defeito), com o dado (d6/d8) e as linhas editáveis (ver pergunta 1).
   - **Descrição** formatada.
3. **Script:** `tools/cadastros-antecedentes.mjs` grava `data/cadastros/backgrounds.json` (+ `.js`), pelo carregador do 5etools (cópias resolvidas):
   - talentos ligados pelo nome e pela fonte;
   - "magic initiate; cleric" vira Magic Initiate + escolha "Cleric";
   - itens do equipamento ligados pelo id do cadastro de Itens;
   - ouro em peças de cobre, como os preços.
4. **Ligações de volta:**
   - no talento, "Antecedentes que dão este talento";
   - no item, nada por enquanto (ficaria grande demais em itens comuns como "Pouch").

## Perguntas para o usuário
1. **Características sugeridas** (as tabelas de traço, ideal, vínculo e defeito dos antecedentes de 2014): guardar como tabelas de verdade, com o dado e as linhas (recomendo: a ficha poderá sortear ou deixar o jogador escolher), ou só como texto na descrição?
2. **Variantes** (26, ex.: as versões de Baldur's Gate, que copiam o original e mudam pouco): ficam como antecedentes separados, com o aviso "Variante de…" (recomendo, é como o 5etools mostra), ou escondidas atrás do original, como as versões dos grupos de itens?

## Decisões do usuário
1. "Sim, guardar como tabela." → as Características sugeridas ficam como tabelas (dado e linhas).
2. "Perfeito, segue o recomendado" → as variantes ficam como antecedentes separados, com o aviso "Variante de…".

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/cadastros-antecedentes.mjs` (novo) e `tools/importar-cadastros.mjs` | antecedentes, talento, equipamento, característica, tabelas |
| `tools/cadastros-beneficios.mjs` | atributos com pesos (+2/+1 ou +1/+1/+1) |
| `data/cadastros/backgrounds.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Antecedentes; editores de Talento, Equipamento, Característica e Tabelas; pesos no editor de atributos; "Antecedentes que dão este talento" |
| `css/cadastros.css` | equipamento e tabelas |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contagens:** batem com o 5etools (175), por edição.
- **Antecedentes conhecidos:**
  - **Acolyte (XPHB):** INT/WIS/CHA com pesos, Magic Initiate (Cleric) ligado, Insight e Religion, Calligrapher's Supplies, equipamento A (com os itens ligados e 8 GP) ou B (50 GP).
  - **Acolyte (PHB):** 2 idiomas à escolha, característica Shelter of the Faithful, as 4 tabelas (d8, d6, d6, d6), livro de orações ou roda de orações.
  - **Baldur's Gate Acolyte:** variante de Acolyte.
  - **Um antecedente com magias** e um com pré-requisito de campanha.
- **Edição:** pesos de atributo; trocar o talento; equipamento (adicionar grupo, item ligado, item livre, ouro); linha nova numa tabela.
- **Ligações:** do antecedente para o talento e o item; do talento para o antecedente.
- **Cadastro:** criar, duplicar, apagar, desfazer, voltar ao padrão, exportar e importar; nada de "null" na tela; alinhamento em 1440 e 800 px.
- **Regressão:** `cadastros.js` (as outras abas), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-antecedentes.mjs` grava `data/cadastros/backgrounds.json` (≈ 575 KB) com **175 antecedentes**: 96 de 2014, 74 de 2024 e 5 sem edição; 26 variantes.
  - **Talento:** ligado ao cadastro de Talentos; "magic initiate; cleric" vira Magic Initiate + escolha "Cleric"; nenhum talento sem ligação.
  - **Equipamento:** grupos "sempre" e "escolha um" (A/B…).
    - Itens ligados ao cadastro de Itens, inclusive os grupos (Holy Symbol, Arcane Focus).
    - O que não é item vira texto livre ("Sticks of incense"); também guarda o ouro, a quantidade e o "contém 15 gp" da bolsa.
  - **2014:** a Característica sai da descrição e vira campo próprio; as Características sugeridas viram tabelas (nome, dado e linhas).
  - **2024:** os atributos com pesos (+2/+1 ou +1/+1/+1) entraram no formato comum de benefícios.
- **Aba Antecedentes:** filtros "dá…" (talento, magias, ferramenta, idioma, característica, tabelas), perícia, atributo, variante/original, meus, edição e fonte.
- **Formulário:**
  - **Variante:** o aviso "Variante de… → Abrir o original".
  - **Editores próprios:** Pré-requisitos, Talento (ligado ou "à escolha" com categoria), Equipamento inicial, Característica, Características sugeridas (uma linha por resultado do dado).
  - **Benefícios:** o editor de atributos ganhou o modo "Com pesos".
  - **Descrição.**
- **Ligações:**
  - do antecedente: para o talento ("→") e para os itens ("→");
  - no talento: "Antecedentes que dão este talento" (Magic Initiate ← Acolyte (Cleric), Guide (Druid), Sage (Wizard)…).
- **Desempenho:** as listas de sugestões (3.200 itens, 969 magias) são montadas uma vez só e reaproveitadas, em vez de refeitas a cada redesenho.

**Testado** (`cadastros.js`; fotos `#shotbg` e `#shotbg2`)
- **Acolyte 2024:** INT/WIS/CHA com pesos, Magic Initiate (Cleric) ligado, Insight e Religion, Calligrapher's Supplies, A (itens ligados + 8 gp) ou B (50 gp).
- **Acolyte 2014:** 2 idiomas, Shelter of the Faithful, tabelas d8/d6/d6/d6, livro ou roda de orações.
- **Baldur's Gate Acolyte:** variante de Acolyte (PHB).
- **Ligações:** do antecedente para o talento e o item, e do talento de volta para o antecedente.
- **Filtros:** dão magias (15); Stealth em 2024.
- **Criar com os editores:**
  - pesos 2,1 e o talento Alert ligado;
  - equipamento A: Spear ×2 ligada; B: 30 gp;
  - característica e tabela de 4 linhas.
- **Regressão:**
  - as outras abas, `menu.js` e o tutorial sem erros; alinhamento em 1440 e 800 px; 0 processos;
  - o teste agora também registra erros de funções assíncronas e espera o aviso da importação em vez de um tempo fixo.

**Limites**
- Os textos dos itens à escolha por tipo ("Artisan's Tools (any)") ficam como texto, sem ligação.
