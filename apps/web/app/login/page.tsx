'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService, account } from '@aura/utils'; // Import both from the same package
import { ChevronLeft, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Clean up any existing session
      try {
        await account.deleteSession('current');
      } catch (e) {
        // No session exists, continue
      }

      // Attempt login
      await authService.login(email, password);
      
      // Store user email for multi-user support
      localStorage.setItem('lastSessionUser', email);
      
      // Redirect to discovery page
      router.push('/discovery');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid credentials')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('Creation of a session is prohibited')) {
        setError('Please try again');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1A0B2E] p-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#4B1B7D] via-[#2E1065] to-[#1A0B2E] opacity-100" />
      
      {/* Background hearts (same as auth page) */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-20">
        {/* Add heart animations here if desired */}
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-all group z-20">
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-serif italic font-bold text-white tracking-tighter drop-shadow-[0_0_15px_#D946EF]">
            Welcome Back
          </h1>
          <p className="text-pink-300/60 text-[10px] uppercase tracking-[0.25em] mt-3 font-black">
            Your next date awaits.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-sm flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <p className="text-red-200 text-xs font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pink-400 transition-colors" size={18} />
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all text-white placeholder:text-white/20"
                required
                disabled={loading}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pink-400 transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-14 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all text-white placeholder:text-white/20"
                required
                disabled={loading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-6 flex justify-center items-center py-5 bg-gradient-to-br from-[#FF3BFF] via-[#EC4899] to-[#8B5CF6] text-white font-black text-[12px] uppercase tracking-[0.35em] rounded-full shadow-[0_0_25px_rgba(236,72,153,0.5)] hover:shadow-[0_0_45px_rgba(236,72,153,0.8)] hover:scale-[1.03] transition-all duration-300 disabled:opacity-50 active:scale-95 border-t border-white/30"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Find My Matches'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/40 text-xs mb-2">Don't have an account?</p>
            <Link 
              href="/auth" 
              className="inline-block text-white/60 hover:text-white text-[10px] uppercase font-black tracking-widest transition-colors"
            >
              Join LovioHub (Sign Up)
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link 
              href="/forgot-password" 
              className="text-white/20 hover:text-white/40 text-[8px] uppercase tracking-widest transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}