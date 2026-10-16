// client/src/pages/auth/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { Button, Input } from '../../components/ui/index.js';

const forgotSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const ForgotPasswordPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      await apiFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setIsSubmitted(true);
    } catch (err) {
      setServerError(err.message || 'Unable to process password reset request.');
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
          <h1 className="text-xl font-black text-slate-900">Reset Your Password</h1>
          <p className="text-xs text-slate-500">
            Enter the email associated with your account and we&apos;ll send you a password reset
            link.
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

        {isSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">Check Your Email</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              If an account with that email exists, we have sent instructions to reset your
              password.
            </p>
            <Link to="/login" className="inline-block pt-2">
              <Button variant="outline" size="sm">
                Return to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              label="Account Email"
              type="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              {...register('email')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full text-sm font-black"
            >
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
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

export default ForgotPasswordPage;
