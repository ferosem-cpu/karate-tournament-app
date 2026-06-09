'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { BELTS, GENDERS, EVENT_TYPES, canManageCategories } from '@/lib/constants';

const GENDER_OPTIONS = ['Mixed', ...GENDERS];

export default function CategoryFormDialog({ open, onOpenChange, tournaments, initial, id, lockedTournamentId }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', tournamentId: '', tournamentName: '', eventType: 'Kumite',
    gender: 'Mixed', ageMin: '', ageMax: '', beltMin: '', beltMax: '',
    weightMin: '', weightMax: '', description: '', isActive: true,
    byAge: true, byWeight: true,
  });

  useEffect(() => {
    if (initial) setForm({
      name: initial.name || '',
      tournamentId: initial.tournamentId || '',
      tournamentName: initial.tournamentName || '',
      eventType: initial.eventType || 'Kumite',
      gender: initial.gender || 'Mixed',
      ageMin: initial.ageMin ?? '',
      ageMax: initial.ageMax ?? '',
      beltMin: initial.beltMin || '',
      beltMax: initial.beltMax || '',
      weightMin: initial.weightMin ?? '',
      weightMax: initial.weightMax ?? '',
      description: initial.description || '',
      isActive: initial.isActive ?? true,
      byAge: initial.byAge ?? (initial.ageMin !== null && initial.ageMin !== '' || initial.ageMax !== null && initial.ageMax !== ''),
      byWeight: initial.byWeight ?? (initial.weightMin !== null && initial.weightMin !== '' || initial.weightMax !== null && initial.weightMax !== ''),
    });
    else setForm({
      name: '', 
      tournamentId: lockedTournamentId || '', 
      tournamentName: tournaments.find((t) => t.id === lockedTournamentId)?.name || '', 
      eventType: 'Kumite',
      gender: 'Mixed', ageMin: '', ageMax: '', beltMin: '', beltMax: '',
      weightMin: '', weightMax: '', description: '', isActive: true,
      byAge: true, byWeight: true,
    });
  }, [initial, open, lockedTournamentId, tournaments]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onTournamentChange = (tid) => {
    const t = tournaments.find((x) => x.id === tid);
    setForm((f) => ({ ...f, tournamentId: tid, tournamentName: t?.name || '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canManageCategories(profile?.role)) {
      return toast.error('View-only: you cannot create or edit event categories');
    }
    if (!form.name.trim()) return toast.error('Event Category name is required');
    if (!form.byAge && !form.byWeight) {
      return toast.error('Please check at least "Create event by age" or "Create event by weight".');
    }
    if (!form.tournamentId) {
      return toast.error('Tournament is required');
    }
    setBusy(true);
    try {
      if (profile?.role === 'tournament_organizer') {
        if (form.tournamentId === '__global__') {
          setBusy(false);
          return toast.error('Tournament organizers cannot manage global categories.');
        }
        const tSnap = await getDoc(doc(db, 'tournaments', form.tournamentId));
        if (!tSnap.exists() || tSnap.data().ownerId !== user.uid) {
          setBusy(false);
          return toast.error('You do not have permission to manage categories for this tournament.');
        }
      }

      const payload = {
        ...form,
        ageMin: !form.byAge || form.ageMin === '' ? null : Number(form.ageMin),
        ageMax: !form.byAge || form.ageMax === '' ? null : Number(form.ageMax),
        weightMin: !form.byWeight || form.weightMin === '' ? null : Number(form.weightMin),
        weightMax: !form.byWeight || form.weightMax === '' ? null : Number(form.weightMax),
        byAge: form.byAge,
        byWeight: form.byWeight,
        updatedAt: serverTimestamp(),
        ownerId: user.uid,
      };
      if (id) {
        await updateDoc(doc(db, 'categories', id), payload);
        toast.success('Event Category updated');
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await addDoc(collection(db, 'categories'), payload);
        toast.success('Event Category created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? 'Edit Event Category' : 'Create Event Category'}</DialogTitle>
          <DialogDescription>Define an event category. Choose whether age and weight rules apply.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <F label="Event Category Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Boys U-14 Kumite -45kg" /></F>
            {!lockedTournamentId && (
              <F label="Tournament">
                <Select value={form.tournamentId} onValueChange={onTournamentChange}>
                  <SelectTrigger><SelectValue placeholder="Global / All…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__global__">— Global (all tournaments) —</SelectItem>
                    {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            )}
            <F label="Event Type">
              <Select value={form.eventType} onValueChange={(v) => set('eventType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Gender">
              <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </F>

            <div className="sm:col-span-2 border-y border-zinc-800 py-3 my-1 flex gap-6">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <Switch checked={form.byAge} onCheckedChange={(v) => set('byAge', v)} />
                <span>Create event by age</span>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <Switch checked={form.byWeight} onCheckedChange={(v) => set('byWeight', v)} />
                <span>Create event by weight</span>
              </label>
            </div>

            {form.byAge && (
              <>
                <F label="Age Min"><Input type="number" value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} placeholder="e.g. 10" /></F>
                <F label="Age Max"><Input type="number" value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} placeholder="e.g. 13" /></F>
              </>
            )}
            
            <F label="Belt Min">
              <Select value={form.beltMin} onValueChange={(v) => set('beltMin', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__any__">— Any —</SelectItem>{BELTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Belt Max">
              <Select value={form.beltMax} onValueChange={(v) => set('beltMax', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__any__">— Any —</SelectItem>{BELTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </F>

            {form.byWeight && (
              <>
                <F label="Weight Min (kg)"><Input type="number" step="0.1" value={form.weightMin} onChange={(e) => set('weightMin', e.target.value)} placeholder="40" /></F>
                <F label="Weight Max (kg)"><Input type="number" step="0.1" value={form.weightMax} onChange={(e) => set('weightMax', e.target.value)} placeholder="45" /></F>
              </>
            )}
          </div>
          <F label="Description"><Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional notes…" /></F>
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
            <div><div className="text-sm font-medium">Active</div><div className="text-xs text-muted-foreground">Show this event category as available for registrations.</div></div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (id ? 'Save Changes' : 'Create Event Category')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function F({ label, children }) {
  return <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>{children}</div>;
}
