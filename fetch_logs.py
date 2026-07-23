import paramiko

host = "165.227.89.199"
user = "root"
password = "hKmMgFjxWJW9H4d9KVvL"

try:
    print("Connecting to SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=10)
    print("Connected! Fetching logs...")
    
    stdin, stdout, stderr = client.exec_command("docker logs --tail 100 cloudrad_fastapi_prod")
    logs = stdout.read().decode('utf-8')
    errs = stderr.read().decode('utf-8')
    print("LOGS:", logs[-1500:])
    print("ERRS:", errs[-1500:])
    
    client.close()
except Exception as e:
    print("Failed SHH:", e)
