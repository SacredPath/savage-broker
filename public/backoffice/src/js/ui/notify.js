/**
 * Toast and Modal Notification System
 * All toasts/modals go through this single system
 * Every modal MUST have a working close button and ESC close
 */

class NotifySystem {
  constructor() {
    this.toasts = new Map();
    this.modals = new Map();
    this.toastContainer = null;
    this.init();
  }

  init() {
    this.createToastContainer();
    this.setupGlobalListeners();
  }

  createToastContainer() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  setupGlobalListeners() {
    // ESC key closes top modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeTopModal();
      }
    });
  }

  // Toast Methods
  toast(options = {}) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      persistent = false,
      id = null
    } = options;

    const toastId = id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Remove existing toast with same ID
    if (this.toasts.has(toastId)) {
      this.removeToast(toastId);
    }

    const toast = this.createToastElement({
      id: toastId,
      type,
      title,
      message,
      persistent
    });

    this.toastContainer.appendChild(toast);
    this.toasts.set(toastId, { element: toast, options });

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    if (!persistent && duration > 0) {
      setTimeout(() => this.removeToast(toastId), duration);
    }

    return toastId;
  }

  success(message, options = {}) {
    return this.toast({ type: 'success', message, ...options });
  }

  error(message, options = {}) {
    return this.toast({ 
      type: 'error', 
      message, 
      duration: 0, // Errors persist by default
      ...options 
    });
  }

  warning(message, options = {}) {
    return this.toast({ type: 'warning', message, ...options });
  }

  info(message, options = {}) {
    return this.toast({ type: 'info', message, ...options });
  }

  createToastElement({ id, type, title, message, persistent }) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = id;

    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
        ${message ? `<div class="toast-message">${this.escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" data-toast-close="${id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Add close listener
    const closeBtn = toast.querySelector('[data-toast-close]');
    closeBtn.addEventListener('click', () => this.removeToast(id));

    return toast;
  }

  removeToast(id) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;

    const { element } = toastData;
    element.classList.remove('show');

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(id);
    }, 200);
  }

  clearToasts() {
    this.toasts.forEach((_, id) => this.removeToast(id));
  }

  // Modal Methods
  modal(options = {}) {
    const {
      id = null,
      title = '',
      body = '',
      footer = null,
      size = 'md',
      closeOnOverlay = true,
      closeOnEscape = true,
      persistent = false,
      onOpen = null,
      onClose = null
    } = options;

    const modalId = id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Remove existing modal with same ID
    if (this.modals.has(modalId)) {
      this.closeModal(modalId);
    }

    const modal = this.createModalElement({
      id: modalId,
      title,
      body,
      footer,
      size,
      closeOnOverlay,
      closeOnEscape,
      persistent
    });

    document.body.appendChild(modal);
    this.modals.set(modalId, { 
      element: modal, 
      options: { ...options, id: modalId }
    });

    // Trigger animation
    setTimeout(() => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (onOpen) onOpen(modalId);
    }, 10);

    return modalId;
  }

  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const modalId = this.modal({
        title: options.title || 'Confirm',
        body: message,
        footer: `
          <button class="btn btn-secondary" data-modal-confirm-cancel>Cancel</button>
          <button class="btn btn-primary" data-modal-confirm-ok>Confirm</button>
        `,
        persistent: true,
        closeOnEscape: false,
        ...options
      });

      const modal = document.getElementById(modalId);
      
      const cancelBtn = modal.querySelector('[data-modal-confirm-cancel]');
      const okBtn = modal.querySelector('[data-modal-confirm-ok]');

      cancelBtn.addEventListener('click', () => {
        this.closeModal(modalId);
        resolve(false);
      });

      okBtn.addEventListener('click', () => {
        this.closeModal(modalId);
        resolve(true);
      });
    });
  }

  alert(message, options = {}) {
    return new Promise((resolve) => {
      const modalId = this.modal({
        title: options.title || 'Alert',
        body: message,
        footer: `<button class="btn btn-primary" data-modal-alert-ok>OK</button>`,
        persistent: true,
        ...options
      });

      const modal = document.getElementById(modalId);
      const okBtn = modal.querySelector('[data-modal-alert-ok]');

      okBtn.addEventListener('click', () => {
        this.closeModal(modalId);
        resolve();
      });
    });
  }

  createModalElement({ id, title, body, footer, size, closeOnOverlay, closeOnEscape, persistent }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;

    const modal = document.createElement('div');
    modal.className = `modal modal-${size}`;

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${this.escapeHtml(title)}</h3>
        ${!persistent ? `
          <button class="modal-close" data-modal-close="${id}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;

    overlay.appendChild(modal);

    // Event listeners
    if (!persistent) {
      const closeBtn = modal.querySelector(`[data-modal-close="${id}"]`);
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal(id));
      }
    }

    if (closeOnOverlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(id);
        }
      });
    }

    return overlay;
  }

  closeModal(id) {
    const modalData = this.modals.get(id);
    if (!modalData) return;

    const { element, options } = modalData;
    element.classList.remove('active');

    setTimeout(() => {
      document.body.style.overflow = '';
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.modals.delete(id);
      if (options.onClose) options.onClose(id);
    }, 200);
  }

  closeTopModal() {
    const activeModals = Array.from(this.modals.values())
      .filter(modal => modal.element.classList.contains('active'));
    
    if (activeModals.length > 0) {
      const topModal = activeModals[activeModals.length - 1];
      this.closeModal(topModal.options.id);
    }
  }

  closeAllModals() {
    this.modals.forEach((modalData, id) => {
      if (modalData.element.classList.contains('active')) {
        this.closeModal(id);
      }
    });
  }

  // Utility Methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Loading States
  showLoading(message = 'Loading...') {
    return this.toast({
      type: 'info',
      message,
      persistent: true,
      className: 'toast-loading'
    });
  }

  hideLoading(toastId) {
    if (toastId) {
      this.removeToast(toastId);
    }
  }

  // Network Error Handler
  handleNetworkError(error, options = {}) {
    console.error('Network Error:', error);
    
    let message = 'Network error occurred';
    if (error.message) {
      if (error.message.includes('timeout')) {
        message = 'Request timed out. Please try again.';
      } else if (error.message.includes('fetch')) {
        message = 'Network connection failed. Check your internet.';
      } else {
        message = error.message;
      }
    }

    return this.error(message, {
      title: 'Connection Error',
      ...options
    });
  }
}

// Initialize global notify system
window.Notify = new NotifySystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotifySystem;
}
