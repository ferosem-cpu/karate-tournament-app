'use client';

import KohaiForm from '@/components/kohai-form';
import PageHeader from '@/components/page-header';

export default function NewKohaiPage() {
  return (
    <>
      <PageHeader
        title="Register Kohai"
        description="Add an athlete (Kohai) to the platform. Frontend term: Kohai · backend: athletes."
        breadcrumb={[{ label: 'Kohai', href: '/dashboard/kohai' }, { label: 'Register' }]}
      />
      <KohaiForm />
    </>
  );
}
