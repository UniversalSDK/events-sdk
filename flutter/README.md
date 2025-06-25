# Affiliate SDK for Flutter

A comprehensive tracking SDK for Flutter applications to integrate with the affiliate platform.

## Installation

Add this to your `pubspec.yaml`:

```yaml
dependencies:
  affiliate_sdk:
    git:
      url: https://github.com/your-company/affiliate-sdk
      ref: main
      path: flutter/
```

Then run:

```bash
flutter pub get
```

## Platform Setup

### Android

Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### iOS

Set minimum iOS version in `ios/Podfile`:

```ruby
platform :ios, '11.0'
```

## Quick Start

```dart
import 'package:affiliate_sdk/affiliate_sdk.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize SDK
  final tracker = AffiliateSDK(
    affiliateCode: 'YOUR_AFFILIATE_CODE',
    appCode: 'YOUR_APP_CODE',
    debug: kDebugMode,
  );
  
  await tracker.initialize();
  
  runApp(MyApp(tracker: tracker));
}
```

## Features

- ✅ Automatic session tracking
- ✅ Screen view tracking with NavigatorObserver
- ✅ Purchase tracking
- ✅ Custom event tracking
- ✅ Offline event queuing
- ✅ Device information collection
- ✅ User properties management
- ✅ App lifecycle tracking

## API Reference

### Initialization

```dart
final tracker = AffiliateSDK(
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE',
  baseUrl: 'https://your-domain.com/api/tracker.php', // optional
  debug: true, // optional
);

await tracker.initialize();
```

### Track Events

```dart
// Custom event
await tracker.trackEvent('custom_action', {
  'category': 'user_interaction',
  'value': 100,
});

// Screen view
await tracker.trackScreenView('HomeScreen');

// Purchase
await tracker.trackPurchase(PurchaseData(
  amount: 99.99,
  currency: 'USD',
  productId: 'premium_subscription',
  transactionId: 'txn_123456',
));

// Button click
await tracker.trackButtonClick('subscribe_button');

// Form submission
await tracker.trackFormSubmit('registration_form');
```

### User Properties

```dart
// Set user properties
await tracker.setUserProperties({
  'user_id': '12345',
  'user_type': 'premium',
  'signup_date': '2024-01-15',
});

// Get user properties
final properties = await tracker.getUserProperties();
```

### Automatic Screen Tracking

```dart
class MyApp extends StatelessWidget {
  final AffiliateSDK tracker;
  
  const MyApp({required this.tracker, Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My App',
      navigatorObservers: [
        tracker.getNavigatorObserver(), // Add this for automatic screen tracking
      ],
      home: const HomeScreen(),
      routes: {
        '/profile': (context) => const ProfileScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}
```

## Example Integration

```dart
import 'package:flutter/material.dart';
import 'package:affiliate_sdk/affiliate_sdk.dart';

late AffiliateSDK tracker;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  tracker = AffiliateSDK(
    affiliateCode: 'YOUR_AFFILIATE_CODE',
    appCode: 'YOUR_APP_CODE',
    debug: true,
  );
  
  await tracker.initialize();
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Affiliate SDK Demo',
      navigatorObservers: [tracker.getNavigatorObserver()],
      home: HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () async {
                // Track button click
                await tracker.trackButtonClick('premium_upgrade');
                
                // Track purchase
                await tracker.trackPurchase(PurchaseData(
                  amount: 9.99,
                  currency: 'USD',
                  productId: 'premium_upgrade',
                ));
                
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Purchase tracked!')),
                );
              },
              child: Text('Buy Premium'),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                await tracker.trackEvent('custom_action', {
                  'action_type': 'navigation',
                  'destination': 'profile',
                });
                
                Navigator.pushNamed(context, '/profile');
              },
              child: Text('Go to Profile'),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Error Handling

The SDK includes built-in error handling and will queue events for retry if network requests fail.

## Privacy

The SDK respects user privacy and only collects necessary data for tracking purposes. All data is transmitted securely.

## Support

For issues and questions, please contact our support team or visit our documentation.