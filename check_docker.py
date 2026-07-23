import paramiko
try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('165.227.89.199', 22, 'root', 'hKmMgFjxWJW9H4d9KVvL')

    py_script = """import sys
import database
import models
import auth
db = next(database.get_db())
existing = db.query(models.Doctor).filter(models.Doctor.email == 'admin@cloudrad.com').first()
if not existing:
    hashed_password = auth.hash_password('admin123')
    admin = models.Doctor(full_name='System Admin', email='admin@cloudrad.com', password_hash=hashed_password, role='admin')
    db.add(admin)
    db.commit()
    print('CREATED')
else:
    existing.role = 'admin'
    existing.password_hash = auth.hash_password('admin123')
    db.commit()
    print('UPDATED')
"""
    sftp = ssh.open_sftp()
    with sftp.file('/app/create_admin.py', 'w') as f:
        f.write(py_script)
    sftp.close()

    ssh.exec_command("docker cp /app/create_admin.py cloudrad_fastapi_prod:/app/create_admin.py")
    _, stdout, stderr = ssh.exec_command("docker exec cloudrad_fastapi_prod python create_admin.py")
    out = stdout.read().decode('utf-8', 'ignore')
    err = stderr.read().decode('utf-8', 'ignore')
    
    print("STDOUT:", out)
    print("STDERR:", err)
    
except Exception as e:
    print(str(e))
finally:
    ssh.close()
