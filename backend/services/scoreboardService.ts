import { randomBytes } from 'crypto';
import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { ScoreboardData } from '../shared-types';

interface ScoreboardSession {
  sessionId: string;
  matchId?: string;
  createdAt: Date;
  expiresAt: Date;
  currentView: 'default' | 'detailed' | 'banner';
  bannerText?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
}

interface ScoreboardCache {
  scoreboardData: Map<string, CacheEntry<ScoreboardData>>;
  matchData: Map<string, CacheEntry<any>>;
}

export class ScoreboardService {
  private static sessions: Map<string, ScoreboardSession> = new Map();
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Caching layer for frequently accessed scoreboard data
  private static cache: ScoreboardCache = {
    scoreboardData: new Map(),
    matchData: new Map()
  };
  private static readonly CACHE_TTL = 30 * 1000; // 30 seconds TTL for scoreboard data
  private static readonly MATCH_CACHE_TTL = 60 * 1000; // 1 minute TTL for match data

  /**
   * Create a new scoreboard session for a match
   */
  static createSession(matchId?: string): ScoreboardSession {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: ScoreboardSession = {
      sessionId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION),
      currentView: 'default'
    };

    if (matchId) {
      session.matchId = matchId;
    }

    this.sessions.set(sessionId, session);
    this.cleanupExpiredSessions();
    
