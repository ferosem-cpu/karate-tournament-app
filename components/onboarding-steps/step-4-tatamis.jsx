'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export default function Step4Tatamis({ wizardData, onNext }) {
  const [tatamis, setTatamis] = useState(wizardData.tatamis || []);
  const [newTatamiName, setNewTatamiName] = useState('');
  const [busy, setBusy] = useState(false);

  const addTatami = () => {
    if (!newTatamiName.trim()) return alert('Tatami name required');
    setTatamis([...tatamis, { id: Date.now(), name: newTatamiName }]);
    setNewTatamiName('');
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
      <h3 className="text-lg font-semibold">Ring / Tatami Management</h3>
      <p className="text-sm text-muted-foreground">Set up the rings/tatamis for your tournament</p>

      <div className="flex gap-2">
        <Input
          value={newTatamiName}
          onChange={(e) => setNewTatamiName(e.target.value)}
          placeholder="Ring 1, Ring 2, etc…"
          onKeyPress={(e) => e.key === 'Enter' && addTatami()}
        />
        <Button onClick={addTatami} variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {tatamis.length > 0 && (
        <div className="space-y-2">
          {tatamis.map((tat) => (
            <div key={tat.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="font-medium">{tat.name}</span>
              <Button variant="ghost" size="sm" onClick={() => removeTatami(tat.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
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
