#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting FastAPI Backend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📁 Backend Directory: $PSScriptRoot" -ForegroundColor Yellow
Write-Host "🗄️  Database: bahamm.db.bak" -ForegroundColor Yellow
Write-Host "🌐 URL: http://127.0.0.1:8001" -ForegroundColor Yellow
Write-Host "📱 SMS: Melipayamak API Enabled" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Server will run independently of Cursor" -ForegroundColor Green
Write-Host "✅ Close Cursor anytime - server stays running" -ForegroundColor Green
Write-Host "✅ Press Ctrl+C to stop the server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Change to the backend directory
Set-Location -Path $PSScriptRoot

# Start the FastAPI server
try {
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
}
catch {
    Write-Host "❌ Error starting server: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
