# Plano 50 · Cadastro de subclasses

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Pode continuar" (último da ordem: Magias → Talentos → Antecedente → Espécie → Opções de classe → Classe → **Subclasse**; só cadastros, as fichas vêm depois).

## Objetivo
Uma aba **Subclasses** na página "test", com as subclasses das 26 classes base, cada uma ligada à sua classe e com tudo que ela dá nível a nível:
- características;
- magias sempre preparadas (domínios, juramentos);
- conjuração própria (Eldritch Knight, Arcane Trickster);
- opções de classe (manobras do Battle Master).

A classe passa a listar as suas subclasses.

## Como funciona hoje
- Aba Classes (Plano 49): as 26 classes base, com os níveis em que a subclasse dá características (Wizard 2024: 3, 6, 10, 14).
- No 5etools: **367 subclasses**; **324** são das 26 classes base (sem WoW). Por classe:

| Classe | 2014 | 2024 |
|---|---|---|
| Artificer | 4 | 10 |
| Barbarian | 9 | 13 |
| Bard | 8 | 14 |
| Cleric | 19 | 26 |
| Druid | 7 | 11 |
| Fighter | 10 | 16 |
| Monk | 10 | 15 |
| Paladin | 9 | 14 |
| Ranger | 8 | 14 |
| Rogue | 9 | 15 |
| Sorcerer | 9 | 15 |
| Warlock | 9 | 15 |
| Wizard | 13 | 22 |

- **Livros:** PHB 80, XGE 62, TCE 60, XPHB 48, SCAG 12, PSA 10, FRHoF 8, AU 8 e outros.
- **Cópias para 2024:** 124 subclasses de livros de 2014 (XGE, TCE…) aparecem também ligadas à classe de 2024, como o 5etools faz (ver pergunta 1).
- **O que cada subclasse traz:**
  - **características por nível**, com nome e texto;
  - **magias:**
    - sempre preparadas, como o Light Domain: Burning Hands e Faerie Fire no 1, Flaming Sphere no 3…;
    - à escolha: o Evoker escolhe magias de Evocação;
  - **conjuração própria** (Eldritch Knight, Arcane Trickster): atributo, terço de conjurador, tabela de truques, magias conhecidas e espaços;
  - **opções de classe:** Battle Master, manobras 3/5/7/9 nos níveis 3/7/10/15.

## Proposta
1. **Aba Subclasses** (ícone `git-branch`):
   - classes em botões com a contagem (Wizard 35, Cleric 45…);
   - filtros: edição da classe, livro, "dá magias", "conjura magia", "escolhe opções", "criadas por mim";
   - pesquisa por várias palavras (nome, classe, características, magias).
2. **Formulário da subclasse:**
   - **Identidade:** nome, nome curto (Evoker), classe (ligada à aba Classes, com "→"), edição, fonte, imagem.
   - **Características:** o editor do Plano 49 (lista por nível, nome, texto). Os níveis vêm da classe ("a classe dá características de subclasse nos níveis 3, 6, 10, 14").
   - **Magias:** o editor de magias dos benefícios (sempre preparadas, conhecidas, à escolha; nível do personagem; ligadas ao cadastro de Magias).
   - **Conjuração** (só as que conjuram): atributo, tipo, e a grade de progressão do Plano 49 (truques, magias conhecidas, espaços).
   - **Opções de classe por nível:** o editor do Plano 49 (Battle Master → Maneuver · Battle Master).
   - **Descrição** formatada.
3. **Na classe:** a seção nova "Subclasses (N)" lista as subclasses com link, e o resumo mostra quantas são.
4. **Ligações de volta:**
   - na magia, "Também está nas subclasses: Cleric: Light…" vira link;
   - na opção (manobra), "Subclasses que escolhem este tipo".
5. **Script:** `tools/cadastros-subclasses.mjs` grava `data/cadastros/subclasses.json` (+ `.js`), pelo carregador do 5etools: características completas, magias ligadas, tabela de conjuração.
6. **Conferência:** o teste `classes_conf.js` ganha as subclasses:
   - contagem por classe;
   - características nos níveis certos (Evoker 3, 6, 10, 14);
   - magias do Light Domain;
   - espaços do Eldritch Knight;
   - manobras do Battle Master.

## Perguntas para o usuário
1. **Subclasses de 2014 que o 5etools liga também à classe de 2024** (124, ex.: School of Divination do PHB aparece no Wizard de 2014 e no de 2024): mostrar as duas ligações, com o aviso "Do livro de 2014, usada com a classe de 2024" (recomendo, como o 5etools faz: quem joga em 2024 pode escolher essas subclasses), ou cada subclasse só uma vez, na classe do livro dela?

