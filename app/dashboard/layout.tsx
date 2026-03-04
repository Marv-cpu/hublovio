'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService } from '@aura/utils/auth';
import { Zap, Radio, User, LogOut, Compass } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Discovery', href: '/discovery', icon: Compass },
    { name: 'Vibrations', href: '/vibrations', icon: Radio },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-aura-black">
      {/* PERSISTENT SIDEBAR */}
      <aside className="w-24 lg:w-64 border-r border-white/5 flex flex-col justify-between p-6">
        <div>
          <div className="mb-12 px-2">
            <Zap className="text-aura-purple-light" size={32} />
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-aura-purple-light' : ''} />
                  <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={() => authService.logout()}
          className="flex items-center gap-4 p-4 rounded-2xl text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-all group"
        >
          <LogOut size={20} />
          <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-inherit">
            Terminate Session
          </span>
        </button>
      </aside>

      {/* PAGE CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}