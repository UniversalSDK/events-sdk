# Events SDK - Universal Tracking SDK for Web

## Installation

```bash
npm install github:UniversalSDK/events-sdk#main
```

## Quick Start

```javascript
import { AffiliateSDK } from 'events-sdk';

// Initialize SDK with minimal configuration
const tracker = new AffiliateSDK({
  affiliateCode: 'EVT_35_43_6865be7124e04', // Your unique code
  debug: true // Enable console logging
});

// Initialize tracking
tracker.initialize().catch(console.warn);
```

## Features

- ✅ Automatic page view tracking (including SPA)
- ✅ Click tracking on all interactive elements
- ✅ Form submission tracking
- ✅ Scroll depth tracking (25%, 50%, 75%, 100%)
- ✅ Time on page tracking (30s, 60s, 120s)
- ✅ Session management
- ✅ Offline event queuing
- ✅ Facebook, TikTok, Google Ads pixel integration

## Configuration Options

```javascript
const tracker = new AffiliateSDK({
  affiliateCode: 'YOUR_CODE',     // Required: Your unique affiliate code
  appCode: 'optional-app-code',   // Optional: Additional app identifier
  debug: false,                   // Show console logs
  enablePixels: true,             // Enable ad platform pixels
  autoTrack: {
    pageViews: true,              // Auto-track page views
    clicks: true,                 // Auto-track clicks
    forms: true,                  // Auto-track form submits
    scrolling: true,              // Auto-track scroll depth
    timeOnPage: true              // Auto-track time on page
  }
});
```

## Manual Event Tracking

```javascript
// Track custom events
await tracker.trackEvent('user_action', {
  category: 'engagement',
  value: 10
});

// Track purchases
await tracker.trackPurchase({
  amount: 99.99,
  currency: 'USD',
  productId: 'product_123',
  transactionId: 'order_456'
});

// Track specific page views
await tracker.trackPageView('/custom-page');

// Track button clicks
await tracker.trackButtonClick('subscribe_button');

// Track form submissions
await tracker.trackFormSubmit('contact_form');
```

## React Integration

```javascript
import { useAffiliateSDK, usePageTracking } from 'events-sdk/react';

function App() {
  const sdk = useAffiliateSDK({
    affiliateCode: 'YOUR_CODE',
    debug: true
  });

  // Automatically track page views in SPA
  usePageTracking(sdk);

  return <YourApp />;
}
```

## API Endpoints

The SDK sends events to: `https://affiliate.33rd.pro/api/universal-tracker.php`

Events are stored in the platform's tracking database for analytics and attribution.

## License

Proprietary - UniversalSDK