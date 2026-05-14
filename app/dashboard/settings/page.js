'use client';

import { useAuth } from '@/lib/auth-context';
import PageHeader from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  return (
    <>
      <PageHeader title="Settings" description="Account and platform preferences." />
      <Card className="border-border/60 max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <Row label="Name" value={profile?.displayName || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Role" value={<Badge variant="outline" className="capitalize">{(profile?.role || 'organizer').replace(/_/g, ' ')}</Badge>} />
          <Row label="UID" value={<code className="text-xs">{user?.uid}</code>} />
        </CardContent>
      </Card>
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
