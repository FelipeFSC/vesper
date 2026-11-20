# Plano 55 · validação de performance

## Reprodução

```sh
npm ci
npm run build
npm run benchmark -- --out benchmarks/resultado.local.json
npm run benchmark:catalogo -- dist benchmarks/catalogo.local.json
npm run benchmark:espacial
npm run benchmark:pixi
npm run benchmark:pixi -- --context
npm run test:browser -- --network --repeat
```

Para repetir a linha de base, extraia o frontend do commit `56b6028` para outro diretório e use `npm run benchmark -- --root <diretório> --out benchmarks/baseline.local.json`. Use a mesma versão dos dados dos cadastros ao comparar `npm run benchmark:catalogo -- <diretório>`. Os benchmarks usam Chrome instalado. O teste de rede inicia sinalização temporária em loopback, com dois jogadores em contextos independentes. Passe `--legacy-root=<diretório>` ao teste de rede para usar o frontend anterior no segundo jogador.

## Cenários da mesa

| Campanha | Tokens | Segmentos | Pontos de luz ligados | Observadores na visão do jogador |
| --- | ---: | ---: | ---: | ---: |
| Pequena | 20 | 100 | 4 | 1 |
| Média | 100 | 500 | 12 | 2 |
| Estresse | 300 | 2.000 | 30 | 4 |

A fixture usa um mapa e um objeto gerados localmente. Cada campanha tem uma cena de origem e uma segunda cena para medir a troca. O percurso arrasta um token com eventos de ponteiro, solta, segue a animação de rastro durante pan e zoom, abre uma ficha e muda de cena. O benchmark usa a visão de jogador do mestre, que executa o mesmo caminho gráfico da visão de um jogador remoto. Rede é medida separadamente.

Chrome headless 157.0.8103.79, Ryzen 7 3700X, RTX 5070 e viewport 1280 × 800. Três execuções por variante, uma navegação fria e uma quente por contexto, com quatro quadros de aquecimento. A matriz usa mestre com luz desligada e ligada em DPR 1, visão do jogador em Desempenho em DPR 1 e visão do jogador Em tempo real em DPR 2. Os marcadores de pontos de luz ficam ocultos na variante do mestre para que o ponteiro arraste o token. Os JSONs incluem p50/p95 de frame, p95 da composição e da luz, tarefas longas, heap observado quando disponível, bytes de recursos HTTP, prontidão da mesa, abertura de ficha e troca de cena.

Os orçamentos de referência deste dispositivo são 16,7 ms p95 na campanha pequena, 33,3 ms na média e 66,7 ms no estresse. A cadência de 60 Hz corresponde a 16,7 ms por quadro. O perfil de cadastros é ativado com `?perf` e mede o carregamento dos padrões e a execução do filtro separadamente do tempo total entre entrada e atualização da lista, que inclui o debounce.

## Resultados no build

Mediana de três execuções na visão do jogador, Em tempo real, DPR 2. Tempos em milissegundos.

| Cenário | Frame p95 anterior | Frame p95 atual | Luz p95 anterior | Luz p95 atual |
| --- | ---: | ---: | ---: | ---: |
| Pequeno, cache quente | 27,8 | 14,1 | 1,6 | 2,2 |
| Médio, cache quente | 118,2 | 28,0 | 14,7 | 3,9 |
| Estresse, cache quente | 1.756,9 | 48,6 | 186,1 | 19,2 |

As medianas com cache quente ficaram dentro dos valores de referência nessa variante. Com cache frio, as medianas do p95 de frame caíram de 27,9 para 20,8 ms na pequena, de 125,0 para 34,7 ms na média e de 2.506,9 para 48,7 ms no estresse. As duas primeiras ficaram acima das referências de 16,7 e 33,3 ms. No estresse, as tarefas longas por execução caíram de 17 para 0 com cache quente. O heap JavaScript observado subiu de 18,1 para 23,9 MB, incluindo os índices e caches em memória. [Linha de base](baseline.json) · [Canvas 2D após a otimização](canvas.json).

Essa rodada antecede a migração das imagens em memória para `Blob`. Em 20/11/2026, o usuário aprovou o desempenho do sistema com a implementação atual. Os valores medidos ficam como referência para futuras comparações. Rodadas futuras podem incluir GPU integrada e medir o efeito da migração das imagens sobre memória e sincronização.

