// client/src/components/ui/Button.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const variantClasses = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm focus-visible:ring-brand-500 dark:focus-visible:ring-offset-slate-950',
  secondary:
    'bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900 active:bg-brand-300 focus-visible:ring-brand-400',
  accent:
    'bg-accent-500 text-slate-900 font-semibold hover:bg-accent-400 active:bg-accent-600 shadow-sm focus-visible:ring-accent-400',
  outline:
    'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 focus-visible:ring-brand-500',
  ghost:
    'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 focus-visible:ring-brand-500',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm focus-visible:ring-red-500',
};

const sizeClasses = {
  sm: 'h-9 px-3 text-xs rounded-md',
  md: 'h-11 px-4 text-sm rounded-lg min-h-[44px]', // 44px touch target
  lg: 'h-13 px-6 text-base rounded-xl min-h-[48px]',
};

export const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isButtonDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isButtonDisabled}
        aria-busy={isLoading}
        aria-disabled={isButtonDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden="true" />}
        {!isLoading && leftIcon && (
          <span className="mr-2 shrink-0 inline-flex items-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="ml-2 shrink-0 inline-flex items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
