library affiliate_sdk;

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Configuration class for AffiliateSDK
class AffiliateSDKConfig {
  final String affiliateCode;
  final String appCode;
  final String? baseUrl;
  final bool debug;

  const AffiliateSDKConfig({
    required this.affiliateCode,
    required this.appCode,
    this.baseUrl,
    this.debug = false,
  });
}

/// Purchase data for tracking purchases
class PurchaseData {
  final double amount;
  final String currency;
  final String productId;
  final String? transactionId;
  final Map<String, dynamic>? additionalData;

  const PurchaseData({
    required this.amount,
    this.currency = 'USD',
    required this.productId,
    this.transactionId,
    this.additionalData,
  });

  Map<String, dynamic> toMap() {
    return {
      'amount': amount,
      'currency': currency,
      'product_id': productId,
      if (transactionId != null) 'transaction_id': transactionId,
      if (additionalData != null) ...additionalData!,
    };
  }
}

/// Main AffiliateSDK class
class AffiliateSDK {
  static AffiliateSDK? _instance;
  late AffiliateSDKConfig _config;
  
  String? _sessionId;
  DateTime? _sessionStartTime;
  DateTime? _lastEventTime;
  bool _isInitialized = false;
  
  Map<String, dynamic> _deviceInfo = {};
  List<Map<String, dynamic>> _eventQueue = [];
  
  final String _platform = 'flutter';
  late String _baseUrl;
  
  // Private constructor
  AffiliateSDK._();
  
  /// Get singleton instance
  static AffiliateSDK get instance {
    _instance ??= AffiliateSDK._();
    return _instance!;
  }
  
  /// Factory constructor
  factory AffiliateSDK({
    required String affiliateCode,
    required String appCode,
    String? baseUrl,
    bool debug = false,
  }) {
    final instance = AffiliateSDK.instance;
    instance._config = AffiliateSDKConfig(
      affiliateCode: affiliateCode,
      appCode: appCode,
      baseUrl: baseUrl,
      debug: debug,
    );
    instance._baseUrl = baseUrl ?? 'https://affiliate.33rd.pro/api/tracker.php';
    return instance;
  }

  /// Initialize the SDK
  Future<void> initialize() async {
    try {
      if (_isInitialized) {
        _log('SDK already initialized');
        return;
      }

      // Generate or restore session ID
      _sessionId = await _getOrCreateSessionId();
      _sessionStartTime = DateTime.now();
      _lastEventTime = DateTime.now();

      // Collect device information
      await _collectDeviceInfo();

      // Process any queued events
      await _processEventQueue();

      // Track app launch
      await trackEvent('app_launch', {
        'session_id': _sessionId,
        'platform': _platform,
        ..._deviceInfo,
      });

      _isInitialized = true;
      _log('SDK initialized successfully');

      // Setup app lifecycle listener
      _setupAppLifecycleListener();

    } catch (error) {
      _logError('Failed to initialize SDK: $error');
    }
  }

  /// Track a custom event
  Future<void> trackEvent(String eventName, [Map<String, dynamic>? parameters]) async {
    try {
      final eventData = {
        'affiliate_code': _config.affiliateCode,
        'app_code': _config.appCode,
        'event': eventName,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'session_id': _sessionId,
        'platform': _platform,
        if (parameters != null) ...parameters,
      };

      await _sendEvent(eventData);
      _lastEventTime = DateTime.now();

    } catch (error) {
      _logError('Failed to track event: $error');
    }
  }

  /// Track screen view
  Future<void> trackScreenView(String screenName, [Map<String, dynamic>? parameters]) async {
    await trackEvent('screen_view', {
      'screen_name': screenName,
      if (parameters != null) ...parameters,
    });
  }

  /// Track purchase event
  Future<void> trackPurchase(PurchaseData purchaseData) async {
    await trackEvent('purchase', purchaseData.toMap());
  }

  /// Track button click
  Future<void> trackButtonClick(String buttonId, [Map<String, dynamic>? parameters]) async {
    await trackEvent('button_click', {
      'button_id': buttonId,
      if (parameters != null) ...parameters,
    });
  }

  /// Track form submission
  Future<void> trackFormSubmit(String formName, [Map<String, dynamic>? parameters]) async {
    await trackEvent('form_submit', {
      'form_name': formName,
      if (parameters != null) ...parameters,
    });
  }

