import React, { useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { getCachedSiteSettings } from '../lib/firestore/site-settings';
import { getFriendlyAuthErrorMessage } from '../lib/auth-errors';
import { usePageSeo } from '../hooks/usePageSeo';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface LoginViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

const DEFAULT_LOGO = '/icon-192.png';

export const LoginView: React.FC<LoginViewProps> = ({ navigate, onShowMessage }) => {
  const { user, signIn, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const siteConfig = getCachedSiteSettings();
  const siteName = siteConfig.siteName || 'ZYNOX ANIME';
  const logoSrc = siteConfig.logoUrl || DEFAULT_LOGO;

  usePageSeo({
    title: mode === 'forgot' ? `Reset Password | ${siteName}` : `Sign In | ${siteName}`,
    description: `Sign in to your ${siteName} account to sync watchlists and watch history.`,
  });

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmedEmail, password);
    setSubmitting(false);

    if (result.success) {
      onShowMessage('Welcome back!');
      navigate('/');
    } else {
      setError(result.error || 'Failed to sign in.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your account email address.');
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetSent(true);
      onShowMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err?.code || err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
      <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src={logoSrc}
              alt={siteName}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== DEFAULT_LOGO) target.src = DEFAULT_LOGO;
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {mode === 'forgot' ? 'Reset Password' : 'Sign In'}
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            {mode === 'forgot'
              ? 'Enter your email and we will send you a password reset link.'
              : `Access your ${siteName} account`}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resetSent && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              A password reset link has been sent to <strong>{email}</strong>. Check your inbox and spam folder.
            </span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="input-login-email"
                className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="input-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={submitting}
                autoComplete="email"
                className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-login-password"
                  className="block text-xs font-semibold text-[#CBD5E1]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setResetSent(false);
                  }}
                  className="text-xs font-semibold text-[#1E88FF] hover:text-[#3B9BFF] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="input-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={submitting}
                autoComplete="current-password"
                className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
              />
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#1E88FF] hover:bg-[#3B9BFF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="input-reset-email"
                className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
              >
                Account Email
              </label>
              <input
                id="input-reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={submitting}
                autoComplete="email"
                className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#1E88FF] hover:bg-[#3B9BFF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setResetSent(false);
              }}
              className="w-full h-10 bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        <div className="pt-5 border-t border-white/10 text-center space-y-2.5 text-xs">
          <p className="text-[#94A3B8]">
            Don&apos;t have an account?{' '}
            <button
              id="link-go-signup"
              type="button"
              onClick={() => navigate('/signup')}
              className="text-[#1E88FF] hover:text-[#3B9BFF] font-semibold cursor-pointer"
            >
              Create Account
            </button>
          </p>

          <div>
            <button
              id="link-guest-browse"
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-[#64748B] hover:text-white transition-colors underline cursor-pointer"
            >
              Continue browsing as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
