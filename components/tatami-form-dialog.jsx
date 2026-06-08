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
import { toast } from 'sonner';
import { canManageTatamis } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

export default function TatamiFormDialog({ open, onOpenChange, tournaments, initial, id, lockedTournamentId }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', tournamentId: '', tournamentName: '', status: 'active', assignedRefereeName: '', notes: '', streamingUrl: '' });

  useEffect(() => {
    if (initial) setForm({
      name: initial.name || '',
      tournamentId: initial.tournamentId || '',
      tournamentName: initial.tournamentName || '',
      status: initial.status || 'active',
      assignedRefereeName: initial.assignedRefereeName || '',
      notes: initial.notes || '',
      streamingUrl: initial.streamingUrl || '',
    });
    else setForm({ 
      name: '', 
      tournamentId: lockedTournamentId || '', 
      tournamentName: tournaments.find((t) => t.id === lockedTournamentId)?.name || '', 
      status: 'active', 
      assignedRefereeName: '', 
      notes: '',
      streamingUrl: '',
    });
  }, [initial, open, lockedTournamentId, tournaments]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onTournamentChange = (tid) => {
    const t = tournaments.find((x) => x.id === tid);
    setForm((f) => ({ ...f, tournamentId: tid, tournamentName: t?.name || '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canManageTatamis(profile?.role)) {
      return toast.error('View-only: you cannot create or edit tatamis');
    }
    if (!form.name.trim()) return toast.error('Tatami name is required');
    if (!form.tournamentId) return toast.error('Tournament is required \u2014 select one before creating a tatami');
    if (!form.assignedRefereeName.trim()) return toast.error('Assigned Referee is required');
    setBusy(true);
    try {
      const payload = { ...form, updatedAt: serverTimestamp(), ownerId: user.uid };
      if (id) {
        await updateDoc(doc(db, 'tatamis', id), payload);
        toast.success('Tatami updated');
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await addDoc(collection(db, 'tatamis'), payload);
        toast.success('Tatami created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{id ? 'Edit Tatami' : 'New Tatami'}</DialogTitle>
          <DialogDescription>Configure a competition mat. Live scoring & queue management coming soon.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <F label="Tatami Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Tatami 1" /></F>
          {!lockedTournamentId && (
            <F label="Tournament *">
              <Select value={form.tournamentId || undefined} onValueChange={onTournamentChange}>
                <SelectTrigger><SelectValue placeholder="Select tournament…" /></SelectTrigger>
                <SelectContent>{tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <F label="Status">
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Assigned Referee *"><Input value={form.assignedRefereeName} onChange={(e) => set('assignedRefereeName', e.target.value)} required placeholder="Sensei name" /></F>
          </div>
          <F label="Notes"><Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" /></F>
          <F label="Live Stream URL (Optional)"><Input type="url" value={form.streamingUrl || ''} onChange={(e) => set('streamingUrl', e.target.value)} placeholder="https://youtube.com/live/..." /></F>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[120px]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (id ? 'Save' : 'Create Tatami')}
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
