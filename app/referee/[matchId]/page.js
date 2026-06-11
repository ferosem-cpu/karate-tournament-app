'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Protected from '@/components/protected';
import AccessDenied from '@/components/access-denied';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Swords, Play, Trophy } from 'lucide-react';
import KumiteScoreboard from '@/components/kumite-scoreboard';
import KataScoreboard from '@/components/kata-scoreboard';
import { MATCH_STATUS_META } from '@/lib/constants';
import { startMatchTimer, callMatchOnTatami } from '@/lib/match-engine';
import { toast } from 'sonner';

export default function RefereeConsole() {
  const router = useRouter();
  const { matchId } = useParams();
  const { user, profile } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMatchReferee, setIsMatchReferee] = useState(false);
  const [isTournamentOwner, setIsTournamentOwner] = useState(false);
  const [isAssignedReferee, setIsAssignedReferee] = useState(false);
  const [nextMatch, setNextMatch] = useState(null);

  const canScore =
    profile?.role === 'referee' ||
    profile?.role === 'super_admin' ||
    isMatchReferee ||
    isTournamentOwner ||
    isAssignedReferee;

  useEffect(() => {
    if (!matchId) return;
    let unsubNext = () => {};

    const unsub = onSnapshot(doc(db, 'matches', matchId), async (s) => {
      if (s.exists()) {
        const matchData = { id: s.id, ...s.data() };
        setMatch(matchData);

        if (matchData.tatamiId) {
          const qNext = query(
            collection(db, 'matches'),
            where('tatamiId', '==', matchData.tatamiId),
            where('status', 'in', ['queued', 'called'])
          );
          unsubNext = onSnapshot(qNext, (snap) => {
            const queuedMatches = snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((m) => !m.isBye && m.id !== matchId)
              .sort((a, b) => {
                if (a.queueOrder !== undefined && b.queueOrder !== undefined) {
                  return a.queueOrder - b.queueOrder;
                }
                return (a.round - b.round) || (a.matchInRound - b.matchInRound);
              });
            setNextMatch(queuedMatches[0] || null);
          });
        }

        if (user?.uid && matchData.tournamentId) {
          try {
            // Check if user is the assigned referee on the tatami
            if (matchData.tatamiId) {
              const tatamiSnap = await getDoc(doc(db, 'tatamis', matchData.tatamiId));
              if (tatamiSnap.exists()) {
                const tatamiData = tatamiSnap.data();
                setIsAssignedReferee(tatamiData.assignedRefereeId === user.uid);
              } else {
                setIsAssignedReferee(false);
              }
            } else {
              setIsAssignedReferee(false);
            }

            const tSnap = await getDoc(doc(db, 'tournaments', matchData.tournamentId));
            const tournament = tSnap.exists() ? tSnap.data() : null;
            if (tournament) {
              setIsTournamentOwner(tournament.ownerId === user.uid);
              if (tournament.status !== 'completed') {
                const qRefs = query(
                  collection(db, 'referee_applications'),
                  where('tournamentId', '==', matchData.tournamentId),
                  where('userId', '==', user.uid),
                  where('status', '==', 'approved')
                );
                const refsSnap = await getDocs(qRefs);
                setIsMatchReferee(!refsSnap.empty);
              } else {
                setIsMatchReferee(false);
              }
            } else {
              setIsTournamentOwner(false);
              setIsMatchReferee(false);
            }
          } catch (err) {
            console.error("Error checking referee application/details:", err);
            setIsMatchReferee(false);
            setIsTournamentOwner(false);
            setIsAssignedReferee(false);
          }
        }
      } else {
        setMatch(null);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      unsubNext();
    };
  }, [matchId, user]);

  const handleCallNextMatch = async () => {
    if (!nextMatch) return;
    try {
      await callMatchOnTatami(nextMatch.id);
      toast.success('Next match called to tatami successfully!');
      router.push(`/referee/${nextMatch.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to call next match');
    }
  };

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
          {/* Completed Match Banner */}
          {(match.status === 'completed' || match.status === 'verified') && (
            <Card className="border-2 border-emerald-500/40 bg-zinc-950/80 backdrop-blur-md mb-6 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Match Completed</div>
                  <h2 className="text-xl font-black mt-1">
                    Winner: <span className="text-emerald-300">{match.winner?.name || 'TBD'}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {match.winner?.reason?.toUpperCase() || 'POINTS'} {match.winner?.notes ? `· ${match.winner.notes}` : ''}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 w-full md:w-auto justify-end">
                  {nextMatch ? (
                    <Button onClick={handleCallNextMatch} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-auto">
                      <Play className="h-4 w-4 mr-2 animate-pulse" /> Call Next Match ({nextMatch.aka?.name || 'TBD'} vs {nextMatch.ao?.name || 'TBD'})
                    </Button>
                  ) : (
                    <div className="text-right w-full md:w-auto flex flex-col items-end">
                      <span className="text-xs text-muted-foreground block mb-2 font-medium">No more matches queued on this tatami</span>
                      {match.tatamiId && (
                        <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
                          <Link href={`/tatami/${match.tatamiId}`}>
                            Return to Tatami Screen
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {match.eventType === 'Kumite' ? <KumiteScoreboard match={match} /> : <KataScoreboard match={match} />}
        </main>
      </div>
    </Protected>
  );
}
