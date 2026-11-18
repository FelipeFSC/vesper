# Testes

Os testes rodam o Vésper num **Edge sem tela** (headless), com um servidor node temporário. Os arquivos ficam em [../testes/](../testes/).

## Como funciona

`testes/runwalk.ps1` faz, a cada execução:
1. copia o `index.html` para `_test.html`, injetando o script de teste `_test.js` (os dois ficam fora do git);
2. sobe `testes/srv.js` (node, porta 8765) servindo a pasta do projeto;
3. abre o Edge sem tela com `--dump-dom` (para ler o log) ou `--screenshot` (para tirar foto);
4. **encerra o servidor** e apaga os arquivos temporários.

Cada script de teste escreve o resultado em `document.body.dataset.log` (um JSON com linhas de texto); o `runwalk.ps1` imprime essas linhas.

```powershell
# teste com log (o padrão abre ?tutorial)
powershell -NoProfile -File .claude/testes/runwalk.ps1 -js walk.js -out walk_out.html -budget 240000
# foto
powershell -NoProfile -File .claude/testes/runwalk.ps1 -js meu_teste.js -budget 6000 -shot foto.png
# sem tutorial (menu inicial)
powershell -NoProfile -File .claude/testes/runwalk.ps1 -js meu_teste.js -query '' -budget 8000
# tela menor (padrão 1440,900)
powershell -NoProfile -File .claude/testes/runwalk.ps1 -js menus.js -budget 15000 -size '1280,620'
# outra página (a página de ficha, Plano 23)
powershell -NoProfile -File .claude/testes/runwalk.ps1 -js ficha.js -page 'ficha.html' -query '' -budget 60000
```

Os scripts de teste (`-js`) e as saídas ficam na pasta do `runwalk.ps1`.

## Testes que precisam passar

- **`walk.js`**: percorre o tutorial inteiro fazendo cada passo. Precisa terminar com `final: Pronto` e `erros: []`, sem `NÃO CONCLUIU`. Quando um passo novo entra no tutorial, a lista `actions` do `walk.js` precisa ganhar a ação dele (os números são o índice do passo, começando em 0; inserir um passo desloca os seguintes).
- Um teste específico da função nova, com os casos de regra (ex.: alturas de muro, quem vê quem).

## Encerrar tudo (obrigatório)

Depois de cada rodada, conferir que não sobrou nada rodando:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'edgeprof_cb|srv\.js' -and $_.Name -notmatch 'powershell|bash' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
'processos de teste: ' + @(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'edgeprof_cb|srv\.js' -and $_.Name -notmatch 'powershell|bash' }).Count
```

O resultado precisa ser `processos de teste: 0`.

## Dicas

- Fotos de páginas roladas saem em branco no Edge sem tela: recorte a foto inteira ou monte uma cópia temporária só com o trecho.
- Para som, use `--autoplay-policy=no-user-gesture-required` (já está no `runwalk.ps1`) e carregue a faixa com `fetch` + `App.Audio.addFiles`.
- Recortes de foto para a wiki: `System.Drawing` no PowerShell, JPEG qualidade 85, salvos em `wiki/img/`.
- Python não está instalado; use node ou PowerShell.
- **Tempo virtual:** o `runwalk.ps1` usa `--virtual-time-budget`, então `performance.now()` não anda durante código síncrono (dá "0 ms"). Para medir desempenho, rode o código no node carregando os `js/*.js` num contexto com `window`/`document` falsos.
- Ao filtrar a saída por "EXC", lembre que o `Select-String` ignora maiúsculas ("excluir" também casa); procure por `EXC ` no começo da linha.
