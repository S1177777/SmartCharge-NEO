import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.hash = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface-dark border border-border-dark rounded-2xl p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="text-rose-500" size={32} />
            </div>

            {/* Title */}
            <h1 className="text-white text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-text-secondary text-sm mb-6">
              An unexpected error occurred. Please try again or return to the home page.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-bg-dark rounded-lg border border-border-dark text-left overflow-auto max-h-40">
                <p className="text-rose-400 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-text-secondary text-[10px] mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-surface-lighter hover:bg-border-dark text-white text-sm font-medium border border-border-dark transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold transition-colors"
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
