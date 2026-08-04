import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radar } from 'lucide-react';
import AnimatedBackground from '@shared/components/AnimatedBackground';
import GlassPanel from '../components/GlassPanel';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import { authService } from '../services/authService';

const TITLES = {
  signin: { title: 'Welcome back', subtitle: 'Sign in to continue to Site-Sense' },
  signup: { title: 'Create your account', subtitle: 'Start your Site-Sense journey' },
  forgot: { title: 'Reset your password', subtitle: "We'll help you get back in" }
};

const VARIANTS = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 }
};

export default function AuthPage() {
  const [mode, setMode] = useState('signin');
  const { title, subtitle } = TITLES[mode];

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-[clamp(1rem,4vw,2rem)] py-[clamp(1.5rem,5vw,3rem)]">
      <AnimatedBackground particleCount={18} leftStep={37} topStep={53} sizeMod={6} />

      <div className="flex w-full max-w-[440px] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center animate-fade-in-up">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/30">
            <Radar size={22} strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Site-Sense</h1>
        </div>

        <GlassPanel>
          <div className="mb-6 flex flex-col gap-1 text-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={`${mode}-title`}
                variants={VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="text-xl font-semibold"
              >
                {title}
              </motion.h2>
            </AnimatePresence>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>

          {mode !== 'forgot' && (
            <div role="tablist" aria-label="Authentication mode" className="mb-6 grid grid-cols-2 rounded-xl bg-black/5 p-1 dark:bg-white/5">
              {['signin', 'signup'].map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={mode === tab}
                  onClick={() => setMode(tab)}
                  className={`relative min-h-[40px] rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none ${
                    mode === tab ? 'text-white' : 'text-muted hover:text-current'
                  }`}
                >
                  {mode === tab && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 shadow"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {mode === 'signin' && (
                <SignInForm onSwitchToSignUp={() => setMode('signup')} onSwitchToForgot={() => setMode('forgot')} />
              )}
              {mode === 'signup' && <SignUpForm onSwitchToSignIn={() => setMode('signin')} />}
              {mode === 'forgot' && <ForgotPasswordForm onSwitchToSignIn={() => setMode('signin')} />}
            </motion.div>
          </AnimatePresence>

          {mode !== 'forgot' && authService.mode === 'mock' && (
            <p className="mt-6 text-center text-xs text-muted">
              Demo mode — try <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">demo@site-sense.app</code> /{' '}
              <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">Password1!</code>
            </p>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
