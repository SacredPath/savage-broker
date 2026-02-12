/**
 * Back Office Settings Controller
 * Handles system-wide configuration management with real-time updates
 */

class BackOfficeSettings {
  constructor() {
    this.currentUser = null;
    this.userPermissions = null;
    this.settings = null;
    this.originalSettings = null;
    this.init();
  }

  async init() {
    console.log('Back Office settings page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Check RBAC permissions first
      await this.checkRBAC();
      
      // Load user data
      await this.loadUserData();
      
      // Setup UI
      this.renderUserInfo();
      this.setupNavigation();
      
      // Load settings
      await this.loadSettings();
      
      console.log('Back Office settings page setup complete');
    } catch (error) {
      console.error('Error setting up Back Office settings page:', error);
      if (error.message === 'Access denied') {
        this.redirectToLogin();
      } else if (window.Notify) {
        window.Notify.error('Failed to load settings');
      }
    }
  }

  async checkRBAC() {
    try {
      const { data, error } = await window.API.fetchEdge('rbac_me', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      // Check if user has back office access
      if (!data.has_backoffice_access) {
        throw new Error('Access denied');
      }

      // Check specific permissions for settings management
      if (!data.permissions?.settings?.view) {
        throw new Error('Access denied');
      }

      this.userPermissions = data;
      return data;
    } catch (error) {
      console.error('RBAC check failed:', error);
      throw new Error('Access denied');
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

  renderUserInfo() {
    if (!this.currentUser) return;

    // Update user avatar
    const avatar = document.getElementById('user-avatar');
    if (avatar) {
      const initials = this.currentUser.email?.charAt(0).toUpperCase() || 'A';
      avatar.textContent = initials;
    }

    // Update user name
    const userName = document.getElementById('user-name');
    if (userName) {
      const profile = this.currentUser.profile || {};
      userName.textContent = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || this.currentUser.email;
    }

    // Update user role
    const userRole = document.getElementById('user-role');
    if (userRole) {
      userRole.textContent = this.userPermissions?.role || 'Admin';
    }

    // Show admin section for superadmin
    const adminSection = document.getElementById('admin-section');
    if (adminSection && this.userPermissions?.role === 'superadmin') {
      adminSection.style.display = 'block';
    }
  }

  setupNavigation() {
    // Add active state to current page
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === currentPath) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  async loadSettings() {
    try {
      const { data, error } = await window.API.fetchEdge('bo_settings_get', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      this.settings = data.settings || {};
      this.originalSettings = JSON.parse(JSON.stringify(this.settings)); // Deep copy
      
      this.renderSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {};
      this.originalSettings = {};
      this.renderSettings();
      this.showSettingsError();
    }
    }
  }

  
  renderSettings() {
    this.renderROIRates();
    this.renderFees();
    this.renderDepositMethods();
    this.renderSystemStatus();
  }

  renderROIRates() {
    const container = document.getElementById('roi-rates-grid');
    if (!container) return;

    const tiers = ['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5'];
    const tierNames = {
      tier_1: 'Tier 1',
      tier_2: 'Tier 2',
      tier_3: 'Tier 3',
      tier_4: 'Tier 4',
      tier_5: 'Tier 5'
    };

    if (!this.settings.roi_rates) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px; color: var(--backoffice-text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h3>ROI rates unavailable</h3>
          <p>Unable to load ROI rate settings</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tiers.map(tier => {
      const rates = this.settings.roi_rates[tier] || { daily_rate: 0, monthly_rate: 0, annual_rate: 0 };
      return `
        <div class="rate-card">
          <div class="rate-header">
            <h5 class="tier-name">${tierNames[tier]}</h5>
            <div class="rate-badge">ROI Rates</div>
          </div>
          <div class="rate-inputs">
            <div class="input-group">
              <label class="input-label">Daily Rate (%)</label>
              <input type="number" 
                     class="form-control" 
                     id="${tier}_daily_rate" 
                     value="${rates.daily_rate}" 
                     step="0.1" 
                     min="0" 
                     max="10"
                     onchange="window.backofficeSettings.updateSetting('roi_rates.${tier}.daily_rate', this.value)">
              <small class="input-help">Daily percentage rate</small>
            </div>
            <div class="input-group">
              <label class="input-label">Monthly Rate (%)</label>
              <input type="number" 
                     class="form-control" 
                     id="${tier}_monthly_rate" 
                     value="${rates.monthly_rate}" 
                     step="0.1" 
                     min="0" 
                     max="100"
                     onchange="window.backofficeSettings.updateSetting('roi_rates.${tier}.monthly_rate', this.value)">
              <small class="input-help">Monthly percentage rate</small>
            </div>
            <div class="input-group">
              <label class="input-label">Annual Rate (%)</label>
              <input type="number" 
                     class="form-control" 
                     id="${tier}_annual_rate" 
                     value="${rates.annual_rate}" 
                     step="0.1" 
                     min="0" 
                     max="1000"
                     onchange="window.backofficeSettings.updateSetting('roi_rates.${tier}.annual_rate', this.value)">
              <small class="input-help">Annual percentage rate</small>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderFees() {
    const container = document.getElementById('fees-grid');
    if (!container) return;

    const withdrawal = this.settings.fees.withdrawal;
    const conversion = this.settings.fees.conversion;

    container.innerHTML = `
      <div class="fee-card">
        <div class="fee-header">
          <h5 class="fee-title">Withdrawal Fees</h5>
          <div class="fee-badge">Withdrawals</div>
        </div>
        <div class="fee-inputs">
          <div class="input-group">
            <label class="input-label">USD Withdrawal Fee (%)</label>
            <input type="number" 
                   class="form-control" 
                   id="withdrawal_usd_percentage" 
                   value="${withdrawal.usd_percentage}" 
                   step="0.1" 
                   min="0" 
                   max="10"
                   onchange="window.backofficeSettings.updateSetting('fees.withdrawal.usd_percentage', this.value)">
            <small class="input-help">Percentage fee for USD withdrawals</small>
          </div>
          <div class="input-group">
            <label class="input-label">USDT Withdrawal Fee (%)</label>
            <input type="number" 
                   class="form-control" 
                   id="withdrawal_usdt_percentage" 
                   value="${withdrawal.usdt_percentage}" 
                   step="0.1" 
                   min="0" 
                   max="10"
                   onchange="window.backofficeSettings.updateSetting('fees.withdrawal.usdt_percentage', this.value)">
            <small class="input-help">Percentage fee for USDT withdrawals</small>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Min USD Withdrawal</label>
              <input type="number" 
                     class="form-control" 
                     id="withdrawal_minimum_usd" 
                     value="${withdrawal.minimum_usd}" 
                     step="50" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('fees.withdrawal.minimum_usd', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Min USDT Withdrawal</label>
              <input type="number" 
                     class="form-control" 
                     id="withdrawal_minimum_usdt" 
                     value="${withdrawal.minimum_usdt}" 
                     step="50" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('fees.withdrawal.minimum_usdt', this.value)">
            </div>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Daily USD Limit</label>
              <input type="number" 
                     class="form-control" 
                     id="withdrawal_daily_limit_usd" 
                     value="${withdrawal.daily_limit_usd}" 
                     step="1000" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('fees.withdrawal.daily_limit_usd', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Daily USDT Limit</label>
              <input type="number" 
                     class="form-control" 
                     id="withdrawal_daily_limit_usdt" 
                     value="${withdrawal.daily_limit_usdt}" 
                     step="1000" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('fees.withdrawal.daily_limit_usdt', this.value)">
            </div>
          </div>
        </div>
      </div>

      <div class="fee-card">
        <div class="fee-header">
          <h5 class="fee-title">Conversion Fees</h5>
          <div class="fee-badge">USDT → USD</div>
        </div>
        <div class="fee-inputs">
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Fixed Fee (USD)</label>
              <input type="number" 
                     class="form-control" 
                     id="conversion_fixed_fee_usd" 
                     value="${conversion.fixed_fee_usd}" 
                     step="5" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('fees.conversion.fixed_fee_usd', this.value)">
              <small class="input-help">Fixed fee for USD conversion</small>
            </div>
            <div class="input-group">
              <label class="input-label">Fixed Fee (USDT)</label>
              <input type="number" 
                     class="form-control" 
                     id="conversion_fixed_fee_usdt" 
                     value="${conversion.fixed_fee_usdt}" 
                     step="5" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('fees.conversion.fixed_fee_usdt', this.value)">
              <small class="input-help">Fixed fee for USDT conversion</small>
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Percentage Fee (%)</label>
            <input type="number" 
                   class="form-control" 
                   id="conversion_percentage_fee" 
                   value="${conversion.percentage_fee}" 
                   step="0.1" 
                   min="0" 
                   max="10"
                   onchange="window.backofficeSettings.updateSetting('fees.conversion.percentage_fee', this.value)">
            <small class="input-help">Percentage fee for conversions</small>
          </div>
          <div class="input-group">
            <label class="input-label">FX Markup (%)</label>
            <input type="number" 
                   class="form-control" 
                   id="conversion_fx_markup_percentage" 
                   value="${conversion.fx_markup_percentage}" 
                   step="0.1" 
                   min="0" 
                   max="10"
                   onchange="window.backofficeSettings.updateSetting('fees.conversion.fx_markup_percentage', this.value)">
            <small class="input-help">Default FX markup percentage</small>
          </div>
        </div>
      </div>
    `;
  }

  renderDepositMethods() {
    const container = document.getElementById('deposit-methods-grid');
    if (!container) return;

    const methods = [
      { key: 'usdt_trc20', name: 'USDT TRC20', icon: '₮' },
      { key: 'paypal', name: 'PayPal', icon: 'P' },
      { key: 'bank', name: 'Bank Transfer', icon: '🏦' },
      { key: 'stripe', name: 'Stripe', icon: 'S' }
    ];

    container.innerHTML = methods.map(method => {
      const config = this.settings.deposit_methods[method.key];
      return `
        <div class="deposit-method-card">
          <div class="method-header">
            <div class="method-info">
              <div class="method-icon">${method.icon}</div>
              <div>
                <h5 class="method-name">${method.name}</h5>
                <div class="method-status ${config.enabled ? 'enabled' : 'disabled'}">
                  ${config.enabled ? '✅ Enabled' : '❌ Disabled'}
                </div>
              </div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="${method.key}_enabled" 
                     ${config.enabled ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.${method.key}.enabled', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="method-details">
            ${this.renderDepositMethodFields(method.key, config)}
          </div>
        </div>
      `;
    }).join('');
  }

  renderDepositMethodFields(methodKey, config) {
    switch (methodKey) {
      case 'usdt_trc20':
        return `
          <div class="input-group">
            <label class="input-label">TRC20 Address</label>
            <input type="text" 
                   class="form-control" 
                   id="usdt_trc20_address" 
                   value="${config.address}" 
                   placeholder="Enter TRC20 address"
                   onchange="window.backofficeSettings.updateSetting('deposit_methods.usdt_trc20.address', this.value)">
            <small class="input-help">USDT TRC20 deposit address</small>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Min Amount (USDT)</label>
              <input type="number" 
                     class="form-control" 
                     id="usdt_trc20_minimum" 
                     value="${config.minimum_amount}" 
                     step="10" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.usdt_trc20.minimum_amount', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Max Amount (USDT)</label>
              <input type="number" 
                     class="form-control" 
                     id="usdt_trc20_maximum" 
                     value="${config.maximum_amount}" 
                     step="1000" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.usdt_trc20.maximum_amount', this.value)">
            </div>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Overpay Tolerance</label>
              <input type="number" 
                     class="form-control" 
                     id="usdt_trc20_tolerance" 
                     value="${config.overpay_tolerance}" 
                     step="100" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.usdt_trc20.overpay_tolerance', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Confirmation Window (min)</label>
              <input type="number" 
                     class="form-control" 
                     id="usdt_trc20_window" 
                     value="${config.confirmation_window_minutes}" 
                     step="5" 
                     min="5" 
                     max="60"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.usdt_trc20.confirmation_window_minutes', this.value)">
            </div>
          </div>
        `;
      case 'paypal':
        return `
          <div class="input-group">
            <label class="input-label">Invoice Link</label>
            <input type="url" 
                   class="form-control" 
                   id="paypal_invoice_link" 
                   value="${config.invoice_link}" 
                   placeholder="Enter PayPal invoice link"
                   onchange="window.backofficeSettings.updateSetting('deposit_methods.paypal.invoice_link', this.value)">
            <small class="input-help">PayPal invoice generation link</small>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Min Amount (USD)</label>
              <input type="number" 
                     class="form-control" 
                     id="paypal_minimum" 
                     value="${config.minimum_amount}" 
                     step="10" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.paypal.minimum_amount', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Max Amount (USD)</label>
              <input type="number" 
                     class="form-control" 
                     id="paypal_maximum" 
                     value="${config.maximum_amount}" 
                     step="100" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.paypal.maximum_amount', this.value)">
            </div>
          </div>
        `;
      case 'bank':
        return `
          <div class="input-group">
            <label class="input-label">Bank Name</label>
            <input type="text" 
                   class="form-control" 
                   id="bank_name" 
                   value="${config.bank_name}" 
                   placeholder="Enter bank name"
                   onchange="window.backofficeSettings.updateSetting('deposit_methods.bank.bank_name', this.value)">
          </div>
          <div class="input-group">
            <label class="input-label">Account Name</label>
            <input type="text" 
                   class="form-control" 
                   id="bank_account_name" 
                   value="${config.account_name}" 
                   placeholder="Enter account name"
                   onchange="window.backofficeSettings.updateSetting('deposit_methods.bank.account_name', this.value)">
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Account Number</label>
              <input type="text" 
                     class="form-control" 
                     id="bank_account_number" 
                     value="${config.account_number}" 
                     placeholder="Enter account number"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.bank.account_number', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Routing Number</label>
              <input type="text" 
                     class="form-control" 
                     id="bank_routing_number" 
                     value="${config.routing_number}" 
                     placeholder="Enter routing number"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.bank.routing_number', this.value)">
            </div>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">SWIFT Code</label>
              <input type="text" 
                     class="form-control" 
                     id="bank_swift_code" 
                     value="${config.swift_code}" 
                     placeholder="Enter SWIFT code"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.bank.swift_code', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Min Amount (USD)</label>
              <input type="number" 
                     class="form-control" 
                     id="bank_minimum" 
                     value="${config.minimum_amount}" 
                     step="100" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.bank.minimum_amount', this.value)">
            </div>
          </div>
        `;
      case 'stripe':
        return `
          <div class="input-group">
            <label class="input-label">Hosted Payment Link</label>
            <input type="url" 
                   class="form-control" 
                   id="stripe_payment_link" 
                   value="${config.hosted_payment_link}" 
                   placeholder="Enter Stripe payment link"
                   onchange="window.backofficeSettings.updateSetting('deposit_methods.stripe.hosted_payment_link', this.value)">
            <small class="input-help">Stripe hosted payment link</small>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label class="input-label">Min Amount (USD)</label>
              <input type="number" 
                     class="form-control" 
                     id="stripe_minimum" 
                     value="${config.minimum_amount}" 
                     step="10" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.stripe.minimum_amount', this.value)">
            </div>
            <div class="input-group">
              <label class="input-label">Max Amount (USD)</label>
              <input type="number" 
                     class="form-control" 
                     id="stripe_maximum" 
                     value="${config.maximum_amount}" 
                     step="1000" 
                     min="0"
                     onchange="window.backofficeSettings.updateSetting('deposit_methods.stripe.maximum_amount', this.value)">
            </div>
          </div>
        `;
      default:
        return '';
    }
  }

  renderSystemStatus() {
    const container = document.getElementById('system-status-grid');
    if (!container) return;

    const system = this.settings.system;

    container.innerHTML = `
      <div class="system-card">
        <div class="system-header">
          <h5 class="system-title">System Controls</h5>
          <div class="system-badge">Configuration</div>
        </div>
        <div class="system-toggles">
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">Maintenance Mode</div>
              <div class="toggle-description">Temporarily disable user access</div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="maintenance_mode" 
                     ${system.maintenance_mode ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('system.maintenance_mode', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">New Registrations</div>
              <div class="toggle-description">Allow new user signups</div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="new_registrations_enabled" 
                     ${system.new_registrations_enabled ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('system.new_registrations_enabled', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">KYC Required</div>
              <div class="toggle-description">Require KYC for full access</div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="kyc_required" 
                     ${system.kyc_required ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('system.kyc_required', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">Email Verification</div>
              <div class="toggle-description">Require email verification</div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="email_verification_required" 
                     ${system.email_verification_required ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('system.email_verification_required', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">Auto Convert USDT</div>
              <div class="toggle-description">Auto-convert USDT deposits</div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="auto_convert_usdt" 
                     ${system.auto_convert_usdt ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('system.auto_convert_usdt', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">Auto Sweep</div>
              <div class="toggle-description">Auto-sweep into positions</div>
            </div>
            <label class="switch">
              <input type="checkbox" 
                     id="auto_sweep_enabled" 
                     ${system.auto_sweep_enabled ? 'checked' : ''}
                     onchange="window.backofficeSettings.updateSetting('system.auto_sweep_enabled', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>
        <div class="system-info">
          <div class="info-item">
            <div class="info-label">Last Updated</div>
            <div class="info-value">${new Date(system.last_updated).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  }

  updateSetting(path, value) {
    // Update nested object property
    const keys = path.split('.');
    let current = this.settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    // Show save button indicator
    this.showUnsavedChanges();
  }

  showUnsavedChanges() {
    const saveBtn = document.getElementById('save-all-btn');
    if (saveBtn) {
      saveBtn.classList.add('btn-warning');
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Changes
      `;
    }
  }

  async saveAllSettings() {
    try {
      const saveBtn = document.getElementById('save-all-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
          <div class="loading-spinner" style="width: 16px; height: 16px; margin-right: 8px;"></div>
          Saving...
        `;
      }

      const { data, error } = await window.API.fetchEdge('bo_settings_update', {
        method: 'POST',
        body: JSON.stringify({
          settings: this.settings,
          reason: 'System settings update via Back Office'
        })
      });

      if (error) {
        throw error;
      }

      // Update original settings
      this.originalSettings = JSON.parse(JSON.stringify(this.settings));
      
      // Update last updated timestamp
      this.settings.system.last_updated = new Date().toISOString();

      // Reset save button
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('btn-warning');
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Save All Changes
        `;
      }

      window.Notify.success('Settings saved successfully! Changes take effect immediately.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      window.Notify.error('Failed to save settings');
      
      // Reset save button
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Save All Changes
        `;
      }
    }
  }

  async resetSettings() {
    const confirmed = confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.');
    if (!confirmed) return;

    try {
      // Reset to empty settings - no more mock data
      this.settings = {};
      this.originalSettings = {};
      
      this.renderSettings();
      await this.saveAllSettings();
      
      window.Notify.success('Settings reset to defaults successfully!');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      window.Notify.error('Failed to reset settings');
    }
  }

  async logout() {
    try {
      await window.AuthService.logout();
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout failed:', error);
      window.Notify.error('Failed to logout');
    }
  }

  redirectToLogin() {
    window.location.href = '/login.html';
  }

  showSettingsError() {
    const settingsContainer = document.querySelector('.settings-container');
    if (!settingsContainer) return;
    
    settingsContainer.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 60px; color: var(--backoffice-text-muted);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 20px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Settings unavailable</h3>
        <p>Unable to load system settings</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  // Cleanup method
  destroy() {
    console.log('Back Office settings page cleanup');
    // Remove event listeners, intervals, etc.
  }
}

// Initialize page controller
window.backofficeSettings = new BackOfficeSettings();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackOfficeSettings;
}
