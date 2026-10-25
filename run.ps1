# Cyber Threat Intelligence Platform - 1-Click Startup Script
# Run with: .\run.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Cyber Threat Intelligence (CTI) Aggregator & AI Platform " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Environment configuration
if (-not (Test-Path ".env")) {
    Write-Host "[Setup] Initializing .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 2. Dependency verification
if (-not (Test-Path "node_modules")) {
    Write-Host "[Setup] Installing npm dependencies..." -ForegroundColor Yellow
    npm install
}

# 3. Optional Docker MongoDB check
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerRunning = (docker info 2>&1) -notmatch "error|failed|cannot connect"
    if ($dockerRunning) {
        Write-Host "[Database] Docker detected. Ensuring MongoDB container is running..." -ForegroundColor Green
        docker compose up -d mongodb
    } else {
        Write-Host "[Database] Docker is offline. Operating with resilient in-memory storage fallback." -ForegroundColor Yellow
    }
} else {
    Write-Host "[Database] Operating with resilient in-memory storage fallback for local demonstration." -ForegroundColor Yellow
}

# 4. Start Application
Write-Host "[Launch] Starting CTI Aggregator platform on http://localhost:5000..." -ForegroundColor Green
Write-Host "[Launch] Press Ctrl+C to terminate the server." -ForegroundColor Gray
npm run dev
