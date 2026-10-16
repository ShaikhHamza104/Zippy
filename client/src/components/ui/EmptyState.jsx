// client/src/components/ui/EmptyState.jsx
import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Button } from './Button.jsx';

export const EmptyState = ({ icon, title, description, actionLabel, onAction, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-6',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4 shadow-subtle">
        {icon || <PackageOpen className="w-8 h-8" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
