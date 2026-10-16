// client/src/components/ui/Skeleton.jsx
import React from 'react';
import { cn } from '../../utils/cn.js';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-slate-200/80', className)}
      {...props}
    />
  );
};

export default Skeleton;
