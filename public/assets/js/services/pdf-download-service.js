// PDF Download Service for USDT-based signal purchases
class PDFDownloadService {
  constructor() {
    this.baseURL = 'https://your-cdn.com/signals/pdfs/'; // Hardcoded PDF storage
    this.api = window.API;
  }

  async getAvailablePDFs(signalId) {
    try {
      // Get user's confirmed purchases for this signal
      const userId = await this.api.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data: purchases, error } = await this.api.supabase
        .from('signal_usdt_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('signal_id', signalId)
        .eq('confirmed', true)
        .gt('pdf_access_until', new Date().toISOString());

      if (error) {
        console.error('Error checking PDF access:', error);
        throw error;
      }

      if (!purchases || purchases.length === 0) {
        return { hasAccess: false, pdfs: [] };
      }

      // Generate list of available PDFs (auto-generated daily)
      const pdfs = this.generatePDFList(signalId);
      
      return {
        hasAccess: true,
        pdfs: pdfs,
        accessUntil: purchases[0].pdf_access_until
      };

    } catch (error) {
      console.error('Error getting available PDFs:', error);
      return { hasAccess: false, pdfs: [], error: error.message };
    }
  }

  generatePDFList(signalId) {
    const pdfs = [];
    const today = new Date();
    
    // Generate PDFs for the last 30 days (or from purchase date)
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      pdfs.push({
        id: `${signalId}_${dateStr}`,
        date: dateStr,
        displayDate: displayDate,
        url: `${this.baseURL}${signalId}/${signalId}_${dateStr}.pdf`,
        size: '2.5 MB', // Mock size
        description: `Signal analysis for ${displayDate}`
      });
    }
    
    return pdfs;
  }

  async downloadPDF(pdfInfo) {
    try {
      // Check if user has access before download
      const access = await this.getAvailablePDFs(pdfInfo.signalId);
      if (!access.hasAccess) {
        throw new Error('No access to download PDFs for this signal');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = pdfInfo.url;
      link.download = `${pdfInfo.signalId}_${pdfInfo.date}.pdf`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log download for analytics
      await this.logDownload(pdfInfo);

      return { success: true };

    } catch (error) {
      console.error('Error downloading PDF:', error);
      return { success: false, error: error.message };
    }
  }

  async logDownload(pdfInfo) {
    try {
      const userId = await this.api.getCurrentUserId();
      
      const logData = {
        user_id: userId,
        signal_id: pdfInfo.signalId,
        pdf_date: pdfInfo.date,
        downloaded_at: new Date().toISOString()
      };

      // Log to pdf_downloads table (create this table if needed)
      await this.api.supabase
        .from('pdf_downloads')
        .insert(logData);

    } catch (error) {
      console.error('Error logging download:', error);
      // Don't throw error - download should still work
    }
  }

  renderPDFList(signalId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="pdf-downloads">
        <div class="pdf-header">
          <h4>📄 Signal PDFs</h4>
          <p class="pdf-description">Download daily signal analysis PDFs. New PDFs are generated automatically every day.</p>
        </div>
        <div class="pdf-loading" id="pdf-loading">
          <div class="loading-spinner"></div>
          <p>Loading available PDFs...</p>
        </div>
        <div class="pdf-list" id="pdf-list" style="display: none;">
          <!-- PDFs will be loaded here -->
        </div>
      </div>
    `;

    this.loadAndRenderPDFs(signalId);
  }

  async loadAndRenderPDFs(signalId) {
    try {
      const result = await this.getAvailablePDFs(signalId);
      const pdfList = document.getElementById('pdf-list');
      const loading = document.getElementById('pdf-loading');

      if (loading) {
        loading.style.display = 'none';
      }

      if (!result.hasAccess) {
        pdfList.innerHTML = `
          <div class="pdf-no-access">
            <div class="no-access-icon">🔒</div>
            <h5>No PDF Access</h5>
            <p>You need to purchase this signal to access PDFs.</p>
            <button class="btn btn-primary" onclick="window.signalDetailPage.purchaseSignal()">
              Purchase Signal
            </button>
          </div>
        `;
        return;
      }

      const pdfsHTML = result.pdfs.map(pdf => `
        <div class="pdf-item" data-pdf-id="${pdf.id}">
          <div class="pdf-info">
            <div class="pdf-title">
              📄 ${pdf.displayDate}
            </div>
            <div class="pdf-meta">
              <span class="pdf-size">${pdf.size}</span>
              <span class="pdf-date">${pdf.description}</span>
            </div>
          </div>
          <div class="pdf-actions">
            <button class="btn btn-sm btn-primary" onclick="pdfDownloadService.downloadPDF(${JSON.stringify(pdf).replace(/"/g, '&quot;')})">
              📥 Download
            </button>
          </div>
        </div>
      `).join('');

      pdfList.innerHTML = `
        <div class="pdf-access-info">
          <p>✅ PDF access available until ${new Date(result.accessUntil).toLocaleDateString()}</p>
        </div>
        <div class="pdf-grid">
          ${pdfsHTML}
        </div>
      `;

    } catch (error) {
      const pdfList = document.getElementById('pdf-list');
      if (pdfList) {
        pdfList.innerHTML = `
          <div class="pdf-error">
            <div class="error-icon">❌</div>
            <h5>Error Loading PDFs</h5>
            <p>${error.message}</p>
            <button class="btn btn-secondary" onclick="pdfDownloadService.renderPDFList('${signalId}', 'pdf-list')">
              🔄 Retry
            </button>
          </div>
        `;
      }
    }
  }
}

// Initialize globally
let pdfDownloadService;
document.addEventListener('DOMContentLoaded', () => {
  pdfDownloadService = new PDFDownloadService();
});
