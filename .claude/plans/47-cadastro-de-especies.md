# Plano 47 · Cadastro de espécies (raças)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "quero" (próximo da ordem: Magias → Talentos → Antecedente → **Espécie** → Opções de classe → Classe → Subclasse; só cadastros, as fichas vêm depois).

## Objetivo
Uma aba **Espécies** na página "test": pesquisar, criar, editar, duplicar e apagar, já com as do 5etools. A espécie usa o que já existe:
- magias (Tiefling, Drow), ligadas ao cadastro de Magias;
- talentos (Humano 2024: um talento de Origem à escolha), ligados ao cadastro de Talentos;
- ataques naturais e sopros, que já estão em Ataques;
- os editores de pré-requisitos e benefícios dos Planos 44 e 46.

## Como funciona hoje
- Página `cadastros.html` com Ataques, Itens, Magias, Talentos e Antecedentes.
- Os 60 ataques de espécie (garras, mordidas, sopros) já existem em Ataques (`origin: species`, com o nome da espécie).
- No 5etools, `races.json` tem:
  - **177 espécies:**
    - **2024:** XPHB (Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling);
    - **2014:** PHB (os 9 clássicos);
    - 17 do livro WoW;
    - 50 com a regra de "linhagem" (VRGR/MPMM: atributos livres).
  - **98 sub-raças de 2014:** High Elf, Wood Elf, Drow, Hill Dwarf…
  - **21 espécies com versões:** as linhagens e ancestralidades de 2024 (Elf: Drow/High/Wood; Goliath: 6 ancestralidades gigantes; Tiefling: 3 legados; Gnome: 2; Dragonborn: cores).
  - **imagens:** 240 registros de imagens.
- **O que cada espécie traz:**
  - **básico:**
    - tamanho, às vezes à escolha (Human 2024: Small ou Medium);
    - deslocamentos (andar, voar, nadar, escalar);
    - visão no escuro e outros sentidos;
    - tipo de criatura;
    - idade, altura e peso (base + dados).
  - **atributos fixos (2014):** Elf +2 DEX, High Elf +1 INT. Em 2024 os atributos vêm do antecedente.
  - **proficiências e idiomas:** perícias (Elf 2024: uma entre Insight/Perception/Survival), ferramentas, armas, armaduras, idiomas.
  - **magias:** 35 espécies; Tiefling e Drow por nível, por exemplo.
  - **talentos** (Humano 2024), resistências e imunidades.
  - **traços com nome** ("Fey Ancestry", "Trance", "Breath Weapon"…), que hoje só estão no texto.

## Proposta
1. **Aba Espécies** (ícone `users`):
   - filtros: edição, fonte, tamanho, tipo de criatura, deslocamento (voa, nada, escala), visão no escuro, "dá magias", "dá talento", "tem opções (sub-raças/linhagens)", "criadas por mim";
   - pesquisa por várias palavras (inclui os nomes das opções e dos traços).
2. **Formulário da espécie:**
   - **Identidade:** nome, edição, fonte, imagem, tipo de criatura.
   - **Corpo:**
     - tamanho (um ou mais, à escolha);
     - deslocamentos na unidade de quem vê (Plano 40);
     - idade (adulto / máxima);
     - altura e peso (base + dado).
   - **Benefícios:** o editor dos Planos 44/46 (atributos, proficiências, idiomas, magias, sentidos, defesas).
   - **Talento:** o editor do Plano 46 ("um talento de Origem à escolha").
   - **Traços:** lista de traços com nome e texto, editáveis um a um (Fey Ancestry, Trance…).
   - **Ataques da espécie:** os ataques que já estão em Ataques com esta espécie como origem, com link (Breath Weapon, Claws…).
   - **Opções:** sub-raças (2014) ou linhagens/ancestralidades (2024). Ver pergunta 1.
   - **Descrição** formatada.
3. **Script:** `tools/cadastros-especies.mjs` grava `data/cadastros/species.json` (+ `.js`), pelo carregador do 5etools:
   - cópias resolvidas;
   - sub-raças juntadas à espécie-mãe;
   - magias e talentos ligados;
   - medidas em metros e quilos (Plano 40).
4. **Fora por enquanto:** o livro WoW, como nas magias e nos talentos.
5. **Ligações de volta:**
   - na magia, "Também dão esta magia → Espécies" vira link;
   - no ataque de espécie, o nome da espécie vira link.

## Perguntas para o usuário
1. **Sub-raças e linhagens:** ficam **dentro da espécie**, como opções (uma linha "Elf" com Drow/High/Wood; cada opção com o que muda: traços, magias, visão no escuro, atributos), como os grupos de itens (recomendo: é como o jogador escolhe, e evita 98 linhas "Elf (Drow)", "Elf (High)"…), ou cada combinação vira uma linha separada na lista?
2. **Traços:** guardar cada traço com nome e texto, e os números que dá para ler (visão no escuro 120 do Drow, resistência, magia) nos campos dos benefícios (recomendo: a ficha usa os campos e mostra o texto), ou só o texto de cada traço?

