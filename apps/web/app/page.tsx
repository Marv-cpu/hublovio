'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart, Sparkles, ArrowRight, ChevronRight, Shield, MessageCircle, Globe2, Zap } from 'lucide-react';

interface Heart {
  left: string;
  duration: string;
  delay: string;
  size: string;
  opacity: number;
}

export default function Home() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const generated: Heart[] = Array.from({ length: 35 }).map(() => ({
      left: `${Math.random() * 100}%`,
      duration: `${20 + Math.random() * 30}s`,
      delay: `${Math.random() * -25}s`,
      size: `${Math.random() * 25 + 15}px`,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setHearts(generated);
  }, []);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-rose-950 via-purple-950 to-indigo-950">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Floating Hearts */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {hearts.map((heart, index) => (
          <div
            key={`heart-${index}`}
            className="absolute animate-float-up text-rose-300/30"
            style={{
              left: heart.left,
              animationDuration: heart.duration,
              animationDelay: heart.delay,
              fontSize: heart.size,
              opacity: heart.opacity,
              bottom: '-10%',
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Simple Navigation - Minimal */}
      <nav className="absolute top-6 left-0 right-0 z-20 flex justify-between items-center px-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-3xl animate-pulse">💕</span>
          <span className="text-white font-bold text-2xl tracking-tight bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">LovioHuB</span>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/login" 
            className="text-white/80 hover:text-white px-5 py-2 rounded-full text-sm font-medium transition-all hover:bg-white/10"
          >
            Log in
          </Link>
          <Link 
            href="/auth" 
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all hover:scale-105"
          >
            Join free
          </Link>
        </div>
      </nav>

      {/* Centered Hero Section */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-8 mx-auto">
          <Sparkles size={16} className="text-pink-400" />
          <span className="text-pink-300 text-xs font-semibold tracking-wider">Find your perfect match today</span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-6">
          Where 
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300">
            Love Finds You
          </span>
        </h1>
        
        <p className="text-white/60 text-xl max-w-2xl mx-auto mb-10">
          Join the community where real connections happen. Your next great love story starts here.
        </p>

        {/* Loud, Functional CTAs - Side by Side */}
        <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-16">
          <Link href="/auth" className="w-full sm:w-auto">
            <button className="relative px-10 py-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-xl uppercase tracking-wider w-full shadow-2xl shadow-pink-500/40 hover:shadow-pink-500/60 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group">
              Create Profile
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <button className="px-10 py-6 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl font-black text-xl uppercase tracking-wider w-full hover:bg-white/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group">
              Log In
              <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Trust Indicators - Centered */}
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-r from-pink-400 to-purple-400 shadow-lg">
                  <div className="w-full h-full bg-black/20"></div>
                </div>
              ))}
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 border-2 border-white/20 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                +15M
              </div>
            </div>
            <div className="text-left">
              <span className="text-white font-bold text-2xl">15M+</span>
              <span className="text-white/40 text-sm block">happy singles</span>
            </div>
          </div>

          {/* Feature Pills - Simple & Clean */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <div className="bg-white/5 backdrop-blur-sm px-5 py-3 rounded-full border border-white/10 flex items-center gap-2">
              <Heart size={16} className="text-pink-400" />
              <span className="text-white/80 text-sm">Real connections</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm px-5 py-3 rounded-full border border-white/10 flex items-center gap-2">
              <Shield size={16} className="text-purple-400" />
              <span className="text-white/80 text-sm">Verified profiles</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm px-5 py-3 rounded-full border border-white/10 flex items-center gap-2">
              <MessageCircle size={16} className="text-pink-400" />
              <span className="text-white/80 text-sm">Instant chat</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm px-5 py-3 rounded-full border border-white/10 flex items-center gap-2">
              <Globe2 size={16} className="text-purple-400" />
              <span className="text-white/80 text-sm">Global community</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm px-5 py-3 rounded-full border border-white/10 flex items-center gap-2">
              <Zap size={16} className="text-pink-400" />
              <span className="text-white/80 text-sm">Smart matching</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Bottom Bar */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
        <p className="text-white/30 text-xs">
          © 2026 LovioHuB · Where hearts connect
        </p>
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.5;
          }
          80% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-120vh) rotate(20deg);
            opacity: 0;
          }
        }

        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .animate-float-up {
          animation: floatUp linear infinite;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}