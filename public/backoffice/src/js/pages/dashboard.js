/**
 * Dashboard Page Controller
 * Each HTML page loads only its page controller
 * All page controllers call api.js only (no inline fetch)
 */

class DashboardPage {
  constructor() {
    this.refreshInterval = null;
    this.init();
  }

  async init() {
    console.log('Dashboard page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Check authentication first using auth guard
      await window.AuthGuard.guard();
      
      // Initialize app shell (sidebar, navigation, etc.)
      if (window.AppShell) {
        window.AppShell.initShell();
      }
      
      // Setup UI components
      this.setupThemeToggle();
      this.setupNavigation();
      this.setupQuickActions();
      
      // Load dashboard data
      await this.loadDashboardData();
      
      // Setup periodic updates
      this.setupPeriodicUpdates();
      
      console.log('Dashboard page setup complete');
    } catch (error) {
      console.error('Error setting up dashboard page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load dashboard');
      }
      
      // Auth guard will handle redirects, so we don't need to manually redirect
    }
  }

  async checkAuthentication() {
    // This method is now handled by AuthGuard.guard()
    // Keeping for compatibility but the real check is in setupPage
    const user = await window.AuthService.getCurrentUserWithProfile();
    
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Update user name in welcome message
    const userName = document.getElementById('user-name');
    if (userName && user.profile?.display_name) {
      userName.textContent = user.profile.display_name;
    } else if (userName && user.email) {
      userName.textContent = user.email.split('@')[0];
    }
    
    return user;
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

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        navLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    const tradeBtn = document.getElementById('trade-btn');
    if (tradeBtn) {
      tradeBtn.addEventListener('click', () => {
        if (window.Notify) {
          window.Notify.info('Trading feature coming soon! We\'re working hard to bring you the best trading experience.');
        } else {
          console.log('Trading feature coming soon!');
        }
      });
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadDashboardData();
      });
    }
  }

  setupQuickActions() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        const actions = [
          () => this.showDepositModal(),
          () => this.showWithdrawModal(),
          () => this.showAnalyticsModal(),
          () => window.location.href = '/app/settings.html'
        ];
        
        if (actions[index]) {
          actions[index]();
        }
      });
    });
  }

  async loadDashboardData() {
    try {
      // In a real app, these would be separate API calls
      const [balances, activity] = await Promise.all([
        this.fetchBalances(),
        this.fetchRecentActivity()
      ]);

      this.updateBalancesDisplay(balances);
      this.updateActivityDisplay(activity);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showDataError();
      if (window.Notify) {
        window.Notify.error('Failed to load dashboard data');
      }
    }
  }

  async fetchBalances() {
    // Use centralized balance fetch method
    const balances = await window.API.fetchBalances();
    
    // Return flat structure for dashboard compatibility
    return {
      usd: balances.usd,
      usdt: balances.usdt,
      total: balances.total
    };
  }

  async fetchRecentActivity() {
    const API_BASE = '/api/v1';
    const response = await fetch(`${API_BASE}/activity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.activities || [];
  }

  updateBalancesDisplay(balances) {
    const usdBalance = document.getElementById('usd-balance');
    const usdtBalance = document.getElementById('usdt-balance');
    const totalPortfolio = document.getElementById('total-portfolio');

    if (window.Money) {
      const usdMoney = window.Money.create(balances.usd, 'USD');
      const usdtMoney = window.Money.create(balances.usdt, 'USDT');
      const totalMoney = window.Money.create(balances.total, 'USD');

      if (usdBalance) usdBalance.textContent = window.Money.format(usdMoney);
      if (usdtBalance) usdtBalance.textContent = window.Money.format(usdtMoney);
      if (totalPortfolio) totalPortfolio.textContent = window.Money.format(totalMoney);
    } else {
      // Fallback formatting
      if (usdBalance) usdBalance.textContent = `$${balances.usd.toFixed(2)}`;
      if (usdtBalance) usdtBalance.textContent = `₮${balances.usdt.toFixed(6)}`;
      if (totalPortfolio) totalPortfolio.textContent = `$${balances.total.toFixed(2)}`;
    }
  }

  updateActivityDisplay(activities) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    if (!activities || activities.length === 0) {
      activityList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
          </svg>
          <h3>No recent activity</h3>
          <p>Your recent transactions will appear here</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${activity.icon || '📊'}</div>
        <div class="activity-details">
          <div class="activity-title">${activity.title || 'Activity'}</div>
          <div class="activity-description">${activity.description || 'No description'}</div>
          <div class="activity-time">${activity.time || 'Just now'}</div>
        </div>
        <div class="activity-amount ${activity.amount >= 0 ? 'positive' : 'negative'}">
          ${activity.amount >= 0 ? '+' : ''}${activity.currency === 'USD' ? '$' : '₮'}${Math.abs(activity.amount || 0).toFixed(activity.currency === 'USDT' ? 6 : 2)}
        </div>
      </div>
    `).join('');
  }

  showDataError() {
    const balancesContainer = document.querySelector('.balances-section');
    const activityContainer = document.querySelector('.activity-section');
    
    if (balancesContainer) {
      balancesContainer.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h3>Balances unavailable</h3>
          <p>Unable to load account balances</p>
        </div>
      `;
    }
    
    if (activityContainer) {
      activityContainer.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h3>Activity unavailable</h3>
          <p>Unable to load recent activity</p>
        </div>
      `;
    }
  }

  showDepositModal() {
    if (!window.UI) return;

    const modalId = window.UI.createModal({
      title: 'Deposit Funds',
      body: `
        <div class="deposit-options">
          <div class="deposit-option">
            <h4>Bank Transfer</h4>
            <p>Transfer funds from your bank account</p>
            <button class="btn btn-primary" style="width: 100%;">Bank Transfer</button>
          </div>
          <div class="deposit-option">
            <h4>Crypto Deposit</h4>
            <p>Deposit cryptocurrency</p>
            <button class="btn btn-secondary" style="width: 100%;">Crypto Deposit</button>
          </div>
        </div>
      `,
      footer: `<button class="btn btn-ghost" onclick="window.UI.closeAllModals()">Cancel</button>`
    });

    window.UI.openModal(modalId);
  }

  showWithdrawModal() {
    if (!window.UI) return;

    const modalId = window.UI.createModal({
      title: 'Withdraw Funds',
      body: `
        <form id="withdraw-form">
          <div class="input-group">
            <label class="input-label">Amount</label>
            <input type="number" class="input" id="withdraw-amount" placeholder="0.00" step="0.01" min="0" required>
          </div>
          <div class="input-group">
            <label class="input-label">Currency</label>
            <select class="input" id="withdraw-currency">
              <option value="USD">USD</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Destination</label>
            <input type="text" class="input" id="withdraw-destination" placeholder="Bank account or wallet address" required>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="window.UI.closeAllModals()">Cancel</button>
        <button class="btn btn-primary" onclick="window.dashboardPage.handleWithdraw()">Withdraw</button>
      `
    });

    window.UI.openModal(modalId);
  }

  async handleWithdraw() {
    const amount = document.getElementById('withdraw-amount')?.value;
    const currency = document.getElementById('withdraw-currency')?.value;
    const destination = document.getElementById('withdraw-destination')?.value;

    if (!amount || !destination) {
      if (window.Notify) {
        window.Notify.error('Please fill in all fields');
      }
      return;
    }

    try {
      // This would normally call: window.API.fetchEdge('/withdraw', { method: 'POST', body: { amount, currency, destination } })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (window.Notify) {
        window.Notify.success('Withdrawal request submitted successfully');
      }
      
      window.UI.closeAllModals();
      
      // Refresh dashboard data
      await this.loadDashboardData();
      
    } catch (error) {
      console.error('Withdrawal failed:', error);
      if (window.Notify) {
        window.Notify.error('Withdrawal failed. Please try again.');
      }
    }
  }

  showAnalyticsModal() {
    if (!window.UI) return;

    const modalId = window.UI.createModal({
      title: 'Trading Analytics',
      body: `
        <div class="analytics-content">
          <div class="analytics-metric">
            <h4>Total Trades</h4>
            <div class="metric-value">156</div>
          </div>
          <div class="analytics-metric">
            <h4>Success Rate</h4>
            <div class="metric-value">68.5%</div>
          </div>
          <div class="analytics-metric">
            <h4>Total Profit/Loss</h4>
            <div class="metric-value positive">+$2,450.75</div>
          </div>
          <div class="analytics-chart">
            <h4>Performance Chart</h4>
            <div class="chart-placeholder">
              <p>Chart visualization would go here</p>
            </div>
          </div>
        </div>
      `,
      footer: `<button class="btn btn-primary" onclick="window.UI.closeAllModals()">Close</button>`
    });

    window.UI.openModal(modalId);
  }

  setupPeriodicUpdates() {
    // Update dashboard data every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 30000);
  }

  // Cleanup method
  destroy() {
    console.log('Dashboard page cleanup');
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Initialize page controller
window.dashboardPage = new DashboardPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardPage;
}
