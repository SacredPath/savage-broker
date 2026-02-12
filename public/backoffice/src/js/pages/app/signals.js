/**
 * Signals Page Controller
 * Handles signal listing, filtering, and purchase flows
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

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
    this.init();
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
      // Load app shell components
      this.loadAppShell();
      
      // Load data
      await this.loadUserData();
      await this.loadUserPositions();
      await this.loadSignals();
      await this.loadUserAccess();
      
      // Setup UI
      this.setupFilters();
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
      this.currentUser = await window.AuthService.getCurrentUserWithProfile();
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  async loadUserPositions() {
    try {
      const { data, error } = await window.API.fetchEdge('user_positions', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      this.userPositions = data.positions || [];
    } catch (error) {
      console.error('Failed to load user positions:', error);
      this.userPositions = [];
    }
  }

  async loadSignals() {
    try {
      const { data, error } = await window.API.fetchEdge('signals_list', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      this.signals = data.signals || [];
      this.setupFilterOptions();
    } catch (error) {
      console.error('Failed to load signals:', error);
      this.signals = [];
    }
  }

  async loadUserAccess() {
    try {
      const { data, error } = await window.API.fetchEdge('signal_access_check', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      this.userAccess = data.access || [];
    } catch (error) {
      console.error('Failed to load user access:', error);
      this.userAccess = [];
    }
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
      filtered = filtered.filter(signal => signal.risk_level === this.filters.risk);
    }

    // Apply type filter
    if (this.filters.type) {
      filtered = filtered.filter(signal => signal.type === this.filters.type);
    }

    // Apply sorting
    switch (this.filters.sort) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a, b) => b.purchase_count - a.purchase_count);
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
        new Date(access.expires_at) > new Date()
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
                <span class="signal-tag tag-risk ${signal.risk_level}">${signal.risk_level} risk</span>
                <span class="signal-tag">${signal.type === 'subscription' ? 'Subscription' : 'One-time'}</span>
            </div>
            
            <div class="signal-details">
                <div class="detail-item">
                    <span class="detail-label">Price</span>
                    <span class="detail-value price">₮${this.formatMoney(signal.price, 6)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration</span>
                    <span class="detail-value duration">${this.getDurationText(signal.access_duration)}</span>
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
    switch (duration) {
      case 7: return '7 days';
      case 30: return '30 days';
      case 90: return '90 days';
      default: return `${duration} days`;
    }
  }

  async viewSignalDetail(signalId) {
    const signal = this.signals.find(s => s.id === signalId);
    if (!signal) return;

    // Navigate to signal detail page
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
      ? signal.price 
      : signal.price;

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
        <span class="purchase-value">${this.getDurationText(signal.access_duration)}</span>
      </div>
      <div class="purchase-row">
        <span class="purchase-label">Risk Level:</span>
        <span class="purchase-value">${signal.risk_level}</span>
      </div>
      <div class="purchase-row">
        <span class="purchase-label">Category:</span>
        <span class="purchase-value">${signal.category}</span>
      </div>
      ${signal.type === 'subscription' ? `
        <div class="purchase-row">
          <span class="purchase-label">Billing Cycle:</span>
          <span class="purchase-value">Every ${this.getDurationText(signal.access_duration)}</span>
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

      const { data, error } = await window.API.fetchEdge('signal_purchase_create', {
        method: 'POST',
        body: {
          signal_id: this.selectedSignal.id,
          price: this.selectedSignal.price,
          currency: 'USDT'
        }
      });

      if (error) {
        throw error;
      }

      // Show success message
      window.Notify.success('Purchase initiated! Please complete the payment to access the signal.');

      // Redirect to deposit page with signal context
      window.location.href = `/app/deposits.html?amount=${this.selectedSignal.price}&currency=USDT&target=signal_purchase&signal_id=${this.selectedSignal.id}`;

    } catch (error) {
      console.error('Purchase failed:', error);
      window.Notify.error(error.message || 'Failed to initiate purchase');
    } finally {
      this.setButtonLoading('confirm-purchase-btn', false);
    }
  }

  async downloadSignal(signalId) {
    try {
      // Check if user has access
      const access = this.userAccess.find(a => 
        a.signal_id === signalId && 
        new Date(a.expires_at) > new Date()
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
