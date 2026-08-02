Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey

# Check docker ps
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command "docker ps -a"
Write-Output "---- DOCKER STATUS ----"
Write-Output $res.Output

# Create swap file if not exists
$Script = @"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo "Swap created!"
else
    echo "Swap already exists."
fi

# Also ensure containers are up
cd /app
docker-compose up -d
"@

$res2 = Invoke-SSHCommand -SessionId $s.SessionId -Command $Script
Write-Output "---- SWAP SCRIPT ----"
Write-Output $res2.Output
Write-Output $res2.Error
Remove-SSHSession -SessionId $s.SessionId
