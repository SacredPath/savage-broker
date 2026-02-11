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
  async registerWithEmailPassword(email, password, registrationData = {}) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      console.log('Attempting signup with:', { email, passwordLength: password.length, profileData: registrationData });

      // Create user without any metadata to avoid database trigger issues
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {} // Empty data object to avoid any issues
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      console.log('Supabase signup successful:', data);

      // If user was created successfully, create/update profile
      if (data.user && registrationData) {
        console.log('Creating/updating user profile...');
        
        // Try to create profile first, then update if it exists
        const profileResult = await this.createOrUpdateProfile(data.user.id, {
          ...registrationData,
          email: email
        });
        
        if (!profileResult.success) {
          console.warn('Profile creation/update failed but user was created:', profileResult.error);
          // Don't throw error here - user was created successfully
        } else {
          console.log('User profile created/updated successfully');
        }
      }

      // Show email confirmation modal
      if (data.user && !data.session) {
        if (window.UI) {
          const modalId = 'email-confirmation-modal';
          window.UI.createModal(modalId, {
            title: 'Check Your Email',
            body: `
              <div class="text-center">
                <div class="mb-4">
                  <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold mb-2">Verification Email Sent</h3>
                  <p class="text-gray-600 mb-4">
                    We've sent a verification email to <strong>${data.user.email}</strong>
                  </p>
                  <p class="text-sm text-gray-500">
                    Please check your inbox and click on verification link to complete your registration.
                  </p>
                </div>
                <div class="text-left bg-gray-50 p-4 rounded-lg mb-4">
                  <p class="text-sm font-medium mb-2">What's next?</p>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>✓ Check your email inbox</li>
                    <li>✓ Click on verification link</li>
                    <li>✓ Come back to login</li>
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
      throw this.handleAuthError(error);
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

  // Helper method to extract first name from display name
  extractFirstName(displayName) {
    if (!displayName) return '';
    const parts = displayName.trim().split(' ');
    return parts[0] || '';
  }

  // Helper method to extract last name from display name
  extractLastName(displayName) {
    if (!displayName) return '';
    const parts = displayName.trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  // Create or update user profile (handles both cases)
  async createOrUpdateProfile(userId, profileData) {
    try {
      await this.ensureInitialized();
      const client = await this.supabaseClient.getClient();

      // Prepare profile data with proper field mapping
      const fullProfileData = {
        id: userId, // Use id as primary key
        user_id: userId, // Also include user_id for foreign key
        email: profileData.email || '',
        display_name: profileData.displayName || '',
        first_name: profileData.firstName || this.extractFirstName(profileData.displayName) || '',
        last_name: profileData.lastName || this.extractLastName(profileData.displayName) || '',
        phone: profileData.phone || '',
        country: profileData.country || '',
        email_verified: false, // Default false, only set by Back Office
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

      // Try to insert first (create)
      const { data, error } = await client
        .from('profiles')
        .insert(fullProfileData)
        .select()
        .single();

      if (error) {
        // If insert fails due to duplicate, try update
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log('Profile already exists, updating instead...');
          
          // Remove fields that shouldn't be updated
          const { id, user_id, created_at, ...updateData } = fullProfileData;
          
          const { data: updateResult, error: updateError } = await client
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          console.log('Profile updated successfully:', updateResult);
          return { success: true, data: updateResult };
        } else {
          throw error;
        }
      }

      console.log('Profile created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to create/update user profile:', error);
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
