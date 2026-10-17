// client/src/components/ui/EmptyState.jsx
import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Button } from './Button.jsx';

export const EmptyState = ({
  icon: IconProp,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  const renderIcon = () => {
    if (!IconProp) {
      return <PackageOpen className="w-8 h-8" aria-hidden="true" />;
    }
    if (React.isValidElement(IconProp)) {
      return IconProp;
    }
    if (typeof IconProp === 'function' || (typeof IconProp === 'object' && IconProp !== null)) {
      const Component = IconProp;
      return <Component className="w-8 h-8" aria-hidden="true" />;
    }
    return IconProp;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-6',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-100 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-subtle">
        {renderIcon()}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
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
