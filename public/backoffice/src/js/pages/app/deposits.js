/**
 * Deposits Page Controller - Fixed Version
 * Handles database-driven deposit methods with enhanced modal interface
 */

class DepositsPage {
  constructor() {
    this.selectedMethod = null;
    this.currentUser = null;
    this.depositSettings = null;
    this.currentOrder = null;
    this.timerInterval = null;
    
    // Get API client
    this.api = window.API || null;

    if (!this.api) {
      console.warn("DepositsPage: API client not found on load. Retrying in 500ms...");
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
      setTimeout(() => this.retryInit(), 500);
    }
  }

  async init() {
    console.log('Deposits page initializing...');
    
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
      await this.loadDepositSettings();
      
      // Check for upgrade context
      this.checkUpgradeContext();
      
      // Setup UI
      this.setupMethodCards();
      this.setupForms();
      this.setupURLParameters();
      
      // Hide fallback message
      const fallbackMsg = document.getElementById('js-fallback-message');
      if (fallbackMsg) {
        fallbackMsg.style.display = 'none';
      }
      
      console.log('Deposits page setup complete');
    } catch (error) {
      console.error('Failed to setup deposits page:', error);
      this.showError('Failed to load deposit page. Please refresh.');
    }
  }

  checkUpgradeContext() {
    // Check if there's an upgrade context from tiers page
    const upgradeContext = localStorage.getItem('upgradeContext');
    if (!upgradeContext) return;

    try {
      const context = JSON.parse(upgradeContext);
      
      // Store upgrade context for later use
      this.upgradeContext = context;
      
      // Show upgrade notification
      if (window.Notify) {
        window.Notify.info(`🚀 Upgrade in progress: Need to deposit ${context.currency === 'USDT' ? '₮' : '$'}${this.formatMoney(context.upgradeAmount, context.currency === 'USDT' ? 6 : 2)} to upgrade to tier ${context.targetTierId}`);
      }
      
      console.log('Upgrade context loaded:', context);
      
    } catch (error) {
      console.error('Error parsing upgrade context:', error);
      localStorage.removeItem('upgradeContext');
    }
  }

  async loadUserData() {
    try {
      const userId = await this.api.getCurrentUserId();
      this.currentUser = { id: userId };
      console.log('User data loaded:', this.currentUser);
    } catch (error) {
      console.error('Failed to load user data:', error);
      this.currentUser = null;
    }
  }

  async loadDepositSettings() {
    try {
      console.log('Loading deposit methods from database...');
      
      // Load deposit methods from database
      const { data, error } = await window.API.serviceClient
        .from('deposit_methods')
        .select('*')
        .eq('is_active', true)
        .order('method_type', { ascending: true });

      if (error) {
        console.error('Database error loading deposit methods:', error);
        throw new Error(`Failed to load deposit methods: ${error.message}`);
      }
      
      this.depositSettings = {
        methods: data || [],
        currencies: [...new Set((data || []).map(method => method.currency))],
        methodTypes: [...new Set((data || []).map(method => method.method_type))]
      };
      
      console.log('Deposit methods loaded from database:', this.depositSettings.methods.length, 'methods');
    } catch (error) {
      console.error('Failed to load deposit methods:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load deposit methods. Please try again.');
      }
      this.depositSettings = {
        methods: [],
        currencies: [],
        methodTypes: []
      };
    }
  }

  setupMethodCards() {
    const methodsContainer = document.getElementById('deposit-methods');
    if (!methodsContainer) {
      console.error('Deposit methods container not found');
      return;
    }

    console.log('DEBUG: setupMethodCards called with methods:', this.depositSettings.methods);
    console.log('DEBUG: Methods array length:', this.depositSettings.methods?.length);
    console.log('DEBUG: About to map methods and create cards...');

    console.log('Setting up deposit methods:', this.depositSettings);

    if (!this.depositSettings.methods || this.depositSettings.methods.length === 0) {
      console.log('No deposit methods available, showing empty state');
      methodsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.1); border-radius: 12px; border: 1px solid rgba(255,255,255,0.2);">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <h3 style="color: #000000; margin: 16px 0 8px 0; font-weight: 700; text-shadow: 0 2px 4px rgba(255,255,255,0.5);">No Deposit Methods Available</h3>
          <p style="color: #1F2937; margin: 0; font-weight: 500; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">Deposit methods are currently not available. Please contact support or check back later.</p>
          <button onclick="window.location.reload()" style="margin-top: 20px; background: #3B82F6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
            Refresh Page
          </button>
        </div>
      `;
      return;
    }

    console.log('Creating', this.depositSettings.methods.length, 'deposit method cards');

    // Create grid container for cards with enhanced styling
    const cardsHTML = this.depositSettings.methods.map(method => {
      console.log('DEBUG: Mapping method:', method.method_name, 'type:', method.method_type);
      return this.createMethodCard(method);
    }).join('');
    
    console.log('DEBUG: Generated cards HTML length:', cardsHTML.length);
    
    methodsContainer.innerHTML = `
      <div class="deposit-methods-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; padding: 20px 0;">
        ${cardsHTML}
      </div>
    `;

    console.log('Deposit methods cards created successfully');
  }

  createMethodCard(method) {
    console.log('DEBUG: createMethodCard called with:', {
      method_name: method.method_name,
      method_type: method.method_type,
      currency: method.currency,
      network: method.network,
      is_active: method.is_active
    });
    
    // Unique colors for each specific method
    const methodSpecificColors = {
      'USDT TRC20': { bg: '#10B981', border: '#059669', hover: '#047857' },
      'USDT ERC20': { bg: '#3B82F6', border: '#2563EB', hover: '#1D4ED8' },
      'ACH Bank Transfer': { bg: '#8B5CF6', border: '#7C3AED', hover: '#6D28D9' },
      'PayPal Payment': { bg: '#F59E0B', border: '#D97706', hover: '#B45309' }
    };

    // Fallback colors for method types
    const methodTypeColors = {
      'crypto': { bg: '#10B981', border: '#059669', hover: '#047857' },
      'ach': { bg: '#3B82F6', border: '#2563EB', hover: '#1D4ED8' }, 
      'paypal': { bg: '#8B5CF6', border: '#7C3AED', hover: '#6D28D9' }
    };

    const colors = methodSpecificColors[method.method_name] || methodTypeColors[method.method_type] || { bg: '#6B7280', border: '#4B5563', hover: '#374151' };
    
    // Method icons
    const methodIcons = {
      'crypto': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
      'ach': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="7" y1="21" x2="17" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      'paypal': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"></path><path d="M12 14H7a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-3"></path></svg>'
    };
    
    // Create key features (compact)
    let keyFeatures = [];
    if (method.method_type === 'crypto') {
      // Override processing times from frontend for crypto methods
      let displayTime;
      console.log('DEBUG: Processing crypto method:', {
        method_name: method.method_name,
        currency: method.currency,
        network: method.network,
        processing_time_hours: method.processing_time_hours
      });
      
      if (method.currency === 'USDT') {
        displayTime = '60 minutes'; // Override all USDT to 60 minutes
        console.log('DEBUG: USDT override applied - displayTime:', displayTime);
      } else if (method.currency === 'BTC') {
        displayTime = '60 minutes'; // Override all BTC to 60 minutes
        console.log('DEBUG: BTC override applied - displayTime:', displayTime);
      } else {
        displayTime = `${(method.processing_time_hours || 0) * 60} minutes`; // Fallback to database conversion
        console.log('DEBUG: Fallback applied - displayTime:', displayTime);
      }
      
      keyFeatures = [
        `Network: ${method.network || 'Not set'}`,
        `Currency: ${method.currency}`,
        `Min: ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.min_amount || (method.currency === 'BTC' ? 100 : 0), method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}`,
        `Processing: ${displayTime}`
      ];
      
      console.log('DEBUG: Final keyFeatures:', keyFeatures);
    } else if (method.method_type === 'ach') {
      keyFeatures = [
        `Bank: ${method.bank_name || 'Not set'}`,
        `Account: ${method.account_number || '****1234'}`,
        `Min: $${this.formatMoney(method.min_amount || 0, 2)}`,
        `Processing: ${method.processing_time_hours || 72} hours`
      ];
    } else if (method.method_type === 'paypal') {
      keyFeatures = [
        `Email: ${method.paypal_email || 'Not set'}`,
        `Business: ${method.paypal_business_name || 'Not set'}`,
        `Min: $${this.formatMoney(method.min_amount || 0, 2)}`,
        `Processing: ${method.processing_time_hours || 24} hours`
      ];
    }

    return `
      <div class="deposit-method-card" data-method="${method.id}" onclick="window.depositsPage.selectMethod('${method.id}')" style="background: linear-gradient(135deg, ${colors.bg}40 0%, ${colors.bg}60 100%); border: 2px solid ${colors.border}; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; min-height: 100px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" onmouseover="this.style.transform='translateY(-3px) scale(1.02)'; this.style.boxShadow='0 8px 25px ${colors.bg}60'; this.style.borderColor='${colors.hover}'; this.style.background='linear-gradient(135deg, ${colors.bg}50 0%, ${colors.bg}70 100%)';" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'; this.style.borderColor='${colors.border}'; this.style.background='linear-gradient(135deg, ${colors.bg}40 0%, ${colors.bg}60 100%)';">
        ${this.upgradeContext ? `
          <div style="position: absolute; top: 8px; right: 8px; background: #10B981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; z-index: 10;">
            🚀 UPGRADE
          </div>
        ` : ''}
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${colors.bg}, ${colors.hover});"></div>
        
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="background: ${colors.bg}20; color: ${colors.bg}; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px; transition: all 0.3s ease; border: 1px solid ${colors.bg}30;" onmouseover="this.style.background='${colors.bg}30'; this.style.transform='scale(1.1)'; this.style.borderColor='${colors.bg}50';" onmouseout="this.style.background='${colors.bg}20'; this.style.transform='scale(1)'; this.style.borderColor='${colors.bg}30';">
            ${methodIcons[method.method_type] || methodIcons['crypto']}
          </div>
          <div style="flex: 1;">
            <h3 style="color: #000000; margin: 0; font-size: 15px; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">${method.method_name}</h3>
            <p style="color: #1F2937; margin: 0; font-size: 11px; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.3);">${method.method_type.toUpperCase()}</p>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
          ${keyFeatures.map((feature, index) => `
            <div style="color: #000000; display: flex; align-items: center; padding: 3px 0; font-weight: 600;">
              <span style="color: ${colors.bg}; margin-right: 4px; font-size: 9px; font-weight: 700;">●</span>
              <span style="line-height: 1.3; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">${feature}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #000000; font-size: 11px; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">
              ${this.upgradeContext ? `Upgrade Amount: ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(this.upgradeContext.upgradeAmount, method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}` : 'Click for details'}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: ${colors.bg}; transition: all 0.3s ease;" onmouseover="this.style.transform='translateX(2px)';" onmouseout="this.style.transform='translateX(0)';">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  selectMethod(methodId) {
    // Find method data
    const method = this.depositSettings.methods.find(m => m.id === methodId);
    if (!method) return;

    // Open deposit modal with method details
    this.openDepositModal(method);
  }

  openDepositModal(method) {
    const modal = document.getElementById('deposit-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    if (!modal || !modalContent) {
      console.error('Modal elements not found');
      return;
    }

    // Generate modal content
    modalContent.innerHTML = this.generateModalContent(method);
    
    // Position modal above cards with higher z-index
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(0, 0, 0, 0.8)';
    modal.style.backdropFilter = 'blur(5px)';
    
    // Modal content styling
    modalContent.style.position = 'relative';
    modalContent.style.zIndex = '10000';
    modalContent.style.maxWidth = '90%';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflow = 'auto';
    modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Animate in
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
    
    // Add click outside to close
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeDepositModal();
      }
    };
  }

  closeDepositModal() {
    const modal = document.getElementById('deposit-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  generateModalContent(method) {
    const methodColors = {
      'crypto': '#10B981',
      'ach': '#3B82F6', 
      'paypal': '#8B5CF6'
    };

    const color = methodColors[method.method_type] || '#6B7280';
    
    let paymentInfoHTML = '';
    if (method.method_type === 'crypto') {
      paymentInfoHTML = `
        <div class="payment-info">
          <strong>Network:</strong> ${method.network || 'N/A'}<br>
          <strong>Address:</strong> <code>${method.address || 'N/A'}</code>
        </div>
      `;
    } else if (method.method_type === 'ach') {
      paymentInfoHTML = `
        <div class="payment-info">
          <strong>Bank:</strong> ${method.bank_name || 'N/A'}<br>
          <strong>Account:</strong> ${method.account_number || 'N/A'}<br>
          <strong>Routing:</strong> ${method.routing_number || 'N/A'}
        </div>
      `;
    } else if (method.method_type === 'paypal') {
      paymentInfoHTML = `
        <div class="payment-info">
          <strong>Email:</strong> ${method.paypal_email || 'N/A'}<br>
          <strong>Business:</strong> ${method.paypal_business_name || 'N/A'}
        </div>
      `;
    }

    return `
      <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; max-width: 600px; margin: 0 auto; max-height: 90vh; overflow-y: auto;">
        <div style="padding: 24px; border-bottom: 1px solid #333;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <h2 style="color: white; font-size: 24px; font-weight: 600;">${method.method_name}</h2>
            <button onclick="window.depositsPage.closeDepositModal()" style="background: transparent; border: 1px solid #666; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer;">×</button>
          </div>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: rgba(255,255,255,0.8); line-height: 1.5;">${method.instructions}</p>
          </div>
          
          <!-- Amount Input Section -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 16px;">
              ${this.upgradeContext ? '💰 Upgrade Amount' : '💰 Enter Deposit Amount'}
            </h4>
            ${this.upgradeContext ? `
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="color: white; font-size: 14px; line-height: 1.5;">
                  <div style="margin-bottom: 8px;"><strong>Upgrade Target:</strong> Tier ${this.upgradeContext.targetTierId}</div>
                  <div style="margin-bottom: 8px;"><strong>Required Amount:</strong> ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(this.upgradeContext.upgradeAmount, method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}</div>
                  <div><strong>After deposit:</strong> You'll be automatically upgraded!</div>
                </div>
              </div>
            ` : ''}
            <div style="display: grid; gap: 12px;">
              <div>
                <label style="color: rgba(255,255,255,0.7); font-size: 12px; display: block; margin-bottom: 8px;">Amount (${method.currency})</label>
                <input type="number" 
                       id="deposit-amount" 
                       min="${method.min_amount || (method.currency === 'BTC' ? 100 : 1)}" 
                       max="${method.max_amount || (method.currency === 'BTC' ? 1000000 : 999999)}" 
                       step="0.01" 
                       placeholder="0.00"
                       value="${this.upgradeContext ? this.upgradeContext.upgradeAmount : ''}"
                       style="width: 100%; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; font-size: 16px; font-weight: 500;"
                       oninput="window.depositsPage.updateDepositAmount(this.value)"
                       ${this.upgradeContext ? 'readonly' : ''}>
                <div style="margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.6);">
                  Minimum: ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.min_amount || (method.currency === 'BTC' ? 100 : 0), method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}
                  ${method.max_amount ? ` | Maximum: ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.max_amount, method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}` : ''}
                  ${this.upgradeContext ? '<br><span style="color: #10B981;">✓ Amount pre-filled for upgrade</span>' : ''}
                </div>
              </div>
            </div>
          </div>
          
          <div style="background: ${color}10; border: 1px solid ${color}30; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: white; font-size: 18px; font-weight: 600;">📱 ${method.method_type === 'crypto' ? 'Crypto' : method.method_type === 'ach' ? 'Bank' : 'PayPal'} Deposit Information</h4>
            <div style="display: grid; gap: 16px;">
              <div>
                <label style="color: rgba(255,255,255,0.7); font-size: 12px;">${method.method_type === 'crypto' ? 'Network' : method.method_type === 'ach' ? 'Bank' : 'Email'}</label>
                <div style="color: white; font-size: 16px; font-weight: 500;">${method.method_type === 'crypto' ? method.network || 'NULL' : method.method_type === 'ach' ? method.bank_name || 'NULL' : method.paypal_email || 'NULL'}</div>
              </div>
              <div>
                <label style="color: rgba(255,255,255,0.7); font-size: 12px;">${method.method_type === 'crypto' ? 'Wallet Address' : method.method_type === 'ach' ? 'Account Number' : 'Business Name'}</label>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="flex: 1; color: white; font-size: 16px; font-weight: 500; font-family: 'Courier New', monospace; word-break: break-all;">${method.method_type === 'crypto' ? method.address || 'NULL' : method.method_type === 'ach' ? method.account_number || 'NULL' : method.paypal_business_name || 'NULL'}</div>
                  <button onclick="window.depositsPage.copyAddress('${method.method_type === 'crypto' ? method.address : method.method_type === 'ach' ? method.account_number : method.paypal_email}')" style="background: ${color}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">📋 Copy</button>
                </div>
              </div>
              ${method.method_type === 'ach' ? `
                <div>
                  <label style="color: rgba(255,255,255,0.7); font-size: 12px;">Routing Number</label>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="flex: 1; color: white; font-size: 16px; font-weight: 500; font-family: 'Courier New', monospace;">${method.routing_number || 'NULL'}</div>
                    <button onclick="window.depositsPage.copyAddress('${method.routing_number}')" style="background: ${color}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">📋 Copy</button>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div style="padding: 24px; border-top: 1px solid #333; display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="window.depositsPage.closeDepositModal()" style="background: #666; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Close</button>
          <button onclick="window.depositsPage.initiateDeposit('${method.id}')" style="background: ${color}; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;" id="deposit-submit-btn">💰 I've Sent Payment</button>
        </div>
      </div>
    `;
  }

  updateDepositAmount(amount) {
    this.currentDepositAmount = parseFloat(amount) || 0;
    const submitBtn = document.getElementById('deposit-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = `💰 I've Sent Payment (${this.formatMoney(this.currentDepositAmount, 2)})`;
    }
  }

  initiateDeposit(methodId) {
    // Find method
    const method = this.depositSettings.methods.find(m => m.id === methodId);
    if (!method) return;

    // Validate amount
    if (!this.currentDepositAmount || this.currentDepositAmount < (method.min_amount || (method.currency === 'BTC' ? 100 : 1))) {
      if (window.Notify) {
        window.Notify.error(`Minimum deposit amount is ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.min_amount || (method.currency === 'BTC' ? 100 : 0), method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}`);
      } else {
        alert(`Minimum deposit amount is ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.min_amount || (method.currency === 'BTC' ? 100 : 0), method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}`);
      }
      return;
    }

    if (method.max_amount && this.currentDepositAmount > method.max_amount) {
      if (window.Notify) {
        window.Notify.error(`Maximum deposit amount is ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.max_amount, method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}`);
      } else {
        alert(`Maximum deposit amount is ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(method.max_amount, method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}`);
      }
      return;
    }

    // Show confirmation dialog
    this.showConfirmationDialog(method);
  }

  showConfirmationDialog(method) {
    const modal = document.getElementById('deposit-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    if (!modal || !modalContent) return;

    // Get payment address
    const paymentAddress = method.method_type === 'crypto' ? method.address : 
                         method.method_type === 'ach' ? method.account_number : 
                         method.paypal_email;

    // Generate confirmation dialog content
    modalContent.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; max-width: 500px; margin: 0 auto;">
        <div style="padding: 24px; border-bottom: 1px solid #333;">
          <h3 style="color: white; font-size: 20px; font-weight: 600; margin: 0;">⚠️ Confirm Deposit</h3>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; line-height: 1.5;">
              Please confirm that you have sent the payment. Once confirmed, your deposit will be submitted for admin approval.
            </p>
            
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h4 style="color: #EF4444; margin: 0 0 8px 0;">⚠️ Confirmation Required</h4>
              <div style="color: white; font-size: 16px; font-weight: 500; line-height: 1.5;">
                <div style="margin-bottom: 8px;"><strong>Amount:</strong> ${method.currency === 'USDT' ? '₮' : method.currency === 'BTC' ? '₿' : '$'}${this.formatMoney(this.currentDepositAmount, method.currency === 'USDT' ? 6 : method.currency === 'BTC' ? 8 : 2)}</div>
                <div style="margin-bottom: 8px;"><strong>Method:</strong> ${method.method_name}</div>
                <div style="margin-bottom: 8px;"><strong>To:</strong> <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace;">${paymentAddress || 'N/A'}</code></div>
                <div><strong>Processing Time:</strong> ${(() => {
      console.log('DEBUG: Confirmation dialog processing time for:', {
        method_name: method.method_name,
        method_type: method.method_type,
        currency: method.currency,
        processing_time_hours: method.processing_time_hours
      });
      
      if (method.method_type === 'crypto') {
        if (method.currency === 'USDT') {
          console.log('DEBUG: Confirmation USDT override applied');
          return '60 minutes'; // Override all USDT
        } else if (method.currency === 'BTC') {
          console.log('DEBUG: Confirmation BTC override applied');
          return '60 minutes'; // Override all BTC
        } else {
          console.log('DEBUG: Confirmation fallback applied');
          return `${(method.processing_time_hours || 0) * 60} minutes`; // Fallback
        }
      } else {
        console.log('DEBUG: Non-crypto method, using hours');
        return `${method.processing_time_hours || 24} hours`; // Non-crypto methods
      }
    })()}</div>
              </div>
            </div>
          </div>
          
          <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="color: #3B82F6; margin: 0 0 8px 0;">📋 Important</h4>
            <div style="color: white; font-size: 14px; line-height: 1.5;">
              <div style="margin-bottom: 8px;">• Make sure you have sent the exact amount</div>
              <div style="margin-bottom: 8px;">• Include your account ID in the payment reference</div>
              <div style="margin-bottom: 8px;">• Keep your payment confirmation details</div>
              <div>• Processing will begin once confirmed</div>
            </div>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button onclick="window.depositsPage.closeDepositModal()" style="background: #666; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Cancel</button>
            <button onclick="window.depositsPage.submitDepositForApproval('${method.id}')" style="background: #10B981; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">✅ Yes, I've Sent Payment</button>
          </div>
        </div>
      </div>
    `;
  }

  async submitDepositForApproval(methodId) {
    const method = this.depositSettings.methods.find(m => m.id === methodId);
    if (!method) return;

    try {
      // Show loading state
      const modal = document.getElementById('deposit-modal');
      const modalContent = modal.querySelector('.modal-content');
      
      modalContent.innerHTML = `
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; max-width: 400px; margin: 0 auto; text-align: center; padding: 40px;">
          <div style="color: white;">
            <div style="width: 40px; height: 40px; margin: 0 auto 20px; border: 3px solid #10B981; border-radius: 50%; border-top-color: #10B981; border-right-color: #10B981; border-bottom-color: #10B981; border-left-color: #10B981; animation: spin 1s linear infinite;"></div>
            <h3 style="margin: 0 0 16px 0;">Submitting for Approval...</h3>
            <p style="color: rgba(255,255,255,0.7);">Please wait while we process your deposit request.</p>
          </div>
        </div>
      `;

      // Get user ID
      const userId = await this.api.getCurrentUserId();
      
      // Create deposit request
      const depositData = {
        user_id: userId,
        method_id: methodId,
        method_name: method.method_name,
        method_type: method.method_type,
        currency: method.currency,
        amount: this.currentDepositAmount,
        network: method.network,
        address: method.address,
        bank_name: method.bank_name,
        account_number: method.account_number,
        routing_number: method.routing_number,
        paypal_email: method.paypal_email,
        paypal_business_name: method.paypal_business_name,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Insert into deposit_requests table
      const { data, error } = await window.API.serviceClient
        .from('deposit_requests')
        .insert(depositData)
        .select()
        .single();

      if (error) {
        console.error('Error creating deposit request:', error);
        throw new Error(`Failed to submit deposit request: ${error.message}`);
      }

      console.log('Deposit request created:', data);

      // Show success message
      modalContent.innerHTML = `
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; max-width: 400px; margin: 0 auto; text-align: center; padding: 40px;">
          <div style="color: white;">
            <div style="width: 40px; height: 40px; margin: 0 auto 20px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: white;">
                <polyline points="20 6 9 17 4 4 12"></polyline>
              </svg>
            </div>
            <h3 style="margin: 0 0 16px 0;">Deposit Submitted!</h3>
            <p style="color: rgba(255,255,255,0.7); margin: 0 0 8px 0;">Your deposit request has been submitted for admin approval.</p>
            <p style="color: rgba(255,255,255,0.7); margin: 0 0 16px 0;">Reference ID: ${data.id}</p>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px;">You will be notified once your deposit is approved.</p>
          </div>
          
          <button onclick="window.depositsPage.closeDepositModal()" style="background: #10B981; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 20px;">Done</button>
        </div>
      `;

      // Close modal after delay
      setTimeout(() => {
        this.closeDepositModal();
      }, 3000);

      if (window.Notify) {
        window.Notify.success('Deposit request submitted successfully! Awaiting admin approval.');
      }

    } catch (error) {
      console.error('Error submitting deposit for approval:', error);
      
      // Show error state
      const modal = document.getElementById('deposit-modal');
      const modalContent = modal.querySelector('.modal-content');
      
      modalContent.innerHTML = `
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; max-width: 400px; margin: 0 auto; text-align: center; padding: 40px;">
          <div style="color: white;">
            <div style="width: 40px; height: 40px; margin: 0 auto 20px; background: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: white;">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h3 style="margin: 0 0 16px 0;">Submission Failed</h3>
            <p style="color: rgba(255,255,255,0.7); margin: 0 0 8px 0;">There was an error submitting your deposit request.</p>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px;">Please try again or contact support.</p>
          </div>
          
          <button onclick="window.depositsPage.closeDepositModal()" style="background: #EF4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 20px;">Close</button>
        </div>
      `;

      if (window.Notify) {
        window.Notify.error('Failed to submit deposit request. Please try again.');
      }
    }
  }

  copyAddress(address) {
    if (!address) {
      if (window.Notify) {
        window.Notify.error('No address to copy');
      }
      return;
    }
    
    navigator.clipboard.writeText(address).then(() => {
      if (window.Notify) {
        window.Notify.success('Address copied to clipboard!');
      } else {
        console.log('Address copied to clipboard');
      }
    }).catch(() => {
      if (window.Notify) {
        window.Notify.error('Failed to copy address');
      }
    });
  }

  formatMoney(amount, decimals = 2) {
    if (amount === null || amount === undefined) return '0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    
    // Format with proper comma placement for thousands
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  setupForms() {
    // Minimal setup since we're using modal-based approach
    console.log('Deposit forms setup complete - using modal system');
  }

  setupURLParameters() {
    // Handle URL parameters for tier upgrade CTAs
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    const currency = urlParams.get('currency');
    const target = urlParams.get('target');
    const tierId = urlParams.get('tier_id');

    if (amount && currency === 'USDT' && target === 'tier_upgrade' && tierId) {
      // Pre-fill amount and select appropriate method
      this.prefillForTierUpgrade(amount, tierId);
    }
  }

  prefillForTierUpgrade(amount, tierId) {
    // Store tier upgrade context
    this.tierUpgradeContext = {
      target: 'tier_upgrade',
      tier_id: parseInt(tierId),
      amount: parseFloat(amount)
    };
    
    console.log('Tier upgrade context set:', this.tierUpgradeContext);
  }

  showError(message) {
    const methodsContainer = document.getElementById('deposit-methods');
    if (methodsContainer) {
      methodsContainer.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 20px; text-align: center;">
          <h3 style="color: #EF4444; margin: 0 0 10px 0;">Error</h3>
          <p style="color: rgba(255,255,255,0.8); margin: 0;">${message}</p>
        </div>
      `;
    }
  }

  // Cleanup method
  destroy() {
    console.log('Deposits page cleanup');
  }
}

// Initialize page controller
window.depositsPage = new DepositsPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DepositsPage;
}
