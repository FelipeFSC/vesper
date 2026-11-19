# Plano 36 · Acompanhar os jogadores (lista no modo Apresentar)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "agora eu quero melhorar alguns pontos de vista do mestre, eu mostrei para um amigo os teleporte, porem eu não consegui acompanhar ele, eu gostaria de ter a opção de ir até o jogador, ou ter a visão de um jogador expecifico, seria interessante na tela de apresentação ver os jogadores listados, cada um com a sua fixa, mandei uma imagem ilustrativa, ai quando clica você pode ir até ou ver como. ai eu consigo acompanhar o grupo."

Print: no modo Apresentar, uma coluna de círculos no canto direito da tela, um por jogador.

## Objetivo
No modo Apresentar, o mestre vê **uma coluna com os jogadores** (o token da ficha de cada um). Clicando num deles: **Ir até** (a tela do mestre vai para a cena e para o token do jogador), **Seguir** (a câmera acompanha o token, inclusive quando ele passa por um portal) ou **Ver como** (a tela fica igual à daquele jogador).

## Como funciona hoje
- "Ver a mesa como" um jogador específico existe só no menu ⋯ (`UI.setViewAs(pid)`), e a cena acompanha a do jogador.
- Não há "ir até" nem "seguir": quando o jogador passa por um portal para outra cena, o mestre precisa achar a cena na lista e o token no mapa.
- As bolinhas de quem está em cada cena ficam só na lista de Cenas (modo Editar).

## Proposta
1. **Coluna de jogadores** no canto direito do mapa, no modo Apresentar (só o mestre vê):
   - um círculo por jogador com a **imagem do token** da ficha dele, a **borda na cor do jogador** e uma bolinha verde se estiver online;
   - com o mouse em cima: nome do jogador, nome do personagem e em que cena ele está;
   - jogador sem token na mesa: o círculo com a inicial, apagado.
2. **Clique no círculo** abre um menu pequeno:
   - **Ir até:** abre a cena do jogador (só na tela do mestre; o grupo não muda) e centraliza no token dele;
   - **Seguir:** igual ao Ir até e depois a câmera continua acompanhando o token (andou, passou pelo portal, mudou de cena: o mestre vai junto). Um aviso no topo "Seguindo Lyra · Parar" e Esc param;
   - **Ver como:** a tela fica igual à do jogador (visão, luz, névoa, som), como o "Ver como" do menu ⋯; "Voltar a ser mestre" volta.
   - Dois cliques no círculo = **Ir até** (atalho).
3. **Jogador com mais de um token** (personagem + animal, por exemplo): o menu lista cada um para escolher.

## Perguntas para o usuário
1. **"Seguir"** entra (recomendo: é o que resolve acompanhar alguém pelos portais) ou só "Ir até" e "Ver como"?
2. **Modo Editar:** a coluna aparece também no modo Editar (recomendo: sim, mas recolhida num botão), ou só no Apresentar?
3. **Ver como:** usar a mesma visão do "Ver como" de hoje (tudo igual à tela do jogador, sem os painéis do mestre)? Recomendo sim.

## Decisões do usuário
1. "Sim, o quero a opção de chegar no jogador e a opção de ver como o jogador." → Ir até, Seguir e Ver como.
2. Modo Editar: "Sim, mas eu quiz dar uma atenção para apresentação também, mas é bom sim." → aberta no Apresentar, recolhida num botão no Editar.
3. Ver como: "você vai ver o que o jogador está vendo, para entender o ponto de vista dele ou testar algo se necessário." → o mesmo "Ver como" de hoje.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | coluna de jogadores (Apresentar), menu do círculo (Ir até, Seguir, Ver como), aviso "Seguindo" |
| `js/board.js` | centralizar num token (`B.focusToken`); seguir: a cada movimento ou troca de cena do token, a câmera vai junto |
| `css/style.css` | coluna e círculos |

## Tutorial, wiki e README
Depois que o usuário finalizar: seção na wiki e passo no tutorial do modo Apresentar.

## Testes
- Coluna com um círculo por jogador (imagem do token, cor, online); tooltip com a cena.
- Ir até: o mestre vai para a cena do jogador e o token fica no meio da tela; o grupo não muda de cena.
- Seguir: o token anda e passa por um portal para outra cena; a câmera do mestre vai junto; Esc para.
- Ver como e voltar. Jogador com dois tokens: o menu lista os dois.
- `walk.js` e a regressão sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Coluna de jogadores** no canto direito do mapa (só o mestre; continua durante o "Ver como"): um círculo por jogador com a imagem do token, a borda na cor do jogador e a bolinha verde de online. Com o mouse em cima: jogador · personagem · cena. No modo Editar fica recolhida num botão.
- Qual token: os do jogador; se ele não tiver nenhum, os do grupo todo (dono "Todos"). Mais de um: o menu lista cada um.
- **Menu do círculo:** Ir até, Seguir, Ver como (ou Voltar a ser mestre). Dois cliques no círculo = Ir até.
  - **Ir até** (`B.focusToken`): a tela do mestre abre a cena do jogador e centraliza no token; o grupo não muda de cena.
  - **Seguir** (`B.startFollow`): a câmera acompanha o token a cada movimento e quando ele muda de cena (procura pela ficha, porque o portal cria um token novo). Barra "Seguindo X · Parar" no topo; Esc para.
  - **Ver como:** o "Ver como" de sempre, já centralizado no token.

**Testado** (`party.js`, foto `party.js#shot`, regressão)
- Editar: recolhida (0 círculos) e abre pelo botão (2). Apresentar: 2 círculos com nome, personagem, cena e online.
- Ir até o Bruno (outra cena): tela na Cripta, token no meio (desvio 0 px), grupo continua na cena dele.
- Seguir a Ana: andou e a câmera foi junto; passou pelo portal e a tela foi para "Andar de baixo" com ela no meio; Esc parou.
- Ver como o Bruno e voltar; dois cliques = Ir até; jogador não vê a coluna.
- `pscene.js` e o tutorial completo sem erros; 0 processos.
