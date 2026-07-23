import requests
import urllib3
urllib3.disable_warnings()

url = "https://pacs.165-227-89-199.nip.io/app/explorer.html"
headers = {
    "Referer": "https://cloudrad-mvp-frontend.vercel.app/"
}

print("Testing WITH the correct Vercel Referer...")
res = requests.get(url, headers=headers, verify=False)
print("Status:", res.status_code)
if res.status_code == 401:
    print("FAILED! The proxy is STILL asking for Basic Auth even with the Referer present!")
else:
    print("SUCCESS! The proxy let it through! Length of content:", len(res.text))

print("\nTesting WITHOUT Referer...")
res2 = requests.get(url, verify=False)
print("Status:", res2.status_code)

print("\nTesting WITH the Self-Referer...")
res3 = requests.get(url, headers={"Referer": "https://pacs.165-227-89-199.nip.io/app/explorer.html"}, verify=False)
print("Status:", res3.status_code)
