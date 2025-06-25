import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform, Dimensions, AppState } from 'react-native';

/**
 * AffiliateSDK for React Native
 * Tracks user events and sends them to affiliate platform
 */
class AffiliateSDK {
  constructor(config) {
    this.affiliateCode = config.affiliateCode;
    this.appCode = config.appCode;
    this.baseUrl = config.baseUrl || 'https://affiliate.33rd.pro/api/tracker.php';
    this.debug = config.debug || false;
    this.platform = 'react-native';
    
    // Session tracking
    this.sessionId = null;
    this.sessionStartTime = null;
    this.lastEventTime = null;
    this.isInitialized = false;
    
    // Device info cache
    this.deviceInfo = {};
    
    // Event queue for offline support
    this.eventQueue = [];
    this.isOnline = true;
    
    // Auto-tracking flags
    this.autoTrackScreenViews = true;
    this.autoTrackAppEvents = true;
    
    this._setupAppStateListener();
  }

  /**
   * Initialize the SDK
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        this._log('SDK already initialized');
        return;
      }

      // Generate or restore session ID
      this.sessionId = await this._getOrCreateSessionId();
      this.sessionStartTime = Date.now();
      this.lastEventTime = Date.now();

      // Collect device information
      await this._collectDeviceInfo();

      // Process any queued events
      await this._processEventQueue();

      // Track app launch
      await this.trackEvent('app_launch', {
        session_id: this.sessionId,
        platform: this.platform,
        ...this.deviceInfo
      });

      this.isInitialized = true;
      this._log('SDK initialized successfully');

    } catch (error) {
      this._logError('Failed to initialize SDK:', error);
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(eventName, parameters = {}) {
    try {
      const eventData = {
        affiliate_code: this.affiliateCode,
        app_code: this.appCode,
        event: eventName,
        timestamp: Date.now(),
        session_id: this.sessionId,
        platform: this.platform,
        ...parameters
      };

      await this._sendEvent(eventData);
      this.lastEventTime = Date.now();

    } catch (error) {
      this._logError('Failed to track event:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName, parameters = {}) {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      ...parameters
    });
  }

  /**
   * Track purchase event
   */
  async trackPurchase(purchaseData) {
    await this.trackEvent('purchase', {
      amount: purchaseData.amount,
      currency: purchaseData.currency || 'USD',
      product_id: purchaseData.productId,
      transaction_id: purchaseData.transactionId,
      ...purchaseData
    });
  }

  /**
   * Track button click
   */
  async trackButtonClick(buttonId, parameters = {}) {
    await this.trackEvent('button_click', {
      button_id: buttonId,
      ...parameters
    });
  }

  /**
   * Track form submission
   */
  async trackFormSubmit(formName, parameters = {}) {
    await this.trackEvent('form_submit', {
      form_name: formName,
      ...parameters
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties) {
    try {
      await AsyncStorage.setItem(
        `@affiliate_sdk_user_props_${this.affiliateCode}`,
        JSON.stringify(properties)
      );
    } catch (error) {
      this._logError('Failed to set user properties:', error);
    }
  }

  /**
   * Get user properties
   */
  async getUserProperties() {
    try {
      const stored = await AsyncStorage.getItem(`@affiliate_sdk_user_props_${this.affiliateCode}`);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      this._logError('Failed to get user properties:', error);
      return {};
    }
  }

  /**
   * Track session end
   */
  async trackSessionEnd() {
    if (!this.sessionStartTime) return;

    const sessionDuration = Date.now() - this.sessionStartTime;
    await this.trackEvent('session_end', {
      duration: sessionDuration,
      session_id: this.sessionId
    });
  }

  // Private methods

  async _collectDeviceInfo() {
    try {
      const { width, height } = Dimensions.get('window');
      
      this.deviceInfo = {
        device_id: await DeviceInfo.getUniqueId(),
        device_model: await DeviceInfo.getModel(),
        device_brand: await DeviceInfo.getBrand(),
        os_name: Platform.OS,
        os_version: Platform.Version,
        app_version: await DeviceInfo.getVersion(),
        app_build: await DeviceInfo.getBuildNumber(),
        screen_width: width,
        screen_height: height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: await DeviceInfo.getDeviceLocale()
      };
    } catch (error) {
      this._logError('Failed to collect device info:', error);
      this.deviceInfo = {
        os_name: Platform.OS,
        os_version: Platform.Version
      };
    }
  }

  async _getOrCreateSessionId() {
    try {
      let sessionId = await AsyncStorage.getItem(`@affiliate_sdk_session_${this.affiliateCode}`);
      
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(`@affiliate_sdk_session_${this.affiliateCode}`, sessionId);
      }
      
      return sessionId;
    } catch (error) {
      this._logError('Failed to get/create session ID:', error);
      return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  async _sendEvent(eventData) {
    try {
      const url = `${this.baseUrl}?${this._buildQueryString(eventData)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this._log('Event sent successfully:', eventData.event);

    } catch (error) {
      this._logError('Failed to send event:', error);
      
      // Queue event for retry
      this.eventQueue.push({
        ...eventData,
        retry_count: 0,
        queued_at: Date.now()
      });
    }
  }

  async _processEventQueue() {
    if (this.eventQueue.length === 0) return;

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToProcess) {
      try {
        if (event.retry_count < 3) {
          await this._sendEvent(event);
        }
      } catch (error) {
        // Re-queue with incremented retry count
        this.eventQueue.push({
          ...event,
          retry_count: event.retry_count + 1
        });
      }
    }
  }

  _buildQueryString(params) {
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  _setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        this.trackSessionEnd();
      } else if (nextAppState === 'active' && this.isInitialized) {
        // App came to foreground - could start new session
        this._updateSessionIfNeeded();
      }
    });
  }

  async _updateSessionIfNeeded() {
    const timeSinceLastEvent = Date.now() - this.lastEventTime;
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    if (timeSinceLastEvent > SESSION_TIMEOUT) {
      // Start new session
      this.sessionId = await this._getOrCreateSessionId();
      this.sessionStartTime = Date.now();
      
      await this.trackEvent('app_launch', {
        session_id: this.sessionId,
        returning_user: true
      });
    }
  }

  _log(...args) {
    if (this.debug) {
      console.log('[AffiliateSDK]', ...args);
    }
  }

  _logError(...args) {
    if (this.debug) {
      console.error('[AffiliateSDK Error]', ...args);
    }
  }
}

export default AffiliateSDK;
export { AffiliateSDK };