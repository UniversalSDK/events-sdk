# Affiliate SDK for Android

A comprehensive tracking SDK for Android applications written in Kotlin to integrate with the affiliate platform.

## Requirements

- Android API level 21 (Android 5.0) or higher
- Kotlin 1.8+

## Installation

### Gradle (Recommended)

Add the repository to your project-level `settings.gradle`:

```groovy
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://github.com/your-company/affiliate-sdk/raw/main/maven") }
    }
}
```

Add the dependency to your app-level `build.gradle`:

```groovy
dependencies {
    implementation 'com.yourcompany:affiliate-sdk:1.0.0'
}
```

### Manual Installation

1. Download the AAR file from releases
2. Add it to your `app/libs` folder
3. Add to your `build.gradle`:

```groovy
dependencies {
    implementation files('libs/affiliate-sdk-1.0.0.aar')
}
```

## Setup

### Permissions

Add these permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Initialize in Application Class

Create an Application class if you don't have one:

```kotlin
package com.yourapp

import android.app.Application
import com.yourcompany.affiliatesdk.AffiliateSDK

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Configure SDK
        AffiliateSDK.configure(
            context = this,
            affiliateCode = "YOUR_AFFILIATE_CODE",
            appCode = "YOUR_APP_CODE",
            debug = BuildConfig.DEBUG
        )
        
        // Initialize SDK
        lifecycleScope.launch {
            AffiliateSDK.initialize()
        }
    }
}
```

Register your Application class in `AndroidManifest.xml`:

```xml
<application
    android:name=".MyApplication"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    ...>
```

## Features

- ✅ Automatic session tracking
- ✅ Screen view tracking
- ✅ Purchase tracking
- ✅ Custom event tracking
- ✅ Offline event queuing with retry logic
- ✅ Device information collection
- ✅ User properties management
- ✅ App lifecycle tracking
- ✅ Kotlin Coroutines support

## API Reference

### Configuration

```kotlin
AffiliateSDK.configure(
    context = this,
    affiliateCode = "YOUR_AFFILIATE_CODE",
    appCode = "YOUR_APP_CODE",
    baseUrl = "https://your-domain.com/api/tracker.php", // optional
    debug = true // optional
)
```

### Initialization

```kotlin
// In a coroutine scope
AffiliateSDK.initialize()
```

### Track Events

```kotlin
// Custom event
AffiliateSDK.trackEvent("custom_action", mapOf(
    "category" to "user_interaction",
    "value" to 100
))

// Screen view
AffiliateSDK.trackScreenView("MainActivity")

// Purchase
val purchaseData = PurchaseData(
    amount = 99.99,
    currency = "USD",
    productId = "premium_subscription",
    transactionId = "txn_123456"
)
AffiliateSDK.trackPurchase(purchaseData)

// Button click
AffiliateSDK.trackButtonClick("subscribe_button")

// Form submission
AffiliateSDK.trackFormSubmit("registration_form")
```

### User Properties

```kotlin
// Set user properties
val sdk = AffiliateSDK.getInstance()
sdk.setUserProperties(mapOf(
    "user_id" to "12345",
    "user_type" to "premium",
    "signup_date" to "2024-01-15"
))

// Get user properties
val properties = sdk.getUserProperties()
```

## Example Integration

### In an Activity

```kotlin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.yourcompany.affiliatesdk.AffiliateSDK
import com.yourcompany.affiliatesdk.PurchaseData
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Track screen view
        lifecycleScope.launch {
            AffiliateSDK.trackScreenView("MainActivity")
        }
        
        setupPurchaseButton()
        setupCustomActionButton()
    }
    
    private fun setupPurchaseButton() {
        findViewById<Button>(R.id.purchaseButton).setOnClickListener {
            lifecycleScope.launch {
                // Track button click
                AffiliateSDK.trackButtonClick("purchase_button")
                
                // Track purchase
                val purchaseData = PurchaseData(
                    amount = 9.99,
                    currency = "USD",
                    productId = "premium_upgrade"
                )
                AffiliateSDK.trackPurchase(purchaseData)
                
                // Show success message
                Toast.makeText(this@MainActivity, "Purchase tracked!", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun setupCustomActionButton() {
        findViewById<Button>(R.id.customActionButton).setOnClickListener {
            lifecycleScope.launch {
                AffiliateSDK.trackEvent("custom_action", mapOf(
                    "action_type" to "navigation",
                    "destination" to "profile"
                ))
                
                // Navigate to profile
                startActivity(Intent(this@MainActivity, ProfileActivity::class.java))
            }
        }
    }
}
```

### With Jetpack Compose

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.yourcompany.affiliatesdk.AffiliateSDK
import com.yourcompany.affiliatesdk.PurchaseData
import kotlinx.coroutines.launch

@Composable
fun HomeScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    LaunchedEffect(Unit) {
        AffiliateSDK.trackScreenView("HomeScreen")
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Button(
            onClick = {
                scope.launch {
                    AffiliateSDK.trackButtonClick("purchase_button")
                    
                    val purchaseData = PurchaseData(
                        amount = 9.99,
                        currency = "USD",
                        productId = "premium_upgrade"
                    )
                    AffiliateSDK.trackPurchase(purchaseData)
                }
            }
        ) {
            Text("Buy Premium")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = {
                scope.launch {
                    AffiliateSDK.trackEvent("custom_action", mapOf(
                        "source" to "compose_screen",
                        "value" to 42
                    ))
                }
            }
        ) {
            Text("Track Custom Event")
        }
    }
}
```

## Auto-tracking

The SDK automatically tracks:

- App launch and session start
- App backgrounding and session end
- Device and app information
- Session management with 30-minute timeout

## Error Handling

The SDK includes built-in error handling and will queue events for retry if network requests fail. All tracking methods are suspending functions that should be called from a coroutine scope.

## Threading

The SDK uses Kotlin Coroutines and is thread-safe. All network operations are performed on the IO dispatcher.

## Privacy

The SDK respects user privacy and only collects necessary data for tracking purposes. All data is transmitted securely over HTTPS.

## Proguard/R8

If you're using code obfuscation, add these rules to your `proguard-rules.pro`:

```proguard
-keep class com.yourcompany.affiliatesdk.** { *; }
-keepclassmembers class com.yourcompany.affiliatesdk.** { *; }
```

## Support

For issues and questions, please contact our support team or visit our documentation.