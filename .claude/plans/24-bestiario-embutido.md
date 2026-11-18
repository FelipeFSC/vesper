# Plano 24 · Bestiário embutido

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Eu quero adicionar um bestiário embutido, vai ser o nosso ponto 0 do sistema, quero alguns monstros para o mestre não precisar ficar criando TODOS, ele se preocupar só com os jogadores e coisas extras. Eu quero o máximo de informações tanto de monstros quanto de NPC e as imagens também, vai ajudar bastante, eu acho que é saudável ter um json de base, mas se tiver ideia melhor eu aceito."

## Objetivo
O Vésper passa a vir com um **bestiário pronto**: centenas de criaturas e NPCs com atributos, PV, defesa e ações que já funcionam na mesa (atacar, resistir, área).

O mestre procura, vê o bloco completo, e com um clique a criatura vira uma ficha da campanha ou um token no mapa. Ele só cria do zero o que for dele.

## O que existe por aí (pesquisado)
| Fonte | O que tem | Licença | Usamos? |
|---|---|---|---|
| **SRD 5.2** (D&D 2024), em JSON pelo projeto 5e-bits (`5e-srd-api`) | **341 criaturas**, 26 delas NPCs prontos (guarda, bandido, capitão, mago, arquimago, sacerdote, acólito, cavaleiro, nobre, espião, batedor, gladiador, pirata, cultista, plebeu…). Cada uma tem atributos, CA, PV e dados de vida, deslocamento, sentidos, idiomas, resistências e imunidades, ND e XP, perícias, habilidades, ações com bônus de ataque e dados de dano, CD de resistência, ações bônus, reações e lendárias | Conteúdo: **CC-BY-4.0** (só pede o crédito). Código do projeto: MIT | **Sim, é a base** |
| SRD 5.1 (2014), mesmo projeto | 334 criaturas, quase as mesmas | CC-BY-4.0 | Não (a 5.2 é a atual) |
| Open5e | Milhares de criaturas de terceiros (Kobold Press: Tome of Beasts 1-3, Creature Codex…) | OGL 1.0a | Depois, como pacote extra (ver "Fica para depois") |
| Imagens do 5e API | Uma por criatura | **Sem licença clara e geradas por IA, com defeitos** (o "goblin" vem com "GOOBIBN" escrito em cima) | **Não** |
| **game-icons.net** | Mais de 4.000 ícones de fantasia em SVG (cabeça de goblin, dragão, lobo, esqueleto, aranha, cavaleiro, mago…) | **CC-BY-3.0** (só pede o crédito dos autores) | Não (o usuário preferiu imagens de verdade, da pasta local) |

**Imagens (decidido com o usuário):** não existe um banco de arte de monstros livre e bonito. Por isso as imagens são **locais**:
- ficam numa pasta no computador, **fora do git** (`imagens/bestiario/`);
- quem quiser a pasta recebe dela por fora (o usuário zipa e manda);
- o repositório só leva os status e os textos do SRD, que são livres.

Fontes de imagem que servem para essa pasta, todas para uso pessoal:
- **Forgotten Adventures:** mais de 660 tokens grátis;
- **2-Minute Tabletop:** pacotes "pague quanto quiser" e um editor com mais de 1.000 tokens;
- amostras do Tom Cartos e pacotes do itch.io;
- imagens próprias.

Várias criaturas usam o mesmo desenho (4 idades de dragão, aranha e aranha gigante, enxames, NPCs com retratos humanos genéricos). Assim, as 341 viram uns 260 a 290 desenhos.

## Proposta

### Ideia melhor que "um JSON solto"
1. **Base embutida:** um arquivo `data/bestiario.js` com as 341 criaturas já **convertidas para o formato da ficha do Vésper** (não o formato do D&D).
   - É `.js`, e não `.json`, para funcionar abrindo o `index.html` direto do computador, sem servidor. O navegador não deixa ler um `.json` local.
   - Só é carregado quando o bestiário é aberto, para não pesar na abertura da mesa.
