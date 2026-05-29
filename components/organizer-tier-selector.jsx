'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createOrganizerLicense, ORGANIZER_PLANS, renewOrganizerLicense } from '@/lib/organizer-license-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, AlertCircle, Loader2, Zap, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizerTierSelector() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  if (!user) return null;

  const handleSelectPlan = async (plan) => {
    if (!confirm(`Activate ${ORGANIZER_PLANS[plan].label} plan for $${ORGANIZER_PLANS[plan].monthlyPrice}/month?`)) {
      return;
    }

    setLoading(true);
    try {
      await createOrganizerLicense(user.uid, plan, 1);
      toast.success(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`);
      setSelectedPlan(plan);
    } catch (err) {
      toast.error(err.message || 'Failed to activate plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">Tournament Organizer Plans</h3>
        <p className="text-sm text-muted-foreground">
          Choose a plan to manage your tournaments and athletes
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(ORGANIZER_PLANS).map(([planType, plan]) => (
          <Card
            key={planType}
            className={`border-2 transition ${
              selectedPlan === planType
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-primary/40'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{plan.label}</h4>
                  <p className="text-2xl font-bold mt-1">${plan.monthlyPrice}<span className="text-xs text-muted-foreground">/mo</span></p>
                </div>
                {selectedPlan === planType && (
                  <Badge className="bg-primary text-white">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>

              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">{plan.maxAthletes} athletes max</span>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Features</p>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleSelectPlan(planType)}
                disabled={loading || selectedPlan === planType}
                className="w-full"
                variant={selectedPlan === planType ? 'outline' : 'default'}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {selectedPlan === planType ? 'Current Plan' : 'Select'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="border-amber-500/40 bg-amber-500/5">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="text-amber-300/90">
          Plans are billed monthly. You can change or cancel anytime from your account settings.
        </AlertDescription>
      </Alert>
    </div>
  );
}
