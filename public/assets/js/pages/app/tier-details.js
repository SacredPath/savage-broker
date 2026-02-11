/**
 * Tier Details Page Controller
 * Handles displaying detailed tier information and actions
 */

class TierDetailsPage {
  constructor() {
    this.tier = null;
    this.userPositions = [];
    this.currentUser = null;
    
    // Get API client
    this.api = window.API || null;

    if (!this.api) {
      console.warn("TierDetailsPage: API client not found on load. Retrying in 500ms...");
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
    console.log('Tier details page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Get tier ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const tierId = parseInt(urlParams.get('id'));
      
      if (!tierId) {
        this.showError('No tier ID specified');
        return;
      }

      // Load data
      await this.loadUserData();
      await this.loadTierDetails(tierId);
      
      // Setup UI
      this.renderTierDetails();
      this.setupActions();
      
      console.log('Tier details page setup complete');
    } catch (error) {
      console.error('Error setting up tier details page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load tier details');
      }
      this.showError('Failed to load tier details');
    }
  }

  async loadUserData() {
    try {
      // Get current user and positions
      this.currentUser = await window.AuthService.getCurrentUserWithProfile();
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // Load user positions
      this.userPositions = await this.getUserPositions();
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  async loadTierDetails(tierId) {
    try {
      console.log('Loading tier details for ID:', tierId);
      
      // Load tier from database
      const { data, error } = await window.API.serviceClient
        .from('investment_tiers')
        .select('*')
        .eq('id', tierId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Database error loading tier:', error);
        throw new Error(`Failed to load tier: ${error.message}`);
      }
      
      this.tier = data;
      console.log('Tier loaded:', this.tier);
    } catch (error) {
      console.error('Failed to load tier details:', error);
      throw error;
    }
  }

  async getUserPositions() {
    try {
      // Load user positions from database with tier information
      const userId = await window.API.getCurrentUserId();
      const { data, error } = await window.API.serviceClient
        .from('user_positions')
        .select(`
          *,
          investment_tiers(name, daily_roi, investment_period_days, min_amount, max_amount)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('opened_at', { ascending: false });

      if (error) {
        console.error('Database error loading user positions:', error);
        return [];
      }

      // Transform position data to tier-compatible format
      const tierPositions = (data || []).map(position => ({
        id: position.id,
        tier_id: position.tier_id,
        tier_name: position.investment_tiers?.name || 'Unknown Tier',
        amount: position.amount || (position.quantity * position.entry_price),
        currency: position.currency || 'USD',
        started_at: position.opened_at,
        matures_at: position.matures_at,
        status: position.status,
        accrued_roi: 0,
        daily_roi: position.investment_tiers?.daily_roi || 0,
        investment_period_days: position.investment_tiers?.investment_period_days || 30,
        symbol: position.symbol,
        position_type: position.position_type,
        entry_price: position.entry_price,
        current_price: position.current_price,
        quantity: position.quantity,
        unrealized_pnl: position.unrealized_pnl || 0
      }));

      return tierPositions;
    } catch (error) {
      console.error('Failed to load user positions:', error);
      return [];
    }
  }

  renderTierDetails() {
    if (!this.tier) {
      this.showError('Tier not found');
      return;
    }

    // Hide loading state
    document.getElementById('loading-state').style.display = 'none';
    
    // Show content
    document.getElementById('tier-content').style.display = 'block';

    // Update tier information
    document.getElementById('tier-name').textContent = this.tier.name;
    document.getElementById('tier-subtitle').textContent = `${this.tier.investment_period_days} days at ${(this.tier.daily_roi * 100).toFixed(2)}% daily ROI`;

    // Calculate metrics
    const userTotalEquity = this.calculateTotalEquity();
    const isCurrentTier = this.isCurrentTier();
    const isEligible = userTotalEquity >= this.tier.min_amount;
    const currentPositions = this.userPositions.filter(pos => pos.tier_id === this.tier.id);

    // Generate summary
    this.renderSummary(userTotalEquity, isEligible);
    
    // Show position details if current tier
    if (isCurrentTier && currentPositions.length > 0) {
      this.renderPositionDetails(currentPositions);
      this.renderInvestmentBreakdown(currentPositions);
      this.renderPerformanceMetrics(currentPositions);
      this.renderAssetAllocation();
    } else {
      // Hide detailed sections
      document.getElementById('position-details-section').style.display = 'none';
      document.getElementById('investment-breakdown').style.display = 'none';
      document.getElementById('performance-metrics').style.display = 'none';
      document.getElementById('asset-allocation').style.display = 'none';
    }
  }

  renderSummary(userTotalEquity, isEligible) {
    const summaryHTML = `
      <div class="info-item">
        <span class="info-label">Your Total Equity</span>
        <span class="info-value highlight">₮${this.formatMoney(userTotalEquity, 2)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Tier Minimum</span>
        <span class="info-value">₮${this.formatMoney(this.tier.min_amount, 2)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Investment Period</span>
        <span class="info-value">${this.tier.investment_period_days} days</span>
      </div>
      <div class="info-item">
        <span class="info-label">Daily ROI</span>
        <span class="info-value">${(this.tier.daily_roi * 100).toFixed(2)}%</span>
      </div>
      <div class="info-item">
        <span class="info-label">Expected Return</span>
        <span class="info-value highlight">₮${this.formatMoney(this.tier.min_amount * ((this.tier.daily_roi * 100) * this.tier.investment_period_days / 100), 2)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Current Status</span>
        <span class="info-value">${this.isCurrentTier() ? 'Current Tier' : 'Available'}</span>
      </div>
    `;
    
    document.getElementById('tier-summary').innerHTML = summaryHTML;
  }

  renderPositionDetails(currentPositions) {
    const positionsHTML = currentPositions.map(position => `
      <div class="info-card" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
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
    
    document.getElementById('positions-grid').innerHTML = positionsHTML;
    document.getElementById('position-details-section').style.display = 'block';
  }

  renderInvestmentBreakdown(currentPositions) {
    const totalValue = currentPositions.reduce((sum, pos) => sum + pos.amount, 0);
    const totalPnL = currentPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
    
    const breakdownHTML = `
      <div class="info-item">
        <span class="info-label">Total Invested</span>
        <span class="info-value">$${this.formatMoney(totalValue)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Total P&L</span>
        <span class="info-value" style="color: ${totalPnL >= 0 ? '#10B981' : '#EF4444'};">
          ${totalPnL >= 0 ? '+' : ''}$${this.formatMoney(totalPnL)}
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Current Value</span>
        <span class="info-value">$${this.formatMoney(totalValue + totalPnL)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">ROI</span>
        <span class="info-value" style="color: ${totalPnL >= 0 ? '#10B981' : '#EF4444'};">
          ${totalPnL >= 0 ? '+' : ''}${((totalPnL / totalValue) * 100).toFixed(2)}%
        </span>
      </div>
    `;
    
    document.getElementById('breakdown-grid').innerHTML = breakdownHTML;
    document.getElementById('investment-breakdown').style.display = 'block';
  }

  renderPerformanceMetrics(currentPositions) {
    const avgROI = currentPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl / pos.amount), 0) / currentPositions.length;
    const bestPerformer = currentPositions.reduce((best, pos) => 
      (pos.unrealized_pnl / pos.amount) > (best.unrealized_pnl / best.amount) ? pos : best
    );
    const worstPerformer = currentPositions.reduce((worst, pos) => 
      (pos.unrealized_pnl / pos.amount) < (worst.unrealized_pnl / worst.amount) ? pos : worst
    );

    const metricsHTML = `
      <div class="info-card" style="background: rgba(16,185,129,0.1); margin-bottom: 8px;">
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">Average ROI</div>
        <div style="color: ${avgROI >= 0 ? '#10B981' : '#EF4444'}; font-size: 24px; font-weight: 600;">
          ${avgROI >= 0 ? '+' : ''}${(avgROI * 100).toFixed(2)}%
        </div>
      </div>
      <div class="info-card" style="background: rgba(16,185,129,0.1); margin-bottom: 8px;">
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">Best Performer</div>
        <div style="color: #10B981; font-size: 18px; font-weight: 600;">${bestPerformer.symbol}</div>
        <div style="color: rgba(255,255,255,0.7); font-size: 12px;">
          +${((bestPerformer.unrealized_pnl / bestPerformer.amount) * 100).toFixed(2)}%
        </div>
      </div>
      <div class="info-card" style="background: rgba(239,68,68,0.1); margin-bottom: 8px;">
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">Worst Performer</div>
        <div style="color: #EF4444; font-size: 18px; font-weight: 600;">${worstPerformer.symbol}</div>
        <div style="color: rgba(255,255,255,0.7); font-size: 12px;">
          ${((worstPerformer.unrealized_pnl / worstPerformer.amount) * 100).toFixed(2)}%
        </div>
      </div>
      <div class="info-card" style="background: rgba(59,130,246,0.1);">
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">Win Rate</div>
        <div style="color: white; font-size: 24px; font-weight: 600;">
          ${((currentPositions.filter(pos => pos.unrealized_pnl >= 0).length / currentPositions.length) * 100).toFixed(0)}%
        </div>
      </div>
    `;
    
    document.getElementById('metrics-grid').innerHTML = metricsHTML;
    document.getElementById('performance-metrics').style.display = 'block';
  }

  renderAssetAllocation() {
    if (!this.tier.allocation_mix) return;
    
    const allocations = Object.entries(this.tier.allocation_mix);
    const allocationHTML = `
      <div style="display: grid; gap: 16px;">
        ${allocations.map(([asset, percentage]) => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div style="display: flex; align-items: center;">
              <div style="width: 12px; height: 12px; border-radius: 2px; margin-right: 8px; background: ${this.getAssetColor(asset)};"></div>
              <span style="color: white;">${asset}</span>
            </div>
            <span style="color: rgba(255,255,255,0.8); font-weight: 500;">${percentage}%</span>
          </div>
          <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background: ${this.getAssetColor(asset)}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
          </div>
        `).join('')}
      </div>
    `;
    
    document.getElementById('allocation-chart').innerHTML = allocationHTML;
    document.getElementById('asset-allocation').style.display = 'block';
  }

  setupActions() {
    const userTotalEquity = this.calculateTotalEquity();
    const isCurrentTier = this.isCurrentTier();
    const isEligible = userTotalEquity >= this.tier.min_amount;
    
    let actionsHTML = '';
    
    if (isCurrentTier) {
      // Current tier - show claim ROI button if available
      const currentPositions = this.userPositions.filter(pos => pos.tier_id === this.tier.id);
      const totalAvailableROI = currentPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
      
      if (totalAvailableROI > 0) {
        actionsHTML = `
          <button class="btn btn-success" onclick="window.tierDetailsPage.claimROI()" style="margin-right: 12px;">
            Claim $${this.formatMoney(totalAvailableROI)} ROI
          </button>
        `;
      }
    } else if (isEligible) {
      // Eligible for upgrade
      actionsHTML = `
        <button class="btn btn-primary" onclick="window.tierDetailsPage.handleUpgrade()">
          Upgrade to ${this.tier.name}
        </button>
      `;
    } else {
      // Need to deposit more
      const shortfall = this.tier.min_amount - userTotalEquity;
      actionsHTML = `
        <div style="background: rgba(239,68,68,0.1); border: 1px solid var(--error); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <div style="color: var(--error); font-weight: 600; margin-bottom: 8px;">Investment Shortfall</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--error); margin-bottom: 8px;">$${this.formatMoney(shortfall)}</div>
          <div style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.4;">
            You need $${this.formatMoney(shortfall)} more to qualify for ${this.tier.name}.
          </div>
        </div>
        <button class="btn btn-secondary" onclick="window.location.href='/app/deposits.html?amount=${Math.ceil(shortfall / 0.99)}&currency=USDT&target=tier_upgrade&tier_id=${this.tier.id}'" style="margin-right: 12px;">
          Top Up Account
        </button>
      `;
    }
    
    // Always add back button
    actionsHTML += `
      <a href="/app/tiers.html" class="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Back to Tiers
      </a>
    `;
    
    document.getElementById('actions-section').innerHTML = actionsHTML;
  }

  calculateTotalEquity() {
    return this.userPositions
      .filter(pos => pos.currency === 'USD')
      .reduce((total, pos) => total + pos.amount, 0);
  }

  isCurrentTier() {
    const totalEquity = this.calculateTotalEquity();
    
    // Find the highest tier user qualifies for
    let currentTierId = 1;
    // This would need to load all tiers to determine current tier
    // For now, assume this tier is current if user has enough equity
    return totalEquity >= this.tier.min_amount;
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

  async handleUpgrade() {
    try {
      const userTotalEquity = this.calculateTotalEquity();
      
      if (this.isCurrentTier()) {
        window.Notify.info('You are already at this tier or higher.');
        return;
      }

      const shortfall = this.tier.min_amount - userTotalEquity;
      
      if (shortfall <= 0) {
        // User has enough equity, process upgrade
        await this.processTierUpgrade();
      } else {
        // User needs to deposit more, redirect to deposit page
        const usdtAmount = Math.ceil(shortfall / 0.99);
        
        window.location.href = `/app/deposits.html?amount=${usdtAmount}&currency=USDT&target=tier_upgrade&tier_id=${this.tier.id}`;
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      window.Notify.error(error.message || 'Upgrade failed. Please try again.');
    }
  }

  async processTierUpgrade() {
    try {
      // Show loading state
      this.setActionsLoading(true);

      // Call REST API function to process tier upgrade
      const { data, error } = await window.API.serviceClient
        .rpc('tier_upgrade_rpc', {
          p_target_tier_id: this.tier.id,
          p_auto_claim_roi: true
        });

      if (error) {
        throw new Error(error.message || 'Tier upgrade failed');
      }

      // Show success message
      window.Notify.success(`Successfully upgraded to ${this.tier.name}!`);

      // Reload page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Tier upgrade failed:', error);
      window.Notify.error(error.message || 'Tier upgrade failed. Please try again.');
      this.setActionsLoading(false);
    }
  }

  async claimROI() {
    try {
      // Show loading state
      this.setActionsLoading(true);

      const { data, error } = await window.API.serviceClient
        .rpc('rest_claim_roi', {
          p_position_id: null
        });

      if (error) {
        throw new Error(error.message || 'Failed to claim ROI');
      }

      if (data.success) {
        window.Notify.success(`Successfully claimed $${this.formatMoney(data.claimed_amount || data.total_claimed)} in ROI!`);
        
        // Reload data to update UI
        await this.loadUserData();
        this.renderTierDetails();
      }

    } catch (error) {
      console.error('ROI claim failed:', error);
      window.Notify.error(error.message || 'Failed to claim ROI. Please try again.');
    } finally {
      this.setActionsLoading(false);
    }
  }

  setActionsLoading(loading) {
    const actionsSection = document.getElementById('actions-section');
    if (!actionsSection) return;

    if (loading) {
      actionsSection.innerHTML = `
        <button class="btn btn-secondary" disabled>
          <div class="loading-spinner" style="display: inline-block; margin-right: 8px;"></div>
          Processing...
        </button>
      `;
    }
  }

  showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('tier-content').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
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
    console.log('Tier details page cleanup');
  }
}

// Initialize page controller
window.tierDetailsPage = new TierDetailsPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TierDetailsPage;
}
