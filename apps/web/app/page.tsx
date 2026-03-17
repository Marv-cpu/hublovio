'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';

interface Heart {
  left: string;
  duration: string;
  delay: string;
  size: string;
  opacity: number;
}

export default function Home() {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const profileImages = Array.from({ length: 13 }, (_, i) => `/auraImage${i + 1}.png`);

  // Auto-rotate the card stack every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % profileImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [profileImages.length]);

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
    <main className="relative min-h-screen flex flex-col items-center justify-start overflow-x-hidden bg-[#1a0f1f]">
      
      {/* 1. BACKGROUND IMAGE */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${profileImages[11]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(6px) brightness(0.7)',
          transform: 'scale(1.05)',
        }}
      />
      
      {/* 2. OVERLAYS */}
      <div className="fixed inset-0 z-0 bg-[#4a2c4a]/50 mix-blend-multiply" />
      <div className="fixed inset-0 z-0 bg-radial-gradient from-transparent via-[#2a1a2a]/40 to-[#1a0f1f]/80" />

      {/* Floating Hearts */}
      <div className="absolute inset-0 pointer-events-none select-none z-10">
        {hearts.map((heart, index) => (
          <div
            key={`heart-${index}`}
            className="absolute animate-float-up text-rose-300/10"
            style={{
              left: heart.left,
              animationDuration: heart.duration,
              animationDelay: heart.delay,
              fontSize: heart.size,
              opacity: heart.opacity * 0.15,
              bottom: '-10%',
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Navigation - Centered Logo with Main Character Vibes */}
      <nav className="relative z-50 grid grid-cols-3 items-center px-8 py-6 max-w-7xl mx-auto w-full">
        {/* Left spacer for grid balance */}
        <div className="flex items-center gap-6">
           <Link href="/login" className="text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-all drop-shadow hidden md:block">
            Log in
          </Link>
        </div>

        {/* CENTERED LOGO */}
        <div className="flex flex-col items-center justify-center group cursor-default">
          <div className="relative">
            <span className="font-serif italic text-3xl md:text-4xl text-white tracking-[-0.05em] relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              Lovio
              <span className="font-black not-italic text-rose-400 drop-shadow-[0_0_20px_rgba(225,29,72,0.6)]">HUB</span>
            </span>
            {/* Logo Underglow */}
            <div className="absolute -inset-2 bg-rose-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-rose-400 to-transparent mt-1 opacity-50" />
        </div>

        {/* Right Action */}
        <div className="flex items-center justify-end gap-6">
          <Link href="/login" className="text-white/90 hover:text-white text-sm font-medium transition-all drop-shadow md:hidden">
            Log in
          </Link>
          <Link href="/auth" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl hover:bg-white hover:text-purple-900 transition-all">
            Join free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-20 w-full flex flex-col items-center mt-8 md:mt-16">
        
        {/* 3D Image Cards with Dynamic Switching */}
        <div className="relative h-[400px] md:h-[550px] w-full flex justify-center items-center perspective-2000 mb-16">
          
          {/* LOVIOHUB Branding Background - THE MAIN CHARACTER - BOLD AND CENTERED */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center pointer-events-none select-none w-full">
            <h2 className="text-[28vw] md:text-[22vw] font-black leading-none tracking-[-0.04em] uppercase animate-branding-epic whitespace-nowrap text-center"
                style={{ 
                  color: 'rgba(255, 255, 255, 0.18)',
                  WebkitTextStroke: '2px rgba(255, 255, 255, 0.15)',
                  textShadow: '0 0 40px rgba(236,72,153,0.5), 0 0 80px rgba(147,51,234,0.3)',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
                }}>
              LOVIOHUB
            </h2>
          </div>

          {/* Dynamic 3D Image Stack */}
          {Array.from({ length: 9 }).map((_, i) => {
            const imgIndex = (activeIndex + i) % profileImages.length;
            const src = profileImages[imgIndex];
            const offset = i - 4; 
            
            const translateX = offset * 135; 
            const translateY = Math.abs(offset) * 8;
            const translateZ = Math.abs(offset) * -120;
            const rotateY = offset * -12;
            const zIndex = 100 - Math.abs(offset) * 10;
            
            const isCenter = offset === 0;
            
            return (
              <div 
                key={`${imgIndex}-${i}`}
                className={`absolute rounded-2xl overflow-hidden transition-all duration-1000 ease-out
                  ${isCenter ? 'w-[280px] md:w-[400px] h-[360px] md:h-[520px]' : 'w-[200px] md:w-[280px] h-[260px] md:h-[380px]'}`}
                style={{
                  backgroundImage: `url(${src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                  zIndex: zIndex,
                  opacity: 1 - Math.abs(offset) * 0.15,
                  filter: `brightness(${isCenter ? 1.1 : 0.75}) blur(${Math.abs(offset) * 0.8}px)`,
                  boxShadow: isCenter 
                    ? '0 40px 80px -15px rgba(236,72,153,0.6), 0 0 0 2px rgba(255,255,255,0.4) inset' 
                    : '0 20px 40px -15px rgba(0,0,0,0.6)',
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent`} />
                {isCenter && (
                  <div className="absolute inset-0 border-2 border-rose-400/40 rounded-2xl animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Premium Experience Badge */}
        <div className="mb-6 relative z-30">
          <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-xl px-6 py-2.5 rounded-full border border-rose-400/50 shadow-2xl">
            <Sparkles size={16} className="text-rose-300" />
            <span className="text-rose-100 text-xs font-bold uppercase tracking-[0.25em]">THE PREMIUM EXPERIENCE</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-center mb-4 relative z-30">
          <span className="block text-6xl md:text-7xl lg:text-8xl font-serif italic text-white/95 leading-tight drop-shadow-2xl">
            Where
          </span>
          <span className="block text-7xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-white to-purple-200 leading-tight drop-shadow-2xl">
            Love Finds You
          </span>
        </h1>
        
        <p className="text-white/90 text-center text-lg md:text-xl max-w-2xl mx-auto px-4 mb-8 leading-relaxed drop-shadow-lg relative z-30 font-medium">
          Join the community where real connections happen.<br/>
          Your next great love story starts right here.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 px-4 relative z-30">
          <Link href="/auth" className="w-full sm:w-auto">
            <button className="px-12 py-5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full font-black text-lg uppercase tracking-wider w-full shadow-[0_0_40px_rgba(236,72,153,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-3 group">
              CREATE PROFILE
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <button className="px-12 py-5 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-full font-black text-lg uppercase tracking-wider w-full hover:bg-white/20 transition-all flex items-center justify-center gap-3">
              LOGIN
              <ChevronRight size={20} />
            </button>
          </Link>
        </div>

        {/* Social Proof */}
        <div className="flex items-center gap-4 bg-black/50 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 shadow-2xl relative z-30 mb-20">
          <div className="flex -space-x-3">
            {profileImages.slice(7, 12).map((src, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-rose-400/50 overflow-hidden bg-cover bg-center shadow-xl transform hover:scale-110 transition-all" style={{ backgroundImage: `url(${src})` }} />
            ))}
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold">
              +15M
            </div>
          </div>
          <div className="text-left border-l border-white/30 pl-4">
            <span className="text-white font-black text-2xl block leading-none">15M+</span>
            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">HAPPY MEMBERS</span>
          </div>
        </div>
      </div>

      {/* Footer - Visibility Fix */}
      <footer className="relative w-full py-12 z-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent mt-auto">
        <p className="text-white/60 text-[11px] font-black text-center tracking-[0.6em] uppercase drop-shadow-md">
          © 2026 LOVIOHUB · WHERE HEARTS CONNECT
        </p>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700;1,800;1,900&display=swap');
        
        .font-serif { font-family: 'Playfair Display', serif; font-style: italic; }

        .perspective-2000 { perspective: 2000px; transform-style: preserve-3d; }

        .bg-radial-gradient {
          background: radial-gradient(circle at center, transparent 0%, rgba(26,15,31,0.7) 100%);
        }

        @keyframes floatUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.1; }
          100% { transform: translateY(-120vh) rotate(10deg); opacity: 0; }
        }

        @keyframes branding-epic {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.18;
            text-shadow: 0 0 40px rgba(236,72,153,0.5), 0 0 80px rgba(147,51,234,0.3);
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.25;
            text-shadow: 0 0 60px rgba(236,72,153,0.7), 0 0 120px rgba(147,51,234,0.5), 0 0 20px rgba(255,255,255,0.2);
          }
        }

        .animate-float-up { animation: floatUp linear infinite; }
        .animate-branding-epic { animation: branding-epic 8s ease-in-out infinite; }
      `}</style>
    </main>
  );
}