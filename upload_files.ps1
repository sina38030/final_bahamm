# Simple script to upload files to server
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Upload Files to Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get server details
$serverUser = Read-Host "Server username (e.g., ubuntu or root)"
$serverHost = Read-Host "Server hostname or IP (e.g., bahamm.ir)"
$serverPath = Read-Host "Target path on server (e.g., /home/ubuntu/final_bahamm)"

Write-Host ""
Write-Host "Uploading to: ${serverUser}@${serverHost}:${serverPath}" -ForegroundColor Green
Write-Host ""

# Files to upload
$files = @(
    "nginx_server.conf",
    "start_backend_production.sh",
    "bahamm-backend.service",
    "test_server_setup.sh",
    "SERVER_SETUP_QUICKSTART.md",
    "SERVER_404_FIX_GUIDE.md"
)

# Check scp exists
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: scp not found!" -ForegroundColor Red
    Write-Host "Install OpenSSH Client from Windows Settings" -ForegroundColor Yellow
    exit 1
}

# Check files exist
$missing = @()
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing files:" -ForegroundColor Red
    foreach ($f in $missing) {
        Write-Host "  - $f" -ForegroundColor Red
    }
    exit 1
}

Write-Host "All files found. Starting upload..." -ForegroundColor Green
Write-Host ""

# Upload files
$success = 0
$failed = 0

foreach ($file in $files) {
    Write-Host "Uploading: $file ... " -NoNewline
    
    $dest = "${serverUser}@${serverHost}:${serverPath}/"
    
    try {
        $output = scp $file $dest 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host "FAILED" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All files uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Connect: ssh ${serverUser}@${serverHost}" -ForegroundColor Cyan
    Write-Host "2. Go to: cd ${serverPath}" -ForegroundColor Cyan
    Write-Host "3. Read: cat SERVER_SETUP_QUICKSTART.md" -ForegroundColor Cyan
} else {
    Write-Host "Some files failed to upload" -ForegroundColor Red
}

Write-Host ""

