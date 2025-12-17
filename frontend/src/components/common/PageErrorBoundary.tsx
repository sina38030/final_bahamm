"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { safeSessionStorage } from '@/utils/safeStorage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component for catching and handling errors gracefully,
 * especially important for Android Telegram Mini App where errors may
 * cause the "failed to load" message.
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PageErrorBoundary] Caught error:', error);
    console.error('[PageErrorBoundary] Error info:', errorInfo);

    // Log additional debug info for Android Telegram
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        console.error('[PageErrorBoundary] Telegram platform:', tg.platform);
        console.error('[PageErrorBoundary] Telegram version:', tg.version);
      }
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      // Force recovery navigation. Plain reload may keep serving cached stale HTML in Telegram Android WebView.
      try {
        const countKey = 'chunk-error-reload-count';
        const currentCount = Number(safeSessionStorage.getItem(countKey) || '0');
        if (currentCount < 2) {
          safeSessionStorage.setItem(countKey, String(currentCount + 1));
        }

        let nextHref = window.location.href;
        try {
          const u = new URL(window.location.href);
          u.searchParams.set('__r', String(Date.now()));
          nextHref = u.toString();
        } catch {
          const sep = nextHref.includes('?') ? '&' : '?';
          nextHref = `${nextHref}${sep}__r=${Date.now()}`;
        }
        window.location.replace(nextHref);
      } catch (e) {
        // Fallback for restricted environments
        try {
          window.location.href = window.location.href;
        } catch {}
      }
    }
  };

  handleGoHome = () => {
    try {
      window.location.href = '/';
    } catch (e) {
      // Ignore
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'خطایی رخ داد' } = this.props;

      return (
        <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-lg font-bold mb-2">{fallbackTitle}</h1>
            <p className="text-gray-600 text-sm mb-6">متأسفانه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                تلاش مجدد
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                بازگشت به صفحه اصلی
              </button>
            </div>

            {/* Debug info - only show in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left text-xs text-gray-500">
                <summary className="cursor-pointer">جزئیات خطا</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a page component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackTitle?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <PageErrorBoundary fallbackTitle={fallbackTitle}>
        <WrappedComponent {...props} />
      </PageErrorBoundary>
    );
  };
}

export default PageErrorBoundary;

