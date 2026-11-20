# Plano 44 · Cadastro de talentos

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Perfeito, vamos montar o plano então" (ordem combinada: Talento → Antecedente → Espécie → Magias → Opções de classe → Classe → Subclasse; "pensa só nos cadastros", as fichas vêm depois).

## Objetivo
Uma aba **Talentos** na página "test", no mesmo formato de Ataques e Itens: pesquisar, criar, editar, duplicar e apagar, já com os talentos do 5etools. Aqui nasce o formato de **característica** (o que um talento, um traço de espécie ou uma característica de classe *dá*), que os próximos cadastros vão reaproveitar.

## Como funciona hoje
- Página `cadastros.html` com as abas Ataques e Itens (Planos 42 e 43); padrões em `data/cadastros/*.json`, gerados por `tools/importar-cadastros.mjs`; o que a pessoa muda fica no navegador (IndexedDB `cadastros`), com Exportar/Importar.
- No 5etools, `feats.json` tem **317 talentos**:
  - **2024:** 77 do XPHB, mais os de outros livros;
  - **2014:** 42 do PHB, mais os de outros livros;
  - imagens de 44 deles em `fluff-feats.json`.
- **Categorias:**
  - Origin (O, 38), General (G, 103), Fighting Style (FS, 11, mais 3 só de Paladino/Patrulheiro);
  - Epic Boon (EB, 32), Dragonmark (D, 13), Dark Gift (DG, 9);
  - sem categoria: 108, quase todos de 2014.
- **O que um talento traz de forma estruturada:**
  - pré-requisitos: nível, atributo mínimo, espécie, outro talento, proficiência, conjuração, antecedente, característica, campanha, "outro";
  - aumento de atributo, fixo ou à escolha (Resilient: +1 em um à escolha);
  - proficiências e especialização: perícias, ferramentas, idiomas, armas, armaduras, testes de resistência (Skilled: 3 perícias ou ferramentas à escolha);
  - magias concedidas (88 talentos), sentidos, resistências e imunidades;
  - "repetível" e opções de classe (manobras, invocações).

## Proposta
1. **Aba Talentos** (ícone `award`), com:
   - categorias em botões com contagem, como nos itens: Origin, General, Fighting Style, Epic Boon, Dragonmark, Dark Gift, Other;
   - filtros: edição, fonte, "tem pré-requisito", nível mínimo, "dá aumento de atributo", "dá magia", "repetível", "criados por mim";
   - pesquisa por várias palavras (nome, categoria, benefício, pré-requisito).
2. **Formulário do talento:**
   - **Identidade:** nome, categoria, edição, fonte, repetível, imagem (5etools).
   - **Pré-requisitos:** lista de condições, cada uma de um tipo: nível, atributo mínimo (ex.: STR 13), espécie, talento, proficiência, conjuração, antecedente, característica, texto livre. Várias condições numa linha valem juntas (E); linhas diferentes são alternativas (OU), como no 5etools.
   - **Benefícios** (o formato de característica que os próximos cadastros reaproveitam):
     - **Aumento de atributo:** fixo (+1 STR) ou à escolha (+1 em STR/DEX, até o máximo 20 ou 30);
     - **Proficiências:** perícias, ferramentas, idiomas, armas, armaduras, testes de resistência; cada uma fixa ou "escolha N de…";
     - **Especialização:** fixa ou à escolha;
     - **Magias concedidas:** nome da magia, ou "escolha N da lista X de nível Y"; como (conhecida, 1 vez por dia, sempre preparada) e atributo de conjuração (ver pergunta 1);
     - **Sentidos:** visão no escuro, percepção às cegas…, com alcance;
     - **Defesas:** resistências, imunidades, imunidade a condições;
     - **Bônus simples:** deslocamento, iniciativa, PV por nível, CA (quando o talento dá um número fixo).
   - **Descrição:** texto formatado (com tabelas), com "Editar o texto", como nos itens.
   - **Resumo no topo**, por exemplo "Origin · 2024 · +1 STR/DEX · 2 cantrips + 1 magia de 1º nível · sem pré-requisito".
3. **Script:** `tools/importar-cadastros.mjs` gera `data/cadastros/feats.json` (+ `.js`). As cópias são resolvidas pelo carregador do 5etools, igual aos itens. As regras do 5etools (pré-requisitos, aumentos, proficiências, magias) são convertidas para o formato acima, e o que não couber num campo continua no texto.
4. **Ligações** (só de cadastro, sem ficha):
   - pré-requisito "talento" aponta para outro talento do cadastro;
   - pré-requisito "espécie" e magias concedidas ficam pelo nome por enquanto e se ligam sozinhos quando Espécie e Magias existirem (ver pergunta 1).

## Perguntas para o usuário
1. **Magias concedidas antes de existir o cadastro de Magias:** guardar o nome ("Misty Step") e a regra de escolha ("2 cantrips da lista de Wizard") agora, e ligar ao cadastro de Magias quando ele vier (recomendo: o talento já fica completo, e a ligação é automática pelo nome e pela fonte), ou deixar as magias só no texto por enquanto?
2. **Estilos de luta:** em 2024 eles são talentos (Archery, Defense…); em 2014 eram "opções de classe". Recomendo os de 2024 aqui, na categoria Fighting Style, e os de 2014 no cadastro de Opções de classe, como o 5etools faz. Ou junta todos os estilos aqui?
3. **Escolhas** (Resilient: "+1 em um atributo à escolha"; Skilled: "3 perícias ou ferramentas"): guardar estruturado, com as opções e a quantidade (recomendo: a ficha vai precisar disso para perguntar ao jogador), ou só como texto?

