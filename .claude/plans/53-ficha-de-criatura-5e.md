# Plano 53 · Ficha de criatura 5e (bestiário fiel ao livro)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** (com prints do Tarrasque no livro e no Vésper) "Na verdade não está pronto não, olha ficha do tarrasque e olha o nosso sistema, pedi o tempo todo para ser fiel ao roll20, que é a base boa para iniciar, mas o nosso sistema está abstraindo informações que não pode, o tarrasque ficou extremamente fraco com essa visualização".

## Objetivo
Criaturas e NPCs de 5e ganham a **ficha de criatura completa**, no modelo da ficha de NPC do Roll20 e do bloco de estatísticas do livro.
- **Nada do livro se perde.**
- **Tudo o que tem número rola com um clique.**
- **Na mesa:** os ataques e as salvaguardas viram ações automáticas.

O bestiário passa a criar essa ficha, em vez da genérica.

## Como funciona hoje (o problema)
`B.toActor` (`js/bestiary.js`) converte a criatura para a ficha **genérica**. Do Tarrasque, sobra isto:
- **Atributos:** os 6 modificadores (+10, +0, +10, −4, +0, +0) e Defesa 25. Os valores (30, 11, 30…) somem.
- **PV:** só a barra (676, ou um valor rolado). A fórmula vira "Dados de vida" escondido em Configurar.
- **Ações:** **nenhuma**. Mordida +19 (4d12+10), Garra, Chifres, Cauda, Engolir e Presença Aterradora ficam só no texto das notas.
- **Perdidos ou escondidos nas notas:**
  - salvaguardas (Int +5, Sab +9, Car +9);
  - imunidades (fogo, veneno; concussão, perfuração e corte de ataques não mágicos);
  - imunidades a condições;
  - sentidos (visão cega 36 m, Percepção passiva 10);
  - ND 30 (155.000 XP) e proficiência +9;
  - traços (Resistência Lendária 3/dia, Resistência à Magia, Carapaça Refletora, Monstro de Cerco);
  - ações lendárias (3 por rodada: Ataque, Mover, Mastigar).
- **Mesa:** a magia que pede salvaguarda rola só o modificador, sem a proficiência. O Tarrasque salva Sabedoria com +0 em vez de +9.
- **O que já está guardado:** a criatura inteira, em `dados5e`. É só usar.

A ficha 5e do Plano 51 é de **personagem** (classe, nível, perícias por proficiência). Criatura tem outra estrutura (bloco de estatísticas), como o Roll20 separa a ficha de PC da de NPC.

## Proposta

### 1. Ficha de criatura 5e (modo NPC da ficha 5e)
A ficha 5e ganha o **modo criatura** (`a.dnd5e.npc`), como a caixa "NPC" do Roll20. O bloco de estatísticas mostra:

- **Cabeçalho:** nome, tamanho, tipo (e subtipo), tendência.
- **Defesa e vida:**
  - **CA:** com a origem, como "25 (armadura natural)" ou "18 (cota de malha, escudo)".
  - **PV:** "676 (33d20 + 330)", com o botão **Rolar PV**.
  - **Deslocamentos:** caminhando, voo (pairar), natação, escalada, escavação, em metros.
- **Atributos:** os 6 com valor e modificador, como "FOR 30 (+10)"; clicar rola o teste.
- **Linhas do bloco** (só as que a criatura tem), tudo clicável quando tem número:
  - salvaguardas (Int +5, Sab +9, Car +9);
  - perícias (Percepção +5, Furtividade +7);
  - vulnerabilidades, resistências e imunidades a dano, **com as notas** ("de ataques não mágicos");
  - imunidades a condições;
  - sentidos (visão cega 36 m, visão no escuro…) e Percepção passiva;
  - idiomas;
  - **ND** (com XP) e **bônus de proficiência**.
