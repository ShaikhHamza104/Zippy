// client/src/pages/auth/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Lock, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Input } from '../../components/ui/index.js';

const resetSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
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
  const urlToken = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: urlToken,
      newPassword: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (urlToken) {
      setValue('token', urlToken);
    }
  }, [urlToken, setValue]);

  const onSubmit = async (data) => {
    try {
      setServerError('');
      await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: data.token.trim(),
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
      setServerError(err.message || 'Password reset failed. The link or token may have expired.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-floating border border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white font-extrabold text-lg shadow-sm">
              <Zap className="w-5 h-5 fill-current" />
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Zippy<span className="text-brand-600">.</span>
            </span>
          </Link>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Set New Password
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create a secure password with at least 8 characters and a number or symbol.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold"
          >
            {serverError}
          </div>
        )}

        {isSuccess ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
              Password Changed!
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
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
            {!urlToken && (
              <Input
                id="token"
                label="Reset Token"
                type="text"
                placeholder="Paste your reset token here"
                error={errors.token?.message}
                leftIcon={<KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                {...register('token')}
              />
            )}

            <Input
              id="newPassword"
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={errors.newPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
              {...register('newPassword')}
            />

            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
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

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
