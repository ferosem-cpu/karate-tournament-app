'use client';

import DojoForm from '@/components/dojo-form';
import PageHeader from '@/components/page-header';

export default function NewDojoPage() {
  return (
    <>
      <PageHeader
        title="Create Dojo"
        description="Add a dojo to the platform."
        breadcrumb={[{ label: 'Dojos', href: '/dashboard/dojos' }, { label: 'New' }]}
      />
      <DojoForm />
    </>
  );
}
