// client/src/components/ui/Badge.jsx
import React from 'react';
import { cn } from '../../utils/cn.js';

const variantClasses = {
  brand:
    'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800',
  accent:
    'bg-accent-50 text-amber-900 border-accent-300 font-semibold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  warning:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  danger:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  neutral:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  outline:
    'bg-transparent text-slate-600 border-slate-300 dark:text-slate-300 dark:border-slate-700',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px] font-medium',
  md: 'px-2.5 py-1 text-xs font-semibold',
};

export const Badge = ({ className, variant = 'brand', size = 'md', icon, children, ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border leading-none tracking-wide select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
