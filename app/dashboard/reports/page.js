'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Tournament analytics, registration insights and export." />
      <Card className="border-border/60"><CardContent className="p-16 text-center">
        <BarChart3 className="h-10 w-10 mx-auto text-accent mb-3" />
        <h3 className="font-semibold text-lg">Coming soon</h3>
        <p className="text-sm text-muted-foreground mt-1">Aggregated stats across tournaments, dojos, and kohai.</p>
      </CardContent></Card>
    </>
  );
}
