# Plano 8 · Pontos de luz e de escuridão

**Status:** Concluído
**Versão:** 1.1
**Pedido do usuário:** "agora vamos adicionar pontos de luz, pode ser uma area, pode ser circular ou em cone, a area vai iluminar 100%, o cone tem um range onde tem o ponto de luz e vai ter penumbra, tanto no cone quanto no circulo e o quadrado, pode ser o contrario também, ponto de escuridão, sobre a luz, se possivel adicionar cor na luz."

## Objetivo
O mestre coloca **luzes presas ao mapa**, sem precisar de um token: um lustre (círculo), um holofote ou uma janela com luz entrando (cone), uma sala inteira iluminada (área). Cada luz pode ter **cor** e **penumbra**. O contrário também existe: **pontos de escuridão**, que apagam a luz onde estão.

## Como funciona hoje
- A luz só vem dos **tokens** (`t.light = {bright, dim}` em quadrados, presets Vela, Tocha, Lanterna, Fogueira) em `js/light.js`.
- `sources()` lista as fontes. `drawLights()` desenha cada uma como um círculo: 100% até `bright`, cerca de 50% até `dim` (a penumbra), recortado pelo polígono de visibilidade (`visibility`), ou seja, as paredes fazem sombra.
- `L.render` monta a escuridão como "tudo menos (iluminado ∩ linha de visão)". `pointVisible` faz a mesma conta para a mira do combate.
- A cor é fixa: um brilho alaranjado fraco por cima de toda luz (`rgba(255,170,80,0.16)`).
- Cena **clara** (`sc.light.global`): tudo iluminado; para o mestre, `L.render` nem desenha.

## Proposta

### Formas
| Forma | Como se desenha | Luz plena | Penumbra |
|---|---|---|---|
| **Círculo** | clicar no centro e arrastar até o raio | até o raio de luz plena (ex.: 4 quad.) | do raio pleno até o raio total (ex.: 8 quad.), caindo para cerca de 50% |
| **Cone** | clicar na origem e arrastar para a direção e o alcance | dentro do ângulo (padrão 60°) até o alcance pleno | no fim do alcance **e** nas bordas laterais (padrão 10° de borda suave de cada lado) |
| **Área** | arrastar um retângulo (ou clicar nos cantos, modo polígono, igual à Sala de som) | 100% dentro da área inteira | faixa opcional em volta da área (padrão 0, em quadrados) |

- **Círculo e cone** saem de um ponto, então as **paredes fazem sombra**, com a mesma regra da luz dos tokens: a parede absoluta e a cobertura total bloqueiam; ¾ e meia deixam passar.
- **Área** ilumina o que está dentro dela por igual e ignora paredes (a área já é o contorno que o mestre desenhou).

### Cor
- Seletor de cor com atalhos: **Quente** (tocha, o padrão), **Branca**, **Lua** (azulada), **Verde**, **Vermelha**, **Roxa**, além da cor livre.
- **Intensidade da cor** (0 a 100%, padrão 40%): quanto o chão fica tingido. A cor é só visual: não muda o que é visto nem as regras.
- A luz dos tokens continua com o brilho quente de hoje. Cor para a luz do token pode entrar depois.

### Escuridão
- Mesmas três formas, com o tipo **Escuridão** em vez de **Luz**.
- Onde há escuridão, **nenhuma luz vale** (nem de pontos, nem de tokens), e funciona inclusive numa cena clara (dia), como uma magia de escuridão.
- Na borda da escuridão há penumbra do mesmo jeito (fica meio escuro).
- O jogador não vê nada lá dentro (só o que a regra da pergunta 2 permitir), e quem está dentro também não pode ser alvo de quem não o vê (`pointVisible`).

### Ligar e desligar
- Cada ponto tem **Acesa / Apagada** (o mestre apaga o lustre quando o vilão corta a corda, ou liga a escuridão mágica na hora certa).
- Só o mestre liga e desliga (é controle de clima: interface **e** `permit()`).

### Ferramenta e painel (mestre)
- Ferramenta nova **Luz** (tecla `U`) na barra do mestre. Nas opções: **Luz / Escuridão**, forma (**Círculo / Cone / Área**), e a forma da área (**Retângulo / Polígono**).
- O mestre vê um marcador (ícone de lâmpada, ou de lua para a escuridão) e o contorno tracejado da forma. Os jogadores veem só o efeito, sem marcador.
- Ao clicar no marcador (ferramenta Selecionar ou Luz): moldura com alças para **mover**, **mudar o raio/alcance** e, no cone, **girar a direção**.
- **Painel da luz** à direita, como o da imagem: nome, Luz/Escuridão, Acesa/Apagada, raio pleno e raio total (ou alcance e ângulo do cone, ou borda da área) em quadrados, cor e intensidade da cor, **Duplicar** e **Apagar**. `Delete` apaga e `Ctrl+D` duplica.
- **Presets** no painel para começar rápido: Vela, Tocha, Lanterna, Fogueira (os mesmos do token), Holofote (cone) e Sala acesa (área).
- A aba **Camadas** ganha a linha **Luzes** (o olho esconde os marcadores só na tela do mestre).

