# Plano 43 · Cadastro de itens (e as armas como itens)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Leia para mim esse arquivo de contexto, esse é de um sistema de um amigo que desenvolveu uma wiki bem completa dos itens, leva esse arquivo em consideração na hora de criar o crud dos itens e aproveita para dar uma olhada nas armas também, já que arma são itens, isso vai ajudar bastante."

Referência: `ITEM_JSON_CONTEXT.md` (catálogo de itens do sistema do amigo, sobre os mesmos JSON do 5etools).

## Objetivo
Uma aba nova **Itens** na página "test" (Plano 42): pesquisar, criar, editar, duplicar e apagar itens (mundanos e mágicos), já com os do 5etools. As armas passam a ser itens da categoria Weapon, sem perder o que a aba Armas faz hoje.

## O que o documento do amigo ensina (e o que usamos)
1. **Os JSON do 5etools não são editados**; tudo é derivado deles. Igual ao nosso modelo: o script gera os nossos arquivos e o que a pessoa muda fica no navegador.
2. **Fontes de dados:**
   - `items.json`: 2.607 itens e 127 grupos;
   - `items-base.json`: as bases (equipamento mundano, inclusive as 98 armas), mais tipos, propriedades, maestrias e textos reutilizáveis;
   - `magicvariants.json`: 230 "famílias" (ex.: "+1 Weapon"), que viram um item por base compatível;
   - `fluff-items.json`: 1.212 registros com imagens;
   - `books.json` e `adventures.json`: os nomes das fontes.
3. **Cópias (`_copy` / `_mod`):** 90 itens herdam de outro. O amigo escreveu um resolvedor próprio. Nós já usamos o carregador do próprio 5etools no bestiário (Plano 25), que resolve as cópias igual ao site; recomendo usar o mesmo aqui.
4. **Famílias de variantes:**
   - "+1 Weapon" com "Longsword" gera "+1 Longsword". As compatibilidades vêm de `requires` (alternativas) e `excludes` (basta um campo bater).
   - Edição: variante 2014 só com base 2014; variante 2024 só com base 2024.
   - Nome: tira `nameRemove`, soma `namePrefix` e `nameSuffix`. Preço: `valueExpression` → `valueMult` → base + valor da raridade.
   - O amigo mostra a família como **uma linha** com as bases como opções, e não 230 × N linhas soltas.
5. **Grupos (`itemGroup`):** reúnem versões de um item (ex.: os estágios de um item evolutivo). Os membros saem da lista solta. Item evolutivo ganha o estágio inicial.
6. **Categorias:** uma principal e várias secundárias, decididas nesta ordem:
   - exceções por nome;
   - marcadores (`weapon`, `armor`, `poison`…);
   - tipo (M/R → Weapon; LA/MA/HA/S → Armor; P → Potion; SC → Scroll; RG → Ring…);
   - palavras no nome (amulet, boots, bag…);
   - por último, Other.
7. **Raridade e preço:**
   - raridade normalizada (None … Artifact, Varies, Unknown);
   - preço em centésimos de gp, o mesmo que já guardamos (peças de cobre);
   - sem preço no livro, estimativa pela raridade: Common 100, Uncommon 400, Rare 4.000, Very Rare 40.000, Legendary 200.000 gp. Consumível paga a metade da estimativa;
   - tabela própria para Spell Scroll (truque 30 gp … 9º nível 100.000 gp).
8. **Textos:**
   - `{@tag}` vira texto e `{#itemEntry}` puxa um texto compartilhado;
   - `{{item.campo}}` e `{=campo}` são trocados pelo valor do item;
   - tabelas são mantidas.
   - A descrição soma as definições do tipo, das propriedades e da maestria.
9. **Ficha do item:** sintonização, dano e propriedades (arma), CA (armadura: leve + DES, média + DES máx. 2, escudo +2), Força mínima, desvantagem em Furtividade, foco de conjuração (quais classes), veículos e montarias.
10. **Imagens:** do fluff do item; se não tiver, da família ou do grupo. Endereço em `5e.tools/img`, como os tokens do bestiário (web).
11. **Unidades:** fatores iguais aos do Plano 40 (1 pé = 0,3 m; 1 libra = 0,5 kg). O amigo converte só na hora de mostrar; nós guardamos em metro e quilo, mas com esses fatores não se perde nada na volta (80 pés → 24 m → 80 pés).
12. **Traduções:** o amigo tem arquivos pt-BR (nomes por ID, textos pelo original) e um glossário. Fica para a etapa de tradução, se ele deixar usar (ver pergunta 5).

## O que olhei nas nossas armas (Plano 42)
- **Certo:**
  - bases de `items-base.json`, ambas as edições;
  - preço em centésimos de gp;
  - Versatile pelo `dmg2`, munição pelo `ammoType`;
  - propriedade com nota (Lance: Two-Handed "unless mounted");
  - mesmos fatores de unidade.
