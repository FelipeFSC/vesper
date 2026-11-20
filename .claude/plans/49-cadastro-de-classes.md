# Plano 49 · Cadastro de classes (com atenção às classes base)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Perfeito, vamos para esses passos, dê atenção para as classes base" (últimos da ordem: **Classe** → Subclasse; só cadastros, as fichas vêm depois). A Subclasse será o Plano 50, logo depois deste.

## Objetivo
Uma aba **Classes** na página "test", com as **classes base** completas e bem conferidas:
- **2014:** as 12 do PHB (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard);
- **2024:** as 12 do XPHB;
- **Artificer:** TCE (2014) e EFA (2024).

Cada classe com tudo que a ficha vai precisar, nível a nível: dado de vida, proficiências, equipamento inicial, magia (espaços, truques, magias preparadas), colunas da tabela da classe (Fúria, Ataque Furtivo, Invocações…), características por nível, opções de classe, talentos e onde entra a subclasse. Ligada aos cadastros que já existem: Itens, Magias, Talentos e Opções de classe.

## Como funciona hoje
- Página `cadastros.html` com 7 abas; editores comuns de pré-requisitos e benefícios; Opções de classe já com os tipos (Eldritch Invocation · Warlock…).
- No 5etools, `data/class/` tem:
  - **43 classes:**
    - 26 base (acima);
    - 11 do livro WoW;
    - 3 Sidekicks (TCE);
    - Mystic (Unearthed Arcana, teste antigo).
  - **367 subclasses** (Plano 50).
  - **690 características de classe**, com nome, nível e texto.
- **O que cada classe base traz:**
  - **dado de vida** (Wizard: d6), **atributo principal**, **testes de resistência** (Wizard: INT e WIS);
  - **proficiências iniciais:** armaduras, armas, ferramentas, perícias ("2 de Arcana, History…");
  - **equipamento inicial:**
    - 2024 "A, B ou C" (Fighter: A = Chain Mail, Greatsword…, 4 GP; B = …; C = 155 GP);
    - 2014 em linhas com escolhas ("(a) rapier ou (b) shortsword"), mais o ouro alternativo (4d4 × 10);
  - **multiclasse:** atributo mínimo e as proficiências que ganha;
  - **magia:**
    - atributo de conjuração;
    - tipo (completo, meio, terço, pacto, artífice);
    - truques e magias preparadas por nível;
    - espaços de magia por nível (o Bruxo: espaços de pacto e nível do espaço);
  - **tabela da classe:** colunas por nível (Barbarian: Rage, Rage Damage, Weapon Mastery; Rogue: Sneak Attack; Monk: Martial Arts, Focus Points; Warlock: Invocations);
  - **características por nível:** Spellcasting 1, Arcane Recovery 1, Scholar 2, subclasse 3, Ability Score Improvement 4…;
  - **opções de classe por nível:** Warlock 2024: invocações 1, 3, 3, 3, 5…; Sorcerer: metamagia;
  - **talentos por nível:** Fighter 2024: Fighting Style no 1; Epic Boon no 19 (todas as de 2024);
  - **nome da subclasse e níveis em que ela dá características** (3, 6, 10, 14…).

## Proposta
1. **Aba Classes** (ícone `shield`):
   - lista com as 26 classes base; filtros: edição, fonte, "conjura magia" (tipo de conjurador), dado de vida, atributo principal;
   - cada classe mostra o resumo "d10 · STR/DEX · Martial · 2024".
2. **Formulário da classe**, em seções:
   - **Identidade:** nome, edição, fonte, imagem, dado de vida, atributo principal, testes de resistência, nome da subclasse ("Wizard Subclass", "Arcane Tradition").
   - **Proficiências iniciais:** o editor de proficiências (armaduras, armas, ferramentas, perícias à escolha).
   - **Equipamento inicial:** o editor de equipamento do Plano 46 (grupos A/B/C, itens ligados, ouro), mais o ouro alternativo (2014).
   - **Multiclasse:** pré-requisito (o editor comum: atributo mínimo) e proficiências que ganha.
   - **Conjuração:**
     - atributo;
     - tipo (completo / meio / terço / pacto / artífice / não conjura);
     - preparação (preparadas, conhecidas, livro de magias);
     - a lista de magias da classe vem do cadastro de Magias (quantas há, por nível, com link).
   - **Progressão (tabela de 1 a 20):** uma grade editável com:
     - bônus de proficiência;
     - características do nível;
     - as colunas próprias da classe (Rage, Sneak Attack…);
     - truques, magias preparadas e espaços de magia do 1º ao 9º (ou de pacto).
   - **Características:** lista por nível, cada uma com nome, nível e texto (formatado). Marcadores:
     - "Aumento de atributo";
     - "Característica da subclasse";
     - "Escolhe opções de classe": tipo, ligado à aba Opções, e quantas, que pode variar por nível;
     - "Escolhe talento": categoria, ex.: Epic Boon no 19.
   - **Descrição** formatada.
