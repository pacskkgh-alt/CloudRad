[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
$login = Invoke-RestMethod -Uri 'https://api.165-227-89-199.nip.io/api/auth/login' -Method Post -Body '{"email":"admin@cloudrad.com","password":"CloudR@d!Admin2026"}' -ContentType 'application/json'
$token = $login.access_token
$headers = @{Authorization="Bearer $token"}
$clinics = Invoke-RestMethod -Uri 'https://api.165-227-89-199.nip.io/api/admin/clinics' -Method Get -Headers $headers
$users = Invoke-RestMethod -Uri 'https://api.165-227-89-199.nip.io/api/admin/users' -Method Get -Headers $headers
Write-Output "Clinics count: $($clinics.Count)"
Write-Output "Users count: $($users.Count)"
