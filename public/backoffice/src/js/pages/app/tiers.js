/**
 * Tiers Page Controller
 * Handles tier display, upgrade logic, and investment flows
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

class TiersPage {
  constructor() {
    this.tiers = [];
    this.userPositions = [];
    this.currentUser = null;
    this.selectedTier = null;
    this.init();
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
      // Initialize app shell (sidebar, navigation, etc.)
      if (window.AppShell) {
        window.AppShell.initShell();
      }
      
      // Load data
      await this.loadUserData();
      await this.loadTiers();
      
      // Setup UI
      this.renderTiers();
      this.setupModal();
      
      console.log('Tiers page setup complete');
    } catch (error) {
      console.error('Error setting up tiers page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load investment tiers');
      }
    }
  }

  loadAppShell() {
    const shellContainer = document.getElementById('app-shell-container');
    if (shellContainer) {
      fetch('/src/components/app-shell.html')
        .then(response => response.text())
        .then(html => {
          shellContainer.innerHTML = html;
          
          if (window.AppShell) {
            window.AppShell.setupShell();
          }
        })
        .catch(error => {
          console.error('Failed to load app shell:', error);
        });
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

  async getUserPositions() {
    try {
      const { data, error } = await window.API.fetchEdge('positions_list', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      return data.positions || [];
    } catch (error) {
      console.error('Failed to load user positions:', error);
      return [];
    }
  }

  async loadTiers() {
    try {
      // Use canonical tiers list from server
      this.tiers = await window.API.fetchTiersList();
      
      if (!this.tiers.length) {
        this.renderEmptyState('No tiers available');
        return;
      }
      
      this.renderTiers();
      this.updateStats();
    } catch (error) {
      console.error('Failed to load tiers:', error);
      this.renderErrorState('Failed to load tiers');
    }
  }

  renderEmptyState(message) {
    const tiersGrid = document.getElementById('tiers-grid');
    if (!tiersGrid) return;
    
    tiersGrid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
        </svg>
        <h3>No tiers available</h3>
        <p>${message}</p>
      </div>
    `;
  }

  renderErrorState(message) {
    const tiersGrid = document.getElementById('tiers-grid');
    if (!tiersGrid) return;
    
    tiersGrid.innerHTML = `
      <div class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Failed to load tiers</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  renderTiers() {
    const tiersGrid = document.getElementById('tiers-grid');
    if (!tiersGrid) return;

    const userTotalEquity = this.calculateTotalEquity();
    const currentTierId = this.getCurrentTierId();

    tiersGrid.innerHTML = this.tiers.map(tier => {
      const isCurrentTier = tier.id === currentTierId;
      const isEligible = userTotalEquity >= tier.min_amount;
      
      return `
        <div class="tier-card ${isCurrentTier ? 'current' : ''}" data-tier-id="${tier.id}">
          <div class="tier-header">
            <div class="tier-name">${tier.name}</div>
            <div class="tier-range">
              $${this.formatMoney(tier.min_amount)}${tier.max_amount ? ` - $${this.formatMoney(tier.max_amount)}` : '+'}
            </div>
          </div>
          
          <div class="tier-stats">
            <div class="tier-stat">
              <div class="tier-stat-value">${tier.days}</div>
              <div class="tier-stat-label">Days</div>
            </div>
            <div class="tier-stat">
              <div class="tier-stat-value">${(tier.daily_roi * 100).toFixed(1)}%</div>
              <div class="tier-stat-label">Daily ROI</div>
            </div>
          </div>
          
          <div class="tier-allocations">
            <h4>Allocation Mix</h4>
            ${Object.entries(tier.allocation_mix).map(([asset, percentage]) => `
              <div class="allocation-item">
                <span class="allocation-asset">${asset}</span>
                <span class="allocation-percentage">${percentage}%</span>
              </div>
            `).join('')}
          </div>
          
          <button class="tier-action" onclick="window.tiersPage.openTierModal(${tier.id})">
            ${isCurrentTier ? 'View Details' : (isEligible ? 'Upgrade' : 'View Details')}
          </button>
        </div>
      `;
    }).join('');
  }

  calculateTotalEquity() {
    // Calculate total equity from user positions (USD only)
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

  async openTierModal(tierId) {
    this.selectedTier = this.tiers.find(t => t.id === tierId);
    if (!this.selectedTier) return;

    const modal = document.getElementById('tier-modal');
    const modalTitle = document.getElementById('modal-tier-name');
    const modalSubtitle = document.getElementById('modal-tier-subtitle');
    const tierSummary = document.getElementById('tier-summary');
    const shortfallSection = document.getElementById('shortfall-section');
    const modalActions = document.getElementById('modal-actions');

    // Set modal title
    modalTitle.textContent = this.selectedTier.name;
    modalSubtitle.textContent = `${this.selectedTier.days} days at ${(this.selectedTier.daily_roi * 100).toFixed(1)}% daily ROI`;

    // Generate summary
    const userTotalEquity = this.calculateTotalEquity();
    const currentTierId = this.getCurrentTierId();
    const isCurrentTier = this.selectedTier.id === currentTierId;
    const isEligible = userTotalEquity >= this.selectedTier.min_amount;

    let summaryHTML = `
      <div class="summary-row">
        <span class="summary-label">Your Total Equity</span>
        <span class="summary-value highlight">$${this.formatMoney(userTotalEquity)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Tier Minimum</span>
        <span class="summary-value">$${this.formatMoney(this.selectedTier.min_amount)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Current Tier</span>
        <span class="summary-value">${this.tiers.find(t => t.id === currentTierId)?.name || 'None'}</span>
      </div>
    `;

    if (isCurrentTier) {
      // Show current position details
      const currentPosition = this.userPositions.find(pos => pos.tier_id === currentTierId);
      if (currentPosition) {
        summaryHTML += `
          <div class="summary-row">
            <span class="summary-label">Position Amount</span>
            <span class="summary-value">$${this.formatMoney(currentPosition.amount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Started</span>
            <span class="summary-value">${new Date(currentPosition.started_at).toLocaleDateString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Matures</span>
            <span class="summary-value">${new Date(currentPosition.matures_at).toLocaleDateString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Accrued ROI</span>
            <span class="summary-value highlight">$${this.formatMoney(currentPosition.accrued_roi)}</span>
          </div>
        `;
      }
    }

    tierSummary.innerHTML = summaryHTML;

    // Handle shortfall or upgrade options
    if (!isEligible) {
      this.showShortfallOptions();
    } else if (!isCurrentTier) {
      this.showUpgradeOptions();
    } else {
      this.showCurrentTierOptions();
    }

    // Show modal
    modal.style.display = 'flex';
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

  async showConversionPreview(shortfall) {
    const conversionPreview = document.getElementById('conversion-preview');
    
    try {
      // Get real conversion rates from API
      const { data, error } = await window.API.fetchEdge('conversion_quote', {
        method: 'POST',
        body: {
          from_currency: 'USDT',
          to_currency: 'USD',
          amount: shortfall
        }
      });

      if (error) {
        throw error;
      }

      const quote = data.quote;
      const usdtAmount = quote.from_amount;
      const fee = quote.total_fees;

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
          <span class="conversion-label">Conversion Fee:</span>
          <span class="conversion-value">₮${this.formatMoney(fee, 6)}</span>
        </div>
      `;
    } catch (error) {
      console.error('Failed to get conversion quote:', error);
      conversionPreview.innerHTML = `
        <div class="conversion-row">
          <span class="conversion-label">Conversion Unavailable</span>
          <span class="conversion-value">Unable to get rates</span>
        </div>
      `;
    }
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
    
    try {
      // Get real conversion rates from API
      const { data, error } = await window.API.fetchEdge('conversion_quote', {
        method: 'POST',
        body: {
          from_currency: 'USDT',
          to_currency: 'USD',
          amount: shortfall
        }
      });

      if (error) {
        throw error;
      }

      const quote = data.quote;
      const usdtAmount = quote.from_amount;

      // Redirect to deposit with prefilled amount
      const depositUrl = `/app/deposits.html?amount=${usdtAmount}&currency=USDT&target=tier_upgrade&tier_id=${this.selectedTier.id}`;
      window.location.href = depositUrl;
    } catch (error) {
      console.error('Failed to get conversion quote for top-up:', error);
      // Fallback: redirect without amount
      const depositUrl = `/app/deposits.html?currency=USDT&target=tier_upgrade&tier_id=${this.selectedTier.id}`;
      window.location.href = depositUrl;
    }
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

      // Call REST API function to process tier upgrade
      const { data, error } = await window.API.serviceClient
        .rpc('tier_upgrade_rest', {
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
    modal.style.display = 'none';
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
