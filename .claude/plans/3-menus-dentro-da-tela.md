# Plano 3 · Menus dentro da tela

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "Ajusta para mim os menus, a grande maioria acaba ficando fora da tela e eu não consigo ver tudo" (prints das opções das ferramentas Parede e Sala de som cortadas embaixo).

Correção sem decisão de regra de jogo: executada direto, com o plano registrado.

## Causa
Os painéis flutuantes eram posicionados na altura do botão que os abriu e não tinham limite de altura nem rolagem. Perto do fim da barra de ferramentas (Parede, Imagem, Sala de som), o quadro de opções passava da parte de baixo da tela. O mesmo podia acontecer com o menu ⋯, o painel do token no modo Apresentar e as janelas das fichas.

## O que mudou
| Onde | Correção |
|---|---|
| Opções das ferramentas (`#tool-opts`) | Ficam alinhadas ao botão, mas sobem o necessário para caber; se ainda assim não couberem, rolam por dentro. Reajustam ao trocar de ferramenta e ao redimensionar a janela (`fitToolOpts` em `js/ui.js`). |
| Barra de ferramentas (`#toolbar`) | Em telas baixas, rola por dentro em vez de passar da tela. |
| Menu ⋯ | Altura máxima da tela, com rolagem. |
| Painel do token no modo Apresentar | Altura máxima do mapa, com rolagem. |
| Janelas das fichas | A altura máxima acompanha a posição da janela (ao abrir, ao arrastar e ao redimensionar o navegador); o corpo rola por dentro (`fitWin`). |

## Testes
- `menus.js` numa tela de 1280×620 (área útil 1256×528): barra de ferramentas, opções de Desenho, Retângulo, Parede, Imagem e Sala de som, menu ⋯, ficha (inclusive arrastada para baixo) e painel do token no modo Apresentar: **todos cabem**.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste.
- `runwalk.ps1` ganhou o parâmetro `-size 'largura,altura'` para simular outras telas.

## Resultado
Concluído. Nenhuma mudança visual em telas grandes; em telas baixas, os painéis sobem e rolam por dentro.
