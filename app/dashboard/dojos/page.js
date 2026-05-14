'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function DojosPage() {
  return (
    <>
      <PageHeader title="Dojos" description="Manage dojo profiles, instructors, contacts and public visibility." />
      <Card className="border-border/60"><CardContent className="p-16 text-center">
        <Building2 className="h-10 w-10 mx-auto text-accent mb-3" />
        <h3 className="font-semibold text-lg">Coming in Phase 2</h3>
        <p className="text-sm text-muted-foreground mt-1">Dojo profiles with logo, contact info, geo coordinates and social media links.</p>
      </CardContent></Card>
    </>
  );
}
