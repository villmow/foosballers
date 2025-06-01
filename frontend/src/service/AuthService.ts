// Session timeout handler
let sessionTimeoutId: number | null = null;

// Reset session timeout - call this whenever there's user activity
const resetSessionTimeout = (): void => {
  if (sessionTimeoutId) {
    window.clearTimeout(sessionTimeoutId);
  }
  
  // Set timeout for 90 minutes (in milliseconds)
  sessionTimeoutId = window.setTimeout(() => {
    // Handle session timeout
    AuthService.handleSessionTimeout();
  }, 90 * 60 * 1000);
};

// Start monitoring user activity
const startActivityMonitoring = (): void => {
  resetSessionTimeout();
  
  // Reset timeout on user activity
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, resetSessionTimeout);
  });
};

// Create headers with token
const createHeaders = (additionalHeaders = {}): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
};

export const AuthService = {
  // Initialize session management
  initSessionManagement() {
    startActivityMonitoring();
    
    // Periodically check if session is still valid (every 5 minutes)
    setInterval(() => {
      this.verifySession().catch(() => {
        // Session invalid, redirect to login
        this.handleSessionTimeout();
      });
    }, 5 * 60 * 1000);
  },
  
  // Handle session timeout
  handleSessionTimeout() {
    // Clear any stored auth data
    localStorage.removeItem('user');
    
    // Redirect to login page with timeout message
    window.location.href = '/login?timeout=true';
  },
  
  // Verify if the session is still valid
  async verifySession(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify-token', {
        method: 'GET',
        headers: createHeaders(),
        credentials: 'include'
      });
      
      return response.ok;
    } catch (error) {
      console.error('Session verification failed:', error);
      return false;
    }
  },
  
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ email }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to process forgot password request');
    }
    
    return { message: data.message };
  },
  
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`/api/auth/reset-password/${token}`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ password }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to reset password');
    }
    
    return { message: data.message };
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
        throw new Error(errorData.error || errorData.message || `Login failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AuthService: Login successful');
      
      // Initialize session management after successful login
      this.initSessionManagement();
      
      // Return the data from the 'data' field for new format, or whole response for backward compatibility
      return data.data || data;
    } catch (error) {
      console.error('AuthService login error:', error);
      throw error;
    }
  },
  
  async logout(): Promise<{ message: string }> {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: createHeaders(),
      credentials: 'include'
    });
    
    // Clear session management
    if (sessionTimeoutId) {
      window.clearTimeout(sessionTimeoutId);
      sessionTimeoutId = null;
    }
    
    // Remove activity listeners
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
      document.removeEventListener(event, resetSessionTimeout);
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Logout failed');
    }
    
    const data = await response.json();
    return { message: data.message };
  },
  
  async createUser(user: { username: string; email: string; password: string; role: string }): Promise<{ message: string }> {
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(user),
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to create user');
    }
    const data = await response.json();
    return { message: data.message };
  },

  async updateUserProfile(profile: { username: string; email: string; password?: string }): Promise<{ message: string }> {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(profile),
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to update profile');
    }
    const data = await response.json();
    return { message: data.message };
  },

  /**
   * Make an authenticated request with automatic credential handling
   */
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: createHeaders(options.headers),
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    return fetch(url, mergedOptions);
  }
};