No mestre, com luz ligada e cache quente em DPR 1, as medianas do p95 de frame foram de 14,0 para 7,0 ms na campanha pequena, de 34,8 para 20,9 ms na média e de 111,1 para 55,4 ms no estresse.

No microbenchmark com 2.000 consultas, o índice da campanha de estresse levou 1,24 ms para construção e 3,47 ms para consultar, contra 71,93 ms das consultas lineares. Na campanha pequena, os três valores foram 0,21 ms, 0,74 ms e 4,98 ms. As contagens de candidatos coincidiram em todas as consultas. [Resultados do índice espacial](espacial.json).

Nos cadastros, a mesma consulta manteve 16 linhas no DOM com virtualização, ante 300 na interface anterior. Em cache quente, o filtro no build levou 3,4 ms e a espera total da entrada até a lista ficar atualizada teve mediana de 164 ms, incluindo 150 ms de debounce. O carregamento dos padrões levou 115 ms nessa condição. [Cadastro anterior](catalogo-before.json) · [Cadastro atual](catalogo.json).

Na sessão WebRTC com dois jogadores, as medianas foram 190 ms para ambos entrarem e receberem a imagem, 1.530 ms para reconectar e 38 ms para concluir o envio de imagem concorrente com áudio e uma ação. O payload de imagem inicial tinha 75.578 bytes e o áudio de teste, 64.000 bytes. O teste também verificou que a imagem de uma nota do mestre ficou restrita ao host. Uma sessão adicional confirmou a recepção de ações e imagens no cliente anterior, que usa o protocolo 1.

## Decisão sobre PixiJS

O protótipo usa o mesmo contrato para Canvas 2D e PixiJS. Ele desenha mapa, objetos e tokens ordenados, texto, seleção e uma textura de iluminação e névoa gerada com a geometria das fixtures. Ambos renderizam sob demanda. O protótipo usa uma máscara pré-calculada para isolar o custo da composição.

Na RTX 5070 via ANGLE/D3D11, as duas opções ficaram perto de 7 ms no p95 de intervalo entre frames nas três campanhas e em DPR 1 e 2. No estresse, com DPR 2, a mediana do p95 da chamada de desenho foi 0,8 ms no Canvas 2D e 1,9 ms no PixiJS. A inicialização do PixiJS nessa condição levou 240 ms, com cerca de 25 MB de heap observado após o percurso. O Canvas 2D usou cerca de 5,9 MB. O limite de textura reportado foi 16.384 pixels por lado. [Dados do protótipo](pixi.json).

O teste de perda forçada do contexto WebGL na fixture pequena confirmou a restauração e um novo desenho. O Canvas 2D segue como renderizador da mesa. A composição testada apresentou tempos de frame semelhantes e um custo maior de inicialização e heap no PixiJS. A avaliação em GPU integrada e a equivalência com todas as ferramentas da mesa continuam pendentes. O protótipo mede a composição de uma máscara pré-calculada e a mesa produz máscaras dinâmicas. [Teste de perda de contexto](contexto-pixi.json).

## Verificação funcional

- O runner testa as páginas do build em subdiretório, a preferência gráfica, o chat, o carregamento do bestiário, a seleção por teclado nos cadastros e a migração transacional de imagens.
- Os roteiros históricos foram reaproveitados pelo runner Playwright para tutorial, iluminação em Desempenho e Em tempo real, exploração, portas, travessia de paredes, scan, histórias, fichas e assistente 5e.
- A sessão de teste usa WebRTC local. Ela verifica os dois jogadores, a reconexão, o isolamento de notas e imagens privadas, permissões e a chegada de assets concorrentes com áudio e ações.
- A validação deste dispositivo usa uma GPU discreta. Faltam medições em hardware adicional, comparações visuais completas e revisão dos demais fluxos da matriz do plano.

O build de produção passou no verificador de tipos. A entrada da mesa tem cerca de 548 kB minificados e 185 kB com gzip e ainda aciona o aviso de tamanho de chunk do Vite. PeerJS, o assistente e a janela do bestiário saem em chunks carregados sob demanda.
