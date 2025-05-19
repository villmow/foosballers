import { NextFunction } from 'express';
import { isTokenBlacklisted } from '../services/tokenBlacklistService';
import { verifyJWT } from '../utils/jwtUtils';
import { authenticateJWT, requireAuth, requireRole, sessionTimeout } from './authMiddleware';

// Mock dependencies
jest.mock('../utils/jwtUtils');
jest.mock('../services/tokenBlacklistService');

describe('Authentication Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
      headers: {},
      user: undefined
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateJWT', () => {
    test('should pass to next middleware if no token is found', () => {
      authenticateJWT(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });
    
    test('should extract token from cookies', () => {
      const token = 'valid-token';
      mockRequest.cookies.token = token;
      
      (isTokenBlacklisted as jest.Mock).mockReturnValue(false);
      (verifyJWT as jest.Mock).mockReturnValue({ 
        id: '123', 
        username: 'testuser', 
        role: 'commentator' 
      });
      
      authenticateJWT(mockRequest, mockResponse, nextFunction);
      
      expect(verifyJWT).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe('123');
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should extract token from authorization header', () => {
      const token = 'valid-token';
      mockRequest.headers.authorization = `Bearer ${token}`;
      
      (isTokenBlacklisted as jest.Mock).mockReturnValue(false);
      (verifyJWT as jest.Mock).mockReturnValue({ 
        id: '123', 
        username: 'testuser', 
        role: 'commentator' 
      });
      
      authenticateJWT(mockRequest, mockResponse, nextFunction);
      
      expect(verifyJWT).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should return 401 if token is blacklisted', () => {
      mockRequest.cookies.token = 'blacklisted-token';
      
      (isTokenBlacklisted as jest.Mock).mockReturnValue(true);
      
      authenticateJWT(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should return 401 if token verification fails', () => {
      mockRequest.cookies.token = 'invalid-token';
      
      (isTokenBlacklisted as jest.Mock).mockReturnValue(false);
      (verifyJWT as jest.Mock).mockReturnValue(null);
      
      authenticateJWT(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    test('should call next if user is authenticated', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'commentator' };
      
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user.lastActivity).toBeDefined();
    });
    
    test('should return 401 if user is not authenticated', () => {
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
  
  describe('requireRole', () => {
    test('should call next if user has required role', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'administrator' };
      
      const middleware = requireRole(['administrator']);
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should return 401 if user is not authenticated', () => {
      const middleware = requireRole(['administrator']);
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should return 403 if user does not have required role', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'commentator' };
      
      const middleware = requireRole(['administrator']);
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
  
  describe('sessionTimeout', () => {
    test('should call next if session is active', () => {
      const currentTime = new Date();
      mockRequest.user = { 
        id: '123', 
        username: 'testuser', 
        role: 'commentator',
        lastActivity: currentTime
      };
      
      sessionTimeout(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user.lastActivity).not.toEqual(currentTime); // Should be updated
    });
    
    test('should return 440 if session has timed out', () => {
      // Create a date more than 90 minutes in the past
      const oldTime = new Date();
      oldTime.setMinutes(oldTime.getMinutes() - 100);
      
      mockRequest.user = { 
        id: '123', 
        username: 'testuser', 
        role: 'commentator',
        lastActivity: oldTime
      };
      
      sessionTimeout(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(440);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Session expired', reason: 'inactivity' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should call next if user is not authenticated', () => {
      sessionTimeout(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
