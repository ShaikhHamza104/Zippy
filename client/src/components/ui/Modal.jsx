// client/src/components/ui/Modal.jsx
import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
  className,
}) => {
  const modalRef = useRef(null);
  const pushedRef = useRef(false);

  // Safe close handler that coordinates with browser history
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle Escape key and mobile phone back-button (popstate)
  useEffect(() => {
    if (!isOpen) return;

    pushedRef.current = false;
    // Push history entry on open so mobile back button closes modal rather than leaving page
    if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState({ zippyModal: true }, '');
      pushedRef.current = true;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePopState = () => {
      // Browser already navigated back in history
      pushedRef.current = false;
      onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);

      // If modal was dismissed via close button or backdrop rather than phone back button,
      // pop the pushed entry to keep browser history cleanly synchronized
      if (pushedRef.current && typeof window !== 'undefined' && window.history?.state?.zippyModal) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-floating border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-auto',
          'transform transition-all duration-200 ease-out',
          maxWidth,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h2
                id="modal-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description"
                className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
