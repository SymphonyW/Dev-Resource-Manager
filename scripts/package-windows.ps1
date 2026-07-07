[CmdletBinding()]
param(
    [string]$Platform = "windows/amd64",

    [ValidateSet("download", "embed", "browser", "error")]
    [string]$WebView2 = "download",

    [switch]$SkipClean,

    [switch]$SkipNsisCheck,

    [string[]]$ExtraArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BinDir = Join-Path $RepoRoot "build\bin"

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$InstallHint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found. $InstallHint"
    }
}

Assert-Command -Name "go" -InstallHint "Install Go 1.24 or newer."
Assert-Command -Name "npm" -InstallHint "Install Node.js and npm."
Assert-Command -Name "wails" -InstallHint "Run: go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0"

if (-not $SkipNsisCheck) {
    Assert-Command -Name "makensis" -InstallHint "Install NSIS, for example: winget install NSIS.NSIS --silent"
}

Push-Location $RepoRoot
try {
    $wailsArgs = @("build", "-platform", $Platform, "-webview2", $WebView2, "-nsis")

    if (-not $SkipClean) {
        $wailsArgs += "-clean"
    }

    if ($ExtraArgs.Count -gt 0) {
        $wailsArgs += $ExtraArgs
    }

    Write-Host "Running: wails $($wailsArgs -join ' ')"
    & wails @wailsArgs

    if ($LASTEXITCODE -ne 0) {
        throw "wails build -nsis failed with exit code $LASTEXITCODE."
    }

    Write-Host "Windows package outputs:"
    Get-ChildItem -LiteralPath $BinDir -File -ErrorAction SilentlyContinue |
        Sort-Object Name |
        ForEach-Object { Write-Host " - $($_.FullName)" }
}
finally {
    Pop-Location
}
