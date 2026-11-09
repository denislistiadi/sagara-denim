# Restore dump ke database staging melalui container ops.
#
# Contoh lokal:
#   .\backend\scripts\restore_db.ps1 -Dump /backups/sagara_denim_xxx.dump
# Pemulihan darurat produksi:
#   .\backend\scripts\restore_db.ps1 -Production -Dump /backups/xxx.dump -AllowNonStaging
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Dump,
    [string]$EnvFile = "deploy/.env.local",
    [switch]$Production,
    [switch]$AllowNonStaging
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
    $arguments += @("run", "--rm")
    if ($AllowNonStaging) {
        $arguments += @("-e", "RESTORE_ALLOW_NON_STAGING=1")
    }
    $arguments += @("backup", "/scripts/restore_db.sh", $Dump)

    & docker @arguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