- **Seções**, cada item com nome e texto completo:
  - **Traços**, com usos marcáveis: Resistência Lendária ☐☐☐ (3/dia);
  - **Ações:** os ataques mostram e rolam o acerto (+19), o dano (4d12+10 perfurante) e o alcance (3 m); as que pedem salvaguarda mostram e usam a CD (ex.: Sab CD 17);
  - **Recarga:** "Recarga 5–6" com o botão de rolar a recarga e a marca de "usada";
  - **Ações bônus** e **Reações**;
  - **Ações lendárias:** "3 por rodada", com contador marcável e a lista com o custo de cada uma;
  - **Ações míticas** e **Ações de covil** (quando houver);
  - **Conjuração:** atributo, CD e ataque, magias à vontade / por dia (com usos) / por nível de espaço, e cada magia ligada ao cadastro de Magias (texto e ataque).
- **Editar:** um botão alterna entre **ver** (o bloco do livro) e **editar** (todos os campos), como o Roll20.
  - Dá para criar uma criatura do zero: "Nova ficha → D&D 5e → Criatura".
- **Abas de criatura:** Bloco · Descrição (texto e imagens do bestiário) · Configurar. As abas de personagem (inventário, perícias de classe) não aparecem.

### 2. Bestiário cria a ficha de criatura
`B.toActor` passa a montar a ficha de criatura a partir de `dados5e`, sem perder nada.
- **Textos:** as marcações `{@…}` viram texto limpo; `{@hit 19}`, `{@damage 4d12 + 10}` e `{@dc 17}` viram números e dados.
- **Medidas:** em metros, pela preferência de unidades.
- **Ataques:** cada ataque vira ação com acerto, dano (e o 2º dano, ex.: "+ 3d6 ácido"), alcance e tipo.
  - Salvaguardas com CD, atributo e "metade se passar".
  - "Multiattack" e as ações só de texto ficam como texto.
- **Usos:** Resistência Lendária, as ações lendárias e as magias por dia viram usos marcáveis.
- **PV por token:** "Rolar PV de cada token" continua como hoje.
- **Fichas que já foram criadas pelo bestiário** (campanhas e Meu bestiário): ver a pergunta 2.

### 3. Mesa
- **Campos genéricos** (`stats`, `bars`, `actions`) recalculados a partir do bloco, como na ficha de personagem:
  - **atributos:** os modificadores, Defesa = CA, Proficiência;
  - **barras:** PV;
  - **ações:** cada ataque e cada salvaguarda com dano.
- **Salvaguarda do alvo:** o alvo criatura rola a salvaguarda **dela** (Tarrasque Sab +9), e as que ela não tem usam o modificador.
- **Imunidade e resistência a dano:** ficam à vista no bloco. Aplicar o dano pela metade ou zero fica para outro plano (a mesa ainda não guarda o tipo de dano da ação), ver a pergunta 3.

## Perguntas para o usuário
1. **Visual do bloco:**
   - no tema escuro do Vésper com a estrutura do bloco do livro: título grande, linhas separadoras, "Classe de Armadura 25 (armadura natural)" (recomendo: combina com o resto e fica legível na mesa);
   - ou o visual de pergaminho claro com vermelho, como no seu print.
2. **Fichas já criadas pelo bestiário** (o seu Tarrasque, as do Meu bestiário):
   - **converter sozinhas** para a ficha de criatura ao abrir. Recomendo: elas têm a criatura inteira guardada, então nada se perde; o PV atual e a imagem continuam;
   - ou um botão "Converter para a ficha 5e" em cada uma.
3. **Dano com tipo** (o Tarrasque imune a fogo não levar dano de Fire Bolt): fazer junto, neste plano (a ação passa a guardar o tipo de dano, e a mesa aplica imunidade, resistência e vulnerabilidade), ou num plano logo depois? Recomendo junto: sem isso a imunidade fica só no papel.
4. **Ficha de personagem:** depois deste plano, quer uma revisão campo a campo da ficha de personagem contra a do Roll20, para achar o que mais está faltando? Recomendo; posso listar as diferenças antes de mexer.

