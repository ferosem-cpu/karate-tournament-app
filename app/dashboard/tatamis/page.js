'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Grid3x3 } from 'lucide-react';

export default function TatamisPage() {
  return (
    <>
      <PageHeader title="Tatamis" description="Configure competition mats and assign referees." />
      <Card className="border-border/60"><CardContent className="p-16 text-center">
        <Grid3x3 className="h-10 w-10 mx-auto text-accent mb-3" />
        <h3 className="font-semibold text-lg">Coming in Phase 3</h3>
        <p className="text-sm text-muted-foreground mt-1">Tatami management with status (active/paused/closed) and referee assignment.</p>
      </CardContent></Card>
    </>
  );
}
