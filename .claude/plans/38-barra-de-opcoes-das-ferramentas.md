# Plano 38 · Menu das ferramentas no estilo Photoshop

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Esse menu que eu te mandei de exemplo tem um design muito ruim esse e outros que tem o mesmo estilo, eu gostaria de algo mais photoshop, abrir talvez um sub menu ao invez dessa tela quebrada."

Print: as opções da ferramenta Nota, um quadro estreito ao lado da barra de ferramentas; as cores estão cortadas e há rolagem lateral.

## Como funciona hoje
- Todas as ferramentas do modo Editar usam o mesmo quadro `#tool-opts` (`renderToolOpts` em `js/ui.js`): uma coluna de 176 px colada no botão da ferramenta, com títulos, botões e parágrafos de explicação empilhados.
- Problemas:
  - estreito demais: as opções em linha (cores das notas, tipos de luz) são cortadas e aparece rolagem lateral;
  - os textos de ajuda ocupam mais espaço que as opções;
  - as listas (notas da cena, imagens da campanha) ficam dentro do quadro e o deixam comprido, cobrindo o mapa.
- Ferramentas com esse quadro: Desenho (lápis, retângulo, elipse, linha), Parede, Porta, Luz, Gatilho, Portal, Nota, Imagem e Régua.

## Proposta
1. **Barra de opções no topo do mapa**, como no Photoshop:
   - uma faixa fina, ao lado da barra de ferramentas, só com os **controles da ferramenta ativa**, todos numa linha;
   - começa com o ícone e o nome da ferramenta;
   - escolhas curtas ficam na barra como botões de ícone (Reta/Lápis, Luz/Escuridão, Retângulo/Círculo/Polígono);
   - escolhas longas viram **sub-menus**: um botão com o valor atual e uma setinha; ao clicar, abre embaixo uma lista (cor, espessura, tipo de parede, cor da nota);
   - listas grandes também abrem como sub-menu: "Notas desta cena (3)" com busca e lista; "Imagens da campanha" com a grade;
   - a ajuda vira um botão **?** no fim da barra, que abre o texto num sub-menu (e o título de cada botão explica ao passar o mouse);
   - em tela estreita a barra quebra em duas linhas, sem rolagem lateral.
2. **O que vai em cada ferramenta:**

| Ferramenta | Na barra | Em sub-menu |
|---|---|---|
| Desenho | cor atual, espessura atual, preenchimento (retângulo e elipse) | cores e "Outra cor"; espessuras 2, 4, 8, 14; Vazio, Translúcido, Sólido |
| Parede | Reta / Lápis, tipo atual, "Procurar paredes" | tipos de parede com a altura |
| Porta | Destrancada / Trancada, "Procurar portas" | (nenhum) |
| Luz | Luz / Escuridão, Círculo / Cone / Área | (nenhum); se a iluminação estiver desligada, um aviso curto com "Ligar" |
| Gatilho e Portal | Retângulo / Círculo / Polígono | (nenhum) |
| Nota | cor das novas notas, "Notas desta cena (N)" | as 4 cores; busca e lista das notas |
| Imagem | "Enviar imagem", "Imagens da campanha (N)" | grade das imagens (clicar ou arrastar para o mapa) |
| Régua | "Mostrar aos jogadores" | (nenhum) |

3. **Sub-menus:** abrem embaixo do botão, fecham ao escolher, ao clicar fora ou com Esc; só um aberto por vez. Mesmo visual escuro e borda dos painéis flutuantes de hoje (como o painel da luz, que o usuário aprovou).
4. **Nome da cena** (canto de cima, à esquerda): enquanto a barra estiver aberta, desce para baixo dela.
5. O que não muda: o que cada opção faz, os atalhos, a barra de ferramentas da esquerda e os painéis que abrem ao clicar num objeto (luz, imagem, portal, gatilho).

## Perguntas para o usuário
1. **Onde fica:** barra horizontal no topo do mapa, ou continuar colada no botão da ferramenta, como um menu compacto com sub-menus abrindo para o lado?
2. **Ajuda:** botão **?** no fim da barra, ou uma linha curta de dica sempre visível?

## Decisões do usuário
1. "Até abri aqui o photoshop e ele não abre no topo não." (print: menu que sai do lado do botão, uma linha por opção com ícone e nome) → **o menu continua colado no botão da ferramenta**, como uma lista no estilo do Photoshop: uma linha por opção (ícone + nome), a escolhida destacada, separadores entre os grupos. O que tem muitas escolhas (cor, espessura, preenchimento, notas da cena, imagens da campanha) abre um **sub-menu ao lado** ao clicar na linha (seta no fim).
2. "Não precisa, a gente tem a wiki e quando passa o mouse em cima os botões já explicam" → **sem textos de ajuda** no menu; a explicação fica no título de cada linha (ao passar o mouse).

Isso substitui os itens 1 e 4 da proposta: não há barra no topo e o nome da cena não muda de lugar. A tabela do item 2 continua valendo, com "na barra" lido como "no menu".

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ui.js` | `renderToolOpts` monta a barra; função de sub-menu (abrir, fechar, Esc, clique fora) |
| `css/style.css` | estilo da barra, dos botões com seta e dos sub-menus; `#tool-opts` antigo sai |
| `index.html` | (se preciso) o elemento da barra |
| `js/tutorial.js` | os passos que apontam para `#tool-opts` passam a apontar para a barra |

## Testes
- Cada ferramenta: a barra mostra os controles certos e cada escolha muda a opção (cor, espessura, tipo de parede, cor da nota, forma do gatilho etc.).
- Sub-menus: abrem, fecham ao escolher, ao clicar fora e com Esc; só um aberto.
- Notas: busca e clique na nota centraliza e abre. Imagens: clicar e arrastar da grade para o mapa.
- Nada cortado nem rolagem lateral, em tela larga e estreita (fotos).
- `walk.js` (tutorial) e a regressão sem erros; 0 processos de teste no fim.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- Menu colado no botão da ferramenta, uma linha por opção (ícone + nome), a escolhida destacada, separadores. Sem textos de ajuda; as explicações foram para o título de cada linha.
- Sub-menus ao lado: cor (10 cores + "Outra cor"), espessura (com a linha de amostra), preenchimento, "Notas desta cena (N)" com busca, "Imagens da campanha (N)" com a grade. Fecham ao escolher, clique fora, Esc, clicar de novo na linha e troca de ferramenta.
- Parede mostra a altura de cada tipo à direita; Luz mostra "Ligar iluminação" só quando a iluminação da cena está desligada.
- Ícone novo: `pentagon` (Polígono).

**Testado** (`toolmenu.js`, fotos `#shot-note-notes`, `#shot-rect-fill`, `#shot-wall`, `#shot-light`, regressão)
- As 12 ferramentas: linhas certas, nada cortado (largura de 176 a 225 px), sem textos de ajuda.
- Cada escolha muda a opção (cor, 14 px, Sólido, Lápis, Meia cobertura, Trancada, Escuridão + Cone, Polígono, Tesouro, régua escondida); Ligar iluminação liga e some.
- Sub-menu: ao lado do menu, Esc fecha sem trocar a ferramenta, clique no mapa fecha, só um aberto, troca de ferramenta fecha. Notas: busca em foco, filtra e abre a nota.
- Testes antigos ajustados para o menu novo: `notes`, `props`, `handouts`, `shareruler`, `door`, `doorscan`, `lights`, `wallpencil`, `trig_ux`, `portal`, `toggle`, `menus` (tela 1280×620) e o tutorial completo sem erros; 0 processos.
