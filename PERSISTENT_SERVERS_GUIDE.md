# 🚀 Running Servers Persistently (Independent of Cursor)

This guide shows you how to run your localhost servers (port 3000 and 8001) on your laptop so they continue running even when you close Cursor.

## 📋 Available Scripts

### Option 1: Run Both Servers Together (Recommended)
```bash
# Double-click this file:
run_both_servers_persistent.bat

# Or run from command line:
.\run_both_servers_persistent.bat
```

### Option 2: Run Servers Separately
```bash
# Backend only (port 8001):
.\run_backend_persistent.bat

# Frontend only (port 3000):  
.\run_frontend_persistent.bat
```

### Option 3: PowerShell Version (Alternative)
```bash
# Run both servers with PowerShell:
.\run_servers_persistent.ps1
```

## 🌐 Server URLs

Once running, your servers will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8001
- **Admin Panel**: http://localhost:3000/admin-full

## ✅ Key Benefits

1. **Independent of Cursor**: Servers keep running even if you close Cursor
2. **Persistent**: Servers run until you manually stop them
3. **Auto-cleanup**: Scripts automatically kill existing processes on those ports
4. **Auto-install**: Frontend dependencies are installed automatically if missing

## 🛑 How to Stop Servers

### Method 1: Close Server Windows
- Each server opens in its own command window
- Simply close the windows to stop the servers

### Method 2: Task Manager
- Open Task Manager (Ctrl+Shift+Esc)
- Find processes running on ports 3000 and 8001
- End those processes

### Method 3: Command Line
```bash
# Kill processes on port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /F /PID <PID_NUMBER>

# Kill processes on port 8001 (backend)
netstat -ano | findstr :8001
taskkill /F /PID <PID_NUMBER>
```

## 🔧 Technical Details

### Backend (Port 8001)
- Uses FastAPI with uvicorn
- Database: `backend/bahamm.db.bak`
- Hot reload enabled for development
- Real ZarinPal payment integration

### Frontend (Port 3000)
- Next.js development server
- Auto-installs dependencies if needed
- Hot reload enabled for development

## 🚨 Troubleshooting

### Port Already in Use
The scripts automatically clean up existing processes, but if you get port errors:
1. Close all existing server windows
2. Wait 30 seconds
3. Run the script again

### Dependencies Missing
- Backend: Make sure Python and required packages are installed
- Frontend: The script will auto-install npm dependencies

### Permission Issues
If you get permission errors with PowerShell:
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 💡 Usage Tips

1. **Start Order**: Always start backend before frontend (scripts handle this automatically)
2. **Development**: Use the persistent scripts for development work
3. **Testing**: Both servers support hot reload for code changes
4. **Cursor Independence**: You can safely close and reopen Cursor while servers run

## 🎯 Quick Start

1. Double-click `run_both_servers_persistent.bat`
2. Wait for both servers to start (backend first, then frontend)
3. Open http://localhost:3000 in your browser
4. Close Cursor if you want - servers will keep running!
5. When done, close the server windows to stop them

---

**Note**: These scripts are configured to run the FastAPI backend on port 8001 (not the quick_server.py) as per your memory preferences.
