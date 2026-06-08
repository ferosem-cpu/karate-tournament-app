'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, deleteDoc, doc, onSnapshot, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/page-header';
import RegistrationDialog from '@/components/registration-dialog';
import ParticipateTournamentDialog from '@/components/participate-tournament-dialog';
import OrganizerApprovalDashboard from '@/components/organizer-approval-dashboard';
import {
  filterDisplayedRegistrations,
  tournamentRequiresApproval,
} from '@/lib/tournament-registrations';
import { Pencil, ExternalLink, Calendar, MapPin, FileText, Trophy, Copy, Grid3x3, Users, Plus, Tags, Trash2, Zap, Award, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, statusColor, statusLabel, cn } from '@/lib/utils';
import { beltClass, isSpectator } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import permissions from '@/lib/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export default function TournamentDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tatamis, setTatamis] = useState([]);
  const [regOpen, setRegOpen] = useState(false);
  const [participateOpen, setParticipateOpen] = useState(false);
  const [myDojo, setMyDojo] = useState(null);
  const [dojosListOpen, setDojosListOpen] = useState(false);
  const [categoriesListOpen, setCategoriesListOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'dojos'), where('ownerId', '==', user.uid));
    const unsubDojo = onSnapshot(q, (s) => {
      if (!s.empty) {
        setMyDojo({ id: s.docs[0].id, ...s.docs[0].data() });
      } else {
        setMyDojo(null);
      }
    });
    return () => unsubDojo();
  }, [user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', id), (s) => {
      if (s.exists()) setT({ id: s.id, ...s.data() });
      else setT(null);
      setLoading(false);
    });
    const u2 = onSnapshot(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', id)), (s) => setRegistrations(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'categories'), where('tournamentId', '==', id)), (s) => setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(collection(db, 'tatamis'), where('tournamentId', '==', id)), (s) => setTatamis(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub(); u2(); u3(); u4(); };
  }, [id]);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${id}` : '';
  const copy = () => { navigator.clipboard.writeText(publicUrl); toast.success('Public link copied'); };

  const canManageRegistrations = profile?.role === 'super_admin' || (profile?.role === 'tournament_organizer' && t?.ownerId === user?.uid);

  const canDeleteRow = (r) => {
    if (profile?.role === 'super_admin') return true;
    if (profile?.role === 'tournament_organizer' && t?.ownerId === user?.uid) return true;
    if (profile?.role === 'dojo_admin' && r.dojoId && r.dojoId === myDojo?.id) return true;
    return false;
  };

  const removeReg = async (rid, name, dojoId) => {
    const isAllowed = 
      profile?.role === 'super_admin' ||
      (profile?.role === 'tournament_organizer' && t?.ownerId === user?.uid) ||
      (profile?.role === 'dojo_admin' && dojoId && dojoId === myDojo?.id);

    if (!isAllowed) {
      toast.error('You do not have permission to remove registrations.');
      return;
    }
    if (!confirm(`Remove ${name} from this tournament?`)) return;
    try { await deleteDoc(doc(db, 'tournament_registrations', rid)); toast.success('Removed'); }
    catch (e) { toast.error(e.message); }
  };

  const handleToggleRegistration = async () => {
    if (!t) return;
    const newStatus = t.status === 'registration_open' ? 'registration_closed' : 'registration_open';
    const confirmMsg = newStatus === 'registration_closed' 
      ? 'Are you sure you want to close registration? This will restrict regular registrations.'
      : 'Are you sure you want to open registration?';
    if (!confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'tournaments', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(newStatus === 'registration_closed' ? 'Registration closed' : 'Registration opened');
    } catch (e) {
      toast.error(e.message || 'Failed to update registration status');
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;
  if (!t) return <div className="text-muted-foreground text-sm">Tournament not found.</div>;

  if (t.status === 'draft') {
    const isOwner = user?.uid && t.ownerId === user.uid;
    const isSuperAdmin = profile?.role === 'super_admin';
    if (!isOwner && !isSuperAdmin) {
      return (
        <div className="p-8 text-center text-muted-foreground py-20">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold text-lg text-zinc-300">Access Restricted</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
            This tournament is currently in draft mode. Only the organizer and super admins can manage it.
          </p>
        </div>
      );
    }
  }
  
  const canEdit = permissions.canEditTournament(profile?.uid, profile?.role, t);
  const spectatorViewOnly = isSpectator(profile?.role);
  const requiresApproval = tournamentRequiresApproval(t);
  const categoryStatLink = spectatorViewOnly ? null : `/dashboard/tournaments/${id}/setup/categories`;
  const tatamiStatLink = spectatorViewOnly ? null : `/dashboard/tournaments/${id}/setup/tatamis`;
  const displayedRegistrations = filterDisplayedRegistrations(registrations).filter(
    (r) => r.status !== 'rejected'
  );
  const participatingDojos = Array.from(new Set(displayedRegistrations.map((r) => r.dojoName).filter(Boolean)));

  return (
    <>
      <PageHeader
        title={t.name}
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: t.name }]}
        actions={
          <>
            <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copy public link</Button>
            <Button asChild variant="outline"><Link href={`/t/${id}`} target="_blank"><ExternalLink className="h-4 w-4 mr-2" /> Public Page</Link></Button>
            {!spectatorViewOnly && (
              <>
                <Button asChild variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"><Link href={`/dashboard/tournaments/${id}/certificates`}><Award className="h-4 w-4 mr-2" /> Certificates</Link></Button>
                <Button asChild className="bg-red-600 hover:bg-red-700 text-white"><Link href={`/dashboard/tournaments/${id}/live`}><Zap className="h-4 w-4 mr-2" /> Live Operations</Link></Button>
                {canEdit && t.status === 'registration_open' && (
                  <Button onClick={handleToggleRegistration} variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200">
                    Close Registration
                  </Button>
                )}
                {canEdit && t.status === 'registration_closed' && (
                  <Button onClick={handleToggleRegistration} variant="outline" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200">
                    Open Registration
                  </Button>
                )}
                {canEdit && (
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/tournaments/${id}/edit`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <Card className="border-border/60 overflow-hidden mb-6">
        <div className="relative h-56 md:h-72 bg-gradient-to-br from-zinc-900 to-zinc-950">
          {t.bannerUrl ? <img src={t.bannerUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-grid opacity-30" />}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          <Badge variant="outline" className={`absolute top-4 right-4 ${statusColor(t.status)}`}>{statusLabel(t.status)}</Badge>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-5 -mt-16 relative z-10">
            {t.logoUrl ? <img src={t.logoUrl} alt="" className="h-24 w-24 rounded-lg object-cover ring-4 ring-card shadow-2xl shrink-0" /> :
              <div className="h-24 w-24 rounded-lg gradient-red-gold flex items-center justify-center ring-4 ring-card shrink-0"><Trophy className="h-12 w-12 text-white" /></div>}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold">{t.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t.organizerName}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-4 w-4" /> <span className="text-foreground/90">{formatDate(t.startDate)} → {formatDate(t.endDate)}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" /> <span className="text-foreground/90">{t.venue || '—'}, {t.city || '—'}, {t.country || '—'}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Grid3x3 className="h-4 w-4" /> <span className="text-foreground/90">{tatamis.length || t.numberOfTatamis || 1} Tatamis</span></div>
              </div>
            </div>
          </div>
          {t.description && <p className="text-sm text-foreground/80 mt-6 leading-relaxed">{t.description}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Stat 
          icon={MapPin} 
          label="Location" 
          valueText={`${t.city || '—'}, ${t.country || '—'}`} 
          subtitle={t.venue || '—'} 
        />
        <Stat 
          icon={Building2} 
          label="Participating Dojos" 
          value={participatingDojos.length} 
          onClick={() => setDojosListOpen(true)} 
        />
        <Stat 
          icon={Users} 
          label="Kohais Participating" 
          value={displayedRegistrations.length} 
        />
        <Stat 
          icon={Tags} 
          label="Categories" 
          value={categories.length} 
          onClick={() => setCategoriesListOpen(true)} 
        />
        <Stat 
          icon={Grid3x3} 
          label="Tatamis" 
          value={tatamis.length} 
          link={`/dashboard/tatamis?tournamentId=${id}`} 
        />
      </div>

      {spectatorViewOnly && (
        <Card className="border-purple-500/40 bg-purple-500/5 mb-6">
          <CardContent className="p-4 text-sm text-purple-200">
            You have <strong>view-only</strong> access. Use the public tournament page to follow brackets and live results.
          </CardContent>
        </Card>
      )}

      {requiresApproval && canManageRegistrations && !spectatorViewOnly && (
        <div className="mb-6">
          <OrganizerApprovalDashboard tournamentId={id} tournamentName={t.name} />
        </div>
      )}

      {/* Registrations */}
      <Card className="border-border/60 mb-6">
        <CardContent className="p-0">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between border-b border-border">
            <div>
              <h3 className="font-semibold">Registrations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{displayedRegistrations.length} kohai registered to this tournament</p>
            </div>
            <div className="flex gap-2">
              {!spectatorViewOnly && canManageRegistrations && (
                <Button onClick={() => setRegOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> 
                  {t.status === 'registration_closed' ? 'Spot Registration' : 'Add Registration'}
                </Button>
              )}
              {!spectatorViewOnly && profile?.role === 'dojo_admin' && t.status === 'registration_open' && (
                <Button onClick={() => setParticipateOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Users className="h-4 w-4 mr-2" /> Participate in Tournament
                </Button>
              )}
            </div>
          </div>
          {displayedRegistrations.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No registrations yet. Add the first kohai.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Kohai</TableHead>
                  <TableHead>Dojo</TableHead>
                  <TableHead>Belt</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  {!spectatorViewOnly && (canManageRegistrations || profile?.role === 'dojo_admin') && <TableHead className="text-right">—</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {displayedRegistrations.map((r) => (
                    <TableRow key={r.id} className="hover:bg-secondary/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={r.athletePhotoUrl} /><AvatarFallback className="bg-primary/20 text-primary text-xs">{(r.athleteName || 'K').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <span className="font-medium">{r.athleteName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.dojoName || '—'}</TableCell>
                      <TableCell>{r.athleteBelt ? <Badge variant="outline" className={`${beltClass(r.athleteBelt)} text-[10px]`}>{r.athleteBelt}</Badge> : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.categoryName || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 text-[10px]'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 text-[10px]'
                          }
                        >
                          {r.status || 'approved'}
                        </Badge>
                      </TableCell>
                      {!spectatorViewOnly && (canManageRegistrations || profile?.role === 'dojo_admin') && (
                        <TableCell className="text-right">
                          {canDeleteRow(r) ? (
                            <Button size="sm" variant="ghost" onClick={() => removeReg(r.id, r.athleteName, r.dojoId)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card className="border-border/60 mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Branding & Media</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Asset label="Logo" url={t.logoUrl} type="image" />
            <Asset label="Banner" url={t.bannerUrl} type="image" />
            <Asset label="Brochure" url={t.brochureUrl} type="pdf" name={t.brochureName} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Public Tournament Page</h3>
          <p className="text-sm text-muted-foreground mb-4">Share this URL with dojos, kohai, and spectators.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs sm:text-sm break-all">{publicUrl}</code>
            <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link href={`/t/${id}`} target="_blank"><ExternalLink className="h-4 w-4 mr-2" /> Open</Link></Button>
          </div>
        </CardContent>
      </Card>

      <RegistrationDialog open={regOpen} onOpenChange={setRegOpen} tournament={t} />
      <ParticipateTournamentDialog open={participateOpen} onOpenChange={setParticipateOpen} tournament={t} />

      {/* Dojo List Modal */}
      <Dialog open={dojosListOpen} onOpenChange={setDojosListOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-100">Participating Dojos</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              List of dojos participating in {t.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[350px] overflow-y-auto space-y-2 pr-1">
            {participatingDojos.length === 0 ? (
              <div className="text-center text-sm text-zinc-500 py-6">No Dojos registered yet.</div>
            ) : (
              participatingDojos.map((dojoName, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl border border-zinc-900 bg-zinc-900/30 hover:border-zinc-800 transition"
                >
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {index + 1}
                  </div>
                  <div className="font-semibold text-sm text-zinc-200">{dojoName}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories List Modal */}
      <Dialog open={categoriesListOpen} onOpenChange={setCategoriesListOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-100">Tournament Event Categories</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Event categories configured for {t.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[380px] overflow-y-auto space-y-3 pr-1">
            {categories.length === 0 ? (
              <div className="text-center text-sm text-zinc-500 py-6">No event categories created yet.</div>
            ) : (
              categories.map((c) => (
                <div 
                  key={c.id} 
                  className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/30 hover:border-zinc-800 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-zinc-200">{c.name}</h4>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/40">
                        {c.eventType}
                      </Badge>
                      {c.isTeamEvent && (
                        <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/40">
                          Team
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs text-zinc-400">
                    <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                      Gender: {c.gender}
                    </span>
                    {(c.ageMin != null) && (
                      <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                        Age: {c.ageMin}–{c.ageMax}
                      </span>
                    )}
                    {(c.weightMin != null || c.weightMax != null) && (
                      <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                        Weight: {c.weightMin ?? '?'}–{c.weightMax ?? '?'} kg
                      </span>
                    )}
                    <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850 text-zinc-300">
                      {displayedRegistrations.filter((r) => r.categoryId === c.id).length} registered
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ icon: Icon, label, value, valueText, subtitle, link, onClick }) {
  const inner = (
    <Card 
      onClick={onClick}
      className={cn(
        "border-border/60 transition",
        (link || onClick) ? "hover:border-primary/40 cursor-pointer hover:bg-zinc-900/40" : ""
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {valueText ? <div className="text-sm font-bold truncate">{valueText}</div> : <div className="text-2xl font-bold">{value}</div>}
            <div className="text-xs text-muted-foreground uppercase tracking-wider truncate">{label}</div>
            {subtitle && <div className="text-[10px] text-muted-foreground truncate mt-0.5" title={subtitle}>{subtitle}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return link ? <Link href={link}>{inner}</Link> : inner;
}

function Asset({ label, url, type, name }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 overflow-hidden">
      <div className="aspect-video bg-zinc-950 flex items-center justify-center">
        {!url ? <div className="text-xs text-muted-foreground">Not uploaded</div> :
          type === 'image' ? <img src={url} alt="" className="h-full w-full object-cover" /> :
          <div className="flex flex-col items-center gap-2 p-4"><FileText className="h-8 w-8 text-primary" /><div className="text-xs truncate max-w-[160px]">{name || 'Brochure.pdf'}</div></div>}
      </div>
      <div className="p-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open</a>}
      </div>
    </div>
  );
}
