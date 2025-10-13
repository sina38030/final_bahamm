#!/bin/bash

# Script برای راه‌اندازی Backend روی سرور Production
# این script باید روی سرور اجرا شود

echo "========================================="
echo "Starting Bahamm Backend (Production)"
echo "========================================="

# تنظیم مسیر پروژه - این را تغییر دهید
PROJECT_DIR="/path/to/final_bahamm"
BACKEND_DIR="$PROJECT_DIR/backend"
LOGS_DIR="$PROJECT_DIR/logs"
VENV_DIR="$PROJECT_DIR/venv"  # اگر virtual environment دارید

# ایجاد پوشه logs اگر وجود ندارد
mkdir -p "$LOGS_DIR"

# رفتن به پوشه backend
cd "$BACKEND_DIR" || {
    echo "Error: Cannot find backend directory at $BACKEND_DIR"
    exit 1
}

echo "Current directory: $(pwd)"

# بررسی اینکه آیا backend قبلاً در حال اجرا است
if pgrep -f "uvicorn main:app" > /dev/null; then
    echo "Backend is already running. Stopping it..."
    pkill -f "uvicorn main:app"
    sleep 3
    
    # اگر هنوز در حال اجرا است، force kill
    if pgrep -f "uvicorn main:app" > /dev/null; then
        echo "Force killing backend..."
        pkill -9 -f "uvicorn main:app"
        sleep 2
    fi
    
    echo "Backend stopped."
fi

# فعال کردن virtual environment اگر وجود دارد
if [ -d "$VENV_DIR" ]; then
    echo "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"
fi

# بررسی اینکه uvicorn نصب است
if ! command -v uvicorn &> /dev/null; then
    echo "Error: uvicorn not found. Please install it:"
    echo "pip install uvicorn[standard]"
    exit 1
fi

# بررسی اینکه main.py وجود دارد
if [ ! -f "main.py" ]; then
    echo "Error: main.py not found in $BACKEND_DIR"
    exit 1
fi

echo "Starting backend on http://127.0.0.1:8001"
echo "Logs will be written to: $LOGS_DIR/backend.log"
echo ""

# راه‌اندازی backend با nohup
nohup uvicorn main:app \
    --host 127.0.0.1 \
    --port 8001 \
    --workers 2 \
    --log-level info \
    > "$LOGS_DIR/backend.log" 2>&1 &

BACKEND_PID=$!

# انتظار کوتاه برای اطمینان از شروع
sleep 3

# بررسی اینکه process در حال اجرا است
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend started successfully!"
    echo "   PID: $BACKEND_PID"
    echo "   URL: http://127.0.0.1:8001"
    echo ""
    echo "To check logs:"
    echo "   tail -f $LOGS_DIR/backend.log"
    echo ""
    echo "To stop backend:"
    echo "   pkill -f 'uvicorn main:app'"
    echo ""
    
    # تست سریع
    sleep 2
    echo "Testing backend health..."
    if curl -s http://127.0.0.1:8001/api/health > /dev/null 2>&1; then
        echo "✅ Backend is responding!"
    else
        echo "⚠️  Warning: Backend started but not responding yet. Check logs."
    fi
else
    echo "❌ Error: Backend failed to start"
    echo "Check the logs: cat $LOGS_DIR/backend.log"
    exit 1
fi

echo ""
echo "========================================="
echo "Backend is running in background"
echo "========================================="

