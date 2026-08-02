import requests, json

url_base = 'https://api.165-227-89-199.nip.io'

requests.packages.urllib3.disable_warnings()

login_data = {'username': 'admin@demo.com', 'password': 'password123'}
res = requests.post(f'{url_base}/api/auth/login', data=login_data, verify=False)
token = res.json().get('access_token')
print('Logged in:', res.status_code)

res = requests.get(f'{url_base}/api/studies', headers={'Authorization': f'Bearer {token}'}, verify=False)
studies = res.json()
if not studies:
    print('No studies found')
    exit()
study_id = studies[0]['id']
print('Found study:', study_id)

payload = {
    'study_id': study_id,
    'passcode': '1234'
}
res = requests.post(f'{url_base}/api/links/', json=payload, headers={'Authorization': f'Bearer {token}'}, verify=False)
print('Create link:', res.status_code, res.text)
link_token = res.json().get('token')

verify_payload = {'passcode': '1234'}
res = requests.post(f'{url_base}/api/links/{link_token}/verify', json=verify_payload, verify=False)
print('Verify link:', res.status_code, res.text)
