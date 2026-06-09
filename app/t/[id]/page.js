'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RegistrationDialog from '@/components/registration-dialog';
import ParticipateTournamentDialog from '@/components/participate-tournament-dialog';
import { 
  Calendar, 
  MapPin, 
  Grid3x3, 
  FileDown, 
  Trophy, 
  Loader2, 
  Building2, 
  Video, 
  ExternalLink, 
  Award
} from 'lucide-react';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function PublicTournamentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time details
  const [categories, setCategories] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [tatamis, setTatamis] = useState([]);
  const [matches, setMatches] = useState([]);
  
  // Dialog controls
  const [regOpen, setRegOpen] = useState(false);
  const [participateOpen, setParticipateOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', id), (s) => {
      if (s.exists()) setT({ id: s.id, ...s.data() });
      else setT(null);
      setLoading(false);
    });

    const u2 = onSnapshot(query(collection(db, 'categories'), where('tournamentId', '==', id)), (s) => setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', id)), (s) => setRegistrations(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(collection(db, 'tatamis'), where('tournamentId', '==', id)), (s) => setTatamis(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u5 = onSnapshot(query(collection(db, 'matches'), where('tournamentId', '==', id)), (s) => setMatches(s.docs.map((d) => ({ id: d.id, ...d.data() }))));

    return () => { unsub(); u2(); u3(); u4(); u5(); };
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );

  if (!t) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <Trophy className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">Tournament not found.</p>
    </div>
  );

  if (t.status === 'draft') {
    const isOwner = user?.uid && t.ownerId === user.uid;
    const isSuperAdmin = profile?.role === 'super_admin';
    if (!isOwner && !isSuperAdmin) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
          <Trophy className="h-12 w-12 text-muted-foreground animate-pulse" />
          <h2 className="text-xl font-bold text-zinc-100">Draft Tournament</h2>
          <p className="text-zinc-500 text-sm max-w-sm text-center">
            This tournament is currently in draft mode and is not visible to the public. Only the organizer and super admins can view it.
          </p>
        </div>
      );
    }
  }

  const handleRegisterClick = () => {
    if (!user) {
      toast.info('Please sign in to register competitors.');
      router.push(`/login?redirect=/t/${id}`);
      return;
    }

    const role = profile?.role || 'spectator';
    const isOwner = t.ownerId === user.uid;
    const isSuperAdmin = role === 'super_admin';

    if (isSuperAdmin || (role === 'tournament_organizer' && isOwner)) {
      setRegOpen(true);
    } else if (role === 'dojo_admin' || role === 'coach') {
      setParticipateOpen(true);
    } else {
      toast.error('Only Dojo Admins and Coaches can register athletes. Apply for a role change in Settings to proceed.');
    }
  };

  const uniqueDojos = Array.from(
    new Set(registrations.filter((r) => r.status === 'approved').map((r) => r.dojoName).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Hero banner */}
      <div className="relative h-72 md:h-[480px] bg-gradient-to-br from-black via-zinc-950 to-red-950 overflow-hidden">
        {t.bannerUrl ? (
          <img src={t.bannerUrl} alt="" className="h-full w-full object-cover opacity-60" />
        ) : <div className="h-full w-full bg-grid opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
              alt="Tournament Hub"
              className="h-8 w-8 rounded-md object-cover ring-1 ring-white/10"
            />
            <span className="text-xs font-bold tracking-widest uppercase text-white">Tournament Hub</span>
          </div>
          <Badge variant="outline" className={statusColor(t.status)}>{statusLabel(t.status)}</Badge>
        </div>
        <div className="absolute bottom-0 inset-x-0 px-6 md:px-12 pb-8">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end gap-6">
            {t.logoUrl ? (
              <img src={t.logoUrl} alt="" className="h-24 w-24 md:h-32 md:w-32 rounded-xl object-cover ring-4 ring-background shadow-2xl" />
            ) : (
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-xl gradient-red-gold flex items-center justify-center ring-4 ring-background shadow-2xl">
                <Trophy className="h-12 w-12 md:h-16 md:w-16 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">{t.name}</h1>
              {t.organizerName && <p className="text-base md:text-lg text-muted-foreground mt-2">Organized by {t.organizerName}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {/* Info grid */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <InfoCard icon={Calendar} title="Dates" lines={[`${formatDate(t.startDate)}`, `→ ${formatDate(t.endDate)}`]} />
          <InfoCard icon={MapPin} title="Venue" lines={[t.venue || '—', `${t.city || ''}${t.city && t.country ? ', ' : ''}${t.country || ''}`]} />
          <InfoCard icon={Grid3x3} title="Tatamis" lines={[`${t.numberOfTatamis || tatamis.length || 1} competition areas`]} />
        </div>

        {t.description && (
          <Card className="border-border/60 mb-8 bg-zinc-950/40">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-3 text-zinc-100">About the Tournament</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{t.description}</p>
            </CardContent>
          </Card>
        )}

        {/* CTA: Brochure + Registration */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-zinc-950/60 to-accent/5 mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1 text-zinc-150">Tournament Brochure</h3>
                <p className="text-sm text-muted-foreground">Download the official brochure with categories, schedule and rules.</p>
              </div>
              {t.brochureUrl ? (
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                  <a href={t.brochureUrl} target="_blank" rel="noopener noreferrer" download><FileDown className="h-5 w-5 mr-2" /> Download Brochure</a>
                </Button>
              ) : (
                <Button size="lg" disabled variant="outline">Brochure coming soon</Button>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-border/60 flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-200">Registration {t.status === 'registration_open' ? 'is OPEN' : 'status: ' + statusLabel(t.status)}</div>
                {t.registrationDeadline && <div className="text-xs text-muted-foreground">Deadline: {formatDate(t.registrationDeadline)}</div>}
              </div>
              <Button 
                onClick={handleRegisterClick}
                disabled={t.status !== 'registration_open'} 
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
              >
                Register Kohai
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Tabs */}
        <Tabs defaultValue="categories" className="w-full mb-10">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-950 border border-zinc-850 p-1 rounded-xl">
            <TabsTrigger value="categories" className="text-xs md:text-sm font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
              <Award className="h-4 w-4 mr-2 text-gold-primary" /> Event Divisions
            </TabsTrigger>
            <TabsTrigger value="tatamis" className="text-xs md:text-sm font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
              <Grid3x3 className="h-4 w-4 mr-2 text-gold-primary" /> Tatamis & Live
            </TabsTrigger>
            <TabsTrigger value="dojos" className="text-xs md:text-sm font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2 text-gold-primary" /> Participating Dojos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            <Card className="border-border/60 bg-zinc-950/40">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-zinc-100 mb-4">Event Categories</h3>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No categories configured for this tournament yet.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {categories.map((c) => {
                      const catMatches = matches.filter((m) => m.categoryId === c.id);
                      return (
                        <div key={c.id} className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 hover:border-zinc-800 transition flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <h4 className="font-bold text-sm text-zinc-200 truncate">{c.name}</h4>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{c.eventType}</Badge>
                              <Badge variant="outline" className="text-[10px]">{c.gender}</Badge>
                            </div>
                          </div>
                          {catMatches.length > 0 ? (
                            <Button asChild size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 shrink-0">
                              <Link href={`/bracket/${c.id}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Brackets
                              </Link>
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-850 shrink-0">Brackets pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tatamis" className="mt-6">
            <Card className="border-border/60 bg-zinc-950/40">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-zinc-100 mb-4">Tatami Rings & Streams</h3>
                {tatamis.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No competition tatami rings configured yet.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tatamis.map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-zinc-200">{t.name}</h4>
                            <p className="text-xs text-zinc-400 mt-1">Lead Referee: {t.assignedRefereeName || 'TBD'}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize bg-zinc-950 border-zinc-850">
                            {t.status || 'Active'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {t.streamingUrl && (
                            <Button asChild size="sm" variant="outline" className="flex-1 border-rose-500/40 text-rose-400 hover:bg-rose-500/10">
                              <a href={t.streamingUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="h-3.5 w-3.5 mr-1.5 animate-pulse" /> Watch Stream
                              </a>
                            </Button>
                          )}
                          {t.status !== 'closed' && (
                            <Button asChild size="sm" variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10">
                              <Link href={`/tatami/${t.id}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Live Scoring
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dojos" className="mt-6">
            <Card className="border-border/60 bg-zinc-950/40">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-zinc-100 mb-4">Registered Dojos</h3>
                {uniqueDojos.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No dojos registered yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {uniqueDojos.map((name) => (
                      <div key={name} className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm truncate text-zinc-200">{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="text-center text-xs text-muted-foreground py-8 border-t border-zinc-900">
          Powered by <span className="text-gold font-semibold">TOURNAMENT HUB</span> · Global Competition Platform
        </footer>
      </div>

      <RegistrationDialog open={regOpen} onOpenChange={setRegOpen} tournament={t} />
      <ParticipateTournamentDialog open={participateOpen} onOpenChange={setParticipateOpen} tournament={t} />
    </div>
  );
}

function InfoCard({ icon: Icon, title, lines }) {
  return (
    <Card className="border-border/60 bg-zinc-950/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground font-bold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </div>
        {lines.map((l, i) => (
          <div key={i} className={i === 0 ? 'font-semibold text-zinc-200 text-sm' : 'text-xs text-muted-foreground'}>{l}</div>
        ))}
      </CardContent>
    </Card>
  );
}
