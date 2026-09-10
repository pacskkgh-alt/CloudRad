Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command 'docker exec cloudrad_fastapi_prod python -c "from database import engine; from sqlalchemy import text; conn = engine.connect(); res = conn.execute(text(\"SELECT column_name FROM information_schema.columns WHERE table_name=''studies'';\")).fetchall(); print([r[0] for r in res]); conn.close()"'
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
