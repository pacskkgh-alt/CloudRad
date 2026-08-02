Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))

Write-Output "1. Testing SCP Upload..."
Set-SCPItem -ComputerName 165.227.89.199 -Credential $cred -Path "d:\noor tela\CloudRad\cloudrad_deploy.tar.gz" -Destination "/root/" -AcceptKey -Verbose

$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -al /root/"
Write-Output "2. Remote directory contents:"
Write-Output $res.Output

Write-Output "3. Extracting and running Docker Compose..."
$script = @"
cd /app
tar -xzf /root/cloudrad_deploy.tar.gz
# Ensure docker-compose is available
if ! command -v docker-compose &> /dev/null; then
  ln -sf ~/.docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
fi
# Use docker compose plugin
docker compose up -d
"@
$res2 = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res2.Output
Write-Output $res2.Error
Remove-SSHSession -SessionId $s.SessionId
