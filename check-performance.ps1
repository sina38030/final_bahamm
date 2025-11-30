# Production Performance Check Script
# Run this to check if your optimizations are working

Write-Host "🔍 Checking Production Performance" -ForegroundColor Green
Write-Host ""

$SERVER = "ubuntu@185.231.181.208"
$KEY = "C:\Users\User\.ssh\id_rsa"

$checkCommand = @"
cd /srv/app && \
echo '📊 Container Status:' && \
echo '===================' && \
docker-compose -f docker-compose.prod.yml ps && \
echo '' && \
echo '🔧 Backend Workers (should see 5 processes - 1 master + 4 workers):' && \
echo '===================================================================' && \
docker-compose -f docker-compose.prod.yml exec -T backend ps aux | grep gunicorn | grep -v grep | wc -l && \
docker-compose -f docker-compose.prod.yml exec -T backend ps aux | grep gunicorn | grep -v grep && \
echo '' && \
echo '💾 Resource Usage:' && \
echo '==================' && \
docker stats --no-stream && \
echo '' && \
echo '📈 Nginx Cache Stats (last 100 requests):' && \
echo '==========================================' && \
docker-compose -f docker-compose.prod.yml logs --tail=100 nginx | grep -o 'X-Cache-Status: [A-Z]*' | sort | uniq -c && \
echo '' && \
echo '🌐 API Health Check:' && \
echo '=====================' && \
curl -s -o /dev/null -w 'Response Time: %{time_total}s\nHTTP Code: %{http_code}\n' https://bahamm.ir/api/health && \
echo '' && \
echo '✅ Performance check complete!'
"@

Write-Host "Connecting to server..." -ForegroundColor Cyan
Write-Host ""

ssh -i $KEY $SERVER $checkCommand

Write-Host ""
Write-Host "💡 Interpretation:" -ForegroundColor Yellow
Write-Host "  - Backend workers: Should be 5 (1 master + 4 workers)"
Write-Host "  - Cache HIT rate: Should be >50% after warm-up"
Write-Host "  - Response time: Should be <200ms for cached requests"
Write-Host "  - CPU usage: Should be <40% under normal load"
Write-Host ""

