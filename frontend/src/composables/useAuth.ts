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

    // Define public pages that don't require authentication
    const publicPages = [
      '/auth/login',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/error',
      '/auth/access',
      '/pages/notfound',
    ];
    
    // Handle root path "/" - show landing if not authenticated, dashboard if authenticated
    if (to.path === '/') {
      if (authStore.isAuthenticated) {
        // User is authenticated, show dashboard (default behavior)
        return next();
      } else {
        // User is not authenticated, redirect to landing page
        return next('/landing');
      }
    }

    // Handle landing page - redirect authenticated users to dashboard
    if (to.path === '/landing') {
      if (authStore.isAuthenticated) {
        return next('/');
      }
      return next();
    }

    // Check if this is a public page
    const isPublicPage = publicPages.includes(to.path);
    
    if (isPublicPage) {
      // If user is authenticated and tries to access login, redirect to dashboard
      if (authStore.isAuthenticated && to.path === '/auth/login') {
        return next('/');
      }
      return next();
    }

    // Check if route or its parent requires authentication
    const requiresAuth = to.matched.some((record: any) => record.meta.requiresAuth) || 
                        !isPublicPage; // Default behavior: require auth for non-public pages

    // For routes requiring authentication
    if (requiresAuth && !authStore.isAuthenticated) {
      // Redirect to login page with return path
      return next({ path: '/auth/login', query: { redirect: to.fullPath } });
    }
    
    // User is authenticated or route doesn't require auth, allow access
    next();
  });
}
