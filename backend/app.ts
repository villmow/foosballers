import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet'; // Ensure helmet is imported
import { createServer } from 'http';
import morgan from 'morgan'; // Import morgan
import { Server } from 'socket.io';
import { connectDB } from './config/database';
import { authenticateJWT, logAuthEvents, sessionTimeout } from './middleware/authMiddleware';
import { mongoErrorHandler } from './middleware/mongoErrorHandler';
import { securityHeaders } from './middleware/securityMiddleware';
import authRoutes from './routes/authRoutes';
import goalRoutes from './routes/goalRoutes';
import matchRoutes from './routes/matchRoutes';
import scoreboardRoutes from './routes/scoreboardRoutes';
import setRoutes from './routes/setRoutes';
import timeoutRoutes from './routes/timeoutRoutes';
import userRoutes from './routes/userRoutes';
import { ChatMessage, ClientToServerEvents, ServerToClientEvents } from './shared-types';

const app = express();

// Define PORT
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(securityHeaders);
app.use(helmet()); // Apply helmet first for security headers

// Request Logging Middleware
app.use(morgan('dev')); // Use morgan for logging. 'dev' format is good for development.
// You can customize the format or use other predefined formats like 'combined' for more detail.

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
app.use('/api/scoreboard', scoreboardRoutes);

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

// Import scoreboard middleware and services
import {
    getMatchRoom,
    getSessionRoom,
    handleScoreboardDisconnect,
    isScoreboardAuthenticated,
    scoreboardAuthMiddleware,
    ScoreboardSocket,
    validateScoreboardAuth,
    validateScoreboardJoin
} from './middleware/scoreboardMiddleware';
import { ScoreboardBroadcastService } from './services/scoreboardBroadcastService';
import { ScoreboardService } from './services/scoreboardService';

// Apply scoreboard authentication middleware
io.use(scoreboardAuthMiddleware);

// Initialize the broadcast service
ScoreboardBroadcastService.initialize(io);

io.on('connection', (socket: ScoreboardSocket) => {
  console.log('A user connected:', socket.id);

  // Legacy chat message handling
  socket.on('message', (msg: ChatMessage) => {
    io.emit('message', msg); // Broadcast to all clients
  });

  // Scoreboard: Join a match room
  socket.on('scoreboard:join', async (data, callback) => {
    try {
      const validation = await validateScoreboardJoin(socket, data);
      
      if (!validation.success) {
        const error = { message: validation.error || 'Failed to join scoreboard', code: 'JOIN_FAILED' };
        socket.emit('scoreboard:error', error);
        callback?.({ success: false, error: validation.error });
        return;
      }

      const matchId = data.matchId;
      const sessionId = validation.sessionId!;
      
      // Join match and session rooms
      const matchRoom = getMatchRoom(matchId);
      const sessionRoom = getSessionRoom(sessionId);
      
      await socket.join(matchRoom);
      await socket.join(sessionRoom);
      
      console.log(`Socket ${socket.id} joined scoreboard rooms: ${matchRoom}, ${sessionRoom}`);

      // Get initial scoreboard data
      const scoreboardData = await ScoreboardService.generateScoreboardData(matchId, sessionId);
      
      if (scoreboardData) {
        // Send initial data to the joining client
        socket.emit('scoreboard:data', scoreboardData);
        
        // Emit joined confirmation to the current client
        socket.emit('scoreboard:joined', { matchId, sessionId });
        
        // Notify other clients in the match room about the new viewer
        socket.to(matchRoom).emit('scoreboard:viewer_joined', { matchId, sessionId });
        
        callback?.({ success: true, data: scoreboardData });
      } else {
        const error = { message: 'Failed to get scoreboard data', code: 'DATA_ERROR' };
        socket.emit('scoreboard:error', error);
        callback?.({ success: false, error: 'Failed to get scoreboard data' });
      }
    } catch (error) {
      console.error('Error handling scoreboard:join:', error);
      const errorMsg = { message: 'Internal server error', code: 'INTERNAL_ERROR' };
      socket.emit('scoreboard:error', errorMsg);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  // Scoreboard: Leave a match room
  socket.on('scoreboard:leave', (data) => {
    try {
      const matchRoom = getMatchRoom(data.matchId);
      const sessionRoom = getSessionRoom(data.sessionId);
      
      socket.leave(matchRoom);
      socket.leave(sessionRoom);
      
      console.log(`Socket ${socket.id} left scoreboard rooms: ${matchRoom}, ${sessionRoom}`);
      
      // Emit left confirmation to the current client
      socket.emit('scoreboard:left', data);
      
      // Notify other clients about the departure
      socket.to(matchRoom).emit('scoreboard:viewer_left', data);
      
      // Clear socket scoreboard data
      if (socket.scoreboardData) {
        socket.scoreboardData.isAuthenticated = false;
        socket.scoreboardData.matchId = undefined;
        socket.scoreboardData.sessionId = undefined;
      }
    } catch (error) {
      console.error('Error handling scoreboard:leave:', error);
      socket.emit('scoreboard:error', { message: 'Failed to leave scoreboard', code: 'LEAVE_FAILED' });
    }
  });

  // Scoreboard: Change view (commentator control)
  socket.on('scoreboard:change_view', async (data) => {
    try {
      if (!isScoreboardAuthenticated(socket)) {
        socket.emit('scoreboard:error', { message: 'Not authenticated', code: 'AUTH_REQUIRED' });
        return;
      }

      const { sessionId } = socket.scoreboardData!;
      
      // Update session view settings
      const updated = ScoreboardService.updateSessionView(sessionId!, data.view, data.bannerText);
      
      if (updated) {
        // Broadcast view change to all clients in the match room
        const matchRoom = getMatchRoom(data.matchId);
        io.to(matchRoom).emit('scoreboard:view_changed', data);
        
        console.log(`View changed for match ${data.matchId}: ${data.view}`);
      } else {
        socket.emit('scoreboard:error', { message: 'Failed to update view', code: 'VIEW_UPDATE_FAILED' });
      }
    } catch (error) {
      console.error('Error handling scoreboard:change_view:', error);
      socket.emit('scoreboard:error', { message: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  });

  // Scoreboard: Authenticate (for existing sessions)
  socket.on('scoreboard:authenticate', async (data, callback) => {
    try {
      const validation = await validateScoreboardAuth(socket, data);
      
      if (validation.success) {
        // Get scoreboard data to send to client
        const scoreboardData = await ScoreboardService.generateScoreboardData(data.matchId, data.sessionId);
        
        // Emit authenticated event with scoreboard data
        socket.emit('scoreboard:authenticated', scoreboardData);
        
        callback?.({ success: true });
      } else {
        socket.emit('scoreboard:error', { message: validation.error || 'Authentication failed', code: 'AUTH_FAILED' });
        callback?.({ success: false, error: validation.error });
      }
    } catch (error) {
      console.error('Error handling scoreboard:authenticate:', error);
      socket.emit('scoreboard:error', { message: 'Internal server error', code: 'INTERNAL_ERROR' });
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    handleScoreboardDisconnect(socket);
  });
});

// Export the io instance for use in other parts of the application
export { io };

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