  /// Set user properties
  Future<void> setUserProperties(Map<String, dynamic> properties) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'affiliate_sdk_user_props_${_config.affiliateCode}',
        jsonEncode(properties),
      );
    } catch (error) {
      _logError('Failed to set user properties: $error');
    }
  }

  /// Get user properties
  Future<Map<String, dynamic>> getUserProperties() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString('affiliate_sdk_user_props_${_config.affiliateCode}');
      return stored != null ? jsonDecode(stored) : {};
    } catch (error) {
      _logError('Failed to get user properties: $error');
      return {};
    }
  }

  /// Track session end
  Future<void> trackSessionEnd() async {
    if (_sessionStartTime == null) return;

    final sessionDuration = DateTime.now().difference(_sessionStartTime!).inMilliseconds;
    await trackEvent('session_end', {
      'duration': sessionDuration,
      'session_id': _sessionId,
    });
  }

  /// Get navigation observer for automatic screen tracking
  NavigatorObserver getNavigatorObserver() {
    return _AffiliateNavigatorObserver(this);
  }

  // Private methods

  Future<void> _collectDeviceInfo() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final packageInfo = await PackageInfo.fromPlatform();
      
      Map<String, dynamic> info = {
        'app_version': packageInfo.version,
        'app_build': packageInfo.buildNumber,
        'package_name': packageInfo.packageName,
      };

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        info.addAll({
          'device_id': androidInfo.id,
          'device_model': androidInfo.model,
          'device_brand': androidInfo.brand,
          'os_name': 'android',
          'os_version': androidInfo.version.release,
          'sdk_int': androidInfo.version.sdkInt,
        });
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        info.addAll({
          'device_id': iosInfo.identifierForVendor,
          'device_model': iosInfo.model,
          'device_brand': 'Apple',
          'os_name': 'ios',
          'os_version': iosInfo.systemVersion,
        });
      }

      // Get screen information
      final window = WidgetsBinding.instance.window;
      final size = window.physicalSize / window.devicePixelRatio;
      info.addAll({
        'screen_width': size.width.round(),
        'screen_height': size.height.round(),
        'pixel_ratio': window.devicePixelRatio,
      });

      _deviceInfo = info;
    } catch (error) {
      _logError('Failed to collect device info: $error');
      _deviceInfo = {
        'os_name': Platform.operatingSystem,
        'platform': _platform,
      };
    }
  }

  Future<String> _getOrCreateSessionId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? sessionId = prefs.getString('affiliate_sdk_session_${_config.affiliateCode}');
      
      if (sessionId == null) {
        sessionId = 'sess_${DateTime.now().millisecondsSinceEpoch}_${_generateRandomString(9)}';
        await prefs.setString('affiliate_sdk_session_${_config.affiliateCode}', sessionId);
      }
      
      return sessionId;
    } catch (error) {
      _logError('Failed to get/create session ID: $error');
      return 'sess_${DateTime.now().millisecondsSinceEpoch}_${_generateRandomString(9)}';
    }
  }

  Future<void> _sendEvent(Map<String, dynamic> eventData) async {
    try {
      final uri = Uri.parse(_baseUrl).replace(
        queryParameters: eventData.map((key, value) => MapEntry(key, value.toString())),
      );
      
      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _log('Event sent successfully: ${eventData['event']}');
      } else {
        throw Exception('HTTP ${response.statusCode}: ${response.reasonPhrase}');
      }

    } catch (error) {
      _logError('Failed to send event: $error');
      
      // Queue event for retry
      _eventQueue.add({
        ...eventData,
        'retry_count': 0,
        'queued_at': DateTime.now().millisecondsSinceEpoch,
      });
    }
  }

  Future<void> _processEventQueue() async {
    if (_eventQueue.isEmpty) return;

    final eventsToProcess = List<Map<String, dynamic>>.from(_eventQueue);
    _eventQueue.clear();

    for (final event in eventsToProcess) {
      try {
        final retryCount = event['retry_count'] ?? 0;
        if (retryCount < 3) {
          event.remove('retry_count');
          event.remove('queued_at');
          await _sendEvent(event);
        }
      } catch (error) {
        // Re-queue with incremented retry count
        _eventQueue.add({
          ...event,
          'retry_count': (event['retry_count'] ?? 0) + 1,
        });
      }
    }
  }

  void _setupAppLifecycleListener() {
    SystemChannels.lifecycle.setMessageHandler((message) async {
      switch (message) {
        case 'AppLifecycleState.paused':
          await trackSessionEnd();
          break;
        case 'AppLifecycleState.resumed':
          await _updateSessionIfNeeded();
          break;
      }
      return null;
    });
  }

  Future<void> _updateSessionIfNeeded() async {
    if (_lastEventTime == null) return;
    
    final timeSinceLastEvent = DateTime.now().difference(_lastEventTime!);
    const sessionTimeout = Duration(minutes: 30);

    if (timeSinceLastEvent > sessionTimeout) {
      // Start new session
      _sessionId = await _getOrCreateSessionId();
      _sessionStartTime = DateTime.now();
      
      await trackEvent('app_launch', {
        'session_id': _sessionId,
        'returning_user': true,
      });
    }
  }

  String _generateRandomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return List.generate(length, (index) => chars[(DateTime.now().millisecondsSinceEpoch + index) % chars.length]).join();
  }

  void _log(String message) {
    if (_config.debug) {
      debugPrint('[AffiliateSDK] $message');
    }
  }

  void _logError(String message) {
    if (_config.debug) {
      debugPrint('[AffiliateSDK Error] $message');
    }
  }
}

/// Navigator observer for automatic screen tracking
class _AffiliateNavigatorObserver extends NavigatorObserver {
  final AffiliateSDK _sdk;

  _AffiliateNavigatorObserver(this._sdk);

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _trackScreenView(route);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) {
      _trackScreenView(newRoute);
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (previousRoute != null) {
      _trackScreenView(previousRoute);
    }
  }

  void _trackScreenView(Route<dynamic> route) {
    final routeName = route.settings.name;
    if (routeName != null && routeName.isNotEmpty) {
      _sdk.trackScreenView(routeName);
    }
  }
}

export 'affiliate_sdk.dart';