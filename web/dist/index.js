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
      // ТОЛЬКО GitHub iframe - никаких fallback методов!
      console.log('🔄 Sending via GitHub iframe ONLY');
      await this.sendViaGitHubIframe(eventData);
      this.log('✅ Event sent via GitHub iframe:', eventData.event);
    } catch (error) {
      this.logError('❌ GitHub iframe failed completely:', error);
      console.log('❌ NO FALLBACK - iframe method failed');
    }
  }

  sendViaGitHubIframe(eventData) {
    return new Promise((resolve, reject) => {
      // Создаем параметры для iframe
      const params = new URLSearchParams({
        uid: eventData.affiliate_code,
        action: eventData.event,
        page: eventData.url || window.location.href,
        ref: eventData.referrer || document.referrer,
        sid: eventData.session_id,
        ts: eventData.timestamp,
        ua: eventData.user_agent || navigator.userAgent
      });

      // Создаем iframe с GitHub Pages
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.src = `https://universalsdk.github.io/events-sdk/bypass/simple-tracker.html?${params.toString()}`;
      
      let resolved = false;
      
      // Слушаем сообщения от iframe
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'simple_tracking_sent') {
          if (!resolved) {
            resolved = true;
            resolve();
            window.removeEventListener('message', messageHandler);
            this.log('✅ Simple tracking completed');
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      iframe.onload = () => {
        this.log('GitHub iframe loaded');
        // Если через 3 секунды нет ответа, считаем что не сработало
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('GitHub iframe timeout'));
            window.removeEventListener('message', messageHandler);
          }
        }, 3000);
      };
      
      iframe.onerror = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('GitHub iframe load error'));
          window.removeEventListener('message', messageHandler);
        }
      };
      
      document.body.appendChild(iframe);
      
      // Убираем iframe через 5 секунд
      setTimeout(() => {
        try {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch(e) {}
      }, 5000);
    });
  }

  sendViaForm(data) {
    return new Promise((resolve) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://affiliate.33rd.pro/api/s';  // Короткий URL
      form.style.display = 'none';

      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const input = document.createElement('input');
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
      });

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'target_' + Date.now();
      form.target = iframe.name;
      
      iframe.onload = () => resolve();
      
      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          if (form.parentNode) form.parentNode.removeChild(form);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch(e) {}
      }, 2000);
    });
  }

  sendViaImage(data) {
    return new Promise((resolve, reject) => {
      const url = new URL('https://affiliate.33rd.pro/p.gif');  // Маскируем под картинку
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url.toString();
    });
  }

  sendViaFetch(data) {
    const url = new URL('https://affiliate.33rd.pro/api/collect');
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    return fetch(url.toString(), {
      method: 'GET',
      mode: 'no-cors'
    });
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