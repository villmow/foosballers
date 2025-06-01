import { AuthService } from './AuthService';

export interface Goal {
  _id: string;
  matchId: string;
  setId: string;
  team: number;
  timestamp: Date;
  setNumber: number;
  isVoided: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GoalService {
  private static readonly BASE_URL = '/api/goals';

  /**
   * Create a new goal
   */
  static async createGoal(goalData: {
    matchId: string;
    setId: string;
    teamIndex: number;
    timestamp: string;
    scoringRow?: string;
  }): Promise<{ success: boolean; data: Goal }> {
    try {
      const response = await AuthService.authenticatedRequest(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create goal: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  /**
   * Get a specific goal by ID
   */
  static async getGoal(goalId: string): Promise<{ success: boolean; data: Goal }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${goalId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch goal: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching goal:', error);
      throw error;
    }
  }

  /**
   * Update an existing goal
   */
  static async updateGoal(goalId: string, goalData: Partial<Goal>): Promise<{ success: boolean; data: Goal }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update goal: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete goal: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  /**
   * Void a goal (mark as voided but keep the record)
   */
  static async voidGoal(goalId: string): Promise<{ success: boolean; data: any }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${goalId}/void`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to void goal: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error voiding goal:', error);
      throw error;
    }
  }

  /**
   * Unvoid a goal (restore a previously voided goal)
   */
  static async unvoidGoal(goalId: string): Promise<{ success: boolean; data: Goal }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${goalId}/unvoid`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to unvoid goal: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error unvoiding goal:', error);
      throw error;
    }
  }
}
