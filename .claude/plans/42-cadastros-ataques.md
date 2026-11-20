# Plano 42 · Tela de cadastros (começando pelos ataques)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Vamos adicionar uma nova tela no sistema vai ser uma tela de cadastros, esses cadastros vão influenciar na ficha do jogador e talvez em outras regras dentro do board, nessa tela vamos ter diversos CRUDs, mas já vamos iniciar com dados default já que temos os jsons do 5etools, vamos por parte, no menu principal deixa como nome test até eu decidir o qual nome dar, e vamos começar cadastrando os ataques, lembrando que vai ser CRUD, então podemos cadastrar, editar e deletar e pesquisar também, dentro dessa tela vão ter diversos cruds então deixa dentro da tela o menu no topo de ataques, ok? Não vamos linkar à nada por enquanto, então faz o ataque completo e perfeito, te mandei 2 exemplos do roll20 como ele mostra o ataque, eu imagino que o nosso cadastro vai ser mais ou menos nesse formato."

Prints (Roll20): edição de "Unarmed Strike" (Nome, Tipo, Alcance; Ataque: atributo, bônus, proficiência = +4; Dano 1 e 2: dados, atributo, tipo; Descrição) e de "Breath Weapon" (Tipo "Attack Save": teste de resistência de Destreza, CD = 10; dano 1d10). Tipos: Corpo a corpo, À distância, Ataque de magia, Resistência de magia, Ataque com resistência.

## Objetivo
Uma página nova, **"test"** no menu inicial (nome provisório), com um menu no topo para vários cadastros. A primeira aba é **Ataques**: pesquisar, criar, editar, duplicar e apagar, já começando com os ataques do 5etools. Nada ligado à ficha nem à mesa por enquanto.

## Como funciona hoje
- Menu inicial em `index.html` (`.mn-item`): Jogar, Preparar tabuleiro, Criar ficha, Tutorial, Wiki.
- "Criar ficha" já é uma página separada (`ficha.html` + `js/ficha.js` + `css/ficha.css`), guardada no IndexedDB `mesarpg` (chave `fichas`). O cadastro segue o mesmo modelo.
- O bestiário vem do 5etools por um script (`tools/importar-5etools.mjs`) que grava em `data/5etools/` (fora do git).
- No 5etools: `items-base.json` tem 98 armas (PHB 2014 e XPHB 2024, DMG etc.) com dano, tipo de dano, propriedades, alcance, maestria (2024), categoria, peso e preço. Ataque desarmado e sopro de dragão não estão lá como item (ver pergunta 2).

## Proposta
1. **Menu inicial:** novo item **"test"** (ícone `library`), abre `cadastros.html`.
2. **Página de cadastros** (mesmo visual da página "Criar ficha"):
   - topo: marca do Vésper, **abas** (por enquanto só **Ataques**; as próximas entram aqui) e "Voltar ao menu";
   - esquerda: **pesquisa** (nome, propriedade, tipo de dano), filtros (Tipo, Categoria, Origem: padrão / meus) e a lista com nome, tipo, alcance, acerto e dano (ex.: "Espada longa · Corpo a corpo · 1,5 m · 1d8 + FOR cortante");
   - direita: o **formulário** do ataque selecionado; botões **Novo**, **Duplicar**, **Apagar** (pergunta antes) e **Restaurar os padrões**.
3. **Campos do ataque** (como no Roll20, em português):
   - **Nome**, **Tipo**: Corpo a corpo · À distância · Ataque de magia · Resistência de magia · Ataque com resistência;
   - **Alcance:** corpo a corpo = alcance (1,5 m); à distância = normal / longo (24 / 96 m); na unidade de quem vê (Plano 40);
   - **Acerto** (tipos com ataque): atributo (FOR, DES, CON, INT, SAB, CAR, Conjuração, Nenhum), bônus, proficiência (Sem · Proficiente · Especialista) → mostra a fórmula: "FOR + prof. + 0";
   - **Resistência** (tipos com resistência): atributo do teste, CD (fixa, ou 8 + prof. + atributo), **no sucesso**: metade do dano / nenhum dano;
   - **Dano 1 e Dano 2:** dados (ex.: 1d8), atributo somado, tipo de dano (os 13 tipos do 5e);
   - **Avançado:** crítico a partir de (padrão 20), dados extras no crítico, **dano versátil** (duas mãos), munição, alcance de arremesso;
   - **Arma** (opcional): categoria (simples / marcial), propriedades (Acuidade, Leve, Pesada, Duas mãos, Versátil, Arremesso, Munição, Recarga, Alcance, Especial), **maestria** (Cleave… Vex, em português), peso e preço;
   - **Descrição** (texto livre) e **fonte** (ex.: "PHB 2024", ou "Meu").
   - O resultado do acerto e do dano (o "= +4" do Roll20) depende de uma ficha; como ainda não liga a nada, aparece a fórmula e um exemplo com atributo +2 e proficiência +2 (ver pergunta 4).