- **A corrigir:**
  1. **Edição sem marca:** 5 armas de outros livros (Double-Bladed Scimitar, Hoopak, Yklwa…) foram marcadas como 2014 por falta de informação. O certo, como no amigo, é "sem edição" (servem para as duas).
  2. **Descrição:** a das armas mostra só o texto próprio (quase sempre vazio). Deve somar as definições das propriedades (Finesse, Thrown…) e da maestria (Sap: "…"), como no amigo.
  3. **Armas mágicas:** os 220 itens mágicos que são armas (Flame Tongue, Vorpal Sword, "+1 Longsword"…) ainda não existem no cadastro. Com os itens, eles entram.
  4. **Bônus mágico:** falta guardar `bonusWeapon` (+1 no ataque e no dano), crítico extra e dano extra (ex.: Flame Tongue +2d6 fire). Hoje o formulário da arma não tem esses campos.
  5. **Arma ↔ ataque:** cada arma gera um ataque igual (98). Com as armas mágicas, isso vira centenas de ataques repetidos. Melhor: o ataque guarda só os ataques que **não** são de arma (desarmado, sopro, garras…), e o ataque de uma arma é montado a partir da arma (ver pergunta 3).

## Proposta
1. **Aba Itens**, no mesmo formato das outras: lista com pesquisa e filtros (categoria, raridade, edição, fonte, sintonização, "só mágicos"), formulário à direita.
2. **Um registro por item:**
   - **identidade:** nome, fonte, página, edição, categoria principal e secundárias, raridade, sintonização (sim/não/requisito), peso, preço (do livro ou estimado, com a origem: "livro", "raridade" ou "tabela de pergaminho");
   - **descrição:** em blocos, mantendo as tabelas;
   - **imagem** (web, do 5etools);
   - **blocos por categoria:** Arma (o formulário de hoje + bônus mágico e dano extra), Armadura (CA, tipo, Força mínima, Furtividade, bônus), Foco (tipo e classes), Consumível (cargas/usos).
3. **Famílias de variantes** como no amigo: uma linha ("+1 Weapon") com a lista das bases compatíveis. Escolher a base mostra o item resultante (nome, preço, dano). Não gera milhares de linhas.
4. **Grupos:** uma linha com as versões; o estágio inicial dos evolutivos é montado.
5. **Armas:** a aba **Armas** vira um atalho para **Itens → Weapon** (os mesmos registros); ver pergunta 1.
6. **Script:** `tools/importar-cadastros.mjs` passa a usar o carregador do 5etools (cópias resolvidas como no site) e grava `data/cadastros/items.json`. O arquivo fica grande (≈ 3 MB), então só é carregado quando a aba Itens é aberta.

## Perguntas para o usuário
1. **Armas e itens:** juntar tudo num cadastro só, Itens, e a aba Armas vira o filtro "Weapon" dentro dele (recomendo: uma arma é um item; não há dois lugares para editar a mesma coisa), ou manter Armas como cadastro separado?
2. **Variantes mágicas** ("+1 Weapon", "Flame Tongue" em cada espada): uma linha por família com a escolha da base (recomendo, como o amigo faz), ou uma linha por combinação ("+1 Longsword", "+1 Dagger"…, vários milhares)?
3. **Ataques das armas:** em vez de um ataque gravado por arma, o ataque de cada arma é **montado a partir da arma** e aparece na aba Ataques com o selo "da arma" (recomendo: mudar a arma muda o ataque e as armas mágicas não multiplicam a lista), ou manter um ataque gravado por arma como hoje?
4. **Imagens dos itens:** mostrar a imagem do 5etools (vem da web, como os tokens do bestiário; recomendo), ou sem imagem por enquanto?
5. **Traduções do amigo:** ele tem nomes e textos em pt-BR por ID. Quando formos traduzir, dá para usar os arquivos dele (com permissão dele), ou fazemos as nossas?

## Decisões do usuário
1. "Sim, bem melhor, vamos deixar como itens e adicionar um filtro legal para isso." → um cadastro só, **Itens**; a aba Armas sai e vira um filtro de categoria bem visível dentro de Itens.
2. "Uma linha por família, bem melhor." → cada variante mágica é uma linha, com a escolha da base.
3. Opção **A**: a aba Ataques guarda só o que não é arma (desarmado, sopros, garras…). O ataque de uma arma é montado a partir do item; na aba Ataques as armas aparecem só para consulta, com o selo "da arma" e o botão "Editar a arma".
4. "Sim, pode mostrar as imagens." → imagem do 5etools (web).
5. "Sim, vamos pegar com ele, mas não agora." → traduções do amigo na etapa de tradução.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/importar-cadastros.mjs` | carregador do 5etools; itens, famílias, grupos, categorias, raridade, preço, textos, imagens; correções das armas (edição, descrição, bônus) |
| `data/cadastros/items.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Itens (lista, filtros, formulário com blocos por categoria, famílias e grupos); Armas como filtro; ataques de arma montados da arma |
| `css/cadastros.css` | blocos por categoria, escolha de base, imagem |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contagens:** batem com o 5etools; nenhuma linha solta de membro de grupo.
- **Itens conhecidos:**
  - Longsword (base);
  - +1 Weapon: só bases compatíveis da mesma edição, sem Net; preço 15 + 400 = 415 gp;
  - Flame Tongue: dano extra;
  - Spell Scroll (Level 3): 300 gp;
  - Potion of Healing: consumível, metade da estimativa;
  - um item de grupo;
  - um item evolutivo com estágio inicial.
