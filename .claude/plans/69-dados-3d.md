# Plano 69 · Dados 3D

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "quero testar algum sistema, framework ou a gente fazer mesmo, se tiver pronto melhor, mas se a gente fazer dá também, dados 3D, para todos os dados"

## Objetivo
Quando alguém rola dados, eles caem na tela em 3D, rolam com física e param mostrando o resultado. Vale para todos os dados e para todas as rolagens da mesa.

## Como funciona hoje
- `js/dice.js` sorteia cada dado (`rnd`, com `crypto.getRandomValues`) e monta o texto do resultado. Aceita d4, d6, d8, d10, d12, d20, d% (d100), dF (Fudge), qualquer número de faces (d3, d7…), explosivo, manter/descartar.
- A rolagem vira mensagem no chat (`chat.add`, `kind: 'roll'` em `Store.rollPost`, iniciativa em `js/ui.js`, ações de combate em `Store.useAction`). Todos recebem a mensagem pela rede.
- Não existe animação de dado.

## O ponto principal: o resultado vem da mesa, não da física
O número continua sendo sorteado pelo `dice.js`, como hoje, e vai pela rede como já vai. O dado 3D só **mostra** esse resultado: a física rola e o dado para na face sorteada. Assim:
- todos veem o mesmo número, em todas as telas;
- o combate automático, o crítico e o desfazer não mudam;
- não manda nada novo pela rede (cada tela anima a partir da mensagem do chat).

## Opções de biblioteca (todas MIT, gratuitas, rodam no navegador sem internet depois de instaladas)
| Opção | O que é | Prós | Contras |
|---|---|---|---|
| **A. `@3d-dice/dice-box-threejs` 0.0.12** (recomendo testar primeiro) | Dados prontos com three.js + física cannon-es | Aceita **resultado definido** ("2d20@5,17"): o dado para na face que a mesa sorteou. Tem d4, d6, d8, d10, d12, d20 e d100, com temas e cores | Sem atualização desde 2022; usa three.js antigo (0.143) |
| B. `@3d-dice/dice-box` 1.1.4 (**descartada pelo usuário**: "é impossível aceitar cair um número diferente para cada") | Versão mais nova da mesma equipe, com Babylon.js | Mais bonita e mantida até 2024 | Pesada (Babylon). Não tem resultado definido oficial: a física decide o número, o que quebra o ponto principal |
| C. Fazer o nosso | three.js atual + cannon-es, dados modelados no código | Controle total, visual no estilo do Vésper | Mais trabalho: geometria e números de cada dado, física, acertar a face. Estimo 2 a 3 vezes o tempo da opção A |

**Caminho proposto:**
1. **Prova rápida da opção A** numa página de teste separada, sem mexer na mesa: os 7 dados, resultado definido batendo com a face, desempenho (FPS) com 10 dados, tamanho que soma ao site, funcionamento offline.
2. Se a prova passar, eu te mostro uma foto ou um vídeo curto para você aprovar o visual, e então ligo na mesa.
3. Se a prova falhar (face errada, travando, quebra com a versão do Vite), volto aqui com o resultado e partimos para a opção C.

### Resultado da prova (23/11/2026)
Página isolada no espaço temporário do Claude (nada instalado no projeto), Edge sem tela, `@3d-dice/dice-box-threejs` 0.0.12.
| Dado | Face pedida × face que ficou para cima | Como foi conferido |
|---|---|---|
| d6, d8, d10, d12, d20 | **50/50** cada | leitura da biblioteca, 5 rolagens de 10 dados; fotos de d6, d8, d12, d20 e d10 (9 e 6) |
| d4 | **certo nas 4 fotos** (1, 2, 3, 4) | a leitura numérica da biblioteca para o d4 vem errada (11/50), mas a face na tela está certa. A mesa não precisa dessa leitura (ela já sabe o número) |
| d100 | **50/50** como dezena (10…100, "00") + d10 | o d100 da biblioteca é só o dado das dezenas; 74 = dado "70" + d10 "4" (foto) |
- **Desempenho:** 136 a 143 quadros/s com 10 dados rolando (Edge sem tela, sem placa de vídeo). Cada rolagem leva de 2,5 a 4 s até parar.
- **Tamanho:** 681 KB de código (154 KB compactado, já com three.js e a física), carregado só quando os dados 3D estão ligados. Sons de dado: 528 KB; texturas opcionais: 1,5 MB (dá para não usar).
- **Offline:** nenhuma chamada para a internet; sons e texturas vêm da própria pasta.
- **Visual:** dados violeta com números claros ficaram bons (fotos mostradas ao usuário).
- **Para ajustar na mesa:** os dados às vezes param encostados na borda da tela, com uma parte cortada (lançamento e área). Rolagens de 2,5 a 4 s talvez precisem de "mais rápido".
- **Riscos:** biblioteca sem atualização desde 2022. Como o arquivo já vem com tudo dentro, não depende de outras versões; se um dia quebrar, dá para trocar pela opção C sem mudar o resto (a mesa só manda "quais dados e quais números").

