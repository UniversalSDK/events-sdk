import Foundation
import UIKit

/// Configuration for AffiliateSDK
public struct AffiliateSDKConfig {
    public let affiliateCode: String
    public let appCode: String
    public let baseUrl: String
    public let debug: Bool
    
    public init(affiliateCode: String, appCode: String, baseUrl: String = "https://affiliate.33rd.pro/api/tracker.php", debug: Bool = false) {
        self.affiliateCode = affiliateCode
        self.appCode = appCode
        self.baseUrl = baseUrl
        self.debug = debug
    }
}

/// Purchase data for tracking purchases
public struct PurchaseData {
    public let amount: Double
    public let currency: String
    public let productId: String
    public let transactionId: String?
    public let additionalData: [String: Any]?
    
    public init(amount: Double, currency: String = "USD", productId: String, transactionId: String? = nil, additionalData: [String: Any]? = nil) {
        self.amount = amount
        self.currency = currency
        self.productId = productId
        self.transactionId = transactionId
        self.additionalData = additionalData
    }
    
    internal func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "amount": amount,
            "currency": currency,
            "product_id": productId
        ]
        
        if let transactionId = transactionId {
            dict["transaction_id"] = transactionId
        }
        
        if let additionalData = additionalData {
            dict.merge(additionalData) { (current, _) in current }
        }
        
        return dict
    }
}

/// Main AffiliateSDK class
public class AffiliateSDK {
    
    public static let shared = AffiliateSDK()
    
    private var config: AffiliateSDKConfig?
    private var sessionId: String?
    private var sessionStartTime: Date?
    private var lastEventTime: Date?
    private var isInitialized = false
    
    private var deviceInfo: [String: Any] = [:]
    private var eventQueue: [[String: Any]] = []
    
    private let platform = "ios"
    private let sessionTimeout: TimeInterval = 30 * 60 // 30 minutes
    
    private init() {
        setupAppLifecycleNotifications()
    }
    
    /// Configure the SDK with required parameters
    public static func configure(affiliateCode: String, appCode: String, baseUrl: String = "https://affiliate.33rd.pro/api/tracker.php", debug: Bool = false) {
        let config = AffiliateSDKConfig(affiliateCode: affiliateCode, appCode: appCode, baseUrl: baseUrl, debug: debug)
        shared.config = config
    }
    
    /// Initialize the SDK
    public func initialize() async {
        guard let config = config else {
            log("SDK not configured. Call configure() first.")
            return
        }
        
        if isInitialized {
            log("SDK already initialized")
            return
        }
        
        do {
            // Generate or restore session ID
            sessionId = await getOrCreateSessionId()
            sessionStartTime = Date()
            lastEventTime = Date()
            
            // Collect device information
            await collectDeviceInfo()
            
            // Process any queued events
            await processEventQueue()
            
            // Track app launch
            var launchData = deviceInfo
            launchData["session_id"] = sessionId
            launchData["platform"] = platform
            
            await trackEvent("app_launch", parameters: launchData)
            
            isInitialized = true
            log("SDK initialized successfully")
            
        } catch {
            logError("Failed to initialize SDK: \(error)")
        }
    }
    
    /// Track a custom event
    public func trackEvent(_ eventName: String, parameters: [String: Any] = [:]) async {
        guard let config = config else {
            logError("SDK not configured")
            return
        }
        
        var eventData: [String: Any] = [
            "affiliate_code": config.affiliateCode,
            "app_code": config.appCode,
            "event": eventName,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "session_id": sessionId ?? "",
            "platform": platform
        ]
        
        eventData.merge(parameters) { (current, _) in current }
        
        await sendEvent(eventData)
        lastEventTime = Date()
    }
    
    /// Track screen view
    public func trackScreenView(_ screenName: String, parameters: [String: Any] = [:]) async {
        var params = parameters
        params["screen_name"] = screenName
        await trackEvent("screen_view", parameters: params)
    }
    
    /// Track purchase event
    public func trackPurchase(_ purchaseData: PurchaseData) async {
        await trackEvent("purchase", parameters: purchaseData.toDictionary())
    }
    
    /// Track button click
    public func trackButtonClick(_ buttonId: String, parameters: [String: Any] = [:]) async {
        var params = parameters
        params["button_id"] = buttonId
        await trackEvent("button_click", parameters: params)
    }
    
    /// Track form submission
    public func trackFormSubmit(_ formName: String, parameters: [String: Any] = [:]) async {
        var params = parameters
        params["form_name"] = formName
        await trackEvent("form_submit", parameters: params)
    }
    
    /// Set user properties
    public func setUserProperties(_ properties: [String: Any]) {
        do {
            let data = try JSONSerialization.data(withJSONObject: properties)
            UserDefaults.standard.set(data, forKey: "affiliate_sdk_user_props_\(config?.affiliateCode ?? "")")
        } catch {
            logError("Failed to set user properties: \(error)")
        }
    }
    
