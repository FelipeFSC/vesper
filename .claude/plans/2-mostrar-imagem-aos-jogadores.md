# Plano 2 · Mostrar aos jogadores

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** surgiu no Plano 1 ("Gostei muito dessa ideia, sim, vamos adicionar ao plan 2") → "Agora vamos fazer o plan 2".

## Objetivo
O mestre abre uma imagem, um texto ou os dois **na tela dos jogadores**, fora do mapa, como quem entrega um papel na mesa: uma carta, o retrato do vilão, um mapa do tesouro, uma pista. Para todos ou só para alguns.

## Decisões do usuário
1. **Como aparece:** (b) uma **janela** na tela da pessoa (dá para arrastar e continuar jogando). O mestre pode mandar **imagem, texto, ou imagem com texto**.
2. **Quem fecha:** cada jogador fecha a sua.
3. **Histórico no chat:** sim.
4. **Título e texto:** sim.
5. **Zoom na imagem:** sim.
6. **De onde mostrar:** o mestre **deixa tudo pronto antes** e, na hora do jogo, só usa. Por isso, em vez de botões espalhados (biblioteca, mapa, ficha), há uma lista de **entregas preparadas** num painel próprio.

## Como ficou
- **Painel "Mostrar"** no dock (só o mestre): **Nova entrega** (título, imagem enviada do computador ou escolhida da biblioteca, texto; precisa de imagem ou texto), lista com miniatura, **Mostrar**, editar e apagar.
- **Mostrar** abre a escolha **Todos** ou **Escolher jogadores** (caixas de marcar, com quem está conectado).
- Quem recebe vê uma **janela** (a mesma das fichas, arrastável) com a imagem e o texto. **Zoom**: roda do mouse, arrastar para mover, dois cliques volta. Cada um fecha a sua.
- **Chat:** mensagem "O mestre mostrou" com miniatura, título e começo do texto; clicar reabre. Para jogadores escolhidos, só eles a veem; o mestre vê "para Ana, Bruno".
- Quem mostra (o mestre) vê a mesma janela como **prévia**.
- As imagens das entregas entram em **Imagens da campanha** (ferramenta Imagem).

### Técnico
- `st.handouts = [{id, title, img, text}]` (`newCampaign`, `migrate`); ações `handout.add`, `handout.update`, `handout.delete` (só o mestre).
- Mostrar = mensagem de chat `kind: 'handout'` com `title, img, text, to: '*' | [ids]`. `permit()` recusa `handout` vindo de jogador. `visibleMsg` respeita `to` (e o "ver como" do mestre).
- `checkHandouts` abre a janela para mensagens novas (menos de 60 s) que a pessoa pode ver; mensagens antigas não abrem sozinhas ao entrar na mesa.

### Ajuste junto: barra de baixo
O botão novo deixou o dock mais largo e ele passou a cobrir o **zoom** e, em telas menores, os botões **Trocar mapa / Encaixe**. Agora (`placeZoom` em `js/ui.js`): o zoom sai do caminho do dock (vai para o lado ou sobe para cima dele) e os botões da direita sobem uma linha quando encostariam no dock. Conferido em 1440, 1280, 1100 e 900 px de largura: nada encosta.

## Testes
- `handouts.js`: painel com 2 entregas; a imagem da entrega aparece na biblioteca; mostrar para todos abre a prévia com imagem e texto; zoom com a roda (escala 1,82) e dois cliques volta (1); mostrar só para a Ana abre a janela dela e o chat dela tem as duas entregas; o Bruno só vê a que foi para todos; clicar na mensagem reabre; o mestre vê "para Ana"; jogador tentando mostrar ou criar entrega pela rede é recusado; editar e apagar.
- `zoom.js` em quatro larguras de tela: zoom, dock e botões da direita não se encostam.
- Tutorial completo (`walk.js`) com o passo novo "Mostrar aos jogadores"; 0 processos de teste.

## Resultado
Concluído. Tutorial (passo "Mostrar aos jogadores"), wiki (seção com fotos do painel e da janela do jogador) e README atualizados.

**Limitação:** quem entrar na mesa depois que algo foi mostrado não recebe a janela sozinho; encontra a entrega no chat (se for para todos).
