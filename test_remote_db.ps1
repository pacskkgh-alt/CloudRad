Import-Module Posh-SSH -ErrorAction SilentlyContinue
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$pyScript = @"
import database, models, auth
db = next(database.get_db())
link = db.query(models.SharedLink).order_by(models.SharedLink.created_at.desc()).first()
print('PASSCODE_HASH:', link.passcode_hash)
is_valid = auth.pwd_context.verify('1234', link.passcode_hash) if link.passcode_hash else False
print('VERIFY 1234:', is_valid)
"@

$cmd = "echo `"$pyScript`" > /tmp/db_test.py && docker exec cloudrad_fastapi_prod python /tmp/db_test.py"
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
