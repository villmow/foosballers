import { AuthService } from './AuthService';

export interface ScoreboardSession {
  sessionId: string;
  matchId?: string; // Optional - can be assigned later
  currentView: 'detailed' | 'overview' | 'banner';
  createdAt: Date;
  expiresAt: Date;
  bannerText?: string;
}

export interface ScoreboardData {
  match: {
    _id: string;
    teams: Array<{
      name: string;
      players: Array<{
        name: string;
        playerId: string | null;
      }>;
      setsWon: number;
    }>;
    status: 'notStarted' | 'inProgress' | 'completed' | 'aborted';
    currentSet: string;
    sets: string[];
    numGoalsToWin: number;
    numSetsToWin: number;
    name?: string;
    winner?: number | null;
  };
  currentSet?: {
    _id: string;
    goals: Array<{
      team: number;
      scoredBy: string;
      scoredAt: Date;
    }>;
    score: [number, number];
    status: 'inProgress' | 'completed';
  };
  session: {
    sessionId: string;
    currentView: 'detailed' | 'overview' | 'banner';
    bannerText?: string;
  };
}

export interface SessionsForMatchResponse {
  success: boolean;
  data: {
    matchId: string;
    sessionCount: number;
    sessions: ScoreboardSession[];
  };
}

export class ScoreboardService {
  private static readonly BASE_URL = '/api/scoreboard';

  /**
   * Create a new scoreboard session (optionally with a match)
   */
  static async createSession(matchId?: string): Promise<{ success: boolean; session: ScoreboardSession }> {
    try {
      const response = await fetch(`${this.BASE_URL}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId: matchId || null }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating scoreboard session:', error);
      throw error;
    }
  }

  /**
   * Get scoreboard data for a specific session
   */
  static async getSession(sessionId: string): Promise<{ success: boolean; data: ScoreboardData }> {
    try {
      const response = await fetch(`${this.BASE_URL}/session/${sessionId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching scoreboard session:', error);
      throw error;
    }
  }

  /**
   * Update the view settings for a session
   */
  static async updateSessionView(
    sessionId: string, 
    view: 'detailed' | 'overview' | 'banner', 
    bannerText?: string
  ): Promise<{ success: boolean; data: ScoreboardData }> {
    try {
      const response = await fetch(`${this.BASE_URL}/session/${sessionId}/view`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ view, bannerText }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session view: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating session view:', error);
      throw error;
    }
  }

  /**
   * Remove a scoreboard session
   */
  static async removeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.BASE_URL}/session/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing scoreboard session:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions for a match (requires authentication)
   */
  static async getMatchSessions(matchId: string): Promise<SessionsForMatchResponse> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/match/${matchId}/sessions`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch match sessions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching match sessions:', error);
      throw error;
    }
  }

  /**
   * Get scoreboard data for a match without session
   */
  static async getMatchScoreboard(matchId: string): Promise<{ success: boolean; data: ScoreboardData }> {
    try {
      const response = await fetch(`${this.BASE_URL}/match/${matchId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch match scoreboard: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching match scoreboard:', error);
      throw error;
    }
  }

  /**
   * Assign a match to an existing session (or unassign by passing null)
   */
  static async assignMatchToSession(
    sessionId: string, 
    matchId: string | null
  ): Promise<{ success: boolean; data: ScoreboardData }> {
    try {
      const response = await fetch(`${this.BASE_URL}/session/${sessionId}/match`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign match to session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning match to session:', error);
      throw error;
    }
  }
  static async cleanupExpiredSessions(): Promise<{ success: boolean; data: { message: string } }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/cleanup`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cleanup sessions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }
  }

  /**
   * Generate a public URL for viewing a scoreboard session
   */
  static getPublicScoreboardUrl(sessionId: string): string {
    // This would be the public URL that can be shared for viewing the scoreboard
    // without requiring authentication
    const baseUrl = window.location.origin;
    return `${baseUrl}/scoreboard/${sessionId}`;
  }
}
