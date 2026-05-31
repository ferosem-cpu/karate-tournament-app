'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PageHeader from '@/components/page-header';
import CategoryFormDialog from '@/components/category-form-dialog';
import AutoCreateCategoriesDialog from '@/components/auto-create-categories-dialog';
import { Plus, Tags, Search, Pencil, Trash2, Wand2, Lock, Eye, Users } from 'lucide-react';
import { isAdminOrOrganizer, beltClass } from '@/lib/constants';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const { profile } = useAuth();
  const canManage = isAdminOrOrganizer(profile?.role);

  const [categories, setCategories] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('__all__');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'categories'), orderBy('createdAt', 'desc')), (s) => { setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'tournaments'), (s) => setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'tournament_registrations'), (s) => setRegistrations(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const filtered = useMemo(() => categories.filter((c) => {
    const matchSearch = [c.name, c.tournamentName, c.eventType].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchTournament = tournamentFilter === '__all__' || c.tournamentId === tournamentFilter || (tournamentFilter === '__global__' && (!c.tournamentId || c.tournamentId === '__global__'));
    return matchSearch && matchTournament;
  }), [categories, search, tournamentFilter]);

  const regByCategory = useMemo(() => {
    const m = {}; registrations.forEach((r) => { if (!r.categoryId) return; (m[r.categoryId] ||= []).push(r); }); return m;
  }, [registrations]);

  const remove = async (id, name) => {
    if (!canManage) return toast.error('Only Super Admins / Tournament Creators can delete event categories');
    if (!confirm(`Delete event category "${name}"?`)) return;
    try { await deleteDoc(doc(db, 'categories', id)); toast.success('Event Category deleted'); }
    catch (e) { toast.error(e.message); }
  };
  const openCreate = () => { if (!canManage) return; setEditing(null); setDialogOpen(true); };
  const openEdit = (c) => { if (!canManage) return; setEditing(c); setDialogOpen(true); };
  const openAuto = () => { if (!canManage) return; setAutoOpen(true); };

  return (
    <>
      <PageHeader
        title="Event Categories"
        description="Kata & Kumite event categories · age, gender, belt and weight rules. Each event category shows assigned kohai with dojo and belt."
        actions={
          canManage ? (
            <>
              <Button onClick={openAuto} variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"><Wand2 className="h-4 w-4 mr-2" /> Auto Create Event Categories</Button>
              <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Manual Create Event Category</Button>
            </>
          ) : (
            <Badge variant="outline" className="px-3 py-1.5"><Lock className="h-3 w-3 mr-1" /> View-only access</Badge>
          )
        }
      />

      {!canManage && (
        <Card className="border-amber-500/40 bg-amber-500/5 mb-5">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-amber-200">
            <Lock className="h-4 w-4" />
            <span>You have <strong>view-only</strong> access. Only Super Admins and Tournament Creators can create, edit or delete event categories.</span>
          </CardContent>
        </Card>
      )}

      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search event categories…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tournaments</SelectItem>
            <SelectItem value="__global__">Global only</SelectItem>
            {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <Card className="border-border/60"><CardContent className="p-10 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        : filtered.length === 0 ? (
          <Card className="border-border/60"><CardContent className="p-16 text-center">
            <Tags className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="font-semibold text-lg">No event categories yet</h3>
            <p className="text-sm text-muted-foreground mt-1">{canManage ? 'Create your first event category or use Auto Create.' : 'Event categories will appear here once they’re configured.'}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const regs = regByCategory[c.id] || [];
              const isExpanded = expanded === c.id;
              return (
                <Card key={c.id} className="border-border/60 hover:border-primary/40 transition">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{c.name}</h3>
                          {c.isTeamEvent && <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/40 text-[10px]">Team</Badge>}
                          {c.isActive !== false ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40 text-[10px]">Active</Badge> : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/40">{c.eventType}</Badge>
                          <Badge variant="outline" className="text-[10px]">{c.gender}</Badge>
                          {(c.ageMin != null) && <Badge variant="outline" className="text-[10px]">Age {c.ageMin}–{c.ageMax}</Badge>}
                          {(c.weightMin != null || c.weightMax != null) && <Badge variant="outline" className="text-[10px]">{c.weightMin ?? '?'}–{c.weightMax ?? '?'} kg</Badge>}
                          <Badge variant="outline" className="text-[10px]"><Users className="h-2.5 w-2.5 mr-1" /> {regs.length} kohai</Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">{c.tournamentName || 'Global'}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setExpanded(isExpanded ? null : c.id)}><Eye className="h-3.5 w-3.5 mr-1" /> {isExpanded ? 'Hide' : 'View'} Kohai</Button>
                        {canManage && <><Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => remove(c.id, c.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></>}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border">
                        {regs.length === 0 ? <div className="text-sm text-muted-foreground text-center py-4">No kohai registered to this category yet.</div> :
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {regs.map((r) => (
                              <div key={r.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary/30 border border-border">
                                <Avatar className="h-9 w-9"><AvatarImage src={r.athletePhotoUrl} /><AvatarFallback className="bg-primary/20 text-primary text-xs">{(r.athleteName || 'K').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{r.athleteName}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{r.dojoName || '—'} · {r.athleteGender || '—'}</div>
                                </div>
                                {r.athleteBelt && <Badge variant="outline" className={`${beltClass(r.athleteBelt)} text-[9px] whitespace-nowrap`}>{r.athleteBelt}</Badge>}
                              </div>
                            ))}
                          </div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      <CategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} tournaments={tournaments} initial={editing} id={editing?.id} />
      <AutoCreateCategoriesDialog open={autoOpen} onOpenChange={setAutoOpen} tournaments={tournaments} />
    </>
  );
}
