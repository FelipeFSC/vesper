# Arquitetura

## Visão geral

- Site estático: `index.html` carrega scripts clássicos (sem módulos, sem build) que se penduram em `window.App`.
- O **mestre é o servidor**: abre a mesa com PeerJS (WebRTC) e um código de 6 letras. Os jogadores se conectam a ele.
- O mestre guarda o estado e é a **autoridade**: jogadores mandam ações, o mestre confere em `permit()` e repassa para todos.
- Salvamento automático no **IndexedDB** do navegador do mestre; exportar/importar em `.json` ou código de texto (gzip + base64).

## Ordem dos scripts (index.html)

`util → icons → dice → store → storage → images → scan → light → combat → audio → anim → triggers → history → explore → net → board → ui → tutorial → main`

| Arquivo | Responsabilidade |
|---|---|
| `js/util.js` | `U.h` (cria elementos; o `value` de select é aplicado depois dos filhos), `U.slug` (tira acento, minúsculas, `_`), toast, uid, clone, pickFile |
| `js/icons.js` | Ícones Lucide embutidos (`App.Icons.svg(nome)`) |
| `js/dice.js` | Rolador: `roll`, `rollMulti` (`\|`), `substitute` (`@atributo` → `(n)`), `doubleDice` (crítico), `check` (avisos de fórmula) |
| `js/store.js` | Estado, reducer `R`, `dispatch`, `permit()`, `migrate()`, `useAction` (combate), consultas (`currentScene`, `sceneIdOf`, `actorOf`, `statOf`, `vars`) |
| `js/storage.js` | IndexedDB, exportar/importar campanha, cena e ficha |
| `js/images.js` | Converte imagens para WebP (mapas até 4096 px, tokens até 512 px), deduplica por hash, `toWebP` |
| `js/light.js` | Luz e visão: paredes que bloqueiam (`wallsFor(eyeH)`), polígono de visibilidade, fontes (tokens e `sc.lights`), níveis (`levelAt`, `levelFor`), `pointVisible`, desenho da luz, cor e tremor |
| `js/combat.js` | Alcance, lados, alvos válidos, área, chance de acerto, **cobertura**, sombra, voo (`flyOf`, `topOf`, `sightH`) |
| `js/audio.js` | Pasta de músicas, canais música/ambiente/efeito, sons no mapa, **isolamento de som**, envio das faixas aos jogadores |
| `js/scan.js` | Scan de paredes e portas (Plano 22): imagem reduzida, máscaras (lado de fora, cor, escuro), contorno/afinamento, Douglas-Peucker, endireitar, portas por exemplo (correlação), Web Worker criado do texto de `CORE`; importar `.dd2vtt`/`.uvtt` |
| `js/anim.js` | Animação (Plano 21): tempo e curvas (`progress`), `view(sc)` = cena como aparece agora, `play`/`stop`/`preview`, relógio do mestre (`now`, `setClock`), área de dano das imagens (`hurtPoly`, golpe no tick do mestre) |
| `js/triggers.js` | Gatilhos (Plano 14): geometria e caminho (`crossing`), estado (pronto/gasto), detecção no mestre (`beforeMove` no `commit` de `token.move` de jogador; `click`), fila "perguntar", execução das ações com atraso (`fire`) |
| `js/history.js` | Desfazer/refazer do mestre (Plano 17): `before`/`after` no `commit`, diferença campo a campo, `batch`, ação `undo.apply` |
| `js/explore.js` | Memória de exploração (Plano 19): cálculo no mestre (`touch`/`flush`), bits por célula 2×2, máscara para o desenho do jogador |
| `js/net.js` | PeerJS: host, join, envio de ações e estado |
| `js/board.js` | Canvas do mapa: câmera, ferramentas, tokens, paredes, salas, mira, efeitos |
| `js/ui.js` | Interface: laterais, dock, painel do token, fichas (abas), combate, cenas, painel Mesa, modais |
| `js/ctxmenu.js` | Menu do botão direito (Plano 28): opções por tipo de objeto e do mapa vazio, "Colocar ficha aqui", submenus. O tabuleiro decide o clique e lista o que está no ponto (`B.hitAll`) |
| `js/tutorial.js` | Tutorial interativo (`?tutorial`), lista `STEPS`, campanha de demonstração |
| `js/main.js` | Menu inicial (fundo animado, teclado, trocar fundo; Criar ficha abre `ficha.html`) |
| `js/units.js` | Conversor de unidades (pés, milhas, libras… → m, km, kg, L), opcional, com a preferência no navegador |
| `js/bestiary.js` | Bestiário (Plano 25): índice e livros do 5etools sob demanda, filtros, prévia (Ficha, Descrição, Imagens), limpeza das marcações, token da web, pasta local, Meu bestiário, `toActor` sem conversão de regras, janela da mesa. O núcleo não depende de `store`/`ui` (a página de ficha usa o mesmo arquivo) |
| `data/5etools/` | Gerado por `tools/importar-5etools.mjs` a partir do 5etools-src do usuário; **fora do git** |
| `tools/` | Ferramentas de quem mantém o projeto (Node): `importar-5etools.mjs`. Não é carregado pela mesa |
| `ficha.html` + `js/ficha.js` + `css/ficha.css` | Página "Criar ficha" (Plano 23): fichas guardadas no navegador (chave `fichas`), editor em uma página, exporta `mesarpg-actor`. Usa só `util`, `icons`, `dice`, `images` (`toWebP`) e `combat` (alcance e altura); não carrega `store`, `net` nem `ui` |
| `wiki/index.html` | Manual estático com fotos em `wiki/img/` |

