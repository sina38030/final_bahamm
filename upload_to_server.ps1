# Script برای آپلود فایل‌های راه‌حل به سرور
# این script در Windows PowerShell اجرا می‌شود

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Uploading Solution Files to Server" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# درخواست اطلاعات سرور
Write-Host "Please enter server details:" -ForegroundColor Yellow
Write-Host ""

$serverUser = Read-Host "Server username (e.g., root or your-user)"
$serverHost = Read-Host "Server hostname or IP (e.g., bahamm.ir or 1.2.3.4)"
$serverPath = Read-Host "Target path on server (e.g., /root/final_bahamm or /home/user/final_bahamm)"

Write-Host ""
Write-Host "Uploading to: ${serverUser}@${serverHost}:${serverPath}" -ForegroundColor Green
Write-Host ""

# لیست فایل‌ها برای آپلود
$files = @(
    "nginx_server.conf",
    "start_backend_production.sh",
    "bahamm-backend.service",
    "test_server_setup.sh",
    "SERVER_SETUP_QUICKSTART.md",
    "SERVER_404_FIX_GUIDE.md"
)

# بررسی وجود scp
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: scp command not found!" -ForegroundColor Red
    Write-Host "Please install OpenSSH Client:" -ForegroundColor Yellow
    Write-Host "Settings > Apps > Optional Features > Add a feature > OpenSSH Client" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use WinSCP or FileZilla to manually upload these files:" -ForegroundColor Yellow
    foreach ($file in $files) {
        Write-Host "  - $file" -ForegroundColor Cyan
    }
    exit 1
}

# بررسی وجود فایل‌ها
$missingFiles = @()
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "ERROR: Some files are missing:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    exit 1
}

Write-Host "All files found. Starting upload..." -ForegroundColor Green
Write-Host ""

# آپلود فایل‌ها
$success = 0
$failed = 0

foreach ($file in $files) {
    Write-Host "Uploading: $file ... " -NoNewline
    
    $destination = "${serverUser}@${serverHost}:${serverPath}/"
    
    try {
        scp $file $destination 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Upload Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Successful: $success" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ All files uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Connect to server: ssh ${serverUser}@${serverHost}" -ForegroundColor Cyan
    Write-Host "2. Go to project: cd ${serverPath}" -ForegroundColor Cyan
    Write-Host "3. Read guide: cat SERVER_SETUP_QUICKSTART.md" -ForegroundColor Cyan
    Write-Host "4. Follow the steps!" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Some files failed to upload" -ForegroundColor Red
    Write-Host "Please check your SSH connection and try again" -ForegroundColor Yellow
}

Write-Host ""