- **Categorias:** Bag of Holding → Bag/Container, Boots of Speed → Apparel, Portable Hole → Bag/Container.
- **Cadastro:** editar, apagar, restaurar, exportar e importar como nas outras abas.
- **Regressão:** o teste `cadastros.js` (ataques e armas) e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/importar-cadastros.mjs` + `tools/cadastros-itens.mjs`. Os itens vêm do carregador do próprio 5etools, com as cópias resolvidas como no site.
  - `data/cadastros/items.json` tem ≈ 3,9 MB e 3.202 registros: 230 bases, 2.616 itens, 229 famílias e 127 grupos.
  - As 3.511 combinações ficam dentro das famílias, uma linha por família.
  - 704 versões de grupo saem da lista solta.
  - Foram criados 9 estágios iniciais de itens evolutivos.
  - `weapons.json` saiu; `attacks.json` ficou só com o que não é arma (66).
- **Regras do amigo aplicadas:** categoria principal e secundárias (exceções, marcadores, tipo, palavras), raridade normalizada, item mágico pela raridade bruta, preço (tabela de Spell Scroll → livro → estimativa pela raridade, consumível pela metade), famílias com bases compatíveis e preço base + parte mágica, grupos com versões, imagem própria ou do grupo, textos com tabelas e definições de propriedade e maestria.
- **Correções das armas:**
  - edição vazia nas armas sem marca (Hoopak, Yklwa…);
  - descrição com Versatile/Finesse/maestria;
  - bônus mágico (`bonusWeapon`), crítico e dano extra.
- **Página, aba Itens:**
  - botões de categoria com contagem; filtros de tipo (mágicos, mundanos, famílias, grupos, meus), raridade, sintonização, edição e fonte; Propriedade/maestria aparece em Weapon e tipo de armadura em Armor;
  - a lista mostra 300 por vez ("Mostrar mais") e o nome tem a cor da raridade;
  - a pesquisa acha a família pelo nome da combinação ("+2 rapier") e o grupo pelo nome da versão.
- **Formulário do item:**
  - imagem (clique troca entre as imagens);
  - Item: categoria, raridade (preço estimado acompanha), edição, mágico, sintonização com requisito, peso, preço, cargas, recarga, "também conta como";
  - blocos Arma (dano, propriedades, maestria, alcance, bônus, crítico, dano extra, linha "Ataque desta arma" → Ver em Ataques), Armadura, Bônus mágicos, Foco, Defesas;
  - descrição mostrada formatada, com "Editar o texto".
- **Família e grupo:**
  - família: "Vale para…", antes/depois do nome, "Ver com a base" (mostra o item resultante e o preço), lista de todas as bases, o que soma na arma;
  - grupo: lista das versões; a versão tem "Voltar ao grupo".
- **Ataques:** os das armas são montados do item, com o selo "da arma", só leitura, "Editar a arma" e Duplicar. Mudar a arma muda o ataque.
- **Migração:** o que estava salvo na aba Armas, e arquivos exportados antes, viram itens da categoria Weapon; os ataques antigos das armas saem.

**Testado** (`cadastros.js`; fotos `#shotw`, `#shoti`, `#shotf`, `#shotg`)
- Todos os casos da seção Testes, mais: migração do arquivo antigo, ataque que acompanha a arma, descrição com tabela, pés/libras.
- `menu.js` e o tutorial completo sem erros; 0 processos.

**Ajustes depois do print do usuário**
- **Alinhamento:** o ataque da arma (bloco só leitura) ficava deslocado à esquerda (margem zerada no `fieldset`). Agora está alinhado em 1440, 1100 e 800 px, sem rolagem lateral (`cadastros.js#shota`).
- **Pesquisa:** juntava as palavras ("devotee censer" não achava "Devotee's Censer"). Agora cada palavra é procurada em qualquer ordem.
- **"null":** aparecia escrito embaixo da pesquisa na aba Ataques. O teste agora confere que não aparece "null" na tela.

**Limites desta etapa**
- O dano extra mágico (ex.: +2d6 fire da Flame Tongue) não vem estruturado no 5etools: fica no texto, e o campo "Dano extra" é preenchido à mão.
- Estágio inicial dos evolutivos: sem as bases do primeiro estágio (o grupo é a própria arma ou item).
- `items.json` é carregado junto com a página (≈ 3,9 MB); abre rápido no navegador, mas não é carregado só ao abrir a aba.
