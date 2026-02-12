/**
 * Back Office Authentication Controller
 * Handles role-based access control for admin panel
 * Integrates with existing AuthService
 */

class BackOfficeAuth {
    constructor() {
        this.authService = window.authService;
        this.requiredRoles = ['superadmin', 'admin', 'support'];
        this.adminOnlyRoles = ['superadmin', 'admin'];
        this.init();
    }

    async init() {
        // Wait for auth service to be ready
        if (this.authService) {
            await this.authService.ensureInitialized();
        }
    }

    // Check if current user has backoffice access
    async hasBackOfficeAccess() {
        try {
            const isAuthenticated = await this.authService.isAuthenticated();
            if (!isAuthenticated) {
                return false;
            }

            const userWithProfile = await this.authService.getCurrentUserWithProfile();
            if (!userWithProfile?.profile) {
                return false;
            }

            return this.requiredRoles.includes(userWithProfile.profile.role);
        } catch (error) {
            console.error('Error checking backoffice access:', error);
            return false;
        }
    }

    // Check if current user has admin-level access
    async hasAdminAccess() {
        try {
            const isAuthenticated = await this.authService.isAuthenticated();
            if (!isAuthenticated) {
                return false;
            }

            const userWithProfile = await this.authService.getCurrentUserWithProfile();
            if (!userWithProfile?.profile) {
                return false;
            }

            return this.adminOnlyRoles.includes(userWithProfile.profile.role);
        } catch (error) {
            console.error('Error checking admin access:', error);
            return false;
        }
    }

    // Get current user with profile
    async getCurrentUser() {
        try {
            return await this.authService.getCurrentUserWithProfile();
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    // Protect backoffice routes
    async protectRoute() {
        const hasAccess = await this.hasBackOfficeAccess();
        
        if (!hasAccess) {
            // Store intended destination for redirect after login
            sessionStorage.setItem('intendedDestination', window.location.pathname);
            
            // Redirect to login
            window.location.href = '/backoffice/login.html';
            return false;
        }
        
        return true;
    }

    // Protect admin-only routes
    async protectAdminRoute() {
        const hasAccess = await this.hasAdminAccess();
        
        if (!hasAccess) {
            // Show access denied message
            this.showAccessDenied();
            return false;
        }
        
        return true;
    }

    // Show access denied message
    showAccessDenied() {
        const html = `
            <div style="
                min-height: 100vh;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            ">
                <div style="
                    background: rgba(30, 41, 59, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    max-width: 400px;
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: rgba(239, 68, 68, 0.1);
                        border: 2px solid rgba(239, 68, 68, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 20px;
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <h2 style="color: white; font-size: 24px; font-weight: 700; margin-bottom: 12px;">Access Denied</h2>
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-bottom: 24px;">
                        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                    </p>
                    <button onclick="window.location.href='/backoffice/pages/index.html'" style="
                        background: linear-gradient(135deg, #00D4AA 0%, #10B981 100%);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        padding: 12px 24px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
        
        document.body.innerHTML = html;
    }

    // Logout and redirect to login
    async logout() {
        try {
            await this.authService.logout();
            
            // Override the default redirect to go to backoffice login
            setTimeout(() => {
                window.location.href = '/backoffice/login.html';
            }, 1000);
        } catch (error) {
            console.error('Logout failed:', error);
            // Force redirect even if logout fails
            window.location.href = '/backoffice/login.html';
        }
    }

    // Update user display information
    async updateUserDisplay() {
        try {
            const userWithProfile = await this.getCurrentUser();
            
            if (!userWithProfile) {
                return;
            }

            // Update user avatar
            const avatarElement = document.getElementById('user-avatar');
            if (avatarElement) {
                const initials = this.getInitials(userWithProfile.profile);
                avatarElement.textContent = initials;
            }

            // Update user name
            const nameElement = document.getElementById('user-name');
            if (nameElement) {
                const displayName = userWithProfile.profile.display_name || 
                                 `${userWithProfile.profile.first_name} ${userWithProfile.profile.last_name}` ||
                                 userWithProfile.email;
                nameElement.textContent = displayName;
            }

            // Update user role
            const roleElement = document.getElementById('user-role');
            if (roleElement) {
                roleElement.textContent = this.formatRole(userWithProfile.profile.role);
            }

            // Show/hide admin sections based on role
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                const hasAdminAccess = this.adminOnlyRoles.includes(userWithProfile.profile.role);
                adminSection.style.display = hasAdminAccess ? 'block' : 'none';
            }

        } catch (error) {
            console.error('Error updating user display:', error);
        }
    }

    // Get user initials
    getInitials(profile) {
        if (profile.display_name) {
            return profile.display_name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        
        if (profile.first_name && profile.last_name) {
            return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
        }
        
        if (profile.email) {
            return profile.email[0].toUpperCase();
        }
        
        return 'U';
    }

    // Format role for display
    formatRole(role) {
        const roleMap = {
            'superadmin': 'Super Admin',
            'admin': 'Administrator',
            'support': 'Support Agent',
            'user': 'User'
        };
        
        return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }

    // Check authentication status and redirect if needed
    async checkAuthStatus() {
        const hasAccess = await this.hasBackOfficeAccess();
        
        if (!hasAccess) {
            window.location.href = '/backoffice/login.html';
            return false;
        }
        
        return true;
    }
}

// Create and export singleton instance
const backOfficeAuth = new BackOfficeAuth();

// Export for global access
window.BackOfficeAuth = backOfficeAuth;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = backOfficeAuth;
}

export default backOfficeAuth;
