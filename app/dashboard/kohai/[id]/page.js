'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import KohaiForm from '@/components/kohai-form';
import AccessDenied from '@/components/access-denied';
import PageHeader from '@/components/page-header';
import { Loader2 } from 'lucide-react';

export default function EditKohaiPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getDoc(doc(db, 'athletes', id));
      if (s.exists()) {
        const athleteData = s.data();
        // Security check: allow if super_admin OR if user is the owner
        const isOwner = user?.uid === athleteData.ownerId;
        const isSuperAdmin = profile?.role === 'super_admin';
        
        if (!isOwner && !isSuperAdmin) {
          setAccessDenied(true);
        } else {
          setData(athleteData);
        }
      }
      setLoading(false);
    })();
  }, [id, user, profile]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );

  if (accessDenied) return <AccessDenied resource="this athlete" />;

  if (!data) return <div>Kohai not found.</div>;

  return (
    <>
      <PageHeader
        title="Edit Kohai"
        description={data.fullName}
        breadcrumb={[
          { label: 'Kohai', href: '/dashboard/kohai' },
          { label: data.fullName },
          { label: 'Edit' },
        ]}
      />
      <KohaiForm initial={data} id={id} />
    </>
  );
}
