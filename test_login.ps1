$body = @{
    email = "admin@test.com"
    password = "password123"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.165-227-89-199.nip.io/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    Write-Output "Success!"
} catch {
    Write-Output "HTTP Status:"
    Write-Output $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Output $reader.ReadToEnd()
}
