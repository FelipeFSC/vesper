# Plano 22 · Scan de paredes e portas

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Uma pergunta, a gente consegue fazer um scan, por exemplo identificar paredes ou portas?" … "Gosto da ideia, e se a gente colocar também a opção de 'mostrei o que é uma porta' o sistema encontra o restante, eu acho que seria interessante esse scan para achar parede e portas, só uma ajuda ao usuário, ele ajusta o resto."

## Objetivo
O mestre deixa de desenhar parede por parede:
- o sistema **lê a imagem do mapa** e propõe as paredes;
- o mestre **mostra uma porta** (e, se quiser, uma parede) e o sistema procura as parecidas.

Tudo aparece primeiro como **sugestão** numa prévia. O mestre aceita, tira o que estiver errado e ajusta o resto com as ferramentas que já existem: lápis, reta e borracha.

Os mapas feitos em programas de mapa entram exatos, pelo arquivo que eles exportam.

## Como funciona hoje
- As paredes são desenhadas à mão (`B.tool` wall/door, lápis do Plano 12), e `sc.walls` guarda `{x1, y1, x2, y2, cover, door, open, locked, stroke}`.
- A imagem do mapa (`sc.bg`) fica em `S().assets` como WebP de até 4096 px (`js/images.js`).
- Não existe nenhuma leitura da imagem.

## Proposta

### Parte A · Importar mapa com paredes (`.dd2vtt` / `.uvtt`)
- Em Cenas, um botão novo, **Importar mapa com paredes**, aceita o arquivo que o Dungeondraft, o Dungeon Alchemist e outros exportam.
- Esse arquivo traz a imagem, o tamanho do grid, as paredes, as portas e as luzes nas posições exatas.
- Vira uma cena nova:
  - a imagem é convertida para WebP, como hoje;
  - o grid e o tamanho saem do arquivo;
  - paredes e portas já entram no lugar;
  - as luzes entram como pontos de luz, com o raio e a cor do arquivo.
- Não tem erro de leitura. É o caminho certo para quem usa esses programas.

### Parte B · Scan de paredes (ferramenta "Scan", só o mestre)
Na ferramenta Parede, um botão **Procurar paredes no mapa** abre um quadro com uma prévia ao vivo.

1. **Mostrar a parede (opcional, recomendado):** clique num pedaço de parede da imagem. O sistema guarda essa cor como "parede".
   - Sem o clique, ele procura o que for mais escuro que o chão.
   - O clique ajuda muito em mapas com paredes de cor própria, como pedra cinza ou madeira.
2. **Sensibilidade:** um controle deslizante (pouca → muita). A prévia mostra na hora as paredes encontradas, em linhas tracejadas por cima do mapa.
3. **Modo**, escolhido sozinho e trocável:
   - **Alinhado ao grid** (padrão): confere cada borda de meio quadrado. Se a cor de parede cobre quase toda a borda, ali tem parede. As paredes saem retinhas, como os mapas de masmorra costumam ser.
   - **Livre** (cavernas): segue o contorno da mancha de parede e simplifica em poucos trechos. É o mesmo resultado do lápis do Plano 12, então a borracha apaga o traço inteiro.
4. **Onde:** o mapa inteiro, ou só um retângulo que o mestre arrasta. Serve para fazer uma sala de cada vez, ou deixar de fora o título e a legenda do mapa.
5. **Limpeza automática:**
   - trechos curtos demais (menos de meio quadrado) somem;
   - pedaços na mesma linha viram uma parede só;
   - as paredes que já existem não são duplicadas.
6. **Aceitar:**
   - **Criar paredes** põe tudo de uma vez, como um passo só do Ctrl+Z (Plano 17).
   - Antes, clicar numa sugestão tira ela da lista, e Shift + arrastar tira várias de uma vez.

### Parte C · Portas "por exemplo"
No mesmo quadro, **Mostrar uma porta**:

