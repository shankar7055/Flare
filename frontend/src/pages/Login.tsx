import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { ShieldAlert, Sparkles, ArrowRight, Mail, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@lifesaver.ai');
  const [password, setPassword] = useState('Password123');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);

    try {
      if (isSignup) {
        await apiClient.auth.signup({ email, password, name });
      }
      const response = await apiClient.auth.login({ email, password });
      await login(response.access_token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleQuickDemoAccess = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await apiClient.auth.login({ 
        email: 'demo@lifesaver.ai', 
        password: 'Password123' 
      });
      await login(response.access_token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Quick access login failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F6F1] font-['Plus_Jakarta_Sans',sans-serif] text-[#202020] relative overflow-hidden flex flex-col md:flex-row">
      
      {/* Dynamic Background Gradients and Subtle Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6D8367] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#BEEF00] opacity-[0.05] blur-[120px]" />
      </div>

      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-50 flex items-center gap-2">
        <span className="text-[#6D8367] text-lg font-black tracking-tight">✦</span>
        <span className="font-bold text-sm tracking-tight">Flare</span>
        <span className="text-[10px] uppercase tracking-wider text-[#666666] font-mono px-2 py-0.5 border border-[#E9E4DB] rounded-full bg-[#FFFCF8]/60 backdrop-blur-sm">
          AI Deadline Assistant
        </span>
      </div>

      <div className="w-full md:w-[55%] min-h-[50vh] md:min-h-screen p-8 md:p-16 lg:p-24 flex flex-col justify-between relative z-10 select-none border-b md:border-b-0 md:border-r border-[#E9E4DB]">
        <div className="h-12 md:h-16" />
        <div className="max-w-xl my-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <h2 className="font-['Playfair_Display',serif] text-5xl md:text-6xl lg:text-[4rem] font-bold leading-[1.08] tracking-tight text-[#202020]">
              Your AI Executive <br />
              <span className="italic font-normal text-[#6D8367]">for Deadlines.</span>
            </h2>
            <p className="text-[#666666] text-lg md:text-xl font-medium leading-relaxed max-w-lg">
              Flare watches your calendar, tracks assignments, predicts missed deadlines, and automatically builds an execution schedule.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="flex items-center gap-2.5 bg-[#FFFCF8]/40 border border-[#E9E4DB] px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm">
              <span className="text-[#6D8367] font-bold">✓</span>
              <span className="text-sm font-semibold text-[#202020]">Detects urgent tasks</span>
            </div>
            <div className="flex items-center gap-2.5 bg-[#FFFCF8]/40 border border-[#E9E4DB] px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm">
              <span className="text-[#6D8367] font-bold">✓</span>
              <span className="text-sm font-semibold text-[#202020]">Auto prioritization</span>
            </div>
            <div className="flex items-center gap-2.5 bg-[#FFFCF8]/40 border border-[#E9E4DB] px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm">
              <span className="text-[#6D8367] font-bold">✓</span>
              <span className="text-sm font-semibold text-[#202020]">Smart reminders</span>
            </div>
          </motion.div>
        </div>

        <div className="relative h-32 w-full max-w-lg overflow-visible mt-8">
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [-1, 1, -1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 top-0 bg-[#FFFCF8]/80 backdrop-blur-md border border-[#E9E4DB] px-4 py-2.5 rounded-2xl shadow-md flex items-center gap-3"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[#6D8367]">Meeting Rescheduled</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, -12, 0], rotate: [1, -1, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute right-4 top-2 bg-[#FFFCF8]/80 backdrop-blur-md border border-[#E9E4DB] px-4 py-2.5 rounded-2xl shadow-md flex items-center gap-3"
          >
            <span className="text-xs font-bold text-[#666666]">📅 Google Calendar Sync Active</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0], rotate: [-0.5, 0.5, -0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute left-1/3 bottom-2 bg-[#FFFCF8]/90 backdrop-blur-md border border-[#E9E4DB] px-4 py-2.5 rounded-2xl shadow-md flex items-center gap-3"
          >
            <span className="text-xs font-bold text-[#202020]">🚨 Rescue Mode Activated</span>
          </motion.div>
        </div>
      </div>

      <div className="w-full md:w-[45%] min-h-[50vh] md:min-h-screen p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, transition: { duration: 0.3 } }}
          className="w-full max-w-[520px] bg-[#FFFCF8] rounded-[28px] border border-[#E9E4DB] p-8 md:p-12 shadow-[0_30px_80px_rgba(25,25,25,0.06)] relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#6D8367]" />
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F8F6F1] border border-[#E9E4DB] rounded-full text-xs font-semibold text-[#6D8367] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6D8367]" />
              <span>AI Secure Login</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[#202020] mb-2 font-display">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-[#666666]">
              {isSignup 
                ? 'Sign up to get a proactive schedule builder.' 
                : 'Sign in to continue managing your deadlines.'}
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-3"
              >
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase font-extrabold tracking-wider text-[#666666]">
                  Full Name
                </label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666666] group-focus-within:text-[#6D8367] transition-colors" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Demo User"
                    className="w-full h-[56px] pl-12 pr-4 bg-transparent rounded-2xl border border-[#E9E4DB] text-sm text-[#202020] placeholder-neutral-400 focus:border-[#6D8367] focus:ring-2 focus:ring-[#6D8367]/10 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-extrabold tracking-wider text-[#666666]">
                Account Email
              </label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666666] group-focus-within:text-[#6D8367] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-[56px] pl-12 pr-4 bg-transparent rounded-2xl border border-[#E9E4DB] text-sm text-[#202020] placeholder-neutral-400 focus:border-[#6D8367] focus:ring-2 focus:ring-[#6D8367]/10 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-extrabold tracking-wider text-[#666666]">
                Password
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666666] group-focus-within:text-[#6D8367] transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-[56px] pl-12 pr-4 bg-transparent rounded-2xl border border-[#E9E4DB] text-sm text-[#202020] placeholder-neutral-400 focus:border-[#6D8367] focus:ring-2 focus:ring-[#6D8367]/10 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isAuthenticating}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-[58px] rounded-2xl bg-[#6D8367] hover:bg-[#5E7158] text-white font-bold text-sm transition-all duration-300 shadow-md shadow-[#6D8367]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignup ? 'Create Account' : 'Continue'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError(null);
                if (isSignup) {
                  setEmail('demo@lifesaver.ai');
                  setPassword('Password123');
                } else {
                  setEmail('');
                  setPassword('');
                }
              }}
              className="text-xs text-[#666666] hover:text-[#202020] font-semibold transition-colors bg-transparent border-0 cursor-pointer"
            >
              {isSignup ? "Already have an account? Log in" : "Don't have an account? Sign up"}
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
};
