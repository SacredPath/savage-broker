/**
 * More Page Controller
 * Handles additional features and settings
 */

// Import shared app initializer
import '/public/assets/js/_shared/app_init.js';

class MorePage {
  constructor() {
    this.init();
  }

  async init() {
    console.log('More page initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  async setupPage() {
    try {
      // Initialize app shell (sidebar, navigation, etc.)
      if (window.AppShell) {
        window.AppShell.initShell();
      }
      
      // Setup page interactions
      this.setupMenuInteractions();
      
      console.log('More page setup complete');
    } catch (error) {
      console.error('Error setting up more page:', error);
      if (window.Notify) {
        window.Notify.error('Failed to load more page');
      }
    }
  }

  loadAppShell() {
    // Load app shell HTML components
    const shellContainer = document.getElementById('app-shell-container');
    if (shellContainer) {
      fetch('/src/components/app-shell.html')
        .then(response => response.text())
        .then(html => {
          shellContainer.innerHTML = html;
          
          // Initialize app shell after loading
          if (window.AppShell) {
            // Re-initialize app shell with new DOM
            window.AppShell.setupShell();
            
            // Re-bind core UI events since the DOM was updated
            window.AppShell.bindCoreUIEvents();
          }
        })
        .catch(error => {
          console.error('Failed to load app shell:', error);
        });
    }
  }

  setupMenuInteractions() {
    // Add ripple effect to menu items
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
      item.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });

    // Add hover effects
    menuItems.forEach(item => {
      item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(4px)';
      });
      
      item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0)';
      });
    });
  }

  // Cleanup method
  destroy() {
    console.log('More page cleanup');
  }
}

// Initialize page controller
window.morePage = new MorePage();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MorePage;
}
