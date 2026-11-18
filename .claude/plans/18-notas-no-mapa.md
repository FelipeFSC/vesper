# Plano 18 · Notas no mapa (só o mestre)

**Status:** Implementado (testes do usuário)
**Versão:** 1.2
**Pedido do usuário:** escolheu: "Notas no mapa só para o mestre (Foundry, 'Map Notes'): um alfinete com o texto da sala ('Sala 3: o baú tem 50 po'). Ótimo para mapas de módulo."

## Objetivo
O mestre espeta alfinetes no mapa com o que precisa lembrar na hora: descrição da sala, tesouro, o que o NPC sabe, a CD do teste. Os jogadores nunca veem.

## Proposta
- Ferramenta **Nota** (tecla `N`, só o mestre): clique no mapa → alfinete com título e texto.
- **Alfinete:** ícone de pergaminho com o título curto ao lado ("Sala 3"). Cor escolhida entre algumas (ex.: dourado = sala, vermelho = perigo, verde = tesouro, azul = NPC).
- **Passar o mouse** mostra o começo do texto; **clicar** abre a nota numa janela pequena e arrastável (dá para deixar aberta durante a cena). O texto aceita várias linhas.
- Mover arrastando; `Delete` apaga; `Ctrl+D` duplica.
- **Lista de notas da cena** no quadro da ferramenta, com busca: clicar centraliza o mapa na nota.
- Camada **Notas** na aba Camadas (o olho esconde os alfinetes só na sua tela).
- Aparecem para o mestre também no modo Apresentar (dá para esconder pela camada).
- Vão junto ao exportar a cena. Entram no Ctrl+Z (Plano 17) e na seleção múltipla (Plano 20).

## Técnico
`sc.notes = [{id, x, y, title, text, color}]`; ações `note.add/update/delete` (só o mestre; o `permit` recusa de jogador). **Detalhe:** hoje o mestre manda a campanha inteira para todos (decisão da v1.0, "mesa entre amigos"), então o texto das notas chega ao navegador do jogador, só não aparece. Para notas secretas de verdade, o mestre deixaria de mandar `sc.notes` aos jogadores (pergunta 2).

## Decisões do usuário
- **Não enviar** as notas aos jogadores (nem chegam ao navegador deles).
- Cores: as sugeridas (dourado sala, vermelho perigo, verde tesouro, azul NPC).

## Perguntas (respondidas)
1. Nenhuma de regra: segue o pedido. Confirme as cores sugeridas, ou diga outras.
2. **Notas totalmente fora do navegador dos jogadores** (o mestre não envia), ou só escondidas na tela (como o resto hoje)? *(Recomendo não enviar: é simples e evita espiada pelo console.)*

## Testes
- Criar, editar, mover, duplicar, apagar; abrir em janela; lista com busca e centralizar.
- Jogador (e "ver como") não vê alfinete; a nota não chega ao jogador (se 2 = não enviar).
- Exportar e importar a cena; tutorial completo, 0 processos.

## Resultado
Implementado (falta o usuário testar; tutorial e wiki depois).
- Ferramenta Nota (`N`), alfinete com cor (Sala, Perigo, Tesouro, NPC) e título; mouse em cima mostra o texto; clique abre a janela (título, cor, texto, Centralizar, Duplicar, Apagar); arrastar move; Delete, Ctrl+D; lista com busca no quadro da ferramenta; camada "Notas (só você)"; resumo no painel.
- **Não vão aos jogadores:** `Net.playerState()` manda o estado sem notas; ações `note.*` e `undo.apply` de notas não saem do mestre.
- Entram no Ctrl+Z, na seleção múltipla e no exportar.
- **Testado** (`notes.js` + foto): criar, editar, hover, mover, abrir, busca, duplicar/apagar/desfazer, laço, rede (o jogador recebeu só a parede; nada de nota), "ver como" sem alfinete, exportar.
