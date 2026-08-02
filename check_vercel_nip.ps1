$html = Invoke-RestMethod -Uri "https://cloudrad-mvp-frontend.vercel.app/"
$scripts = [regex]::Matches($html, 'src="([^"]+\.js)"') | ForEach-Object { $_.Groups[1].Value }

foreach ($s in $scripts) {
    Write-Output "Checking $s..."
    $jsUrl = "https://cloudrad-mvp-frontend.vercel.app$s"
    try {
        $js = Invoke-RestMethod -Uri $jsUrl
        $matches = [regex]::Matches($js, 'https://(?:api|pacs)\.[0-9a-zA-Z-]+\.nip\.io')
        foreach ($m in $matches) {
            Write-Output "FOUND API/PACS URL: $($m.Value)"
        }
    } catch {
        Write-Output "Failed to fetch $s"
    }
}
Write-Output "Finished checking bundles."
