import { AuthService } from './AuthService';

export interface Timeout {
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

export class TimeoutService {
  private static readonly BASE_URL = '/api/timeouts';

  /**
   * Create a new timeout
   */
  static async createTimeout(timeoutData: {
    matchId: string;
    setId: string;
    teamIndex: number;
    timestamp: string;
  }): Promise<{ success: boolean; data: Timeout }> {
    try {
      const response = await AuthService.authenticatedRequest(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeoutData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create timeout: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating timeout:', error);
      throw error;
    }
  }

  /**
   * Get a specific timeout by ID
   */
  static async getTimeout(timeoutId: string): Promise<{ success: boolean; data: Timeout }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${timeoutId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch timeout: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching timeout:', error);
      throw error;
    }
  }

  /**
   * Delete a timeout
   */
  static async deleteTimeout(timeoutId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${timeoutId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete timeout: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting timeout:', error);
      throw error;
    }
  }

  /**
   * Void a timeout (mark as voided but keep the record)
   */
  static async voidTimeout(timeoutId: string): Promise<{ success: boolean; data: any }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${timeoutId}/void`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to void timeout: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error voiding timeout:', error);
      throw error;
    }
  }

  /**
   * Unvoid a timeout (restore a previously voided timeout)
   */
  static async unvoidTimeout(timeoutId: string): Promise<{ success: boolean; data: Timeout }> {
    try {
      const response = await AuthService.authenticatedRequest(`${this.BASE_URL}/${timeoutId}/unvoid`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to unvoid timeout: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error unvoiding timeout:', error);
      throw error;
    }
  }
}
