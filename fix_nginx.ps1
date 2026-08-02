Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))

# Upload fixed file
Set-SCPItem -ComputerName 165.227.89.199 -Credential $cred -Path "d:\noor tela\CloudRad\pacs_location.conf" -Destination "/app" -AcceptKey

# Restart
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$script = @"
cd /app
docker compose restart nginx-proxy
"@
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command $script
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
