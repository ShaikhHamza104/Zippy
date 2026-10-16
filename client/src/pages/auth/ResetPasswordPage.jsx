// client/src/pages/auth/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Lock, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Input } from '../../components/ui/index.js';

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9!@#$%^&*]/, 'Must contain at least 1 number or special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      setServerError('Reset token is missing from the URL.');
      return;
    }

    try {
      setServerError('');
      await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      setIsSuccess(true);
      addToast({
        type: 'success',
        title: 'Password updated',
        message: 'Your new password has been set. Please sign in.',
      });
    } catch (err) {
      setServerError(err.message || 'Password reset failed. The link may have expired.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-floating border border-slate-100 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white font-extrabold text-lg shadow-sm">
              <Zap className="w-5 h-5 fill-current" />
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Zippy<span className="text-brand-600">.</span>
            </span>
          </Link>
          <h1 className="text-xl font-black text-slate-900">Set New Password</h1>
          <p className="text-xs text-slate-500">
            Create a secure password with at least 8 characters.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold"
          >
            {serverError}
          </div>
        )}

        {isSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-900">Password Changed!</h3>
            <p className="text-xs text-emerald-800">
              Your password has been successfully updated. All active sessions have been securely
              reset.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/login')}
              className="w-full mt-2"
            >
              Sign In with New Password
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="newPassword"
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={errors.newPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              {...register('newPassword')}
            />

            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full text-sm font-black"
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
