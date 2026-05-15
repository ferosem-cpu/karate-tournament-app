'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import { BELTS, GENDERS, EVENT_TYPES } from '@/lib/constants';

const GENDER_OPTIONS = ['Mixed', ...GENDERS];

export default function CategoryFormDialog({ open, onOpenChange, tournaments, initial, id }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', tournamentId: '', tournamentName: '', eventType: 'Kumite',
    gender: 'Mixed', ageMin: '', ageMax: '', beltMin: '', beltMax: '',
    weightMin: '', weightMax: '', description: '', isActive: true,
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
    });
    else setForm({
      name: '', tournamentId: '', tournamentName: '', eventType: 'Kumite',
      gender: 'Mixed', ageMin: '', ageMax: '', beltMin: '', beltMax: '',
      weightMin: '', weightMax: '', description: '', isActive: true,
    });
  }, [initial, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onTournamentChange = (tid) => {
    const t = tournaments.find((x) => x.id === tid);
    setForm((f) => ({ ...f, tournamentId: tid, tournamentName: t?.name || '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required');
    setBusy(true);
    try {
      const payload = {
        ...form,
        ageMin: form.ageMin === '' ? null : Number(form.ageMin),
        ageMax: form.ageMax === '' ? null : Number(form.ageMax),
        weightMin: form.weightMin === '' ? null : Number(form.weightMin),
        weightMax: form.weightMax === '' ? null : Number(form.weightMax),
        updatedAt: serverTimestamp(),
        ownerId: user.uid,
      };
      if (id) {
        await updateDoc(doc(db, 'categories', id), payload);
        toast.success('Category updated');
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await addDoc(collection(db, 'categories'), payload);
        toast.success('Category created');
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
          <DialogTitle>{id ? 'Edit Category' : 'Create Category'}</DialogTitle>
          <DialogDescription>Define a competition category. Weight applies only to Kumite.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <F label="Category Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Boys U-14 Kumite -45kg" /></F>
            <F label="Tournament">
              <Select value={form.tournamentId} onValueChange={onTournamentChange}>
                <SelectTrigger><SelectValue placeholder="Global / All…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">— Global (all tournaments) —</SelectItem>
                  {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
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
            <F label="Age Min"><Input type="number" value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} placeholder="e.g. 10" /></F>
            <F label="Age Max"><Input type="number" value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} placeholder="e.g. 13" /></F>
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
            <F label="Weight Min (kg)"><Input type="number" step="0.1" value={form.weightMin} onChange={(e) => set('weightMin', e.target.value)} placeholder="40" /></F>
            <F label="Weight Max (kg)"><Input type="number" step="0.1" value={form.weightMax} onChange={(e) => set('weightMax', e.target.value)} placeholder="45" /></F>
          </div>
          <F label="Description"><Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional notes…" /></F>
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
            <div><div className="text-sm font-medium">Active</div><div className="text-xs text-muted-foreground">Show this category as available for registrations.</div></div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (id ? 'Save Changes' : 'Create Category')}
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