## Decisões do usuário
1. **Visual:** "Escuro, eu só mandei um exemplo mesmo."
2. **Fichas antigas do bestiário:** sem resposta direta; segue a recomendação (convertem sozinhas ao abrir, sem perder nada). O usuário pode pedir o botão.
3. **Dano com tipo:** "Vamos fazer junto" → neste plano.
4. **Revisão da ficha de personagem contra o Roll20:** "Sim" → depois deste plano.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/regras5e.js` | modo criatura: contas do bloco (modificadores, proficiência pelo ND, CD e ataque de conjuração), campos da mesa, salvaguarda e perícia da criatura |
| `js/ficha5e.js` | bloco de estatísticas (ver e editar), usos marcáveis, recarga, ações lendárias, conjuração da criatura |
| `js/bestiary.js` | `toActor` monta a ficha de criatura completa a partir do 5etools; conversão das fichas antigas |
| `js/store.js` | (pergunta 3) dano com tipo, e imunidade, resistência e vulnerabilidade |
| `css/ficha5e.css` | estilo do bloco |
| `.claude/testes/` | `criatura5e.js` (novo) e conferência em node de várias criaturas do bestiário |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Tarrasque** (`MM`):
  - CA 25 (armadura natural); PV 676 (33d20 + 330);
  - FOR 30 (+10)…;
  - salvaguardas Int +5, Sab +9, Car +9;
  - imunidades com a nota; imunidades a condições;
  - visão cega 36 m, Percepção passiva 10; ND 30 (155.000 XP), proficiência +9;
  - Resistência Lendária 3/dia;
  - Mordida +19, 4d12+10 perfurante, alcance 3 m;
  - 3 ações lendárias;
  - na mesa: ação Mordida com 1d20+19 e 4d12+10; salvaguarda de Sabedoria +9.
- **Outras criaturas:**
  - **Goblin:** Nimble Escape (ação bônus), Scimitar e Shortbow com alcance longo.
  - **Lich:** conjuração por nível com espaços, Paralyzing Touch com CD, ações lendárias com custo 2 e 3, ações de covil.
  - **Dragão vermelho adulto:** sopro "Recarga 5–6" com CD, Dex, metade se passar, área.
  - **Mago (NPC):** conjuração com magias ligadas ao cadastro.
  - **Uma criatura de 2024** (`XMM`).
- **Conferência em node:** o bestiário inteiro converte sem erro, e nenhum número do bloco some (CA, PV, salvaguardas, perícias, ND, ações com acerto).
- **Tela:**
  - ver e editar;
  - criar do zero;
  - converter uma ficha antiga;
  - sem "null";
  - cabe em 1440 e 800 px e na janela da mesa.
- **Regressão:** testes dos Planos 51–52, `bestiario.js`, `tokenpronto.js`, `ficha.js` e o tutorial; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Ficha de criatura** (`a.dnd5e.npc`, modo NPC da ficha 5e; `js/ficha5e.js` e `js/regras5e.js`):
  - **Topo:** nome, "Gargantuan Monstrosity (Titan), unaligned", ND com XP; CA com a origem, iniciativa (rola), deslocamento, proficiência; PV atual/máximo com PV temporário e **Rolar PV** pela fórmula.
  - **Abas:** Bloco · Descrição (texto do livro e anotações) · Configurar.
  - **Bloco:**
    - CA, PV (fórmula), deslocamento, iniciativa;
    - os 6 atributos com valor (modificador) e a salvaguarda, clicáveis;
    - salvaguardas e perícias clicáveis; vulnerabilidades, resistências e imunidades com as notas; imunidades a condições; sentidos e Percepção passiva; idiomas; equipamento; ND (XP) e proficiência.
  - **Seções:** Traços, Ações, Ações bônus, Reações, Ações lendárias (contador por rodada), Ações míticas, Ações de covil.
    - Cada item tem o texto completo e os números clicáveis: acerto, dano com tipo, CD com o atributo, alcance e distância.
    - "Recarga 5–6" rola 1d6 e marca a ação como usada; os usos (Resistência Lendária 3/dia) ficam marcáveis.
    - O dano com condição ("+1d4 se tiver vantagem", "ou 1d10 com duas mãos") fica à parte, com botão próprio.
  - **Conjuração:** atributo, CD e ataque mágico; grupos (à vontade, X/dia, por nível com espaços marcáveis). Cada magia abre o texto do cadastro de Magias.
  - **Editar o bloco:** todos os campos, com acrescentar e remover traços e ações (tipo, acerto, alcance, dano por tipo, CD, salvaguarda, área, recarga, usos, custo lendário) e a conjuração.
  - **Criar do zero:** Nova ficha de NPC ou criatura → D&D 5e já nasce com o bloco.
- **Bestiário** (`js/bestiary.js`, `B.toNpc`, `B.toNpcActor`):
  - monta o bloco a partir do 5etools, com tudo em metros (Plano 40);
  - tira acerto, dano e tipo, CD e atributo, alcance, distância, área, recarga, usos e custo das marcações `{@…}`;
  - a salvaguarda que é da própria criatura ("the tarrasque must succeed…") não vira ação contra o alvo.
- **Fichas antigas do bestiário:** viram ficha de criatura sozinhas (`B.upgrade`, ids fixos para o mestre e os jogadores darem o mesmo resultado), sem perder nada:
  - **onde:** na campanha (`migrate`), na página Criar ficha, no Meu bestiário e ao importar uma ficha ou cena;
  - **o que continua:** PV atual, imagem, dono, tipo, tamanho, cor, dados de vida e anotações;
  - **ações feitas à mão:** continuam na mesa.
- **Mesa:**
  - cada ataque e cada salvaguarda com dano vira ação;
  - a salvaguarda do alvo criatura usa a dela (Tarrasque Sab +9).
- **Dano com tipo** (`js/store.js`):
  - a ação leva as partes com tipo (`parts: [{ f, type }]`, das fichas 5e de personagem e de criatura);
  - imunidade zera, resistência divide por 2 e vulnerabilidade dobra, pelas defesas do alvo 5e;
  - o chat mostra "fogo: imune", "fogo: resistência", "elétrico: vulnerável";
  - só valem as defesas sem condição: "de ataques não mágicos" fica no texto.

**Testado**
- **`criatura5e_conf.js`** (node, o bestiário inteiro):
  - **conversão:** 5.051 criaturas sem erro; os 7.578 ataques com acerto do livro viraram ataque; 1.703 salvaguardas com dano viraram ação;
  - **Tarrasque:** CA 25 (natural armor), PV 676 (33d20 + 330), salvaguardas 5/9/9, imunidades com a nota, ND 30 (155.000 XP), +9, Resistência Lendária 3/dia, 3 lendárias, Mordida 1d20+19 / 4d12+10 perfurante, alcance 3 m;
  - **Goblin:** arco curto 24/96 m;
  - **Dragão vermelho adulto:** sopro recarga 5, CD 21 Des, metade, cone 18 m, 18d6 fogo;
  - **Lich:** CD 20, +12, espaços por nível, custos 2, 2, 3, Fireball ligada à de 2014;
  - **criatura de 2024:** dano com condição fora da conta;
  - **ficha antiga convertida:** PV 500 mantido, ação feita à mão mantida, ids iguais.
- **`criatura5e.js`** (página):
  - o bloco mostra tudo;
  - rolar Mordida e Salvaguarda de Sabedoria;
  - marcar Resistência Lendária e ação lendária;
  - editar a CA;
  - recarga do dragão;
  - Fireball do Lich abrindo o texto do cadastro e os espaços marcáveis;
  - criatura do zero com ação nova;
  - ficha antiga importada convertida;
  - sem "null" e sem rolagem lateral.
- **`criatura5e_mesa.js`** (mesa):
  - Tarrasque pelo bestiário da mesa;
  - fogo imune (0), elétrico 20, salvaguarda Sab +9, Mordida 1d20+19;
  - personagem 5e com resistência a fogo (20 → 10) e vulnerável a elétrico (20 → 40);
  - ficha antiga importada e `migrate` convertendo.
- **Regressão:** testes dos Planos 51–52, `bestiario.js` e `ficha.js` (atualizados: a criatura agora tem ações), `tokenpronto.js`, `menu.js` e o tutorial inteiro sem erros; 0 processos.

**Limites**
- **Defesas com condição** ("de ataques não mágicos", "prateadas"): ficam no texto e não reduzem o dano sozinhas.
- **Magias da criatura:** abrem o texto do cadastro, mas não viram ação automática na mesa; rola-se pelo ataque mágico e pela CD do bloco.
- **Ações só de texto** (Multiattack, Engolir, Presença Aterradora): ficam como texto.
- **Ações de covil:** o 5etools guarda em outro arquivo, que não está no bestiário importado; a seção existe para preencher à mão.
- **Textos:** em inglês, como no 5etools (tradução depois).
