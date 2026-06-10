'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Protected from '@/components/protected';
import OrganizerOnboardingWizard from '@/components/organizer-onboarding-wizard';
import SpectatorOnboarding from '@/components/spectator-onboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const isOrganizerOrAdmin = profile?.role === 'tournament_organizer' || profile?.role === 'super_admin';
  const isSpectator = profile?.role === 'spectator';

  const handleComplete = () => {
    router.push('/dashboard');
    window.location.reload();
  };

  return (
    <Protected>
      {isOrganizerOrAdmin ? (
        <OrganizerOnboardingWizard />
      ) : isSpectator ? (
        <div className="max-w-4xl mx-auto py-6">
          <SpectatorOnboarding initialStep="sensei_dojo" onComplete={handleComplete} />
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
            <p className="text-muted-foreground">Only tournament organizers, super admins and spectators can access this page.</p>
          </div>
        </div>
      )}
    </Protected>
  );
}
