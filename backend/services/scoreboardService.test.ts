import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { ScoreboardService } from './scoreboardService';

// Mock the database models
jest.mock('../models/Match');
jest.mock('../models/Set');

const mockedMatchModel = MatchModel as jest.Mocked<typeof MatchModel>;
const mockedSetModel = SetModel as jest.Mocked<typeof SetModel>;

describe('ScoreboardService', () => {
  beforeEach(() => {
    // Clear sessions and cache before each test
    ScoreboardService['sessions'].clear();
    ScoreboardService['cache'].scoreboardData.clear();
    ScoreboardService['cache'].matchData.clear();
    
    jest.clearAllMocks();
  });

  describe('Session Management', () => {
    test('should create a session with unique ID and expiration', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toHaveLength(32); // 16 bytes * 2 (hex)
      expect(session.matchId).toBe(matchId);
      expect(session.currentView).toBe('default');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should retrieve an existing session', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      const retrieved = ScoreboardService.getSession(session.sessionId);

      expect(retrieved).toEqual(session);
    });

    test('should return null for non-existent session', () => {
      const retrieved = ScoreboardService.getSession('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should return null for expired session', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      
      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000);
      
      const retrieved = ScoreboardService.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });

    test('should validate session for correct match', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      
      const isValid = ScoreboardService.validateSession(session.sessionId, matchId);
      expect(isValid).toBe(true);
    });

    test('should not validate session for incorrect match', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      
      const isValid = ScoreboardService.validateSession(session.sessionId, 'different-match');
      expect(isValid).toBe(false);
    });

    test('should update session view settings', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      
      const updated = ScoreboardService.updateSessionView(session.sessionId, 'banner', 'Test Banner');
      expect(updated).toBe(true);
      
      const retrieved = ScoreboardService.getSession(session.sessionId);
      expect(retrieved?.currentView).toBe('banner');
      expect(retrieved?.bannerText).toBe('Test Banner');
    });

    test('should remove a session', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      
      const removed = ScoreboardService.removeSession(session.sessionId);
      expect(removed).toBe(true);
      
      const retrieved = ScoreboardService.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Data Transformation', () => {
    const mockMatch = {
      _id: 'match123',
      teams: [
        {
          name: 'Team A',
          players: [{ name: 'Player 1', playerId: null }],
          setsWon: 1
        },
        {
          name: 'Team B', 
          players: [{ name: 'Player 2', playerId: null }],
          setsWon: 0
        }
      ],
      currentSet: 'set456',
      numGoalsToWin: 5,
      numSetsToWin: 3,
      twoAhead: true,
      timeoutsPerSet: 2,
      playerSetup: '1v1' as const,
      status: 'inProgress' as const,
      startTime: new Date(),
      winner: null
    };

    const mockCurrentSet = {
      _id: 'set456',
      setNumber: 2,
      status: 'inProgress' as const,
      scores: [3, 1],
      timeoutsUsed: [1, 0],
      teamColors: ['#ff0000', '#0000ff'],
      startTime: new Date(),
      winner: null
    };

    const mockCompletedSet = {
      _id: 'set123',
      setNumber: 1,
      status: 'completed' as const,
      scores: [5, 3],
      timeoutsUsed: [2, 1],
      winner: 0,
      startTime: new Date(Date.now() - 600000),
      endTime: new Date(Date.now() - 300000)
    };

    beforeEach(() => {
      mockedMatchModel.findById.mockResolvedValue(mockMatch as any);
      mockedSetModel.findById.mockResolvedValue(mockCurrentSet as any);
      
      // Mock SetModel.find to return a query object with sort method that resolves to an array
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([mockCompletedSet]),
      };
      mockedSetModel.find.mockReturnValue(mockQuery as any);
    });

    test('should generate scoreboard data successfully', async () => {
      const data = await ScoreboardService.generateScoreboardData('match123');
      
      expect(data).toBeDefined();
      expect(data?.matchId).toBe('match123');
      expect(data?.teams).toHaveLength(2);
      expect(data?.teams[0].name).toBe('Team A');
      expect(data?.teams[0].score).toBe(3);
      expect(data?.teams[0].setsWon).toBe(1);
      expect(data?.teams[0].timeoutsLeft).toBe(1);
      expect(data?.currentSet.setNumber).toBe(2);
      expect(data?.currentSet.status).toBe('inProgress');
      expect(data?.completedSets).toHaveLength(1);
    });

    test('should generate scoreboard data with session view settings', async () => {
      const session = ScoreboardService.createSession('match123');
      ScoreboardService.updateSessionView(session.sessionId, 'banner', 'Championship Final');
      
      const data = await ScoreboardService.generateScoreboardData('match123', session.sessionId);
      
      expect(data?.currentView).toBe('banner');
      expect(data?.bannerText).toBe('Championship Final');
      expect(data?.sessionId).toBe(session.sessionId);
    });

    test('should return null for non-existent match', async () => {
      mockedMatchModel.findById.mockResolvedValue(null);
      
      const data = await ScoreboardService.generateScoreboardData('non-existent');
      expect(data).toBeNull();
    });

    test('should handle missing current set gracefully', async () => {
      mockedSetModel.findById.mockResolvedValue(null);
      
      const data = await ScoreboardService.generateScoreboardData('match123');
      
      expect(data).toBeDefined();
      expect(data?.currentSet.setNumber).toBe(1);
      expect(data?.currentSet.status).toBe('notStarted');
      expect(data?.currentSet.scores).toEqual([0, 0]);
    });
  });

  describe('Caching', () => {
    const mockMatch = {
      _id: 'match123',
      teams: [
        { name: 'Team A', players: [], setsWon: 0 },
        { name: 'Team B', players: [], setsWon: 0 }
      ],
      currentSet: null,
      numGoalsToWin: 5,
      numSetsToWin: 3,
      twoAhead: true,
      timeoutsPerSet: 2,
      playerSetup: '1v1' as const,
      status: 'notStarted' as const,
      winner: null
    };

    beforeEach(() => {
      mockedMatchModel.findById.mockResolvedValue(mockMatch as any);
      mockedSetModel.findById.mockResolvedValue(null);
      
      // Mock SetModel.find to return a query object with sort method that resolves to an empty array
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([]),
      };
      mockedSetModel.find.mockReturnValue(mockQuery as any);
    });

    test('should cache scoreboard data on first call', async () => {
      await ScoreboardService.generateScoreboardData('match123');
      
      // Verify database was called
      expect(mockedMatchModel.findById).toHaveBeenCalledTimes(1);
      
      // Call again - should use cache
      await ScoreboardService.generateScoreboardData('match123');
      
      // Database should not be called again due to cache
      expect(mockedMatchModel.findById).toHaveBeenCalledTimes(1);
    });

    test('should invalidate cache when match updates', async () => {
      await ScoreboardService.generateScoreboardData('match123');
      expect(mockedMatchModel.findById).toHaveBeenCalledTimes(1);
      
      // Invalidate cache
      ScoreboardService.handleMatchUpdate('match123');
      
      // Call again - should hit database due to cache invalidation
      await ScoreboardService.generateScoreboardData('match123');
      expect(mockedMatchModel.findById).toHaveBeenCalledTimes(2);
    });

    test('should provide cache statistics', async () => {
      await ScoreboardService.generateScoreboardData('match123');
      
      const stats = ScoreboardService.getCacheStats();
      expect(stats.scoreboardEntries).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
    });

    test('should clean up expired cache entries', async () => {
      // Generate data to populate cache
      await ScoreboardService.generateScoreboardData('match123');
      
      // Manually expire cache entries by setting TTL to 0
      const cache = ScoreboardService['cache'].scoreboardData;
      cache.forEach((entry) => {
        entry.ttl = 0;
        entry.timestamp = new Date(Date.now() - 1000);
      });
      
      ScoreboardService.cleanupCache();
      
      const stats = ScoreboardService.getCacheStats();
      expect(stats.scoreboardEntries).toBe(0);
    });
  });

  describe('Session Management Advanced', () => {
    test('should get all sessions for a match', () => {
      const matchId = 'match123';
      const session1 = ScoreboardService.createSession(matchId);
      const session2 = ScoreboardService.createSession(matchId);
      const session3 = ScoreboardService.createSession('different-match');
      
      const matchSessions = ScoreboardService.getMatchSessions(matchId);
      
      expect(matchSessions).toHaveLength(2);
      expect(matchSessions.map(s => s.sessionId)).toContain(session1.sessionId);
      expect(matchSessions.map(s => s.sessionId)).toContain(session2.sessionId);
      expect(matchSessions.map(s => s.sessionId)).not.toContain(session3.sessionId);
    });

    test('should clean up expired sessions when getting match sessions', () => {
      const matchId = 'match123';
      const session = ScoreboardService.createSession(matchId);
      
      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000);
      
      const matchSessions = ScoreboardService.getMatchSessions(matchId);
      expect(matchSessions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockedMatchModel.findById.mockRejectedValue(new Error('Database error'));
      
      const data = await ScoreboardService.generateScoreboardData('match123');
      expect(data).toBeNull();
    });

    test('should handle invalid session IDs gracefully', () => {
      const result = ScoreboardService.updateSessionView('invalid-session', 'default');
      expect(result).toBe(false);
    });
  });
});
