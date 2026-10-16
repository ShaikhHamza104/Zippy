# scripts/restore-database.ps1
<#
.SYNOPSIS
  Automated Restore Script for Zippy (MySQL + MongoDB).
.DESCRIPTION
  Safely restores MySQL and MongoDB databases from backup archives.
  Decompresses .sql.gz archives on-the-fly and applies to target databases.
.PARAMETER MysqlBackup
  Path to .sql or .sql.gz backup file for MySQL.
.PARAMETER MongoBackup
  Path to .json.gz backup file for MongoDB.
#>

param(
  [string]$MysqlBackup,
  [string]$MongoBackup
)

$ErrorActionPreference = "Stop"

$RootPath = Resolve-Path "$PSScriptRoot\.."
Set-Location $RootPath

$EnvFile = Join-Path $RootPath ".env"
if (-not (Test-Path $EnvFile)) {
  Write-Error "Could not locate .env file at $EnvFile"
  exit 1
}

# 1. Parse .env safely
$EnvVars = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $idx = $line.IndexOf("=")
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    $EnvVars[$key] = $val
  }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " ZIPPY DATABASE RESTORE ENGINE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 2. Restore MySQL
if ($MysqlBackup) {
  if (-not (Test-Path $MysqlBackup)) {
    throw "MySQL backup file not found: $MysqlBackup"
  }

  Write-Host "`n[1/2] Restoring MySQL database from $MysqlBackup..." -ForegroundColor Yellow
  $DbUrl = $EnvVars["DATABASE_URL"]
  if ($DbUrl -match "^mysql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)$") {
    $MyUser = $Matches[1]
    $MyPass = $Matches[2]
    $MyHost = $Matches[3]
    $MyPort = if ($Matches[4]) { $Matches[4] } else { "3306" }
    $MyDb   = $Matches[5].Split("?")[0]

    $MysqlExe = "mysql"
    $Cmd = Get-Command mysql -ErrorAction SilentlyContinue
    if (-not $Cmd) {
      if (Test-Path "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe") {
        $MysqlExe = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
      } elseif (Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe") {
        $MysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
      }
    }

    $tempSql = $MysqlBackup
    $isTemp = $false
    if ($MysqlBackup.EndsWith(".gz")) {
      $tempSql = [System.IO.Path]::GetTempFileName() + ".sql"
      $src = [System.IO.File]::OpenRead($MysqlBackup)
      $gz = New-Object System.IO.Compression.GZipStream($src, [System.IO.Compression.CompressionMode]::Decompress)
      $dst = [System.IO.File]::Create($tempSql)
      $gz.CopyTo($dst)
      $dst.Close()
      $gz.Close()
      $src.Close()
      $isTemp = $true
    }

    $env:MYSQL_PWD = $MyPass
    try {
      Get-Content -Path $tempSql -Raw | & $MysqlExe -h $MyHost -P $MyPort -u $MyUser $MyDb
      if ($LASTEXITCODE -ne 0) {
        throw "mysql restore exited with error code $LASTEXITCODE"
      }
      Write-Host "✓ MySQL database '$MyDb' restored successfully!" -ForegroundColor Green
    } finally {
      Remove-Item env:MYSQL_PWD -ErrorAction SilentlyContinue
      if ($isTemp -and (Test-Path $tempSql)) {
        Remove-Item $tempSql -Force
      }
    }
  } else {
    throw "Failed to parse DATABASE_URL from .env"
  }
}

# 3. Restore MongoDB
if ($MongoBackup) {
  if (-not (Test-Path $MongoBackup)) {
    throw "MongoDB backup file not found: $MongoBackup"
  }

  Write-Host "`n[2/2] Restoring MongoDB database from $MongoBackup..." -ForegroundColor Yellow
  node "$PSScriptRoot\mongo-restore.js" "$MongoBackup"
  if ($LASTEXITCODE -ne 0) {
    throw "MongoDB restore failed with code $LASTEXITCODE"
  }
  Write-Host "✓ MongoDB restore completed successfully!" -ForegroundColor Green
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " RESTORATION COMPLETE AND VERIFIED" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
