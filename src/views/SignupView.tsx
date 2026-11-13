import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { AlertCircle, Check, ChevronRight, Loader2 } from 'lucide-react';
import { ANIME_AVATARS, DEFAULT_AVATAR } from '../data/avatars';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { getSiteSettings, getCachedSiteSettings } from '../lib/firestore/site-settings';
import { usePageSeo } from '../hooks/usePageSeo';

interface SignupViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

const DEFAULT_LOGO = '/icon-192.png';

export const SignupView: React.FC<SignupViewProps> = ({ navigate, onShowMessage }) => {
  const { user, signUp, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(DEFAULT_AVATAR);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>(true);

  const siteConfig = getCachedSiteSettings();
  const siteName = siteConfig.siteName || 'ZYNOX ANIME';
  const logoSrc = siteConfig.logoUrl || DEFAULT_LOGO;

  usePageSeo({
    title: `Create Account | ${siteName}`,
    description: `Create a free ${siteName} account to save watchlists and sync watch history.`,
  });

  useEffect(() => {
    getSiteSettings().then((cfg) => {
      if (cfg.enableRegistration === false) {
        setRegistrationEnabled(false);
      }
    });
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Display name is required.');
      return;
    }
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password is too short. Minimum 6 characters required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await signUp(trimmedName, trimmedEmail, password, selectedAvatar);
    setSubmitting(false);

    if (result.success) {
      onShowMessage('Account created successfully!');
      navigate('/');
    } else {
      setError(result.error || 'Failed to create account.');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
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
          <h1 className="text-2xl font-black text-white tracking-tight">Create Account</h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Join {siteName} and pick your favorite anime avatar.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!registrationEnabled ? (
          <div className="bg-[#101A30] border border-white/10 rounded-2xl p-6 text-center space-y-3">
            <h2 className="text-base font-bold text-white">Registration Paused</h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              New user registration is currently paused by the administrator. If you already have an account, please sign in.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="h-10 px-6 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Sign In Instead
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Avatar Picker */}
            <div className="bg-[#101A30] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Avatar
                </span>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="text-xs font-semibold text-[#1E88FF] hover:text-[#3B9BFF] flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Browse All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#050A14] border border-white/5">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#1E88FF] shrink-0">
                  <img
                    src={selectedAvatar}
                    alt="Selected Avatar"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#1E88FF] text-white flex items-center justify-center border border-[#050A14]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Profile Avatar</div>
                  <div className="text-[11px] text-[#94A3B8] truncate">
                    Select from character presets
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {ANIME_AVATARS.slice(0, 10).map((avatar) => {
                  const isSelected = selectedAvatar === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.url)}
                      className={`relative w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1E88FF] scale-105'
                          : 'border-white/10 hover:border-white/40 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="input-signup-name"
                  className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id="input-signup-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. AnimeOtaku99"
                  disabled={submitting}
                  autoComplete="name"
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="input-signup-email"
                  className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="input-signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={submitting}
                  autoComplete="email"
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="input-signup-password"
                    className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
                  >
                    Password (min. 6)
                  </label>
                  <input
                    id="input-signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={submitting}
                    autoComplete="new-password"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-signup-confirm-password"
                    className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="input-signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    disabled={submitting}
                    autoComplete="new-password"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-4 text-white placeholder-[#64748B] text-xs sm:text-sm transition-colors outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                id="btn-signup-submit"
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-[#1E88FF] hover:bg-[#3B9BFF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="pt-5 border-t border-white/10 text-center text-xs text-[#94A3B8]">
          Already have an account?{' '}
          <button
            id="link-go-login"
            type="button"
            onClick={() => navigate('/login')}
            className="text-[#1E88FF] hover:text-[#3B9BFF] font-semibold cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>

      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={selectedAvatar}
        onSelectAvatar={(newUrl) => setSelectedAvatar(newUrl)}
      />
    </div>
  );
};
