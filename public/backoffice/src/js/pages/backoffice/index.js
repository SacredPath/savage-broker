/**
 * Back Office Dashboard Controller
 * Handles RBAC authentication, dashboard stats, and activity monitoring
 */

class BackOfficeDashboard {
  constructor() {
    this.currentUser = null;
    this.userPermissions = null;
    this.dashboardData = null;
    this.init();
  }

  async init() {
    console.log('Back Office dashboard initializing...');
    
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
      
      // Load dashboard data
      await this.loadDashboardData();
      await this.loadRecentActivity();
      
      // Start real-time updates
      this.startRealTimeUpdates();
      
      console.log('Back Office dashboard setup complete');
    } catch (error) {
      console.error('Error setting up Back Office dashboard:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load dashboard');
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
      if (href === currentPath || (currentPath === '/backoffice/' && href === '/backoffice/index.html')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  async loadDashboardData() {
    try {
      // For now, use mock data until API is ready
      this.dashboardData = {
        totalUsers: 0,
        usersChange: 0,
        totalDeposits: 0,
        depositsChange: 0,
        totalWithdrawals: 0,
        withdrawalsChange: 0,
        activePositions: 0,
        positionsChange: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        pendingKYC: 0
      };
      
      this.renderStats();
      this.updateBadges();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.dashboardData = {
        totalUsers: 0,
        usersChange: 0,
        totalDeposits: 0,
        depositsChange: 0,
        totalWithdrawals: 0,
        withdrawalsChange: 0,
        activePositions: 0,
        positionsChange: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        pendingKYC: 0
      };
      this.renderStats();
      this.updateBadges();
    }
  }

  renderStats() {
    if (!this.dashboardData) return;

    // Update stats with animation
    this.animateValue('total-users', 0, this.dashboardData.totalUsers, 1000);
    this.animateValue('total-deposits', 0, this.dashboardData.totalDeposits, 1000, true);
    this.animateValue('total-withdrawals', 0, this.dashboardData.totalWithdrawals, 1000, true);
    this.animateValue('active-positions', 0, this.dashboardData.activePositions, 1000);

    // Update change percentages
    document.getElementById('users-change').textContent = `+${this.dashboardData.usersChange}%`;
    document.getElementById('deposits-change').textContent = `+${this.dashboardData.depositsChange}%`;
    document.getElementById('withdrawals-change').textContent = `+${this.dashboardData.withdrawalsChange}%`;
    document.getElementById('positions-change').textContent = `+${this.dashboardData.positionsChange}%`;
  }

  animateValue(elementId, start, end, duration, isCurrency = false) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startTime = performance.now();
    
    const updateValue = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = start + (end - start) * this.easeOutQuart(progress);
      
      if (isCurrency) {
        element.textContent = '$' + this.formatMoney(currentValue);
      } else {
        element.textContent = Math.floor(currentValue).toLocaleString();
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };
    
    requestAnimationFrame(updateValue);
  }

  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  formatMoney(amount) {
    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  updateBadges() {
    if (!this.dashboardData) return;

    // Update navigation badges
    const depositsBadge = document.getElementById('pending-deposits-badge');
    if (depositsBadge) {
      depositsBadge.textContent = this.dashboardData.pendingDeposits;
      depositsBadge.style.display = this.dashboardData.pendingDeposits > 0 ? 'block' : 'none';
    }

    const withdrawalsBadge = document.getElementById('pending-withdrawals-badge');
    if (withdrawalsBadge) {
      withdrawalsBadge.textContent = this.dashboardData.pendingWithdrawals;
      withdrawalsBadge.style.display = this.dashboardData.pendingWithdrawals > 0 ? 'block' : 'none';
    }

    const kycBadge = document.getElementById('pending-kyc-badge');
    if (kycBadge) {
      kycBadge.textContent = this.dashboardData.pendingKYC;
      kycBadge.style.display = this.dashboardData.pendingKYC > 0 ? 'block' : 'none';
  async loadRecentActivity() {
    try {
      // For now, use mock data until API is ready
      const activities = [];
      this.renderActivity(activities);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      this.renderActivity([]);
    }
  }

  renderActivity(activities) {
    const container = document.getElementById('activity-list');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h3>No recent activity</h3>
          <p>Activity will appear here as users interact with platform</p>
        </div>
      `;
      return;
    }

    container.innerHTML = activities.map(activity => this.formatActivityItem(activity)).join('');
  }

  formatActivityItem(activity) {
    const icon = this.getActivityIcon(activity.type);
    const timeAgo = this.getTimeAgo(activity.timestamp);
    
    return `
      <div class="activity-item">
        <div class="activity-icon" style="background: ${icon.background}; color: ${icon.color};">
          ${icon.svg}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
        </div>
        <div class="activity-time">${timeAgo}</div>
      </div>
    `;
  }

  getActivityIcon(type) {
    const icons = {
      deposit: {
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        background: 'rgba(16, 185, 129, 0.1)',
        color: '#10B981'
      },
      withdrawal: {
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>',
        background: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444'
      },
      kyc: {
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>',
        background: 'rgba(251, 191, 36, 0.1)',
        color: '#F59E0B'
      },
      position: {
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path></svg>',
        background: 'rgba(139, 92, 246, 0.1)',
        color: '#8B5CF6'
      },
      signal: {
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
        background: 'rgba(236, 72, 153, 0.1)',
        color: '#EC4899'
      }
    };

    return icons[type] || icons.deposit;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  async refreshActivity() {
    const refreshBtn = document.querySelector('.activity-header .btn-secondary');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
    }

    try {
      await this.loadRecentActivity();
      if (window.Notify) {
        window.Notify.success('Activity refreshed successfully!');
      }
    } catch (error) {
      console.error('Failed to refresh activity:', error);
      if (window.Notify) {
        window.Notify.error('Failed to refresh activity');
      }
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      }
    }
  }

  startRealTimeUpdates() {
    // Update activity every 60 seconds
    setInterval(async () => {
      try {
        await this.loadRecentActivity();
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    }, 60000);
  }
}

// Initialize page controller
window.backofficePage = new BackOfficeDashboard();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackOfficeDashboard;
}
