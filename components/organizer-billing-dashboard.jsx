'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getOrganizerLicense, getPlanDetails, ORGANIZER_PLANS } from '@/lib/organizer-license-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Calendar, Users, CreditCard, Loader2 } from 'lucide-react';
import OrganizerTierSelector from './organizer-tier-selector';

export default function OrganizerBillingDashboard() {
  const { user } = useAuth();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planDetails, setPlanDetails] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchLicense = async () => {
      try {
        const lic = await getOrganizerLicense(user.uid);
        setLicense(lic);

        if (lic?.plan) {
          const details = getPlanDetails(lic.plan);
          setPlanDetails(details);
        }
      } catch (err) {
        console.error('Failed to fetch license:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLicense();
  }, [user?.uid]);

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading plan information…
        </CardContent>
      </Card>
    );
  }

  // No active license
  if (!license?.active) {
    return (
      <div className="space-y-6">
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-300/90">
            You don't have an active organizer license. Select a plan below to get started.
          </AlertDescription>
        </Alert>
        <OrganizerTierSelector />
      </div>
    );
  }

  // Active license
  const expiresAt = license.expiresAt?.toDate?.() || new Date(license.expiresAt);
  const isExpiringSoon = expiresAt.getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;
  const planLabel = ORGANIZER_PLANS[license.plan]?.label || 'Unknown';

  return (
    <div className="space-y-6">
      <Card className={`border-2 ${isExpiringSoon ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Current Plan */}
            <div>
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Current Plan</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">{planLabel}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${ORGANIZER_PLANS[license.plan]?.monthlyPrice}/month
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm">Plan is active and valid</span>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div>
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Plan Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Maximum Athletes</p>
                    <p className="font-semibold">{planDetails?.maxAthletes || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="font-semibold">{expiresAt.toLocaleDateString()}</p>
                  </div>
                </div>

                {isExpiringSoon && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 w-fit">
                    Expiring soon
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-semibold mb-3">Included Features</h4>
            <div className="grid sm:grid-cols-2 gap-2">
              {planDetails?.features?.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="mt-6 flex gap-2">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
            {isExpiringSoon && (
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                Renew Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
