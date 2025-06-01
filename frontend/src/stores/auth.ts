import { AuthService } from '@/service/AuthService'
import { defineStore } from 'pinia'

export interface User {
  id: string
  name: string
  email: string
  role?: string
  [key: string]: any
}

interface AuthState {
  user: User | null
  isInitialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isInitialized: false
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.user,
    currentUser: (state): User | null => state.user
  },

  actions: {
    // Initialize auth state from localStorage
    async initialize() {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          this.user = JSON.parse(storedUser)
        }
      } catch (error) {
        console.error('Error initializing auth state:', error)
        this.clearAuth()
      } finally {
        this.isInitialized = true
      }
    },

    // Set user and persist to localStorage
    setUser(user: User | null) {
      this.user = user
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
    },

    // Clear authentication state
    clearAuth() {
      this.user = null
      localStorage.removeItem('user')
    },

    // Update user profile
    async updateUserProfile({ name, email, password }: { name: string; email: string; password?: string }) {
      try {
        // Map 'name' to 'username' for backend compatibility
        const payload: any = { username: name, email }
        if (password) payload.password = password
        
        const result = await AuthService.updateUserProfile(payload)
        
        // Update local user state if successful
        if (this.user) {
          this.setUser({ ...this.user, name, email })
        }
        
        return result
      } catch (error) {
        console.error('Error updating user profile:', error)
        throw error
      }
    },

    // Login action
    async login(credentials: { email: string; password: string }) {
      try {
        const result = await AuthService.login(credentials.email, credentials.password)
        if (result.user) {
          this.setUser(result.user)
        }
        return result
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    // Logout action
    async logout() {
      try {
        await AuthService.logout()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.clearAuth()
      }
    }
  }
})

// Listen for storage changes (for multi-tab sync)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'user') {
      const authStore = useAuthStore()
      if (event.newValue) {
        try {
          authStore.user = JSON.parse(event.newValue)
        } catch (error) {
          console.error('Error parsing user from storage event:', error)
          authStore.clearAuth()
        }
      } else {
        authStore.clearAuth()
      }
    }
  })
}
