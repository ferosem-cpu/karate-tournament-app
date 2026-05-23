'use client';

import DojoForm from '@/components/dojo-form';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/lib/auth-context';
export default function NewDojoPage() {
  const { profile } = useAuth();

  const allowedRoles = [
    'dojo_admin',
    'coach',
    'tournament_organizer',
    'super_admin'
  ];

  if (profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You do not have permission to create dojos.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Create Dojo"
        description="Add a dojo to the platform."
        breadcrumb={[
          { label: 'Dojos', href: '/dashboard/dojos' },
          { label: 'New' }
        ]}
      />
      <DojoForm />
    </>
  );
}
