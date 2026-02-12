/**
 * Cash App Style Login Page Controller
 * Pixel-perfect login page with email/password, Google login, and forgot password
 */

class LoginPage {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Cash App login page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Check if user is already authenticated
      await this.checkExistingAuth();
      
      // Initialize app shell (sidebar, navigation, etc.)
      if (window.AppShell) {
        window.AppShell.initShell();
      }
      
      // Setup UI components
      this.setupThemeToggle();
      this.setupLoginForm();
      this.setupGoogleLogin();
      this.setupForgotPassword();
      this.setupSignupLink();
      
      console.log('Cash App login page setup complete');
    } catch (error) {
      console.error('Error setting up login page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load login page');
      }
    }
  }

  async checkExistingAuth() {
    try {
      // Check if user is already authenticated
      const isAuthenticated = await window.AuthService.isAuthenticated();
      
      if (isAuthenticated) {
        console.log('User already authenticated, redirecting to app');
        window.location.href = '/app/home.html';
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking existing authentication:', error);
      return false;
    }
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      const newTheme = this.toggleTheme();
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

  setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    // Add input focus effects
    const inputs = document.querySelectorAll('.cash-app-input');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
      });
      
      input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
      });
    });
  }

  async handleLogin() {
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;

    // Validate inputs
    if (!this.validateInputs(email, password)) {
      return;
    }

    // Show loading state
    this.setLoginLoading(true);

    try {
      const result = await window.AuthService.loginWithEmailPassword(email, password);
      
      if (result.success) {
        console.log('Login successful, redirecting to app');
        // Redirect to app home as specified
        window.location.href = '/app/home.html';
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError(error.message || 'Login failed');
    } finally {
      this.setLoginLoading(false);
    }
  }

  setupGoogleLogin() {
    const googleLoginBtn = document.getElementById('google-login-btn');

    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', async () => {
        await this.handleGoogleLogin();
      });
    }
  }

  async handleGoogleLogin() {
    try {
      this.setGoogleLoading(true);
      
      const result = await window.AuthService.loginWithGoogle();
      
      if (result.success) {
        console.log('Google login initiated');
      }
    } catch (error) {
      console.error('Google login error:', error);
      this.showError('Google login failed. Please try again.');
    } finally {
      this.setGoogleLoading(false);
    }
  }

  setupForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.showPasswordResetModal();
      });
    }
  }

  async showPasswordResetModal() {
    if (!window.UI) return;

    const modalId = window.UI.createModal({
      title: 'Reset Password',
      body: `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
          <h3 style="margin-bottom: 16px;">Forgot your password?</h3>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <form id="reset-password-form">
            <input 
              type="email" 
              id="reset-email" 
              class="cash-app-input" 
              placeholder="Enter your email address"
              required
              style="margin-bottom: 16px; width: 100%;"
            >
          </form>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="window.UI.closeAllModals()">Cancel</button>
        <button class="btn btn-primary" id="send-reset-btn">Send Reset Link</button>
      `
    });

    window.UI.openModal(modalId);

    // Setup reset form handler
    const sendResetBtn = document.getElementById('send-reset-btn');
    if (sendResetBtn) {
      sendResetBtn.addEventListener('click', async () => {
        await this.handlePasswordReset();
      });
    }

    // Handle form submission
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handlePasswordReset();
      });
    }
  }

  async handlePasswordReset() {
    const email = document.getElementById('reset-email')?.value?.trim();

    if (!email) {
      this.showError('Please enter your email address');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('Please enter a valid email address');
      return;
    }

    const sendResetBtn = document.getElementById('send-reset-btn');
    const originalText = sendResetBtn.textContent;

    try {
      sendResetBtn.textContent = 'Sending...';
      sendResetBtn.disabled = true;

      const result = await window.AuthService.resetPassword(email);
      
      if (result.success) {
        window.UI.closeAllModals();
        this.showSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      this.showError(error.message || 'Failed to send reset email');
    } finally {
      sendResetBtn.textContent = originalText;
      sendResetBtn.disabled = false;
    }
  }

  setupSignupLink() {
    const signupLink = document.getElementById('signup-link');
    
    if (signupLink) {
      signupLink.addEventListener('click', (e) => {
        e.preventDefault();
        // For now, just show a message. In a real app, this would navigate to signup
        this.showInfo('Sign up feature coming soon! Please contact support to create an account.');
      });
    }
  }

  // Validation methods
  validateInputs(email, password) {
    if (!email) {
      this.showError('Email is required');
      return false;
    }

    if (!this.isValidEmail(email)) {
      this.showError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      this.showError('Password is required');
      return false;
    }

    return true;
  }

  isValidEmail(email) {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    } catch (error) {
      console.error('Email validation regex error:', error);
      return false;
    }
  }

  // UI state methods
  setLoginLoading(loading) {
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');

    if (loading) {
      btn.disabled = true;
      btnText.style.display = 'none';
      spinner.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
    }
  }

  setGoogleLoading(loading) {
    const btn = document.getElementById('google-login-btn');
    const btnText = document.getElementById('google-btn-text');
    const spinner = document.getElementById('google-spinner');
    
    if (loading) {
      btn.disabled = true;
      btnText.style.display = 'none';
      spinner.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
    }
  }

  // Notification methods (using notify modal, never alert)
  showError(message) {
    if (window.Notify) {
      window.Notify.error(message);
    } else {
      // Fallback: create a simple modal
      this.createSimpleModal('Error', message, 'error');
    }
  }

  showSuccess(message) {
    if (window.Notify) {
      window.Notify.success(message);
    } else {
      // Fallback: create a simple modal
      this.createSimpleModal('Success', message, 'success');
    }
  }

  showInfo(message) {
    if (window.Notify) {
      window.Notify.info(message);
    } else {
      // Fallback: create a simple modal
      this.createSimpleModal('Info', message, 'info');
    }
  }

  createSimpleModal(title, message, type = 'info') {
    const modalId = `modal-${Date.now()}`;
    const iconMap = {
      error: '❌',
      success: '✅',
      info: 'ℹ️'
    };

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    modal.innerHTML = `
      <div style="
        background: var(--surface);
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        border: 1px solid var(--border);
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">${iconMap[type]}</div>
        <h3 style="margin-bottom: 16px;">${title}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">${message}</p>
        <button class="cash-app-button" onclick="document.getElementById('${modalId}').remove()">
          OK
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Add click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Cleanup method
  destroy() {
    console.log('Cash App login page cleanup');
  }
}

// Initialize page controller
window.loginPage = new LoginPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoginPage;
}
