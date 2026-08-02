# CloudRad Unified Health Check
# Replaces: check_docker.ps1, check_ready.ps1, test_api.ps1, test_login.ps1
# Usage: .\tools\healthcheck.ps1 [-Remote]

param(
    [switch]$Remote
)

$ErrorActionPreference = "Continue"
$SERVER = "165.227.89.199"
$SSH = "root@$SERVER"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CloudRad Health Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-Endpoint {
    param([string]$Name, [string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-Host "[PASS] $Name ($($response.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

if ($Remote) {
    Write-Host "--- Remote Server Checks ---`n" -ForegroundColor Yellow

    # 1. Docker containers
    Write-Host "1. Docker Containers:" -ForegroundColor White
    ssh $SSH "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>$null
    Write-Host ""

    # 2. Disk space
    Write-Host "2. Disk Space:" -ForegroundColor White
    ssh $SSH "df -h / | tail -1" 2>$null
    Write-Host ""

    # 3. API Health
    Write-Host "3. API Endpoints:" -ForegroundColor White
    Test-Endpoint "Backend API Health" "https://api.165-227-89-199.nip.io/health"
    Test-Endpoint "Backend API Root" "https://api.165-227-89-199.nip.io/"
    Test-Endpoint "Backend API Docs" "https://api.165-227-89-199.nip.io/docs"
    Write-Host ""

    # 4. PACS Health (requires auth)
    Write-Host "4. PACS System:" -ForegroundColor White
    ssh $SSH "docker exec cloudrad_orthanc_prod curl -sf -u cloudrad_pacs:CloudR4d_P4cs_Secur3! http://localhost:8042/system | head -1" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] Orthanc PACS responding" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Orthanc PACS not responding" -ForegroundColor Red
    }
    Write-Host ""

    # 5. Database
    Write-Host "5. Database:" -ForegroundColor White
    ssh $SSH "docker exec cloudrad_postgres_prod pg_isready -U cloudrad_admin -d cloudrad_db" 2>$null
    Write-Host ""

} else {
    Write-Host "--- Local Development Checks ---`n" -ForegroundColor Yellow
    
    Test-Endpoint "Backend API" "http://localhost:8000/health"
    Test-Endpoint "Frontend" "http://localhost:5173"
    
    Write-Host ""
    Write-Host "Docker Containers:" -ForegroundColor White
    docker ps --format "table {{.Names}}`t{{.Status}}" 2>$null
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Health Check Complete" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
