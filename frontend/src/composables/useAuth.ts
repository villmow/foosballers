// composable for authentication state
import { AuthService } from '@/service/AuthService';
import { computed, ref } from 'vue';

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));

function setUser(newUser: any) {
  user.value = newUser;
  if (newUser) {
    localStorage.setItem('user', JSON.stringify(newUser));
  } else {
    localStorage.removeItem('user');
  }
}

function isAuthenticated() {
  return !!user.value;
}

window.addEventListener('storage', () => {
  user.value = JSON.parse(localStorage.getItem('user') || 'null');
});

export function useAuth() {
  async function updateUserProfile({ name, email, password }: { name: string; email: string; password?: string }) {
    // Map 'name' to 'username' for backend compatibility
    const payload: any = { username: name, email };
    if (password) payload.password = password;
    const result = await AuthService.updateUserProfile(payload);
    // Update local user state if successful
    setUser({ ...user.value, name, email });
    return result;
  }
  return {
    user,
    setUser,
    isAuthenticated: computed(isAuthenticated),
    updateUserProfile
  };
}

// Route guard setup for authentication
export function setupAuthGuards(router: any) {
  router.beforeEach((to: any, _from: any, next: any) => {
    const { isAuthenticated } = useAuth();

    // Allow access to login, landing, and public auth pages
    const publicPages = [
      '/auth/login',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/error',
      '/auth/access',
      '/landing',
      '/pages/notfound',
      '/' // Allow dashboard/main page to be public
    ];
    
    if (publicPages.includes(to.path)) {
      // If user is authenticated and tries to access landing or login, redirect to main page
      if (isAuthenticated.value && (to.path === '/landing' || to.path === '/auth/login')) {
        return next('/');
      }
      return next();
    }
    
    // For match pages and other protected routes, require authentication
    if (!isAuthenticated.value) {
      return next({ path: '/landing', query: { redirect: to.fullPath } });
    }
    next();
  });
}
