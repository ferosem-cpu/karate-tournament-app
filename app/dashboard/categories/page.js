'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Tags } from 'lucide-react';

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Kata & Kumite — age, gender, belt and weight categories." />
      <Card className="border-border/60"><CardContent className="p-16 text-center">
        <Tags className="h-10 w-10 mx-auto text-accent mb-3" />
        <h3 className="font-semibold text-lg">Coming in Phase 3</h3>
        <p className="text-sm text-muted-foreground mt-1">Configure Kata & Kumite categories with age, gender, belt and weight rules.</p>
      </CardContent></Card>
    </>
  );
}
