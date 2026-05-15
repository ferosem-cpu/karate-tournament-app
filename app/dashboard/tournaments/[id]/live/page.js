'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/page-header';
import { Activity, Grid3x3, Loader2, Plus, Trophy, Zap, ExternalLink, Award, Eye, Trash2 } from 'lucide-react';
import { MATCH_STATUS_META } from '@/lib/constants';
import { buildKumiteBracket, persistKumiteBracket, persistKataPool, deleteCategoryMatches, assignMatchToTatami } from '@/lib/match-engine';
import { toast } from 'sonner';

export default function LiveTournamentDashboard() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tatamis, setTatamis] = useState([]);
  const [genOpen, setGenOpen] = useState(false);
  const [genCategory, setGenCategory] = useState(null);
  const [genFormat, setGenFormat] = useState('Kumite');
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMatch, setAssignMatch] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'tournaments', id), (s) => setTournament(s.exists() ? { id: s.id, ...s.data() } : null));
    const u2 = onSnapshot(query(collection(db, 'categories'), where('tournamentId', '==', id)), (s) => setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', id)), (s) => setRegistrations(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(collection(db, 'matches'), where('tournamentId', '==', id)), (s) => setMatches(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u5 = onSnapshot(query(collection(db, 'tatamis'), where('tournamentId', '==', id)), (s) => setTatamis(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [id]);

  const openGenerate = (cat) => {
    setGenCategory(cat);
    setGenFormat(cat.eventType?.includes('Kata') && !cat.eventType?.includes('Kumite') ? 'Kata' : 'Kumite');
    setGenOpen(true);
  };

  const categoryAthletes = useMemo(() => {
    if (!genCategory) return [];
    return registrations.filter((r) => r.categoryId === genCategory.id).map((r) => ({
      id: r.athleteId, fullName: r.athleteName, dojoName: r.dojoName, dojoId: r.dojoId,
      belt: r.athleteBelt, photoUrl: r.athletePhotoUrl, gender: r.athleteGender, weight: r.athleteWeight,
    }));
  }, [genCategory, registrations]);

  const generate = async () => {
    if (!genCategory) return;
    if (categoryAthletes.length < 1) return toast.error('No registered kohai in this category');
    setBusy(true);
    try {
      if (genFormat === 'Kumite') {
        if (categoryAthletes.length < 2) throw new Error('Need at least 2 athletes');
        const { rounds, totalRounds } = buildKumiteBracket(categoryAthletes);
        const n = await persistKumiteBracket({ tournament, category: genCategory, rounds, totalRounds, userId: user.uid });
        toast.success(`Generated ${n} Kumite matches across ${totalRounds} rounds`);
      } else {
        const n = await persistKataPool({ tournament, category: genCategory, athletes: categoryAthletes, userId: user.uid });
        toast.success(`Generated ${n} Kata performances`);
      }
      setGenOpen(false);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const regenerate = async (cat) => {
    if (!confirm(`Delete all existing matches for "${cat.name}" and regenerate? This cannot be undone.`)) return;
    try { const n = await deleteCategoryMatches(id, cat.id); toast.success(`Cleared ${n} matches`); openGenerate(cat); }
    catch (e) { toast.error(e.message); }
  };

  const openAssign = (m) => { setAssignMatch(m); setAssignOpen(true); };
  const doAssign = async (tatamiId) => {
    const tat = tatamis.find((t) => t.id === tatamiId);
    if (!tat) return;
    try { await assignMatchToTatami(assignMatch.id, tat.id, tat.name); toast.success(`Assigned to ${tat.name}`); setAssignOpen(false); }
    catch (e) { toast.error(e.message); }
  };

  if (!tournament) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const liveMatches = matches.filter((m) => m.status === 'active' || m.status === 'paused');
  const queuedMatches = matches.filter((m) => m.status === 'queued' && !m.isBye);
  const completedMatches = matches.filter((m) => m.status === 'completed' || m.status === 'verified');

  return (
    <>
      <PageHeader
        title="Live Operations"
        description={`${tournament.name} · generate brackets, monitor matches, control tatamis`}
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: tournament.name, href: `/dashboard/tournaments/${id}` }, { label: 'Live' }]}
        actions={
          <Button asChild variant="outline"><Link href={`/dashboard/tournaments/${id}/certificates`}><Award className="h-4 w-4 mr-2" /> Certificates</Link></Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi icon={Zap} label="Live" value={liveMatches.length} pulse={liveMatches.length > 0} />
        <Kpi icon={Activity} label="Queued" value={queuedMatches.length} />
        <Kpi icon={Trophy} label="Completed" value={completedMatches.length} />
        <Kpi icon={Grid3x3} label="Tatamis" value={tatamis.length} />
        <Kpi icon={Award} label="Total Matches" value={matches.length} />
      </div>

      {/* Tatamis */}
      <Card className="border-border/60 mb-6"><CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-semibold">Active Tatamis</h3><p className="text-xs text-muted-foreground">Click any tatami to open the live ops screen</p></div>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/tatamis">Manage tatamis</Link></Button>
        </div>
        {tatamis.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No tatamis yet. <Link href="/dashboard/tatamis" className="text-primary hover:underline">Create one</Link>.</div> :
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tatamis.map((t) => {
              const tatMatches = matches.filter((m) => m.tatamiId === t.id);
              const liveOnTatami = tatMatches.find((m) => m.status === 'active' || m.status === 'paused' || m.status === 'on_tatami');
              const queuedOnTatami = tatMatches.filter((m) => m.status === 'queued' || m.status === 'called').length;
              return (
                <Link key={t.id} href={`/tatami/${t.id}`} target="_blank" className="group">
                  <Card className="border-border/60 hover:border-primary/40 transition overflow-hidden">
                    <div className="h-1 gradient-red-gold" />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold group-hover:text-primary transition">{t.name}</div>
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </div>
                      {liveOnTatami ? (
                        <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/40 text-[10px] animate-pulse">LIVE</Badge>
                      ) : <Badge variant="outline" className="text-[10px]">Idle</Badge>}
                      <div className="text-xs text-muted-foreground mt-2">{queuedOnTatami} queued · {t.assignedRefereeName || 'No referee'}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>}
      </CardContent></Card>

      {/* Categories with brackets */}
      <Card className="border-border/60 mb-6"><CardContent className="p-5">
        <h3 className="font-semibold mb-4">Categories & Brackets</h3>
        {categories.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No categories yet. <Link href="/dashboard/categories" className="text-primary hover:underline">Create one</Link>.</div> :
          <div className="space-y-2">
            {categories.map((c) => {
              const catMatches = matches.filter((m) => m.categoryId === c.id);
              const regCount = registrations.filter((r) => r.categoryId === c.id).length;
              const done = catMatches.filter((m) => m.status === 'completed' || m.status === 'verified').length;
              return (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md border border-border bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/40">{c.eventType}</Badge>
                      <span>{regCount} registered</span>
                      {catMatches.length > 0 && <span>· {catMatches.length} matches · {done} done</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {catMatches.length === 0 ? (
                      <Button size="sm" onClick={() => openGenerate(c)} className="bg-primary hover:bg-primary/90" disabled={regCount === 0}><Plus className="h-3.5 w-3.5 mr-1" /> Generate Bracket</Button>
                    ) : (
                      <>
                        <Button asChild size="sm" variant="outline"><Link href={`/bracket/${c.id}`} target="_blank"><Eye className="h-3.5 w-3.5 mr-1" /> View Bracket</Link></Button>
                        <Button size="sm" variant="ghost" onClick={() => regenerate(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}
      </CardContent></Card>

      {/* Live & Queued Matches */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/60"><CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-red-500" /> Live & On Tatami</h3>
          {liveMatches.concat(matches.filter((m) => m.status === 'on_tatami')).length === 0 ?
            <div className="py-6 text-sm text-center text-muted-foreground">No active matches</div> :
            <div className="space-y-2">{liveMatches.concat(matches.filter((m) => m.status === 'on_tatami')).map((m) => <MatchRow key={m.id} m={m} />)}</div>}
        </CardContent></Card>

        <Card className="border-border/60"><CardContent className="p-5">
          <h3 className="font-semibold mb-4">Queued ({queuedMatches.length})</h3>
          {queuedMatches.length === 0 ? <div className="py-6 text-sm text-center text-muted-foreground">No queued matches</div> :
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {queuedMatches.slice(0, 20).map((m) => <MatchRow key={m.id} m={m} canAssign={!m.tatamiId} onAssign={() => openAssign(m)} />)}
            </div>}
        </CardContent></Card>
      </div>

      {/* Generate Bracket Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Bracket</DialogTitle>
            <DialogDescription>Auto-create matches for <strong>{genCategory?.name}</strong> from registered kohai.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-secondary/30 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Registered Athletes</div>
              <div className="text-2xl font-bold mt-1">{categoryAthletes.length}</div>
              <div className="text-xs text-muted-foreground mt-1">{categoryAthletes.slice(0, 5).map((a) => a.fullName).join(', ')}{categoryAthletes.length > 5 ? `… +${categoryAthletes.length - 5} more` : ''}</div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Format</Label>
              <Select value={genFormat} onValueChange={setGenFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kumite">Kumite · Single Elimination Bracket</SelectItem>
                  <SelectItem value="Kata">Kata · Pool / Judge Scoring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {genFormat === 'Kumite' && categoryAthletes.length >= 2 && (
              <div className="text-xs text-muted-foreground">→ Bracket size: <strong className="text-foreground">{nextPow2(categoryAthletes.length)}</strong> · Rounds: <strong className="text-foreground">{Math.log2(nextPow2(categoryAthletes.length))}</strong> · Byes: <strong className="text-foreground">{nextPow2(categoryAthletes.length) - categoryAthletes.length}</strong></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={busy || categoryAthletes.length === 0} className="bg-primary hover:bg-primary/90 min-w-[160px]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Generate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to tatami */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Tatami</DialogTitle>
            <DialogDescription>{assignMatch?.aka?.name} {assignMatch?.ao ? `vs ${assignMatch.ao.name}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {tatamis.length === 0 ? <div className="text-sm text-muted-foreground">No tatamis configured.</div> :
              tatamis.map((t) => (
                <button key={t.id} onClick={() => doAssign(t.id)} className="w-full text-left rounded-md border border-border bg-secondary/30 hover:bg-secondary p-3 flex items-center justify-between">
                  <span><span className="font-medium">{t.name}</span> <span className="text-xs text-muted-foreground ml-2">{t.assignedRefereeName || 'No referee'}</span></span>
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

function Kpi({ icon: Icon, label, value, pulse }) {
  return (
    <Card className="border-border/60"><CardContent className="p-4">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}><Icon className="h-4 w-4 text-primary" /></div>
        <div className="min-w-0">
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</div>
        </div>
      </div>
    </CardContent></Card>
  );
}

function MatchRow({ m, canAssign, onAssign }) {
  const meta = MATCH_STATUS_META[m.status] || MATCH_STATUS_META.queued;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-secondary/30">
      <Badge variant="outline" className={`${meta.cls} text-[10px] w-20 justify-center`}>{meta.label}</Badge>
      <div className="flex-1 min-w-0 text-sm">
        {m.eventType === 'Kumite' ? (
          <><span className="font-medium">{m.aka?.name || 'TBD'}</span> <span className="text-muted-foreground mx-1">vs</span> <span className="font-medium">{m.ao?.name || 'TBD'}</span></>
        ) : <span className="font-medium">{m.aka?.name || 'TBD'}</span>}
        <div className="text-[10px] text-muted-foreground truncate">{m.categoryName} · R{m.round} · {m.tatamiName || 'unassigned'}</div>
      </div>
      <div className="flex items-center gap-1">
        {canAssign && <Button size="sm" variant="outline" onClick={onAssign}>Assign</Button>}
        <Button asChild size="sm" variant="ghost"><Link href={`/referee/${m.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></Link></Button>
      </div>
    </div>
  );
}
