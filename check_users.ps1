Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$cmd = 'docker exec cloudrad_fastapi_prod python -c "from database import engine; from sqlalchemy import text; conn = engine.connect(); res = conn.execute(text(\"SELECT id, email, role, is_active FROM doctors;\")).fetchall(); print(res); conn.close()"'
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
