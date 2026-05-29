'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/page-header';
import TournamentForm from '@/components/tournament-form';
import { useAuth } from '@/lib/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { isAdminOrOrganizer } from '@/lib/constants';

export default function CreateTournamentPage() {
  const { profile, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    // Check if user is authorized to create tournaments
    if (!isAdminOrOrganizer(profile?.role)) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
    }
  }, [profile, loading]);

  if (loading) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Loading…</div>;
  }

  if (!authorized) {
    return (
      <>
        <PageHeader
          title="Create Tournament"
          description="Set up a new tournament with details, dates, venue information, and media assets."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only approved Tournament Organizers may create or modify tournaments.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Create Tournament"
        description="Set up a new tournament with details, dates, venue information, and media assets."
      />
      <TournamentForm />
    </>
  );
}
