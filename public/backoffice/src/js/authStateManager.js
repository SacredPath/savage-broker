/**
 * Centralized Auth State Manager
 * Eliminates duplicate auth listeners and prevents circular dependencies
 */

class AuthStateManager {
  static instance = null;
  static listeners = [];
  static currentState = null;
  static isProcessing = false;
  static debounceTimeout = null;
  static initialized = false;

  constructor() {
    if (AuthStateManager.instance) {
      return AuthStateManager.instance;
    }
    AuthStateManager.instance = this;
  }

  static getInstance() {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  /**
   * Initialize the auth state manager - should be called once
   */
  static async initialize(supabaseClient) {
    if (AuthStateManager.initialized) {
      console.log('AuthStateManager already initialized');
      return;
    }

    console.log('AuthStateManager: Initializing...');
    
    // Set up single auth state listener
    supabaseClient.auth.onAuthStateChange((event, session) => {
      AuthStateManager.handleAuthStateChange(event, session);
    });

    AuthStateManager.initialized = true;
    console.log('AuthStateManager: Initialized successfully');
  }

  /**
   * Handle auth state changes with debouncing
   */
  static handleAuthStateChange(event, session) {
    // Clear existing debounce timeout
    if (AuthStateManager.debounceTimeout) {
      clearTimeout(AuthStateManager.debounceTimeout);
    }

    // Debounce rapid auth changes (100ms delay)
    AuthStateManager.debounceTimeout = setTimeout(() => {
      AuthStateManager.processAuthChange(event, session);
    }, 100);
  }

  /**
   * Process auth state change and notify listeners
   */
  static async processAuthChange(event, session) {
    // Prevent concurrent processing
    if (AuthStateManager.isProcessing) {
      console.log('AuthStateManager: Already processing, skipping');
      return;
    }

    AuthStateManager.isProcessing = true;

    try {
      const previousState = AuthStateManager.currentState;
      const newState = { event, session, timestamp: Date.now() };

      // Skip duplicate state changes
      if (previousState && 
          previousState.event === event && 
          previousState.session?.user?.id === session?.user?.id) {
        console.log('AuthStateManager: Duplicate state change detected, skipping');
        AuthStateManager.isProcessing = false;
        return;
      }

      console.log(`AuthStateManager: State change: ${previousState?.event || 'none'} → ${event}`, session?.user?.email);

      // Update current state
      AuthStateManager.currentState = newState;

      // Notify all listeners
      const listenersToRemove = [];
      for (const listener of AuthStateManager.listeners) {
        try {
          await listener.callback(event, session, previousState);
          
          // Remove once listeners
          if (listener.once) {
            listenersToRemove.push(listener.id);
          }
        } catch (error) {
          console.error('AuthStateManager: Listener error:', error);
        }
      }
      
      // Remove once listeners
      for (const id of listenersToRemove) {
        AuthStateManager.removeListener(id);
      }

      // Dispatch legacy event for backward compatibility
      window.dispatchEvent(new CustomEvent('authStateChange', {
        detail: { event, session }
      }));

    } catch (error) {
      console.error('AuthStateManager: Error processing auth change:', error);
    } finally {
      AuthStateManager.isProcessing = false;
    }
  }

  /**
   * Add auth state listener
   */
  static addListener(callback, options = {}) {
    const listener = {
      callback,
      id: options.id || `listener_${Date.now()}_${Math.random()}`,
      once: options.once || false
    };

    AuthStateManager.listeners.push(listener);
    console.log(`AuthStateManager: Added listener ${listener.id}`);

    // If already authenticated, call immediately
    if (AuthStateManager.currentState && options.immediate !== false) {
      setTimeout(() => {
        callback(AuthStateManager.currentState.event, AuthStateManager.currentState.session, null);
      }, 0);
    }

    return listener.id;
  }

  /**
   * Remove auth state listener
   */
  static removeListener(listenerId) {
    const index = AuthStateManager.listeners.findIndex(l => l.id === listenerId);
    if (index !== -1) {
      AuthStateManager.listeners.splice(index, 1);
      console.log(`AuthStateManager: Removed listener ${listenerId}`);
      return true;
    }
    return false;
  }

  /**
   * Get current auth state
   */
  static getCurrentState() {
    return AuthStateManager.currentState;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated() {
    return AuthStateManager.currentState?.event === 'SIGNED_IN' && 
           AuthStateManager.currentState?.session;
  }

  /**
   * Get current user
   */
  static getCurrentUser() {
    return AuthStateManager.currentState?.session?.user || null;
  }

  /**
   * Force auth state refresh
   */
  static async refreshAuth(supabaseClient) {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      
      const event = session ? 'SIGNED_IN' : 'SIGNED_OUT';
      AuthStateManager.handleAuthStateChange(event, session);
    } catch (error) {
      console.error('AuthStateManager: Failed to refresh auth:', error);
    }
  }

  /**
   * Reset manager (for testing)
   */
  static reset() {
    if (AuthStateManager.debounceTimeout) {
      clearTimeout(AuthStateManager.debounceTimeout);
    }
    AuthStateManager.listeners = [];
    AuthStateManager.currentState = null;
    AuthStateManager.isProcessing = false;
    AuthStateManager.initialized = false;
    AuthStateManager.debounceTimeout = null;
    console.log('AuthStateManager: Reset');
  }
}

// Export singleton instance
export const authStateManager = AuthStateManager.getInstance();

// Export static methods for convenience
export {
  AuthStateManager
};

// Export for global access
window.AuthStateManager = AuthStateManager;
