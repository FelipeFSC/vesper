# Plano 55 · Migração do frontend e performance do VTT

**Status:** Em andamento
**Versão:** A definir; migração incremental em entregas independentes
**Pedido do usuário:** "Crie o plano 55 em \".md\" para implementação dessa migração dentro da pasta .claude/plans"
**Contexto:** Implementar a proposta de migração para Svelte, TypeScript e Vite, com RBush, Web Workers e TanStack Virtual, avaliando PixiJS por benchmark.

## Objetivo

Melhorar a fluidez do tabuleiro, a resposta das fichas e painéis e o uso de memória em campanhas grandes. Preservar as regras, a identidade visual, as campanhas salvas e a comunicação entre mestre e jogadores durante uma migração gradual.

Os candidatos a gargalo foram identificados por análise estática. Os resultados medidos durante a execução estão no [relatório de validação](../../benchmarks/README.md).

## Como funciona hoje

| Área | Implementação e oportunidade |
|---|---|
| Inicialização | `index.html`, `ficha.html` e `cadastros.html` carregam scripts tradicionais que compartilham `window.App`, sem build. |
| Interface | `js/ui.js`: eventos do store chamam `UI.schedule()`; `UI.refresh()` percorre vários painéis. Existem assinaturas e caches locais, mas o tipo da alteração não direciona o agendamento. |
| Tabuleiro | `js/board.js`: Canvas 2D, câmera, interação e composição concentrados no mesmo módulo. `B.requestRender()` agrupa solicitações; `B.render()` recompõe o quadro. |
| Resolução | O tabuleiro usa o `devicePixelRatio` integral. Resoluções maiores ampliam o trabalho de desenho. |
| Visão | `js/light.js`: cache de visibilidade, preparação de segmentos e testes de raios contra segmentos locais. Sem cache, o número de testes pode crescer aproximadamente de forma quadrática com os segmentos selecionados. |
| Estado | `js/store.js`: ações, reducer, permissões, migração, emissão de eventos e integração com rede e salvamento. |
| Processamento paralelo | `js/scan.js` já utiliza worker no reconhecimento de paredes; preservar essa capacidade. |
| Assets | `js/images.js`: WebP, limites de tamanho, deduplicação e cache de imagens; representação persistida em data URLs. |
| Persistência | `js/storage.js`: IndexedDB, histórias, salvamento automático e exportação/importação de pacotes. |
| Rede | `js/net.js`: PeerJS/WebRTC, ações e sincronizações completas de estado/assets. `js/audio.js` já transfere áudio em blocos com controle do buffer. |
| Catálogos | `js/cadastros.js`, `js/bestiary.js` e `js/dados5e.js`: carregamento sob demanda e limites de resultados; listas são reconstruídas. Virtualização não substitui otimização de busca e leitura. |

## Proposta

### Tecnologias e responsabilidades

| Tecnologia | Decisão e uso |
|---|---|
| Svelte | Framework escolhido para interface: catálogo, painéis, fichas, assistente, chat e janelas. |
| TypeScript | Adoção gradual nos contratos de domínio, rede, serviços e componentes. Não pressupor ganho direto de execução. |
| Vite | Build multipágina, módulos ES, imports dinâmicos e workers. Manter mesa, ficha e cadastros como pontos de entrada. |
| RBush | Consultas espaciais de candidatos para visão, interação e objetos na câmera; manter testes geométricos exatos depois da consulta. |
| Web Workers | Executar cálculos pesados fora da thread da interface quando a medição justificar. |
| TanStack Virtual | Renderizar apenas a janela visível de listas extensas, preservando busca, seleção e navegação. |
| PixiJS | Protótipo e avaliação obrigatórios; substituição do Canvas 2D condicionada a ganho e equivalência funcional. |
| PeerJS e IndexedDB | Preservar comunicação e persistência, evoluindo contratos e armazenamento sem trocar o modelo do produto. |

Escolher versões estáveis e compatíveis ao iniciar a implementação, registrar requisitos de Node/navegador e fixar dependências em lockfile. Não introduzir outro framework de UI nem servidor de aplicação como parte desta migração.

### Arquitetura de destino

```text
Entradas: mesa / ficha / cadastros
                  |
           Componentes Svelte
                  |
       Seletores e comandos de domínio
                  |
      Estado + regras + validação de ações
           /             |             \
     Rede PeerJS     Persistência     Motor do tabuleiro
                     IndexedDB       /       |        \
                                Câmera   Renderizador  Geometria
                                                      + workers
```

