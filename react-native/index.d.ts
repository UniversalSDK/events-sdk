export interface AffiliateSDKConfig {
  affiliateCode: string;
  appCode: string;
  baseUrl?: string;
  debug?: boolean;
}

export interface PurchaseData {
  amount: number;
  currency?: string;
  productId: string;
  transactionId?: string;
  [key: string]: any;
}

export interface UserProperties {
  [key: string]: string | number | boolean;
}

export interface EventParameters {
  [key: string]: string | number | boolean;
}

export declare class AffiliateSDK {
  constructor(config: AffiliateSDKConfig);
  
  /**
   * Initialize the SDK
   */
  initialize(): Promise<void>;
  
  /**
   * Track a custom event
   */
  trackEvent(eventName: string, parameters?: EventParameters): Promise<void>;
  
  /**
   * Track screen view
   */
  trackScreenView(screenName: string, parameters?: EventParameters): Promise<void>;
  
  /**
   * Track purchase event
   */
  trackPurchase(purchaseData: PurchaseData): Promise<void>;
  
  /**
   * Track button click
   */
  trackButtonClick(buttonId: string, parameters?: EventParameters): Promise<void>;
  
  /**
   * Track form submission
   */
  trackFormSubmit(formName: string, parameters?: EventParameters): Promise<void>;
  
  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): Promise<void>;
  
  /**
   * Get user properties
   */
  getUserProperties(): Promise<UserProperties>;
  
  /**
   * Track session end
   */
  trackSessionEnd(): Promise<void>;
}

export default AffiliateSDK;