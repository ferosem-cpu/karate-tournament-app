'use client';

import KohaiForm from '@/components/kohai-form';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/lib/auth-context';

export default function NewKohaiPage() {
  const { profile } = useAuth();

  const allowedRoles = [
    'coach',
    'dojo_admin',
    'tournament_organizer',
    'super_admin'
  ];

  if (profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You do not have permission to register Kohai.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Register Kohai"
        description="Add an athlete (Kohai) to the platform. Frontend term: Kohai · backend: athletes."
        breadcrumb={[
          { label: 'Kohai', href: '/dashboard/kohai' },
          { label: 'Register' }
        ]}
      />
      <KohaiForm />
    </>
  );
}