- Manter uma única fonte de verdade para a campanha; componentes não duplicam o reducer.
- Separar estado persistente de câmera, hover, seleção, progresso de arraste e animação.
- Interface assina apenas os dados que consome. Renderizador recebe alterações por entidade/camada.
- Alterações de câmera e animação não notificam fichas e catálogos a cada frame.
- Manter validação do mestre antes de confirmar ações recebidas pela rede.
- Adaptadores temporários permitem convivência com módulos legados; cada trecho do DOM tem um único responsável, Svelte ou legado.
- Como o reducer atual muta objetos, usar revisões e notificações explícitas nos adaptadores. Não depender apenas da identidade do objeto para detectar mudanças.

### Compatibilidade e comportamento

- Preservar modos **Desempenho** e **Em tempo real** do Plano 39: no primeiro, luz/visão mudam ao soltar; no segundo, acompanham o movimento compartilhado.
- Preservar bloqueio visual ao atravessar paredes, memória de exploração, portas, alturas, voo e diferenças entre mestre e jogador.
- Configuração de resolução será local ao dispositivo e não alterará regras da campanha. Proposta inicial: Automático (DPR limitado a 2), Econômico (1) e Nativo; ajustar o padrão após benchmark.
- Usar HTTP local ou hospedagem estática como distribuição principal. A migração para módulos/workers deixa de garantir execução por duplo clique em `file://`; documentar explicitamente.
- IndexedDB depende da origem. Manter a origem anterior quando possível e orientar exportação antes de trocar host/porta; não prometer acesso automático aos dados de outra origem ou de `file://`.
- Compatibilidade com backups antigos é obrigatória. Compatibilidade de sessões entre versões distintas será explícita por versão de protocolo; diferenças incompatíveis devem produzir aviso claro.

## Etapas de implementação

### 55.1 · Linha de base e cenários

- [x] Criar fixtures determinísticas de campanha e assets de teste locais, sem depender de dados privados do 5etools.
- [x] Propor três cenários iniciais: pequeno (20 tokens, 100 segmentos, 4 luzes), médio (100/500/12) e estresse (300/2.000/30). Registrar quais luzes estão ativas e quantos observadores calculam visão.
- [x] Medir arraste, pan/zoom com rastro animado, abertura de ficha, filtro do catálogo, troca de cena, entrada e reconexão de jogador.
- [x] Comparar luz ligada/desligada, modos do Plano 39, DPR 1/2 e mestre/jogador.
- [x] Registrar tempo de frame p50/p95, duração de luz e visão, tarefas longas, heap observado, bytes dos recursos e prontidão da mesa.
- [x] Usar o mesmo hardware, viewport, navegador, assets e percurso. Aquecer o tabuleiro e medir três execuções por variante com cache frio e quente.
- [x] Registrar os valores de referência de 16,7 ms, 33,3 ms e 66,7 ms de p95 por quadro para as campanhas pequena, média e de estresse no dispositivo medido.

**Saída:** relatório reproduzível com comandos, fixtures, resultados e valores de referência para cada cenário. Instrumentação deve poder ser desativada em produção.

### 55.2 · Build, módulos e contratos

- [x] Criar `package.json`, lockfile, configuração Vite multipágina e configuração TypeScript incremental.
- [x] Adicionar comandos de desenvolvimento, build, preview, typecheck e testes aplicáveis.
- [x] Preservar URLs das páginas e os caminhos de wiki, imagens, sons e dados gerados localmente, inclusive em subdiretório.
- [x] Empacotar dependências de runtime, incluindo PeerJS, evitando dependência do CDN para inicialização.
- [x] Converter inicialização e fronteiras dos módulos; criar ponte temporária para `window.App` sem duplicar instâncias ou listeners.
- [x] Extrair tipos iniciais de campanha, cena, token, ficha, ação e mensagem de rede.
- [x] Introduzir carregamento sob demanda para assistente, janela do bestiário e PeerJS. Mostrar estado de carregamento e erro recuperável.
- [x] Manter os scripts Node de importação e incluir seus arquivos gerados na distribuição.

**Saída:** todas as páginas funcionam no build de produção com comportamento equivalente. Remover a ponte legada apenas quando não houver consumidores.

### 55.3 · Atualizações seletivas e renderização atual

