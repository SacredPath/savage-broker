// USDT Purchase Modal Component
class USDTPurchaseModal {
  constructor() {
    this.modal = null;
    this.isConfirming = false;
    this.confirmationInterval = null;
    this.purchaseData = null;
    
    // USDT address for signal purchases - should be configured in environment
    this.USDT_ADDRESS = window.__ENV?.USDT_ADDRESS || "TMaBfLJXzYWXQeQqfG3pVjJg6XcJ6K7m8N"; // Example TRC20 USDT address
    
    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    const modalHTML = `
      <div id="usdt-purchase-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h3>📈 Purchase Signal with USDT</h3>
            <button class="modal-close" onclick="usdtPurchaseModal.close()">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="purchase-info">
              <div class="signal-details">
                <h4 id="modal-signal-title">Signal Title</h4>
                <p id="modal-signal-description">Signal Description</p>
                <div class="price-info">
                  <span class="price-label">Price:</span>
                  <span class="price-amount" id="modal-price">0 USDT</span>
                </div>
              </div>
              
              <div class="payment-instructions">
                <h4>📱 Send USDT to this address:</h4>
                <div class="address-container">
                  <input type="text" id="usdt-address" readonly value="${this.USDT_ADDRESS}" />
                  <button class="copy-btn" onclick="usdtPurchaseModal.copyAddress()">📋 Copy</button>
                </div>
                <p class="network-info">
                  <strong>Network:</strong> TRC20 (Tron)<br>
                  <strong>Confirmation:</strong> 2 blocks required<br>
                  <strong>Min Amount:</strong> <span id="modal-min-amount">1 USDT</span>
                </p>
              </div>
              
              <div class="transaction-input">
                <label for="tx-hash">Transaction Hash (TxID):</label>
                <div class="input-group">
                  <input type="text" id="tx-hash" placeholder="Paste your transaction hash here..." />
                  <button class="paste-btn" onclick="usdtPurchaseModal.pasteTransactionHash()" title="Paste from clipboard">📋 Paste</button>
                </div>
                <div class="input-help">
                  <small>📌 After sending USDT, copy the transaction hash from your wallet and paste it here</small>
                  <small>🔍 We'll automatically confirm your transaction on the blockchain</small>
                </div>
              </div>
              
              <div class="confirmation-status" id="confirmation-status" style="display: none;">
                <h4>🔍 Confirming Transaction...</h4>
                <div class="status-message" id="status-message"></div>
                <div class="progress-bar">
                  <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="retry-section" id="retry-section" style="display: none;">
                  <button class="retry-btn" onclick="usdtPurchaseModal.retryConfirmation()">🔄 Retry Confirmation</button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-primary" id="confirm-purchase-btn" onclick="usdtPurchaseModal.startConfirmation()">
              🚀 Confirm Purchase
            </button>
            <button class="btn btn-secondary" onclick="usdtPurchaseModal.close()">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('usdt-purchase-modal');
  }

  attachEventListeners() {
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  show(signalData) {
    if (!this.modal) return;
    
    this.purchaseData = signalData;
    
    // Update modal with signal information
    document.getElementById('modal-signal-title').textContent = signalData.title || 'Signal';
    document.getElementById('modal-signal-description').textContent = signalData.description || '';
    document.getElementById('modal-price').textContent = `${signalData.price || '0'} USDT`;
    document.getElementById('modal-min-amount').textContent = `${signalData.price || '1'} USDT`;
    
    // Reset form
    document.getElementById('tx-hash').value = '';
    document.getElementById('confirmation-status').style.display = 'none';
    document.getElementById('confirm-purchase-btn').disabled = false;
    
    this.modal.style.display = 'flex';
  }

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.stopConfirmation();
    }
  }

  copyAddress() {
    const addressInput = document.getElementById('usdt-address');
    addressInput.select();
    document.execCommand('copy');
    
    // Show feedback
    const copyBtn = event.target;
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  }

  async pasteTransactionHash() {
    try {
      // Try to read from clipboard
      const text = await navigator.clipboard.readText();
      if (text) {
        const txHashInput = document.getElementById('tx-hash');
        txHashInput.value = text.trim();
        
        // Show feedback
        const pasteBtn = document.querySelector('.paste-btn');
        const originalText = pasteBtn.textContent;
        pasteBtn.textContent = '✅ Pasted!';
        setTimeout(() => {
          pasteBtn.textContent = originalText;
        }, 2000);
        
        // Trigger validation
        txHashInput.dispatchEvent(new Event('input'));
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      window.Notify.error('Failed to paste from clipboard. Please paste manually.');
    }
  }

  async startConfirmation() {
    const txHash = document.getElementById('tx-hash').value.trim();
    
    if (!txHash) {
      window.Notify.error('Please enter your transaction hash');
      return;
    }

    if (!this.purchaseData) {
      window.Notify.error('No signal data available');
      return;
    }

    // Disable button and show confirmation status
    document.getElementById('confirm-purchase-btn').disabled = true;
    document.getElementById('confirmation-status').style.display = 'block';
    document.getElementById('retry-section').style.display = 'none';
    
    this.isConfirming = true;
    
    // Create purchase record
    await this.createPurchaseRecord(txHash);
    
    // Start confirmation process
    this.confirmTransaction(txHash);
  }

  async createPurchaseRecord(txHash) {
    try {
      const userId = await window.API.getCurrentUserId();
      
      const purchaseData = {
        user_id: userId,
        signal_id: this.purchaseData.id,
        amount: this.purchaseData.price,
        currency: 'USDT',
        tx_hash: txHash,
        network: 'TRC20',
        confirmed: false,
        pdf_access_until: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days
        status: 'pending'
      };

      const { data, error } = await window.API.supabase
        .from('signal_usdt_purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create purchase record:', error);
        throw error;
      }

      this.purchaseData.purchaseId = data.id;
      console.log('Purchase record created:', data);
      
    } catch (error) {
      console.error('Error creating purchase record:', error);
      window.Notify.error('Failed to create purchase record');
      this.close();
    }
  }

  async confirmTransaction(txHash) {
    if (!this.isConfirming) return;

    try {
      this.updateStatus('Checking transaction on blockchain...', 25);
      
      // Try Tronscan first (TRC20)
      let confirmed = await this.checkTronscan(txHash);
      
      // If Tronscan fails, try other explorers
      if (!confirmed) {
        this.updateStatus('Checking alternative explorers...', 50);
        confirmed = await this.checkBlockCypher(txHash);
      }
      
      if (!confirmed) {
        this.updateStatus('Checking Etherscan...', 75);
        confirmed = await this.checkEtherscan(txHash);
      }

      if (confirmed) {
        await this.markAsConfirmed(txHash);
        this.updateStatus('✅ Transaction confirmed! Purchase completed.', 100);
        
        setTimeout(() => {
          window.Notify.success('Signal purchase confirmed! You can now download PDFs.');
          this.close();
          // Refresh the signal detail page
          if (window.signalDetailPage) {
            window.signalDetailPage.loadUserAccess();
            window.signalDetailPage.renderSignal();
          }
        }, 2000);
        
      } else {
        this.updateStatus('⏳ Transaction not yet confirmed. Checking again...', 50);
        // Retry after 10 seconds
        this.confirmationInterval = setTimeout(() => {
          this.confirmTransaction(txHash);
        }, 10000);
      }
      
    } catch (error) {
      console.error('Confirmation error:', error);
      this.updateStatus('❌ Error confirming transaction. Please retry.', 0);
      this.showRetryButton();
    }
  }

  async checkTronscan(txHash) {
    try {
      const response = await fetch(`https://api.tronscan.org/api/transaction-info?hash=${txHash}`);
      const data = await response.json();
      
      if (data && data.contractRet && data.contractRet.length > 0) {
        const tx = data.contractRet[0];
        // Check if it's USDT and confirmed (2 blocks)
        return tx.confirmed && tx.blockNumber > 0;
      }
      return false;
    } catch (error) {
      console.error('Tronscan error:', error);
      return false;
    }
  }

  async checkBlockCypher(txHash) {
    try {
      const response = await fetch(`https://api.blockcypher.com/v1/btc/main/txs/${txHash}`);
      const data = await response.json();
      
      // Check confirmations (2 blocks required)
      return data.confirmations >= 2;
    } catch (error) {
      console.error('BlockCypher error:', error);
      return false;
    }
  }

  async checkEtherscan(txHash) {
    try {
      const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=YOUR_API_KEY`);
      const data = await response.json();
      
      if (data.result) {
        // Check confirmations (2 blocks required)
        return data.result.status === '0x1' && data.result.blockNumber !== null;
      }
      return false;
    } catch (error) {
      console.error('Etherscan error:', error);
      return false;
    }
  }

  async markAsConfirmed(txHash) {
    try {
      const { error } = await window.API.supabase
        .from('signal_usdt_purchases')
        .update({
          confirmed: true,
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('tx_hash', txHash);

      if (error) {
        console.error('Failed to mark as confirmed:', error);
      }
    } catch (error) {
      console.error('Error marking as confirmed:', error);
    }
  }

  updateStatus(message, progress) {
    document.getElementById('status-message').textContent = message;
    document.getElementById('progress-fill').style.width = `${progress}%`;
  }

  showRetryButton() {
    document.getElementById('retry-section').style.display = 'block';
  }

  retryConfirmation() {
    const txHash = document.getElementById('tx-hash').value.trim();
    document.getElementById('retry-section').style.display = 'none';
    this.confirmTransaction(txHash);
  }

  stopConfirmation() {
    this.isConfirming = false;
    if (this.confirmationInterval) {
      clearTimeout(this.confirmationInterval);
      this.confirmationInterval = null;
    }
  }
}

// Initialize modal globally and attach to window
let usdtPurchaseModal;

// Function to initialize modal
function initializeUSDTPurchaseModal() {
  usdtPurchaseModal = new USDTPurchaseModal();
  window.usdtPurchaseModal = usdtPurchaseModal;
  console.log('USDT Purchase Modal initialized');
}

// Initialize immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUSDTPurchaseModal);
} else {
  initializeUSDTPurchaseModal();
}
