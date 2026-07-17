import paramiko
import os
import time

host = "167.233.227.144"
user = "root"
password = "hKmMgFjxWJW9H4d9KVvL"
port = 22

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Waiting for server to fully initialize...")
    time.sleep(10)
    print("Connecting...")
    # Retry loop for ssh connect
    for _ in range(5):
        try:
            ssh.connect(host, port, user, password, timeout=10)
            break
        except Exception:
            print("Retrying connection in 5 seconds...")
            time.sleep(5)
    else:
        raise Exception("Could not connect after 5 retries.")
        
    print("Connected. Uploading file...")
    sftp = ssh.open_sftp()
    sftp.put("cloudrad_deploy.tar.gz", "/root/cloudrad_deploy.tar.gz")
    sftp.close()

    ssh_key_path = os.path.expanduser("~/.ssh/id_ed25519.pub")
    pub_key = ""
    if os.path.exists(ssh_key_path):
        with open(ssh_key_path, "r") as f:
            pub_key = f.read().strip()
            
    print("Executing server commands...")
    commands = [
        f"mkdir -p ~/.ssh && echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" if pub_key else "echo 'No local ssh key'",
        "mkdir -p /app",
        "tar -xzf /root/cloudrad_deploy.tar.gz -C /app",
        "sudo apt-get update",
        "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose",
        "cd /app && mv docker-compose.prod.yml docker-compose.yml",
        "cd /app && docker-compose up -d --build"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        # Read blocks so we don't hang
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line, end="")
            
        err = stderr.read().decode()
        if err:
            print("ERROR ->", err)
            
    print("Deployment finished successfully!")
        
except Exception as e:
    print(str(e))
finally:
    ssh.close()
