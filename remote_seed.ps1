Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$pyScript = @"
import sys
import database
import models
import auth
db = next(database.get_db())
created = []

existing_admin = db.query(models.Doctor).filter(models.Doctor.email == 'admin@cloudrad.com').first()
if not existing_admin:
    hashed_password = auth.hash_password('CloudR@d!Admin2026')
    admin = models.Doctor(full_name='System Admin', email='admin@cloudrad.com', password_hash=hashed_password, role='admin')
    db.add(admin)
    created.append('admin')

existing_doctor = db.query(models.Doctor).filter(models.Doctor.email == 'doctor@cloudrad.com').first()
if not existing_doctor:
    hashed_password = auth.hash_password('CloudR@d!Doc2026')
    doctor = models.Doctor(full_name='Dr. Test', email='doctor@cloudrad.com', password_hash=hashed_password, role='doctor')
    db.add(doctor)
    created.append('doctor')

existing_tech = db.query(models.Doctor).filter(models.Doctor.email == 'tech@cloudrad.com').first()
if not existing_tech:
    hashed_password = auth.hash_password('CloudR@d!Tech2026')
    tech = models.Doctor(full_name='Mr. Tech', email='tech@cloudrad.com', password_hash=hashed_password, role='user')
    db.add(tech)
    created.append('tech')

db.commit()
print('CREATED_ROLES:', created)
"@

$cmd = @"
cat << 'EOF' > /app/run_seed.py
$pyScript
EOF
docker cp /app/run_seed.py cloudrad_fastapi_prod:/app/run_seed.py
docker exec cloudrad_fastapi_prod python run_seed.py
"@

$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
