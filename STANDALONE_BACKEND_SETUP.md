# 🚀 Standalone Backend Setup Guide

This guide will help you run the FastAPI backend on your laptop terminal independently of Cursor, so it keeps running even when you close Cursor.

## 📋 Prerequisites

1. **Python 3.8+** installed on your system
2. **pip** package manager
3. **Windows Terminal** or **Command Prompt**

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

Open your **Windows Terminal** or **Command Prompt** and navigate to your project directory:

```bash
cd "C:\Users\User\OneDrive\Desktop\final_project"
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### Step 2: Run the Backend Server

You have two options to start the backend:

#### Option A: Using the Batch File (Recommended)
Double-click on `start_backend_laptop.bat` or run from terminal:

```bash
start_backend_laptop.bat
```

#### Option B: Using Python Directly
```bash
python run_backend_standalone.py
```

## 🌐 Server Information

Once started, your backend will be available at:

- **Main Server**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health
- **Database**: Uses `bahamm1.db` from project root

## ✅ Testing the Setup

1. **Health Check**: Visit http://localhost:8001/health in your browser
   - Should return: `{"status": "healthy", "service": "Bahamm Backend"}`

2. **API Documentation**: Visit http://localhost:8001/docs
   - Should show the interactive FastAPI documentation

3. **Test API Endpoint**: Visit http://localhost:8001/api/health
   - Should return: `{"status": "healthy", "service": "Bahamm API"}`

## 🔧 Troubleshooting

### Port Already in Use
If port 8001 is already in use, you'll see an error. To fix:

1. Find what's using port 8001:
   ```bash
   netstat -ano | findstr :8001
   ```

2. Kill the process (replace PID with actual process ID):
   ```bash
   taskkill /PID <PID> /F
   ```

### Missing Dependencies
If you get import errors:
```bash
pip install --upgrade -r requirements.txt
```

### Database Issues
- Make sure `bahamm1.db` exists in the project root
- If it doesn't exist, the system will create a new one automatically

### Python Not Found
Make sure Python is installed and added to your PATH:
```bash
python --version
```

## 🔄 Starting/Stopping the Server

### To Start:
- Run `start_backend_laptop.bat` or `python run_backend_standalone.py`

### To Stop:
- Press `Ctrl+C` in the terminal where the server is running
- Or close the terminal window

## 🎯 Key Features

- ✅ Runs independently of Cursor
- ✅ Uses your specified `bahamm1.db` database
- ✅ Serves on localhost:8001 as requested
- ✅ Auto-reloads on code changes
- ✅ Comprehensive logging
- ✅ Easy to start/stop

## 📝 Notes

- The server will keep running until you manually stop it
- You can close Cursor and the backend will continue running
- The frontend should connect to this backend at `http://localhost:8001`
- All your existing API endpoints will work exactly the same

## 🆘 Need Help?

If you encounter any issues:

1. Check the terminal output for error messages
2. Verify all dependencies are installed
3. Make sure the database file exists
4. Ensure no other service is using port 8001
