Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey -Force -ConnectionTimeout 20

$script = @"
docker builder prune -a -f
cd /app
docker compose up -d
docker restart nginx-proxy
docker ps
"@
$res2 = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res2.Output
Write-Output $res2.Error
Remove-SSHSession -SessionId $s.SessionId

