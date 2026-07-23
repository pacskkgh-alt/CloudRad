import requests
from database import SessionLocal
import models
from auth import create_access_token
import os

db = SessionLocal()
doc = db.query(models.Doctor).filter_by(email="tech@cloudrad.com").first()
token = create_access_token({"sub": doc.email, "role": doc.role})

with open("dummy.zip", "wb") as f:
    f.write(b"PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")

url = "https://api.165-227-89-199.nip.io/api/upload"
headers = {"Authorization": f"Bearer {token}"}
with open("dummy.zip", "rb") as f:
    res = requests.post(url, headers=headers, files={"file": f}, verify=False)
    
print("STATUS CODE:", res.status_code)
print("RESPONSE:", res.text)
