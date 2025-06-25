# Affiliate SDK for React Native

A comprehensive tracking SDK for React Native applications to integrate with the affiliate platform.

## Installation

```bash
npm install @your-company/affiliate-sdk-react-native
# or
yarn add @your-company/affiliate-sdk-react-native
```

### Peer Dependencies

```bash
npm install @react-native-async-storage/async-storage react-native-device-info
```

### iOS Setup (Additional)

```bash
cd ios && pod install
```

## Quick Start

```javascript
import AffiliateSDK from '@your-company/affiliate-sdk-react-native';

// Initialize SDK
const tracker = new AffiliateSDK({
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE',
  debug: __DEV__
});

// Initialize in your App.js
export default function App() {
  useEffect(() => {
    tracker.initialize();
  }, []);

  // Your app code
}
```

## Features

- ✅ Automatic session tracking
- ✅ Screen view tracking
- ✅ Purchase tracking
- ✅ Custom event tracking
- ✅ Offline event queuing
- ✅ Device information collection
- ✅ User properties management
- ✅ TypeScript support

## API Reference

### Initialization

```javascript
const tracker = new AffiliateSDK({
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE',
  baseUrl: 'https://your-domain.com/api/tracker.php', // optional
  debug: true // optional
});

await tracker.initialize();
```

### Track Events

```javascript
// Custom event
await tracker.trackEvent('custom_action', {
  category: 'user_interaction',
  value: 100
});

// Screen view
await tracker.trackScreenView('HomeScreen');

// Purchase
await tracker.trackPurchase({
  amount: 99.99,
  currency: 'USD',
  productId: 'premium_subscription',
  transactionId: 'txn_123456'
});

// Button click
await tracker.trackButtonClick('subscribe_button');

// Form submission
await tracker.trackFormSubmit('registration_form');
```

### User Properties

```javascript
// Set user properties
await tracker.setUserProperties({
  user_id: '12345',
  user_type: 'premium',
  signup_date: '2024-01-15'
});

// Get user properties
const properties = await tracker.getUserProperties();
```

## Auto-tracking

The SDK automatically tracks:

- App launch and session start
- App backgrounding and session end
- Device and app information
- Network connectivity changes

## Example Integration

```javascript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AffiliateSDK from '@your-company/affiliate-sdk-react-native';

const tracker = new AffiliateSDK({
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE',
  debug: __DEV__
});

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    tracker.initialize();
  }, []);

  return (
    <NavigationContainer
      onStateChange={(state) => {
        // Auto-track screen views
        const routeName = state?.routes[state.index]?.name;
        if (routeName) {
          tracker.trackScreenView(routeName);
        }
      }}
    >
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// In your components
function HomeScreen() {
  const handlePurchase = async () => {
    // Track purchase
    await tracker.trackPurchase({
      amount: 9.99,
      currency: 'USD',
      productId: 'premium_upgrade'
    });
  };

  return (
    // Your component JSX
  );
}
```

## Error Handling

The SDK includes built-in error handling and will queue events for retry if network requests fail.

## Privacy

The SDK respects user privacy and only collects necessary data for tracking purposes. All data is transmitted securely.

## Support

For issues and questions, please contact our support team or visit our documentation.