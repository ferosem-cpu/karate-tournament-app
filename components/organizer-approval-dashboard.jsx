'use client';

import { useEffect, useState } from 'react';
import { query, collection, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { approveTournamentRegistration, rejectTournamentRegistration } from '@/lib/tournament-registration-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizerApprovalDashboard({ tournamentId, tournamentName }) {
  const { user, profile } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [athleteDetails, setAthleteDetails] = useState({});
  const [tournament, setTournament] = useState(null);
  const [tournamentLoading, setTournamentLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (s) => {
      if (s.exists()) setTournament({ id: s.id, ...s.data() });
      setTournamentLoading(false);
    }, () => setTournamentLoading(false));
    return () => unsub();
  }, [tournamentId]);

  const isOwner = tournament?.ownerId === user?.uid;
  const isSuperAdmin = profile?.role === 'super_admin';
  const hasAccess = isSuperAdmin || (profile?.role === 'tournament_organizer' && isOwner);

  if (tournamentLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking permissions…
        </CardContent>
      </Card>
    );
  }

  if (!hasAccess) {
    return (
      <Alert className="border-red-500/40 bg-red-500/5">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          Only tournament organizers owning this tournament or super admins can approve registrations.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    if (!tournamentId) return;

    const q = query(
      collection(db, 'tournament_registrations'),
      where('tournamentId', '==', tournamentId),
      where('status', '==', 'pending')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRegistrations(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoading(false);
    });

    return () => unsub();
  }, [tournamentId]);

  // Fetch athlete details for all registrations
  useEffect(() => {
    const fetchAthleteDetails = async () => {
      const details = {};
      for (const reg of registrations) {
        if (reg.athleteIds && Array.isArray(reg.athleteIds)) {
          for (const athleteId of reg.athleteIds) {
            if (!details[athleteId]) {
              try {
                const athleteDoc = await getDoc(doc(db, 'athletes', athleteId));
                if (athleteDoc.exists()) {
                  details[athleteId] = athleteDoc.data();
                }
              } catch (err) {
                console.error(`Failed to fetch athlete ${athleteId}:`, err);
              }
            }
          }
        }
      }
      setAthleteDetails(details);
    };

    if (registrations.length > 0) {
      fetchAthleteDetails();
    }
  }, [registrations]);

  const handleApprove = async (registrationId, registrationData) => {
    setProcessingId(registrationId);
    try {
      await approveTournamentRegistration(registrationId, registrationData);
      toast.success('Registration approved!');
    } catch (err) {
      toast.error(err.message || 'Failed to approve registration');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (registrationId) => {
    if (!confirm('Are you sure you want to reject this registration?')) return;

    setProcessingId(registrationId);
    try {
      await rejectTournamentRegistration(registrationId, 'Rejected by organizer');
      toast.success('Registration rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject registration');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pending registrations…
        </CardContent>
      </Card>
    );
  }

  if (registrations.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          No pending registrations awaiting approval.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Pending Registration Approvals</h3>
        <p className="text-sm text-muted-foreground mb-4">{registrations.length} submissions awaiting your review</p>
      </div>

      {registrations.map((reg) => (
        <Card key={reg.id} className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold">{reg.dojoName}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {new Date(reg.createdAt?.toDate?.() || reg.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                Pending Review
              </Badge>
            </div>

            <div className="mb-4 bg-secondary/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Athletes ({reg.athleteIds?.length || 0})</div>
              <div className="space-y-1">
                {reg.athleteIds?.map((athleteId) => {
                  const athlete = athleteDetails[athleteId];
                  return (
                    <div key={athleteId} className="text-xs text-foreground/80">
                      {athlete?.fullName || 'Loading...'}{athlete?.belt ? ` · ${athlete.belt}` : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(reg.id)}
                disabled={processingId === reg.id}
              >
                {processingId === reg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleApprove(reg.id, reg)}
                disabled={processingId === reg.id}
              >
                {processingId === reg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
