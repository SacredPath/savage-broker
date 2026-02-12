/**
 * Index Page Controller
 * Each HTML page loads only its page controller
 * All page controllers call api.js only (no inline fetch)
 */

class IndexPage {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Index page initializing...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Initialize app shell (sidebar, navigation, etc.)
      if (window.AppShell) {
        window.AppShell.initShell();
      }
      
      // Setup UI components
      this.setupThemeToggle();
      this.setupAuthButton();
      this.setupHeroActions();
      this.setupNavigation();
      
      // Load initial data
      await this.loadStats();
      
      // Setup periodic updates
      this.setupPeriodicUpdates();
      
      console.log('Index page setup complete');
    } catch (error) {
      console.error('Error setting up index page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load page properly');
      }
    }
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      const newTheme = window.UI ? window.UI.toggleTheme() : this.toggleTheme();
      console.log('Theme changed to:', newTheme);
    });
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Theme changed to:', newTheme);
    return newTheme;
  }

  async setupAuthButton() {
    const authButton = document.getElementById('auth-button');
    if (!authButton) return;

    authButton.addEventListener('click', async () => {
      try {
        // Check current auth status using new auth service
        const user = await window.AuthService.getCurrentUserWithProfile();
        
        if (user) {
          // User is logged in, show profile options
          await this.showProfileMenu(user);
        } else {
          // User is not logged in, redirect to login
          window.location.href = '/login.html';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
      }
    });

    // Update button text based on auth status
    this.updateAuthButton();
  }

  async updateAuthButton() {
    const authButton = document.getElementById('auth-button');
    if (!authButton) return;

    try {
      const user = await window.AuthService.getCurrentUserWithProfile();
      if (user) {
        authButton.textContent = user.profile?.display_name || user.email?.split('@')[0] || 'Profile';
        authButton.className = 'btn btn-secondary btn-sm';
      } else {
        authButton.textContent = 'Sign In';
        authButton.className = 'btn btn-primary btn-sm';
      }
    } catch (error) {
      authButton.textContent = 'Sign In';
      authButton.className = 'btn btn-primary btn-sm';
    }
  }

  async showProfileMenu(user) {
    if (!window.UI) return;

    const modalId = window.UI.createModal({
      title: 'Profile',
      body: `
        <div class="profile-menu">
          <div class="profile-header">
            <div class="profile-avatar">
              <div class="avatar-placeholder">
                ${(user.profile?.display_name || user.email?.charAt(0) || 'U').toUpperCase()}
              </div>
            </div>
            <div class="profile-info">
              <h3>${user.profile?.display_name || 'User'}</h3>
              <p>${user.email}</p>
              <p class="profile-role">Role: ${user.profile?.role || 'user'}</p>
            </div>
          </div>
          <div class="profile-actions">
            <button class="btn btn-secondary" onclick="window.location.href='/app/dashboard.html'" style="width: 100%;">
              📊 Dashboard
            </button>
            <button class="btn btn-secondary" onclick="window.location.href='/app/settings.html'" style="width: 100%;">
              ⚙️ Account Settings
            </button>
            <button class="btn btn-danger" id="logout-btn" style="width: 100%;">
              🚪 Sign Out
            </button>
          </div>
        </div>
      `,
      footer: `<button class="btn btn-ghost" onclick="window.UI.closeAllModals()">Close</button>`
    });

    window.UI.openModal(modalId);

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await window.AuthService.logout();
      });
    }
  }

  setupHeroActions() {
    const getStartedBtn = document.getElementById('get-started-btn');
    const learnMoreBtn = document.getElementById('learn-more-btn');

    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => {
        window.location.href = '/src/pages/dashboard.html';
      });
    }

    if (learnMoreBtn) {
      learnMoreBtn.addEventListener('click', () => {
        if (window.UI) {
          window.UI.createModal({
            title: 'About Broker',
            body: `
              <p>Broker is a premium trading platform designed for both beginners and experienced traders.</p>
              <h3>Key Features:</h3>
              <ul>
                <li>Real-time market data</li>
                <li>Advanced charting tools</li>
                <li>Secure wallet integration</li>
                <li>24/7 customer support</li>
                <li>Mobile-first design</li>
              </ul>
              <p>Get started today and experience the future of trading!</p>
            `,
            footer: `<button class="btn btn-primary" onclick="window.UI.closeAllModals()">Got it</button>`
          });
          window.UI.openModal(window.UI.modals[window.UI.modals.length - 1]?.id);
        }
      });
    }
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        // Add active class to clicked link
        e.target.classList.add('active');
      });
    });
  }

  async loadStats() {
    try {
      const API_BASE = '/api/v1';
      const response = await fetch(`${API_BASE}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stats = await response.json();
      this.updateStatsDisplay(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.showStatsError();
    }
  }

  updateStatsDisplay(stats) {
    const userStat = document.querySelector('[data-stat="users"]');
    const volumeStat = document.querySelector('[data-stat="volume"]');
    const transactionStat = document.querySelector('[data-stat="transactions"]');
    const uptimeStat = document.querySelector('[data-stat="uptime"]');

    if (userStat) {
      this.animateNumber(userStat, stats.users);
    }

    if (volumeStat) {
      this.animateMoney(volumeStat, stats.volume, 'USD');
    }

    if (transactionStat) {
      this.animateNumber(transactionStat, stats.transactions);
    }

    if (uptimeStat) {
      uptimeStat.textContent = stats.uptime;
    }
  }

  animateNumber(element, target) {
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current).toLocaleString();
    }, 16);
  }

  animateMoney(element, target, currency) {
    if (window.Money) {
      const money = window.Money.create(target, currency);
      const formatted = window.Money.format(money);
      element.textContent = formatted;
    } else {
      element.textContent = `$${target.toLocaleString()}`;
    }
  }

  setupPeriodicUpdates() {
    // Update stats every 30 seconds
    setInterval(() => {
      this.loadStats();
    }, 30000);

    // Update auth status every 10 seconds
    setInterval(() => {
      this.updateAuthButton();
    }, 10000);
  }

  showStatsError() {
    const statsContainer = document.querySelector('.stats-grid');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
      <div class="stats-error" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Stats unavailable</h3>
        <p>Unable to load platform statistics</p>
      </div>
    `;
  }

  // Cleanup method
  destroy() {
    console.log('Index page cleanup');
    // Remove any intervals, event listeners, etc.
  }
}

// Initialize page controller
window.indexPage = new IndexPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndexPage;
}
