# Plano 68 · Parar efeito pelo painel e som preso a um objeto

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Gostaria de poder parar um efeito de som, eu testei uma musica porem agora ela não para de tocar, eu gostaria de poder parar as musicas também, e também se possivel adicionar fixar o som á uma fixa, deixar a opção, fixar á um objeto, ai eu escolho onde fixar o efeito de som [...] a musica sendo parte do monstro ou de uma serra que passa rápido na tela [...] mas é fixar o som e não colocar o som na fixa."

**Respostas do usuário (revisão 2):**
1. Objeto apagado: o som é **apagado junto**.
2. Token escondido: o som **continua tocando**.
3. "Fica fixo. [...] talvez acho até melhor adicionar musica ao objeto ou token mesmo ai fica um icone de som, acho que fica mais organizado ao invez de ter 2 objetos em um mesmo lugar." Por isso o som passa a ser **do objeto**, mostrado como um ícone de som nele, e não como um marcador separado em cima do objeto.

## Objetivo
1. **Parar o que está tocando como efeito:** uma faixa longa tocada como Efeito, pela biblioteca ou por um som do mapa "Uma vez", precisa de um botão de parar.
2. **Som em um objeto** (token, imagem ou luz): o objeto ganha um som próprio, mostrado como um ícone de som nele. O som anda com o objeto. Se o objeto se mexe ou é animado (a serra), cada jogador ouve conforme a distância naquele momento.

## Como funciona hoje
- **Efeito** (`A.playSfx` e `syncSfx` em `js/audio.js`): toca uma vez, sem repetir. Cada computador guarda o que está tocando (`A.fx`), e a ordem `audio.stop` para tudo (Plano 27). Mas **só o gatilho** manda essa ordem: o painel Som não tem botão de parar efeito. Por isso a música tocada como efeito não para.
- **Som do mapa "Uma vez"** (`A.trigger` e `syncSpotFx`): o painel do marcador tem "Tocar agora", mas não tem "Parar". O volume e o lado são calculados **uma vez**, no começo; se a pessoa anda, não muda.
- **Som do mapa "Repete"**: tem Tocar e Silenciar. O volume é recalculado 10 vezes por segundo (`tick`), mas sempre a partir do ponto fixo `snd.x, snd.y`.
- Sons do mapa ficam em `sc.sounds` (por cena). Não existe som preso a objeto.

## Proposta

### 1. Parar efeito
- **Painel Som, linha "Efeitos e sons no mapa":** mostra o que está tocando como efeito agora, com um botão **Parar** em cada um e **Parar todos** quando há mais de um. Sem nada tocando, fica como hoje.
- **Painel do som "Uma vez"** (solto ou de objeto): enquanto toca, o botão **Tocar agora** vira **Parar**.
- **Botão direito** no marcador ou no objeto com som "Uma vez": **Parar**, enquanto toca.
- Tudo usa a ordem que já existe (`A.stopFx`), então para também nos jogadores.
- Música e ambiente já têm Parar no painel. Não muda.

