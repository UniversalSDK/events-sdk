# Affiliate SDK for React/Web

A comprehensive tracking SDK for React applications and general web projects with TypeScript support.

## Installation

```bash
npm install @your-company/affiliate-sdk
# or
yarn add @your-company/affiliate-sdk
```

## Features

- ✅ Automatic page view tracking
- ✅ Custom event tracking
- ✅ Purchase tracking
- ✅ Auto-tracking (clicks, forms, scrolling, time on page)
- ✅ Session management
- ✅ Offline event queuing
- ✅ React hooks and components
- ✅ TypeScript support
- ✅ Cross-browser compatibility
- ✅ No external dependencies

## Quick Start

### Vanilla JavaScript/TypeScript

```javascript
import AffiliateSDK from '@your-company/affiliate-sdk';

// Initialize SDK
const tracker = new AffiliateSDK({
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE',
  debug: true
});

await tracker.initialize();

// Track events
await tracker.trackPageView();
await tracker.trackEvent('custom_action', { value: 100 });
```

### React Integration

```jsx
import React, { useEffect } from 'react';
import { useAffiliateSDK, usePageTracking } from '@your-company/affiliate-sdk/react';

function App() {
  const sdk = useAffiliateSDK({
    affiliateCode: 'YOUR_AFFILIATE_CODE',
    appCode: 'YOUR_APP_CODE',
    debug: process.env.NODE_ENV === 'development'
  });

  // Auto-track page views with React Router
  usePageTracking(sdk);

  const handlePurchase = async () => {
    if (sdk) {
      await sdk.trackPurchase({
        amount: 99.99,
        currency: 'USD',
        productId: 'premium_subscription'
      });
    }
  };

  return (
    <div>
      <button onClick={handlePurchase}>
        Buy Premium
      </button>
    </div>
  );
}
```

## API Reference

### Configuration

```typescript
interface AffiliateSDKConfig {
  affiliateCode: string;
  appCode: string;
  baseUrl?: string; // Default: 'https://affiliate.33rd.pro/api/tracker.php'
  debug?: boolean; // Default: false
  autoTrack?: {
    pageViews?: boolean; // Default: true
    clicks?: boolean; // Default: true
    forms?: boolean; // Default: true
    scrolling?: boolean; // Default: true
    timeOnPage?: boolean; // Default: true
  };
}
```

### Initialization

```javascript
const sdk = new AffiliateSDK({
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE',
  baseUrl: 'https://your-domain.com/api/tracker.php', // optional
  debug: true, // optional
  autoTrack: { // optional
    pageViews: true,
    clicks: true,
    forms: true,
    scrolling: true,
    timeOnPage: true
  }
});

await sdk.initialize();
```

### Track Events

```javascript
// Custom event
await sdk.trackEvent('custom_action', {
  category: 'user_interaction',
  value: 100
});

// Page view
await sdk.trackPageView('/dashboard', {
  section: 'user_dashboard'
});

// Purchase
await sdk.trackPurchase({
  amount: 99.99,
  currency: 'USD',
  productId: 'premium_subscription',
  transactionId: 'txn_123456'
});

// Button click
await sdk.trackButtonClick('subscribe_button', {
  position: 'header'
});

// Form submission
await sdk.trackFormSubmit('registration_form', {
  form_step: 'step_1'
});
```

### User Properties

```javascript
// Set user properties
sdk.setUserProperties({
  user_id: '12345',
  user_type: 'premium',
  signup_date: '2024-01-15'
});

// Get user properties
const properties = sdk.getUserProperties();
```

## Auto-tracking Features

The SDK automatically tracks:

### Page Views
- Initial page load
- SPA route changes
- Browser back/forward navigation

### Clicks
- Button clicks
- Link clicks
- Elements with click handlers
- Elements with button role

### Form Submissions
- All form submissions
- Captures form metadata

### Scrolling
- 25%, 50%, 75%, 100% scroll depth milestones
- Page height information

### Time on Page
- 30 seconds, 1 minute, 2 minute milestones
- Page unload events with total time spent

## React Integration

### Hooks

```jsx
import { useAffiliateSDK, usePageTracking } from '@your-company/affiliate-sdk/react';

function MyComponent() {
  // Initialize SDK
  const sdk = useAffiliateSDK({
    affiliateCode: 'YOUR_AFFILIATE_CODE',
    appCode: 'YOUR_APP_CODE'
  });

  // Auto-track page views
  usePageTracking(sdk);

  return <div>My Component</div>;
}
```

### Components

```jsx
import { TrackingWrapper } from '@your-company/affiliate-sdk/react';

function MyPage({ sdk }) {
  return (
    <TrackingWrapper 
      sdk={sdk} 
      eventName="page_interaction" 
      eventData={{ section: 'hero' }}
      trigger="click"
    >
      <button>Track This Click</button>
    </TrackingWrapper>
  );
}
```

### Higher-Order Component

```jsx
import { withTracking } from '@your-company/affiliate-sdk/react';

const TrackedComponent = withTracking(
  MyComponent,
  'component_view',
  (props) => ({ component_id: props.id })
);
```

## Examples

### E-commerce Integration

```javascript
// Track product view
await sdk.trackEvent('product_view', {
  product_id: 'abc123',
  product_name: 'Premium Widget',
  category: 'electronics',
  price: 99.99
});

// Track add to cart
await sdk.trackEvent('add_to_cart', {
  product_id: 'abc123',
  quantity: 1,
  value: 99.99
});

// Track purchase
await sdk.trackPurchase({
  amount: 199.98,
  currency: 'USD',
  productId: 'abc123',
  transactionId: 'order_456',
  additionalData: {
    shipping: 9.99,
    tax: 15.99,
    discount: 25.00
  }
});
```

### User Journey Tracking

```javascript
// Track registration step
await sdk.trackEvent('registration_step', {
  step: 'email_verification',
  step_number: 2
});

// Track feature usage
await sdk.trackEvent('feature_used', {
  feature_name: 'advanced_search',
  user_plan: 'premium'
});

// Track engagement
await sdk.trackEvent('content_engagement', {
  content_type: 'video',
  content_id: 'tutorial_101',
  engagement_time: 120
});
```

### Single Page Application (SPA)

```javascript
// For SPAs using hash routing
window.addEventListener('hashchange', () => {
  sdk.trackPageView(window.location.hash);
});

// For SPAs using HTML5 history API
const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(history, args);
  sdk.trackPageView(window.location.pathname);
};
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- IE 11 (with polyfills)

## Privacy & GDPR

The SDK respects user privacy:

- No personal data is collected by default
- All tracking can be disabled
- LocalStorage is used for session management
- Supports opt-out mechanisms

```javascript
// Disable all auto-tracking
const sdk = new AffiliateSDK({
  affiliateCode: 'YOUR_CODE',
  appCode: 'YOUR_APP_CODE',
  autoTrack: {
    pageViews: false,
    clicks: false,
    forms: false,
    scrolling: false,
    timeOnPage: false
  }
});
```

## Error Handling

The SDK includes built-in error handling:

- Failed events are queued for retry
- Network errors don't break functionality
- Debug mode provides detailed logging

## Performance

- Lightweight: < 15KB gzipped
- No external dependencies
- Lazy loading support
- Efficient event batching

## Support

For issues and questions, please contact our support team or visit our documentation.