2. **Meu bestiário:** o mestre pode **salvar qualquer ficha** (uma criatura editada, um NPC que ele criou) no bestiário. Isso fica neste navegador e aparece em **todas as campanhas**.
   - Esse é o "ponto 0" crescendo com o uso: o bestiário oficial mais o dele.
   - Dá para exportar e importar o "Meu bestiário" como arquivo, para levar a outro computador ou passar a alguém.
3. **O formato é o da ficha.** Qualquer outra fonte (Open5e, outro sistema) só precisa de um conversor para esse formato. A base não fica presa ao D&D.

### Como a criatura vira ficha
| D&D (SRD) | Vésper |
|---|---|
| FOR, DES, CON, INT, SAB, CAR | Atributos Força … Carisma com o **modificador** (FOR 18 → `Força 4`), que é o que as fórmulas usam (`1d20+@forca`) |
| CA | Atributo **Defesa** |
| PV e dados de vida | Barra **PV**. Os dados de vida ficam guardados, e há a opção **"Rolar PV de cada token"** (6d8+6 → cada goblin com um PV diferente) |
| Ataque ("+4 para acertar, 1d6+2 cortante") | Ação **Ataque**: `1d20+4` contra Defesa, dano `1d6+2` na barra PV, com **alcance** lido do texto (corpo a corpo 1 quadrado, distância 80/320 pés → 16 quadrados) |
| Sopro, veneno, magia com CD ("CD 13 de Destreza, cone de 9 m, metade se passar") | Ação **Resistência**: CD 13, atributo Destreza, dano, metade ou nada se passar, **área** lida do texto (cone de 30 pés → área de 3 quadrados) |
| Cura | Ação **Cura** |
| Ataques múltiplos, habilidades, reações, lendárias | Ação **Só rolar**, com o texto na descrição. O mestre lê e decide |
| Tamanho (Pequeno … Colossal) | Tamanho do token (½, 1, 2×2, 3×3, 4×4, 6×6) |
| Tipo, tendência, deslocamento, sentidos, idiomas, resistências e imunidades, perícias, ND, XP, equipamento | **Bloco de referência** nas notas da ficha, organizado, para o mestre consultar no jogo |
| Visão no escuro | Visão no escuro do token (o Vésper já tem), em quadrados |
| Humanoides de NPC (guarda, mago…) | Tipo **NPC**; os outros entram como **Criatura** |

Quando não dá para ler o texto com segurança, a ação entra como "Só rolar" com o texto inteiro. Assim nunca sai uma regra errada.

### Tradução
O SRD é em inglês e o Vésper é todo em português. **Proposta: traduzir tudo** (nomes, habilidades, ações, descrições e o bloco de referência), uma vez só, ao montar o `bestiario.js`.
- Os nomes seguem os termos já conhecidos no Brasil (Goblin, Orc, Dragão Vermelho Adulto, Observador… "Classe de Armadura" vira Defesa na ficha).
- São 341 criaturas: faço em lotes e confiro cada lote com um teste (toda fórmula válida, toda ação com os campos certos).

### Imagens da pasta
- **Ligar a pasta:** no bestiário, **Escolher pasta de imagens**, uma vez só. É o mesmo recurso da pasta de músicas: o navegador lembra a pasta e, no máximo, pede para confirmar o acesso de novo ao abrir. Funciona no Edge e no Chrome.
- **O sistema acha pelo nome do arquivo, com folga:**
  - ignora maiúsculas, acentos, `-` e `_`, números e letras de variação (`_A1`, `-01`) e palavras como "token";
  - vale o nome em português e o original em inglês (`goblin`, `Goblin_Warrior_A1.png`, `dragao-vermelho-adulto.webp`, `Red_Dragon.png`);
  - subpastas também contam.
- **Uma imagem para o grupo:**
  - a mais exata ganha (`dragao-vermelho-adulto`);
  - senão vale a do grupo: `dragao-vermelho` serve para as 4 idades, `aranha` serve para a aranha gigante, e o enxame usa a do bicho.
