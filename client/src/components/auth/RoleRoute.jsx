// client/src/components/auth/RoleRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { Skeleton } from '../ui/Skeleton.jsx';

export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <Skeleton className="w-48 h-5 rounded" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin bypasses all role constraints
  const hasAccess = user.role === 'SUPER_ADMIN' || allowedRoles.includes(user.role);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleRoute;