### Exemplos
- **Lustre** no meio do salão: círculo com 6 quad. de luz plena e 10 no total, cor Quente. A coluna no meio do salão faz sombra.
- **Janela ao luar:** cone saindo da janela, 8 quad., 50°, cor Lua.
- **Taverna inteira acesa:** área no contorno da taverna, cor Quente a 30%. Lá fora continua escuro.
- **Magia de Escuridão:** círculo de escuridão com 3 quad. no meio da batalha. A tocha do guerreiro não ilumina lá dentro.

## Decisões do usuário
1. **Penumbra na área:** opcional (padrão 0).
2. **Três níveis de luz no sistema inteiro:** **Luz plena** (vê tudo), **Meia luz** (vê mais ou menos, escurecido) e **Escuridão** (preto). Quem tem **visão no escuro** vê **um nível acima** dentro do alcance dela: escuridão vira meia luz e meia luz vira luz plena. Vale também dentro de um ponto de escuridão (o miolo é escuridão; a borda é meia luz). Não existe "escuridão mágica" separada.
3. **A área respeita paredes:** sim. A área ilumina a partir de vários pontos de dentro dela; paredes que bloqueiam a luz (absoluta e cobertura total) fazem sombra e não deixam a penumbra vazar.
4. **Quem acende e apaga:** só o mestre por enquanto (voltar ao assunto depois).
5. **Tremular:** sim, opção por luz (pontos e tokens), só visual.
6. **Cor na luz dos tokens e cone preso ao token:** entram neste plano. O cone do token aponta para onde ele andou por último (o reducer guarda `t.facing`); o mestre e o dono do token também podem girar no painel do token.

## Perguntas para o usuário (respondidas acima)
1. **Penumbra na área.** Você disse "a área vai iluminar 100%". A área também deve ter uma faixa de penumbra em volta, opcional e configurável? *(Recomendo: sim, opcional, com padrão 0, ou seja, sem penumbra.)*
2. **Visão no escuro dentro da escuridão:**
   - (a) Ninguém vê dentro, nem com visão no escuro (como a magia Escuridão do D&D).
   - (b) A visão no escuro enxerga dentro.
   - (c) Uma opção em cada ponto: escuridão **comum** (a visão no escuro vê) ou **mágica** (ninguém vê).

   *(Recomendo: c, com padrão mágica.)*
