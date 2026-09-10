import requests
import json

url = "https://api.165-227-89-199.nip.io/api/auth/login"
data = {"email": "admin@cloudrad.com", "password": "CloudR@d!Admin2026"}
login_res = requests.post(url, json=data, verify=False)
if not login_res.ok:
    print("Login failed:", login_res.status_code, login_res.text)
    exit(1)

token = login_res.json()["access_token"]
print("Acquired Token.")

upload_url = "https://api.165-227-89-199.nip.io/api/upload"
headers = {"Authorization": f"Bearer {token}"}

with open("test.txt", "w") as f:
    f.write("hello world")

files = [
    ('files', ('test.txt', open('test.txt', 'rb'), 'text/plain'))
]

upload_res = requests.post(upload_url, headers=headers, files=files, verify=False)
print("Upload Status:", upload_res.status_code)
print("Upload JSON:", upload_res.text)
