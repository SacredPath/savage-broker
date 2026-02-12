/**
 * Global Error Boundary for Broker Trading Platform
 */

class ErrorBoundary {
  constructor() {
    this.errorCount = 0;
    this.maxErrors = 5;
    this.errorHistory = [];
    this.isModalOpen = false;
    this.init();
  }

  init() {
    this.setupGlobalErrorHandlers();
    this.setupPromiseRejectionHandler();
  }

  setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      event.preventDefault();
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        type: 'javascript'
      });
    });

    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          message: `Resource loading error: ${event.target.src || event.target.href}`,
          filename: event.target.src || event.target.href,
          timestamp: new Date().toISOString(),
          type: 'resource'
        });
      }
    }, true);
  }

  setupPromiseRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handleError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        type: 'promise'
      });
    });
  }

  handleError(error) {
    console.error('Error caught by boundary:', error);
    this.errorCount++;
    this.errorHistory.push(error);
    
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }
    
    if (this.shouldShowModal(error)) {
      this.showErrorModal(error);
    }
    
    if (this.shouldStopExecution(error)) {
      this.stopExecution();
    }
  }

  shouldShowModal(error) {
    const ignoredTypes = ['resource', 'network'];
    const ignoredMessages = ['Script error.', 'ResizeObserver loop limit exceeded'];
    
    if (ignoredTypes.includes(error.type)) return false;
    if (ignoredMessages.some(msg => error.message?.includes(msg))) return false;
    
    return error.type === 'javascript' || error.type === 'promise' || this.errorCount >= 3;
  }

  shouldStopExecution(error) {
    return this.errorCount >= this.maxErrors || error.type === 'critical';
  }

  showErrorModal(error) {
    if (this.isModalOpen) return;
    this.isModalOpen = true;
    
    let modal = document.getElementById('error-boundary-modal');
    if (!modal) {
      modal = this.createErrorModal();
      document.body.appendChild(modal);
    }
    
    this.updateModalContent(error);
    modal.classList.add('show');
  }

  createErrorModal() {
    const modal = document.createElement('div');
    modal.id = 'error-boundary-modal';
    modal.className = 'error-boundary-modal';
    modal.innerHTML = `
      <div class="error-modal-backdrop"></div>
      <div class="error-modal-content">
        <div class="error-modal-header">
          <h2>Application Error</h2>
          <button class="error-modal-close" onclick="window.ErrorBoundary.closeModal()">&times;</button>
        </div>
        <div class="error-modal-body">
          <div class="error-icon">⚠️</div>
          <p id="error-message">An error occurred</p>
          <div class="error-details">
            <p><strong>Error:</strong> <span id="error-text"></span></p>
            <p><strong>Time:</strong> <span id="error-time"></span></p>
            <details>
              <summary>Technical Details</summary>
              <pre id="error-stack"></pre>
            </details>
          </div>
        </div>
        <div class="error-modal-footer">
          <button class="btn btn-secondary" onclick="window.ErrorBoundary.closeModal()">Close</button>
          <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
        </div>
      </div>
    `;
    return modal;
  }

  updateModalContent(error) {
    document.getElementById('error-message').textContent = error.message || 'An unexpected error occurred';
    document.getElementById('error-text').textContent = error.message || 'Unknown error';
    document.getElementById('error-time').textContent = new Date(error.timestamp).toLocaleString();
    document.getElementById('error-stack').textContent = error.stack || 'No stack trace available';
  }

  closeModal() {
    const modal = document.getElementById('error-boundary-modal');
    if (modal) {
      modal.classList.remove('show');
      this.isModalOpen = false;
    }
  }

  stopExecution() {
    console.error('Too many errors, stopping execution');
    this.showFatalError();
  }

  showFatalError() {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa; font-family: Arial, sans-serif;">
        <div style="text-align: center; max-width: 500px; padding: 40px;">
          <h1 style="color: #dc3545; margin-bottom: 20px;">Application Error</h1>
          <p style="color: #6c757d; margin-bottom: 30px;">The application encountered too many errors and had to stop.</p>
          <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Reload Application</button>
        </div>
      </div>
    `;
  }
}

// Initialize Error Boundary
window.ErrorBoundary = new ErrorBoundary();
