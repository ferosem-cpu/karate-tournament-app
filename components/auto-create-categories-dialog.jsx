'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wand2 } from 'lucide-react';
import { STANDARD_AGE_DIVISIONS } from '@/lib/constants';
import { toast } from 'sonner';

export default function AutoCreateCategoriesDialog({ open, onOpenChange, tournaments }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [tournamentId, setTournamentId] = useState('');
  const [events, setEvents] = useState({ Kata: true, Kumite: true, TeamKata: false, TeamKumite: false });
  const [genders, setGenders] = useState({ Male: true, Female: true });
  const [ageDivisions, setAgeDivisions] = useState(STANDARD_AGE_DIVISIONS.slice(0, 6).map((a) => a.code));

  const create = async () => {
    if (!tournamentId) return toast.error('Select a tournament');
    const eventList = Object.entries(events).filter(([_, v]) => v).map(([k]) => k === 'TeamKata' ? 'Team Kata' : k === 'TeamKumite' ? 'Team Kumite' : k);
    const genderList = Object.entries(genders).filter(([_, v]) => v).map(([k]) => k);
    const divs = STANDARD_AGE_DIVISIONS.filter((a) => ageDivisions.includes(a.code));
    if (eventList.length === 0 || genderList.length === 0 || divs.length === 0) return toast.error('Select at least one event, gender and age division');
    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t) return;

    setBusy(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const div of divs) {
        for (const g of genderList) {
          for (const ev of eventList) {
            const ref = doc(collection(db, 'categories'));
            batch.set(ref, {
              name: `${div.label} ${g} ${ev}`,
              tournamentId: t.id, tournamentName: t.name,
              eventType: ev, gender: g,
              ageMin: div.min, ageMax: div.max,
              beltMin: '__any__', beltMax: '__any__',
              weightMin: null, weightMax: null,
              description: `Auto-created · ${div.code}`,
              isActive: true, isTeamEvent: ev.startsWith('Team'),
              createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
              createdBy: user.uid, ownerId: user.uid,
            });
            count++;
          }
        }
      }
      await batch.commit();
      toast.success(`${count} categories created`);
      onOpenChange(false);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const toggle = (group, setGroup, key) => setGroup((s) => ({ ...s, [key]: !s[key] }));
  const toggleAge = (code) => setAgeDivisions((arr) => arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Auto Create Categories</DialogTitle>
          <DialogDescription>Generate standard categories across events, genders and age divisions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Tournament *</Label>
            <Select value={tournamentId || undefined} onValueChange={setTournamentId}>
              <SelectTrigger><SelectValue placeholder="Select tournament…" /></SelectTrigger>
              <SelectContent>{tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Events</Label>
            <div className="flex flex-wrap gap-3">
              {Object.keys(events).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={events[k]} onCheckedChange={() => toggle(events, setEvents, k)} /> {k === 'TeamKata' ? 'Team Kata' : k === 'TeamKumite' ? 'Team Kumite' : k}</label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Genders</Label>
            <div className="flex flex-wrap gap-3">
              {Object.keys(genders).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={genders[k]} onCheckedChange={() => toggle(genders, setGenders, k)} /> {k}</label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Age Divisions</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STANDARD_AGE_DIVISIONS.map((a) => (
                <label key={a.code} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded border border-border bg-secondary/30"><Checkbox checked={ageDivisions.includes(a.code)} onCheckedChange={() => toggleAge(a.code)} /> {a.label}</label>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">→ Will create <strong className="text-foreground">{Object.values(events).filter(Boolean).length * Object.values(genders).filter(Boolean).length * ageDivisions.length}</strong> categories</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-2" /> Auto Create</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
