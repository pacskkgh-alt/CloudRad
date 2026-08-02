# CloudRad Unified Log Viewer
# Replaces: fetch_logs.ps1, fetch_logs.py, get_api_errors.ps1, get_latest_logs.ps1, get_live_logs.ps1, get_logs.ps1, get_nginx_logs.ps1
# Usage: .\tools\logs.ps1 [-Service backend|orthanc|nginx|db] [-Follow] [-Errors] [-Lines 100]

param(
    [ValidateSet("backend", "orthanc", "nginx", "db", "all")]
    [string]$Service = "backend",
    [switch]$Follow,
    [switch]$Errors,
    [int]$Lines = 50
)

$SERVER = "165.227.89.199"
$SSH = "root@$SERVER"

$containerMap = @{
    "backend" = "cloudrad_fastapi_prod"
    "orthanc" = "cloudrad_orthanc_prod"
    "db"      = "cloudrad_postgres_prod"
    "nginx"   = "nginx-proxy"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CloudRad Log Viewer — $Service" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($Service -eq "all") {
    foreach ($svc in @("backend", "orthanc", "nginx", "db")) {
        $container = $containerMap[$svc]
        Write-Host "--- $svc ($container) ---" -ForegroundColor Yellow
        ssh $SSH "docker logs --tail 20 $container 2>&1" 2>$null
        Write-Host ""
    }
    exit 0
}

$container = $containerMap[$Service]

if ($Follow) {
    Write-Host "Following logs for $container (Ctrl+C to stop)..." -ForegroundColor Yellow
    ssh $SSH "docker logs -f --tail $Lines $container 2>&1"
} elseif ($Errors) {
    Write-Host "Error logs for $container (last $Lines lines):" -ForegroundColor Yellow
    ssh $SSH "docker logs --tail $($Lines * 3) $container 2>&1 | grep -iE 'error|exception|fail|traceback|critical' | tail -$Lines"
} else {
    Write-Host "Last $Lines lines for $container:" -ForegroundColor Yellow
    ssh $SSH "docker logs --tail $Lines $container 2>&1"
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
