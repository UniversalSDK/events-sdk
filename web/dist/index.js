/**
 * Simple Affiliate SDK for web tracking
 */
class AffiliateSDK {
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || 'https://affiliate.33rd.pro/api/tracker.php',
      debug: config.debug || false,
      ...config
    };
    this.sessionId = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      this.log('SDK already initialized');
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('AffiliateSDK can only be used in browser environment');
    }

    // Generate session ID
    this.sessionId = this.generateSessionId();
    
    // Track page load
    await this.trackEvent('page_load', {
      session_id: this.sessionId,
      url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      timestamp: Date.now()
    });

    this.isInitialized = true;
    this.log('SDK initialized successfully');
  }

  async trackEvent(eventName, parameters = {}) {
    try {
      const eventData = {
        affiliate_code: this.config.affiliateCode,
        app_code: this.config.appCode,
        event: eventName,
        timestamp: Date.now(),
        session_id: this.sessionId,
        url: window.location.href,
        ...parameters
      };

      await this.sendEvent(eventData);
      this.log('Event tracked:', eventName);
      
    } catch (error) {
      this.logError('Failed to track event:', error);
    }
  }

  async trackPageView(path, parameters = {}) {
    const pagePath = path || window.location.pathname;
    await this.trackEvent('page_view', {
      page_path: pagePath,
      page_title: document.title,
      referrer: document.referrer,
      ...parameters
    });
  }

  async trackPurchase(purchaseData) {
    const eventData = {
      amount: purchaseData.amount,
      currency: purchaseData.currency || 'USD',
      product_id: purchaseData.productId,
      transaction_id: purchaseData.transactionId,
      ...purchaseData.additionalData
    };

    await this.trackEvent('purchase', eventData);
  }

  async trackButtonClick(buttonId, parameters = {}) {
    await this.trackEvent('button_click', {
      button_id: buttonId,
      ...parameters
    });
  }

  async trackFormSubmit(formName, parameters = {}) {
    await this.trackEvent('form_submit', {
      form_name: formName,
      ...parameters
    });
  }

  async sendEvent(eventData) {
    try {
      const url = new URL(this.config.baseUrl);
      
      // Add all event data as query parameters
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      // Use image pixel for reliable cross-origin tracking
      const img = new Image();
      img.src = url.toString();
      
      this.log('Event sent successfully:', eventData.event);

    } catch (error) {
      this.logError('Failed to send event:', error);
      throw error;
    }
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  log(...args) {
    if (this.config.debug) {
      console.log('[AffiliateSDK]', ...args);
    }
  }

  logError(...args) {
    if (this.config.debug) {
      console.error('[AffiliateSDK Error]', ...args);
    }
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.AffiliateSDK = AffiliateSDK;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AffiliateSDK;
}

// Export as default
if (typeof exports !== 'undefined') {
  exports.default = AffiliateSDK;
}