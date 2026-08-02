import paramiko
import os
import sys
import time

host = "165.227.89.199"
user = "root"
password = "Q1K2PagKT7a"
port = 22

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting...")
    ssh.connect(host, port, user, password, timeout=10)
    print("Connected. Uploading file...")
    sftp = ssh.open_sftp()
    sftp.put("pacs_location.conf", "/app/pacs_location.conf")
    sftp.close()

    print("Restarting nginx-proxy...")
    stdin, stdout, stderr = ssh.exec_command("docker restart nginx-proxy")
    print(stdout.read().decode())
    print(stderr.read().decode())
    print("Done!")
except Exception as e:
    print(str(e))
finally:
    ssh.close()
