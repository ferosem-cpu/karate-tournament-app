'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';

const EVENT_TYPES = ['Kata', 'Kumite', 'Team Kata', 'Team Kumite'];

export default function Step3Categories({ wizardData, onNext }) {
  const [categories, setCategories] = useState(wizardData.categories || []);
  const [newCategory, setNewCategory] = useState({ 
    name: '', eventType: 'Kata', 
    minAge: '', maxAge: '', 
    minWeight: '', maxWeight: '',
    byAge: true, byWeight: true
  });
  const [busy, setBusy] = useState(false);

  const addCategory = () => {
    if (!newCategory.name.trim()) return alert('Event Category name required');
    if (!newCategory.byAge && !newCategory.byWeight) {
      return alert('Please check at least "Create event by age" or "Create event by weight"');
    }
    const catToAdd = {
      ...newCategory,
      minAge: newCategory.byAge ? newCategory.minAge : '',
      maxAge: newCategory.byAge ? newCategory.maxAge : '',
      minWeight: newCategory.byWeight ? newCategory.minWeight : '',
      maxWeight: newCategory.byWeight ? newCategory.maxWeight : '',
      id: Date.now()
    };
    setCategories([...categories, catToAdd]);
    setNewCategory({ 
      name: '', eventType: 'Kata', 
      minAge: '', maxAge: '', 
      minWeight: '', maxWeight: '',
      byAge: true, byWeight: true
    });
  };

  const removeCategory = (id) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleNext = () => {
    setBusy(true);
    setTimeout(() => {
      onNext({ categories });
      setBusy(false);
    }, 500);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Divisions & Event Categories</h3>
      <p className="text-sm text-muted-foreground">
        Create event categories based on age, belt, weight, and event type
      </p>

      <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
              Event Category Name
            </Label>
            <Input
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="U12 Boys Kata"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
              Event Type
            </Label>
            <Select value={newCategory.eventType} onValueChange={(v) => setNewCategory({ ...newCategory, eventType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 border-y border-zinc-800/40 py-2.5 my-1 flex gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input 
                type="checkbox" 
                checked={newCategory.byAge} 
                onChange={(e) => setNewCategory({ ...newCategory, byAge: e.target.checked })} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-secondary"
              />
              <span>Create event by age</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input 
                type="checkbox" 
                checked={newCategory.byWeight} 
                onChange={(e) => setNewCategory({ ...newCategory, byWeight: e.target.checked })} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-secondary"
              />
              <span>Create event by weight</span>
            </label>
          </div>

          {newCategory.byAge && (
            <>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  Min Age
                </Label>
                <Input type="number" value={newCategory.minAge} onChange={(e) => setNewCategory({ ...newCategory, minAge: e.target.value })} placeholder="6" />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  Max Age
                </Label>
                <Input type="number" value={newCategory.maxAge} onChange={(e) => setNewCategory({ ...newCategory, maxAge: e.target.value })} placeholder="11" />
              </div>
            </>
          )}

          {newCategory.byWeight && (
            <>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  Min Weight (kg)
                </Label>
                <Input type="number" value={newCategory.minWeight} onChange={(e) => setNewCategory({ ...newCategory, minWeight: e.target.value })} placeholder="20" />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  Max Weight (kg)
                </Label>
                <Input type="number" value={newCategory.maxWeight} onChange={(e) => setNewCategory({ ...newCategory, maxWeight: e.target.value })} placeholder="30" />
              </div>
            </>
          )}
        </div>

        <Button onClick={addCategory} variant="outline" className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event Category
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.eventType} {cat.minAge ? `· ${cat.minAge}-${cat.maxAge}y` : ''} {cat.minWeight ? `· ${cat.minWeight}-${cat.maxWeight}kg` : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeCategory(cat.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
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
