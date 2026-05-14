'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { Plus, Upload, Users } from 'lucide-react';

export default function KohaiPage() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'athletes'), (s) => {
      setAthletes(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return (
    <>
      <PageHeader
        title="Kohai"
        description="Registered athletes across dojos. Frontend wording 'Kohai' · backend collection 'athletes'."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/dashboard/kohai/bulk-upload"><Upload className="h-4 w-4 mr-2" /> Bulk Upload</Link></Button>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link href="/dashboard/kohai/new"><Plus className="h-4 w-4 mr-2" /> Register Kohai</Link></Button>
          </>
        }
      />
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : athletes.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="font-semibold text-lg">No Kohai registered yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">Add kohai individually or use bulk upload.</p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline"><Link href="/dashboard/kohai/bulk-upload"><Upload className="h-4 w-4 mr-2" /> Bulk Upload</Link></Button>
                <Button asChild className="bg-primary hover:bg-primary/90"><Link href="/dashboard/kohai/new"><Plus className="h-4 w-4 mr-2" /> Register Kohai</Link></Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {athletes.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-secondary/30">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(a.fullName || 'K').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.fullName || '—'}</div>
                    <div className="text-xs text-muted-foreground">{a.dojo || '—'} · {a.belt || '—'}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{a.gender || '—'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
