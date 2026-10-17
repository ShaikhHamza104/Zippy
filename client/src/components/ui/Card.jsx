// client/src/components/ui/Card.jsx
import React from 'react';
import { cn } from '../../utils/cn.js';

export const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-subtle overflow-hidden transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children, ...props }) => {
  return (
    <div className={cn('p-5 pb-3', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className, children, ...props }) => {
  return (
    <h3
      className={cn(
        'text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription = ({ className, children, ...props }) => {
  return (
    <p className={cn('text-xs text-slate-500 dark:text-slate-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ className, children, ...props }) => {
  return (
    <div className={cn('p-5 pt-0', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'p-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
