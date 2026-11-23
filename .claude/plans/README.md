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
| 31 | [Portais e escadas](31-portais-e-escadas.md) | Implementado (testes do usuário) |
| 32 | [Procurar portas pela ferramenta Porta](32-procurar-portas-na-ferramenta-porta.md) | Implementado (testes do usuário) |
| 33 | [Histórias (várias mesas preparadas)](33-historias.md) | Implementado (testes do usuário) |
| 34 | [Procurar paredes em mapas com textura](34-scan-mapas-com-textura.md) | Primeira versão (testes do usuário) |
| 35 | [Portal: área de chegada desenhada e marcador para os jogadores](35-portal-area-de-chegada-e-icones.md) | Implementado (testes do usuário) |
| 36 | [Acompanhar os jogadores](36-acompanhar-jogadores.md) | Implementado (testes do usuário) |
| 37 | [Remover jogador e jogador sem ficha não vê o mapa](37-remover-jogador-e-sem-ficha.md) | Implementado (testes do usuário) |
| 38 | [Menu das ferramentas no estilo Photoshop](38-barra-de-opcoes-das-ferramentas.md) | Implementado (testes do usuário) |
| 39 | [A luz e a visão só mudam quando o token é solto](39-luz-so-ao-soltar-o-token.md) | Implementado (testes do usuário) |
| 40 | [Unidade de medida da mesa (e a de cada jogador)](40-unidades-da-mesa.md) | Implementado (testes do usuário) |
| 41 | [Portal: ligar dois portais (sai o "Ida e volta")](41-ligar-dois-portais.md) | Implementado (testes do usuário) |
| 42 | [Tela de cadastros (começando pelos ataques)](42-cadastros-ataques.md) | Implementado (testes do usuário) |
| 43 | [Cadastro de itens (e as armas como itens)](43-cadastro-de-itens.md) | Implementado (testes do usuário) |
| 44 | [Cadastro de talentos](44-cadastro-de-talentos.md) | Implementado (testes do usuário) |
| 45 | [Cadastro de magias](45-cadastro-de-magias.md) | Implementado (testes do usuário) |
| 46 | [Cadastro de antecedentes](46-cadastro-de-antecedentes.md) | Implementado (testes do usuário) |
| 47 | [Cadastro de espécies (raças)](47-cadastro-de-especies.md) | Implementado (testes do usuário) |
| 48 | [Cadastro de opções de classe](48-cadastro-de-opcoes-de-classe.md) | Implementado (testes do usuário) |
| 49 | [Cadastro de classes (classes base)](49-cadastro-de-classes.md) | Implementado (testes do usuário) |
| 50 | [Cadastro de subclasses](50-cadastro-de-subclasses.md) | Implementado (testes do usuário) |
| 51 | [Ficha de D&D 5e e criação pelos cadastros](51-criar-personagem-pelos-cadastros.md) | Implementado: partes A e B (testes do usuário) |
| 52 | [Multiclasse na ficha 5e e no assistente](52-multiclasse.md) | Implementado (testes do usuário) |
| 53 | [Ficha de criatura 5e (bestiário fiel ao livro)](53-ficha-de-criatura-5e.md) | Implementado (testes do usuário) |
| 54 | [Etapa de atributos do assistente no modelo do Roll20](54-etapa-de-atributos-modelo-roll20.md) | Implementado (testes do usuário) |
| 55 | [Migração do frontend e performance do VTT](55-migracao-frontend-e-performance.md) | Em andamento |
| 56 | [Código e senha da mesa online](56-codigo-e-senha-da-mesa.md) | Implementado |
| 57 | [Janela, parede mágica, desenhar por cima e pontas conectadas](57-janela-parede-magica-e-substituir.md) | Implementado |
| 58 | [Ajustes na criação de personagem D&D 5e](58-ajustes-criacao-personagem-5e.md) | Concluído |
| 59 | [Hífen no título do assistente D&D](59-hifen-no-passo-a-passo.md) | Concluído |
| 60 | [Filtro de fonte por edição](60-filtro-fonte-por-edicao.md) | Concluído |
| 61 | [Edição das subclasses na etapa Classe](61-filtro-edicao-subclasses.md) | Concluído |
| 62 | [Nomes das fontes importadas do 5etools](62-nomes-das-fontes-5etools.md) | Concluído |
| 63 | [Datas e edições das fontes do 5etools](63-datas-e-edicoes-das-fontes.md) | Proposto |
| 64 | [Filtro de edição dentro de Fonte no assistente](64-filtro-edicao-no-menu-fonte-do-assistente.md) | Concluído |
| 65 | [Descrição das magias e cores no assistente](65-descricao-das-magias-e-cores-no-assistente.md) | Concluído |
| 66 | [Cores dos títulos do tooltip de magias](66-cores-dos-titulos-do-tooltip-de-magias.md) | Concluído |
| 67 | [Origens das magias abaixo da descrição](67-origem-das-magias-abaixo-da-descricao.md) | Concluído |
