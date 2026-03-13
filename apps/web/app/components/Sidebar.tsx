'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService } from '@aura/utils/auth';
import client, { account } from '@aura/utils/appwriteConfig';
import { Zap, Radio, User, LogOut, Sparkles } from 'lucide-react';

const DATABASE_ID = '698835eb000eb728917a';
const CONNECTIONS_COLLECTION_ID = 'connections';

export default function Sidebar() {
  const pathname = usePathname();
  const [hasNewVibration, setHasNewVibration] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const setupRealtime = async () => {
      try {
        const user = await account.get().catch(() => null);
        if (!user) return;

        setUserId(user.$id);

        const unsubscribe = client.subscribe(
          `databases.${DATABASE_ID}.collections.${CONNECTIONS_COLLECTION_ID}.documents`,
          (response: any) => {
            const payload = response.payload;
            if (
              response.events.includes('databases.*.collections.*.documents.*.create') &&
              payload.receiverId === user.$id &&
              payload.status === 'pending'
            ) {
              setHasNewVibration(true);
            }
          }
        );

        return () => unsubscribe();
      } catch (err) {
        console.log("Session inactive or Realtime connection failed.");
      }
    };

    setupRealtime();
  }, []);

  useEffect(() => {
    if (pathname === '/vibrations') {
      setHasNewVibration(false);
    }
  }, [pathname]);

  // --- LOGIC TO HIDE SIDEBAR ---
  const isAuthPage = ['/', '/auth', '/onboarding', '/discovery'].includes(pathname);
  const isChatPage = pathname.startsWith('/chat'); // Removes sidebar from all chat routes

  if (isAuthPage || isChatPage) return null;
  // -----------------------------

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Sparkles },
    { name: 'Vibrations', href: '/vibrations', icon: Radio, notify: true },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <aside className="w-24 lg:w-72 flex flex-col justify-between p-8 bg-[#0F021A] border-r border-white/5 sticky top-0 h-screen z-[100]">
      <div className="flex flex-col h-full">
        {/* LOGO AREA */}
        <div className="mb-16 px-4 flex items-center gap-3">
          <div className="relative">
            <Zap className="text-aura-purple-light animate-pulse" size={32} />
            <div className="absolute inset-0 bg-aura-purple-light blur-xl opacity-20"></div>
          </div>
          <span className="hidden lg:block font-black italic tracking-tighter text-2xl text-white">
            AURA
          </span>
        </div>
        
        {/* NAVIGATION */}
        <nav className="space-y-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            const showPing = item.notify && hasNewVibration;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-5 p-5 rounded-[1.5rem] transition-all relative group overflow-hidden ${
                  isActive 
                  ? 'bg-white/5 border border-white/10 text-white shadow-[0_0_20px_rgba(188,119,255,0.1)]' 
                  : 'text-white/30 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-aura-purple-light rounded-r-full shadow-[0_0_10px_#BC77FF]"></div>
                )}

                <div className="relative">
                  <Icon size={22} className={isActive ? 'text-aura-purple-light' : 'group-hover:text-white transition-colors'} />
                  {showPing && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aura-purple-light opacity-40"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-aura-purple-main border-2 border-[#0F021A]"></span>
                    </span>
                  )}
                </div>

                <span className={`hidden lg:block text-[11px] font-black uppercase tracking-[0.25em] transition-all ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="pt-8 mt-auto border-t border-white/5">
          <button 
            onClick={() => authService.logout()}
            className="w-full flex items-center gap-5 p-5 rounded-[1.5rem] text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-all group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="hidden lg:block text-[10px] font-black uppercase tracking-[0.3em]">
              Terminate
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}