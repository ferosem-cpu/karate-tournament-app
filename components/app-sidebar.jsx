'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Trophy,
  Users,
  ShieldCheck,
  Building2,
  Tags,
  Grid3x3,
  BarChart3,
  Settings,
  LogOut,
  Swords,
  ChevronRight,
  HardDrive,
  Bell,
  Sparkles,
  Lock,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/dashboard/kohai', label: 'Kohai', icon: Users },
  { href: '/dashboard/dojos', label: 'Dojos', icon: Building2 },
  { href: '/dashboard/categories', label: 'Event Categories', icon: Tags },
  { href: '/dashboard/tatamis', label: 'Tatamis', icon: Grid3x3 },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/media', label: 'Media', icon: HardDrive },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/users', label: 'User Management', icon: ShieldCheck },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();

  const initials = (profile?.displayName || user?.email || 'U')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-10 flex flex-col items-center gap-5 border-b border-gold-primary/40 bg-gradient-to-b from-sidebar-accent/60 to-sidebar/30">
        {/* Embossed Crest Logo - Tournament Hub Shield with Fists and Staffs */}
        <div className="relative h-32 w-32 flex items-center justify-center">
          <img
            src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
            alt="Tournament Hub Crest"
            className="h-32 w-32 rounded-xl object-cover ring-3 ring-gold-primary/60 shadow-2xl shadow-gold-primary/30 drop-shadow-2xl"
            style={{
              filter: 'drop-shadow(0 8px 16px rgba(212, 175, 55, 0.4)) drop-shadow(0 0 24px rgba(212, 175, 55, 0.2)) drop-shadow(inset 0 2px 8px rgba(255, 255, 255, 0.1))'
            }}
          />
        </div>
        <div className="text-center w-full">
          <h1 className="font-extrabold text-2xl tracking-tight leading-tight text-gold-primary" style={{textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 16px rgba(212, 175, 55, 0.2)'}}>
            TOURNAMENT HUB
          </h1>
          <p className="text-sm uppercase tracking-widest text-sidebar-foreground/70 mt-2 font-bold" style={{textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'}}>
            Global Competition Platform
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Standard Navigation */}
        {NAV
          .filter((item) => {
            if (
              item.href === '/dashboard/users' &&
              profile?.role !== 'super_admin'
            ) {
              return false;
            }

            return true;
          })
          .map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-all',
                  active
                    ? 'bg-gold-primary/10 text-sidebar-accent-foreground border-l-3 border-gold-primary'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'text-gold-primary' : '')} />
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto h-4 w-4 text-gold-primary" />}
              </Link>
            );
          })}

        {/* Organizer Features */}
        {profile?.role === 'tournament_organizer' && (
          <>
            <div className="my-3 px-2 py-2 text-xs uppercase font-bold text-sidebar-foreground/50 tracking-wider border-l-3 border-gold-primary/30 pl-3">
              Organizer
            </div>
            <Link
              href="/dashboard/onboarding"
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-all',
                pathname === '/dashboard/onboarding'
                  ? 'bg-gold-primary/10 text-sidebar-accent-foreground border-l-3 border-gold-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
              )}
            >
              <Sparkles className={cn('h-5 w-5', pathname === '/dashboard/onboarding' ? 'text-gold-primary' : '')} />
              <span>Setup Wizard</span>
              {pathname === '/dashboard/onboarding' && <ChevronRight className="ml-auto h-4 w-4 text-gold-primary" />}
            </Link>
          </>
        )}

        {/* Admin Features */}
        {profile?.role === 'super_admin' && (
          <>
            <div className="my-3 px-2 py-2 text-xs uppercase font-bold text-sidebar-foreground/50 tracking-wider border-l-3 border-gold-primary/30 pl-3">
              Admin
            </div>
            <Link
              href="/dashboard/admin/role-requests"
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-all',
                pathname.startsWith('/dashboard/admin/role-requests')
                  ? 'bg-gold-primary/10 text-sidebar-accent-foreground border-l-3 border-gold-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
              )}
            >
              <Lock className={cn('h-5 w-5', pathname.startsWith('/dashboard/admin/role-requests') ? 'text-gold-primary' : '')} />
              <span>Role Requests</span>
              {pathname.startsWith('/dashboard/admin/role-requests') && <ChevronRight className="ml-auto h-4 w-4 text-gold-primary" />}
            </Link>
            <Link
              href="/dashboard/admin/referee-applications"
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-all',
                pathname.startsWith('/dashboard/admin/referee-applications')
                  ? 'bg-gold-primary/10 text-sidebar-accent-foreground border-l-3 border-gold-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
              )}
            >
              <Users className={cn('h-5 w-5', pathname.startsWith('/dashboard/admin/referee-applications') ? 'text-gold-primary' : '')} />
              <span>Referee Applications</span>
              {pathname.startsWith('/dashboard/admin/referee-applications') && <ChevronRight className="ml-auto h-4 w-4 text-gold-primary" />}
            </Link>
            <Link
              href="/dashboard/admin/data-cleanup"
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-all',
                pathname.startsWith('/dashboard/admin/data-cleanup')
                  ? 'bg-gold-primary/10 text-sidebar-accent-foreground border-l-3 border-gold-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
              )}
            >
              <Trash2 className={cn('h-5 w-5', pathname.startsWith('/dashboard/admin/data-cleanup') ? 'text-gold-primary' : '')} />
              <span>Data Cleanup</span>
              {pathname.startsWith('/dashboard/admin/data-cleanup') && <ChevronRight className="ml-auto h-4 w-4 text-gold-primary" />}
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-gold-primary/20 p-4 bg-sidebar-accent/40">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.photoURL} />
            <AvatarFallback className="bg-gold-primary/30 text-bronze-accent text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{profile?.displayName || user?.email}</div>
            <div className="text-xs uppercase tracking-wider text-sidebar-foreground/60 truncate font-medium">
              {(profile?.role || 'organizer').replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start mt-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-gold-primary/10">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </aside>
  );
}
