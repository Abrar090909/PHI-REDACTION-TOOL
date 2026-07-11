# start_backend.ps1 — Activate venv and start the FastAPI server
# Run from anywhere: .\backend\start_backend.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Activating Python 3.10 venv..." -ForegroundColor Cyan
& "$scriptDir\venv\Scripts\Activate.ps1"

Set-Location $scriptDir

Write-Host "Starting MedRedact backend on http://localhost:8000 ..." -ForegroundColor Green
& "$scriptDir\venv\Scripts\uvicorn.exe" main:app --reload