- **Ligar à mão:** na prévia da criatura, **Escolher imagem** abre a lista da pasta, com busca e miniaturas. A escolha fica salva neste navegador e vale também nas outras campanhas.
- **Cobertura à vista:** o bestiário mostra "**287 de 341 com imagem**", e o filtro "Sem imagem" lista as que faltam.
- **Na campanha:**
  - quando a criatura vira ficha, a imagem é convertida para WebP (512 px) e entra na campanha como qualquer imagem de token;
  - por isso os jogadores a recebem pela rede, e ela vai junto no arquivo exportado da campanha;
  - a pasta só é lida no computador do mestre.
- **Sem imagem:** o retrato padrão, com a letra e a cor do tipo da criatura.
- **Navegador sem o recurso de pasta** (Firefox): **Escolher imagens** aceita vários arquivos de uma vez, com o mesmo casamento pelo nome. Eles valem até fechar a página.

### Janela "Bestiário" (na mesa, só o mestre)
Aberta pela aba **Fichas** (botão **Bestiário**) e por um atalho na barra.
```
┌ Bestiário ──────────────────────────────────────────────────────────┐
│ [buscar…]  Tipo [▾]  ND [0 – 30]  Tamanho [▾]  [Meu] [Sem imagem]   │
├──────────────────────────────┬──────────────────────────────────────┤
│ (ícone) Goblin       ND ¼    │  (retrato) Goblin                    │
│ (ícone) Guarda       ND ⅛    │  Humanoide Pequeno · ND ¼ (50 XP)    │
│ (ícone) Lobo         ND ¼    │  Defesa 15 · PV 10 (3d6) · 9 m       │
│ (ícone) Ogro         ND 2    │  FOR -1 DES +2 CON 0 INT 0 SAB -1 …  │
│ …                            │  Ações: Cimitarra +4, 1d6+2 …        │
│                              │  [Adicionar à campanha] [No mapa]    │
└──────────────────────────────┴──────────────────────────────────────┘
```
- **Filtros:** busca por nome (também em inglês, para quem conhece o nome original), tipo, faixa de ND, tamanho, e "Meu bestiário".
- **Prévia:** o bloco completo, do jeito que o mestre está acostumado a ler.
- **Adicionar à campanha:** a criatura vira uma ficha na aba Fichas, editável como qualquer outra. Ela não muda o bestiário.
- **Colocar no mapa:** cria a ficha, se ainda não existe, e põe o token no centro da tela. Também dá para **arrastar** da lista para o mapa, como as fichas.
- Uma criatura já adicionada não duplica: a ficha da campanha é reaproveitada.
- **Na ficha:** "Salvar no meu bestiário" (aba Configurar).

### Créditos (obrigatórios pelas licenças)
- No rodapé do bestiário, na wiki e no README: "Contém material do System Reference Document 5.2, da Wizards of the Coast LLC, sob a licença CC-BY-4.0".
- As imagens da pasta não vão no repositório. Quem usa um pacote é responsável pelo crédito que ele pede (por exemplo, o Forgotten Adventures pede um link).
- Cada ficha vinda do bestiário guarda a origem (`source: 'SRD 5.2'`).

### O que não entra
- **Arte oficial do D&D:** é protegida.
- **Monstros fora do SRD** (Observador/Beholder, Devorador de Mentes, Githyanki…): a Wizards não liberou. Quem tiver o livro cria na mão ou salva no "Meu bestiário".
- **Regras de 5e que o Vésper não tem** (vantagem automática, condições, reações, ações lendárias por turno): entram como texto para o mestre aplicar.

## Perguntas para o usuário
1. **Tradução:** traduzo tudo para o português (nomes, habilidades e descrições)? *Recomendo que sim.* A alternativa é traduzir só nomes e números e deixar os textos longos em inglês, que é bem mais rápido.
2. ~~Retratos~~ **Respondido:** imagens locais numa pasta fora do git ("vou evitar dor de cabeça… quem quiser a pasta eu zipo e mando").
3. **Atributos com o modificador** (FOR 18 → Força 4), com o valor cheio no bloco de referência? *Recomendo que sim*, porque é o que as fórmulas usam.
4. **"Meu bestiário"** (salvar fichas para todas as campanhas, exportar e importar): entra agora? *Recomendo que sim*, é o que faz o bestiário crescer.
5. **Página "Criar ficha":** ganha "Começar de uma criatura do bestiário" agora ou depois? *Recomendo depois*, porque você disse que ainda vamos trabalhar nessa página. (Ver as respostas abaixo.)

