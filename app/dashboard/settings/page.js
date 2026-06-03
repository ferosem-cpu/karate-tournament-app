'use client';

import { useAuth } from '@/lib/auth-context';
import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ApplyForRoleButton from '@/components/apply-for-role-button';
import OrganizerBillingDashboard from '@/components/organizer-billing-dashboard';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const role = profile?.role || 'spectator';

  return (
    <>
      <PageHeader title="Settings" description="Account and platform preferences." />
      <Card className="border-border/60 max-w-2xl mb-6">
        <CardContent className="p-6 space-y-4">
          <Row label="Name" value={profile?.displayName || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row
            label="Role"
            value={
              <Badge variant="outline" className="capitalize">
                {role.replace(/_/g, ' ')}
              </Badge>
            }
          />
          <Row label="UID" value={<code className="text-xs">{user?.uid}</code>} />
        </CardContent>
      </Card>

      {role === 'spectator' && !profile?.onboardedRoleSelection && (
        <div className="max-w-2xl mb-6">
          <ApplyForRoleButton />
        </div>
      )}

      {role === 'tournament_organizer' && (
        <div className="max-w-3xl">
          <OrganizerBillingDashboard />
        </div>
      )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
