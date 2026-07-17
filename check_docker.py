import paramiko

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('167.233.227.144', 22, 'root', 'hKmMgFjxWJW9H4d9KVvL')

    _, stdout, stderr = ssh.exec_command('docker cp cloudrad_orthanc_prod:/tmp/orthanc.json orthanc.json && cat orthanc.json')
    print("CONFIG:", stdout.read().decode('utf-8', 'ignore'))
except Exception as e:
    print(str(e))
finally:
    ssh.close()
