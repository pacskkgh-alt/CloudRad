$html = Invoke-RestMethod -Uri "https://cloudrad-mvp-frontend.vercel.app/"
$scripts = [regex]::Matches($html, 'src="([^"]+\.js)"') | ForEach-Object { $_.Groups[1].Value }

if ($scripts.Count -eq 0) {
    Write-Output "No JS files found in HTML."
}

foreach ($s in $scripts) {
    Write-Output "Checking $s..."
    $jsUrl = "https://cloudrad-mvp-frontend.vercel.app$s"
    try {
        $js = Invoke-RestMethod -Uri $jsUrl
        if ($js -match "167\.233\.227\.144") { Write-Output ">>> FOUND OLD IP '167.233.227.144' IN $s <<<" }
        if ($js -match "165\.227\.89\.199") { Write-Output ">>> FOUND NEW IP '165.227.89.199' IN $s <<<" }
    } catch {
        Write-Output "Failed to fetch $s"
    }
}
Write-Output "Finished checking bundles."
