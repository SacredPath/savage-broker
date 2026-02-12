/**
 * App Shell Controller
 * Handles navigation, user menu, notifications, and responsive behavior
 */

import { AuthStateManager } from './authStateManager.js';

class AppShell {
  constructor() {
    if (window.__SHELL_INIT__) {
      console.log('App shell already initialized');
      return;
    }
    window.__SHELL_INIT__ = true;

    this.currentUser = null;
    this.notifications = [];
    this.isNotificationPanelOpen = false;
    this.currentPage = this.getCurrentPage();
    this.init();
    this.setupOverlayClickHandler();
  }

  async init() {
    console.log('App shell initializing...');
    
    // PRIORITY UI BINDING: Setup event listeners immediately before any async calls
    this.bindCoreUIEvents();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupShell());
    } else {
      this.setupShell();
    }
  }

  bindCoreUIEvents() {
    // Prevent duplicate initialization
    if (window.__SHELL_INIT__) {
      console.log('App shell already initialized');
      return;
    }
    window.__SHELL_INIT__ = true;
    
    console.log('Binding core UI events...');
    
    // Setup sidebar toggle immediately
    const sidebarToggles = document.querySelectorAll('[data-action="sidebar-toggle"]');
    console.log('Found sidebar toggles:', sidebarToggles.length);
    sidebarToggles.forEach((toggle, index) => {
      console.log(`Binding toggle ${index}:`, toggle);
      toggle.addEventListener('click', (e) => {
        console.log('Sidebar toggle clicked directly');
        e.preventDefault();
        this.toggleSidebar();
      });
    });
    
    // Setup theme toggle immediately
    const themeToggles = document.querySelectorAll('[data-action="theme-toggle"]');
    themeToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTheme();
      });
    });
    
    // SINGLE DELEGATED NAVIGATION HANDLER
    const sidebar = document.querySelector('[data-role="sidebar"]');
    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('a[href], [data-href]');
        if (!link) return;
        
        const href = link.getAttribute('href') || link.getAttribute('data-href');
        if (!href || href === '#') return;
        
        const isMobile = window.innerWidth <= 1024;
        const sidebarOpen = document.documentElement.classList.contains('sidebar-open');
        
        console.debug('NAV_CLICK', { href, isMobile, sidebarOpen });
        
        // Allow default navigation for external links
        if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          return;
        }
        
        // Handle internal navigation
        e.preventDefault();
        
        // Close sidebar on mobile after navigation
        if (isMobile && sidebarOpen) {
          this.closeSidebar();
        }
        
        // Navigate
        window.location.href = href;
      });
    }
    
    // Also handle desktop nav and mobile nav with delegation
    ['desktop-nav', 'mobile-nav'].forEach(navId => {
      const nav = document.getElementById(navId);
      if (nav) {
        nav.addEventListener('click', (e) => {
          const link = e.target.closest('a[href], [data-href]');
          if (!link) return;
          
          const href = link.getAttribute('href') || link.getAttribute('data-href');
          if (!href || href === '#') return;
          
          console.debug('NAV_CLICK', { href, source: navId });
          
          // Allow default for external links
          if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
          }
          
          e.preventDefault();
          window.location.href = href;
        });
      }
    });
    
    console.log('Core UI events bound successfully');
  }

  setupCoreUI() {
    console.log('Setting up core UI interactivity...');
    
    // Setup core UI components that don't depend on data
    // Note: Theme toggle event listeners are already handled by bindCoreUIEvents()
    this.initializeTheme(); // Initialize theme state
    this.setupResponsiveBehavior();
    
    console.log('Core UI setup complete');
  }

  async setupShell() {
    // Setup core UI immediately - this ensures sidebar/theme work even if API fails
    this.setupCoreUI();
    
    // Set up auth state listener to prevent re-initialization
    this.setupAuthStateListener();
    
    // Handle data-dependent components separately
    try {
      console.log('Setting up data-dependent components...');
      
      // Check authentication (may fail)
      await this.checkAuthentication();
      
      // Setup data-dependent components
      this.setupNavigation();
      this.setupUserMenu();
      this.setupNotifications();
      this.updateActiveNavigation();
      
      console.log('Data-dependent setup complete');
    } catch (error) {
      console.error('Error in data-dependent setup:', error);
      
      // Show soft error state instead of crashing
      this.showConnectionError(error);
      
      // Still try to setup basic navigation without authentication
      try {
        this.setupNavigation();
        this.updateActiveNavigation();
      } catch (navError) {
        console.error('Navigation setup also failed:', navError);
      }
    }
  }

  setupAuthStateListener() {
    // Listen to auth state changes but don't re-initialize
    AuthStateManager.addListener(async (event, session, previousState) => {
      console.log('AppShell: Auth state changed:', event, session?.user?.email);
      
      // Only update user display, don't re-initialize entire shell
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUser = session.user;
        this.updateUserDisplay();
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        // Redirect to login
        window.location.href = '/src/pages/login.html';
      }
    }, {
      id: 'appShell',
      immediate: true
    });
  }

  showConnectionError(error) {
    // Create a connection error banner in the main content area
    const mainContent = document.querySelector('.app-main, main, .main-content');
    if (mainContent) {
      const errorBanner = document.createElement('div');
      errorBanner.className = 'connection-error-banner';
      errorBanner.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--error-color, #ff6b6b);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h3>Connection Error</h3>
          <p>Unable to connect to the server. Some features may be unavailable.</p>
          <p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">
            ${error.message || 'Please check your internet connection and try again.'}
          </p>
          <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 16px;">
            Retry Connection
          </button>
        </div>
      `;
      
      // Clear existing content and show error
      mainContent.innerHTML = '';
      mainContent.appendChild(errorBanner);
    }
    
    // Also show a toast notification if available
    if (window.Notify) {
      window.Notify.error('Connection error: Some features may be unavailable');
    }
  }

  async checkAuthentication() {
    try {
      const user = await window.AuthService.getCurrentUserWithProfile();
      
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '/src/pages/login.html';
        return false;
      }
      
      this.currentUser = user;
      this.updateUserDisplay();
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      window.location.href = '/src/pages/login.html';
      return false;
    }
  }

  setupNavigation() {
    // Remove individual nav link listeners - use delegation instead
    // Navigation is now handled by the delegated handler in bindCoreUIEvents
    console.log('Navigation setup complete - using delegated handlers');
  }

  setupMobileMenuToggle() {
    // Handle overlay click to close sidebar
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-role="sidebar-overlay"]')) {
        console.log('Sidebar Overlay Clicked');
        this.closeSidebar();
        return;
      }
    });

    // Handle ESC key to close sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const html = document.documentElement;
        
        if (html.classList.contains('sidebar-open')) {
          console.log('ESC: Closing Sidebar');
          this.closeSidebar();
        }
      }
    });
  }

  toggleSidebar() {
    console.log('toggleSidebar called');
    console.log('Current classes:', document.documentElement.classList.toString());
    
    const html = document.documentElement;
    const sidebar = document.querySelector('[data-role="sidebar"]');
    const overlay = document.querySelector('[data-role="sidebar-overlay"]');
    
    if (!sidebar || !overlay) {
        console.error('Sidebar or overlay not found in DOM');
        console.log('Sidebar found:', !!sidebar);
        console.log('Overlay found:', !!overlay);
        return;
    }

    const isOpen = html.classList.contains('sidebar-open');
    console.log('Sidebar is currently open:', isOpen);

    if (isOpen) {
        this.closeSidebar();
    } else {
        // Open sidebar
        html.classList.add('sidebar-open');
        // Optional: force focus management or trap focus
        sidebar.focus?.();
        console.log('Sidebar → opened');
    }
  }

  closeSidebar() {
    const html = document.documentElement;
    const sidebar = document.querySelector('[data-role="sidebar"]');
    const overlay = document.querySelector('[data-role="sidebar-overlay"]');
    
    html.classList.remove('sidebar-open');
    console.log('Sidebar closed');
  }

  // Add overlay click handler
  setupOverlayClickHandler() {
    const overlay = document.querySelector('[data-role="sidebar-overlay"]');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeSidebar();
      });
    }
  }

  navigateTo(href) {
    // Preserve session by just changing location
    window.location.href = href;
  }

  getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop()?.replace('.html', '') || 'home';
  }

  updateActiveNavigation() {
    const page = this.currentPage;
    
    // Update all navigation links
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .side-nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      const linkPage = link.getAttribute('data-page');
      if (linkPage === page) {
        link.classList.add('active');
      }
    });
  }

  setupUserMenu() {
    // Use event delegation for dynamic content
    document.addEventListener('click', (e) => {
      // Handle user menu button click
      if (e.target.closest('#user-menu-btn')) {
        e.stopPropagation();
        this.toggleUserDropdown();
        return;
      }

      // Handle logout button click
      if (e.target.closest('#logout-btn')) {
        e.preventDefault();
        this.handleLogout();
        return;
      }

      // Close dropdown when clicking outside
      if (!e.target.closest('.user-menu')) {
        this.closeUserDropdown();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeUserDropdown();
      }
    });
  }

  toggleUserDropdown() {
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userDropdown?.classList.contains('show')) {
      this.closeUserDropdown();
    } else {
      userDropdown?.classList.add('show');
    }
  }

  closeUserDropdown() {
    const userDropdown = document.getElementById('user-dropdown');
    userDropdown?.classList.remove('show');
  }

  updateUserDisplay() {
    if (!this.currentUser) return;

    const user = this.currentUser;
    const displayName = user.profile?.display_name || 
                      user.email?.split('@')[0] || 
                      'User';

    // Update top bar user info
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (userName) userName.textContent = displayName;
    if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();

    // Update dropdown user info
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownEmail = document.getElementById('dropdown-email');
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    
    if (dropdownName) dropdownName.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = user.email || '';
    if (dropdownAvatar) dropdownAvatar.textContent = displayName.charAt(0).toUpperCase();
  }

  async handleLogout() {
    try {
      await window.AuthService.logout();
      // Redirect to login page
      window.location.href = '/src/pages/login.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Use new toast system
      if (window.toast) {
        window.toast.error('Logout failed');
      }
    }
  }

  setupNotifications() {
    const notificationBell = document.getElementById('notification-bell');
    const notificationPanel = document.getElementById('notification-panel');
    const closeNotifications = document.getElementById('close-notifications');

    if (notificationBell) {
      notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationPanel();
      });
    }

    if (closeNotifications) {
      closeNotifications.addEventListener('click', () => {
        this.closeNotificationPanel();
      });
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-bell') && !e.target.closest('.notification-panel')) {
        this.closeNotificationPanel();
      }
    });

    // Load initial notifications only if UI isn't already populated
    const notificationList = document.getElementById('notification-list');
    if (!notificationList || notificationList.children.length === 0) {
      this.loadNotifications();
    }
  }

  toggleNotificationPanel() {
    if (this.isNotificationPanelOpen) {
      this.closeNotificationPanel();
    } else {
      this.openNotificationPanel();
    }
  }

  openNotificationPanel() {
    const notificationPanel = document.getElementById('notification-panel');
    
    notificationPanel?.classList.add('show');
    this.isNotificationPanelOpen = true;
    
    // Mark notifications as read
    this.markNotificationsAsRead();
  }

  closeNotificationPanel() {
    const notificationPanel = document.getElementById('notification-panel');
    
    notificationPanel?.classList.remove('show');
    this.isNotificationPanelOpen = false;
  }

  async loadNotifications() {
    try {
      const API_BASE = '/api/v1';
      const response = await fetch(`${API_BASE}/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.notifications = data.notifications || [];
      this.updateNotificationBadge();
      this.renderNotifications();
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.notifications = [];
      this.updateNotificationBadge();
      this.renderNotifications();
    }
  }

  
  updateNotificationBadge() {
    const unreadCount = this.notifications.filter(n => n.unread).length;
    const badge = document.getElementById('notification-count');
    
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  renderNotifications() {
    const notificationList = document.getElementById('notification-list');
    
    if (!notificationList) return;

    if (this.notifications.length === 0) {
      notificationList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>No notifications</p>
        </div>
      `;
      return;
    }

    notificationList.innerHTML = this.notifications.map(notification => `
      <div class="notification-item ${notification.unread ? 'unread' : ''}" data-id="${notification.id}">
        <div class="notification-header-info">
          <div>
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
          </div>
          <div class="notification-time">${notification.time}</div>
        </div>
      </div>
    `).join('');
  }

  markNotificationsAsRead() {
    this.notifications.forEach(notification => {
      notification.unread = false;
    });
    this.updateNotificationBadge();
    this.renderNotifications();
  }

  setupThemeToggle() {
    // Use event delegation to avoid timing issues
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="theme-toggle"]')) {
        const newTheme = this.toggleTheme();
        console.log('Theme changed to:', newTheme);
        return;
      }
    });

    // Initialize theme from localStorage on page load
    this.initializeTheme();
  }

  initializeTheme() {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.classList.toggle('theme-light', savedTheme === 'light');
    document.documentElement.classList.toggle('theme-dark', savedTheme === 'dark');
    
    // Update theme toggle icon
    this.updateThemeToggleIcon(savedTheme);
    
    console.log('Theme changed to:', savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Update theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update CSS classes for compatibility
    document.documentElement.classList.toggle('theme-light', newTheme === 'light');
    document.documentElement.classList.toggle('theme-dark', newTheme === 'dark');
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle icon
    this.updateThemeToggleIcon(newTheme);
    
    return newTheme;
  }

  updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
      if (theme === 'light') {
        themeToggle.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
      } else {
        themeToggle.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
      }
    }
  }

  setupResponsiveBehavior() {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Initial responsive setup
    this.handleResize();
  }

  handleResize() {
    const width = window.innerWidth;
    
    if (width > 1024) {
      // Desktop: sidebar behavior depends on state
      // Keep current sidebar state on desktop
      console.log('Desktop mode - sidebar state preserved');
    } else {
      // Mobile/tablet: preserve sidebar state (don't auto-close)
      console.log('Mobile mode - sidebar state preserved');
    }
  }

  // Public methods for other components to use
  addNotification(notification) {
    this.notifications.unshift({
      ...notification,
      id: Date.now(),
      time: 'Just now',
      unread: true
    });
    
    this.updateNotificationBadge();
    this.renderNotifications();
  }

  showSuccessNotification(title, message) {
    this.addNotification({
      type: 'success',
      title,
      message
    });
  }

  showErrorNotification(title, message) {
    this.addNotification({
      type: 'error',
      title,
      message
    });
  }

  showInfoNotification(title, message) {
    this.addNotification({
      type: 'info',
      title,
      message
    });
  }

  // Standardized initialization method for all pages
  initShell() {
    // Prevent duplicate initialization
    if (window.__SHELL_INIT__) {
      console.log('App shell already initialized');
      return;
    }
    
    console.log('Initializing shell...');
    this.bindCoreUIEvents();
    this.setupShell();
  }

  // Cleanup method
  destroy() {
    console.log('App shell cleanup');
    
    // Event listeners are handled with delegation, no explicit cleanup needed
    // The browser will clean up when the page unloads
  }
}

// Initialize app shell
window.AppShell = new AppShell();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppShell;
}
