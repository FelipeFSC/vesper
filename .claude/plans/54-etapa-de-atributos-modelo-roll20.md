# Plano 54 · Etapa de atributos do assistente no modelo do Roll20

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** (com 4 prints do Charactermancer do Roll20: Standard, Point Buy, Roll, Manual) "Tem esse stap que eu gostei muito no roll20, gostaria de implementar aqui também na hora de criar uma ficha de jogador."

## Objetivo
A etapa **Atributos** do assistente de personagem (Plano 51, parte B) fica igual à do Roll20. É mais clara para quem está criando e mostra na hora o efeito de cada escolha:
- os 4 métodos em abas no topo;
- um cartão por atributo, com o modificador grande;
- o aumento de atributo da origem ao lado.

## Como funciona hoje
- **Método:** é escolhido na etapa **Regras** (`js/assistente5e.js`, campo "Atributos"), longe dos atributos.
- **Etapa Atributos** (`tabAtributos`): uma tabela simples, com base, bônus, total e modificador.
  - **Conjunto padrão:** um select por atributo.
  - **Compra de pontos:** botões − e + e a conta "Pontos gastos: X de 27".
  - **Rolar:** um botão que rola as 6 de uma vez, e selects para distribuir.
  - **Digitar:** campos de 1 a 30.
- **Aumentos da origem** (antecedente de 2024, espécie de 2014): ficam acima da tabela, em botões.

## Proposta (como nos prints do Roll20)

### 1. Abas de método no topo
**Conjunto padrão · Compra de pontos · Rolar · Digitar**
- O método sai da etapa Regras e passa a ser escolhido aqui.
- Trocar de método guarda o que foi feito em cada um: voltar para "Rolar" mostra as mesmas rolagens.

### 2. Coluna da esquerda
- **Explicação do método**, como no Roll20:
  - **Compra de pontos:** "27 pontos; 14 custa 7; 15 é o máximo antes dos aumentos; nada abaixo de 8".
  - **Rolar:** "4d6, descarta o menor, seis vezes".
- **Compra de pontos:** o contador grande **"27 / 27"** (pontos que sobram), em vermelho quando passar.
- **Rolar:**
  - o quadro **"Rolagens"**, com **Rolar tudo** e **Rolagem 1…6**, cada uma com o botão de rolar;
  - o resultado mostra os 4 dados e o descartado riscado: "6 5 4 ~~2~~ = 15".
- **Aumento da origem**, em seção que abre e fecha, como "Acolyte" no Roll20:
  - o nome do antecedente (2024) ou da espécie (2014), o texto e os selects "Escolha 1 atributo para +2" / "Escolha 2 atributos para +1";
  - ou a alternativa +1/+1/+1, também como no Roll20.

### 3. Cartões dos atributos (à direita, 2 por linha, 6 cartões)
- **Título:** o nome do atributo e o botão **"i"**, que mostra para que serve o atributo e as perícias dele (ex.: Destreza → Acrobacia, Furtividade, Prestidigitação).
- **Escolha no cartão, por método:**
  - **Conjunto padrão:** a fileira **8 · 10 · 12 · 13 · 14 · 15**. Clicar escolhe; um valor usado em outro atributo fica apagado (e clicar nele troca os dois).
  - **Compra de pontos:** o select "8 (0 pontos)" … "15 (9 pontos)".
  - **Rolar:** a fileira com as 6 rolagens ("–" antes de rolar). Cada rolagem vale para um atributo só; clicar numa já usada troca.
  - **Digitar:** o campo de 3 a 18.
- **Escudo do valor:** o **modificador grande**, a sigla (FOR, DES…) e o **valor final** embaixo, já com o aumento da origem.
  - Sem valor escolhido, mostra **"!"** em amarelo, como no Roll20.
  - O aumento aparece no cartão: "13 + 2 = 15".
- **Avisos:** a etapa mostra "!" na barra de etapas enquanto faltar atributo, como hoje. Só avisa; deixa seguir.

### 4. Onde vale
- **Criar personagem** no assistente (página Criar ficha e mesa).
- **Subir de nível:** continua mostrando os atributos atuais e os aumentos dos níveis novos (sem as abas de método).

## Perguntas para o usuário
1. **Rolar de novo:**
   - pode rolar de novo à vontade, como no Roll20, e **na mesa cada rolagem vai para o chat**, para o mestre ver (recomendo: liberdade com transparência);
   - ou cada rolagem só uma vez.
2. **Digitar:** limite de 3 a 18, como no Roll20, só com aviso fora disso (recomendo, segue a regra de só avisar), ou sem limite?

