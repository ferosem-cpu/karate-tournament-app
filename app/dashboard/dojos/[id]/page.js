'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DojoForm from '@/components/dojo-form';
import PageHeader from '@/components/page-header';
import { Loader2 } from 'lucide-react';

export default function EditDojoPage() {
  const { id } = useParams();
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
