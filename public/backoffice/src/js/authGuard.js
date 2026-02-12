/**
 * Authentication Guard
 * Protects routes and manages authentication state
 */

import { SupabaseClient } from './supabaseClient.js';
import { AuthStateManager } from './authStateManager.js';

class AuthGuard {
  constructor() {
    this.supabaseClient = window.SupabaseClient;
    this.authService = window.AuthService;
    this.authStateManager = new AuthStateManager();
    this.protectedRoutes = new Map();
    this.init();
  }

  init() {
    this.setupProtectedRoutes();
    this.setupAuthStateListener();
  }

  // Define protected routes and their requirements
  setupProtectedRoutes() {
    // User-protected routes
    this.protectedRoutes.set('/src/pages/dashboard.html', {
      requireAuth: true,
      roles: []
    });

    // Backoffice routes (support role)
    this.protectedRoutes.set('/src/pages/admin/support.html', {
      requireAuth: true,
      roles: ['support', 'superadmin']
    });

    // Superadmin routes
    this.protectedRoutes.set('/src/pages/admin/settings.html', {
      requireAuth: true,
      roles: ['superadmin']
    });

    this.protectedRoutes.set('/src/pages/admin/users.html', {
      requireAuth: true,
      roles: ['superadmin']
    });
  }

  // Set up auth state change listener using centralized manager
  setupAuthStateListener() {
    // Use centralized auth state manager instead of direct event listener
    AuthStateManager.addListener(async (event, session, previousState) => {
      console.log('AuthGuard: Auth state changed:', event, session?.user?.email);
      
      // Handle sign out
      if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      }
      
      // Handle sign in
      if (event === 'SIGNED_IN') {
        this.handleSignIn();
      }
    }, {
      id: 'authGuard',
      immediate: true // Get current state immediately
    });
  }

  // Check if current route requires authentication
  getCurrentRouteRequirements() {
    const currentPath = window.location.pathname;
    return this.protectedRoutes.get(currentPath) || { requireAuth: false, roles: [] };
  }

  // Main guard function - call this on page load
  async guard() {
    try {
      const requirements = this.getCurrentRouteRequirements();
      
      // If route doesn't require auth, allow access
      if (!requirements.requireAuth) {
        return { allowed: true, reason: 'public_route' };
      }

      // Check authentication
      const session = await this.supabaseClient.getSession();
      
      if (!session) {
        console.log('AuthGuard: No session found, redirecting to login');
        return this.redirectToLogin();
      }

      // Check role requirements
      if (requirements.roles.length > 0) {
        const roleCheck = await this.checkUserRole(session.user.id, requirements.roles);
        
        if (!roleCheck.hasRequiredRole) {
          console.log(`AuthGuard: User role '${roleCheck.userRole}' insufficient for required roles: ${requirements.roles.join(', ')}`);
          return this.handleInsufficientRole(roleCheck.userRole);
        }
        
        return { 
          allowed: true, 
          reason: 'authenticated_with_role',
          userRole: roleCheck.userRole,
          session 
        };
      }

      // User is authenticated and no role requirements
      return { 
        allowed: true, 
        reason: 'authenticated',
        session 
      };

    } catch (error) {
      console.error('AuthGuard: Error during guard check:', error);
      return this.handleGuardError(error);
    }
  }

  // Check user role via Edge Function
  async checkUserRole(userId, requiredRoles) {
    try {
      const client = await this.supabaseClient.getClient();
      
      const { data, error } = await client.functions.invoke('rbac_me', {
        body: { requiredRoles }
      });

      if (error) {
        console.error('AuthGuard: Error checking user role:', error);
        throw error;
      }

      return {
        hasRequiredRole: data.hasRole,
        userRole: data.userRole,
        permissions: data.permissions || []
      };

    } catch (error) {
      console.error('AuthGuard: Failed to check user role:', error);
      
      // Default to no access on error
      return {
        hasRequiredRole: false,
        userRole: 'unknown',
        permissions: []
      };
    }
  }

  // Redirect to login page
  redirectToLogin() {
    // Store intended destination
    sessionStorage.setItem('intendedDestination', window.location.pathname + window.location.search);
    
    // Show notification if available
    if (window.Notify) {
      window.Notify.warning('Please sign in to continue');
    }
    
    // Redirect
    window.location.href = '/login.html';
    
    return { 
      allowed: false, 
      reason: 'not_authenticated',
      redirect: '/login.html'
    };
  }

  // Handle insufficient role
  handleInsufficientRole(userRole) {
    let redirectUrl = '/src/pages/dashboard.html';
    
    // Redirect based on current role
    if (userRole === 'user') {
      redirectUrl = '/src/pages/dashboard.html';
      if (window.Notify) {
        window.Notify.warning('Access denied. Redirecting to dashboard.');
      }
    } else {
      redirectUrl = '/login.html';
      if (window.Notify) {
        window.Notify.error('Access denied. Please contact support.');
      }
    }
    
    window.location.href = redirectUrl;
    
    return { 
      allowed: false, 
      reason: 'insufficient_role',
      userRole,
      redirect: redirectUrl
    };
  }

  // Handle guard errors
  handleGuardError(error) {
    console.error('AuthGuard: Critical error:', error);
    
    // On critical errors, redirect to login for safety
    if (window.Notify) {
      window.Notify.error('Authentication error. Please sign in again.');
    }
    
    window.location.href = '/login.html';
    
    return { 
      allowed: false, 
      reason: 'guard_error',
      error: error.message
    };
  }

  // Handle sign out
  handleSignOut() {
    console.log('AuthGuard: User signed out');
    
    // Clear any stored data
    sessionStorage.removeItem('intendedDestination');
    
    // If currently on a protected route, redirect to home
    const requirements = this.getCurrentRouteRequirements();
    if (requirements.requireAuth) {
      window.location.href = '/src/pages/index.html';
    }
  }

  // Handle sign in
  handleSignIn() {
    console.log('AuthGuard: User signed in');
    
    // Check if there's an intended destination
    const intendedDestination = sessionStorage.getItem('intendedDestination');
    if (intendedDestination && intendedDestination !== window.location.pathname) {
      console.log('AuthGuard: Redirecting to intended destination:', intendedDestination);
      sessionStorage.removeItem('intendedDestination');
      window.location.href = intendedDestination;
    }
  }

  // Add new protected route
  addProtectedRoute(path, requirements) {
    this.protectedRoutes.set(path, requirements);
  }

  // Remove protected route
  removeProtectedRoute(path) {
    this.protectedRoutes.delete(path);
  }

  // Check if user has specific permission
  async checkPermission(userId, permission) {
    try {
      const client = await this.supabaseClient.getClient();
      
      const { data, error } = await client.functions.invoke('rbac_me', {
        body: { checkPermission: permission }
      });

      if (error) {
        throw error;
      }

      return data.hasPermission || false;

    } catch (error) {
      console.error('AuthGuard: Failed to check permission:', error);
      return false;
    }
  }

  // Get current user info with role
  async getCurrentUserWithRole() {
    try {
      const session = await this.supabaseClient.getSession();
      
      if (!session) {
        return null;
      }

      const roleCheck = await this.checkUserRole(session.user.id, ['user', 'support', 'superadmin']);
      
      return {
        user: session.user,
        role: roleCheck.userRole,
        permissions: roleCheck.permissions,
        session
      };

    } catch (error) {
      console.error('AuthGuard: Failed to get current user with role:', error);
      return null;
    }
  }

  // Utility function to protect specific page elements
  protectElement(element, requiredRole) {
    if (!element) return;

    this.checkUserRoleWithSession()
      .then(roleCheck => {
        if (!roleCheck.hasRequiredRole || (requiredRole && roleCheck.userRole !== requiredRole)) {
          element.style.display = 'none';
          element.setAttribute('aria-hidden', 'true');
        } else {
          element.style.display = '';
          element.removeAttribute('aria-hidden');
        }
      })
      .catch(error => {
        console.error('AuthGuard: Error protecting element:', error);
        element.style.display = 'none';
      });
  }

  // Check user role with current session
  async checkUserRoleWithSession() {
    const session = await this.supabaseClient.getSession();
    
    if (!session) {
      return { hasRequiredRole: false, userRole: 'anonymous' };
    }

    return this.checkUserRole(session.user.id, ['user', 'support', 'superadmin']);
  }

  // Create role-based navigation
  createRoleBasedNavigation() {
    this.checkUserRoleWithSession()
      .then(roleCheck => {
        this.updateNavigationForRole(roleCheck.userRole);
      })
      .catch(error => {
        console.error('AuthGuard: Error creating role-based navigation:', error);
      });
  }

  // Update navigation based on user role
  updateNavigationForRole(userRole) {
    // Hide/show navigation elements based on role
    const adminLinks = document.querySelectorAll('[data-require-role]');
    
    adminLinks.forEach(link => {
      const requiredRole = link.getAttribute('data-require-role');
      
      if (requiredRole) {
        const requiredRoles = requiredRole.split(',').map(r => r.trim());
        
        if (requiredRoles.includes(userRole)) {
          link.style.display = '';
          link.removeAttribute('aria-hidden');
        } else {
          link.style.display = 'none';
          link.setAttribute('aria-hidden', 'true');
        }
      }
    });

    // Update user info display
    const userInfoElements = document.querySelectorAll('[data-user-info]');
    userInfoElements.forEach(element => {
      const infoType = element.getAttribute('data-user-info');
      
      if (infoType === 'role') {
        element.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
      }
    });
  }
}

// Create and export singleton instance
const authGuard = new AuthGuard();

// Export for global access
window.AuthGuard = authGuard;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = authGuard;
}

// Export individual methods for convenience
export const {
  guard,
  addProtectedRoute,
  removeProtectedRoute,
  checkPermission,
  getCurrentUserWithRole,
  protectElement,
  createRoleBasedNavigation
} = authGuard;
