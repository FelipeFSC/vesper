# Plano 51 · Ficha de D&D 5e e criação pelos cadastros

**Status:** Implementado: partes A e B (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:**
- "Pode fazer, quero ver como vai ficar" (a ficha usando os cadastros).
- Nas respostas:
  - "do 1 ao 20, assim como o roll20 funciona";
  - "Eu acho bom fazer igual ou semelhante ao roll20, essa é a minha maior referencia, eu percebi que a primeira versão de ficha que você criou ignora muitos dados, e eu não gostei, quero a ficha do jeito que ela deveria ser";
  - "Só avisar, mas se seguir pode".

## Objetivo
A Vésper ganha uma **ficha de D&D 5e completa**, no modelo da ficha do Roll20.
- **Guarda os valores de verdade:**
  - os valores dos atributos e os modificadores calculados;
  - salvaguardas, perícias e proficiências;
  - PV, PV temporários, dados de vida e testes contra a morte;
  - ataques, magias por nível com espaços, recursos, características, equipamento com moedas, e personalidade.
- **Criação e nível pelo assistente:** a ficha nasce dos cadastros, do nível 1 ao 20, e sobe de nível pelo mesmo assistente, como o Charactermancer do Roll20.
- **Funciona na mesa:** atacar um token, gastar PV e usar a iniciativa funcionam como numa ficha comum.

## Como funciona hoje
- **Ficha da Vésper** (`js/ficha.js` na página Criar ficha; `js/ui.js` na janela da mesa):
  - é genérica: `stats` (atributos com um número), `bars` (PV, Mana), `actions` (Ataque, Resistência, Dano, Cura, Só rolar) e `notes`;
  - abas na mesa: Ações · Atributos · Notas · Configurar.
- **Bestiário:**
  - converte a criatura para esse formato genérico, guardando o modificador no atributo e a CA na Defesa;
  - o resto vai para as notas, e a criatura inteira fica em `dados5e`.
  - **É disso que o usuário não gostou:** a ficha que se vê perde a maior parte dos dados.
- **Cadastros** (Planos 42–50): os 9 cadastros completos; ninguém lê deles ainda.

## Proposta

### 1. Ficha 5e: um tipo novo de ficha
- **Marcação:** a ficha ganha `sistema: '5e'` e os dados completos em `a.dnd5e`.
- **Fichas antigas:** continuam genéricas, como hoje.
- **Mesmo desenho nos dois lugares:** a página Criar ficha e a janela da mesa desenham a ficha 5e pelo mesmo módulo novo (`js/ficha5e.js`), com o mesmo visual.
- **Os campos genéricos continuam existindo** (`stats`, `bars`, `actions`). São calculados a partir de `dnd5e` a cada mudança, para a mesa funcionar sem mudar o combate:
  - **atributos:** Força… Carisma (modificador), Defesa (CA), Proficiência;
  - **barras:** PV (com o máximo), e os espaços de magia por nível;
  - **ações:** os ataques e as magias.
  - Quem manda é a ficha 5e. Na mesa, levar dano muda os PV da ficha 5e, e o contrário também vale.

### 2. Como a ficha é organizada (modelo Roll20)
**Topo fixo:**
- retrato, nome, classe e nível ("Wizard 5 · Evoker"), espécie, antecedente;
- PV atual / máximo e PV temporários;
- CA, iniciativa, deslocamento, bônus de proficiência;
- inspiração (2014) ou Inspiração Heroica (2024).

**Abas:**
1. **Principal:**
   - **atributos:** os 6 com valor e modificador, salvaguarda ao lado (bolinha de proficiência);
   - **perícias:** as 18, com bolinha de proficiência ou especialização, o atributo e o total;
   - **valores passivos:** Percepção, Intuição e Investigação;
   - **dados de vida** (gastos / total), **testes contra a morte** (3 sucessos, 3 falhas), **exaustão** e condições;
   - **proficiências e idiomas:** armaduras, armas, ferramentas, idiomas.
2. **Ações:**
   - **ataques:** nome, bônus de ataque, dano e tipo, alcance, propriedades;
   - **recursos com usos:** Rage 3/3, Channel Divinity 2/2, Second Wind; cada um com a recarga (descanso curto ou longo);
   - os botões **Descanso curto** e **Descanso longo**, que recuperam o que cada regra manda.
3. **Magias:**
   - atributo de conjuração, CD e ataque mágico;
   - as magias separadas por nível, com os espaços marcáveis (gastos / total) e os espaços de pacto do Warlock;
   - em cada magia: preparada ou não, sempre preparada (com a origem, "Light Domain"), concentração, ritual, tempo, alcance, componentes, e o texto ao abrir;
   - as de ataque ou resistência têm o botão de rolar, ajustado ao nível do personagem e ao nível do espaço usado.
4. **Inventário:**
   - os itens com quantidade e peso (em kg), vestido ou empunhado, e sintonizado (até 3);
   - as moedas (PC, PP, PE, PO, PL);
   - o total de carga e o limite (Força × 7,5 kg).
5. **Características:**
   - as características de classe, subclasse, espécie e antecedente, com nível e texto;
   - os talentos;
   - as opções de classe (invocações, manobras);
   - cada uma aponta para o cadastro de onde veio.
6. **Biografia:**
   - aparência, personalidade, ideais, vínculos e defeitos (as tabelas do antecedente sugerem);
   - tendência, idade, altura e peso;
   - história e anotações livres.
7. **Configurar:** o que já existe hoje (tipo, dono, tamanho do token, cor, altura, muro baixo, imagem no tabuleiro).

**O que se clica:** atributo, salvaguarda, perícia, iniciativa, ataque e dano rolam o dado. Na página Criar ficha vão para o quadro Rolagens; na mesa, para o chat.

### 3. Cálculo automático, com ajuste manual
- Os números saem das escolhas e dos cadastros:
  - modificadores, proficiência, salvaguardas, perícias e passivos;
  - PV, CA e iniciativa;
  - ataques e CD;
  - espaços, usos de recursos e carga.
- **Ajuste manual:** todo valor calculado aceita um número digitado ou um bônus extra ("+1 de um anel"), como no Roll20. O campo ajustado fica marcado e tem "Voltar ao calculado".
- **As contas:**
  - **modificador:** (valor − 10) ÷ 2, arredondado para baixo; 15 → +2;
  - **proficiência:** pela tabela da classe;
  - **PV:**
    - o dado cheio no nível 1, e a média arredondada para cima nos níveis seguintes, + Con por nível;
    - o bônus da espécie e dos talentos (Dwarven Toughness, Tough);
    - "Rolar PV" fica como opção;
  - **CA:**
    - a armadura vestida + Des, com o limite (média até 2, pesada sem Des), + escudo;
    - sem armadura: 10 + Des, ou a Defesa sem armadura do Barbarian (+Con) e do Monk (+Sab);
  - **ataque com arma:**
    - 1d20 + atributo + proficiência (se for proficiente);
    - o atributo é Força, Destreza nas armas à distância, e o maior dos dois com Finesse;
    - o dano é o da arma + atributo;
  - **magia:** a CD é 8 + atributo + proficiência; o ataque mágico é atributo + proficiência; os truques aumentam nos níveis 5, 11 e 17.

### 4. Assistente: criar e subir de nível (modelo Charactermancer)
- **Onde fica:**
  - em **Criar ficha**, um botão abre o assistente; na mesa também, pela lista de fichas;
  - numa ficha 5e, o botão **Subir de nível** abre o mesmo assistente, com as escolhas já feitas.
- **Abas**, visitadas em qualquer ordem, cada uma com o aviso do que falta:
  1. **Regras:** edição 2014/2024, nível de 1 a 20, método dos atributos.
  2. **Classe:**
     - a classe, com o resumo ao lado (dado de vida, proficiências);
     - a subclasse, no nível em que a classe a dá.
  3. **Espécie:** a espécie e a opção (sub-raça, linhagem), mais as escolhas dela.
  4. **Antecedente:** o talento de origem e os bônus de atributo em 2024; as perícias e os idiomas em 2014.
  5. **Atributos:**
     - compra de pontos (27), conjunto padrão, 4d6 descartando o menor, ou digitar;
     - os bônus aparecem com a origem.
  6. **Escolhas:** tudo o que é escolha até o nível, organizado por nível:
     - perícias, especializações e idiomas;
     - talentos ou aumento de atributo;
     - opções de classe;
     - estilos de luta.
  7. **Magias:**
     - truques e magias no limite da tabela;
     - as sempre preparadas aparecem marcadas.
  8. **Equipamento:** o pacote A/B da classe e do antecedente, ou o ouro; itens extras do cadastro.
  9. **Resumo:** a prévia da ficha e **Criar ficha** (ou **Aplicar** ao subir de nível).
- **Validação:** só avisa. Se faltar algo ou estiver fora da regra, o Resumo lista os avisos e deixa criar mesmo assim.
- **Ao subir de nível:**
  - o assistente mostra só o que o nível novo pede (PV, características novas, escolhas);
  - o que foi digitado na ficha (PV atual, itens, moedas, biografia) não se perde.

### 5. Bestiário
Fica como está, com a ficha genérica. Transformar as criaturas na ficha completa de monstro do Roll20 é um plano próprio.

## Perguntas para o usuário
1. **Multiclasse** (o Roll20 tem):
   - entra neste plano, no assistente de subir de nível ("subir em qual classe?"), com os requisitos de atributo e a tabela de espaços de multiclasse;
   - ou fica para um plano logo depois (recomendo: este plano já é grande, e a ficha guarda as classes numa lista desde o começo, então a multiclasse entra sem refazer nada).
2. **Ordem de entrega:** são duas partes grandes. Recomendo entregar em duas etapas, cada uma testada por você:
   - **(a)** a ficha 5e completa: abas, contas, ajustes manuais, rolagens, mesa; dá para preencher à mão;
   - **(b)** o assistente de criar e subir de nível.

   Ou tudo de uma vez?
3. **Ficha genérica:** continua existindo para outros sistemas (recomendo). Então "Nova ficha" pergunta "Genérica ou D&D 5e"?

## Decisões do usuário
1. **Nível inicial:** "do 1 ao 20, assim como o roll20 funciona".
2. **Atributos e ficha:** "fazer igual ou semelhante ao roll20 … quero a ficha do jeito que ela deveria ser" → ficha 5e própria e completa, com o valor do atributo e o modificador calculado.
3. **Validação:** "Só avisar, mas se seguir pode".
4. **Multiclasse:** "vamos por parte" → entra num plano logo depois deste; a ficha já guarda as classes numa lista.
5. **Entrega:** primeiro a parte A (a ficha 5e), depois a parte B (o assistente de criar e subir de nível): "gosto da opção B então, tudo bem, eu concordo".
6. **Ficha genérica:** continua existindo; "Nova ficha" pergunta "Genérica ou D&D 5e".

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/regras5e.js` (novo) | as contas: modificador, proficiência, perícias, PV, CA, ataques, CD, espaços, carga, descansos; gera `stats`/`bars`/`actions` a partir de `dnd5e` |
| `js/ficha5e.js` (novo) | o desenho da ficha 5e (topo, 7 abas), usado na página e na mesa |
| `js/assistente5e.js` (novo) | o assistente de criar e subir de nível |
| `js/cadastros.js` | a leitura dos registros (padrões + locais) sem desenhar a página, para a ficha usar |
| `ficha.html`, `js/ficha.js` | "Nova ficha": genérica ou D&D 5e; abre `ficha5e` quando `sistema === '5e'` |
| `js/ui.js` | a janela da ficha na mesa usa `ficha5e` para fichas 5e; rolagens vão para o chat |
| `js/store.js` | `migrate()` e permissões para `dnd5e`; uma mudança na ficha 5e recalcula os campos genéricos |
| `index.html` | carregar os scripts novos e os cadastros |
| `css/ficha.css`, `css/style.css` | estilos da ficha 5e e do assistente |
| `.claude/testes/ficha5e.js` (novo) | teste das contas, da ficha e do assistente |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
**Contas:** casos para conferir (entrada → resultado esperado).
- **Wizard 2024, nível 1, Int 15, Con 14:**
  - PV 8;
  - CD 12; ataque mágico +4;
  - 3 truques e 4 magias preparadas.
- **Fighter 2024, nível 5, For 16, Con 14, Chain Mail, Longsword:**
  - PV 44 (10 + 2 + 4 × (6 + 2));
  - CA 16;
  - ataque +6, dano 1d8+3.
- **Rogue 2024, nível 3, Des 16, Leather Armor, Rapier:**
  - CA 14;
  - ataque +5;
  - Furtividade com especialização +7.
- **Barbarian sem armadura, Des 14, Con 16:** CA 15.
- **Hill Dwarf 2014, Cleric nível 3, Con 14:** PV 27.
- **Fire Bolt no nível 5:** 2d10.
- **Light Domain 2024 no nível 3:** 4 magias sempre preparadas.
- **Ajuste manual:** CA com +1 vira 17; "Voltar ao calculado" volta para 16.
- **Descansos:**
  - o longo recupera PV, espaços e metade dos dados de vida;
  - o curto recupera Second Wind e os espaços de pacto.

**Tela**
- Criar um personagem de cada edição e subir um deles de nível (3 → 4 com talento).
- A ficha 5e na página e na mesa:
  - rolar uma perícia e um ataque;
  - atacar um token e ver os PV caírem na ficha 5e.
- Exportar e importar uma ficha 5e.
- Nada de "null" na tela; cabe em 1440 e 800 px.

**Regressão**
- As fichas genéricas e o bestiário continuam iguais.
- `ficha.js`, `cadastros.js`, `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
### Parte A · A ficha 5e
**Parte A implementada; aguardando os testes do usuário.**

**O que entrou**
- **Arquivos novos:**
  - `js/regras5e.js`: as contas;
  - `js/ficha5e.js`: o desenho da ficha, o mesmo na página e na mesa;
  - `js/dados5e.js`: lê os cadastros (padrões + mudanças do navegador) só quando a ficha precisa deles;
  - `css/ficha5e.css`.
- **Ficha nova:** "Nova ficha", na página e na mesa, pergunta Genérica ou D&D 5e. A ficha 5e tem `sistema: '5e'` e os dados em `a.dnd5e`.
- **Topo:**
  - retrato, nome, classe e nível, espécie e antecedente;
  - CA, iniciativa (rola), deslocamento, proficiência;
  - PV atual e máximo: aceita +5, -7 ou -2d6, e o dano gasta primeiro o PV temporário;
  - PV temporário, dados de vida, inspiração.
- **Principal:**
  - **Classe e origem:**
    - classe do cadastro: dado de vida, salvaguardas, proficiências fixas, tabela de espaços;
    - nível 1–20 e subclasse;
    - espécie, com sub-raça ou linhagem: deslocamento, tamanho, sentidos, resistências, perícias fixas;
    - antecedente, com as perícias fixas;
    - tendência, XP, tamanho, PV extra por nível, CA sem armadura, deslocamentos.
  - **"Trazer as características até o nível N":** da classe, da subclasse, da espécie e do antecedente, sem repetir.
  - **Atributos:** valor e modificador; clicar rola. Ao lado, as salvaguardas.
  - **As 18 perícias:** cada uma vai de proficiente a especialista; e a opção Pau para toda obra.
  - **Também na aba:** passivos e sentidos; testes contra a morte, exaustão e condições; proficiências, idiomas e defesas.
- **Ações:**
  - **Ataques:**
    - de onde vêm: do cadastro, em branco, das armas do inventário e das magias;
    - rolam ataque e dano;
    - versátil, crítico, salvaguarda com CD;
    - botão de usar na mesa.
  - **Recursos:** atual e máximo, e se recuperam no descanso curto ou no longo. "Da tabela da classe" sugere Rages, Second Wind…
  - **Descanso:**
    - gastar dado de vida;
    - descanso curto e longo; no longo, a regra de 2014 devolve metade dos dados de vida e a de 2024, todos.
- **Magias:**
  - **Conjuração:** atributo, CD, ataque mágico; truques e preparadas contra o limite da classe.
  - **Lista por nível:**
    - espaços marcáveis, inclusive os de pacto;
    - preparada, ou sempre preparada com a origem;
    - concentração, ritual e o texto.
  - **Ataque automático:** magia com ataque, salvaguarda ou cura cria o ataque em Ações. O truque aumenta com o nível: Fire Bolt no 5 → 2d10.
- **Inventário:**
  - moedas;
  - itens do cadastro ou livres, com quantidade e peso em kg;
  - vestido: só uma armadura e um escudo;
  - sintonia até 3;
  - carga contra Força × 7,5 kg.

  Arma cria o ataque; armadura e escudo vestidos contam na CA.
- **Características e talentos:**
  - por origem: Classe, Subclasse, Espécie, Antecedente, Talento, Outro;
  - editáveis;
  - talentos do cadastro e o do antecedente.
- **Biografia:**
  - aparência;
  - personalidade, ideais, vínculos e defeitos, com as tabelas do antecedente de 2014 como sugestão;
  - história, aliados e anotações.
- **Ajuste manual:** aceitam valor fixo ou bônus, com "Voltar ao calculado":
  - CA, iniciativa, deslocamento, proficiência, PV máximo;
  - passivos;
  - CD, ataque mágico e espaços;
  - carga.
- **Mesa:**
  - **Janela:** a da ficha (720 px) usa o mesmo desenho, e as rolagens vão para o chat.
  - **Campos genéricos**, recalculados a cada mudança:
    - **atributos:** os seis com o modificador, Defesa = CA, Proficiência, Iniciativa e Percepção passiva;
    - **barras:** PV e Espaços 1º…9º ou de pacto;
    - **ações:** os ataques; as magias gastam um espaço do nível delas.
  - **Combate:** funciona sem mudança. Na salvaguarda, o alvo 5e usa a dele, com a proficiência (`App.Regras5e.saveFor` em `Store.useAction`).
  - **PV e espaços atuais:** ficam nas barras, porque a mesa gasta e cura por elas. Quando o máximo sobe (nível, Con), o atual ganha a diferença.

**Testado**
- **`regras5e_conf.js`** (node, com os cadastros):
  - Wizard 1: PV 8, CD 12, ataque +4, 3 truques e 4 preparadas.
  - Fighter 5:
    - PV 44, CA 16;
    - Longsword +6, 1d8+3 (1d10+3 com as duas mãos);
    - ajuste da CA: +1 dá 17, fixa dá 20, e volta a 16.
  - Rogue 3: CA 14, Rapier +5, Furtividade +7, Pau para toda obra.
  - CA sem armadura: Barbarian 15 (17 com escudo), Monk 15.
  - Cleric anão da colina 3: PV 27.
  - Magias: Fire Bolt 2d10 no nível 5; Fireball CD 14, com área e gastando Espaços 3º; Cure Wounds 2d8+3.
  - Conjuradores especiais: Warlock 5 com 2 espaços de pacto de 3º; Eldritch Knight 7 com INT e espaços 4/2.
  - Descansos, PV ao subir de nível, salvaguarda para o combate.
- **`ficha5e.js`** (página):
  - criar a ficha;
  - classe, subclasse, espécie e antecedente pelos cadastros;
  - perícias; características sem repetir;
  - inventário e CA; ajuste e voltar;
  - ataque e rolagem; arma +1;
  - recursos, PV temporário, dado de vida, descansos;
  - magias e espaços; remover a magia remove o ataque;
  - talento e biografia;
  - exportar e importar;
  - a ficha genérica continua igual;
  - sem "null" na tela e sem rolagem lateral.
- **`ficha5e_mesa.js`** (mesa):
  - a pergunta do tipo de ficha;
  - a janela 5e;
  - editar recalcula;
  - a perícia rolada vai para o chat;
  - o botão de usar;
  - a salvaguarda do alvo 5e com +5;
  - o dano cai no PV da ficha;
  - o ataque da ficha 5e;
  - Configurar sem as barras genéricas;
  - exportar.
- **Regressão:** `ficha.js`, `ficha_mesa.js`, `cover.js`, `menu.js` e o tutorial inteiro (`walk.js`) sem erros; 0 processos.

**Limites**
- **Multiclasse:** uma classe só por enquanto; entra no próximo plano.
- **Escolhas dos cadastros:** a ficha aplica só o que é fixo (perícias, proficiências, sentidos, resistências).
  - As escolhas ficam para quem preenche agora e para o assistente da parte B: perícias à escolha, bônus de atributo da origem, magias da espécie.
- **Proficiência com a arma:** é marcada à mão no ataque; a ficha não confere a lista de proficiências.
- **Itens mágicos:** os bônus se digitam no ataque ou na armadura; o efeito descrito no texto não vira número.
- **Magia em espaço maior:** na mesa, a magia usa o espaço do nível dela; o dano a mais se rola à mão.
- **Bestiário:** continua com a ficha genérica.

### Parte B · O assistente
**Parte B implementada; aguardando os testes do usuário.**

**O que entrou**
- **Arquivo novo:** `js/assistente5e.js` (`App.Assist5e.open({ actor, onDone })`), com o visual em `css/ficha5e.css`.
- **Onde abre:**
  - "Nova ficha" (página e mesa) ganhou a terceira opção, **D&D 5e passo a passo**;
  - na ficha 5e, o topo mostra **Subir de nível**, ou **Criar pelo assistente** quando a ficha ainda não tem classe.
- **Etapas:** Regras · Classe · Espécie · Antecedente · Atributos · Escolhas · Magias · Equipamento · Resumo.
  - Cada etapa tem um aviso do que falta.
  - Validação só avisa: "Criar ficha" pede confirmação e cria mesmo com avisos.
- **Regras:** nome, edição, nível de 1 a 20, método dos atributos, PV pela média ou rolado.
  - No PV rolado, cada nível pode ser digitado, ou o botão "Rolar os que faltam" preenche (`d.hp.rolls` em `Regras5e.calc`).
- **Classe:** lista com busca e o detalhe ao lado: dado de vida, salvaguardas, proficiências, características até o nível, subclasses (as de 2014 marcadas).
- **Espécie:**
  - sub-raça ou linhagem;
  - tamanho quando há dois;
  - traços.
- **Antecedente:** perícias, talento, atributos e a característica.
- **Atributos:**
  - conjunto padrão, compra de pontos (27, de 8 a 15, com o custo), 4d6 descartando o menor, ou digitar;
  - os aumentos da origem (+2/+1 ou +1/+1/+1 do antecedente de 2024, os fixos da espécie de 2014);
  - a tabela base, bônus, total e modificador.
- **Escolhas** por nível, saídas dos cadastros:
  - perícias e proficiências à escolha (da classe, da espécie, do antecedente e dos talentos);
  - idiomas e ferramentas "à escolha";
  - especialização (Expertise do Rogue e do Bard, talentos);
  - aumento de atributo ou talento em cada nível de ASI;
  - talentos da classe (Fighting Style, Epic Boon) e de origem (Human 2024);
  - opções de classe por nível (invocações, manobras, estilos de 2014);
  - magias à escolha dos talentos e da espécie (Magic Initiate, linhagens).
  - O talento escolhido traz as escolhas dele.
  - A lista do Magic Initiate vem do antecedente ("Wizard"), e a do elfo, da linhagem.
- **Magias:**
  - truques e preparadas (ou conhecidas) da lista da classe, com busca, contra o limite do nível;
  - nível máximo pelos espaços;
  - as sempre preparadas da subclasse e da espécie aparecem marcadas.
- **Equipamento:**
  - os pacotes A ou B da classe e do antecedente, com ouro;
  - os itens "à escolha" (arma marcial ou simples, jogo, instrumento, ferramenta de artesão, foco) viram uma lista do cadastro de Itens;
  - as armas criam o ataque.
- **Resumo:** classe, espécie, antecedente, PV, CA, proficiência, iniciativa, CD, atributos, perícias, talentos, magias, equipamento; e o que falta, com link para a etapa.
- **Subir de nível:**
  - mostra só o que os níveis novos pedem;
  - aplica por cima da ficha: PV atual (ganha a diferença), itens, moedas, biografia e o resto ficam;
  - o Resumo lista o que é novo.
- **PV extra por nível:** pelo texto do traço e do talento (Dwarven Toughness +1; Tough +2 nas duas edições).

**Testado**
- **`assist5e.js`** (página):
  - **Wizard 5 de 2024**, High Elf Lineage, Sage, conjunto padrão:
    - Int 17 com a origem, 19 com o ASI;
    - perícias; a lista do Magic Initiate sem perguntar;
    - magias da linhagem e do talento; 4 truques e 9 preparadas;
    - pacotes A;
    - sem avisos;
    - ficha com PV 32 cheio, características, itens e ouro.
  - **Subir para o 6:** só as magias pedem escolha; PV 38, e o atual 20 vira 26; itens mantidos.
  - **Fighter 4 de 2014**, Hill Dwarf, Soldier, compra de pontos:
    - estilo de luta (Defense), Tough no 4, Champion;
    - ferramenta, jogo, arma marcial escolhida no pacote;
    - PV 52 (Con 16, +3 por nível), CA 18;
    - sem avisos.
  - Sem "null" em nenhuma etapa.
- **`assist5e_mesa.js`** (mesa):
  - criar pelo assistente na mesa;
  - subir de nível pela janela da ficha (Champion no 3).
- **Regressão:** `ficha5e.js`, `ficha5e_mesa.js`, `regras5e_conf.js`, `ficha.js`, `menu.js` e o tutorial inteiro sem erros; 0 processos.

**Limites da parte B**
- **Multiclasse:** fica para o próximo plano, como combinado.
- **Pré-requisitos:** dos talentos, só nível e atributo viram aviso; os das opções de classe ficam no texto.
- **Escolhas sem estrutura no cadastro:** o que só existe no texto não vira escolha (ex.: "troque um truque por outro").
- **Subir de nível não desfaz:** trocar a subclasse ou uma escolha antiga se faz à mão na ficha.
