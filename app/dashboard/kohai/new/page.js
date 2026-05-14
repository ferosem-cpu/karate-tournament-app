'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function NewKohaiPage() {
  return (
    <>
      <PageHeader
        title="Register Kohai"
        description="Register a new athlete (Kohai) — coming in Phase 2."
        breadcrumb={[{ label: 'Kohai', href: '/dashboard/kohai' }, { label: 'Register' }]}
      />
      <Card className="border-border/60"><CardContent className="p-16 text-center">
        <Construction className="h-10 w-10 mx-auto text-accent mb-3" />
        <h3 className="font-semibold text-lg">Coming in Phase 2</h3>
        <p className="text-sm text-muted-foreground mt-1">Full Kohai registration with profile photo, belt, weight, dojo and category linkage.</p>
      </CardContent></Card>
    </>
  );
}
