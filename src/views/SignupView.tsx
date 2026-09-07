import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { UserPlus, Loader2, AlertCircle, Sparkles, Check, ChevronRight } from 'lucide-react';
import { ANIME_AVATARS, DEFAULT_AVATAR } from '../data/avatars';
import { AvatarPickerModal } from '../components/AvatarPickerModal';

interface SignupViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

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

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const currentAvatarItem =
    ANIME_AVATARS.find((a) => a.url === selectedAvatar) || ANIME_AVATARS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    // Validations
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
      onShowMessage('Account created successfully with your chosen anime avatar!');
      navigate('/');
    } else {
      setError(result.error || 'Failed to create account.');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:py-14">
      <div className="bg-[#081426] border border-[#1683FF]/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1683FF]/20 border border-[#1683FF]/40 flex items-center justify-center text-[#00CFFF] mx-auto mb-3 shadow-lg shadow-[#1683FF]/20">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Create Account</h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Join ZYNOX ANIME & choose your favorite character profile avatar
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Anime Avatar Picker Section */}
        <div className="mb-6 bg-[#050A14]/90 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Avatar
            </span>
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>Choose Avatar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Selected Character Highlight */}
          <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white/5 border border-white/5 mb-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#1683FF] shrink-0 p-0.5 shadow-lg shadow-[#1683FF]/30">
              <img
                src={selectedAvatar}
                alt="Selected Avatar"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1683FF] text-white flex items-center justify-center border border-[#081426]">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white">
                Profile Avatar
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">
                Click change to pick or upload any image
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#1683FF]/20 hover:bg-[#1683FF] text-[#00CFFF] hover:text-white border border-[#1683FF]/40 text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Quick Select Character Avatars Strip */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {ANIME_AVATARS.slice(0, 10).map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 transition-all p-0.5 cursor-pointer ${
                      isSelected
                        ? 'border-[#1683FF] scale-110 shadow-md shadow-[#1683FF]/50 ring-2 ring-[#00CFFF]/40'
                        : 'border-white/10 hover:border-white/40 hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
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
              className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-white placeholder-[#64748B] text-xs transition-colors outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
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
              className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-white placeholder-[#64748B] text-xs transition-colors outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Password (min. 6)
              </label>
              <input
                id="input-signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                autoComplete="new-password"
                className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-white placeholder-[#64748B] text-xs transition-colors outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                id="input-signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                autoComplete="new-password"
                className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-white placeholder-[#64748B] text-xs transition-colors outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            id="btn-signup-submit"
            type="submit"
            disabled={submitting}
            className="w-full mt-3 py-3 px-4 bg-[#1683FF] hover:bg-[#0070E0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1683FF]/30 text-xs hover:scale-[1.01] active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account & Setting Avatar...</span>
              </>
            ) : (
              <span>Create Account & Join</span>
            )}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-white/5 text-center text-xs text-[#94A3B8]">
          Already have an account?{' '}
          <button
            id="link-go-login"
            type="button"
            onClick={() => navigate('/login')}
            className="text-[#00CFFF] hover:underline font-bold"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Full Crunchyroll Avatar Selector Modal */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={selectedAvatar}
        onSelectAvatar={(newUrl) => setSelectedAvatar(newUrl)}
      />
    </div>
  );
};
