'use client';

import TournamentForm from '@/components/tournament-form';
import PageHeader from '@/components/page-header';

export default function NewTournamentPage() {
  return (
    <>
      <PageHeader
        title="Create Tournament"
        description="Set up your tournament details, upload branding and define logistics."
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: 'New' }]}
      />
      <TournamentForm />
    </>
  );
}
