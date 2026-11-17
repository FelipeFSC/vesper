# Plano 10 · Contorno das paredes no escuro

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "quando está tudo escuro, mostra pelo menos uma linha clara da parede, pelo menos o jogador saber o limite da sala." (com prints: o mestre vê a sala; o jogador vê tudo preto). "Vamos trabalhar em cima disso em breve, faz esse ajuste."

Ajuste pequeno de interface: executado direto, com o plano registrado. O usuário avisou que vai voltar ao assunto.

## O que mudou
- Para o jogador (e o mestre em "ver como"), com a iluminação ligada: **linha clara** nas paredes que os tokens dele **enxergam** (linha de visão), mesmo sem nenhuma luz. Portas em **dourado** (tracejado quando aberta).
- Paredes fora da vista (atrás de outras paredes) não aparecem, para não entregar o mapa. Debaixo da **névoa de guerra** também não.
- `drawWallHints` em `js/board.js` (camada própria recortada pelo polígono de visão; a névoa apaga por cima).
- Tutorial (passo "Erga uma parede"), wiki (Luz, paredes e portas) e docs.

## Testes
- `wallhint.js`: parede da sala e porta com linha; parede atrás da sala sem linha; com névoa cobrindo a parte de baixo, a parede de baixo some e a de cima continua. Foto do jogador conferida.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste.

## Para conversar depois
- Lembrar das paredes já vistas (o contorno continuar depois que o personagem sai da sala)?
- Mostrar só até uma distância, ou a sala inteira?
- Cor e espessura da linha.

## Resultado
Concluído. Ajuste pedido depois ("algo bem sutil, o foco é o desenho do mestre e não a linha do sistema"): linha mais fina (cerca de 1 px na tela) e bem apagada (20% para paredes, 38% para portas), no mesmo tom da borda do mapa.
