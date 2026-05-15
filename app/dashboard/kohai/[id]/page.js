'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import KohaiForm from '@/components/kohai-form';
import PageHeader from '@/components/page-header';
import { Loader2 } from 'lucide-react';

export default function EditKohaiPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const s = await getDoc(doc(db, 'athletes', id)); if (s.exists()) setData(s.data()); setLoading(false); })(); }, [id]);
  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return <div>Kohai not found.</div>;
  return (
    <>
      <PageHeader title="Edit Kohai" description={data.fullName} breadcrumb={[{ label: 'Kohai', href: '/dashboard/kohai' }, { label: data.fullName }, { label: 'Edit' }]} />
      <KohaiForm initial={data} id={id} />
    </>
  );
}
