'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AutoCreateTatamisDialog({ open, onOpenChange, tournaments, lockedTournamentId }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(4);
  const [tournamentId, setTournamentId] = useState(lockedTournamentId || '');
  const [prefix, setPrefix] = useState('Tatami');
  const [defaultReferee, setDefaultReferee] = useState('');

  useEffect(() => {
    if (lockedTournamentId) {
      setTournamentId(lockedTournamentId);
    }
  }, [lockedTournamentId]);

  const create = async () => {
    if (!tournamentId) return toast.error('Select a tournament');
    if (!defaultReferee.trim()) return toast.error('Provide a default referee (can be edited per-tatami later)');
    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t) return;
    const n = Math.max(1, Math.min(50, Number(count) || 1));
    setBusy(true);
    try {
      const batch = writeBatch(db);
      for (let i = 1; i <= n; i++) {
        const ref = doc(collection(db, 'tatamis'));
        batch.set(ref, {
          name: `${prefix} ${i}`,
          tournamentId: t.id, tournamentName: t.name,
          status: 'active',
          assignedRefereeName: defaultReferee,
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
          <DialogDescription>Quickly generate multiple tatamis with default referee assigned. You can edit each after creation.</DialogDescription>
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
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Default Referee *</Label>
            <Input value={defaultReferee} onChange={(e) => setDefaultReferee(e.target.value)} placeholder="Sensei Patel" />
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
