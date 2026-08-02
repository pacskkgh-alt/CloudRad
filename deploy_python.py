import paramiko
import os

host = "165.227.89.199"
user = "root"
password = "Q1K2PagKT7a"
local_file = "cloudrad_deploy.tar.gz"
remote_file = "/root/cloudrad_deploy.tar.gz"

try:
    print("Connecting SSH...")
    transport = paramiko.Transport((host, 22))
    transport.connect(username=user, password=password)
    
    print("Connecting SFTP...")
    sftp = paramiko.SFTPClient.from_transport(transport)
    
    print("Uploading cloudrad_deploy.tar.gz...")
    sftp.put(local_file, remote_file)
    sftp.close()
    print("Upload complete!")

    print("Executing deployment script...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=60)
    
    script = """
mkdir -p /app
tar -xzf /root/cloudrad_deploy.tar.gz -C /app
cd /app
mv docker-compose.prod.yml docker-compose.yml
docker compose down
docker builder prune -a -f
docker compose build --no-cache
docker compose up -d --remove-orphans
    """
    
    stdin, stdout, stderr = client.exec_command(script)
    exit_status = stdout.channel.recv_exit_status() # Blocking call
    
    print("STDOUT:")
    print(stdout.read().decode('utf-8'))
    print("STDERR:")
    print(stderr.read().decode('utf-8'))
    print(f"Deployment completed with exit code {exit_status}")
    
    client.close()
    transport.close()
except Exception as e:
    print("Deployment Failed:", e)
