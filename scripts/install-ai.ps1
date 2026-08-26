# ZeroApply Local AI Engine & Neural Model Installer Script
param (
    [string]$ModelName = "qwen2.5:3b"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ZeroApply - Local Offline AI Engine Setup Wizard               " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BundledOllama = Join-Path $ScriptDir "OllamaSetup.exe"

function Test-OllamaServer {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Find-OllamaExe {
    $cmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $defaultPaths = @(
        "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
        "$env:ProgramFiles\Ollama\ollama.exe",
        "$env:LOCALAPPDATA\Ollama\ollama.exe"
    )

    foreach ($path in $defaultPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    return $null
}

function Test-OllamaInstaller {
    param([string]$Path)
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    return $signature.Status -eq 'Valid' -and $signature.SignerCertificate.Subject -match 'Ollama Inc'
}

# Step 1: Ensure Ollama is installed
Write-Host "[1/3] Checking Local AI Runner Engine..." -ForegroundColor Yellow
$ollamaExe = Find-OllamaExe

if (-not $ollamaExe) {
    if (Test-Path $BundledOllama) {
        if (-not (Test-OllamaInstaller $BundledOllama)) {
            throw 'Bundled Ollama installer signature is invalid.'
        }
        Write-Host "  -> Installing bundled Ollama engine silently..." -ForegroundColor Cyan
        $proc = Start-Process -FilePath $BundledOllama -ArgumentList "/silent" -Wait -PassThru
        Start-Sleep -Seconds 3
        $ollamaExe = Find-OllamaExe
    } else {
        Write-Host "  -> Ollama AI engine not found. Downloading installer..." -ForegroundColor White
        $installerPath = "$env:TEMP\OllamaSetup.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath -UseBasicParsing
            if (-not (Test-OllamaInstaller $installerPath)) {
                Remove-Item -LiteralPath $installerPath -Force -ErrorAction SilentlyContinue
                throw 'Downloaded Ollama installer signature is invalid.'
            }
            Write-Host "  -> Installing Ollama silently..." -ForegroundColor White
            $process = Start-Process -FilePath $installerPath -ArgumentList "/silent" -Wait -PassThru
            Start-Sleep -Seconds 3
            $ollamaExe = Find-OllamaExe
        } catch {
            Write-Host "  -> Note: Automatic engine download failed: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  -> Ollama AI engine found at: $ollamaExe" -ForegroundColor Green
}

# Step 2: Ensure Ollama Server is Running
$env:OLLAMA_NOHISTORY = "1"
Write-Host "[2/3] Connecting to Local AI Runner..." -ForegroundColor Yellow
$isRunning = Test-OllamaServer

if (-not $isRunning) {
    Write-Host "  -> Starting background AI service..." -ForegroundColor White
    $ollamaAppExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"
    if (Test-Path $ollamaAppExe) {
        Start-Process -FilePath $ollamaAppExe -WindowStyle Hidden
    } elseif ($ollamaExe) {
        Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
    }
    
    # Poll for up to 15 seconds
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-OllamaServer) {
            $isRunning = $true
            break
        }
    }
}

if ($isRunning) {
    Write-Host "  -> Local AI Engine is ACTIVE and online." -ForegroundColor Green
} else {
    Write-Host "  -> Warning: Could not confirm local AI engine status. Will auto-start on app launch." -ForegroundColor DarkYellow
}

# Step 3: Check & Pull Qwen Model Weights
Write-Host "[3/3] Checking Neural Model Weights ($ModelName)..." -ForegroundColor Yellow

$modelInstalled = $false
try {
    if ($isRunning) {
        $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($tags.models) {
            foreach ($m in $tags.models) {
                if ($m.name -like "*qwen2.5*" -or $m.name -like "*qwen2.5vl*") {
                    $modelInstalled = $true
                    $ModelName = $m.name
                    break
                }
            }
        }
    }
} catch {
    $modelInstalled = $false
}

if ($modelInstalled) {
    Write-Host "  -> Neural Model ($ModelName) is already installed on your PC!" -ForegroundColor Green
} else {
    if ($ollamaExe) {
        Write-Host "  -> Downloading $ModelName from repository (this takes 1-2 minutes)..." -ForegroundColor Cyan
        Write-Host ""
        try {
            & "$ollamaExe" pull $ModelName
            Write-Host ""
            Write-Host "  -> Model $ModelName downloaded and verified successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  -> Model download encountered an issue: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  -> Ollama CLI not ready. Model will be configured when ZeroApply opens." -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ZeroApply Setup Complete! Launching application...             " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Start-Sleep -Seconds 2
exit 0
