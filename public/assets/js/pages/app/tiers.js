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
      this.setupModal();
      
      // Setup button event listeners
      this.setupButtonEventListeners();
      
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
          
          <button class="tier-action" data-tier-id="${tier.id}">
            ${isCurrentTier ? 'View Details' : (isEligible ? 'Invest Now' : 'Upgrade')}
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
      this.openTierModal(tierId);
    } else if (userTotalEquity >= tier.min_amount) {
      // Invest Now - user qualifies for this tier
      this.openTierModal(tierId);
    } else {
      // Upgrade - user needs to deposit more
      this.initiateUpgrade(tierId);
    }
  }

  initiateUpgrade(tierId) {
    // Open modal with upgrade options
    this.openTierModal(tierId);
  }

  setupModal() {
    // Setup modal close handlers
    const modal = document.getElementById('tier-modal');
    if (!modal) return;

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  async openTierModal(tierId) {
    this.selectedTier = this.tiers.find(t => t.id === tierId);
    if (!this.selectedTier) return;

    const modal = document.getElementById('tier-modal');
    const modalTitle = document.getElementById('modal-tier-name');
    const modalSubtitle = document.getElementById('modal-tier-subtitle');
    const tierSummary = document.getElementById('tier-summary');
    const positionDetailsSection = document.getElementById('position-details-section');
    const positionsGrid = document.getElementById('positions-grid');
    const investmentBreakdown = document.getElementById('investment-breakdown');
    const breakdownGrid = document.getElementById('breakdown-grid');
    const performanceMetrics = document.getElementById('performance-metrics');
    const metricsGrid = document.getElementById('metrics-grid');
    const assetAllocation = document.getElementById('asset-allocation');
    const allocationChart = document.getElementById('allocation-chart');
    const shortfallSection = document.getElementById('shortfall-section');
    const modalActions = document.getElementById('modal-actions');

    // Set modal title
    modalTitle.textContent = this.selectedTier.name;
    modalSubtitle.textContent = `${this.selectedTier.days} days at ${(this.selectedTier.daily_roi * 100).toFixed(2)}% daily ROI`;

    // Calculate metrics
    const userTotalEquity = this.calculateTotalEquity();
    const currentTierId = this.getCurrentTierId();
    const isCurrentTier = this.selectedTier.id === currentTierId;
    const isEligible = userTotalEquity >= this.selectedTier.min_amount;
    const currentPositions = this.userPositions.filter(pos => pos.tier_id === currentTierId);

    // Generate summary
    let summaryHTML = `
      <div class="summary-row">
        <span class="summary-label">Your Total Equity</span>
        <span class="summary-value highlight">₮${this.formatMoney(userTotalEquity, 2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Tier Minimum</span>
        <span class="summary-value">₮${this.formatMoney(this.selectedTier.min_amount, 2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Investment Period</span>
        <span class="summary-value">${this.selectedTier.days} days</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Daily ROI</span>
        <span class="summary-value">${(this.selectedTier.daily_roi * 100).toFixed(2)}%</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Expected Return</span>
        <span class="summary-value highlight">₮${this.formatMoney(this.selectedTier.min_amount * ((this.selectedTier.daily_roi * 100) * this.selectedTier.days / 100), 2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Current Tier</span>
        <span class="summary-value">${this.tiers.find(t => t.id === currentTierId)?.name || 'None'}</span>
      </div>
    `;

    tierSummary.innerHTML = summaryHTML;

    // Show position details if current tier
    if (isCurrentTier && currentPositions.length > 0) {
      positionDetailsSection.style.display = 'block';
      positionsGrid.innerHTML = currentPositions.map(position => `
        <div class="position-card" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h5 style="color: white; margin: 0; font-size: 16px;">${position.symbol}</h5>
              <span style="color: rgba(255,255,255,0.7); font-size: 12px;">${position.position_type.toUpperCase()}</span>
            </div>
            <div style="text-align: right;">
              <div style="color: ${position.unrealized_pnl >= 0 ? '#10B981' : '#EF4444'}; font-weight: 600;">
                ${position.unrealized_pnl >= 0 ? '+' : ''}$${this.formatMoney(position.unrealized_pnl)}
              </div>
              <div style="color: rgba(255,255,255,0.7); font-size: 12px;">
                ${position.unrealized_pnl >= 0 ? '+' : ''}${((position.unrealized_pnl / position.amount) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <span style="color: rgba(255,255,255,0.7); font-size: 12px;">Entry Price</span>
              <div style="color: white; font-weight: 500;">$${position.entry_price}</div>
            </div>
            <div>
              <span style="color: rgba(255,255,255,0.7); font-size: 12px;">Current Price</span>
              <div style="color: white; font-weight: 500;">$${position.current_price || 'N/A'}</div>
            </div>
            <div>
              <span style="color: rgba(255,255,255,0.7); font-size: 12px;">Quantity</span>
              <div style="color: white; font-weight: 500;">${position.quantity}</div>
            </div>
            <div>
              <span style="color: rgba(255,255,255,0.7); font-size: 12px;">Position Value</span>
              <div style="color: white; font-weight: 500;">$${this.formatMoney(position.amount)}</div>
            </div>
          </div>
          
          <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: rgba(255,255,255,0.6);">
            <div>Started: ${new Date(position.started_at).toLocaleDateString()}</div>
            ${position.matures_at ? `<div>Matures: ${new Date(position.matures_at).toLocaleDateString()}</div>` : ''}
          </div>
        </div>
      `).join('');

      // Show investment breakdown
      investmentBreakdown.style.display = 'block';
      const totalValue = currentPositions.reduce((sum, pos) => sum + pos.amount, 0);
      const totalPnL = currentPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
      
      breakdownGrid.innerHTML = `
        <div class="breakdown-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <span style="color: rgba(255,255,255,0.7);">Total Invested</span>
          <span style="color: white; font-weight: 500;">$${this.formatMoney(totalValue)}</span>
        </div>
        <div class="breakdown-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <span style="color: rgba(255,255,255,0.7);">Total P&L</span>
          <span style="color: ${totalPnL >= 0 ? '#10B981' : '#EF4444'}; font-weight: 500;">
            ${totalPnL >= 0 ? '+' : ''}$${this.formatMoney(totalPnL)}
          </span>
        </div>
        <div class="breakdown-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <span style="color: rgba(255,255,255,0.7);">Current Value</span>
          <span style="color: white; font-weight: 500;">$${this.formatMoney(totalValue + totalPnL)}</span>
        </div>
        <div class="breakdown-item" style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: rgba(255,255,255,0.7);">ROI</span>
          <span style="color: ${totalPnL >= 0 ? '#10B981' : '#EF4444'}; font-weight: 500;">
            ${totalPnL >= 0 ? '+' : ''}${((totalPnL / totalValue) * 100).toFixed(2)}%
          </span>
        </div>
      `;

      // Show performance metrics
      performanceMetrics.style.display = 'block';
      const avgROI = currentPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl / pos.amount), 0) / currentPositions.length;
      const bestPerformer = currentPositions.reduce((best, pos) => 
        (pos.unrealized_pnl / pos.amount) > (best.unrealized_pnl / best.amount) ? pos : best
      );
      const worstPerformer = currentPositions.reduce((worst, pos) => 
        (pos.unrealized_pnl / pos.amount) < (worst.unrealized_pnl / worst.amount) ? pos : worst
      );

      metricsGrid.innerHTML = `
        <div class="metric-card" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Average ROI</div>
          <div style="color: ${avgROI >= 0 ? '#10B981' : '#EF4444'}; font-size: 18px; font-weight: 600;">
            ${avgROI >= 0 ? '+' : ''}${(avgROI * 100).toFixed(2)}%
          </div>
        </div>
        <div class="metric-card" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Best Performer</div>
          <div style="color: #10B981; font-size: 16px; font-weight: 600;">${bestPerformer.symbol}</div>
          <div style="color: rgba(255,255,255,0.7); font-size: 12px;">
            +${((bestPerformer.unrealized_pnl / bestPerformer.amount) * 100).toFixed(2)}%
          </div>
        </div>
        <div class="metric-card" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Worst Performer</div>
          <div style="color: #EF4444; font-size: 16px; font-weight: 600;">${worstPerformer.symbol}</div>
          <div style="color: rgba(255,255,255,0.7); font-size: 12px;">
            ${((worstPerformer.unrealized_pnl / worstPerformer.amount) * 100).toFixed(2)}%
          </div>
        </div>
        <div class="metric-card" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px;">
          <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Win Rate</div>
          <div style="color: white; font-size: 18px; font-weight: 600;">
            ${((currentPositions.filter(pos => pos.unrealized_pnl >= 0).length / currentPositions.length) * 100).toFixed(0)}%
          </div>
        </div>
      `;

      // Show asset allocation
      if (this.selectedTier.allocation_mix) {
        assetAllocation.style.display = 'block';
        const allocations = Object.entries(this.selectedTier.allocation_mix);
        allocationChart.innerHTML = `
          <div style="display: grid; gap: 12px;">
            ${allocations.map(([asset, percentage]) => `
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 12px; height: 12px; border-radius: 2px; margin-right: 8px; background: ${this.getAssetColor(asset)};"></div>
                  <span style="color: white;">${asset}</span>
                </div>
                <span style="color: rgba(255,255,255,0.8);">${percentage}%</span>
              </div>
              <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="background: ${this.getAssetColor(asset)}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      // Hide detailed sections if no positions
      positionDetailsSection.style.display = 'none';
      investmentBreakdown.style.display = 'none';
      performanceMetrics.style.display = 'none';
      assetAllocation.style.display = 'none';
    }

    // Handle shortfall or upgrade options
    if (!isEligible) {
      this.showShortfallOptions();
    } else if (!isCurrentTier) {
      this.showUpgradeOptions();
    } else {
      this.showCurrentTierOptions();
    }

    // Show modal
    modal.classList.add('active');
  }

  getAssetColor(asset) {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'USDT': '#26A17B',
      'USDC': '#2775CA',
      'BNB': '#F3BA2F',
      'ADA': '#0033AD',
      'DOT': '#E6007A',
      'LINK': '#2A5ADA',
      'UNI': '#FF007A',
      'AAVE': '#B6509E'
    };
    return colors[asset] || '#6B7280';
  }

  showShortfallOptions() {
    const shortfallSection = document.getElementById('shortfall-section');
    const modalActions = document.getElementById('modal-actions');
    const userTotalEquity = this.calculateTotalEquity();
    const shortfall = this.selectedTier.min_amount - userTotalEquity;

    // Update shortfall display
    document.getElementById('shortfall-amount').textContent = `$${this.formatMoney(shortfall)}`;
    document.getElementById('shortfall-description').textContent = 
      `You need $${this.formatMoney(shortfall)} more to qualify for ${this.selectedTier.name}.`;

    // Show conversion preview
    this.showConversionPreview(shortfall);

    // Show top up button
    modalActions.innerHTML = `
      <button class="btn btn-secondary" onclick="window.tiersPage.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.tiersPage.handleTopUp()">
        Top Up Now
      </button>
    `;

    shortfallSection.style.display = 'block';
  }

  showConversionPreview(shortfall) {
    const conversionPreview = document.getElementById('conversion-preview');
    
    // Mock conversion rates (admin markup + fee)
    const usdtToUsdRate = 0.99; // 1% markup + fee
    const usdtAmount = Math.ceil(shortfall / usdtToUsdRate);
    const fee = usdtAmount - shortfall;
    
    conversionPreview.innerHTML = `
      <div class="conversion-row">
        <span class="conversion-label">USDT Required:</span>
        <span class="conversion-value">₮${this.formatMoney(usdtAmount, 6)}</span>
      </div>
      <div class="conversion-row">
        <span class="conversion-label">USD Received:</span>
        <span class="conversion-value">$${this.formatMoney(shortfall)}</span>
      </div>
      <div class="conversion-row">
        <span class="conversion-label">Fee & Markup:</span>
        <span class="conversion-value">₮${this.formatMoney(fee, 6)}</span>
      </div>
    `;
  }

  showUpgradeOptions() {
    const modalActions = document.getElementById('modal-actions');
    const shortfallSection = document.getElementById('shortfall-section');
    
    // Hide shortfall section
    shortfallSection.style.display = 'none';

    // Show upgrade button
    modalActions.innerHTML = `
      <button class="btn btn-secondary" onclick="window.tiersPage.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.tiersPage.handleUpgrade()">
        Upgrade to ${this.selectedTier.name}
      </button>
    `;
  }

  showCurrentTierOptions() {
    const modalActions = document.getElementById('modal-actions');
    const shortfallSection = document.getElementById('shortfall-section');
    
    // Hide shortfall section
    shortfallSection.style.display = 'none';

    // Show close button only
    modalActions.innerHTML = `
      <button class="btn btn-primary" onclick="window.tiersPage.closeModal()">Close</button>
    `;
  }

  async handleTopUp() {
    const userTotalEquity = this.calculateTotalEquity();
    const shortfall = this.selectedTier.min_amount - userTotalEquity;
    const usdtToUsdRate = 0.99;
    const usdtAmount = Math.ceil(shortfall / usdtToUsdRate);

    // Redirect to deposit with prefilled amount
    const depositUrl = `/app/deposits.html?amount=${usdtAmount}&currency=USDT&target=tier_upgrade&tier_id=${this.selectedTier.id}`;
    window.location.href = depositUrl;
  }

  async handleUpgrade() {
    try {
      const userTotalEquity = this.calculateTotalEquity();
      const currentTierId = this.getCurrentTierId();
      
      // If user is already at or above selected tier, just show details
      if (currentTierId >= this.selectedTier.id) {
        window.Notify.info('You are already at this tier or higher.');
        return;
      }

      // Calculate amount needed to upgrade
      const shortfall = this.selectedTier.min_amount - userTotalEquity;
      
      if (shortfall <= 0) {
        // User has enough equity, proceed with upgrade
        await this.processTierUpgrade();
      } else {
        // User needs to deposit more, redirect to deposit page
        this.setModalLoading(false);
        this.closeModal();
        
        const usdtToUsdRate = 0.99;
        const usdtAmount = Math.ceil(shortfall / usdtToUsdRate);
        
        // Redirect to deposit with prefilled amount
        const depositUrl = `/app/deposits.html?amount=${usdtAmount}&currency=USDT&target=tier_upgrade&tier_id=${this.selectedTier.id}`;
        window.location.href = depositUrl;
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      window.Notify.error(error.message || 'Upgrade failed. Please try again.');
      this.setModalLoading(false);
    }
  }

  async processTierUpgrade() {
    try {
      this.setModalLoading(true);

      // Call RPC function to process tier upgrade
      const { data, error } = await window.API.serviceClient
        .rpc('tier_upgrade_rpc', {
          p_target_tier_id: this.selectedTier.id,
          p_auto_claim_roi: true
        });

      if (error) {
        throw new Error(error.message || 'Tier upgrade failed');
      }

      // Show success message
      window.Notify.success(`Successfully upgraded to ${this.selectedTier.name}!`);

      // Reload data
      await this.loadUserData();
      this.renderTiers();
      this.closeModal();

    } catch (error) {
      console.error('Tier upgrade failed:', error);
      window.Notify.error(error.message || 'Tier upgrade failed. Please try again.');
    } finally {
      this.setModalLoading(false);
    }
  }

  setModalLoading(loading) {
    const modalActions = document.getElementById('modal-actions');
    if (!modalActions) return;

    if (loading) {
      modalActions.innerHTML = `
        <button class="btn btn-secondary" onclick="window.tiersPage.closeModal()" disabled>Cancel</button>
        <button class="btn btn-primary" disabled>
          <div class="loading-spinner" style="display: inline-block; margin-right: 8px;"></div>
          Processing...
        </button>
      `;
    }
  }

  closeModal() {
    const modal = document.getElementById('tier-modal');
    modal.classList.remove('active');
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