1. O mestre arrasta um retângulo em volta de uma porta desenhada na imagem.
2. O sistema procura no mapa os pedaços **parecidos com esse desenho**: na mesma posição, girados 90°, 180° e 270°, e espelhados. Isso cobre portas na horizontal e na vertical.
3. Cada porta achada aparece na prévia com uma moldura e um número de confiança. Um controle "Quão parecida" sobe ou desce o limite.
   - Exemplo: o mestre mostra 1 porta, o sistema acha 7, e ele tira as 2 erradas com um clique.
4. **Mostrar outra porta** soma mais um exemplo, para portas de outro desenho (dupla, grade, secreta).
5. Ao aceitar, cada porta vira uma **porta do Vésper** no eixo comprido do desenho. Se ali já existe parede (do scan ou desenhada), a porta corta a parede nesse trecho, para não ficar parede por cima da porta.
6. **Sem exemplo:** o sistema ainda sugere como porta as aberturas de 1 quadrado no meio de uma parede comprida. Isso vem marcado como "palpite" e desligado por padrão.

### Como fica por dentro
- Tudo roda **no navegador do mestre**, sem internet e sem mandar a imagem para nenhum lugar.
- **Sem travar a tela:** o cálculo roda num Web Worker criado na hora a partir de um texto (sem arquivo novo para baixar e sem build).
- **Resolução:** a imagem é lida reduzida, a uns 12 pixels por quadrado (um mapa de 30×20 vira 360×240). A prévia sai em menos de um segundo. Só a busca de portas usa um pouco mais de resolução, perto de cada candidata.
- **Portas:** comparação de desenho (correlação normalizada, que não liga para o claro ou escuro geral), procurada perto das paredes para ser rápida.
- **Resultado:**
  - as paredes entram como cobertura total (`full`), trocável depois como sempre;
  - as portas entram fechadas e destrancadas;
  - o scan de paredes ganha um `stroke` próprio, para a borracha apagar de uma vez.

### O que não entra
- Nada de inteligência artificial na internet: a imagem não sai do computador.
- Não reconhece móveis, janelas nem desníveis (meia parede). Depois do scan, o mestre troca o tipo da parede com um clique, como já faz hoje.

## Perguntas para o usuário
1. **Importar `.dd2vtt` / `.uvtt`** (Parte A): faço junto? *Recomendo que sim*: é rápido e exato para quem usa programas de mapa.
2. **"Mostrar a parede"** com um clique na cor, além do "mostrar a porta": entra? *Recomendo que sim*: melhora muito o acerto em mapas coloridos.
3. **Modo do scan**: os dois (alinhado ao grid como padrão e livre para cavernas)? Ou só um? *Recomendo os dois.*
4. **Palpite de porta pelas aberturas** quando não há exemplo: entra, desligado por padrão? *Recomendo que sim.*
5. **Escanear só um retângulo** além do mapa inteiro: entra? *Recomendo que sim* (salas uma a uma; deixa título e legenda de fora).

