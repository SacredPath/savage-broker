/**
 * PWA Manager for Broker Trading Platform
 * Handles service worker registration, install prompts, and offline functionality
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstallable = false;
    this.isOnline = navigator.onLine;
    this.serviceWorkerRegistration = null;
    this.keepaliveInterval = null;
    this.init();
  }

  async init() {
    console.log('PWA Manager initializing...');
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup online/offline listeners
    this.setupNetworkListeners();
    
    // Setup install prompt detection
    this.setupInstallPrompt();
    
    // Start keepalive ping
    this.startKeepalive();
    
    // Setup PWA UI elements
    this.setupPWAUI();
    
    console.log('PWA Manager initialized');
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('Service Worker registered successfully:', this.serviceWorkerRegistration.scope);
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event);
        });
        
        // Check for service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailable();
            }
          });
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.warn('Service Worker not supported');
    }
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateNetworkStatus();
      if (window.Notify) {
        window.Notify.success('Connection restored');
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateNetworkStatus();
      if (window.Notify) {
        window.Notify.warning('Connection lost - working offline');
      }
    });
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstallable = false;
      this.hideInstallButton();
      if (window.Notify) {
        window.Notify.success('App installed successfully!');
      }
    });
  }

  setupPWAUI() {
    // Create install button if not exists
    if (!document.getElementById('pwa-install-btn')) {
      const installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'btn btn-primary pwa-install-btn';
      installBtn.style.display = 'none';
      installBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Install App
      `;
      installBtn.addEventListener('click', () => this.installApp());
      
      // Add to header or appropriate location
      const header = document.querySelector('.header-actions') || document.body;
      if (header) {
        header.appendChild(installBtn);
      }
    }

    // Create network status indicator
    if (!document.getElementById('network-status')) {
      const networkStatus = document.createElement('div');
      networkStatus.id = 'network-status';
      networkStatus.className = 'network-status';
      networkStatus.innerHTML = `
        <div class="network-indicator">
          <span class="network-dot"></span>
          <span class="network-text">Online</span>
        </div>
      `;
      document.body.appendChild(networkStatus);
    }

    this.updateNetworkStatus();
  }

  showInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.classList.add('pulse');
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
      installBtn.classList.remove('pulse');
    }
  }

  async installApp() {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        if (window.Notify) {
          window.Notify.info('Installing app...');
        }
      } else {
        console.log('User dismissed the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallButton();
    } catch (error) {
      console.error('Error during app installation:', error);
      if (window.Notify) {
        window.Notify.error('Failed to install app');
      }
    }
  }

  updateNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    if (networkStatus) {
      const indicator = networkStatus.querySelector('.network-dot');
      const text = networkStatus.querySelector('.network-text');
      
      if (this.isOnline) {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        text.textContent = 'Online';
        networkStatus.classList.remove('offline');
      } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        text.textContent = 'Offline';
        networkStatus.classList.add('offline');
      }
    }
  }

  showUpdateAvailable() {
    if (window.Notify) {
      const notification = window.Notify.info('App update available! Click to refresh.', {
        duration: 0,
        actions: [
          {
            text: 'Update',
            onClick: () => this.updateApp()
          }
        ]
      });
    }
  }

  async updateApp() {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  startKeepalive() {
    // Send keepalive ping every 10 minutes
    this.keepaliveInterval = setInterval(async () => {
      try {
        const response = await fetch('/functions/keepalive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            domain: window.location.hostname,
            userAgent: navigator.userAgent
          })
        });

        if (response.ok) {
          console.log('Keepalive ping successful');
        } else {
          console.warn('Keepalive ping failed:', response.status);
        }
      } catch (error) {
        console.error('Keepalive ping error:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  handleServiceWorkerMessage(event) {
    const { type, error } = event.data;
    
    switch (type) {
      case 'SERVICE_WORKER_ERROR':
        console.error('Service Worker Error:', error);
        if (window.ErrorBoundary) {
          window.ErrorBoundary.handleError(error);
        }
        break;
      default:
        console.log('Unknown service worker message:', type);
    }
  }

  async syncCriticalData() {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'SYNC_CRITICAL_DATA'
      });
    }
  }

  async clearCache(cacheName = 'broker-runtime') {
    if (this.serviceWorkerRegistration) {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_CLEARED') {
            resolve(true);
          }
        };
        
        this.serviceWorkerRegistration.active.postMessage({
          type: 'CLEAR_CACHE',
          data: { cacheName }
        }, [messageChannel.port2]);
      });
    }
    return false;
  }

  async getCacheData(cacheName = 'broker-runtime') {
    if (this.serviceWorkerRegistration) {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_DATA_RESPONSE') {
            resolve(event.data.data);
          }
        };
        
        this.serviceWorkerRegistration.active.postMessage({
          type: 'GET_CACHE_DATA',
          data: { cacheName }
        }, [messageChannel.port2]);
      });
    }
    return null;
  }

  // Cleanup method
  destroy() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }
  }
}

// Initialize PWA Manager
window.PWAManager = new PWAManager();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}
