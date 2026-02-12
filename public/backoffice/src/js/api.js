/**
 * API Client - Single Source of Truth
 * All network calls go through this client with timeouts, AbortController, and standardized error mapping
 * Bounded retries (max 1) and user-friendly error handling
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

class APIClient {
  constructor() {
    this.supabase = null;
    this.keepAliveInterval = null;
    this.requestQueue = new Map();
    this.init();
  }

  init() {
    this.initSupabase();
    this.startKeepAlive();
  }

  initSupabase() {
    try {
      const env = window.__ENV || {};
      const SUPABASE_URL = env.SUPABASE_URL || "https://ubycoeyutauzjgxbozcm.supabase.co";
      const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieWNvZXl1dGF1empneGJvemNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDYyOTIsImV4cCI6MjA4NDk4MjI5Mn0.NUqdlArOGnCUEXuQYummEgsJKHoTk3fUvBarKIagHMM";
      
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[APIClient] Initialized');
    } catch (error) {
      console.error('[APIClient] Init failed:', error);
    }
  }

  // Direct Supabase REST API calls instead of edge functions
  async fetchSupabase(table, options = {}) {
    const {
      method = 'GET',
      body,
      timeout = 10000,
      retries = 1,
      requireAuth = true,
      filters = {},
      select = '*'
    } = options;

    let authHeader = '';
    if (requireAuth) {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error || !session?.access_token) {
        throw new Error('UNAUTHENTICATED');
      }
      authHeader = `Bearer ${session.access_token}`;
    }

    // Build query parameters for GET requests
    let url = `${this.supabase.supabaseUrl}/rest/v1/${table}?select=${select}`;
    
    // Add filters to query
    Object.entries(filters).forEach(([key, value]) => {
      url += `&${key}=eq.${encodeURIComponent(value)}`;
    });

    const requestId = `${table}-${method}-${Date.now()}`;
    
    try {
      if (this.requestQueue.has(requestId)) {
        return this.requestQueue.get(requestId);
      }

      const requestPromise = this._executeSupabaseRequest(url, {
        method,
        body,
        timeout,
        authHeader,
        retries
      });

      this.requestQueue.set(requestId, requestPromise);
      const result = await requestPromise;
      this.requestQueue.delete(requestId);
      
      return result;

    } catch (error) {
      this.requestQueue.delete(requestId);
      throw error;
    }
  }

  async _executeSupabaseRequest(url, options) {
    const { method, body, timeout, authHeader, retries } = options;
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'apikey': this.supabase.supabaseKey,
            'Prefer': 'return=representation'
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return { data, error: null };

      } catch (error) {
        lastError = error;
        
        if (error.name === 'AbortError' || error.message === 'UNAUTHENTICATED') {
          throw error;
        }

        if (attempt < retries) {
          console.warn(`[APIClient] Retry ${attempt + 1}/${retries} for ${url}:`, error.message);
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw this._mapError(lastError, 'supabase');
  }

  // Error mapping for user-friendly messages
  _mapError(error, functionName) {
    const message = error.message || 'Unknown error';
    
    // Network errors
    if (error.name === 'AbortError') {
      return new Error('Request timed out. Please check your connection and try again.');
    }
    
    if (message.includes('fetch')) {
      return new Error('Network error. Please check your connection and try again.');
    }

    // Authentication errors
    if (message === 'UNAUTHENTICATED') {
      return new Error('Please log in to continue.');
    }

    // Server errors
    if (message.includes('500') || message.includes('SERVER_ERROR')) {
      return new Error('Server error. Please try again in a moment.');
    }

    // Permission errors
    if (message.includes('403') || message.includes('UNAUTHORIZED')) {
      return new Error('You do not have permission to perform this action.');
    }

    // Validation errors
    if (message.includes('400') || message.includes('INVALID')) {
      return new Error('Invalid request. Please check your input and try again.');
    }

    // Default error
    return new Error(`An error occurred: ${message}`);
  }

  // Keep-alive ping every 10 minutes
  startKeepAlive() {
    // Clear any existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Set up keep-alive ping every 10 minutes
    this.keepAliveInterval = setInterval(async () => {
      try {
        await this.pingKeepAlive();
      } catch (error) {
        console.error('[APIClient] Keep-alive ping failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('[APIClient] Keep-alive ping started (10-minute interval)');
  }

  async pingKeepAlive() {
    try {
      await this.fetchEdge('keepalive', {
        method: 'GET',
        timeout: 5000,
        requireAuth: false
      });
      console.log('[APIClient] Keep-alive ping successful');
    } catch (error) {
      console.warn('[APIClient] Keep-alive ping failed:', error.message);
    }
  }

  // Profile-specific methods using REST API
  async getProfile(userId) {
    return await this.fetchSupabase('profiles', {
      filters: { id: userId },
      select: '*'
    });
  }

  async updateProfile(userId, profileData) {
    return await this.fetchSupabase('profiles', {
      method: 'PATCH',
      body: profileData,
      filters: { id: userId }
    });
  }

  // Balance fetching with canonical mapping
  async fetchBalances() {
    try {
      const data = await this.fetchSupabase('balances');
      return this.transformBalanceData(data);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      return [];
    }
  }

  transformBalanceData(data) {
    if (!data) return [];
    return data.map(item => ({
      symbol: item.symbol,
      amount: item.amount,
      value: item.usd_value || 0
    }));
  }

  // Verify Edge Functions are working
  async verifyEdgeFunctions() {
    const functions = ['balances_get', 'prices_get', 'user_profile_get'];
    const results = {};
    
    for (const func of functions) {
      try {
        await this.fetchEdge(func);
        results[func] = 'OK';
      } catch (error) {
        results[func] = error.message;
      }
    }
    
    return results;
  }

  // Cleanup method
  destroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    this.requestQueue.clear();
  }
}

// Initialize global API client
window.API = new APIClient();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}
