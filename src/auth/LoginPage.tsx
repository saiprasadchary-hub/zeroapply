import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import logoImg from '../assets/logo.png';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Check
} from 'lucide-react';
import { AuthService, getFriendlyAuthErrorMessage } from './authService';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from './authPolicy';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, continueAsGuest, authError, setAuthError } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch {
      // Handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (mode !== 'reset' && !password)) return;

    setLoading(true);
    setAuthError(null);

    if (mode === 'signup' && !PASSWORD_PATTERN.test(password)) {
      setAuthError(PASSWORD_REQUIREMENTS);
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'signup') {
        await signupWithEmail(email, password, name);
        setVerificationSent(true);
        setMode('login');
        setPassword('');
      } else if (mode === 'reset') {
        await AuthService.resetPassword(email);
        setResetSent(true);
      }
    } catch (err: unknown) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-zinc-900 p-4 sm:p-6 lg:p-12 font-sans select-none antialiased">
      {/* Main Grid Container */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center my-auto">
        
        {/* Left Column: Clean Editorial Product Story */}
        <div className="lg:col-span-6 flex flex-col justify-center text-left space-y-6 order-2 lg:order-1">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="ZeroApply Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0"
            />
            <span className="font-black text-2xl tracking-tight text-zinc-900 font-sans">
              ZeroApply
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-[1.15]">
              Automate your job search. <br />
              <span className="text-emerald-600">Zero repetitive effort.</span>
            </h1>
          </div>

          {/* Value Checklist */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} strokeWidth={3} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900">Quick auto-apply right after jobs are posted</p>
                <p className="text-xs text-zinc-500">Be among the first applicants to get noticed by recruiters instantly.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} strokeWidth={3} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900">Focus on interview prep — we apply for you</p>
                <p className="text-xs text-zinc-500">Automate tedious form filling and screening questions for jobs &amp; internships.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} strokeWidth={3} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900">Build your own ATS-optimized resumes</p>
                <p className="text-xs text-zinc-500">Generate clean, professional resumes tailored to pass employer screening.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clean White Card Login */}
        <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2">
          <div className="w-full max-w-[420px] bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-zinc-900/5 flex flex-col">
            
            {/* Card Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <img
                  src={logoImg}
                  alt="ZeroApply Logo"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0"
                />
                <span className="font-black text-2xl sm:text-3xl tracking-tight text-zinc-900 font-sans">
                  Zero<span className="text-emerald-600">Apply</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-500 max-w-[300px]">
                {mode === 'signup'
                  ? 'Create an account to sync personas and auto-apply.'
                  : mode === 'reset'
                  ? 'Enter your email to receive a password reset link.'
                  : 'Sign in to access your autonomous job application engine.'}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            {/* Reset Confirmation */}
            {resetSent && mode === 'reset' && (
              <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>Password reset link sent to <strong>{email}</strong>. Please check your inbox.</span>
              </div>
            )}

            {verificationSent && mode === 'login' && (
              <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>Verification link sent to <strong>{email}</strong>. Verify your email, then sign in.</span>
              </div>
            )}

            {/* Google Authentication Button */}
            {mode !== 'reset' && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 px-4 rounded-xl bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-800 font-semibold text-xs sm:text-sm border border-zinc-300 flex items-center justify-center gap-3 transition-all duration-150 shadow-xs hover:border-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed mb-4 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}

            {/* Divider */}
            {mode !== 'reset' && (
              <div className="w-full flex items-center gap-3 my-2 mb-4">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">or with email</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="Sai Prasad"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-700">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setAuthError(null);
                        }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      maxLength={128}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-zinc-50/60 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <p className="text-[10px] text-zinc-500">8+ characters with uppercase, lowercase, and a number.</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-zinc-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === 'signup' ? (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={14} />
                  </>
                ) : mode === 'reset' ? (
                  <span>Send Reset Email</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Mode Switcher */}
            <div className="mt-4 text-center">
              {mode === 'login' ? (
                <p className="text-xs text-zinc-500">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setAuthError(null);
                    }}
                    className="text-zinc-900 font-semibold hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setAuthError(null);
                      setResetSent(false);
                    }}
                    className="text-zinc-900 font-semibold hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            {/* Quick Guest Bypass */}
            <div className="w-full pt-4 mt-4 border-t border-zinc-100 flex flex-col items-center">
              <button
                type="button"
                onClick={continueAsGuest}
                className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-zinc-100/70 cursor-pointer"
              >
                <span>Continue as Guest / Offline Demo</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
