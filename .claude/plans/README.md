# Planos

A partir da versão 1.0, **cada tarefa começa com um plano** nesta pasta. O usuário lê, responde as perguntas e aprova; só então implementamos.

## Fluxo

1. O usuário pede uma tarefa.
2. O Claude cria um arquivo por plano, numerado em sequência: `1-nome-curto.md`, `2-nome-curto.md`, `3-…` a partir de [_modelo.md](_modelo.md), com status **Proposto**.
3. O usuário responde as perguntas e aprova (status **Aprovado**).
4. O Claude implementa, testa e marca **Concluído**, preenchendo o que foi feito e testado.
5. Ao fechar uma versão, os planos concluídos entram no [CHANGELOG](../CHANGELOG.md).

## Status

| Status | Significado |
|---|---|
| Proposto | Plano escrito, esperando o usuário |
| Aprovado | Pode implementar |
| Em andamento | Implementando |
| Concluído | Implementado e testado |
| Descartado | Não vai ser feito (anotar o motivo) |

## Planos

| Nº | Tarefa | Status |
|---|---|---|
| 1 | [Imagens no tabuleiro](1-imagens-no-tabuleiro.md) | Concluído |
| 2 | [Mostrar aos jogadores](2-mostrar-imagem-aos-jogadores.md) | Concluído |
| 3 | [Menus dentro da tela](3-menus-dentro-da-tela.md) | Concluído |
| 4 | [Fechar o menu da ferramenta com outro clique](4-fechar-menu-da-ferramenta.md) | Concluído |
| 5 | [Movimento com pontos de passagem](5-movimento-com-pontos.md) | Concluído |
| 6 | [Limite de deslocamento](6-limite-de-deslocamento.md) | Proposto (ideia) |
| 7 | [Rastro sem o token deslizar](7-rastro-sem-deslizar.md) | Concluído |
| 8 | [Pontos de luz e de escuridão](8-pontos-de-luz.md) | Concluído |
| 9 | [Área de luz só por pontos](9-area-so-por-pontos.md) | Concluído |
| 10 | [Contorno das paredes no escuro](10-contorno-das-paredes.md) | Concluído |
| 11 | [Cego ao atravessar parede](11-cego-ao-atravessar-parede.md) | Concluído |
| 12 | [Parede a lápis](12-parede-a-lapis.md) | Concluído |
| 13 | [Porta trancada e destrancada](13-porta-trancada.md) | Concluído |
| 14 | [Gatilhos](14-gatilhos.md) | Implementado (testes do usuário) |
| 15 | [Gatilhos mais fáceis de configurar e testar](15-gatilhos-ux.md) | Implementado (testes do usuário) |
| 16 | [Gatilho reconhece o objeto escolhido no mapa](16-escolher-objeto-no-mapa.md) | Implementado (testes do usuário) |
| 17 | [Desfazer e refazer na montagem do mapa](17-desfazer-refazer.md) | Implementado (testes do usuário) |
| 18 | [Notas no mapa (só o mestre)](18-notas-no-mapa.md) | Implementado (testes do usuário) |
| 19 | [Memória de exploração](19-memoria-de-exploracao.md) | Implementado (testes do usuário) |
| 20 | [Selecionar vários, copiar e colar](20-selecao-multipla.md) | Implementado (testes do usuário) |
| 21 | [Gatilhos com vários alvos e animação](21-gatilhos-com-varios-alvos-e-animacao.md) | Implementado (testes do usuário) |
| 22 | [Scan de paredes e portas](22-scan-de-paredes-e-portas.md) | Implementado (testes do usuário) |
| 23 | [Tela de criação de ficha](23-editor-de-fichas.md) | Implementado (testes do usuário) |
| 24 | [Bestiário embutido](24-bestiario-embutido.md) | Substituído pelo Plano 25 (base e tradução descartadas) |
| 25 | [Bestiário a partir do 5etools](25-bestiario-5etools.md) | Implementado (testes do usuário) |
| 26 | [Token pronto no tabuleiro](26-token-pronto-no-tabuleiro.md) | Implementado (testes do usuário) |
| 27 | [Editor de animação maior e parar som pelo gatilho](27-editor-de-animacao-e-parar-som.md) | Implementado (testes do usuário) |
| 28 | [Menu do botão direito](28-menu-do-botao-direito.md) | Implementado (testes do usuário) |
| 29 | [Isolamento de som](29-isolamento-de-som.md) | Implementado (testes do usuário) |
| 30 | [Régua e rastro do movimento para todos](30-regua-e-rastro-para-todos.md) | Implementado (testes do usuário) |
