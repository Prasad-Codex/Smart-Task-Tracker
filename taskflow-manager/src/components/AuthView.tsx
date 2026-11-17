import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckSquare, Eye, EyeOff, Lock, Mail, User as UserIcon } from 'lucide-react';
import { loginUser, registerUser } from '../api/client.ts';
import type { User } from '../types.ts';

interface AuthViewProps {
  onAuthenticated: (user: User) => void;
}

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await loginUser({ email: email.trim(), password });
        onAuthenticated(res.user);
      } else {
        const res = await registerUser({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginUser({
        email: 'demo@taskflow.app',
        password: 'demo1234',
      });
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in to demo account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh blueprint-grid flex flex-col justify-between p-0 sm:px-6 sm:py-8">
      {/* Top Brand Bar */}
      <header className="max-w-5xl w-full mx-auto px-4 py-3.5 sm:px-0 sm:py-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-white min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center border border-blue-400/40 shrink-0">
            <CheckSquare className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight truncate">
            Prasad&apos;s Workshop
          </span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10 border border-white/15 shrink-0">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`min-h-[36px] px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              mode === 'login'
                ? 'bg-white text-slate-900'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`min-h-[36px] px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              mode === 'register'
                ? 'bg-white text-slate-900'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>
      </header>

      {/* Full-screen on mobile, Centered Framed Architectural Card on desktop */}
      <main className="flex-1 sm:flex-initial max-w-5xl w-full mx-auto sm:my-8 flex flex-col">
        <div className="flex-1 sm:flex-initial rounded-t-2xl sm:rounded-2xl bg-white border-t sm:border border-slate-200 shadow-2xl overflow-hidden grid lg:grid-cols-12 items-stretch">
          {/* Mobile Compact Visual Strip */}
          <div className="lg:hidden relative h-28 sm:h-36 bg-slate-900 text-white flex items-end overflow-hidden">
            {!imgFailed ? (
              <img
                src="/src/assets/images/auth_workspace_banner_1794891760709.jpg"
                alt="Clean white and blue architectural workspace desk with planner notebook"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-[#0b1f4b]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f4b]/90 via-[#0b1f4b]/40 to-transparent" />
            <div className="relative z-10 px-5 py-3">
              <p className="font-display text-base font-bold text-white">
                Daily Task &amp; Deadline Planner
              </p>
            </div>
          </div>

          {/* Desktop Visual Framing Column */}
          <div className="hidden lg:flex lg:col-span-5 relative bg-slate-900 text-white flex-col justify-end overflow-hidden">
            {!imgFailed ? (
              <img
                src="/src/assets/images/auth_workspace_banner_1794891760709.jpg"
                alt="Clean white and blue architectural workspace desk with planner notebook"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-[#0b1f4b]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f4b]/95 via-[#0b1f4b]/45 to-transparent" />
            <div className="relative z-10 p-8 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-blue-200">
                Daily Task Planner
              </p>
              <h2 className="font-display text-2xl font-bold leading-snug text-white text-balance">
                Plan every sprint, deadline, and milestone with calm clarity.
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Switch effortlessly between structured grids, status boards, and today&apos;s urgent deliverables.
              </p>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 px-5 py-6 sm:p-10 lg:p-12 flex flex-col justify-between sm:justify-center flex-1">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                {mode === 'login' ? "Sign in to Prasad's Workshop" : "Create your Prasad's Workshop account"}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600">
                {mode === 'login'
                  ? 'Enter your credentials to open your personal task board.'
                  : 'Register in seconds to start tracking deadlines and task progress.'}
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="full-name"
                      className="block text-sm font-semibold text-slate-700 mb-1.5"
                    >
                      Full name
                    </label>
                    <div className="relative">
                      <UserIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="full-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Prasad Madhavan"
                        className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 transition-colors"
                    />
                  </div>
                </div>

                <div className={mode === 'register' ? 'grid sm:grid-cols-2 gap-4' : ''}>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-700 mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter password'}
                        className="w-full h-11 pl-10 pr-11 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="block text-sm font-semibold text-slate-700 mb-1.5"
                      >
                        Confirm password
                      </label>
                      <div className="relative">
                        <Lock
                          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 mt-2 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                >
                  <span>
                    {submitting
                      ? mode === 'login'
                        ? 'Signing in...'
                        : 'Creating account...'
                      : mode === 'login'
                        ? 'Sign In'
                        : 'Create Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {mode === 'login'
                    ? 'Want to preview a populated board?'
                    : "Already registered with Prasad's Workshop?"}
                </p>
                {mode === 'login' ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDemoLogin}
                    className="px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                  >
                    Try Demo Workspace
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    Sign in instead
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="hidden sm:flex max-w-5xl w-full mx-auto text-xs text-blue-100 items-center justify-between">
        <span>Prasad&apos;s Workshop</span>
        <span>Private account authentication &amp; task tracking</span>
      </footer>
    </div>
  );
}
