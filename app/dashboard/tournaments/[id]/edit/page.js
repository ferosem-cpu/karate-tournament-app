'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TournamentForm from '@/components/tournament-form';
import PageHeader from '@/components/page-header';
import { Loader2 } from 'lucide-react';

export default function EditTournamentPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return <div>Tournament not found.</div>;

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
