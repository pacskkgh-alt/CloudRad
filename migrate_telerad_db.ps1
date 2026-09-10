Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$pythonScript = "
from database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text(""ALTER TABLE studies ADD COLUMN priority VARCHAR(50) DEFAULT 'routine'""))
        print('Added priority')
except Exception as e:
    print('Failed priority:', e)

try:
    with engine.begin() as conn:
        conn.execute(text(""ALTER TABLE studies ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'unassigned'""))
        print('Added workflow_status')
except Exception as e:
    print('Failed workflow_status:', e)
"
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pythonScript))

$res = Invoke-SSHCommand -SessionId $s.SessionId -Command "docker exec cloudrad_fastapi_prod python -c `"import base64; exec(base64.b64decode('$encoded').decode('utf-8'))`""
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
