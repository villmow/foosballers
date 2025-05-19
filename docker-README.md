# Docker Setup for Foosball Streaming Application

This document outlines how to run the Foosball Streaming application using Docker Compose.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Services

The Docker Compose configuration includes the following services:

1. **MongoDB** - Database for storing application data
2. **Backend** - Node.js/Express API server with hot reloading
3. **Frontend** - Vue.js application with Vite dev server

## Configuration Files

The containerization setup consists of multiple files:

- **docker compose.yml**: Main configuration for all services
- **docker compose.override.yml**: Development-specific overrides (auto-loaded by docker compose)
- **.env**: Environment variables for the services
- **backend/Dockerfile**: Instructions for building the backend container
- **frontend/Dockerfile**: Instructions for building the frontend container

## Getting Started

### Starting the Application

To start all services in development mode:

```bash
docker compose up -d
```

This will:
- Build the Docker images if they don't exist
- Start the containers in detached mode
- Set up the network between containers
- Configure persistent volumes for data
- Enable hot reloading for both frontend and backend

### Rebuilding Images

If you make changes to the Dockerfiles or dependencies:

```bash
docker compose build
```

Or rebuild a specific service:

```bash
docker compose build [service_name]
```

### Stopping the Application

To stop all services:

```bash
docker compose down
```

To stop and remove all data volumes (will delete database data):

```bash
docker compose down -v
```

### Viewing Logs

To see logs from all containers:

```bash
docker compose logs -f
```

To see logs from a specific service:

```bash
docker compose logs -f [service_name]
```

Where `[service_name]` is one of: `mongodb`, `backend`, or `frontend`.

## Ports

- MongoDB: 27017 (accessible from host)
- Backend: 4000 (accessible from host)
- Frontend: 3000 (accessible from host)

## Development Workflow

The Docker setup is optimized for development:

1. **Volume Mounts**: Local directories are mounted into the containers, so changes to the source code will be detected immediately
2. **Hot Reloading**:
   - Backend code changes: Nodemon watches for changes and automatically restarts the server
   - Frontend code changes: Vite's dev server rebuilds and updates the browser
3. **Inline Types**: Shared type definitions are included directly in both frontend and backend code

## Environment Variables

Environment variables are managed through the `.env` file and Docker Compose:

- **MongoDB URI**: Connection string for the database
- **Backend Port**: Port for the API server
- **Frontend Backend URL**: URL for the frontend to connect to the backend

## Troubleshooting

If you encounter any issues:

1. Check the container logs: `docker compose logs`
2. Ensure all ports are available on your host machine
3. Restart the services: `docker compose restart [service_name]`
4. Rebuild images if dependencies change: `docker compose build [service_name]`
5. Check network connectivity between containers: `docker compose exec backend ping mongodb`
