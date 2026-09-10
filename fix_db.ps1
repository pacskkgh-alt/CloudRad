Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command 'docker exec cloudrad_fastapi_prod python -c "from database import engine; from sqlalchemy import text; conn = engine.connect(); conn.execute(text(\"ALTER TABLE studies ADD COLUMN study_instance_uid VARCHAR(255);\")); conn.commit(); conn.close()"'
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
