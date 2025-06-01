import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { MatchModel } from '../models/Match';
import { createMatch, deleteMatch, getMatch, getMatches, updateMatch } from './matchController';

jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  requireAuth: (req: any, _res: any, next: any) => {
    // Mock authenticated user
    req.user = { _id: 'user123' };
    next();
  },
}));

jest.mock('../models/Match');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Mock authentication middleware
const mockAuth = (req: any, _res: any, next: any) => {
  // Mock authenticated user
  req.user = { _id: 'user123', id: 'user123' };
  next();
};

function asyncHandler(fn: any) {
  return function (req: express.Request, res: express.Response, next: express.NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.post('/api/matches', asyncHandler(createMatch));
app.get('/api/matches', mockAuth, asyncHandler(getMatches)); // Add auth middleware
app.get('/api/matches/:id', asyncHandler(getMatch));
app.put('/api/matches/:id', asyncHandler(updateMatch));
app.delete('/api/matches/:id', asyncHandler(deleteMatch));

describe('Match API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a match', async () => {
    (MatchModel as any).mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }));
    const res = await request(app)
      .post('/api/matches')
      .send({ name: 'Test Match' });
    expect(res.statusCode).toBe(201);
  });

  it('should get a match by id', async () => {
    (MatchModel.findById as any) = jest.fn().mockResolvedValue({ _id: '1', name: 'Test Match' });
    const res = await request(app).get('/api/matches/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Match');
  });

  it('should update a match by id', async () => {
    (MatchModel.findByIdAndUpdate as any) = jest.fn().mockResolvedValue({ _id: '1', name: 'Updated Match' });
    const res = await request(app).put('/api/matches/1').send({ name: 'Updated Match' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Match');
  });

  it('should delete a match by id', async () => {
    (MatchModel.findByIdAndDelete as any) = jest.fn().mockResolvedValue({ _id: '1', name: 'Test Match' });
    const res = await request(app).delete('/api/matches/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Match deleted successfully');
  });

  it('should return 404 if match not found (get)', async () => {
    (MatchModel.findById as any) = jest.fn().mockResolvedValue(null);
    const res = await request(app).get('/api/matches/404');
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 if match not found (update)', async () => {
    (MatchModel.findByIdAndUpdate as any) = jest.fn().mockResolvedValue(null);
    const res = await request(app).put('/api/matches/404').send({ name: 'No Match' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 if match not found (delete)', async () => {
    (MatchModel.findByIdAndDelete as any) = jest.fn().mockResolvedValue(null);
    const res = await request(app).delete('/api/matches/404');
    expect(res.statusCode).toBe(404);
  });

  describe('getMatches endpoint', () => {
    const mockMatches = [
      {
        _id: 'match1',
        name: 'Match 1',
        status: 'completed',
        createdBy: 'user123',
        teams: [
          { name: 'Team A', players: [{ name: 'Player 1', playerId: 'p1' }], setsWon: 2 },
          { name: 'Team B', players: [{ name: 'Player 2', playerId: 'p2' }], setsWon: 1 }
        ],
        sets: ['set1', 'set2', 'set3'], // Only IDs, not full objects
        createdAt: new Date('2024-01-01'),
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        numGoalsToWin: 10,
        numSetsToWin: 3,
        playerSetup: '1v1',
        twoAhead: false
      },
      {
        _id: 'match2',
        name: 'Match 2',
        status: 'inProgress',
        createdBy: 'user123',
        teams: [
          { name: 'Team C', players: [{ name: 'Player 3', playerId: 'p3' }], setsWon: 1 },
          { name: 'Team D', players: [{ name: 'Player 4', playerId: 'p4' }], setsWon: 0 }
        ],
        sets: ['set4', 'set5'],
        createdAt: new Date('2024-01-02'),
        startTime: new Date('2024-01-02T14:00:00Z'),
        numGoalsToWin: 10,
        numSetsToWin: 3,
        playerSetup: '1v1',
        twoAhead: false
      }
    ];

    it('should get all matches for authenticated user', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMatches)
      };
      
      const mockCountQuery = {
        exec: jest.fn().mockResolvedValue(2)
      };

      (MatchModel.find as any) = jest.fn().mockReturnValue(mockQuery);
      (MatchModel.countDocuments as any) = jest.fn().mockReturnValue(mockCountQuery);

      const res = await request(app).get('/api/matches');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.matches).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pages).toBe(1);
      
      // Verify the query was called with correct parameters
      expect(MatchModel.find).toHaveBeenCalledWith({ createdBy: 'user123' });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.select).toHaveBeenCalledWith('-sets');
    });

    it('should support pagination with page and limit parameters', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMatches[0]]) // Return only first match
      };
      
      const mockCountQuery = {
        exec: jest.fn().mockResolvedValue(2)
      };

      (MatchModel.find as any) = jest.fn().mockReturnValue(mockQuery);
      (MatchModel.countDocuments as any) = jest.fn().mockReturnValue(mockCountQuery);

      const res = await request(app)
        .get('/api/matches')
        .query({ page: '2', limit: '1' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.page).toBe(2);
      expect(res.body.data.pagination.limit).toBe(1);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.pagination.pages).toBe(2);
      
      // Verify pagination parameters were applied
      expect(mockQuery.skip).toHaveBeenCalledWith(1); // (page - 1) * limit = (2 - 1) * 1 = 1
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should filter by status when provided', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMatches[0]]) // Only completed match
      };
      
      const mockCountQuery = {
        exec: jest.fn().mockResolvedValue(1)
      };

      (MatchModel.find as any) = jest.fn().mockReturnValue(mockQuery);
      (MatchModel.countDocuments as any) = jest.fn().mockReturnValue(mockCountQuery);

      const res = await request(app)
        .get('/api/matches')
        .query({ status: 'completed' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.total).toBe(1);
      
      // Verify the filter was applied
      expect(MatchModel.find).toHaveBeenCalledWith({ 
        createdBy: 'user123', 
        status: 'completed' 
      });
    });

    it('should return empty array when user has no matches', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      
      const mockCountQuery = {
        exec: jest.fn().mockResolvedValue(0)
      };

      (MatchModel.find as any) = jest.fn().mockReturnValue(mockQuery);
      (MatchModel.countDocuments as any) = jest.fn().mockReturnValue(mockCountQuery);

      const res = await request(app).get('/api/matches');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.matches).toHaveLength(0);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMatches)
      };
      
      const mockCountQuery = {
        exec: jest.fn().mockResolvedValue(2)
      };

      (MatchModel.find as any) = jest.fn().mockReturnValue(mockQuery);
      (MatchModel.countDocuments as any) = jest.fn().mockReturnValue(mockCountQuery);

      const res = await request(app)
        .get('/api/matches')
        .query({ page: 'invalid', limit: '-5' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.page).toBe(1); // Default to 1 for invalid page
      expect(res.body.data.pagination.limit).toBe(2); // Should be total count when invalid limit
    });

    it('should handle database errors gracefully', async () => {
      (MatchModel.find as any) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const res = await request(app).get('/api/matches');
      
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error fetching matches');
    });
  });
});
