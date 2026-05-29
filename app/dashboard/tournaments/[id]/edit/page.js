'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TournamentForm from '@/components/tournament-form';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/lib/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import permissions from '@/lib/permissions';

export default function EditTournamentPage() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (authLoading || !data) return;
    
    // Check if user is authorized to edit this tournament
    const isAuthorized = permissions.canEditTournament(user?.uid, profile?.role, data);
    setAuthorized(isAuthorized);
  }, [authLoading, user, profile, data]);

  if (loading || authLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  if (!data) {
    return <div>Tournament not found.</div>;
  }

  if (!authorized) {
    return (
      <>
        <PageHeader
          title="Edit Tournament"
          description={data.name}
          breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: data.name, href: `/dashboard/tournaments/${id}` }, { label: 'Edit' }]}
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only approved Tournament Organizers may create or modify tournaments.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Tournament"
        description={data.name}
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: data.name, href: `/dashboard/tournaments/${id}` }, { label: 'Edit' }]}
      />
      <TournamentForm initial={data} id={id} />
    </>
  );
}
