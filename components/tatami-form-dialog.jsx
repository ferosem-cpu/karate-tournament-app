'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
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
  const [form, setForm] = useState({ name: '', tournamentId: '', tournamentName: '', status: 'active', assignedRefereeName: '', assignedRefereeId: '', notes: '', streamingUrl: '' });
  const [referees, setReferees] = useState([]);

  useEffect(() => {
    if (initial) setForm({
      name: initial.name || '',
      tournamentId: initial.tournamentId || '',
      tournamentName: initial.tournamentName || '',
      status: initial.status || 'active',
      assignedRefereeName: initial.assignedRefereeName || '',
      assignedRefereeId: initial.assignedRefereeId || '',
      notes: initial.notes || '',
      streamingUrl: initial.streamingUrl || '',
    });
    else setForm({ 
      name: '', 
      tournamentId: lockedTournamentId || '', 
      tournamentName: tournaments.find((t) => t.id === lockedTournamentId)?.name || '', 
      status: 'active', 
      assignedRefereeName: '', 
      assignedRefereeId: '',
      notes: '',
      streamingUrl: '',
    });
  }, [initial, open, lockedTournamentId, tournaments]);

  useEffect(() => {
    if (!form.tournamentId) return;
    const fetchTournamentReferees = async () => {
      try {
        const q = query(
          collection(db, 'referee_applications'),
          where('tournamentId', '==', form.tournamentId),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(q);
        let list = snap.docs.map((d) => ({
          id: d.data().userId,
          name: d.data().fullName || d.data().name || 'Sensei',
        }));

        if (list.length === 0) {
          const qAll = query(
            collection(db, 'users'),
            where('role', '==', 'referee')
          );
          const snapAll = await getDocs(qAll);
          list = snapAll.docs.map((d) => ({
            id: d.id,
            name: d.data().displayName || d.data().fullName || d.data().email || 'Sensei',
          }));
        }
        setReferees(list);
      } catch (err) {
        console.error("Error fetching referees:", err);
      }
    };
    fetchTournamentReferees();
  }, [form.tournamentId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onTournamentChange = (tid) => {
    const t = tournaments.find((x) => x.id === tid);
    setForm((f) => ({ ...f, tournamentId: tid, tournamentName: t?.name || '', assignedRefereeId: '', assignedRefereeName: '' }));
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
      if (profile?.role === 'tournament_organizer') {
        const tSnap = await getDoc(doc(db, 'tournaments', form.tournamentId));
        if (!tSnap.exists() || tSnap.data().ownerId !== user.uid) {
          setBusy(false);
          return toast.error('You do not have permission to manage tatamis for this tournament.');
        }
      }

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
            <F label="Assigned Referee *">
              <Select
                value={form.assignedRefereeId || undefined}
                onValueChange={(val) => {
                  const ref = referees.find((r) => r.id === val);
                  setForm((f) => ({
                    ...f,
                    assignedRefereeId: val,
                    assignedRefereeName: ref ? ref.name : 'Unassigned',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Referee…" />
                </SelectTrigger>
                <SelectContent className="max-h-56 bg-zinc-950 text-zinc-100 border-zinc-850">
                  {referees.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
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
