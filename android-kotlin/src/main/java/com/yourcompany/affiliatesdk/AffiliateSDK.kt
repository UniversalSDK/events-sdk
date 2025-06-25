package com.yourcompany.affiliatesdk

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.*
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * Configuration data class for AffiliateSDK
 */
data class AffiliateSDKConfig(
    val affiliateCode: String,
    val appCode: String,
    val baseUrl: String = "https://affiliate.33rd.pro/api/tracker.php",
    val debug: Boolean = false
)

/**
 * Purchase data class for tracking purchases
 */
data class PurchaseData(
    val amount: Double,
    val currency: String = "USD",
    val productId: String,
    val transactionId: String? = null,
    val additionalData: Map<String, Any>? = null
) {
    fun toMap(): Map<String, Any> {
        val map = mutableMapOf<String, Any>(
            "amount" to amount,
            "currency" to currency,
            "product_id" to productId
        )
        
        transactionId?.let { map["transaction_id"] = it }
        additionalData?.let { map.putAll(it) }
        
        return map
    }
}

/**
 * Main AffiliateSDK class for Android
 */
class AffiliateSDK private constructor() : DefaultLifecycleObserver {
    
    companion object {
        @Volatile
        private var INSTANCE: AffiliateSDK? = null
        private const val TAG = "AffiliateSDK"
        private const val PREFS_NAME = "affiliate_sdk_prefs"
        private const val SESSION_TIMEOUT_MS = 30 * 60 * 1000L // 30 minutes
        
        /**
         * Configure the SDK with required parameters
         */
        fun configure(
            context: Context,
            affiliateCode: String,
            appCode: String,
            baseUrl: String = "https://affiliate.33rd.pro/api/tracker.php",
            debug: Boolean = false
        ): AffiliateSDK {
            return getInstance().apply {
                this.context = context.applicationContext
                this.config = AffiliateSDKConfig(affiliateCode, appCode, baseUrl, debug)
            }
        }
        
        /**
         * Get singleton instance
         */
        fun getInstance(): AffiliateSDK {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AffiliateSDK().also { INSTANCE = it }
            }
        }
        
        /**
         * Initialize the SDK (convenience method)
         */
        suspend fun initialize() {
            getInstance().initialize()
        }
        
        /**
         * Track event (convenience method)
         */
        suspend fun trackEvent(eventName: String, parameters: Map<String, Any> = emptyMap()) {
            getInstance().trackEvent(eventName, parameters)
        }
        
        /**
         * Track screen view (convenience method)
         */
        suspend fun trackScreenView(screenName: String, parameters: Map<String, Any> = emptyMap()) {
            getInstance().trackScreenView(screenName, parameters)
        }
        
        /**
         * Track purchase (convenience method)
         */
        suspend fun trackPurchase(purchaseData: PurchaseData) {
            getInstance().trackPurchase(purchaseData)
        }
        
        /**
         * Track button click (convenience method)
         */
        suspend fun trackButtonClick(buttonId: String, parameters: Map<String, Any> = emptyMap()) {
            getInstance().trackButtonClick(buttonId, parameters)
        }
        