    return session;
  }

  /**
   * Get an existing session by sessionId
   */
  static getSession(sessionId: string): ScoreboardSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Validate if a session can access a specific match
   */
  static validateSession(sessionId: string, matchId?: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    
    // If no matchId is provided or session has no match, check if session exists
    if (!matchId || !session.matchId) {
      return true;
    }
    
    // If both exist, ensure they match
    return session.matchId === matchId;
  }

  /**
   * Update session view settings
   */
  static updateSessionView(sessionId: string, view: 'default' | 'detailed' | 'banner', bannerText?: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.currentView = view;
    if (bannerText !== undefined) {
      session.bannerText = bannerText;
    }

    return true;
  }

  /**
   * Assign a match to an existing session
   */
  static assignMatchToSession(sessionId: string, matchId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.matchId = matchId;
    return true;
  }

  /**
   * Generate scoreboard data from Match and Set documents
   */
  static async generateScoreboardData(matchId: string, sessionId?: string): Promise<ScoreboardData | null> {
    try {
      // Check cache first for performance
      const cacheKey = `${matchId}:${sessionId || 'default'}`;
      const cached = this.getFromCache(this.cache.scoreboardData, cacheKey);
      if (cached) {
        return cached;
      }

      const match = await MatchModel.findById(matchId);
      if (!match) return null;

      const currentSet = await SetModel.findById(match.currentSet);
      const completedSets = await SetModel.find({ 
        matchId: matchId, 
        status: 'completed' 
      }).sort({ setNumber: 1 });

      const session = sessionId ? this.getSession(sessionId) : null;
      const currentView = session?.currentView || 'default';
      const bannerText = session?.bannerText;

      const scoreboardData: ScoreboardData = {
        matchId: matchId,
        sessionId: sessionId || '',
        teams: [
          {
            name: match.teams[0].name,
            players: match.teams[0].players,
            color: currentSet?.teamColors?.[0] || '#65bc7b',
            score: currentSet?.scores?.[0] || 0,
            setsWon: match.teams[0].setsWon,
            timeoutsLeft: currentSet ? ((match.timeoutsPerSet || 2) - currentSet.timeoutsUsed[0]) : (match.timeoutsPerSet || 2)
          },
          {
            name: match.teams[1].name,
            players: match.teams[1].players,
            color: currentSet?.teamColors?.[1] || '#000000',
            score: currentSet?.scores?.[1] || 0,
            setsWon: match.teams[1].setsWon,
            timeoutsLeft: currentSet ? ((match.timeoutsPerSet || 2) - currentSet.timeoutsUsed[1]) : (match.timeoutsPerSet || 2)
          }
        ],
        currentSet: currentSet ? {
          setNumber: currentSet.setNumber,
          status: currentSet.status,
          scores: currentSet.scores,
          timeoutsUsed: currentSet.timeoutsUsed,
          startTime: currentSet.startTime,
          endTime: currentSet.endTime,
          winner: currentSet.winner
        } : {
          setNumber: 1,
          status: 'notStarted',
          scores: [0, 0],
          timeoutsUsed: [0, 0]
        },
        completedSets: completedSets.map(set => ({
          setNumber: set.setNumber,
          scores: set.scores,
          timeoutsUsed: set.timeoutsUsed,
          winner: set.winner ?? null,
          duration: set.endTime && set.startTime ? 
            Math.floor((set.endTime.getTime() - set.startTime.getTime()) / 1000) : undefined
        })),
        matchConfiguration: {
          numGoalsToWin: match.numGoalsToWin,
          numSetsToWin: match.numSetsToWin,
          twoAhead: match.twoAhead,
          twoAheadUpUntil: match.twoAheadUpUntil,
          timeoutsPerSet: match.timeoutsPerSet || 2,
          playerSetup: match.playerSetup
        },
        matchStatus: match.status,
        startTime: match.startTime,
        endTime: match.endTime,
        winner: match.winner,
        currentView,
        bannerText
      };

      // Cache the result
      this.setInCache(this.cache.scoreboardData, cacheKey, scoreboardData, this.CACHE_TTL);

      return scoreboardData;
    } catch (error) {
      console.error('Error generating scoreboard data:', error);
      return null;
    }
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Clean up expired sessions
   */
  private static cleanupExpiredSessions(): void {
    const now = new Date();
    const sessionsToDelete: string[] = [];
    
    this.sessions.forEach((session, sessionId) => {
      if (now > session.expiresAt) {
        sessionsToDelete.push(sessionId);
      }
    });
    
    sessionsToDelete.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });
  }

  /**
   * Get all active sessions for a match (for broadcasting)
   */
  static getMatchSessions(matchId: string): ScoreboardSession[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.values()).filter(session => session.matchId === matchId);
  }

  /**
   * Remove a session
   */
  static removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cache helper methods
   */
  private static setInCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
    cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  private static getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = new Date();
    const age = now.getTime() - entry.timestamp.getTime();
    
    if (age > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Invalidate cache for a specific match (called when match data changes)
   */
  static invalidateMatchCache(matchId: string): void {
    // Remove all cache entries related to this match
    const keysToDelete: string[] = [];
    this.cache.scoreboardData.forEach((entry, key) => {
      if (key.startsWith(`${matchId}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.scoreboardData.delete(key);
    });
    
    // Remove match-specific data cache
    this.cache.matchData.delete(matchId);
  }

  /**
   * Clear all expired cache entries
   */
  static cleanupCache(): void {
    const now = new Date();
    const scoreboardKeysToDelete: string[] = [];
    const matchKeysToDelete: string[] = [];
    
    this.cache.scoreboardData.forEach((entry, key) => {
      const age = now.getTime() - entry.timestamp.getTime();
      if (age > entry.ttl) {
        scoreboardKeysToDelete.push(key);
      }
    });
    
    this.cache.matchData.forEach((entry, key) => {
      const age = now.getTime() - entry.timestamp.getTime();
      if (age > entry.ttl) {
        matchKeysToDelete.push(key);
      }
    });
    
    scoreboardKeysToDelete.forEach(key => {
      this.cache.scoreboardData.delete(key);
    });
    
    matchKeysToDelete.forEach(key => {
      this.cache.matchData.delete(key);
    });
  }

  /**
   * Get cache statistics (for monitoring)
   */
  static getCacheStats(): { 
    scoreboardEntries: number; 
    matchEntries: number; 
    totalSize: number;
    oldestEntry?: Date;
  } {
    let oldestEntry: Date | undefined;
    let totalSize = 0;
    
    this.cache.scoreboardData.forEach((entry) => {
      totalSize++;
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    });
    
    this.cache.matchData.forEach((entry) => {
      totalSize++;
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    });
    
    return {
      scoreboardEntries: this.cache.scoreboardData.size,
      matchEntries: this.cache.matchData.size,
      totalSize,
      oldestEntry
    };
  }

  /**
   * Handle real-time data updates from GameProgressionService
   * This method should be called when match state changes to invalidate cache
   */
  static handleMatchUpdate(matchId: string): void {
    // Invalidate cache for the updated match
    this.invalidateMatchCache(matchId);
    
    // Clean up expired cache entries
    this.cleanupCache();
  }
}
