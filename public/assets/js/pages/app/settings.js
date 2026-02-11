/**
 * Settings Page Controller
 * Handles profile editing, notification preferences, payout methods management, and security settings
 */

class SettingsPage {
  constructor() {
    this.currentUser = null;
    this.kycStatus = null;
    this.payoutMethods = [];
    this.originalProfileData = {};
    
    // Get API client
    this.api = window.API || null;

    if (!this.api) {
      console.warn("SettingsPage: API client not found on load. Retrying in 500ms...");
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
    console.log('Settings page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Initialize app shell FIRST - this handles all sidebar and theme functionality (like portfolio.js)
      if (window.AppShell) {
        window.AppShell.initShell();
      }
      
      // Load data
      await this.loadUserData();
      await this.loadKYCStatus();
      await this.loadPayoutMethods();
      this.renderProfile();
      this.renderKYCStatus();
      this.renderPayoutMethods();
      this.loadNotificationPreferences();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Settings page setup complete');
    } catch (error) {
      console.error('Error setting up settings page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load settings page');
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

      // Load user profile from database
      const data = await this.api.getUserProfile(userId);
      
      this.currentUser = data;
      console.log('User data loaded:', this.currentUser);
    } catch (error) {
      console.error('Failed to load user data:', error);
      if (window.Notify) {
        if (error.message?.includes('Profiles table not available')) {
          window.Notify.error('Database setup required: Profiles table not found. Please contact administrator.');
        } else if (error.message?.includes('schema mismatch')) {
          window.Notify.error('Database schema mismatch. Please contact administrator.');
        } else {
          window.Notify.error('Failed to load user profile. Please try again.');
        }
      }
      throw error;
    }
  }

  async loadKYCStatus() {
    try {
      console.log('Loading KYC status via REST API...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Load KYC status from database
      const data = await this.api.getKYCStatus(userId);
      
      this.kycStatus = data;
      console.log('KYC status loaded:', this.kycStatus);
    } catch (error) {
      console.error('Failed to load KYC status:', error);
      // Don't throw error for KYC status - it's optional
      this.kycStatus = {
        status: 'not_submitted',
        submitted_at: null,
        reviewed_at: null,
        rejection_reason: null
      };
    }
  }

  async loadPayoutMethods() {
    try {
      console.log('Loading payout methods via REST API...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Load payout methods from database
      const data = await this.api.getPayoutMethods(userId);
      
      this.payoutMethods = data;
      console.log('Payout methods loaded:', this.payoutMethods.length, 'methods');
    } catch (error) {
      console.error('Failed to load payout methods:', error);
      // Don't throw error for payout methods - they're optional
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
      console.log('✅ Profile form found, adding submit event listener');
      profileForm.addEventListener('submit', (e) => {
        console.log('📝 Form submit event triggered');
        e.preventDefault();
        console.log('🔄 Calling saveProfile()...');
        this.saveProfile();
      });
    } else {
      console.error('❌ Profile form not found during setup');
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

    // The API returns profile data directly, not nested
    const profile = this.currentUser || {};
    
    console.log('🔄 renderProfile called');
    console.log('👤 User data:', this.currentUser);
    console.log('📋 Profile data:', profile);
    
    // Use proper first_name and last_name fields, fallback to display_name parsing
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    
    // If first_name/last_name are empty, fallback to parsing display_name
    const fallbackDisplayName = (!firstName && !lastName) ? (profile.display_name || '') : '';
    const fallbackNameParts = fallbackDisplayName.split(' ');
    const fallbackFirstName = firstName || fallbackNameParts[0] || '';
    const fallbackLastName = lastName || (fallbackNameParts.length > 1 ? fallbackNameParts.slice(1).join(' ') : '');
    
    // Use profile data directly
    const phone = profile.phone || '';
    const country = profile.country || '';
    const bio = profile.bio || '';
    const email = profile.auth_email || profile.email || ''; // Email from join or direct
    
    // Store original data for reset functionality
    this.originalProfileData = {
      firstName: fallbackFirstName,
      lastName: fallbackLastName,
      phone: phone,
      country: country,
      bio: bio,
      email: email
    };

    console.log('📝 Original profile data stored:', this.originalProfileData);

    // Populate form fields
    document.getElementById('first-name').value = fallbackFirstName;
    document.getElementById('last-name').value = fallbackLastName;
    document.getElementById('email').value = email;
    document.getElementById('phone').value = phone;
    document.getElementById('country').value = country;
    document.getElementById('bio').value = bio;
    
    console.log('✅ Form fields populated');
    console.log('📊 Populated values:', { firstName: fallbackFirstName, lastName: fallbackLastName, email, phone, country, bio });
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
    const icon = this.getMethodIcon(method.method_type);
    const statusClass = method.is_active ? 'status-active' : 'status-inactive';
    const statusText = method.is_active ? 'Active' : 'Inactive';

    return `
      <div class="payout-method">
        <div class="method-header">
          <div class="method-type">
            <div class="method-icon">${icon}</div>
            <div class="method-name">${method.method_name}</div>
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
      bank_transfer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
      paypal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10L5 19h4l1-4h3a5 5 0 0 0 5-5v0a5 5 0 0 0-5-5H7z"></path></svg>',
      crypto_wallet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12M8 9h8M8 15h8"></path></svg>',
      card: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line></svg>',
      stripe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M7 15h10m-7-7h10"></path></svg>'
    };
    return icons[type] || icons.bank_transfer;
  }

  formatMethodDetails(method) {
    let details = [];
    
    switch (method.method_type) {
      case 'bank_transfer':
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
          </div>`,
          `<div class="detail-item">
            <div class="detail-label">Routing Number</div>
            <div class="detail-value">${method.details.routing_number}</div>
          </div>`,
          `<div class="detail-item">
            <div class="detail-label">SWIFT Code</div>
            <div class="detail-value">${method.details.swift_code || 'Not set'}</div>
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
      case 'crypto_wallet':
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

  async loadNotificationPreferences() {
    try {
      console.log('[SettingsPage] Loading notification preferences from database...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        console.warn('[SettingsPage] User not authenticated, using defaults');
        this.setDefaultNotificationPreferences();
        return;
      }

      // Fetch preferences from database
      const { data, error } = await this.api.serviceClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn('[SettingsPage] No preferences found, creating defaults:', error);
        await this.createDefaultNotificationPreferences(userId);
        return;
      }

      console.log('[SettingsPage] Notification preferences loaded:', data);
      this.applyNotificationPreferences(data);
      await this.loadNotificationStats();
      
    } catch (error) {
      console.error('[SettingsPage] Failed to load notification preferences:', error);
      this.setDefaultNotificationPreferences();
    }
  }

  async createDefaultNotificationPreferences(userId) {
    try {
      const { data, error } = await this.api.serviceClient
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          // Email preferences
          email_deposits: true,
          email_withdrawals: true,
          email_trades: true,
          email_marketing: false,
          email_security: true,
          // Push preferences
          push_deposits: true,
          push_withdrawals: true,
          push_trades: true,
          push_marketing: false,
          push_security: true,
          // In-app preferences
          inapp_deposits: true,
          inapp_withdrawals: true,
          inapp_trades: true,
          inapp_marketing: false,
          inapp_security: true,
          // General preferences
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          frequency_summary: true
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (!error && data) {
        console.log('[SettingsPage] Default preferences created:', data);
        this.applyNotificationPreferences(data);
        await this.loadNotificationStats();
      }
    } catch (createError) {
      console.error('[SettingsPage] Failed to create default preferences:', createError);
      this.setDefaultNotificationPreferences();
    }
  }

  applyNotificationPreferences(preferences) {
    // Email preferences
    document.getElementById('email-deposits').checked = preferences.email_deposits;
    document.getElementById('email-withdrawals').checked = preferences.email_withdrawals;
    document.getElementById('email-trades').checked = preferences.email_trades;
    document.getElementById('email-security').checked = preferences.email_security;
    document.getElementById('email-marketing').checked = preferences.email_marketing;

    // Push preferences
    document.getElementById('push-deposits').checked = preferences.push_deposits;
    document.getElementById('push-withdrawals').checked = preferences.push_withdrawals;
    document.getElementById('push-trades').checked = preferences.push_trades;
    document.getElementById('push-security').checked = preferences.push_security;
    document.getElementById('push-marketing').checked = preferences.push_marketing;

    // In-app preferences
    document.getElementById('inapp-deposits').checked = preferences.inapp_deposits;
    document.getElementById('inapp-withdrawals').checked = preferences.inapp_withdrawals;
    document.getElementById('inapp-trades').checked = preferences.inapp_trades;
    document.getElementById('inapp-security').checked = preferences.inapp_security;
    document.getElementById('inapp-marketing').checked = preferences.inapp_marketing;

    // General preferences
    document.getElementById('quiet-hours-enabled').checked = preferences.quiet_hours_enabled;
    document.getElementById('quiet-hours-start').value = preferences.quiet_hours_start?.substring(0, 5) || '22:00';
    document.getElementById('quiet-hours-end').value = preferences.quiet_hours_end?.substring(0, 5) || '08:00';
    document.getElementById('frequency-summary').checked = preferences.frequency_summary;

    // Show/hide quiet hours config
    const quietHoursConfig = document.getElementById('quiet-hours-config');
    quietHoursConfig.style.display = preferences.quiet_hours_enabled ? 'block' : 'none';
  }

  setDefaultNotificationPreferences() {
    // Set default values when database is not available
    const defaults = {
      email_deposits: true, email_withdrawals: true, email_trades: true, email_security: true, email_marketing: false,
      push_deposits: true, push_withdrawals: true, push_trades: true, push_security: true, push_marketing: false,
      inapp_deposits: true, inapp_withdrawals: true, inapp_trades: true, inapp_security: true, inapp_marketing: false,
      quiet_hours_enabled: false, quiet_hours_start: '22:00', quiet_hours_end: '08:00', frequency_summary: true
    };
    
    this.applyNotificationPreferences(defaults);
  }

  async saveProfile() {
    console.log('🔄 saveProfile() called');
    
    try {
      // Step 1: Get form data
      const formElement = document.getElementById('profile-form');
      if (!formElement) {
        throw new Error('Profile form not found');
      }
      console.log('✅ Form element found');
      
      const formData = new FormData(formElement);
      console.log('📝 FormData created');
      
      // Step 2: Extract and log form data
      const profileData = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        bio: formData.get('bio')
      };
      
      console.log('📋 Profile data extracted:', profileData);
      
      // Step 3: Validate data
      if (!profileData.first_name || !profileData.last_name) {
        throw new Error('First name and last name are required');
      }
      console.log('✅ Data validation passed');
      
      // Step 4: Get user ID
      console.log('👤 Getting user ID...');
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      console.log('✅ User ID retrieved:', userId);
      
      // Step 5: Check API client
      if (!this.api || !this.api.serviceClient) {
        throw new Error('API client not available');
      }
      console.log('✅ API client available');
      
      // Step 6: Perform database update
      console.log('💾 Updating profile in database...');
      const { data, error } = await this.api.supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }
      
      console.log('✅ Database update successful:', data);
      
      // Step 7: Update local state
      if (this.currentUser) {
        this.currentUser.profile = { ...this.currentUser.profile, ...profileData };
        console.log('✅ Local state updated');
      }
      
      // Step 8: Update original data
      this.originalProfileData = {
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        phone: profileData.phone,
        country: profileData.country,
        bio: profileData.bio
      };
      console.log('✅ Original data updated');
      
      // Step 9: Show success message
      if (window.Notify) {
        window.Notify.success('Profile updated successfully!');
        console.log('✅ Success notification shown');
      } else {
        alert('Profile updated successfully!');
        console.log('✅ Fallback alert shown');
      }
      
      console.log('🎉 Profile save completed successfully');
      
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      if (window.Notify) {
        window.Notify.error('Failed to update profile: ' + error.message);
      } else {
        alert('Failed to update profile: ' + error.message);
      }
    }
  }

  resetProfile() {
    // Reset form to original values
    document.getElementById('first-name').value = this.originalProfileData.firstName;
    document.getElementById('last-name').value = this.originalProfileData.lastName;
    document.getElementById('phone').value = this.originalProfileData.phone;
    document.getElementById('country').value = this.originalProfileData.country;
    document.getElementById('bio').value = this.originalProfileData.bio;

    window.Notify.info('Profile reset to original values');
  }

  async saveNotifications() {
    try {
      console.log('[SettingsPage] Saving notification preferences to database...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Collect preferences from form
      const preferences = {
        user_id: userId,
        // Email preferences
        email_deposits: document.getElementById('email-deposits').checked,
        email_withdrawals: document.getElementById('email-withdrawals').checked,
        email_trades: document.getElementById('email-trades').checked,
        email_security: document.getElementById('email-security').checked,
        email_marketing: document.getElementById('email-marketing').checked,
        // Push preferences
        push_deposits: document.getElementById('push-deposits').checked,
        push_withdrawals: document.getElementById('push-withdrawals').checked,
        push_trades: document.getElementById('push-trades').checked,
        push_security: document.getElementById('push-security').checked,
        push_marketing: document.getElementById('push-marketing').checked,
        // In-app preferences
        inapp_deposits: document.getElementById('inapp-deposits').checked,
        inapp_withdrawals: document.getElementById('inapp-withdrawals').checked,
        inapp_trades: document.getElementById('inapp-trades').checked,
        inapp_security: document.getElementById('inapp-security').checked,
        inapp_marketing: document.getElementById('inapp-marketing').checked,
        // General preferences
        quiet_hours_enabled: document.getElementById('quiet-hours-enabled').checked,
        quiet_hours_start: document.getElementById('quiet-hours-start').value + ':00',
        quiet_hours_end: document.getElementById('quiet-hours-end').value + ':00',
        frequency_summary: document.getElementById('frequency-summary').checked
      };

      // Save to database using upsert
      const { data, error } = await this.api.serviceClient
        .from('notification_preferences')
        .upsert(preferences, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('[SettingsPage] Notification preferences saved:', data);
      
      if (window.Notify) {
        window.Notify.success('Notification preferences saved successfully!');
      }

    } catch (error) {
      console.error('[SettingsPage] Failed to save notification preferences:', error);
      
      if (window.Notify) {
        window.Notify.error('Failed to save notification preferences');
      }
    }
  }

  async resetNotifications() {
    try {
      console.log('[SettingsPage] Resetting notification preferences to defaults...');
      
      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Reset to defaults in database
      const defaults = {
        user_id: userId,
        // Email preferences
        email_deposits: true,
        email_withdrawals: true,
        email_trades: true,
        email_security: true,
        email_marketing: false,
        // Push preferences
        push_deposits: true,
        push_withdrawals: true,
        push_trades: true,
        push_security: true,
        push_marketing: false,
        // In-app preferences
        inapp_deposits: true,
        inapp_withdrawals: true,
        inapp_trades: true,
        inapp_security: true,
        inapp_marketing: false,
        // General preferences
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        frequency_summary: true
      };

      const { data, error } = await this.api.serviceClient
        .from('notification_preferences')
        .upsert(defaults, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('[SettingsPage] Notification preferences reset:', data);
      this.applyNotificationPreferences(data);
      
      if (window.Notify) {
        window.Notify.info('Notification preferences reset to defaults');
      }

    } catch (error) {
      console.error('[SettingsPage] Failed to reset notification preferences:', error);
      
      if (window.Notify) {
        window.Notify.error('Failed to reset notification preferences');
      }
    }
  }

  async loadNotificationStats() {
    try {
      console.log('[SettingsPage] Loading notification statistics...');
      
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        return;
      }

      // Get current notifications count
      const { data: currentData, error: currentError } = await this.api.serviceClient
        .from('notifications')
        .select('unread')
        .eq('user_id', userId);

      // Get archived notifications count
      const { data: archivedData, error: archivedError } = await this.api.serviceClient
        .from('notification_history')
        .select('id')
        .eq('user_id', userId);

      if (!currentError && !archivedError) {
        const totalNotifications = (currentData?.length || 0) + (archivedData?.length || 0);
        const unreadNotifications = currentData?.filter(n => n.unread).length || 0;
        const archivedNotifications = archivedData?.length || 0;

        // Update UI
        document.getElementById('total-notifications').textContent = totalNotifications;
        document.getElementById('unread-notifications').textContent = unreadNotifications;
        document.getElementById('archived-notifications').textContent = archivedNotifications;

        console.log('[SettingsPage] Notification stats loaded:', {
          total: totalNotifications,
          unread: unreadNotifications,
          archived: archivedNotifications
        });
      }

    } catch (error) {
      console.error('[SettingsPage] Failed to load notification stats:', error);
    }
  }

  async viewNotificationHistory() {
    try {
      console.log('[SettingsPage] Opening notification history...');
      
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get archived notifications
      const { data, error } = await this.api.serviceClient
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('archived_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      // Create modal to show history
      this.showNotificationHistoryModal(data || []);

    } catch (error) {
      console.error('[SettingsPage] Failed to load notification history:', error);
      
      if (window.Notify) {
        window.Notify.error('Failed to load notification history');
      }
    }
  }

  showNotificationHistoryModal(notifications) {
    // Create modal HTML
    const modalHTML = `
      <div class="modal-overlay" id="history-modal">
        <div class="modal history-modal">
          <div class="modal-header">
            <h3>Notification History</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="history-list">
              ${notifications.length === 0 ? 
                '<p class="no-history">No archived notifications</p>' :
                notifications.map(notification => `
                  <div class="history-item ${notification.type}">
                    <div class="history-header">
                      <div class="history-title">${notification.title}</div>
                      <div class="history-time">${new Date(notification.archived_at).toLocaleString()}</div>
                    </div>
                    <div class="history-message">${notification.message}</div>
                    <div class="history-category">${notification.category}</div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async clearAllNotifications() {
    try {
      console.log('[SettingsPage] Clearing all notifications...');
      
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Archive all current notifications
      const { error } = await this.api.serviceClient.rpc('manual_archive_notifications', {
        days_to_keep: 0
      });

      if (error) {
        throw error;
      }

      // Refresh stats
      await this.loadNotificationStats();
      
      if (window.Notify) {
        window.Notify.success('All notifications cleared and archived');
      }

    } catch (error) {
      console.error('[SettingsPage] Failed to clear notifications:', error);
      
      if (window.Notify) {
        window.Notify.error('Failed to clear notifications');
      }
    }
  }

  async exportNotifications() {
    try {
      console.log('[SettingsPage] Exporting notifications...');
      
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get all notifications (current + archived)
      const { data: currentData, error: currentError } = await this.api.serviceClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      const { data: archivedData, error: archivedError } = await this.api.serviceClient
        .from('notification_history')
        .select('*')
        .eq('user_id', userId);

      if (currentError || archivedError) {
        throw new Error('Failed to fetch notifications for export');
      }

      const allNotifications = [
        ...(currentData || []).map(n => ({ ...n, status: 'active' })),
        ...(archivedData || []).map(n => ({ ...n, status: 'archived' }))
      ];

      // Create CSV content
      const csvContent = this.createNotificationCSV(allNotifications);
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notifications_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      if (window.Notify) {
        window.Notify.success('Notifications exported successfully');
      }

    } catch (error) {
      console.error('[SettingsPage] Failed to export notifications:', error);
      
      if (window.Notify) {
        window.Notify.error('Failed to export notifications');
      }
    }
  }

  createNotificationCSV(notifications) {
    const headers = ['Date', 'Title', 'Message', 'Type', 'Category', 'Status', 'Read'];
    const rows = notifications.map(n => [
      new Date(n.created_at || n.original_created_at).toLocaleString(),
      n.title,
      n.message,
      n.type,
      n.category || 'system',
      n.status,
      n.unread ? 'No' : 'Yes'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
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
              <select class="form-input form-select" id="method-type" name="method-type" ${isEdit ? 'disabled' : ''}>
                <option value="bank_transfer" ${method?.method_type === 'bank_transfer' ? 'selected' : ''}>Bank Account</option>
                <option value="paypal" ${method?.method_type === 'paypal' ? 'selected' : ''}>PayPal</option>
                <option value="crypto_wallet" ${method?.method_type === 'crypto_wallet' ? 'selected' : ''}>Cryptocurrency</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Currency</label>
              <select class="form-input form-select" id="method-currency" name="method-currency">
                <option value="USD" ${method?.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                <option value="EUR" ${method?.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                <option value="GBP" ${method?.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound</option>
                <option value="CAD" ${method?.currency === 'CAD' ? 'selected' : ''}>CAD - Canadian Dollar</option>
                <option value="AUD" ${method?.currency === 'AUD' ? 'selected' : ''}>AUD - Australian Dollar</option>
                <option value="JPY" ${method?.currency === 'JPY' ? 'selected' : ''}>JPY - Japanese Yen</option>
                <option value="CHF" ${method?.currency === 'CHF' ? 'selected' : ''}>CHF - Swiss Franc</option>
                <option value="CNY" ${method?.currency === 'CNY' ? 'selected' : ''}>CNY - Chinese Yuan</option>
              </select>
            </div>
            
            <div id="bank-fields" class="method-fields" style="${method?.method_type === 'bank_transfer' || !method ? '' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">Account Name</label>
                <input type="text" class="form-input" id="account-name" name="account-name" value="${method?.details?.account_name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Account Number</label>
                <input type="text" class="form-input" id="account-number" name="account-number" value="${method?.details?.account_number || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Routing Number</label>
                <input type="text" class="form-input" id="routing-number" name="routing-number" value="${method?.details?.routing_number || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Bank Name</label>
                <input type="text" class="form-input" id="bank-name" name="bank-name" value="${method?.details?.bank_name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">SWIFT Code</label>
                <input type="text" class="form-input" id="swift-code" name="swift-code" value="${method?.details?.swift_code || ''}" required>
              </div>
            </div>
            
            <div id="paypal-fields" class="method-fields" style="${method?.method_type === 'paypal' ? '' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">PayPal Email</label>
                <input type="email" class="form-input" id="paypal-email" name="paypal-email" value="${method?.details?.email || ''}" required>
              </div>
            </div>
            
            <div id="crypto-fields" class="method-fields" style="${method?.method_type === 'crypto_wallet' ? '' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">Network</label>
                <select class="form-input form-select" id="crypto-network" name="crypto-network">
                  <option value="trc20" ${method?.details?.network === 'trc20' ? 'selected' : ''}>TRC20 (USDT)</option>
                  <option value="erc20" ${method?.details?.network === 'erc20' ? 'selected' : ''}>ERC20 (USDT)</option>
                  <option value="bep20" ${method?.details?.network === 'bep20' ? 'selected' : ''}>BEP20 (USDT)</option>
                  <option value="btc" ${method?.details?.network === 'btc' ? 'selected' : ''}>BTC (Bitcoin)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Wallet Address</label>
                <input type="text" class="form-input" id="wallet-address" name="wallet-address" value="${method?.details?.address || ''}" required>
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
    let fieldId = type === 'crypto_wallet' ? 'crypto-fields' : `${type}-fields`;
    const selectedFields = modal.querySelector(`#${fieldId}`);
    if (selectedFields) {
      selectedFields.style.display = 'block';
    }
  }

  async savePayoutMethod(methodId = '') {
    try {
      const modal = document.querySelector('dialog[open]');
      if (!modal) {
        console.error('❌ No open modal found');
        window.Notify.error('Modal not found. Please try again.');
        return;
      }
      
      const methodTypeSelect = modal.querySelector('#method-type');
      if (!methodTypeSelect) {
        console.error('❌ Method type select not found in modal');
        window.Notify.error('Form not loaded properly. Please try again.');
        return;
      }
      
      const methodType = methodTypeSelect.value;
      console.log('🔍 Method type found:', methodType);
      
      let methodData = {
        method_type: methodType,
        method_name: this.getMethodName(methodType),
        currency: modal.querySelector('#method-currency').value,
        is_active: true,
        is_default: false
      };

      // Collect method-specific data
      switch (methodType) {
        case 'bank_transfer':
          methodData.details = {
            account_name: modal.querySelector('#account-name').value,
            account_number: modal.querySelector('#account-number').value,
            routing_number: modal.querySelector('#routing-number').value,
            bank_name: modal.querySelector('#bank-name').value,
            swift_code: modal.querySelector('#swift-code').value
          };
          break;
        case 'paypal':
          methodData.details = {
            email: modal.querySelector('#paypal-email').value,
            account_id: 'paypal_' + Date.now()
          };
          break;
        case 'crypto_wallet':
          const cryptoNetwork = modal.querySelector('#crypto-network');
          const walletAddress = modal.querySelector('#wallet-address');
          console.log('🔍 Crypto network element:', cryptoNetwork);
          console.log('🔍 Crypto network value:', cryptoNetwork?.value);
          console.log('🔍 Wallet address element:', walletAddress);
          console.log('🔍 Wallet address value:', walletAddress?.value);
          
          const networkValue = cryptoNetwork?.value || '';
          const addressValue = walletAddress?.value || '';
          
          methodData.details = {
            network: networkValue,
            address: addressValue
          };
          break;
      }

      // Validate required fields
      if (!this.validatePayoutMethod(methodData)) {
        return;
      }

      // Get current user ID
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Add user_id to methodData
      methodData.user_id = userId;

      console.log('💾 Saving payout method BEFORE any transformation:', methodData);
      console.log('🔍 MethodType from form:', methodType);
      console.log('🔍 Modal element:', modal);

      let data, error;
      if (methodId) {
        // Update existing method
        ({ data, error } = await this.api.supabase
          .from('payout_methods')
          .update(methodData)
          .eq('id', methodId)
          .select()
          .single());
      } else {
        // Create new method
        ({ data, error } = await this.api.supabase
          .from('payout_methods')
          .insert(methodData)
          .select()
          .single());
      }

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
    console.log('🔍 Validating payout method:', methodData);
    console.log('🔍 methodData keys:', Object.keys(methodData));
    console.log('🔍 methodData.type:', methodData.type);
    console.log('🔍 methodData.method_type:', methodData.method_type);
    console.log('🔍 methodData.name:', methodData.name);
    
    // Basic validation
    if (!methodData.method_type || !methodData.details || !methodData.currency) {
      console.error('❌ Missing method_type, details, or currency:', { method_type: methodData.method_type, details: methodData.details, currency: methodData.currency });
      window.Notify.error('Please fill in all required fields');
      return false;
    }

    // Type-specific validation
    switch (methodData.method_type) {
      case 'bank_transfer':
        if (!methodData.details.account_name || !methodData.details.account_number || 
            !methodData.details.routing_number || !methodData.details.bank_name) {
          console.error('❌ Missing bank details:', methodData.details);
          window.Notify.error('Please fill in all bank account details');
          return false;
        }
        break;
      case 'paypal':
        if (!methodData.details.email || !methodData.details.email.includes('@')) {
          console.error('❌ Invalid PayPal email:', methodData.details.email);
          window.Notify.error('Please enter a valid PayPal email');
          return false;
        }
        break;
      case 'crypto_wallet':
        if (!methodData.details.network || !methodData.details.address) {
          console.error('❌ Missing crypto details:', methodData.details);
          window.Notify.error('Please fill in all cryptocurrency details');
          return false;
        }
        break;
    }

    console.log('✅ Payout method validation passed');
    return true;
  }

  getMethodName(type) {
    const names = {
      bank_transfer: 'Bank Transfer',
      paypal: 'PayPal',
      crypto_wallet: 'Cryptocurrency Wallet',
      card: 'Card',
      stripe: 'Stripe'
    };
    return names[type] || 'Unknown';
  }

  async togglePayoutMethod(methodId) {
    try {
      const method = this.payoutMethods.find(m => m.id === methodId);
      if (!method) return;

      const { data, error } = await this.api.supabase
        .from('payout_methods')
        .update({ is_active: !method.is_active })
        .eq('id', methodId)
        .select()
        .single();

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

      // Save to localStorage for now
      localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
      console.log('Security settings saved locally:', securitySettings);
      
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
              <input type="password" class="form-input" id="current-password" name="current-password" required>
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" class="form-input" id="new-password" name="new-password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input type="password" class="form-input" id="confirm-password" name="confirm-password" required>
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
    
    // Add form submit event listener
    const passwordForm = modal.querySelector('#password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updatePassword();
      });
    }
    
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

      // Implement actual password change via Supabase Auth
      console.log('🔄 Updating password via Supabase Auth...');
      
      // Get current user
      const { data: { user }, error: userError } = await this.api.supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      console.log('👤 User authenticated:', user.email);
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await this.api.supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        console.error('❌ Current password verification failed:', signInError);
        throw new Error('Current password is incorrect');
      }
      
      console.log('✅ Current password verified');
      
      // Update password
      const { error: updateError } = await this.api.supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        console.error('❌ Password update failed:', updateError);
        throw new Error('Failed to update password: ' + updateError.message);
      }
      
      console.log('✅ Password updated successfully');
      
      modal.close();
      window.Notify.success('Password updated successfully! Please use your new password for future logins.');
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
