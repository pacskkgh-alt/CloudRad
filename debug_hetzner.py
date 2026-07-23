import paramiko
import sys

host = "165.227.89.199"
user = "root"
password = "ugLd4fcmFwRfxCWfuVpx"
port = 22

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(host, port, user, password, timeout=10)
    print("Connected.")
    
    commands = [
        "cat /var/log/cloud-init-output.log",
        "docker ps -a",
        "docker-compose -f /app/docker-compose.yml logs --tail 20"
    ]
    
    for cmd in commands:
        print(f"--- {cmd} ---")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err:
            print("ERROR ->", err)
            
except Exception as e:
    print("Failed script:", str(e))
finally:
    ssh.close()