## Decisões do usuário
1. "sim, gostei da ideia" → sub-raças (2014) e linhagens/ancestralidades (2024) ficam dentro da espécie, como opções, cada uma com o que muda.
2. "Segue a recomendação" → traços com nome e texto; os números que dá para ler (visão no escuro, resistência, magia…) vão para os campos de benefícios.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `tools/cadastros-especies.mjs` (novo) e `tools/importar-cadastros.mjs` | espécies, sub-raças/linhagens, traços, corpo, benefícios, ligações |
| `data/cadastros/species.json` (+ `.js`) | novo |
| `js/cadastros.js` | aba Espécies; editores de Corpo, Traços e Opções; "Ataques da espécie"; ligações de volta |
| `css/cadastros.css` | traços e opções |

## Tutorial, wiki e README
- Quando o usuário finalizar.

## Testes
- **Contagens:** batem com o 5etools (sem WoW), por edição; sub-raças dentro da espécie certa.
- **Espécies conhecidas:**
  - **Elf (XPHB):** Medium, 9 m, visão no escuro 18 m, uma perícia à escolha, linhagens Drow/High/Wood (Drow: visão 36 m, Dancing Lights, magias nos níveis 3 e 5), traços Fey Ancestry e Trance.
  - **Elf (PHB):** +2 DEX, sub-raças High/Wood/Drow (High: +1 INT, um truque de Wizard).
  - **Human (XPHB):** Small ou Medium, uma perícia, talento de Origem à escolha.
  - **Dragonborn (XPHB):** ancestralidades, o sopro ligado aos ataques.
  - **Tiefling (XPHB):** legados com magias.
  - **Aarakocra (MPMM):** voo.
- **Ligações:** da espécie para a magia, o talento e o ataque; da magia e do ataque de volta para a espécie.
- **Cadastro:** criar (com traços e uma opção), duplicar, apagar, desfazer, voltar ao padrão, exportar e importar; nada de "null" na tela; alinhamento em 1440 e 800 px.
- **Regressão:** `cadastros.js` (as outras abas), `menu.js` e o tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- **Script:** `tools/cadastros-especies.mjs` grava `data/cadastros/species.json` (≈ 370 KB):
  - **160 espécies:** 112 de 2014, 26 de 2024 e 22 sem edição; os 17 do WoW ficaram de fora.
  - **125 opções:** sub-raças e linhagens dentro da espécie certa.
  - **Cada opção guarda só o que muda:** traços novos ou que trocam o da espécie, traços que saem, benefícios, tamanho, deslocamento e talento.
  - **Nomes das opções:** sem o nome da espécie ("Drow Lineage", "Black", "High").
- **Traços:** com nome e texto. Os números (visão no escuro, resistências, magias, perícias, idiomas, armas) foram para os Benefícios.
- **Ajustes no formato comum:**
  - proficiências sem a fonte ("longsword", não "longsword|phb");
  - as magias usam o nome do cadastro ("Gust of Wind"), em talentos, antecedentes e espécies.
- **Aba Espécies:** filtros de tamanho, deslocamento, "dá…" (visão no escuro, magias, talento, resistência, atributos, sub-raças/linhagens), tipo de criatura, minhas, edição e fonte.
- **Formulário:**
  - Espécie (edição, tipo de criatura);
  - **Corpo:** tamanho com várias escolhas; andar, voar, nadar, escalar e escavar na unidade de quem vê; idade; altura e peso como no livro, com a conversão ao lado;
  - Benefícios e Talento (os editores dos Planos 44/46);
  - Traços (editor de nome e texto);
  - Ataques da espécie (links para Ataques);
  - **Sub-raças e linhagens:** "Ver com a opção" mostra a espécie já combinada; cada opção abre o seu editor de nome, tipo, "tira os traços", traços e benefícios;
  - Descrição.
- **Ligações de volta:**
  - na magia, "Também dão esta magia → Espécies" é link;
  - o ataque de espécie mostra "Ataque da espécie … → Abrir a espécie".

**Testado** (`cadastros.js`; fotos `#shotsp` e `#shotsp2`)
- **Elf 2024:** Medium, 9 m, visão 18 m, perícia à escolha, 3 linhagens; com Drow: visão 36 m e Dancing Lights, Faerie Fire, Darkness.
- **Elf 2014:** +2 DEX, 9 sub-raças; com High: +1 INT, armas, truque de Wizard, idioma extra.
- **Human 2024:** Small ou Medium, perícia, talento de Origem à escolha.
- **Dragonborn 2024:** 10 cores e os sopros ligados aos ataques, ida e volta.
- **Tiefling 2024:** 3 legados com magias.
- **Aarakocra:** voo igual ao andar, atributos com pesos, Gust of Wind.
- **Filtros:** voam (10), têm sub-raças/linhagens (33).
- **Magia → espécie:** Hellish Rebuke → Tiefling.
- **Criar:** Small/Medium, voo 9 m, traço, visão no escuro e uma sub-raça com traço próprio.
- **Regressão:**
  - nada de "null" na tela; alinhamento em 1440 e 800 px;
  - as outras abas, `menu.js` e o tutorial completo sem erros;
  - 0 processos, depois de encerrar um Edge de teste que não fechou sozinho e apagar a pasta de perfil que ele deixou.

**Limites**
- A espécie-base de 2024 mostra as magias das três linhagens como listas alternativas (como no livro); a opção escolhida mostra só as dela.
- Altura e peso ficam em polegadas e libras com dados (como no livro), com a conversão só na dica.
