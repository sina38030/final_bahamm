import logging
import os
import sys
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
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)
logger.addHandler(console_handler)

# File handler for all logs
file_handler = RotatingFileHandler(
    "logs/app.log", 
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setFormatter(detailed_formatter)
file_handler.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Create specific SMS logger with its own file handler
sms_logger = logging.getLogger("sms")
sms_handler = RotatingFileHandler(
    "logs/sms.log",
    maxBytes=5*1024*1024,  # 5MB
    backupCount=3
)
sms_handler.setFormatter(detailed_formatter)
sms_handler.setLevel(logging.DEBUG)  # More detailed for SMS logs
sms_logger.addHandler(sms_handler)
sms_logger.propagate = True  # Will also send to root logger

def get_logger(name):
    """Get a logger with the given name"""
    return logging.getLogger(name) 