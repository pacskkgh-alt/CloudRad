$urlBase = "https://api.165-227-89-199.nip.io"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 1. Login
$loginBody = "username=admin%40cloudrad.com&password=CloudR%40d%21Admin2026"
$loginRes = Invoke-RestMethod -Uri "$urlBase/api/auth/login" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
$token = $loginRes.access_token
Write-Output "Logged in as Admin"

# 2. Get Studies
$headers = @{ "Authorization" = "Bearer $token" }
$studies = Invoke-RestMethod -Uri "$urlBase/api/studies" -Method Get -Headers $headers
$studyId = $studies[0].id
Write-Output "Using study $studyId"

# 3. Create Link
$linkPayload = @{
    study_id = $studyId
    passcode = "1234"
} | ConvertTo-Json
$linkRes = Invoke-RestMethod -Uri "$urlBase/api/links/" -Method Post -Body $linkPayload -ContentType "application/json" -Headers $headers
$linkToken = $linkRes.token
Write-Output "Generated link token $linkToken"

# 4. Verify Link correctly
try {
    $verifyPayload = @{ passcode = "1234" } | ConvertTo-Json
    $verifyRes = Invoke-RestMethod -Uri "$urlBase/api/links/$linkToken/verify" -Method Post -Body $verifyPayload -ContentType "application/json"
    Write-Output "Verify successful!"
    $verifyRes | ConvertTo-Json
} catch {
    Write-Output "Verify failed!"
    $_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $reader.ReadToEnd()
}
