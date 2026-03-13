'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { account } from '@aura/utils/appwriteConfig';
import { authService } from '@aura/utils/auth';
import { ID } from 'appwrite';
import { ChevronLeft, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, Sparkles, UserPlus, ArrowRight, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [hearts, setHearts] = useState<{ left: string; duration: string; delay: string; size: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  useEffect(() => {
    const generated = Array.from({ length: 15 }).map(() => ({
      left: `${Math.random() * 100}%`,
      duration: `${15 + Math.random() * 20}s`,
      delay: `${Math.random() * 5}s`,
      size: `${12 + Math.random() * 22}px`,
    }));
    setHearts(generated);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // --- REGISTRATION & ONBOARDING REDIRECT ---
        // 1. Create the account
        await account.create(
          ID.unique(), 
          formData.email, 
          formData.password,
          formData.name || 'Elite Member'
        );
        
        // 2. Log in immediately
        await authService.login(formData.email, formData.password);
        
        // 3. Navigate specifically to onboarding
        router.push('/onboarding');
      } else {
        // --- LOGIN LOGIC ---
        try {
          await account.deleteSession('current');
        } catch { /* No active session */ }

        await authService.login(formData.email, formData.password);
        router.push('/discovery');
      }
      router.refresh(); 
    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(err.message || 'Action failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-rose-950 via-purple-950 to-indigo-950 px-6">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .neon-heart { position: absolute; animation: floatUp linear infinite; filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.8)); }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>

      {/* Floating Hearts */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {hearts.map((h, i) => (
          <div key={i} className="neon-heart" style={{ left: h.left, animationDuration: h.duration, animationDelay: h.delay, fontSize: h.size, opacity: 0 }}>❤️</div>
        ))}
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-all group z-30">
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase">Home</span>
      </Link>

      <div className="relative z-20 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-6 mx-auto">
            <Sparkles size={14} className="text-pink-400" />
            <span className="text-pink-300 text-xs font-semibold">
              {isRegistering ? 'Your Journey Begins' : 'Welcome back to LovioHuB'}
            </span>
          </div>
          <h1 className="text-6xl font-black italic text-white mb-2 drop-shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            LOVIO<span className="text-pink-500">HUB</span>
          </h1>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
          {error && (
            <div className="mb-8 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                <label className="text-white/30 text-[9px] font-black uppercase ml-5">Display Name</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pink-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required={isRegistering}
                    placeholder="YOUR NAME"
                    className="w-full bg-white/5 border border-white/10 rounded-full py-5 pl-16 pr-6 text-xs font-bold text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-white/30 text-[9px] font-black uppercase ml-5">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pink-500 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="EMAIL@LOVIOHUB.COM"
                  className="w-full bg-white/5 border border-white/10 rounded-full py-5 pl-16 pr-6 text-xs font-bold text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-5">
                <label className="text-white/30 text-[9px] font-black uppercase">Password</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pink-500 transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-full py-5 pl-16 pr-16 text-xs font-bold text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="group relative w-full py-5 mt-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : (
                <span className="flex items-center justify-center gap-3">
                  {isRegistering ? 'Launch Profile' : 'Enter Hub'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[9px] font-black uppercase">
              <span className="bg-[#0c0c0e] px-4 text-white/20">
                {isRegistering ? 'Already a member?' : 'New to the elite?'}
              </span>
            </div>
          </div>

          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="group relative w-full py-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white font-black text-xl shadow-2xl shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all uppercase border-2 border-white/20"
          >
            <span className="flex items-center justify-center gap-3">
              <UserPlus size={24} className="group-hover:scale-110 transition-transform" />
              {isRegistering ? 'Switch to Login' : 'Create Your Profile'}
              <Sparkles size={20} className="text-yellow-300 group-hover:rotate-12 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}