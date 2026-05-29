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
  const [newCategory, setNewCategory] = useState({ name: '', eventType: 'Kata', minAge: '', maxAge: '', minWeight: '', maxWeight: '' });
  const [busy, setBusy] = useState(false);

  const addCategory = () => {
    if (!newCategory.name.trim()) return alert('Category name required');
    setCategories([...categories, { ...newCategory, id: Date.now() }]);
    setNewCategory({ name: '', eventType: 'Kata', minAge: '', maxAge: '', minWeight: '', maxWeight: '' });
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
      <h3 className="text-lg font-semibold">Divisions & Categories</h3>
      <p className="text-sm text-muted-foreground">
        Create categories based on age, belt, weight, and event type
      </p>

      <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
              Category Name
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
        </div>

        <Button onClick={addCategory} variant="outline" className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
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
