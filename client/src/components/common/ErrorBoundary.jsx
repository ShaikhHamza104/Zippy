// client/src/components/common/ErrorBoundary.jsx
import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { clientErrorTracker } from '../../services/errorTracker.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Send unhandled render error to error tracking adapter
    clientErrorTracker.captureException(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-floating border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertOctagon className="w-8 h-8" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              An unexpected application error occurred. We have logged this issue and are working on
              a fix.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
