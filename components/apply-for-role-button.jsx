'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { submitRoleRequest } from '@/lib/role-request-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ApplyForRoleButton() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Spectators only; hide if sensei onboarding already elevated the account
  if (profile?.role !== 'spectator' || profile?.onboardedRoleSelection === 'sensei') {
    return null;
  }

  const handleApply = async () => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setLoading(true);
    try {
      await submitRoleRequest(user.uid, user.email, 'dojo_admin');
      setSubmitted(true);
      toast.success('Application submitted! We will review it shortly.');
    } catch (err) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-emerald-300">Application Submitted</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Your request to become a Dojo Admin has been submitted. Our team will review it and contact you soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold">Become a Dojo Admin</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your dojo's athletes and tournament registrations
            </p>
          </div>
          <Button
            onClick={handleApply}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 whitespace-nowrap"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Apply Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
