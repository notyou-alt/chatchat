# ============================================
# Project Structure Tree Generator (ASCII-safe)
# Usage: .\generate-tree.ps1
# ============================================

param(
    [string]$outputFile = "PROJECT_STRUCTURE.md",
    [int]$maxDepth = 4
)

# Folders/patterns to exclude
$excludeNames = @(
    'node_modules',
    'dist',
    'dist-ssr',
    '.git',
    '.vscode',
    '.idea',
    '.next',
    'coverage',
    'build'
)

function Should-Exclude {
    param([string]$name)
    foreach ($pattern in $excludeNames) {
        if ($name -eq $pattern) { return $true }
    }
    if ($name -match '^\.env') { return $true }
    if ($name -like '*.log') { return $true }
    return $false
}

function Get-Tag {
    param([System.IO.FileSystemInfo]$item)

    if ($item.PSIsContainer) { return "[DIR]" }

    switch ($item.Extension.TrimStart('.').ToLower()) {
        "tsx"  { return "[TSX]" }
        "ts"   { return "[TS] " }
        "jsx"  { return "[JSX]" }
        "js"   { return "[JS] " }
        "json" { return "[JSON]" }
        "css"  { return "[CSS]" }
        "scss" { return "[CSS]" }
        "html" { return "[HTML]" }
        "md"   { return "[MD] " }
        "svg"  { return "[IMG]" }
        "png"  { return "[IMG]" }
        "jpg"  { return "[IMG]" }
        "jpeg" { return "[IMG]" }
        "yml"  { return "[CFG]" }
        "yaml" { return "[CFG]" }
        "lock" { return "[LOCK]" }
        default { return "[FILE]" }
    }
}

function Build-Tree {
    param(
        [string]$path,
        [int]$depth,
        [string]$prefix = ""
    )

    $items = @()
    if ($depth -gt $maxDepth) { return $items }

    try {
        $children = Get-ChildItem -Path $path -Force -ErrorAction SilentlyContinue |
            Where-Object { -not (Should-Exclude $_.Name) } |
            Sort-Object @{Expression = { $_.PSIsContainer }; Descending = $true }, Name

        for ($i = 0; $i -lt $children.Count; $i++) {
            $child = $children[$i]
            $isLast = ($i -eq $children.Count - 1)
            $connector = if ($isLast) { "+-- " } else { "|-- " }
            $tag = Get-Tag -item $child
            $suffix = if ($child.PSIsContainer) { "/" } else { "" }

            $items += "$prefix$connector$tag $($child.Name)$suffix"

            if ($child.PSIsContainer) {
                $nextPrefix = if ($isLast) { "$prefix    " } else { "$prefix|   " }
                $items += Build-Tree -path $child.FullName -depth ($depth + 1) -prefix $nextPrefix
            }
        }
    }
    catch {
        Write-Host "Error processing $path : $_" -ForegroundColor Red
    }

    return $items
}

# ============================================
# Main
# ============================================

Write-Host "Generating project structure..." -ForegroundColor Green

$content = @()
$content += "PROJECT STRUCTURE"
$content += "=================="
$content += ""

# Adjust these target paths to match your actual repo layout
$targets = @("frontend", "backend", "src") | Where-Object { Test-Path $_ }

if ($targets.Count -eq 0) {
    # Fallback: no frontend/backend/src folder found, just tree current dir
    $content += "."
    $content += (Build-Tree -path "." -depth 0)
}
else {
    foreach ($target in $targets) {
        $content += "$target/"
        $content += (Build-Tree -path $target -depth 0 -prefix "")
        $content += ""
    }
}

# Root-level files
$content += "Root files:"
$rootFiles = Get-ChildItem -Path . -Force -ErrorAction SilentlyContinue |
    Where-Object { -not $_.PSIsContainer -and -not (Should-Exclude $_.Name) } |
    Sort-Object Name

foreach ($file in $rootFiles) {
    $tag = Get-Tag -item $file
    $content += "$tag $($file.Name)"
}

# Write output as plain UTF-8
$content | Out-File -FilePath $outputFile -Encoding utf8

Write-Host ""
Write-Host "Saved to: $outputFile" -ForegroundColor Green
Write-Host ""
$content | Select-Object -First 60 | ForEach-Object { Write-Host $_ }
if ($content.Count -gt 60) {
    $remaining = $content.Count - 60
    Write-Host "... ($remaining more lines)" -ForegroundColor Gray
}