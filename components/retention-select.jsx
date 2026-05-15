'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RETENTION_OPTIONS } from '@/lib/constants';
import { Clock } from 'lucide-react';

export default function RetentionSelect({ value, onChange, label = 'Media Retention', compact = false }) {
  return (
    <div>
      {!compact && <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><Clock className="h-3 w-3" /> {label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={compact ? 'h-8 text-xs' : ''}><SelectValue /></SelectTrigger>
        <SelectContent>
          {RETENTION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}{o.value === 'permanent' ? ' · archival' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
