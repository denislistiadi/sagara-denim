# Verifikasi restore ke database scratch melalui container ops.
#
# Contoh lokal:
#   .\backend\scripts\verify_restore.ps1 -Dump /backups/sagara_denim_xxx.dump
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Dump,
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
    $arguments += @("run", "--rm", "backup", "/scripts/verify_restore.sh", $Dump)

    & docker @arguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
