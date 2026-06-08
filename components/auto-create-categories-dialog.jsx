'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wand2 } from 'lucide-react';
import { STANDARD_AGE_DIVISIONS, STANDARD_WEIGHT_DIVISIONS, canManageCategories } from '@/lib/constants';
import { toast } from 'sonner';

export default function AutoCreateCategoriesDialog({ open, onOpenChange, tournaments, lockedTournamentId }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [tournamentId, setTournamentId] = useState(lockedTournamentId || '');
  const [events, setEvents] = useState({ Kata: true, Kumite: true, TeamKata: false, TeamKumite: false });
  const [genders, setGenders] = useState({ Male: true, Female: true });
  const [createByAge, setCreateByAge] = useState(true);
  const [createByWeight, setCreateByWeight] = useState(true);
  const [ageDivisions, setAgeDivisions] = useState(STANDARD_AGE_DIVISIONS.slice(0, 6).map((a) => a.code));
  const [weightDivisions, setWeightDivisions] = useState(STANDARD_WEIGHT_DIVISIONS.slice(0, 5).map((w) => w.code));

  useEffect(() => {
    if (lockedTournamentId) {
      setTournamentId(lockedTournamentId);
    }
  }, [lockedTournamentId]);

  const create = async () => {
    if (!canManageCategories(profile?.role)) {
      return toast.error('View-only: you cannot create event categories');
    }
    if (!tournamentId) return toast.error('Select a tournament');
    if (!createByAge && !createByWeight) {
      return toast.error('Please check at least "Create event by age" or "Create event by weight".');
    }
    const eventList = Object.entries(events).filter(([_, v]) => v).map(([k]) => k === 'TeamKata' ? 'Team Kata' : k === 'TeamKumite' ? 'Team Kumite' : k);
    const genderList = Object.entries(genders).filter(([_, v]) => v).map(([k]) => k);
    
    const selectedAgeDivs = createByAge ? STANDARD_AGE_DIVISIONS.filter((a) => ageDivisions.includes(a.code)) : [null];
    const selectedWeightDivs = createByWeight ? STANDARD_WEIGHT_DIVISIONS.filter((w) => weightDivisions.includes(w.code)) : [null];

    if (eventList.length === 0 || genderList.length === 0) {
      return toast.error('Select at least one event and gender');
    }
    if (createByAge && selectedAgeDivs.length === 0) {
      return toast.error('Select at least one age division');
    }
    if (createByWeight && selectedWeightDivs.length === 0) {
      return toast.error('Select at least one weight division');
    }

    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t) return;

    setBusy(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const g of genderList) {
        for (const ev of eventList) {
          const isKumite = ev.toLowerCase().includes('kumite');
          
          if (isKumite) {
            for (const ageDiv of selectedAgeDivs) {
              for (const weightDiv of selectedWeightDivs) {
                const nameParts = [];
                if (ageDiv) nameParts.push(ageDiv.label);
                nameParts.push(g);
                nameParts.push(ev);
                if (weightDiv) nameParts.push(weightDiv.label);

                const ref = doc(collection(db, 'categories'));
                batch.set(ref, {
                  name: nameParts.join(' '),
                  tournamentId: t.id, tournamentName: t.name,
                  eventType: ev, gender: g,
                  ageMin: ageDiv ? ageDiv.min : null, ageMax: ageDiv ? ageDiv.max : null,
                  beltMin: '__any__', beltMax: '__any__',
                  weightMin: weightDiv ? weightDiv.min : null, weightMax: weightDiv ? weightDiv.max : null,
                  byAge: !!ageDiv, byWeight: !!weightDiv,
                  description: `Auto-created · ${ageDiv ? ageDiv.code : ''}${weightDiv ? ' ' + weightDiv.code : ''}`.trim(),
                  isActive: true, isTeamEvent: ev.startsWith('Team'),
                  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                  createdBy: user.uid, ownerId: user.uid,
                });
                count++;
              }
            }
          } else {
            for (const ageDiv of selectedAgeDivs) {
              const nameParts = [];
              if (ageDiv) nameParts.push(ageDiv.label);
              nameParts.push(g);
              nameParts.push(ev);

              const ref = doc(collection(db, 'categories'));
              batch.set(ref, {
                name: nameParts.join(' '),
                tournamentId: t.id, tournamentName: t.name,
                eventType: ev, gender: g,
                ageMin: ageDiv ? ageDiv.min : null, ageMax: ageDiv ? ageDiv.max : null,
                beltMin: '__any__', beltMax: '__any__',
                weightMin: null, weightMax: null,
                byAge: !!ageDiv, byWeight: false,
                description: `Auto-created · ${ageDiv ? ageDiv.code : ''}`.trim(),
                isActive: true, isTeamEvent: ev.startsWith('Team'),
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                createdBy: user.uid, ownerId: user.uid,
              });
              count++;
            }
          }
        }
      }

      await batch.commit();
      toast.success(`${count} event categories created`);
      onOpenChange(false);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const toggle = (group, setGroup, key) => setGroup((s) => ({ ...s, [key]: !s[key] }));
  const toggleAge = (code) => setAgeDivisions((arr) => arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code]);
  const toggleWeight = (code) => setWeightDivisions((arr) => arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code]);

  const getPredictedCount = () => {
    const numEvents = Object.values(events).filter(Boolean).length;
    const numGenders = Object.values(genders).filter(Boolean).length;
    if (numEvents === 0 || numGenders === 0) return 0;

    const eventList = Object.entries(events).filter(([_, v]) => v).map(([k]) => k);
    const selectedAgeCount = createByAge ? ageDivisions.length : 1;
    const selectedWeightCount = createByWeight ? weightDivisions.length : 1;

    let count = 0;
    for (const ev of eventList) {
      const isKumite = ev.toLowerCase().includes('kumite');
      if (isKumite) {
        count += numGenders * selectedAgeCount * selectedWeightCount;
      } else {
        count += numGenders * selectedAgeCount;
      }
    }
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Auto Create Event Categories
          </DialogTitle>
          <DialogDescription>
            Generate standard event categories across events, genders, age and weight divisions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!lockedTournamentId && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Tournament *</Label>
              <Select value={tournamentId || undefined} onValueChange={setTournamentId}>
                <SelectTrigger><SelectValue placeholder="Select tournament…" /></SelectTrigger>
                <SelectContent>{tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Events</Label>
            <div className="flex flex-wrap gap-3">
              {Object.keys(events).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={events[k]} onCheckedChange={() => toggle(events, setEvents, k)} /> 
                  {k === 'TeamKata' ? 'Team Kata' : k === 'TeamKumite' ? 'Team Kumite' : k}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Genders</Label>
            <div className="flex flex-wrap gap-3">
              {Object.keys(genders).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={genders[k]} onCheckedChange={() => toggle(genders, setGenders, k)} /> 
                  {k}
                </label>
              ))}
            </div>
          </div>

          <div className="border-y border-zinc-800 py-3 my-1 flex gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <Checkbox checked={createByAge} onCheckedChange={setCreateByAge} />
              <span>Create event by age</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <Checkbox checked={createByWeight} onCheckedChange={setCreateByWeight} />
              <span>Create event by weight</span>
            </label>
          </div>

          {createByAge && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Age Divisions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STANDARD_AGE_DIVISIONS.map((a) => (
                  <label key={a.code} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded border border-border bg-secondary/30">
                    <Checkbox checked={ageDivisions.includes(a.code)} onCheckedChange={() => toggleAge(a.code)} /> 
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {createByWeight && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Weight Divisions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STANDARD_WEIGHT_DIVISIONS.map((w) => (
                  <label key={w.code} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded border border-border bg-secondary/30">
                    <Checkbox checked={weightDivisions.includes(w.code)} onCheckedChange={() => toggleWeight(w.code)} /> 
                    {w.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            → Will create <strong className="text-foreground">{getPredictedCount()}</strong> event categories
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-2" /> Auto Create</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

