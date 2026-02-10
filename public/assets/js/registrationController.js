/**
 * Registration Controller
 * Handles multi-step registration form and user account creation
 */

class RegistrationController {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.init();
    }

    init() {
        console.log('Registration controller initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupForm());
        } else {
            this.setupForm();
        }
    }

    setupForm() {
        try {
            // Get form elements
            this.form = document.getElementById('registration-form');
            this.nextBtn = document.getElementById('next-btn');
            this.prevBtn = document.getElementById('prev-btn');
            this.submitBtn = document.getElementById('submit-btn');
            this.successScreen = document.getElementById('success-screen');

            if (!this.form) {
                console.error('Registration form not found');
                return;
            }

            // Setup event listeners
            this.setupEventListeners();
            
            // Show first step
            this.showStep(1);
            
            console.log('Registration form setup complete');
        } catch (error) {
            console.error('Error setting up registration form:', error);
        }
    }

    setupEventListeners() {
        // Next button
        this.nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleNext();
        });

        // Previous button
        this.prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handlePrevious();
        });

        // Submit button
        this.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Form validation on input
        this.form.addEventListener('input', (e) => {
            this.clearFieldError(e.target);
        });
        
        // Special handling for terms checkbox
        const termsCheckbox = document.getElementById('terms');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.clearFieldError(e.target);
                }
            });
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        const allSteps = this.form.querySelectorAll('.form-step');
        allSteps.forEach(step => {
            step.style.display = 'none';
        });

        // Show current step
        const currentStepElement = this.form.querySelector(`[data-step="${stepNumber}"]`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
        }

        // Update navigation buttons
        this.updateNavigation();
        
        // Update step indicators
        this.updateStepIndicators();

        console.log(`Showing step ${stepNumber}`);
    }

    updateNavigation() {
        // Hide/show previous button
        this.prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';

        // Hide/show next and submit buttons
        if (this.currentStep === this.totalSteps) {
            this.nextBtn.style.display = 'none';
            this.submitBtn.style.display = 'block';
        } else {
            this.nextBtn.style.display = 'block';
            this.submitBtn.style.display = 'none';
        }
    }

    updateStepIndicators() {
        const indicators = this.form.querySelectorAll('.step-indicator');
        indicators.forEach((indicator, index) => {
            if (index < this.currentStep) {
                indicator.classList.add('completed');
            } else {
                indicator.classList.remove('completed');
            }
            
            if (index === this.currentStep - 1) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    handleNext() {
        console.log('handleNext called for step', this.currentStep);
        
        if (this.validateCurrentStep()) {
            console.log('Validation passed for step', this.currentStep);
            this.collectCurrentStepData();
            this.currentStep++;
            
            // Update review step when reaching step 4
            if (this.currentStep === 4) {
                console.log('About to update review step');
                this.updateReviewStep();
            }
            
            this.showStep(this.currentStep);
        } else {
            console.log('Validation failed for step', this.currentStep);
        }
    }

    handlePrevious() {
        this.currentStep--;
        this.showStep(this.currentStep);
    }

    validateCurrentStep() {
        let isValid = true;
        const currentStepElement = this.form.querySelector(`[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Special validation for step 2 (password confirmation)
        if (this.currentStep === 2) {
            const password = this.form.querySelector('#password');
            const confirmPassword = this.form.querySelector('#confirm_password');
            
            if (password && confirmPassword) {
                if (password.value !== confirmPassword.value) {
                    this.showFieldError(confirmPassword, 'Passwords do not match');
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    validateField(field) {
        const fieldName = field.name || field.id; // Use id if name is not present
        
        // Special validation for checkboxes
        if (field.type === 'checkbox') {
            if (!field.checked) {
                this.showFieldError(field, 'You must check this box to proceed');
                return false;
            }
            return true;
        }
        
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(field, 'This field is required');
            return false;
        }

        // Email validation
        if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(field, 'Please enter a valid email address');
                return false;
            }
        }

        // Password validation
        if (field.id === 'password') {
            if (value.length < 8) {
                this.showFieldError(field, 'Password must be at least 8 characters long');
                return false;
            }
        }

        return true;
    }

    showFieldError(field, message) {
        const fieldName = field.name || field.id; // Use id if name is not present
        const errorElement = document.getElementById(`${fieldName}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        field.classList.add('error');
    }

    clearFieldError(field) {
        const fieldName = field.name || field.id; // Use id if name is not present
        const errorElement = document.getElementById(`${fieldName}-error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        field.classList.remove('error');
        
        // Special handling for checkboxes - clear error when checked
        if (field.type === 'checkbox' && field.checked) {
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        }
    }

    collectCurrentStepData() {
        const currentStepElement = this.form.querySelector(`[data-step="${this.currentStep}"]`);
        const inputs = currentStepElement.querySelectorAll('input, select, textarea');

        console.log(`Collecting data for step ${this.currentStep}, found ${inputs.length} inputs:`);
        
        inputs.forEach(input => {
            let value;
            const fieldName = input.name || input.id; // Use id if name is not present
            
            if (input.type === 'checkbox') {
                value = input.checked;
                this.formData[fieldName] = value;
            } else if (input.type === 'radio') {
                // Only collect radio value if it's checked
                if (input.checked) {
                    value = input.value;
                    this.formData[fieldName] = value;
                }
            } else {
                value = input.value.trim();
                this.formData[fieldName] = value;
            }
            
            console.log(`Input: ${fieldName} (${input.type}) = ${value}`);
        });

        console.log('Complete formData after step', this.currentStep, ':', this.formData);
    }

    updateReviewStep() {
        const reviewContent = document.getElementById('review-content');
        if (!reviewContent) return;

        console.log('Updating review step with data:', this.formData);

        const reviewHTML = `
            <div style="display: grid; gap: 20px; background: var(--surface); padding: 20px; border-radius: 12px;">
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 16px;">
                    <h4 style="color: var(--primary); margin: 0 0 12px 0; font-size: 16px;">👤 Personal Information</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong>Full Name:</strong> ${this.formData.full_name || 'Not provided'}</div>
                        <div><strong>Email:</strong> ${this.formData.email || 'Not provided'}</div>
                        <div><strong>Phone:</strong> ${this.formData.phone || 'Not provided'}</div>
                        <div><strong>Date of Birth:</strong> ${this.formData.dob || 'Not provided'}</div>
                    </div>
                </div>
                
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 16px;">
                    <h4 style="color: var(--primary); margin: 0 0 12px 0; font-size: 16px;">🏠 Address Information</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong>Address:</strong> ${this.formData.address_line1 || 'Not provided'} ${this.formData.address_line2 || ''}</div>
                        <div><strong>City:</strong> ${this.formData.city || 'Not provided'}</div>
                        <div><strong>State/Province:</strong> ${this.formData.state || 'Not provided'}</div>
                        <div><strong>Country:</strong> ${this.formData.country || 'Not provided'}</div>
                        <div><strong>Postal Code:</strong> ${this.formData.postal_code || 'Not provided'}</div>
                        <div><strong>Occupation:</strong> ${this.formData.occupation || 'Not provided'}</div>
                    </div>
                </div>
                
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 16px;">
                    <h4 style="color: var(--primary); margin: 0 0 12px 0; font-size: 16px;">🔐 Account Details</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong>Password:</strong> •••••••• (8+ characters)</div>
                        <div><strong>Account Type:</strong> Standard Trading Account</div>
                        <div><strong>Status:</strong> Pending Verification</div>
                    </div>
                </div>
                
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 16px;">
                    <h4 style="color: var(--primary); margin: 0 0 12px 0; font-size: 16px;">📋 Compliance Information</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong>New to Investing:</strong> ${this.formData.new_to_investing || 'Not provided'}</div>
                        <div><strong>Politically Exposed Person:</strong> ${this.formData.pep || 'Not provided'}</div>
                        ${this.formData.pep_details ? `<div><strong>PEP Details:</strong> ${this.formData.pep_details}</div>` : ''}
                        <div><strong>Referral Code:</strong> ${this.formData.referral_code || 'Not provided'}</div>
                    </div>
                </div>
                
                <div style="background: var(--background); padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary);">
                    <div style="font-weight: 600; margin-bottom: 8px;">📋 Summary</div>
                    <div style="font-size: 14px; color: var(--text-secondary);">
                        Please review all information above before creating your account. 
                        Your account will require verification by the Back Office before you can start trading.
                    </div>
                </div>
            </div>
        `;

        reviewContent.innerHTML = reviewHTML;
        console.log('Review step updated successfully');
    }

    async handleSubmit() {
        try {
            console.log('Submitting registration...');

            // Collect final step data
            this.collectCurrentStepData();

            // Update review step if on step 4
            if (this.currentStep === 4) {
                this.updateReviewStep();
            }

            // Show loading state
            this.setSubmitLoading(true);

            // Prepare registration data with all form values
            const registrationData = {
                displayName: this.formData.full_name || '',
                phone: this.formData.phone || '',
                country: this.formData.country || '',
                referralCode: this.formData.referral_code || '',
                address: {
                    address_line1: this.formData.address_line1 || '',
                    address_line2: this.formData.address_line2 || '',
                    city: this.formData.city || '',
                    state: this.formData.state || '',
                    postal_code: this.formData.postal_code || ''
                },
                compliance: {
                    new_to_investing: this.formData.new_to_investing || '',
                    pep: this.formData.pep || '',
                    pep_details: this.formData.pep_details || '',
                    occupation: this.formData.occupation || '',
                    dob: this.formData.dob || ''
                },
                // Split full name into first and last name for database
                firstName: this.formData.full_name?.split(' ')[0] || '',
                lastName: this.formData.full_name?.split(' ').slice(1).join(' ') || ''
            };

            // Call registration service
            const result = await window.AuthService.registerWithEmailPassword(
                this.formData.email,
                this.formData.password,
                registrationData
            );

            if (result.success) {
                console.log('Registration successful:', result);
                this.showSuccess();
            } else {
                console.error('Registration failed:', result.error);
                this.showError(result.error || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showError(error.message || 'An error occurred during registration');
        } finally {
            this.setSubmitLoading(false);
        }
    }

    setSubmitLoading(loading) {
        const submitBtnText = document.getElementById('submit-btn-text');
        const submitSpinner = document.getElementById('submit-spinner');

        if (loading) {
            submitBtnText.textContent = 'Creating Account...';
            submitSpinner.style.display = 'block';
            this.submitBtn.disabled = true;
        } else {
            submitBtnText.textContent = 'Create Account';
            submitSpinner.style.display = 'none';
            this.submitBtn.disabled = false;
        }
    }

    showSuccess() {
        // Hide form
        this.form.style.display = 'none';
        
        // Show success screen
        if (this.successScreen) {
            this.successScreen.style.display = 'block';
        }

        console.log('Registration completed successfully');
    }

    showError(message) {
        if (window.Notify) {
            window.Notify.error(message);
        } else {
            alert(message);
        }
    }
}

// Initialize registration controller
const registrationController = new RegistrationController();
