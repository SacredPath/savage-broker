/**
 * Home Dashboard Controller
 * Main dashboard with overview stats and quick actions
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

class HomePage {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Home page initializing...');
    
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
      
      // Setup page content
      this.updateUserDisplay();
      this.loadDashboardData();
      this.loadRecentActivity();
      
      console.log('Home page setup complete');
    } catch (error) {
      console.error('Error setting up home page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load home page');
      }
    }
  }

  loadAppShell() {
    // Load app shell HTML components
    const shellContainer = document.getElementById('app-shell-container');
    if (shellContainer) {
      fetch('/src/components/app-shell.html')
        .then(response => response.text())
        .then(html => {
          shellContainer.innerHTML = html;
          
          // Initialize app shell after loading
          if (window.AppShell) {
            // Re-initialize app shell with new DOM
            window.AppShell.setupShell();
          }
        })
        .catch(error => {
          console.error('Failed to load app shell:', error);
        });
    }
  }

  updateUserDisplay() {
    // Update user display name in welcome message
    const userDisplay = document.getElementById('user-display-name');
    
    if (window.AppShell?.currentUser) {
      const user = window.AppShell.currentUser;
      const displayName = user.profile?.display_name || 
                        user.email?.split('@')[0] || 
                        'User';
      
      if (userDisplay) {
        userDisplay.textContent = displayName;
      }
    }
  }

  async loadDashboardData() {
    try {
      // Use canonical dashboard summary from server
      const dashboardData = await window.API.fetchDashboardSummary();
      
      this.updateDashboardStats(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.renderErrorState('Failed to load dashboard');
    }
  }

  updateDashboardStats(data) {
    // Use canonical server data - no client calculations
    const totalBalance = document.getElementById('total-balance');
    const availableBalance = document.getElementById('available-balance');
    const totalEquity = document.getElementById('total-equity');
    const todayPnl = document.getElementById('today-pnl');
    const totalPnl = document.getElementById('total-pnl');

    // Format using money.js
    if (totalBalance) {
      totalBalance.textContent = window.Money.formatUSD(data.totalBalance);
    }
    
    if (availableBalance) {
      availableBalance.textContent = window.Money.formatUSD(data.availableBalance);
    }
    
    if (totalEquity) {
      totalEquity.textContent = window.Money.formatUSD(data.totalEquity);
    }
    
    if (todayPnl) {
      const pnlClass = data.todayPnl >= 0 ? 'text-success' : 'text-danger';
      todayPnl.textContent = `${data.todayPnl >= 0 ? '+' : ''}${window.Money.formatUSD(data.todayPnl)}`;
      todayPnl.className = pnlClass;
    }
    
    if (totalPnl) {
      const pnlClass = data.totalPnl >= 0 ? 'text-success' : 'text-danger';
      totalPnl.textContent = `${data.totalPnl >= 0 ? '+' : ''}${window.Money.formatUSD(data.totalPnl)}`;
      totalPnl.className = pnlClass;
    }
  }

  async loadRecentActivity() {
    try {
      const { data, error } = await window.API.fetchEdge('history_feed', {
        method: 'GET',
        params: {
          page: 1,
          limit: 5
        }
      });

      if (error) {
        throw error;
      }

      this.renderRecentActivity(data.events || []);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      this.renderEmptyActivity();
    }
  }

  renderRecentActivity(activities) {
    const activityList = document.getElementById('recent-activity-list');
    
    if (!activityList) return;

    const icons = {
      deposit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      trade: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
      signal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
      withdrawal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>'
    };

    activityList.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.icon}">
          ${icons[activity.icon] || icons.trade}
        </div>
        <div class="activity-details">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${activity.time}</div>
        </div>
        ${activity.amount !== null ? `
          <div class="activity-amount ${activity.amount >= 0 ? 'positive' : 'negative'}">
            ${activity.amount >= 0 ? '+' : ''}$${Math.abs(activity.amount).toFixed(2)}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  renderEmptyActivity() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
        </svg>
        <h3>No recent activity</h3>
        <p>Your recent transactions and events will appear here</p>
      </div>
    `;
  }

  renderErrorState(message) {
    const quickStats = document.querySelector('.quick-stats');
    if (!quickStats) return;
    
    quickStats.innerHTML = `
      <div class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Failed to load dashboard</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  // Cleanup method
  destroy() {
    console.log('Home page cleanup');
  }
}

// Initialize page controller
window.homePage = new HomePage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HomePage;
}
