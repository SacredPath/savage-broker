/**
 * KYC Page Controller
 * Handles Know Your Customer verification process
 */

// Import shared app initializer
import '/assets/js/_shared/app_init.js';

class KYCPage {
  constructor() {
    this.currentUser = null;
    this.kycStatus = null;
    this.uploadedFiles = {
      idFront: null,
      idBack: null,
      selfie: null,
      address: null
    };
    this.init();
  }

  async init() {
    console.log('KYC page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Load app shell components
      this.loadAppShell();
      
      // Load data
      await this.loadUserData();
      await this.loadKYCStatus();
      
      // Setup UI
      this.renderKYCStatus();
      this.setupEventListeners();
      this.setupFileUploads();
      this.populatePersonalInfo();
      
      console.log('KYC page setup complete');
    } catch (error) {
      console.error('Error setting up KYC page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load KYC page');
      }
    }
  }

  loadAppShell() {
    const shellContainer = document.getElementById('app-shell-container');
    if (shellContainer) {
      fetch('/components/app-shell.html')
        .then(response => response.text())
        .then(html => {
          shellContainer.innerHTML = html;
          
          if (window.AppShell) {
            window.AppShell.setupShell();
          }
        })
        .catch(error => {
          console.error('Failed to load app shell:', error);
        });
    }
  }

  async loadUserData() {
    try {
      this.currentUser = await window.AuthService.getCurrentUserWithProfile();
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  async loadKYCStatus() {
    try {
      const { data, error } = await window.API.fetchEdge('kyc_status', {
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      this.kycStatus = data.status || { status: 'not_submitted' };
    } catch (error) {
      console.error('Failed to load KYC status:', error);
      this.kycStatus = { status: 'not_submitted' };
    }
  }


  renderKYCStatus() {
    if (!this.kycStatus) return;

    const container = document.getElementById('kyc-status-card');
    const form = document.getElementById('kyc-form');
    
    if (!container || !form) return;

    let statusHTML = '';
    let showForm = true;

    switch (this.kycStatus.status) {
      case 'not_submitted':
        statusHTML = `
          <div class="kyc-status-header">
            <div class="status-icon status-info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div class="status-content">
              <div class="status-title">Identity Verification Required</div>
              <div class="status-description">
                Complete identity verification to unlock full account features, higher withdrawal limits, and enhanced security.
              </div>
            </div>
          </div>
        `;
        break;
      case 'pending':
        statusHTML = `
          <div class="kyc-status-header">
            <div class="status-icon status-pending">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="status-content">
              <div class="status-title">Verification Under Review</div>
              <div class="status-description">
                Your identity verification is currently under review. This typically takes 1-2 business days. 
                We'll notify you once review is complete.
              </div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 60%;"></div>
          </div>
        `;
        showForm = false;
        break;
      case 'approved':
        statusHTML = `
          <div class="kyc-status-header">
            <div class="status-icon status-approved">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="status-content">
              <div class="status-title">Identity Verified</div>
              <div class="status-description">
                Congratulations! Your identity has been successfully verified. You now have full access to all account features.
              </div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 100%;"></div>
          </div>
        `;
        showForm = false;
        break;
      case 'rejected':
        statusHTML = `
          <div class="kyc-status-header">
            <div class="status-icon status-rejected">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <div class="status-content">
              <div class="status-title">Verification Rejected</div>
              <div class="status-description">
                ${this.kycStatus.rejection_reason || 'Your identity verification was rejected. Please review requirements and resubmit your documents.'}
              </div>
            </div>
          </div>
        `;
        break;
    }

    container.innerHTML = statusHTML;
    form.style.display = showForm ? 'block' : 'none';
  }

  setupEventListeners() {
    // Form submission
    const form = document.getElementById('kyc-submission-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitKYC();
      });
    }
  }

  setupFileUploads() {
    // ID Front upload
    this.setupFileUpload('id-front', 'idFront');
    
    // ID Back upload
    this.setupFileUpload('id-back', 'idBack');
    
    // Selfie upload
    this.setupFileUpload('selfie', 'selfie');
    
    // Address document upload
    this.setupFileUpload('address', 'address');
  }

  setupFileUpload(uploadId, fileKey) {
    const uploadArea = document.getElementById(`${uploadId}-upload`);
    const fileInput = document.getElementById(`${uploadId}-input`);
    const preview = document.getElementById(`${uploadId}-preview`);

    if (!uploadArea || !fileInput || !preview) return;

    // Click to upload
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileUpload(file, fileKey, preview);
      }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const file = e.dataTransfer.files[0];
      if (file) {
        this.handleFileUpload(file, fileKey, preview);
      }
    });
  }

  async handleFileUpload(file, fileKey, preview) {
    // Validate file
    if (!this.validateFile(file)) {
      return;
    }

    try {
      // Show loading state
      preview.innerHTML = `
        <div class="uploaded-file">
          <div class="file-icon">
            <div class="loading-spinner" style="width: 20px; height: 20px;"></div>
          </div>
          <div class="file-info">
            <div class="file-name">Uploading ${file.name}...</div>
            <div class="file-size">Please wait...</div>
          </div>
        </div>
      `;

      // Upload to Supabase Storage
      const fileName = `${fileKey}_${Date.now()}_${file.name}`;
      const filePath = `kyc/${this.currentUser.id}/${fileName}`;

      const { data, error } = await window.SupabaseClient.supabase.storage
        .from('KYC_KEEP')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = window.SupabaseClient.supabase.storage
        .from('KYC_KEEP')
        .getPublicUrl(filePath);

      // Store file info
      this.uploadedFiles[fileKey] = {
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        url: publicUrl
      };

      // Show success preview
      preview.innerHTML = `
        <div class="uploaded-file">
          <div class="file-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
          <button type="button" class="file-remove" onclick="window.kycPage.removeFile('${fileKey}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      window.Notify.success(`${fileKey.replace(/([A-Z])/g, ' $1').trim()} uploaded successfully!`);
    } catch (error) {
      console.error('File upload failed:', error);
      preview.innerHTML = '';
      window.Notify.error(`Failed to upload ${fileKey.replace(/([A-Z])/g, ' $1').trim()}`);
    }
  }

  validateFile(file) {
    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      window.Notify.error('File size must be less than 5MB');
      return false;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      window.Notify.error('File must be PNG, JPG, or PDF');
      return false;
    }

    return true;
  }

  removeFile(fileKey) {
    this.uploadedFiles[fileKey] = null;
    
    const preview = document.getElementById(`${fileKey}-preview`);
    if (preview) {
      preview.innerHTML = '';
    }

    const fileInput = document.getElementById(`${fileKey}-input`);
    if (fileInput) {
      fileInput.value = '';
    }

    window.Notify.info('File removed');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  populatePersonalInfo() {
    if (!this.currentUser || !this.currentUser.profile) return;

    const profile = this.currentUser.profile;
    
    // Pre-fill form with existing data
    if (profile.first_name) {
      document.getElementById('first-name').value = profile.first_name;
    }
    if (profile.last_name) {
      document.getElementById('last-name').value = profile.last_name;
    }
    if (profile.date_of_birth) {
      document.getElementById('date-of-birth').value = profile.date_of_birth;
    }
    if (profile.nationality) {
      document.getElementById('nationality').value = profile.nationality;
    }
  }

  async submitKYC() {
    try {
      // Validate required fields
      if (!this.validateForm()) {
        return;
      }

      // Validate all required files are uploaded
      const requiredFiles = ['idFront', 'idBack', 'selfie', 'address'];
      const missingFiles = requiredFiles.filter(key => !this.uploadedFiles[key]);
      
      if (missingFiles.length > 0) {
        window.Notify.error('Please upload all required documents');
        return;
      }

      // Disable submit button
      const submitBtn = document.getElementById('submit-btn');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      // Collect form data
      const formData = new FormData(document.getElementById('kyc-submission-form'));
      const kycData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        dateOfBirth: formData.get('dateOfBirth'),
        nationality: formData.get('nationality'),
        documents: this.uploadedFiles
      };

      // Submit KYC
      const { data, error } = await window.API.fetchEdge('kyc_submit', {
        method: 'POST',
        body: JSON.stringify(kycData)
      });

      if (error) {
        throw error;
      }

      // Update status
      this.kycStatus = {
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        rejection_reason: null
      };

      // Re-render status
      this.renderKYCStatus();

      // Clear form
      this.clearForm();

      window.Notify.success('KYC submitted successfully! Your verification is now under review.');
    } catch (error) {
      console.error('KYC submission failed:', error);
      window.Notify.error('Failed to submit KYC. Please try again.');
    } finally {
      // Re-enable submit button
      const submitBtn = document.getElementById('submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  }

  validateForm() {
    const requiredFields = [
      'first-name',
      'last-name',
      'date-of-birth',
      'nationality'
    ];

    for (const fieldId of requiredFields) {
      const field = document.getElementById(fieldId);
      if (!field || !field.value.trim()) {
        window.Notify.error('Please fill in all required fields');
        field?.focus();
        return false;
      }
    }

    // Validate age (must be 18+)
    const dob = document.getElementById('date-of-birth').value;
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (age < 18 || (age === 18 && monthDiff < 0)) {
        window.Notify.error('You must be at least 18 years old to complete KYC');
        return false;
      }
    }

    return true;
  }

  clearForm() {
    // Reset form fields
    document.getElementById('kyc-submission-form').reset();
    
    // Clear uploaded files
    this.uploadedFiles = {
      idFront: null,
      idBack: null,
      selfie: null,
      address: null
    };
    
    // Clear previews
    ['id-front', 'id-back', 'selfie', 'address'].forEach(id => {
      const preview = document.getElementById(`${id}-preview`);
      if (preview) {
        preview.innerHTML = '';
      }
      
      const input = document.getElementById(`${id}-input`);
      if (input) {
        input.value = '';
      }
    });
  }

  goToSettings() {
    window.location.href = '/app/settings.html';
  }

  // Cleanup method
  destroy() {
    console.log('KYC page cleanup');
  }
}

// Initialize page controller
window.kycPage = new KYCPage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KYCPage;
}
