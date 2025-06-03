import { Socket } from 'socket.io';
import { MatchModel } from '../models/Match';
import { ScoreboardService } from '../services/scoreboardService';
import { ScoreboardAuthData, ScoreboardJoinData } from '../shared-types';

export interface ScoreboardSocket extends Socket {
  scoreboardData?: {
    matchId?: string;
    sessionId?: string;
    isAuthenticated?: boolean;
  };
}

/**
 * Middleware to authenticate scoreboard socket connections
 */
export const scoreboardAuthMiddleware = (socket: ScoreboardSocket, next: (err?: Error) => void) => {
  // Initialize scoreboard data
  socket.scoreboardData = {
    isAuthenticated: false
  };
  
  console.log('Scoreboard socket connected:', socket.id);
  next();
};

/**
 * Validate and authenticate a scoreboard join request
 */
export const validateScoreboardJoin = async (
  socket: ScoreboardSocket,
  data: ScoreboardJoinData
): Promise<{ success: boolean; error?: string; sessionId?: string }> => {
  try {
    // Validate match exists if matchId is provided
    if (data.matchId) {
      const match = await MatchModel.findById(data.matchId);
      if (!match) {
        return { success: false, error: 'Match not found' };
      }
    }

    let sessionId = data.sessionId;

    // If no session ID provided, create a new session
    if (!sessionId) {
      const session = ScoreboardService.createSession(data.matchId);
      sessionId = session.sessionId;
    } else {
      // Validate existing session
      if (!ScoreboardService.validateSession(sessionId, data.matchId)) {
        return { success: false, error: 'Invalid or expired session' };
      }
    }

    // Update socket data
    socket.scoreboardData = {
      matchId: data.matchId,
      sessionId: sessionId,
      isAuthenticated: true
    };

    return { success: true, sessionId };
  } catch (error) {
    console.error('Error validating scoreboard join:', error);
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Validate scoreboard authentication data
 */
export const validateScoreboardAuth = async (
  socket: ScoreboardSocket,
  data: ScoreboardAuthData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate session
    if (!ScoreboardService.validateSession(data.sessionId, data.matchId)) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Update socket authentication status
    if (socket.scoreboardData) {
      socket.scoreboardData.isAuthenticated = true;
      socket.scoreboardData.matchId = data.matchId;
      socket.scoreboardData.sessionId = data.sessionId;
    }

    return { success: true };
  } catch (error) {
    console.error('Error validating scoreboard auth:', error);
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Check if socket is authenticated for scoreboard operations
 */
export const isScoreboardAuthenticated = (socket: ScoreboardSocket): boolean => {
  return socket.scoreboardData?.isAuthenticated === true &&
         !!socket.scoreboardData.matchId &&
         !!socket.scoreboardData.sessionId;
};

/**
 * Get room name for match-specific broadcasting
 */
export const getMatchRoom = (matchId: string): string => {
  return `match:${matchId}`;
};

/**
 * Get room name for session-specific broadcasting  
 */
export const getSessionRoom = (sessionId: string): string => {
  return `session:${sessionId}`;
};

/**
 * Handle socket disconnection cleanup
 */
export const handleScoreboardDisconnect = (socket: ScoreboardSocket) => {
  if (socket.scoreboardData?.matchId && socket.scoreboardData?.sessionId) {
    const matchRoom = getMatchRoom(socket.scoreboardData.matchId);
    const sessionRoom = getSessionRoom(socket.scoreboardData.sessionId);
    
    socket.leave(matchRoom);
    socket.leave(sessionRoom);
    
    console.log(`Scoreboard socket ${socket.id} left rooms: ${matchRoom}, ${sessionRoom}`);
  }
};
