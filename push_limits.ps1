Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))

Write-Output "Building tar..."
tar -czf cloudrad_deploy.tar.gz backend docker-compose.prod.yml pacs_location.conf client_max_body_size.conf .env

Write-Output "Uploading..."
Set-SCPItem -ComputerName 165.227.89.199 -Credential $cred -Path "d:\noor tela\CloudRad\cloudrad_deploy.tar.gz" -Destination "/root/" -AcceptKey

Write-Output "Extracting and updating containers..."
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$script = @"
cd /app
tar -xzf /root/cloudrad_deploy.tar.gz
mv docker-compose.prod.yml docker-compose.yml 2>/dev/null || true
docker-compose up -d --build
"@
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res.Output
Write-Output $res.Error
Remove-SSHSession -SessionId $s.SessionId
Write-Output "Done!"
