Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))

Write-Output "Uploading new pacs_location.conf..."
Set-SCPItem -ComputerName 165.227.89.199 -Credential $cred -Path "d:\noor tela\CloudRad\pacs_location.conf" -Destination "/app/" -AcceptKey

Write-Output "Restarting nginx-proxy..."
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command "docker restart nginx-proxy"
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
Write-Output "Done!"
