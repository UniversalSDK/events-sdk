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
  appCode?: string; // Сделали необязательным
  baseUrl?: string;
  pixelSettingsUrl?: string;
  debug?: boolean;
  enablePixels?: boolean;
  disableExternalRequests?: boolean; // Disable all external API calls
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
  device_id: string;
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
    // Use production URL for API calls
    const baseHost = 'https://affiliate.33rd.pro';
    
    this.config = {
      baseUrl: `${baseHost}/api/universal-tracker.php`,
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
    
    // Setup global error handler for this SDK instance
    this.setupGlobalErrorHandler();
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
        this.logError('AffiliateSDK can only be used in browser environment');
        return;
      }

      // Generate or restore session ID
      this.sessionId = this.getOrCreateSessionId();
      this.sessionStartTime = Date.now();
      this.lastEventTime = Date.now();
      this.pageStartTime = Date.now();

      // Collect device information
      this.collectDeviceInfo();
      
      // Check for Deep Link attribution parameters
      this.checkDeepLinkAttribution();

      // Load pixel settings
      if (this.config.enablePixels) {
        try {
          await this.loadPixelSettings();
          this.initializePixels();
        } catch (e) {
          this.log('Failed to load pixel settings, continuing without pixels');
        }
      }

      // Process any queued events
      try {
        await this.processEventQueue();
      } catch (e) {
        this.log('Failed to process event queue');
      }

      // Setup auto-tracking
      if (this.config.autoTrack) {
        this.setupAutoTracking();
      }

      // Setup page lifecycle events
      this.setupPageLifecycle();
      
      // Перехватываем все события аналитики
      this.interceptAnalytics();

      // Track page load
      try {
        await this.trackEvent('page_load', {
          session_id: this.sessionId,
          platform: this.platform,
          ...this.deviceInfo,
        });
      } catch (e) {
        this.log('Failed to track page load event');
      }

      this.isInitialized = true;
      this.log('SDK initialized successfully');

    } catch (error) {
      this.logError('Failed to initialize SDK:', error);
      // Don't throw error to avoid breaking the app
      // SDK will work in degraded mode
      this.isInitialized = false;
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(eventName: string, parameters: EventParameters = {}): Promise<void> {
    try {
      // Silently skip if SDK failed to initialize
      if (!this.isInitialized && !this.config.disableExternalRequests) {
        this.log('SDK not initialized, queueing event:', eventName);
        // Still queue the event for later
        this.eventQueue.push({
          event_type: eventName,
          parameters,
          queued_at: Date.now(),
          retry_count: 0
        });
        return;
      }
      // Сохраняем все дополнительные данные в additional_data
      const eventData: any = {
        unique_code: this.config.affiliateCode,
        event_type: eventName,
        timestamp: Date.now(),
        session_id: this.sessionId,
        platform: this.platform,
        url: window.location.href,
        device_id: this.deviceInfo?.device_id, // Добавляем постоянный ID устройства
        // Важные поля на верхнем уровне
        user_id: parameters.user_id,
        amount: parameters.amount,
        currency: parameters.currency,
        // Все остальные параметры в additional_data
        additional_data: JSON.stringify(parameters),
      };
      
      // Добавляем app_code только если он указан
      if (this.config.appCode) {
        eventData.app_code = this.config.appCode;
      }

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
    await this.trackEvent('page_view', {
      page_path: path || window.location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      ...parameters,
    });
  }

  /**
   * Track purchase event
   */
  async trackPurchase(purchaseData: PurchaseData): Promise<void> {
    await this.trackEvent('purchase', {
      amount: purchaseData.amount,
      currency: purchaseData.currency || 'USD',
      product_id: purchaseData.productId,
      transaction_id: purchaseData.transactionId,
      ...purchaseData.additionalData,
    });
  }

  /**
   * Track subscription status
   */
  async trackSubscriptionStatus(status: {
    isActive: boolean;
    subscriptionType?: string | null;
    expiryDate?: string | null;
    userId?: string;
  }): Promise<void> {
    await this.trackEvent('subscription_status', {
      is_premium: status.isActive,
      subscription_type: status.subscriptionType,
      expiry_date: status.expiryDate,
      user_id: status.userId,
      timestamp: new Date().toISOString()
    });
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
      
      // Также отправляем как событие для отслеживания
      this.trackEvent('user_properties_set', properties as any).catch(() => {
        // Silently ignore errors
      });
    } catch (error) {
      this.logError('Failed to set user properties:', error);
    }
  }

  /**
   * Универсальный метод для перехвата всех console.log с аналитикой
   */
  interceptAnalytics(): void {
    const originalLog = console.log;
    const sdk = this;
    
    console.log = function(...args: any[]) {
      // Вызываем оригинальный console.log
      originalLog.apply(console, args);
      
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        // 1. Перехватываем Web Analytics события
        if (firstArg.includes('[Web Analytics]')) {
          const match = firstArg.match(/\[Web Analytics\]\s+(.+?):/);
          if (match) {
            const eventType = match[1];
            const eventData = args[1] || {};
            sdk.trackEvent(eventType, eventData).catch(() => {});
          }
        }
        
        // 2. Перехватываем проверки подписок
        else if (firstArg.includes('Checking premium status') || 
                 (firstArg.includes('SUBSCRIPTION CHECK') && !firstArg.includes('[Web Analytics]'))) {
          const eventData = args[1] || {};
          
          // Универсальная проверка разных форматов полей
          const isPremium = eventData.isActive || 
                           eventData.isPremium || 
                           eventData.is_premium || 
                           false;
          
          const subscriptionType = eventData.subscriptionType || 
                                  eventData.subscription_type || 
                                  null;
          
          const expiryDate = eventData.expiryDate || 
                            eventData.expiry_date || 
                            null;
          
          sdk.trackEvent('subscription_check', {
            is_premium: isPremium,
            subscription_type: subscriptionType,
            expiry_date: expiryDate,
            check_type: firstArg.includes('STARTED') ? 'started' : 
                       firstArg.includes('COMPLETED') ? 'completed' : 'status'
          }).catch(() => {});
        }
        
        // 3. Перехватываем загрузку продуктов для покупки
        else if (firstArg.includes('Loaded products:')) {
          const products = args[1] || [];
          sdk.trackEvent('products_loaded', {
            products_count: products.length,
            products: products
          }).catch(() => {});
        }
        
        // 4. Перехватываем историю подписок
        else if (firstArg.includes('subscription history:')) {
          const history = args[1] || {};
          sdk.trackEvent('subscription_history', history).catch(() => {});
        }
        
        // 5. Перехватываем события покупки (универсально)
        else if (firstArg.toLowerCase().includes('purchase') || 
                 firstArg.toLowerCase().includes('payment') ||
                 firstArg.toLowerCase().includes('subscription activated') ||
                 firstArg.toLowerCase().includes('subscription purchased')) {
          const purchaseData = args[1] || {};
          
          // Универсальная проверка разных форматов полей
          const amount = purchaseData.amount || 
                        purchaseData.price || 
                        purchaseData.value || 
                        0;
          
          const productId = purchaseData.productId || 
                           purchaseData.product_id || 
                           purchaseData.sku ||
                           purchaseData.subscription_type ||
                           '';
          
          const transactionId = purchaseData.transactionId ||
                               purchaseData.transaction_id ||
                               purchaseData.orderId ||
                               purchaseData.order_id ||
                               '';
          
          sdk.trackEvent('purchase', {
            amount: amount,
            currency: purchaseData.currency || 'USD',
            product_id: productId,
            transaction_id: transactionId,
            ...purchaseData // сохраняем все остальные поля
          }).catch(() => {});
        }
      }
    };
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
    
    // Генерируем или получаем постоянный device_id
    let deviceId = localStorage.getItem(`${this.storagePrefix}_device_id`);
    if (!deviceId) {
      // Создаем уникальный идентификатор устройства
      deviceId = `dev_${Date.now()}_${this.generateRandomString(16)}`;
      localStorage.setItem(`${this.storagePrefix}_device_id`, deviceId);
    }
    
    this.deviceInfo = {
      device_id: deviceId, // Постоянный ID устройства
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
      // Add fingerprint to all events
      if (!eventData.fingerprint) {
        eventData.fingerprint = this.generateFingerprint();
      }
      
      // Add attribution data if available
      const attributionData = this.getAttributionData();
      if (attributionData && attributionData.click_id) {
        eventData.click_id = attributionData.click_id;
        eventData.attribution_method = attributionData.attribution_method;
      }
      
      const url = new URL(this.config.baseUrl!);
      
      // Add all event data as query parameters
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const response = await this.makeRequest(url.toString());
      
      if (response) {
        this.log('Event sent successfully:', eventData.event_type);
      } else {
        // If request failed, queue for retry
        this.log('Request failed - queuing for retry');
        // Queue event for retry
        this.eventQueue.push({
          ...eventData,
          retry_count: 0,
          queued_at: Date.now(),
        });
        return;
      }

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
        }).catch(() => {});
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
    }).catch(() => {});
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
        }).catch(() => {});
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
          }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  /**
   * Generate browser fingerprint (matching redirect.php logic)
   */
  private generateFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Canvas fingerprinting
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Canvas fingerprint', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Canvas fingerprint', 4, 17);
        
        const canvasData = canvas.toDataURL();
        
        // Combine with other browser properties
        const components = [
          navigator.userAgent,
          navigator.language,
          screen.width + 'x' + screen.height,
          screen.colorDepth,
          new Date().getTimezoneOffset(),
          navigator.platform,
          canvasData
        ];
        
        // Simple hash function
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(16);
      }
      
      // Fallback if canvas not available
      return this.generateRandomString(16);
      
    } catch (error) {
      this.logError('Failed to generate fingerprint:', error);
      return this.generateRandomString(16);
    }
  }

  /**
   * Check for Deep Link attribution parameters from App Store/Play Store
   */
  private checkDeepLinkAttribution(): void {
    try {
      // Check if running in Capacitor
      if ((window as any).Capacitor) {
        this.checkCapacitorDeepLink();
      }
      
      // 1. Check URL parameters (App Store: pt, ct, mt)
      const urlParams = new URLSearchParams(window.location.search);
      const providerToken = urlParams.get('pt'); // click_id from App Store
      const campaignToken = urlParams.get('ct'); // campaign source
      const mediaType = urlParams.get('mt'); // media type
      
      // 2. Check Google Play referrer
      const referrer = urlParams.get('referrer');
      let playStoreClickId: string | null = null;
      
      if (referrer) {
        try {
          // Parse Google Play referrer string
          const referrerParams = new URLSearchParams(referrer);
          playStoreClickId = referrerParams.get('click_id');
        } catch (e) {
          this.logError('Failed to parse Play Store referrer:', e);
        }
      }
      
      // 3. Check cookies set by redirect.php
      const clickIdFromCookie = this.getCookie('affiliate_click_id');
      const affiliateCodeFromCookie = this.getCookie('affiliate_code');
      
      // 4. Determine attribution source and click_id
      let clickId: string | null = null;
      let attributionMethod: string | null = null;
      
      if (providerToken) {
        clickId = providerToken;
        attributionMethod = 'app_store_deep_link';
        this.log('App Store Deep Link detected:', { clickId, campaignToken });
      } else if (playStoreClickId) {
        clickId = playStoreClickId;
        attributionMethod = 'play_store_referrer';
        this.log('Play Store referrer detected:', { clickId, referrer });
      } else if (clickIdFromCookie) {
        clickId = clickIdFromCookie;
        attributionMethod = 'cookie_attribution';
        this.log('Cookie attribution detected:', { clickId, affiliateCode: affiliateCodeFromCookie });
      }
      
      // 5. If we found attribution data, track it immediately
      if (clickId && attributionMethod) {
        // Store attribution data for later use
        this.storeAttributionData({
          click_id: clickId,
          attribution_method: attributionMethod,
          campaign_source: campaignToken || affiliateCodeFromCookie || '',
          timestamp: Date.now()
        });
        
        // Track attribution event
        this.trackEvent('app_attribution', {
          click_id: clickId,
          attribution_method: attributionMethod,
          campaign_source: campaignToken || affiliateCodeFromCookie || '',
          provider_token: providerToken,
          referrer: referrer,
          has_deep_link: !!providerToken || !!playStoreClickId,
          has_cookie: !!clickIdFromCookie
        }).catch(() => {});
      }
      
    } catch (error) {
      this.logError('Failed to check Deep Link attribution:', error);
    }
  }

  /**
   * Get cookie value by name
   */
  private getCookie(name: string): string | null {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
    } catch (error) {
      this.logError('Failed to get cookie:', error);
    }
    return null;
  }

  /**
   * Store attribution data in localStorage
   */
  private storeAttributionData(data: Record<string, any>): void {
    try {
      localStorage.setItem(
        `${this.storagePrefix}_attribution`,
        JSON.stringify(data)
      );
    } catch (error) {
      this.logError('Failed to store attribution data:', error);
    }
  }

  /**
   * Get stored attribution data
   */
  getAttributionData(): Record<string, any> | null {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}_attribution`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      this.logError('Failed to get attribution data:', error);
      return null;
    }
  }

  /**
   * Check for Capacitor deep links
   */
  private async checkCapacitorDeepLink(): Promise<void> {
    try {
      // Dynamically import Capacitor App plugin
      const { App } = await import('@capacitor/app' as any).catch(() => ({ App: null }));
      
      if (!App) return;
      
      // Get launch URL (when app starts from deep link)
      const launchUrl = await App.getLaunchUrl();
      
      if (launchUrl?.url) {
        this.log('Capacitor Deep Link detected:', launchUrl.url);
        
        // Parse the deep link URL
        const url = new URL(launchUrl.url);
        const clickId = url.searchParams.get('click_id') || 
                       url.searchParams.get('pt') || 
                       url.searchParams.get('clickId');
        
        if (clickId) {
          // Store attribution data
          this.storeAttributionData({
            click_id: clickId,
            attribution_method: 'capacitor_deep_link',
            deep_link_url: launchUrl.url,
            timestamp: Date.now()
          });
          
          // Track attribution event
          this.trackEvent('app_attribution', {
            click_id: clickId,
            attribution_method: 'capacitor_deep_link',
            deep_link_url: launchUrl.url,
            source: 'capacitor_launch'
          }).catch(() => {});
        }
      }
      
      // Listen for app URL open events (when app is already running)
      App.addListener('appUrlOpen', (data: any) => {
        this.log('Capacitor App URL opened:', data.url);
        
        const url = new URL(data.url);
        const clickId = url.searchParams.get('click_id') || 
                       url.searchParams.get('pt') || 
                       url.searchParams.get('clickId');
        
        if (clickId) {
          this.trackEvent('app_url_open', {
            click_id: clickId,
            deep_link_url: data.url,
            source: 'capacitor_running'
          }).catch(() => {});
        }
      });
      
    } catch (error) {
      this.log('Capacitor not available or App plugin not installed:', error);
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[AffiliateSDK]', ...args);
    }
  }

  private logError(...args: any[]): void {
    if (this.config.debug) {
      // Use console.warn instead of console.error to avoid triggering error boundaries
      console.warn('[AffiliateSDK]', ...args);
    }
  }

  /**
   * Setup global error handler to catch any unhandled promises from SDK
   */
  private setupGlobalErrorHandler(): void {
    // Store original handler
    const originalHandler = window.onunhandledrejection;
    
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      // Check if error is from our SDK (by checking stack trace or error message)
      const error = event.reason;
      const errorString = error?.stack || error?.toString() || '';
      
      // If error contains our API URLs or SDK markers, handle it silently
      if (errorString.includes('affiliate.33rd.pro') || 
          errorString.includes('AffiliateSDK') ||
          errorString.includes('events-sdk') ||
          errorString.includes('universal-tracker.php') ||
          errorString.includes('pixel-settings.php') ||
          errorString.includes('index.esm.js') ||
          errorString.includes('Failed to fetch') ||
          (errorString.includes('fetch') && errorString.includes('ERR_BLOCKED_BY_CLIENT'))) {
        
        this.log('SDK error caught and handled:', error);
        
        // Prevent the error from bubbling up
        event.preventDefault();
        return;
      }
      
      // If not our error, call original handler if exists
      if (originalHandler) {
        originalHandler.call(window, event);
      }
    };
  }

  /**
   * Make HTTP request with fallback to XMLHttpRequest
   */
  private async makeRequest(url: string, method: string = 'GET'): Promise<Response | null> {
    // Check if external requests are disabled
    if (this.config.disableExternalRequests) {
      this.log('External requests are disabled');
      return null;
    }
    
    try {
      // Try fetch first
      if (typeof fetch !== 'undefined') {
        try {
          const response = await fetch(url, {
            method,
            mode: 'cors',
            credentials: 'omit' // Don't send cookies to avoid tracking blockers
          });
          return response;
        } catch (fetchError) {
          // If fetch is blocked, try XMLHttpRequest
          this.log('Fetch blocked, falling back to XMLHttpRequest');
        }
      }
      
      // Fallback to XMLHttpRequest
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        
        // Create a Response-like object
        xhr.onload = () => {
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            text: () => Promise.resolve(xhr.responseText),
            json: () => Promise.resolve(JSON.parse(xhr.responseText))
          } as Response;
          
          resolve(response);
        };
        
        xhr.onerror = () => {
          this.logError('XMLHttpRequest failed');
          resolve(null);
        };
        
        xhr.timeout = 10000; // 10 second timeout
        xhr.ontimeout = () => {
          this.logError('Request timed out');
          resolve(null);
        };
        
        xhr.send();
      });
    } catch (error) {
      this.logError('Failed to make request:', error);
      return null;
    }
  }

  /**
   * Load pixel settings from server
   */
  private async loadPixelSettings(): Promise<void> {
    try {
      const url = new URL(this.config.pixelSettingsUrl!);
      url.searchParams.append('unique_code', this.config.affiliateCode);
      
      const response = await this.makeRequest(url.toString());
      if (response && response.ok) {
        const data = await response.json();
        this.pixelSettings = data.settings || {};
        this.log('Pixel settings loaded:', this.pixelSettings);
      } else if (response) {
        this.logError('Failed to load pixel settings:', response.status);
      } else {
        // If both methods fail, disable pixel tracking
        this.log('Cannot load pixel settings - ad blocker detected, disabling pixels');
        this.pixelSettings = null;
      }
    } catch (error) {
      this.logError('Error loading pixel settings:', error);
      // Disable pixels if we can't load settings
      this.pixelSettings = null;
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

// Export default only to avoid TypeScript conflicts
export default AffiliateSDK;