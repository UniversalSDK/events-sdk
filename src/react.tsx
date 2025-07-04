import React, { useEffect, useRef } from 'react';
import { AffiliateSDK, AffiliateSDKConfig } from './index';

/**
 * React hook for AffiliateSDK
 */
export function useAffiliateSDK(config: AffiliateSDKConfig) {
  const sdkRef = useRef<AffiliateSDK | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      sdkRef.current = new AffiliateSDK(config);
      sdkRef.current.initialize();
      isInitializedRef.current = true;
    }

    return () => {
      // Cleanup if needed
      if (sdkRef.current) {
        sdkRef.current.trackSessionEnd();
      }
    };
  }, []);

  return sdkRef.current;
}

/**
 * React hook for tracking page views with React Router
 */
export function usePageTracking(sdk: AffiliateSDK | null) {
  const currentPath = useRef<string>('');

  useEffect(() => {
    if (!sdk) return;

    const trackPageView = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath.current) {
        currentPath.current = newPath;
        sdk.trackPageView(newPath);
      }
    };

    // Track initial page view
    trackPageView();

    // Listen for route changes (for SPAs)
    const handlePopState = () => {
      setTimeout(trackPageView, 0); // Delay to ensure DOM is updated
    };

    window.addEventListener('popstate', handlePopState);

    // For React Router (pushState/replaceState)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(trackPageView, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(trackPageView, 0);
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [sdk]);
}

/**
 * Higher-order component for automatic event tracking
 */
export function withTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  eventName: string,
  getEventData?: (props: P) => Record<string, any>
) {
  return function TrackedComponent(props: P) {
    const sdk = useAffiliateSDK(props as any); // You'll need to pass config

    useEffect(() => {
      if (sdk) {
        const eventData = getEventData ? getEventData(props) : {};
        sdk.trackEvent(eventName, eventData);
      }
    }, [sdk, props]);

    return <WrappedComponent {...props} />;
  };
}

/**
 * Component for tracking specific events
 */
interface TrackingProps {
  sdk: AffiliateSDK | null;
  eventName: string;
  eventData?: Record<string, any>;
  children: React.ReactNode;
  trigger?: 'mount' | 'click' | 'hover';
}

export function TrackingWrapper({ 
  sdk, 
  eventName, 
  eventData = {}, 
  children, 
  trigger = 'mount' 
}: TrackingProps) {
  const trackEvent = () => {
    if (sdk) {
      sdk.trackEvent(eventName, eventData);
    }
  };

  useEffect(() => {
    if (trigger === 'mount') {
      trackEvent();
    }
  }, [sdk, eventName, trigger]);

  const handleClick = () => {
    if (trigger === 'click') {
      trackEvent();
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      trackEvent();
    }
  };

  return (
    <div onClick={handleClick} onMouseEnter={handleMouseEnter}>
      {children}
    </div>
  );
}