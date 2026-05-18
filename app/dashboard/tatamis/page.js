'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/page-header';
import TatamiFormDialog from '@/components/tatami-form-dialog';
import AutoCreateTatamisDialog from '@/components/auto-create-tatamis-dialog';
import { Plus, Grid3x3, Pencil, Trash2, User, Activity, Pause, Lock, ExternalLink, Wand2 } from 'lucide-react';
import { isAdminOrOrganizer } from '@/lib/constants';
import { toast } from 'sonner';

const STATUS_META = {
  active:  { icon: Activity, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', label: 'Active' },
  paused:  { icon: Pause,    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',     label: 'Paused' },
  closed:  { icon: Lock,     cls: 'bg-zinc-700 text-zinc-300 border-zinc-600',                label: 'Closed' },
  delayed: { icon: Pause,    cls: 'bg-orange-500/15 text-orange-300 border-orange-500/40', label: 'Delayed' },
};

export default function TatamisPage() {
  const { profile } = useAuth();
  const canManage = isAdminOrOrganizer(profile?.role);
  const [tatamis, setTatamis] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournamentFilter, setTournamentFilter] = useState('__all__');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'tatamis'), orderBy('createdAt', 'desc')), (s) => { setTatamis(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'tournaments'), (s) => setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const filtered = tatamis.filter((t) => tournamentFilter === '__all__' || t.tournamentId === tournamentFilter);

  const remove = async (id, name) => {
    if (!canManage) return toast.error('Only Super Admins / Tournament Creators can delete tatamis');
    if (!confirm(`Delete tatami "${name}"?`)) return;
    try { await deleteDoc(doc(db, 'tatamis', id)); toast.success('Tatami deleted'); }
    catch (e) { toast.error(e.message); }
  };
  const openCreate = () => { if (!canManage) return; setEditing(null); setDialogOpen(true); };
  const openEdit = (t) => { if (!canManage) return; setEditing(t); setDialogOpen(true); };
  const openAuto = () => { if (!canManage) return; setAutoOpen(true); };

  return (
    <>
      <PageHeader
        title="Tatamis"
        description="Configure competition mats and assign referees. Tournament + referee are mandatory."
        actions={canManage ? (
          <>
            <Button onClick={openAuto} variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"><Wand2 className="h-4 w-4 mr-2" /> Auto Create Tatamis</Button>
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> New Tatami</Button>
          </>
        ) : (
          <Badge variant="outline" className="px-3 py-1.5"><Lock className="h-3 w-3 mr-1" /> View-only access</Badge>
        )}
      />

      <div className="mb-5">
        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tournaments</SelectItem>
            {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <Card className="border-border/60"><CardContent className="p-10 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        : filtered.length === 0 ? (
          <Card className="border-border/60"><CardContent className="p-16 text-center">
            <Grid3x3 className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="font-semibold text-lg">No tatamis configured</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Add tatamis for your tournaments.</p>
            {canManage && <div className="flex gap-2 justify-center"><Button onClick={openAuto} variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"><Wand2 className="h-4 w-4 mr-2" /> Auto Create</Button><Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Create Tatami</Button></div>}
          </CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => {
              const meta = STATUS_META[t.status] || STATUS_META.active;
              const SIcon = meta.icon;
              return (
                <Card key={t.id} className="border-border/60 overflow-hidden">
                  <div className="h-2 gradient-red-gold" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><Grid3x3 className="h-5 w-5 text-primary" /></div>
                        <div><h3 className="font-semibold">{t.name}</h3><p className="text-xs text-muted-foreground">{t.tournamentName || '—'}</p></div>
                      </div>
                      <Badge variant="outline" className={`${meta.cls} text-[10px]`}><SIcon className="h-3 w-3 mr-1" />{meta.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5"><User className="h-3 w-3" /> {t.assignedRefereeName || 'Unassigned'}</div>
                    {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                    <div className="flex gap-2 mt-4">
                      <Button asChild size="sm" variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10"><Link href={`/tatami/${t.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Live Screen</Link></Button>
                      {canManage && <><Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => remove(t.id, t.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      <TatamiFormDialog open={dialogOpen} onOpenChange={setDialogOpen} tournaments={tournaments} initial={editing} id={editing?.id} />
      <AutoCreateTatamisDialog open={autoOpen} onOpenChange={setAutoOpen} tournaments={tournaments} />
    </>
  );
}
