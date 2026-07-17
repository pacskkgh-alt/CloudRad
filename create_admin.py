import paramiko

host = "167.233.227.144"
user = "root"
port = 22

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(host, port, user, key_filename=r"C:\Users\Administrator\.ssh\id_ed25519", timeout=10)
    
    cmd = """docker exec 2238505ecbe4_cloudrad_fastapi_prod python -c "import database, models, auth; db = database.SessionLocal(); clinic = db.query(models.Clinic).filter(models.Clinic.id == 'clinic-1').first(); clinic = clinic or models.Clinic(id='clinic-1', name='Default Clinic'); db.add(clinic); db.commit(); doc = models.Doctor(email='admin@cloudrad.com', full_name='Dr. Admin', password_hash=auth.pwd_context.hash('admin123'), clinic_id='clinic-1'); db.add(doc); db.commit(); print('Clinic and User created')" """
    
    print(f"--- {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    if out: print("OUT:", out)
    if err: print("ERR:", err)
            
except Exception as e:
    print("Failed script:", str(e))
finally:
    ssh.close()
