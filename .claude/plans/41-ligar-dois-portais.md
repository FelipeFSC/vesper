# Plano 41 · Portal: ligar dois portais (sai o "Ida e volta")

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "a opção ida e volta está ruim, não está fácil de configurar, quero tirar então. Vamos adicionar o seguinte caso, o jogador desenha 2 teleporte e ele linka os 2, ele clica para selecionar o teleporte e escolhe a cena, pode ser a mesma, ai depois dele escolher a cena ele clica em qual portal vai linkar, por que hoje a gente coloca ida e volta e obrigatoriamente a volta é um círculo e quando vai desenhar a volta na verdade cria um novo e nem linka com o antigo, não gostei, prefiro o meu modelo novo"

## Como funciona hoje
- Painel do portal: "Leva para" (cena), "Desenhar a chegada" e a caixa **Ida e volta**, que **cria sozinha** um portal de volta no destino (um círculo de 1 quadrado, ou a forma da chegada desenhada).
- Escolher outra cena já liga a ida e volta sozinho.
- Problemas: a volta nasce com forma e lugar que o mestre não escolheu; desenhar outro portal no destino cria um portal solto, sem ligação com o primeiro.

## Proposta
1. **Sai o "Ida e volta"** (caixa, item do menu do botão direito e a criação automática da volta).
2. **Ligar a um portal**: o mestre desenha os dois portais do jeito que quiser (cada um com a sua forma). No painel de um deles:
   - **Leva para:** escolhe a cena (pode ser a mesma);
   - botão **"Ligar a um portal"**: a tela vai para a cena escolhida (se for outra), os portais de lá ficam destacados e o mestre **clica em qual** vai ligar. Esc cancela e a tela volta.
   - ligados, quem pisa num chega num quadrado livre sorteado **dentro do outro**, e vice-versa (ver pergunta 1).
   - o painel mostra "Ligado a: Escada de baixo (Cripta)" com **Ir até o outro** e **Desligar a ligação**.
3. **Chegada sem portal** continua: "Desenhar a chegada" (uma área onde se chega, sem volta), para armadilhas e o trem que só anda para frente (ver pergunta 2).
4. **Apagar** um portal ligado: o outro fica sem ligação (continua levando para onde o apagado estava).
5. **Portais antigos** com ida e volta já estão ligados entre si: continuam funcionando, agora como dois portais ligados.
6. **Marcador para os jogadores:** cada portal tem o seu (ícone, cor, nome), sem copiar para o outro.

## Perguntas para o usuário
1. **Ligar A com B** faz **B levar para A também** (recomendo: um clique liga os dois; quem quiser só ida desliga o B, que continua recebendo quem chega), ou liga só A → B e o B se configura à parte?
2. **"Desenhar a chegada"** (chegar numa área sem portal) continua como segunda opção (recomendo, serve para armadilha e caminho sem volta), ou tudo passa a ser só portal ligado a portal?
3. **Ligar a um portal que já estava ligado a um terceiro:** a ligação antiga se desfaz (recomendo), ou não deixa e avisa?

## Decisões do usuário
1. "Depende, pode ser um caminho só de ida também, mas ainda vai ter o ida e volta, fica na configuração" → ligar A com B já liga os dois (ida e volta); no painel, a caixa **Ida e volta** desmarcada deixa só ida (o outro portal só recebe quem chega).
2. "Não, o mestre vai desenhar os 2 pontos e linkar, da forma que foi feito eu não gostei e não quero mais." → sai o "Desenhar a chegada"; portal sem ligação não leva a lugar nenhum. (Itens 3 e 4 da proposta mudam: apagar um portal deixa o outro sem ligação.)
3. "Pergunta se quer desfazer o link anterior." → ligar a um portal já ligado a outro pergunta; "não" cancela.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/triggers.js` | `connectPortals(a, b)` e `disconnectPortal`; sai a criação automática da volta (`linkPortal`); `setPortalDest` não liga sozinho |
| `js/board.js` | modo "escolher um portal" na cena de destino (destaque, clique, Esc, volta a tela) |
| `js/ui.js` | painel do portal: "Ligar a um portal", "Ligado a", Ir até, Desligar; sai a caixa Ida e volta |
| `js/ctxmenu.js` | sai "Ida e volta" do botão direito; entra "Ligar a um portal" |
| `js/store.js` | ao apagar um portal, o ligado a ele perde a ligação |

## Testes
- Dois portais na mesma cena: ligar pelo clique; token pisa em A e chega dentro de B, e de B volta para A.
- Portais em cenas diferentes: a tela vai para a outra cena, clica no portal, volta; ida e volta funcionando.
- Esc cancela; clicar fora de um portal não liga; um portal não liga com ele mesmo.
- Desligar, religar a um terceiro, apagar um dos dois.
- Portal antigo com ida e volta continua ligado.
- `portal.js`, `portal2.js`, `party.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- Painel do portal, seção **Ligado a**: o portal ligado (nome e cena), **Ir até o outro portal**, **Desfazer a ligação** e a caixa **Ida e volta**. Embaixo, **Cena do outro portal** (escolher já entra no modo de clicar) e **Ligar a um portal** / **Ligar a outro portal**.
- Modo de escolher (`B.pickPortal`): em outra cena a tela vai até ela e volta; clique fora de um portal ou no próprio portal não liga; Esc cancela. Cena sem outro portal: aviso "Desenhe o outro portal lá primeiro".
- `T.connectPortals`, `T.disconnectPortal`, `T.setTwoWay`, `T.portalTwoWay` (`js/triggers.js`); saíram `linkPortal`, `unlinkPortal`, `setPortalDest` e `setPortalArea`.
- Portal sem ligação não leva a lugar nenhum. Apagar um portal deixa sem ligação os que levavam para ele (`trigger.delete`).
- Cada portal tem o seu marcador para os jogadores (não copia para o outro); o brilho também é de cada um.
- Botão direito: "Ligar a um portal" no lugar do "Ida e volta".
- Portais antigos: os pares de ida e volta continuam ligados; a chegada antiga desenhada (área ou ponto) continua funcionando, com o aviso "Chegada antiga… Ligue a um portal para trocar".

**Testado** (`portal3.js`, foto `portal3.js#shot`, `portal.js` e `portal2.js` ajustados, regressão)
- Sem ligação: não leva. Ligar pelo clique (fora e o próprio não ligam); 8 passagens dentro do outro, sorteadas; volta pelo outro.
- Só ida: o outro fica sem levar; marcar de novo volta a ida e volta.
- Outra cena: sem portal lá avisa; com portal, a tela vai, Esc cancela e volta; clicar liga; descer e subir funcionando.
- Religar: pergunta; "não" mantém, "sim" desfaz as ligações anteriores dos dois lados.
- Desfazer pelo painel; apagar um deixa o outro sem ligação; menu do botão direito; par antigo continua ligado.
- `party`, `trig`, `trig_ux`, `ctxmenu` e o tutorial completo sem erros; 0 processos.
