#!/bin/bash

echo "Setting up Bahamm Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env with your actual settings if needed."
fi

# Update Poetry dependencies
echo "Updating Poetry dependencies..."
poetry lock
poetry install --no-root

# Start the application stack
echo "Starting the application stack..."
docker-compose down
docker-compose up -d

echo "Application is now running!"
echo "API is available at: http://localhost:8000"
echo ""
echo "To view logs, run: docker-compose logs -f"
echo "To stop the application, run: docker-compose down"
echo ""
echo "Note: For local development without Docker, your DATABASE_URL should be:"
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bahamm" 