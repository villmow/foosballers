import { AuthService } from './AuthService';

export interface Match {
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
  startTime: Date;
  endTime: Date;
  createdBy: string;
  sets: string[];
  currentSet: string;
  createdAt: Date;
  updatedAt: Date;
  duration?: number;
  winner?: number | null;
  numGoalsToWin: number;
  numSetsToWin: number;
  twoAhead: boolean;
  twoAheadUpUntil?: number;
  name?: string;
  draw?: boolean;
  timeoutsPerSet?: number;
  playerSetup: '1v1' | '2v2';
}

export interface MatchesResponse {
  success: boolean;
  data: {
    matches: Match[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalMatches: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export class MatchService {
  private static readonly BASE_URL = '/api/matches';

  /**
   * Get all matches with optional pagination and filtering
   */
  static async getMatches(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<MatchesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);

      const url = `${this.BASE_URL}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await AuthService.authenticatedRequest(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }
  }

  /**
   * Get a specific match by ID
   */
  static async getMatch(matchId: string): Promise<{ success: boolean; data: Match }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching match:', error);
      throw error;
    }
  }

  /**
   * Create a new match
   */
  static async createMatch(matchData: Partial<Match>): Promise<{ success: boolean; data: Match }> {
    try {
      const response = await AuthService.authenticatedRequest(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  /**
   * Update an existing match
   */
  static async updateMatch(matchId: string, matchData: Partial<Match>): Promise<{ success: boolean; data: Match }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  /**
   * Delete a match
   */
  static async deleteMatch(matchId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  }

  /**
   * Delete multiple matches
   */
  static async deleteMatches(matchIds: string[]): Promise<{ success: boolean; message: string }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete matches: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting matches:', error);
      throw error;
    }
  }

  /**
   * Start a match
   */
  static async startMatch(matchId: string): Promise<{ success: boolean; data: Match }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to start match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting match:', error);
      throw error;
    }
  }

  /**
   * End a match
   */
  static async endMatch(matchId: string): Promise<{ success: boolean; data: Match }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to end match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error ending match:', error);
      throw error;
    }
  }

  /**
   * Abort a match
   */
  static async abortMatch(matchId: string): Promise<{ success: boolean; data: Match }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}/abort`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to abort match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error aborting match:', error);
      throw error;
    }
  }

  /**
   * Get the current set for a match
   */
  static async getCurrentSet(matchId: string): Promise<{ success: boolean; data: any }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}/sets/current`, {
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, data: null };
        }
        throw new Error(`Failed to fetch current set: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching current set:', error);
      throw error;
    }
  }

  /**
   * Create a new set for a match
   */
  static async createSet(matchId: string): Promise<{ success: boolean; data: any }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${matchId}/sets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create set: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating set:', error);
      throw error;
    }
  }

  /**
   * Assign colors to a specific set
   */
  static async assignColorsToSet(setId: string, teamColors: string[]): Promise<{ success: boolean; data: any }> {
    try {
      const response = await AuthService.authenticatedRequest(`/api/sets/${setId}/colors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamColors }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign colors to set: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning colors to set:', error);
      throw error;
    }
  }
}
