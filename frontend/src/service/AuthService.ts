// Authentication and user-related API services
export const AuthService = {
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process forgot password request');
    }
    
    return await response.json();
  },
  
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`/api/auth/reset-password/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }
    
    return await response.json();
  },
  
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    console.log('AuthService: Sending login request to /api/auth/login');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies in the request
      });
      
      console.log('AuthService: Login response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response:', e);
          throw new Error(`Login failed with status: ${response.status}`);
        }
        
        console.error('Login error data:', errorData);
        throw new Error(errorData.message || `Login failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AuthService: Login successful');
      return data;
    } catch (error) {
      console.error('AuthService login error:', error);
      throw error;
    }
  },
  
  async logout(): Promise<{ message: string }> {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Logout failed');
    }
    
    return await response.json();
  }
};
