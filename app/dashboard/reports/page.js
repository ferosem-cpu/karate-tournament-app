'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/page-header';
import { BarChart3, Trophy, Users, Building2, Tags, Grid3x3, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const CHART_COLORS = ['hsl(0 75% 48%)', 'hsl(43 80% 52%)', 'hsl(210 80% 60%)', 'hsl(142 70% 45%)', 'hsl(280 70% 60%)', 'hsl(190 70% 50%)', 'hsl(20 80% 55%)'];

export default function ReportsPage() {
  const [data, setData] = useState({
    tournaments: [], athletes: [], dojos: [], categories: [], tatamis: [], registrations: [],
  });

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'tournaments'), (s) => setData((d) => ({ ...d, tournaments: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'athletes'), (s) => setData((d) => ({ ...d, athletes: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'dojos'), (s) => setData((d) => ({ ...d, dojos: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'categories'), (s) => setData((d) => ({ ...d, categories: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'tatamis'), (s) => setData((d) => ({ ...d, tatamis: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'tournament_registrations'), (s) => setData((d) => ({ ...d, registrations: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Aggregations
  const beltDist = aggregate(data.athletes, (a) => a.belt || 'Unspecified');
  const genderDist = aggregate(data.athletes, (a) => a.gender || 'Unspecified');
  const dojoDist = aggregate(data.athletes, (a) => a.dojoName || 'Unassigned').slice(0, 8);
  const regByTournament = aggregate(data.registrations, (r) => r.tournamentName || 'Unnamed').slice(0, 8);
  const tournamentStatusDist = aggregate(data.tournaments, (t) => statusLabel(t.status || 'draft'));
  const eventDist = aggregate(data.athletes, (a) => a.eventType || 'Unspecified');

  return (
    <>
      <PageHeader title="Reports" description="Platform-wide analytics across tournaments, dojos and kohai. All charts update in real time." />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Kpi icon={Trophy} label="Tournaments" value={data.tournaments.length} />
        <Kpi icon={Users} label="Kohai" value={data.athletes.length} />
        <Kpi icon={Building2} label="Dojos" value={data.dojos.length} />
        <Kpi icon={Tags} label="Categories" value={data.categories.length} />
        <Kpi icon={Grid3x3} label="Tatamis" value={data.tatamis.length} />
        <Kpi icon={Award} label="Registrations" value={data.registrations.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Registrations per Tournament" subtitle="Top tournaments by kohai count">
          {regByTournament.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regByTournament} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="name" stroke="hsl(0 0% 64%)" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} height={50} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'hsl(0 0% 14%)' }} contentStyle={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)', borderRadius: 6 }} />
                <Bar dataKey="value" fill="hsl(0 75% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Kohai by Dojo" subtitle="Top 8 dojos">
          {dojoDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dojoDist} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" stroke="hsl(0 0% 64%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(0 0% 64%)" fontSize={11} width={120} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(0 0% 14%)' }} contentStyle={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)', borderRadius: 6 }} />
                <Bar dataKey="value" fill="hsl(43 80% 52%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Belt Distribution" subtitle="All registered kohai">
          {beltDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={beltDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {beltDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)', borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Gender Split" subtitle="All kohai">
          {genderDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={genderDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {genderDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)', borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Event Preference" subtitle="Kata vs Kumite">
          {eventDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={eventDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {eventDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)', borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Tournament Status" subtitle="Pipeline overview">
        {tournamentStatusDist.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tournamentStatusDist}>
              <XAxis dataKey="name" stroke="hsl(0 0% 64%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(0 0% 64%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'hsl(0 0% 14%)' }} contentStyle={{ background: 'hsl(0 0% 9%)', border: '1px solid hsl(0 0% 16%)', borderRadius: 6 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {tournamentStatusDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}

function aggregate(arr, fn) {
  const m = {};
  arr.forEach((x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function statusLabel(s) {
  return (s || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <Card className="border-border/60"><CardContent className="p-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center"><Icon className="h-4 w-4 text-primary" /></div>
        <div className="min-w-0">
          <div className="text-xl font-bold">{value}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</div>
        </div>
      </div>
    </CardContent></Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="border-border/60"><CardContent className="p-5">
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </CardContent></Card>
  );
}

function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground"><BarChart3 className="h-6 w-6 mr-2 opacity-50" /> No data yet</div>;
}
