# Plano 45 · Cadastro de magias

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Eita, esqueci das magias, vamos voltar então, onde entra a magia na ordem de prioridade?" → recomendação aceita ("Perfeito, pode iniciar"): **Magias → Talentos → Antecedente → Espécie → Opções de classe → Classe → Subclasse**. O Plano 44 (Talentos) fica para depois deste.

## Objetivo
Uma aba **Magias** na página "test": pesquisar, criar, editar, duplicar e apagar, já com as magias do 5etools. Os outros cadastros (talentos, espécies, classes) vão apontar para elas. As magias com ataque ou teste de resistência aparecem também em **Ataques**, montadas a partir da magia, como já acontece com as armas.

## Como funciona hoje
- Página `cadastros.html` com as abas Ataques e Itens; padrões em `data/cadastros/*.json` (gerados por `tools/importar-cadastros.mjs`); mudanças no navegador, com Exportar/Importar.
- O ataque de uma arma é montado a partir do item, com o selo "da arma" (Plano 43, opção A).
- No 5etools, `data/spells/` tem **1.038 magias** em 23 livros:
  - **2024:** 391 do XPHB, mais as de outros livros;
  - **2014:** 361 do PHB, mais as de outros livros;
  - por nível: 82 truques; 162 de 1º, 171 de 2º, 147 de 3º, 110 de 4º, 127 de 5º, 88 de 6º, 56 de 7º, 49 de 8º e 46 de 9º;
  - imagens de 91 magias em `fluff-spells-*.json`.
- **O que cada magia traz de forma estruturada:**
  - básico: nível, escola, tempo de conjuração (inclusive reação com gatilho), alcance (ponto, toque, você mesmo, área), componentes (V, S, M com o material, custo, "consumido"), duração (concentração, até X, instantânea, permanente), ritual;
  - efeito: tipos de dano, teste de resistência, ataque de magia (corpo a corpo / à distância), condições causadas, área (esfera, cone, linha, cubo…);
  - texto "em nível superior";
  - aumento do truque por nível (Fire Bolt: 1d10 → 2d10 no nível 5 → 3d10 no 11 → 4d10 no 17).
- **Listas de classes:** `spells/sources.json` diz quem tem a magia, incluindo subclasses e listas expandidas (ex.: Fireball → Sorcerer e Wizard 2024).

## Proposta
1. **Aba Magias** (ícone `sparkles`):
   - botões de nível com contagem (Truque, 1º … 9º);
   - filtros: escola, classe (lista de quem tem a magia), edição, fonte, tempo de conjuração (ação, ação bônus, reação, 1 minuto ou mais), concentração, ritual, "causa dano", tipo de dano, teste de resistência, ataque de magia, componente material com custo, "criadas por mim";
   - pesquisa por várias palavras.
2. **Formulário da magia:**
   - **Identidade:** nome, nível, escola, edição, fonte, imagem (5etools).
   - **Conjuração:**
     - tempo (número + unidade; reação com o gatilho);
     - alcance (você mesmo, toque, distância, visão, ilimitado), em metros/pés conforme a unidade de quem vê (Plano 40);
     - área (forma e tamanho);
     - componentes V/S/M (material, custo em gp, consumido);
     - duração (instantânea, X minutos/horas/rodadas, até ser dissipada; concentração);
     - ritual.
   - **Efeito:**
     - ataque de magia (corpo a corpo / à distância), ou teste de resistência (atributo e o que acontece no sucesso);
     - dano: dados e tipo, até dois;
     - cura: dados;
     - condições causadas.
   - **Em nível superior:** dados a mais por nível do espaço (Fireball: +1d6 por nível acima do 3º); nos truques, a tabela por nível do personagem (5, 11, 17).
   - **Classes:** quem tem a magia na lista (classes e subclasses), em botões que se marcam e desmarcam; o nome fica ligado ao cadastro de Classe quando ele existir.
   - **Descrição:** texto formatado (tabelas), com "Editar o texto"; o texto "em nível superior" fica em bloco separado.
   - **Resumo no topo**, por exemplo "3rd-level Evocation · 1 action · 45 m · V, S, M · Instantaneous · DEX save · 8d6 fire (+1d6/nível) · Sorcerer, Wizard".
3. **Ataques das magias** (ver pergunta 1): toda magia com ataque de magia ou teste de resistência e dano aparece em Ataques, com o selo "da magia", só leitura, com "Editar a magia" e "Duplicar" (Fire Bolt → Spell Attack, Spellcasting + Prof, 1d10 fire; Fireball → Spell Save, DEX, CD de conjuração, 8d6 fire, metade no sucesso, esfera de 6 m). Mudar a magia muda o ataque.
4. **Script:**
   - `tools/importar-cadastros.mjs` gera `data/cadastros/spells.json` (+ `.js`): magias, listas de classes e imagens.
   - Os dados de dano e cura são lidos do texto quando o 5etools não os traz em campo próprio (primeiro `{@damage}` / `{@dice}`, e `{@scaledamage}` para o nível superior). O que não for possível ler fica só no texto.

## Perguntas para o usuário
1. **Ataques das magias em Ataques**, montados a partir da magia como as armas (recomendo: a ficha vai usar a mesma aba para tudo que se rola contra alguém), ou as magias ficam só na aba Magias?
2. **Magias de outros sistemas que o 5etools inclui** (ex.: as listas de "Evoker" e "Mage" do livro WoW, de outro jogo): entram como as demais, separadas pelo filtro de fonte (recomendo, é o mesmo que fizemos com itens), ou ficam de fora?

