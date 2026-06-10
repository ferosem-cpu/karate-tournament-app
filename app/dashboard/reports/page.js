'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';
import { 
  BarChart3, 
  Trophy, 
  Users, 
  Building2, 
  Tags, 
  Grid3x3, 
  Award,
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

function ReportsPageContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const queryTournamentId = searchParams.get('tournamentId') || '';

  const [data, setData] = useState({
    tournaments: [], 
    athletes: [], 
    dojos: [], 
    categories: [], 
    tatamis: [], 
    registrations: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');

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

  // Filter allowed tournaments list by role
  const allowedTournaments = useMemo(() => {
    return (data.tournaments || []).filter((t) => {
      if (profile?.role === 'super_admin') return true;
      if (profile?.role === 'tournament_organizer') return t.ownerId === user?.uid;
      // Other roles see only active, non-draft tournaments
      return t.status !== 'draft';
    });
  }, [data.tournaments, profile?.role, user?.uid]);

  // Set initial selected tournament ID
  useEffect(() => {
    if (profile?.role === 'super_admin') {
      if (queryTournamentId) {
        setSelectedTournamentId(queryTournamentId);
      } else if (!selectedTournamentId) {
        setSelectedTournamentId('all');
      }
    } else {
      if (allowedTournaments.length > 0) {
        if (queryTournamentId && allowedTournaments.some(t => t.id === queryTournamentId)) {
          setSelectedTournamentId(queryTournamentId);
        } else if (!selectedTournamentId || selectedTournamentId === 'all' || !allowedTournaments.some(t => t.id === selectedTournamentId)) {
          setSelectedTournamentId(allowedTournaments[0].id);
        }
      } else {
        setSelectedTournamentId('');
      }
    }
  }, [allowedTournaments, queryTournamentId, profile?.role]);

  /* ==========================================================================
     1. LIVE CLIENT-SIDE RE-AGGREGATION (STOPPING ORPHANED GRAPHS)
     ========================================================================== */

  // Active tournaments reference index based on current selection
  const activeTournamentIds = useMemo(() => {
    if (selectedTournamentId === 'all') {
      return new Set((data.tournaments || []).map(t => t.id));
    }
    return new Set(selectedTournamentId ? [selectedTournamentId] : []);
  }, [data.tournaments, selectedTournamentId]);

  const activeDojoIds = useMemo(() => new Set((data.dojos || []).map(d => d.id)), [data.dojos]);

  // Filter registrations by selected tournament
  const activeRegistrations = useMemo(() => {
    return (data.registrations || []).filter(reg => 
      reg?.tournamentId && activeTournamentIds.has(reg.tournamentId)
    );
  }, [data.registrations, activeTournamentIds]);

  // Filter athletes registered in selected tournament
  const activeAthletes = useMemo(() => {
    const validCompetitors = (data.athletes || []).filter(ath => 
      ath?.dojoId && activeDojoIds.has(ath.dojoId)
    );
    if (selectedTournamentId === 'all') {
      return validCompetitors;
    }
    const registeredAthleteIds = new Set(activeRegistrations.map((r) => r.athleteId).filter(Boolean));
    return validCompetitors.filter((a) => registeredAthleteIds.has(a.id));
  }, [data.athletes, activeRegistrations, activeDojoIds, selectedTournamentId]);

  // Derive counts dynamically
  const activeTournamentsCount = selectedTournamentId === 'all' ? data.tournaments.length : (selectedTournamentId ? 1 : 0);
  const activeAthletesCount = activeAthletes.length;
  const activeDojosCount = useMemo(() => {
    if (selectedTournamentId === 'all') {
      return data.dojos.length;
    }
    return new Set(activeRegistrations.map(r => r.dojoId).filter(Boolean)).size;
  }, [data.dojos.length, activeRegistrations, selectedTournamentId]);

  const activeCategoriesCount = useMemo(() => {
    return (data.categories || []).filter(cat => 
      cat?.tournamentId && activeTournamentIds.has(cat.tournamentId)
    ).length;
  }, [data.categories, activeTournamentIds]);

  const activeTatamisCount = useMemo(() => {
    return (data.tatamis || []).filter(tat => 
      tat?.tournamentId && activeTournamentIds.has(tat.tournamentId)
    ).length;
  }, [data.tatamis, activeTournamentIds]);

  const activeRegistrationsCount = activeRegistrations.length;

  // Safe re-aggregation pipelines
  const beltDist = useMemo(() => aggregate(activeAthletes, (a) => a?.belt || 'Unspecified'), [activeAthletes]);
  const genderDist = useMemo(() => aggregate(activeAthletes, (a) => a?.gender || 'Unspecified'), [activeAthletes]);
  const dojoDist = useMemo(() => aggregate(activeAthletes, (a) => a?.dojoName || 'Unassigned').slice(0, 8), [activeAthletes]);
  const eventDist = useMemo(() => aggregate(activeAthletes, (a) => a?.eventType || 'Unspecified'), [activeAthletes]);

  const tournamentStatusDist = useMemo(() => {
    const list = selectedTournamentId === 'all' 
      ? data.tournaments 
      : (data.tournaments || []).filter(t => t.id === selectedTournamentId);
    return aggregate(list, (t) => statusLabel(t?.status || 'draft'));
  }, [data.tournaments, selectedTournamentId]);

  const regByTournament = useMemo(() => {
    if (selectedTournamentId === 'all') {
      return aggregate(activeRegistrations, (r) => r?.tournamentTitle || r?.tournamentName || 'Unnamed').slice(0, 8);
    }
    return aggregate(activeRegistrations, (r) => r?.categoryName || 'Unassigned').slice(0, 8);
  }, [activeRegistrations, selectedTournamentId]);

  // Chart titles
  const barChartTitle = selectedTournamentId === 'all' ? "Registrations per Tournament" : "Registrations per Category";
  const barChartSubtitle = selectedTournamentId === 'all' ? "Top events by active competitor registry" : "Competitor split across event categories";

  // Tournament particulars
  const currentTournament = useMemo(() => {
    return (data.tournaments || []).find((t) => t.id === selectedTournamentId);
  }, [data.tournaments, selectedTournamentId]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#FAFAFA] via-[#F3F4F6] to-[#E5E7EB] text-zinc-900 pb-16 overflow-hidden">
      
      {/* Subtitle Gold Watermark background element */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] select-none flex flex-col items-center justify-center font-black tracking-widest text-[8vw] leading-none text-[#C5A059] rotate-[-12deg]">
        <span>TOURNAMENT HUB</span>
        <span>ANALYTICS ENGINE</span>
        <span>TOURNAMENT HUB</span>
      </div>

      {/* Luxury Tagline Header Banner */}
      <div className="border-b border-[#C5A059]/30 bg-white/70 backdrop-blur-md px-8 py-8 relative z-10 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9C7A3C] block">
              {selectedTournamentId === 'all' ? 'Global Platform Metrics' : 'Tournament Particulars & Report'}
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 font-serif">
              Reports & Core Analytics
            </h1>
          </div>

          {/* Tournament Selector Dropdown */}
          {allowedTournaments.length > 0 && (
            <div className="w-full md:w-72 space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-[#9C7A3C] font-extrabold">Select Tournament Context</Label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="w-full bg-white border-2 border-[#C5A059]/30 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#C5A059] shadow-sm font-semibold transition"
              >
                {profile?.role === 'super_admin' && (
                  <option value="all">All Tournaments</option>
                )}
                {allowedTournaments.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-96 relative z-10 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#C5A059]" />
          <span className="text-zinc-500 font-semibold tracking-wider text-sm uppercase">Compiling dynamic registries...</span>
        </div>
      ) : allowedTournaments.length === 0 && profile?.role === 'tournament_organizer' ? (
        <div className="max-w-md mx-auto p-12 text-center relative z-10">
          <Trophy className="h-16 w-16 mx-auto text-[#C5A059]/60 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-zinc-800">No Tournaments Found</h2>
          <p className="text-sm text-zinc-500 mt-2 mb-6">You need to register at least one tournament to view analytics reports.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-8">

          {/* Tournament Particulars Card */}
          {selectedTournamentId !== 'all' && currentTournament && (
            <Card className="border-2 border-[#C5A059]/40 bg-zinc-950 text-white rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <Trophy className="h-24 w-24 text-[#C5A059]" />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] block mb-1">
                      Tournament Particulars
                    </span>
                    <h2 className="text-2xl font-black text-white font-serif">{currentTournament.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1">Organized by {currentTournament.organizerName || 'Platform Creator'}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 min-w-[140px] shadow-inner">
                      <span className="text-zinc-500 block uppercase tracking-widest text-[9px] font-extrabold mb-1">Timeline</span>
                      <span className="font-bold text-zinc-200">{formatDate(currentTournament.startDate)} → {formatDate(currentTournament.endDate)}</span>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 min-w-[140px] shadow-inner">
                      <span className="text-zinc-500 block uppercase tracking-widest text-[9px] font-extrabold mb-1">Location Venue</span>
                      <span className="font-bold text-zinc-200 truncate block max-w-[160px]" title={currentTournament.venue}>{currentTournament.venue || '—'}, {currentTournament.city || '—'}</span>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 min-w-[100px] shadow-inner flex flex-col justify-between">
                      <span className="text-zinc-500 block uppercase tracking-widest text-[9px] font-extrabold mb-1">Status</span>
                      <Badge className="bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30 capitalize text-[9px] font-extrabold tracking-wider px-2 py-0.5 mt-0.5 justify-center">
                        {statusLabel(currentTournament.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zoomed KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Kpi icon={Trophy} label={selectedTournamentId === 'all' ? "Active Tournaments" : "Current Tournament"} value={activeTournamentsCount} />
            <Kpi icon={Users} label="Verified Kohai" value={activeAthletesCount} />
            <Kpi icon={Building2} label="Active Dojos" value={activeDojosCount} />
            <Kpi icon={Tags} label="Verified Categories" value={activeCategoriesCount} />
            <Kpi icon={Grid3x3} label="Active Tatamis" value={activeTatamisCount} />
            <Kpi icon={Award} label="Entries Approved" value={activeRegistrationsCount} />
          </div>

          {/* Main Visualizations section */}
          <div className="grid lg:grid-cols-2 gap-8">
            <ChartCard title={barChartTitle} subtitle={barChartSubtitle}>
              {regByTournament.length === 0 ? (
                <Empty 
                  message="No registration data available" 
                  subMessage="Register competitors to this tournament to generate graphs" 
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

            <ChartCard title="Competitors by Dojo" subtitle={selectedTournamentId === 'all' ? "Roster counts of top 8 active dojos" : "Athletes count representing dojos in this tournament"}>
              {dojoDist.length === 0 ? (
                <Empty 
                  message="No dojo data available" 
                  subMessage="Ensure competing athletes belong to active dojos" 
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
            <ChartCard title="Belt Distribution" subtitle={selectedTournamentId === 'all' ? "All active competitor rank bands" : "Competitor rank splits in this tournament"}>
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

            <ChartCard title="Gender Distribution" subtitle={selectedTournamentId === 'all' ? "Dynamic gender registry splits" : "Competing athlete gender splits"}>
              {genderDist.length === 0 ? (
                <Empty 
                  message="No gender data available" 
                  subMessage="Awaiting competitor gender selections" 
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

            <ChartCard title="Event Mode Preferences" subtitle={selectedTournamentId === 'all' ? "Kata vs Kumite selections" : "Match category preferences in this tournament"}>
              {eventDist.length === 0 ? (
                <Empty 
                  message="No event preferences found" 
                  subMessage="Awaiting active event entries" 
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

function formatDate(dStr) {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dStr;
  }
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

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center h-96 space-y-4 bg-zinc-950/5 text-zinc-500">
        <Loader2 className="h-10 w-10 animate-spin text-[#C5A059]" />
        <span className="font-semibold tracking-wider text-sm uppercase">Loading reports dashboard...</span>
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}