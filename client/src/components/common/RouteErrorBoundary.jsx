// client/src/components/common/RouteErrorBoundary.jsx
import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { clientErrorTracker } from '../../services/errorTracker.js';

export const RouteErrorBoundary = () => {
  const error = useRouteError();

  React.useEffect(() => {
    if (error) {
      clientErrorTracker.captureException(
        error instanceof Error ? error : new Error(String(error?.statusText || error))
      );
    }
  }, [error]);

  let title = 'Something went wrong';
  let message = 'An unexpected application error occurred. Please try reloading the page.';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page Not Found';
      message = "The page you're looking for doesn't exist or has moved.";
    } else {
      title = `${error.status} ${error.statusText || 'Error'}`;
      message = error.data?.message || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-floating border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed break-words">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reload Page
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = '/';
            }}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
