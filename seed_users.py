import os
import sys
import paramiko

DEFAULT_HOST = "165.227.89.199"
DEFAULT_USER = "root"
DEFAULT_PASS = "hKmMgFjxWJW9H4d9KVvL"
DEFAULT_PORT = 22

host = os.getenv("DEPLOY_HOST", DEFAULT_HOST)
user = os.getenv("DEPLOY_USER", DEFAULT_USER)
password = os.getenv("DEPLOY_PASSWORD", DEFAULT_PASS)
port = int(os.getenv("DEPLOY_PORT", DEFAULT_PORT))

if password == DEFAULT_PASS or not os.getenv("DEPLOY_PASSWORD"):
    print("\n⚠️  [SECURITY WARNING] Using fallback default SSH credentials! Set DEPLOY_PASSWORD env var for production.\n", file=sys.stderr)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port, user, password)

    admin_pass = os.getenv("SEED_ADMIN_PASSWORD", "CloudR@d!Admin#2026$Secured")
    doctor_pass = os.getenv("SEED_DOCTOR_PASSWORD", "CloudR@d!Doc#2026$Secured")
    tech_pass = os.getenv("SEED_TECH_PASSWORD", "CloudR@d!Tech#2026$Secured")

    py_script = f"""import sys
import database
import models
import auth

db = next(database.get_db())
created = []

# Admin Account
existing_admin = db.query(models.Doctor).filter(models.Doctor.email == 'admin@cloudrad.com').first()
if not existing_admin:
    hashed_password = auth.hash_password('{admin_pass}')
    admin = models.Doctor(full_name='System Admin', email='admin@cloudrad.com', password_hash=hashed_password, role='admin', is_active=True)
    db.add(admin)
    created.append('admin')

# Doctor Account
existing_doctor = db.query(models.Doctor).filter(models.Doctor.email == 'doctor@cloudrad.com').first()
if not existing_doctor:
    hashed_password = auth.hash_password('{doctor_pass}')
    doctor = models.Doctor(full_name='Dr. Radiologist', email='doctor@cloudrad.com', password_hash=hashed_password, role='doctor', is_active=True)
    db.add(doctor)
    created.append('doctor')

# Tech (User) Account
existing_tech = db.query(models.Doctor).filter(models.Doctor.email == 'tech@cloudrad.com').first()
if not existing_tech:
    hashed_password = auth.hash_password('{tech_pass}')
    tech = models.Doctor(full_name='Tech Operator', email='tech@cloudrad.com', password_hash=hashed_password, role='user', is_active=True)
    db.add(tech)
    created.append('tech')

db.commit()
print('CREATED_ROLES:', created)
"""
    sftp = ssh.open_sftp()
    with sftp.file('/app/seed_users.py', 'w') as f:
        f.write(py_script)
    sftp.close()

    ssh.exec_command("docker cp /app/seed_users.py cloudrad_fastapi_prod:/app/seed_users.py")
    _, stdout, stderr = ssh.exec_command("docker exec cloudrad_fastapi_prod python seed_users.py")
    out = stdout.read().decode('utf-8', 'ignore')
    
    print("STDOUT:", out)
    
except Exception as e:
    print(str(e))
finally:
    ssh.close()