3. **A área respeita paredes?** Recomendo que **não**: ela ilumina por igual o que o mestre desenhou. A alternativa é a luz da área não atravessar paredes absolutas, o que é mais pesado e raramente necessário.
4. **Quem acende e apaga:** só o mestre (recomendado, é controle de clima), ou os jogadores também podem, como acontece com as portas (por exemplo, um interruptor ou uma tocha na parede)?
5. **Luz tremulando.** Quer uma opção **Tremular** (a vela e a tocha oscilam um pouco)? É só visual. *(Recomendo deixar para depois.)*
6. **Cor na luz dos tokens** (a tocha do personagem colorida) e **cone preso ao token** (lanterna que aponta para onde o personagem olha): entram aqui ou viram outro plano? *(Recomendo outro plano, para este não crescer demais.)*

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/store.js` | `sc.lights = [{id, name, kind: light\|dark, shape: circle\|cone\|area, x, y, bright, dim, dir, angle, soft, pts, edge, color, tint, on, magic}]` no `newScene` e no `migrate`; ações `lightpt.add`, `lightpt.update`, `lightpt.delete`; só o mestre no `permit()` (a não ser que a pergunta 4 libere `on`). |
| `js/light.js` | `sources()` inclui os pontos de luz acesos; desenho de cone (recorte angular com bordas suaves) e de área; camada de **escuridão** que apaga a máscara de luz (`destination-out`) depois das luzes; tingido de cor; `pointVisible` conhece cone, área e escuridão; `L.render` deixa de sair cedo na cena clara quando há escuridão ou cor. |
| `js/board.js` | Ferramenta `light` (tecla `U`): criar círculo, cone e área (retângulo e polígono); marcadores e contornos do mestre; seleção com alças (mover, raio, direção); `Delete` e `Ctrl+D`; camada "Luzes". |
| `js/ui.js` | Botão da ferramenta e opções; painel da luz (com presets e cor); linha "Luzes" na aba Camadas. |
| `css/style.css` | Painel e marcadores. |
| `js/icons.js` | Ícones Lucide `lamp` / `lightbulb`, `moon` e `cone` (se faltarem). |
| `js/storage.js` | Conferir que exportar e importar a cena leva `sc.lights`. |

## Tutorial, wiki e README
- **Tutorial:** passo novo "Pontos de luz": "Escolha a ferramenta Luz e coloque um círculo de luz no mapa". Ele conclui quando a cena tiver um ponto de luz, e o texto cita o cone, a área, a cor e a escuridão. O `walk.js` ganha a ação do passo.
- **Wiki:** em *Luz e visão*, uma seção "Pontos de luz e de escuridão" com foto de um mapa escuro com um círculo quente, um cone azulado e um círculo de escuridão, e foto do painel. Atalho `U` na tabela.
- **README:** no item *Luz e visão*: "pontos de luz no mapa (círculo, cone ou área, com cor) e pontos de escuridão".

## Testes
- Círculo com 4 de luz plena e 8 no total: um ponto a 3 quad. está iluminado, a 6 está na penumbra (visível) e a 9 está escuro. Uma parede absoluta no meio faz sombra.
- Cone de 60° para a direita com alcance 6: um ponto à frente a 4 quad. está iluminado; um ponto atrás ou fora do ângulo está escuro.
- Área retangular: ponto dentro iluminado (mesmo atrás de parede, se a resposta 3 for "não"), ponto fora escuro.
- Escuridão sobre a tocha de um token: o ponto dentro fica escuro e não pode ser alvo; funciona na cena clara; a visão no escuro segue a resposta 2.
- Apagada: não ilumina. Jogador tentando criar, mudar ou apagar pela rede é recusado (e acender, conforme a pergunta 4).
- O jogador não vê os marcadores. Exportar e importar a cena mantém as luzes. Fotos com cor para conferir o visual.
- Tutorial completo (`walk.js`) sem erros; `menus.js` com as opções da ferramenta numa tela baixa; 0 processos de teste.

## Resultado
Implementado com as 6 decisões acima.

**O que entrou**
- Três níveis de luz no sistema inteiro (plena, meia, escuridão); visão no escuro sobe um nível. A tela, a mira e a visibilidade dos tokens usam a mesma regra.
- Ferramenta **Luz** (`U`): Luz/Escuridão; Círculo, Cone ou Área (desenhada ponto a ponto; o modo retângulo saiu no Plano 9). Clique põe com valores padrão; arrastar escolhe alcance e direção.
- Marcadores (lâmpada, lua, cinza quando apagado), contorno tracejado, alças de alcance total e de luz plena, Shift gira de 15 em 15°. Dois cliques acendem/apagam; Delete; Ctrl+D.
- Painel: nome, tipo, acesa/apagada, forma, modelos (vela, tocha, lanterna, fogueira, holofote, sala acesa), raios, abertura e direção do cone, faixa de meia luz da área, cor (6 atalhos + livre), intensidade da cor, tremular. Aviso quando a iluminação da cena está desligada (com botão para ligar).
- Token: luz com cor, tremular e "Em cone" (abertura e 8 direções); o cone vira para onde o token andou. O jogador dono pode virar a lanterna; só o mestre dá ou tira luz.
- Camada "Pontos de luz (marcadores)" na aba Camadas. Exportar cena leva as luzes.
- Tutorial (passo "Pontos de luz" e o texto da tocha com os três níveis), wiki (tabela dos níveis, seção com 2 fotos, lanterna em cone, atalho `U`), README.

**Testado**
- `lights.js`: círculo 4/8 (3 → plena, 6 → meia, 9 → escuridão); parede absoluta faz sombra e meia parede deixa passar; cone 60° (frente, fim do alcance, atrás, borda a 35° = meia, 50° = nada, girado); área (dentro, faixa, fora; parede na borda segura a luz, parede de dentro não faz sombra); escuridão 2/3 sobre a luz (0 / meia / plena) e de dia; visão no escuro dentro da escuridão (meia) e na borda (plena); escuridão desligada; lanterna do token vira para cima ao andar; jogador não cria, apaga nem remove luz e não tira a luz do token, mas vira a própria lanterna; ferramenta, arraste, alça, cor, Ctrl+D, Delete, exportar, tremular.
- Fotos do mestre e do jogador (`lights_shot.js`), usadas na wiki.
- Tutorial completo (`walk.js`) sem erros; `menus.js` (opções da Luz cabem, rolando, em 1280×620); `fly.js`, `eye.js`, `high.js`, `cover.js`, `groups.js`, `pscene.js` sem mudança de resultado; 0 processos de teste.

**Limitações**
- Com alguma luz tremulando, o mapa redesenha o tempo todo (como numa animação); em computadores fracos, com muitas luzes, pode pesar. Desligar "Tremular" resolve.
- A borda lateral do cone é uma faixa fixa de 10° de meia luz (não é configurável).
- Área: os cantos não têm alças; para mudar o formato, apague e desenhe de novo (mover e a faixa de meia luz funcionam).
- A cor não aparece de dia (cena Clara), como a luz em geral.
