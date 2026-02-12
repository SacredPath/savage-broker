/**
 * Back Office Users Management Controller
 * Handles user management with RBAC permissions and CRUD operations
 */

class BackOfficeUsers {
  constructor() {
    this.currentUser = null;
    this.userPermissions = null;
    this.users = [];
    this.filteredUsers = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.filters = {
      search: '',
      status: '',
      kycStatus: '',
      role: ''
    };
    this.editingUser = null;
    this.init();
  }

  async init() {
    console.log('Back Office users page initializing...');
    
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
      this.setupEventListeners();
      
      // Load users data
      await this.loadUsers();
      await this.loadUserStats();
      
      console.log('Back Office users page setup complete');
    } catch (error) {
      console.error('Error setting up Back Office users page:', error);
      if (error.message === 'Access denied') {
        this.redirectToLogin();
      } else if (window.Notify) {
        window.Notify.error('Failed to load users page');
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

      // Check specific permissions for user management
      if (!data.permissions?.users?.view) {
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

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }

    // Filter selects
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.applyFilters();
      });
    }

    const kycFilter = document.getElementById('kyc-filter');
    if (kycFilter) {
      kycFilter.addEventListener('change', (e) => {
        this.filters.kycStatus = e.target.value;
        this.applyFilters();
      });
    }

    const roleFilter = document.getElementById('role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.filters.role = e.target.value;
        this.applyFilters();
      });
    }
  }

  async loadUsers() {
    try {
      const { data, error } = await window.API.fetchEdge('bo_users_list', {
        method: 'GET',
        params: {
          page: this.currentPage,
          limit: this.pageSize,
          ...this.filters
        }
      });

      if (error) {
        throw error;
      }

      this.users = data.users || [];
      this.applyFilters();
    } catch (error) {
      console.error('Failed to load users:', error);
      this.users = [];
      this.applyFilters();
      this.showUsersError();
    }
  }

  applyFilters() {
    let filtered = [...this.users];

    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm) ||
        `${user.profile.first_name} ${user.profile.last_name}`.toLowerCase().includes(searchTerm) ||
        user.profile.phone?.includes(searchTerm)
      );
    }

    // Apply status filter
    if (this.filters.status) {
      filtered = filtered.filter(user => user.status === this.filters.status);
    }

    // Apply KYC status filter
    if (this.filters.kycStatus) {
      filtered = filtered.filter(user => user.kyc_status === this.filters.kycStatus);
    }

    // Apply role filter
    if (this.filters.role) {
      filtered = filtered.filter(user => user.role === this.filters.role);
    }

    this.filteredUsers = filtered;
    this.renderUsers();
    this.renderPagination();
  }

  renderUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (this.filteredUsers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--backoffice-text-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h3>No users found</h3>
            <p>Try adjusting your filters or search terms</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredUsers.map(user => this.formatUserRow(user)).join('');
  }

  formatUserRow(user) {
    const fullName = `${user.profile.first_name} ${user.profile.last_name}`;
    const statusBadge = this.getStatusBadge(user.status);
    const kycBadge = this.getKYCBadge(user.kyc_status);
    const roleBadge = this.getRoleBadge(user.role);
    const joinedDate = new Date(user.created_at).toLocaleDateString();
    const lastActive = this.getTimeAgo(user.last_active);
    
    // Calculate total balance across all wallets
    const totalBalance = Object.values(user.wallets || {}).reduce((sum, wallet) => sum + wallet.balance, 0);
    const balanceText = totalBalance > 0 ? `$${totalBalance.toLocaleString()}` : '$0';
    
    const positionCount = user.positions?.length || 0;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
              ${fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 500; color: var(--backoffice-text-primary);">${fullName}</div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted);">ID: ${user.id}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${user.email}</div>
          ${!user.email_verified ? '<div style="font-size: 11px; color: var(--backoffice-warning);">Not verified</div>' : ''}
        </td>
        <td>${statusBadge}</td>
        <td>${kycBadge}</td>
        <td>${roleBadge}</td>
        <td>
          <div style="font-weight: 500; color: var(--backoffice-text-primary);">${balanceText}</div>
          ${user.transactions_frozen ? '<div style="font-size: 11px; color: var(--backoffice-error);">Frozen</div>' : ''}
        </td>
        <td>
          <div style="font-weight: 500; color: var(--backoffice-text-primary);">${positionCount}</div>
          ${positionCount > 0 ? '<div style="font-size: 11px; color: var(--backoffice-text-muted);">Active</div>' : ''}
        </td>
        <td>${joinedDate}</td>
        <td>${lastActive}</td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-info" onclick="window.backofficeUsers.viewUser('${user.id}')" 
                    ${!this.userPermissions?.permissions?.users?.view ? 'disabled' : ''}>
              View
            </button>
            <div class="dropdown" style="position: relative; display: inline-block;">
              <button class="btn btn-sm btn-warning" onclick="window.backofficeUsers.toggleActionDropdown('${user.id}')" 
                      ${!this.userPermissions?.permissions?.users?.edit ? 'disabled' : ''}>
                Actions ▼
              </button>
              <div id="actions-dropdown-${user.id}" class="dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; background: var(--backoffice-surface); border: 1px solid var(--backoffice-border); border-radius: 8px; min-width: 200px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                ${this.generateActionMenuItems(user)}
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  generateActionMenuItems(user) {
    const items = [];
    
    // Email verification (superadmin only)
    if (this.userPermissions?.role === 'superadmin' && !user.email_verified) {
      items.push(`
        <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-text-primary); cursor: pointer; font-size: 14px;" 
                onclick="window.backofficeUsers.verifyEmail('${user.id}')">
          ✅ Verify Email
        </button>
      `);
    }
    
    // KYC actions
    if (user.kyc_status === 'pending') {
      items.push(`
        <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-success); cursor: pointer; font-size: 14px;" 
                onclick="window.backofficeUsers.approveKYC('${user.id}')">
          ✅ Approve KYC
        </button>
        <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-error); cursor: pointer; font-size: 14px;" 
                onclick="window.backofficeUsers.rejectKYC('${user.id}')">
          ❌ Reject KYC
        </button>
      `);
    }
    
    // Balance adjustment
    if (this.userPermissions?.permissions?.users?.adjust_balance) {
      items.push(`
        <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-warning); cursor: pointer; font-size: 14px;" 
                onclick="window.backofficeUsers.adjustBalance('${user.id}')">
          💰 Adjust Balance
        </button>
      `);
    }
    
    // Pause/Resume growth
    if (user.positions?.length > 0) {
      items.push(`
        <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-info); cursor: pointer; font-size: 14px;" 
                onclick="window.backofficeUsers.toggleGrowth('${user.id}')">
          ${user.last_accrued_at ? '⏸️ Pause Growth' : '▶️ Resume Growth'}
        </button>
      `);
    }
    
    // Tier override (superadmin only)
    if (this.userPermissions?.role === 'superadmin') {
      items.push(`
        <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-secondary); cursor: pointer; font-size: 14px;" 
                onclick="window.backofficeUsers.overrideTier('${user.id}')">
          🏆 Override Tier
        </button>
      `);
    }
    
    // Freeze/Unfreeze transactions
    items.push(`
      <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: ${user.transactions_frozen ? 'var(--backoffice-success)' : 'var(--backoffice-error)'}; cursor: pointer; font-size: 14px;" 
              onclick="window.backofficeUsers.toggleTransactions('${user.id}')">
        ${user.transactions_frozen ? '🔓 Unfreeze Transactions' : '🔒 Freeze Transactions'}
      </button>
    `);
    
    // Send password reset
    items.push(`
      <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-primary); cursor: pointer; font-size: 14px;" 
              onclick="window.backofficeUsers.sendPasswordReset('${user.id}')">
        🔑 Send Password Reset
      </button>
    `);
    
    // Suspend/Unsuspend
    items.push(`
      <button class="dropdown-item" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; color: var(--backoffice-error); cursor: pointer; font-size: 14px;" 
              onclick="window.backofficeUsers.suspendUser('${user.id}')">
        ${user.status === 'suspended' ? '▶️ Unsuspend' : '⏸️ Suspend'}
      </button>
    `);
    
    return items.join('');
  }

  toggleActionDropdown(userId) {
    const dropdown = document.getElementById(`actions-dropdown-${userId}`);
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      if (menu.id !== `actions-dropdown-${userId}`) {
        menu.style.display = 'none';
      }
    });
    
    // Toggle current dropdown
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        dropdown.style.display = 'none';
      }
    }, { once: true });
  }

  getKYCBadge(status) {
    const badges = {
      approved: '<span class="badge badge-success">Approved</span>',
      pending: '<span class="badge badge-warning">Pending</span>',
      rejected: '<span class="badge badge-danger">Rejected</span>',
      not_submitted: '<span class="badge badge-secondary">Not Submitted</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">Unknown</span>';
  }

  getRoleBadge(role) {
    const badges = {
      user: '<span class="badge badge-info">User</span>',
      support: '<span class="badge badge-warning">Support</span>',
      superadmin: '<span class="badge badge-danger">Super Admin</span>'
    };
    return badges[role] || '<span class="badge badge-secondary">Unknown</span>';
  }

  getStatusBadge(status) {
    const badges = {
      active: '<span class="badge badge-success">Active</span>',
      suspended: '<span class="badge badge-danger">Suspended</span>',
      pending: '<span class="badge badge-warning">Pending</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">Unknown</span>';
  }

  getRoleBadge(role) {
    const badges = {
      user: '<span class="badge badge-info">User</span>',
      support: '<span class="badge badge-warning">Support</span>',
      superadmin: '<span class="badge badge-danger">Super Admin</span>'
    };
    return badges[role] || '<span class="badge badge-secondary">Unknown</span>';
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

  // User Actions
  async viewUser(userId) {
    try {
      const { data, error } = await window.API.fetchEdge('bo_user_detail', {
        method: 'GET',
        params: { user_id: userId }
      });

      if (error) {
        throw error;
      }

      const user = data.user || this.users.find(u => u.id === userId);
      if (!user) return;

      this.showUserDetailsModal(user);
    } catch (error) {
      console.error('Failed to load user details:', error);
      window.Notify.error('Failed to load user details');
    }
  }

  showUserDetailsModal(user) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = `User Details - ${user.profile.first_name} ${user.profile.last_name}`;

    modalBody.innerHTML = `
      <div style="display: grid; gap: 24px;">
        <!-- Profile Information -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Profile Information</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Full Name</div>
              <div style="font-weight: 500;">${user.profile.first_name} ${user.profile.last_name}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Email</div>
              <div style="font-weight: 500;">${user.email}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Phone</div>
              <div style="font-weight: 500;">${user.profile.phone || 'Not provided'}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Country</div>
              <div style="font-weight: 500;">${user.profile.country || 'Not provided'}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Status</div>
              <div>${this.getStatusBadge(user.status)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">KYC Status</div>
              <div>${this.getKYCBadge(user.kyc_status)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Role</div>
              <div>${this.getRoleBadge(user.role)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Email Verified</div>
              <div>${user.email_verified ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>
        </div>

        <!-- Wallet Information -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Wallet Balances</h4>
          <div style="display: grid; gap: 12px;">
            ${Object.entries(user.wallets || {}).map(([currency, wallet]) => `
              <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px solid var(--backoffice-border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="font-weight: 600; color: var(--backoffice-text-primary);">${currency}</div>
                  <div style="font-weight: 600; color: var(--backoffice-primary);">$${wallet.balance.toLocaleString()}</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px;">
                  <div>
                    <span style="color: var(--backoffice-text-muted);">Available:</span>
                    <span style="color: var(--backoffice-success);">$${wallet.available.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style="color: var(--backoffice-text-muted);">Frozen:</span>
                    <span style="color: var(--backoffice-error);">$${wallet.frozen.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Positions -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Active Positions (${user.positions?.length || 0})</h4>
          <div style="display: grid; gap: 12px;">
            ${user.positions?.map(position => `
              <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px solid var(--backoffice-border);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 600; color: var(--backoffice-text-primary);">${position.tier}</div>
                    <div style="font-size: 12px; color: var(--backoffice-text-muted);">ID: ${position.id}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--backoffice-primary);">$${position.amount.toLocaleString()}</div>
                    <div style="font-size: 12px; color: var(--backoffice-success);">${position.status}</div>
                  </div>
                </div>
                <div style="font-size: 11px; color: var(--backoffice-text-muted); margin-top: 8px;">
                  Created: ${new Date(position.created_at).toLocaleDateString()}
                </div>
              </div>
            `).join('') || '<div style="text-align: center; color: var(--backoffice-text-muted); padding: 20px;">No active positions</div>'}
          </div>
        </div>

        <!-- Account Settings -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Account Settings</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Transactions Frozen</div>
              <div>${user.transactions_frozen ? '🔒 Yes' : '🔓 No'}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Last Accrued</div>
              <div>${user.last_accrued_at ? new Date(user.last_accrued_at).toLocaleDateString() : 'Never'}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Total Deposits</div>
              <div style="color: var(--backoffice-success);">$${user.total_deposits.toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Total Withdrawals</div>
              <div style="color: var(--backoffice-error);">$${user.total_withdrawals.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('show');
  }

  // Action Methods
  async verifyEmail(userId) {
    if (this.userPermissions?.role !== 'superadmin') {
      window.Notify.error('Only superadmin can verify emails');
      return;
    }

    const confirmed = confirm('Are you sure you want to verify this user\'s email?');
    if (!confirmed) return;

    try {
      const { data, error } = await window.API.fetchEdge('bo_user_action_verify_email', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          reason: 'Manual verification by superadmin'
        })
      });

      if (error) {
        throw error;
      }

      await this.loadUsers();
      window.Notify.success('Email verified successfully!');
    } catch (error) {
      console.error('Failed to verify email:', error);
      window.Notify.error('Failed to verify email');
    }
  }

  async approveKYC(userId) {
    this.showActionModal('approve_kyc', userId, 'Approve KYC Verification', 'Are you sure you want to approve this KYC application?');
  }

  async rejectKYC(userId) {
    this.showActionModal('reject_kyc', userId, 'Reject KYC Verification', 'Please provide a reason for rejecting this KYC application:', true);
  }

  async adjustBalance(userId) {
    this.showActionModal('adjust_balance', userId, 'Adjust Balance', 'Enter the adjustment amount and reason:', true);
  }

  async toggleGrowth(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const action = user.last_accrued_at ? 'pause' : 'resume';
    this.showActionModal('toggle_growth', userId, `${action === 'pause' ? 'Pause' : 'Resume'} Growth`, `Are you sure you want to ${action} growth for this user?`);
  }

  async overrideTier(userId) {
    this.showActionModal('override_tier', userId, 'Override Tier', 'Select the new tier for this user:', true);
  }

  async toggleTransactions(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const action = user.transactions_frozen ? 'unfreeze' : 'freeze';
    this.showActionModal('toggle_transactions', userId, `${action === 'freeze' ? 'Freeze' : 'Unfreeze'} Transactions`, `Are you sure you want to ${action} transactions for this user?`);
  }

  async sendPasswordReset(userId) {
    this.showActionModal('send_password_reset', userId, 'Send Password Reset', 'Are you sure you want to send a password reset link to this user?');
  }

  showActionModal(action, userId, title, message, requiresInput = false) {
    const modal = document.getElementById('action-modal');
    const modalTitle = document.getElementById('action-modal-title');
    const modalBody = document.getElementById('action-modal-body');

    modalTitle.textContent = title;
    this.currentAction = { action, userId };

    let bodyHTML = `<p style="color: var(--backoffice-text-secondary); margin-bottom: 20px;">${message}</p>`;

    if (requiresInput) {
      switch (action) {
        case 'reject_kyc':
          bodyHTML += `
            <div class="form-group">
              <label class="filter-label">Rejection Reason</label>
              <textarea class="form-control" id="action-input" rows="3" placeholder="Enter reason for rejection..." required></textarea>
            </div>
          `;
          break;
        case 'adjust_balance':
          bodyHTML += `
            <div class="form-group">
              <label class="filter-label">Adjustment Amount (USD)</label>
              <input type="number" class="form-control" id="action-input" placeholder="Enter amount (positive or negative)" step="0.01" required>
            </div>
            <div class="form-group">
              <label class="filter-label">Reason</label>
              <input type="text" class="form-control" id="action-reason" placeholder="Enter reason for adjustment..." required>
            </div>
          `;
          break;
        case 'override_tier':
          bodyHTML += `
            <div class="form-group">
              <label class="filter-label">New Tier</label>
              <select class="form-control form-select" id="action-input">
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
                <option value="Tier 4">Tier 4</option>
                <option value="Tier 5">Tier 5</option>
              </select>
            </div>
            <div class="form-group">
              <label class="filter-label">Reason</label>
              <input type="text" class="form-control" id="action-reason" placeholder="Enter reason for tier override..." required>
            </div>
          `;
          break;
      }
    }

    modalBody.innerHTML = bodyHTML;
    modal.classList.add('show');
  }

  async executeAction() {
    if (!this.currentAction) return;

    try {
      const { action, userId } = this.currentAction;
      let actionData = { user_id: userId };

      // Collect additional data based on action type
      switch (action) {
        case 'reject_kyc':
          actionData.reason = document.getElementById('action-input').value;
          break;
        case 'adjust_balance':
          actionData.amount = parseFloat(document.getElementById('action-input').value);
          actionData.reason = document.getElementById('action-reason').value;
          break;
        case 'override_tier':
          actionData.new_tier = document.getElementById('action-input').value;
          actionData.reason = document.getElementById('action-reason').value;
          break;
        default:
          actionData.reason = 'Administrative action';
      }

      const { data, error } = await window.API.fetchEdge(`bo_user_action_${action}`, {
        method: 'POST',
        body: JSON.stringify(actionData)
      });

      if (error) {
        throw error;
      }

      this.closeModal('action-modal');
      await this.loadUsers();
      window.Notify.success(`Action executed successfully!`);
    } catch (error) {
      console.error('Failed to execute action:', error);
      window.Notify.error('Failed to execute action');
    }
  }

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);

    let paginationHTML = `
      <button class="pagination-btn" onclick="window.backofficeUsers.goToPage(${this.currentPage - 1})" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        Previous
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        paginationHTML += `
          <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                  onclick="window.backofficeUsers.goToPage(${i})">
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        paginationHTML += '<span style="color: var(--backoffice-text-muted);">...</span>';
      }
    }

    paginationHTML += `
      <button class="pagination-btn" onclick="window.backofficeUsers.goToPage(${this.currentPage + 1})" 
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        Next
      </button>
      <span class="pagination-info">${startItem}-${endItem} of ${this.filteredUsers.length}</span>
    `;

    container.innerHTML = paginationHTML;
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    
    this.currentPage = page;
    this.renderUsers();
    this.renderPagination();
  }

  async loadUserStats() {
    try {
      const { data, error } = await window.API.fetchEdge('users_stats', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      const stats = data.stats || {};
      this.renderUserStats(stats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
      this.renderUserStats({});
    }
    }
  }

  
  renderUserStats(stats) {
    // Update stats with animation, using 0 as fallback for missing values
    this.animateValue('total-users', 0, stats.totalUsers || 0, 1000);
    this.animateValue('verified-users', 0, stats.verifiedUsers || 0, 1000);
    this.animateValue('active-users', 0, stats.activeUsers || 0, 1000);
    this.animateValue('suspended-users', 0, stats.suspendedUsers || 0, 1000);

    // Update change percentages, using 0 as fallback
    const usersChangeEl = document.getElementById('users-change');
    const verifiedChangeEl = document.getElementById('verified-change');
    const activeChangeEl = document.getElementById('active-change');
    const suspendedChangeEl = document.getElementById('suspended-change');
    
    if (usersChangeEl) usersChangeEl.textContent = `${(stats.usersChange || 0) >= 0 ? '+' : ''}${stats.usersChange || 0}%`;
    if (verifiedChangeEl) verifiedChangeEl.textContent = `${(stats.verifiedChange || 0) >= 0 ? '+' : ''}${stats.verifiedChange || 0}%`;
    if (activeChangeEl) activeChangeEl.textContent = `${(stats.activeChange || 0) >= 0 ? '+' : ''}${stats.activeChange || 0}%`;
    if (suspendedChangeEl) suspendedChangeEl.textContent = `${(stats.suspendedChange || 0) >= 0 ? '+' : ''}${stats.suspendedChange || 0}%`;
  }

  animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startTime = performance.now();
    
    const updateValue = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = start + (end - start) * this.easeOutQuart(progress);
      element.textContent = Math.floor(currentValue).toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };
    
    requestAnimationFrame(updateValue);
  }

  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  viewUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    this.editingUser = user;
    this.showUserModal(user, false);
  }

  editUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    this.editingUser = user;
    this.showUserModal(user, true);
  }

  showUserModal(user, isEdit) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const saveBtn = document.getElementById('modal-save-btn');

    modalTitle.textContent = isEdit ? 'Edit User' : 'User Details';
    saveBtn.style.display = isEdit ? 'block' : 'none';

    modalBody.innerHTML = `
      <div style="display: grid; gap: 20px;">
        <div class="form-group">
          <label class="filter-label">Email</label>
          <input type="email" class="form-control" id="modal-email" value="${user.email}" ${!isEdit ? 'disabled' : ''}>
        </div>
        
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="filter-label">First Name</label>
            <input type="text" class="form-control" id="modal-first-name" value="${user.profile.first_name}" ${!isEdit ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label class="filter-label">Last Name</label>
            <input type="text" class="form-control" id="modal-last-name" value="${user.profile.last_name}" ${!isEdit ? 'disabled' : ''}>
          </div>
        </div>
        
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="filter-label">Phone</label>
            <input type="tel" class="form-control" id="modal-phone" value="${user.profile.phone || ''}" ${!isEdit ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label class="filter-label">Country</label>
            <select class="form-control form-select" id="modal-country" ${!isEdit ? 'disabled' : ''}>
              <option value="US" ${user.profile.country === 'US' ? 'selected' : ''}>United States</option>
              <option value="GB" ${user.profile.country === 'GB' ? 'selected' : ''}>United Kingdom</option>
              <option value="CA" ${user.profile.country === 'CA' ? 'selected' : ''}>Canada</option>
              <option value="AU" ${user.profile.country === 'AU' ? 'selected' : ''}>Australia</option>
              <option value="DE" ${user.profile.country === 'DE' ? 'selected' : ''}>Germany</option>
            </select>
          </div>
        </div>
        
        ${isEdit ? `
          <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="filter-label">Status</label>
              <select class="form-control form-select" id="modal-status">
                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>Pending</option>
              </select>
            </div>
            <div class="form-group">
              <label class="filter-label">Role</label>
              <select class="form-control form-select" id="modal-role">
                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                <option value="support" ${user.role === 'support' ? 'selected' : ''}>Support</option>
                <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
              </select>
            </div>
          </div>
        ` : `
          <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="filter-label">Status</label>
              <div>${this.getStatusBadge(user.status)}</div>
            </div>
            <div class="form-group">
              <label class="filter-label">Role</label>
              <div>${this.getRoleBadge(user.role)}</div>
            </div>
          </div>
        `}
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; background: rgba(255, 255, 255, 0.02); border-radius: 8px;">
          <div>
            <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Total Deposits</div>
            <div style="font-weight: 600; color: var(--backoffice-success);">$${user.total_deposits?.toLocaleString() || '0'}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Total Withdrawals</div>
            <div style="font-weight: 600; color: var(--backoffice-error);">$${user.total_withdrawals?.toLocaleString() || '0'}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Active Positions</div>
            <div style="font-weight: 600; color: var(--backoffice-primary);">${user.active_positions || 0}</div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('show');
  }

  addUser() {
    if (!this.userPermissions?.permissions?.users?.create) {
      window.Notify.error('You do not have permission to create users');
      return;
    }

    this.editingUser = null;
    this.showUserModal({
      id: '',
      email: '',
      profile: {
        first_name: '',
        last_name: '',
        phone: '',
        country: 'US'
      },
      status: 'pending',
      role: 'user',
      total_deposits: 0,
      total_withdrawals: 0,
      active_positions: 0
    }, true);

    document.getElementById('modal-title').textContent = 'Add New User';
  }

  async saveUser() {
    if (!this.editingUser) return;

    try {
      const userData = {
        email: document.getElementById('modal-email').value,
        firstName: document.getElementById('modal-first-name').value,
        lastName: document.getElementById('modal-last-name').value,
        phone: document.getElementById('modal-phone').value,
        country: document.getElementById('modal-country').value,
        status: document.getElementById('modal-status')?.value,
        role: document.getElementById('modal-role')?.value
      };

      const endpoint = this.editingUser.id ? 'users_update' : 'users_create';
      const { data, error } = await window.API.fetchEdge(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          user_id: this.editingUser.id,
          user_data: userData
        })
      });

      if (error) {
        throw error;
      }

      this.closeModal('user-modal');
      await this.loadUsers();
      window.Notify.success(`User ${this.editingUser.id ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Failed to save user:', error);
      window.Notify.error('Failed to save user');
    }
  }

  async suspendUser(userId) {
    if (!this.userPermissions?.permissions?.users?.suspend) {
      window.Notify.error('You do not have permission to suspend users');
      return;
    }

    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const action = user.status === 'suspended' ? 'unsuspend' : 'suspend';
    const confirmed = confirm(`Are you sure you want to ${action} this user?`);
    
    if (!confirmed) return;

    try {
      const { data, error } = await window.API.fetchEdge('users_suspend', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          action: action
        })
      });

      if (error) {
        throw error;
      }

      await this.loadUsers();
      window.Notify.success(`User ${action}d successfully!`);
    } catch (error) {
      console.error('Failed to suspend user:', error);
      window.Notify.error('Failed to suspend user');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
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

  showUsersError() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--backoffice-text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h3>Users unavailable</h3>
          <p>Unable to load user data</p>
        </td>
      </tr>
    `;
  }

  // Cleanup method
  destroy() {
    console.log('Back Office users page cleanup');
    // Remove event listeners, intervals, etc.
  }

window.backofficeUsers = new BackOfficeUsers();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackOfficeUsers;
}
