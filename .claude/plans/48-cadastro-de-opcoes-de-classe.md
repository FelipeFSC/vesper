# Plano 48 · Cadastro de opções de classe

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Pode seguir" (próximo da ordem: Magias → Talentos → Antecedente → Espécie → **Opções de classe** → Classe → Subclasse; só cadastros).

## Objetivo
Uma aba **Opções de classe** na página "test": as escolhas que algumas classes e subclasses fazem de uma lista (invocações do Bruxo, manobras do Mestre de Batalha, metamagia, estilos de luta de 2014…). Pesquisar, criar, editar, duplicar e apagar, já com as do 5etools. Quando o cadastro de Classe vier, cada classe vai apontar para os tipos daqui ("escolhe 2 invocações no nível 2…").

## Como funciona hoje
- Página `cadastros.html` com seis abas; os editores de pré-requisitos e benefícios (Planos 44 a 47).
- Talentos que dão opções (ex.: Eldritch Adept → "Eldritch Invocations") guardam só o nome (`benefits.options`).
- No 5etools, `optionalfeatures.json` tem **233 opções**; 221 sem o livro WoW. Delas, 58 são do XPHB e 82 do PHB.
- **Tipos:**

| Tipo | Opções |
|---|---|
| Eldritch Invocation (Bruxo) | 89 |
| Maneuver (Battle Master) | 48 |
| Metamagic (Feiticeiro) | 20 |
| Elemental Discipline (Monge 2014) | 17 |
| Artificer Infusion | 16 |
| Arcane Shot (Arcane Archer) | 16 |
| Rune (Rune Knight) | 6 |
| Pact Boon (Bruxo 2014) | 4 |
| Renown Perk | 4 |
| Fighting Style de 2014 | 13 (Guerreiro, Paladino, Patrulheiro, Bardo; uma opção pode servir a várias classes) |

- **O que cada opção traz:**
  - **pré-requisitos:** nível numa classe (Bruxo 5), uma magia conhecida (Eldritch Blast), um pacto (Pact of the Tome), um item ("a suit of armor"), outra opção, texto;
  - **custo:** dado de superioridade, pontos de feitiçaria (1, 2, 3 ou de 1 a 9);
  - **benefícios:** magias (56), sentidos, perícias;
  - **variante de característica:** 25 opções de 2020 (TCE) que trocam ou somam uma característica da classe.

## Proposta
1. **Aba Opções de classe** (ícone `layers`):
   - tipos em botões com contagem e o nome da classe (ex.: "Eldritch Invocation · Warlock");
   - filtros: classe, nível mínimo, "tem custo", "dá magias", edição, fonte, "criadas por mim";
   - pesquisa por várias palavras.
2. **Formulário da opção:**
   - **Identidade:** nome, edição, fonte, tipos (uma opção pode ter vários: Archery serve a Guerreiro e Patrulheiro).
   - **Pré-requisitos:** o editor do Plano 44, com tipos novos:
     - nível **numa classe**;
     - **magia conhecida** (ligada ao cadastro de Magias, ou "um truque de Bruxo que cause dano");
     - **pacto**;
     - **item**;
     - **outra opção** (ligada a esta mesma aba).
   - **Custo:** recurso (Superiority Die, Sorcery Point, Ki…) e quantidade (fixa ou de X a Y).
   - **Benefícios:** o editor dos Planos 44–47 (magias, sentidos, perícias…).
   - **Variante de característica** (TCE): marca e texto do que ela troca.
   - **Descrição** formatada.
3. **Ligações:**
   - no talento, "Opções de classe: Eldritch Invocations ×1" vira link para o tipo (filtro desta aba);
   - na magia, "Também dão esta magia → Opções de classe" vira link;
   - a magia e a opção exigidas no pré-requisito abrem com "→".
4. **Estilos de luta:** os de 2014 ficam aqui (como no 5etools); os de 2024 continuam em Talentos (Fighting Style), com o aviso "Reeditado como talento em 2024 → Archery (XPHB)" quando houver.
5. **Script:** `tools/cadastros-opcoes.mjs` grava `data/cadastros/options.json` (+ `.js`), pelo carregador do 5etools. Sem o livro WoW.

## Perguntas para o usuário
1. **Tipos e classes:** os botões do topo mostram os tipos com o nome da classe ("Eldritch Invocation · Warlock", "Maneuver · Battle Master"; recomendo: quem procura pensa na classe), ou só os tipos, como no 5etools ("Eldritch Invocation", "Maneuver, Battle Master")?

