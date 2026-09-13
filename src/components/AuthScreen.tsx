import React, { useState } from 'react';
import { Instagram, Lock, Mail, User as UserIcon, Sparkles, ArrowRight, ShieldCheck, LogIn } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInGuest } from '../lib/firebase';

interface AuthScreenProps {
  isDarkMode: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ isDarkMode }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      let msg = err?.message || 'Failed to sign in with Google.';
      if (msg.includes('auth/unauthorized-domain')) {
        msg = 'Deployment Domain Error: This app URL is not authorized. You MUST add this URL to "Authorized Domains" in your Firebase Console (Authentication -> Settings -> Authorized Domains).';
      } else if (msg.includes('auth/popup-closed-by-user')) {
        msg = 'The Google Sign-In popup was closed before completion. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInGuest();
    } catch (err: any) {
      console.error('Guest Auth error:', err);
      if (err?.message?.includes('auth/operation-not-allowed')) {
        setError('Anonymous sign-in is disabled. Enable "Anonymous" in Firebase Console (Authentication -> Sign-in method).');
      } else {
        setError(err?.message || 'Failed to sign in as guest.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Please enter your full name or company name.');
        }
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || 'Authentication failed. Please check your credentials.';
      if (msg.includes('auth/operation-not-allowed')) {
        msg = 'Email/Password auth is disabled. You MUST enable "Email/Password" in your Firebase Console (Authentication -> Sign-in method) to create accounts or log in this way.';
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Please switch to "Sign In" instead.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      } font-sans selection:bg-rose-500 selection:text-white`}
    >
      <div className="w-full max-w-md">
        {/* Logo Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs mb-4">
            <Instagram className="w-8 h-8 text-zinc-700 dark:text-zinc-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-1">
            Assix CRM
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Instagram Outreach & Lead Management Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl">
          {/* Quick Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-5 py-3 px-4 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs border border-zinc-300 dark:border-zinc-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">Or use email</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-950 p-1 mb-5 border border-zinc-200/60 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                !isSignUp
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                isSignUp
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-zinc-500 font-semibold text-xs mb-1">
                  Full Name / Agency
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Rivers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-500 font-semibold text-xs mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold text-xs mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isSignUp ? 'Create My Account' : 'Sign In to CRM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Guest Sign-In Fallback */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 underline cursor-pointer"
            >
              Continue as Guest / Anonymous User
            </button>
          </div>

          {/* Super Admin Notice */}
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px] font-semibold">
              <ShieldCheck className="w-3 h-3 text-amber-500" />
              <span>Multi-tenant Isolation Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