3. **Ligações:**
   - **equipamento** → Itens;
   - **opções** → aba Opções já filtrada no tipo;
   - **talentos** → Talentos (categoria);
   - **magias** → "Magias da classe" abre a aba Magias filtrada pela classe;
   - **de volta:**
     - na magia, cada classe da lista vira link;
     - na opção de classe, "Classes que escolhem este tipo";
     - no talento Fighting Style, "Classes que dão".
4. **Script:** `tools/cadastros-classes.mjs` grava `data/cadastros/classes.json` (+ `.js`), pelo carregador do 5etools:
   - as características vêm inteiras (texto formatado);
   - as colunas da tabela e os espaços de magia viram números por nível;
   - medidas em metros (Plano 40).
5. **Conferência das classes base:** um teste que confere, para cada uma das 26, contra o livro:
   - dado de vida, testes de resistência, número de características;
   - nível da subclasse;
   - espaços de magia nos níveis 1, 5 e 20;
   - colunas da tabela.

## Perguntas para o usuário
1. **Quais classes entram:** só as 26 classes base (recomendo, como você pediu), ou também os 3 Sidekicks do TCE (classes de ajudante para NPCs) e o Mystic (teste antigo do Unearthed Arcana)? As do livro WoW ficam de fora, como nos outros cadastros.
2. **Tabela de progressão:** guardar a tabela inteira de 1 a 20 como números editáveis (recomendo: a ficha lê direto, e quem cria uma classe nova preenche a grade), ou calcular os espaços de magia pelo tipo de conjurador e guardar só as colunas próprias?

## Decisões do usuário
1. "Sim" → só as 26 classes base (12 PHB, 12 XPHB, Artificer TCE e EFA); sem Sidekicks, Mystic e WoW.
2. "Sim" → a tabela de progressão inteira (1 a 20) guardada como números editáveis.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/cadastros-classes.mjs` (novo) e `tools/importar-cadastros.mjs` | classes base, características, progressão, equipamento, conjuração |
| `data/cadastros/classes.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Classes; editores de progressão (grade 1–20), características por nível, conjuração, multiclasse; ligações |
| `css/cadastros.css` | grade de progressão e características |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Conferência das 26 classes base:**
  - dado de vida, testes de resistência e nível da subclasse;
  - características por nível (ex.: Wizard 2024: Spellcasting, Ritual Adept, Arcane Recovery no 1; Scholar no 2; subclasse no 3);
  - espaços de magia (Wizard 1: 2 do 1º; Wizard 20: 4/3/3/3/3/2/2/1/1; Paladin 2024 1: 2; Warlock 2024 20: 4 espaços do 5º);
  - colunas (Barbarian: Rage 2→6; Rogue: Sneak Attack 1d6→10d6; Monk 2024: Martial Arts 1d6→1d12).
