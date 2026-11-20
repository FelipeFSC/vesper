# Plano 40 · Unidade de medida da mesa (e a de cada jogador)

**Status:** Implementado (testes do usuário)
**Versão:** 1.x
**Pedido do usuário:** "Deixa no bestiario, tudo bem, mas na mesa essa unidade deve ser configurada na mesa inteira e não só em uma cena, outro ponto, como é só uma conversão, os jogadores podem escolher a sua propria se eles quiserem"

Print (sistema de um amigo): seção "Unidade de medida" com quatro quadros, cada um com uma lista: Distância (Metros / Quilômetros), Peso (Quilogramas), Velocidade (Quilômetros por hora), Líquidos (Litros / Mililitros).

## Como funciona hoje
- **Por cena:** em Configurar cena, "Cada quadrado vale" (número) e "Unidade" (texto livre, padrão "m"). Aparece na régua, no rastro e no nome da cena ("1 quadrado = 1,5 m"). Cada cena pode ter uma unidade diferente.
- **Fixo em metros:** altura dos muros (Cobertura), altura do token e do voo ("↑ 4 m"), altura na ficha.
- **Bestiário:** seletor próprio "Originais (pés, libras) / Brasil (metros, kg)", guardado no navegador. Fica como está.

## Proposta
1. **Unidade da mesa** (o mestre escolhe, vale para todas as cenas): uma seção **"Unidade de medida"** no painel Mesa, no estilo do print, com quatro quadros:
   - **Distância:** Metros / Quilômetros, ou Pés / Milhas;
   - **Peso:** Quilogramas, ou Libras;
   - **Velocidade:** Quilômetros por hora, ou Milhas por hora;
   - **Líquidos:** Litros / Mililitros, ou Galões / Onças.
   Padrão de mesa nova: o sistema métrico.
2. **Unidade de cada jogador** (só na tela dele): no menu ⋯, **"Minhas unidades"**: "Igual à mesa" (padrão) ou escolher as próprias nas mesmas quatro listas. Fica guardado no navegador dele; não muda nada para os outros. O mestre também pode usar.
3. **Por baixo, tudo fica guardado num sistema só** (metros, quilos, litros); a tela de cada pessoa converte na hora de mostrar. Ninguém perde nada ao trocar.
4. **Cena:** "Cada quadrado vale" continua por cena (um mapa de masmorra e um mapa-múndi têm escalas diferentes), mas o campo "Unidade" de texto sai: o número é digitado na unidade da mesa (ex.: "1,5 m" ou "5 pés") e a régua de cada um mostra na unidade dele.
5. **Onde a conversão aparece:**
   - régua, rastro do movimento e nome da cena;
   - altura dos muros (menu da Parede e Configurar cena → Cobertura), altura do voo no token, altura na ficha;
   - peso, velocidade e líquidos: nos textos das fichas (descrição, ações, notas), um número seguido da unidade ("20 kg", "30 pés") é mostrado na unidade de quem lê.
6. **Cenas antigas:** "m", "metros" → metros; "pés", "ft", "feet" → pés; "km" e "milhas" também. Outro texto (ex.: "léguas"): a cena fica com essa unidade própria, sem conversão (ver pergunta 2).

## Perguntas para o usuário
1. **Tabela de conversão:** a prática dos livros em português (1 pé = 0,3 m, 5 pés = 1,5 m, 1 libra = 0,5 kg; recomendo, é a mesma do bestiário e um quadrado de D&D fica 1,5 m = 5 pés certinho), ou a exata (1 pé = 0,3048 m)?
2. **Cena com unidade própria** (ex.: um mapa-múndi em "léguas" ou "dias de viagem"): deixar a opção "Outra unidade (não converte)" em Configurar cena (recomendo), ou toda cena usa só a unidade da mesa?
3. **Textos das fichas:** converter peso, velocidade e líquidos nos textos (como o bestiário faz com pés e libras), recomendo, ou por enquanto só as medidas do mapa (distância e alturas)?

