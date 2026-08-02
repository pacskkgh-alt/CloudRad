Import-Module Posh-SSH -ErrorAction SilentlyContinue
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$script = @"
cd /app
mv docker-compose.prod.yml docker-compose.yml
docker compose up -d --remove-orphans
"@

$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script -TimeOut 300
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
