'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { publishTournamentFromWizard } from '@/lib/wizard-publish';

export default function Step7Publish({ wizardData, onNext }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    if (!user?.uid) {
      toast.error('You must be signed in to publish');
      return;
    }
    setBusy(true);
    try {
      const tournamentId = await publishTournamentFromWizard(
        wizardData,
        user.uid,
        profile?.displayName || user.displayName || ''
      );
      toast.success('Tournament published and going live!');
      setPublished(true);
      setTimeout(() => {
        router.push(`/dashboard/tournaments/${tournamentId}`);
      }, 1500);
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
        <p className="text-sm text-muted-foreground">Redirecting to tournament…</p>
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
              <p className="text-sm text-muted-foreground">
                {wizardData.registrationRules?.requireApproval !== false
                  ? 'Organizer approval required'
                  : 'Instant registration'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handlePublish}
          disabled={busy}
          className="bg-primary hover:bg-primary/90 min-w-[180px]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
          Publish Tournament
        </Button>
      </div>
    </div>
  );
}
