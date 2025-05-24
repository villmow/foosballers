import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/database';
import { authenticateJWT, logAuthEvents, sessionTimeout } from './middleware/authMiddleware';
import { mongoErrorHandler } from './middleware/mongoErrorHandler';
import { securityHeaders } from './middleware/securityMiddleware';
import authRoutes from './routes/authRoutes';
import goalRoutes from './routes/goalRoutes';
import matchRoutes from './routes/matchRoutes';
import setRoutes from './routes/setRoutes';
import timeoutRoutes from './routes/timeoutRoutes';
import userRoutes from './routes/userRoutes';

// Define the shared types inline for Docker build
interface ChatMessage {
  user: string;
  message: string;
  timestamp: number;
}

interface ServerToClientEvents {
  message: (msg: ChatMessage) => void;
}

interface ClientToServerEvents {
  message: (msg: ChatMessage) => void;
}

const app = express();
const PORT = process.env.PORT || 4000;

// Apply security headers to all responses
app.use(securityHeaders);

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://frontend:3000',
    process.env.CORS_ORIGIN || '*'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Authentication middleware
app.use(authenticateJWT as express.RequestHandler);
app.use(sessionTimeout as express.RequestHandler);
app.use(logAuthEvents as express.RequestHandler);

// Connect to the database
connectDB();    

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// API routes - Resource-first approach
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/timeouts', timeoutRoutes);

// Error handling middleware
app.use(mongoErrorHandler);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('message', (msg: ChatMessage) => {
    io.emit('message', msg); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
