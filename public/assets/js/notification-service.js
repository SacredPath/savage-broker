/**
 * Notification Service
 * Handles user notifications with real-time updates and management
 */

class NotificationService {
  constructor() {
    this.currentUser = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.pollingInterval = null;
    this.pollingFrequency = 30000; // 30 seconds
    this.api = null;
    this.isPolling = false;
    this.lastPoll = null;
    this.callbacks = {
      onNewNotification: [],
      onReadCountChange: [],
      onNotificationsUpdate: []
    };
    this.init();
  }

  async init() {
    // Wait for API client to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!window.API && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.API) {
      this.api = window.API;
      console.log('[NotificationService] API client connected');
    } else {
      console.error('[NotificationService] API client not available after timeout');
      return;
    }

    // Wait for auth to be available
    await this.waitForAuth();
  }

  async waitForAuth() {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    
    // Wait for AuthStateManager (not AuthService)
    while (!window.AuthStateManager && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (window.AuthStateManager) {
      // Listen for auth state changes using AuthStateManager
      window.AuthStateManager.addListener((authState, user) => {
        this.handleAuthStateChange(user);
      });
    }
  }

  handleAuthStateChange(user) {
    if (user && user !== this.currentUser) {
      this.currentUser = user;
      this.startPolling();
      this.loadInitialData();
    } else if (!user) {
      this.currentUser = null;
      this.stopPolling();
      this.resetData();
    }
  }

  async loadInitialData() {
    if (!this.currentUser) return;

    try {
      // Load unread count
      this.unreadCount = await this.api.getUnreadCount(this.currentUser.id);
      this.notifyCallbacks('onReadCountChange', this.unreadCount);

      // Load recent notifications
      this.notifications = await this.api.getNotifications(this.currentUser.id, { limit: 20 });
      this.notifyCallbacks('onNotificationsUpdate', this.notifications);

      console.log('[NotificationService] Initial data loaded:', {
        unreadCount: this.unreadCount,
        notificationsCount: this.notifications.length
      });
    } catch (error) {
      console.error('[NotificationService] Failed to load initial data:', error);
    }
  }

  startPolling() {
    if (this.isPolling || !this.currentUser) return;

    console.log('[NotificationService] Starting polling for notifications');
    this.isPolling = true;
    
    // Poll immediately
    this.pollNotifications();
    
    // Then set up interval
    this.pollingInterval = setInterval(() => {
      this.pollNotifications();
    }, this.pollingFrequency);
  }

  stopPolling() {
    if (!this.isPolling) return;

    console.log('[NotificationService] Stopping polling');
    this.isPolling = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async pollNotifications() {
    if (!this.currentUser || !this.api) return;

    try {
      const currentUnreadCount = await this.api.getUnreadCount(this.currentUser.id);
      
      // Check if we have new notifications
      if (currentUnreadCount > this.unreadCount) {
        const newNotifications = await this.api.getNotifications(
          this.currentUser.id, 
          { limit: currentUnreadCount - this.unreadCount, unreadOnly: true }
        );

        // Notify about new notifications
        newNotifications.forEach(notification => {
          this.notifyCallbacks('onNewNotification', notification);
        });

        // Update unread count
        this.unreadCount = currentUnreadCount;
        this.notifyCallbacks('onReadCountChange', this.unreadCount);

        // Refresh notifications list
        this.notifications = await this.api.getNotifications(this.currentUser.id, { limit: 20 });
        this.notifyCallbacks('onNotificationsUpdate', this.notifications);

        console.log('[NotificationService] New notifications detected:', newNotifications.length);
      } else if (currentUnreadCount < this.unreadCount) {
        // User marked some as read elsewhere
        this.unreadCount = currentUnreadCount;
        this.notifyCallbacks('onReadCountChange', this.unreadCount);
      }

      this.lastPoll = new Date();
    } catch (error) {
      console.error('[NotificationService] Failed to poll notifications:', error);
    }
  }

  async markAsRead(notificationId) {
    if (!this.api) return;

    try {
      await this.api.markNotificationAsRead(notificationId);
      
      // Update local data
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.is_read = true;
        notification.read_at = new Date().toISOString();
      }

      // Update unread count
      if (this.unreadCount > 0) {
        this.unreadCount--;
        this.notifyCallbacks('onReadCountChange', this.unreadCount);
      }

      console.log('[NotificationService] Notification marked as read:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Failed to mark notification as read:', error);
    }
  }

  async markAllAsRead() {
    if (!this.api) return;

    try {
      await this.api.markAllAsRead(this.currentUser.id);
      
      // Update local data
      this.notifications.forEach(notification => {
        notification.is_read = true;
        notification.read_at = new Date().toISOString();
      });

      // Update unread count
      this.unreadCount = 0;
      this.notifyCallbacks('onReadCountChange', this.unreadCount);
      this.notifyCallbacks('onNotificationsUpdate', this.notifications);

      console.log('[NotificationService] All notifications marked as read');
    } catch (error) {
      console.error('[NotificationService] Failed to mark all as read:', error);
    }
  }

  async archiveNotification(notificationId) {
    if (!this.api) return;

    try {
      await this.api.archiveNotification(notificationId);
      
      // Remove from local data
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.notifyCallbacks('onNotificationsUpdate', this.notifications);

      console.log('[NotificationService] Notification archived:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Failed to archive notification:', error);
    }
  }

  async loadMoreNotifications(offset = 20, limit = 20) {
    if (!this.api) return [];

    try {
      const moreNotifications = await this.api.getNotifications(this.currentUser.id, { offset, limit });
      
      // Append to existing notifications
      this.notifications = [...this.notifications, ...moreNotifications];
      this.notifyCallbacks('onNotificationsUpdate', this.notifications);

      console.log('[NotificationService] Loaded more notifications:', moreNotifications.length);
      return moreNotifications;
    } catch (error) {
      console.error('[NotificationService] Failed to load more notifications:', error);
      return [];
    }
  }

  // Callback management
  onNewNotification(callback) {
    this.callbacks.onNewNotification.push(callback);
  }

  onReadCountChange(callback) {
    this.callbacks.onReadCountChange.push(callback);
  }

  onNotificationsUpdate(callback) {
    this.callbacks.onNotificationsUpdate.push(callback);
  }

  notifyCallbacks(event, data) {
    const callbacks = this.callbacks[event] || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[NotificationService] Error in ${event} callback:`, error);
      }
    });
  }

  resetData() {
    this.notifications = [];
    this.unreadCount = 0;
    this.notifyCallbacks('onReadCountChange', 0);
    this.notifyCallbacks('onNotificationsUpdate', []);
  }

  // Getters
  getUnreadCount() {
    return this.unreadCount;
  }

  getNotifications() {
    return this.notifications;
  }

  getUnreadNotifications() {
    return this.notifications.filter(n => !n.is_read);
  }

  isPollingActive() {
    return this.isPolling;
  }

  getLastPollTime() {
    return this.lastPoll;
  }
}

// Create singleton instance
window.NotificationService = new NotificationService();

// Make it globally available
export default window.NotificationService;
