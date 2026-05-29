'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Step5Referees({ wizardData, onNext }) {
  const [busy, setBusy] = useState(false);

  const handleNext = () => {
    setBusy(true);
    setTimeout(() => {
      onNext({ referees: [] });
      setBusy(false);
    }, 500);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Assign Referees to Rings</h3>
      <p className="text-sm text-muted-foreground">
        Assign approved referees to each ring/tatami
      </p>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You can assign referees now or wait until closer to the tournament date. You can always update these assignments later.
        </AlertDescription>
      </Alert>

      <Card className="border-border/60 bg-secondary/20">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="mb-3">Referees will be available once they've been approved by admins.</p>
          <p className="text-xs">For now, you can proceed and assign referees later from your tournament dashboard.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
