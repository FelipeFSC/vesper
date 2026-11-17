# Vésper · instruções para o Claude

Mesa virtual de RPG que roda no navegador (estilo Roll20, genérica para qualquer sistema).
HTML, CSS e JavaScript puro, sem build e sem servidor próprio. Repositório: https://github.com/FelipeFSC/vesper

**Versão atual: 1.0** (veja [CHANGELOG.md](CHANGELOG.md)).

Leia antes de qualquer tarefa:

| Arquivo | O que tem |
|---|---|
| [docs/regras.md](docs/regras.md) | Regras de trabalho do usuário. **Obrigatório.** |
| [docs/arquitetura.md](docs/arquitetura.md) | Como o código é organizado: estado, ações, rede, arquivos |
| [docs/funcionalidades.md](docs/funcionalidades.md) | O que o sistema faz hoje e as regras de jogo de cada parte |
| [docs/testes.md](docs/testes.md) | Como testar no navegador sem tela (e não deixar processos rodando) |
| [plans/README.md](plans/README.md) | Como trabalhamos com planos a partir da 1.0 |

## Resumo do jeito de trabalhar

1. **Cada tarefa nova começa com um plano** em `.claude/plans/` (um arquivo por plano, numerado 1, 2, 3…), aprovado pelo usuário antes de implementar.
2. Toda função nova ganha **passo no tutorial** (`js/tutorial.js`), **seção na wiki** (`wiki/index.html`) e, se for importante, uma linha no **README**.
3. Tudo em **português do Brasil**, sem emojis, com ícones Lucide (`js/icons.js`).
4. O projeto é **local**: nada de publicar online (Artifacts, links) sem o usuário pedir. Subir no GitHub só quando ele pedir.
5. Depois de cada teste, **encerrar** o Edge sem tela e o servidor node e conferir que sobraram 0 processos.
