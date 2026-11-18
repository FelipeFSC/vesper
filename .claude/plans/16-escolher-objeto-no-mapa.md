# Plano 16 · Gatilho reconhece o objeto escolhido no mapa

**Status:** Implementado (testes do usuário)
**Versão:** 1.2
**Pedido do usuário:** "se eu selecionar na trigger para selecionar um objeto ele deve saber qual objeto eu estou selecionando, por que tipo, eu tenho que colocar luz para depois selecionar luz, o sistema já deveria saber que uma luz é uma luz"

Ajuste de usabilidade (sem regra de jogo nova): executado direto, com o plano registrado.

## O que muda
- Coluna ENTÃO da janela do gatilho: botão **Escolher no mapa**. Clicar em um objeto cria a ação do tipo certo, já com o alvo:
  | Clicou em | Ação criada | Já vem com |
  |---|---|---|
  | Marcador de luz | Luz | acesa → Apagar; apagada → Acender |
  | Porta | Porta | aberta → Fechar; fechada → Abrir |
  | Token | Token | invisível/vulto → Aparecer; visível → Sumir |
  | Som do mapa | Som | ligado → Desligar; desligado → Ligar; efeito → Tocar |
  | Marcador de outro gatilho | Outro gatilho | desligado → Ligar; ligado → Disparar |
- **Vários seguidos:** o modo continua até Esc ou Concluir (faixa no topo do mapa: "Clique nos objetos… · Concluir"). Cada clique avisa o que foi adicionado.
- **"No mapa" do cartão:** aceita qualquer objeto; se for de outro tipo, a ação vira daquele tipo.
- Prioridade quando há coisas uma em cima da outra: luz, porta, som, gatilho, token.
- Continuam pelo "+ Adicionar ação": armadilha, névoa, teletransporte e som de faixa (efeito, música, ambiente).

## Testes
- Escolher no mapa: luz, porta, token, som, gatilho → ação certa com o padrão certo; vários seguidos; Esc conclui; clique no vazio avisa e continua.
- Cartão de porta + clique numa luz vira ação de luz.
- `trig_ux.js`, `trig.js`, tutorial completo, 0 processos.

## Junto: destaque do alvo de cada ação
**Pedido:** "a seta do item que a trigger está apontando deveria ter algum destaque, por exemplo… qual é a luz 1? não tem como saber" (print: 9 ações "Luz (Luz)" e linhas iguais).
- Cada alvo no mapa ganha uma **etiqueta com o número da ação** (o mesmo do cartão); um objeto com várias ações mostra "3,7".
- A ação **aberta** ou com o **mouse em cima do cartão** fica em foco: linha rosa, grossa, com brilho (e um anel no token); as outras ficam apagadas.
- Luzes novas nascem **numeradas** ("Luz 1", "Luz 2", "Escuridão 1", "Holofote 1"…). As antigas mantêm o nome.

## Resultado
Concluído (falta o usuário testar).
- `Board.anyObjectAt` (luz, porta, som, gatilho, token), `B.pick(..., {multi, exclude})`, `Triggers.actionFromPick` (tipo, alvo e o contrário do estado atual), faixa "Concluir" no mapa, "No mapa" dos cartões converte o tipo.
- Etiquetas numeradas e foco nas ligações (`actionTargets` com número; `UI.trigHover`/`trigEdit`).
- **Testado:** `trig_pick.js` (5 objetos → Luz·Apagar, Porta·Abrir, Goblin·Aparecer, Som·Desligar, Gatilho·Ligar; vazio avisa e continua; Esc e Concluir; porta→luz no cartão), foto `trig_links.js` (9 luzes iguais, foco no 3: "3,7"), `trig_ux`, `trig`, `lights`, tutorial completo; 0 processos.
