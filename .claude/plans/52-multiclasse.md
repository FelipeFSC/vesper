# Plano 52 · Multiclasse na ficha 5e e no assistente

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "vamos por parte" (Plano 51: a multiclasse ficou para logo depois) e "vamos continuar".

## Objetivo
Um personagem 5e pode ter mais de uma classe (ex.: Fighter 2 / Wizard 3), como no Roll20.
- **Contas:** PV, proficiência, dados de vida, espaços de magia e características saem de todas as classes.
- **Subir de nível:** o assistente pergunta em qual classe, avisa se faltar o atributo mínimo, e dá só o que a multiclasse dá.

## Como funciona hoje
- **A ficha já guarda as classes numa lista** (`a.dnd5e.classes`), mas a tela e o assistente usam só a primeira.
- **`js/regras5e.js`:**
  - nível total, PV e dados de vida já somam todas as classes;
  - proficiência: pela tabela da primeira classe;
  - espaços: hoje somam as tabelas de cada classe, o que está **errado** para multiclasse;
  - conjuração: um atributo, uma CD e um ataque para a ficha toda.
- **Cadastro de Classes (Plano 49):**
  - `multiclass.requirements`: ex.: Paladin 2024 pede For 13 **e** Car 13; Fighter 2024 pede For 13 **ou** Des 13;
  - `multiclass.proficiencies`: o que a classe nova dá (Fighter 2024: armaduras leves e médias, escudo, armas marciais; Rogue 2014: armadura leve, ferramentas de ladrão, 1 perícia);
  - `spellcasting.progression`: `full`, `1/2`, `artificer` (metade arredondando para cima; é o caso do Paladin e do Ranger de 2024), `1/3` (subclasses), `pact`.

## Proposta

### 1. Regras da multiclasse
- **Nível do personagem:** a soma das classes. A **proficiência** sai do nível total (+2 do 1 ao 4, +3 do 5 ao 8…).
- **PV:**
  - dado cheio só no 1º nível da **primeira** classe;
  - nos outros níveis, a média (ou o valor rolado) do dado **de cada classe**;
  - + Con por nível.
- **Dados de vida:** separados por tipo ("2d10 + 3d6").
  - Gastar escolhe o dado.
  - O descanso longo devolve os dados de vida pela regra da edição (metade em 2014, todos em 2024), começando pelos maiores.
- **Salvaguardas:** só as da primeira classe.
- **Proficiências da classe nova:** as de `multiclass.proficiencies`, não as da classe inteira.
- **Espaços de magia** (tabela de conjurador multiclasse, a mesma do livro):
  - nível de conjurador = níveis de classes completas + metade dos de meio-conjurador + um terço dos de subclasse que conjura;
  - **2014:** metade arredonda para baixo; o Artificer arredonda para cima;
  - **2024:** Paladin e Ranger arredondam para cima; o Eldritch Knight e o Arcane Trickster, para baixo;
  - com **uma classe só**, vale a tabela da própria classe, como hoje (o Paladin 1 de 2024 tem 2 espaços).
  - **Pacto (Warlock):** fica separado, pelo nível de Warlock.
  - **Exemplo:** Paladin 4 / Sorcerer 3 de 2024 → 2 + 3 = conjurador 5 → espaços 4/3/2.
- **Magias por classe:**
  - cada classe conjuradora tem o seu atributo, a sua CD, o seu ataque e o seu limite de preparadas;
  - na aba Magias, cada magia mostra a classe dela (ex.: Wizard, com Int; Cleric, com Sab), e o ataque da magia usa a CD daquela classe;
  - **truques:** aumentam pelo nível **total** (regra do livro).
- **Características e recursos:** de cada classe, até o nível **dela** (Fighter 2 dá Action Surge, não Extra Attack).
  - As colunas da tabela (Rages, Focus Points) também seguem o nível de cada classe.

### 2. A ficha
- **Principal → Classe e origem:**
  - uma linha por classe: classe, nível e subclasse;
  - o botão **"+ Classe"**;
  - a primeira classe marcada como "inicial" (é a que dá as salvaguardas e o PV cheio);
  - remover uma classe pede confirmação.
- **Topo:** "Fighter 2 / Wizard 3 · nível 5", e os dados de vida por tipo.
- **Magias:** um quadro de conjuração por classe conjuradora; os espaços são da tabela de multiclasse.
- **Ações → Descanso:** "Gastar dado de vida" com a escolha do dado (d10 ou d6).

