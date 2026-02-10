/**
 * Authentication System
 * loginWithEmailPassword, loginWithGoogle, logout
 * registerWithEmailPassword + profile upsert
 * Enforces email auto-confirm OFF: shows "Check your email" message after signup
 */

class AuthService {
  constructor() {
    this.supabaseClient = window.SupabaseClient;
    this.initialized = false;
    this.init();
  }

  async init() {
    // Wait for Supabase client to be ready
    if (this.supabaseClient) {
      await this.supabaseClient.init();
      this.initialized = true;
    }
  }

  // Ensure Supabase client is ready
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
    return this.supabaseClient;
  }

  // Login with email and password
  async loginWithEmailPassword(email, password) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        throw this.handleAuthError(error);
      }

      // Update last login timestamp in profile
      if (data.user) {
        await this.updateLastLogin(data.user.id);
      }

      // Clear any stored intended destination
      sessionStorage.removeItem('intendedDestination');

      if (window.Notify) {
        window.Notify.success('Welcome back!');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Login failed:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Login failed');
      }

      return { success: false, error };
    }
  }

  // Login with Google OAuth
  async loginWithGoogle() {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/src/pages/auth/callback.html`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        throw this.handleAuthError(error);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Google login failed:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Google login failed');
      }

      return { success: false, error };
    }
  }

  // Register new user with email and password
  async registerWithEmailPassword(email, password, profileData = {}) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      // Validate email
      try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Please enter a valid email address');
        }
      } catch (error) {
        if (error.message.includes('valid email')) {
          throw error;
        }
        console.error('Email validation regex error:', error);
        throw new Error('Email validation failed');
      }

      // Validate password
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const { data, error } = await client.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            display_name: profileData.displayName || '',
            phone: profileData.phone || ''
          }
        }
      });

      if (error) {
        throw this.handleAuthError(error);
      }

      // Create user profile in database
      if (data.user && !data.session) {
        // User created but email not confirmed (auto-confirm OFF)
        await this.createUserProfile(data.user.id, {
          email: data.user.email,
          display_name: profileData.displayName || '',
          phone: profileData.phone || '',
          email_verified: false, // Default false, only set by Back Office
          role: 'user',
          created_at: new Date().toISOString()
        });

        // Show "Check your email" message
        if (window.UI) {
          const modalId = window.UI.createModal({
            title: 'Check Your Email',
            body: `
              <div class="email-confirmation">
                <div class="confirmation-icon">📧</div>
                <h3>Verification Email Sent</h3>
                <p>We've sent a verification email to <strong>${data.user.email}</strong></p>
                <p>Please check your inbox and click the verification link to activate your account.</p>
                <div class="confirmation-tips">
                  <h4>Didn't receive the email?</h4>
                  <ul>
                    <li>Check your spam folder</li>
                    <li>Make sure the email address is correct</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </div>
              </div>
            `,
            footer: `
              <button class="btn btn-secondary" onclick="window.UI.closeAllModals()">Got it</button>
              <button class="btn btn-ghost" onclick="window.authService.resendVerificationEmail('${data.user.email}')">Resend Email</button>
            `,
            closeOnOverlay: false,
            persistent: true
          });
          
          window.UI.openModal(modalId);
        }

        return { success: true, data, emailConfirmationRequired: true };
      }

      if (window.Notify) {
        window.Notify.success('Account created successfully!');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Registration failed:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Registration failed');
      }

      return { success: false, error };
    }
  }

  // Logout user
  async logout() {
    try {
      await this.ensureInitialized();
      
      const success = await this.supabaseClient.signOut();
      
      if (!success) {
        throw new Error('Failed to sign out');
      }

      // Clear any local storage data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      if (window.Notify) {
        window.Notify.success('Signed out successfully');
      }

      // Redirect to home page
      setTimeout(() => {
        window.location.href = '/src/pages/index.html';
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Logout failed');
      }

      return { success: false, error };
    }
  }

  // Create user profile in database
  async createUserProfile(userId, profileData) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      // Prepare comprehensive profile data
      const fullProfileData = {
        id: userId,
        email: profileData.email || '',
        display_name: profileData.displayName || '',
        first_name: profileData.firstName || '',
        last_name: profileData.lastName || '',
        phone: profileData.phone || '',
        country: profileData.country || '',
        email_verified: false, // Default false, only set by Back Office
        role: 'user',
        created_at: new Date().toISOString(),
        
        // Address information
        address_line1: profileData.address?.address_line1 || '',
        address_line2: profileData.address?.address_line2 || '',
        city: profileData.address?.city || '',
        state: profileData.address?.state || '',
        postal_code: profileData.address?.postal_code || '',
        
        // Compliance information
        new_to_investing: profileData.compliance?.new_to_investing || '',
        pep: profileData.compliance?.pep || '',
        pep_details: profileData.compliance?.pep_details || '',
        occupation: profileData.compliance?.occupation || '',
        dob: profileData.compliance?.dob || '',
        
        // Additional metadata
        referral_code: profileData.referralCode || ''
      };

      const { data, error } = await client
        .from('profiles')
        .insert(fullProfileData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('User profile created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to create user profile:', error);
      // Don't throw error here to prevent blocking signup
      return { success: false, error };
    }
  }

  // Update user profile
  async updateUserProfile(userId, profileData) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      // Remove sensitive fields that shouldn't be updated directly
      const { id, email_verified, role, created_at, ...safeProfileData } = profileData;

      const { data, error } = await client
        .from('profiles')
        .update(safeProfileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (window.Notify) {
        window.Notify.success('Profile updated successfully');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to update user profile:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Failed to update profile');
      }

      return { success: false, error };
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return { success: false, error };
    }
  }

  // Update last login timestamp
  async updateLastLogin(userId) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { error } = await client
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update last login:', error);
      }
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  // Resend verification email
  async resendVerificationEmail(email) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { data, error } = await client.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim()
      });

      if (error) {
        throw error;
      }

      if (window.Notify) {
        window.Notify.success('Verification email resent');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Failed to resend verification email');
      }

      return { success: false, error };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { data, error } = await client.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}/login.html`
        }
      );

      if (error) {
        throw error;
      }

      if (window.Notify) {
        window.Notify.success('Password reset email sent');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      
      if (window.Notify) {
        window.Notify.error(error.message || 'Failed to send password reset email');
      }

      return { success: false, error };
    }
  }

  // Handle auth errors and provide user-friendly messages
  handleAuthError(error) {
    const errorMap = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email address',
      'User already registered': 'An account with this email already exists',
      'Password should be at least 6 characters': 'Password must be at least 6 characters long',
      'Weak password': 'Password is too weak. Please choose a stronger password',
      'Invalid email': 'Please enter a valid email address',
      'Signup disabled': 'Registration is currently disabled',
      'Rate limit exceeded': 'Too many attempts. Please try again later'
    };

    const userMessage = errorMap[error.message] || error.message || 'Authentication failed';
    
    return new Error(userMessage);
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      const session = await this.supabaseClient.getSession();
      return !!session;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  // Get current user with profile
  async getCurrentUserWithProfile() {
    try {
      await this.ensureInitialized();
      const user = await this.supabaseClient.getCurrentUser();
      
      if (!user) {
        return null;
      }

      const profileResult = await this.getUserProfile(user.id);
      
      return {
        ...user,
        profile: profileResult.success ? profileResult.data : null
      };
    } catch (error) {
      console.error('Error getting current user with profile:', error);
      return null;
    }
  }

  // Handle OAuth callback
  async handleAuthCallback() {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      const { data, error } = await client.auth.getSession();
      
      if (error) {
        throw error;
      }

      if (data.session) {
        // Update last login
        await this.updateLastLogin(data.session.user.id);
        
        // Redirect to intended destination or dashboard
        const intendedDestination = sessionStorage.getItem('intendedDestination') || '/src/pages/dashboard.html';
        sessionStorage.removeItem('intendedDestination');
        
        window.location.href = intendedDestination;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error handling auth callback:', error);
      
      if (window.Notify) {
        window.Notify.error('Authentication failed');
      }

      return { success: false, error };
    }
  }
}

// Create and export singleton instance
const authService = new AuthService();

// Export for global access
window.AuthService = authService;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = authService;
}

// Export individual methods for convenience
export const {
  loginWithEmailPassword,
  loginWithGoogle,
  logout,
  registerWithEmailPassword,
  createUserProfile,
  updateUserProfile,
  getUserProfile,
  resendVerificationEmail,
  resetPassword,
  isAuthenticated,
  getCurrentUserWithProfile,
  handleAuthCallback
} = authService;