        /**
         * Track form submit (convenience method)
         */
        suspend fun trackFormSubmit(formName: String, parameters: Map<String, Any> = emptyMap()) {
            getInstance().trackFormSubmit(formName, parameters)
        }
    }
    
    private lateinit var context: Context
    private lateinit var config: AffiliateSDKConfig
    private lateinit var prefs: SharedPreferences
    private lateinit var okHttpClient: OkHttpClient
    
    private var sessionId: String? = null
    private var sessionStartTime: Long = 0
    private var lastEventTime: Long = 0
    private var isInitialized = false
    
    private var deviceInfo: Map<String, Any> = emptyMap()
    private val eventQueue = mutableListOf<Map<String, Any>>()
    
    private val platform = "android"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * Initialize the SDK
     */
    suspend fun initialize() {
        if (!::context.isInitialized || !::config.isInitialized) {
            logError("SDK not configured. Call configure() first.")
            return
        }
        
        if (isInitialized) {
            log("SDK already initialized")
            return
        }
        
        try {
            // Initialize preferences and HTTP client
            prefs = context.getSharedPreferences("${PREFS_NAME}_${config.affiliateCode}", Context.MODE_PRIVATE)
            okHttpClient = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()
            
            // Generate or restore session ID
            sessionId = getOrCreateSessionId()
            sessionStartTime = System.currentTimeMillis()
            lastEventTime = System.currentTimeMillis()
            
            // Collect device information
            collectDeviceInfo()
            
            // Process any queued events
            processEventQueue()
            
            // Track app launch
            val launchData = deviceInfo.toMutableMap().apply {
                put("session_id", sessionId ?: "")
                put("platform", platform)
            }
            
            trackEvent("app_launch", launchData)
            
            // Setup lifecycle observer
            if (context is Application) {
                ProcessLifecycleOwner.get().lifecycle.addObserver(this)
            }
            
            isInitialized = true
            log("SDK initialized successfully")
            
        } catch (e: Exception) {
            logError("Failed to initialize SDK: ${e.message}")
        }
    }
    
    /**
     * Track a custom event
     */
    suspend fun trackEvent(eventName: String, parameters: Map<String, Any> = emptyMap()) {
        if (!::config.isInitialized) {
            logError("SDK not configured")
            return
        }
        
        val eventData = mutableMapOf<String, Any>(
            "affiliate_code" to config.affiliateCode,
            "app_code" to config.appCode,
            "event" to eventName,
            "timestamp" to System.currentTimeMillis(),
            "session_id" to (sessionId ?: ""),
            "platform" to platform
        ).apply {
            putAll(parameters)
        }
        
        sendEvent(eventData)
        lastEventTime = System.currentTimeMillis()
    }
    
    /**
     * Track screen view
     */
    suspend fun trackScreenView(screenName: String, parameters: Map<String, Any> = emptyMap()) {
        val params = parameters.toMutableMap().apply {
            put("screen_name", screenName)
        }
        trackEvent("screen_view", params)
    }
    
    /**
     * Track purchase event
     */
    suspend fun trackPurchase(purchaseData: PurchaseData) {
        trackEvent("purchase", purchaseData.toMap())
    }
    
    /**
     * Track button click
     */
    suspend fun trackButtonClick(buttonId: String, parameters: Map<String, Any> = emptyMap()) {
        val params = parameters.toMutableMap().apply {
            put("button_id", buttonId)
        }
        trackEvent("button_click", params)
    }
    
    /**
     * Track form submission
     */
    suspend fun trackFormSubmit(formName: String, parameters: Map<String, Any> = emptyMap()) {
        val params = parameters.toMutableMap().apply {
            put("form_name", formName)
        }
        trackEvent("form_submit", params)
    }
    
    /**
     * Set user properties
     */
    fun setUserProperties(properties: Map<String, Any>) {
        try {
            val json = JSONObject(properties).toString()
            prefs.edit().putString("user_properties", json).apply()
        } catch (e: Exception) {
            logError("Failed to set user properties: ${e.message}")
        }
    }
    
    /**
     * Get user properties
     */
    fun getUserProperties(): Map<String, Any> {
        return try {
            val json = prefs.getString("user_properties", "{}")
            val jsonObject = JSONObject(json ?: "{}")
            val map = mutableMapOf<String, Any>()
            
            jsonObject.keys().forEach { key ->
                map[key] = jsonObject.get(key)
            }
            
            map
        } catch (e: Exception) {
            logError("Failed to get user properties: ${e.message}")
            emptyMap()
        }
    }
    
    /**
     * Track session end
     */
    suspend fun trackSessionEnd() {
        if (sessionStartTime == 0L) return
        
        val sessionDuration = System.currentTimeMillis() - sessionStartTime
        trackEvent("session_end", mapOf(
            "duration" to sessionDuration,
            "session_id" to (sessionId ?: "")
        ))
    }
    
    // Lifecycle callbacks
    override fun onStop(owner: LifecycleOwner) {
        scope.launch {
            trackSessionEnd()
        }
    }
    
    override fun onStart(owner: LifecycleOwner) {
        scope.launch {
            updateSessionIfNeeded()
        }
    }
    
    // Private methods
    
    private fun collectDeviceInfo() {
        try {
            val packageManager = context.packageManager
            val packageInfo = packageManager.getPackageInfo(context.packageName, 0)
            val displayMetrics = context.resources.displayMetrics
            
            val info = mutableMapOf<String, Any>(
                "device_id" to getDeviceId(),
                "device_model" to Build.MODEL,
                "device_brand" to Build.BRAND,
                "device_manufacturer" to Build.MANUFACTURER,
                "os_name" to "android",
                "os_version" to Build.VERSION.RELEASE,
                "sdk_int" to Build.VERSION.SDK_INT,
                "app_version" to packageInfo.versionName,
                "app_build" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode.toString()
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.versionCode.toString()
                },
                "package_name" to context.packageName,
                "screen_width" to displayMetrics.widthPixels,
                "screen_height" to displayMetrics.heightPixels,
                "screen_density" to displayMetrics.density,
                "locale" to Locale.getDefault().toString(),
                "timezone" to TimeZone.getDefault().id
            )
            
            deviceInfo = info
        } catch (e: Exception) {
            logError("Failed to collect device info: ${e.message}")
            deviceInfo = mapOf(
                "os_name" to "android",
                "platform" to platform
            )
        }
    }
    
    private fun getDeviceId(): String {
        return try {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
                ?: "unknown_device"
        } catch (e: Exception) {
            "unknown_device"
        }
    }
    
    private fun getOrCreateSessionId(): String {
        val existingSessionId = prefs.getString("session_id", null)
        
        if (existingSessionId != null) {
            return existingSessionId
        }
        
        val newSessionId = "sess_${System.currentTimeMillis()}_${generateRandomString(9)}"
        prefs.edit().putString("session_id", newSessionId).apply()
        return newSessionId
    }
    
    private suspend fun sendEvent(eventData: Map<String, Any>) {
        try {
            val urlBuilder = HttpUrl.parse(config.baseUrl)?.newBuilder()
                ?: throw IOException("Invalid base URL")
            
            eventData.forEach { (key, value) ->
                urlBuilder.addQueryParameter(key, value.toString())
            }
            
            val request = Request.Builder()
                .url(urlBuilder.build())
                .get()
                .build()
            
            withContext(Dispatchers.IO) {
                okHttpClient.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        log("Event sent successfully: ${eventData["event"]}")
                    } else {
                        throw IOException("HTTP ${response.code}: ${response.message}")
                    }
                }
            }
            
        } catch (e: Exception) {
            logError("Failed to send event: ${e.message}")
            
            // Queue event for retry
            val queuedEvent = eventData.toMutableMap().apply {
                put("retry_count", 0)
                put("queued_at", System.currentTimeMillis())
            }
            eventQueue.add(queuedEvent)
        }
    }
    
    private suspend fun processEventQueue() {
        if (eventQueue.isEmpty()) return
        
        val eventsToProcess = eventQueue.toList()
        eventQueue.clear()
        
        eventsToProcess.forEach { event ->
            val retryCount = event["retry_count"] as? Int ?: 0
            
            if (retryCount < 3) {
                try {
                    val eventToSend = event.toMutableMap().apply {
                        remove("retry_count")
                        remove("queued_at")
                    }
                    sendEvent(eventToSend)
                } catch (e: Exception) {
                    // Re-queue with incremented retry count
                    val requeuedEvent = event.toMutableMap().apply {
                        put("retry_count", retryCount + 1)
                    }
                    eventQueue.add(requeuedEvent)
                }
            }
        }
    }
    
    private suspend fun updateSessionIfNeeded() {
        if (lastEventTime == 0L) return
        
        val timeSinceLastEvent = System.currentTimeMillis() - lastEventTime
        
        if (timeSinceLastEvent > SESSION_TIMEOUT_MS) {
            // Start new session
            sessionId = getOrCreateSessionId()
            sessionStartTime = System.currentTimeMillis()
            
            trackEvent("app_launch", mapOf(
                "session_id" to (sessionId ?: ""),
                "returning_user" to true
            ))
        }
    }
    
    private fun generateRandomString(length: Int): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        return (1..length)
            .map { chars.random() }
            .joinToString("")
    }
    
    private fun log(message: String) {
        if (::config.isInitialized && config.debug) {
            Log.d(TAG, message)
        }
    }
    
    private fun logError(message: String) {
        if (::config.isInitialized && config.debug) {
            Log.e(TAG, message)
        }
    }
}