## Respostas do usuário
1. **Tradução:** sim, tudo.
2. **Atributos:** "importar tudo e depois eu vejo". O arquivo guarda o **valor e o modificador** (`Força 18` e `+4`). Por enquanto a ficha usa o **modificador**, para as rolagens saírem certas sem mudar o sistema, e o valor fica no bloco de referência. Trocar depois é só mudar o conversor.
3. **Meu bestiário:** sim, **uma coleção só**, salvando ficha por ficha. Sem exportar nem importar a coleção inteira por enquanto.
4. **Página "Criar ficha":** sim, um botão **A partir do bestiário** junto dos botões de ficha nova. A página continua abrindo vazia.
5. **Imagens:** locais, numa pasta fora do git.

### Ordem de trabalho
1. **Parte mecânica:**
   - conversor com os textos em inglês;
   - janela do bestiário;
   - pasta de imagens;
   - Meu bestiário;
   - Rolar PV;
   - botão na página de ficha;
   - testes.
2. **Tradução**, em lotes:
   - as frases que seguem sempre o mesmo modelo (ataque, teste de resistência, dano, alcance) são traduzidas por regra no conversor;
   - o resto vai para um dicionário (`tools/srd/traducao/*.json`) que eu preencho lote a lote;
   - as medidas passam de pés para metros, como nos livros em português (5 pés = 1,5 m).

## Fica para depois
- **Pacotes extras:** criaturas da Kobold Press (OGL), com o mesmo conversor, como um arquivo opcional.
- **Outros sistemas:** é só um conversor para o formato da ficha.
- **Encontro aleatório por ND** ("4 jogadores de nível 3 → sugere um grupo").

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `data/bestiario.js` (novo) | As 341 criaturas no formato da ficha, em português, com o bloco de referência, os dados de vida e o ícone |
| `tools/converter-srd.js` (novo) | Script que lê o JSON do SRD 5.2, converte para o formato da ficha e confere tudo. Fica no projeto para refazer se a base mudar; a tradução fica num arquivo ao lado |
| `js/bestiary.js` (novo) | `App.Bestiary`: carrega a base quando precisa, busca e filtros, pasta de imagens (`showDirectoryPicker`, como a pasta de músicas), casamento pelo nome, ligação à mão, cobertura, adiciona à campanha (imagem → WebP), coloca no mapa e mantém o "Meu bestiário" (IndexedDB, chave `bestiario`) |
| `.gitignore` | `imagens/bestiario/**` fora do git (fica só um `.gitkeep`, para a pasta existir) |
| `js/ui.js` | Janela Bestiário, botão na aba Fichas, "Salvar no meu bestiário" na ficha |
| `js/board.js` | Arrastar uma criatura do bestiário para o mapa |
| `js/store.js` | Rolar PV de cada token (opção na ficha, usada ao criar o token) |
| `css/style.css` | Janela do bestiário |
| `index.html` | Script `js/bestiary.js` (os arquivos de `data/` são carregados na hora) |
| `README.md` e `wiki/index.html` | Créditos (obrigatórios); seção da wiki quando você finalizar |

## Tutorial, wiki e README
- **Créditos:** entram já no README e no rodapé do bestiário, porque as licenças exigem.
- Passo do tutorial e seção da wiki ficam para quando você testar e finalizar.

## Testes
- **Conversor:** as 341 criaturas convertem. Toda fórmula passa no `Dice.check`, todo ataque tem bônus e dano, e toda resistência tem CD, atributo e dano.
- **Exemplos conferidos à mão:**
  - **Goblin:** Defesa 15, PV 10, Cimitarra `1d20+4` / `1d6+2`, Arco com alcance 16.
  - **Dragão Vermelho Adulto:** sopro com CD, Destreza, área e metade se passar.
  - **Guarda:** é NPC.
  - **Lobo:** tamanho 1 e visão no escuro.