## Decisões do usuário
1. Tabela de conversão: a prática de D&D (print): 1 pé = 0,3 m · 1 milha = 1,5 km · 1 mph = 1,5 km/h · 1 libra = 0,5 kg · 1 onça fluida = 30 ml · 1 pinta = 0,5 L · 1 quarto = 1 L · 1 galão = 4 L.
2. "não faz sentido cada cena ter uma unidade de medida diferente … a mesa define a unidade de medida global default, se o jogador quiser mudar o DELE, ele muda." → sem unidade própria por cena (a opção "Outra unidade" não entra). A cena guarda só quanto vale o quadrado.
3. Textos das fichas: "Sim, mas não vamos nos preocupar com os detalhes mínimos agora, ainda não comecei a mexer nas fichas" → fica para quando as fichas forem trabalhadas. As quatro categorias já existem; nesta etapa só as medidas do mapa e as alturas usam.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/units.js` | conversão nos dois sentidos para as quatro categorias; preferência da mesa e do jogador |
| `js/store.js` | `rules.units` da mesa; `migrate` das cenas antigas (unidade → metros guardados) |
| `js/ui.js` | seção "Unidade de medida" no painel Mesa; "Minhas unidades" no menu ⋯; Configurar cena sem o texto livre; alturas e ficha convertidas |
| `js/board.js` | régua, rastro e altura do voo na unidade de quem vê |
| `css/style.css` | os quatro quadros |

## Testes
- Mesa em metros: régua "2 quad. · 3 m"; trocar a mesa para pés: "10 pés" para todos.
- Jogador com "Minhas unidades" em pés numa mesa em metros: só a tela dele mostra pés; a do mestre continua em metros.
- Cena antiga em "m" e em "pés" carrega certo; texto "léguas" fica sem conversão.
- Muros, voo e altura da ficha convertidos; texto de ficha "20 kg" vira "40 libras" para quem usa libras.
- Regressão e tutorial sem erros; 0 processos.

## Resultado
Implementado; aguardando os testes do usuário.

**O que entrou**
- `App.Units` (`js/units.js`): `CATS`, `table()` (da mesa, `rules.units`), `mine()`/`setMine()` (desta pessoa, `localStorage` `vesper-unidades-minhas`; null = igual à mesa), `sys(cat)`, `dist(m)` (m/km ou pés/milhas), `distIn`/`distOut`/`distUnit` para os campos, `weight`, `speed`, `liquid`, `legacyFactor`. O conversor do bestiário (`toBR`, `mode`) continua igual.
- Painel Mesa → **Unidade de medida**: o mestre escolhe as quatro da mesa; todos têm "Na minha tela, usar as da mesa" e, desmarcando, "Só na minha tela" com as quatro listas. Menu ⋯ → "Unidade de medida" abre a seção.
- Régua, rastro, nome da cena, escala em Configurar cena ("Cada quadrado vale (pés)"), alturas dos muros (menu da Parede e Cobertura), altura na ficha da mesa e voo do token na unidade de quem vê. O campo "Unidade" da cena saiu.
- Cenas antigas e importadas: m, pés/ft, km e milhas viram metros guardados; outro texto (ex.: "léguas") fica com o número como metros. Mesa antiga com cena em pés começa com a distância da mesa em pés.
- Fora desta etapa: a página "Criar ficha" (`ficha.html`, altura em m) e os textos das fichas.

**Testado** (`units.js`, foto `units.js#shot`, regressão)
- Tabela: 1,5 m = 5 pés, 0,3 m = 1 pé, 1,5 km = 1 milha, 0,5 kg = 1 libra, 1,5 km/h = 1 mph, 30 ml = 1 onça, 4 L = 1 galão.
- Mesa em pés: "1 quadrado = 5 pés"; quem escolhe metros só para si vê "1,5 m" e a mesa continua em pés; voltar a "usar as da mesa" apaga a escolha do navegador.
- Painel: 4 quadros da mesa, mestre troca a distância; 4 quadros "Só na minha tela".
- Configurar cena em pés mostra 5 e o campo Unidade sumiu; voo 3 m = "↑ 10 pés", digitar 10 pés guarda 3 m.
- Migração: 5 pés → 1,5 m, cena importada em ft → 3 m, mesa antiga em pés começa em pés.
- `path`, `cover`, `fly`, `toolmenu`, `shareruler`, `portal`, `stories` e o tutorial completo sem erros; 0 processos.
