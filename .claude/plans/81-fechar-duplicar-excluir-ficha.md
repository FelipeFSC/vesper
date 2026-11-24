# Plano 81 · Fechar, duplicar e excluir ficha à vista (página e mesa)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Está faltando um botão de deletar ou voltar aqui, eu tentei tirar o monstro antigo para ver o novo e eu não consegui, agora tenho 2 do mesmo, esse crud que foi feito está meio mal feito"

Print: página "Criar ficha" com a Tarrasque (ficha de criatura 5e) aberta, abas Bloco, Descrição e Configurar. Na lista da esquerda há duas "Tarrasque" iguais. Não há botão de fechar, excluir ou voltar à vista.

## Objetivo
Em qualquer ficha aberta, nas duas telas, dá para **fechar**, **duplicar**, **exportar** e **excluir** sem procurar. E dá para excluir ou duplicar uma ficha **direto da lista**, sem abrir.

## Como funciona hoje
- **Página "Criar ficha"** (`js/ficha.js`, `footer`): Exportar, Duplicar e Excluir ficam no **fim da ficha genérica** (depois de Barras, Atributos, Ações e Notas). Na **5e**, ficam só dentro da aba **Configurar**, depois de tudo. Não há como fechar a ficha e voltar à tela inicial da página. A lista da esquerda (`renderSide`) só abre a ficha.
- **Mesa** (`js/ui.js`): a janela tem o X. Duplicar, Exportar e Excluir ficam no rodapé da aba **Configurar** (genérica e 5e). A lista de fichas só abre e coloca no mapa.
- Excluir pede confirmação (`confirm`).

## Proposta
### Página "Criar ficha"
- **Barra de ações no topo da ficha**, à direita, sempre visível, em qualquer aba, na genérica e na 5e (no lugar onde hoje fica só o botão de imagem):
  ```
                                         [Exportar] [Duplicar] [Excluir] [X]
   (o)  Tarrasque
        Gargantuan Monstrosity…
  ```
  - **X (Fechar):** fecha a ficha e volta à tela inicial da página ("Escolha uma ficha na lista", com os botões de criar). A ficha continua salva.
  - **Duplicar:** cria a cópia "(cópia)" e abre a cópia.
  - **Exportar:** igual a hoje.
  - **Excluir:** veja a pergunta 1. Depois de excluir, volta à tela inicial da página.
  - O rodapé antigo (fim da genérica e fim do Configurar da 5e) sai, para não ter dois lugares.
- **Na lista da esquerda:** cada ficha ganha um botão **⋯** (aparece ao passar o mouse e fica sempre à vista no celular) e o **clique direito**, com: Abrir, Duplicar, Exportar e Excluir. Assim dá para apagar a Tarrasque repetida sem abrir.

### Mesa (a mesma ideia, pela regra das duas telas)
- **Janela da ficha:** Duplicar, Exportar e Excluir (este só para o mestre) viram ícones na barra do topo da janela, ao lado do X, em qualquer aba. "Colocar no mapa" e "Salvar no meu bestiário" continuam no Configurar.
- **Lista de fichas:** o mesmo **⋯** e clique direito: Abrir, Colocar no mapa, Duplicar, Exportar e Excluir (mestre).
- Excluir na mesa continua pedindo confirmação, porque apaga também os tokens no mapa e tira do combate (já avisa quantos).

## Perguntas para o usuário
1. **Excluir na página "Criar ficha":** (a) **exclui na hora e mostra "Ficha excluída · Desfazer" por alguns segundos** (recomendo: é rápido e, se errar, desfaz); (b) pergunta "Excluir a ficha?" antes, como hoje.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/ficha.js` | barra de ações no topo (genérica e 5e), fechar ficha, excluir com Desfazer, menu ⋯ e clique direito na lista; rodapé antigo sai |
| `js/ficha5e.js` | lugar para a barra de ações no topo da ficha 5e (as duas telas usam) |
| `js/ui.js` | ícones na barra da janela da ficha; menu ⋯ e clique direito na lista de fichas da mesa; rodapé do Configurar sem Duplicar, Exportar e Excluir |
| `css/ficha.css`, `css/style.css` | barra de ações, botão ⋯ |

## Tutorial, wiki e README
- Ficam para quando você der a função por finalizada (combinado).

## Testes
- Página, genérica e 5e (personagem e criatura): a barra aparece em todas as abas; Fechar volta à tela inicial e a ficha continua na lista; Duplicar abre a cópia; Excluir tira da lista e Desfazer traz de volta igual (com imagens).
- Lista da página: ⋯ e clique direito excluem a segunda Tarrasque sem abrir; a aberta continua aberta.
- Mesa: ícones na barra da janela (mestre vê Excluir, jogador não); lista com ⋯ e clique direito; excluir apaga os tokens com confirmação.
- Fotos da página e da janela.
- `ficha.js`, `ficha5e.js`, `imagens_pagina.js`, `pagina_arte.js`, `walk.js` sem erros; 0 processos no fim.

## Resposta do usuário
"Vai deletar como é hoje no caso, vai remover mas ainda vai estar no bestiário… deixa como já é hoje, o excluir não sumir com o bicho para sempre": excluir pergunta antes, como hoje, e não mexe no bestiário.

## Resultado
Implementado em 24/11/2026.
- **Excluir** continua perguntando antes, nas duas telas. Tira só a ficha (na mesa, também os tokens dela, com o aviso de antes). **O bestiário não muda** (conferido: `actor.delete` e a página não tocam nele). Para ficha de criatura ou NPC vinda do bestiário, a pergunta avisa "A criatura continua no bestiário."
- **Página "Criar ficha"** (`js/ficha.js`, `css/ficha.css`):
  - barra `.fp-sheetbar` no topo da ficha, em qualquer aba, genérica e 5e: Exportar, Duplicar, Excluir e X (fecha e volta à tela inicial; a ficha continua na lista);
  - na lista, cada ficha tem o ⋯ (aparece ao passar o mouse e na ficha aberta; sempre à vista em tela de toque) e o clique direito: Abrir, Duplicar, Exportar e Excluir. A ficha da lista virou `div` com `role="button"` (Enter e espaço abrem), porque um botão não pode ficar dentro de outro;
  - o rodapé antigo (`footer`) saiu.
- **Mesa** (`js/ui.js`, `css/style.css`):
  - ícones Duplicar, Exportar e Excluir na barra da janela da ficha, antes do X, em qualquer aba (`.win-acts`). Jogador vê só Exportar;
  - lista de fichas com o ⋯ e o clique direito: Abrir, Colocar no mapa, Duplicar, Exportar e Excluir (`UI.actorMenuItems`; Duplicar e Excluir só para o mestre);
  - o rodapé do Configurar ficou com Colocar no mapa e Salvar no meu bestiário.
- **Menu flutuante como peça comum:** o desenho do menu do botão direito (Plano 28) passou de `js/ctxmenu.js` para `js/util.js` (`U.menu`, `U.closeMenu`), para a página usar também. O menu do mapa continua igual.

**Testes**
- `ficha_acoes.js` (página, novo) e `ficha_acoes_mesa.js` (mesa, novo): todos os casos sem erros. Fotos conferidas.
- `ficha.js` e `ficha5e.js` (ajustados para a barra nova), `imagens_pagina.js`, `pagina_arte.js`, `ctxmenu.js`, `ficha5e_mesa.js`, `toolmenu.js`, `imagens.js` e `walk.js` (Pronto): sem erros.
- 0 processos no fim.