- **Imagens:** pasta de teste com nomes de vários jeitos (`Goblin_A1.png`, `dragao-vermelho.webp`, `Red_Dragon_Adult.png`, subpasta). Conferir que casa o certo, que o grupo vale para as idades, que a escolha à mão fica salva e que a cobertura conta certo. A ficha leva a imagem em WebP e o jogador a recebe.
- **Na mesa:**
  - adicionar à campanha cria a ficha e não duplica;
  - colocar no mapa e arrastar para o mapa;
  - atacar com a criatura importada contra um token calcula certo;
  - Rolar PV dá valores diferentes a tokens da mesma ficha;
  - busca e filtros;
  - "Meu bestiário" salva, aparece em outra campanha, exporta e importa;
  - os créditos aparecem;
  - jogador não vê o bestiário.
- **Desempenho:** abrir a mesa não carrega a base; abrir o bestiário carrega rápido.
- Regressão completa, tutorial completo e 0 processos.

## Resultado
- **Base:** `data/bestiario.js`, com 341 criaturas (26 NPCs), cerca de 540 KB. É gerada por `tools/converter-srd.js` a partir de `tools/srd/5e-SRD-Monsters-2024.json`.
  - **618 ações já mecânicas:** 440 ataques, 175 testes de resistência (com área e metade/nada se passar) e 3 de dano direto.
  - O dano condicional ("+1d4 se teve Vantagem") fica só no texto; o dano da ação é o garantido.
  - Ataques múltiplos, magias, reações e ações lendárias ficam no bloco de referência das notas.
- **Tradução:** completa, sem nenhum texto pendente.
  - As regras do conversor cuidam das frases de modelo (jogada de ataque, teste de resistência, dano, medidas em metros).
  - O resto está em 15 lotes de dicionário em `tools/srd/traducao/`, com 2.324 textos.
  - Os termos seguem os livros em português: Caído, Impedido, Amedrontado, Corruptor, Limo, Corpo-seco, Aparição…
- **Ficha:**
  - os atributos guardam o modificador, e o valor cheio fica no bloco;
  - Defesa = CA e PV = barra;
  - o tamanho do token e a visão no escuro já vêm preenchidos;
  - os dados de vida ficam guardados, com **Rolar PV de cada token** (opção na ficha);
  - a origem é guardada (`source`, `bestiaryId`).
- **Janela Bestiário** (aba Fichas → Bestiário, só o mestre):
  - busca em português ou em inglês;
  - filtros por tipo/NPC, ND, tamanho, Meu bestiário e Sem imagem;
  - prévia com o bloco completo e um ícone nas ações automáticas;
  - Colocar no mapa, Adicionar à campanha (sem duplicar) e arrastar para o mapa;
  - o crédito do SRD no rodapé.
- **Imagens locais:**
  - **Escolher pasta de imagens**, com o mesmo recurso da pasta de músicas; ela fica fora do git, em `imagens/bestiario/`;
  - o nome do arquivo casa com folga (português ou inglês, em qualquer ordem, sem `_A1`, `-01` nem "token");
  - um arquivo de grupo serve para as idades do dragão, para a versão gigante e para o enxame;
  - **Escolher imagem** liga uma imagem à mão, e a escolha fica salva;
  - a cobertura aparece em "N de 341 com imagem".
- **Meu bestiário:** "Salvar no meu bestiário" na ficha (Configurar). Fica no navegador e vale para qualquer campanha, com a imagem junto.
- **Página "Criar ficha":** **A partir do bestiário**. A página continua abrindo vazia.
- **Armazenamento:** no banco da mesa (`mesarpg`/`kv`), com as chaves `bst-pasta`, `bst-ligacoes` e `bst-meu`, fora da campanha.
- **Testes:**
  - `bestiario.js` (mesa) e o trecho novo de `ficha.js` (página, incluindo a gravação no navegador);
  - o Edge de teste não responde ao IndexedDB na mesa sob o tempo virtual, por isso a gravação é conferida na página de ficha.
- **Créditos:** no README e no rodapé do bestiário.
- **Pendente:** endereço de imagens online (modelo com `{nome}`), aguardando o usuário.
