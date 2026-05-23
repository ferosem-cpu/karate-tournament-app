'use client';

import TournamentForm from '@/components/tournament-form';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/lib/auth-context';
import { isAdminOrOrganizer } from '@/lib/constants';
export default function NewTournamentPage() {
  const { profile } = useAuth();

  if (profile && !isAdminOrOrganizer(profile.role)) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You do not have permission to create tournaments.
        </p>
      </div>
    );
  }
    return (
    <>
      <PageHeader
        title="Create Tournament"
        description="Set up your tournament details, upload branding and define logistics."
        breadcrumb={[
          { label: 'Tournaments', href: '/dashboard/tournaments' },
          { label: 'New' }
        ]}
      />
      <TournamentForm />
    </>
  );
}