# scripts/backup-database.ps1
<#
.SYNOPSIS
  Automated Backup Script for Zippy (MySQL + MongoDB).
.DESCRIPTION
  Safely extracts database connection parameters from .env without hardcoding secrets,
  exports full database dumps for both MySQL and MongoDB, and saves timestamped archives
  to the backups/ directory.
#>

param(
  [string]$BackupDir = "backups",
  [switch]$Compress = $true
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

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TargetDir = Join-Path $RootPath $BackupDir
if (-not (Test-Path $TargetDir)) {
  New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " ZIPPY AUTOMATED DATABASE BACKUP" -ForegroundColor Cyan
Write-Host " Timestamp: $Timestamp" -ForegroundColor Cyan
Write-Host " Output:    $TargetDir" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 2. Backup MySQL
$DbUrl = $EnvVars["DATABASE_URL"]
if ($DbUrl) {
  Write-Host "`n[1/2] Backing up MySQL database..." -ForegroundColor Yellow

  # Parse DATABASE_URL: mysql://USER:PASSWORD@HOST:PORT/DATABASE
  if ($DbUrl -match "^mysql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)$") {
    $MyUser = $Matches[1]
    $MyPass = $Matches[2]
    $MyHost = $Matches[3]
    $MyPort = if ($Matches[4]) { $Matches[4] } else { "3306" }
    $MyDb   = $Matches[5].Split("?")[0]

    $MysqlDumpPath = "mysqldump"
    $DumpCmd = Get-Command mysqldump -ErrorAction SilentlyContinue
    if (-not $DumpCmd) {
      if (Test-Path "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe") {
        $MysqlDumpPath = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"
      } elseif (Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe") {
        $MysqlDumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
      }
    }

    $SqlFile = Join-Path $TargetDir "mysql_${MyDb}_${Timestamp}.sql"
    
    # Run mysqldump with secure parameters
    $dumpArgs = @(
      "-h", $MyHost,
      "-P", $MyPort,
      "-u", $MyUser,
      "--no-tablespaces",
      "--result-file=$SqlFile",
      "--single-transaction",
      "--routines",
      "--triggers",
      $MyDb
    )

    $env:MYSQL_PWD = $MyPass
    try {
      & $MysqlDumpPath $dumpArgs
      if ($LASTEXITCODE -ne 0) {
        throw "mysqldump exited with error code $LASTEXITCODE"
      }
      $sqlSize = (Get-Item $SqlFile).Length / 1KB
      Write-Host "✓ MySQL dump generated: $SqlFile ($([math]::Round($sqlSize, 2)) KB)" -ForegroundColor Green

      if ($Compress) {
        $GzFile = "$SqlFile.gz"
        # Compress using .NET GZipStream
        $src = [System.IO.File]::OpenRead($SqlFile)
        $dst = [System.IO.File]::Create($GzFile)
        $gz = New-Object System.IO.Compression.GZipStream($dst, [System.IO.Compression.CompressionMode]::Compress)
        $src.CopyTo($gz)
        $gz.Close()
        $dst.Close()
        $src.Close()
        Remove-Item $SqlFile -Force
        $gzSize = (Get-Item $GzFile).Length / 1KB
        Write-Host "✓ Compressed MySQL archive: $GzFile ($([math]::Round($gzSize, 2)) KB)" -ForegroundColor Green
      }
    } finally {
      Remove-Item env:MYSQL_PWD -ErrorAction SilentlyContinue
    }
  } else {
    Write-Warning "Could not parse DATABASE_URL format."
  }
} else {
  Write-Warning "DATABASE_URL not found in .env. Skipping MySQL backup."
}

# 3. Backup MongoDB
$MongoUri = $EnvVars["MONGODB_URI"]
if ($MongoUri) {
  Write-Host "`n[2/2] Backing up MongoDB database..." -ForegroundColor Yellow
  $MongoDumpFile = Join-Path $TargetDir "mongo_backup_${Timestamp}.json.gz"

  # Use node backup script
  node "$PSScriptRoot\mongo-backup.js" "$MongoDumpFile"
  if ($LASTEXITCODE -ne 0) {
    throw "MongoDB backup failed with exit code $LASTEXITCODE"
  }
  Write-Host "✓ MongoDB dump generated: $MongoDumpFile" -ForegroundColor Green
} else {
  Write-Warning "MONGODB_URI not found in .env. Skipping MongoDB backup."
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " ALL DATABASE BACKUPS COMPLETED SAFELY" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
