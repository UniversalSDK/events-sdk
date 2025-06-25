/**
 * Pixel settings interface
 */
export interface PixelSettings {
  facebook_pixel_id?: string;
  tiktok_pixel_id?: string;
  google_ads_id?: string;
  enabled?: boolean;
}

/**
 * AffiliateSDK Configuration interface
 */
export interface AffiliateSDKConfig {
  affiliateCode: string;
  appCode: string;
  baseUrl?: string;
  pixelSettingsUrl?: string;
  debug?: boolean;
  enablePixels?: boolean;
  autoTrack?: {
    pageViews?: boolean;
    clicks?: boolean;
    forms?: boolean;
    scrolling?: boolean;
    timeOnPage?: boolean;
  };
}

/**
 * Purchase data interface
 */
export interface PurchaseData {
  amount: number;
  currency?: string;
  productId: string;
  transactionId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Event parameters interface
 */
export interface EventParameters {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * User properties interface
 */
export interface UserProperties {
  [key: string]: string | number | boolean;
}

/**
 * Device information interface
 */
interface DeviceInfo {
  user_agent: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  color_depth: number;
  pixel_ratio: number;
  timezone: string;
  language: string;
  platform: string;
  referrer: string;
  url: string;
}

/**
 * Main AffiliateSDK class for web applications
 */
export class AffiliateSDK {
  private config: AffiliateSDKConfig;
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private lastEventTime: number | null = null;
  private isInitialized = false;
  
  private deviceInfo: DeviceInfo | null = null;
  private eventQueue: Array<Record<string, any>> = [];
  private pixelSettings: PixelSettings | null = null;
  
  private readonly platform = 'web';
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private readonly storagePrefix: string;
  
  // Auto-tracking state
  private autoTrackingSetup = false;
  private scrollThresholds = { '25': false, '50': false, '75': false, '100': false };
  private timeThresholds = { '30': false, '60': false, '120': false };
  private pageStartTime = 0;
  
  constructor(config: AffiliateSDKConfig) {
    // Auto-detect base URL if not provided
    const baseHost = typeof window !== 'undefined' ? window.location.origin : 'https://affiliate.33rd.pro';
    
    this.config = {
      baseUrl: `${baseHost}/api/tracker.php`,
      pixelSettingsUrl: `${baseHost}/api/pixel-settings.php`,
      debug: false,
      enablePixels: true,
      autoTrack: {
        pageViews: true,
        clicks: true,
        forms: true,
        scrolling: true,
        timeOnPage: true,
      },
      ...config,
    };
    
    this.storagePrefix = `affiliate_sdk_${this.config.affiliateCode}`;
    
    // Bind methods to preserve context
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        this.log('SDK already initialized');
        return;
      }

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('AffiliateSDK can only be used in browser environment');
      }

      // Generate or restore session ID
      this.sessionId = this.getOrCreateSessionId();
      this.sessionStartTime = Date.now();
      this.lastEventTime = Date.now();
      this.pageStartTime = Date.now();

      // Collect device information
      this.collectDeviceInfo();

      // Load pixel settings
      if (this.config.enablePixels) {
        await this.loadPixelSettings();
        this.initializePixels();
      }

      // Process any queued events
      await this.processEventQueue();

      // Setup auto-tracking
      if (this.config.autoTrack) {
        this.setupAutoTracking();
      }

      // Setup page lifecycle events
      this.setupPageLifecycle();

      // Track page load
      await this.trackEvent('page_load', {
        session_id: this.sessionId,
        platform: this.platform,
        ...this.deviceInfo,
      });

