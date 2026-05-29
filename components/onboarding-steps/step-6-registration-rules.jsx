'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function Step6RegistrationRules({ wizardData, onNext }) {
  const [rules, setRules] = useState(wizardData.registrationRules || {
    allowSpotRegistration: false,
    requireApproval: true,
    maxAthlatesPerDojo: '',
  });
  const [busy, setBusy] = useState(false);

  const handleNext = () => {
    setBusy(true);
    setTimeout(() => {
      onNext({ registrationRules: rules });
      setBusy(false);
    }, 500);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Registration Rules</h3>
      <p className="text-sm text-muted-foreground">Configure how athletes register for your tournament</p>

      <Card className="border-border/60">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="spotReg"
              checked={rules.allowSpotRegistration || false}
              onCheckedChange={(v) => setRules({ ...rules, allowSpotRegistration: v })}
            />
            <Label htmlFor="spotReg" className="flex-1 cursor-pointer">
              <div className="font-medium">Allow Spot Registrations</div>
              <div className="text-xs text-muted-foreground">Allow athletes to register on tournament day</div>
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="approval"
              checked={rules.requireApproval !== false}
              onCheckedChange={(v) => setRules({ ...rules, requireApproval: v })}
            />
            <Label htmlFor="approval" className="flex-1 cursor-pointer">
              <div className="font-medium">Require Approval</div>
              <div className="text-xs text-muted-foreground">Review and approve athlete registrations</div>
            </Label>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Max Athletes Per Dojo (optional)
            </Label>
            <Input
              type="number"
              value={rules.maxAthlatesPerDojo || ''}
              onChange={(e) => setRules({ ...rules, maxAthlatesPerDojo: e.target.value })}
              placeholder="Leave blank for unlimited"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
