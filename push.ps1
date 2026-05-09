# GitHub Push Script for Hostinger Shared Hosting (Pre-built)
Write-Host "Starting Production Build..." -ForegroundColor Cyan

# 1. Run the build process locally
node build.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed. Fix errors before pushing." -ForegroundColor Red
    exit
}

Write-Host "Build complete. Staging changes..." -ForegroundColor Cyan

# 2. Stage all changes (including the /dist folder)
git add .

# 3. Prompt for commit message
$commitMsg = Read-Host "Enter commit message (Press Enter for default)"
if (-not $commitMsg) { $commitMsg = "Production Build Update" }

# 4. Commit changes
git commit -m "$commitMsg"

# 5. Ensure local branch is named 'main' and push
Write-Host "Pushing pre-built assets to GitHub..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Hostinger Tip: Copy 'dist' folder contents to public_html." -ForegroundColor Cyan
} else {
    Write-Host "Error: Failed to push to GitHub." -ForegroundColor Red
}
