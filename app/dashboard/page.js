'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Trophy, Users, Building2, Grid3x3, ArrowRight, Plus, CalendarDays, Activity } from 'lucide-react';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [counts, setCounts] = useState({ dojos: 0, athletes: 0, tatamis: 0 });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(6));
    const unsub = onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubD = onSnapshot(collection(db, 'dojos'), (s) => setCounts((c) => ({ ...c, dojos: s.size })));
    const unsubA = onSnapshot(collection(db, 'athletes'), (s) => setCounts((c) => ({ ...c, athletes: s.size })));
    const unsubT = onSnapshot(collection(db, 'tatamis'), (s) => setCounts((c) => ({ ...c, tatamis: s.size })));
    return () => { unsub(); unsubD(); unsubA(); unsubT(); };
  }, [user]);

  const upcoming = tournaments.filter((t) => t.status === 'registration_open' || t.status === 'draft').length;
  const live = tournaments.filter((t) => t.status === 'live').length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${(profile?.displayName || 'Sensei').split(' ')[0]}`}
        description="Here's what's happening across your tournaments today."
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/dashboard/tournaments/new"><Plus className="h-4 w-4 mr-2" /> New Tournament</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Trophy} label="Upcoming Tournaments" value={upcoming} accent="text-gold" />
        <StatCard icon={Activity} label="Live Now" value={live} accent="text-primary" pulse={live > 0} />
        <StatCard icon={Users} label="Total Kohai" value={counts.athletes} />
        <StatCard icon={Building2} label="Registered Dojos" value={counts.dojos} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Recent Tournaments</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/tournaments">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
            {tournaments.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {tournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/tournaments/${t.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition group"
                  >
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt="" className="h-12 w-12 rounded-md object-cover ring-1 ring-border" />
                    ) : (
                      <div className="h-12 w-12 rounded-md gradient-red-gold flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate group-hover:text-primary transition">{t.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <CalendarDays className="h-3 w-3" /> {formatDate(t.startDate)} → {formatDate(t.endDate)} · {t.city || '—'}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColor(t.status)}>{statusLabel(t.status)}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickLink href="/dashboard/tournaments/new" icon={Trophy} label="Create Tournament" />
              <QuickLink href="/dashboard/kohai/new" icon={Users} label="Register Kohai" />
              <QuickLink href="/dashboard/kohai/bulk-upload" icon={Users} label="Bulk Upload Kohai" />
              <QuickLink href="/dashboard/dojos" icon={Building2} label="Manage Dojos" />
              <QuickLink href="/dashboard/tatamis" icon={Grid3x3} label="Configure Tatamis" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, accent, pulse }) {
  return (
    <Card className="border-border/60 bg-card overflow-hidden relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`text-3xl font-bold mt-2 ${accent || ''}`}>{value}</div>
          </div>
          <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, label }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary/60 transition text-sm">
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <Trophy className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">No tournaments yet — let's create your first one.</p>
      <Button asChild className="bg-primary hover:bg-primary/90">
        <Link href="/dashboard/tournaments/new"><Plus className="h-4 w-4 mr-2" /> Create Tournament</Link>
      </Button>
    </div>
  );
}
