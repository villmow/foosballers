# Foosball Streaming Application

A real-time foosball match streaming and scoring application built with Vue.js, Express, MongoDB, and Socket.IO.

## Features

- Live match streaming
- Real-time score tracking
- Match history and statistics
- User authentication and profiles
- Team management
- Chat functionality

## Project Structure

The project is organized as follows:

- **frontend**: Vue.js application with PrimeVue UI components
- **backend**: Express.js API server with Socket.IO for real-time communication
- **shared-types.ts**: TypeScript interfaces shared between frontend and backend

## Development Setup

### Prerequisites

- Node.js 18+
- MongoDB
- Docker and Docker Compose (optional)

### Manual Setup

#### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The backend API will be available at http://localhost:4000.

#### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend application will be available at http://localhost:3000.

### Docker Setup

This project includes a complete Docker Compose configuration for easy development and deployment.

1. Start all services:
```bash
docker-compose up -d
```

2. Open the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - MongoDB: mongodb://localhost:27017

For more details about the Docker configuration, see the [Docker README](./docker-README.md).

## API Documentation

The backend provides the following API endpoints:

- `/health`: Health check endpoint
- `/api/v1/users`: User management
- `/api/v1/teams`: Team management
- `/api/v1/matches`: Match management
- `/api/v1/goals`: Goal tracking

## WebSocket Events

Real-time communication is handled via Socket.IO with the following events:

- `message`: Chat messages
- (Other events to be implemented)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.