## Decisões do usuário
1. "Sim" → as magias com ataque ou teste de resistência aparecem em Ataques, com o selo "da magia", montadas a partir da magia.
2. "Deixa de fora por enquanto." → as magias do livro WoW e as listas de classes de lá (Evoker, Mage…) não entram.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/importar-cadastros.mjs` (+ `tools/cadastros-magias.mjs`) | magias, listas de classes, dano/cura/nível superior, imagens |
| `data/cadastros/spells.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Magias (níveis, filtros, formulário, resumo); ataques "da magia" em Ataques |
| `css/cadastros.css` | componentes, níveis, tabela de nível superior |
| `js/icons.js` | ícones que faltarem |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contagens:** batem com o 5etools (1.038), por nível, escola e edição.
- **Magias conhecidas:**
  - **Fireball (XPHB):** 3º nível, Evocation, 1 ação, 45 m, V/S/M, DEX, 8d6 fire, +1d6 por nível, esfera de 6 m, Sorcerer e Wizard.
  - **Fire Bolt:** truque, ataque à distância, 1d10 → 4d10.
  - **Cure Wounds:** cura.
  - **Shield:** reação com gatilho.
  - **Detect Magic:** ritual e concentração.
  - **Revivify:** material de 300 gp consumido.
  - **Hold Person:** condição Paralyzed, WIS.
- **Ataques:** Fire Bolt e Fireball aparecem com o selo "da magia"; editar a magia muda o ataque.
- **Filtros:** classe Wizard + 3º nível; concentração; ritual; tipo de dano fire.
- **Cadastro:** criar, duplicar, apagar, desfazer, voltar ao padrão, restaurar, exportar e importar; nada de "null" na tela; alinhamento em 1440, 1100 e 800 px.
- **Regressão:** `cadastros.js` (Ataques e Itens), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-magias.mjs`, chamado por `tools/importar-cadastros.mjs`, grava `data/cadastros/spells.json` (≈ 1,6 MB).
  - **969 magias:** as 1.038 do 5etools menos as 69 do livro WoW, cujas listas de classes também saíram.
  - **Por nível:** 80 truques; 145 de 1º, 160 de 2º, 133 de 3º, 100 de 4º, 119 de 5º, 85 de 6º, 55 de 7º, 48 de 8º e 44 de 9º.
- **O que se guarda de cada magia:**
  - **Conjuração:** nível, escola, ritual, tempo (com o gatilho da reação), alcance (distância, você mesmo, toque, visão, ilimitado), área (forma e tamanho, também lida do texto, como "20-foot-radius Sphere"), componentes (material, custo e "consumido").
  - **Duração:** inclusive concentração.
  - **Efeito:** ataque de magia, teste de resistência (metade ou nada no sucesso), dano (até dois, lido do texto, inclusive dano fixo como "5 Cold"), cura, condições.
  - **Nível superior:** dados a mais por nível; nos truques, a tabela 1/5/11/17.
  - **Quem tem:** classes, listas expandidas e subclasses; e quem também dá a magia (espécies, talentos, antecedentes, opções de classe), pelo nome, para ligar quando esses cadastros existirem.
  - **Imagens:** de 92 magias.
- **Aba Magias:**
  - botões de nível com contagem;
  - filtros: escola, classe, tempo de conjuração, efeito (ataque, teste, dano, cura, condição), tipo de dano, marcas (concentração, ritual, material com custo, minhas), edição e fonte;
  - selos C (concentração) e R (ritual) na lista.
- **Formulário:** Magia, Conjuração, Duração, Efeito (com a linha "Ataque desta magia → Ver em Ataques"), Em nível superior / Aumento do truque, Quem tem a magia, Descrição.
- **Ataques:** 460 ataques "da magia" (Spell Attack ou Spell Save), só leitura, com "Editar a magia" e Duplicar. Mudar a magia muda o ataque.
- **Ajustes que valem para todas as abas:**
  - a primeira mudança num padrão já mostra o selo "editado" e o "Voltar ao padrão";
  - as contagens das abas somem em telas estreitas, para as abas caberem.

**Testado** (`cadastros.js`; fotos `#shots` Fireball e `#shotsa` Fire Bolt em Ataques)
- **Magias conhecidas:**
  - Fireball: 3º Evocation, 45 m, esfera de 6 m, DEX metade, 8d6 fire +1d6, Sorcerer/Wizard;
  - Fire Bolt: 1d10 → 4d10;
  - Cure Wounds 2024: 2d8 +2d8;
  - Shield: reação;
  - Detect Magic: ritual e concentração;
  - Revivify: 300 gp consumido;
  - Hold Person: WIS, Paralyzed.
- **Filtros:** Wizard 3º 2024 (38), rituais (68), concentração (423), truques de fogo.
- **Ataques da magia:**
  - 460 aparecem, só leitura;
  - "Editar a magia" leva à magia certa;
  - Fireball com 10d6 muda o ataque.
- **Criar:** uma magia de 2º nível com ataque à distância, 3d8 cold, Wizard; ela aparece em Ataques.
- **Regressão:**
  - nada de "null" na tela;
  - alinhamento igual em 1440, 1100 e 800 px;
  - Ataques e Itens, `menu.js` e o tutorial completo sem erros; 0 processos.

**Limites**
- Magias que causam dano sem rolar ataque nem teste (ex.: Magic Missile) não aparecem em Ataques, que só tem os tipos com rolagem.
- Dano escolhido pelo jogador ("radiant ou necrotic", Spirit Guardians) aparece como dois danos.
- 4 magias com dano especial (Animate Objects, Etherealness, True Strike) ficam sem dados lidos; o dano está no texto.