## Decisões do usuário
1. "Tudo bem, pode seguir" → os botões do topo mostram o tipo com a classe ("Eldritch Invocation · Warlock").

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/cadastros-opcoes.mjs` (novo) e `tools/importar-cadastros.mjs` | opções, tipos, custo, pré-requisitos novos |
| `tools/cadastros-beneficios.mjs` | pré-requisitos: nível com classe, magia, pacto, item, opção |
| `data/cadastros/options.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Opções de classe; editor de custo; tipos novos no editor de pré-requisitos; ligações de talentos e magias |
| `css/cadastros.css` | o que faltar |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contagens:** batem com o 5etools (221 sem WoW), por tipo.
- **Opções conhecidas:**
  - **Agonizing Blast (XPHB):** Bruxo nível 2 e um truque de Bruxo que cause dano.
  - **Eldritch Spear:** exige Eldritch Blast, ligada à magia.
  - **Thirsting Blade:** Pact of the Blade.
  - **Twinned Spell:** custo em pontos de feitiçaria.
  - **Archery (PHB):** Guerreiro e Patrulheiro, com o aviso de talento em 2024.
  - **Uma manobra:** Superiority Die.
  - **Uma infusão:** pré-requisito de item.
- **Ligações:**
  - do talento Eldritch Adept para as invocações;
  - da magia para a opção;
  - da opção para a magia exigida.
- **Cadastro:** criar, duplicar, apagar, desfazer, voltar ao padrão, exportar e importar; nada de "null" na tela; alinhamento em 1440 e 800 px.
- **Regressão:** `cadastros.js` (as outras abas), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-opcoes.mjs` grava `data/cadastros/options.json` (≈ 130 KB) com **221 opções** (sem WoW) e a tabela de tipos, cada tipo com nome e classe.

| Tipo | Opções |
|---|---|
| Eldritch Invocation | 82 |
| Maneuver (Battle Master) | 43 |
| Metamagic | 20 |
| Elemental Discipline | 17 |
| Artificer Infusion | 16 |
| Arcane Shot | 16 |
| Fighting Style | Fighter 11, Paladin 7, Ranger 7, Bard 2 |
| Rune | 6 |
| Pact Boon | 4 |
| Renown Perk | 4 |

- **Custo:** recurso e quantidade (fixa ou de… a…).
- **"Virou talento em 2024":** ligado ao talento (Archery PHB → Archery XPHB).
- **Pré-requisitos novos no formato comum** (servem a todos os cadastros):
  - **magia conhecida:** ligada ao cadastro de Magias, ou texto como "a Warlock cantrip that deals damage";
  - **pacto** e **item**;
  - **outra opção:** ligada, com o nome certo ("Pact of the Blade");
  - **nível numa classe.**
- **Aba Opções** (nome completo "Opções de classe" ao passar o mouse):
  - tipos em botões com a classe ("Eldritch Invocation · Warlock") e a contagem;
  - filtros: classe, "pode pegar no nível", marcas (custo, magias, pré-requisito, variante, virou talento, minhas), edição e fonte.
- **Formulário:**
  - tipos marcáveis (uma opção pode servir a várias classes) e variante de característica;
  - pré-requisitos, com "→" para abrir a magia ou a opção exigida;
  - custo e benefícios;
  - "Talentos que dão este tipo de opção";
  - descrição.
- **Ligações:**
  - no talento, cada opção de classe tem o tipo e "→" abre a aba já filtrada (Eldritch Adept → 82 invocações);
  - na magia, "Também dão esta magia → Opções de classe" é link.
- **Topo com 7 abas:**
  - contagens somem abaixo de 1500 px e ícones abaixo de 1200 px;
  - "Voltar ao menu" fica só com o ícone abaixo de 1000 px;
  - a aba aberta sempre fica à vista. Conferido em 1440, 1100 e 800 px.

**Testado** (`cadastros.js`; fotos `#shotop`)
- **Opções conhecidas:**
  - Agonizing Blast: truque de Bruxo que cause dano e Bruxo nível 2;
  - Eldritch Spear (PHB): Eldritch Blast, com o link;
  - Thirsting Blade: Pact of the Blade, com o link, e nível 5;
  - Twinned Spell e Riposte: com custo;
  - Archery (PHB): Guerreiro e Patrulheiro, com o link para o talento de 2024;
  - Enhanced Defense: pré-requisito de item.
- **Filtros:** invocações 2024 no nível 2 (14); do Sorcerer (20).
- **Ligação de talento:** Eldritch Adept → tipo.
- **Criar:** uma metamagia com custo 2 e Fire Bolt exigida.
- **Regressão:**
  - nada de "null" na tela; alinhamento em 1440 e 800 px;
  - as outras abas, `menu.js` e o tutorial sem erros;
  - 0 processos; uma pasta de perfil de teste que sobrou foi apagada.

**Limites**
- Quantas opções cada classe escolhe e em que nível (ex.: "2 invocações no nível 2") entra no cadastro de Classe.
