'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Menu } from 'lucide-react';
import AppSidebar from '@/components/app-sidebar';
import Protected from '@/components/protected';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [sessionOnboarded, setSessionOnboarded] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionOnboarded(!!sessionStorage.getItem('sessionOnboarded'));
    }
  }, []);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Redirecting to sign in...</span>
      </div>
    );
  }

  return (
    <Protected>
      <div className="flex min-h-screen bg-zinc-900 text-zinc-100">
        <AppSidebar className="hidden lg:flex" />

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-64 p-0 border-zinc-800 bg-zinc-950">
            <AppSidebar
              className="flex h-full w-full"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main className="flex-1 flex flex-col min-w-0 relative bg-zinc-900">
          <header className="lg:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-3 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
                alt="Logo"
                className="h-8 w-8 rounded-md object-cover shrink-0"
              />
              <span className="font-bold text-xs text-white tracking-tight leading-none truncate">
                TOURNAMENT HUB
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white shrink-0"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </header>

          <div className="flex-1 p-6 md:p-8 overflow-y-auto relative z-10">
            {children}
          </div>
        </main>
      </div>
    </Protected>
  );
}
