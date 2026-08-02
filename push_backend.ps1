Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))

Write-Output "Building tar..."
tar -czf cloudrad_backend.tar.gz backend/.

Write-Output "Uploading..."
Set-SCPItem -ComputerName 165.227.89.199 -Credential $cred -Path "d:\noor tela\CloudRad\cloudrad_backend.tar.gz" -Destination "/app/" -AcceptKey

Write-Output "Extracting and updating backend container..."
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$script = @"
cd /app
tar -xzf cloudrad_backend.tar.gz
nohup docker compose up -d --build backend > /app/deploy.log 2>&1 &
"@
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
Write-Output "Done!"
