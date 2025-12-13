FROM python:3.13-slim

WORKDIR /app

# Install Poetry and dependencies
RUN pip install poetry==2.1.2

# Copy only dependency files to leverage Docker cache
COPY pyproject.toml poetry.lock* ./

# Configure poetry to not use a virtual environment inside the Docker container
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copy the rest of the application
COPY . .

# Expose the port the app will run on
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Production command with Gunicorn and multiple workers for better performance
# Workers = (2 x CPU cores) + 1
# Using 4 workers for typical 2-core server
CMD ["gunicorn", "main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keepalive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"] 