# Affiliate SDK for iOS

A comprehensive tracking SDK for iOS applications written in Swift to integrate with the affiliate platform.

## Requirements

- iOS 11.0+
- Xcode 14.0+
- Swift 5.7+

## Installation

### Swift Package Manager

Add the following to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/your-company/affiliate-sdk.git", from: "1.0.0")
]
```

Or add it through Xcode:
1. File → Add Package Dependencies
2. Enter URL: `https://github.com/your-company/affiliate-sdk`
3. Select version: Up to Next Major Version

### CocoaPods

Add to your `Podfile`:

```ruby
pod 'AffiliateSDK', :git => 'https://github.com/your-company/affiliate-sdk.git'
```

Then run:

```bash
pod install
```

## Setup

### Info.plist Configuration

Add App Transport Security settings to your `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## Quick Start

### Initialize in AppDelegate

```swift
import UIKit
import AffiliateSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Configure SDK
        AffiliateSDK.configure(
            affiliateCode: "YOUR_AFFILIATE_CODE",
            appCode: "YOUR_APP_CODE",
            debug: true
        )
        
        // Initialize SDK
        Task {
            await AffiliateSDK.shared.initialize()
        }
        
        return true
    }
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
- ✅ App lifecycle tracking
- ✅ Swift Concurrency support

## API Reference

### Configuration

```swift
AffiliateSDK.configure(
    affiliateCode: "YOUR_AFFILIATE_CODE",
    appCode: "YOUR_APP_CODE",
    baseUrl: "https://your-domain.com/api/tracker.php", // optional
    debug: true // optional
)
```

### Initialization

```swift
await AffiliateSDK.shared.initialize()
```

### Track Events

```swift
// Custom event
await AffiliateSDK.shared.trackEvent("custom_action", parameters: [
    "category": "user_interaction",
    "value": 100
])

// Screen view
await AffiliateSDK.shared.trackScreenView("HomeViewController")

// Purchase
let purchaseData = PurchaseData(
    amount: 99.99,
    currency: "USD",
    productId: "premium_subscription",
    transactionId: "txn_123456"
)
await AffiliateSDK.shared.trackPurchase(purchaseData)

// Button click
await AffiliateSDK.shared.trackButtonClick("subscribe_button")

// Form submission
await AffiliateSDK.shared.trackFormSubmit("registration_form")
```

### User Properties

```swift
// Set user properties
AffiliateSDK.shared.setUserProperties([
    "user_id": "12345",
    "user_type": "premium",
    "signup_date": "2024-01-15"
])

// Get user properties
let properties = AffiliateSDK.shared.getUserProperties()
```

## Example Integration

### In a View Controller

```swift
import UIKit
import AffiliateSDK

class HomeViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Track screen view
        Task {
            await AffiliateSDK.shared.trackScreenView("HomeViewController")
        }
    }
    
    @IBAction func purchaseButtonTapped(_ sender: UIButton) {
        Task {
            // Track button click
            await AffiliateSDK.shared.trackButtonClick("purchase_button")
            
            // Track purchase
            let purchaseData = PurchaseData(
                amount: 9.99,
                currency: "USD",
                productId: "premium_upgrade"
            )
            await AffiliateSDK.shared.trackPurchase(purchaseData)
            
            // Show success message
            showAlert(title: "Success", message: "Purchase tracked!")
        }
    }
    
    @IBAction func customActionButtonTapped(_ sender: UIButton) {
        Task {
            await AffiliateSDK.shared.trackEvent("custom_action", parameters: [
                "action_type": "navigation",
                "destination": "profile"
            ])
            
            // Navigate to profile
            let profileVC = ProfileViewController()
            navigationController?.pushViewController(profileVC, animated: true)
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}
```

### With SwiftUI

```swift
import SwiftUI
import AffiliateSDK

struct ContentView: View {
    var body: some View {
        VStack {
            Button("Track Purchase") {
                Task {
                    await AffiliateSDK.shared.trackButtonClick("purchase_button")
                    
                    let purchaseData = PurchaseData(
                        amount: 9.99,
                        currency: "USD",
                        productId: "premium_upgrade"
                    )
                    await AffiliateSDK.shared.trackPurchase(purchaseData)
                }
            }
            
            Button("Track Custom Event") {
                Task {
                    await AffiliateSDK.shared.trackEvent("custom_action", parameters: [
                        "source": "swiftui_view",
                        "value": 42
                    ])
                }
            }
        }
        .onAppear {
            Task {
                await AffiliateSDK.shared.trackScreenView("ContentView")
            }
        }
    }
}
```

## Auto-tracking

The SDK automatically tracks:

- App launch and session start
- App backgrounding and session end
- Device and app information
- Session management with timeouts

## Error Handling

The SDK includes built-in error handling and will queue events for retry if network requests fail. All methods are async and use Swift's structured concurrency.

## Privacy

The SDK respects user privacy and only collects necessary data for tracking purposes. All data is transmitted securely over HTTPS.

## Support

For issues and questions, please contact our support team or visit our documentation.