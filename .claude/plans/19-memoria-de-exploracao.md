# Plano 19 · Memória de exploração

**Status:** Implementado (testes do usuário)
**Versão:** 1.2
**Pedido do usuário:** escolheu: "Memória de exploração (Foundry, 'Fog Exploration'). O que o grupo já viu fica no mapa, escurecido, mesmo depois que ele sai de lá; o que nunca foi visto continua preto. Isso conversa com o que anotamos no Plano 10."

## Objetivo
Explorar deixa rastro: a sala por onde o grupo passou continua desenhada, apagada, como um mapa que eles foram fazendo. O que nunca foi visto continua preto.

## Como funciona hoje
Com a iluminação ligada, o jogador vê só o que está iluminado e à vista agora (`Light.render`). Saiu da sala, ela volta a ficar preta. O contorno das paredes (Plano 10) também só aparece no que está à vista.

## Proposta
- **Três estados no mapa do jogador:**
  - **Vendo agora:** como hoje (luz plena ou meia luz).
  - **Já visto:** o desenho do mapa aparece **escurecido e sem cor viva** (cerca de 25%), com o contorno sutil das paredes. **Sem tokens nem criaturas**: só o lugar, porque o grupo não sabe o que está lá agora. Luzes de lá não aparecem.
  - **Nunca visto:** preto.
- **O que conta como "visto":** o que algum token do jogador enxergou de verdade (meia luz ou mais e na linha de visão; a visão no escuro conta). Passar arrastando conta só onde o token foi solto (não vale espiar no arraste; Plano 11).
- **Configuração por cena** (Configurar cena → Iluminação): **Memória de exploração** ligada ou desligada (padrão: ligada nas cenas novas; nas antigas, desligada até o mestre ligar). Botão **Esquecer o explorado** (recomeça a masmorra).
- **O mestre** vê, em "Ver como os jogadores", exatamente o que eles lembram. Na visão dele, nada muda.
- Com névoa de guerra manual ligada, ela continua mandando: o que a névoa cobre fica coberto.

## Técnico
- O mapa é dividido em uma grade fina (4 células por quadrado). O **mestre** calcula o que ficou visível depois de cada movimento aceito, luz acesa/apagada ou porta aberta, e soma às células vistas (`sc.explored`, guardado compacto, em base64). Vai para os jogadores pela rede, como qualquer ação.
- No desenho do jogador, a máscara de luz ganha um nível mínimo de ~25% nas células vistas (sem mostrar tokens ali, que já são filtrados pela visão).
- O contorno das paredes (Plano 10) passa a valer também nas paredes das áreas vistas.

## Decisões do usuário
1. **Do grupo ou de cada jogador:** "Deixa para o mestre decidir, na configuração global ele muda." → regra da campanha (Mesa → Regras): **Memória de exploração: do grupo | de cada jogador** (padrão: do grupo).
2. Portas e objetos na área lembrada: **como estão agora** (recomendação; não perguntado de novo).

## Perguntas (respondidas)
1. **A memória é do grupo todo ou de cada jogador?**
   - (a) Do grupo: o que um viu, todos lembram. *(Recomendo: é o "mapa do grupo", e é mais leve.)*
   - (b) De cada jogador: cada um lembra só o que os tokens dele viram (o Foundry faz assim). Útil quando o grupo se separa.
2. **Portas e objetos na área lembrada:** mostrar como estão **agora** (simples) ou como estavam **quando o grupo viu** (mais realista, mais pesado)? *(Recomendo agora.)*

## Testes
- Andar com luz por duas salas: a primeira fica escurecida (sem goblins), a nunca vista fica preta.
- Espiar arrastando não grava; soltar grava.
- Visão no escuro grava; parede segura (não grava o outro lado).
- Esquecer o explorado; desligar por cena; névoa manual continua cobrindo.
- Jogador recebe a memória pela rede; recarregar mantém (salva na campanha).
- Desempenho: mapa 40×40 com 4 tokens sem travar.
- Tutorial completo, 0 processos.

## Resultado
Implementado (falta o usuário testar; tutorial e wiki depois).
- `js/explore.js`: o mestre calcula (250 ms depois de movimento, porta, luz, parede, cena) as células 2×2 por quadrado vistas pelos jogadores e grava `sc.explored` (bits em base64) por chave: `'*'` (do grupo) ou id do jogador (regra **Mesa → Regras → Memória de exploração**). De noite só testa perto de luzes e da visão no escuro.
- Tela do jogador: o já visto fica a ~25% (sem tokens), com o contorno sutil das paredes lembradas; nunca visto = preto. Espiar arrastando não grava.
- Por cena em Iluminação: chave **Memória de exploração** (cenas novas: ligada; antigas: desligada) e **Esquecer o explorado**.
- **Testado** (`explore.js` + foto): grava o iluminado e não o de trás da parede; arraste não grava; porta aberta grava a outra sala e ela continua lembrada; pixel lembrado escurecido × nunca visto preto × iluminado; criatura da sala lembrada não aparece; modo por jogador; esquecer; desligar; painel. **Desempenho** (node, fora do navegador): 30×20 de noite 25–43 ms do zero e 5 ms por passo; 40×40 de noite 61–64 ms e 16 ms por passo; 60×60 com 300 paredes e 30 luzes 180 ms do zero e 36 ms por passo.
- **Limitação:** portas e objetos na área lembrada aparecem como estão agora (não como estavam quando o grupo viu).
