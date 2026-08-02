Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$script = @"
cd /app
docker-compose logs --tail 30 nginx-proxy letsencrypt
"@
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
