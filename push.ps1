# GitHub Push Script for Hostinger (Flattened Build)
Write-Host "Starting Production Build..." -ForegroundColor Cyan

# 1. Run the build process
node build.js
if ($LASTEXITCODE -ne 0) { exit }

# 2. Sync /dist contents to the root (excluding node_modules and .git)
Write-Host "Syncing build to root..." -ForegroundColor Cyan
Copy-Item -Path "dist\*" -Destination "." -Recurse -Force

# 3. Stage and Push
git add .
$commitMsg = Read-Host "Commit message (Enter for default)"
if (-not $commitMsg) { $commitMsg = "Production Deployment Build" }
git commit -m "$commitMsg"
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully deployed to GitHub!" -ForegroundColor Green
}