- **Opções e talentos:** Warlock 2024 escolhe invocações 1, 3, 3, 3, 5…; Fighter 2024 escolhe um Fighting Style no 1.
- **Equipamento:** Fighter 2024 A/B/C com itens ligados e 155 GP; Rogue 2014 com as linhas de escolha e 4d4 × 10.
- **Ligações:** da classe para itens, opções, talentos e magias, e de volta.
- **Cadastro:** criar (com a grade e características), duplicar, apagar, desfazer, voltar ao padrão, exportar e importar; nada de "null" na tela; alinhamento em 1440 e 800 px.
- **Regressão:** `cadastros.js` (as outras abas), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-classes.mjs` grava `data/cadastros/classes.json` (≈ 465 KB) com as **26 classes base** e 577 características.
  - **Níveis da subclasse:** lidos dos arquivos originais (o carregador do 5etools tira essa marca).
  - **Multiclasse de 2024:** o livro não traz o mínimo; foi calculado pela regra (13 no atributo principal), com o aviso no formulário.
  - **Equipamento:** reaproveita o leitor dos antecedentes (`makeEquipment`, agora exportado; o arquivo dos antecedentes ficou idêntico).
- **Correção que vale para todos os cadastros:** o texto `{@filter Cantrips|…}` virava "level=0" e agora vira "Cantrips" (afetava rótulos e textos de magias, opções e classes).
- **Aba Classes:**
  - filtros: conjuração (completo, meio, terço, pacto, não conjura), dado de vida, atributo principal, edição e fonte;
  - resumo "d6 · INT · conjurador completo · Wizard Subclass 3".
- **Formulário:**
  - **Classe:** edição, dado de vida, atributo principal ("STR or DEX", "DEX + WIS"), nome e níveis da subclasse, testes de resistência.
  - **Proficiências iniciais:** o editor de benefícios mostrando só a seção de proficiências (`benefitsEditor` ganhou o parâmetro "só estas seções").
  - **Equipamento inicial:** o editor dos antecedentes, o ouro alternativo e as linhas como estão no livro.
  - **Conjuração:** atributo, tipo, como escolhe as magias e o botão "N magias de Wizard", que abre a aba Magias filtrada.
  - **Progressão 1–20:** grade editável com proficiência, características do nível, colunas da classe (renomear, tirar, adicionar), truques, magias, espaços do 1º ao 9º ou de pacto; o deslocamento na unidade de quem vê.
  - **Características:** lista por nível, que abre para editar nível, nome, marca (aumento de atributo, subclasse) e texto.
  - **Opções e talentos por nível:** tipo/categoria, quantos do nível 1 ao 20, "→" para a aba filtrada.
  - **Multiclasse** e **Descrição.**
- **Ligações de volta:**
  - na magia, "Abrir a classe: Wizard (2014), Wizard (2024)";
  - na opção, "Classes que escolhem este tipo" (com o nível);
  - no talento, "Classes que dão talentos de Fighting Style / Epic Boon".
- **Layout:** os resumos do topo quebram linha quando são longos (isso empurrava a página para o lado em 800 px); a grade rola dentro da moldura.

**Testado**
- **`classes_conf.js` (sem navegador):** as 26 classes conferem com o livro.
  - dado de vida, resistências, subclasse no nível certo (2014: Cleric/Sorcerer/Warlock 1, Druid/Wizard 2), proficiência e aumento no 4;
  - **espaços:** conjuradores completos 2/4-3-2/4-3-3-3-3-2-2-1-1; Paladin e Ranger 2014 a partir do 2 × 2024 desde o 1; Artificer; pacto 1×1º → 4×5º;
  - **colunas:** Rages 2 → Unlimited (2014) / 6 (2024), Rage Damage, Sneak Attack 1d6 → 10d6, Martial Arts 1d4 → 1d10 (2014) / 1d6 → 1d12 (2024), Unarmored Movement +3 m;
  - **opções e talentos:** invocações 1,3,3,3,5; Fighting Style no 1; Epic Boon no 19 (2024); metamagia;
  - **equipamento:** Fighter A/B/C (155 GP); Rogue 4d4 × 10;
  - **multiclasse:** Monk DEX e WIS 13; Fighter 2024 STR ou DEX 13.
- **`cadastros.js`:**
  - grade do Wizard e características;
  - magias da classe (290);
  - ligações de opção, talento e magia;
  - editar a grade de um padrão e voltar;
  - criar uma classe com coluna, característica, conjuração e opções por nível.
- **Regressão:**
  - as outras abas, `menu.js` e o tutorial sem erros;
  - alinhamento em 1440 e 800 px, sem rolagem lateral;
  - 0 processos.

**Limites**
- As subclasses e as características delas são o Plano 50; por enquanto a classe só marca os níveis em que a subclasse dá características.
- O texto de cada característica fica como no livro; os números que ela dá (ex.: Unarmored Defense) não viram campos de benefício ainda.
