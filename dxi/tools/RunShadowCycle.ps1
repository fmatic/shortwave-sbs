$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (
    Join-Path $PSScriptRoot "..\.."
)

Set-Location $ProjectRoot

Write-Host "Updating space weather..."

node .\tools\update-space-weather.js

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Space weather update failed. DXI cycle aborted."
    exit $LASTEXITCODE
}

Write-Host "Running DXI shadow logger..."

node .\dxi\tools\ShadowLogger.js

if ($LASTEXITCODE -ne 0) {
    Write-Warning "DXI shadow logger failed."
    exit $LASTEXITCODE
}

Write-Host "DXI shadow cycle completed."