- [ ] Mapear tipos de ação para painéis, entidades e camadas afetadas; manter invalidação completa para reset/troca de campanha.
- [ ] Agrupar notificações relacionadas sem perder efeitos, áudio, histórico ou salvamento.
- [x] Consolidar agendamento de renderização e animação, evitando duas composições desnecessárias no mesmo frame.
- [ ] Avaliar cache de mapa/grid e elementos estáticos; invalidar corretamente em câmera, resize, mapa, grid e edição.
- [x] Implementar qualidade de resolução local e manter as coordenadas de ponteiro e do grid em pixels CSS.
- [x] Consultar objetos visíveis pela câmera, incluindo o alcance de luzes que começam fora dela.
- [x] Pausar desenho desnecessário em aba oculta sem interromper comunicação, validação de ações ou persistência.

**Saída:** ganho medido no Canvas 2D existente; editar PV não reconstrói painéis sem relação, e mover a câmera não atualiza a ficha.

### 55.4 · Índice espacial e workers

- [x] Criar índice RBush por cena para caixas de paredes/objetos e invalidá-lo em criação, edição, remoção, portas, undo/redo e troca de dados.
- [x] Consultar candidatos por região e manter precisão dos testes atuais, inclusive limites, alturas e portas.
- [x] Comparar o custo de manter o índice com o ganho de consulta em cenas pequenas e grandes.
- [x] Extrair geometria para funções sem DOM, separadas da composição gráfica.
- [x] Usar worker de visão para antecipar polígonos durante o arraste em cenas grandes. Preservar o worker de scan.
- [x] Enviar paredes por revisão e alterações incrementais.
- [x] Identificar pedidos por revisão e sequência e conferir cena, posição e altura ao aplicar a resposta.
- [x] Transferir buffers tipados de paredes e polígonos.
- [x] Usar geometria síncrona da revisão atual quando o resultado ainda não está disponível ou quando o worker falha.
- [x] Limitar a fila a um pedido em execução e ao pedido mais recente.

**Saída:** resultados equivalentes à geometria de referência, interface responsiva e nenhuma exposição visual indevida por resultado atrasado.

### 55.5 · Interface Svelte e listas

- [ ] Migrar catálogo como primeira área isolada e validar integração com dados/customizações existentes.
- [x] Aplicar TanStack Virtual aos resultados dos cadastros, com seleção persistente fora da janela, foco, teclado e rolagem.
- [ ] Medir filtro e leitura separadamente da criação do DOM; otimizar busca ou levá-la a worker somente se necessário.
- [ ] Migrar componentes compartilhados, painéis da mesa, chat, inventário, fichas e assistente em entregas separadas.
- [ ] Preservar cálculos 5e, multiclasse, ficha de criatura e métodos de atributos dos Planos 51–54.
- [ ] Preservar janelas simultâneas, edição em andamento, atalhos, menu de contexto e navegação por teclado.
- [ ] Remover assinaturas, observers e recursos ao desmontar componentes.
- [ ] Preservar o visual e CSS existentes; eliminar gradualmente renderização manual dos trechos migrados.

**Saída:** componentes migrados com comportamento equivalente e atualizações limitadas às dependências reais.

### 55.6 · Protótipo e decisão sobre PixiJS

- [x] Definir contrato de renderizador independente das regras e do store.
- [x] Implementar protótipo com mapa, tokens, objetos, ordenação, textos, seleção, luz e névoa.
- [x] Preservar renderização sob demanda e descartar texturas e recursos do protótipo.
- [ ] Comparar com o Canvas 2D já otimizado nas fixtures da etapa 55.1, inclusive GPU integrada e telas de alta densidade.
- [ ] Verificar modos gráficos suportados, limites de textura e recuperação de perda de contexto; não exigir WebGPU como único caminho.
- [ ] Registrar ganhos, regressões, memória, carregamento e custo de manutenção.
- [x] Manter Canvas 2D, pois o protótipo PixiJS não trouxe ganho de tempo de frame no hardware testado.
- [ ] Se adotado, migrar ferramentas e efeitos restantes antes de remover o renderizador anterior.

**Saída:** decisão documentada com evidências. OffscreenCanvas pode ser investigado posteriormente, se o desenho na thread principal continuar sendo gargalo; não é requisito desta etapa.

### 55.7 · Assets, persistência e sincronização