      this.isInitialized = true;
      this.log('SDK initialized successfully');

    } catch (error) {
      this.logError('Failed to initialize SDK:', error);
      throw error;
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(eventName: string, parameters: EventParameters = {}): Promise<void> {
    try {
      const eventData = {
        affiliate_code: this.config.affiliateCode,
        app_code: this.config.appCode,
        event: eventName,
        timestamp: Date.now(),
        session_id: this.sessionId,
        platform: this.platform,
        url: window.location.href,
        ...parameters,
      };

      await this.sendEvent(eventData);
      
      // Send to pixels if enabled
      if (this.config.enablePixels && this.pixelSettings) {
        await this.sendToPixels(eventName, parameters);
      }
      
      this.lastEventTime = Date.now();

    } catch (error) {
      this.logError('Failed to track event:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(path?: string, parameters: EventParameters = {}): Promise<void> {
    const pagePath = path || window.location.pathname;
    await this.trackEvent('page_view', {
      page_path: pagePath,
      page_title: document.title,
      referrer: document.referrer,
      ...parameters,
    });
  }

  /**
   * Track purchase event
   */
  async trackPurchase(purchaseData: PurchaseData): Promise<void> {
    const eventData = {
      amount: purchaseData.amount,
      currency: purchaseData.currency || 'USD',
      product_id: purchaseData.productId,
      transaction_id: purchaseData.transactionId,
      ...purchaseData.additionalData,
    };

    await this.trackEvent('purchase', eventData);
  }

  /**
   * Track button click
   */
  async trackButtonClick(buttonId: string, parameters: EventParameters = {}): Promise<void> {
    await this.trackEvent('button_click', {
      button_id: buttonId,
      ...parameters,
    });
  }

  /**
   * Track form submission
   */
  async trackFormSubmit(formName: string, parameters: EventParameters = {}): Promise<void> {
    await this.trackEvent('form_submit', {
      form_name: formName,
      ...parameters,
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    try {
      localStorage.setItem(
        `${this.storagePrefix}_user_props`,
        JSON.stringify(properties)
      );
    } catch (error) {
      this.logError('Failed to set user properties:', error);
    }
  }

  /**
   * Get user properties
   */
  getUserProperties(): UserProperties {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}_user_props`);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      this.logError('Failed to get user properties:', error);
      return {};
    }
  }

  /**
   * Track session end
   */
  async trackSessionEnd(): Promise<void> {
    if (!this.sessionStartTime) return;

    const sessionDuration = Date.now() - this.sessionStartTime;
    await this.trackEvent('session_end', {
      duration: sessionDuration,
      session_id: this.sessionId,
    });
  }

  // Private methods

  private collectDeviceInfo(): void {
    const screen = window.screen;
    const nav = navigator;
    
    this.deviceInfo = {
      user_agent: nav.userAgent,
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      color_depth: screen.colorDepth,
      pixel_ratio: window.devicePixelRatio || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: nav.language,
      platform: nav.platform,
      referrer: document.referrer,
      url: window.location.href,
    };
  }

  private getOrCreateSessionId(): string {
    try {
      let sessionId = localStorage.getItem(`${this.storagePrefix}_session`);
      
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${this.generateRandomString(9)}`;
        localStorage.setItem(`${this.storagePrefix}_session`, sessionId);
      }
      
      return sessionId;
    } catch (error) {
      this.logError('Failed to get/create session ID:', error);
      return `sess_${Date.now()}_${this.generateRandomString(9)}`;
    }
  }

  private async sendEvent(eventData: Record<string, any>): Promise<void> {
    try {
      const url = new URL(this.config.baseUrl!);
      
      // Add all event data as query parameters
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'no-cors', // Allow cross-origin requests
      });

      this.log('Event sent successfully:', eventData.event);

    } catch (error) {
      this.logError('Failed to send event:', error);
      
      // Queue event for retry
      this.eventQueue.push({
        ...eventData,
        retry_count: 0,
        queued_at: Date.now(),
      });
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToProcess) {
      try {
        if (event.retry_count < 3) {
          const { retry_count, queued_at, ...eventToSend } = event;
          await this.sendEvent(eventToSend);
        }
      } catch (error) {
        // Re-queue with incremented retry count
        this.eventQueue.push({
          ...event,
          retry_count: event.retry_count + 1,
        });
      }
    }
  }

  private setupAutoTracking(): void {
    if (this.autoTrackingSetup) return;
    
    const autoTrack = this.config.autoTrack!;

    // Auto-track clicks
    if (autoTrack.clicks) {
      document.addEventListener('click', this.handleClick.bind(this), true);
    }

    // Auto-track form submissions
    if (autoTrack.forms) {
      document.addEventListener('submit', this.handleFormSubmit.bind(this), true);
    }

    // Auto-track scrolling
    if (autoTrack.scrolling) {
      window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }

    // Auto-track time on page
    if (autoTrack.timeOnPage) {
      this.setupTimeTracking();
    }

    this.autoTrackingSetup = true;
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    let clickTarget = target;
    let attempts = 0;
    const maxAttempts = 5;

    // Walk up the DOM to find a clickable element
    while (clickTarget && attempts < maxAttempts) {
      const tagName = clickTarget.tagName?.toLowerCase();
      const role = clickTarget.getAttribute('role');
      
      if (tagName === 'button' || 
          tagName === 'a' || 
          role === 'button' || 
          clickTarget.onclick !== null ||
          clickTarget.classList.contains('btn') ||
          clickTarget.classList.contains('button')) {
        
        this.trackEvent('click', {
          element_type: tagName,
          element_id: clickTarget.id || '',
          element_class: clickTarget.className || '',
          element_text: clickTarget.textContent?.trim().substring(0, 100) || '',
          element_role: role || '',
        });
        break;
      }
      
      clickTarget = clickTarget.parentElement as HTMLElement;
      attempts++;
    }
  }

