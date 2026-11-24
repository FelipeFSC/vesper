# Plano 70 · Resultado depois do dado

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Testei, o efeito é bonito, mas o dano sai primeiro que o resultado do dado, ai não, precisa sair o numero primeiro e depois mostrar o resultado, entende ?"

## Objetivo
O dado rola e para mostrando o número. Só depois aparecem o resultado no chat, o dano ou a cura no mapa e a barra de vida mudando. Isso muda a resposta 2 do Plano 69, que era "o resultado aparece na hora".

## Como funciona hoje
- O mestre resolve tudo de uma vez (`Store.useAction` e `Store.rollPost`): sorteia, muda as barras (`bar.change`) e manda a mensagem (`chat.add` com `msg.dice`). Tudo chega a todas as telas no mesmo instante.
- Cada tela começa os dados 3D quando a mensagem chega (`js/dice3d.js`). O resultado já está no chat, no mapa e na barra enquanto os dados ainda rolam.
- Cada lance demora de 2 a 5 segundos para parar (medido com 1 a 8 dados), e o tempo muda a cada lance e em cada tela.

## Proposta
1. **Primeiro os dados, depois o resultado.** Quando o mestre resolve uma rolagem com dados (rolagem livre de qualquer pessoa, ação, ataque, dano, cura, iniciativa), ele:
   - manda para todas as telas um aviso leve, "role estes dados" (só os números, a cor e se é secreta). Cada tela começa a rolar;
   - segura o resultado: as barras e a mensagem do chat ficam guardadas;
   - depois de **2,4 s**, aplica tudo de uma vez: a barra muda, o número do dano sobe no mapa e a mensagem entra no chat.
2. **Dados com tempo certo.** Todo lance passa a parar em **no máximo 2 s**. Um lance que demoraria mais roda um pouco mais rápido, e os curtos continuam iguais. Assim o dado para antes do resultado em todas as telas.
3. **Uma rolagem de cada vez.** Se chegar outra ação enquanto a anterior espera, ela entra na fila e é resolvida depois. Assim o segundo ataque já vê a vida que o primeiro deixou.
4. **Quem desligou os dados 3D** também vê o resultado 2,4 s depois, ao mesmo tempo que os outros. Assim ninguém fica sabendo antes.
5. **Rolagem secreta:** o aviso segue a mesma regra do chat. Quem não pode ver não vê os dados nem o resultado.
6. **A biblioteca carrega antes:** ela passa a carregar alguns segundos depois de a mesa abrir (se os dados estiverem ligados), para o primeiro lance não atrasar.
7. **Sem dados com modelo 3D** (só d3, dF, números fixos): o resultado continua aparecendo na hora.
8. **Desfazer, crítico, alcance e permissões** não mudam: o mestre sorteia e confere tudo antes, igual a hoje. Só a hora de aplicar muda.

## Perguntas para o usuário
1. **Tempo dos dados:** (a) **no máximo 2 s, e o resultado 2,4 s depois do clique** (recomendo); (b) mais lento (até 3 s, resultado em 3,4 s); (c) mais rápido (até 1,5 s, resultado em 1,9 s).
2. **Quem desligou os dados 3D:** (a) **espera junto** (recomendo); (b) vê o resultado na hora. Com (b), o jogador que desligou ficaria sabendo do dano antes dos outros.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | fila de rolagens do mestre; `useAction` e `rollPost` guardam os `commit` e aplicam depois do tempo; aviso "role estes dados" |
| `js/net.js` | mensagem leve nova `{ t: 'dice' }`, mestre → todos (como o ping) |
| `js/dice3d.js` | começa pelo aviso (não mais pela mensagem do chat); limite de 2 s por lance; carrega a biblioteca antes |

## Tutorial, wiki e README
- Ficam para quando o usuário der os dados 3D por finalizados (combinado).

## Testes
- Ataque com dano: a barra e a mensagem só mudam depois do tempo; antes disso os dados já estão rolando.
- Cada lance para em até 2 s (50 lances de 1, 2 e 8 dados).
- Dois ataques seguidos no mesmo alvo: o segundo espera e usa a vida que o primeiro deixou.
- Rede: mestre e 2 jogadores veem o dado parar antes do resultado; jogador rolando sozinho; secreta.
- Desfazer o ataque depois que ele aparece.
- Tutorial inteiro (`walk.js`) sem erros (ele faz ataques: talvez precise esperar o tempo novo).
- 0 processos de teste no fim.

## Respostas do usuário
1. **2 segundos.** 2. **Todos esperam.**

## Resultado
Implementado em 23/11/2026.

**O que entrou**
- `js/store.js`: `resolve(fn)` é a fila do mestre. Dentro de uma rolagem, os `commit` ficam guardados. Se houver dados com modelo 3D, o mestre manda o aviso `{ t: 'dice' }` e aplica tudo 2,4 s depois (`DICE_WAIT`); sem dados 3D, aplica na hora.
  - `useAction` passou a ser `resolve(useActionNow)`. Isso também vale para armadilhas e área de dano das imagens.
  - Rolagem solta no chat, de qualquer pessoa, entra na fila pelo `commit`.
  - Quando a fila está livre, a resposta continua sendo a da conferência (ataque fora de alcance = `false`).
- `js/ui.js`: na iniciativa, a ordem do combate muda junto com a mensagem.
- `js/net.js`: o jogador recebe `dice` e rola.
- `js/dice3d.js`: os dados começam pelo aviso; a mensagem do chat que chega depois não rola de novo. Cada lance para em até 1,9 s, contados desde que o aviso chegou: a animação acelera na mesma proporção quando precisa, e o resultado e o caminho dos dados não mudam. O lance ficou mais curto (gravidade 1200, força 0,7), então quase nunca precisa acelerar (1,05 a 1,4 vez nos testes). A biblioteca carrega 0,3 s depois de a mesa abrir. Uma rolagem nova interrompe a pausa dos dados parados.

**Testes**
- `dados3d.js`: sem erros.
  - Resultado e vida só 2,4 s depois do clique, com o dado já parado.
  - Dois ataques seguidos: o segundo usa a vida que o primeiro deixou (500 → 488 → 483).
  - 8 lances entre 1,4 e 1,8 s.
  - Desfazer devolve a vida.
- Rede: mestre e 2 jogadores, com o dado parado antes de a mensagem chegar em cada tela.
- `walk.js` (tutorial inteiro): sem erros. O roteiro do teste agora espera o passo concluir (até 6 s) em vez de 1,8 s fixos.
- `somobjeto.js`: sem erros. 0 processos no fim.

**Limitações**
- Toda ação com dados leva 2,4 s para aparecer, mesmo para quem desligou os dados (como combinado).
- O jogador que rola a iniciativa muda a ordem na hora (só a rolagem do mestre espera).
- Se a biblioteca ainda não carregou (primeiros segundos depois de abrir a mesa), o primeiro lance corre mais rápido para parar a tempo.