- [x] Separar metadados do estado e binários de assets, preservando identificadores e referências existentes.
- [x] Armazenar imagens como `Blob` e converter novos uploads de forma assíncrona, com os mesmos limites de dimensão e qualidade.
- [x] Reutilizar object URLs enquanto as imagens estiverem em uso; liberar as URLs ao trocar de campanha, substituir a imagem ou fechar as visualizações que as criaram. O cache de imagens decodificadas da mesa remove entradas ociosas quando cresce além de 128.
- [x] Versionar o formato dos registros de história no IndexedDB. Migrar metadados e blobs na mesma transação para preservar a gravação anterior em caso de falha.
- [x] Ler pacotes antigos com data URLs e exportar pacotes autocontidos no mesmo formato.
- [x] Adicionar manifesto e pedido de assets ausentes, com prioridade para a cena atual e deduplicação.
- [x] Transferir imagens em blocos com controle de buffer e ceder tempo a ações e áudio.
- [x] Versionar mensagens novas, verificar integridade e tratar cancelamento, reconexão e assets ausentes.
- [x] Manter filtragem de conteúdo exclusivo do mestre e validação de permissões.

**Saída:** backups compatíveis, migração sem perda de dados e melhoria medida na memória e/ou sincronização de campanhas grandes.

A mesa, a ficha avulsa e o bestiário mantêm as imagens em binário. A codificação em data URL continua nos backups portáteis e no formato WebRTC existente. Uma comparação futura pode quantificar o efeito desta etapa na memória e na sincronização.

### 55.8 · Consolidação e distribuição

- [ ] Executar a matriz de regressão funcional.
- [ ] Remover adaptadores, flags e caminhos antigos sem consumidores após validar a substituição.
- [x] Conferir build, imports dinâmicos, páginas independentes e distribuição em subdiretório.
- [x] Atualizar documentação de instalação, desenvolvimento, migração de dados e requisitos.
- [ ] Preencher resultados por etapa, limitações e decisão de renderizador.

## Ordem, entregas e reversão

Executar 55.1 → 55.2 → 55.3 → 55.4 → 55.5 → 55.6 → 55.7 → 55.8. Dividir cada fase em mudanças revisáveis, sem misturar migração de esquema, troca do renderizador e reescrita de fichas na mesma entrega.

Preservar fixtures e capturas de referência antes das mudanças. Durante avaliação, permitir selecionar o renderizador antigo e comparar a mesma cena. Reversão de código não desfaz migração do IndexedDB: manter backup exportável e dados antigos até validar a conversão, documentando a versão capaz de lê-los.

## Mudanças por arquivo

Os destinos abaixo são propostos; criar somente conforme a fase correspondente e adaptar à organização consolidada na implementação.

| Arquivo / diretório | O que muda |
|---|---|
| `package.json`, lockfile, `vite.config.ts`, `tsconfig.json` | Build, dependências, entradas, checagem de tipos e comandos. |
| `index.html`, `ficha.html`, `cadastros.html` | Entradas modulares preservando rotas e layout durante a transição. |
| `src/entries/` | Inicialização da mesa, ficha e cadastros. |
| `src/domain/` | Tipos, ações, regras e seletores extraídos de `js/store.js`, `js/combat.js` e `js/regras5e.js`. |
| `src/ui/` | Componentes Svelte e adaptadores dos módulos `ui`, `ficha`, `ficha5e`, `assistente5e`, `cadastros`, `bestiary` e menus. |
| `src/board/` | Câmera, interação, agendamento, camadas e contrato de renderização extraídos de `js/board.js`. |
| `src/geometry/`, `src/workers/` | Índices espaciais, visibilidade e processamento separado de `light`, `combat` e `scan`. |
| `src/services/` | Rede, persistência, assets e áudio extraídos dos módulos existentes. |
| `js/anim.js`, `js/explore.js`, `js/history.js`, `js/triggers.js` | Integração gradual com contratos novos, preservando regras e efeitos. |
| `css/` | Reutilização de estilos; remoção de duplicações somente após migração dos componentes. |
| `data/`, `tools/`, `imagens/`, `Sons/` | Compatibilizar caminhos e distribuição; preservar importadores e conteúdo local. |
| `tests/`, `benchmarks/` | Fixtures, testes de contratos, regressão visual/interativa e relatórios de performance. |
| `README.md`, `wiki/`, `js/tutorial.js` ou sucessor | Atualizar execução e orientações, preservando o tutorial. |

## Perguntas para o usuário

Nenhuma resposta adicional é necessária para usar este documento como plano proposto. As decisões técnicas recomendadas estão explícitas; PixiJS e deslocamento de cálculos adicionais para workers dependem de evidência durante a implementação. A criação deste arquivo não inicia a migração.