  private handleFormSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    if (!form || form.tagName.toLowerCase() !== 'form') return;

    this.trackEvent('form_submit', {
      form_id: form.id || '',
      form_name: form.name || '',
      form_action: form.action || '',
      form_method: form.method || 'get',
    });
  }

  private handleScroll(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

    // Track scroll milestones
    ['25', '50', '75', '100'].forEach(threshold => {
      const thresholdNum = parseInt(threshold);
      if (scrollPercent >= thresholdNum && !this.scrollThresholds[threshold as keyof typeof this.scrollThresholds]) {
        this.scrollThresholds[threshold as keyof typeof this.scrollThresholds] = true;
        this.trackEvent('scroll_depth', {
          scroll_percent: thresholdNum,
          page_height: documentHeight,
        });
      }
    });
  }

  private setupTimeTracking(): void {
    const checkTimeSpent = () => {
      const timeSpent = Math.round((Date.now() - this.pageStartTime) / 1000);
      
      ['30', '60', '120'].forEach(threshold => {
        const thresholdNum = parseInt(threshold);
        if (timeSpent >= thresholdNum && !this.timeThresholds[threshold as keyof typeof this.timeThresholds]) {
          this.timeThresholds[threshold as keyof typeof this.timeThresholds] = true;
          this.trackEvent('time_on_page', {
            time_spent: thresholdNum,
            page_url: window.location.href,
          });
        }
      });
    };

    // Check every 5 seconds
    setInterval(checkTimeSpent, 5000);
  }

  private setupPageLifecycle(): void {
    // Track page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleBeforeUnload(): void {
    const timeSpent = Math.round((Date.now() - this.pageStartTime) / 1000);
    
    if (timeSpent > 3) {
      // Use sendBeacon for reliable event sending on page unload
      const eventData = {
        affiliate_code: this.config.affiliateCode,
        app_code: this.config.appCode,
        event: 'page_unload',
        timestamp: Date.now(),
        session_id: this.sessionId,
        time_spent: timeSpent,
        url: window.location.href,
      };

      const url = new URL(this.config.baseUrl!);
      Object.entries(eventData).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url.toString());
      }
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.trackSessionEnd();
    } else {
      this.updateSessionIfNeeded();
    }
  }

  private updateSessionIfNeeded(): void {
    if (!this.lastEventTime) return;
    
    const timeSinceLastEvent = Date.now() - this.lastEventTime;
    
    if (timeSinceLastEvent > this.sessionTimeout) {
      // Start new session
      this.sessionId = this.getOrCreateSessionId();
      this.sessionStartTime = Date.now();
      this.pageStartTime = Date.now();
      
      this.trackEvent('session_start', {
        session_id: this.sessionId,
        returning_user: true,
      });
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[AffiliateSDK]', ...args);
    }
  }

  private logError(...args: any[]): void {
    if (this.config.debug) {
      console.error('[AffiliateSDK Error]', ...args);
    }
  }

  /**
   * Load pixel settings from server
   */
  private async loadPixelSettings(): Promise<void> {
    try {
      const url = new URL(this.config.pixelSettingsUrl!);
      url.searchParams.append('affiliate_code', this.config.affiliateCode);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        this.pixelSettings = data.settings || {};
        this.log('Pixel settings loaded:', this.pixelSettings);
      } else {
        this.logError('Failed to load pixel settings:', response.status);
      }
    } catch (error) {
      this.logError('Error loading pixel settings:', error);
    }
  }

  /**
   * Initialize tracking pixels
   */
  private initializePixels(): void {
    if (!this.pixelSettings) return;

    // Initialize Facebook Pixel
    if (this.pixelSettings.facebook_pixel_id) {
      this.initializeFacebookPixel(this.pixelSettings.facebook_pixel_id);
    }

    // Initialize TikTok Pixel
    if (this.pixelSettings.tiktok_pixel_id) {
      this.initializeTikTokPixel(this.pixelSettings.tiktok_pixel_id);
    }

    // Initialize Google Ads
    if (this.pixelSettings.google_ads_id) {
      this.initializeGoogleAds(this.pixelSettings.google_ads_id);
    }
  }

  /**
   * Initialize Facebook Pixel
   */
  private initializeFacebookPixel(pixelId: string): void {
    try {
      // Create Facebook Pixel script
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
      
      // Add noscript fallback
      const noscript = document.createElement('noscript');
      const img = document.createElement('img');
      img.height = 1;
      img.width = 1;
      img.style.display = 'none';
      img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.head.appendChild(noscript);
      
      this.log('Facebook Pixel initialized:', pixelId);
    } catch (error) {
      this.logError('Failed to initialize Facebook Pixel:', error);
    }
  }

  /**
   * Initialize TikTok Pixel
   */
  private initializeTikTokPixel(pixelId: string): void {
    try {
      const script = document.createElement('script');
      script.innerHTML = `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${pixelId}');
          ttq.page();
        }(window, document, 'ttq');
      `;
      document.head.appendChild(script);
      
      this.log('TikTok Pixel initialized:', pixelId);
    } catch (error) {
      this.logError('Failed to initialize TikTok Pixel:', error);
    }
  }

  /**
   * Initialize Google Ads
   */
  private initializeGoogleAds(adsId: string): void {
    try {
      // Load gtag script
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
      document.head.appendChild(script1);
      
      // Initialize gtag
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${adsId}');
      `;
      document.head.appendChild(script2);
      
      this.log('Google Ads initialized:', adsId);
    } catch (error) {
      this.logError('Failed to initialize Google Ads:', error);
    }
  }

  /**
   * Send events to configured pixels
   */
  private async sendToPixels(eventName: string, parameters: EventParameters): Promise<void> {
    if (!this.pixelSettings) return;

    try {
      // Facebook Pixel events
      if (this.pixelSettings.facebook_pixel_id && (window as any).fbq) {
        this.sendToFacebookPixel(eventName, parameters);
      }

      // TikTok Pixel events
      if (this.pixelSettings.tiktok_pixel_id && (window as any).ttq) {
        this.sendToTikTokPixel(eventName, parameters);
      }

      // Google Ads events
      if (this.pixelSettings.google_ads_id && (window as any).gtag) {
        this.sendToGoogleAds(eventName, parameters);
      }
    } catch (error) {
      this.logError('Error sending to pixels:', error);
    }
  }

  /**
   * Send event to Facebook Pixel
   */
  private sendToFacebookPixel(eventName: string, parameters: EventParameters): void {
    const fbq = (window as any).fbq;
    if (!fbq) return;

    // Map event names to Facebook events
    const eventMap: Record<string, string> = {
      'page_view': 'PageView',
      'purchase': 'Purchase',
      'add_to_cart': 'AddToCart',
      'button_click': 'Contact',
      'form_submit': 'Lead',
      'click': 'Contact'
    };

    const facebookEvent = eventMap[eventName] || 'CustomEvent';
    const eventData: any = {};

    // Map parameters to Facebook format
    if (parameters.amount) eventData.value = parameters.amount;
    if (parameters.currency) eventData.currency = parameters.currency;
    if (parameters.product_id) eventData.content_ids = [parameters.product_id];
    if (parameters.transaction_id) eventData.order_id = parameters.transaction_id;

    fbq('track', facebookEvent, eventData);
    this.log('Facebook Pixel event sent:', facebookEvent, eventData);
  }

  /**
   * Send event to TikTok Pixel
   */
  private sendToTikTokPixel(eventName: string, parameters: EventParameters): void {
    const ttq = (window as any).ttq;
    if (!ttq) return;

    // Map event names to TikTok events
    const eventMap: Record<string, string> = {
      'page_view': 'ViewContent',
      'purchase': 'CompletePayment',
      'add_to_cart': 'AddToCart',
      'button_click': 'Contact',
      'form_submit': 'SubmitForm',
      'click': 'ClickButton'
    };

    const tiktokEvent = eventMap[eventName] || 'CustomEvent';
    const eventData: any = {};

    // Map parameters to TikTok format
    if (parameters.amount) eventData.value = parameters.amount;
    if (parameters.currency) eventData.currency = parameters.currency;
    if (parameters.product_id) eventData.content_id = parameters.product_id;

    ttq.track(tiktokEvent, eventData);
    this.log('TikTok Pixel event sent:', tiktokEvent, eventData);
  }

  /**
   * Send event to Google Ads
   */
  private sendToGoogleAds(eventName: string, parameters: EventParameters): void {
    const gtag = (window as any).gtag;
    if (!gtag) return;

    // Map event names to Google Ads events
    const eventMap: Record<string, string> = {
      'page_view': 'page_view',
      'purchase': 'purchase',
      'add_to_cart': 'add_to_cart',
      'button_click': 'generate_lead',
      'form_submit': 'generate_lead',
      'click': 'select_content'
    };

    const googleEvent = eventMap[eventName] || 'custom_event';
    const eventData: any = {};

    // Map parameters to Google Ads format
    if (parameters.amount) {
      eventData.value = parameters.amount;
      eventData.currency = parameters.currency || 'USD';
    }
    if (parameters.product_id) eventData.item_id = parameters.product_id;
    if (parameters.transaction_id) eventData.transaction_id = parameters.transaction_id;

    gtag('event', googleEvent, eventData);
    this.log('Google Ads event sent:', googleEvent, eventData);
  }
}

// Export default for easier importing
export default AffiliateSDK;