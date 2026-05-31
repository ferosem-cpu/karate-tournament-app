'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  Trophy, 
  Users, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut, 
  Home,
  Menu,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import SpectatorOnboarding from '@/components/spectator-onboarding';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [sessionOnboarded, setSessionOnboarded] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionOnboarded(!!sessionStorage.getItem('sessionOnboarded'));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (profile?.role === 'spectator' && !sessionOnboarded) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center p-4">
        <SpectatorOnboarding 
          onComplete={() => {
            sessionStorage.setItem('sessionOnboarded', 'true');
            window.location.reload();
          }} 
        />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully.");
      router.push('/login');
    } catch (err) {
      toast.error("Failed to sign out.");
    }
  };

  // Standard responsive-scale navigation set
  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/dashboard/dojos', label: 'Manage Dojos', icon: Building2 },
    { href: '/dashboard/kohai', label: 'Competitor Roster', icon: Users },
    { href: '/dashboard/reports', label: 'System Reports', icon: BarChart3 },
  ];

  // Include cleanup utilities strictly for Super Admin profiles
  if (profile?.role === 'super_admin') {
    navItems.push({ href: '/dashboard/users', label: 'User Management', icon: ShieldCheck });
    navItems.push({ href: '/dashboard/admin/data-cleanup', label: 'Dev Utilities', icon: Settings });
  }

  return (
    <div className="flex min-h-screen bg-zinc-900 text-zinc-100">
      
      {/* 1. Global Dark Sidebar - Deep Charcoal/Black */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-zinc-950 border-r border-zinc-800 shrink-0 text-white relative z-20">
        <div className="p-4 space-y-6">
          
          {/* Mapped Crest Logo and Crisp White Brand Tagline */}
          <div className="flex items-center gap-3 pb-5 border-b border-zinc-850">
            <img
              src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
              alt="Logo"
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-zinc-800"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-white leading-none">
                TOURNAMENT HUB
              </span>
              <span className="text-[9px] text-zinc-400 font-semibold tracking-wider uppercase mt-1 truncate">
                GLOBAL COMPETITION PLATFORM
              </span>
            </div>
          </div>

          {/* Standard Scaled Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isActive 
                      ? 'bg-zinc-850 text-white border-l-2 border-zinc-400' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account Info */}
        <div className="p-4 border-t border-zinc-850 space-y-3 bg-zinc-950">
          {profile && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-zinc-100 truncate">{profile.displayName || 'Sensei'}</span>
                <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">
                  {profile.role ? profile.role.replace('_', ' ') : 'spectator'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900/40 rounded-lg transition-all"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>

          <p className="text-[9px] text-zinc-500 font-medium text-center pt-2">
            © 2026 Tournament Hub • Global Competition Platform
          </p>
        </div>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-zinc-900">
        
        {/* Mobile Header (Saves room, standard dark theme) */}
        <header className="lg:hidden border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <img
              src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
              alt="Logo"
              className="h-8 w-8 rounded-md object-cover"
            />
            <span className="font-bold text-xs text-white tracking-tight leading-none">
              TOURNAMENT HUB
            </span>
          </div>
          <button onClick={() => toast.info("Expand menu on desktop workspace")}>
            <Menu className="h-5 w-5 text-zinc-400" />
          </button>
        </header>

        {/* Content Container - Standard padding scales */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto relative z-10">
          {children}
        </div>
      </main>

    </div>
  );
}