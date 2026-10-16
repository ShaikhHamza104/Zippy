<#
.SYNOPSIS
    Automated Windows Environment Setup for Zippy (Quick-Commerce Web App)
.DESCRIPTION
    Installs and configures all prerequisite runtimes, databases, GUI tools, and CLI utilities
    using Windows Package Manager (winget) and pinned versions.
    Reproduces Phase 0 setup.
.NOTES
    Author: Senior Full-Stack & DevOps Engineer for Hamza Shaikh
    Project: Zippy
#>

[CmdletBinding()]
param(
    [switch]$SkipWingetInstall,
    [switch]$SkipDbConfig
)

$ErrorActionPreference = 'Stop'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     ZIPPY - Phase 0 Windows Environment Setup Script      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify winget availability
Write-Host "`n[1/7] Verifying winget (Windows Package Manager)..." -ForegroundColor Yellow
try {
    $wingetVersion = winget --version
    Write-Host "Winget found: v$wingetVersion" -ForegroundColor Green
} catch {
    Write-Error "Winget is not installed or not in PATH. Please install App Installer from Microsoft Store."
    exit 1
}

# 2. Package installation list with pinned versions
$packages = @(
    @{ Name = "Git";                Id = "Git.Git";                    Version = "2.55.0.5"; Scope = "Machine" },
    @{ Name = "Node.js (LTS)";      Id = "OpenJS.NodeJS.LTS";          Version = "24.20.0";  Scope = "Machine" },
    @{ Name = "MySQL Server";       Id = "Oracle.MySQL";               Version = "8.4.9";    Scope = "Machine" },
    @{ Name = "MySQL Workbench";    Id = "Oracle.MySQLWorkbench";      Version = "26.7.0";   Scope = "Machine" },
    @{ Name = "MongoDB Server";     Id = "MongoDB.Server";             Version = "8.0.23";   Scope = "Machine" },
    @{ Name = "MongoDB Shell";      Id = "MongoDB.Shell";              Version = "2.13.0";   Scope = "User" },
    @{ Name = "MongoDB Compass";    Id = "MongoDB.Compass.Full";       Version = "1.53.0.0"; Scope = "User" },
    @{ Name = "Docker Desktop";     Id = "Docker.DockerDesktop";       Version = "4.95.0";   Scope = "Machine" },
    @{ Name = "VS Code";            Id = "Microsoft.VisualStudioCode"; Version = "1.142.0";  Scope = "User" },
    @{ Name = "Bruno API Client";   Id = "Bruno.Bruno";                Version = "4.2.1";    Scope = "User" }
)

if (-not $SkipWingetInstall) {
    Write-Host "`n[2/7] Installing pinned toolchain packages via winget..." -ForegroundColor Yellow
    foreach ($pkg in $packages) {
        Write-Host "Checking / Installing $($pkg.Name) ($($pkg.Id) @ v$($pkg.Version))..." -ForegroundColor Cyan
        try {
            winget install --id $pkg.Id --version $pkg.Version --exact --accept-package-agreements --accept-source-agreements --no-upgrade
        } catch {
            Write-Warning "winget install step for $($pkg.Name) returned: $_"
        }
    }
} else {
    Write-Host "`n[2/7] Skipping winget package installation by request." -ForegroundColor Gray
}

# 3. Environment PATH configuration
Write-Host "`n[3/7] Updating User PATH environment variable..." -ForegroundColor Yellow
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @(
    "C:\Program Files\MySQL\MySQL Server 8.4\bin",
    "C:\Program Files\MongoDB\Server\8.0\bin",
    "C:\Users\$env:USERNAME\AppData\Local\Programs\mongosh"
)

$currentList = ($userPath -split ';') | Where-Object { $_ -ne '' }
foreach ($p in $pathsToAdd) {
    if ($currentList -notcontains $p) {
        $currentList += $p
        Write-Host "  + Added to PATH: $p" -ForegroundColor Green
    }
}
$newUserPath = $currentList -join ';'
[System.Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + $newUserPath

# 4. Global Node.js tools
Write-Host "`n[4/7] Installing global npm packages (pnpm)..." -ForegroundColor Yellow
try {
    npm install -g pnpm
    Write-Host "pnpm installed: $(pnpm -v)" -ForegroundColor Green
} catch {
    Write-Warning "npm global install encountered an issue: $_"
}

# 5. MySQL Configuration
Write-Host "`n[5/7] Initializing MySQL 8.4 data directory and configuration..." -ForegroundColor Yellow
$dataDir = "C:\ProgramData\MySQL\MySQL Server 8.4\Data"
$myIni = "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"

if (-not (Test-Path "C:\ProgramData\MySQL\MySQL Server 8.4")) {
    New-Item -ItemType Directory -Path "C:\ProgramData\MySQL\MySQL Server 8.4" -Force | Out-Null
}

if (-not (Test-Path $myIni)) {
    @"
[mysqld]
basedir="C:/Program Files/MySQL/MySQL Server 8.4"
datadir="C:/ProgramData/MySQL/MySQL Server 8.4/Data"
port=3306
max_connections=151
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

[client]
port=3306
default-character-set=utf8mb4
"@ | Out-File -FilePath $myIni -Encoding ascii
    Write-Host "Created MySQL my.ini configuration file." -ForegroundColor Green
}

if (-not (Test-Path $dataDir) -or (Get-ChildItem $dataDir).Count -eq 0) {
    Write-Host "Running mysqld --initialize-insecure..." -ForegroundColor Cyan
    & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --initialize-insecure --datadir="C:/ProgramData/MySQL/MySQL Server 8.4/Data" --console
    Write-Host "MySQL data directory initialized." -ForegroundColor Green
}

# 6. MongoDB Service Verification
Write-Host "`n[6/7] Verifying MongoDB Windows Service..." -ForegroundColor Yellow
$mongoSvc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoSvc) {
    if ($mongoSvc.Status -ne 'Running') {
        Start-Service MongoDB
    }
    Write-Host "MongoDB Service is $($mongoSvc.Status) (Startup: $($mongoSvc.StartType))" -ForegroundColor Green
} else {
    Write-Warning "MongoDB Windows service not found. Verify MongoDB.Server installation."
}

# 7. Verification and Diagnostics
Write-Host "`n[7/7] Running diagnostic checks..." -ForegroundColor Yellow
Write-Host "Git:             $(git --version 2>&1)"
Write-Host "Node:            $(node -v 2>&1)"
Write-Host "npm:             $(npm -v 2>&1)"
Write-Host "pnpm:            $(pnpm -v 2>&1)"
Write-Host "MySQL Client:    $(mysql --version 2>&1)"
Write-Host "MongoDB Server:  $(mongod --version 2>&1 | Select-Object -First 1)"
Write-Host "MongoDB Shell:   $(mongosh --version 2>&1)"
Write-Host "Docker:          $(docker --version 2>&1)"

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  Phase 0 Setup Completed Successfully!                   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
