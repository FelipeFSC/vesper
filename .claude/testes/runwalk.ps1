param([string]$js = 'walk.js', [string]$out = 'walk_out.html', [int]$budget = 200000, [string]$query = '?tutorial', [string]$shot = '', [string]$size = '1440,900', [string]$page = 'index.html')
$sp = $PSScriptRoot
# Pasta do projeto: dois níveis acima desta (.claude/testes)
$proj = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$html = Get-Content "$proj\$page" -Raw -Encoding utf8
if ($page -eq 'index.html') { $html = $html.Replace('<script src="js/main.js"></script>', '<script src="js/main.js"></script><script src="_test.js"></script>') }
else { $html = $html.Replace('</body>', '<script src="_test.js"></script></body>') }
[IO.File]::WriteAllText("$proj\_test.html", $html, (New-Object Text.UTF8Encoding $false))
Copy-Item "$sp\$js" "$proj\_test.js" -Force
$srv = Start-Process node -ArgumentList "`"$sp\srv.js`"", $proj -PassThru -WindowStyle Hidden
Start-Sleep -Milliseconds 700
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$prof = "$sp\edgeprof_cb" + (Get-Random)
$url = "http://localhost:8765/_test.html$query"
try {
  if ($shot) {
    $p = Start-Process $edge -ArgumentList '--headless=new', '--disable-gpu', "--user-data-dir=$prof", "--window-size=$size", "--virtual-time-budget=$budget", "--autoplay-policy=no-user-gesture-required", "--screenshot=$sp\$shot", $url -PassThru -Wait -WindowStyle Hidden
  } else {
    $p = Start-Process $edge -ArgumentList '--headless=new', '--disable-gpu', "--user-data-dir=$prof", "--window-size=$size", "--virtual-time-budget=$budget", "--autoplay-policy=no-user-gesture-required", '--dump-dom', $url -PassThru -Wait -WindowStyle Hidden -RedirectStandardOutput "$sp\$out"
  }
} finally {
  Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
  Remove-Item "$proj\_test.html", "$proj\_test.js" -Force -ErrorAction SilentlyContinue
  # Perfil temporário do Edge (espera o Edge soltar os arquivos)
  Start-Sleep -Milliseconds 500
  Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not $shot) {
  $d = Get-Content "$sp\$out" -Raw -Encoding utf8
  $m = [regex]::Match($d, 'data-log="([^"]*)"')
  if ($m.Success) { ([System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) | ConvertFrom-Json) -join "`n" } else { 'sem log' }
}
