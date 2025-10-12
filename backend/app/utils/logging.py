import logging
import os
import sys
import io
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Configure root logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create formatters
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
detailed_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s')

# Console handler
# Ensure console uses UTF-8 to avoid UnicodeEncodeError on Windows consoles
try:
    # Wrap stdout with UTF-8 encoding and replace errors
    if hasattr(sys.stdout, "buffer"):
        wrapped_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        console_handler = logging.StreamHandler(wrapped_stdout)
    else:
        console_handler = logging.StreamHandler(sys.stdout)
except Exception:
    console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)
logger.addHandler(console_handler)

# On Windows with uvicorn --reload, multiple processes may lock the same log file
# causing PermissionError during rotation. Use non-rotating FileHandler on Windows
# or when DISABLE_LOG_ROTATION=1 is set. Else, use RotatingFileHandler.
disable_rotation = os.name == 'nt' or os.getenv("DISABLE_LOG_ROTATION", "0") == "1"
if disable_rotation:
    file_handler = logging.FileHandler(
        "logs/app.log",
        encoding="utf-8",
        delay=True
    )
else:
    file_handler = RotatingFileHandler(
        "logs/app.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
        delay=True
    )
file_handler.setFormatter(detailed_formatter)
file_handler.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Create specific SMS logger with its own file handler
sms_logger = logging.getLogger("sms")
if disable_rotation:
    sms_handler = logging.FileHandler(
        "logs/sms.log",
        encoding="utf-8",
        delay=True
    )
else:
    sms_handler = RotatingFileHandler(
        "logs/sms.log",
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3,
        encoding="utf-8",
        delay=True
    )
sms_handler.setFormatter(detailed_formatter)
sms_handler.setLevel(logging.DEBUG)  # More detailed for SMS logs
sms_logger.addHandler(sms_handler)
sms_logger.propagate = True  # Will also send to root logger

def get_logger(name):
    """Get a logger with the given name"""
    return logging.getLogger(name) 