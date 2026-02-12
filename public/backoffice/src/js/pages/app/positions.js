/**
 * Positions Page Controller
 * Handles user investment positions display and management
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

class PositionsPage {
  constructor() {
    this.positions = [];
    this.currentUser = null;
    this.selectedPositions = [];
    this.currentFilter = 'all';
    this.autoReinvest = false;
    this.init();
  }

  async init() {
    console.log('Positions page initializing...');
    
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
      
      // Load data
      await this.loadUserData();
      await this.loadPositions();
      
      // Setup UI
      this.setupFilters();
      this.setupModals();
      this.updateStats();
      
      // Start ROI updates
      this.startROIUpdates();
      
      console.log('Positions page setup complete');
    } catch (error) {
      console.error('Error setting up positions page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load positions');
      }
    }
  }

  loadAppShell() {
    const shellContainer = document.getElementById('app-shell-container');
    if (shellContainer) {
      fetch('/src/components/app-shell.html')
        .then(response => response.text())
        .then(html => {
          shellContainer.innerHTML = html;
          
          if (window.AppShell) {
            window.AppShell.setupShell();
          }
        })
        .catch(error => {
          console.error('Failed to load app shell:', error);
        });
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

  async loadPositions() {
    try {
      // Use canonical positions list from server
      this.positions = await window.API.fetchPositionsList();
      
      if (!this.positions.length) {
        this.renderEmptyState('No positions found');
        return;
      }

      this.renderPositions();
      this.updateStats();
    } catch (error) {
      console.error('Failed to load positions:', error);
      this.renderErrorState('Failed to load positions');
    }
  }

  renderEmptyState(message) {
    const positionsGrid = document.getElementById('positions-grid');
    if (!positionsGrid) return;
    
    positionsGrid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
        </svg>
        <h3>No positions found</h3>
        <p>${message}</p>
      </div>
    `;
  }

  renderErrorState(message) {
    const positionsGrid = document.getElementById('positions-grid');
    if (!positionsGrid) return;
    
    positionsGrid.innerHTML = `
      <div class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Failed to load positions</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  async calculateAccruedROI(position) {
    // ROI Model C: per-minute linear accrual, computed on read, UTC only
    if (position.status === 'matured') {
      return position.total_roi || position.accrued_roi;
    }

    const now = new Date();
    const started = new Date(position.started_at);
    const matures = new Date(position.matures_at);
    
    // If position has matured, return total ROI
    if (now >= matures) {
      return position.total_roi || position.accrued_roi;
    }

    // Get tier data from API
    const tier = await this.getTierById(position.tier_id);
    if (!tier) {
      console.error('Tier not found for position:', position.tier_id);
      return 0;
    }
    
    const totalMinutes = Math.floor((matures - started) / (1000 * 60));
    const minutesElapsed = Math.floor((now - started) / (1000 * 60));
    const dailyROIRate = tier.daily_roi;
    const perMinuteRate = dailyROIRate / (24 * 60);
    
    // Calculate accrued ROI
    const accruedROI = position.principal * perMinuteRate * minutesElapsed;
    
    // Cap at total ROI if it exists
    const totalROI = position.total_roi || (position.principal * tier.daily_roi * tier.days);
    return Math.min(accruedROI, totalROI);
  }

  async getTierById(tierId) {
    try {
      const API_BASE = '/api/v1';
      const response = await fetch(`${API_BASE}/tiers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const tiers = data.tiers || [];
      return tiers.find(t => t.id === tierId) || tiers[0] || null;
    } catch (error) {
      console.error('Failed to load tiers:', error);
      return null;
    }
  }

  renderPositions() {
    const positionsGrid = document.getElementById('positions-grid');
    if (!positionsGrid) return;

    const filteredPositions = this.filterPositions();
    
    if (filteredPositions.length === 0) {
      positionsGrid.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
          </svg>
          <p>No positions found</p>
        </div>
      `;
      return;
    }

    positionsGrid.innerHTML = filteredPositions.map(position => {
      const progress = this.calculateProgress(position);
      const isMatured = position.status === 'matured';
      
      return `
        <div class="position-card">
          <div class="position-header">
            <div class="position-info">
              <div class="position-tier">${position.tier_name}</div>
              <div class="position-id">${position.id}</div>
            </div>
            <div class="position-status ${isMatured ? 'status-matured' : 'status-active'}">
              ${position.status}
            </div>
          </div>
          
          <div class="position-details">
            <div class="detail-item">
              <div class="detail-label">Principal</div>
              <div class="detail-value">$${this.formatMoney(position.principal)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Started</div>
              <div class="detail-value">${new Date(position.started_at).toLocaleDateString()}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Matures</div>
              <div class="detail-value">${new Date(position.matures_at).toLocaleDateString()}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Accrued ROI</div>
              <div class="detail-value highlight">$${this.formatMoney(position.accrued_roi)}</div>
            </div>
          </div>
          
          ${!isMatured ? `
            <div class="roi-progress">
              <div class="progress-header">
                <span class="progress-label">ROI Progress</span>
                <span class="progress-value">${progress.percentage.toFixed(1)}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress.percentage}%"></div>
              </div>
            </div>
          ` : ''}
          
          <div class="position-actions">
            ${isMatured ? `
              <button class="btn btn-primary btn-small" onclick="window.positionsPage.openClaimModal('${position.id}')">
                Claim ROI
              </button>
            ` : `
              <button class="btn btn-secondary btn-small" onclick="window.positionsPage.openMergeModal('${position.id}')">
                Top Up
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  calculateProgress(position) {
    const now = new Date();
    const started = new Date(position.started_at);
    const matures = new Date(position.matures_at);
    
    if (now >= matures) {
      return { percentage: 100, daysRemaining: 0 };
    }

    const totalMinutes = Math.floor((matures - started) / (1000 * 60));
    const elapsedMinutes = Math.floor((now - started) / (1000 * 60));
    const percentage = Math.min((elapsedMinutes / totalMinutes) * 100, 100);
    const daysRemaining = Math.ceil((matures - now) / (24 * 60 * 60 * 1000));
    
    return { percentage, daysRemaining };
  }

  filterPositions() {
    switch (this.currentFilter) {
      case 'active':
        return this.positions.filter(p => p.status === 'active');
      case 'matured':
        return this.positions.filter(p => p.status === 'matured');
      default:
        return this.positions;
    }
  }

  setupFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.getAttribute('data-filter');
        
        // Update active tab
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update current filter
        this.currentFilter = filter;
        
        // Re-render positions
        this.renderPositions();
      });
    });
  }

  setupModals() {
    // Setup claim modal
    const confirmClaimBtn = document.getElementById('confirm-claim-btn');
    if (confirmClaimBtn) {
      confirmClaimBtn.addEventListener('click', () => this.handleClaimROI());
    }

    // Setup merge modal
    const confirmMergeBtn = document.getElementById('confirm-merge-btn');
    if (confirmMergeBtn) {
      confirmMergeBtn.addEventListener('click', () => this.handleMerge());
    }

    // Auto-reinvest checkbox
    const autoReinvestCheckbox = document.getElementById('auto-reinvest');
    if (autoReinvestCheckbox) {
      autoReinvestCheckbox.addEventListener('change', (e) => {
        this.autoReinvest = e.target.checked;
      });
    }
  }

  updateStats() {
    const totalValue = document.getElementById('total-value');
    const totalROI = document.getElementById('total-roi');
    const availableROI = document.getElementById('available-roi');
    const activePositions = document.getElementById('active-positions');

    if (!totalValue || !totalROI || !availableROI || !activePositions) return;

    const total = this.positions.reduce((sum, pos) => sum + pos.principal, 0);
    const roi = this.positions.reduce((sum, pos) => sum + pos.accrued_roi, 0);
    const available = this.positions
      .filter(pos => pos.status === 'matured')
      .reduce((sum, pos) => sum + pos.accrued_roi, 0);
    const active = this.positions.filter(pos => pos.status === 'active').length;

    totalValue.textContent = `$${this.formatMoney(total)}`;
    totalROI.textContent = `$${this.formatMoney(roi)}`;
    availableROI.textContent = `$${this.formatMoney(available)}`;
    activePositions.textContent = active.toString();
  }

  startROIUpdates() {
    // Update ROI every minute
    this.roiUpdateInterval = setInterval(() => {
      this.updateROI();
    }, 60000); // 1 minute

    // Update every 10 seconds for smooth progress
    this.progressUpdateInterval = setInterval(() => {
      this.updateROIProgress();
    }, 10000); // 10 seconds
  }

  async updateROI() {
    let hasChanges = false;
    
    for (const position of this.positions) {
      const newAccruedROI = await this.calculateAccruedROI(position);
      
      if (Math.abs(newAccruedROI - position.accrued_roi) > 0.01) {
        position.accrued_roi = newAccruedROI;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.renderPositions();
      this.updateStats();
    }
  }

  updateROIProgress() {
    const activePositions = this.positions.filter(p => p.status === 'active');
    
    activePositions.forEach(position => {
      const progress = this.calculateProgress(position);
      const progressBar = document.querySelector(`[onclick*="${position.id}"] .progress-fill`);
      
      if (progressBar) {
        progressBar.style.width = `${progress.percentage}%`;
      }
    });
  }

  async openClaimModal(positionId) {
    const position = this.positions.find(p => p.id === positionId);
    if (!position || position.status !== 'matured') return;

    this.selectedPosition = position;
    
    // Get tier data from API
    const tier = await this.getTierById(position.tier_id);
    if (!tier) {
      console.error('Tier not found for position:', position.tier_id);
      return;
    }
    
    const claimContent = document.getElementById('claim-content');
    const modal = document.getElementById('claim-modal');
    
    claimContent.innerHTML = `
      <div class="claim-summary">
        <h4>Claim ROI from ${position.tier_name}</h4>
        <div class="summary-row">
          <span class="summary-label">Position ID:</span>
          <span class="summary-value">${position.id}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Principal:</span>
          <span class="summary-value">$${this.formatMoney(position.principal)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Accrued ROI:</span>
          <span class="summary-value highlight">$${this.formatMoney(position.accrued_roi)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Total ROI:</span>
          <span class="summary-value">$${this.formatMoney(position.principal * tier.daily_roi * tier.days)}</span>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  async handleClaimROI() {
    if (!this.selectedPosition) return;

    try {
      this.setModalLoading('claim-modal', true);

      const { data, error } = await window.API.fetchEdge('claim_roi', {
        method: 'POST',
        body: {
          position_id: this.selectedPosition.id,
          auto_reinvest: this.autoReinvest
        }
      });

      if (error) {
        throw error;
      }

      // Show success message
      window.Notify.success('ROI claimed successfully!');
      
      // Reload positions
      await this.loadPositions();
      this.closeModal('claim-modal');

    } catch (error) {
      console.error('Claim ROI failed:', error);
      window.Notify.error(error.message || 'Failed to claim ROI');
    } finally {
      this.setModalLoading('claim-modal', false);
    }
  }

  async openMergeModal(positionId) {
    const position = this.positions.find(p => p.id === positionId);
    if (!position) return;

    this.selectedPositions = [position];
    
    const mergeOptions = document.getElementById('merge-options');
    const modal = document.getElementById('merge-modal');
    
    // Show available positions for merging
    const availablePositions = this.positions.filter(p => 
      p.id !== positionId && p.status === 'active' && p.tier_id === position.tier_id
    );

    mergeOptions.innerHTML = `
      <div class="merge-option selected" data-position-id="${position.id}">
        <div class="merge-option-header">
          <div class="merge-option-title">Target Position</div>
          <div class="merge-option-amount">$${this.formatMoney(position.principal)}</div>
        </div>
        <div class="merge-option-details">
          ${position.tier_name} • ${position.id}
        </div>
      </div>
    `;

    // Add available positions
    availablePositions.forEach(pos => {
      mergeOptions.innerHTML += `
        <div class="merge-option" data-position-id="${pos.id}">
          <div class="merge-option-header">
            <div class="merge-option-title">Source Position</div>
            <div class="merge-option-amount">$${this.formatMoney(pos.principal)}</div>
          </div>
          <div class="merge-option-details">
            ${pos.tier_name} • ${pos.id}
          </div>
        </div>
      `;
    });

    // Setup click handlers
    mergeOptions.querySelectorAll('.merge-option').forEach(option => {
      option.addEventListener('click', () => {
        const posId = option.getAttribute('data-position-id');
        this.toggleMergeOption(posId);
      });
    });

    // Show preview
    await this.updateMergePreview();

    modal.style.display = 'flex';
  }

  async toggleMergeOption(positionId) {
    const options = document.querySelectorAll('.merge-option');
    
    options.forEach(option => {
      const optionPosId = option.getAttribute('data-position-id');
      
      if (optionPosId === positionId) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });

    this.selectedPositions = Array.from(options)
      .filter(option => option.classList.contains('selected'))
      .map(option => this.positions.find(p => p.id === option.getAttribute('data-position-id')));

    await this.updateMergePreview();
  }

  async updateMergePreview() {
    if (this.selectedPositions.length === 0) return;

    const preview = document.getElementById('merge-preview');
    const targetPosition = this.selectedPositions[0];
    const sourcePositions = this.selectedPositions.slice(1);
    
    const totalPrincipal = this.selectedPositions.reduce((sum, pos) => sum + pos.principal, 0);
    const sourcePrincipal = sourcePositions.reduce((sum, pos) => sum + pos.principal, 0);
    const newPrincipal = targetPosition.principal + sourcePrincipal;
    
    // Get tier data from API
    const targetTier = await this.getTierById(targetPosition.tier_id);
    const sourceTier = await this.getTierById(sourcePositions[0]?.tier_id || 1);
    
    if (!targetTier || !sourceTier) {
      console.error('Tier data not available for merge preview');
      return;
    }
    
    const newTotalROI = newPrincipal * targetTier.daily_roi * targetTier.days;
    const oldTotalROI = targetPosition.principal * targetTier.daily_roi * targetTier.days + 
                      sourcePrincipal * sourceTier.daily_roi * sourceTier.days;

    preview.innerHTML = `
      <h4>Merge Preview</h4>
      <div class="preview-row">
        <span class="preview-label">Target Position:</span>
        <span class="preview-value">${targetPosition.tier_name}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Current Principal:</span>
        <span class="preview-value">$${this.formatMoney(targetPosition.principal)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Source Principal:</span>
        <span class="preview-value">$${this.formatMoney(sourcePrincipal)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">New Principal:</span>
        <span class="preview-value highlight">$${this.formatMoney(newPrincipal)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Old Total ROI:</span>
        <span class="preview-value">$${this.formatMoney(oldTotalROI)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">New Total ROI:</span>
        <span class="preview-value highlight">$${this.formatMoney(newTotalROI)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">ROI Increase:</span>
        <span class="preview-value highlight">+$${this.formatMoney(newTotalROI - oldTotalROI)}</span>
      </div>
    `;

    // Enable confirm button
    const confirmBtn = document.getElementById('confirm-merge-btn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }
  }

  async handleMerge() {
    if (this.selectedPositions.length < 2) {
      window.Notify.error('Please select at least one source position to merge');
      return;
    }

    try {
      this.setModalLoading('merge-modal', true);

      const targetPosition = this.selectedPositions[0];
      const sourceIds = this.selectedPositions.slice(1).map(p => p.id);

      const { data, error } = await window.API.fetchEdge('positions_merge', {
        method: 'POST',
        body: {
          target_position_id: targetPosition.id,
          source_position_ids: sourceIds
        }
      });

      if (error) {
        throw error;
      }

      // Show success message
      window.Notify.success('Positions merged successfully!');
      
      // Reload positions
      await this.loadPositions();
      this.closeModal('merge-modal');

    } catch (error) {
      console.error('Merge failed:', error);
      window.Notify.error(error.message || 'Failed to merge positions');
    } finally {
      this.setModalLoading('merge-modal', false);
    }
  }

  setModalLoading(modalId, loading) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const confirmBtn = modal.querySelector('#confirm-' + modalId.replace('-modal', '') + '-btn');
    
    if (loading) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `
        <div class="loading-spinner" style="display: inline-block; margin-right: 8px;"></div>
        Processing...
      `;
    } else {
      confirmBtn.disabled = false;
      confirmBtn.textContent = confirmBtn.textContent.replace('Processing...', 'Confirm');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
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

  // Cleanup method
  destroy() {
    console.log('Positions page cleanup');
    
    // Clear intervals
    if (this.roiUpdateInterval) {
      clearInterval(this.roiUpdateInterval);
    }
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
    }
  }
}

// Initialize page controller
window.positionsPage = new PositionsPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PositionsPage;
}
