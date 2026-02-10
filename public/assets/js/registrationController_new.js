/**
 * Registration Controller - REST API Only Version
 * Handles multi-step registration form and user account creation
 * Uses only REST API calls, no edge functions
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
        this.nextBtn.addEventListener('click', () => this.handleNext());
        
        // Previous button
        this.prevBtn.addEventListener('click', () => this.handlePrevious());
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleNext() {
        try {
            // Validate current step
            if (!this.validateCurrentStep()) {
                console.error(`Validation failed for step ${this.currentStep}`);
                return;
            }

            console.log(`handleNext called for step ${this.currentStep}`);

            // Collect data from current step
            this.collectCurrentStepData();

            // Move to next step
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.showStep(this.currentStep);
            }

            // Update review step if on step 4
            if (this.currentStep === 4) {
                this.updateReviewStep();
            }

        } catch (error) {
            console.error('Error in handleNext:', error);
        }
    }

    async handlePrevious() {
        try {
            if (this.currentStep > 1) {
                this.currentStep--;
                this.showStep(this.currentStep);
            }
        } catch (error) {
            console.error('Error in handlePrevious:', error);
        }
    }

    validateCurrentStep() {
        const step = this.currentStep;
        let isValid = true;
        let errorMessage = '';

        switch (step) {
            case 1:
                // Personal information validation
                const fullName = document.getElementById('full_name')?.value?.trim();
                const email = document.getElementById('email')?.value?.trim();
                const phone = document.getElementById('phone')?.value?.trim();
                const dob = document.getElementById('dob')?.value?.trim();

                if (!fullName || fullName.length < 2) {
                    isValid = false;
                    errorMessage = 'Full name is required';
                } else if (!email || !this.isValidEmail(email)) {
                    isValid = false;
                    errorMessage = 'Valid email is required';
                } else if (!phone || phone.length < 10) {
                    isValid = false;
                    errorMessage = 'Phone number is required';
                } else if (!dob) {
                    isValid = false;
                    errorMessage = 'Date of birth is required';
                }

                break;

            case 2:
                // Account security validation
                const password = document.getElementById('password')?.value?.trim();
                const confirmPassword = document.getElementById('confirm_password')?.value?.trim();
                const addressLine1 = document.getElementById('address_line1')?.value?.trim();
                const city = document.getElementById('city')?.value?.trim();
                const state = document.getElementById('state')?.value?.trim();
                const country = document.getElementById('country')?.value?.trim();
                const postalCode = document.getElementById('postal_code')?.value?.trim();
                const occupation = document.getElementById('occupation')?.value?.trim();

                if (!password || password.length < 8) {
                    isValid = false;
                    errorMessage = 'Password must be at least 8 characters';
                } else if (password !== confirmPassword) {
                    isValid = false;
                    errorMessage = 'Passwords do not match';
                } else if (!addressLine1 || addressLine1.length < 5) {
                    isValid = false;
                    errorMessage = 'Address is required';
                } else if (!city || city.length < 2) {
                    isValid = false;
                    errorMessage = 'City is required';
                } else if (!state || state.length < 2) {
                    isValid = false;
                    errorMessage = 'State is required';
                } else if (!country) {
                    isValid = false;
                    errorMessage = 'Country is required';
                } else if (!postalCode || postalCode.length < 3) {
                    isValid = false;
                    errorMessage = 'Postal code is required';
                } else if (!occupation || occupation.length < 2) {
                    isValid = false;
                    errorMessage = 'Occupation is required';
                }

                break;

            case 3:
                // Compliance validation
                const newToInvesting = document.querySelector('input[name="new_to_investing"]:checked')?.value;
                const pep = document.querySelector('input[name="pep"]:checked')?.value;
                const pepDetails = document.getElementById('pep_details')?.value?.trim();
                const terms = document.getElementById('terms')?.checked;

                if (!newToInvesting) {
                    isValid = false;
                    errorMessage = 'Please select if you are new to investing';
                } else if (!pep) {
                    isValid = false;
                    errorMessage = 'Please select PEP status';
                } else if (pep === 'yes' && !pepDetails) {
                    isValid = false;
                    errorMessage = 'PEP details are required when PEP status is yes';
                } else if (!terms) {
                    isValid = false;
                    errorMessage = 'You must agree to the terms and conditions';
                }

                break;
        }

        if (!isValid) {
            if (window.Notify) {
                window.Notify.error(errorMessage);
            }
            return false;
        }

        return true;
    }

    collectCurrentStepData() {
        const step = this.currentStep;
        const inputs = this.form?.querySelectorAll('input, select, textarea');
        
        console.log(`Collecting data for step ${step}, found ${inputs.length} inputs:`);

        inputs.forEach(input => {
            const value = input.type === 'checkbox' ? input.checked : input.value;
            console.log(`Input: ${input.name} (${input.type}) = ${value}`);
            
            // Store form data
            if (input.name) {
                this.formData[input.name] = value;
            }
        });

        console.log(`Complete formData after step ${step} :`, this.formData);
    }

    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step').forEach(step => {
            step.style.display = 'none';
        });

        // Show current step
        const currentStepElement = document.getElementById(`step-${stepNumber}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log(`Showing step ${stepNumber}`);
    }

    updateNavigationButtons() {
        // Hide previous button on first step
        this.prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
        
        // Show/Hide next button based on current step
        if (this.currentStep === this.totalSteps) {
            this.nextBtn.textContent = 'Submit Registration';
            this.nextBtn.onclick = () => this.handleSubmit();
        } else {
            this.nextBtn.textContent = 'Next';
            this.nextBtn.onclick = () => this.handleNext();
        }
    }

    updateReviewStep() {
        const reviewData = document.getElementById('review-data');
        if (reviewData) {
            let html = '<div class="review-section">';
            
            // Personal Information
            html += `
                <div class="review-group">
                    <h4>Personal Information</h4>
                    <p><strong>Full Name:</strong> ${this.formData.full_name || 'Not provided'}</p>
                    <p><strong>Email:</strong> ${this.formData.email || 'Not provided'}</p>
                    <p><strong>Phone:</strong> ${this.formData.phone || 'Not provided'}</p>
                    <p><strong>Date of Birth:</strong> ${this.formData.dob || 'Not provided'}</p>
                </div>
            `;

            // Account Security
            html += `
                <div class="review-group">
                    <h4>Account Security</h4>
                    <p><strong>Country:</strong> ${this.formData.country || 'Not provided'}</p>
                    <p><strong>Postal Code:</strong> ${this.formData.postal_code || 'Not provided'}</p>
                    <p><strong>Occupation:</strong> ${this.formData.occupation || 'Not provided'}</p>
                </div>
            `;

            // Address Information
            if (this.formData.address_line1 || this.formData.city || this.formData.state || this.formData.postal_code) {
                html += `
                    <div class="review-group">
                        <h4>Address Information</h4>
                        <p><strong>Address:</strong> ${this.formData.address_line1 || ''} ${this.formData.address_line2 || ''}</p>
                        <p><strong>City:</strong> ${this.formData.city || 'Not provided'}</p>
                        <p><strong>State:</strong> ${this.formData.state || 'Not provided'}</p>
                        <p><strong>Postal Code:</strong> ${this.formData.postal_code || 'Not provided'}</p>
                    </div>
                `;
            }

            // Compliance Information
            html += `
                <div class="review-group">
                    <h4>Compliance Information</h4>
                    <p><strong>New to Investing:</strong> ${this.formData.new_to_investing || 'Not provided'}</p>
                    <p><strong>PEP Status:</strong> ${this.formData.pep || 'Not provided'}</p>
                    ${this.formData.pep === 'yes' && this.formData.pep_details ? `<p><strong>PEP Details:</strong> ${this.formData.pep_details}</p>` : ''}
                    <p><strong>Referral Code:</strong> ${this.formData.referral_code || 'Not provided'}</p>
                </div>
            `;

            html += '</div>';
            reviewData.innerHTML = html;
        }

        console.log('Review step updated successfully');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

            // Call registration service via REST API
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
                this.showError(result.error?.message || 'Registration failed');
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

        // Redirect to login after delay
        setTimeout(() => {
            window.location.href = '/src/pages/auth/login.html';
        }, 3000);

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
window.RegistrationController = new RegistrationController();
