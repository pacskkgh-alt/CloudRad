Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$res = Invoke-SSHCommand -SessionId $s.SessionId -Command "docker ps -a; echo '----'; tail -n 20 /app/deploy.log"
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
