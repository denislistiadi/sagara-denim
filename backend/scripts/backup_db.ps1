# Jalankan backup melalui container ops.
#
# Contoh lokal:
#   .\backend\scripts\backup_db.ps1
# Produksi (dari checkout di VPS):
#   .\backend\scripts\backup_db.ps1 -Production
[CmdletBinding()]
param(
    [string]$EnvFile = "deploy/.env.local",
    [switch]$Production
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    $arguments = @(
        "compose", "--env-file", $EnvFile, "--profile", "ops",
        "-f", "deploy/compose.prod.yml"
    )
    if (-not $Production) {
        $arguments += @("-f", "deploy/compose.local.yml")
    }
    $arguments += @("run", "--rm", "backup", "/scripts/backup_db.sh")

    & docker @arguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
