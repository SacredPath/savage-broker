/**
 * Signals Page Controller
 * Handles signals marketplace listing, filtering, and purchasing
 */

class SignalsPage {
  constructor() {
    this.currentUser = null;
    this.signals = [];
    this.userAccess = [];
    this.userPositions = [];
    this.filters = {
      category: '',
      risk: '',
      type: '',
      sort: 'newest'
    };
    this.selectedSignal = null;
    
    // Get API client
    this.api = window.API || null;

    if (!this.api) {
      console.warn("SignalsPage: API client not found on load. Retrying in 500ms...");
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
    console.log('Signals page initializing...');
    
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
      await this.loadUserPositions();
      await this.loadSignals();
      await this.loadUserAccess();
      
      // Setup UI
      this.setupFilters();
      this.setupFilterOptions();
      this.renderSignals();
      this.checkPurchaseBlock();
      
      console.log('Signals page setup complete');
    } catch (error) {
      console.error('Error setting up signals page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load signals');
      }
    }
  }

  async loadUserData() {
    try {
      console.log('Loading user data via REST API...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // For now, use mock data since we don't have a user profile API endpoint yet
      // TODO: Replace with actual REST API call when available
      // const data = await this.api.getUserProfile(userId);
      
      this.currentUser = this.getMockUser();
      console.log('User data loaded:', this.currentUser);
    } catch (error) {
      console.error('Failed to load user data:', error);
      this.currentUser = this.getMockUser();
    }
  }

  async loadUserPositions() {
    try {
      console.log('Loading user positions via REST API...');
      
      // For now, use empty array since we don't have a positions API endpoint yet
      // TODO: Replace with actual REST API call when available
      // const data = await this.api.getUserPositions(userId);
      
      this.userPositions = [];
      console.log('User positions loaded:', this.userPositions.length, 'positions');
    } catch (error) {
      console.error('Failed to load user positions:', error);
      this.userPositions = [];
    }
  }

  async loadSignals() {
    try {
      console.log('Loading signals from database...');
      
      // Load signals from signals table using shared client
      const { data, error } = await window.API.supabase
        .from('signals')
        .select("id,title,category,risk_rating,description,price_usdt,access_days,type,status,created_at")
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database error loading signals:', error);
        this.signals = [];
        return;
      }
      
      this.signals = (data || []).map(s => ({
        ...s,
        price: parseFloat(s.price_usdt) || 0,
        risk_rating: s.risk_rating,
        access_days: s.access_days
      }));
      
      console.log('Signals loaded from database:', this.signals.length, 'signals');
    } catch (error) {
      console.error('Failed to load signals:', error);
      this.signals = [];
    }
  }

  async loadUserAccess() {
    try {
      console.log('Loading user signal access from database...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        console.log('No user ID found, skipping user access loading');
        this.userAccess = [];
        return;
      }

      // Load user signal access from signal_access table
      const { data, error } = await window.API.supabase
        .from('signal_access')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Database error loading user access:', error);
        this.userAccess = [];
        return;
      }
      
      this.userAccess = data || [];
      console.log('User signal access loaded:', this.userAccess.length, 'access records');
    } catch (error) {
      console.error('Failed to load user signal access:', error);
      this.userAccess = [];
    }
  }

  getMockUser() {
    return {
      id: 'user_123',
      email: 'user@example.com',
      profile: {
        display_name: 'John Doe',
        kyc_status: 'approved',
        email_verified: true
      }
    };
  }

  getMockSignals() {
    return [
      {
        id: 'signal_1',
        title: 'Gold Bullish Breakout',
        description: 'Technical analysis indicating strong upward momentum for gold based on key resistance break',
        category: 'Commodities',
        risk_level: 'Medium',
        type: 'one-time',
        price: 50.000000,
        access_duration: 30,
        purchase_count: 127,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'signal_2',
        title: 'EUR/USD Reversal Pattern',
        description: 'Identified double bottom formation suggesting bullish reversal in EUR/USD pair',
        category: 'Forex',
        risk_level: 'Low',
        type: 'subscription',
        price: 100.000000,
        access_duration: 30,
        purchase_count: 89,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'signal_3',
        title: 'Tech Sector Momentum',
        description: 'Comprehensive analysis of major tech stocks showing strong buying opportunities',
        category: 'Stocks',
        risk_level: 'High',
        type: 'one-time',
        price: 75.000000,
        access_duration: 7,
        purchase_count: 203,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  setupFilterOptions() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;

    // Get unique categories
    const categories = [...new Set(this.signals.map(signal => signal.category))];
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  setupFilters() {
    // Filter event listeners are set up in HTML with onchange
  }

  applyFilters() {
    // Update filter values
    this.filters.category = document.getElementById('category-filter').value;
    this.filters.risk = document.getElementById('risk-filter').value;
    this.filters.type = document.getElementById('type-filter').value;
    this.filters.sort = document.getElementById('sort-filter').value;

    // Re-render signals with filters
    this.renderSignals();
  }

  getFilteredSignals() {
    let filtered = [...this.signals];

    // Apply category filter
    if (this.filters.category) {
      filtered = filtered.filter(signal => signal.category === this.filters.category);
    }

    // Apply risk filter
    if (this.filters.risk) {
      filtered = filtered.filter(signal => signal.risk_rating === this.filters.risk);
    }

    // Apply type filter
    if (this.filters.type) {
      filtered = filtered.filter(signal => signal.type === this.filters.type);
    }

    // Apply sorting
    switch (this.filters.sort) {
      case 'price-low':
        filtered.sort((a, b) => a.price_usdt - b.price_usdt);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price_usdt - a.price_usdt);
        break;
      case 'popular':
        filtered.sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    return filtered;
  }

  checkPurchaseBlock() {
    const blockedBanner = document.getElementById('blocked-banner');
    if (!blockedBanner) return;

    // Check if user has any active unmatured positions
    const hasActivePositions = this.userPositions.some(position => 
      position.status === 'active' && new Date(position.matures_at) > new Date()
    );

    if (hasActivePositions) {
      blockedBanner.style.display = 'flex';
    } else {
      blockedBanner.style.display = 'none';
    }
  }

  renderSignals() {
    const signalsGrid = document.getElementById('signals-grid');
    if (!signalsGrid) return;

    const filteredSignals = this.getFilteredSignals();
    
    if (filteredSignals.length === 0) {
      signalsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
          </svg>
          <h3>No signals found</h3>
          <p>Try adjusting your filters or check back later for new signals.</p>
        </div>
      `;
      return;
    }

    signalsGrid.innerHTML = filteredSignals.map(signal => {
      const hasAccess = this.userAccess.some(access => 
        access.signal_id === signal.id && 
        new Date(access.access_expires_at) > new Date()
      );

      const hasActivePositions = this.userPositions.some(position => 
        position.status === 'active' && new Date(position.matures_at) > new Date()
      );

      return `
        <div class="signal-card ${hasAccess ? 'purchased' : ''}" data-signal-id="${signal.id}">
          <div class="signal-header">
            <h3 class="signal-title">${signal.title}</h3>
                <p class="signal-description">${signal.description}</p>
            </div>
            
            <div class="signal-meta">
                <span class="signal-tag tag-category">${signal.category}</span>
                <span class="signal-tag tag-risk ${signal.risk_rating?.toLowerCase()}">${signal.risk_rating} risk</span>
                <span class="signal-tag">${signal.type === 'subscription' ? 'Subscription' : 'One-time'}</span>
            </div>
            
            <div class="signal-details">
                <div class="detail-item">
                    <span class="detail-label">Price</span>
                    <span class="detail-value price">₮${this.formatMoney(signal.price_usdt, 6)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration</span>
                    <span class="detail-value duration">${this.getDurationText(signal.access_days)}</span>
                </div>
            </div>
            
            <div class="signal-actions">
                <button class="btn btn-small btn-view" onclick="window.signalsPage.viewSignalDetail('${signal.id}')">
                    View Details
                </button>
                ${hasAccess ? `
                    <button class="btn btn-small btn-download" onclick="window.signalsPage.downloadSignal('${signal.id}')">
                        Download PDF
                    </button>
                ` : `
                    <button class="btn btn-small btn-purchase" 
                            onclick="window.signalsPage.openPurchaseModal('${signal.id}')"
                            ${hasActivePositions ? 'disabled title="Purchase blocked while you have active positions"' : ''}>
                        Purchase
                    </button>
                `}
            </div>
        </div>
      `;
    }).join('');
  }

  getDurationText(duration) {
    if (!duration) return 'Unknown duration';
    
    const days = typeof duration === 'number' ? duration : parseInt(duration.toString().split('_')[0]) || duration;
    
    switch (days) {
      case 7: return '7 days';
      case 30: return '30 days';
      case 90: return '90 days';
      default: return `${days} days`;
    }
  }

  async viewSignalDetail(signalId) {
    const signal = this.signals.find(s => s.id === signalId);
    if (!signal) return;

    // Navigate to signal detail page using id
    window.location.href = `/app/signal_detail.html?id=${signalId}`;
  }

  async openPurchaseModal(signalId) {
    const signal = this.signals.find(s => s.id === signalId);
    if (!signal) return;

    // Check if user has active positions
    const hasActivePositions = this.userPositions.some(position => 
      position.status === 'active' && new Date(position.matures_at) > new Date()
    );

    if (hasActivePositions) {
      window.Notify.error('Signal purchases are blocked while you have active positions');
      return;
    }

    this.selectedSignal = signal;
    
    const purchaseSummary = document.getElementById('purchase-summary');
    const subscriptionInfo = document.getElementById('subscription-info');
    const modal = document.getElementById('purchase-modal');
    
    // Calculate total cost
    const totalCost = signal.type === 'subscription' 
      ? signal.price_usdt 
      : signal.price_usdt;

    purchaseSummary.innerHTML = `
      <div class="purchase-row">
        <span class="purchase-label">Signal:</span>
        <span class="purchase-value">${signal.title}</span>
      </div>
      <div class="purchase-row">
        <span class="purchase-label">Type:</span>
        <span class="purchase-value">${signal.type === 'subscription' ? 'Subscription' : 'One-time Purchase'}</span>
      </div>
      <div class="purchase-row">
        <span class="purchase-label">Access Duration:</span>
        <span class="purchase-value">${this.getDurationText(signal.access_days)}</span>
      </div>
      <div class="purchase-row">
        <span class="purchase-label">Risk Level:</span>
        <span class="purchase-value">${signal.risk_rating}</span>
      </div>
      <div class="purchase-row">
        <span class="purchase-label">Category:</span>
        <span class="purchase-value">${signal.category}</span>
      </div>
      ${signal.type === 'subscription' ? `
        <div class="purchase-row">
          <span class="purchase-label">Billing Cycle:</span>
          <span class="purchase-value">Every ${this.getDurationText(signal.access_days)}</span>
        </div>
      ` : ''}
      <div class="purchase-row highlight">
        <span class="purchase-label">Total Cost:</span>
        <span class="purchase-value highlight">₮${this.formatMoney(totalCost, 6)}</span>
      </div>
    `;

    // Show subscription info if applicable
    if (signal.type === 'subscription') {
      subscriptionInfo.style.display = 'block';
    } else {
      subscriptionInfo.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  closePurchaseModal() {
    const modal = document.getElementById('purchase-modal');
    modal.style.display = 'none';
    this.selectedSignal = null;
  }

  async confirmPurchase() {
    if (!this.selectedSignal) return;

    try {
      this.setButtonLoading('confirm-purchase-btn', true);

      // Get USDT deposit address from database
      const { data: addressData, error: addressError } = await window.API.serviceClient
        .from('deposit_addresses')
        .select('address')
        .eq('currency', 'USDT')
        .eq('is_active', true)
        .maybeSingle();

      if (addressError && addressError.code !== 'PGRST116') {
        throw new Error(`Failed to get deposit address: ${addressError.message}`);
      }

      const depositAddress = addressData?.address || null;

      // Create signal purchase record
      const userId = await window.API.getCurrentUserId();
      const purchaseData = {
        user_id: userId,
        signal_id: this.selectedSignal.id,
        signal_string_id: this.selectedSignal.id,
        purchase_price: this.selectedSignal.price_usdt,
        purchase_type: this.selectedSignal.type,
        access_duration: this.selectedSignal.access_days,
        access_expires_at: this.calculateExpiryDate(this.selectedSignal.access_days),
        is_active: true,
        auto_renew: false
      };

      const { data: purchase, error: purchaseError } = await window.API.serviceClient
        .from('signal_purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (purchaseError) {
        throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
      }

      // Show deposit instructions
      this.showDepositInstructions(depositAddress, this.selectedSignal.price_usdt, purchase.id);

    } catch (error) {
      console.error('Purchase failed:', error);
      window.Notify.error(error.message || 'Failed to initiate purchase');
    } finally {
      this.setButtonLoading('confirm-purchase-btn', false);
    }
  }

  showDepositInstructions(depositAddress, amount, purchaseId) {
    // Close purchase modal
    this.closePurchaseModal();

    // Create deposit instructions modal
    const modalHtml = `
      <div class="modal-overlay" id="deposit-instructions-modal" style="display: flex;">
        <div class="modal deposit-modal-content">
          <div class="modal-header">
            <h3>USDT Deposit Required</h3>
            <button class="modal-close" onclick="window.signalsPage.closeDepositInstructions()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="deposit-summary">
              <div class="deposit-row">
                <span class="deposit-label">Signal:</span>
                <span class="deposit-value">${this.selectedSignal.title}</span>
              </div>
              <div class="deposit-row">
                <span class="deposit-label">Amount to Deposit:</span>
                <span class="deposit-value highlight">₮${this.formatMoney(amount, 6)}</span>
              </div>
              <div class="deposit-row">
                <span class="deposit-label">Currency:</span>
                <span class="deposit-value">USDT</span>
              </div>
              <div class="deposit-row">
                <span class="deposit-label">Purchase ID:</span>
                <span class="deposit-value">${purchaseId}</span>
              </div>
            </div>
            
            ${depositAddress ? `
              <div class="deposit-address-section">
                <h4>Deposit Address</h4>
                <div class="address-container">
                  <input type="text" value="${depositAddress}" readonly id="deposit-address-input" />
                  <button class="btn btn-small" onclick="window.signalsPage.copyAddress()">Copy</button>
                </div>
                <p class="address-warning">Send exactly ₮${this.formatMoney(amount, 6)} to this address. Your access will be activated automatically after confirmation.</p>
              </div>
            ` : `
              <div class="no-address-section">
                <div class="warning-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <h4>Deposit Address Not Available</h4>
                <p>The USDT deposit address is currently not set by the administrator. Please contact support or try again later.</p>
                <div class="deposit-actions">
                  <button class="btn btn-secondary" onclick="window.signalsPage.closeDepositInstructions()">Close</button>
                  <button class="btn btn-primary" onclick="window.signalsPage.checkForAddress()">Check Again</button>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
  }

  closeDepositInstructions() {
    const modal = document.getElementById('deposit-instructions-modal');
    if (modal) {
      modal.remove();
    }
  }

  copyAddress() {
    const input = document.getElementById('deposit-address-input');
    if (input) {
      input.select();
      document.execCommand('copy');
      window.Notify.success('Address copied to clipboard!');
    }
  }

  async checkForAddress() {
    // Refresh and check for address again
    const { data: addressData, error: addressError } = await window.API.serviceClient
      .from('deposit_addresses')
      .select('address')
      .eq('currency', 'USDT')
      .eq('is_active', true)
      .maybeSingle();

    if (!addressError && addressData?.address) {
      window.Notify.success('Deposit address is now available!');
      this.showDepositInstructions(addressData.address, this.selectedSignal.price_usdt, this.selectedSignal.id);
    } else {
      window.Notify.error('Deposit address still not available');
    }
  }

  calculateExpiryDate(accessDuration) {
    const now = new Date();
    let expiryDate = new Date(now);

    // Parse access duration (could be number like 30 or string like "30_days")
    const days = typeof accessDuration === 'number' ? accessDuration : parseInt(accessDuration.toString().split('_')[0]) || 30;
    expiryDate.setDate(expiryDate.getDate() + days);

    return expiryDate.toISOString();
  }

  async downloadSignal(signalId) {
    try {
      // Check if user has access
      const access = this.userAccess.find(a => 
        a.signal_id === signalId && 
        new Date(a.access_expires_at) > new Date()
      );

      if (!access) {
        window.Notify.error('You do not have access to this signal');
        return;
      }

      // Get secure download URL
      const { data, error } = await window.API.fetchEdge('signal_download_url', {
        method: 'POST',
        body: {
          signal_id: signalId,
          access_id: access.id
        }
      });

      if (error) {
        throw error;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = `signal_${signalId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.Notify.success('Signal PDF downloaded successfully!');

    } catch (error) {
      console.error('Download failed:', error);
      window.Notify.error(error.message || 'Failed to download signal');
    }
  }

  setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (loading) {
      button.disabled = true;
      button.innerHTML = `
        <div class="loading-spinner" style="display: inline-block; margin-right: 8px;"></div>
        Processing...
      `;
    } else {
      button.disabled = false;
      button.textContent = 'Proceed to Payment';
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
    console.log('Signals page cleanup');
  }
}

// Initialize page controller
window.signalsPage = new SignalsPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalsPage;
}
