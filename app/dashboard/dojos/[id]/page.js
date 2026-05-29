'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DojoForm from '@/components/dojo-form';
import PageHeader from '@/components/page-header';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function EditDojoPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'dojos', id));
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return <div>Dojo not found.</div>;
  if (
  profile?.role !== 'super_admin' &&
  data.ownerId !== user?.uid
) {
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold">
        Access Denied
      </h2>
      <p className="text-muted-foreground mt-2">
        You do not have permission to edit this dojo.
      </p>
    </div>
  );
}

  return (
    <>
      <PageHeader
        title="Edit Dojo"
        description={data.name}
        breadcrumb={[{ label: 'Dojos', href: '/dashboard/dojos' }, { label: data.name }, { label: 'Edit' }]}
      />
      <DojoForm initial={data} id={id} />
    </>
  );
}
