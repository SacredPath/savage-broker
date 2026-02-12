/**
 * Login Page Controller
 * Handles form submission and authentication
 */

class LoginController {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Login page initializing...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Setup theme toggle
      this.setupThemeToggle();
      
      // Setup login form
      this.setupLoginForm();
      
      // Setup Google login
      this.setupGoogleLogin();
      
      // Setup forgot password
      this.setupForgotPassword();
      
      // Setup signup link
      this.setupSignupLink();
      
      // Check if user is already logged in
      await this.checkExistingAuth();
      
      console.log('Login page setup complete');
    } catch (error) {
      console.error('Error setting up login page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load login page properly');
      }
    }
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      const newTheme = window.UI ? window.UI.toggleTheme() : this.toggleTheme();
      console.log('Theme changed to:', newTheme);
    });
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    return newTheme;
  }

  setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginSpinner = document.getElementById('login-spinner');

    if (!loginForm) return;

    // Prevent duplicate event listeners
    if (loginForm.hasAttribute('data-listener-attached')) {
      return;
    }
    loginForm.setAttribute('data-listener-attached', 'true');

    let isSubmitting = false;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Prevent double-submit
      if (isSubmitting) {
        console.debug('[login] submit ignored - already in flight');
        return;
      }

      // Get and normalize inputs
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      
      if (!emailInput || !passwordInput) {
        this.showInlineError('Form fields not found');
        return;
      }

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value; // Do NOT trim password

      // Validate inputs before calling AuthService
      if (!email) {
        this.showInlineError('Enter your email');
        return;
      }

      if (!password) {
        this.showInlineError('Enter your password');
        return;
      }

      // Safe debug logging (no sensitive data)
      console.debug('[login] submit', {
        email_len: email.length,
        email_domain: email.split('@')[1] ?? null,
        has_password: !!password,
        password_len: password.length
      });

      isSubmitting = true;

      // Show loading state
      if (loginBtn) {
        loginBtn.disabled = true;
        if (loginBtnText) loginBtnText.style.display = 'none';
        if (loginSpinner) loginSpinner.style.display = 'block';
      }

      // Clear any previous errors
      this.clearInlineError();

      try {
        // Attempt login
        const result = await window.AuthService.loginWithEmailPassword(email, password);
        
        if (result.success) {
          console.log('Login successful, redirecting to dashboard...');
          // Redirect is handled in auth.js
        } else {
          console.error('Login failed:', result.error);
          this.handleLoginError(result.error);
        }
      } catch (error) {
        console.error('Login error:', error);
        this.handleLoginError(error);
      } finally {
        isSubmitting = false;
        
        // Reset loading state
        if (loginBtn) {
          loginBtn.disabled = false;
          if (loginBtnText) loginBtnText.style.display = 'inline';
          if (loginSpinner) loginSpinner.style.display = 'none';
        }
      }
    });
  }

  handleLoginError(error) {
    const errorMessage = error.message || 'Login failed';
    
    // Show all errors as inline messages (no verification modal per rule B)
    this.showInlineError(errorMessage);
  }

  showInlineError(message) {
    // Remove existing error
    this.clearInlineError();
    
    // Create or update error message area
    let errorDiv = document.getElementById('login-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'login-error';
      errorDiv.className = 'alert alert-danger mt-3';
      errorDiv.style.cssText = `
        padding: 12px 16px;
        border-radius: 6px;
        background-color: #fee;
        border: 1px solid #fcc;
        color: #c33;
        font-size: 14px;
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      // Insert after the form or before the submit button
      const loginForm = document.getElementById('login-form');
      const submitButton = document.getElementById('login-btn');
      if (submitButton && submitButton.parentNode) {
        submitButton.parentNode.insertBefore(errorDiv, submitButton);
      } else if (loginForm) {
        loginForm.appendChild(errorDiv);
      }
    }
    
    errorDiv.innerHTML = `
      <span>${message}</span>
      <button type="button" onclick="this.parentElement.remove()" style="
        background: none;
        border: none;
        color: #c33;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
      ">×</button>
    `;
  }

  clearInlineError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  setupGoogleLogin() {
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleBtnText = document.getElementById('google-btn-text');
    const googleSpinner = document.getElementById('google-spinner');

    if (!googleLoginBtn) return;

    googleLoginBtn.addEventListener('click', async () => {
      // Show loading state
      googleLoginBtn.disabled = true;
      if (googleBtnText) googleBtnText.style.display = 'none';
      if (googleSpinner) googleSpinner.style.display = 'block';

      try {
        const result = await window.AuthService.loginWithGoogle();
        
        if (result.success) {
          console.log('Google login initiated');
        } else {
          console.error('Google login failed:', result.error);
          this.showInlineError(result.error.message || 'Google login failed');
        }
      } catch (error) {
        console.error('Google login error:', error);
        this.showInlineError('Google login failed. Please try again.');
      } finally {
        // Reset loading state
        googleLoginBtn.disabled = false;
        if (googleBtnText) googleBtnText.style.display = 'inline';
        if (googleSpinner) googleSpinner.style.display = 'none';
      }
    });
  }

  setupForgotPassword() {
    // Get modal elements
    const modal = document.getElementById('password-reset-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-reset-btn');
    const closeSuccessBtn = document.getElementById('close-success-btn');
    const form = document.getElementById('password-reset-form');
    const resetEmailInput = document.getElementById('reset-email');
    
    if (!modal) {
      console.warn('Password reset modal not found');
      return;
    }

    // Setup event listeners
    const openModal = (e) => {
      if (e.target.closest('[data-action="password-reset"]')) {
        e.preventDefault();
        
        // Get email from login form if available
        const emailInput = document.getElementById('email');
        const defaultEmail = emailInput?.value.trim() || '';
        
        // Set default email in modal
        if (resetEmailInput && defaultEmail) {
          resetEmailInput.value = defaultEmail;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus email input
        if (resetEmailInput) {
          setTimeout(() => resetEmailInput.focus(), 100);
        }
      }
    };

    const closeModal = () => {
      modal.style.display = 'none';
      // Reset form
      if (form) form.reset();
      // Hide loading/success states
      this.hideResetLoading();
      this.hideResetSuccess();
    };

    // Handle modal open
    document.addEventListener('click', openModal);

    // Handle modal close
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener('click', closeModal);
    }
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Handle form submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = resetEmailInput?.value.trim();
        if (email) {
          await this.handlePasswordReset(email);
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
      }
    });
  }

  async handlePasswordReset(email) {
    console.log('handlePasswordReset called with:', email);
    console.log('AuthService available:', !!window.AuthService);
    console.log('resetPassword function available:', !!(window.AuthService && window.AuthService.resetPassword));
    
    if (!window.AuthService) {
      this.showResetError('Authentication service not available');
      return;
    }
    
    if (!window.AuthService.resetPassword) {
      this.showResetError('Password reset function not available');
      return;
    }
    
    if (!email) {
      this.showResetError('Please enter your email address');
      return;
    }

    try {
      // Show loading state
      this.showResetLoading();
      
      const result = await window.AuthService.resetPassword(email);
      
      if (result.success) {
        // Show success state
        this.showResetSuccess();
      } else {
        this.showResetError(result.error || 'Failed to send password reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error.message || 'Failed to send password reset email';
      this.showResetError(errorMessage);
    }
  }

  showResetLoading() {
    const loading = document.getElementById('reset-loading');
    const form = document.getElementById('password-reset-form');
    const success = document.getElementById('reset-success');
    
    if (loading) loading.style.display = 'block';
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'none';
  }

  hideResetLoading() {
    const loading = document.getElementById('reset-loading');
    const form = document.getElementById('password-reset-form');
    
    if (loading) loading.style.display = 'none';
    if (form) form.style.display = 'block';
  }

  showResetSuccess() {
    const success = document.getElementById('reset-success');
    const form = document.getElementById('password-reset-form');
    const loading = document.getElementById('reset-loading');
    
    if (success) success.style.display = 'block';
    if (form) form.style.display = 'none';
    if (loading) loading.style.display = 'none';
  }

  hideResetSuccess() {
    const success = document.getElementById('reset-success');
    const form = document.getElementById('password-reset-form');
    
    if (success) success.style.display = 'none';
    if (form) form.style.display = 'block';
  }

  showResetError(message) {
    // Hide other states
    this.hideResetLoading();
    this.hideResetSuccess();
    
    // Show error message
    const form = document.getElementById('password-reset-form');
    if (form) {
      // Remove existing error
      const existingError = form.querySelector('.reset-error');
      if (existingError) existingError.remove();
      
      // Create error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'reset-error';
      errorDiv.style.cssText = `
        color: #ef4444;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
        font-size: 14px;
      `;
      errorDiv.textContent = message;
      
      // Insert at the beginning of the form
      form.insertBefore(errorDiv, form.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.remove();
        }
      }, 5000);
    }
  }

  setupSignupLink() {
    const signupLink = document.getElementById('signup-link');
    
    if (!signupLink) return;

    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/register.html';
    });
  }

  async checkExistingAuth() {
    try {
      // Check if user is already authenticated
      const result = await window.AuthService.getCurrentUserWithProfile();
      
      // Handle SUPABASE_CLIENT_UNAVAILABLE error gracefully
      if (result && result.error === "SUPABASE_CLIENT_UNAVAILABLE") {
        console.warn('[login] Supabase client unavailable - showing non-blocking message');
        if (window.Notify) {
          window.Notify.warning('Connection issue - login features may be limited');
        }
        // Continue to render login page normally
        return;
      }
      
      if (result && result.user) {
        console.log('User already logged in, redirecting to dashboard...');
        window.location.href = '/app/home.html';
      } else {
        // Normal case: user not logged in, no action needed
        console.debug('[login] No active user session found');
      }
    } catch (error) {
      // Check if this is a normal "not logged in" case
      const isSessionMissing = error.message?.includes('Auth session missing') || 
                              error.message?.includes('No active session') ||
                              error.message?.includes('Not authenticated') ||
                              error.name === 'AuthSessionMissingError';
      
      if (isSessionMissing) {
        // Silent handling for missing session - normal case
        console.debug('[login] User not authenticated (no session)');
        return;
      }
      
      // Real error - show user-friendly message once
      console.error('[login] Error checking authentication status:', error.message);
      
      if (window.Notify) {
        const modalId = window.UI?.createModal?.({
          title: 'Connection Issue',
          body: `
            <div class="auth-error">
              <p>Unable to check authentication status. This may be a network issue.</p>
              <p><small>Error: ${error.message}</small></p>
            </div>
          `,
          footer: `
            <button class="btn btn-secondary" onclick="window.UI.closeAllModals()">Close</button>
            <button class="btn btn-primary" onclick="window.loginController.checkExistingAuth()">Retry</button>
          `
        });
        
        if (modalId && window.UI) {
          window.UI.openModal(modalId);
        } else {
          window.Notify.error('Unable to connect to authentication service');
        }
      }
    }
  }

  // Cleanup method
  destroy() {
    console.log('Login page cleanup');
  }
}

// Initialize login controller
window.loginController = new LoginController();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoginController;
}
