/**
 * Shared UI Kit Components
 * Cash App-level premium, mobile-first, dark-mode toggle
 */

class UIComponent {
  constructor() {
    this.init();
  }

  init() {
    this.setupThemeToggle();
    this.setupGlobalEventListeners();
  }

  setupThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  setupGlobalEventListeners() {
    // ESC key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      this.closeModal(modal.id);
    });
  }

  // Button Component
  createButton(options = {}) {
    const {
      text = '',
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      onClick = null,
      className = '',
      icon = null
    } = options;

    const button = document.createElement('button');
    button.className = `btn btn-${variant} ${size !== 'md' ? `btn-${size}` : ''} ${className}`;
    button.disabled = disabled || loading;
    button.type = 'button';

    if (loading) {
      button.innerHTML = '<div class="spinner"></div> Loading...';
    } else {
      if (icon) {
        button.innerHTML = `${icon} ${text}`;
      } else {
        button.textContent = text;
      }
    }

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    return button;
  }

  // Card Component
  createCard(options = {}) {
    const {
      header = null,
      body = '',
      footer = null,
      className = ''
    } = options;

    const card = document.createElement('div');
    card.className = `card ${className}`;

    if (header) {
      const cardHeader = document.createElement('div');
      cardHeader.className = 'card-header';
      cardHeader.innerHTML = header;
      card.appendChild(cardHeader);
    }

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    cardBody.innerHTML = body;
    card.appendChild(cardBody);

    if (footer) {
      const cardFooter = document.createElement('div');
      cardFooter.className = 'card-footer';
      cardFooter.innerHTML = footer;
      card.appendChild(cardFooter);
    }

    return card;
  }

  // Input Component
  createInput(options = {}) {
    const {
      label = '',
      type = 'text',
      placeholder = '',
      value = '',
      error = '',
      required = false,
      disabled = false,
      onChange = null,
      className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `input-group ${className}`;

    if (label) {
      const labelEl = document.createElement('label');
      labelEl.className = 'input-label';
      labelEl.textContent = label;
      if (required) labelEl.innerHTML += ' *';
      container.appendChild(labelEl);
    }

    const input = document.createElement('input');
    input.className = `input ${error ? 'error' : ''}`;
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    input.required = required;
    input.disabled = disabled;

    if (onChange) {
      input.addEventListener('input', onChange);
    }

    container.appendChild(input);

    if (error) {
      const errorEl = document.createElement('div');
      errorEl.className = 'input-error';
      errorEl.textContent = error;
      container.appendChild(errorEl);
    }

    return { container, input };
  }

  // Tabs Component
  createTabs(options = {}) {
    const {
      tabs = [],
      defaultTab = 0,
      onChange = null
    } = options;

    const container = document.createElement('div');
    container.className = 'tabs-container';

    const tabList = document.createElement('div');
    tabList.className = 'tab-list';

    const tabContents = [];

    tabs.forEach((tab, index) => {
      // Tab button
      const tabButton = document.createElement('button');
      tabButton.className = `tab-button ${index === defaultTab ? 'active' : ''}`;
      tabButton.textContent = tab.label;
      tabButton.addEventListener('click', () => {
        this.switchTab(container, index);
        if (onChange) onChange(index, tab);
      });
      tabList.appendChild(tabButton);

      // Tab content
      const tabContent = document.createElement('div');
      tabContent.className = `tab-content ${index === defaultTab ? 'active' : ''}`;
      tabContent.innerHTML = tab.content;
      tabContents.push(tabContent);
    });

    container.appendChild(tabList);
    tabContents.forEach(content => container.appendChild(content));

    return container;
  }

  switchTab(container, activeIndex) {
    const buttons = container.querySelectorAll('.tab-button');
    const contents = container.querySelectorAll('.tab-content');

    buttons.forEach((btn, index) => {
      btn.classList.toggle('active', index === activeIndex);
    });

    contents.forEach((content, index) => {
      content.classList.toggle('active', index === activeIndex);
    });
  }

  // Modal Component
  createModal(options = {}) {
    const {
      id = `modal-${Date.now()}`,
      title = '',
      body = '',
      footer = null,
      closeOnOverlay = true,
      onClose = null
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-close-modal>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    const closeBtn = modal.querySelector('[data-close-modal]');
    closeBtn.addEventListener('click', () => this.closeModal(id, onClose));

    if (closeOnOverlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(id, onClose);
        }
      });
    }

    return overlay;
  }

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(id, onClose = null) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      if (onClose) onClose();
    }
  }

  // Toast Component
  createToast(options = {}) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      persistent = false
    } = options;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Get or create toast container
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.removeToast(toast));

    // Auto remove after duration
    if (!persistent && duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    return toast;
  }

  removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }

  // Theme Toggle
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Theme changed to:', newTheme);
    return newTheme;
  }

  // Loading Spinner
  createSpinner(size = 'md') {
    const spinner = document.createElement('div');
    spinner.className = `spinner spinner-${size}`;
    return spinner;
  }
}

// Initialize global UI components
window.UI = new UIComponent();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIComponent;
}
