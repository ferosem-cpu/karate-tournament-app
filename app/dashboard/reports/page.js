'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BarChart3, 
  Trophy, 
  Users, 
  Building2, 
  Tags, 
  Grid3x3, 
  Award,
  Calendar,
  Layers,
  PieChart as PieIcon,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

// Premium Champagne Gold and Metallic Bronze thematic palette
const CHART_COLORS = [
  '#C5A059', // Champagne Gold
  '#9C7A3C', // Burnished Bronze
  '#DFBA73', // Light Brass
  '#4B5563', // Platinum Charcoal
  '#71717A', // Brushed Silver
  '#A1A1AA', // Matte Grey
  '#E4E4E7'  // Pearl White
];

export default function ReportsPage() {
  const [data, setData] = useState({
    tournaments: [], 
    athletes: [], 
    dojos: [], 
    categories: [], 
    tatamis: [], 
    registrations: [],
  });
  const [loading, setLoading] = useState(true);

  // Real-time hot-reloading listener
  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'tournaments'), (s) => setData((d) => ({ ...d, tournaments: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'athletes'), (s) => setData((d) => ({ ...d, athletes: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'dojos'), (s) => setData((d) => ({ ...d, dojos: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'categories'), (s) => setData((d) => ({ ...d, categories: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'tatamis'), (s) => setData((d) => ({ ...d, tatamis: s.docs.map((x) => ({ id: x.id, ...x.data() })) }))),
      onSnapshot(collection(db, 'tournament_registrations'), (s) => {
        setData((d) => ({ ...d, registrations: s.docs.map((x) => ({ id: x.id, ...x.data() })) }));
        setLoading(false);
      }, () => setLoading(false)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  /* ==========================================================================
     1. LIVE CLIENT-SIDE RE-AGGREGATION (STOPPING ORPHANED GRAPHS)
     ========================================================================== */

  // Extract valid, active reference indices directly in the render cycle
  const activeTournamentIds = new Set((data?.tournaments || []).map(t => t.id));
  const activeDojoIds = new Set((data?.dojos || []).map(d => d.id));

  // Filter out any registration documents belonging to deleted/missing tournaments
  const activeRegistrations = (data?.registrations || []).filter(reg => 
    reg?.tournamentId && activeTournamentIds.has(reg.tournamentId)
  );

  // Filter out any athlete records belonging to deleted/missing dojos
  const activeAthletes = (data?.athletes || []).filter(ath => 
    ath?.dojoId && activeDojoIds.has(ath.dojoId)
  );

  // Derive counts dynamically using validated, filtered arrays
  const activeTournamentsCount = data?.tournaments?.length || 0;
  const activeAthletesCount = activeAthletes?.length || 0;
  const activeDojosCount = data?.dojos?.length || 0;
  const activeCategoriesCount = (data?.categories || []).filter(cat => 
    cat?.tournamentId && activeTournamentIds.has(cat.tournamentId)
  ).length;
  const activeTatamisCount = (data?.tatamis || []).filter(tat => 
    tat?.tournamentId && activeTournamentIds.has(tat.tournamentId)
  ).length;
  const activeRegistrationsCount = activeRegistrations.length;

  // Safe re-aggregation pipelines with robust optional chaining
  const beltDist = aggregate(activeAthletes, (a) => a?.belt || 'Unspecified');
  const genderDist = aggregate(activeAthletes, (a) => a?.gender || 'Unspecified');
  const dojoDist = aggregate(activeAthletes, (a) => a?.dojoName || 'Unassigned').slice(0, 8);
  const regByTournament = aggregate(activeRegistrations, (r) => r?.tournamentTitle || r?.tournamentName || 'Unnamed').slice(0, 8);
  const tournamentStatusDist = aggregate(data?.tournaments || [], (t) => statusLabel(t?.status || 'draft'));
  const eventDist = aggregate(activeAthletes, (a) => a?.eventType || 'Unspecified');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#FAFAFA] via-[#F3F4F6] to-[#E5E7EB] text-zinc-900 pb-16 overflow-hidden">
      
      {/* Subtitle Gold Watermark background element */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] select-none flex flex-col items-center justify-center font-black tracking-widest text-[8vw] leading-none text-[#C5A059] rotate-[-12deg]">
        <span>TOURNAMENT HUB</span>
        <span>ANALYTICS ENGINE</span>
        <span>TOURNAMENT HUB</span>
      </div>

      {/* Luxury Tagline Header Banner with Zoomed Typography */}
      <div className="border-b border-[#C5A059]/30 bg-white/70 backdrop-blur-md px-8 py-8 relative z-10 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9C7A3C] block">
              Global Platform Metrics
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 font-serif">
              Reports & Core Analytics
            </h1>
          </div>
          <p className="text-sm md:text-base font-semibold text-zinc-500 max-w-sm">
            Live client-side data re-aggregation blocks orphaned entries and cleans zombie graph registries automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-96 relative z-10 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#C5A059]" />
          <span className="text-zinc-500 font-semibold tracking-wider text-sm uppercase">Compiling dynamic registries...</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-8">

          {/* Zoomed KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Kpi icon={Trophy} label="Active Tournaments" value={activeTournamentsCount} />
            <Kpi icon={Users} label="Verified Kohai" value={activeAthletesCount} />
            <Kpi icon={Building2} label="Active Dojos" value={activeDojosCount} />
            <Kpi icon={Tags} label="Verified Categories" value={activeCategoriesCount} />
            <Kpi icon={Grid3x3} label="Active Tatamis" value={activeTatamisCount} />
            <Kpi icon={Award} label="Entries Approved" value={activeRegistrationsCount} />
          </div>

          {/* Main Visualizations section */}
          <div className="grid lg:grid-cols-2 gap-8">
            <ChartCard title="Registrations per Tournament" subtitle="Top events by active competitor registry">
              {regByTournament.length === 0 ? (
                <Empty 
                  message="No registration data available" 
                  subMessage="Create a tournament and register competitors to generate graphs" 
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={regByTournament} margin={{ left: -10, right: 10, bottom: 20 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#71717A" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      interval={0} 
                      angle={-20} 
                      height={60} 
                      textAnchor="end"
                    />
                    <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(197, 160, 89, 0.05)' }} 
                      contentStyle={{ background: '#FFFFFF', border: '1px solid #C5A059', borderRadius: 8, color: '#18181B' }} 
                    />
                    <Bar dataKey="value" fill="#C5A059" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Competitors by Dojo" subtitle="Roster counts of top 8 active dojos">
              {dojoDist.length === 0 ? (
                <Empty 
                  message="No dojo data available" 
                  subMessage="Register competitor profiles under active dojos" 
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dojoDist} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#71717A" fontSize={11} width={110} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(197, 160, 89, 0.05)' }} 
                      contentStyle={{ background: '#FFFFFF', border: '1px solid #C5A059', borderRadius: 8 }} 
                    />
                    <Bar dataKey="value" fill="#9C7A3C" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ChartCard title="Belt Distribution" subtitle="All active competitor rank bands">
              {beltDist.length === 0 ? (
                <Empty 
                  message="No rank data available" 
                  subMessage="Awaiting competitor rank configurations" 
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={beltDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                      {beltDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #C5A059', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Gender Distribution" subtitle="Dynamic gender registry splits">
              {genderDist.length === 0 ? (
                <Empty 
                  message="No gender data available" 
                  subMessage="Add competitor profiles with gender data" 
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={genderDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                      {genderDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #C5A059', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Event Mode Preferences" subtitle="Kata vs Kumite selections">
              {eventDist.length === 0 ? (
                <Empty 
                  message="No event preferences found" 
                  subMessage="Awaiting active event type entries" 
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={eventDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                      {eventDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #C5A059', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Active Tournaments Status Overview" subtitle="System pipeline configuration status">
            {tournamentStatusDist.length === 0 ? (
              <Empty 
                message="No tournament status details" 
                subMessage="Register active tournaments on the platform" 
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tournamentStatusDist} margin={{ bottom: 10 }}>
                  <XAxis dataKey="name" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(197, 160, 89, 0.05)' }} 
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #C5A059', borderRadius: 8 }} 
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {tournamentStatusDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

        </div>
      )}

      {/* Luxury Copyright Footer Info */}
      <div className="max-w-7xl mx-auto px-6 mt-16 text-center border-t border-[#C5A059]/20 pt-8 relative z-10">
        <p className="text-sm md:text-base font-bold tracking-widest text-[#9C7A3C] uppercase">
          © 2026 Tournament Hub • Global Competition Platform
        </p>
      </div>

    </div>
  );
}

/* ==========================================================================
   UTILITY HELPER FUNCTIONS (PURE JAVASCRIPT)
   ========================================================================== */

function aggregate(arr, fn) {
  // Defensive code guards to prevent crash loops
  if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
  const m = {};
  arr.forEach((x) => { 
    if (x) {
      const k = fn(x); 
      m[k] = (m[k] || 0) + 1; 
    }
  });
  return Object.entries(m)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function statusLabel(s) {
  if (!s) return 'Draft';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Stat Card (KPI) with premium light metallic backgrounds & gold borders
function Kpi({ icon: Icon, label, value }) {
  return (
    <Card className="border-2 border-[#C5A059]/30 bg-white/80 shadow-md backdrop-blur-sm rounded-xl transition-all duration-200 hover:border-[#C5A059]/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
            <Icon className="h-5 w-5 text-[#9C7A3C]" />
          </div>
          <div className="min-w-0">
            {/* Defensive guard display */}
            <div className="text-2xl font-black text-zinc-900">
              {value !== undefined ? value : 0}
            </div>
            <div className="text-[10px] text-[#9C7A3C] font-extrabold uppercase tracking-widest truncate">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Chart Container Card with elegant gold borders
function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="border-2 border-[#C5A059]/20 bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#C5A059]/40">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500 font-semibold">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// 2. Luxury styled Empty data state fallback to prevent rendering empty/ghost bars
function Empty({ message = "No analytical data available", subMessage = "Awaiting active system registrations" }) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#C5A059]/20 rounded-xl bg-[#FAFAFA]/50 backdrop-blur-sm">
      <BarChart3 className="h-10 w-10 text-[#C5A059] opacity-70 mb-3 animate-pulse" />
      <p className="text-zinc-800 font-bold text-lg tracking-wide">{message}</p>
      <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-semibold">{subMessage}</p>
    </div>
  );
}