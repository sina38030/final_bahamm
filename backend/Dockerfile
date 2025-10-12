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

# Command to run when the container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 