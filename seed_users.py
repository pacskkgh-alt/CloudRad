import os
import paramiko

host = os.getenv("DEPLOY_HOST", "167.233.227.144")
user = os.getenv("DEPLOY_USER", "root")
password = os.getenv("DEPLOY_PASSWORD", "hKmMgFjxWJW9H4d9KVvL")

if not os.getenv("DEPLOY_PASSWORD"):
    print("⚠️  Using default SSH credentials. Set DEPLOY_PASSWORD env var for production.")

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, 22, user, password)

    py_script = """import sys
import database
import models
import auth

db = next(database.get_db())
created = []

# Admin Account
existing_admin = db.query(models.Doctor).filter(models.Doctor.email == 'admin@cloudrad.com').first()
if not existing_admin:
    hashed_password = auth.hash_password('CloudR@d!Admin2026')
    admin = models.Doctor(full_name='System Admin', email='admin@cloudrad.com', password_hash=hashed_password, role='admin')
    db.add(admin)
    created.append('admin')

# Doctor Account
existing_doctor = db.query(models.Doctor).filter(models.Doctor.email == 'doctor@cloudrad.com').first()
if not existing_doctor:
    hashed_password = auth.hash_password('CloudR@d!Doc2026')
    doctor = models.Doctor(full_name='Dr. Test', email='doctor@cloudrad.com', password_hash=hashed_password, role='doctor')
    db.add(doctor)
    created.append('doctor')

# Tech (User) Account
existing_tech = db.query(models.Doctor).filter(models.Doctor.email == 'tech@cloudrad.com').first()
if not existing_tech:
    hashed_password = auth.hash_password('CloudR@d!Tech2026')
    tech = models.Doctor(full_name='Mr. Tech', email='tech@cloudrad.com', password_hash=hashed_password, role='user')
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
