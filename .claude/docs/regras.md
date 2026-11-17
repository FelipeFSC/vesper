# Regras de trabalho

Regras que o usuário pediu ao longo do projeto. Valem para toda tarefa.

## Processo

- **Planos primeiro.** A partir da versão 1.0, cada tarefa começa com um plano em `.claude/plans/` (ver [../plans/README.md](../plans/README.md)). Implementar só depois que o usuário aprovar.
- **Perguntar quando a regra de jogo for ambígua.** Ex.: na cobertura, o usuário quis planejar antes ("vamos planificar antes de implementar"). Quando houver escolha de design que muda o jogo, levar as opções com uma recomendação.
- **Toda função nova ganha:**
  - um passo no tutorial interativo (`js/tutorial.js`, lista `STEPS`) e a ação correspondente no teste do tutorial;
  - uma seção na wiki (`wiki/index.html`), com foto quando ajudar, e link no índice;
  - uma linha no README se for um recurso que aparece na lista "O que dá para fazer".
- **Testar de verdade antes de entregar** (ver [testes.md](testes.md)): o tutorial inteiro precisa passar sem erros, mais um teste específico da função.
- **Resposta final em português**, curta, dizendo o que mudou, como usar e o que foi testado. Ser honesto sobre limitações e sobre o que não foi possível testar.

## Ambiente e segurança

- **Projeto local.** Nunca publicar nada online (Artifacts, links do Claude) sem o usuário pedir. Ele já pediu para apagar uma publicação que não tinha pedido.
- **Nada rodando escondido.** Todo teste abre um Edge sem tela e um servidor node temporário. Ao terminar, encerrar os dois e conferir que sobraram **0 processos** (o comando está em [testes.md](testes.md)). O usuário não quer "algo rodando 24 horas por dia escondido no meu pc".
- **GitHub:** fazer commit e push só quando o usuário pedir. O `.gitignore` deixa de fora todo arquivo de áudio e vídeo; a pasta `Sons/` sobe só com as subpastas vazias (`.gitkeep`). Arquivos acima de 100 MB não podem ir para o GitHub.
- **Dados do usuário são privados:** não colocar nome, e-mail ou detalhes do projeto em serviços externos.
- **Não renomear chaves de armazenamento** (`vespera.menu-bg`, IndexedDB `vespera-audio`, picker `vespera-musicas`): mudar faz o navegador esquecer o fundo do menu e a pasta de músicas já configurados.

## Visual e texto

- **Nome:** Vésper (masculino: "o Vésper", "Bem-vindo ao Vésper"). Antes se chamava Véspera.
- **Sem emojis** em lugar nenhum. Ícones só do Lucide, embutidos em `js/icons.js` (para adicionar um, copiar o SVG do Lucide para a lista `P`).
- **Visual:** grafite escuro, violeta `#6c4fe0` como cor de ação, dourado para destaque, EB Garamond para nomes do mundo do jogo e Inter para a interface. Veio de um layout no Figma.
- **Textos da interface:** português claro, frases curtas, dizendo o que acontece ("Os jogadores veem só uma silhueta escura"). Dicas (`.hint`) explicam o efeito, não o código.
- **Menu inicial estilo videogame:** opções no canto inferior esquerdo sobre a imagem `imagens/imgHomeHD.jpg`, com animações leves (estrelas, janelas, névoa, faíscas).

## Princípios de design do jogo

- **Duas visões.** O mestre controla a mesa; os jogadores só vivem a experiência. Controles de clima (música, volume, luz, visão, voo, visibilidade, cobertura) são só do mestre, na interface **e** no `permit()`. Portas os jogadores podem abrir, porque é ação de jogo.
- **O sistema calcula.** O usuário acha o Roll20 manual demais: ataque, dano, cura, custo, alcance, cobertura e área são resolvidos automaticamente pelo mestre em `Store.useAction`, com Desfazer.
- **Combate estilo videogame:** escolher a ação, o jogo pergunta o alvo e só deixa mirar quem está ao alcance e à vista; o resultado aparece no mapa, o chat é só histórico.
- **Ninguém precisa adivinhar nomes:** atributos, barras e condições vêm de listas da campanha (selects), não de texto livre.
- **Painéis atualizam na hora.** Só não se redesenham enquanto alguém digita num campo de texto ou número (`isTyping` em `js/ui.js`).
- **Por enquanto, sem preocupação com trapaça:** a mesa é entre amigos. O mestre manda a campanha inteira para todos e cada tela decide o que mostrar.
