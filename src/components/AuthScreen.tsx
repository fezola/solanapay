import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { authService } from '../services/supabase';

interface AuthScreenProps {
  onAuth: (userData: { name: string; email: string; userId: string }) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Extract referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      console.log('Referral code from URL:', ref);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in
        const { user } = await authService.signIn(email, password);
        if (user) {
          onAuth({
            name: user.user_metadata?.full_name || email.split('@')[0],
            email: user.email || email,
            userId: user.id
          });
        }
      } else {
        // Sign up
        const { user } = await authService.signUp(email, password, name, referralCode || undefined);
        if (user) {
          onAuth({
            name: name || email.split('@')[0],
            email: user.email || email,
            userId: user.id
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#030303',
      }}
    >
      <style>{`
        @keyframes float {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: float 10s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .auth-input {
          width: 100%;
          background: rgba(24, 24, 27, 0.5);
          border: 1px solid #27272a;
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        .auth-input::placeholder {
          color: #71717a;
        }
        .auth-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .auth-input:hover:not(:focus) {
          border-color: #3f3f46;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Ambient Background Lighting */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute animate-blob rounded-full"
          style={{
            top: '-10%',
            left: '-10%',
            width: '24rem',
            height: '24rem',
            backgroundColor: 'rgba(49, 46, 129, 0.2)',
            filter: 'blur(128px)'
          }}
        />
        <div
          className="absolute animate-blob animation-delay-2000 rounded-full"
          style={{
            bottom: '-10%',
            right: '-10%',
            width: '24rem',
            height: '24rem',
            backgroundColor: 'rgba(88, 28, 135, 0.2)',
            filter: 'blur(128px)'
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '16rem',
            height: '16rem',
            backgroundColor: 'rgba(30, 58, 138, 0.1)',
            filter: 'blur(100px)'
          }}
        />
        {/* Grid Pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)'
          }}
        />
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glow effect behind card */}
        <div
          className="absolute -inset-1 rounded-2xl blur opacity-20"
          style={{ backgroundImage: 'linear-gradient(to right, #6366f1, #9333ea)' }}
        />

        <div className="relative glass-panel rounded-2xl p-8">
          {/* Logo and Header */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg mb-4 overflow-hidden"
              style={{
                background: 'linear-gradient(to bottom right, #3f3f46, #18181b)',
                border: '1px solid #3f3f46'
              }}
            >
              <img
                src="/SOLPAY.png"
                alt="SolPay"
                className="w-12 h-12 object-contain"
              />
            </div>
            <h2
              className="text-center mb-2 font-semibold text-2xl text-white"
              style={{ letterSpacing: '-0.025em' }}
            >
              {isLogin ? 'Welcome Back' : 'Join SolPay'}
            </h2>
            <p style={{ color: '#a1a1aa' }} className="text-center text-sm">
              {isLogin ? 'Login to continue your journey' : 'Start off-ramping crypto to Naira'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium"
                  style={{ color: '#d4d4d8' }}
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="auth-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: '#d4d4d8' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: '#d4d4d8' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 mt-4 shadow-lg"
              style={{
                backgroundColor: loading ? '#d4d4d8' : 'white',
                color: '#000',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                height: '56px',
                fontSize: '16px',
                letterSpacing: '-0.01em'
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#f4f4f5'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'white'; }}
              onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Login' : 'Create Account'}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="text-sm font-medium transition-colors"
              style={{
                color: '#818cf8',
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.color = '#a5b4fc'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.color = '#818cf8'; }}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </button>
          </div>

          {/* Trust badges */}
          <div
            className="mt-8 pt-6 flex items-center justify-center gap-4"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" style={{ color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-xs" style={{ color: '#71717a' }}>Secure</span>
            </div>
            <div className="h-3 w-px" style={{ backgroundColor: '#27272a' }} />
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" style={{ color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span className="text-xs" style={{ color: '#71717a' }}>Fast</span>
            </div>
            <div className="h-3 w-px" style={{ backgroundColor: '#27272a' }} />
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" style={{ color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs" style={{ color: '#71717a' }}>No fees</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div
        className="absolute bottom-0 left-0 right-0 py-4 text-center"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        <p className="text-xs" style={{ color: '#52525b' }}>© 2024 Solpay Finance. All rights reserved.</p>
      </div>
    </div>
  );
}