### 2. Som em um objeto
- **Adicionar:** botão direito no token, na imagem ou na luz: **Adicionar som…** Abre a escolha da faixa na biblioteca e cria o som do objeto, com as mesmas opções de um som do mapa (Repete ou Uma vez, alcance, volume, isolamento, etiqueta para gatilhos).
- **Ícone no objeto:** o mestre vê um pequeno ícone de som no canto do objeto (aceso quando está tocando, apagado quando desligado). Os jogadores não veem, como hoje com os marcadores de som. O ícone respeita a camada "Sons" (camada escondida, ícone escondido).
- **Abrir o painel do som:** clique no ícone. O círculo de alcance aparece em volta do objeto enquanto o painel do som está aberto ou o objeto está selecionado.
- **Botão direito no objeto com som:** Tocar ou Parar (Uma vez), Ligar ou Desligar (Repete), **Editar som**, **Remover som**.
- **Um som por objeto.** Para trocar a faixa, use o painel do som.
- **Posição:** o som fica no centro do objeto. Vale para o objeto arrastado, movido pelo jogador, animado (andar, ronda) e no caminho entre portais da mesma cena.
- **Volume ao vivo:** o som "Repete" já é recalculado 10 vezes por segundo, agora a partir da posição do objeto. O "Uma vez" também passa a ser recalculado enquanto toca (vale para os sons do objeto e os soltos: quem se afasta ouve mais baixo).
- **Isolamento de som:** usa a posição do objeto. Se o monstro entra na taverna isolada, quem está fora deixa de ouvir.
- **Objeto apagado:** o som é apagado junto. Desfazer devolve os dois.
- **Objeto movido para outra cena:** o som vai junto para a nova cena.
- **Objeto copiado e colado:** a cópia leva uma cópia do som.
- **Token escondido:** o som continua tocando (o rosnado do monstro que ninguém vê).
- **Não é a ficha:** o som fica no token do mapa, não na ficha do personagem.
- **Sons soltos continuam existindo:** o marcador de som no mapa continua como hoje. No painel de um som solto há **Prender em um objeto**: você clica no objeto, o marcador some e o som vira o som daquele objeto. No som de um objeto há **Soltar no mapa**: vira marcador de novo, no lugar do objeto.
- **Gatilhos:** Tocar, Ligar e Desligar som funcionam igual com o som de objeto (aparece na lista como "Som de: Goblin").
- **Por dentro:** o som continua em `sc.sounds`, com `snd.attach = 'token:id' | 'prop:id' | 'light:id'`. Assim áudio, gatilhos, isolamento e rede continuam funcionando sem mensagens novas. Cada computador calcula a posição pelo estado e pela animação (`App.Anim.view`). O tabuleiro não desenha o marcador dos sons com `attach`; desenha o ícone no objeto.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/audio.js` | `A.soundPos(sc, s)` (objeto ou ponto); `hearing` e `roomAt` usam essa posição; efeito "uma vez" recalculado no `tick`; avisa o painel quando um efeito começa ou para |
| `js/store.js` | `sound.update` aceita `attach`; apagar objeto apaga o som dele (e o desfazer devolve); mudar objeto de cena leva o som; colar objeto copia o som |
| `js/board.js` | não desenha marcador de som com `attach`; ícone de som no objeto (clique abre o painel); alcance em volta do objeto; escolha do objeto no mapa para "Prender" |
| `js/ui.js` | painel Som com os efeitos tocando e Parar; painel do som com Parar, Prender em um objeto e Soltar no mapa; nome "Som de: …" nas listas de gatilhos |
| `js/ctxmenu.js` | Adicionar som…, Editar som, Remover som, Tocar/Parar, Ligar/Desligar no menu dos objetos; Parar no marcador "Uma vez" |

## Tutorial, wiki e README
- Ficam para quando o usuário der a função por finalizada (combinado).

## Testes
- Efeito longo pela biblioteca: aparece na linha Efeitos; Parar interrompe no mestre e no jogador; Parar todos.
- Som "Uma vez": o botão vira Parar enquanto toca; o botão direito também para.
- Adicionar som em token, imagem e luz: aparece o ícone, sem marcador separado; o clique no ícone abre o painel.
- Volume e lado mudam quando o token anda e quando a imagem é animada (ronda, a serra); isolamento usa a posição do objeto.
- "Uma vez" recalculado enquanto toca: o ouvinte se afasta e o volume cai.
- Apagar o objeto apaga o som; desfazer devolve os dois. Mover para outra cena leva o som. Colar copia o som.
- Prender um som solto e soltar de novo no mapa.
- Gatilho tocando o som de um objeto.
- Jogador pela rede ouve conforme a posição do objeto e não vê o ícone.
- Tutorial completo (`walk.js`) e teste de rede sem erros; 0 processos de teste no fim.

## Resultado
Implementado em 23/11/2026. O plano era o 58, mas esse número já pertencia a outro plano: virou o 68.

**O que entrou**
- Painel Som: a linha "Efeitos e sons no mapa" lista os efeitos tocando, cada um com Parar, e mostra "Parar todos os efeitos" quando há mais de um.
- Som "Uma vez": "Tocar agora" vira "Parar" enquanto toca, no painel e no botão direito. O marcador e o ícone ganham um anel dourado enquanto tocam.
- Som do objeto: "Adicionar som…" no botão direito do token, da imagem e da luz abre a janela da faixa. Com som, o menu mostra o submenu "Som: <faixa>" com Tocar/Parar ou Ligar/Desligar, Editar som, Trocar a faixa, Soltar no mapa e Remover som.
- Ícone de som no canto de cima à direita do objeto, só para o mestre e com a camada Sons. O clique abre o painel e o alcance aparece quando o som ou o objeto está selecionado. O som preso não se arrasta.
- Painel do som: "Preso em: <objeto>" com "Soltar no mapa"; no som solto, "Prender em um objeto".
- Posição ao vivo, inclusive animado ou arrastado. O efeito "uma vez" é recalculado enquanto toca (também os soltos) e toca mesmo para quem está longe no começo. O isolamento usa a posição do objeto.
- Apagar o objeto apaga o som (o Ctrl+Z devolve os dois). Duplicar ou colar leva uma cópia do som. O portal para outra cena leva o som do token. Gatilhos mostram "Som de <objeto>: <faixa>".
- Campanha com som apontando para objeto que não existe: o `migrate` solta o som no último lugar.
- Por dentro: `snd.attach`; `App.Anim.view` marca a cena com `_view` para não animar duas vezes; ícone Lucide `unlink` adicionado.

**Testes** (build Vite + Edge, `npm run test:browser -- --legacy=<nome>` com `VESPER_BROWSER=msedge`)
- `somobjeto.js` (novo): todos os casos da lista acima, sem erros.
- `walk.js` (tutorial inteiro): `final: Pronto`, `erros: []`.
- `animsom.js` (parar som do Plano 27) e `ctxmenu.js`: sem erros.
- Rede (`--network`): mestre e jogador conectados, sem erros.
- `iso.js` falha no passo "painel do isolamento" (o painel continua mostrando o do som). A mesma falha acontece na versão anterior a este plano, então não foi causada por ele.
- 0 processos de teste no fim.

**Não testado:** ouvir de verdade numa mesa com outro computador. No teste automático, o volume foi conferido pelos números.
