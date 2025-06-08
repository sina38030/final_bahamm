# Docker Deployment Guide for Bahamm Backend

This guide provides instructions for deploying the Bahamm Backend using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- Access to the repository
- Environment variables configured

## Local Development

1. Clone the repository
2. Create a `.env` file based on `.env.example`
3. Run the application with Docker Compose:

```bash
docker-compose up -d
```

4. The API will be available at http://localhost:8000

## Production Deployment

### Using Docker Compose

1. Clone the repository on your server
2. Create a `.env` file with production values
3. Build and start the containers:

```bash
docker-compose up -d --build
```

### Using Docker Swarm or Kubernetes

For production environments, consider using Docker Swarm or Kubernetes for orchestration:

#### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy the stack
docker stack deploy -c docker-compose.yml bahamm
```

#### Kubernetes

1. Create Kubernetes configuration files based on the Docker Compose file
2. Deploy using kubectl:

```bash
kubectl apply -f k8s/
```

## Environment Variables

Make sure to configure these environment variables for production:

- `SECRET_KEY`: JWT secret key
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration
- `SMS_PROVIDER`: SMS provider name
- `MELIPAYAMAK_API_KEY`: API key for Melipayamak

## Database

This application uses SQLite for database storage. The SQLite database file is stored in a volume mounted at `/app/sqlite_data` in the container to ensure data persistence.

## Health Check

The API health can be verified by accessing the root endpoint:

```
GET http://your-api-url/
```

Expected response:
```json
{"message": "Welcome to the Bahamm API"}
```

## Backup and Restore

The SQLite database is persisted in the `sqlite_data` volume. To backup the database:

```bash
# Copy the SQLite database file from the container
docker cp bahamm_backend_api_1:/app/sqlite_data/your_database_file.db ./backup.db
```

To restore:

```bash
# Copy the backup file to the container
docker cp ./backup.db bahamm_backend_api_1:/app/sqlite_data/your_database_file.db
``` 