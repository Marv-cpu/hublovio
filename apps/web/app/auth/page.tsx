'use client';
import { useState, useEffect } from 'react';
import { authService } from '@aura/utils/auth';
import { account } from '@aura/utils/appwriteConfig';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        await account.get();
        router.push('/discovery');
      } catch (err) {
        setCheckingSession(false); // No session found, stay on login
      }
    };
    checkActiveSession();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await authService.login(email, password);
        router.push('/discovery'); // Logged in? Straight to the feed.
      } else {
        await authService.register(email, password, name);
        router.push('/onboarding'); // New? Set up profile.
      }
    } catch (err: any) {
      if (err.message.includes('Creation of a session is prohibited')) {
        router.push('/discovery');
      } else {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-aura-black flex items-center justify-center">
        <div className="text-aura-purple-light animate-pulse tracking-widest uppercase text-xs">
          Checking Frequency...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-aura-black">
      <div className="w-full max-w-md p-8 border border-white/10 rounded-[2.5rem] bg-white/5 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">
            {isLogin ? 'Welcome Back' : 'Create Aura'}
          </h1>
          <p className="text-aura-purple-light/70 text-[10px] uppercase tracking-[0.2em] mt-2 font-bold">
            {isLogin ? 'Re-align your frequency.' : 'Join the elite spectrum.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="FULL NAME"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-bold tracking-widest focus:outline-none focus:border-aura-purple-main transition-all text-white placeholder:text-white/20"
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-bold tracking-widest focus:outline-none focus:border-aura-purple-main transition-all text-white placeholder:text-white/20"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="PASSWORD"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-bold tracking-widest focus:outline-none focus:border-aura-purple-main transition-all text-white placeholder:text-white/20"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button 
            disabled={loading}
            className="w-full mt-4 flex justify-center items-center py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-xl hover:bg-aura-purple-light transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-white/5"
          >
            {loading ? "Aligning..." : (isLogin ? 'Sign In' : 'Begin Journey')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-white/40 text-[9px] uppercase font-black tracking-widest hover:text-white transition-colors"
          >
            {isLogin ? "Generate New Frequency" : "Existing Aura Found"}
          </button>
        </div>
      </div>
    </div>
  );
}