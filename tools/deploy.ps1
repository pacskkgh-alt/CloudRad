# CloudRad Unified Deployment
# Replaces: deploy.ps1, deploy.js, deploy_fast.js, deploy_python.py, deploy_hetzner.py, reliable_deploy.ps1, hot_deploy.ps1
# Usage: .\tools\deploy.ps1 [-Backend] [-Full] [-HotReload]

param(
    [switch]$Backend,
    [switch]$Full,
    [switch]$HotReload
)

$ErrorActionPreference = "Stop"
$SERVER = "165.227.89.199"
$SSH = "root@$SERVER"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CloudRad Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($HotReload) {
    Write-Host "[1/2] Syncing backend code..." -ForegroundColor Yellow
    scp -r "d:\noor tela\CloudRad\backend\*.py" "${SSH}:/root/CloudRad/backend/"
    
    Write-Host "[2/2] Restarting backend container..." -ForegroundColor Yellow
    ssh $SSH "cd /root/CloudRad && docker-compose -f docker-compose.prod.yml restart backend"
    
    Write-Host "`n[DONE] Hot reload complete!" -ForegroundColor Green
    exit 0
}

if ($Backend -or $Full) {
    Write-Host "[1/4] Creating deployment archive..." -ForegroundColor Yellow
    $tarFiles = @("backend/", "docker-compose.prod.yml", ".env")
    if ($Full) { $tarFiles += "frontend/" }
    
    Push-Location "d:\noor tela\CloudRad"
    tar -czf cloudrad_deploy.tar.gz $tarFiles
    Pop-Location
    
    Write-Host "[2/4] Uploading to server..." -ForegroundColor Yellow
    scp "d:\noor tela\CloudRad\cloudrad_deploy.tar.gz" "${SSH}:/root/CloudRad/"
    
    Write-Host "[3/4] Extracting and rebuilding..." -ForegroundColor Yellow
    ssh $SSH @"
        cd /root/CloudRad && \
        tar -xzf cloudrad_deploy.tar.gz && \
        rm cloudrad_deploy.tar.gz && \
        docker-compose -f docker-compose.prod.yml up --build -d backend
"@
    
    Write-Host "[4/4] Verifying deployment..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-WebRequest -Uri "https://api.165-227-89-199.nip.io/health" -TimeoutSec 15 -UseBasicParsing
        Write-Host "`n[PASS] Backend is healthy ($($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "`n[WARN] Backend health check failed — may still be starting" -ForegroundColor Yellow
    }
    
    Write-Host "`n[DONE] Deployment complete!" -ForegroundColor Green
} else {
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\tools\deploy.ps1 -Backend     # Deploy backend only" -ForegroundColor Gray
    Write-Host "  .\tools\deploy.ps1 -Full         # Deploy backend + frontend" -ForegroundColor Gray
    Write-Host "  .\tools\deploy.ps1 -HotReload    # Quick code sync without rebuild" -ForegroundColor Gray
}