## Respostas do usuário
1. Importar `.dd2vtt`/`.uvtt`: sim.
2. "Mostrar a parede": pode ser.
3. Os dois modos ("gosto de paredes retas"), e o scan deve servir para todos os mapas. O exemplo enviado (salas soltas num fundo azul, octógonos, portas cor de madeira, cinza e roxas) mostrou que a parede pode ser a **borda entre o chão e o vazio**, não uma linha desenhada → entrou o modo **"Lado de fora"**, e o modo Retas endireita também em 45°.
4. Palpite pelas aberturas: sim, desligado.
5. Só um retângulo: sim.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/scan.js` (novo) | Leitura da imagem reduzida, máscara de parede pela cor de exemplo ou pelo escuro, bordas do grid, contorno livre e simplificação, busca de portas por exemplo (4 giros + espelho), palpite por aberturas, Web Worker inline |
| `js/storage.js` | Importar `.dd2vtt`/`.uvtt`: imagem, grid, paredes, portas, luzes → cena nova |
| `js/board.js` | Modo scan: clique na cor da parede, retângulo da área, retângulo da porta exemplo, prévia (paredes e portas sugeridas), clicar e Shift + arrastar para tirar sugestões |
| `js/ui.js` | Quadro "Procurar paredes no mapa" (sensibilidade, modo, área, exemplos de porta, quão parecida, Criar); botão Importar na aba Cenas |
| `js/store.js` | Nada novo: usa `wall.add` (com `History.batch`, um passo só) |
| `css/style.css` | Quadro do scan e prévia |
| `index.html` | Script `js/scan.js` (depois de `images.js`) |

## Tutorial, wiki e README
Ficam para quando você testar e finalizar:
- passo "Procurar paredes no mapa";
- seção da wiki com uma foto de antes e depois;
- linha no README.

## Testes
- **Mapa de teste gerado no próprio teste** (paredes pretas em grid, uma caverna curva, portas desenhadas iguais, uma porta girada e uma porta diferente):
  - alinhado ao grid acha as paredes certas;
  - o modo livre contorna a caverna em poucos trechos;
  - mostrar 1 porta acha as iguais e a girada, mas não a diferente;
  - mostrar a segunda porta acha a diferente;
  - a porta corta a parede debaixo.
- **Sensibilidade:** mais sensível acha mais.
- **Área:** escanear só um retângulo não cria nada fora dele.
- **Limpeza:** não duplica as paredes que já existem; trecho curto some.
- **Desfazer:** Criar é um passo só no Ctrl+Z.
- **Importar `.uvtt` de exemplo** (montado no teste): grid, paredes, portas e luzes no lugar.
- **Desempenho:** mapa de 4096 px medido fora do navegador (o Edge de teste usa tempo virtual).
- Regressão completa, tutorial completo, 0 processos.

## Resultado
- **`js/scan.js`:** leitura reduzida (~20 px por quadrado). Três jeitos de achar parede:
  - **Lado de fora:** clique no vazio. Conta todo vazio dessa cor (também os pátios cercados por salas); manchas pequenas dentro das salas não contam. A borda das salas vira parede.
  - **Cor da parede:** clique na linha; o meio da linha vira parede.
  - **Escuro:** o mesmo, pelo que for escuro.
- **Cor:** a comparação pesa mais o tom que o brilho (no exemplo, o vazio azul escuro e o chão cinza escuro têm quase o mesmo brilho).
- **Retas:** cantos no meio-quadrado e trechos endireitados em 0°/45°/90°. **Livre:** um traço por trecho (a borracha não apaga a sala inteira).
- **Portas por exemplo:** correlação normalizada (formato, não só cor) com filtro pela cor média, nos 8 giros/espelhos; vários exemplos; "Quão parecida"; exemplo liso demais avisa. A porta corta a parede debaixo.
- **Palpite:** aberturas de 0,6 a 1,6 quadrado entre paredes alinhadas.
- **Prévia:** clique tira ou põe uma sugestão; Shift + arrastar tira várias; área; não repete paredes que já existem; **Criar** = um passo no Ctrl+Z. O cálculo roda num Web Worker (com volta para o cálculo direto se o worker falhar).
- **Importar `.dd2vtt`/`.uvtt`** (botão na aba Cenas): imagem, tamanho, paredes, objetos, portas (abertas ou fechadas) e luzes (alcance e cor) → cena nova.
- **Mapa de exemplo do usuário** (35×18 no teste): com um clique no vazio e uma porta mostrada, saíram 261 paredes e as 28 portas cor de madeira. Ficaram certos as salas, os corredores, os octógonos e o pátio de dentro.
- **Teste novo:** `scan.js`, com mapa sintético e `#real` para o mapa de exemplo + foto.
- **Limitações:**
  - Portas de outro desenho (cinza, roxa) precisam de mais um exemplo.
  - Detalhes muito finos da imagem podem virar trechos curtos para apagar.
  - Em "Retas", se o grid da cena não bater com o desenho, os cantos podem puxar um pouco; use "Livre".
