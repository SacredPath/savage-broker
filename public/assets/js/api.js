/**
 * API Client - Fixed Version with Shared Supabase Client
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

class APIClient {
  constructor() {
    this.supabase = null;
    this.serviceClient = null;
    this.initialized = false;
    this.initPromise = null;
    this.init();
  }

  init() {
    this.initSupabase();
    this.initServiceClient();
    this.startKeepAlive();
  }

  async initServiceClient() {
    try {
      console.log('[APIClient] Initializing service client...');
      
      // Hardcode API keys to prevent truncation issues
      const supabaseUrl = 'https://ubycoeyutauzjgxbozcm.supabase.co';
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieWNvZXl1dGF1empneGJvemNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQwNjI5MiwiZXhwIjoyMDg0OTgyMjkyfQ.16X2ssw9RgDw4QhF4x1KvilcbMUpqn00gBP0Ed7MCHc';
      
      console.log('[APIClient] Service client URL:', supabaseUrl);
      console.log('[APIClient] Service client key length:', serviceRoleKey.length);
      console.log('[APIClient] Service client key preview:', serviceRoleKey.substring(0, 50) + '...');
      
      if (!supabaseUrl || !serviceRoleKey) {
        console.warn('[APIClient] Service role credentials not available, using fallback');
        return;
      }
      
      this.serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      
      console.log('[APIClient] Service client initialized successfully');
    } catch (error) {
      console.error('[APIClient] Service client init failed:', error);
    }
  }

  getDevelopmentUrl() {
    return 'https://ubycoeyutauzjgxbozcm.supabase.co';
  }

  getServiceRoleKey() {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieWNvZXl1dGF1empneGJvemNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODM5NzUxOSwiZXhwIjoyMDUzOTczNTE5fQ.NUqdlArOGnCUEXuQYummEgsJKHoTk3fUvBarKIagHMM';
  }

  async initSupabase() {
    try {
      console.log('[APIClient] Initializing shared Supabase client...');
      
      // Use shared Supabase client instance to prevent duplicates
      if (window.SupabaseClient) {
        this.supabase = await window.SupabaseClient.getClient();
        console.log('[APIClient] Using shared Supabase client instance');
        
        // Test auth immediately
        const { data: { session } } = await this.supabase.auth.getSession();
        console.log('[APIClient] Auth test - Session:', session ? 'Found' : 'Not found');
        if (session?.access_token) {
          console.log('[APIClient] Auth test - Token available:', session.access_token.substring(0, 20) + '...');
        }
      } else if (window.supabase) {
        // Fallback to legacy global instance
        this.supabase = await window.supabase.getClient();
        console.log('[APIClient] Using legacy Supabase client instance');
        
        // Test auth immediately
        const { data: { session } } = await this.supabase.auth.getSession();
        console.log('[APIClient] Auth test - Session:', session ? 'Found' : 'Not found');
        if (session?.access_token) {
          console.log('[APIClient] Auth test - Token available:', session.access_token.substring(0, 20) + '...');
        }
      } else {
        // Last resort - wait for SupabaseClient to load
        console.warn('[APIClient] SupabaseClient not available, retrying...');
        setTimeout(() => this.initSupabase(), 100);
        return;
      }
      
      console.log('[APIClient] Initialized with shared client');
    } catch (error) {
      console.error('[APIClient] Init failed:', error);
    }
  }

  // --- ADDED MISSING METHOD TO FIX SYNTAX ERROR ---
  transformBalanceData(data) {
    if (!data) return [];
    return data.map(item => ({
      symbol: item.symbol,
      amount: item.amount,
      value: item.usd_value || 0
    }));
  }

  async fetchEdge(functionName, options = {}) {
    const {
      method = 'GET',
      body,
      timeout = 10000, // Default timeout of 10 seconds
      retries = 3,
      requireAuth = true,
      sentAuthPrefix = null
    } = options;

    // Ensure Supabase client is initialized
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const edgeFunctionUrl = `${this.supabase.supabaseUrl}/functions/v1/${functionName}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.supabase.supabaseKey
      // Note: x-supabase-edge-url header removed due to CORS issues
    };

    // ALWAYS get auth session due to Supabase global auth interceptor
    // Even public functions require Authorization header
    console.log('[APIClient] Getting auth session for:', functionName);
    const { data: { session } } = await this.supabase.auth.getSession();
    console.log('[APIClient] Session retrieved:', session ? 'Found' : 'Not found');
    
    if (session && session.access_token) {
      const token = session.access_token;
      console.log('[APIClient] JWT Token found:', token.substring(0, 20) + '...');
      console.log('[APIClient] JWT Token length:', token.length);
      console.log('[APIClient] JWT Token expires at:', new Date(session.expires_at * 1000).toISOString());
      
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[APIClient] Authorization header set:', headers['Authorization'].substring(0, 30) + '...');
    } else {
      console.error('[APIClient] No session or access_token found');
      console.log('[APIClient] Session object:', session);
      
      if (requireAuth) {
        // If authentication is required but no session, throw an error
        throw new Error('Authentication required but no active session found.');
      } else {
        // For public functions, create a minimal auth header or use anon key
        console.log('[APIClient] Public function but no session - using anon key');
        headers['Authorization'] = `Bearer ${this.supabase.supabaseKey}`;
      }
    }

    let lastError = null;
    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const fetchOptions = {
          method,
          headers,
          signal: controller.signal,
        };

        if (body) {
          // Check if body is already a string to prevent double encoding
          if (typeof body === 'string') {
            fetchOptions.body = body;
          } else {
            fetchOptions.body = JSON.stringify(body);
          }
        }

        console.log('[APIClient] Sending request to:', edgeFunctionUrl);
        console.log('[APIClient] Request headers:', headers);
        console.log('[APIClient] Full fetch options:', fetchOptions);
        
        const response = await fetch(edgeFunctionUrl, fetchOptions);
        clearTimeout(id);

        // Log response details for debugging
        console.log('[APIClient] Response status:', response.status);
        console.log('[APIClient] Response headers:', Object.fromEntries(response.headers.entries()));

        // Handle HTTP errors with proper status codes
        if (!response.ok) {
          let errorBody;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = { message: response.statusText };
          }
          
          let errorMessage;
          switch (response.status) {
            case 400:
              errorMessage = `Bad Request: ${errorBody.message || 'Invalid request data'}`;
              break;
            case 401:
              errorMessage = `Unauthorized: Authentication required`;
              break;
            case 403:
              errorMessage = `Forbidden: Insufficient permissions`;
              break;
            case 404:
              errorMessage = `Not Found: ${errorBody.message || 'Resource not found'}`;
              break;
            case 500:
              errorMessage = `Server Error: ${errorBody.message || 'Internal server error'}`;
              break;
            default:
              errorMessage = `HTTP ${response.status}: ${errorBody.message || JSON.stringify(errorBody)}`;
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('[APIClient] Response data:', data);
        return { data, error: null };
      } catch (error) {
        clearTimeout(id);
        lastError = error;
        if (error.name === 'AbortError') {
          console.warn(`Edge function ${functionName} timed out. Retrying... (${i + 1}/${retries})`);
        } else {
          console.error(`Edge function ${functionName} failed: ${error.message}. Retrying... (${i + 1}/${retries})`);
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
    throw lastError;
  }

  // ===== REST API METHODS (REPLACE EDGE FUNCTIONS) =====

  async getPortfolioSnapshot(userId) {
    try {
      console.log('[APIClient] Getting portfolio snapshot via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Get user positions with current prices
      const { data: positions, error: positionsError } = await this.serviceClient
        .from('positions')
        .select(`
          *,
          tiers:tier_id
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (positionsError) {
        console.error('[APIClient] Positions query error:', positionsError);
        throw positionsError;
      }

      // Get user balances from wallet_balances view
      const { data: balances, error: balancesError } = await this.serviceClient
        .from('wallet_balances')
        .select('*')
        .eq('user_id', userId);

      if (balancesError) {
        console.error('[APIClient] Balances query error:', balancesError);
        throw balancesError;
      }

      // Calculate portfolio summary
      const totalValue = positions.reduce((sum, pos) => sum + (pos.principal_usd || 0), 0);
      const totalBalance = balances.reduce((sum, bal) => sum + (bal.balance || 0), 0);

      return {
        positions: positions || [],
        balances: balances || [],
        summary: {
          total_value: totalValue,
          total_balance: totalBalance,
          position_count: positions?.length || 0,
          last_updated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[APIClient] Failed to get portfolio snapshot:', error);
      throw error;
    }
  }

  async getMarketPrices() {
    try {
      console.log('[APIClient] Getting market prices via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      const { data, error } = await this.serviceClient
        .from('price_cache')
        .select('*')
        .order('as_of', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[APIClient] Prices query error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('[APIClient] Failed to get market prices:', error);
      throw error;
    }
  }

  async keepAlive() {
    try {
      console.log('[APIClient] Keepalive via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Simple health check - query app_settings
      const { data, error } = await this.serviceClient
        .from('app_settings')
        .select('id, updated_at')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('[APIClient] Keepalive query error:', error);
        throw error;
      }

      return {
        ok: true,
        pong: true,
        timestamp: new Date().toISOString(),
        database_connected: true,
        app_settings_id: data?.id,
        app_settings_updated: data?.updated_at,
        note: "keepalive ping successful - database verified"
      };
    } catch (error) {
      console.error('[APIClient] Keepalive failed:', error);
      throw error;
    }
  }

  // ===== LEGACY EDGE FUNCTION METHODS (FALLBACK) =====

  async fetchBalances() {
    try {
      console.log('[APIClient] fetchBalances() is deprecated. Use BalanceService.getUserBalances() instead.');
      
      // Delegate to unified balance service
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const balanceData = await window.BalanceService.getUserBalances(userId);
      return balanceData.balances;
      
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      return {};
    }
  }

  async getCurrentUserId() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session?.user?.id;
    } catch (error) {
      console.error('[APIClient] Failed to get current user ID:', error);
      return null;
    }
  }

  // ===== CANONICAL RESPONSE MAPPERS =====

  async fetchDashboardSummary() {
    try {
      const response = await this.fetchEdge('dashboard_summary');
      return this.mapDashboardSummary(response);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
      throw error;
    }
  }

  mapDashboardSummary(response) {
    // Expected shape from dashboard_summary endpoint
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid dashboard summary response');
    }

    const required = ['total_balance_usd', 'available_balance_usd', 'total_equity_usd', 'today_pnl_usd', 'total_pnl_usd'];
    for (const field of required) {
      if (response[field] === undefined || response[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      totalBalance: parseFloat(response.total_balance_usd) || 0,
      availableBalance: parseFloat(response.available_balance_usd) || 0,
      totalEquity: parseFloat(response.total_equity_usd) || 0,
      todayPnl: parseFloat(response.today_pnl_usd) || 0,
      totalPnl: parseFloat(response.total_pnl_usd) || 0,
      todayPnlPercent: parseFloat(response.today_pnl_percent) || 0,
      totalPnlPercent: parseFloat(response.total_pnl_percent) || 0,
      lastUpdated: response.last_updated || new Date().toISOString()
    };
  }

  async fetchPositionsList() {
    try {
      const response = await this.fetchEdge('positions_list');
      return this.mapPositionsList(response);
    } catch (error) {
      console.error('Failed to fetch positions list:', error);
      throw error;
    }
  }

  mapPositionsList(response) {
    if (!Array.isArray(response)) {
      throw new Error('Positions list must be an array');
    }

    return response.map(position => {
      if (!position.symbol) {
        throw new Error('Position missing required field: symbol');
      }

      return {
        symbol: position.symbol,
        side: position.side || 'long',
        size: parseFloat(position.size) || 0,
        entryPrice: parseFloat(position.entry_price) || 0,
        currentPrice: parseFloat(position.current_price) || 0,
        unrealizedPnl: parseFloat(position.unrealized_pnl_usd) || 0,
        unrealizedPnlPercent: parseFloat(position.unrealized_pnl_percent) || 0,
        marginUsed: parseFloat(position.margin_used_usd) || 0,
        leverage: parseFloat(position.leverage) || 1
      };
    });
  }

  async fetchTiersList() {
    try {
      const response = await this.fetchEdge('tiers_list');
      return this.mapTiersList(response);
    } catch (error) {
      console.error('Failed to fetch tiers list:', error);
      throw error;
    }
  }

  mapTiersList(response) {
    if (!Array.isArray(response)) {
      throw new Error('Tiers list must be an array');
    }

    return response.map(tier => {
      if (!tier.name || tier.level === undefined) {
        throw new Error('Tier missing required fields: name or level');
      }

      return {
        name: tier.name,
        level: parseInt(tier.level) || 0,
        minBalance: parseFloat(tier.min_balance_usd) || 0,
        maxBalance: parseFloat(tier.max_balance_usd) || Infinity,
        benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
        tradingFee: parseFloat(tier.trading_fee_percent) || 0,
        withdrawalLimit: parseFloat(tier.withdrawal_limit_daily_usd) || 0,
        isCurrent: Boolean(tier.is_current)
      };
    }).sort((a, b) => a.level - b.level);
  }

  async fetchInvestPreview() {
    try {
      const response = await this.fetchEdge('invest_preview');
      return this.mapInvestPreview(response);
    } catch (error) {
      console.error('Failed to fetch invest preview:', error);
      throw error;
    }
  }

  mapInvestPreview(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid invest preview response');
    }

    const required = ['available_balance_usd', 'estimated_apr', 'min_investment_usd'];
    for (const field of required) {
      if (response[field] === undefined || response[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      availableBalance: parseFloat(response.available_balance_usd) || 0,
      estimatedApr: parseFloat(response.estimated_apr) || 0,
      minInvestment: parseFloat(response.min_investment_usd) || 0,
      maxInvestment: parseFloat(response.max_investment_usd) || Infinity,
      termDays: parseInt(response.term_days) || 30,
      projectedReturn: parseFloat(response.projected_return_usd) || 0,
      riskLevel: response.risk_level || 'medium'
    };
  }

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
        console.error('Keep-alive ping failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('Keep-alive ping started (10-minute interval)');
  }

  async pingKeepAlive() {
    try {
      // Use REST API keepalive method instead of Edge Function
      const result = await this.keepAlive();
      console.log('Keep-alive ping successful:', result);
      return result;
    } catch (error) {
      console.error('Keep-alive ping failed:', error);
      throw error;
    }
  }

  async getExchangeRate(from = 'USDT', to = 'USD') {
    try {
      const result = await this.fetchEdge('exchange_rate', {
        method: 'POST',
        body: { from, to },
        requireAuth: false
      });
      return result;
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount, currency = 'USD') {
    try {
      const result = await this.fetchEdge('create_payment_intent', {
        method: 'POST',
        body: { amount, currency }
      });
      return result;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  async auth_debug() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return {
        hasSession: !!session,
        sessionData: session,
        supabaseUrl: this.supabase.supabaseUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Auth debug failed:', error);
      return { error: error.message };
    }
  }

  async getConversionHistory(userId) {
    try {
      console.log('[APIClient] Getting conversion history via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      const { data, error } = await this.serviceClient
        .from('conversions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[APIClient] Conversion history query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Conversions table does not exist yet. Returning empty array.');
          return [];
        }
        
        throw error;
      }

      console.log('[APIClient] Conversion history loaded:', data?.length || 0, 'conversions');
      return data || [];
    } catch (error) {
      console.error('[APIClient] Failed to get conversion history:', error);
      throw error;
    }
  }

  async getUnifiedHistory(userId) {
    try {
      console.log('[APIClient] Getting unified history via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Load unified history from database
      const { data, error } = await this.serviceClient
        .from('unified_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[APIClient] Unified history query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Unified history table does not exist yet. Returning empty array.');
          return [];
        }
        
        throw error;
      }

      console.log('[APIClient] Unified history loaded:', data?.length || 0, 'items');
      return data || [];
    } catch (error) {
      console.error('[APIClient] Failed to get unified history:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      console.log('[APIClient] Getting user profile via shared Supabase client...');
      
      if (!this.supabase) {
        throw new Error('Shared Supabase client not initialized');
      }

      // Load user profile using the same client that works for registration
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[APIClient] User profile query error:', error);
        
        // Check if profile doesn't exist (0 rows) and create one
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('single JSON object')) {
          console.warn('[APIClient] No profile found for user, creating one...');
          
          try {
            // Get current user info
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
              // Create basic profile
              const { data: newProfile, error: createError } = await this.supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  user_id: user.id,
                  email: user.email,
                  display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
                  phone: user.phone || '',
                  email_verified: user.email_confirmed_at ? true : false,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();

              if (createError) {
                console.error('[APIClient] Failed to create profile:', createError);
                throw new Error('Profile creation failed: ' + createError.message);
              }

              console.log('[APIClient] Profile created successfully:', newProfile);
              return newProfile;
            }
          } catch (createError) {
            console.error('[APIClient] Profile creation failed:', createError);
            throw new Error('Unable to create user profile');
          }
        }
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Profiles table does not exist yet.');
          throw new Error('Profiles table not available - please run create-profiles-table.sql');
        }
        
        // Check if column doesn't exist
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Profiles table schema mismatch.');
          throw new Error('Profiles table schema mismatch - please update database schema');
        }
        
        throw error;
      }

      console.log('[APIClient] User profile loaded:', data);
      return data;
    } catch (error) {
      console.error('[APIClient] Failed to get user profile:', error);
      throw error;
    }
  }

  async getKYCStatus(userId) {
    try {
      console.log('[APIClient] Getting KYC status via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Load KYC status from database
      const { data, error } = await this.serviceClient
        .from('kyc_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[APIClient] KYC status query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] KYC table does not exist yet.');
          throw new Error('KYC status not available');
        }
        
        throw error;
      }

      // Handle empty results gracefully
      if (!data || data.length === 0) {
        console.log('[APIClient] No KYC application found for user, returning default status');
        return {
          status: 'not_submitted',
          submitted_at: null,
          reviewed_at: null,
          rejection_reason: null
        };
      }

      console.log('[APIClient] KYC status loaded:', data[0]);
      return data[0];
    } catch (error) {
      console.error('[APIClient] Failed to get KYC status:', error);
      throw error;
    }
  }

  async getPayoutMethods(userId) {
    try {
      console.log('[APIClient] Getting payout methods via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Load payout methods from database
      const { data, error } = await this.serviceClient
        .from('payout_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[APIClient] Payout methods query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Payout methods table does not exist yet. Returning empty array.');
          return [];
        }
        
        throw error;
      }

      console.log('[APIClient] Payout methods loaded:', data?.length || 0, 'methods');
      return data || [];
    } catch (error) {
      console.error('[APIClient] Failed to get payout methods:', error);
      throw error;
    }
  }

  async getConversionSettings() {
    try {
      console.log('[APIClient] Getting conversion settings via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Load conversion settings from database
      const { data, error } = await this.serviceClient
        .from('conversion_settings')
        .select('*')
        .single();

      if (error) {
        console.error('[APIClient] Conversion settings query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Conversion settings table does not exist yet.');
          throw new Error('Conversion settings not available');
        }
        
        throw error;
      }

      console.log('[APIClient] Conversion settings loaded:', data);
      return data;
    } catch (error) {
      console.error('[APIClient] Failed to get conversion settings:', error);
      throw error;
    }
  }

  async getWalletBalances(userId) {
    try {
      console.log('[APIClient] Getting wallet balances via REST API...');
      
      if (!this.serviceClient) {
        throw new Error('Service client not initialized');
      }

      // Load wallet balances from database
      const { data, error } = await this.serviceClient
        .from('wallet_balances')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('[APIClient] Wallet balances query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] Wallet balances table does not exist yet.');
          throw new Error('Wallet balances not available');
        }
        
        throw error;
      }

      // Convert array to object format
      const balances = {};
      data?.forEach(balance => {
        balances[balance.currency] = {
          available: balance.available,
          locked: balance.locked || 0,
          total: balance.total
        };
      });

      console.log('[APIClient] Wallet balances loaded:', balances);
      return balances;
    } catch (error) {
      console.error('[APIClient] Failed to get wallet balances:', error);
      throw error;
    }
  }

  async getFXQuote(fromCurrency, toCurrency, amount) {
    try {
      console.log('[APIClient] Getting FX quote via REST API...');
      
      const { data, error } = await this.serviceClient
        .from('fx_quotes')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('amount', amount)
        .limit(1);

      if (error) {
        console.error('[APIClient] FX quote query error:', error);
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('[APIClient] FX quotes table does not exist yet.');
          return this.createFallbackFXQuote(fromCurrency, toCurrency, amount);
        }
        
        throw error;
      }

      // Check if we got any results
      if (!data || data.length === 0) {
        console.warn('[APIClient] No FX quote found, creating fallback quote...');
        return this.createFallbackFXQuote(fromCurrency, toCurrency, amount);
      }

      console.log('[APIClient] FX quote loaded:', data[0]);
      return data[0];
    } catch (error) {
      console.error('[APIClient] Failed to get FX quote:', error);
      
      // Always try fallback on any error
      return this.createFallbackFXQuote(fromCurrency, toCurrency, amount);
    }
  }

  createFallbackFXQuote(fromCurrency, toCurrency, amount) {
    console.log('[APIClient] Creating fallback FX quote...');
    
    // Default rates for common pairs
    const defaultRates = {
      'USDT-USD': 1.00,
      'USD-USDT': 1.00,
      'BTC-USD': 45000.00,
      'USD-BTC': 0.00002222,
      'ETH-USD': 3000.00,
      'USD-ETH': 0.00033333,
      'BNB-USD': 300.00,
      'USD-BNB': 0.00333333
    };
    
    const pairKey = `${fromCurrency}-${toCurrency}`;
    const rate = defaultRates[pairKey] || 1.00;
    const result = amount * rate;
    
    const fallbackQuote = {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      amount: amount,
      rate: rate,
      result: result,
      source: 'fallback',
      created_at: new Date().toISOString()
    };
    
    console.log('[APIClient] Fallback FX quote created:', fallbackQuote);
    return fallbackQuote;
  }

  destroy() {
    // Clear keep-alive interval
    this.supabase = null;
    this.serviceClient = null;
    console.log('APIClient destroyed');
  }
}

// CRITICAL: Ensure it attaches to window immediately
if (!window.API) {
  window.API = new APIClient();
  console.log("API Client assigned to window.API");
} else {
  console.log("API Client already exists, skipping initialization");
}

// Additional utilities
window.EdgeVerify = {
  checkAuth: async () => {
    try {
      const debug = await window.API.auth_debug();
      return debug.hasSession;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }
};

export default APIClient;

// Make API client globally available for non-module scripts
// Only initialize if not already present
setTimeout(() => {
  if (!window.API) {
    window.API = new APIClient();
    window.APIClient = APIClient;
    console.log('API Client initialized and made globally available');
  } else {
    console.log('API Client already available, skipping delayed initialization');
  }
}, 100);
