/**
 * Back Office Audit Log Controller
 * Handles audit log viewing with comprehensive filtering and export
 */

class BackOfficeAudit {
  constructor() {
    this.currentUser = null;
    this.userPermissions = null;
    this.auditLogs = [];
    this.filteredLogs = [];
    this.currentPage = 1;
    this.pageSize = 50;
    this.filters = {
      search: '',
      actionType: '',
      userId: '',
      startDate: '',
      endDate: ''
    };
    this.init();
  }

  async init() {
    console.log('Back Office audit page initializing...');
    
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
      this.setDefaultDateRange();
      
      // Load audit logs
      await this.loadAuditLogs();
      await this.loadUsers();
      
      console.log('Back Office audit page setup complete');
    } catch (error) {
      console.error('Error setting up Back Office audit page:', error);
      if (error.message === 'Access denied') {
        this.redirectToLogin();
      } else if (window.Notify) {
        window.Notify.error('Failed to load audit logs');
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

      // Check specific permissions for audit log viewing
      if (!data.permissions?.audit?.view) {
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

    // Action type filter
    const actionFilter = document.getElementById('action-filter');
    if (actionFilter) {
      actionFilter.addEventListener('change', (e) => {
        this.filters.actionType = e.target.value;
        this.applyFilters();
      });
    }

    // User filter
    const userFilter = document.getElementById('user-filter');
    if (userFilter) {
      userFilter.addEventListener('change', (e) => {
        this.filters.userId = e.target.value;
        this.applyFilters();
      });
    }

    // Date range filters
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    
    if (startDate) {
      startDate.addEventListener('change', (e) => {
        this.filters.startDate = e.target.value;
        this.applyFilters();
      });
    }
    
    if (endDate) {
      endDate.addEventListener('change', (e) => {
        this.filters.endDate = e.target.value;
        this.applyFilters();
      });
    }
  }

  setDefaultDateRange() {
    const endDate = document.getElementById('end-date');
    const startDate = document.getElementById('start-date');
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (endDate) {
      endDate.value = today.toISOString().split('T')[0];
    }
    
    if (startDate) {
      startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    this.filters.startDate = thirtyDaysAgo.toISOString().split('T')[0];
    this.filters.endDate = today.toISOString().split('T')[0];
  }

  async loadAuditLogs() {
    try {
      const { data, error } = await window.API.fetchEdge('audit_list', {
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

      this.auditLogs = data.logs || [];
      this.renderLogs();
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      this.auditLogs = [];
      this.renderLogs();
      this.showAuditError();
    }
  }

  async loadUsers() {
    try {
      const { data, error } = await window.API.fetchEdge('bo_users_list', {
        method: 'GET',
        params: { limit: 1000 } // Get all users for filter dropdown
      });

      if (error) {
        throw error;
      }

      const users = data.users || [];
      this.populateUserFilter(users);
    } catch (error) {
      console.error('Failed to load users for filter:', error);
      this.populateUserFilter([]);
    }
  }

  populateUserFilter(users) {
    const userFilter = document.getElementById('user-filter');
    if (!userFilter) return;

    userFilter.innerHTML = `
      <option value="">All Users</option>
      ${users.map(user => `
        <option value="${user.id}">${user.profile.first_name} ${user.profile.last_name} (${user.email})</option>
      `).join('')}
    `;
  }

  showAuditError() {
    const logsContainer = document.getElementById('audit-logs-container');
    if (!logsContainer) return;
    
    logsContainer.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 40px; color: var(--backoffice-text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Audit logs unavailable</h3>
        <p>Unable to load audit log data</p>
      </div>
    `;
  }

  applyFilters() {
    let filtered = [...this.auditLogs];

    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm) ||
        log.user_email?.toLowerCase().includes(searchTerm) ||
        log.admin_email?.toLowerCase().includes(searchTerm) ||
        log.details.reason?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply action type filter
    if (this.filters.actionType) {
      filtered = filtered.filter(log => log.action_type === this.filters.actionType);
    }

    // Apply user filter
    if (this.filters.userId) {
      filtered = filtered.filter(log => log.user_id === this.filters.userId);
    }

    // Apply date range filter
    if (this.filters.startDate) {
      const start = new Date(this.filters.startDate);
      filtered = filtered.filter(log => new Date(log.timestamp) >= start);
    }

    if (this.filters.endDate) {
      const end = new Date(this.filters.endDate);
      end.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => new Date(log.timestamp) <= end);
    }

    this.filteredLogs = filtered;
    this.renderAuditLogs();
    this.updateStats();
  }

  renderAuditLogs() {
    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;

    if (this.filteredLogs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--backoffice-text-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h3>No audit logs found</h3>
            <p>Try adjusting your filters or search terms</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredLogs.map(log => this.formatAuditLogRow(log)).join('');
  }

  formatAuditLogRow(log) {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const actionIcon = this.getActionIcon(log.action_type);
    const statusBadge = this.getStatusBadge(log.status);
    
    return `
      <tr>
        <td>
          <div style="font-size: 12px; color: var(--backoffice-text-muted);">${timestamp}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: var(--backoffice-primary);">${actionIcon}</div>
            <div>
              <div style="font-weight: 500; color: var(--backoffice-text-primary);">${log.action}</div>
              <div style="font-size: 11px; color: var(--backoffice-text-muted);">${log.action_type}</div>
            </div>
          </div>
        </td>
        <td>
          ${log.user_email ? `
            <div style="font-size: 14px; color: var(--backoffice-text-primary);">${log.user_email}</div>
            <div style="font-size: 11px; color: var(--backoffice-text-muted);">ID: ${log.user_id}</div>
          ` : '<div style="color: var(--backoffice-text-muted);">System</div>'}
        </td>
        <td>
          <div style="font-size: 14px; color: var(--backoffice-text-primary);">${log.admin_email}</div>
          <div style="font-size: 11px; color: var(--backoffice-text-muted);">ID: ${log.admin_id}</div>
        </td>
        <td>
          <button class="btn btn-sm btn-info" onclick="window.backofficeAudit.viewLogDetails('${log.id}')">
            View Details
          </button>
        </td>
        <td>
          <div style="font-family: monospace; font-size: 12px; color: var(--backoffice-text-secondary);">${log.ip_address}</div>
        </td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }

  getActionIcon(actionType) {
    const icons = {
      user_action: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      settings_update: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path></svg>',
      kyc_action: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>',
      deposit_action: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      withdrawal_action: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>',
      position_action: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path></svg>',
      system_action: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };

    return icons[actionType] || icons.user_action;
  }

  getStatusBadge(status) {
    const badges = {
      success: '<span class="badge badge-success">Success</span>',
      failed: '<span class="badge badge-danger">Failed</span>',
      pending: '<span class="badge badge-warning">Pending</span>',
      error: '<span class="badge badge-error">Error</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">Unknown</span>';
  }

  updateStats() {
    const totalLogs = document.getElementById('total-logs');
    const filteredLogs = document.getElementById('filtered-logs');
    
    if (totalLogs) {
      totalLogs.textContent = `${this.auditLogs.length} logs`;
    }
    
    if (filteredLogs) {
      const count = this.filteredLogs.length;
      filteredLogs.textContent = `${count} filtered${count !== this.auditLogs.length ? ' (' + Math.round((count / this.auditLogs.length) * 100) + '%)' : ''}`;
    }
  }

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(this.filteredLogs.length / this.pageSize);
    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, this.filteredLogs.length);

    let paginationHTML = `
      <button class="pagination-btn" onclick="window.backofficeAudit.goToPage(${this.currentPage - 1})" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        Previous
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        paginationHTML += `
          <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                  onclick="window.backofficeAudit.goToPage(${i})">
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        paginationHTML += '<span style="color: var(--backoffice-text-muted);">...</span>';
      }
    }

    paginationHTML += `
      <button class="pagination-btn" onclick="window.backofficeAudit.goToPage(${this.currentPage + 1})" 
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        Next
      </button>
      <span class="pagination-info">${startItem}-${endItem} of ${this.filteredLogs.length}</span>
    `;

    container.innerHTML = paginationHTML;
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredLogs.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    
    this.currentPage = page;
    this.renderAuditLogs();
    this.renderPagination();
  }

  viewLogDetails(logId) {
    const log = this.auditLogs.find(l => l.id === logId);
    if (!log) return;

    const modal = document.getElementById('log-details-modal');
    const modalBody = document.getElementById('log-details-body');

    modalBody.innerHTML = `
      <div style="display: grid; gap: 24px;">
        <!-- Basic Information -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Basic Information</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Log ID</div>
              <div style="font-family: monospace; font-size: 14px; color: var(--backoffice-text-primary);">${log.id}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Timestamp</div>
              <div style="font-size: 14px; color: var(--backoffice-text-primary);">${new Date(log.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Action Type</div>
              <div style="font-size: 14px; color: var(--backoffice-text-primary);">${log.action_type}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Action</div>
              <div style="font-size: 14px; color: var(--backoffice-text-primary);">${log.action}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Status</div>
              <div>${this.getStatusBadge(log.status)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">IP Address</div>
              <div style="font-family: monospace; font-size: 14px; color: var(--backoffice-text-primary);">${log.ip_address}</div>
            </div>
          </div>
        </div>

        <!-- User Information -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">User Information</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">User Email</div>
              <div style="font-size: 14px; color: var(--backoffice-text-primary);">${log.user_email || 'N/A'}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">User ID</div>
              <div style="font-family: monospace; font-size: 14px; color: var(--backoffice-text-primary);">${log.user_id || 'N/A'}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Admin Email</div>
              <div style="font-size: 14px; color: var(--backoffice-text-primary);">${log.admin_email}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 4px;">Admin ID</div>
              <div style="font-family: monospace; font-size: 14px; color: var(--backoffice-text-primary);">${log.admin_id}</div>
            </div>
          </div>
        </div>

        <!-- Action Details -->
        <div>
          <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Action Details</h4>
          <div>
            <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 8px;">Reason</div>
            <div style="font-size: 14px; color: var(--backoffice-text-primary); background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--backoffice-border);">
              ${log.details.reason || 'No reason provided'}
            </div>
          </div>
          
          <div style="margin-top: 16px;">
            <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 8px;">Before State</div>
            <pre style="background: rgba(239, 68, 68, 0.1); color: var(--backoffice-error); padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;">${JSON.stringify(log.details.before, null, 2)}</pre>
          </div>
          
          <div style="margin-top: 16px;">
            <div style="font-size: 12px; color: var(--backoffice-text-muted); margin-bottom: 8px;">After State</div>
            <pre style="background: rgba(16, 185, 129, 0.1); color: var(--backoffice-success); padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;">${JSON.stringify(log.details.after, null, 2)}</pre>
          </div>
        </div>

        <!-- Metadata -->
        ${log.metadata ? `
          <div>
            <h4 style="color: var(--backoffice-text-primary); margin-bottom: 16px; font-size: 16px; font-weight: 600;">Metadata</h4>
            <pre style="background: rgba(0, 212, 170, 0.1); color: var(--backoffice-primary); padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;">${JSON.stringify(log.metadata, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    `;

    modal.classList.add('show');
  }

  clearFilters() {
    this.filters = {
      search: '',
      actionType: '',
      userId: '',
      startDate: '',
      endDate: ''
    };

    // Reset UI
    document.getElementById('search-input').value = '';
    document.getElementById('action-filter').value = '';
    document.getElementById('user-filter').value = '';
    
    // Set default date range
    this.setDefaultDateRange();
    
    // Apply filters
    this.applyFilters();
  }

  async exportLogs() {
    try {
      // Create CSV content
      const headers = [
        'Timestamp', 'Action Type', 'Action', 'User Email', 'Admin Email', 
        'Reason', 'IP Address', 'Status', 'Before State', 'After State'
      ];

      const rows = this.filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action_type,
        log.action,
        log.user_email || '',
        log.admin_email,
        log.details.reason || '',
        log.ip_address,
        log.status,
        JSON.stringify(log.details.before || {}),
        JSON.stringify(log.details.after || {})
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      window.Notify.success('Audit logs exported successfully!');
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      window.Notify.error('Failed to export audit logs');
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

  // Cleanup method
  destroy() {
    console.log('Back Office audit page cleanup');
  }
}

// Initialize page controller
window.backofficeAudit = new BackOfficeAudit();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackOfficeAudit;
}
