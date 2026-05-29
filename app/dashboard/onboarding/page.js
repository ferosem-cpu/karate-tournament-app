'use client';

import { useAuth } from '@/lib/auth-context';
import Protected from '@/components/protected';
import OrganizerOnboardingWizard from '@/components/organizer-onboarding-wizard';

export default function OnboardingPage() {
  const { profile } = useAuth();

  return (
    <Protected>
      {profile?.role === 'tournament_organizer' ? (
        <OrganizerOnboardingWizard />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
            <p className="text-muted-foreground">Only tournament organizers can access this page.</p>
          </div>
        </div>
      )}
    </Protected>
  );
}
