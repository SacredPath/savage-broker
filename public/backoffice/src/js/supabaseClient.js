/**
 * Supabase Client Initialization
 * Reads SUPABASE_URL + SUPABASE_ANON_KEY injected at build time (Vercel env -> window.__ENV)
 * Exposes: supabase, getSession(), requireAuth()
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthStateManager } from './authStateManager.js';

class SupabaseClient {
  static instance = null;
  constructor() {
    // Prevent multiple constructor calls
    if (SupabaseClient.instance) {
      console.warn('SupabaseClient constructor called multiple times - returning existing instance');
      return SupabaseClient.instance;
    }
    
    this.supabase = null;
    this.initialized = false;
    this.initPromise = null;
    
    // Store instance to prevent duplicates
    SupabaseClient.instance = this;
    this.init();
  }

  async init() {
    // Prevent multiple initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initializeSupabase();
    return this.initPromise;
  }

  async _initializeSupabase() {
    try {
      // Read environment variables from window.__ENV (injected at build time)
      // Fallback to development defaults if not available
      const supabaseUrl = window.__ENV?.SUPABASE_URL || this.getDevelopmentUrl();
      const supabaseAnonKey = window.__ENV?.SUPABASE_ANON_KEY || this.getDevelopmentKey();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key are required');
      }

      // Create Supabase client
      this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flow: 'pkce', // Recommended for web apps
          debug: false // Set to true in development for debugging
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'broker-web/1.0.0'
          }
        }
      });

      // Initialize centralized auth state manager
      await AuthStateManager.initialize(this.supabase);

      this.initialized = true;
      console.log('Supabase client initialized successfully');
      
      return this.supabase;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  getDevelopmentUrl() {
    const domain = window.location.hostname;
    
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return 'http://localhost:54321'; // Local Supabase
    } else if (domain.includes('staging')) {
      return 'https://staging.supabase.co';
    } else {
      return 'https://prod.supabase.co';
    }
  }

  getDevelopmentKey() {
    const domain = window.location.hostname;
    
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return process.env.SUPABASE_ANON_KEY_LOCAL || 'your-local-anon-key';
    } else if (domain.includes('staging')) {
      return process.env.SUPABASE_ANON_KEY_STAGING || 'your-staging-anon-key';
    } else {
      return process.env.SUPABASE_ANON_KEY_PROD || 'your-prod-anon-key';
    }
  }

  // Get the Supabase client instance
  async getClient() {
    if (!this.initialized) {
      await this.init();
    }
    return this.supabase;
  }

  // Get current session
  async getSession() {
    try {
      const client = await this.getClient();
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const client = await this.getClient();
      const { data: { user }, error } = await client.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Require authentication - redirect if not authenticated
  async requireAuth(redirectTo = '/login.html') {
    try {
      const session = await this.getSession();
      
      if (!session) {
        console.log('No active session, redirecting to login');
        // Store the intended destination for redirect after login
        sessionStorage.setItem('intendedDestination', window.location.pathname + window.location.search);
        window.location.href = redirectTo;
        return false;
      }
      
      return session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      window.location.href = redirectTo;
      return false;
    }
  }

  // Require specific role - redirect if user doesn't have required role
  async requireRole(requiredRole, redirectTo = '/login.html') {
    try {
      // First ensure user is authenticated
      const session = await this.requireAuth(redirectTo);
      if (!session) return false;

      // Get user role via Edge Function
      const client = await this.getClient();
      const { data, error } = await client.functions.invoke('rbac_me', {
        body: { requiredRole }
      });

      if (error) {
        console.error('Error checking user role:', error);
        throw error;
      }

      const { hasRole, userRole } = data;

      if (!hasRole) {
        console.log(`User role '${userRole}' does not meet required role '${requiredRole}'`);
        
        // Redirect to appropriate page based on current role
        if (userRole === 'user') {
          window.location.href = '/src/pages/dashboard.html';
        } else {
          window.location.href = redirectTo;
        }
        return false;
      }

      return { session, userRole };
    } catch (error) {
      console.error('Error requiring role:', error);
      window.location.href = redirectTo;
      return false;
    }
  }

  // Refresh session
  async refreshSession() {
    try {
      const client = await this.getClient();
      const { data, error } = await client.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      return data.session;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  }

  // Sign out
  async signOut() {
    try {
      const client = await this.getClient();
      const { error } = await client.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to sign out:', error);
      return false;
    }
  }

  // Get auth configuration info
  getAuthConfig() {
    return {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flow: 'pkce'
    };
  }

  // Check if client is initialized
  isInitialized() {
    return this.initialized;
  }

  // Reset client (useful for testing or re-initialization)
  async reset() {
    this.supabase = null;
    this.initialized = false;
    this.initPromise = null;
    SupabaseClient.instance = null; // Clear static instance
    await this.init();
  }
}

// Singleton implementation - prevent multiple instances
function getSupabaseClientInstance() {
  if (!SupabaseClient.instance) {
    console.log('Creating singleton Supabase client instance');
    SupabaseClient.instance = new SupabaseClient();
  } else {
    console.log('Reusing existing Supabase client instance');
  }
  return SupabaseClient.instance;
}

// Create and export singleton instance
const supabaseClient = getSupabaseClientInstance();

// Export for global access
window.SupabaseClient = supabaseClient;
window.supabase = supabaseClient; // Legacy compatibility

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseClient;
}

// Export individual methods for convenience
export const {
  getClient,
  getSession,
  getCurrentUser,
  requireAuth,
  requireRole,
  refreshSession,
  signOut,
  getAuthConfig,
  isInitialized,
  reset
} = supabaseClient;

// Export the instance getter for other modules
export { getSupabaseClientInstance };

// Backward compatibility - export instance alias
export const supabase = supabaseClient;
