'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Grid3x3, FileDown, Trophy, Loader2, Swords } from 'lucide-react';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

export default function PublicTournamentPage() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', id), (s) => {
      if (s.exists()) setT({ id: s.id, ...s.data() });
      else setT(null);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );

  if (!t) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <Trophy className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">Tournament not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative h-72 md:h-[480px] bg-gradient-to-br from-black via-zinc-950 to-red-950 overflow-hidden">
        {t.bannerUrl ? (
          <img src={t.bannerUrl} alt="" className="h-full w-full object-cover opacity-60" />
        ) : <div className="h-full w-full bg-grid opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md gradient-red-gold flex items-center justify-center">
              <Swords className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase">Kohai Platform</span>
          </div>
          <Badge variant="outline" className={statusColor(t.status)}>{statusLabel(t.status)}</Badge>
        </div>
        <div className="absolute bottom-0 inset-x-0 px-6 md:px-12 pb-8">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end gap-6">
            {t.logoUrl ? (
              <img src={t.logoUrl} alt="" className="h-24 w-24 md:h-32 md:w-32 rounded-xl object-cover ring-4 ring-background shadow-2xl" />
            ) : (
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-xl gradient-red-gold flex items-center justify-center ring-4 ring-background shadow-2xl">
                <Trophy className="h-12 w-12 md:h-16 md:w-16 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{t.name}</h1>
              {t.organizerName && <p className="text-base md:text-lg text-muted-foreground mt-2">Organized by {t.organizerName}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {/* Info grid */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <InfoCard icon={Calendar} title="Dates" lines={[`${formatDate(t.startDate)}`, `→ ${formatDate(t.endDate)}`]} />
          <InfoCard icon={MapPin} title="Venue" lines={[t.venue || '—', `${t.city || ''}${t.city && t.country ? ', ' : ''}${t.country || ''}`]} />
          <InfoCard icon={Grid3x3} title="Tatamis" lines={[`${t.numberOfTatamis || 1} competition areas`]} />
        </div>

        {t.description && (
          <Card className="border-border/60 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-3">About the Tournament</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{t.description}</p>
            </CardContent>
          </Card>
        )}

        {/* CTA: Brochure + Registration */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/5 mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">Tournament Brochure</h3>
                <p className="text-sm text-muted-foreground">Download the official brochure with categories, schedule and rules.</p>
              </div>
              {t.brochureUrl ? (
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                  <a href={t.brochureUrl} target="_blank" rel="noopener noreferrer" download><FileDown className="h-5 w-5 mr-2" /> Download Brochure</a>
                </Button>
              ) : (
                <Button size="lg" disabled variant="outline">Brochure coming soon</Button>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-border/60 flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div>
                <div className="text-sm font-semibold">Registration {t.status === 'registration_open' ? 'is OPEN' : 'status: ' + statusLabel(t.status)}</div>
                {t.registrationDeadline && <div className="text-xs text-muted-foreground">Deadline: {formatDate(t.registrationDeadline)}</div>}
              </div>
              <Button disabled={t.status !== 'registration_open'} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Register Kohai
              </Button>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-muted-foreground py-8">
          Powered by <span className="text-gold font-semibold">KOHAI</span> · Karate Tournament Platform
        </footer>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, lines }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </div>
        {lines.map((l, i) => (
          <div key={i} className={i === 0 ? 'font-semibold' : 'text-sm text-muted-foreground'}>{l}</div>
        ))}
      </CardContent>
    </Card>
  );
}
