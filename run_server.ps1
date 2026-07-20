$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $projectRoot "venv\Scripts\python.exe"
$manage = Join-Path $projectRoot "manage.py"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Project virtual environment not found at: $python"
}

Write-Host "Using project Python: $python"
& $python $manage check
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $python $manage runserver
