Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command 'docker logs --tail 20 cloudrad_fastapi_prod'
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
