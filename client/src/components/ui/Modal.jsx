// client/src/components/ui/Modal.jsx
import React, { useEffect, useRef } from 'react';
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

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-floating border border-transparent dark:border-slate-800 overflow-hidden z-10',
          'transform transition-all duration-200 ease-out',
          maxWidth,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            {title && (
              <h2 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description"
                className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
