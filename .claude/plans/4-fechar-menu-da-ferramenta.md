# Plano 4 · Fechar o menu da ferramenta com outro clique

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "Esses menus que abrem, por exemplo o da música, se eu clicar novamente deveria fechar, por que é legal a gente abrir fazer o que precisa e depois fechar" (print da barra de ferramentas com Parede, Imagem e Sala de som marcadas).

Ajuste pequeno de interface: executado direto, com o plano registrado.

## O que mudou
- Clicar de novo na ferramenta que já está ativa **fecha o quadro de opções e volta para Selecionar** (`renderToolbar` em `js/ui.js`).
- Vale para todas as ferramentas (com ou sem quadro de opções). Clicar duas vezes em Selecionar não muda nada.
- `Esc` continua fazendo o mesmo.
- Wiki: linha nova na tabela de atalhos.

## Testes
- `toggle.js`: Sala de som, Parede, Imagem, Desenho e Régua abrem no 1º clique e fecham, voltando para Selecionar, no 2º.
- Tutorial completo (`walk.js`) sem erros; 0 processos de teste.

## Resultado
Concluído.
