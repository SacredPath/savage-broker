/**
 * Tiers Page Controller
 * Handles tier display, upgrade logic, and investment flows
 */

class TiersPage {
  constructor() {
    this.tiers = [];
    this.userPositions = [];
    this.currentUser = null;
    this.selectedTier = null;
    
    // Get API client
    this.api = window.API || null;

    if (!this.api) {
      console.warn("TiersPage: API client not found on load. Retrying in 500ms...");
      setTimeout(() => this.retryInit(), 500);
    } else {
      this.init();
    }
  }

  retryInit() {
    this.api = window.API || null;
    if (this.api) {
      this.init();
    } else {
      // Retry again if API client still not available
      setTimeout(() => this.retryInit(), 500);
    }
  }

  async init() {
    console.log('Tiers page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Load data
      await this.loadUserData();
      await this.loadTiers();
      
      // Setup UI
      this.renderTiers();
      
      console.log('Tiers page setup complete');
    } catch (error) {
      console.error('Error setting up tiers page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load investment tiers');
      }
    }
  }

  async loadUserData() {
    try {
      // Get current user and positions
      this.currentUser = await window.AuthService.getCurrentUserWithProfile();
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // Load user positions (mock data for now)
      this.userPositions = await this.getUserPositions();
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  async loadTiers() {
    try {
      console.log('Loading tiers from database...');
      
      // Load tiers from investment_tiers table
      const { data, error } = await window.API.serviceClient
        .from('investment_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('Database error loading tiers:', error);
        throw new Error(`Failed to load tiers: ${error.message}`);
      }
      
      this.tiers = data || [];
      console.log('Tiers loaded from database:', this.tiers.length, 'tiers');
    } catch (error) {
      console.error('Failed to load tiers:', error);
      // Show error to user instead of fallback mock data
      if (window.Notify) {
        window.Notify.error('Failed to load investment tiers. Please try again.');
      }
      this.tiers = [];
    }
  }

  getMockTiers() {
    return [
      {
        id: 1,
        name: 'Tier 1',
        min_amount: 1000,
        max_amount: 9999,
        days: 30,
        daily_roi: 0.005, // 0.5%
        allocation_mix: {
          'BTC': 40,
          'ETH': 30,
          'USDT': 30
        }
      },
      {
        id: 2,
        name: 'Tier 2',
        min_amount: 10000,
        max_amount: 49999,
        days: 60,
        daily_roi: 0.008, // 0.8%
        allocation_mix: {
          'BTC': 35,
          'ETH': 35,
          'USDT': 30
        }
      },
      {
        id: 3,
        name: 'Tier 3',
        min_amount: 50000,
        max_amount: 99999,
        days: 90,
        daily_roi: 0.012, // 1.2%
        allocation_mix: {
          'BTC': 30,
          'ETH': 40,
          'USDT': 30
        }
      },
      {
        id: 4,
        name: 'Tier 4',
        min_amount: 100000,
        max_amount: 499999,
        days: 120,
        daily_roi: 0.015, // 1.5%
        allocation_mix: {
          'BTC': 25,
          'ETH': 45,
          'USDT': 30
        }
      },
      {
        id: 5,
        name: 'Tier 5',
        min_amount: 500000,
        max_amount: null,
        days: 180,
        daily_roi: 0.02, // 2.0%
        allocation_mix: {
          'BTC': 20,
          'ETH': 50,
          'USDT': 30
        }
      }
    ];
  }

  async getUserPositions() {
    try {
      // Load user positions from database
      const userId = await window.API.getCurrentUserId();
      const { data, error } = await window.API.serviceClient
        .from('user_positions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error loading user positions:', error);
        
        // Handle specific table not found error
        if (error.code === 'PGRST205' && error.message.includes("Could not find the table 'public.user_positions'")) {
          console.warn('user_positions table not found. Using mock data for demonstration.');
          return this.getMockUserPositions();
        }
        
        return [];
      }

      // Transform position data to tier-compatible format
      const tierPositions = (data || []).map(position => ({
        id: position.id,
        tier_id: this.getTierIdFromAmount(position.quantity * position.entry_price),
        tier_name: this.getTierNameFromAmount(position.quantity * position.entry_price),
        amount: position.quantity * position.entry_price,
        currency: 'USD',
        started_at: position.opened_at,
        matures_at: position.opened_at ? new Date(new Date(position.opened_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString() : null,
        status: position.status,
        accrued_roi: position.unrealized_pnl || 0,
        symbol: position.symbol,
        position_type: position.position_type,
        entry_price: position.entry_price,
        current_price: position.current_price,
        quantity: position.quantity,
        unrealized_pnl: position.unrealized_pnl
      }));

      return tierPositions;
    } catch (error) {
      console.error('Failed to load user positions:', error);
      return this.getMockUserPositions();
    }
  }

  getMockUserPositions() {
    // Mock data for demonstration when table doesn't exist
    return [
      {
        id: 'mock_pos_1',
        tier_id: 2,
        tier_name: 'Tier 2',
        amount: 15000,
        currency: 'USD',
        started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        matures_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        accrued_roi: 720,
        symbol: 'AAPL',
        position_type: 'long',
        entry_price: 150.00,
        current_price: 155.50,
        quantity: 100,
        unrealized_pnl: 550.00
      }
    ];
  }

  getTierIdFromAmount(amount) {
    if (amount >= 500000) return 5;
    if (amount >= 100000) return 4;
    if (amount >= 50000) return 3;
    if (amount >= 10000) return 2;
    return 1;
  }

  getTierNameFromAmount(amount) {
    if (amount >= 500000) return 'Tier 5';
    if (amount >= 100000) return 'Tier 4';
    if (amount >= 50000) return 'Tier 3';
    if (amount >= 10000) return 'Tier 2';
    return 'Tier 1';
  }

  renderTiers() {
    const tiersGrid = document.getElementById('tiers-grid');
    if (!tiersGrid) return;

    if (this.tiers.length === 0) {
      tiersGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3;">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <h3>No Investment Tiers Available</h3>
          <p>Investment tiers are currently not available. Please check back later or contact support.</p>
        </div>
      `;
      return;
    }

    const userTotalEquity = this.calculateTotalEquity();
    const currentTierId = this.getCurrentTierId();

    tiersGrid.innerHTML = this.tiers.map(tier => {
      const isCurrentTier = tier.id === currentTierId;
      const isEligible = userTotalEquity >= tier.min_amount;
      
      return `
        <div class="tier-container">
          <div class="tier-card ${isCurrentTier ? 'current' : ''}" data-tier-id="${tier.id}">
            <div class="tier-header">
              <div class="tier-name">${tier.name}</div>
              <div class="tier-range">
                ₮${this.formatMoney(tier.min_amount, 2)}${tier.max_amount ? ` - ₮${this.formatMoney(tier.max_amount, 2)}` : '+'}
              </div>
            </div>
            
            <div class="tier-description">
              <p>${tier.description || 'Investment tier with competitive returns.'}</p>
            </div>
            
            <div class="tier-stats">
              <div class="tier-stat">
                <div class="tier-stat-value">${tier.investment_period_days}</div>
                <div class="tier-stat-label">Days</div>
              </div>
              <div class="tier-stat">
                <div class="tier-stat-value">${(tier.daily_roi * 100).toFixed(2)}%</div>
                <div class="tier-stat-label">Daily ROI</div>
              </div>
              <div class="tier-stat">
                <div class="tier-stat-value">${((tier.daily_roi * 100) * tier.investment_period_days).toFixed(1)}%</div>
                <div class="tier-stat-label">Total ROI</div>
              </div>
            </div>
            
            ${tier.features && tier.features.length > 0 ? `
              <div class="tier-features">
                <h4>Features</h4>
                <ul class="features-list">
                  ${tier.features.map(feature => `
                    <li class="feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      ${feature}
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <button class="tier-action" onclick="window.location.href='/app/tier-details.html?id=${tier.id}'">
            View Details
          </button>
        </div>
      `;
    }).join('');

    // Add direct click listeners to buttons after rendering
    setTimeout(() => {
      this.attachDirectButtonListeners();
    }, 100);
  }

  setupButtonEventListeners() {
    // Attach direct click listeners to tier action buttons
    this.attachDirectButtonListeners();
  }

  attachDirectButtonListeners() {
    // Add direct click listeners to all tier action buttons
    const buttons = document.querySelectorAll('.tier-action');
    console.log('Found tier buttons:', buttons.length);
    
    buttons.forEach((button, index) => {
      const tierId = button.dataset.tierId;
      console.log(`Adding listener to button ${index + 1} for tier ${tierId}`);
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Direct button click: Tier ${tierId}`);
        this.handleTierAction(tierId);
      });
      
      // Visual feedback
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px) scale(1.02)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0) scale(1)';
      });
    });
  }

  calculateTotalEquity() {
    // Calculate total equity from user positions (USD only to match backend expectations)
    return this.userPositions
      .filter(pos => pos.currency === 'USD')
      .reduce((total, pos) => total + pos.amount, 0);
  }

  getCurrentTierId() {
    // Get the highest tier the user qualifies for based on total equity
    const totalEquity = this.calculateTotalEquity();
    
    // Find the highest tier user qualifies for
    let currentTierId = 1;
    for (const tier of this.tiers.sort((a, b) => a.id - b.id)) {
      if (totalEquity >= tier.min_amount) {
        currentTierId = tier.id;
      } else {
        break;
      }
    }
    
    return currentTierId;
  }

  handleTierAction(tierId) {
    const tier = this.tiers.find(t => t.id === tierId);
    if (!tier) return;

    const currentTierId = this.getCurrentTierId();
    const userTotalEquity = this.calculateTotalEquity();
    const isCurrentTier = tier.id === currentTierId;

    if (isCurrentTier) {
      // View Details - show current tier details
      window.location.href = `/app/tier-details.html?id=${tierId}`;
    } else if (userTotalEquity >= tier.min_amount) {
      // Invest Now - user qualifies for this tier
      window.location.href = `/app/tier-details.html?id=${tierId}`;
    } else {
      // Upgrade - user needs to deposit more
      window.location.href = `/app/deposits.html?amount=${tier.min_amount - userTotalEquity}&currency=USDT&target=tier_upgrade&tier_id=${tierId}`;
    }
  }

  formatMoney(amount, precision = 2) {
    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  }

  // Cleanup method
  destroy() {
    console.log('Tiers page cleanup');
  }
}

// Initialize page controller
window.tiersPage = new TiersPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TiersPage;
}
