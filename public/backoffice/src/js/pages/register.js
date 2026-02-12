/**
 * Professional Registration Page Controller
 * Multi-step form with validation and Supabase integration
 */

class RegistrationPage {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.formData = {};
    this.init();
  }

  async init() {
    console.log('Registration page initializing...');
    
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
      this.setupStepper();
      this.setupFormValidation();
      this.setupNavigation();
      this.setupRadioButtons();
      this.setupConditionalFields();
      
      console.log('Registration page setup complete');
    } catch (error) {
      console.error('Error setting up registration page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load registration page');
      }
    }
  }

  async checkExistingAuth() {
    try {
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

  setupStepper() {
    this.updateStepper();
  }

  updateStepper() {
    // Update step circles
    document.querySelectorAll('.step').forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNumber < this.currentStep) {
        step.classList.add('completed');
        step.querySelector('.step-circle').innerHTML = '✓';
      } else if (stepNumber === this.currentStep) {
        step.classList.add('active');
        step.querySelector('.step-circle').innerHTML = stepNumber;
      } else {
        step.querySelector('.step-circle').innerHTML = stepNumber;
      }
    });

    // Update progress bar
    const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    const progressBar = document.getElementById('stepper-progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    // Show/hide form steps
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });
    
    const currentFormStep = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
    if (currentFormStep) {
      currentFormStep.classList.add('active');
    }

    // Update navigation buttons
    this.updateNavigationButtons();
  }

  setupFormValidation() {
    // Add input event listeners for real-time validation
    const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      
      input.addEventListener('input', () => {
        // Clear error on input
        this.clearFieldError(input);
      });
    });
  }

  setupNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.previousStep();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.nextStep();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitRegistration();
      });
    }
  }

  setupRadioButtons() {
    // Radio button styling
    document.querySelectorAll('.radio-option').forEach(option => {
      option.addEventListener('click', () => {
        const radio = option.querySelector('input[type="radio"]');
        const name = radio.name;
        
        // Remove selected class from all options in this group
        document.querySelectorAll(`.radio-option input[name="${name}"]`).forEach(otherOption => {
          otherOption.closest('.radio-option').classList.remove('selected');
        });
        
        // Add selected class to clicked option
        option.classList.add('selected');
        radio.checked = true;
        
        // Trigger change event for conditional fields
        radio.dispatchEvent(new Event('change'));
      });
    });
  }

  setupConditionalFields() {
    // PEP details conditional field
    const pepRadios = document.querySelectorAll('input[name="pep"]');
    const pepDetailsField = document.getElementById('pep-details-field');
    
    pepRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          pepDetailsField.classList.add('show');
          document.getElementById('pep_details').setAttribute('required', 'required');
        } else {
          pepDetailsField.classList.remove('show');
          document.getElementById('pep_details').removeAttribute('required');
        }
      });
    });
  }

  updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    // Show/hide previous button
    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
    }

    // Show/hide next vs submit button
    if (nextBtn && submitBtn) {
      if (this.currentStep === this.totalSteps) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'flex';
      } else {
        nextBtn.style.display = 'flex';
        submitBtn.style.display = 'none';
      }
    }
  }

  async nextStep() {
    if (await this.validateCurrentStep()) {
      this.collectStepData();
      
      if (this.currentStep === this.totalSteps - 1) {
        // Moving to review step
        this.populateReview();
      }
      
      this.currentStep++;
      this.updateStepper();
    }
  }

  previousStep() {
    this.currentStep--;
    this.updateStepper();
  }

  async validateCurrentStep() {
    const currentFormStep = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
    const requiredFields = currentFormStep.querySelectorAll('[required]');
    let isValid = true;

    for (const field of requiredFields) {
      if (!this.validateField(field)) {
        isValid = false;
      }
    }

    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.id;
    let isValid = true;
    let errorMessage = '';

    // Required field validation
    if (field.hasAttribute('required') && !value) {
      errorMessage = 'This field is required';
      isValid = false;
    }

    // Specific field validations
    if (isValid && value) {
      switch (fieldName) {
        case 'email':
          if (!this.isValidEmail(value)) {
            errorMessage = 'Please enter a valid email address';
            isValid = false;
          }
          break;
          
        case 'password':
          if (value.length < 8) {
            errorMessage = 'Password must be at least 8 characters long';
            isValid = false;
          } else if (!this.isStrongPassword(value)) {
            errorMessage = 'Password must contain uppercase, lowercase, and numbers';
            isValid = false;
          }
          break;
          
        case 'confirm_password':
          const password = document.getElementById('password').value;
          if (value !== password) {
            errorMessage = 'Passwords do not match';
            isValid = false;
          }
          break;
          
        case 'phone':
          if (!this.isValidPhone(value)) {
            errorMessage = 'Please enter a valid phone number';
            isValid = false;
          }
          break;
          
        case 'dob':
          if (!this.isValidDOB(value)) {
            errorMessage = 'You must be at least 18 years old';
            isValid = false;
          }
          break;
          
        case 'postal_code':
          if (!this.isValidPostalCode(value)) {
            errorMessage = 'Please enter a valid postal code';
            isValid = false;
          }
          break;
          
        case 'referral_code':
          if (value && value.length !== 10) {
            errorMessage = 'Referral code must be exactly 10 characters';
            isValid = false;
          }
          break;
          
        case 'pep_details':
          const pepValue = document.querySelector('input[name="pep"]:checked')?.value;
          if (pepValue === 'yes' && !value) {
            errorMessage = 'PEP details are required when Yes is selected';
            isValid = false;
          }
          break;
      }
    }

    // Show/hide error
    if (!isValid) {
      this.showFieldError(field, errorMessage);
    } else {
      this.clearFieldError(field);
    }

    return isValid;
  }

  showFieldError(field, message) {
    field.classList.add('error');
    const errorElement = document.getElementById(`${field.id}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }
  }

  clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = document.getElementById(`${field.id}-error`);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('show');
    }
  }

  collectStepData() {
    const currentFormStep = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
    const inputs = currentFormStep.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.type === 'radio') {
        if (input.checked) {
          this.formData[input.name] = input.value;
        }
      } else if (input.type === 'checkbox') {
        this.formData[input.id] = input.checked;
      } else {
        this.formData[input.id] = input.value.trim();
      }
    });
  }

  populateReview() {
    const reviewContent = document.getElementById('review-content');
    
    const reviewData = {
      'Personal Information': [
        ['Full Name', this.formData.full_name],
        ['Email', this.formData.email],
        ['Phone', this.formData.phone],
        ['Date of Birth', this.formatDate(this.formData.dob)]
      ],
      'Address': [
        ['Address Line 1', this.formData.address_line1],
        ['Address Line 2', this.formData.address_line2 || 'N/A'],
        ['City', this.formData.city],
        ['State/Province', this.formData.state],
        ['Country', this.getCountryName(this.formData.country)],
        ['Postal Code', this.formData.postal_code]
      ],
      'Additional Information': [
        ['Occupation', this.formData.occupation],
        ['New to Investing', this.formData.new_to_investing === 'yes' ? 'Yes' : 'No'],
        ['Politically Exposed Person', this.formData.pep === 'yes' ? 'Yes' : 'No'],
        ['Referral Code', this.formData.referral_code || 'None']
      ]
    };

    if (this.formData.pep === 'yes') {
      reviewData['Additional Information'].push(['PEP Details', this.formData.pep_details]);
    }

    let html = '';
    for (const [section, fields] of Object.entries(reviewData)) {
      html += `<h4 style="margin-bottom: 12px; color: var(--primary);">${section}</h4>`;
      html += '<div style="margin-bottom: 20px;">';
      
      fields.forEach(([label, value]) => {
        html += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span style="color: var(--text-secondary);">${label}:</span>
            <span style="font-weight: 500;">${value}</span>
          </div>
        `;
      });
      
      html += '</div>';
    }

    reviewContent.innerHTML = html;
  }

  async submitRegistration() {
    if (!await this.validateCurrentStep()) {
      return;
    }

    this.collectStepData();

    // Validate terms checkbox
    if (!this.formData.terms) {
      this.showError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    this.setSubmitLoading(true);

    try {
      // Create user via Supabase Auth
      const result = await window.AuthService.registerWithEmailPassword(
        this.formData.email,
        this.formData.password,
        {
          displayName: this.formData.full_name
        }
      );

      if (result.success) {
        // Create profile record
        await this.createProfile();
        
        // Show success screen
        this.showSuccessScreen();
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showError(error.message || 'Registration failed');
    } finally {
      this.setSubmitLoading(false);
    }
  }

  async createProfile() {
    const profileData = {
      id: null, // Will be set after getting user ID
      full_name: this.formData.full_name,
      email: this.formData.email,
      phone: this.formData.phone,
      dob: this.formData.dob,
      address_line1: this.formData.address_line1,
      address_line2: this.formData.address_line2 || null,
      city: this.formData.city,
      state: this.formData.state,
      country: this.formData.country,
      postal_code: this.formData.postal_code,
      occupation: this.formData.occupation,
      new_to_investing: this.formData.new_to_investing === 'yes',
      pep: this.formData.pep === 'yes',
      pep_details: this.formData.pep === 'yes' ? this.formData.pep_details : null,
      referral_code: this.formData.referral_code || null,
      email_verified: false,
      role: 'user',
      created_at: new Date().toISOString()
    };

    // Get the user ID from the auth result
    const user = await window.AuthService.getCurrentUser();
    if (user) {
      profileData.id = user.id;
      await window.AuthService.createUserProfile(user.id, profileData);
    }
  }

  showSuccessScreen() {
    const form = document.getElementById('registration-form');
    const navigation = document.querySelector('.form-navigation');
    const successScreen = document.getElementById('success-screen');
    
    if (form) form.style.display = 'none';
    if (navigation) navigation.style.display = 'none';
    if (successScreen) successScreen.classList.add('show');
  }

  setSubmitLoading(loading) {
    const submitBtn = document.getElementById('submit-btn');
    const submitBtnText = document.getElementById('submit-btn-text');
    const submitSpinner = document.getElementById('submit-spinner');

    if (loading) {
      submitBtn.disabled = true;
      submitBtnText.style.display = 'none';
      submitSpinner.style.display = 'inline-block';
    } else {
      submitBtn.disabled = false;
      submitBtnText.style.display = 'inline';
      submitSpinner.style.display = 'none';
    }
  }

  // Validation helper methods
  isValidEmail(email) {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    } catch (error) {
      console.error('Email validation regex error:', error);
      return false;
    }
  }

  isStrongPassword(password) {
    try {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      return hasUpper && hasLower && hasNumber;
    } catch (error) {
      console.error('Password validation regex error:', error);
      return false;
    }
  }

  isValidPhone(phone) {
    try {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    } catch (error) {
      console.error('Phone validation regex error:', error);
      return false;
    }
  }

  isValidDOB(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    
    return age >= 18;
  }

  isValidPostalCode(postalCode) {
    try {
      const postalRegex = /^[A-Za-z0-9\s\-]{3,10}$/;
      return postalRegex.test(postalCode);
    } catch (error) {
      console.error('Postal code validation regex error:', error);
      return false;
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCountryName(countryCode) {
    const countries = {
      'US': 'United States',
      'CA': 'Canada',
      'UK': 'United Kingdom',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'SG': 'Singapore'
    };
    return countries[countryCode] || countryCode;
  }

  showError(message) {
    if (window.Notify) {
      window.Notify.error(message);
    } else {
      // Fallback: create a simple modal
      this.createSimpleModal('Error', message, 'error');
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
        <button class="form-button" onclick="document.getElementById('${modalId}').remove()">
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
    console.log('Registration page cleanup');
  }
}

// Initialize page controller
window.registrationPage = new RegistrationPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegistrationPage;
}