## Tutorial, wiki e README

- README: substituir instrução principal de duplo clique por servidor HTTP, documentar comandos de build e hospedagem estática.
- Explicar backup e mudança de origem antes de migrar dados locais.
- Wiki: documentar qualidade gráfica local e preservar a distinção entre Desempenho e Em tempo real.
- Tutorial: manter passos existentes; alterar seletores dos testes quando componentes forem migrados, sem mudar os objetivos do tutorial.
- Verificar quais scripts históricos citados em outros planos realmente existem antes de reutilizá-los; nomes como `walk.js` não garantem disponibilidade no checkout.

## Testes e critérios de aceite

### Regras e interação

- [x] Mesa offline e sessão WebRTC local com mestre e dois jogadores, incluindo entrada, saída e reconexão.
- [x] Ações sem permissão continuam rejeitadas pelo mestre.
- [ ] Movimento com pontos, régua compartilhada, seleção múltipla, desenhos, objetos, undo/redo e animações.
- [ ] Luz circular/cone/área, escuridão, visão no escuro, paredes, portas abertas/fechadas/trancadas, altura e voo.
- [x] Modos do Plano 39, cegueira ao atravessar paredes e exploração sem revelação indevida.
- [x] Abertura de porta e substituição de cena enquanto um cálculo de worker está pendente.
- [ ] Gatilhos, portais, notas do mestre, handouts e jogador sem ficha/token.
- [ ] Áudio global, espacial, salas e transferência concorrente com ações e assets.
- [ ] Fichas genéricas/5e, criaturas, multiclasse, atributos, inventário e criação pelos cadastros.
- [ ] Foco e valor de campos preservados quando chegam ações remotas; teclado e rolagem das listas virtualizadas.

### Dados e distribuição

- [ ] Importar campanhas/fichas antigas, salvar, recarregar e exportar novamente com equivalência dos dados relevantes.
- [x] Simular falha de quota na mesma transação que escreve os assets e conferir a cópia válida.
- [x] Testar todas as páginas no build de produção e em subdiretório.
- [ ] Testar recursos locais gerados pelos importadores e mensagens claras para recursos ausentes.
- [ ] Sem erros novos no console, listeners duplicados ou crescimento contínuo de recursos após ciclos repetidos de cena/janela.

### Performance e verificação técnica

- [ ] Testes unitários de permissões, geometria, invalidação de índices, respostas atrasadas e migração de dados.
- [ ] Testes de integração/interface para fluxos críticos; comparação visual com tolerância para antialiasing e verificação semântica de visibilidade.
- [x] Build, typecheck e suíte de testes automatizados passam.
- [x] Desempenho da implementação atual aprovado pelo usuário em 20/11/2026. Os valores de 55.1 ficam registrados como referências para futuras comparações.
- [x] Decisão de manter Canvas 2D documentada com o benchmark PixiJS.
- [x] Tutorial completo validado no build com o runner Playwright.
- [ ] Encerrar processos e servidores temporários iniciados apenas para validação.

## Fora do escopo

- Renderização 3D, backend centralizado, contas ou alteração do modelo mestre/jogadores.
- Reescrever regras de RPG ou redesenhar a identidade visual.
- Trocar PeerJS por outro transporte sem necessidade demonstrada.
- Garantir ganhos percentuais antes de medir ou exigir WebGPU como único renderizador.

## Referências técnicas

- [Svelte](https://svelte.dev/docs/svelte/overview)
- [Vite: módulos, carregamento e workers](https://vite.dev/guide/features.html)
- [PixiJS: performance](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Objetos transferíveis](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [RBush](https://github.com/mourner/rbush)
- [TanStack Virtual](https://tanstack.com/virtual/latest/docs/introduction)

## Resultado

A migração chegou ao build multipágina, à otimização do Canvas 2D, à indexação espacial, à sincronização de imagens em blocos e ao armazenamento binário das histórias. A adoção incremental de Svelte inclui a lista dos cadastros, chat, janelas, seleção gráfica, abas das fichas 5e, linhas de inventário e navegação do assistente.

O usuário aprovou o desempenho da implementação atual em 20/11/2026. O plano continua em andamento para a migração dos formulários e painéis legados e a validação dos fluxos funcionais restantes. Os comandos, as métricas já registradas e a avaliação do PixiJS estão no [relatório de validação](../../benchmarks/README.md).
