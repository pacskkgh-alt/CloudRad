import paramiko
import time

host = "165.227.89.199"
user = "root"
old_pass = "ugLd4fcmFwRfxCWfuVpx"
new_pass = "CloudRad_Prod_Pwd_2026!."
port = 22

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port, user, old_pass, timeout=10, allow_agent=False, look_for_keys=False)
    
    print("Connected! Opening interactive shell to handle password change...")
    shell = ssh.invoke_shell()
    
    time.sleep(2)
    output = shell.recv(1024).decode()
    print("Initial output:", output)
    
    # Send current password
    shell.send(old_pass + "\n")
    time.sleep(2)
    
    # Send new password
    shell.send(new_pass + "\n")
    time.sleep(2)
    
    # Send new password again
    shell.send(new_pass + "\n")
    time.sleep(2)
    
    print("Password change logic executed. Output:", shell.recv(4096).decode())
    
    # Now we are logged in, let's inject our SSH key
    with open(r"C:\Users\Administrator\.ssh\id_ed25519.pub", "r") as f:
        pub_key = f.read().strip()
        
    shell.send(f"mkdir -p ~/.ssh && echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys\n")
    time.sleep(1)
    
    # Read cloud-init logs just in case
    shell.send("cat /var/log/cloud-init-output.log | tail -n 20\n")
    time.sleep(2)
    print("Cloud init logs:", shell.recv(4096).decode())
    
except Exception as e:
    print("Error:", str(e))
finally:
    ssh.close()
