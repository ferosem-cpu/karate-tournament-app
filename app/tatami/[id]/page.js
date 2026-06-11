'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity, Pause, Lock, Clock, ChevronRight, Maximize2, Swords, User, Grid3x3, Play } from 'lucide-react';
import { MATCH_STATUS_META, beltClass } from '@/lib/constants';
import { callMatchOnTatami, startMatchTimer } from '@/lib/match-engine';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

const TATAMI_STATUS_META = {
  active:  { icon: Activity, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', label: 'Active' },
  paused:  { icon: Pause,    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',     label: 'Paused' },
  closed:  { icon: Lock,     cls: 'bg-zinc-700 text-zinc-300 border-zinc-600',                label: 'Closed' },
  delayed: { icon: Clock,    cls: 'bg-orange-500/15 text-orange-300 border-orange-500/40',  label: 'Delayed' },
};

export default function TatamiOpsScreen() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [tatami, setTatami] = useState(null);
  const [matches, setMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [time, setTime] = useState(new Date());

  const [isTournamentReferee, setIsTournamentReferee] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'tatamis', id), (s) => setTatami(s.exists() ? { id: s.id, ...s.data() } : null));
    const u2 = onSnapshot(query(collection(db, 'matches'), where('tatamiId', '==', id)), (s) => {
      setMatches(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, [id]);

  useEffect(() => {
    if (tatami?.tournamentId) {
      const u = onSnapshot(doc(db, 'tournaments', tatami.tournamentId), (s) => setTournament(s.exists() ? { id: s.id, ...s.data() } : null));
      return () => u();
    }
  }, [tatami?.tournamentId]);

  useEffect(() => {
    if (!user || !tatami?.tournamentId) {
      setCheckingRole(false);
      return;
    }
    const q = query(
      collection(db, 'referee_applications'),
      where('tournamentId', '==', tatami.tournamentId),
      where('userId', '==', user.uid),
      where('status', '==', 'approved')
    );
    const unsub = onSnapshot(q, (s) => {
      setIsTournamentReferee(!s.empty);
      setCheckingRole(false);
    }, (err) => {
      console.error(err);
      setCheckingRole(false);
    });
    return () => unsub();
  }, [user, tatami?.tournamentId]);

  const isOwner = tournament?.ownerId === user?.uid;
  const isSuperAdmin = profile?.role === 'super_admin';
  const isOrganizer = isOwner;
  const isRef = profile?.role === 'referee' || isTournamentReferee || tatami?.assignedRefereeId === user?.uid;
  const hasAccess = isSuperAdmin || isOrganizer || isRef;
  const checking = !tatami || checkingRole;

  if (checking) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading tatami…</div>;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Lock className="h-16 w-16 text-destructive mb-4 animate-pulse" />
        <h1 className="text-2xl font-black tracking-tight text-white mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {!user 
            ? "You must be logged in to access the Tatami operations screen." 
            : "You do not have permission to access the operations screen for this Tatami. Only the assigned tournament organizer, registered referees for this tournament, or system administrators can access these controls."}
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href={!user ? "/login" : "/dashboard"}>
            {!user ? "Log In" : "Return to Dashboard"}
          </Link>
        </Button>
      </div>
    );
  }

  const meta = TATAMI_STATUS_META[tatami.status] || TATAMI_STATUS_META.active;
  const SIcon = meta.icon;

  const active = matches.find((m) => m.status === 'active' || m.status === 'paused' || m.status === 'on_tatami');
  const queued = matches.filter((m) => (m.status === 'queued' || m.status === 'called') && !m.isBye).sort((a, b) => {
    if (a.queueOrder !== undefined && b.queueOrder !== undefined) {
      return a.queueOrder - b.queueOrder;
    }
    return (a.round - b.round) || (a.matchInRound - b.matchInRound);
  });
  const onDeck = queued.slice(0, 3);
  const upcoming = queued.slice(3, 10);
  const recent = matches.filter((m) => m.status === 'completed' || m.status === 'verified').sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0)).slice(0, 5);

  const goFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };

  const callNext = async () => {
    if (active) return toast.error('There is already a match on this tatami');
    const next = queued[0];
    if (!next) return toast.error('No queued matches');
    try { await callMatchOnTatami(next.id); toast.success(`Match #${next.matchInRound + 1} called to tatami`); }
    catch (e) { toast.error(e.message); }
  };

  const handleStartBout = async (matchId) => {
    try {
      await startMatchTimer(matchId);
      toast.success('Bout started successfully! Scoring is now enabled.');
    } catch (e) {
      toast.error(e.message || 'Failed to start bout');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-black via-zinc-950 to-black/95 border-b border-border/60 backdrop-blur">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-md gradient-red-gold flex items-center justify-center shadow-lg shadow-primary/40"><Grid3x3 className="h-6 w-6 text-white" /></div>
            <div>
              <div className="text-2xl md:text-3xl font-black tracking-tight">{tatami.name}</div>
              <div className="text-xs text-muted-foreground">{tournament?.name || tatami.tournamentName || '—'} · {tatami.assignedRefereeName || 'No referee assigned'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${meta.cls} text-sm px-3 py-1.5`}><SIcon className="h-4 w-4 mr-1.5" /> {meta.label}</Badge>
            <div className="text-right hidden md:block">
              <div className="text-2xl font-bold tabular-nums">{time.toLocaleTimeString('en-US', { hour12: false }).slice(0, 8)}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{time.toLocaleDateString()}</div>
            </div>
            <Button variant="outline" size="icon" onClick={goFullscreen}><Maximize2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto">
        {/* Current match */}
        <section className="mb-6">
          <SectionTitle title="Current Match" subtitle="Live on this tatami" />
          {active ? (
            <CurrentMatchCard match={active} onStartBout={handleStartBout} />
          ) : (
            <Card className="border-2 border-dashed border-border/60"><CardContent className="p-12 text-center">
              <Swords className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <div className="font-semibold">No active match</div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{queued.length > 0 ? `${queued.length} matches waiting in queue` : 'Queue is empty'}</p>
              {queued.length > 0 && <Button onClick={callNext} className="bg-primary hover:bg-primary/90"><ChevronRight className="h-4 w-4 mr-1" /> Call Next Match</Button>}
            </CardContent></Card>
          )}
        </section>

        {/* On Deck */}
        {onDeck.length > 0 && (
          <section className="mb-6">
            <SectionTitle title="On Deck" subtitle="Next up" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {onDeck.map((m, i) => <UpcomingMatchCard key={m.id} match={m} index={i + 1} />)}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {upcoming.length > 0 && (
            <section>
              <SectionTitle title="Queue" subtitle={`${upcoming.length} more matches`} />
              <Card className="border-border/60"><CardContent className="p-0 divide-y divide-border">
                {upcoming.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 p-3">
                    <Badge variant="outline" className="text-[10px] w-10 justify-center">#{i + 4}</Badge>
                    <div className="flex-1 min-w-0 text-sm"><span className="font-medium">{m.aka?.name || 'TBD'}</span> <span className="text-muted-foreground">vs</span> <span className="font-medium">{m.ao?.name || 'TBD'}</span></div>
                    <div className="text-[10px] text-muted-foreground">{m.categoryName}</div>
                  </div>
                ))}
              </CardContent></Card>
            </section>
          )}
          {recent.length > 0 && (
            <section>
              <SectionTitle title="Recently Completed" subtitle="Last 5 matches" />
              <Card className="border-border/60"><CardContent className="p-0 divide-y divide-border">
                {recent.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3">
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/40">DONE</Badge>
                    <div className="flex-1 min-w-0 text-sm">
                      <span className={m.winner?.side === 'aka' ? 'font-bold text-foreground' : 'text-muted-foreground'}>{m.aka?.name || 'TBD'}</span>
                      <span className="text-muted-foreground mx-2">vs</span>
                      <span className={m.winner?.side === 'ao' ? 'font-bold text-foreground' : 'text-muted-foreground'}>{m.ao?.name || (m.eventType === 'Kata' ? `— ${m.kataFinalScore?.toFixed?.(2) || ''}` : 'TBD')}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{m.categoryName}</div>
                  </div>
                ))}
              </CardContent></Card>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function CurrentMatchCard({ match, onStartBout }) {
  const meta = MATCH_STATUS_META[match.status] || MATCH_STATUS_META.queued;
  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-card via-card to-red-950/20 overflow-hidden">
      <div className="px-6 py-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
          <div className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{match.categoryName}</span> · {match.eventType} · Round {match.round}{match.totalRounds ? `/${match.totalRounds}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          {(match.status === 'on_tatami' || match.status === 'called') && (
            <Button
              onClick={() => onStartBout(match.id)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Play className="h-4 w-4 mr-2" /> Start Bout
            </Button>
          )}
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href={`/referee/${match.id}`}>
              <User className="h-4 w-4 mr-2" /> Open Referee Console
            </Link>
          </Button>
        </div>
      </div>
      <CardContent className="p-6">
        {match.eventType === 'Kumite' ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <SideMini athlete={match.aka} score={match.akaScore || 0} label="AKA" color="red" />
            <div className="text-center"><div className="text-xs uppercase tracking-widest text-muted-foreground">vs</div></div>
            <SideMini athlete={match.ao} score={match.aoScore || 0} label="AO" color="blue" />
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/30"><AvatarImage src={match.aka?.photoUrl} /><AvatarFallback className="bg-primary/20 text-primary text-2xl">{(match.aka?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Kata Performer</div>
              <div className="text-3xl font-bold">{match.aka?.name}</div>
              <div className="text-sm text-muted-foreground">{match.aka?.dojoName}</div>
            </div>
            <div className="text-right"><div className="text-xs uppercase tracking-widest text-muted-foreground">Final</div><div className="text-5xl font-black text-gold tabular-nums">{(match.kataFinalScore || 0).toFixed(2)}</div></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SideMini({ athlete, score, label, color }) {
  const bg = color === 'red' ? 'from-red-700/30 to-red-950/40 border-red-500/30' : 'from-blue-700/30 to-blue-950/40 border-blue-500/30';
  const dot = color === 'red' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${bg} p-5 text-center`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-bold tracking-widest">{label}</span>
      </div>
      <Avatar className="h-16 w-16 mx-auto ring-2 ring-white/20"><AvatarImage src={athlete?.photoUrl} /><AvatarFallback className="bg-black/30 text-white text-lg">{(athlete?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <div className="font-bold text-lg mt-2 truncate">{athlete?.name || 'TBD'}</div>
      <div className="text-xs text-muted-foreground truncate">{athlete?.dojoName || '—'}</div>
      <div className="text-6xl font-black tabular-nums mt-3">{score}</div>
    </div>
  );
}

function UpcomingMatchCard({ match, index }) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-[10px]">#{index}</Badge>
          <div className="text-[10px] text-muted-foreground">{match.categoryName}</div>
        </div>
        {match.eventType === 'Kumite' ? (
          <div className="text-sm">
            <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-red-500" /><span className="font-medium truncate">{match.aka?.name || 'TBD'}</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" /><span className="font-medium truncate">{match.ao?.name || 'TBD'}</span></div>
          </div>
        ) : (
          <div className="text-sm font-medium truncate">{match.aka?.name}</div>
        )}
      </CardContent>
    </Card>
  );
}
