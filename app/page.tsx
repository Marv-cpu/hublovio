'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Home() {
  const [hearts, setHearts] = useState<
    { left: string; duration: string; delay: string; size: string }[]
  >([]);

  // Generate hearts ONLY on client after mount
  useEffect(() => {
    const generated = Array.from({ length: 15 }).map(() => ({
      left: `${Math.random() * 100}%`,
      duration: `${10 + Math.random() * 20}s`,
      delay: `${Math.random() * 10}s`,
      size: `${10 + Math.random() * 30}px`,
    }));
    setHearts(generated);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1A0B2E]">
      {/* 1. Background Gradient with Neon Depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4B1B7D] via-[#2E1065] to-[#1A0B2E] opacity-100" />

      {/* 2. Floating Neon Hearts Animation */}
      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }
        .neon-heart {
          position: absolute;
          animation: floatUp linear infinite;
          filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.8));
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Animated Floating Hearts */}
        {hearts.map((h, i) => (
          <div
            key={i}
            className="neon-heart"
            style={{
              left: h.left,
              animationDuration: h.duration,
              animationDelay: h.delay,
              fontSize: h.size,
              opacity: 0,
            }}
          >
            ❤️
          </div>
        ))}

        {/* Static Glow Hearts */}
        <div className="absolute top-1/4 right-[10%] text-6xl blur-[2px] opacity-20 drop-shadow-[0_0_15px_#EC4899]">
          ❤️
        </div>
        <div className="absolute bottom-1/4 left-[5%] text-5xl blur-[1px] opacity-10 drop-shadow-[0_0_20px_#8B5CF6]">
          ❤️
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-8 text-center">
        {/* 3. Central Heart Icon */}
        <div className="relative w-28 h-28 mb-10">
          <div className="absolute inset-0 bg-[#D946EF] rounded-full blur-[40px] opacity-40 animate-pulse"></div>
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              style={{ fill: 'url(#neonHeartGradient)' }}
            />
            <defs>
              <linearGradient id="neonHeartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FFF5A5', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#F472B6', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#7E22CE', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Branding */}
        <p className="text-white/90 text-xl font-medium tracking-widest mb-1 uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
          Welcome to
        </p>

        <h1 className="text-7xl font-serif italic font-bold mb-4 text-white tracking-tighter drop-shadow-[0_0_15px_#D946EF]">
          LovioHub
        </h1>

        <p className="text-pink-300/80 text-sm font-light mb-16 tracking-[0.2em] uppercase drop-shadow-[0_0_8px_#EC4899]">
          Find Your Perfect Connection
        </p>

        {/* Buttons */}
        <div className="w-full space-y-6">
          <Link href="/auth" className="block w-full">
            <button className="w-full py-5 px-8 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white font-black text-lg shadow-[0_0_25px_rgba(236,72,153,0.6)] hover:shadow-[0_0_40px_rgba(236,72,153,0.9)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 uppercase tracking-widest border border-white/20">
              Get Started
            </button>
          </Link>

          <div className="flex flex-col items-center gap-4">
            <Link
              href="/login"
              className="text-white font-bold hover:text-pink-300 transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"
            >
              Login
            </Link>

            <div className="w-full flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20"></div>
              <span className="text-white/40 text-xs italic text-nowrap">
                Sign Up with it..
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20"></div>
            </div>

            {/* Social Icons */}
            <div className="flex gap-4 mt-2">
              <SocialIcon color="bg-indigo-900/60 shadow-[0_0_15px_rgba(79,70,229,0.4)]" icon="Apple" />
              <SocialIcon color="bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" icon="Google" />
              <SocialIcon color="bg-blue-800/80 shadow-[0_0_15px_rgba(29,78,216,0.4)]" icon="Facebook" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SocialIcon({ color, icon }: { color: string; icon: string }) {
  const isGoogle = icon === 'Google';
  return (
    <button className={`${color} w-14 h-14 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-md hover:scale-110 transition-all`}>
      <span className={`${isGoogle ? 'text-gray-800' : 'text-white'} text-xs font-black`}>
        {icon[0]}
      </span>
    </button>
  );
}