## Estado (resumo)

```
campanha
  name, gm, players {id: {name, color}}, chat [], conditions [], attrs [], barNames []
  rules {critMode, critHits, nat1Miss, minZero, actOnTurn, hideNumbers, trailSecs}
  handouts [{id, title, img, text}]   (entregas do painel Mostrar; ao mostrar, vira mensagem de chat kind handout com to)
  audio {music, ambient, sfx, vol {music, ambient, sfx}}   (só nomes das faixas)
  combat {active, round, turn, entries [{id, tokenId, sceneId, init}]}
  activeSceneId (cena do grupo), sceneOrder [], playerScenes {idJogador: idCena}
  actors {id: {kind pc|npc|monster, name, owner, img, color, size, height, coverShow,
               bars [{name, value, max}], stats [{name, value}], actions [], testFormula, initFormula, notes}}
  scenes {id: cena}

cena
  name, cols, rows, grid (px por quadrado), cellDist, unit, measure (cheb|alt|euclid), bg, showGrid…
  tokens {id: {actorId, name, x, y, size, linked, bars, conditions, light {bright, dim, shape, angle, color, tint, flicker}, facing, darkvision,
               hidden, masked, group, fly, lastFly, owner, z}}
  drawings [], fog {enabled, shapes, v}
  walls [{id, x1, y1, x2, y2, cover: full|high|three|half, door, open, locked, stroke (traço do lápis)}], wallsV
  light {enabled, global}
  cover {enabled, heights {high, three, half}, shadow {high, three, half}, levels {three, half}, bonus {three, half}, show, lean}
  sounds [{id, name, x, y, r, vol, on, once, at}]
  rooms [{id, name, pts [[x,y]…], outside stop|keep, ambient stop|muffle|keep}]   (isolamentos de som; sounds[].fill = igual na área inteira)
  groups [{id, name}]
  props [{id, img, name, x, y, w, h, rot, flip, hidden, opacity, locked, z}]   (z compartilhado com tokens.z)
  triggers [{id, name, shape circle|rect|poly, x, y, r, pts, on enter|leave|click, propId, who party|foes|any|pick, whoIds,
             times once|always|n, n, used, cooldown, lastAt, ask, stop, enabled, actions [{id, type, delay, …}]}]
  notes [{id, x, y, title, text, color}]   (só o mestre: Net.playerState tira das cópias mandadas aos jogadores)
  anims [{id, key 'prop:id'|'light:id'|'token:id', spec, start (relógio do mestre), from}]   (animações rodando)
  props/lights/tokens ganham: anim {steps [spec], auto}, animHome (para "voltar ao início"); props: hurt {on, box, when, who, save, dc, damage, bar, onSave}; luzes: power
  props/lights/sounds/portas: tag (grupo de objetos); ações de gatilho: ids [] + tag (antes: wallId, lightId, soundId, triggerId, target)
  explored {'*' | idJogador: {w, h, d (bits base64)}}   ; light.explore liga a memória na cena
  lights [{id, name, kind light|dark, shape circle|cone|area, x, y, bright, dim, dir, angle, pts, edge, color, tint, flicker, on}]
```