## Proposta (na mesa)
- **Quando aparece:** toda rolagem que vai para o chat (rolagem livre, ações, ataques e dano, iniciativa, testes, ficha).
- **Onde:** os dados caem por cima do mapa (camada transparente, sem bloquear cliques) e somem uns 2 segundos depois de parar.
- **Cor:** cada pessoa rola com a cor dela (a mesma da lista de jogadores).
- **Dados mantidos e descartados:** em "4d6, descarta o menor" ou vantagem (2d20, fica o maior), os 4 caem e o descartado fica apagado.
- **Explosivo (1d6!):** o dado extra cai logo depois.
- **d100:** cai como dois dados (dezena e unidade).
- **Muitos dados** (ex.: 20d6): limite de dados na tela (proposta: 20); o resto aparece só no chat.
- **Rolagem secreta:** só aparece para quem rolou e para o mestre.
- **Ligar ou desligar:** cada pessoa escolhe na própria tela (painel Mesa, como a unidade de medida "Só na minha tela"). Começa ligado.

## Perguntas para o usuário
1. **Dados sem modelo 3D** (d3, d2, d7, dF Fudge…): (a) **só o número no chat, como hoje** (recomendo); (b) mostrar o d6 mais parecido (d3 como d6 com 1–3 repetidos; dF com +, − e branco).
2. **O resultado no chat:** (a) **aparece na hora**, e o dado é só o show (recomendo, para o jogo não esperar); (b) espera o dado parar (mais suspense, uns 2 s de atraso).
3. **Quem vê os dados de quem:** (a) **todos veem as rolagens de todos**, menos as secretas (recomendo); (b) cada um vê só as próprias.
4. **Som de dado batendo na mesa:** (a) com som, com volume próprio (recomendo); (b) sem som.

## Mudanças por arquivo (depois da prova)
| Arquivo | O que muda |
|---|---|
| `package.json` | dependência nova (opção A: `@3d-dice/dice-box-threejs` e o three.js que ela pede) |
| `js/dice.js` | cada rolagem guarda os dados em lista (`dice: [{faces, v, drop}]`) para o 3D saber o que mostrar |
| `src/…/dice3d.ts` (novo) | camada 3D por cima do mapa, fila de rolagens, cor, limite, ligar/desligar |
| `js/ui.js` | ao chegar mensagem de rolagem no chat, manda para o 3D; opção "Dados 3D" no painel Mesa |
| `css/style.css` | camada dos dados |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Prova da biblioteca: cada dado (d4 a d100) para na face definida, 50 rolagens por tipo, conferindo a face de cima.
- Rolagens da mesa: livre, vantagem, descarte, explosivo, d100, secreta, muitos dados, ação de combate.
- Rede: o jogador vê os mesmos números que o mestre.
- Desligado: nada aparece e nada é carregado.
- Desempenho: FPS do mapa durante a rolagem.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste no fim.

## Respostas do usuário
1. Dados sem modelo 3D: **só o número**. 2. Chat: **na hora** (trocado no Plano 70: o resultado espera os dados). 3. **Todos veem**, menos as secretas. 4. **Com som**.

## Resultado
Implementado em 23/11/2026 com a opção A.

**O que entrou**
- `js/dice.js`: cada rolagem anota os dados (`take()`). "Conferir fórmula" não anota, e dados de rolagens que não vão ao chat (PV ao colocar token) se apagam sozinhos.
- `js/store.js`: a mensagem de rolagem ou de ação criada logo depois leva `msg.dice` (até 40 dados), tanto do mestre quanto do jogador. Nada muda no `permit`.
- `js/dice3d.js` (novo): camada `#dice3d` por cima do mapa, sem pegar cliques. A biblioteca é carregada na primeira rolagem (arquivo separado, 545 KB). A fila guarda até 3 rolagens esperando. Cada pessoa rola na sua cor (número claro ou escuro conforme o fundo). Até 20 dados na tela. O d% vira dezena + d10. O descartado fica apagado. Os dados somem 2,2 s depois de parar. A rolagem secreta segue a regra do chat.
- Painel Mesa → **Dados 3D**: "Mostrar os dados 3D" e o volume do som, só na tela da pessoa (guardados no navegador).
- `vite.config.mts`: copia para `dist/dados3d/` só os sons usados (dado de plástico, moeda, feltro: 224 KB) e a licença MIT para `dist/licenses/`. Os arquivos de áudio continuam fora do git.
- `package.json`: `@3d-dice/dice-box-threejs` 0.0.12 (versão fixa).

**Diferenças do plano**
- Explosivo: o dado extra cai junto com os outros, não "logo depois".
- O arquivo novo ficou em `js/dice3d.js`, e não em `src/…/dice3d.ts`.

**Testes**
- `dados3d.js` (novo): todos os casos sem erros, inclusive o ataque levando o d20.
- Rede (`--network`, com a conferência nova em `tests/network.mjs`): um jogador rola 3d6 e o mestre e os 2 jogadores mostram os mesmos números.
- `walk.js` (tutorial inteiro): `final: Pronto`, sem erros.
- Build sem nenhum arquivo faltando (sem 404). `npm run dev` serve os sons pelo `node_modules`.
- Foto: dados por cima do mapa com fundo transparente, na cor do mestre.

**Não testado / limitações**
- O som e a fluidez num navegador com placa de vídeo, na mão do usuário. No teste sem tela não há som audível.
- Os dados às vezes param perto da borda do mapa.
- Duas rolagens seguidas entram na fila: a segunda espera a primeira parar (até uns 3 s).
