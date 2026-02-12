/**
 * Shared App Initializer
 * Ensures consistent loading of core dependencies across all pages
 * Each HTML page loads only its page controller, which includes this shared initializer
 */

// Core dependencies that must be loaded first
const CORE_DEPENDENCIES = [
  '/src/js/api.js',
  '/src/js/supabaseClient.js', 
  '/src/js/auth.js',
  '/src/js/money/money.js',
  '/src/js/ui/notify.js',
  '/src/js/ui/components.js'
];

class AppInitializer {
  constructor() {
    this.loaded = new Set();
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._loadDependencies();
    return this.initPromise;
  }

  async _loadDependencies() {
    console.log('[AppInitializer] Loading core dependencies...');
    
    try {
      // Load all core dependencies in parallel
      const loadPromises = CORE_DEPENDENCIES.map(dep => this._loadScript(dep));
      await Promise.all(loadPromises);
      
      console.log('[AppInitializer] All dependencies loaded successfully');
      
      // Initialize global objects
      this._initializeGlobals();
      
      return true;
    } catch (error) {
      console.error('[AppInitializer] Failed to load dependencies:', error);
      throw error;
    }
  }

  async _loadScript(src) {
    if (this.loaded.has(src)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      
      script.onload = () => {
        this.loaded.add(src);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  _initializeGlobals() {
    // Ensure Money is available globally
    if (!window.Money && typeof Money !== 'undefined') {
      window.Money = new Money();
    }

    // Ensure Notify is available globally
    if (!window.Notify && typeof NotifySystem !== 'undefined') {
      window.Notify = new NotifySystem();
    }

    // Ensure UI components are available globally
    if (!window.UI && typeof UIComponent !== 'undefined') {
      window.UI = new UIComponent();
    }

    console.log('[AppInitializer] Global objects initialized');
  }
}

// Initialize shared app
window.AppInitializer = new AppInitializer();

// Auto-initialize when this script loads
window.AppInitializer.init().catch(error => {
  console.error('[AppInitializer] Critical initialization error:', error);
  
  // Show user-friendly error if possible
  if (document.body) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    errorDiv.innerHTML = `
      <h3>Application Error</h3>
      <p>Failed to load the application. Please refresh the page.</p>
      <button onclick="window.location.reload()" style="
        background: #007AFF;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
      ">Refresh</button>
    `;
    document.body.appendChild(errorDiv);
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppInitializer;
}
