'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Building2,
  Tags,
  Grid3x3,
  BarChart3,
  Settings,
  LogOut,
  Swords,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/dashboard/kohai', label: 'Kohai', icon: Users },
  { href: '/dashboard/dojos', label: 'Dojos', icon: Building2 },
  { href: '/dashboard/categories', label: 'Categories', icon: Tags },
  { href: '/dashboard/tatamis', label: 'Tatamis', icon: Grid3x3 },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();

  const initials = (profile?.displayName || user?.email || 'U')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <img
          src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
          alt="Tournament Hub"
          className="h-10 w-10 rounded-md object-cover ring-1 ring-sidebar-border shadow-md shadow-primary/20"
        />
        <div>
          <div className="font-bold tracking-tight leading-none">TOURNAMENT HUB</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Global Competition</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary' : '')} />
              <span>{item.label}</span>
              {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.displayName || user?.email}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {(profile?.role || 'organizer').replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start mt-1 text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </aside>
  );
}