## Decisões do usuário
1. **Rolar de novo:** "Sim". Não vai para o chat: "eu pensei que esse passo só era na hora de criar o personagem". As rolagens ficam só no assistente.
2. **Regras de cálculo** (prints do livro): modificador pela tabela de 1 a 30 e proficiência pela tabela de nível. As duas já valem; o teste confere as tabelas inteiras. Conjunto padrão 8, 10, 12, 13, 14, 15.
3. **Digitar:** "deixa livre para o jogador, eu não quero limitar ninguem" (ex.: o mestre criando um inimigo forte). Sem limite e sem aviso; a dica cita o 3 a 18 do livro.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/assistente5e.js` | etapa Atributos nova (abas de método, coluna da esquerda, cartões); o método sai da etapa Regras; rolagens guardadas com os dados (`st.rolls = [{ dice: [6,5,4,2], total }]`); na mesa, rolagem no chat |
| `css/ficha5e.css` | abas, cartões, escudo do valor, fileiras de valores, quadro de rolagens |
| `.claude/testes/assist5e.js` | os 4 métodos pela tela nova |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Conjunto padrão:**
  - clicar 15 em Int, depois 15 em For: For fica com 15 e Int fica vazio, como no Roll20;
  - todos escolhidos, sem aviso.
- **Compra de pontos:**
  - tudo em 8: 27 / 27;
  - 15/15/15: 0 / 27;
  - 15/15/15/9: −1, aviso em vermelho.
- **Rolar:**
  - rolar uma (4 dados, o menor riscado, total certo);
  - rolar tudo;
  - distribuir;
  - a mesma rolagem não vale para dois atributos;
  - na mesa, as rolagens no chat.
- **Digitar:** 18 → +4; 20 avisa.
- **Aumento da origem:**
  - Sage +2 Int, +1 Con: o cartão de Int mostra 15 + 2 = 17 e +3;
  - a alternativa +1/+1/+1.
- **Botão "i":** mostra a descrição de Destreza.
- **Regressão:**
  - `assist5e.js` (atualizado), `multi5e.js`, `ficha5e.js` e o tutorial;
  - sem "null"; cabe em 1440 e 800 px; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou** (`js/assistente5e.js`, `css/ficha5e.css`)
- **Abas de método:** Conjunto padrão · Compra de pontos · Rolar · Digitar, na própria etapa (o campo saiu da etapa Regras).
  - Cada método guarda o seu estado (`st.std`, `st.pb`, `st.rolls` + `st.rollAssign`, `st.manual`); trocar e voltar não perde nada.
- **Coluna da esquerda:**
  - a explicação do método;
  - **27 / 27** na compra de pontos (pontos sobrando; fica em destaque quando passa);
  - o quadro **Rolagens**, com **Rolar tudo** e **Rolagem 1…6**, cada uma com os 4 dados, o menor riscado e o total;
  - o **aumento da origem** em seção que abre e fecha (nome e texto do antecedente ou da espécie, +2/+1 ou +1/+1/+1 com selects).
- **Cartões** (2 por linha):
  - o botão **i** explica o atributo e lista as perícias dele;
  - **Conjunto padrão:** a fileira 8 · 10 · 12 · 13 · 14 · 15; o valor que está em outro atributo fica apagado, e clicar nele troca os dois;
  - **Compra de pontos:** o select "8 (0 pontos)" … "15 (9 pontos)";
  - **Rolar:** a fileira com as 6 rolagens; a usada em outro atributo também troca;
  - **Digitar:** campo livre, sem limite e sem aviso.
- **Escudo do valor:** o modificador grande, a sigla e o valor final, já com a origem ("14 + 2 = 16"); **!** amarelo sem valor.
- **Avisos:** atributo sem valor (padrão e rolar), rolagens que faltam, compra de pontos acima de 27. Só avisam; dá para seguir.
- **Rolagens:** ficam só no assistente, não vão para o chat (decisão do usuário).
- **Subir de nível:** continua com a tabela dos atributos atuais e dos aumentos dos níveis novos.

**Testado**
- **`atrib5e.js`:**
  - as tabelas do livro: modificador de 1 a 30 e proficiência de 1 a 20;
  - o método fora da etapa Regras;
  - "!" sem valor e o aviso;
  - padrão: 15 em Int, depois em For, troca;
  - Sage +2/+1 no cartão (14 + 2 = 16, +3);
  - botão i;
  - compra de pontos: 27, 0 e −1 com aviso; voltar ao padrão guarda;
  - rolar uma (4 dados, o menor riscado, total certo), rolar tudo, distribuir e trocar;
  - digitar 18 → +4 e 24 → +7 sem aviso;
  - ficha criada com os valores digitados.
- **Regressão:** `assist5e.js` e `multi5e.js` (atualizados para a tela nova), `assist5e_mesa.js`, `ficha5e.js`, `criatura5e.js`, `ficha.js` e o tutorial; 0 processos.