`migrate()` completa campos que faltam em campanhas antigas. **Todo campo novo precisa de valor padrão no `newScene`/`newCampaign` e no `migrate`.**

## Como adicionar uma função

1. **Ação no reducer** (`R` em `js/store.js`): `'coisa.update': (s, a) => { … }`. Retornar `false` se nada mudou.
2. **Permissão:** se jogadores podem usar, liberar em `permit()`. Por padrão, tudo é só do mestre.
3. **Interface:** chamar `S().dispatch({ type: 'coisa.update', … })`. Painéis usam assinatura (`_sig`) para só redesenhar quando algo muda: incluir os campos novos na assinatura.
4. **Campanhas antigas:** valor padrão no `migrate()`.
5. **Tutorial, wiki e README** (ver [regras.md](regras.md)).

## Pontos de atenção

- `U.h` cria elementos; para selects, passe `value` e ele é aplicado depois das opções.
- `isTyping(el)` decide se um painel pode ser redesenhado; botões e selects não travam.
- `currentScene()`: mestre vê `viewSceneId` ou a cena do grupo; jogador vê `sceneIdOf(seuId)`; "ver como" um jogador mostra a cena dele.
- O `play()` de áudio **não** pode ser aguardado com `await` (o navegador pode demorar e travar a fila).
- Nomes de vultos (`t.masked`) não podem vazar para jogadores: usar `UI.seenName(nome, masked)` em textos.
- **Nada privado do mestre vai pela rede:** use `Net.playerState()` ao mandar o estado e filtre ações em `forPlayers` (hoje: notas e a área de dano das imagens).
- **Animação:** o estado guarda a posição de verdade; quem desenha usa `App.Anim.view(sc)` (o `B.render`, a exploração e o dano já usam). Nunca mande posição por quadro: `Anim.play` grava uma vez e o mestre termina com `anim.end`.
- **Ações de montagem entram no Ctrl+Z sozinhas** (`History.wants`: prefixos `wall/prop/lightpt/trigger/sound/room/drawing/fog/note/group/token`, `order.move`). Ações automáticas (gatilhos, cálculo de exploração) passam `noUndo: true`. Várias ações = um passo: `App.History.batch(rótulo, fn)`.
- Painéis flutuantes precisam caber na tela: limite de altura + rolagem por dentro (`fitToolOpts`, `fitWin`, `max-height` no CSS). Testar com `menus.js` numa tela baixa.

## Régua para todos (Plano 30)
- Mensagem leve `{ t: 'ruler', kind: 'ruler'|'drag', sceneId, from, name, color, tokenId, pts, done, clear }` (`App.Net.shareRuler`): jogador → mestre (que carimba `from` e `name`) → outros. Não muda o estado nem entra no desfazer.
- `B.remote` (Map `quem:tipo`) guarda o que chegou; `drawRemote` desenha e `pruneRemote` limpa (soltou: `trailSecs`; ao vivo: 5 s sem sinal).

## Portais e sub-cenas (Plano 31)
- Portal = gatilho (`sc.triggers`) com `portal: true`; reaproveita desenho, desfazer, exportar e disparo. `teleport.portalId` liga os dois lados.
- `t.warp = { at, from? }` no token marca um teletransporte; `checkWarps` (board) desenha o brilho e move a câmera de quem controla.
- `sc.parent` define a sub-cena; `migrate()` limpa pai inexistente (ou pai que é sub-cena). Gatilho antigo só com teletransporte vira portal.
- `U.toast(msg, tipo, ms, { label, run })`: aviso com botão.

## Histórias (Plano 33)
- IndexedDB `mesarpg`/`kv`: `story:<id>` = {state, assets, savedAt}; `stories` = cartões [{id, name, cover, thumb, thumbOf, savedAt, scenes}]. `App.Storage.currentId` = história aberta (`save()` grava nela e chama `touchCard`).
- A chave antiga `campaign` vira a primeira história em `listStories()` (na primeira vez).
- Tela de cartões: `App.Stories` em `js/main.js` (`showStories(online)` → `openStory(id)` → `startGM`). "Voltar ao menu" do mestre: `?historias=online|offline`.
- `App.Storage.mem` (Map): guarda na memória em vez do IndexedDB (testes).
