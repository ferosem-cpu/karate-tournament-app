'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const COUNTRIES = ['India', 'Japan', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'France'];

export default function Step2TournamentInfo({ wizardData, onNext }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(wizardData.tournamentInfo || {
    name: '',
    organizerName: '',
    venue: '',
    city: '',
    country: 'India',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    numberOfTatamis: 1,
    description: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleNext = async () => {
    if (!form.name.trim()) return alert('Tournament name is required');
    if (!form.startDate) return alert('Start date is required');
    if (!form.endDate) return alert('End date is required');

    setBusy(true);
    // Simulate save
    setTimeout(() => {
      onNext({ tournamentInfo: form });
      setBusy(false);
    }, 500);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Tournament Information</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Tournament Name *
          </Label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Annual Karate Championship"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Organizer Name
          </Label>
          <Input
            value={form.organizerName}
            onChange={(e) => set('organizerName', e.target.value)}
            placeholder="Your Organization"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Venue
          </Label>
          <Input
            value={form.venue}
            onChange={(e) => set('venue', e.target.value)}
            placeholder="City Arena"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            City
          </Label>
          <Input
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="New Delhi"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Country
          </Label>
          <Select value={form.country} onValueChange={(v) => set('country', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Number of Tatamis
          </Label>
          <Input
            type="number"
            min="1"
            value={form.numberOfTatamis}
            onChange={(e) => set('numberOfTatamis', parseInt(e.target.value) || 1)}
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Start Date *
          </Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            End Date *
          </Label>
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Registration Deadline
          </Label>
          <Input
            type="date"
            value={form.registrationDeadline}
            onChange={(e) => set('registrationDeadline', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Description
        </Label>
        <Textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Tell spectators about your tournament…"
          rows={4}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={busy}
          className="bg-primary hover:bg-primary/90 min-w-[140px]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
