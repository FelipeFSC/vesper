# Arquitetura

## Visão geral

- Site estático: `index.html` carrega scripts clássicos (sem módulos, sem build) que se penduram em `window.App`.
- O **mestre é o servidor**: abre a mesa com PeerJS (WebRTC) e um código de 6 letras. Os jogadores se conectam a ele.
- O mestre guarda o estado e é a **autoridade**: jogadores mandam ações, o mestre confere em `permit()` e repassa para todos.
- Salvamento automático no **IndexedDB** do navegador do mestre; exportar/importar em `.json` ou código de texto (gzip + base64).

## Ordem dos scripts (index.html)

`util → icons → dice → store → storage → images → light → combat → audio → net → board → ui → tutorial → main`

| Arquivo | Responsabilidade |
|---|---|
| `js/util.js` | `U.h` (cria elementos; o `value` de select é aplicado depois dos filhos), `U.slug` (tira acento, minúsculas, `_`), toast, uid, clone, pickFile |
| `js/icons.js` | Ícones Lucide embutidos (`App.Icons.svg(nome)`) |
| `js/dice.js` | Rolador: `roll`, `rollMulti` (`\|`), `substitute` (`@atributo` → `(n)`), `doubleDice` (crítico), `check` (avisos de fórmula) |
| `js/store.js` | Estado, reducer `R`, `dispatch`, `permit()`, `migrate()`, `useAction` (combate), consultas (`currentScene`, `sceneIdOf`, `actorOf`, `statOf`, `vars`) |
| `js/storage.js` | IndexedDB, exportar/importar campanha, cena e ficha |
| `js/images.js` | Converte imagens para WebP (mapas até 4096 px, tokens até 512 px), deduplica por hash, `toWebP` |
| `js/light.js` | Luz e visão: paredes que bloqueiam (`wallsFor(eyeH)`), polígono de visibilidade, `pointVisible`, escuridão |
| `js/combat.js` | Alcance, lados, alvos válidos, área, chance de acerto, **cobertura**, sombra, voo (`flyOf`, `topOf`, `sightH`) |
| `js/audio.js` | Pasta de músicas, canais música/ambiente/efeito, sons no mapa, **salas de som**, envio das faixas aos jogadores |
| `js/net.js` | PeerJS: host, join, envio de ações e estado |
| `js/board.js` | Canvas do mapa: câmera, ferramentas, tokens, paredes, salas, mira, efeitos |
| `js/ui.js` | Interface: laterais, dock, painel do token, fichas (abas), combate, cenas, painel Mesa, modais |
| `js/tutorial.js` | Tutorial interativo (`?tutorial`), lista `STEPS`, campanha de demonstração |
| `js/main.js` | Menu inicial (fundo animado, teclado, trocar fundo, criar ficha) |
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
  tokens {id: {actorId, name, x, y, size, linked, bars, conditions, light, darkvision,
               hidden, masked, group, fly, lastFly, owner, z}}
  drawings [], fog {enabled, shapes, v}
  walls [{id, x1, y1, x2, y2, cover: full|high|three|half, door, open}], wallsV
  light {enabled, global}
  cover {enabled, heights {high, three, half}, shadow {high, three, half}, levels {three, half}, bonus {three, half}, show, lean}
  sounds [{id, name, x, y, r, vol, on, once, at}]
  rooms [{id, name, pts [[x,y]…], music {name,size}, at, vol, ambient stop|muffle|keep}]
  groups [{id, name}]
  props [{id, img, name, x, y, w, h, rot, flip, hidden, opacity, locked, z}]   (z compartilhado com tokens.z)
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
- Painéis flutuantes precisam caber na tela: limite de altura + rolagem por dentro (`fitToolOpts`, `fitWin`, `max-height` no CSS). Testar com `menus.js` numa tela baixa.
