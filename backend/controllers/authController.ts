import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { blacklistToken } from '../services/tokenBlacklistService';
import { verifyJWT } from '../utils/jwtUtils';
import jwt from 'jsonwebtoken';

// Controller for handling user authentication

/**
 * Endpoint for user logout
 * Invalidates the token by adding it to a blacklist and clearing the cookie
 * This implementation uses HTTP-only cookies for token storage and management
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let token: string | undefined;
    
    // Get token from cookie or authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If token exists, blacklist it
    if (token) {
      // Get token expiry from payload
      const decoded = jwt.decode(token);
      let expiryDate: Date;
      
      if (decoded && typeof decoded !== 'string' && decoded.exp) {
        // Convert expiration time to Date object
        expiryDate = new Date(decoded.exp * 1000);
      } else {
        // If can't decode, set a default expiry (1 hour from now)
        expiryDate = new Date(Date.now() + 3600000);
      }
      
      // Add token to blacklist with expiry time - if this fails, it will be caught by the outer try/catch
      blacklistToken(token, expiryDate);
    }

    // Clear the token cookie regardless of whether we successfully blacklisted
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0) // Set expiration to epoch time (invalidates immediately)
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
};
