'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Protected from '@/components/protected';
import AccessDenied from '@/components/access-denied';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Swords } from 'lucide-react';
import KumiteScoreboard from '@/components/kumite-scoreboard';
import KataScoreboard from '@/components/kata-scoreboard';
import { MATCH_STATUS_META } from '@/lib/constants';
import { startMatchTimer } from '@/lib/match-engine';
import { toast } from 'sonner';

export default function RefereeConsole() {
  const { matchId } = useParams();
  const { profile } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const canScore =
    profile?.role === 'referee' || profile?.role === 'super_admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'matches', matchId), (s) => {
      if (s.exists()) setMatch({ id: s.id, ...s.data() });
      else setMatch(null);
      setLoading(false);
    });
    return () => unsub();
  }, [matchId]);

  if (loading) return <Protected><div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div></Protected>;
  if (!match) return <Protected><div className="min-h-screen flex items-center justify-center text-muted-foreground">Match not found.</div></Protected>;

  if (!canScore) {
    return (
      <Protected>
        <AccessDenied resource="the referee scoring console" />
      </Protected>
    );
  }

  const meta = MATCH_STATUS_META[match.status] || MATCH_STATUS_META.queued;

  return (
    <Protected>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-gradient-to-b from-black to-black/95 border-b border-border/60 backdrop-blur">
          <div className="px-4 md:px-6 py-3 flex items-center gap-3 max-w-[1400px] mx-auto">
            <Button asChild variant="ghost" size="icon"><Link href={match.tatamiId ? `/tatami/${match.tatamiId}` : '/dashboard'}><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div className="h-9 w-9 rounded-md gradient-red-gold flex items-center justify-center"><Swords className="h-4 w-4 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{match.categoryName}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                {match.eventType} · Round {match.round}{match.totalRounds ? `/${match.totalRounds}` : ''} · {match.tatamiName || 'Unassigned'}
              </div>
            </div>
            <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
          </div>
        </header>
        <main className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
          {match.eventType === 'Kumite' ? <KumiteScoreboard match={match} /> : <KataScoreboard match={match} />}
        </main>
      </div>
    </Protected>
  );
}
