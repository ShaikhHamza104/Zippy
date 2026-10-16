// client/src/components/ui/Badge.jsx
import React from 'react';
import { cn } from '../../utils/cn.js';

const variantClasses = {
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  accent: 'bg-accent-50 text-amber-900 border-accent-300 font-semibold',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  outline: 'bg-transparent text-slate-600 border-slate-300',
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
