# 🚀 اسکریپت آپلود پروژه به سرور
# PowerShell

$SERVER = "ubuntu@188.121.103.118"
$PROJECT_PATH = "C:\Projects\final_bahamm"
$DEPLOY_ZIP = "bahamm-deploy.zip"

Write-Host "🚀 آپلود پروژه Bahamm به سرور..." -ForegroundColor Green

# 1️⃣ ساخت فایل zip
Write-Host "1️⃣ ساخت فایل zip..." -ForegroundColor Yellow
Set-Location $PROJECT_PATH

# حذف zip قبلی
if (Test-Path $DEPLOY_ZIP) {
    Remove-Item $DEPLOY_ZIP
}

# فشرده‌سازی (بدون node_modules و venv)
$items = @(
    "backend",
    "frontend", 
    "nginx.conf",
    "bahamm-backend.service",
    "requirements.txt",
    "deploy"
)

# ساخت پوشه موقت
$tempDir = ".\temp_deploy"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

foreach ($item in $items) {
    if (Test-Path $item) {
        if ((Get-Item $item).PSIsContainer) {
            # کپی پوشه بدون node_modules و venv
            robocopy $item "$tempDir\$item" /E /XD node_modules venv .next __pycache__ .git /XF *.db *.log | Out-Null
        } else {
            Copy-Item $item $tempDir
        }
    }
}

# فشرده‌سازی
Compress-Archive -Path "$tempDir\*" -DestinationPath $DEPLOY_ZIP -Force

# حذف پوشه موقت
Remove-Item -Recurse -Force $tempDir

Write-Host "✅ فایل zip ساخته شد: $DEPLOY_ZIP" -ForegroundColor Green

# 2️⃣ آپلود به سرور
Write-Host "2️⃣ آپلود به سرور..." -ForegroundColor Yellow
scp $DEPLOY_ZIP "${SERVER}:~/"

# 3️⃣ آپلود اسکریپت setup
Write-Host "3️⃣ آپلود اسکریپت setup..." -ForegroundColor Yellow
scp "deploy\setup_server.sh" "${SERVER}:~/"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ آپلود کامل شد!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 حالا به سرور وصل شو و این دستورات رو بزن:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh $SERVER" -ForegroundColor White
Write-Host "chmod +x setup_server.sh" -ForegroundColor White
Write-Host "./setup_server.sh" -ForegroundColor White
Write-Host ""
























