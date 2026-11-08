import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithDemoUser,
    authError,
    setAuthError,
    loading,
    isDemoMode,
  } = useAuth();
  const { showToast } = useVideo();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const isSignup = authModalMode === 'signup';

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const success = await signInWithGoogle();
    setIsSubmitting(false);
    if (success) {
      showToast('Welcome to MyTube! Signed in with Google 🎉');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password.trim()) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    if (isSignup) {
      if (!name.trim()) {
        setAuthError('Please enter your channel name or full name.');
        setIsSubmitting(false);
        return;
      }
      const success = await signUpWithEmail(name, email, password);
      setIsSubmitting(false);
      if (success) {
        showToast(`Account created! Welcome @${name.toLowerCase().replace(/[^a-z0-9]/g, '')} 🚀`);
      }
    } else {
      const success = await signInWithEmail(email, password);
      setIsSubmitting(false);
      if (success) {
        showToast('Signed in successfully! 👋');
      }
    }
  };

  const handleDemoLogin = async (preset: 'koushik' | 'sarah') => {
    setIsSubmitting(true);
    await signInWithDemoUser(preset);
    setIsSubmitting(false);
    showToast(`Logged in as ${preset === 'koushik' ? 'Koushik (@koushik_tube)' : 'Sarah (@sarah_creates)'}! ✨`);
  };

  // Preview handle derived from name
  const handlePreview = name.trim()
    ? `@${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user'}`
    : '@yourhandle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#212121] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-xs">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">
              MyTube
            </span>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-2">
          {/* Title & subtitle */}
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {isSignup ? 'Create your MyTube account' : 'Sign in to MyTube'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-5">
            {isSignup
              ? 'Join the community, create your channel handle, and save playlists.'
              : 'Sign in to like videos, leave comments, and manage your subscriptions.'}
          </p>

          {/* Error Message Alert */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{authError}</div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#181818] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#212121] px-2 text-neutral-400">
                or with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name & Handle Preview (Sign Up only) */}
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Channel Name / Display Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161616] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <AtSign className="w-3 h-3 text-red-500" />
                  <span>Channel handle preview:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {handlePreview}
                  </span>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161616] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161616] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignup ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{isSignup ? 'Sign Up' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-4 text-center">
            {isSignup ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </p>
            )}
          </div>

          {/* Quick Demo Logins for Testing */}
          <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick 1-Click Test Accounts:
              </span>
              {isDemoMode && (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                  Local Mode Active
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('koushik')}
                disabled={isSubmitting}
                className="flex items-center gap-2 p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  K
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    Koushik
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">@koushik_tube</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('sarah')}
                disabled={isSubmitting}
                className="flex items-center gap-2 p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-left transition-colors cursor-pointer"
              >
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    Sarah Connor
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">@sarah_creates</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
