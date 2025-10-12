# Bahamm Backend

## Getting Started

### Install packages

`poetry install`

### Database Setup

The application now uses PostgreSQL as the database backend.

#### Option 1: Using Docker (Recommended)

The easiest way to get started is to use the provided Docker Compose configuration:

```bash
docker-compose up -d db
```

This will start a PostgreSQL container with all necessary configuration.

#### Option 2: Manual PostgreSQL Setup

1. Install PostgreSQL on your system
2. Create a database for the application:
```bash
createdb bahamm
```
3. Configure the connection by copying the `.env.example` file to `.env` and updating the PostgreSQL settings.

### Populate Database with Sample Data

After setting up PostgreSQL, you can initialize and populate the database with sample data:

```bash
# Make sure your virtual environment is activated
poetry run python scripts/seed_products.py
```

This script will:
1. Drop all existing tables (if any)
2. Create all necessary tables
3. Populate the database with sample users, categories, products, etc.

## Run

### How to run backend

`poetry run uvicorn main:app --reload`

### How to run backend and database together

`docker-compose up`