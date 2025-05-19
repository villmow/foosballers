import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { logout } from '../controllers/authController';
import { blacklistToken } from '../services/tokenBlacklistService';

// Mock the token blacklist service
jest.mock('../services/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn(),
  blacklistToken: jest.fn()
}));

describe('Auth Controller - Logout', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.post('/api/auth/logout', logout);
    
    // Reset mocks
    jest.resetAllMocks();
  });

  it('should clear the token cookie and return success message', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['token=test-token']);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
    
    // Check that cookie was cleared
    const cookies = response.headers['set-cookie'][0];
    expect(cookies).toMatch(/token=;/);
    expect(cookies).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('should blacklist a token from authorization header', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test-token-from-header');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
    expect(blacklistToken).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Mock implementation to throw an error
    (blacklistToken as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test-token');

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error during logout' });
  });
});