## Decisões do usuário
1. "Tudo bem, pode fazer igual ao 5etools" → as subclasses de 2014 aparecem também ligadas à classe de 2024, com o aviso "Do livro de 2014, usada com a classe de 2024".

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/cadastros-subclasses.mjs` (novo) e `tools/importar-cadastros.mjs` | subclasses, características, magias, conjuração, opções |
| `data/cadastros/subclasses.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Subclasses; seção "Subclasses" na classe; ligações de magias e opções |
| `.claude/testes/classes_conf.js` | conferência das subclasses |
| `css/cadastros.css` | o que faltar |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Conferência:**
  - 324 subclasses, por classe;
  - Evoker (2024) com características nos níveis 3, 6, 10, 14;
  - Light Domain (2024) com as magias sempre preparadas por nível;
  - Eldritch Knight (2024): INT, terço, espaços;
  - Battle Master (2024): manobras 3/5/7/9.
- **Tela:**
  - abrir pela classe e voltar;
  - da magia para a subclasse;
  - da manobra para o Battle Master;
  - editar uma característica de um padrão e voltar;
  - criar uma subclasse (classe, característica, magia sempre preparada).
- **Cadastro:** nada de "null" na tela; alinhamento em 1440 e 800 px.
- **Regressão:** `cadastros.js` (as outras abas), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-subclasses.mjs` grava `data/cadastros/subclasses.json` (≈ 1,5 MB):
  - **324 subclasses**, todas ligadas à classe; **124 cópias** de 2014 na classe de 2024, cada uma apontando para a original.
  - **2.128 características.** O 5etools agrupa por nível; aqui cada característica com nome vira uma linha, na ordem do livro ("Evoker", depois "Evocation Savant", "Potent Cantrip").
  - **Magias** no formato de benefícios, ligadas ao cadastro.
  - **Conjuração própria** (Eldritch Knight, Arcane Trickster) com a grade de espaços.
  - **Opções por nível** (Battle Master: manobras).
- **Formato comum de magias à escolha:** níveis seguidos viram intervalo ("Cantrip–3rd-level Wizard Evocation spell"); o resumo junta as repetidas "(×2)". Vale para talentos, espécies e classes.
- **Aba Subclasses:**
  - classes em botões com contagem;
  - filtros: "classe de" 2014/2024, marcas (dá magias, conjura, escolhe opções, do livro de 2014, só as originais, minhas), livro.
- **Formulário:**
  - **Subclasse:** classe (com "→"), nome curto, edição; a dica com os níveis em que a classe dá características de subclasse.
  - **Características:** o editor das classes.
  - **Magias:** o editor de magias dos benefícios.
  - **Conjuração própria:** a grade de progressão.
  - **Opções por nível** e **Descrição.**
  - **Cópia:** o aviso "Do livro de 2014, usada com a classe de 2024 (como no 5etools)" e "Abrir a original".
- **Na classe:** a seção "Subclasses (N)" com links e "Nova subclasse desta classe".
- **Ligações de volta:**
  - na magia, "Abrir a subclasse: Cleric: Light (XPHB)";
  - na opção, "Subclasses que escolhem este tipo de opção" (Riposte → Battle Master).

**Testado**
- **`classes_conf.js`:**
  - 324 subclasses, a contagem de cada uma das 26 classes, todas ligadas;
  - 124 cópias apontando para a original;
  - toda subclasse com característica no primeiro nível de subclasse da classe;
  - Evoker 2024 (3, 3, 3, 6, 10, 14);
  - Light 2024 (magias por nível, todas ligadas);
  - Eldritch Knight 2024 (INT, terço, espaços);
  - Battle Master 2024 (3/5/7/9).
- **`cadastros.js`:**
  - botões de classe; Wizard 2024 (22);
  - Evoker ↔ Wizard;
  - cópia → original;
  - Scorching Ray → Light;
  - Riposte → Battle Master;
  - Eldritch Knight com grade;
  - editar um padrão e voltar;
  - criar pela classe (Paladin 2024) com característica e magia.
- **Regressão:**
  - topo com 9 abas cabendo em 1440, 1100 e 800 px;
  - alinhamento em 1440 e 800 px;
  - as outras abas, `menu.js` e o tutorial sem erros; 0 processos.

**Limites**
- As cópias de 2014 usam os níveis como o 5etools os entrega (algumas misturam os níveis da subclasse de 2014 com os da classe de 2024, ex.: Light Domain na classe de 2024).
- Os números que as características dão (ex.: Bonus Proficiencies) ficam no texto, como nas classes.
