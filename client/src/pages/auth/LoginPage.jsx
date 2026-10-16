// client/src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react';
import { apiFetch, mergeGuestCart } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Input } from '../../components/ui/index.js';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const [serverError, setServerError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const { user, accessToken } = res.data;
      setAuth({ user, accessToken });

      // Automatically merge guest cart into customer account
      await mergeGuestCart();

      addToast({
        type: 'success',
        title: `Welcome back, ${user.name}!`,
        message: 'Successfully logged in to your Zippy account.',
      });

      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-floating border border-slate-100 p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
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
          <h1 className="text-xl font-black text-slate-900">Welcome Back</h1>
          <p className="text-xs text-slate-500">
            Sign in to access your saved delivery addresses and quick reorders.
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            error={errors.email?.message}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            {...register('email')}
          />

          <div className="space-y-1">
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              {...register('password')}
            />
            <div className="text-right pt-0.5">
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-brand-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full text-sm font-black"
          >
            <span>Sign In to Zippy</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link
              to="/register"
              state={{ from: location.state?.from }}
              className="font-bold text-brand-700 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
