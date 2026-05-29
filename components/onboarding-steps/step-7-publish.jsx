'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';

export default function Step7Publish({ wizardData, onNext }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    setBusy(true);
    try {
      // In a real app, save the tournament here
      await new Promise((r) => setTimeout(r, 1000));
      toast.success('Tournament published and going live!');
      setPublished(true);
      setTimeout(() => {
        router.push('/dashboard/tournaments');
      }, 2000);
    } catch (err) {
      toast.error(err.message || 'Failed to publish tournament');
    } finally {
      setBusy(false);
    }
  };

  if (published) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">🎉 Tournament Live!</h2>
          <p className="text-muted-foreground">
            Your tournament is now live and ready to receive registrations.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Ready to Launch?</h3>

      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Tournament Information</p>
              <p className="text-sm text-muted-foreground">{wizardData.tournamentInfo?.name || 'Configured'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Categories</p>
              <p className="text-sm text-muted-foreground">{wizardData.categories?.length || 0} categories created</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Tatamis</p>
              <p className="text-sm text-muted-foreground">{wizardData.tatamis?.length || 0} rings configured</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Registration Rules</p>
              <p className="text-sm text-muted-foreground">Configured</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-500/40 bg-blue-500/5">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300/90">
          Once published, your tournament will be visible to dojos and athletes. You can continue editing from the dashboard.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Save for Later
        </Button>
        <Button onClick={handlePublish} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 min-w-[160px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
          Publish Tournament
        </Button>
      </div>
    </div>
  );
}
