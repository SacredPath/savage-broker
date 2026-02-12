/**
 * Signal Detail Page Controller
 * Handles individual signal display and purchase
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

class SignalDetailPage {
  constructor() {
    this.currentUser = null;
    this.signal = null;
    this.userAccess = null;
    this.userPositions = [];
    this.signalId = null;
    this.init();
  }

  async init() {
    console.log('Signal detail page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Get signal ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      this.signalId = urlParams.get('id');
      
      if (!this.signalId) {
        throw new Error('Signal ID not provided');
      }

      // Load app shell components
      this.loadAppShell();
      
      // Load data
      await this.loadUserData();
      await this.loadUserPositions();
      await this.loadSignal();
      await this.loadUserAccess();
      
      // Setup UI
      this.renderSignal();
      
      console.log('Signal detail page setup complete');
    } catch (error) {
      console.error('Error setting up signal detail page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load signal details');
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
      const { data, error } = await window.API.serviceClient
        .from('user_positions')
        .select('*')
        .eq('user_id', window.API.getCurrentUserId())
        .eq('status', 'active');

      if (error) {
        throw error;
      }

      this.userPositions = data || [];
    } catch (error) {
      console.error('Failed to load user positions:', error);
      this.userPositions = [];
    }
  }

  async loadSignal() {
    try {
      const { data, error } = await window.API.serviceClient
        .rpc('signal_detail_rest', {
          p_signal_id: this.signalId,
          p_user_id: window.API.getCurrentUserId()
        });

      if (error) {
        throw error;
      }

      this.signal = data.signal;
      
      if (!this.signal) {
        throw new Error('Signal not found');
      }
    } catch (error) {
      console.error('Failed to load signal:', error);
      throw error;
    }
  }

  async loadUserAccess() {
    try {
      const { data, error } = await window.API.serviceClient
        .rpc('signal_access_check_rest', {
          p_signal_id: this.signalId,
          p_user_id: window.API.getCurrentUserId()
        });

      if (error) {
        throw error;
      }

      this.userAccess = data.access;
    } catch (error) {
      console.error('Failed to load user access:', error);
      this.userAccess = null;
    }
  }

  renderSignal() {
    const signalContent = document.getElementById('signal-content');
    if (!signalContent || !this.signal) return;

    const hasAccess = this.userAccess && new Date(this.userAccess.expires_at) > new Date();
    const hasActivePositions = this.userPositions.some(position => 
      position.status === 'active' && new Date(position.matures_at) > new Date()
    );

    signalContent.innerHTML = `
      <div class="signal-main">
        <h2 class="signal-title">${this.signal.title}</h2>
        
        <div class="signal-meta">
            <span class="signal-tag tag-category">${this.signal.category}</span>
            <span class="signal-tag tag-risk ${this.signal.risk_level}">${this.signal.risk_level} risk</span>
            <span class="signal-tag">${this.signal.type === 'subscription' ? 'Subscription' : 'One-time'}</span>
        </div>
        
        <div class="signal-description">
            ${this.signal.description}
        </div>
        
        <div class="signal-section">
            <h3>What You'll Get</h3>
            <ul>
                ${this.signal.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
        </div>
        
        ${this.signal.strategy ? `
            <div class="signal-section">
                <h3>Trading Strategy</h3>
                <p>${this.signal.strategy}</p>
            </div>
        ` : ''}
        
        ${this.signal.performance ? `
            <div class="signal-section">
                <h3>Performance</h3>
                <p>${this.signal.performance}</p>
            </div>
        ` : ''}
        
        ${this.signal.requirements ? `
            <div class="signal-section">
                <h3>Requirements</h3>
                <p>${this.signal.requirements}</p>
            </div>
        ` : ''}
      </div>
      
      <div class="signal-sidebar">
        ${hasAccess ? this.renderAccessStatus() : this.renderPurchaseCard(hasActivePositions)}
        
        <div class="signal-stats">
            <h4>Signal Statistics</h4>
            <div class="stat-row">
                <span class="stat-label">Total Purchases:</span>
                <span class="stat-value">${this.signal.purchase_count || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Success Rate:</span>
                <span class="stat-value">${this.signal.success_rate || 'N/A'}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Created:</span>
                <span class="stat-value">${new Date(this.signal.created_at).toLocaleDateString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Last Updated:</span>
                <span class="stat-value">${new Date(this.signal.updated_at).toLocaleDateString()}</span>
            </div>
        </div>
      </div>
    `;
  }

  renderAccessStatus() {
    const isExpired = new Date(this.userAccess.expires_at) <= new Date();
    
    return `
      <div class="access-status">
        <div class="access-header">
            <div class="access-icon ${isExpired ? 'expired' : 'active'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${isExpired ? 
                        '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' :
                        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                    }
                </svg>
            </div>
            <div class="access-title">${isExpired ? 'Access Expired' : 'Access Active'}</div>
        </div>
        <div class="access-description">
            ${isExpired ? 
                'Your access to this signal has expired. Purchase again to regain access.' :
                'You have active access to this signal. Download the PDF below.'
            }
        </div>
        <div class="access-details">
            <div class="access-row">
                <span class="access-label">Purchased:</span>
                <span class="access-value">${new Date(this.userAccess.created_at).toLocaleDateString()}</span>
            </div>
            <div class="access-row">
                <span class="access-label">Expires:</span>
                <span class="access-value">${new Date(this.userAccess.expires_at).toLocaleDateString()}</span>
            </div>
            ${this.userAccess.type === 'subscription' ? `
                <div class="access-row">
                    <span class="access-label">Next Billing:</span>
                    <span class="access-value">${new Date(this.userAccess.next_billing).toLocaleDateString()}</span>
                </div>
            ` : ''}
        </div>
      </div>
      
      <button class="btn btn-primary" style="width: 100%;" onclick="window.signalDetailPage.downloadSignal()">
        ${isExpired ? 'Renew Access' : 'Download PDF'}
      </button>
    `;
  }

  renderPurchaseCard(hasActivePositions) {
    return `
      <div class="purchase-card">
        <div class="purchase-header">
            <div class="purchase-price">₮${this.formatMoney(this.signal.price, 6)}</div>
            <div class="purchase-duration">${this.getDurationText(this.signal.access_duration)}</div>
        </div>
        
        <div class="purchase-features">
            <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Instant access to signal</span>
            </div>
            <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Downloadable PDF guide</span>
            </div>
            <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>${this.getDurationText(this.signal.access_duration)} access</span>
            </div>
            <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Expert analysis included</span>
            </div>
        </div>
        
        <button class="btn btn-primary" style="width: 100%;" 
                onclick="window.signalDetailPage.purchaseSignal()"
                ${hasActivePositions ? 'disabled title="Purchase blocked while you have active positions"' : ''}>
            Purchase Signal
        </button>
      </div>
      
      ${this.signal.type === 'subscription' ? `
        <div class="subscription-info">
            <h4>Subscription Information</h4>
            <p>This is a subscription signal. You will be billed every ${this.getDurationText(this.signal.access_duration)}. Cancel anytime from settings.</p>
        </div>
      ` : ''}
    `;
  }

  getDurationText(duration) {
    switch (duration) {
      case 7: return '7 days';
      case 30: return '30 days';
      case 90: return '90 days';
      default: return `${duration} days`;
    }
  }

  async purchaseSignal() {
    // Check if user has active positions
    const hasActivePositions = this.userPositions.some(position => 
      position.status === 'active' && new Date(position.matures_at) > new Date()
    );

    if (hasActivePositions) {
      window.Notify.error('Signal purchases are blocked while you have active positions');
      return;
    }

    try {
      const { data, error } = await window.API.serviceClient
        .rpc('signal_purchase_create_rest', {
          p_signal_id: this.signal.id,
          p_price: this.signal.price,
          p_currency: 'USDT'
        });

      if (error) {
        throw error;
      }

      // Show success message
      window.Notify.success('Purchase initiated! Please complete the payment to access the signal.');

      // Redirect to deposit page with signal context
      window.location.href = `/app/deposits.html?amount=${this.signal.price}&currency=USDT&target=signal_purchase&signal_id=${this.signal.id}`;

    } catch (error) {
      console.error('Purchase failed:', error);
      window.Notify.error(error.message || 'Failed to initiate purchase');
    }
  }

  async downloadSignal() {
    try {
      // Check if user has access
      if (!this.userAccess || new Date(this.userAccess.expires_at) <= new Date()) {
        // If expired, initiate renewal
        await this.purchaseSignal();
        return;
      }

      // Get secure download URL
      const { data, error } = await window.API.serviceClient
        .rpc('signal_download_url_rest', {
          p_signal_id: this.signal.id,
          p_user_id: window.API.getCurrentUserId(),
          p_access_id: this.userAccess.id
        });

      if (error) {
        throw error;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = `signal_${this.signal.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.Notify.success('Signal PDF downloaded successfully!');

    } catch (error) {
      console.error('Download failed:', error);
      window.Notify.error(error.message || 'Failed to download signal');
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
    console.log('Signal detail page cleanup');
  }
}

// Initialize page controller
window.signalDetailPage = new SignalDetailPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalDetailPage;
}
