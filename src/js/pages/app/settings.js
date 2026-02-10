/**
 * Settings Page Controller
 * Handles user settings and preferences
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

class SettingsPage {
  constructor() {
    this.currentUser = null;
    this.kycStatus = null;
    this.payoutMethods = [];
    this.originalProfileData = {};
    this.init();
  }

  async init() {
    console.log('Settings page initializing...');
    
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
      await this.loadKYCStatus();
      await this.loadPayoutMethods();
      
      // Setup UI
      this.setupEventListeners();
      this.renderProfile();
      this.renderKYCStatus();
      this.renderPayoutMethods();
      this.loadNotificationPreferences();
      
      console.log('Settings page setup complete');
    } catch (error) {
      console.error('Error setting up settings page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load settings');
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
      // Get current user first
      this.currentUser = await window.AuthService.getCurrentUserWithProfile();
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // If profile data is missing, fetch it using REST API
      if (!this.currentUser.profile) {
        const profileResult = await window.API.getProfile(this.currentUser.id);
        if (profileResult.data && profileResult.data.length > 0) {
          this.currentUser.profile = profileResult.data[0];
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  async loadKYCStatus() {
    try {
      // For now, set default status since KYC might be handled separately
      this.kycStatus = { status: 'not_submitted' };
    } catch (error) {
      console.error('Failed to load KYC status:', error);
      this.kycStatus = { status: 'not_submitted' };
    }
  }

  async loadPayoutMethods() {
    try {
      // For now, set empty array since payout methods might be handled separately
      this.payoutMethods = [];
    } catch (error) {
      console.error('Failed to load payout methods:', error);
      this.payoutMethods = [];
    }
  }


  setupEventListeners() {
    // Tab navigation
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfile();
      });
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', (e) => {
        this.toggleDarkMode(e.target.checked);
      });
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.settings-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${tabName}-section`).classList.add('active');
  }

  renderProfile() {
    if (!this.currentUser) return;

    const profile = this.currentUser.profile || {};
    
    // Store original data for reset functionality
    this.originalProfileData = {
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      displayName: profile.display_name || '',
      phone: profile.phone || '',
      country: profile.country || '',
      bio: profile.bio || '',
      // Address fields
      address_line1: profile.address_line1 || '',
      address_line2: profile.address_line2 || '',
      city: profile.city || '',
      state: profile.state || '',
      postal_code: profile.postal_code || '',
      // Compliance fields
      occupation: profile.occupation || '',
      dob: profile.dob || ''
    };

    // Populate form fields with database data
    document.getElementById('display-name').value = profile.display_name || '';
    document.getElementById('first-name').value = profile.first_name || '';
    document.getElementById('last-name').value = profile.last_name || '';
    document.getElementById('email').value = this.currentUser.email || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('country').value = profile.country || '';
    document.getElementById('bio').value = profile.bio || '';
    
    // Log the loaded data for debugging
    console.log('Settings page loaded profile data:', profile);
    console.log('Display name from database:', profile.display_name);
  }

  renderKYCStatus() {
    if (!this.kycStatus) return;

    const statusElement = document.getElementById('kyc-status');
    const descriptionElement = document.getElementById('kyc-description');
    const actionsElement = document.getElementById('kyc-actions');

    // Update status display
    statusElement.className = 'kyc-status';
    statusElement.classList.add(`kyc-${this.kycStatus.status}`);

    let statusText = '';
    let description = '';
    let actions = '';

    switch (this.kycStatus.status) {
      case 'not_submitted':
        statusText = 'Not Submitted';
        description = 'Complete identity verification to unlock full account features and higher withdrawal limits.';
        actions = '<button class="btn btn-primary" onclick="window.settingsPage.goToKYC()">Complete KYC</button>';
        break;
      case 'pending':
        statusText = 'Pending Review';
        description = 'Your identity verification is under review. This typically takes 1-2 business days.';
        actions = '<button class="btn btn-secondary" disabled>Under Review</button>';
        break;
      case 'approved':
        statusText = 'Verified';
        description = 'Your identity has been verified. You have full access to all account features.';
        actions = '<button class="btn btn-secondary" disabled>Verified ✓</button>';
        break;
      case 'rejected':
        statusText = 'Rejected';
        description = this.kycStatus.rejection_reason || 'Your identity verification was rejected. Please review and resubmit.';
        actions = '<button class="btn btn-primary" onclick="window.settingsPage.goToKYC()">Resubmit KYC</button>';
        break;
    }

    statusElement.textContent = statusText;
    descriptionElement.textContent = description;
    actionsElement.innerHTML = actions;
  }

  renderPayoutMethods() {
    const container = document.getElementById('payout-methods');
    if (!container) return;

    if (this.payoutMethods.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          <h3>No payout methods</h3>
          <p>Add a payout method to enable withdrawals</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.payoutMethods.map(method => this.formatPayoutMethod(method)).join('');
  }

  formatPayoutMethod(method) {
    const icon = this.getMethodIcon(method.type);
    const statusClass = method.is_active ? 'status-active' : 'status-inactive';
    const statusText = method.is_active ? 'Active' : 'Inactive';

    return `
      <div class="payout-method">
        <div class="method-header">
          <div class="method-type">
            <div class="method-icon">${icon}</div>
            <div class="method-name">${method.name}</div>
          </div>
          <div class="method-status ${statusClass}">${statusText}</div>
        </div>
        <div class="method-details">
          ${this.formatMethodDetails(method)}
        </div>
        <div class="method-actions">
          <button class="btn btn-small btn-outline" onclick="window.settingsPage.editPayoutMethod('${method.id}')">Edit</button>
          <button class="btn btn-small ${method.is_active ? 'btn-danger' : 'btn-primary'}" 
                  onclick="window.settingsPage.togglePayoutMethod('${method.id}')">
            ${method.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    `;
  }

  getMethodIcon(type) {
    const icons = {
      bank: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
      paypal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10L5 19h4l1-4h3a5 5 0 0 0 5-5v0a5 5 0 0 0-5-5H7z"></path></svg>',
      crypto: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12M8 9h8M8 15h8"></path></svg>'
    };
    return icons[type] || icons.bank;
  }

  formatMethodDetails(method) {
    let details = [];
    
    switch (method.type) {
      case 'bank':
        details = [
          `<div class="detail-item">
            <div class="detail-label">Account Name</div>
            <div class="detail-value">${method.details.account_name}</div>
          </div>`,
          `<div class="detail-item">
            <div class="detail-label">Account Number</div>
            <div class="detail-value">${method.details.account_number}</div>
          </div>`,
          `<div class="detail-item">
            <div class="detail-label">Bank Name</div>
            <div class="detail-value">${method.details.bank_name}</div>
          </div>`
        ];
        break;
      case 'paypal':
        details = [
          `<div class="detail-item">
            <div class="detail-label">Email</div>
            <div class="detail-value">${method.details.email}</div>
          </div>`,
          `<div class="detail-item">
            <div class="detail-label">Account ID</div>
            <div class="detail-value">${method.details.account_id}</div>
          </div>`
        ];
        break;
      case 'crypto':
        details = [
          `<div class="detail-item">
            <div class="detail-label">Network</div>
            <div class="detail-value">${method.details.network}</div>
          </div>`,
          `<div class="detail-item">
            <div class="detail-label">Address</div>
            <div class="detail-value" style="font-family: monospace; font-size: 12px;">${method.details.address}</div>
          </div>`
        ];
        break;
    }

    return details.join('');
  }

  loadNotificationPreferences() {
    // Load from localStorage or use defaults
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    
    const defaults = {
      emailNotifications: true,
      inappNotifications: true,
      depositNotifications: true,
      withdrawalNotifications: true,
      roiNotifications: true,
      marketingNotifications: false
    };

    const settings = { ...defaults, ...preferences };

    // Set toggle states
    document.getElementById('email-notifications').checked = settings.emailNotifications;
    document.getElementById('inapp-notifications').checked = settings.inappNotifications;
    document.getElementById('deposit-notifications').checked = settings.depositNotifications;
    document.getElementById('withdrawal-notifications').checked = settings.withdrawalNotifications;
    document.getElementById('roi-notifications').checked = settings.roiNotifications;
    document.getElementById('marketing-notifications').checked = settings.marketingNotifications;
  }

  async saveProfile() {
    try {
      const formData = new FormData(document.getElementById('profile-form'));
      const profileData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        bio: formData.get('bio')
      };

      const { data, error } = await window.API.updateProfile(this.currentUser.id, profileData);

      if (error) {
        throw error;
      }

      // Update local data
      if (this.currentUser.profile) {
        Object.assign(this.currentUser.profile, profileData);
      }

      // Update original data
      this.originalProfileData = { ...this.originalProfileData, ...profileData };

      window.Notify.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      window.Notify.error('Failed to update profile');
    }
  }

  resetProfile() {
    // Reset form to original values
    document.getElementById('display-name').value = this.originalProfileData.displayName;
    document.getElementById('first-name').value = this.originalProfileData.firstName;
    document.getElementById('last-name').value = this.originalProfileData.lastName;
    document.getElementById('phone').value = this.originalProfileData.phone;
    document.getElementById('country').value = this.originalProfileData.country;
    document.getElementById('bio').value = this.originalProfileData.bio;

    window.Notify.info('Profile reset to original values');
  }

  async saveNotifications() {
    try {
      const preferences = {
        emailNotifications: document.getElementById('email-notifications').checked,
        inappNotifications: document.getElementById('inapp-notifications').checked,
        depositNotifications: document.getElementById('deposit-notifications').checked,
        withdrawalNotifications: document.getElementById('withdrawal-notifications').checked,
        roiNotifications: document.getElementById('roi-notifications').checked,
        marketingNotifications: document.getElementById('marketing-notifications').checked
      };

      // Save to localStorage
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences));

      // TODO: Save to backend via REST API when endpoint is available
      window.Notify.success('Notification preferences saved!');
    } catch (error) {
      console.error('Failed to save notifications:', error);
      window.Notify.error('Failed to save notification preferences');
    }
  }

  resetNotifications() {
    // Reset to defaults
    const defaults = {
      emailNotifications: true,
      inappNotifications: true,
      depositNotifications: true,
      withdrawalNotifications: true,
      roiNotifications: true,
      marketingNotifications: false
    };

    document.getElementById('email-notifications').checked = defaults.emailNotifications;
    document.getElementById('inapp-notifications').checked = defaults.inappNotifications;
    document.getElementById('deposit-notifications').checked = defaults.depositNotifications;
    document.getElementById('withdrawal-notifications').checked = defaults.withdrawalNotifications;
    document.getElementById('roi-notifications').checked = defaults.roiNotifications;
    document.getElementById('marketing-notifications').checked = defaults.marketingNotifications;

    window.Notify.info('Notification preferences reset to defaults');
  }

  addPayoutMethod() {
    // Create modal for adding payout method
    const modal = this.createPayoutMethodModal();
    document.body.appendChild(modal);
    modal.showModal();
  }

  editPayoutMethod(methodId) {
    const method = this.payoutMethods.find(m => m.id === methodId);
    if (!method) return;

    // Create modal for editing payout method
    const modal = this.createPayoutMethodModal(method);
    document.body.appendChild(modal);
    modal.showModal();
  }

  createPayoutMethodModal(method = null) {
    const isEdit = !!method;
    const title = isEdit ? 'Edit Payout Method' : 'Add Payout Method';

    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('dialog').close()">×</button>
        </div>
        <div class="modal-body">
          <form id="payout-method-form">
            <div class="form-group">
              <label class="form-label">Method Type</label>
              <select class="form-input form-select" id="method-type" ${isEdit ? 'disabled' : ''}>
                <option value="bank" ${method?.type === 'bank' ? 'selected' : ''}>Bank Account</option>
                <option value="paypal" ${method?.type === 'paypal' ? 'selected' : ''}>PayPal</option>
                <option value="crypto" ${method?.type === 'crypto' ? 'selected' : ''}>Cryptocurrency</option>
              </select>
            </div>
            
            <div id="bank-fields" class="method-fields" style="${method?.type === 'bank' || !method ? '' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">Account Name</label>
                <input type="text" class="form-input" id="account-name" value="${method?.details?.account_name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Account Number</label>
                <input type="text" class="form-input" id="account-number" value="${method?.details?.account_number || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Routing Number</label>
                <input type="text" class="form-input" id="routing-number" value="${method?.details?.routing_number || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Bank Name</label>
                <input type="text" class="form-input" id="bank-name" value="${method?.details?.bank_name || ''}" required>
              </div>
            </div>
            
            <div id="paypal-fields" class="method-fields" style="${method?.type === 'paypal' ? '' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">PayPal Email</label>
                <input type="email" class="form-input" id="paypal-email" value="${method?.details?.email || ''}" required>
              </div>
            </div>
            
            <div id="crypto-fields" class="method-fields" style="${method?.type === 'crypto' ? '' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">Network</label>
                <select class="form-input form-select" id="crypto-network">
                  <option value="trc20" ${method?.details?.network === 'trc20' ? 'selected' : ''}>TRC20 (USDT)</option>
                  <option value="erc20" ${method?.details?.network === 'erc20' ? 'selected' : ''}>ERC20 (USDT)</option>
                  <option value="bep20" ${method?.details?.network === 'bep20' ? 'selected' : ''}>BEP20 (USDT)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Wallet Address</label>
                <input type="text" class="form-input" id="wallet-address" value="${method?.details?.address || ''}" required>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="window.settingsPage.savePayoutMethod('${method?.id || ''}')">
            ${isEdit ? 'Update' : 'Add'} Method
          </button>
        </div>
      </div>
    `;

    // Add event listener for method type change
    const methodTypeSelect = modal.querySelector('#method-type');
    if (methodTypeSelect) {
      methodTypeSelect.addEventListener('change', (e) => {
        this.toggleMethodFields(e.target.value, modal);
      });
    }

    return modal;
  }

  toggleMethodFields(type, modal) {
    // Hide all method fields
    modal.querySelectorAll('.method-fields').forEach(fields => {
      fields.style.display = 'none';
    });

    // Show selected method fields
    const selectedFields = modal.querySelector(`#${type}-fields`);
    if (selectedFields) {
      selectedFields.style.display = 'block';
    }
  }

  async savePayoutMethod(methodId = '') {
    try {
      const modal = document.querySelector('dialog[open]');
      const methodType = modal.querySelector('#method-type').value;
      
      let methodData = {
        type: methodType,
        name: this.getMethodName(methodType),
        is_active: true
      };

      // Collect method-specific data
      switch (methodType) {
        case 'bank':
          methodData.details = {
            account_name: modal.querySelector('#account-name').value,
            account_number: modal.querySelector('#account-number').value,
            routing_number: modal.querySelector('#routing-number').value,
            bank_name: modal.querySelector('#bank-name').value
          };
          break;
        case 'paypal':
          methodData.details = {
            email: modal.querySelector('#paypal-email').value,
            account_id: 'paypal_' + Date.now()
          };
          break;
        case 'crypto':
          methodData.details = {
            network: modal.querySelector('#crypto-network').value,
            address: modal.querySelector('#wallet-address').value
          };
          break;
      }

      // Validate required fields
      if (!this.validatePayoutMethod(methodData)) {
        return;
      }

      const endpoint = methodId ? 'payout_methods_update' : 'payout_methods_upsert';
      const { data, error } = await window.API.fetchEdge(endpoint, {
        method: 'POST',
        body: JSON.stringify({ 
          method_id: methodId,
          method_data: methodData 
        })
      });

      if (error) {
        throw error;
      }

      // Close modal and refresh
      modal.close();
      await this.loadPayoutMethods();
      this.renderPayoutMethods();

      window.Notify.success(`Payout method ${methodId ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Failed to save payout method:', error);
      window.Notify.error('Failed to save payout method');
    }
  }

  validatePayoutMethod(methodData) {
    // Basic validation
    if (!methodData.type || !methodData.details) {
      window.Notify.error('Please fill in all required fields');
      return false;
    }

    // Type-specific validation
    switch (methodData.type) {
      case 'bank':
        if (!methodData.details.account_name || !methodData.details.account_number || 
            !methodData.details.routing_number || !methodData.details.bank_name) {
          window.Notify.error('Please fill in all bank account details');
          return false;
        }
        break;
      case 'paypal':
        if (!methodData.details.email || !methodData.details.email.includes('@')) {
          window.Notify.error('Please enter a valid PayPal email');
          return false;
        }
        break;
      case 'crypto':
        if (!methodData.details.network || !methodData.details.address) {
          window.Notify.error('Please fill in all cryptocurrency details');
          return false;
        }
        break;
    }

    return true;
  }

  getMethodName(type) {
    const names = {
      bank: 'Bank Account',
      paypal: 'PayPal',
      crypto: 'Cryptocurrency'
    };
    return names[type] || 'Unknown';
  }

  async togglePayoutMethod(methodId) {
    try {
      const method = this.payoutMethods.find(m => m.id === methodId);
      if (!method) return;

      const { data, error } = await window.API.fetchEdge('payout_methods_update', {
        method: 'POST',
        body: JSON.stringify({
          method_id: methodId,
          method_data: {
            is_active: !method.is_active
          }
        })
      });

      if (error) {
        throw error;
      }

      await this.loadPayoutMethods();
      this.renderPayoutMethods();

      window.Notify.success(`Payout method ${method.is_active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Failed to toggle payout method:', error);
      window.Notify.error('Failed to update payout method');
    }
  }

  async saveSecurity() {
    try {
      const securitySettings = {
        twoFactor: document.getElementById('two-factor').checked,
        darkMode: document.getElementById('dark-mode').checked
      };

      const { data, error } = await window.API.fetchEdge('settings_update', {
        method: 'POST',
        body: JSON.stringify({ security: securitySettings })
      });

      if (error) {
        throw error;
      }

      window.Notify.success('Security settings saved!');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      window.Notify.error('Failed to save security settings');
    }
  }

  changePassword() {
    // Create password change modal
    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Change Password</h3>
          <button class="modal-close" onclick="this.closest('dialog').close()">×</button>
        </div>
        <div class="modal-body">
          <form id="password-form">
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-input" id="current-password" required>
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" class="form-input" id="new-password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input type="password" class="form-input" id="confirm-password" required>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="window.settingsPage.updatePassword()">Update Password</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
  }

  async updatePassword() {
    try {
      const modal = document.querySelector('dialog[open]');
      const currentPassword = modal.querySelector('#current-password').value;
      const newPassword = modal.querySelector('#new-password').value;
      const confirmPassword = modal.querySelector('#confirm-password').value;

      // Validation
      if (newPassword !== confirmPassword) {
        window.Notify.error('Passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        window.Notify.error('Password must be at least 8 characters long');
        return;
      }

      // TODO: Implement password change via REST API when endpoint is available
      window.Notify.error('Password change functionality not yet available');
      return;

    } catch (error) {
      console.error('Failed to update password:', error);
      window.Notify.error('Failed to update password');
    }
  }

  toggleDarkMode(enabled) {
    if (enabled) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // Save preference
    localStorage.setItem('darkMode', enabled);
  }

  goToKYC() {
    window.location.href = '/app/kyc.html';
  }

  // Cleanup method
  destroy() {
    console.log('Settings page cleanup');
  }
}

// Initialize page controller
window.settingsPage = new SettingsPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsPage;
}
