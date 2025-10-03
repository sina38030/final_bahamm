# Standalone Setup Instructions

This guide will help you run the Bahamm application on your laptop's terminal, independent of Cursor IDE.

## 🚀 Quick Start

### Option 1: Start Both Services Together (Recommended)
Double-click `start_both_services.bat` in the project root directory. This will:
- Open two separate terminal windows
- Start the backend on http://127.0.0.1:8001
- Start the frontend on http://localhost:3000

### Option 2: Start Services Separately

#### Backend Only
Double-click `run_backend_standalone.bat` or run in terminal:
```bash
cd "C:\Users\User\OneDrive\Desktop\final project"
run_backend_standalone.bat
```

#### Frontend Only
Double-click `run_frontend_standalone.bat` or run in terminal:
```bash
cd "C:\Users\User\OneDrive\Desktop\final project"
run_frontend_standalone.bat
```

## 📋 What Each Script Does

### `run_backend_standalone.bat`
- Changes to the backend directory
- Sets DATABASE_URL to use `bahamm.db` (not the backup)
- Starts FastAPI server on http://127.0.0.1:8001
- Uses virtual environment if available, otherwise system Python
- Enables auto-reload for development

### `run_frontend_standalone.bat`
- Changes to the frontend directory
- Installs npm dependencies if needed
- Starts Next.js development server on http://localhost:3000
- Connects to backend at http://127.0.0.1:8001

### `start_both_services.bat`
- Starts both backend and frontend in separate terminal windows
- Waits 3 seconds between starting services
- Keeps both windows open for monitoring

## 🔧 Manual Setup (If Scripts Don't Work)

### Backend Setup
1. Open Command Prompt or PowerShell
2. Navigate to backend directory:
   ```bash
   cd "C:\Users\User\OneDrive\Desktop\final project\backend"
   ```
3. Set database environment variable:
   ```bash
   set DATABASE_URL=sqlite:///C:/Users/User/OneDrive/Desktop/final project/backend/bahamm.db
   ```
4. Start the server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```

### Frontend Setup
1. Open another Command Prompt or PowerShell
2. Navigate to frontend directory:
   ```bash
   cd "C:\Users\User\OneDrive\Desktop\final project\frontend"
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## 🗄️ Database Configuration

The backend is configured to use `bahamm.db` located in the backend directory:
- Path: `C:\Users\User\OneDrive\Desktop\final project\backend\bahamm.db`
- Type: SQLite database
- Size: ~397KB (contains your existing data)

## 🌐 Access URLs

- **Frontend (Main App)**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs
- **API Alternative Docs**: http://127.0.0.1:8000/redoc

## ❗ Troubleshooting

### Backend Issues
- **Port 8000 already in use**: Kill existing processes or change port in scripts
- **Database not found**: Check that `bahamm.db` exists in the backend directory
- **Python not found**: Install Python or check PATH environment variable
- **Module not found**: Install dependencies with `pip install fastapi uvicorn sqlalchemy`

### Frontend Issues
- **Port 3000 already in use**: Next.js will automatically use port 3001
- **npm not found**: Install Node.js from https://nodejs.org
- **Dependencies missing**: Run `npm install` in the frontend directory
- **Build errors**: Check that all TypeScript files are valid

### General Issues
- **Services stop when closing Cursor**: These scripts run independently of Cursor
- **Can't access from other devices**: Change host from `127.0.0.1` to `0.0.0.0` in scripts
- **Firewall blocking**: Allow Python and Node.js through Windows Firewall

## 🔄 Stopping Services

- **Individual windows**: Press `Ctrl+C` in each terminal window
- **All at once**: Close all terminal windows or press `Ctrl+C` in each

## 📝 Notes

- These scripts will continue running even after closing Cursor IDE
- The backend uses auto-reload, so changes to Python files will restart the server
- The frontend uses hot-reload, so changes to React/Next.js files will update automatically
- Both services need to be running for the full application to work
- The database file (`bahamm.db`) contains your existing data and will persist between runs

## 🆘 Need Help?

If you encounter issues:
1. Check that both Python and Node.js are installed
2. Verify the file paths in the scripts match your setup
3. Look at the console output for specific error messages
4. Try running the manual setup commands to isolate issues
