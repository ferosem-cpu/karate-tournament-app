'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export default function BulkUploadPage() {
  return (
    <>
      <PageHeader
        title="Bulk Kohai Upload"
        description="CSV/Excel bulk import with validation preview — coming in Phase 2."
        breadcrumb={[{ label: 'Kohai', href: '/dashboard/kohai' }, { label: 'Bulk Upload' }]}
      />
      <Card className="border-border/60"><CardContent className="p-16 text-center">
        <Upload className="h-10 w-10 mx-auto text-accent mb-3" />
        <h3 className="font-semibold text-lg">Coming in Phase 2</h3>
        <p className="text-sm text-muted-foreground mt-1">Drag & drop CSV/Excel with duplicate detection, validation preview and progress.</p>
      </CardContent></Card>
    </>
  );
}
