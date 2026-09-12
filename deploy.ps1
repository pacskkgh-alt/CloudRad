# PowerShell Server Deployment Script
# Install Posh-SSH if missing
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Output "Installing Posh-SSH..."
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}
Import-Module Posh-SSH

$HostIP = "165.227.89.199"
$User = "root"
$PasswordText = "123456789"
$pass = ConvertTo-SecureString $PasswordText -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($User, $pass)

Write-Output "Accepting Host Key..."
$session = New-SSHSession -ComputerName $HostIP -Credential $cred -AcceptKey

Write-Output "Uploading cloudrad_deploy.tar.gz..."
$SessionId = $session.SessionId
Set-SCPItem -ComputerName $HostIP -Credential $cred -Path "d:\noor tela\CloudRad\cloudrad_deploy.tar.gz" -Destination "/root" -AcceptKey

Write-Output "Executing deployment commands..."
$Script = @"
# Aggressively stop and remove all running containers to free up memory
docker stop `$(docker ps -q)
docker rm `$(docker ps -aq)

# Completely wipe all old docker images, volumes, and networks for a fresh rebuild
docker system prune -a --volumes -f

# Add 2G swap space if it doesn't exist to prevent OOM errors during npm run build
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Fix DNS resolution if systemd-resolved crashed
echo 'nameserver 8.8.8.8' > /etc/resolv.conf
echo 'nameserver 1.1.1.1' >> /etc/resolv.conf

cd /app
rm -rf /app/*
tar -xzf /root/cloudrad_deploy.tar.gz
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io curl
mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
mv docker-compose.prod.yml docker-compose.yml

# Ensure files exist before docker-compose starts so they aren't created as directories
touch pacs_location.conf
echo 'client_max_body_size 100M;' > client_max_body_size.conf
docker compose down
docker builder prune -a -f
docker compose build --no-cache
docker compose up -d --remove-orphans
"@

$result = Invoke-SSHCommand -SessionId $SessionId -Command $Script -Timeout 1800
Write-Output $result.Output
Write-Output $result.Error

Remove-SSHSession -SessionId $SessionId
Write-Output "Deployment Complete!"