## Decisões do usuário
1. "Eita, esqueci das magias…" → Magias foi feito antes (Plano 45). As magias concedidas apontam direto para o cadastro de Magias (pelo nome e pela fonte), com a regra de escolha ("2 cantrips da lista de Wizard") quando é à escolha.
2. "Vamos no modelo do 5etools." → estilos de luta de 2024 aqui (Fighting Style); os de 2014 no cadastro de Opções de classe.
3. "Sim" → escolhas guardadas de forma estruturada (opções e quantidade).

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/importar-cadastros.mjs` (+ `tools/cadastros-talentos.mjs`) | talentos do 5etools no formato de característica; imagens; fontes |
| `data/cadastros/feats.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Talentos: categorias, filtros, formulário (pré-requisitos, benefícios, escolhas, magias), resumo |
| `css/cadastros.css` | listas de condições e de benefícios |
| `js/icons.js` | ícones que faltarem (`award`…) |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contagens:** batem com o 5etools (317), por categoria e por edição.
- **Talentos conhecidos:**
  - **Magic Initiate (XPHB):** Origin, repetível, 2 cantrips + 1 magia de 1º nível de Cleric/Druid/Wizard, atributo INT/WIS/CHA à escolha.
  - **Great Weapon Master (XPHB):** General, nível 4 e STR 13, +1 STR.
  - **Resilient (XPHB):** +1 à escolha e proficiência no teste de resistência do mesmo atributo.
  - **Skilled:** 3 perícias ou ferramentas à escolha.
  - **Elven Accuracy:** espécie Elf ou Half-Elf.
  - **Archery (XPHB):** Fighting Style.
  - **Um Epic Boon:** nível 19.
- **Edição:** pré-requisito com duas linhas (OU); aumento fixo e à escolha; magia fixa e à escolha; sentido com alcance na unidade de quem vê.
- **Cadastro:** criar, duplicar, apagar, desfazer, voltar ao padrão, restaurar, exportar e importar; nada de "null" na tela; alinhamento em 1440, 1100 e 800 px.
- **Regressão:** `cadastros.js` (Ataques e Itens), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-talentos.mjs` grava `data/cadastros/feats.json` (≈ 320 KB) com **305 talentos**:
  - Origin 35, General 95, Fighting Style 11 (+1 de Paladino, +1 de Patrulheiro), Epic Boon 32, Dragonmark 13, Dark Gift 9;
  - 108 sem categoria, quase todos de 2014.
  - **Fora da lista:** os 12 do livro WoW e as 9 variações geradas pelo 5etools ("Magic Initiate; Cleric", "Strike of the Giants; Fire"…), porque o talento principal já tem todas.
- **`tools/cadastros-beneficios.mjs`:** o formato de pré-requisitos e benefícios, que Antecedente, Espécie e Classe vão usar.
  - **Pré-requisitos:** linhas OU, condições E. Tipos: nível, atributo mínimo, espécie, talento, antecedente, característica, proficiência, conjuração, campanha, outro.
  - **Benefícios:** aumento de atributo (fixo ou à escolha, quanto, em quantos, máximo), proficiências e especialização (fixas, à escolha, "qualquer"), magias, sentidos com alcance, resistências e imunidades, opções de classe.
  - **Magias:** listas alternativas, atributo de conjuração, cada magia ligada ao cadastro de Magias ou à escolha com a regra, como, usos e a partir de que nível.
  - **Ligações de magia:** todas as magias citadas pelos talentos foram achadas no cadastro (nenhuma sem ligação).
- **Aba Talentos:**
  - categorias em botões com contagem;
  - filtros: pré-requisito, "dá…", atributo que aumenta, repetível, meus, edição e fonte.
- **Formulário:**
  - Talento (categoria, edição, repetível);
  - **Pré-requisitos:** editor de alternativas e condições;
  - **Benefícios:** um editor para cada tipo;
  - **Descrição.**
- **Ligações entre abas:** no talento, "→" abre a magia; na magia, "Também dão esta magia → Talentos" virou link para o talento.
- **Telas estreitas:** com 4 abas, os ícones das abas somem abaixo de 900 px.

**Testado** (`cadastros.js`; fotos `#shotft` Magic Initiate e `#shotft2` Fey Touched)
- **Talentos conhecidos:**
  - Magic Initiate: 3 listas, INT/WIS/CHA à escolha;
  - Great Weapon Master: Level 4 + STR 13, +1 STR;
  - Resilient: +1 à escolha e teste de resistência;
  - Skilled: 3 perícias ou ferramentas;
  - Elven Accuracy: Elf/Half-Elf;
  - Archery: Fighting Style;
  - Boon of Fate: Level 19, máximo 30;
  - Fey Touched: Misty Step ligado e magia à escolha.
- **Ligações:** do talento para a magia e da magia de volta para o talento.
- **Filtros:** Origin 2024 (35), dão magias (89), sem pré-requisito e aumentam CON (6).
- **Criar um talento com os editores:** pré-requisito "Level 8 ou STR 15", +1 DEX, Misty Step 1/day com WIS, visão no escuro 18 m, resistência a cold/necrotic, 2 perícias à escolha.
- **Editar um padrão:** "Voltar ao padrão" aparece na hora.
- **Regressão:**
  - nada de "null" na tela;
  - alinhamento em 1440 e 800 px;
  - Ataques, Itens, Magias, `menu.js` e o tutorial completo sem erros; 0 processos.

**Limites**
- Benefícios que o 5etools só descreve no texto (ex.: o bônus de iniciativa do Alert, o +1 de CA do Defense) ficam na descrição; dá para pô-los à mão.
- "Qualquer" (`anySkill`, `anyArtisansTool`…) aparece com o nome do 5etools.
