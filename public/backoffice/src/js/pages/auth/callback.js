/**
 * Auth Callback Page Controller
 * Handles OAuth redirects and authentication callbacks
 */

class AuthCallbackPage {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Auth callback page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Handle the authentication callback
      await this.handleAuthCallback();
    } catch (error) {
      console.error('Error handling auth callback:', error);
      this.showError(error.message || 'Authentication failed');
    }
  }

  async handleAuthCallback() {
    try {
      // Update message
      this.updateMessage('Processing authentication...');

      // Handle the auth callback using the auth service
      const result = await window.AuthService.handleAuthCallback();
      
      if (result.success) {
        this.updateMessage('Authentication successful! Redirecting...');
        
        // Success notification
        if (window.Notify) {
          window.Notify.success('Welcome back!');
        }
        
        // Redirect will be handled by the auth service
      } else {
        throw new Error(result.error?.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      this.showError(error.message || 'Authentication failed');
    }
  }

  updateMessage(message) {
    const messageElement = document.getElementById('auth-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  showError(message) {
    // Hide loading spinner
    const loadingSpinner = document.querySelector('.loading-spinner');
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }

    // Hide message
    const authMessage = document.getElementById('auth-message');
    if (authMessage) {
      authMessage.style.display = 'none';
    }

    // Show error container
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.style.display = 'block';
    }

    // Set error text
    const errorText = document.getElementById('error-text');
    if (errorText) {
      errorText.textContent = message;
    }

    // Setup error action buttons
    this.setupErrorActions();
  }

  setupErrorActions() {
    const retryBtn = document.getElementById('retry-btn');
    const homeBtn = document.getElementById('home-btn');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Reload the page to retry the callback
        window.location.reload();
      });
    }

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        // Redirect to home page
        window.location.href = '/src/pages/index.html';
      });
    }
  }

  // Cleanup method
  destroy() {
    console.log('Auth callback page cleanup');
  }
}

// Initialize page controller
window.authCallbackPage = new AuthCallbackPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthCallbackPage;
}
