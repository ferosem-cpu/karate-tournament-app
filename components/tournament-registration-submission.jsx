'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { submitTournamentRegistration } from '@/lib/tournament-registration-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TournamentRegistrationSubmission({ tournamentId, dojoId, dojoName }) {
  const { user, profile } = useAuth();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState(new Set());

  // Only allow dojo_admin to see this
  if (profile?.role !== 'dojo_admin') {
    return null;
  }

  useEffect(() => {
    if (!dojoId) return;

    // Fetch athletes owned by this dojo
    const q = query(
      collection(db, 'athletes'),
      where('dojoId', '==', dojoId),
      where('ownerId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setAthletes(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoading(false);
    });

    return () => unsub();
  }, [dojoId, user.uid]);

  const toggleAthlete = (athleteId) => {
    const newSelected = new Set(selectedAthletes);
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId);
    } else {
      newSelected.add(athleteId);
    }
    setSelectedAthletes(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedAthletes.size === 0) {
      toast.error('Please select at least one athlete');
      return;
    }

    setSubmitting(true);
    try {
      await submitTournamentRegistration(
        tournamentId,
        dojoId,
        user.uid,
        Array.from(selectedAthletes),
        dojoName
      );

      toast.success('Registration submitted for approval');
      setSubmitted(true);
      setSelectedAthletes(new Set());
    } catch (err) {
      toast.error(err.message || 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading athletes…
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-300">Registration Submitted</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your tournament registration has been submitted for approval by the tournament organizer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">Submit Registration to Tournament</h3>

        {athletes.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No athletes found for your dojo. Please register athletes first.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-3">
              Select the athletes you want to register for this tournament ({selectedAthletes.size} selected)
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border border-border/40 rounded-lg p-4 bg-secondary/20">
              {athletes.map((athlete) => (
                <div key={athlete.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`athlete-${athlete.id}`}
                    checked={selectedAthletes.has(athlete.id)}
                    onCheckedChange={() => toggleAthlete(athlete.id)}
                  />
                  <Label
                    htmlFor={`athlete-${athlete.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{athlete.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {athlete.belt || 'Unranked'} · {athlete.eventType || 'N/A'}
                    </div>
                  </Label>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || selectedAthletes.size === 0}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit {selectedAthletes.size > 0 ? `(${selectedAthletes.size})` : ''} for Approval
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