### 3. O assistente
- **Criar:** continua com uma classe só, como o Charactermancer do Roll20. A multiclasse entra ao subir de nível.
- **Subir de nível**, na etapa Classe:
  - **"Em qual classe?"**: uma das classes da ficha (sobe nela) ou **uma classe nova** (lista do cadastro);
  - **requisito:**
    - aviso se o personagem não tem o atributo mínimo da classe nova;
    - na regra de 2014, também o da classe atual ("Wizard pede Int 13; Fighter pede For 13 ou Des 13");
    - só avisa, como no resto do assistente;
  - **classe nova:** dá as proficiências de multiclasse (com as escolhas, ex.: 1 perícia do Rogue) e as características do 1º nível dela;
    - não dá salvaguardas nem o equipamento inicial.
  - **escolhas e magias:** as daquela classe, pelo nível dela (ASI no 4º nível **da classe**, subclasse no nível da classe, truques e preparadas da lista dela).
  - **vários níveis de uma vez:** todos na mesma classe; para misturar, sobe de novo escolhendo a outra.

### 4. Mesa
- **Atributos para a mesa:** recalculados como hoje (modificadores, Defesa, Proficiência pelo nível total).
- **Espaços:** as barras usam a tabela de multiclasse.
- **Ações das magias:** cada uma usa a CD e o ataque da classe dela.

## Perguntas para o usuário
1. **Criar já multiclasse no assistente** (ex.: montar direto um Fighter 2 / Wizard 3)?
   - **Só ao subir de nível**, como o Roll20 (recomendo: cada nível com a classe e as escolhas na ordem certa; para chegar no Fighter 2 / Wizard 3, cria o Fighter 2 e sobe 3 vezes escolhendo Wizard, o que dá para fazer numa ida só, "subir 3 níveis em Wizard");
   - ou **também na criação**, com uma lista "níveis por classe".
2. **Requisito de atributo da multiclasse:** só avisar, como as outras regras (recomendo, segue a sua decisão do Plano 51), ou bloquear?

