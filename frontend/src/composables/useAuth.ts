// composable for authentication state
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';

export function useAuth() {
  const authStore = useAuthStore()

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isInitialized: computed(() => authStore.isInitialized),
    setUser: authStore.setUser,
    clearAuth: authStore.clearAuth,
    updateUserProfile: authStore.updateUserProfile,
    login: authStore.login,
    logout: authStore.logout
  }
}

// Route guard setup for authentication
export function setupAuthGuards(router: any) {
  router.beforeEach(async (to: any, _from: any, next: any) => {
    // Get a fresh instance of the auth store
    const authStore = useAuthStore()

    // Ensure auth is initialized
    if (!authStore.isInitialized) {
      await authStore.initialize()
    }

    // Allow access to login, landing, and public auth pages
    const publicPages = [
      '/auth/login',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/error',
      '/auth/access',
      '/landing',
      '/pages/notfound',
    ];
    
    // Check if this is a public page
    const isPublicPage = publicPages.includes(to.path);
    
    if (isPublicPage) {
      // If user is authenticated and tries to access landing or login, redirect to main page
      if (authStore.isAuthenticated && (to.path === '/landing' || to.path === '/auth/login')) {
        return next('/');
      }
      return next();
    }
    
    // For protected routes, require authentication
    if (!authStore.isAuthenticated) {
      return next({ path: '/landing', query: { redirect: to.fullPath } });
    }
    
    // User is authenticated, allow access
    next();
  });
}
