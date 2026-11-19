# Scripts de teste

| Script | O que confere |
|---|---|
| `walk.js` | Tutorial inteiro, passo a passo (precisa terminar em "Pronto" sem erros) |
| `menu.js` | Menu inicial: teclado, submenu Jogar, nome obrigatório, Criar ficha leva a `ficha.html` (rodar com `-query ''`) |
| `ficha.js` | Plano 23, página "Criar ficha" (rodar com `-page 'ficha.html' -query ''`): vazio, ficha nova, identidade (altura com vírgula), barras (+/-, 1d4), atributos (da lista, escrito, remover, rolar), aviso de @, os 5 tipos de ação, + atributo, Testar, Duplicar, remover, notas, foco mantido, imagem, duplicar/excluir ficha, exportar = formato da mesa, importar, recusa campanha, IndexedDB (campanha intacta), busca, largura. `#shot` + `-shot` = foto; `#mobile` com `-size '390,844'` (o Edge de teste não desce de ~492 px) |
| `ficha_mesa.js` | Plano 23: arquivo da página importado pelo mestre na mesa: tudo igual, imagem, id novo, dono, janela da ficha, variáveis |
| `bestiario.js` | Plano 25 (precisa de `data/5etools/`): a mesa abre sem carregar a base, botão na aba Fichas, índice inteiro sem nenhum livro, filtros (livro, NPC, tipo, versões antigas, ND, busca), prévia carrega só o livro da criatura, ficha sem marcações, unidades Brasil/originais, abas Descrição e Imagens, token da web (simulado) na ficha, PV/Defesa/atributos, sem ações e com `dados5e`, não duplica, dragão 3×3 com visão no escuro, Rolar PV, pasta local e escolha à mão por cima do token, Meu bestiário, jogador. `#shot` + `-shot` = foto com os tokens de verdade |
| `tokenpronto.js` | Plano 26: token pronto × retrato pelos pixels (canto, centro, borda), 1×1 e 3×3, trocar na ficha e voltar, seleção com condição, `migrate` das fichas do 5etools |
| `animsom.js` | Plano 27: editor de animação em janela (barras, vírgula, modelos, curva, adicionar/duplicar/remover, prévia local, tocar/parar, começa sozinha, ação do gatilho) e parar som (efeito + parar com atraso, parar depois de, parar todos os efeitos, som do mapa de uma vez, parar todos os sons, opções no cartão). WAV gerado no teste. `#shot` + `-shot` = foto do editor |
| `ctxmenu.js` | Plano 28: clique direito de verdade; menus do token (ações, condições), luz, gatilho, porta, parede, mapa vazio (colocar ficha aqui, luz aqui, recolher a barra), Outros aqui, arrastar move a câmera, painel flutuante só pelo menu, menu cabe na tela, jogador. `#shot` + `-shot` = foto do menu do token com as ações |
| `cover.js` | Cobertura: meia/¾, altura do alvo, encostado no muro, bônus no ataque, sombra e vulto |
| `high.js` | Os quatro tipos de parede com alvos de 1,8 m e 4 m |
| `eye.js` | Altura de quem olha (personagem baixo atrás de muros) |
| `fly.js` | Voo: ver e atacar por cima dos muros, parede absoluta, painel do voo |
| `iso.js` | Isolamento de som: desenho, ajuste do formato (cantos, mover, criar e apagar canto, desfazer), regras do som, campanha antiga, painel e menu |
| `iso_shot.js` | Foto do isolamento selecionado (`-shot`) |
| `isohud.js` | Painel do isolamento com a barra da direita recolhida: abre ao lado do isolamento e fecha ao clicar no vazio |
| `prophud.js` | Painel da imagem com a barra da direita recolhida: abre ao lado da imagem, como o da luz |
| `shareruler.js` | Plano 30 (rede simulada): rastro com relógio atrasado, movimento velho não aparece, mestre carimba a hora, régua desempenho/tempo real (mensagens, sinal de vida), "Mostrar aos jogadores", arraste ao vivo, token escondido, régua de outro (cena, cancelar, some depois de trailSecs e sem sinal), opção em Mesa → Regras |
| `groups.js` | Vulto, grupos de tokens e nomes no chat |
| `pscene.js` | Jogadores separados em cenas |
| `props.js` | Imagens no mapa: soltar arquivo, níveis, mover, redimensionar, girar, travar, invisível, biblioteca, Ctrl+D, Delete, exportar |
| `props_view.js` | Jogador não consegue mexer em imagens; com `-shot`, foto do mestre (`#` vazio) ou do jogador (`?tutorial#player`) |
| `menus.js` | Painéis flutuantes cabem na tela (rodar com `-size '1280,620'`) |
| `toggle.js` | Clicar de novo na ferramenta ativa fecha as opções e volta para Selecionar |
| `path.js` | Movimento com pontos: trechos e total, destino sem deslizar, rastro, Backspace, botão direito, 1-2-1, parede, régua, regra do rastro |
| `path_shot.js` | Foto do arraste com dois pontos e uma parede no caminho (`-shot`) |
| `handouts.js` | Mostrar aos jogadores: entregas, para todos e para um jogador, quem vê, zoom, chat, permissão |
| `handouts_shot.js` | Fotos do painel do mestre (`-shot`) e da janela do jogador (`?tutorial#player`) |
| `zoom.js` | Zoom, dock e botões de baixo não se encostam (rodar com `-size` em várias larguras) |
| `lights.js` | Pontos de luz: três níveis no círculo, cone e área, paredes, escuridão (de dia também), visão no escuro, lanterna do token, permissões, ferramenta, alças, painel, Ctrl+D, Delete, exportar |
| `lights_shot.js` | Fotos das luzes: mestre (`-shot`, fogueira selecionada; `#dark` seleciona a escuridão) e jogador (`?tutorial#player`) |
| `blind.js` | Cego ao atravessar parede: tela escura durante o arraste, token volta ao soltar, porta aberta/fechada, meia parede, canto da sala, ponta solta, setas, rede (`permit`), mestre sem trava |
| `blind_shot.js` | Foto do jogador cego no meio do arraste (`-shot` com `?tutorial#player`) |
| `trig.js` | Gatilhos: emboscada (porta, luz, grupo com atraso), uma vez, mestre não dispara, quem dispara, desligado, armadilha que para o movimento (+ desfazer), sair liga outro gatilho, névoa, alavanca, perguntar ao mestre, portal no mapa e para outra cena, permissões, Disparar agora, Rearmar todos, ferramenta, painel, Escolher no mapa, Ctrl+D, Delete, exportar |
| `trig_view.js` | Gatilhos pela tela em "ver como" (arrastar e clicar na alavanca); `?tutorial#shot` + `-shot` = foto do mestre com painel |
| `trig_ux.js` | Janela de configurar gatilho: abre no marcador, adicionar ações, cartões, Escolher no mapa (janela some e volta), arrastar para reordenar, Testar = simulação (nada muda), lista da ferramenta, barras recolhidas; `#shot` + `-shot` = foto |
| `trig_pick.js` | Escolher no mapa reconhecendo o objeto (luz, porta, token, som, gatilho), padrões, vários seguidos, Esc/Concluir, cartão que muda de tipo |
| `trig_links.js` | Foto das ligações numeradas com a ação aberta em destaque (`-shot`) |
| `undo.js` | Desfazer/refazer: cada tipo, traço inteiro, duplicar = 1 passo, gatilho e combate fora, jogador no meio tempo, limite 100, atalhos e botões |
| `multi.js` | Seleção múltipla: laço com Shift, Shift+clique, mover junto, setas, Ctrl+Z, Ctrl+D (gatilho religado), Delete, copiar e colar em cena com outro grid, jogador sem seleção |
| `notes.js` | Notas do mestre: criar, editar, hover, mover, abrir, busca, duplicar/apagar/desfazer, laço, nada vai pela rede, "ver como"; `#shot` + `-shot` = foto |
| `explore.js` | Memória de exploração: grava o visto, arraste não grava, porta, lembrança escurecida × preto × iluminado, criatura escondida, por jogador, esquecer, desligar, painel; `#shot` + `-shot` = foto do jogador. Desempenho: medir fora do navegador (o Edge de teste usa tempo virtual) |
| `anim.js` | Plano 21: vários alvos numa ação, grupo de objetos (inclusive posto depois), gatilho antigo e migrate, tempo das curvas e repetições, imagem andando (1 mensagem para começar e 1 para terminar), parar/voltar ao início, girar + opacidade, animação que começa sozinha, holofote e intensidade da luz, ronda do token, área de dano (só em movimento, sempre, um golpe por passagem, jogador não recebe), ação Animar no gatilho, Testar, desfazer, colar, cartão Animar e painel; `#shot` + `-shot` = foto do caminho e da área de dano |
| `scan.js` | Plano 22: mapa sintético (salas num fundo, octógono, mesa e buraco que não viram parede, portas iguais, girada e roxa), retas no meio-quadrado e em 45°, livre, sensibilidade, portas por exemplo, palpite, área, Criar = 1 passo, não repete, paredes pretas (cor e escuro), importar `.uvtt`, janela e worker. `#real` usa `_mapa_exemplo.png` (se existir, fora do git) e com `-shot` tira a foto |
| `door.js` | Porta trancada e destrancada: atravessar a destrancada fechada (continua fechada), Shift+clique, painel, jogador e rede contra a trancada, mestre abre e destranca, ferramenta Porta; `?tutorial#shot` + `-shot` = foto do mestre |
| `wallpencil.js` | Parede a lápis: arco vira poucas paredes do mesmo traço, bloqueia a visão, círculo fecha, clique troca o tipo do traço, borracha apaga o traço inteiro, modo reta igual; `?tutorial#shot` + `-shot` = foto de uma caverna |
| `wallhint.js` | Contorno das paredes no escuro: parede vista e porta aparecem, parede fora da vista não, névoa esconde; com `-shot` e `?tutorial#player`, foto do jogador |
| `live.js` | Painéis atualizando na hora (botões, listas, caixas de marcar) |

Como rodar e como encerrar os processos: [../docs/testes.md](../docs/testes.md).
