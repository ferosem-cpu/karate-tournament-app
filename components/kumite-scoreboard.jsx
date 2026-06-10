'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Play, Pause, Trophy, AlertTriangle, X, Minus, Lock, ShieldAlert } from 'lucide-react';
import { startMatchTimer, pauseMatchTimer, resumeMatchTimer, updateMatchScore, completeKumiteMatch, updateMatchTimerDuration } from '@/lib/match-engine';
import { KUMITE_PENALTIES, KUMITE_POINTS, beltClass } from '@/lib/constants';
import { toast } from 'sonner';

function fmt(s) {
  const sec = Math.max(0, Math.floor(s));
  const m = Math.floor(sec / 60), r = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function KumiteScoreboard({ match }) {
  const [now, setNow] = useState(Date.now());
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [winnerSide, setWinnerSide] = useState(null);
  const [winnerReason, setWinnerReason] = useState('points');
  const [winnerNotes, setWinnerNotes] = useState('');
  const [dqOpen, setDqOpen] = useState(false);
  const [dqContext, setDqContext] = useState(null); // { side, penaltyCode, label }
  const [confirmStart, setConfirmStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const tickRef = useRef();

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tickRef.current);
  }, []);

  const computeAccumulated = () => {
    let acc = match.timerAccumulatedSeconds || 0;
    if (match.isTimerRunning && match.timerStartedAt) {
      const started = match.timerStartedAt.toMillis ? match.timerStartedAt.toMillis() : new Date(match.timerStartedAt).getTime();
      acc += (now - started) / 1000;
    }
    return acc;
  };
  const duration = match.timerDurationSeconds || 180;
  const remaining = Math.max(0, duration - computeAccumulated());
  const isExpired = remaining <= 0;
  const isFinished = match.status === 'completed' || match.status === 'verified';
  const isActive = match.status === 'active' || match.status === 'paused';
  const scoringEnabled = isActive && !isFinished;
  const hasStarted = match.status !== 'queued' && match.status !== 'called' && match.status !== 'on_tatami';

  const onStart = async () => { setConfirmStart(false); try { await startMatchTimer(match.id); } catch (e) { toast.error(e.message); } };
  const onPause = async () => { try { await pauseMatchTimer(match.id, computeAccumulated()); } catch (e) { toast.error(e.message); } };
  const onResume = async () => { try { await resumeMatchTimer(match.id); } catch (e) { toast.error(e.message); } };

  const addScore = async (side, delta) => {
    if (!scoringEnabled) return toast.error('Start the match before scoring');
    const field = side === 'aka' ? 'akaScore' : 'aoScore';
    const next = Math.max(0, (match[field] || 0) + delta);
    await updateMatchScore(match.id, { [field]: next });
  };

  const addPenalty = async (side, penalty) => {
    if (!scoringEnabled) return toast.error('Start the match before applying penalties');
    const field = side === 'aka' ? 'akaPenalties' : 'aoPenalties';
    const opponentScoreField = side === 'aka' ? 'aoScore' : 'akaScore';
    const opponent = side === 'aka' ? 'ao' : 'aka';
    const newPenalties = [...(match[field] || []), { code: penalty.code, label: penalty.label, tier: penalty.tier, at: Date.now() }];
    const update = { [field]: newPenalties };
    // Award opponent points for K1 (+1) and HC (+2)
    if (penalty.points > 0) {
      update[opponentScoreField] = (match[opponentScoreField] || 0) + penalty.points;
      toast.success(`${penalty.label} · ${opponent.toUpperCase()} +${penalty.points}`);
    } else if (!penalty.disqualifies) {
      toast.message(`${penalty.label} recorded`);
    }
    await updateMatchScore(match.id, update);
    if (penalty.disqualifies) {
      setDqContext({ side, penaltyCode: penalty.code, label: penalty.label });
      setDqOpen(true);
    }
  };

  const removePenalty = async (side, idx) => {
    if (!scoringEnabled) return;
    const field = side === 'aka' ? 'akaPenalties' : 'aoPenalties';
    const arr = [...(match[field] || [])]; arr.splice(idx, 1);
    await updateMatchScore(match.id, { [field]: arr });
  };

  const openWinner = (side) => {
    if (!isActive && !isExpired) return toast.error('Start the match before declaring a winner');
    setWinnerSide(side); setWinnerReason('points'); setWinnerNotes(''); setWinnerOpen(true);
  };
  const confirmWinner = async () => {
    setBusy(true);
    try { await completeKumiteMatch(match.id, { winnerSide, reason: winnerReason, notes: winnerNotes });
      toast.success('Match completed · winner declared'); setWinnerOpen(false); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const confirmDQ = async () => {
    if (!dqContext) return setDqOpen(false);
    const opp = dqContext.side === 'aka' ? 'ao' : 'aka';
    setBusy(true);
    try {
      await completeKumiteMatch(match.id, { winnerSide: opp, reason: dqContext.penaltyCode === 'H' ? 'hansoku' : 'shikkaku', notes: `Disqualification: ${dqContext.label} on ${dqContext.side.toUpperCase()}` });
      toast.success(`Disqualified · winner: ${opp.toUpperCase()}`); setDqOpen(false);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* Timer */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-black/60">
        <CardContent className="p-6 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {!hasStarted ? 'Match Not Started' : isExpired ? 'Time Up' : match.status === 'paused' ? 'Paused' : match.status === 'active' ? 'Match Time' : 'Ready'}
          </div>
          <div className={`text-7xl md:text-8xl font-black tabular-nums ${isExpired ? 'text-red-500' : 'text-foreground'}`}>{fmt(remaining)}</div>
          <div className="flex justify-center gap-3 mt-5 flex-wrap">
            {!isFinished && (
              match.isTimerRunning ? (
                <Button size="lg" onClick={onPause} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[200px] h-16 text-xl font-bold"><Pause className="h-6 w-6 mr-2" /> PAUSE</Button>
              ) : match.timerAccumulatedSeconds > 0 ? (
                <Button size="lg" onClick={onResume} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px] h-16 text-xl font-bold"><Play className="h-6 w-6 mr-2" /> RESUME</Button>
              ) : (
                <Button size="lg" onClick={() => setConfirmStart(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px] h-16 text-xl font-bold"><Play className="h-6 w-6 mr-2" /> START MATCH</Button>
              )
            )}
            {isFinished && match.winner && (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40 text-base px-4 py-2">
                <Trophy className="h-4 w-4 mr-2" /> Winner: {match.winner.name} ({match.winner.side === 'aka' ? 'AKA' : 'AO'}) · {match.winner.reason}
              </Badge>
            )}
          </div>
          {!scoringEnabled && !isFinished && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-amber-300"><Lock className="h-3.5 w-3.5" /> Scoring is locked. Start the match to enable.</div>
          )}

          {!isFinished && (
            <div className="mt-6 border-t border-zinc-800/85 pt-4 flex flex-col items-center gap-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Edit Match Duration</div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {[
                  { label: '30s', val: 30 },
                  { label: '60s', val: 60 },
                  { label: '90s', val: 90 },
                  { label: '120s', val: 120 },
                  { label: '150s', val: 150 },
                  { label: '3m', val: 180 }
                ].map((preset) => (
                  <Button
                    key={preset.val}
                    variant={duration === preset.val ? 'default' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      try {
                        await updateMatchTimerDuration(match.id, preset.val);
                        toast.success(`Match duration updated to ${preset.label}`);
                      } catch (e) {
                        toast.error(e.message);
                      }
                    }}
                    className={`h-8 px-3 text-xs font-semibold transition ${
                      duration === preset.val
                        ? 'bg-amber-500 text-black hover:bg-amber-400 border-amber-500 shadow-lg shadow-amber-500/10'
                        : 'border-zinc-800 hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <SidePanel side="aka" colorCls="from-red-700 to-red-950 border-red-500/40" badgeCls="bg-red-600" label="AKA"
          athlete={match.aka} score={match.akaScore || 0} penalties={match.akaPenalties || []}
          onAdd={(d) => addScore('aka', d)} onPenalty={(p) => addPenalty('aka', p)} onRemovePenalty={(i) => removePenalty('aka', i)}
          onDeclareWinner={() => openWinner('aka')} disabled={!scoringEnabled} winnerLocked={isFinished} />
        <SidePanel side="ao" colorCls="from-blue-700 to-blue-950 border-blue-500/40" badgeCls="bg-blue-600" label="AO"
          athlete={match.ao} score={match.aoScore || 0} penalties={match.aoPenalties || []}
          onAdd={(d) => addScore('ao', d)} onPenalty={(p) => addPenalty('ao', p)} onRemovePenalty={(i) => removePenalty('ao', i)}
          onDeclareWinner={() => openWinner('ao')} disabled={!scoringEnabled} winnerLocked={isFinished} />
      </div>

      {/* Start match confirmation */}
      <Dialog open={confirmStart} onOpenChange={setConfirmStart}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Start Match?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Once started, the timer begins and scoring becomes active.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStart(false)}>Cancel</Button>
            <Button onClick={onStart} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Play className="h-4 w-4 mr-2" /> Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Winner */}
      <Dialog open={winnerOpen} onOpenChange={setWinnerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirm Winner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Winner</div>
              <div className="text-xl font-bold mt-1">{winnerSide === 'aka' ? match.aka?.name : match.ao?.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{winnerSide === 'aka' ? 'AKA (Red)' : 'AO (Blue)'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Reason</div>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 'points', l: 'Points' }, { v: 'kachi', l: 'Kachi (3+ lead)' }, { v: 'hansoku', l: 'Hansoku (DQ)' }, { v: 'kiken', l: 'Kiken (withdrawal)' }].map((r) => (
                  <Button key={r.v} variant={winnerReason === r.v ? 'default' : 'outline'} size="sm" onClick={() => setWinnerReason(r.v)} className={winnerReason === r.v ? 'bg-primary' : ''}>{r.l}</Button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Referee Notes</div>
              <Textarea rows={2} value={winnerNotes} onChange={(e) => setWinnerNotes(e.target.value)} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerOpen(false)}>Cancel</Button>
            <Button onClick={confirmWinner} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]"><Trophy className="h-4 w-4 mr-2" /> Confirm Winner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DQ confirmation */}
      <Dialog open={dqOpen} onOpenChange={setDqOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-300"><ShieldAlert className="h-5 w-5" /> Disqualification Approval</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/40">
              <div className="text-xs uppercase tracking-wider text-red-300">{dqContext?.label}</div>
              <div className="text-base font-semibold mt-1">Disqualify {dqContext?.side === 'aka' ? match.aka?.name : match.ao?.name} ({dqContext?.side?.toUpperCase()})?</div>
              <div className="text-xs text-muted-foreground mt-1">Opponent will be declared the winner. Multiple-referee approval support coming.</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDqOpen(false)}>Cancel</Button>
            <Button onClick={confirmDQ} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white min-w-[160px]"><ShieldAlert className="h-4 w-4 mr-2" /> Approve & Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidePanel({ side, colorCls, badgeCls, label, athlete, score, penalties, onAdd, onPenalty, onRemovePenalty, onDeclareWinner, disabled, winnerLocked }) {
  return (
    <Card className={`bg-gradient-to-br ${colorCls} border-2 overflow-hidden ${disabled ? 'opacity-90' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Badge className={`${badgeCls} text-white text-xs px-2 py-0.5`}>{label}</Badge>
          {athlete?.belt && <Badge variant="outline" className={`${beltClass(athlete.belt)} text-[10px]`}>{athlete.belt}</Badge>}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-14 w-14 ring-2 ring-white/20"><AvatarImage src={athlete?.photoUrl} /><AvatarFallback className="bg-white/10 text-white text-lg">{(athlete?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{athlete?.name || 'TBD'}</div>
            <div className="text-xs opacity-75 truncate">{athlete?.dojoName || '—'}</div>
          </div>
        </div>
        <div className="text-center my-4">
          <div className="text-[10px] uppercase tracking-widest opacity-70">Score</div>
          <div className="text-7xl font-black tabular-nums">{score}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {KUMITE_POINTS.map((p) => (
            <Button key={p.value} size="lg" variant="secondary" disabled={disabled} onClick={() => onAdd(p.value)} className="h-16 flex-col gap-0.5 disabled:opacity-50">
              <span className="text-xl font-bold">+{p.value}</span>
              <span className="text-[10px] uppercase tracking-widest opacity-80">{p.label}</span>
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onAdd(-1)} className="w-full text-xs opacity-75 mb-3"><Minus className="h-3 w-3 mr-1" /> Reduce by 1</Button>
        <div className="border-t border-white/10 pt-3 mb-3">
          <div className="text-[10px] uppercase tracking-widest opacity-70 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Warnings & Penalties</div>
          <div className="grid grid-cols-2 gap-1.5">
            {KUMITE_PENALTIES.map((p) => (
              <Button key={p.code} size="sm" variant="outline" disabled={disabled} onClick={() => onPenalty(p)} className="h-auto py-1.5 px-2 text-[11px] bg-black/30 border-white/20 hover:bg-black/50 flex-col items-start gap-0" title={p.desc}>
                <span className="font-bold">{p.label}</span>
                <span className="text-[9px] opacity-70 truncate w-full text-left">{p.desc}</span>
              </Button>
            ))}
          </div>
          {penalties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {penalties.map((p, i) => (
                <Badge key={i} variant="outline" className="bg-black/40 text-white border-white/20 text-[10px] gap-1">
                  {p.label || p.code}
                  {!disabled && <button onClick={() => onRemovePenalty(i)}><X className="h-2.5 w-2.5" /></button>}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button size="lg" disabled={disabled || winnerLocked || !athlete} onClick={onDeclareWinner} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-semibold"><Trophy className="h-4 w-4 mr-2" /> Declare {label} Winner</Button>
      </CardContent>
    </Card>
  );
}