    /// Get user properties
    public func getUserProperties() -> [String: Any] {
        guard let data = UserDefaults.standard.data(forKey: "affiliate_sdk_user_props_\(config?.affiliateCode ?? "")") else {
            return [:]
        }
        
        do {
            return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        } catch {
            logError("Failed to get user properties: \(error)")
            return [:]
        }
    }
    
    /// Track session end
    public func trackSessionEnd() async {
        guard let sessionStartTime = sessionStartTime else { return }
        
        let sessionDuration = Date().timeIntervalSince(sessionStartTime) * 1000
        await trackEvent("session_end", parameters: [
            "duration": Int64(sessionDuration),
            "session_id": sessionId ?? ""
        ])
    }
    
    // MARK: - Private Methods
    
    private func collectDeviceInfo() async {
        var info: [String: Any] = [:]
        
        // Device information
        let device = UIDevice.current
        info["device_model"] = device.model
        info["device_name"] = device.name
        info["os_name"] = device.systemName.lowercased()
        info["os_version"] = device.systemVersion
        
        // Screen information
        let screen = UIScreen.main
        info["screen_width"] = Int(screen.bounds.width)
        info["screen_height"] = Int(screen.bounds.height)
        info["screen_scale"] = screen.scale
        
        // App information
        if let bundle = Bundle.main.infoDictionary {
            info["app_version"] = bundle["CFBundleShortVersionString"] as? String ?? ""
            info["app_build"] = bundle["CFBundleVersion"] as? String ?? ""
            info["bundle_id"] = bundle["CFBundleIdentifier"] as? String ?? ""
        }
        
        // Device ID (using identifier for vendor)
        if let identifierForVendor = device.identifierForVendor?.uuidString {
            info["device_id"] = identifierForVendor
        }
        
        // Locale and timezone
        info["locale"] = Locale.current.identifier
        info["timezone"] = TimeZone.current.identifier
        
        deviceInfo = info
    }
    
    private func getOrCreateSessionId() async -> String {
        let key = "affiliate_sdk_session_\(config?.affiliateCode ?? "")"
        
        if let existingSessionId = UserDefaults.standard.string(forKey: key) {
            return existingSessionId
        }
        
        let newSessionId = "sess_\(Int64(Date().timeIntervalSince1970 * 1000))_\(generateRandomString(length: 9))"
        UserDefaults.standard.set(newSessionId, forKey: key)
        return newSessionId
    }
    
    private func sendEvent(_ eventData: [String: Any]) async {
        guard let config = config else { return }
        
        do {
            var components = URLComponents(string: config.baseUrl)
            components?.queryItems = eventData.compactMap { key, value in
                URLQueryItem(name: key, value: String(describing: value))
            }
            
            guard let url = components?.url else {
                throw NSError(domain: "AffiliateSDK", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.timeoutInterval = 10
            
            let (_, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                log("Event sent successfully: \(eventData["event"] ?? "")")
            } else {
                throw NSError(domain: "AffiliateSDK", code: -1, userInfo: [NSLocalizedDescriptionKey: "HTTP Error"])
            }
            
        } catch {
            logError("Failed to send event: \(error)")
            
            // Queue event for retry
            var queuedEvent = eventData
            queuedEvent["retry_count"] = 0
            queuedEvent["queued_at"] = Int64(Date().timeIntervalSince1970 * 1000)
            eventQueue.append(queuedEvent)
        }
    }
    
    private func processEventQueue() async {
        guard !eventQueue.isEmpty else { return }
        
        let eventsToProcess = eventQueue
        eventQueue.removeAll()
        
        for var event in eventsToProcess {
            let retryCount = event["retry_count"] as? Int ?? 0
            
            if retryCount < 3 {
                event.removeValue(forKey: "retry_count")
                event.removeValue(forKey: "queued_at")
                
                do {
                    await sendEvent(event)
                } catch {
                    // Re-queue with incremented retry count
                    event["retry_count"] = retryCount + 1
                    eventQueue.append(event)
                }
            }
        }
    }
    
    private func setupAppLifecycleNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }
    
    @objc private func appDidEnterBackground() {
        Task {
            await trackSessionEnd()
        }
    }
    
    @objc private func appWillEnterForeground() {
        Task {
            await updateSessionIfNeeded()
        }
    }
    
    private func updateSessionIfNeeded() async {
        guard let lastEventTime = lastEventTime else { return }
        
        let timeSinceLastEvent = Date().timeIntervalSince(lastEventTime)
        
        if timeSinceLastEvent > sessionTimeout {
            // Start new session
            sessionId = await getOrCreateSessionId()
            sessionStartTime = Date()
            
            await trackEvent("app_launch", parameters: [
                "session_id": sessionId ?? "",
                "returning_user": true
            ])
        }
    }
    
    private func generateRandomString(length: Int) -> String {
        let characters = "abcdefghijklmnopqrstuvwxyz0123456789"
        return String((0..<length).map { _ in characters.randomElement()! })
    }
    
    private func log(_ message: String) {
        if config?.debug == true {
            print("[AffiliateSDK] \(message)")
        }
    }
    
    private func logError(_ message: String) {
        if config?.debug == true {
            print("[AffiliateSDK Error] \(message)")
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}