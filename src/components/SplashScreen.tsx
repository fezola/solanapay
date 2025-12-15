import { motion } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col items-center justify-center p-6">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-600/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center shadow-2xl">
            <img src="/SOLPAY.png" alt="SolPay" className="w-16 h-16 object-contain" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl font-bold text-white mb-3"
        >
          SolPay
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-zinc-400 text-lg mb-12"
        >
          Convert your crypto to Naira instantly
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col gap-3 mb-12 text-left w-full"
        >
          <div className="flex items-center gap-3 text-zinc-300">
            <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">✓</span>
            <span>Instant bank transfers</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">✓</span>
            <span>Best exchange rates</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">✓</span>
            <span>Secure & reliable</span>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col gap-3 w-full"
        >
          <button
            onClick={onFinish}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
          >
            Get Started
          </button>
          <button
            onClick={onFinish}
            className="w-full py-4 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all border border-zinc-700"
          >
            I already have an account
          </button>
        </motion.div>
      </div>
    </div>
  );
}
