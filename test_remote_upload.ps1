Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

$script = @"
cd /app
cat << 'EOF' > test_upload.py
import requests

url = "http://127.0.0.1:8000/api/auth/login"
data = {"email": "admin@cloudrad.com", "password": "CloudR@d!Admin2026"}
login_res = requests.post(url, json=data)
if not login_res.ok:
    print("Login failed:", login_res.status_code)
    exit(1)

token = login_res.json()["access_token"]
print("Acquired Token.")

upload_url = "http://127.0.0.1:8000/api/upload"
headers = {"Authorization": f"Bearer {token}"}

# Create dummy file payload
with open("test.txt", "w") as f:
    f.write("hello world")

files = [
    ('files', ('test.txt', open('test.txt', 'rb'), 'text/plain'))
]

upload_res = requests.post(upload_url, headers=headers, files=files)
print("Upload Status:", upload_res.status_code)
print("Upload JSON:", upload_res.text)
EOF
python3 test_upload.py
"@

$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
