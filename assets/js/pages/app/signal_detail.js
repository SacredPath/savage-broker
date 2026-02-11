/**
 * Signal Detail Page Controller
 * Handles individual signal display and purchase
 */

// Import shared app initializer
import '/assets/js/_shared/app_init.js';
// Import USDT purchase modal
import '/assets/js/components/usdt-purchase-modal.js';
// Import PDF download service
import '/assets/js/services/pdf-download-service.js';

class SignalDetailPage {
  constructor() {
    this.currentUser = null;
    this.signal = null;
    this.userAccess = null;
    this.userPositions = [];
    this.signalId = null;
    this.api = window.API; // Initialize API client
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
      fetch('/components/app-shell.html')
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
      // For now, use empty array to avoid API errors
      // TODO: Fix user_positions table and API call
      this.userPositions = [];
      console.log('User positions loaded: 0 positions (mocked)');
    } catch (error) {
      console.error('Failed to load user positions:', error);
      this.userPositions = [];
    }
  }

  async loadSignal() {
    try {
      // Get signal from database using shared client
      const { data, error } = await window.API.supabase
        .from('signals')
        .select('*')
        .eq('id', this.signalId)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Set the signal directly since we get single signal
      this.signal = data;
      
      if (!this.signal) {
        throw new Error('Signal not found');
      }

      // Set signal ID for purchase/download functions
      this.signalUUID = this.signal.id;

      // For now, set userAccess to null until we fix signal_purchases table
      this.userAccess = null;
      
    } catch (error) {
      console.error('Failed to load signal:', error);
      throw error;
    }
  }

  async loadUserAccess() {
    try {
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        console.log('No user ID found, skipping user access loading');
        this.userAccess = null;
        return;
      }

      // Load user signal access from signal_usdt_purchases table
      const { data, error } = await window.API.supabase
        .from('signal_usdt_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('signal_id', this.signalId)
        .eq('confirmed', true)
        .gt('pdf_access_until', new Date().toISOString())
        .limit(1);

      if (error) {
        console.error('Database error loading user access:', error);
        this.userAccess = null;
        return;
      }

      this.userAccess = data && data.length > 0 ? data[0] : null;
      console.log('User access loaded:', this.userAccess ? 'found' : 'not found');
    } catch (error) {
      console.error('Failed to load user access:', error);
      this.userAccess = null;
    }
  }

  async getAuthToken() {
    try {
      // Get auth token from Supabase client
      if (window.API && window.API.supabase) {
        const { data: { session } } = await window.API.supabase.auth.getSession();
        return session?.access_token || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  renderSignal() {
    const signalContent = document.getElementById('signal-content');
    if (!signalContent || !this.signal) return;

    const hasAccess = this.userAccess && new Date(this.userAccess.pdf_access_until) > new Date();
    const hasActivePositions = this.userPositions.some(position => 
      position.status === 'active' && new Date(position.matures_at) > new Date()
    );

    signalContent.innerHTML = `
      <div class="signal-main">
        <h2 class="signal-title">${this.signal.title}</h2>
        
        <div class="signal-meta">
            <span class="signal-tag tag-category">${this.signal.category}</span>
            <span class="signal-tag tag-risk ${this.getRiskLevel(this.signal.risk_rating || this.signal.risk_level)}">${this.getRiskLevel(this.signal.risk_rating || this.signal.risk_level)} risk</span>
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
                <span class="stat-value">${this.formatDate(this.signal.created_at)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Last Updated:</span>
                <span class="stat-value">${this.formatDate(this.signal.updated_at)}</span>
            </div>
        </div>
      </div>
    `;
  }

  renderAccessStatus() {
    const isExpired = new Date(this.userAccess.pdf_access_until) <= new Date();
    
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
            <div class="purchase-price">₮${this.formatMoney(this.signal.price_usdt || this.signal.price, 6)}</div>
            <div class="purchase-duration">${this.getDurationText(this.signal.access_days)}</div>
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
                <span>${this.getDurationText(this.signal.access_days)} access</span>
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
            <p>This is a subscription signal. You will be billed every ${this.getDurationText(this.signal.access_days)}. Cancel anytime from settings.</p>
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
    try {
      // Check if user has active positions
      const hasActivePositions = this.userPositions.some(position => 
        position.status === 'active' && new Date(position.matures_at) > new Date()
      );

      if (hasActivePositions) {
        window.Notify.error('Signal purchases are blocked while you have active positions');
        return;
      }

      // Wait for USDT purchase modal to be available
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!window.usdtPurchaseModal && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Show USDT purchase modal
      if (window.usdtPurchaseModal && this.signal) {
        const signalData = {
          id: this.signal.id,
          title: this.signal.title,
          description: this.signal.description,
          price: this.signal.price_usdt || this.signal.price,
          access_days: this.signal.access_days
        };
        
        window.usdtPurchaseModal.show(signalData);
      } else {
        console.error('USDT purchase modal not available after', attempts, 'attempts');
        window.Notify.error('USDT purchase modal not available. Please refresh the page and try again.');
      }

    } catch (error) {
      console.error('Purchase failed:', error);
      window.Notify.error(error.message || 'Failed to open purchase modal');
    }
  }

  async downloadSignal() {
    try {
      // Check if user has access
      if (!this.userAccess) {
        window.Notify.error('No access to download this signal. Please purchase access first.');
        return;
      }

      // Use PDF download service
      if (window.pdfDownloadService && this.signal) {
        // Show PDF list in a modal or expand section
        const pdfContainer = document.getElementById('pdf-downloads-container');
        if (pdfContainer) {
          pdfContainer.style.display = 'block';
          window.pdfDownloadService.renderPDFList(this.signal.id, 'pdf-downloads-container');
        } else {
          // Create container if it doesn't exist
          const container = document.createElement('div');
          container.id = 'pdf-downloads-container';
          container.className = 'pdf-downloads-modal';
          container.innerHTML = `
            <div class="pdf-modal-header">
              <h4>📄 Signal PDFs</h4>
              <button class="modal-close" onclick="this.parentElement.parentElement.style.display='none'">&times;</button>
            </div>
            <div id="pdf-list-container"></div>
          `;
          
          document.body.appendChild(container);
          window.pdfDownloadService.renderPDFList(this.signal.id, 'pdf-list-container');
        }
      } else {
        window.Notify.error('PDF download service not available');
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      window.Notify.error(error.message || 'Failed to open PDF downloads');
    }
  }

  getRiskLevel(risk) {
    // Normalize risk level for CSS classes
    const riskLevel = (risk || '').toLowerCase();
    switch (riskLevel) {
      case 'low':
        return 'low';
      case 'medium':
        return 'medium';
      case 'high':
        return 'high';
      default:
        return 'medium'; // Default fallback
    }
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date parsing error:', error);
      return 'N/A';
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
