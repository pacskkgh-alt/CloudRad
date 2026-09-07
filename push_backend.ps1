Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))

Write-Output "Building deployment tar..."
tar -czf cloudrad_backend.tar.gz backend pacs_location.conf

Write-Output "Uploading to VPS /app/..."
Set-SCPItem -ComputerName 165.227.89.199 -Credential $cred -Path "d:\noor tela\CloudRad\cloudrad_backend.tar.gz" -Destination "/app/" -AcceptKey -Force

Write-Output "Extracting and updating containers..."
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey -Force
$script = @'
cd /app
tar -xzf cloudrad_backend.tar.gz
rm -f cloudrad_backend.tar.gz
docker restart nginx-proxy 2>/dev/null || true
docker compose up -d --build backend
echo "Backend and Nginx updated successfully!"
'@
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res.Output
if ($res.Error) { Write-Output $res.Error }
Remove-SSHSession -SessionId $s.SessionId

# Remove local tar
Remove-Item -Path "cloudrad_backend.tar.gz" -Force -ErrorAction SilentlyContinue

Write-Output "Deployment Complete!"

