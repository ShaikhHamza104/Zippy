<#
.SYNOPSIS
    Registers and starts MySQL 8.4 as a Windows Service.
.DESCRIPTION
    Must be executed in an Administrator PowerShell console.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Ensure running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Administrator rights required. Re-launching with elevation prompt..."
    try {
        Start-Process pwsh -Verb RunAs -Wait -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        exit
    } catch {
        Write-Error "Failed to elevate. Please right-click PowerShell -> 'Run as administrator' and execute: `n& '$PSCommandPath'"
        exit 1
    }
}

$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
$myIni = "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"

if (-not (Test-Path $mysqlBin)) {
    Write-Error "MySQL Server binary not found at $mysqlBin. Please install Oracle.MySQL via winget first."
    exit 1
}

# Stop any standalone mysqld process running if present
$existingProc = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if ($existingProc) {
    Write-Host "Stopping existing standalone mysqld process (PID $($existingProc.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $existingProc.Id -Force
    Start-Sleep -Seconds 2
}

# Check if service already exists
$svc = Get-Service -Name "MySQL84" -ErrorAction SilentlyContinue

if (-not $svc) {
    Write-Host "Installing MySQL84 Windows Service..." -ForegroundColor Cyan
    & $mysqlBin --install MySQL84 --defaults-file=$myIni
}

Write-Host "Configuring MySQL84 service startup to Automatic..." -ForegroundColor Cyan
Set-Service -Name MySQL84 -StartupType Automatic

Write-Host "Starting MySQL84 Windows Service..." -ForegroundColor Cyan
Start-Service -Name MySQL84

$svc = Get-Service -Name "MySQL84"
Write-Host "MySQL84 service is $($svc.Status) (Startup: $($svc.StartType))" -ForegroundColor Green