4. **Dados padrão:** um script `tools/importar-cadastros.mjs` lê o 5etools e grava `data/5etools/ataques.js` (fora do git, como o bestiário). Na primeira vez que a página abre, os padrões entram no cadastro. Os ataques padrão podem ser editados e apagados; "Restaurar os padrões" traz de volta os apagados e desfaz as edições (pergunta antes).
5. **Onde fica guardado:** IndexedDB `mesarpg`, chave nova `cadastros` (`{ ataques: [...] }`), com **Exportar / Importar** em arquivo JSON (ver pergunta 3).
6. **Formato guardado** (pensado para ligar à ficha depois): `{ id, nome, tipo, alcance: {normal, longo} (metros), acerto: {atributo, bonus, prof}, resistencia: {atributo, cd, sucesso}, danos: [{dados, atributo, tipo}], critico, versatil, arma: {categoria, propriedades, maestria, peso, preco}, descricao, fonte, padrao: 'XPHB|longsword' }`.

## Perguntas para o usuário
1. **Quais armas padrão:** só as do **livro de 2024 (XPHB)**, 38 armas com maestria (recomendo: é a regra atual e evita duas "Espada longa"), ou também as de 2014 (PHB) e as do DMG (pistola, rifle…), marcadas pela fonte?
2. **Além das armas**, já entram como padrão **Ataque desarmado** e o **Sopro** do draconato (cone e linha), como nos seus prints (recomendo: são os ataques que todo personagem tem e servem de exemplo dos tipos "com resistência"), ou só armas por enquanto? Ataques de magia ficam para o cadastro de magias.
3. **Onde guardar:** no navegador de quem usa, como as fichas da página "Criar ficha", com Exportar/Importar (recomendo por enquanto), ou dentro da história/campanha, para o mestre levar para a mesa online?
4. **Nomes e textos:** traduzir para português (nomes das armas, propriedades, maestrias e tipos de dano; recomendo, a tela é toda em português), ou deixar em inglês como no 5etools?

## Decisões do usuário
1. "vai ter o CRUD de armas também, e vamos ter os 2, mas deixa o jogador filtrar" → duas abas, **Ataques** e **Armas**; entram as armas de 2014 e de 2024 (de todas as fontes), com filtro de edição e de fonte.
2. "vamos ter a base bem completa para não ter problemas na hora de criar a ficha" → além de um ataque por arma: Unarmed Strike (2014 e 2024, com Grapple e Shove), Improvised Weapon e os ataques das espécies (armas naturais e todos os sopros de draconato).
3. "Os default vão ter no json, já os locais vai ficar no navegador mesmo com a opção de exportar" → padrões em `data/cadastros/*.json`; o que a pessoa cria, edita ou apaga fica no IndexedDB, com Exportar/Importar.
4. "Deixa tudo em inglês mesmo, depois vamos trabalhar a tradução" → dados em inglês (nomes, tipos, atributos, propriedades, maestrias, tipos de dano); os textos da tela continuam em português.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `index.html` | item "test" no menu inicial |
| `js/main.js` | o item abre `cadastros.html` |
| `cadastros.html` (novo) | página com as abas no topo, lista e formulário |
| `js/cadastros.js` (novo) | abas, pesquisa, filtros, CRUD, guardar no IndexedDB, exportar/importar, restaurar padrões |
| `css/cadastros.css` (novo) | layout da página (mesmo estilo da `ficha.css`) |
| `tools/importar-cadastros.mjs` (novo) | lê `items-base.json` do 5etools e grava `data/5etools/ataques.js` |
| `js/icons.js` | ícones que faltarem |

