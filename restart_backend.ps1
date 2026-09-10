Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
Invoke-SSHCommand -SessionId $s.SessionId -Command 'docker restart cloudrad_fastapi_prod'
Remove-SSHSession -SessionId $s.SessionId
