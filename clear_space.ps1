Import-Module Posh-SSH -ErrorAction SilentlyContinue
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
Write-Output "Checking Disk Space..."
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command "df -h; journalctl --vacuum-time=1d; apt-get clean;"
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
