/**
 * Notification Controller
 * Handles sending notifications to individual users
 */

class NotificationController {
  constructor() {
    this.selectedUsers = [];
    this.searchResults = [];
    this.searchTimeout = null;
    this.notificationHistory = [];
    this.init();
  }

  async init() {
    console.log('Notification controller initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Check backoffice authentication first
      const hasAccess = await window.BackOfficeAuth.protectRoute();
      if (!hasAccess) {
        return;
      }
      
      // Load user data and update display
      await window.BackOfficeAuth.updateUserDisplay();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load notification history
      await this.loadNotificationHistory();
      
      console.log('Notification controller setup complete');
    } catch (error) {
      console.error('Error setting up notification controller:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load notification system');
      }
    }
  }

  setupEventListeners() {
    // User search
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleUserSearch(e.target.value));
      searchInput.addEventListener('focus', () => this.showSearchResults());
      searchInput.addEventListener('blur', () => {
        setTimeout(() => this.hideSearchResults(), 200);
      });
    }

    // Notification form submission
    const form = document.getElementById('notification-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleNotificationSubmit(e));
    }

    // Notification type selection
    const typeInputs = document.querySelectorAll('input[name="notification-type"]');
    typeInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleTypeSelection(e.target));
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-search')) {
        this.hideSearchResults();
      }
    });
  }

  async handleUserSearch(query) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Don't search for empty queries
    if (query.length < 2) {
      this.hideSearchResults();
      return;
    }

    // Debounce search
    this.searchTimeout = setTimeout(async () => {
      try {
        await this.searchUsers(query);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    }, 300);
  }

  async searchUsers(query) {
    try {
      const client = await window.authService.supabaseClient.getClient();
      
      // Search users by email or name
      const { data, error } = await client
        .from('profiles')
        .select('id, email, first_name, last_name, display_name, role')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,display_name.ilike.%${query}%`)
        .eq('role', 'user') // Only search for regular users
        .limit(10)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.searchResults = data || [];
      this.renderSearchResults();
    } catch (error) {
      console.error('Error searching users:', error);
      this.searchResults = [];
      this.renderSearchResults();
    }
  }

  renderSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    if (this.searchResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="search-result-item" style="color: rgba(255, 255, 255, 0.5); text-align: center;">
          No users found
        </div>
      `;
    } else {
      resultsContainer.innerHTML = this.searchResults.map(user => `
        <div class="search-result-item" onclick="window.notificationController.selectUser('${user.id}')">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar" style="width: 24px; height: 24px; font-size: 10px;">
              ${this.getUserInitials(user)}
            </div>
            <div>
              <div style="font-size: 14px; color: white; font-weight: 500;">
                ${this.getDisplayName(user)}
              </div>
              <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7);">
                ${user.email}
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    this.showSearchResults();
  }

  selectUser(userId) {
    const user = this.searchResults.find(u => u.id === userId);
    if (!user) return;

    // Check if user is already selected
    if (this.selectedUsers.find(u => u.id === userId)) {
      return;
    }

    // Add to selected users
    this.selectedUsers.push(user);
    this.renderSelectedUsers();

    // Clear search
    document.getElementById('user-search').value = '';
    this.hideSearchResults();
  }

  removeUser(userId) {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== userId);
    this.renderSelectedUsers();
  }

  renderSelectedUsers() {
    const container = document.getElementById('selected-users');
    if (!container) return;

    if (this.selectedUsers.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.selectedUsers.map(user => `
      <div class="selected-user">
        <div class="selected-user-info">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
            ${this.getUserInitials(user)}
          </div>
          <div class="user-details">
            <div class="user-name">${this.getDisplayName(user)}</div>
            <div class="user-email">${user.email}</div>
          </div>
        </div>
        <button class="remove-user" onclick="window.notificationController.removeUser('${user.id}')">
          Remove
        </button>
      </div>
    `).join('');
  }

  handleTypeSelection(selectedInput) {
    // Update visual selection
    const typeLabels = document.querySelectorAll('.notification-type');
    typeLabels.forEach(label => {
      const input = label.querySelector('input[type="radio"]');
      if (input === selectedInput) {
        label.classList.add('selected');
      } else {
        label.classList.remove('selected');
      }
    });
  }

  async handleNotificationSubmit(e) {
    e.preventDefault();

    if (this.selectedUsers.length === 0) {
      if (window.Notify) {
        window.Notify.error('Please select at least one user');
      }
      return;
    }

    const title = document.getElementById('notification-title').value.trim();
    const message = document.getElementById('notification-message').value.trim();
    const type = document.querySelector('input[name="notification-type"]:checked').value;

    if (!title || !message) {
      if (window.Notify) {
        window.Notify.error('Please fill in all fields');
      }
      return;
    }

    this.setLoading(true);

    try {
      await this.sendNotifications(this.selectedUsers, title, message, type);
      
      if (window.Notify) {
        window.Notify.success(`Notification sent to ${this.selectedUsers.length} user(s)`);
      }

      // Reset form
      this.resetForm();
      
      // Reload notification history
      await this.loadNotificationHistory();
      
    } catch (error) {
      console.error('Error sending notifications:', error);
      if (window.Notify) {
        window.Notify.error('Failed to send notification');
      }
    } finally {
      this.setLoading(false);
    }
  }

  async sendNotifications(users, title, message, type) {
    const client = await window.authService.supabaseClient.getClient();
    const notifications = [];

    for (const user of users) {
      notifications.push({
        user_id: user.id,
        title: title,
        message: message,
        type: type,
        sent_by: (await window.authService.getCurrentUserWithProfile()).profile.id,
        created_at: new Date().toISOString(),
        read: false
      });
    }

    const { data, error } = await client
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      throw error;
    }

    return data;
  }

  async loadNotificationHistory() {
    try {
      const client = await window.authService.supabaseClient.getClient();
      
      const { data, error } = await client
        .from('notifications')
        .select(`
          *,
          profiles!notifications_user_id_fkey (
            email,
            first_name,
            last_name,
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      this.notificationHistory = data || [];
      this.renderNotificationHistory();
    } catch (error) {
      console.error('Error loading notification history:', error);
      this.notificationHistory = [];
      this.renderNotificationHistory();
    }
  }

  renderNotificationHistory() {
    const container = document.getElementById('notification-list');
    if (!container) return;

    if (this.notificationHistory.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <h3>No notifications sent</h3>
          <p>Notifications you send will appear here</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notificationHistory.map(notification => `
      <div class="notification-item">
        <div class="notification-header">
          <div class="notification-meta">
            <span class="notification-type-badge type-${notification.type}">
              ${notification.type}
            </span>
            <span class="notification-time">
              ${this.formatTime(notification.created_at)}
            </span>
          </div>
        </div>
        <div class="notification-content">
          <strong>${notification.title}</strong><br>
          ${notification.message}
        </div>
        <div class="notification-recipients">
          Sent to: ${this.getRecipientInfo(notification.profiles)}
        </div>
      </div>
    `).join('');
  }

  getRecipientInfo(profile) {
    if (!profile) return 'Unknown User';
    return this.getDisplayName(profile);
  }

  getDisplayName(user) {
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    return user.email;
  }

  getUserInitials(user) {
    const name = this.getDisplayName(user);
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  showSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.classList.add('active');
    }
  }

  hideSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.classList.remove('active');
    }
  }

  setLoading(isLoading) {
    const sendBtn = document.getElementById('send-btn');
    const btnText = document.getElementById('btn-text');
    
    if (sendBtn && btnText) {
      sendBtn.disabled = isLoading;
      if (isLoading) {
        btnText.innerHTML = '<span class="loading-spinner"></span>Sending...';
      } else {
        btnText.textContent = 'Send Notification';
      }
    }
  }

  resetForm() {
    // Clear selected users
    this.selectedUsers = [];
    this.renderSelectedUsers();
    
    // Clear form fields
    document.getElementById('notification-title').value = '';
    document.getElementById('notification-message').value = '';
    document.getElementById('user-search').value = '';
    
    // Reset notification type to info
    const infoInput = document.querySelector('input[name="notification-type"][value="info"]');
    if (infoInput) {
      infoInput.checked = true;
      this.handleTypeSelection(infoInput);
    }
  }
}

// Initialize notification controller
window.notificationController = new NotificationController();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationController;
}
