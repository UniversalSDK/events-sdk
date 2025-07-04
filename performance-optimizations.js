/**
 * Performance Optimizations for Web SDK
 * Additional optimizations that can be applied to improve SDK performance
 */

// Debounce utility for high-frequency events
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility for scroll events
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for element visibility tracking
class VisibilityTracker {
  constructor(sdk) {
    this.sdk = sdk;
    this.observer = null;
    this.visibleElements = new Set();
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          threshold: [0.1, 0.5, 0.9],
          rootMargin: '0px'
        }
      );
    }
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      const element = entry.target;
      const elementId = element.id || element.dataset.trackingId;
      
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!this.visibleElements.has(elementId)) {
          this.visibleElements.add(elementId);
          this.sdk.trackEvent('element_visible', {
            element_id: elementId,
            element_type: element.tagName.toLowerCase(),
            visibility_ratio: entry.intersectionRatio
          });
        }
      } else {
        this.visibleElements.delete(elementId);
      }
    });
  }

  observe(element) {
    if (this.observer && element) {
      this.observer.observe(element);
    }
  }

  unobserve(element) {
    if (this.observer && element) {
      this.observer.unobserve(element);
    }
  }
}

// Optimized Event Batching
class EventBatcher {
  constructor(sdk, batchSize = 10, flushInterval = 5000) {
    this.sdk = sdk;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.batch = [];
    this.timer = null;
    this.setupAutoFlush();
  }

  add(eventData) {
    this.batch.push({
      ...eventData,
      batched_at: Date.now()
    });

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  flush() {
    if (this.batch.length === 0) return;

    const events = [...this.batch];
    this.batch = [];

    // Send batched events
    this.sendBatch(events);
  }

  setupAutoFlush() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }

  async sendBatch(events) {
    try {
      const batchData = {
        affiliate_code: this.sdk.config.affiliateCode,
        app_code: this.sdk.config.appCode,
        batch: true,
        events: events,
        batch_size: events.length,
        timestamp: Date.now()
      };

      // Use sendBeacon for reliability if available
      if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(batchData));
        navigator.sendBeacon(this.sdk.config.baseUrl, formData);
      } else {
        // Fallback to fetch
        await fetch(this.sdk.config.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchData)
        });
      }

      this.sdk.log('Batch sent successfully:', events.length, 'events');
    } catch (error) {
      this.sdk.logError('Failed to send batch:', error);
      // Re-queue failed events
      this.batch.unshift(...events);
    }
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

// Performance Monitoring
class PerformanceMonitor {
  constructor(sdk) {
    this.sdk = sdk;
    this.metrics = {};
    this.init();
  }

  init() {
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor SDK performance
    this.monitorSDKPerformance();
    
    // Monitor network conditions
    this.monitorNetworkConditions();
  }

  monitorCoreWebVitals() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('fid', entry.processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    }
  }

  monitorSDKPerformance() {
    // Track SDK initialization time
    const initStart = performance.now();
    this.sdk.initialize().then(() => {
      const initTime = performance.now() - initStart;
      this.recordMetric('sdk_init_time', initTime);
    });

    // Track event processing time
    const originalTrackEvent = this.sdk.trackEvent.bind(this.sdk);
    this.sdk.trackEvent = async (...args) => {
      const start = performance.now();
      await originalTrackEvent(...args);
      const duration = performance.now() - start;
      this.recordMetric('event_processing_time', duration);
    };
  }

  monitorNetworkConditions() {
    // Monitor connection type
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.recordMetric('connection_type', connection.effectiveType);
      this.recordMetric('downlink', connection.downlink);
      this.recordMetric('rtt', connection.rtt);

      connection.addEventListener('change', () => {
        this.recordMetric('connection_change', {
          type: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      });
    }
  }

  recordMetric(name, value) {
    this.metrics[name] = {
      value,
      timestamp: Date.now()
    };

    // Send performance data periodically
    if (Object.keys(this.metrics).length >= 10) {
      this.sendPerformanceData();
    }
  }

  async sendPerformanceData() {
    try {
      await this.sdk.trackEvent('performance_metrics', {
        metrics: this.metrics,
        user_agent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        device_memory: navigator.deviceMemory || null,
        hardware_concurrency: navigator.hardwareConcurrency || null
      });

      this.metrics = {}; // Clear after sending
    } catch (error) {
      this.sdk.logError('Failed to send performance data:', error);
    }
  }
}

// Enhanced Error Handling
class ErrorHandler {
  constructor(sdk) {
    this.sdk = sdk;
    this.errorCount = 0;
    this.maxErrors = 50; // Prevent error spam
    this.init();
  }

  init() {
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandled_promise_rejection',
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });

    // Capture fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.handleError({
            type: 'fetch_error',
            url: args[0],
            status: response.status,
            statusText: response.statusText
          });
        }
        return response;
      } catch (error) {
        this.handleError({
          type: 'fetch_network_error',
          url: args[0],
          message: error.message
        });
        throw error;
      }
    };
  }

  handleError(errorData) {
    if (this.errorCount >= this.maxErrors) {
      return; // Prevent error spam
    }

    this.errorCount++;
    
    // Add context information
    const enhancedError = {
      ...errorData,
      timestamp: Date.now(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      sdk_version: this.sdk.version || '1.0.0',
      session_id: this.sdk.sessionId
    };

    // Track error
    this.sdk.trackEvent('sdk_error', enhancedError);
  }
}

// Memory Management
class MemoryManager {
  constructor() {
    this.eventListeners = new Map();
    this.timers = new Set();
    this.observers = new Set();
  }

  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element).push({ event, handler, options });
  }

  addTimer(timerId) {
    this.timers.add(timerId);
  }

  addObserver(observer) {
    this.observers.add(observer);
  }

  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
    });
    this.eventListeners.clear();

    // Clear timers
    this.timers.forEach(timerId => {
      clearInterval(timerId);
      clearTimeout(timerId);
    });
    this.timers.clear();

    // Disconnect observers
    this.observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers.clear();
  }
}

// Export optimizations
export {
  debounce,
  throttle,
  VisibilityTracker,
  EventBatcher,
  PerformanceMonitor,
  ErrorHandler,
  MemoryManager
};