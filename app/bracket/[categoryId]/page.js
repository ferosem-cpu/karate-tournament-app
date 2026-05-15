'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Swords, Loader2 } from 'lucide-react';
import { MATCH_STATUS_META } from '@/lib/constants';

export default function PublicBracket() {
  const { categoryId } = useParams();
  const [matches, setMatches] = useState([]);
  const [category, setCategory] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'categories', categoryId), (s) => setCategory(s.exists() ? { id: s.id, ...s.data() } : null));
    const u2 = onSnapshot(query(collection(db, 'matches'), where('categoryId', '==', categoryId)), (s) => {
      setMatches(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { u1(); u2(); };
  }, [categoryId]);

  useEffect(() => {
    if (category?.tournamentId) {
      const u = onSnapshot(doc(db, 'tournaments', category.tournamentId), (s) => setTournament(s.exists() ? { id: s.id, ...s.data() } : null));
      return () => u();
    }
  }, [category?.tournamentId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!category) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Category not found.</div>;

  const eventType = matches[0]?.eventType;
  const isKumite = eventType === 'Kumite';
  const isKata = eventType === 'Kata';
  const totalRounds = isKumite ? Math.max(...matches.map((m) => m.totalRounds || 1), 1) : 1;
  const roundsArr = [];
  for (let r = 1; r <= totalRounds; r++) roundsArr.push(matches.filter((m) => m.round === r).sort((a, b) => (a.matchInRound - b.matchInRound)));

  const kataRanked = isKata ? [...matches].sort((a, b) => (b.kataFinalScore || -1) - (a.kataFinalScore || -1)) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-b from-black to-background border-b border-border/60 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{tournament?.name || 'Tournament'}</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1">{category.name}</h1>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40">{eventType || category.eventType}</Badge>
            <Badge variant="outline">{category.gender}</Badge>
            {(category.ageMin != null) && <Badge variant="outline">Age {category.ageMin}–{category.ageMax}</Badge>}
            {matches.length > 0 && <Badge variant="outline">{matches.length} matches</Badge>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {matches.length === 0 ? (
          <Card className="border-dashed border-border/60"><CardContent className="p-16 text-center">
            <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Bracket not generated yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Matches will appear here once the organizer generates the bracket.</p>
          </CardContent></Card>
        ) : isKata ? (
          <Card className="border-border/60"><CardContent className="p-5">
            <h2 className="font-bold mb-4">Kata Ranking</h2>
            <div className="space-y-2">
              {kataRanked.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-secondary/30">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black ${i === 0 ? 'bg-amber-500 text-amber-950' : i === 1 ? 'bg-zinc-300 text-zinc-900' : i === 2 ? 'bg-orange-700 text-white' : 'bg-zinc-700 text-zinc-300'}`}>{i + 1}</div>
                  <Avatar className="h-10 w-10"><AvatarImage src={m.aka?.photoUrl} /><AvatarFallback>{(m.aka?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><div className="font-semibold truncate">{m.aka?.name}</div><div className="text-xs text-muted-foreground truncate">{m.aka?.dojoName}</div></div>
                  <div className="text-2xl font-bold tabular-nums text-gold">{m.kataFinalScore != null ? m.kataFinalScore.toFixed(2) : '—'}</div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-fit">
              {roundsArr.map((roundMatches, rIdx) => (
                <div key={rIdx} className="flex-shrink-0 w-[280px]">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 text-center">{rIdx === totalRounds - 1 ? 'Final' : rIdx === totalRounds - 2 ? 'Semifinal' : `Round ${rIdx + 1}`}</div>
                  <div className="space-y-3" style={{ paddingTop: `${rIdx * 16}px` }}>
                    {roundMatches.map((m) => <BracketMatchCard key={m.id} m={m} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function BracketMatchCard({ m }) {
  const meta = MATCH_STATUS_META[m.status] || MATCH_STATUS_META.queued;
  const aw = m.winner?.side === 'aka';
  const bw = m.winner?.side === 'ao';
  return (
    <Card className="border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border/60 flex items-center justify-between">
        <Badge variant="outline" className={`${meta.cls} text-[9px]`}>{meta.label}</Badge>
        <span className="text-[10px] text-muted-foreground">M{m.matchInRound + 1}{m.tatamiName ? ` · ${m.tatamiName}` : ''}</span>
      </div>
      <SidePill side="aka" name={m.aka?.name} dojo={m.aka?.dojoName} score={m.akaScore} winner={aw} byeWin={m.isBye && m.winner?.side === 'aka'} />
      <div className="border-t border-border/60" />
      <SidePill side="ao" name={m.ao?.name} dojo={m.ao?.dojoName} score={m.aoScore} winner={bw} byeWin={m.isBye && m.winner?.side === 'ao'} />
    </Card>
  );
}

function SidePill({ side, name, dojo, score, winner, byeWin }) {
  const dot = side === 'aka' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${winner ? 'bg-emerald-500/5' : ''}`}>
      <div className={`h-2 w-2 rounded-full ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${winner ? 'font-bold' : ''}`}>{name || (byeWin ? 'BYE' : 'TBD')}</div>
        {dojo && <div className="text-[10px] text-muted-foreground truncate">{dojo}</div>}
      </div>
      {winner && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
      <div className={`text-base font-bold tabular-nums ${winner ? 'text-foreground' : 'text-muted-foreground'}`}>{score ?? 0}</div>
    </div>
  );
}
