Import-Module Posh-SSH
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'Q1K2PagKT7a' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 165.227.89.199 -Credential $cred -AcceptKey
$res = Invoke-SSHCommand -SessionId $s.SessionId -Command 'apt-get clean && apt-get autoremove -y; journalctl --vacuum-time=1d; df -h'
Write-Output $res.Output
Remove-SSHSession -SessionId $s.SessionId
