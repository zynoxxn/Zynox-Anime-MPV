import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ navigate, onShowMessage }) => {
  const { user, signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      onShowMessage('Welcome back.');
      navigate('/');
    } else {
      setError(result.error || 'Failed to sign in.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-[#0A1628] border border-[#00A8FF]/25 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0066FF]/20 border border-[#00A8FF]/40 flex items-center justify-center text-[#00D9FF] mx-auto mb-3 shadow-lg shadow-[#00A8FF]/20">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F5F9FF] tracking-tight">Sign In</h1>
          <p className="text-xs text-[#A9B8CC] mt-1">
            Access your ZYNOX ANIME account
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#A9B8CC] uppercase tracking-wider mb-1.5">
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
              className="w-full bg-[#0D1B2E] border border-white/10 focus:border-[#00A8FF] rounded-xl px-4 py-2.5 text-[#F5F9FF] placeholder-[#6E7F95] text-xs transition-colors outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A9B8CC] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              id="input-login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              autoComplete="current-password"
              className="w-full bg-[#0D1B2E] border border-white/10 focus:border-[#00A8FF] rounded-xl px-4 py-2.5 text-[#F5F9FF] placeholder-[#6E7F95] text-xs transition-colors outline-none disabled:opacity-50"
            />
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/30 text-xs"
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

        <div className="mt-6 pt-6 border-t border-white/5 text-center space-y-3 text-xs">
          <p className="text-[#A9B8CC]">
            Don&apos;t have an account?{' '}
            <button
              id="link-go-signup"
              type="button"
              onClick={() => navigate('/signup')}
              className="text-[#00D9FF] hover:underline font-bold"
            >
              Create Account
            </button>
          </p>

          <div>
            <button
              id="link-guest-browse"
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-[#6E7F95] hover:text-white transition-colors underline"
            >
              Continue browsing as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
