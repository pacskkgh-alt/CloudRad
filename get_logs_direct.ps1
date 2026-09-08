Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command 'docker exec cloudrad_fastapi_prod cat /app/api_upload.py'
Set-Content -Path "docker_logs.txt" -Value $res.Output
Set-Content -Path "docker_err.txt" -Value $res.Error
Remove-SSHSession -SessionId $s.SessionId
