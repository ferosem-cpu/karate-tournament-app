'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/page-header';
import { Plus, Trophy, Search, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const filtered = tournaments.filter((t) =>
    [t.name, t.city, t.country, t.venue].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Tournaments"
        description="All tournaments managed on Kohai. Create, edit, and share public pages."
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/dashboard/tournaments/new"><Plus className="h-4 w-4 mr-2" /> New Tournament</Link>
          </Button>
        }
      />

      <div className="mb-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search tournaments…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <Card className="border-border/60"><CardContent className="p-10 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-16 text-center">
            <Trophy className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="font-semibold text-lg">No tournaments yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Create your first tournament to get started.</p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/dashboard/tournaments/new"><Plus className="h-4 w-4 mr-2" /> Create Tournament</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <Card key={t.id} className="border-border/60 bg-card overflow-hidden hover:border-primary/40 transition group">
              <div className="relative h-32 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden">
                {t.bannerUrl ? (
                  <img src={t.bannerUrl} alt="" className="h-full w-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition" />
                ) : (
                  <div className="h-full w-full bg-grid opacity-30" />
                )}
                <Badge variant="outline" className={`absolute top-3 right-3 ${statusColor(t.status)}`}>{statusLabel(t.status)}</Badge>
                {t.logoUrl && (
                  <img src={t.logoUrl} alt="" className="absolute bottom-3 left-3 h-12 w-12 rounded-md object-cover ring-2 ring-background shadow-lg" />
                )}
              </div>
              <CardContent className="p-5">
                <h3 className="font-bold text-lg truncate group-hover:text-primary transition">{t.name}</h3>
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {formatDate(t.startDate)} → {formatDate(t.endDate)}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {t.venue || '—'}, {t.city || '—'}</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/dashboard/tournaments/${t.id}`}>Manage</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/t/${t.id}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
