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
