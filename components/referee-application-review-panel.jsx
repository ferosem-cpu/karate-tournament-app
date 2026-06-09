'use client';

import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  writeBatch,
  getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

// Standard Named Shadcn UI Imports
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Standard Lucide Icon Imports
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  AlertTriangle,
  User,
  Calendar,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function RefereeApplicationReviewPanel() {
  const { profile, user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Security Clearance Verification (Super Admin or Tournament Organizer)
  const isAuthorized = profile?.role === 'super_admin' || profile?.role === 'tournament_organizer';

  useEffect(() => {
    if (!isAuthorized || !user?.uid) {
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    const setupListener = async () => {
      try {
        let ownedTournamentIds = [];
        if (profile?.role === 'tournament_organizer') {
          const tQuery = query(collection(db, 'tournaments'), where('ownerId', '==', user.uid));
          const tSnap = await getDocs(tQuery);
          ownedTournamentIds = tSnap.docs.map(d => d.id);
        }

        const q = query(
          collection(db, 'referee_applications'), 
          where('status', '==', 'pending')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));

          if (profile?.role === 'tournament_organizer') {
            const filtered = docs.filter(app => app.tournamentId && ownedTournamentIds.includes(app.tournamentId));
            setApplications(filtered);
          } else if (profile?.role === 'super_admin') {
            const filtered = docs.filter(app => !app.tournamentId);
            setApplications(filtered);
          } else {
            setApplications([]);
          }
          setLoading(false);
        }, (err) => {
          console.error("Firestore loading error:", err);
          toast.error("Failed to load applications list");
          setLoading(false);
        });
      } catch (err) {
        console.error("Error setting up referee applications listener:", err);
        setLoading(false);
      }
    };

    setupListener();

    return () => unsubscribe();
  }, [isAuthorized, user, profile]);

  const handleReviewAction = async (app, targetStatus) => {
    if (!app || !app.id || !app.userId) {
      toast.error("Invalid application data references.");
      return;
    }

    setProcessingId(app.id);

    try {
      const batch = writeBatch(db);

      // 1. Update status on the referee application document
      const appRef = doc(db, 'referee_applications', app.id);
      batch.update(appRef, { status: targetStatus });

      // 2. If approved, transition user document role metadata to 'referee' (unless user is already a dojo_admin, super_admin, or tournament_organizer)
      if (targetStatus === 'approved') {
        const userRef = doc(db, 'users', app.userId);
        const userSnap = await getDoc(userRef);
        const currentRole = userSnap.exists() ? userSnap.data().role : null;
        if (currentRole !== 'dojo_admin' && currentRole !== 'super_admin' && currentRole !== 'tournament_organizer') {
          batch.update(userRef, { role: 'referee' });
        }
      }

      await batch.commit();
      
      toast.success(
        targetStatus === 'approved' 
          ? `Accreditation approved for ${app.name}. User upgraded to Referee.` 
          : `Accreditation request rejected.`
      );
    } catch (err) {
      console.error("Accreditation write failure:", err);
      toast.error("An error occurred while updating status.");
    } finally {
      setProcessingId(null);
    }
  };

  // 1. Authorization Render Check
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto mt-8 px-4">
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300 font-medium">
            This administration review panel is restricted. You must have super_admin or tournament_organizer permissions to access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-900 pb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-zinc-500" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Referee Applications Review
          </h1>
        </div>
        <p className="text-sm text-zinc-500">
          Verify certifications, belt designations, clinic credentials, and grant referee role credentials.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-500 ml-2">Parsing applications...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950">
          <ShieldCheck className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All Clear</h3>
          <p className="text-xs text-zinc-400 mt-1">
            There are no pending referee applications awaiting review at this time.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-400" />
                      <span>{app.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Requested Belt Level: <b className="text-zinc-800 dark:text-zinc-200">{app.beltLevel || 'N/A'}</b>
                    </CardDescription>
                    {app.tournamentName && (
                      <CardDescription className="text-xs text-amber-500 dark:text-amber-400 font-semibold mt-1">
                        Target Tournament: <span>{app.tournamentName}</span>
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {app.rank || 'Unknown Rank'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-xs border-t border-b border-zinc-100 dark:border-zinc-900 py-3">
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-400 uppercase tracking-wide block">Regional / National Licenses</span>
                    <p className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{app.certifications || 'No certifications provided'}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-zinc-400 uppercase tracking-wide block">Clinic Verification</span>
                    {app.clinicCertificateUrl ? (
                      <a 
                        href={app.clinicCertificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors"
                      >
                        <span>View Clinic Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-500">No verification link uploaded</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Applied on: {app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                  </span>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReviewAction(app, 'rejected')}
                      disabled={processingId !== null}
                      className="border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs py-1.5 px-3 rounded-lg"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      <span>Deny</span>
                    </Button>

                    <Button 
                      size="sm"
                      onClick={() => handleReviewAction(app, 'approved')}
                      disabled={processingId !== null}
                      className="bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 text-xs py-1.5 px-3 rounded-lg font-semibold"
                    >
                      {processingId === app.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>Approve Accreditation</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}