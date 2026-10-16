// client/src/pages/auth/RegisterPage.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { apiFetch, mergeGuestCart } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Input } from '../../components/ui/index.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9!@#$%^&*]/, 'Password must contain at least 1 number or special character'),
});

export const RegisterPage = () => {
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
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
      };
      if (data.phone) payload.phone = data.phone;

      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const { user, accessToken } = res.data;
      setAuth({ user, accessToken });

      // Automatically merge guest cart
      await mergeGuestCart();

      addToast({
        type: 'success',
        title: `Welcome to Zippy, ${user.name}!`,
        message: 'Your account has been created. A verification email has been sent.',
      });

      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Email may already be in use.');
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
          <h1 className="text-xl font-black text-slate-900">Create New Account</h1>
          <p className="text-xs text-slate-500">
            Sign up in seconds to enjoy 10-minute grocery deliveries.
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
            id="name"
            label="Full Name"
            placeholder="John Doe"
            error={errors.name?.message}
            leftIcon={<User className="w-4 h-4 text-slate-400" />}
            {...register('name')}
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            error={errors.email?.message}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            {...register('email')}
          />

          <Input
            id="phone"
            label="Mobile Number (Optional)"
            type="tel"
            placeholder="9876543210"
            helperText="Used for order status and live delivery driver coordination."
            error={errors.phone?.message}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
            {...register('phone')}
          />

          <Input
            id="password"
            label="Create Password"
            type="password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            {...register('password')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full text-sm font-black"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Already have a Zippy account?{' '}
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="font-bold text-brand-700 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
