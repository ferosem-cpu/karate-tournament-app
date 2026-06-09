'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, addDoc, serverTimestamp, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { canManageTatamis } from '@/lib/constants';

export default function AutoCreateTatamisDialog({ open, onOpenChange, tournaments, lockedTournamentId }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(4);
  const [tournamentId, setTournamentId] = useState(lockedTournamentId || '');
  const [prefix, setPrefix] = useState('Tatami');
  const [referees, setReferees] = useState([]);

  useEffect(() => {
    if (lockedTournamentId) {
      setTournamentId(lockedTournamentId);
    }
  }, [lockedTournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    const fetchTournamentReferees = async () => {
      try {
        const q = query(
          collection(db, 'referee_applications'),
          where('tournamentId', '==', tournamentId),
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
        console.error("Error fetching tournament referees:", err);
      }
    };
    fetchTournamentReferees();
  }, [tournamentId]);

  const create = async () => {
    if (!canManageTatamis(profile?.role)) {
      return toast.error('View-only: you cannot create tatamis');
    }
    if (!tournamentId) return toast.error('Select a tournament');
    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t) return;

    if (profile?.role === 'tournament_organizer' && t.ownerId !== user?.uid) {
      return toast.error('You only have permission to manage tatamis for your own tournaments.');
    }

    const n = Math.max(1, Math.min(50, Number(count) || 1));
    setBusy(true);
    try {
      const batch = writeBatch(db);
      for (let i = 1; i <= n; i++) {
        const assignedRef = referees.length > 0 ? referees[(i - 1) % referees.length] : null;
        const ref = doc(collection(db, 'tatamis'));
        batch.set(ref, {
          name: `${prefix} ${i}`,
          tournamentId: t.id, tournamentName: t.name,
          status: 'active',
          assignedRefereeName: assignedRef ? assignedRef.name : 'Unassigned',
          assignedRefereeId: assignedRef ? assignedRef.id : null,
          notes: 'Auto-created',
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          createdBy: user.uid, ownerId: user.uid,
        });
      }
      await batch.commit();
      toast.success(`${n} tatamis created`);
      onOpenChange(false);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Auto Create Tatamis</DialogTitle>
          <DialogDescription>Quickly generate multiple tatamis with referees auto-assigned from the tournament roster.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!lockedTournamentId && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Tournament *</Label>
              <Select value={tournamentId || undefined} onValueChange={setTournamentId}>
                <SelectTrigger><SelectValue placeholder="Select tournament…" /></SelectTrigger>
                <SelectContent>{tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Number *</Label><Input type="number" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)} /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Name Prefix</Label><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Tatami" /></div>
          </div>
          <div className="text-xs text-muted-foreground bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
            Approved referees will be automatically assigned to the rings in a round-robin order.
            <div className="mt-1 font-semibold text-zinc-300">
              → {referees.length} referee(s) available
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-2" /> Create</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
