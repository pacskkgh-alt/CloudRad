$oldIp1 = "165.227.89.199"
$newIp1 = "165.227.89.199"
$oldIp2 = "165-227-89-199"
$newIp2 = "165-227-89-199"
$path = "d:\noor tela\CloudRad"

$count = 0
Get-ChildItem -Path $path -Recurse -File | 
    Where-Object { 
        $_.Extension -match "\.(js|jsx|py|yml|yaml|conf|sh|ps1|md)$" -and
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\\.git\\"
    } | 
    ForEach-Object {
        $filePath = $_.FullName
        try {
            $content = [System.IO.File]::ReadAllText($filePath)
            if ($content.Contains($oldIp1) -or $content.Contains($oldIp2)) {
                $content = $content.Replace($oldIp1, $newIp1).Replace($oldIp2, $newIp2)
                [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
                Write-Host "Updated: $filePath"
                $count++
            }
        } catch { 
            Write-Host "Failed to read: $filePath"
        }
    }
Write-Host "Done! Updated $count files."
