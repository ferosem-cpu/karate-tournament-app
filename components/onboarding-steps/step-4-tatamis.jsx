'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Step4Tatamis({ wizardData, onNext }) {
  const [tatamis, setTatamis] = useState(wizardData.tatamis || []);
  const [newTatamiName, setNewTatamiName] = useState('');
  const [busy, setBusy] = useState(false);
  const [referees, setReferees] = useState([]);

  useEffect(() => {
    const fetchReferees = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'referee')
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().displayName || d.data().fullName || d.data().email || 'Sensei',
        }));
        setReferees(list);
      } catch (err) {
        console.error("Error fetching referees:", err);
      }
    };
    fetchReferees();
  }, []);

  const addTatami = () => {
    if (!newTatamiName.trim()) return alert('Tatami name required');
    setTatamis([
      ...tatamis,
      {
        id: Date.now(),
        name: newTatamiName.trim(),
        assignedRefereeId: null,
        assignedRefereeName: 'Unassigned',
      },
    ]);
    setNewTatamiName('');
  };

  const autoCreateTatamis = () => {
    const count = 4;
    const newTats = [];
    for (let i = 1; i <= count; i++) {
      const assignedRef = referees.length > 0 ? referees[(i - 1) % referees.length] : null;
      newTats.push({
        id: Date.now() + i,
        name: `Tatami ${i}`,
        assignedRefereeId: assignedRef ? assignedRef.id : null,
        assignedRefereeName: assignedRef ? assignedRef.name : 'Unassigned',
      });
    }
    setTatamis(newTats);
  };

  const removeTatami = (id) => {
    setTatamis(tatamis.filter((t) => t.id !== id));
  };

  const handleNext = () => {
    setBusy(true);
    setTimeout(() => {
      onNext({ tatamis });
      setBusy(false);
    }, 500);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Ring / Tatami Setup</h3>
      <p className="text-sm text-muted-foreground">Configure match areas (Tatamis) and assign lead referees.</p>

      <div className="flex gap-2">
        <Input
          value={newTatamiName}
          onChange={(e) => setNewTatamiName(e.target.value)}
          placeholder="Ring 1, Ring 2, etc…"
          onKeyPress={(e) => e.key === 'Enter' && addTatami()}
          className="flex-1"
        />
        <Button onClick={addTatami} variant="outline" title="Add Manually">
          <Plus className="h-4 w-4" />
        </Button>
        <Button onClick={autoCreateTatamis} variant="outline" className="border-amber-500/40 text-amber-350 hover:bg-amber-500/10">
          <Wand2 className="h-4 w-4 mr-2" /> Auto Create (4 Rings)
        </Button>
      </div>

      {tatamis.length > 0 && (
        <div className="space-y-2">
          {tatamis.map((tat) => (
            <div key={tat.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex-1 min-w-0 pr-4">
                <span className="font-semibold text-sm">{tat.name}</span>
                <div className="text-xs text-muted-foreground mt-1">
                  Lead Referee: <strong className="text-zinc-350">{tat.assignedRefereeName || 'Unassigned'}</strong>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={tat.assignedRefereeId || 'unassigned'}
                  onValueChange={(val) => {
                    const ref = referees.find(r => r.id === val);
                    setTatamis(tatamis.map(t => t.id === tat.id ? {
                      ...t,
                      assignedRefereeId: val === 'unassigned' ? null : val,
                      assignedRefereeName: val === 'unassigned' ? 'Unassigned' : (ref?.name || 'Unassigned')
                    } : t));
                  }}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Assign Referee" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 text-zinc-100 border-zinc-850 text-xs">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {referees.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeTatami(tat.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center">Total: {tatamis.length} ring(s)</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
