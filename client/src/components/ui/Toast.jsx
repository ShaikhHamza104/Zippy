// client/src/components/ui/Toast.jsx
import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { useUIStore } from '../../stores/uiStore.js';

const toastIcons = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden="true" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />,
  info: <Info className="w-5 h-5 text-sky-500 shrink-0" aria-hidden="true" />,
};

const toastBorderClasses = {
  success: 'border-l-4 border-l-emerald-500',
  error: 'border-l-4 border-l-red-500',
  warning: 'border-l-4 border-l-amber-500',
  info: 'border-l-4 border-l-sky-500',
};

export const ToastItem = ({ toast, onDismiss }) => {
  return (
    <div
      role="alert"
      className={cn(
        'w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-floating border border-slate-200/90 dark:border-slate-800 p-4',
        'flex items-start gap-3 pointer-events-auto transition-all transform',
        toastBorderClasses[toast.type || 'info']
      )}
    >
      {toastIcons[toast.type || 'info']}
      <div className="flex-1 text-left min-w-0">
        {toast.title && (
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-0.5 truncate">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[60] flex flex-col gap-2.5 max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
