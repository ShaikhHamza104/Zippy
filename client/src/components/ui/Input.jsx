// client/src/components/ui/Input.jsx
import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const Input = React.forwardRef(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      type = 'text',
      id: customId,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[44px]',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400',
              'disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon || error ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-red-500 dark:border-red-500 focus:ring-red-400 focus:border-red-500 text-red-900 dark:text-red-200'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
              className
            )}
            {...props}
          />
          {error ? (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-red-500">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
            </div>
          ) : rightIcon ? (
            <div className="absolute right-3.5 flex items-center text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