## Decisões do usuário
1. **Multiclasse no assistente:** "Sim, gosto do modelo roll20" → criar com uma classe e multiclassear ao subir de nível.
2. **Requisito de atributo:** "Só avisar."

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/regras5e.js` | proficiência pelo nível total; PV e dados de vida por classe; tabela de espaços de multiclasse (2014/2024); conjuração por classe (atributo, CD, ataque, limites); colunas e características por classe; descanso longo com dados por tipo |
| `js/ficha5e.js` | várias classes em Classe e origem ("+ Classe", inicial, remover); topo com as classes; Magias com um quadro por classe e a classe de cada magia; gastar dado de vida escolhendo o dado |
| `js/assistente5e.js` | subir de nível: "Em qual classe?", classe nova (requisitos, proficiências de multiclasse, 1º nível), escolhas e magias pela classe escolhida |
| `css/ficha5e.css` | linhas de classe, quadros por classe |
| `.claude/testes/regras5e_conf.js`, `ficha5e.js`, `assist5e.js` | casos de multiclasse |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contas** (entrada → resultado esperado):
  - **Fighter 2 / Wizard 3 de 2024, Con 14:**
    - PV 10 + 2 + (6 + 2) + 3 × (4 + 2) = 38;
    - proficiência +3;
    - dados 2d10 + 3d6;
    - espaços 4/2 (conjurador 3);
    - salvaguardas de For e Con (do Fighter).
  - **Paladin 4 / Sorcerer 3 (2024):** conjurador 2 + 3 = 5 → espaços 4/3/2.
  - **Paladin 5 / Ranger 3 (2014):** conjurador 2 + 1 = 3 → espaços 4/2.
  - **Warlock 3 / Sorcerer 2:** espaços de pacto (2 de 2º) e espaços 3 de 1º, separados.
  - **Eldritch Knight (Fighter 7) / Wizard 2:** conjurador 2 + 2 = 4 → espaços 4/3.
  - **Paladin 1 de 2024** (classe só): 2 espaços, pela tabela da classe.
  - **Fire Bolt de um Fighter 4 / Wizard 1:** 2d10 (nível total 5).
  - **Wizard 3 / Cleric 2:** CD de Wizard (Int) e de Cleric (Sab) separadas, e cada magia com a sua.
- **Assistente:**
  - Fighter 2 de 2024 sobe 3 níveis em Wizard;
  - aviso de Int 13 quando a Inteligência é menor;
  - proficiências de multiclasse sem salvaguardas;
  - escolha de truques e magias de Wizard nível 3;
  - ASI no 4º nível de Fighter, não no 4º nível do personagem.
- **Tela:** "+ Classe" à mão, remover, gastar d6 ou d10, quadros de conjuração por classe; sem "null"; sem rolagem lateral.
- **Regressão:** testes do Plano 51, `ficha.js`, `menu.js` e o tutorial; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Contas (`js/regras5e.js`):**
  - **Proficiência:** pelo nível total.
  - **PV:** o dado cheio só no 1º nível da primeira classe; cada classe com o seu dado. O PV rolado agora fica por classe (`classes[i].rolls[nível da classe]`); o antigo `d.hp.rolls` vale para a primeira classe.
  - **Dados de vida:** juntos por tipo ("4d10 + 3d6"). O gasto é por tipo (`d.hp.hdUsedBy`, com `hdUsed` = total). O descanso longo devolve primeiro os dados maiores. Fichas antigas são convertidas sozinhas.
  - **Espaços de magia:**
    - uma classe conjuradora: a tabela dela (Paladin 1 de 2024 = 2);
    - duas ou mais: a tabela de multiclasse pelo nível de conjurador (completo = todos; 1/2 = metade para baixo; Paladin/Ranger de 2024 e Artificer = metade para cima; subclasse 1/3 = terço para baixo);
    - pacto separado.
  - **Conjuração por classe** (`c.casters`): atributo, CD, ataque, truques e preparadas de cada classe, com ajuste manual por classe (`spellDc:Wizard`).
    - A magia guarda a classe (`cls`), e o ataque dela usa a CD e o ataque daquela classe.
    - Na mesa, magia de Warlock gasta espaço de pacto, e a das outras classes, espaço comum.
- **Ficha (`js/ficha5e.js`):**
  - **Classe e origem:** uma linha por classe, com classe, nível, subclasse e dado de vida.
    - A primeira é marcada como "Classe inicial".
    - **"+ Classe"** adiciona uma classe com as proficiências de multiclasse, sem salvaguardas.
    - O **×** tira uma classe (pede confirmação).
  - **Topo:** "Fighter 4 · Champion / Wizard 3 · Evoker · nível 7", e os dados de vida por tipo.
  - **Magias:**
    - um quadro de conjuração por classe;
    - a etiqueta da classe em cada magia, e "Classe que conjura" para trocar;
    - "Magia do cadastro" filtra pelas listas de todas as classes e entrega a magia à classe certa.
  - **Ações → Descanso:** um botão "Gastar d10 / d6" por tipo de dado.
- **Assistente (`js/assistente5e.js`):**
  - **Subir de nível** começa na etapa Classe, com "Em qual classe?": uma das classes da ficha ("Fighter: nível 2 → 4") ou "+ Classe nova (multiclasse)".
  - **A lista de classes novas** mostra o requisito ("pede INT 13").
  - **Requisito:** só avisa ("Multiclasse em Wizard pede INT 13"). Na regra de 2014, avisa também se faltar o requisito da classe atual.
  - **Classe nova:** dá as proficiências de multiclasse (com as escolhas), sem salvaguardas e sem equipamento.
  - **Pelo nível da classe:** características, ASI, talentos, opções, subclasse, PV rolado, truques e preparadas (o ASI do Fighter vem no 4º nível de Fighter).
  - **Magias "já na ficha":** são as daquela classe.
  - **Rodapé:** "Subir de nível: 5 → 7 · Fighter 2 → 4".
  - **Nível atual:** a soma das classes.

**Testado**
- **`regras5e_conf.js`:**
  - Fighter 2 / Wizard 3: PV 38, +3, 2d10 + 3d6, espaços 4/2, salvaguardas do Fighter.
  - Espaços de multiclasse:
    - Paladin 4 / Sorcerer 3 de 2024: conjurador 5, espaços 4/3/2;
    - Paladin 5 / Ranger 3 de 2014: conjurador 3, espaços 4/2;
    - Warlock 3 / Sorcerer 2: pacto 2 de 2º e 3 de 1º;
    - Eldritch Knight 7 / Wizard 2: conjurador 4, espaços 4/3;
    - Paladin 1 de 2024: 2 espaços.
  - Fire Bolt de Fighter 4 / Wizard 1: 2d10.
  - Wizard 3 / Cleric 2: CDs 14 e 13.
  - Dados de vida por tipo e descanso de 2014.
  - Gasto de pacto × espaço comum.
- **`multi5e.js`** (página):
  - **Fighter 2 → Wizard 3 pelo assistente:**
    - aviso de Int 13;
    - Evoker; magias de Wizard 3 (3 truques e 6 preparadas);
    - PV 38, espaços 4/2, CD 10;
    - características pelo nível de cada classe.
  - **Depois Fighter 2 → 4:** Champion, ASI no 4º de Fighter, Con 16, PV 61.
  - **Tela:**
    - duas linhas de classe;
    - gastar d6;
    - Cleric 3 / Wizard 3 à mão: espaços 4/3/3, dois quadros, Fireball de Wizard (CD 13) e Sacred Flame de Cleric (CD 14);
    - tirar a classe;
    - sem "null" e sem rolagem lateral.
- **Regressão:** `ficha5e.js`, `ficha5e_mesa.js`, `assist5e.js`, `assist5e_mesa.js`, `ficha.js`, `menu.js` e o tutorial inteiro sem erros; 0 processos.

**Limites**
- **Criar já multiclasse:** só subindo de nível (decisão do usuário, modelo Roll20).
- **Vários níveis de uma vez:** vão todos para a mesma classe; para misturar, sobe de novo.
- **Tirar uma classe:** não apaga as características e magias que ela deu (a ficha avisa).
- **Regras especiais de multiclasse:** as que só existem no texto, como Extra Attack que não acumula e Unarmored Defense de uma classe só, não viram conta.
