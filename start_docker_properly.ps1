Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$script = @"
cd /app
mv docker-compose.prod.yml docker-compose.yml 2>/dev/null || true
nohup docker compose up -d --build > deploy.log 2>&1 &
"@
$res2 = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res2.Output
Write-Output $res2.Error
Remove-SSHSession -SessionId $s.SessionId
