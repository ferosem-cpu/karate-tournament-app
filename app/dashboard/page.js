'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import RefereeApplicationForm from '@/components/referee-application-form';
import { Trophy, Users, Building2, Grid3x3, ArrowRight, Plus, CalendarDays, Activity } from 'lucide-react';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';
import { isAdminOrOrganizer } from '@/lib/constants';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [counts, setCounts] = useState({ dojos: 0, athletes: 0, tatamis: 0 });

  const role = profile?.role || 'spectator';
  const canCreateTournament = isAdminOrOrganizer(role);
  const showRefereeApplication = role !== 'referee' && role !== 'super_admin';

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(6));
    const unsub = onSnapshot(q, (snap) => {
      const allTournaments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const visibleTournaments = allTournaments.filter((t) => {
        if (t.status === 'draft') {
          const isOwner = user?.uid && t.ownerId === user.uid;
          const isSuperAdmin = profile?.role === 'super_admin';
          return isOwner || isSuperAdmin;
        }
        return true;
      });
      setTournaments(visibleTournaments);
    });

    const unsubD = onSnapshot(collection(db, 'dojos'), (s) => setCounts((c) => ({ ...c, dojos: s.size })));
    const unsubA = onSnapshot(collection(db, 'athletes'), (s) => setCounts((c) => ({ ...c, athletes: s.size })));
    const unsubT = onSnapshot(collection(db, 'tatamis'), (s) => setCounts((c) => ({ ...c, tatamis: s.size })));

    return () => {
      unsub();
      unsubD();
      unsubA();
      unsubT();
    };
  }, [user, profile]);

  const upcoming = tournaments.filter((t) => t.status === 'registration_open' || t.status === 'draft').length;
  const live = tournaments.filter((t) => t.status === 'live').length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${(profile?.displayName || 'Sensei').split(' ')[0]}`}
        description="Here's what's happening across your tournaments today."
        actions={
          canCreateTournament ? (
            <Button asChild className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold px-4 py-2">
              <Link href="/dashboard/tournaments/new">
                <Plus className="h-4 w-4 mr-2" />
                <span>New Tournament</span>
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        <StatCard icon={Trophy} label="Upcoming Tournaments" value={upcoming} />
        <StatCard icon={Activity} label="Live Now" value={live} pulse={live > 0} />
        {role !== 'spectator' && <StatCard icon={Users} label="Total Kohai" value={counts.athletes} />}
        {role !== 'spectator' && <StatCard icon={Building2} label="Registered Dojos" value={counts.dojos} />}
      </div>

      {showRefereeApplication && (
        <div className="mb-10">
          <RefereeApplicationForm />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-950 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
              <h2 className="text-xl font-bold text-zinc-50">Recent Tournaments</h2>
              <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
                <Link href="/dashboard/tournaments" className="flex items-center gap-1">
                  <span>View all</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {tournaments.length === 0 ? (
              <EmptyState canCreate={canCreateTournament} />
            ) : (
              <div className="space-y-3">
                {tournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/tournaments/${t.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
                  >
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-800" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-zinc-100 group-hover:text-white transition text-base">
                        {t.name}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>
                          {formatDate(t.startDate)} → {formatDate(t.endDate)} · {t.city || '—'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`capitalize text-xs ${statusColor(t.status)}`}>
                      {statusLabel(t.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950 shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-zinc-50 mb-6 border-b border-zinc-900 pb-4">Quick Actions</h2>
            <div className="space-y-1.5">
              {canCreateTournament && (
                <QuickLink href="/dashboard/tournaments/new" icon={Trophy} label="Create Tournament" />
              )}
              <QuickLink href="/dashboard/tournaments" icon={Trophy} label="Browse Tournaments" />
              {role !== 'spectator' && (
                <>
                  <QuickLink href="/dashboard/kohai" icon={Users} label="Register Kohai" />
                  <QuickLink href="/dashboard/dojos" icon={Building2} label="Manage Dojos" />
                </>
              )}
              {isAdminOrOrganizer(role) && (
                <QuickLink href="/dashboard/tatamis" icon={Grid3x3} label="Configure Tatamis" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, pulse }) {
  return (
    <Card className="border-zinc-850 bg-zinc-950 hover:border-zinc-800 transition-all shadow-md overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">{label}</div>
            <div className="text-3xl font-black text-zinc-100 mt-2 truncate">{value}</div>
          </div>
          <div className={`h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}>
            <Icon className="h-5 w-5 text-zinc-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all text-sm font-semibold group"
    >
      <Icon className="h-4.5 w-4.5 text-zinc-400 group-hover:text-white" />
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-30 group-hover:opacity-100 transition-all" />
    </Link>
  );
}

function EmptyState({ canCreate }) {
  return (
    <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
      <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Trophy className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="text-sm text-zinc-400 mb-5 font-semibold">
        {canCreate ? "No tournaments yet — let's create your first one." : 'No tournaments to show yet.'}
      </p>
      {canCreate && (
        <Button asChild className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold px-4 py-2 text-xs">
          <Link href="/dashboard/tournaments/new">
            <Plus className="h-4 w-4 mr-2" />
            <span>Create Tournament</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