## Tutorial, wiki e README
- Só quando o usuário finalizar e escolher o nome da tela.

## Testes
- A página abre pelo menu; os padrões entram (contagem igual à do 5etools escolhido).
- Pesquisar "espada" e filtrar "À distância"; criar, editar, duplicar, apagar (com pergunta).
- Tipo "Ataque com resistência" mostra os campos de resistência e esconde o acerto; à distância mostra normal/longo.
- Recarregar a página: tudo continua; exportar e importar de volta; restaurar os padrões.
- Página sem `data/5etools/ataques.js`: cadastro vazio com o aviso de como importar.
- Tutorial completo sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- Menu inicial: item **test** (ícone `library`) abre `cadastros.html`.
- `tools/importar-cadastros.mjs`: lê `items-base.json`, `races.json` e `variantrules.json` do 5etools e grava em `data/cadastros/`:
  - `weapons.json`: 98 armas, 52 de 2014 e 46 de 2024;
  - `attacks.json`: 164 ataques, 98 de armas, 6 básicos e 60 de espécies.
  - Cada um tem um `.js` igual, para abrir sem servidor.
  - Medidas em metros e quilos (1 pé = 0,3 m, 1 libra = 0,5 kg), preço em peças de cobre.
- **Página:**
  - abas no topo (Ataques, Armas), com a contagem;
  - pesquisa por várias palavras (nome, tipo de dano, propriedade, espécie, fonte);
  - filtros: Ataques por edição, tipo, origem e fonte; Armas por edição, categoria, tipo, propriedade e fonte; botão Limpar;
  - lista com resumo;
  - botões Novo, Duplicar, Apagar (pergunta antes e o aviso tem Desfazer), Voltar ao padrão (padrão editado), Padrões (restaurar), Exportar e Importar.
- **Ataque:**
  - tipo (Melee, Ranged, Spell Attack, Spell Save, Attack Save), origem, de onde vem, usos e edição;
  - alcance (corpo a corpo, arremesso, normal/longo) e área (cone, linha, cubo, esfera, cilindro, emanação);
  - rolagem de ataque: atributo, bônus, proficiência, crítico a partir de, dados extras no crítico, munição;
  - teste de resistência: atributo do alvo, CD (8 + Prof + atributo + bônus, ou fixa), metade ou nenhum dano no sucesso, efeito. Nos ataques com rolagem, entra como "teste ao ser atingido";
  - Dano 1 e 2 (dados, atributo, tipo), Versatile e descrição.
  - Resumo no topo. Como ainda não liga à ficha, "= +5" e "= DC 11" são calculados com um personagem de exemplo.
- **Arma:** categoria, tipo, edição, maestria, dano e tipo, Versatile, 12 propriedades, alcance/arremesso, munição, recarga, peso (kg ou lb), preço (gp) e descrição.
- Distâncias e peso aparecem na unidade de quem usa (Plano 40).
- **Salvamento:** IndexedDB `mesarpg`, chave `cadastros`. Nunca grava antes de ler o que já estava salvo.

**Testado** (`cadastros.js`, fotos `#shot` e `#shotw`)
- **Abrir e procurar:**
  - padrões carregados; pesquisa, filtros e Limpar;
  - Unarmed Strike 2024 com os campos do Roll20.
- **Editar padrões:**
  - selo "editado" e Voltar ao padrão;
  - trocar o tipo troca as seções; CD fixa;
  - Bite (Naga) com teste ao acertar; sopro com área.
- **Criar e apagar:**
  - criar, dado inválido marcado, duplicar;
  - apagar ("não" mantém), desfazer, apagar padrão, restaurar padrões.
- **Guardar:** exportar, IndexedDB, importar, arquivo errado recusado.
- **Armas:**
  - Longsword 2024; marcar Thrown mostra o arremesso; preço em gp; virar Ranged;
  - filtro de propriedade; criar arma.
- **Geral:** aba e seleção lembradas; tudo em pés; sem rolagem horizontal.
- **Regressão:** `menu.js` e o tutorial completo sem erros; 0 processos.

**Para decidir antes de subir no GitHub:** `data/cadastros/` tem conteúdo dos livros além do SRD (o bestiário, Plano 25, ficou fora do git pelo mesmo motivo).
