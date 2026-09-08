Import-Module Posh-SSH
$HostIP = "165.227.89.199"
$User = "root"
$PasswordText = "Q1K2PagKT7a"
$pass = ConvertTo-SecureString $PasswordText -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($User, $pass)

Write-Output "Accepting Host Key..."
$session = New-SSHSession -ComputerName $HostIP -Credential $cred -AcceptKey

Write-Output "Uploading cloudrad_deploy.tar.gz..."
$SessionId = $session.SessionId
Set-SCPItem -ComputerName $HostIP -Credential $cred -Path "d:\noor tela\CloudRad\cloudrad_deploy.tar.gz" -Destination "/root" -AcceptKey

Write-Output "Executing deployment background tasks..."
$Script = @"
mkdir -p /app
cd /app
tar -xzf /root/cloudrad_deploy.tar.gz
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io curl
mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
mv docker-compose.prod.yml docker-compose.yml
docker compose down
docker builder prune -a -f
nohup docker compose up -d --build > /app/deploy.log 2>&1 &
"@

$result = Invoke-SSHCommand -SessionId $SessionId -Command $Script
Write-Output $result.Output
Write-Output $result.Error

Remove-SSHSession -SessionId $SessionId
Write-Output "Deployment command sent to background successfully."
